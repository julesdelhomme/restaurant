import type { Dispatch, SetStateAction } from "react";

import { parsePriceNumber } from "../bar-caisse-helpers";
import { processSplitPayment } from "../services/bar-caisse-operations";

type UseBarCaissePaymentFlowsParams = {
  supabase: any;
  orders: any[];
  isMissingColumnOrCacheError: (error: unknown) => boolean;
  splitModalTable: any;
  splitPaymentRows: any[];
  splitPaymentSelections: Record<string, number>;
  splitTipAmountInput: string;
  splitPaymentTotal: number;
  selectedPaymentMethod: "Carte Bancaire" | "Espèces";
  setSplitPaymentProcessing: Dispatch<SetStateAction<boolean>>;
  setOrders: Dispatch<SetStateAction<any[]>>;
  fetchOrders: () => Promise<void>;
  appendPartialPaymentToHistory: (
    tableNumber: number,
    covers: number | null | undefined,
    total: number,
    items: any[],
    closedAtIso: string,
    paymentMethod: "Carte Bancaire" | "Espèces",
    tipAmount?: number
  ) => void;
  recordPaymentTransaction: (params: {
    tableNumber: number;
    paidAtIso: string;
    totalAmount: number;
    tipAmount: number;
    paymentMethod: "Carte Bancaire" | "Espèces";
    orderIds?: string[];
    isSplit: boolean;
    itemsCount?: number;
  }) => Promise<boolean>;
  setSplitPaymentSelections: Dispatch<SetStateAction<Record<string, number>>>;
  closeSplitPaymentModal: () => void;
  openPostPaymentModal: (payload: any) => void;
  buildTicketPayloadFromItems: (
    tableNumber: number,
    items: any[],
    paidAtIso: string,
    paymentMethod: "Carte Bancaire" | "Espèces",
    tipAmountRaw?: unknown,
    orderIdOverride?: string | number | null
  ) => any;

  encaisseModalTable: number | null;
  tipAmountInput: string;
  buildTicketPayloadForTable: (
    tableNumber: number,
    paidAtIso?: string,
    paymentMethod?: "Carte Bancaire" | "Espèces",
    tipAmountRaw?: unknown
  ) => any;
  modalTable: any;
  setPaymentProcessing: Dispatch<SetStateAction<boolean>>;
  setTicketSending: Dispatch<SetStateAction<boolean>>;
  markTableAsPaid: (tableNumber: number, tipAmountRaw?: unknown) => Promise<boolean>;
  appendPaidTableToHistory: (
    table: any,
    closedAtIso: string,
    paymentMethod: "Carte Bancaire" | "Espèces",
    tipAmount?: number
  ) => void;
  closePaymentModal: () => void;
};

export function useBarCaissePaymentFlows(params: UseBarCaissePaymentFlowsParams) {
  const {
    supabase,
    orders,
    isMissingColumnOrCacheError,
    splitModalTable,
    splitPaymentRows,
    splitPaymentSelections,
    splitTipAmountInput,
    splitPaymentTotal,
    selectedPaymentMethod,
    setSplitPaymentProcessing,
    setOrders,
    fetchOrders,
    appendPartialPaymentToHistory,
    recordPaymentTransaction,
    setSplitPaymentSelections,
    closeSplitPaymentModal,
    openPostPaymentModal,
    buildTicketPayloadFromItems,
    encaisseModalTable,
    tipAmountInput,
    buildTicketPayloadForTable,
    modalTable,
    setPaymentProcessing,
    setTicketSending,
    markTableAsPaid,
    appendPaidTableToHistory,
    closePaymentModal,
  } = params;

  const runSplitPaymentFlow = async () => {
    if (!splitModalTable) return;

    setSplitPaymentProcessing(true);
    try {
      const result = await processSplitPayment({
        supabase,
        orders,
        splitModalTable,
        splitPaymentRows,
        splitPaymentSelections,
        splitTipAmountInput,
        splitPaymentTotal,
        isMissingColumnOrCacheError,
      });
      if (!result.ok) {
        alert(result.errorMessage);
        return;
      }
      setOrders(result.updatedOrders);
      await fetchOrders();
      appendPartialPaymentToHistory(
        result.tableNumber,
        result.tableCovers,
        splitPaymentTotal,
        result.paidSelectionItems,
        result.paidAtIso,
        selectedPaymentMethod,
        result.splitTipAmount
      );
      await recordPaymentTransaction({
        tableNumber: result.tableNumber,
        paidAtIso: result.paidAtIso,
        totalAmount: splitPaymentTotal,
        tipAmount: result.splitTipAmount,
        paymentMethod: selectedPaymentMethod,
        orderIds: result.targetOrderIds,
        isSplit: true,
        itemsCount: result.paidSelectionItems.length,
      });
      setSplitPaymentSelections({});
      closeSplitPaymentModal();
      openPostPaymentModal(
        buildTicketPayloadFromItems(
          result.tableNumber,
          result.paidSelectionItems,
          result.paidAtIso,
          selectedPaymentMethod,
          result.splitTipAmount,
          result.ticketOrderId
        )
      );
    } catch (error) {
      console.error("Erreur encaissement partiel:", error);
      alert(String((error as { message?: string })?.message || "Erreur encaissement partiel."));
    } finally {
      setSplitPaymentProcessing(false);
    }
  };

  const runPaymentFlow = async () => {
    if (!encaisseModalTable) return;

    const tableNumber = encaisseModalTable;
    const paidAtIso = new Date().toISOString();
    const tipAmount = parsePriceNumber(tipAmountInput);
    const ticketPayload = buildTicketPayloadForTable(tableNumber, paidAtIso, selectedPaymentMethod, tipAmount);
    const historyTableSnapshot = modalTable
      ? {
          tableNumber: modalTable.tableNumber,
          total: modalTable.total,
          items: [...modalTable.items],
          orders: [...modalTable.orders],
          covers: modalTable.covers ?? null,
        }
      : null;
    setPaymentProcessing(true);

    try {
      const paid = await markTableAsPaid(tableNumber, tipAmount);
      if (!paid) return;
      if (historyTableSnapshot) {
        appendPaidTableToHistory(historyTableSnapshot, paidAtIso, selectedPaymentMethod, tipAmount);
        await recordPaymentTransaction({
          tableNumber,
          paidAtIso,
          totalAmount: Number(historyTableSnapshot.total || 0),
          tipAmount,
          paymentMethod: selectedPaymentMethod,
          orderIds: historyTableSnapshot.orders.map((order: any) => String(order.id || "").trim()).filter(Boolean),
          isSplit: false,
          itemsCount: historyTableSnapshot.items.length,
        });
      }
      closePaymentModal();
      openPostPaymentModal(ticketPayload);
    } catch (error) {
      console.error("Erreur paiement/ticket:", error);
      alert(String((error as { message?: string })?.message || "Erreur paiement/ticket."));
    } finally {
      setPaymentProcessing(false);
      setTicketSending(false);
    }
  };

  return {
    runSplitPaymentFlow,
    runPaymentFlow,
  };
}
