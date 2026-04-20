import type { Item } from "../utils/order-items";
import type { Order } from "../types";

type TableStatusRow = {
  tableNumber: number;
  allServed: boolean;
  hasStartedTasting: boolean;
  isAwaitingNextStep: boolean;
  diningMinutes: number | null;
  waitingMinutes: number | null;
  count: number;
  formulaActionOrder: Order | null;
  nextFormulaStep: number | null;
};

type BuildTableStatusRowsServiceParams = {
  orders: Order[];
  tablesAwaitingNextStepUntilMs: Record<number, number>;
  waitClockMs: number;
  normalizeOrderStatus: (value: unknown) => string;
  isPaidStatus: (status: string) => boolean;
  parseItems: (value: unknown) => Item[];
  isDrink: (item: Item) => boolean;
  resolveOrderCurrentStep: (order: Order) => number | null;
  resolveWorkflowStepForItem: (item: Item) => number | null;
  isItemServed: (item: Item) => boolean;
  resolveLastServedItemTimestamp: (order: Order) => number | null;
  resolveNextFormulaStep: (order: Order) => number | null;
  resolveImmediateNextFormulaStep: (order: Order) => number | null;
};

export function buildTableStatusRowsService({
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
  resolveLastServedItemTimestamp,
  resolveNextFormulaStep,
  resolveImmediateNextFormulaStep,
}: BuildTableStatusRowsServiceParams): TableStatusRow[] {
  const activeTableOrders = orders.filter((order) => {
    const status = normalizeOrderStatus(order.status);
    return !isPaidStatus(status) && !["archived", "archive", "archivee"].includes(status);
  });
  const byTable = new Map<number, Order[]>();
  activeTableOrders.forEach((order) => {
    const table = Number(order.table_number);
    if (!Number.isFinite(table) || table <= 0) return;
    byTable.set(table, [...(byTable.get(table) || []), order]);
  });

  return Array.from(byTable.entries())
    .map(([tableNumber, tableOrders]) => {
      const stepItems = tableOrders.flatMap((order) => {
        const currentStep = resolveOrderCurrentStep(order);
        if (!Number.isFinite(currentStep) || Number(currentStep) <= 0) return [];
        return parseItems(order.items).filter((item) => {
          const itemStep = resolveWorkflowStepForItem(item as Item);
          return Number.isFinite(itemStep) && itemStep === Number(currentStep);
        });
      });
      const stepFoodItems = stepItems.filter((item) => !isDrink(item as Item));
      const allServed = stepFoodItems.length > 0 && stepFoodItems.every((item) => isItemServed(item as Item));
      const hasCurrentStepWork = stepFoodItems.length > 0;
      const isAwaitingNextStep = hasCurrentStepWork && !allServed;
      false && console.log("TRACE:", {
        context: "admin.buildTableStatusRowsService",
        tableNumber,
        stepItemsCount: stepItems.length,
        stepFoodItemsCount: stepFoodItems.length,
        allServed,
        stepItems: stepItems.map((item) => {
          const record = item as unknown as Record<string, unknown>;
          return {
            order_item_id: String(record.order_item_id ?? record.orderItemId ?? "").trim() || null,
            dish_id: String(record.dish_id ?? record.id ?? "").trim() || null,
            name: String(record.name_fr ?? record.name ?? record.product_name ?? "").trim() || null,
            step: resolveWorkflowStepForItem(item as Item),
            isDrink: isDrink(item as Item),
            status: String(record.status ?? "").trim() || null,
            served: isItemServed(item as Item),
          };
        }),
      });
      const hasStartedTasting = tableOrders.some((order) => {
        const status = normalizeOrderStatus(order.status);
        if (["served", "servi", "servie"].includes(status)) return true;
        return parseItems(order.items).some((item) => isItemServed(item as Item));
      });
      const lastServedTimestamp = tableOrders
        .map((order) => resolveLastServedItemTimestamp(order))
        .filter((value): value is number => Number.isFinite(value))
        .sort((a, b) => b - a)[0];
      const diningMinutes =
        Number.isFinite(lastServedTimestamp) && hasStartedTasting
          ? Math.max(0, Math.floor((waitClockMs - Number(lastServedTimestamp)) / 60000))
          : null;

      let waitingMinutes: number | null = null;
      if (isAwaitingNextStep) {
        const lastStepChangeOrUpdateTimestamp = tableOrders
          .map((order) => new Date(String((order as unknown as Record<string, unknown>).updated_at || order.created_at || "")).getTime())
          .filter((value): value is number => Number.isFinite(value))
          .sort((a, b) => b - a)[0];
        if (Number.isFinite(lastStepChangeOrUpdateTimestamp)) {
          waitingMinutes = Math.max(0, Math.floor((waitClockMs - lastStepChangeOrUpdateTimestamp) / 60000));
        }
      } else if (!allServed) {
        const oldestPendingOrderTimestamp = tableOrders
          .map((order) => new Date(String(order.created_at || "")).getTime())
          .filter((value): value is number => Number.isFinite(value))
          .sort((a, b) => a - b)[0];
        if (Number.isFinite(oldestPendingOrderTimestamp)) {
          waitingMinutes = Math.max(0, Math.floor((waitClockMs - oldestPendingOrderTimestamp) / 60000));
        }
      }

      const resolvedActionEntry =
        tableOrders
          .map((order) => {
            const strictNextStep = resolveNextFormulaStep(order);
            if (strictNextStep) return { order, nextStep: strictNextStep };
            if (allServed) {
              const fallbackNextStep = resolveImmediateNextFormulaStep(order);
              if (fallbackNextStep) return { order, nextStep: fallbackNextStep };
            }
            return null;
          })
          .find(Boolean) ||
        (allServed
          ? tableOrders
              .map((order) => {
                const currentServedStep = resolveOrderCurrentStep(order);
                if (!Number.isFinite(currentServedStep) || Number(currentServedStep) <= 0) return null;
                const allTableItems = parseItems(order.items);
                const higherSteps = allTableItems
                  .map((item) => resolveWorkflowStepForItem(item as Item))
                  .filter((step): step is number => Number.isFinite(step) && Number(step) > Number(currentServedStep));
                if (higherSteps.length === 0) return null;
                return {
                  order,
                  nextStep: Math.min(...higherSteps),
                };
              })
              .find(Boolean)
          : null) ||
        null;

      return {
        tableNumber,
        allServed,
        hasStartedTasting,
        isAwaitingNextStep,
        diningMinutes,
        waitingMinutes,
        count: tableOrders.length,
        formulaActionOrder: resolvedActionEntry?.order ?? null,
        nextFormulaStep: resolvedActionEntry?.nextStep ?? null,
      };
    })
    .sort((a, b) => a.tableNumber - b.tableNumber);
}
