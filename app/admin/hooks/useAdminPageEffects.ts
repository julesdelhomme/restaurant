import { useEffect } from "react";
import type { DishItem, FormulaDishLink, FormulaSelectionDetails, Order, ServiceNotification } from "../types";

export function useAdminPageEffects(params: {
  setWaitClockMs: (value: number) => void;
  formulaModalDish: DishItem | null;
  formulaModalSourceDish: DishItem | null;
  normalizedFormulaCategoryIds: string[];
  formulaOptionsByCategory: Map<string, DishItem[]>;
  formulaDefaultOptionsByDishId: Map<string, string[]>;
  resolveFormulaDishRecord: (dish: DishItem | null | undefined) => DishItem | null;
  getFormulaDishConfig: (dish: DishItem) => { productOptions: Array<{ id: string }>; hasRequiredSides: boolean; askCooking: boolean; extras: unknown[] };
  setFormulaModalSelections: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  setFormulaModalSelectionDetails: (
    updater: (prev: Record<string, FormulaSelectionDetails>) => Record<string, FormulaSelectionDetails>
  ) => void;
  scopedRestaurantId: string;
  fetchRestaurantSettings: () => Promise<void>;
  fetchActiveTables: (restaurantScope?: string | number | null) => Promise<void>;
  fetchActiveDishes: (restaurantScope?: string | number | null) => Promise<void>;
  fetchFastEntryResources: () => Promise<void>;
  fetchServerNotificationScope: () => Promise<void>;
  restaurantId: string | number | null;
  serverTableScopeEnabled: boolean;
  serverAssignedTablesKey: string;
  supabase: any;
  fetchOrders: () => Promise<void>;
  handleOrdersRealtimePayload: (payload: unknown) => void;
  settings: Record<string, unknown> | null;
  setOrders: (updater: (prev: Order[]) => Order[]) => void;
  setServiceNotifications: (updater: (prev: ServiceNotification[]) => ServiceNotification[]) => void;
  canAccessAssignedTable: (tableNumberRaw: unknown) => boolean;
  fetchNotifications: (restaurantScope?: string | number | null) => Promise<void>;
  handleNotificationInsert: (payload: unknown) => void;
  handleNotificationUpdate: (payload: unknown) => void;
  handleNotificationDelete: (payload: unknown) => void;
}): void {
  const {
    setWaitClockMs,
    formulaModalDish,
    formulaModalSourceDish,
    normalizedFormulaCategoryIds,
    formulaOptionsByCategory,
    formulaDefaultOptionsByDishId,
    resolveFormulaDishRecord,
    getFormulaDishConfig,
    setFormulaModalSelections,
    setFormulaModalSelectionDetails,
    scopedRestaurantId,
    fetchRestaurantSettings,
    fetchActiveTables,
    fetchActiveDishes,
    fetchFastEntryResources,
    fetchServerNotificationScope,
    restaurantId,
    serverTableScopeEnabled,
    serverAssignedTablesKey,
    supabase,
    fetchOrders,
    handleOrdersRealtimePayload,
    settings,
    setOrders,
    setServiceNotifications,
    canAccessAssignedTable,
    fetchNotifications,
    handleNotificationInsert,
    handleNotificationUpdate,
    handleNotificationDelete,
  } = params;

  useEffect(() => {
    const id = window.setInterval(() => {
      setWaitClockMs(Date.now());
    }, 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!formulaModalDish || !formulaModalSourceDish) return;
    const sourceDishId = String(formulaModalSourceDish.id || "").trim();
    if (!sourceDishId) return;
    const sourceStepKey =
      normalizedFormulaCategoryIds.find((stepKey) => {
        const options = formulaOptionsByCategory.get(stepKey) || [];
        return options.some((dish) => String(dish.id || "").trim() === sourceDishId);
      }) || "";
    if (!sourceStepKey) return;
    setFormulaModalSelections((prev) => {
      if (prev[sourceStepKey] === sourceDishId) return prev;
      return { ...prev, [sourceStepKey]: sourceDishId };
    });
    const resolvedSourceDish = resolveFormulaDishRecord(formulaModalSourceDish) || formulaModalSourceDish;
    const config = getFormulaDishConfig(resolvedSourceDish);
    const rawDefaults = formulaDefaultOptionsByDishId.get(sourceDishId) || [];
    const allowedIds = new Set(config.productOptions.map((option) => String(option.id || "").trim()).filter(Boolean));
    const normalizedDefaults = rawDefaults.filter((id) => allowedIds.has(String(id || "").trim()));
    if (normalizedDefaults.length > 0) {
      const allowMulti = Boolean((resolvedSourceDish as unknown as { allow_multi_select?: unknown }).allow_multi_select);
      const nextDefaults = allowMulti ? normalizedDefaults : normalizedDefaults.slice(0, 1);
      setFormulaModalSelectionDetails((prev) => {
        const current = prev[sourceStepKey];
        if (current && current.selectedProductOptionIds.length > 0) return prev;
        return {
          ...prev,
          [sourceStepKey]: {
            selectedSideIds: [],
            selectedSides: [],
            selectedCooking: "",
            selectedProductOptionIds: nextDefaults,
            selectedExtras: [],
          },
        };
      });
    }
  }, [formulaModalDish, formulaModalSourceDish, formulaOptionsByCategory, formulaDefaultOptionsByDishId, normalizedFormulaCategoryIds]);

  useEffect(() => {
    const initialScope = scopedRestaurantId || null;
    void fetchRestaurantSettings();
    void fetchActiveTables(initialScope);
    void fetchActiveDishes(initialScope);
    void fetchFastEntryResources();

    const channel = supabase
      .channel("admin-orders-and-tables")
      .on("postgres_changes", { event: "*", schema: "public", table: "table_assignments" }, () => void fetchActiveTables())
      .on("postgres_changes", { event: "*", schema: "public", table: "dishes" }, () => void fetchActiveDishes())
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => void fetchFastEntryResources())
      .on("postgres_changes", { event: "*", schema: "public", table: "dishes" }, () => void fetchFastEntryResources())
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_formulas" }, () => void fetchFastEntryResources())
      .on("postgres_changes", { event: "*", schema: "public", table: "table_assignments" }, () => void fetchFastEntryResources())
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurants" }, () => void fetchRestaurantSettings())
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_profile" }, () => void fetchRestaurantSettings())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scopedRestaurantId]);

  useEffect(() => {
    void fetchServerNotificationScope();
  }, [restaurantId, scopedRestaurantId]);

  useEffect(() => {
    void fetchOrders();
    const ordersChannel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload: unknown) =>
        handleOrdersRealtimePayload(payload)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [restaurantId, serverTableScopeEnabled, serverAssignedTablesKey]);

  useEffect(() => {
    console.log("SETTINGS RECUPERES :", settings);
  }, [settings]);

  useEffect(() => {
    setOrders((prev) => prev.filter((order) => canAccessAssignedTable(order.table_number)));
    setServiceNotifications((prev) =>
      prev.filter((notification) => {
        const type = String(notification.type || "").trim().toUpperCase();
        const tableText = String(notification.table_number || "").trim().toUpperCase();
        if (type === "CUISINE" || tableText === "CUISINE") return true;
        return canAccessAssignedTable(notification.table_number);
      })
    );
  }, [serverTableScopeEnabled, serverAssignedTablesKey]);

  useEffect(() => {
    void fetchNotifications();
    const channel = supabase
      .channel(`admin-notifications-${String(restaurantId ?? "global")}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload: unknown) =>
        handleNotificationInsert(payload)
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, (payload: unknown) =>
        handleNotificationUpdate(payload)
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications" }, (payload: unknown) =>
        handleNotificationDelete(payload)
      )
      .subscribe((status: string) => {
        console.log("Realtime notifications admin:", status);
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, serverTableScopeEnabled, serverAssignedTablesKey]);
}
