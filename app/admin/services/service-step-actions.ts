import type { Order } from "../types";
import type { Item } from "../utils/order-items";

type BoolMap = Record<string, boolean>;

type NextStepNotificationBuilder = (params: {
  tableNumber: unknown;
  normalizedNextStep: number;
  orderId: string;
  restaurantId: string;
}) => Record<string, unknown>;

export async function runHandleSendNextServiceStepService(params: {
  order: Order;
  nextStep: number;
  normalizeFormulaStepValue: (value: unknown, allowNull?: boolean) => number | null;
  sendingNextStepOrderIds: BoolMap;
  setSendingNextStepOrderIds: (updater: (prev: BoolMap) => BoolMap) => void;
  parseItems: (value: unknown) => Item[];
  syncItemsForNextServiceStep: (params: {
    parsedItems: Item[];
    normalizedNextStep: number;
    normalizeFormulaStepValue: (value: unknown, allowNull?: boolean) => number | null;
  }) => Item[];
  deriveOrderStatusFromItems: (items: Item[]) => string;
  resolveLegacyServiceStepFromCurrentStep: (currentStep: number) => string | null;
  setOrders: (updater: (prev: Order[]) => Order[]) => void;
  updateOrder: (orderId: string, updates: Record<string, unknown>) => Promise<{ error: unknown | null }>;
  fetchOrders: () => Promise<void>;
  setTablesAwaitingNextStepUntilMs: (
    updater: (prev: Record<number, number>) => Record<number, number>
  ) => void;
  buildNextServiceStepNotificationPayload: NextStepNotificationBuilder;
  insertNotification: (payload: Record<string, unknown>) => Promise<void>;
  restaurantId: string;
  scopedRestaurantId: string;
  nowMs?: () => number;
}): Promise<void> {
  const {
    order,
    nextStep,
    normalizeFormulaStepValue,
    sendingNextStepOrderIds,
    setSendingNextStepOrderIds,
    parseItems,
    syncItemsForNextServiceStep,
    deriveOrderStatusFromItems,
    resolveLegacyServiceStepFromCurrentStep,
    setOrders,
    updateOrder,
    fetchOrders,
    setTablesAwaitingNextStepUntilMs,
    buildNextServiceStepNotificationPayload,
    insertNotification,
    restaurantId,
    scopedRestaurantId,
    nowMs = () => Date.now(),
  } = params;

  const normalizedNextStep = normalizeFormulaStepValue(nextStep, true);
  if (normalizedNextStep == null || normalizedNextStep <= 0) return;
  const persistedCurrentStep = normalizeFormulaStepValue(
    (order as unknown as Record<string, unknown>).current_step ??
      (order as unknown as Record<string, unknown>).currentStep,
    true
  );
  const enforcedNextStep =
    persistedCurrentStep != null && persistedCurrentStep > 0
      ? Math.max(normalizedNextStep, persistedCurrentStep + 1)
      : normalizedNextStep;

  const orderId = String(order.id || "").trim();
  if (!orderId) return;
  if (sendingNextStepOrderIds[orderId]) return;

  setSendingNextStepOrderIds((prev) => ({ ...prev, [orderId]: true }));

  try {
    const parsedItems = parseItems(order.items);
    const nextItems = syncItemsForNextServiceStep({
      parsedItems,
      normalizedNextStep: enforcedNextStep,
      normalizeFormulaStepValue,
    });
    const nextStatus = deriveOrderStatusFromItems(nextItems);
    const nextServiceStep = resolveLegacyServiceStepFromCurrentStep(enforcedNextStep);
    false && console.log("TRACE:", {
      context: "admin.runHandleSendNextServiceStepService",
      orderId,
      requestedNextStep: normalizedNextStep,
      persistedCurrentStep,
      enforcedNextStep,
      nextServiceStep,
      parsedItems: parsedItems.map((item) => {
        const record = item as unknown as Record<string, unknown>;
        return {
          order_item_id: String(record.order_item_id ?? record.orderItemId ?? "").trim() || null,
          dish_id: String(record.dish_id ?? record.id ?? "").trim() || null,
          name: String(record.name_fr ?? record.name ?? record.product_name ?? "").trim() || null,
          step:
            normalizeFormulaStepValue(
              record.step ??
                record.sequence ??
                record.step_number ??
                record.sort_order ??
                record.service_step_sequence ??
                record.formula_current_sequence ??
                record.formulaCurrentSequence,
              true
            ) ?? null,
          status: String(record.status ?? "").trim() || null,
        };
      }),
    });

    setOrders((prev) =>
      prev.map((row) =>
        String(row.id) === orderId
          ? {
              ...row,
              current_step: enforcedNextStep,
              service_step: nextServiceStep,
              status: nextStatus,
              items: nextItems.length > 0 ? nextItems : row.items,
            }
          : row
      )
    );

    const { error } = await updateOrder(orderId, {
      current_step: enforcedNextStep,
      service_step: nextServiceStep,
      status: nextStatus,
      ...(nextItems.length > 0 && { items: nextItems }),
    });

    if (error) {
      console.error("Erreur update current_step:", error);
      await fetchOrders();
    } else {
      const nextStepWaitUntil = nowMs() + 20 * 60 * 1000;
      const tableNumberValue = Number(order.table_number);
      if (Number.isFinite(tableNumberValue) && tableNumberValue > 0) {
        setTablesAwaitingNextStepUntilMs((prev) => ({
          ...prev,
          [tableNumberValue]: nextStepWaitUntil,
        }));
      }
      const notificationPayload = buildNextServiceStepNotificationPayload({
        tableNumber: order.table_number,
        normalizedNextStep: enforcedNextStep,
        orderId,
        restaurantId: String(restaurantId || scopedRestaurantId || "").trim(),
      });
      await insertNotification(notificationPayload);
    }
  } finally {
    setSendingNextStepOrderIds((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
  }
}

export async function runHandleAdvanceServiceStepService(params: {
  order: Order;
  sendingServiceStepOrderIds: BoolMap;
  setSendingServiceStepOrderIds: (updater: (prev: BoolMap) => BoolMap) => void;
  parseItems: (value: unknown) => Item[];
  resolveNextServiceStep: (order: Order, parsedItems: Item[]) => string;
  setOrders: (updater: (prev: Order[]) => Order[]) => void;
  updateServiceStep: (orderId: string, nextServiceStep: string) => Promise<{ error: unknown | null }>;
  fetchOrders: () => Promise<void>;
}): Promise<void> {
  const {
    order,
    sendingServiceStepOrderIds,
    setSendingServiceStepOrderIds,
    parseItems,
    resolveNextServiceStep,
    setOrders,
    updateServiceStep,
    fetchOrders,
  } = params;

  const orderId = String(order.id || "").trim();
  if (!orderId) return;
  if (sendingServiceStepOrderIds[orderId]) return;

  const parsedItems = parseItems(order.items);
  const nextServiceStep = resolveNextServiceStep(order, parsedItems);
  if (!nextServiceStep) return;

  setSendingServiceStepOrderIds((prev) => ({ ...prev, [orderId]: true }));
  try {
    setOrders((prev) =>
      prev.map((row) => (String(row.id) === orderId ? { ...row, service_step: nextServiceStep } : row))
    );
    const { error } = await updateServiceStep(orderId, nextServiceStep);
    if (error) {
      console.error("Erreur update service_step:", error);
      await fetchOrders();
    }
  } finally {
    setSendingServiceStepOrderIds((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
  }
}
