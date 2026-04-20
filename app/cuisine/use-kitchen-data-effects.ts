import { useEffect, useRef } from "react";
import type { Item, Order } from "./types";

type UseKitchenDataEffectsArgs = {
  supabase: any;
  isOrderStatusUpdating: boolean;
  isOrderStatusUpdatingRef: { current: boolean };
  resolveCallsTable: () => Promise<any>;
  fetchKitchenSettings: () => Promise<any>;
  fetchOrders: (allowAutoPrint?: boolean) => Promise<any>;
  fetchCatalogNames: () => Promise<any>;
  refreshMs: number;
  autoPrintEnabled: boolean;
  resolvedRestaurantId: string;
  buildOrderFromRealtimeRow: (row: Record<string, unknown>) => Order | null;
  dedupeOrderItems: (items: Item[]) => Item[];
  getOrderItems: (order: Order) => Item[];
  getStableOrderItemKey: (item: Item | Record<string, unknown>) => string;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  setPrintOrder: React.Dispatch<React.SetStateAction<Order | null>>;
  setLastPrintedId: React.Dispatch<React.SetStateAction<string | null>>;
  handleAutoPrint: (orderData?: Order | null) => void | Promise<void>;
  hydratePrintOrder: (orderId: string) => Promise<Order | void>;
  normalizeItemStatus: (value: unknown) => "pending" | "preparing" | "ready";
  parseItems: (items: any) => Item[];
  hasKitchenPreparingTransition: (oldItems: Item[], newItems: Item[], isKitchenCourse: (item: Item) => boolean) => boolean;
  isKitchenCourse: (item: Item) => boolean;
  isFormulaItem: (item: Item) => boolean;
  triggerRealtimePreparingPrint: (order: Order) => void;
  fetchKitchenMessages: () => Promise<void>;
  normalizeKitchenMessageRow: (row: Record<string, unknown>) => any;
  extractKitchenMessageText: (row: any) => string;
  setKitchenMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setIsMounted: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentTime: React.Dispatch<React.SetStateAction<Date>>;
  printOrder: Order | null;
  lastPrintedId: string | null;
  printableCuisineItems: (order: Order) => Item[];
  orders: Order[];
  hasPreparingOrReadyKitchenItems: (order: Order) => boolean;
  lastPendingCountRef: { current: number };
  categoryDestinationById: Record<string, "cuisine" | "bar">;
  dishCategoryIdByDishId: Record<string, string>;
};

