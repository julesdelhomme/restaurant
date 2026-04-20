import { fetchKitchenOrdersQuery } from "./kitchen-orders-query";
import type { Item, Order } from "./types";

type RunKitchenFetchCycleArgs = {
  supabase: any;
  restaurantId: string;
  getOrderItems: (order: Order) => Item[];
  isKitchenCourse: (item: any) => boolean;
  hydrateDishNamesFromOrders: (ordersToHydrate: Order[]) => Promise<void>;
  hasPreparingOrReadyKitchenItems: (order: Order) => boolean;
  getKitchenItems: (order: Order) => Item[];
  resolveOrderCurrentStep: (order: Order, items: Item[]) => number;
  autoPrintEnabled: boolean;
  allowAutoPrint: boolean;
  hasInitializedPendingSnapshotRef: { current: boolean };
  lastPrintedStepByOrderIdRef: { current: Record<string, number> };
  knownPendingIdsRef: { current: Record<string, boolean> };
  setPrintOrder: React.Dispatch<React.SetStateAction<Order | null>>;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
};

export const runKitchenFetchCycle = async ({
  supabase,
  restaurantId,
  getOrderItems,
  isKitchenCourse,
  hydrateDishNamesFromOrders,
  hasPreparingOrReadyKitchenItems,
  getKitchenItems,
  resolveOrderCurrentStep,
  autoPrintEnabled,
  allowAutoPrint,
  hasInitializedPendingSnapshotRef,
  lastPrintedStepByOrderIdRef,
  knownPendingIdsRef,
  setPrintOrder,
  setOrders,
}: RunKitchenFetchCycleArgs) => {
  const { error, kitchenOrdersWithCovers } = await fetchKitchenOrdersQuery({
    supabase,
    restaurantId,
    getOrderItems,
    isKitchenCourse,
  });
  if (error) {
    return { ok: false as const, error };
  }

  await hydrateDishNamesFromOrders(kitchenOrdersWithCovers);

  const pendingRows = kitchenOrdersWithCovers.filter((o: any) => hasPreparingOrReadyKitchenItems(o as Order));
  const pendingMap: Record<string, boolean> = {};
  pendingRows.forEach((o: any) => {
    pendingMap[String(o.id)] = true;
  });
  if (!hasInitializedPendingSnapshotRef.current) {
    const seeded: Record<string, number> = {};
    kitchenOrdersWithCovers.forEach((order) => {
      const orderId = String(order.id || "").trim();
      if (!orderId) return;
      const itemsForStep = getKitchenItems(order as Order);
      const currentStep = resolveOrderCurrentStep(order as Order, itemsForStep as Item[]);
      const normalizedStep = Number.isFinite(currentStep) && Number(currentStep) > 0 ? Number(currentStep) : 1;
      seeded[orderId] = normalizedStep;
    });
    lastPrintedStepByOrderIdRef.current = seeded;
  }
  const stepPrintCandidate = (() => {
    if (!autoPrintEnabled || !allowAutoPrint || !hasInitializedPendingSnapshotRef.current) return null;
    for (const order of pendingRows) {
      const orderId = String(order.id || "").trim();
      if (!orderId) continue;
      const itemsForStep = getKitchenItems(order as Order);
      if (itemsForStep.length === 0) continue;
      const currentStep = resolveOrderCurrentStep(order as Order, itemsForStep as Item[]);
      const normalizedStep = Number.isFinite(currentStep) && Number(currentStep) > 0 ? Number(currentStep) : 1;
      const lastPrintedStep = lastPrintedStepByOrderIdRef.current[orderId] ?? 0;
      if (normalizedStep > lastPrintedStep) {
        lastPrintedStepByOrderIdRef.current[orderId] = normalizedStep;
        return order as Order;
      }
    }
    return null;
  })();

  const newPending = pendingRows.find((o: any) => !knownPendingIdsRef.current[String(o.id)]);
  const printCandidate = stepPrintCandidate || (newPending as Order | undefined) || null;
  let shouldTriggerAutoPrint = false;
  if (autoPrintEnabled && allowAutoPrint && hasInitializedPendingSnapshotRef.current && printCandidate) {
    if (!stepPrintCandidate && newPending) {
      const orderId = String(newPending.id || "").trim();
      if (orderId) {
        const itemsForStep = getKitchenItems(newPending as Order);
        const currentStep = resolveOrderCurrentStep(newPending as Order, itemsForStep as Item[]);
        const normalizedStep = Number.isFinite(currentStep) && Number(currentStep) > 0 ? Number(currentStep) : 1;
        lastPrintedStepByOrderIdRef.current[orderId] = normalizedStep;
      }
    }
    setPrintOrder(printCandidate);
    shouldTriggerAutoPrint = true;
  }

  knownPendingIdsRef.current = pendingMap;
  hasInitializedPendingSnapshotRef.current = true;
  setOrders(kitchenOrdersWithCovers);

  return { ok: true as const, shouldTriggerAutoPrint };
};
