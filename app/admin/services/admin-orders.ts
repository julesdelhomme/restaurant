import type { Order } from "../types";
import type { Item } from "../utils/order-items";

export async function runFetchOrdersService(params: {
  supabase: any;
  restaurantId: string | number | null;
  scopedRestaurantId: string;
  canAccessAssignedTable: (tableNumberRaw: unknown) => boolean;
  setOrders: (value: Order[]) => void;
  logFetchOrdersError: (prefix: string, error: unknown) => void;
}): Promise<void> {
  const { supabase, restaurantId, scopedRestaurantId, canAccessAssignedTable, setOrders, logFetchOrdersError } = params;
  try {
    const parseItemsFromOrder = (value: unknown): Array<Record<string, unknown>> => {
      if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
        } catch {
          return [];
        }
      }
      return [];
    };

    const currentRestaurantId = String(restaurantId || scopedRestaurantId || "").trim();
    console.log("ID utilise:", currentRestaurantId, "[admin.fetchOrders]");
    console.log("ID Resto Admin:", currentRestaurantId);
    if (!currentRestaurantId) {
      setOrders([]);
      return;
    }

    const scopedQuery = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", currentRestaurantId)
      .order("created_at", { ascending: true });
    if (scopedQuery.error) {
      logFetchOrdersError("Erreur fetchOrders:", scopedQuery.error);
      return;
    }

    const data = (scopedQuery.data || []) as Order[];
    const activeRows = data.filter((order) => {
      const status = String(order.status || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
      const isPaid = status === "paid" || status === "paye" || status === "payee";
      if (isPaid || ["archived", "archive", "archivee"].includes(status)) return false;
      return canAccessAssignedTable(order.table_number);
    });
    const uniqueRows = Array.from(new Map(activeRows.map((order) => [String(order.id ?? ""), order])).values());
    const itemsByOrderId = new Map<string, Array<Record<string, unknown>>>();
    uniqueRows.forEach((order) => {
      const orderId = String(order.id || "").trim();
      if (!orderId) return;
      const parsed = parseItemsFromOrder(order.items);
      itemsByOrderId.set(orderId, parsed);
    });
    const dishIds = [...new Set(
      Array.from(itemsByOrderId.values())
        .flat()
        .map((item) => item.dish_id ?? item.id)
        .filter(Boolean)
        .map((value) => String(value))
    )];
    const { data: dishes } = dishIds.length > 0
      ? await supabase.from("dishes").select("*").in("id", dishIds)
      : { data: [] as Array<Record<string, unknown>> };
    const dishById = new Map<string, Record<string, unknown>>();
    (dishes || []).forEach((dish: Record<string, unknown>) => {
      const key = String(dish.id || "").trim();
      if (key) dishById.set(key, dish);
    });

    const rowsWithItems = uniqueRows.map((order) => {
      const orderId = String(order.id || "").trim();
      const orderItems = orderId ? itemsByOrderId.get(orderId) || [] : [];
      const enrichedItems = orderItems.map((item) => {
        const dishId = String(item.dish_id ?? item.id ?? "").trim();
        return {
          ...item,
          dish: dishId ? dishById.get(dishId) || null : null,
        };
      });
      return {
        ...order,
        items: enrichedItems.length > 0 ? enrichedItems : order.items,
      };
    });

    setOrders(rowsWithItems);
  } catch (error) {
    logFetchOrdersError("Erreur fetchOrders inattendue:", error);
  }
}

