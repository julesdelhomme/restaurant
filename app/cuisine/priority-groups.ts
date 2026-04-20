import type { Item, Order } from "./types";

export type KitchenGroupItem = { orderId: string | number; item: Item; idx: number; serviceStep: unknown };
export type GroupedPriorityOrder = {
  groupKey: string;
  tableNumber: string;
  covers: number | null;
  createdAt: string;
  orderIds: Array<string | number>;
  serviceStep: string;
  currentStep: number;
  hasFormulaItems: boolean;
  nextStepItems: Array<{ orderId: string | number; item: Item; idx: number }>;
  items: KitchenGroupItem[];
};

type BuildGroupedPriorityOrdersArgs = {
  priorityOrders: Order[];
  getKitchenItems: (order: Order) => Item[];
  isFormulaItem: (item: Item) => boolean;
  resolveOrderServiceStep: (order: Order, items: Item[]) => string;
  getPendingKitchenItems: (order: Order) => Item[];
  resolveOrderCurrentStep: (order: Order, items: Item[]) => number;
  resolveItemStepRank: (item: Item) => number;
  normalizeEntityId: (value: unknown) => string;
  resolveKitchenDishName: (item: Item) => string;
  resolveServiceStepRank: (step: unknown) => number;
};

export const buildGroupedPriorityOrders = ({
  priorityOrders,
  getKitchenItems,
  isFormulaItem,
  resolveOrderServiceStep,
  getPendingKitchenItems,
  resolveOrderCurrentStep,
  resolveItemStepRank,
  normalizeEntityId,
  resolveKitchenDishName,
  resolveServiceStepRank,
}: BuildGroupedPriorityOrdersArgs): GroupedPriorityOrder[] => {
  const getHourKey = (createdAt: string) => {
    const date = new Date(createdAt);
    if (!Number.isFinite(date.getTime())) return String(createdAt || "").slice(0, 13);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
  };
  const toCovers = (order: Order) => {
    const value = Number(order.covers || order.guest_count || order.customer_count || 0);
    return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null;
  };

  const map = new Map<string, GroupedPriorityOrder>();
  priorityOrders.forEach((order) => {
    const hourKey = getHourKey(String(order.created_at || ""));
    const tableNumber = String(order.table_number || "").trim() || "?";
    const kitchenItems = getKitchenItems(order);
    const pendingForCurrentStep = getPendingKitchenItems(order);
    const resolvedCurrentStep = resolveOrderCurrentStep(order, pendingForCurrentStep);
    const normalizedCurrentStep =
      Number.isFinite(resolvedCurrentStep) && Number(resolvedCurrentStep) > 0 ? Number(resolvedCurrentStep) : 1;
    const hasFormulaItems = kitchenItems.some((item) => isFormulaItem(item));
    const serviceStep = hasFormulaItems ? resolveOrderServiceStep(order, kitchenItems) : "";
    const groupKey = `${tableNumber}-${hourKey}-${serviceStep || "plat"}`;
    if (kitchenItems.length === 0) return;
    const existing = map.get(groupKey);
    if (existing) {
      existing.orderIds.push(order.id);
      existing.items.push(
        ...kitchenItems.map((item, idx) => ({
          orderId: order.id,
          item,
          idx,
          serviceStep: order.service_step,
        }))
      );
      if (!existing.hasFormulaItems && hasFormulaItems) existing.hasFormulaItems = true;
      if (normalizedCurrentStep > existing.currentStep) existing.currentStep = normalizedCurrentStep;
      const nextCovers = toCovers(order);
      if (!existing.covers && nextCovers) existing.covers = nextCovers;
      if (new Date(order.created_at).getTime() < new Date(existing.createdAt).getTime()) {
        existing.createdAt = order.created_at;
      }
      return;
    }
    map.set(groupKey, {
      groupKey,
      tableNumber,
      covers: toCovers(order),
      createdAt: order.created_at,
      orderIds: [order.id],
      serviceStep,
      currentStep: normalizedCurrentStep,
      hasFormulaItems,
      nextStepItems: [],
      items: kitchenItems.map((item, idx) => ({
        orderId: order.id,
        item,
        idx,
        serviceStep: order.service_step,
      })),
    });
  });

  return [...map.values()]
    .map((group) => ({
      ...group,
      nextStepItems: (() => {
        const nextItems: Array<{ orderId: string | number; item: Item; idx: number }> = [];
        const seen = new Set<string>();
        const sourceOrders = group.orderIds
          .map((orderId) => priorityOrders.find((order) => String(order.id) === String(orderId)))
          .filter((order): order is Order => Boolean(order));
        if (sourceOrders.length === 0) return nextItems;
        const groupCurrentStep =
          (sourceOrders
            .map((order) => {
              const pendingItems = getPendingKitchenItems(order);
              return resolveOrderCurrentStep(order, pendingItems);
            })
            .filter((step): step is number => Number.isFinite(step) && step > 0)
            .sort((a, b) => a - b)[0] ?? group.currentStep ?? 1);
        const hasFollowUp = sourceOrders.some((sourceOrder) =>
          getPendingKitchenItems(sourceOrder).some((item) => {
            const step = resolveItemStepRank(item);
            return Number.isFinite(step) && step > groupCurrentStep;
          })
        );
        if (!hasFollowUp) return nextItems;
        const nextAvailableStep = sourceOrders
          .flatMap((sourceOrder) => getPendingKitchenItems(sourceOrder).map((item) => resolveItemStepRank(item)))
          .filter((step): step is number => Number.isFinite(step) && step > groupCurrentStep)
          .sort((a, b) => a - b)[0];
        if (!Number.isFinite(nextAvailableStep)) return nextItems;
        sourceOrders.forEach((sourceOrder) => {
          const pendingItems = getPendingKitchenItems(sourceOrder);
          const upcoming = pendingItems.filter((item) => resolveItemStepRank(item) === nextAvailableStep);
          if (upcoming.length === 0) return;
          upcoming.forEach((item, idx) => {
            const stableId =
              normalizeEntityId((item as unknown as Record<string, unknown>).order_item_id ?? item.id) ||
              `${sourceOrder.id}-${idx}-${resolveKitchenDishName(item)}`;
            const key = `${String(sourceOrder.id)}-${stableId}`;
            if (!key || seen.has(key)) return;
            seen.add(key);
            nextItems.push({
              orderId: sourceOrder.id,
              item,
              idx,
            });
          });
        });
        return nextItems.sort((a, b) => {
          const orderDiff = String(a.orderId).localeCompare(String(b.orderId), "fr", {
            numeric: true,
            sensitivity: "base",
          });
          if (orderDiff !== 0) return orderDiff;
          return a.idx - b.idx;
        });
      })(),
      items: [...group.items].sort((a, b) => {
        const stepDiff = resolveItemStepRank(a.item) - resolveItemStepRank(b.item);
        if (stepDiff !== 0) return stepDiff;
        const orderDiff = String(a.orderId).localeCompare(String(b.orderId), "fr", { numeric: true, sensitivity: "base" });
        if (orderDiff !== 0) return orderDiff;
        return a.idx - b.idx;
      }),
    }))
    .sort((a, b) => {
      const tableA = Number(a.tableNumber);
      const tableB = Number(b.tableNumber);
      if (Number.isFinite(tableA) && Number.isFinite(tableB) && tableA !== tableB) {
        return tableA - tableB;
      }
      const tableDiff = a.tableNumber.localeCompare(b.tableNumber, "fr", { numeric: true, sensitivity: "base" });
      if (tableDiff !== 0) return tableDiff;
      const stepDiff = resolveServiceStepRank(a.serviceStep) - resolveServiceStepRank(b.serviceStep);
      if (stepDiff !== 0) return stepDiff;
      const currentStepDiff = a.currentStep - b.currentStep;
      if (currentStepDiff !== 0) return currentStepDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
};
