import { useEffect } from "react";

import { AUTO_PRINT_TRIGGER_STATUSES, DRINK_QUEUE_STATUSES, normalizeStatus, normalizeStatusKey, parseItems, resolveStaffDestination } from "../bar-caisse-helpers";

type UseBarCaisseRealtimeParams = {
  supabase: any;
  restaurantId: string | number | null;
  activeTab: "boissons" | "caisse" | "inventaire";
  categoryDestinationById: Record<string, "cuisine" | "bar">;
  dishCategoryIdByDishId: Record<string, string>;
  enableAlerts: boolean;
  hasNewDrinkAlert: boolean;
  setHasNewDrinkAlert: React.Dispatch<React.SetStateAction<boolean>>;
  setServiceNotifications: React.Dispatch<React.SetStateAction<any[]>>;
  setThermalPrintPayload: React.Dispatch<React.SetStateAction<any>>;
  thermalPrintTriggerRef: React.MutableRefObject<number | null>;
  printedRealtimeTransitionsRef: React.MutableRefObject<Record<string, boolean>>;
  fetchOrders: () => Promise<void>;
  fetchServiceNotifications: () => Promise<void>;
  fetchRestaurantSettings: () => Promise<void>;
  playBarNotificationBeep: () => void;
  buildTicketPayloadFromRealtimeOrder: (orderRow: Record<string, unknown>) => any;
  openThermalPrint: (payload: any) => void;
};

export function useBarCaisseRealtime(params: UseBarCaisseRealtimeParams) {
  const {
    supabase,
    restaurantId,
    activeTab,
    categoryDestinationById,
    dishCategoryIdByDishId,
    enableAlerts,
    hasNewDrinkAlert,
    setHasNewDrinkAlert,
    setServiceNotifications,
    setThermalPrintPayload,
    thermalPrintTriggerRef,
    printedRealtimeTransitionsRef,
    fetchOrders,
    fetchServiceNotifications,
    fetchRestaurantSettings,
    playBarNotificationBeep,
    buildTicketPayloadFromRealtimeOrder,
    openThermalPrint,
  } = params;
  const categoryDestinationByIdString = JSON.stringify(categoryDestinationById || {});
  const dishCategoryIdByDishIdString = JSON.stringify(dishCategoryIdByDishId || {});

  useEffect(() => {
    const stableCategoryDestinationById = JSON.parse(categoryDestinationByIdString) as Record<string, "cuisine" | "bar">;
    const stableDishCategoryIdByDishId = JSON.parse(dishCategoryIdByDishIdString) as Record<string, string>;
    void fetchOrders();
    if (enableAlerts) void fetchServiceNotifications();
    const ordersChannel = supabase
      .channel(`bar-caisse-orders-${String(restaurantId ?? "global")}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload: any) => {
        const eventPayload = payload as { eventType?: string; new?: Record<string, unknown>; old?: Record<string, unknown> };
        const eventType = String(eventPayload.eventType || "").toUpperCase();
        const newRow = (eventPayload.new || {}) as Record<string, unknown>;
        const oldRow = (eventPayload.old || {}) as Record<string, unknown>;
        const currentRestaurantId = String(restaurantId ?? "").trim();
        const nextRestaurantId = String(newRow.restaurant_id ?? "").trim();
        const sameRestaurant = !currentRestaurantId || !nextRestaurantId || nextRestaurantId === currentRestaurantId;
        if (eventType === "INSERT" && sameRestaurant) {
          const insertedItems = parseItems(newRow.items);
          const insertedStatus = normalizeStatus(newRow.status);
          if (
            DRINK_QUEUE_STATUSES.has(insertedStatus) &&
            insertedItems.some(
              (item) => resolveStaffDestination(item, stableCategoryDestinationById, stableDishCategoryIdByDishId) === "bar"
            )
          ) {
            setHasNewDrinkAlert(true);
            if (activeTab !== "boissons") playBarNotificationBeep();
          }
        }
        if (eventType === "UPDATE" && sameRestaurant) {
          const oldStatus = normalizeStatusKey(oldRow.status);
          const newStatus = normalizeStatusKey(newRow.status);
          const oldCurrentStep = Number((oldRow as any).current_step ?? (oldRow as any).currentStep ?? 0);
          const newCurrentStep = Number((newRow as any).current_step ?? (newRow as any).currentStep ?? 0);
          const isNewPaidOrConfirmed = AUTO_PRINT_TRIGGER_STATUSES.has(newStatus);
          const wasAlreadyPaidOrConfirmed = AUTO_PRINT_TRIGGER_STATUSES.has(oldStatus);
          const isNextStepSent = oldCurrentStep < newCurrentStep && newCurrentStep > 0;
          if (isNewPaidOrConfirmed && !wasAlreadyPaidOrConfirmed) {
            const transitionKey = `${String(newRow.id || oldRow.id || "")}:${newStatus}:${String(
              newRow.updated_at || newRow.paid_at || newRow.closed_at || ""
            )}`;
            if (transitionKey && !printedRealtimeTransitionsRef.current[transitionKey]) {
              printedRealtimeTransitionsRef.current[transitionKey] = true;
              const payloadForPrint = buildTicketPayloadFromRealtimeOrder(newRow);
              if (payloadForPrint) {
                openThermalPrint(payloadForPrint);
              }
            }
          }
          if (isNextStepSent) {
            const transitionKey = `${String(newRow.id || oldRow.id || "")}:step:${newCurrentStep}:${String(newRow.updated_at || "")}`;
            if (transitionKey && !printedRealtimeTransitionsRef.current[transitionKey]) {
              printedRealtimeTransitionsRef.current[transitionKey] = true;
            }
          }
        }
        void fetchOrders();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [restaurantId, activeTab, enableAlerts, categoryDestinationByIdString, dishCategoryIdByDishIdString]);

  useEffect(() => {
    if (!enableAlerts) {
      setServiceNotifications([]);
      return;
    }
    const notificationsChannel = supabase
      .channel(`bar-caisse-notifications-${String(restaurantId ?? "global")}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, (payload: any) => {
        const eventPayload = payload as { eventType?: string; new?: Record<string, unknown> };
        const eventType = String(eventPayload.eventType || "").toUpperCase();
        const newRow = (eventPayload.new || {}) as Record<string, unknown>;
        const currentRestaurantId = String(restaurantId ?? "").trim();
        const nextRestaurantId = String(newRow.restaurant_id ?? "").trim();
        const sameRestaurant = !currentRestaurantId || !nextRestaurantId || nextRestaurantId === currentRestaurantId;
        if (eventType === "INSERT" && sameRestaurant && normalizeStatus(newRow.status) === "pending") {
          playBarNotificationBeep();
        }
        void fetchServiceNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
    };
  }, [restaurantId, enableAlerts]);

  useEffect(() => {
    if (activeTab === "boissons" && hasNewDrinkAlert) {
      setHasNewDrinkAlert(false);
    }
  }, [activeTab, hasNewDrinkAlert]);

  useEffect(() => {
    const restaurantsChannel = supabase
      .channel("bar-caisse-restaurants")
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurants" }, () => {
        void fetchRestaurantSettings();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(restaurantsChannel);
    };
  }, []);

  useEffect(() => {
    const handleAfterPrint = () => setThermalPrintPayload(null);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
      if (thermalPrintTriggerRef.current) {
        window.clearTimeout(thermalPrintTriggerRef.current);
        thermalPrintTriggerRef.current = null;
      }
    };
  }, []);
}