export function runHandleOrdersRealtimePayloadService(params: {
  payload: unknown;
  parseItems: (value: unknown) => Item[];
  dedupeOrderItems: (items: Item[]) => Item[];
  getStableOrderItemKey: (item: Item) => string;
  canAccessAssignedTable: (tableNumberRaw: unknown) => boolean;
  setOrders: (updater: (prev: Order[]) => Order[]) => void;
  triggerReadyOrderAlert: (orderId: string, wasPreparing: boolean) => void;
  restaurantId: string | number | null;
  fetchOrders: () => Promise<void>;
}): void {
  const {
    payload,
    parseItems,
    dedupeOrderItems,
    getStableOrderItemKey,
    canAccessAssignedTable,
    setOrders,
    triggerReadyOrderAlert,
    restaurantId,
    fetchOrders,
  } = params;
  console.log("LOG_NOTIF ADMIN orders:", payload);
  const eventPayload = payload as { eventType?: string; old?: Record<string, unknown>; new?: Record<string, unknown> };
  const eventType = String(eventPayload.eventType || "").toUpperCase();

  if (eventType === "INSERT") {
    const newRow = (eventPayload.new || {}) as Record<string, unknown>;
    const newOrderId = String(newRow.id || "").trim();
    if (newOrderId) {
      const parsedItems = parseItems(newRow.items);
      const dedupedItems = dedupeOrderItems(parsedItems);
      const nextOrder: Order = {
        id: newOrderId,
        table_number: Number(newRow.table_number || 0),
        items: dedupedItems,
        status: String(newRow.status || "pending"),
        created_at: String(newRow.created_at || new Date().toISOString()),
        service_step: String(newRow.service_step ?? "").trim() || null,
        current_step: Number.isFinite(Number(newRow.current_step)) ? Number(newRow.current_step) : null,
        covers: Number.isFinite(Number(newRow.covers)) ? Number(newRow.covers) : null,
        guest_count: Number.isFinite(Number(newRow.guest_count)) ? Number(newRow.guest_count) : null,
        customer_count: Number.isFinite(Number(newRow.customer_count)) ? Number(newRow.customer_count) : null,
      };
      if (!canAccessAssignedTable(nextOrder.table_number)) return;
      setOrders((prev) => {
        if (prev.find((order) => String(order?.id || "") === newOrderId)) return prev;
        const existingItemKeys = new Set<string>();
        prev.forEach((order) => {
          parseItems(order.items).forEach((item) => {
            const key = getStableOrderItemKey(item);
            if (key) existingItemKeys.add(key);
          });
        });
        const hasExistingItem = dedupedItems.some((item) => {
          const key = getStableOrderItemKey(item);
          return key && existingItemKeys.has(key);
        });
        if (hasExistingItem) return prev;
        return [nextOrder, ...prev];
      });
    }
  }
  if (eventType === "UPDATE") {
    const oldRow = (eventPayload.old || {}) as Record<string, unknown>;
    const newRow = (eventPayload.new || {}) as Record<string, unknown>;
    const updatedOrderId = String(newRow.id ?? oldRow.id ?? "").trim();
    if (updatedOrderId) {
      const tableNumberRaw = newRow.table_number ?? oldRow.table_number;
      const canAccess = canAccessAssignedTable(tableNumberRaw);
      const parsedItems = parseItems(newRow.items);
      const dedupedItems = dedupeOrderItems(parsedItems);
      false && console.log("TRACE:", {
        context: "admin.realtime.orders.update",
        orderId: updatedOrderId,
        tableNumber: tableNumberRaw,
        canAccess,
        status: String(newRow.status ?? oldRow.status ?? "").trim() || null,
        currentStep: Number.isFinite(Number(newRow.current_step)) ? Number(newRow.current_step) : null,
        itemsCount: dedupedItems.length,
      });
      if (!canAccess) {
        setOrders((prev) => prev.filter((order) => String(order?.id || "") !== updatedOrderId));
      } else {
        setOrders((prev) => {
          const existing = prev.find((order) => String(order?.id || "") === updatedOrderId);
          const fallbackCreatedAt = String(newRow.created_at ?? oldRow.created_at ?? new Date().toISOString());
          const nextOrder: Order = {
            id: updatedOrderId,
            table_number: Number(newRow.table_number ?? oldRow.table_number ?? existing?.table_number ?? 0),
            items: dedupedItems.length > 0 ? dedupedItems : existing?.items ?? [],
            status: String(newRow.status ?? oldRow.status ?? existing?.status ?? "pending"),
            created_at: String(existing?.created_at || fallbackCreatedAt),
            service_step:
              String(newRow.service_step ?? existing?.service_step ?? "").trim() ||
              String(oldRow.service_step ?? "").trim() ||
              null,
            current_step: Number.isFinite(Number(newRow.current_step))
              ? Number(newRow.current_step)
              : Number.isFinite(Number(existing?.current_step))
                ? Number(existing?.current_step)
                : Number.isFinite(Number(oldRow.current_step))
                  ? Number(oldRow.current_step)
                  : null,
            covers: Number.isFinite(Number(newRow.covers))
              ? Number(newRow.covers)
              : Number.isFinite(Number(existing?.covers))
                ? Number(existing?.covers)
                : Number.isFinite(Number(oldRow.covers))
                  ? Number(oldRow.covers)
                  : null,
            guest_count: Number.isFinite(Number(newRow.guest_count))
              ? Number(newRow.guest_count)
              : Number.isFinite(Number(existing?.guest_count))
                ? Number(existing?.guest_count)
                : Number.isFinite(Number(oldRow.guest_count))
                  ? Number(oldRow.guest_count)
                  : null,
            customer_count: Number.isFinite(Number(newRow.customer_count))
              ? Number(newRow.customer_count)
              : Number.isFinite(Number(existing?.customer_count))
                ? Number(existing?.customer_count)
                : Number.isFinite(Number(oldRow.customer_count))
                  ? Number(oldRow.customer_count)
                  : null,
          };
          if (!existing) return [nextOrder, ...prev];
          return prev.map((order) => (String(order?.id || "") === updatedOrderId ? { ...order, ...nextOrder } : order));
        });
      }
    }
  }
  if (eventType === "DELETE") {
    const deletedOrderId = String(eventPayload.old?.id || "").trim();
    if (deletedOrderId) {
      false && console.log("TRACE:", {
        context: "admin.realtime.orders.delete",
        orderId: deletedOrderId,
      });
      setOrders((prev) => prev.filter((order) => String(order?.id || "") !== deletedOrderId));
    }
  }

  const normalizeRealtimeStatus = (value: unknown) =>
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\s-]+/g, "_")
      .trim();
  const readyStatuses = new Set(["ready", "ready_bar", "pret", "prete"]);
  const preparingStatuses = new Set(["preparing", "en_preparation", "to_prepare", "to_prepare_bar", "to_prepare_kitchen", "preparant"]);
  const oldStatus = normalizeRealtimeStatus(eventPayload.old?.status);
  const newStatus = normalizeRealtimeStatus(eventPayload.new?.status);
  const isReadyTransition = !!newStatus && readyStatuses.has(newStatus) && !readyStatuses.has(oldStatus);
  if (isReadyTransition) {
    const changedTableNumber = eventPayload.new?.table_number ?? eventPayload.old?.table_number;
    if (!canAccessAssignedTable(changedTableNumber)) {
      void fetchOrders();
      return;
    }
    const changedOrderId = String(eventPayload.new?.id ?? eventPayload.old?.id ?? "").trim();
    if (changedOrderId) triggerReadyOrderAlert(changedOrderId, preparingStatuses.has(oldStatus));
  }

  const nextRestaurantId = String(eventPayload.new?.restaurant_id ?? eventPayload.old?.restaurant_id ?? "").trim();
  const currentRestaurantId = String(restaurantId || "").trim();
  if (currentRestaurantId && nextRestaurantId && currentRestaurantId !== nextRestaurantId) {
    console.warn("Admin realtime restaurant_id mismatch, forcing refresh anyway", {
      currentRestaurantId,
      nextRestaurantId,
    });
  }
  const shouldForceRefetch = !(eventType === "INSERT" || eventType === "UPDATE" || eventType === "DELETE");
  if (shouldForceRefetch) {
    void fetchOrders();
  }
}
