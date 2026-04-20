import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import { completeNotification, sendKitchenNote } from "../services/bar-caisse-data";
import { markTablePaid } from "../services/bar-caisse-operations";
import {
  buildTicketPdf,
  createTicketPayloadForTable,
  createTicketPayloadFromItems,
  createTicketPayloadFromRealtimeOrder,
  sendTicketEmail,
} from "../services/bar-caisse-ticket";
import { deriveOrderStatusFromItems, parseItems, resolveStaffDestination, setItemPrepStatus, toErrorInfo } from "../bar-caisse-helpers";

type UseBarCaisseActionsParams = {
  supabase: any;
  restaurantId: string | number | null;
  scopedRestaurantId: string;
  settingsRowId: string;

  orders: any[];
  setOrders: Dispatch<SetStateAction<any[]>>;
  setInventory: Dispatch<SetStateAction<any[]>>;
  fetchOrders: () => Promise<void>;
  fetchRestaurantSettings: () => Promise<void>;

  categoryDestinationById: Record<string, "cuisine" | "bar">;
  dishCategoryIdByDishId: Record<string, string>;

  setServiceNotifications: Dispatch<SetStateAction<any[]>>;
  setKitchenNoteFeedback: Dispatch<SetStateAction<string>>;
  setKitchenNoteSending: Dispatch<SetStateAction<boolean>>;
  setKitchenNoteText: Dispatch<SetStateAction<string>>;
  setKitchenNoteOpen: Dispatch<SetStateAction<boolean>>;

  kitchenNoteText: string;
  isMissingColumnOrCacheError: (error: unknown) => boolean;

  setGmailSaveLoading: Dispatch<SetStateAction<boolean>>;
  setGmailMessage: Dispatch<SetStateAction<string>>;
  gmailUser: string;
  gmailAppPassword: string;

  restaurantName: string;
  restaurantAddress: string;
  restaurantLogoUrl: string;
  restaurantSocialLinks: any;
  showSocialOnReceipt: boolean;
  activeOrders: any[];

  paymentBlockMessage: string;
  setThermalPrintPayload: Dispatch<SetStateAction<any>>;
  thermalPrintTriggerRef: MutableRefObject<number | null>;
};

