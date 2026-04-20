import { runHandleAdvanceServiceStepService, runHandleSendNextServiceStepService } from "../services/service-step-actions";
import { buildNextServiceStepNotificationPayload, syncItemsForNextServiceStepService } from "../services/next-service-step";
import type { Order } from "../types";

type Params = Record<string, any>;

export function useAdminServiceStepActions(params: Params) {
  const {
    supabase,
    restaurantId,
    scopedRestaurantId,
    sendingNextStepOrderIds,
    setSendingNextStepOrderIds,
    sendingServiceStepOrderIds,
    setSendingServiceStepOrderIds,
    setOrders,
    setTablesAwaitingNextStepUntilMs,
    parseItems,
    normalizeFormulaStepValue,
    deriveOrderStatusFromItems,
    resolveLegacyServiceStepFromCurrentStep,
    resolveNextServiceStep,
    fetchOrders,
  } = params;

  async function handleSendNextServiceStep(order: Order, nextStep: number) {
    await runHandleSendNextServiceStepService({
      order,
      nextStep,
      normalizeFormulaStepValue,
      sendingNextStepOrderIds,
      setSendingNextStepOrderIds,
      parseItems,
      syncItemsForNextServiceStep: syncItemsForNextServiceStepService,
      deriveOrderStatusFromItems,
      resolveLegacyServiceStepFromCurrentStep,
      setOrders,
      updateOrder: async (orderId: string, updates: Record<string, unknown>) => {
        const { error } = await supabase.from("orders").update(updates).eq("id", orderId);
        return { error };
      },
      fetchOrders,
      setTablesAwaitingNextStepUntilMs,
      buildNextServiceStepNotificationPayload,
      insertNotification: async (payload: Record<string, unknown>) => {
        await supabase.from("notifications").insert([payload as never]);
      },
      restaurantId: String(restaurantId || ""),
      scopedRestaurantId: String(scopedRestaurantId || ""),
    });
  }

  async function handleAdvanceServiceStep(order: Order) {
    await runHandleAdvanceServiceStepService({
      order,
      sendingServiceStepOrderIds,
      setSendingServiceStepOrderIds,
      parseItems,
      resolveNextServiceStep,
      setOrders,
      updateServiceStep: async (orderId: string, nextServiceStep: string) => {
        const { error } = await supabase.from("orders").update({ service_step: nextServiceStep }).eq("id", orderId);
        return { error };
      },
      fetchOrders,
    });
  }

  return { handleSendNextServiceStep, handleAdvanceServiceStep };
}
