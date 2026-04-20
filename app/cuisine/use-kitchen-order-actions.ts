import { useState } from "react";
import type { Order } from "./types";
import { sendKitchenReminderNotification, transitionOrderStep } from "./kitchen-order-actions";

type UseKitchenOrderActionsArgs = {
  orders: Order[];
  supabase: any;
  resolvedRestaurantId: string;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  setIsOrderStatusUpdating: React.Dispatch<React.SetStateAction<boolean>>;
  isOrderStatusUpdatingRef: { current: boolean };
  needsOrderRefreshRef: { current: boolean };
  fetchOrders: (allowAutoPrint?: boolean) => Promise<any>;
  logSqlError: (context: string, error: unknown) => void;
  getOrderItems: any;
  isKitchenCourse: any;
  resolveOrderCurrentStep: any;
  resolveItemStepRank: any;
  setItemStatus: any;
  deriveOrderStatusFromItems: any;
  resolveServiceStepFromCurrentStep: any;
};

export function useKitchenOrderActions(args: UseKitchenOrderActionsArgs) {
  const {
    orders,
    supabase,
    resolvedRestaurantId,
    setOrders,
    setIsOrderStatusUpdating,
    isOrderStatusUpdatingRef,
    needsOrderRefreshRef,
    fetchOrders,
    logSqlError,
    getOrderItems,
    isKitchenCourse,
    resolveOrderCurrentStep,
    resolveItemStepRank,
    setItemStatus,
    deriveOrderStatusFromItems,
    resolveServiceStepFromCurrentStep,
  } = args;

  const [readyGroupLoadingKey, setReadyGroupLoadingKey] = useState<string>("");

  const applyOrderStepTransition = async (orderId: string | number, mode: "ready_current" | "prepare_next") => {
    try {
      const targetOrder = orders.find((order) => String(order.id) === String(orderId));
      if (!targetOrder) {
        needsOrderRefreshRef.current = true;
        return;
      }
      const result = await transitionOrderStep({
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
      });
      if (!result.ok) {
        if (result.reason !== "no_items" && result.reason !== "no_target_step_items") {
          console.error("order transition failed:", result.reason, (result as any).error || null);
          needsOrderRefreshRef.current = true;
        } else {
          false && console.log("TRACE:", {
            context: "kitchen.applyOrderStepTransition.blocked",
            mode,
            orderId,
            reason: result.reason,
          });
        }
        return;
      }
      false && console.log("TRACE:", {
        context: "kitchen.applyOrderStepTransition",
        mode,
        orderId,
        nextCurrentStep: result.nextCurrentStep,
        nextServiceStep: result.nextServiceStep,
        nextStatus: result.nextStatus,
      });
      setOrders((prev) =>
        prev.map((order) => {
          if (String(order.id) !== String(orderId)) return order;
          return {
            ...order,
            items: result.nextItems,
            status: result.nextStatus,
            service_step: result.nextServiceStep,
            current_step: result.nextCurrentStep,
          };
        })
      );
    } catch (error) {
      console.error("order transition unexpected error:", error);
      needsOrderRefreshRef.current = true;
    }
  };

  const handleReady = async (orderId: string | number) => {
    await applyOrderStepTransition(orderId, "ready_current");
  };

  const handleSendNextStep = async (orderId: string | number) => {
    await applyOrderStepTransition(orderId, "prepare_next");
  };

  const handleReadyGroup = async (groupKey: string, orderIds: Array<string | number>) => {
    if (!groupKey || orderIds.length === 0) return;
    isOrderStatusUpdatingRef.current = true;
    setIsOrderStatusUpdating(true);
    setReadyGroupLoadingKey(groupKey);
    try {
      for (const orderId of orderIds) {
        await handleReady(orderId);
      }
    } finally {
      setReadyGroupLoadingKey("");
      isOrderStatusUpdatingRef.current = false;
      setIsOrderStatusUpdating(false);
      if (needsOrderRefreshRef.current) {
        needsOrderRefreshRef.current = false;
        await fetchOrders();
      }
    }
  };

  const handleRemindServer = async () => {
    const result = await sendKitchenReminderNotification({
      supabase,
      restaurantId: String(resolvedRestaurantId || "").trim(),
    });
    if (!result.ok) {
      if (result.reason === "missing_restaurant") {
        alert("Restaurant introuvable, rappel impossible.");
        return;
      }
      logSqlError("kitchen.handleRemindServer.notifications", (result as any).error || result.reason);
      alert("Impossible d'envoyer le rappel serveur.");
      return;
    }
    alert("Alerte envoyée aux serveurs.");
  };

  return {
    readyGroupLoadingKey,
    handleReadyGroup,
    handleRemindServer,
  };
}
