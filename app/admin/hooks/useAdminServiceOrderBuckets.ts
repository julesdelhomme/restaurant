import { useMemo } from "react";
import type { Item } from "../utils/order-items";
import { buildTableStatusRowsService } from "../services/table-status-rows";
import type { Order } from "../types";

type Params = Record<string, any>;

export function useAdminServiceOrderBuckets(params: Params) {
  const {
    orders,
    serviceNotifications,
    tablesAwaitingNextStepUntilMs,
    waitClockMs,
    showNewOrderTab,
    activeTab,
    parseItems,
    isDrink,
    isItemServed,
    isPaidStatus,
    isServedOrArchivedStatus,
    getOrderItemProgress,
    hasExplicitItemStatus,
    normalizeWorkflowItemStatus,
    getItemPrepStatus,
    isPreparingLikeOrderStatus,
    normalizeOrderStatus,
    resolveOrderCurrentStep,
    resolveWorkflowStepForItem,
    resolveLastServedItemTimestampMs,
    resolveNextFormulaStep,
    resolveImmediateNextFormulaStep,
  } = params;

  const serviceVisibleOrders = useMemo(
    () =>
      (orders as Order[]).filter((order) => {
        if (isPaidStatus(order.status)) return false;
        const hasActiveItems = parseItems(order.items).some((item: Item) => !isItemServed(item));
        if (hasActiveItems) return true;
        return !isServedOrArchivedStatus(order.status);
      }),
    [orders]
  );

  const preparingOrders = useMemo(
    () =>
      serviceVisibleOrders.filter((order: Order) => {
        const progress = getOrderItemProgress(order);
        const currentStep = resolveOrderCurrentStep(order);
        const currentStepItems =
          Number.isFinite(Number(currentStep)) && Number(currentStep) > 0
            ? progress.activeItems.filter((item: Item) => resolveWorkflowStepForItem(item) === Number(currentStep))
            : [];
        if (currentStepItems.length > 0) {
          false && console.log("TRACE:", {
            context: "admin.preparingOrders.currentStepItems",
            orderId: String(order.id || "").trim() || null,
            currentStep,
            currentStepItemsCount: currentStepItems.length,
          currentStepItems: currentStepItems.map((item: Item) => {
              const record = item as unknown as Record<string, unknown>;
              return {
                order_item_id: String(record.order_item_id ?? record.orderItemId ?? "").trim() || null,
                dish_id: String(record.dish_id ?? record.id ?? "").trim() || null,
                status: String(record.status ?? "").trim() || null,
                step: resolveWorkflowStepForItem(item),
              };
            }),
          });
          return true;
        }
        const hasPreparingItems = progress.activeItems.some((item: Item) => {
          const normalizedStatus = normalizeWorkflowItemStatus(item);
          return (
            normalizedStatus === "preparing" ||
            normalizedStatus === "in_progress" ||
            normalizedStatus === "in progress" ||
            getItemPrepStatus(item) === "preparing"
          );
        });
        if (hasPreparingItems) return true;
        const hasExplicitStatus = progress.activeItems.some((item: Item) => hasExplicitItemStatus(item));
        return !hasExplicitStatus && isPreparingLikeOrderStatus(order.status);
      }),
    [serviceVisibleOrders]
  );

  const readyOrders = useMemo(
    () =>
      serviceVisibleOrders.filter((order: Order) => {
        const progress = getOrderItemProgress(order);
        return progress.readyItems.length > 0;
      }),
    [serviceVisibleOrders]
  );

  const tableStatusRows = useMemo(
    () =>
      buildTableStatusRowsService({
        orders,
        tablesAwaitingNextStepUntilMs,
        waitClockMs,
        normalizeOrderStatus,
        isPaidStatus,
        parseItems,
        isDrink,
        resolveOrderCurrentStep,
        resolveWorkflowStepForItem,
        isItemServed,
        resolveLastServedItemTimestamp: resolveLastServedItemTimestampMs,
        resolveNextFormulaStep,
        resolveImmediateNextFormulaStep,
      }),
    [orders, tablesAwaitingNextStepUntilMs, waitClockMs]
  );

  const pendingNotifications = useMemo(
    () =>
      serviceNotifications.filter(
        (notification: { status?: unknown }) => !notification.status || String(notification.status).toLowerCase() === "pending"
      ),
    [serviceNotifications]
  );

  const resolvedActiveTab: "orders" | "sessions" | "new-order" | "service" =
    !showNewOrderTab && activeTab === "new-order" ? "orders" : activeTab;

  return {
    serviceVisibleOrders,
    preparingOrders,
    readyOrders,
    tableStatusRows,
    pendingNotifications,
    resolvedActiveTab,
  };
}