export function useKitchenDataEffects(args: UseKitchenDataEffectsArgs) {
  const {
    supabase,
    isOrderStatusUpdating,
    isOrderStatusUpdatingRef,
    resolveCallsTable,
    fetchKitchenSettings,
    fetchOrders,
    fetchCatalogNames,
    refreshMs,
    autoPrintEnabled,
    resolvedRestaurantId,
    buildOrderFromRealtimeRow,
    dedupeOrderItems,
    getOrderItems,
    getStableOrderItemKey,
    setOrders,
    setPrintOrder,
    setLastPrintedId,
    handleAutoPrint,
    hydratePrintOrder,
    normalizeItemStatus,
    parseItems,
    hasKitchenPreparingTransition,
    isKitchenCourse,
    isFormulaItem,
    triggerRealtimePreparingPrint,
    fetchKitchenMessages,
    normalizeKitchenMessageRow,
    extractKitchenMessageText,
    setKitchenMessages,
    setIsMounted,
    setCurrentTime,
    printOrder,
    lastPrintedId,
    printableCuisineItems,
    orders,
    hasPreparingOrReadyKitchenItems,
    lastPendingCountRef,
    categoryDestinationById,
    dishCategoryIdByDishId,
  } = args;
  const lastSeenCurrentStepByOrderIdRef = useRef<Record<string, number>>({});

  const resolveOrderStep = (order: Order) => {
    const raw = Number(
      (order as unknown as Record<string, unknown>).current_step ??
        (order as unknown as Record<string, unknown>).currentStep ??
        NaN
    );
    return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : 1;
  };

  const buildPrintSignature = (order: Order) => {
    const orderId = String(order.id || "").trim();
    if (!orderId) return "";
    const step = resolveOrderStep(order);
    return `${orderId}:step:${step}`;
  };

  useEffect(() => {
    isOrderStatusUpdatingRef.current = isOrderStatusUpdating;
  }, [isOrderStatusUpdating, isOrderStatusUpdatingRef]);

  useEffect(() => {
    void (async () => {
      await resolveCallsTable();
      await fetchKitchenSettings();
      await fetchOrders();
      await fetchCatalogNames();
    })();

    const channel = supabase
      .channel("kitchen-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, async (payload: any) => {
        const eventType = String(payload?.eventType || "").toUpperCase();
        if (eventType === "INSERT") {
          const newRow = (payload?.new || {}) as Record<string, unknown>;
          const realtimeOrder = buildOrderFromRealtimeRow(newRow);
          if (realtimeOrder) {
            const dedupedItems = dedupeOrderItems(getOrderItems(realtimeOrder));
            setOrders((prev) => {
              if (prev.find((order) => String(order.id) === String(realtimeOrder.id))) return prev;
              const existingItemKeys = new Set<string>();
              prev.forEach((order) => {
                getOrderItems(order).forEach((item) => {
                  const key = getStableOrderItemKey(item);
                  if (key) existingItemKeys.add(key);
                });
              });
              const hasExistingItem = dedupedItems.some((item) => {
                const key = getStableOrderItemKey(item);
                return key && existingItemKeys.has(key);
              });
              if (hasExistingItem) return prev;
              return [{ ...realtimeOrder, items: dedupedItems }, ...prev];
            });
          }
          if (autoPrintEnabled && realtimeOrder) {
            const orderId = String(realtimeOrder.id || "").trim();
            const step = resolveOrderStep(realtimeOrder);
            setPrintOrder(realtimeOrder);
            setLastPrintedId(`${orderId}:step:${step}`);
            handleAutoPrint(realtimeOrder);
            void hydratePrintOrder(orderId);
          }
        }
        if (eventType === "UPDATE") {
          const oldRow = (payload?.old || {}) as Record<string, unknown>;
          const newRow = (payload?.new || {}) as Record<string, unknown>;
          const oldStep = Number(oldRow.current_step ?? oldRow.currentStep ?? NaN);
          const newStep = Number(newRow.current_step ?? newRow.currentStep ?? NaN);
          if (Number.isFinite(oldStep) && Number.isFinite(newStep) && oldStep !== newStep) {
            false && console.log("TRACE:", {
              context: "kitchen.realtime.currentStepChanged",
              orderId: String(newRow.id ?? oldRow.id ?? "").trim() || null,
              oldStep,
              newStep,
            });
          }
          const oldOrderStatus = normalizeItemStatus(oldRow.status);
          const newOrderStatus = normalizeItemStatus(newRow.status);
          const oldItems = parseItems(oldRow.items);
          const newItems = parseItems(newRow.items);
          const preparingTransitionByStatus = oldOrderStatus !== "preparing" && newOrderStatus === "preparing";
          const preparingTransitionByItems = newItems.length > 0 && hasKitchenPreparingTransition(oldItems, newItems, isKitchenCourse);
          const hasFormulaItems = newItems.some((item) => isFormulaItem(item as Item));
          const forceFormulaPreparingPrint = newOrderStatus === "preparing" && hasFormulaItems;
          const hasPreparingTransition = preparingTransitionByStatus || preparingTransitionByItems || forceFormulaPreparingPrint;
          if (autoPrintEnabled && hasPreparingTransition) {
            const printOrderFromRealtime = buildOrderFromRealtimeRow(newRow);
            if (printOrderFromRealtime) {
              triggerRealtimePreparingPrint(printOrderFromRealtime);
              await fetchOrders(false);
              return;
            }
          }
        }
        await fetchOrders(eventType === "INSERT" || eventType === "UPDATE");
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, async (payload: any) => {
        const row = (payload?.new || {}) as Record<string, unknown>;
        const type = String(row.type || "").trim().toUpperCase();
        if (type !== "CUISINE_PRINT" && type !== "KITCHEN_PRINT") return;
        const rowRestaurantId = String(row.restaurant_id || "").trim();
        const currentRestaurantId = String(resolvedRestaurantId || "").trim();
        if (rowRestaurantId && currentRestaurantId && rowRestaurantId !== currentRestaurantId) return;
        await fetchOrders(true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurants" }, () => void fetchKitchenSettings())
      .on("postgres_changes", { event: "*", schema: "public", table: "dishes" }, () => void fetchCatalogNames())
      .on("postgres_changes", { event: "*", schema: "public", table: "sides_library" }, () => void fetchCatalogNames())
      .subscribe();

    const poll = window.setInterval(() => {
      void fetchOrders();
    }, refreshMs);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(poll);
    };
  }, [refreshMs, autoPrintEnabled, resolvedRestaurantId, supabase]);

  useEffect(() => {
    void fetchKitchenMessages();
    const channel = supabase
      .channel(`kitchen-messages-${String(resolvedRestaurantId || "global")}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "kitchen_messages" }, (payload: any) => {
        const row = normalizeKitchenMessageRow(((payload as { new?: Record<string, unknown> }).new || {}) as Record<string, unknown>);
        const rowRestaurantId = String(row.restaurant_id || "").trim();
        const currentRestaurantId = String(resolvedRestaurantId || "").trim();
        if (currentRestaurantId && rowRestaurantId && rowRestaurantId !== currentRestaurantId) return;
        if (row.is_active === false) return;
        if (!extractKitchenMessageText(row)) return;
        setKitchenMessages((prev) => {
          if (prev.some((entry) => String(entry.id) === String(row.id))) return prev;
          return [row, ...prev];
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "kitchen_messages" }, (payload: any) => {
        const row = normalizeKitchenMessageRow(((payload as { new?: Record<string, unknown> }).new || {}) as Record<string, unknown>);
        if (!row.id) return;
        if (row.is_active === false) {
          setKitchenMessages((prev) => prev.filter((entry) => String(entry.id) !== String(row.id)));
          return;
        }
        if (!extractKitchenMessageText(row)) return;
        setKitchenMessages((prev) => {
          const filtered = prev.filter((entry) => String(entry.id) !== String(row.id));
          return [row, ...filtered];
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "kitchen_messages" }, (payload: any) => {
        const oldRow = ((payload as { old?: Record<string, unknown> }).old || {}) as Record<string, unknown>;
        const oldId = String(oldRow.id || "").trim();
        if (!oldId) return;
        setKitchenMessages((prev) => prev.filter((entry) => String(entry.id) !== oldId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedRestaurantId, supabase]);

  useEffect(() => {
    setIsMounted(true);
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, [setCurrentTime, setIsMounted]);

  useEffect(() => {
    const nextSnapshot: Record<string, number> = {};
    orders.forEach((order) => {
      const orderId = String(order.id || "").trim();
      if (!orderId) return;
      const currentStep = resolveOrderStep(order);
      nextSnapshot[orderId] = currentStep;
      const previousStep = lastSeenCurrentStepByOrderIdRef.current[orderId];
      if (
        autoPrintEnabled &&
        Number.isFinite(previousStep) &&
        Number(previousStep) > 0 &&
        currentStep > Number(previousStep)
      ) {
        const stepItems = printableCuisineItems(order);
        false && console.log("TRACE:", {
          context: "kitchen.currentStepAutoPrint",
          orderId,
          previousStep,
          currentStep,
          stepItemsCount: stepItems.length,
        });
        if (stepItems.length > 0) {
          setPrintOrder(order);
          handleAutoPrint(order);
        }
      }
    });
    lastSeenCurrentStepByOrderIdRef.current = nextSnapshot;
  }, [orders, autoPrintEnabled, printableCuisineItems, setPrintOrder, handleAutoPrint]);

  useEffect(() => {
    const pendingOrders = orders.filter((order) => hasPreparingOrReadyKitchenItems(order as Order));
    const pendingCount = pendingOrders.length;
    const pendingIncreased = pendingCount > lastPendingCountRef.current;
    if (autoPrintEnabled && pendingIncreased) {
      const printTarget = pendingOrders[0] || null;
      if (printTarget) {
        const signature = buildPrintSignature(printTarget);
        setPrintOrder(printTarget);
        if (signature) setLastPrintedId(signature);
        handleAutoPrint(printTarget);
      }
    }
    lastPendingCountRef.current = pendingCount;
  }, [orders, autoPrintEnabled, hasPreparingOrReadyKitchenItems, lastPendingCountRef, setLastPrintedId, setPrintOrder, handleAutoPrint]);
}
