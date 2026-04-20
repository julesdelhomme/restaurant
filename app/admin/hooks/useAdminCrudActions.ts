import { useMemo } from "react";
import { runFillFormForEditService, runHandleDeleteTableService, runHandleSaveTableService } from "../services/admin-table-actions";
import { runHandleSendKitchenNoteService, runHandleServeItemsService, runMarkNotificationReadService } from "../services/admin-actions";

type Params = Record<string, any>;

export function useAdminCrudActions(params: Params) {
  const {
    supabase,
    tableNumberInput,
    pinInput,
    coversInput,
    restaurantId,
    scopedRestaurantId,
    normalizeCoversValue,
    setMessage,
    setSaving,
    setPinInput,
    setCoversInput,
    fetchActiveTables,
    readCoversFromRow,
    setTableNumberInput,
    orders,
    fetchOrders,
    parseItems,
    deriveOrderStatusFromItems,
    setOrders,
    kitchenNoteText,
    setKitchenNoteFeedback,
    setKitchenNoteSending,
    setKitchenNoteText,
    setKitchenNoteOpen,
    setServiceNotifications,
  } = params;

  return useMemo(
    () => ({
      handleSaveTable: async () =>
        runHandleSaveTableService({
          supabase,
          tableNumberInput,
          pinInput,
          coversInput,
          restaurantId,
          scopedRestaurantId,
          normalizeCoversValue,
          setMessage,
          setSaving,
          setPinInput,
          setCoversInput,
          fetchActiveTables,
        }),
      handleDeleteTable: async (row: any) =>
        runHandleDeleteTableService({
          supabase,
          row,
          restaurantId,
          scopedRestaurantId,
          setMessage,
          fetchActiveTables,
        }),
      fillFormForEdit: (row: any) =>
        runFillFormForEditService({
          row,
          readCoversFromRow,
          setTableNumberInput,
          setPinInput,
          setCoversInput,
          setMessage,
        }),
      handleServeItems: async (
        orderId: string,
        itemRefs: Array<{ index: number; orderItemId?: string | null; fallbackItemId?: string | null }>
      ) =>
        runHandleServeItemsService({
          orderId,
          itemRefs,
          orders,
          fetchOrders,
          parseItems,
          deriveOrderStatusFromItems,
          setOrders,
          updateOrderItemsAndStatus: async (targetOrderId: string, items: unknown, status: string) => {
            const { error } = await supabase.from("orders").update({ items, status }).eq("id", targetOrderId);
            return { error };
          },
        }),
      handleSendKitchenNote: async () =>
        runHandleSendKitchenNoteService({
          kitchenNoteText,
          restaurantId,
          scopedRestaurantId,
          setKitchenNoteFeedback,
          setKitchenNoteSending,
          setKitchenNoteText,
          setKitchenNoteOpen,
          insertKitchenMessage: async (payload: Record<string, unknown>) => {
            const result = await supabase.from("kitchen_messages").insert([payload]);
            return { error: result.error };
          },
        }),
      markNotificationRead: async (notificationId: string) =>
        runMarkNotificationReadService({
          notificationId,
          updateNotificationStatus: async (targetNotificationId: string, status: string) => {
            const { error } = await supabase.from("notifications").update({ status }).eq("id", targetNotificationId);
            return { error };
          },
          setServiceNotifications: (updater: any) =>
            setServiceNotifications((prev: Array<{ id: string } & Record<string, unknown>>) => updater(prev) as any),
        }),
    }),
    [
      supabase,
      tableNumberInput,
      pinInput,
      coversInput,
      restaurantId,
      scopedRestaurantId,
      normalizeCoversValue,
      setMessage,
      setSaving,
      setPinInput,
      setCoversInput,
      fetchActiveTables,
      readCoversFromRow,
      setTableNumberInput,
      orders,
      fetchOrders,
      parseItems,
      deriveOrderStatusFromItems,
      setOrders,
      kitchenNoteText,
      setKitchenNoteFeedback,
      setKitchenNoteSending,
      setKitchenNoteText,
      setKitchenNoteOpen,
      setServiceNotifications,
    ]
  );
}
