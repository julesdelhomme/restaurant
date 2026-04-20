/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAdminPageEffects } from "./useAdminPageEffects";
import { runHandleOrdersRealtimePayloadService } from "../services/admin-orders";
import {
  handleNotificationDeletePayload,
  handleNotificationInsertPayload,
  handleNotificationUpdatePayload,
} from "../services/admin-notifications";

type Params = Record<string, any>;

export function useAdminRealtimeEffects(params: Params) {
  const {
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
    settings,
    setOrders,
    setServiceNotifications,
    canAccessAssignedTable,
    fetchNotifications,
    parseItems,
    dedupeOrderItems,
    getStableOrderItemKey,
    triggerReadyOrderAlert,
    isKitchenOnlyNotification,
    normalizeNotificationRow,
    playReadyNotificationBeep,
    setWaitClockMs,
  } = params;

  const handleOrdersRealtimePayload = (payload: unknown) =>
    runHandleOrdersRealtimePayloadService({
      payload,
      parseItems,
      dedupeOrderItems,
      getStableOrderItemKey,
      canAccessAssignedTable,
      setOrders,
      triggerReadyOrderAlert,
      restaurantId,
      fetchOrders,
    });

  const handleNotificationInsert = (payload: unknown) =>
    handleNotificationInsertPayload({
      payload,
      restaurantId,
      canAccessAssignedTable,
      isKitchenOnlyNotification,
      normalizeNotificationRow,
      setServiceNotifications,
      playReadyNotificationBeep,
    });

  const handleNotificationUpdate = (payload: unknown) =>
    handleNotificationUpdatePayload({
      payload,
      canAccessAssignedTable,
      isKitchenOnlyNotification,
      normalizeNotificationRow,
      setServiceNotifications,
    });

  const handleNotificationDelete = (payload: unknown) => handleNotificationDeletePayload({ payload, setServiceNotifications });

  useAdminPageEffects({
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
  });
}
