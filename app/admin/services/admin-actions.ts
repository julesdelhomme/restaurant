import type { Order } from "../types";
import type { Item } from "../utils/order-items";

export async function runHandleServeItemsService(params: {
  orderId: string;
  itemRefs: Array<{ index: number; orderItemId?: string | null; fallbackItemId?: string | null }>;
  orders: Order[];
  fetchOrders: () => Promise<void>;
  parseItems: (value: unknown) => Item[];
  deriveOrderStatusFromItems: (items: Item[]) => string;
  setOrders: (updater: (prev: Order[]) => Order[]) => void;
  updateOrderItemsAndStatus: (orderId: string, items: Item[], status: string) => Promise<{ error: unknown | null }>;
}): Promise<void> {
  const {
    orderId,
    itemRefs,
    orders,
    fetchOrders,
    parseItems,
    deriveOrderStatusFromItems,
    setOrders,
    updateOrderItemsAndStatus,
  } = params;
  const targetOrder = orders.find((order) => String(order?.id || "") === String(orderId));
  if (!targetOrder) {
    await fetchOrders();
    return;
  }
  const normalizedRefs = itemRefs
    .map((entry) => ({
      index: Number(entry.index),
      orderItemId: String(entry.orderItemId || "").trim(),
      fallbackItemId: String(entry.fallbackItemId || "").trim(),
    }))
    .filter((entry) => Number.isInteger(entry.index) && entry.index >= 0);
  if (normalizedRefs.length === 0) return;
  const currentItems = parseItems(targetOrder.items);
  const indexSet = new Set<number>(normalizedRefs.map((entry) => entry.index));
  const orderItemIdSet = new Set(normalizedRefs.map((entry) => entry.orderItemId).filter(Boolean));
  const fallbackItemIdSet = new Set(normalizedRefs.map((entry) => entry.fallbackItemId).filter(Boolean));
  false && console.log("TRACE:", {
    context: "admin.runHandleServeItemsService.before",
    orderId,
    refs: normalizedRefs,
    currentItems: currentItems.map((item, index) => {
      const record = item as unknown as Record<string, unknown>;
      return {
        index,
        order_item_id: String(record.order_item_id ?? record.orderItemId ?? "").trim() || null,
        fallbackItemId: String(record.id ?? record.dish_id ?? "").trim() || null,
        status: String(record.status ?? "").trim() || null,
        name: String(record.name_fr ?? record.name ?? record.product_name ?? "").trim() || null,
      };
    }),
  });

  const nextItems = currentItems.map((item, idx) => {
    const record = item as unknown as Record<string, unknown>;
    const orderItemId = String(record.order_item_id ?? record.orderItemId ?? "").trim();
    const fallbackItemId = String(record.id ?? record.dish_id ?? "").trim();
    const isTargetedByOrderItemId = orderItemId ? orderItemIdSet.has(orderItemId) : false;
    const isTargetedByFallback = !isTargetedByOrderItemId && fallbackItemId ? fallbackItemIdSet.has(fallbackItemId) : false;
    const isTargetedByIndex = !isTargetedByOrderItemId && !isTargetedByFallback && indexSet.has(idx);
    if (isTargetedByOrderItemId || isTargetedByFallback || isTargetedByIndex) {
      return { ...(item || {}), status: "served" };
    }
    return item;
  });
  const nextStatus = deriveOrderStatusFromItems(nextItems);
  false && console.log("TRACE:", {
    context: "admin.runHandleServeItemsService.after",
    orderId,
    nextStatus,
    nextItems: nextItems.map((item, index) => {
      const record = item as unknown as Record<string, unknown>;
      return {
        index,
        order_item_id: String(record.order_item_id ?? record.orderItemId ?? "").trim() || null,
        fallbackItemId: String(record.id ?? record.dish_id ?? "").trim() || null,
        status: String(record.status ?? "").trim() || null,
        name: String(record.name_fr ?? record.name ?? record.product_name ?? "").trim() || null,
      };
    }),
  });

  setOrders((prev) =>
    prev.map((order) => (String(order.id) === String(orderId) ? { ...order, items: nextItems, status: nextStatus } : order))
  );

  const { error } = await updateOrderItemsAndStatus(orderId, nextItems, nextStatus);
  if (error) {
    console.error("Erreur service articles:", error);
    await fetchOrders();
  }
}

export async function runHandleSendKitchenNoteService(params: {
  kitchenNoteText: string;
  restaurantId: string | number | null;
  scopedRestaurantId: string;
  setKitchenNoteFeedback: (value: string) => void;
  setKitchenNoteSending: (value: boolean) => void;
  setKitchenNoteText: (value: string) => void;
  setKitchenNoteOpen: (value: boolean) => void;
  insertKitchenMessage: (payload: Record<string, unknown>) => Promise<{ error: any }>;
}): Promise<void> {
  const {
    kitchenNoteText,
    restaurantId,
    scopedRestaurantId,
    setKitchenNoteFeedback,
    setKitchenNoteSending,
    setKitchenNoteText,
    setKitchenNoteOpen,
    insertKitchenMessage,
  } = params;
  const trimmedMessage = String(kitchenNoteText || "").trim();
  if (!trimmedMessage) {
    setKitchenNoteFeedback("Veuillez saisir un message avant l'envoi.");
    return;
  }
  const targetRestaurantId = String(restaurantId || scopedRestaurantId || "").trim();
  if (!targetRestaurantId) {
    setKitchenNoteFeedback("Restaurant introuvable. Impossible d'envoyer le message.");
    return;
  }

  setKitchenNoteSending(true);
  setKitchenNoteFeedback("");
  try {
    const insertResult = await insertKitchenMessage({
      restaurant_id: targetRestaurantId,
      content: trimmedMessage,
      message: trimmedMessage,
      is_active: true,
    });
    if (insertResult.error) {
      console.error(
        "ERREUR SUPABASE REELLE (kitchen_messages):",
        insertResult.error.message,
        insertResult.error?.details,
        insertResult.error?.hint
      );
      setKitchenNoteFeedback("Impossible de transmettre le message à la cuisine.");
      return;
    }
    setKitchenNoteText("");
    setKitchenNoteOpen(false);
    setKitchenNoteFeedback("Votre message a été transmis à la cuisine");
    if (typeof window !== "undefined") {
      window.setTimeout(() => setKitchenNoteFeedback(""), 2500);
    }
  } catch (error) {
    console.error("Erreur inattendue envoi note cuisine:", error);
    setKitchenNoteFeedback("Une erreur est survenue lors de l'envoi.");
  } finally {
    setKitchenNoteSending(false);
  }
}

export async function runMarkNotificationReadService(params: {
  notificationId: string;
  updateNotificationStatus: (notificationId: string, status: string) => Promise<{ error: unknown | null }>;
  setServiceNotifications: (
    updater: (prev: Array<{ id: string } & Record<string, unknown>>) => Array<{ id: string } & Record<string, unknown>>
  ) => void;
}): Promise<void> {
  const { notificationId, updateNotificationStatus, setServiceNotifications } = params;
  const { error } = await updateNotificationStatus(notificationId, "completed");
  if (error) {
    console.error("Erreur traitement notification:", error);
    return;
  }
  setServiceNotifications((prev) => prev.filter((row) => String(row.id) !== String(notificationId)));
}