export function useBarCaisseActions(params: UseBarCaisseActionsParams) {
  const {
    supabase,
    restaurantId,
    scopedRestaurantId,
    settingsRowId,
    orders,
    setOrders,
    fetchOrders,
    setInventory,
    fetchRestaurantSettings,
    categoryDestinationById,
    dishCategoryIdByDishId,
    setServiceNotifications,
    setKitchenNoteFeedback,
    setKitchenNoteSending,
    setKitchenNoteText,
    setKitchenNoteOpen,
    kitchenNoteText,
    isMissingColumnOrCacheError,
    setGmailSaveLoading,
    setGmailMessage,
    gmailUser,
    gmailAppPassword,
    restaurantName,
    restaurantAddress,
    restaurantLogoUrl,
    restaurantSocialLinks,
    showSocialOnReceipt,
    activeOrders,
    paymentBlockMessage,
    setThermalPrintPayload,
    thermalPrintTriggerRef,
  } = params;

  const saveGmailConfig = async () => {
    setGmailSaveLoading(true);
    setGmailMessage("");
    try {
      const targetRestaurantId = restaurantId ?? settingsRowId;
      const { error } = await supabase
        .from("restaurants")
        .update({ smtp_user: gmailUser.trim() || null, smtp_password: gmailAppPassword.trim() || null })
        .eq("id", targetRestaurantId);
      if (error) {
        console.error("Erreur sauvegarde Gmail:", error);
        setGmailMessage("Erreur de sauvegarde Gmail.");
        return;
      }
      setGmailMessage("Configuration Gmail enregistree.");
      await fetchRestaurantSettings();
    } finally {
      setGmailSaveLoading(false);
    }
  };

  const handleDrinkReady = async (orderId: string | number) => {
    const targetOrder = orders.find((order) => String(order.id) === String(orderId));
    if (!targetOrder) {
      await fetchOrders();
      return;
    }
    const currentItems = parseItems(targetOrder.items);
    if (currentItems.length === 0) return;
    const nextItems = currentItems.map((item) =>
      resolveStaffDestination(item, categoryDestinationById, dishCategoryIdByDishId) === "bar"
        ? setItemPrepStatus(item, "ready")
        : item
    );
    const nextStatus = deriveOrderStatusFromItems(nextItems);
    false && console.log("TRACE:", {
      context: "bar.handleDrinkReady.beforeUpdate",
      orderId: String(orderId),
      nextStatus,
      nextItemsCount: nextItems.length,
    });

    const { error } = await supabase
      .from("orders")
      .update({ items: nextItems, status: nextStatus })
      .eq("id", orderId);
    if (error) {
      console.error("Erreur Boisson prete:", error);
      await fetchOrders();
      return;
    }
    await fetchOrders();
  };

  const markNotificationHandled = async (notificationId: string | number) => {
    const { error } = await completeNotification({
      supabase,
      notificationId,
    });
    if (error) {
      console.error("Erreur traitement notification:", error);
      alert("Impossible de marquer la notification comme traitee.");
      return;
    }
    setServiceNotifications((prev) => prev.filter((row) => String(row.id) !== String(notificationId)));
  };

  const handleSendKitchenNote = async () => {
    const trimmedMessage = String(kitchenNoteText || "").trim();
    if (!trimmedMessage) {
      setKitchenNoteFeedback("Veuillez saisir un message avant l'envoi.");
      return;
    }

    const currentRestoId = String(restaurantId || scopedRestaurantId || "").trim();
    if (!currentRestoId) {
      setKitchenNoteFeedback("Restaurant introuvable. Impossible d'envoyer le message.");
      return;
    }

    setKitchenNoteSending(true);
    setKitchenNoteFeedback("");
    try {
      const result = await sendKitchenNote({
        supabase,
        restaurantId: currentRestoId,
        message: trimmedMessage,
        isMissingColumnOrCacheError,
      });
      if (result.error) {
        console.error("Erreur envoi note cuisine bar/caisse:", toErrorInfo(result.error));
        setKitchenNoteFeedback("Impossible de transmettre le message a la cuisine.");
        return;
      }

      setKitchenNoteText("");
      setKitchenNoteOpen(false);
      setKitchenNoteFeedback("Votre message a ete transmis a la cuisine.");
    } catch (error) {
      console.error("Erreur inattendue note cuisine bar/caisse:", error);
      setKitchenNoteFeedback("Une erreur est survenue lors de l'envoi.");
    } finally {
      setKitchenNoteSending(false);
    }
  };

  const buildTicketPayloadForTable = (
    tableNumber: number,
    paidAtIso?: string,
    paymentMethod: "Carte Bancaire" | "Espèces" = "Carte Bancaire",
    tipAmountRaw: unknown = 0
  ) => {
    return createTicketPayloadForTable({
      tableNumber,
      activeOrders,
      paidAtIso,
      paymentMethod,
      tipAmountRaw,
      restaurantName,
      restaurantAddress,
      restaurantLogoUrl,
      restaurantSocialLinks,
      showSocialOnReceipt,
    });
  };

  const buildTicketPayloadFromItems = (
    tableNumber: number,
    items: any[],
    paidAtIso: string,
    paymentMethod: "Carte Bancaire" | "Espèces" = "Carte Bancaire",
    tipAmountRaw: unknown = 0,
    orderIdOverride?: string | number | null
  ) => {
    return createTicketPayloadFromItems({
      tableNumber,
      items,
      paidAtIso,
      paymentMethod,
      tipAmountRaw,
      orderIdOverride,
      restaurantName,
      restaurantAddress,
      restaurantLogoUrl,
      restaurantSocialLinks,
      showSocialOnReceipt,
    });
  };

  const buildTicketPayloadFromRealtimeOrder = (orderRow: Record<string, unknown>) => {
    return createTicketPayloadFromRealtimeOrder({
      orderRow,
      restaurantName,
      restaurantAddress,
      restaurantLogoUrl,
      restaurantSocialLinks,
      showSocialOnReceipt,
    });
  };

  const openPrintTicket = (payload: any) => {
    const { blobUrl } = buildTicketPdf(payload);
    const win = window.open(blobUrl, "_blank", "noopener,noreferrer,width=420,height=760");
    if (!win) {
      alert("Impossible d'ouvrir la fenetre d'impression.");
      return;
    }
    win.focus();
  };

  const openThermalPrint = (payload: any) => {
    if (thermalPrintTriggerRef.current) {
      window.clearTimeout(thermalPrintTriggerRef.current);
      thermalPrintTriggerRef.current = null;
    }
    setThermalPrintPayload(payload);
    thermalPrintTriggerRef.current = window.setTimeout(() => {
      window.print();
      thermalPrintTriggerRef.current = null;
    }, 80);
  };

  const sendTicketByEmail = async (email: string, payload: any) => {
    return sendTicketEmail({
      email,
      payload,
      restaurantId,
      settingsRowId: settingsRowId,
    });
  };

  const markTableAsPaid = async (tableNumber: number, tipAmountRaw: unknown = 0) => {
    const result = await markTablePaid({
      supabase,
      orders,
      tableNumber,
      tipAmountRaw,
    });
    if (result.blocked) {
      alert(paymentBlockMessage);
      return false;
    }
    if (!result.ok) {
      return false;
    }
    setOrders(result.updatedOrders);
    if (result.warning) {
      alert(result.warning);
    }

    await fetchOrders();
    return true;
  };

  const toggleStock = async (item: any) => {
    const newStatus = !Boolean(item.active);
    const { error } = await supabase.from("dishes").update({ active: newStatus }).eq("id", item.id);
    if (error) {
      console.error("Erreur toggle stock:", error);
      alert("Impossible de mettre a jour le stock.");
      return;
    }
    setInventory((prev) => prev.map((p) => (p.id === item.id ? { ...p, active: newStatus } : p)));
  };

  return {
    saveGmailConfig,
    handleDrinkReady,
    markNotificationHandled,
    handleSendKitchenNote,
    buildTicketPayloadForTable,
    buildTicketPayloadFromItems,
    buildTicketPayloadFromRealtimeOrder,
    openPrintTicket,
    openThermalPrint,
    sendTicketByEmail,
    markTableAsPaid,
    toggleStock,
  };
}
