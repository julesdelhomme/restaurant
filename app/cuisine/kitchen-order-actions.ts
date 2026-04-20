import type { Item, Order } from "./types";

type TransitionMode = "ready_current" | "prepare_next";

type TransitionOrderStepArgs = {
  mode: TransitionMode;
  orderId: string | number;
  targetOrder: Order;
  supabase: any;
  getOrderItems: (order: Order) => Item[];
  isKitchenCourse: (item: Item) => boolean;
  resolveOrderCurrentStep: (order: Order, items: Item[]) => number;
  resolveItemStepRank: (item: Item) => number;
  setItemStatus: (item: Item, status: "pending" | "preparing" | "ready") => Item;
  deriveOrderStatusFromItems: (items: Item[]) => string;
  resolveServiceStepFromCurrentStep: (currentStep: number) => string;
};

export const transitionOrderStep = async ({
  mode,
  orderId,
  targetOrder,
  supabase,
  getOrderItems,
  isKitchenCourse,
  resolveOrderCurrentStep,
  resolveItemStepRank,
  setItemStatus,
  deriveOrderStatusFromItems,
  resolveServiceStepFromCurrentStep,
}: TransitionOrderStepArgs) => {
  const currentItems = getOrderItems(targetOrder);
  if (currentItems.length === 0) {
    return { ok: false as const, reason: "no_items" };
  }

  const kitchenItems = currentItems.filter((item) => isKitchenCourse(item));
  const currentStep = resolveOrderCurrentStep(targetOrder, kitchenItems as Item[]);
  const persistedCurrentStep = Number.isFinite(currentStep) && Number(currentStep) > 0 ? Number(currentStep) : 1;
  const targetStep = mode === "ready_current" ? persistedCurrentStep : persistedCurrentStep + 1;
  const targetStatus: "ready" | "preparing" = mode === "ready_current" ? "ready" : "preparing";
  const targetedStepItems = kitchenItems.filter((item) => resolveItemStepRank(item) === targetStep);
  const targetedOrderItemIds = new Set(
    targetedStepItems
      .map((item) => {
        const record = item as unknown as Record<string, unknown>;
        return String(record.order_item_id ?? record.orderItemId ?? "").trim();
      })
      .filter(Boolean)
  );
  const targetedFallbackKeys = new Set(
    targetedStepItems
      .map((item) => {
        const record = item as unknown as Record<string, unknown>;
        const dishId = String(record.dish_id ?? item.id ?? "").trim();
        const step = Number(resolveItemStepRank(item));
        const sort = Number(record.sort_order ?? record.sortOrder ?? record.step_number ?? record.sequence ?? NaN);
        const sortPart = Number.isFinite(sort) ? String(sort) : "na";
        const namePart = String((item as any).name_fr || item.name || "").trim().toLowerCase();
        return `dish:${dishId}:step:${step}:sort:${sortPart}:name:${namePart}`;
      })
      .filter(Boolean)
  );
  false && console.log("TRACE:", {
    context: "kitchen.transitionOrderStep.before",
    mode,
    orderId,
    persistedCurrentStep,
    targetStep,
    targetStatus,
    targetedOrderItemIds: [...targetedOrderItemIds],
    targetedFallbackKeys: [...targetedFallbackKeys],
    targetedItems: targetedStepItems.map((item) => {
      const record = item as unknown as Record<string, unknown>;
      return {
        order_item_id: String(record.order_item_id ?? record.orderItemId ?? "").trim() || null,
        dish_id: String(record.dish_id ?? item.id ?? "").trim() || null,
        name: String((item as any).name_fr || item.name || "").trim() || null,
        stepRank: resolveItemStepRank(item),
        status: String(record.status ?? "").trim() || null,
      };
    }),
  });
  if (mode === "ready_current" && targetedStepItems.length === 0) {
    return { ok: false as const, reason: "no_target_step_items" };
  }

  const nextItems = currentItems.map((item) => {
    if (!isKitchenCourse(item)) return item;
    const record = item as unknown as Record<string, unknown>;
    const orderItemId = String(record.order_item_id ?? record.orderItemId ?? "").trim();
    const dishId = String(record.dish_id ?? item.id ?? "").trim();
    const itemStep = Number(resolveItemStepRank(item));
    const sort = Number(record.sort_order ?? record.sortOrder ?? record.step_number ?? record.sequence ?? NaN);
    const sortPart = Number.isFinite(sort) ? String(sort) : "na";
    const namePart = String((item as any).name_fr || item.name || "").trim().toLowerCase();
    const fallbackKey = `dish:${dishId}:step:${itemStep}:sort:${sortPart}:name:${namePart}`;
    const isTargeted =
      (orderItemId && targetedOrderItemIds.has(orderItemId)) ||
      (!orderItemId && targetedFallbackKeys.has(fallbackKey));
    if (isTargeted) {
      return setItemStatus(item, targetStatus);
    }
    return item;
  });

  const nextStatus = deriveOrderStatusFromItems(nextItems);
  const nextCurrentStep = mode === "ready_current" ? persistedCurrentStep : persistedCurrentStep + 1;
  const nextServiceStep = resolveServiceStepFromCurrentStep(nextCurrentStep);
  const orderUpdatePayload = {
    items: nextItems,
    status: nextStatus,
    service_step: nextServiceStep,
    current_step: nextCurrentStep,
  };
  false && console.log("TRACE:", {
    context: "kitchen.transitionOrderStep.after",
    mode,
    orderId,
    nextStatus,
    nextServiceStep,
    nextCurrentStep,
    nextItems: nextItems.map((item) => {
      const record = item as unknown as Record<string, unknown>;
      return {
        order_item_id: String(record.order_item_id ?? record.orderItemId ?? "").trim() || null,
        dish_id: String(record.dish_id ?? item.id ?? "").trim() || null,
        name: String((item as any).name_fr || item.name || "").trim() || null,
        stepRank: resolveItemStepRank(item),
        status: String(record.status ?? "").trim() || null,
      };
    }),
  });

  let updateResult = await supabase
    .from("orders")
    .update(orderUpdatePayload)
    .eq("id", orderId)
    .select("id,status,service_step,current_step,items");
  if (updateResult.error && nextStatus === "ready") {
    const fallback = await supabase
      .from("orders")
      .update({ ...orderUpdatePayload, status: "pret" })
      .eq("id", orderId)
      .select("id,status,service_step,current_step,items");
    updateResult = fallback;
  }

  if (updateResult.error) {
    return { ok: false as const, reason: "update_error", error: updateResult.error };
  }

  return {
    ok: true as const,
    nextItems,
    nextStatus,
    nextServiceStep,
    nextCurrentStep,
    persistedCurrentStep,
  };
};

export const sendKitchenReminderNotification = async (args: {
  supabase: any;
  restaurantId: string;
}) => {
  const targetRestaurantId = String(args.restaurantId || "").trim();
  if (!targetRestaurantId) {
    return { ok: false as const, reason: "missing_restaurant" };
  }

  const notificationPayload = {
    type: "CUISINE",
    message: "La cuisine appelle les serveurs",
    table_number: "CUISINE",
    status: "pending",
    restaurant_id: targetRestaurantId,
  };
  const notifInsert = await args.supabase.from("notifications").insert([notificationPayload]);
  if (notifInsert.error) {
    return { ok: false as const, reason: "insert_error", error: notifInsert.error };
  }
  return { ok: true as const };
};
