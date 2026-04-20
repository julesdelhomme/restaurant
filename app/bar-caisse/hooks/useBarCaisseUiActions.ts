import type { Dispatch, SetStateAction } from "react";

type UseBarCaisseUiActionsParams = {
  tableHasServiceInProgress: Map<number, boolean>;
  paymentBlockMessage: string;
  setEncaisseModalTable: Dispatch<SetStateAction<number | null>>;
  setPaymentModalStep: Dispatch<SetStateAction<"choice" | "email">>;
  setSelectedPaymentMethod: Dispatch<SetStateAction<"Carte Bancaire" | "Espèces">>;
  setTipAmountInput: Dispatch<SetStateAction<string>>;
  setTicketEmail: Dispatch<SetStateAction<string>>;
  setPaymentProcessing: Dispatch<SetStateAction<boolean>>;
  setTicketSending: Dispatch<SetStateAction<boolean>>;
  setPostPaymentPayload: Dispatch<SetStateAction<any>>;
  setPostPaymentEmail: Dispatch<SetStateAction<string>>;
  setPostPaymentEmailMode: Dispatch<SetStateAction<boolean>>;
  setPostPaymentEmailSending: Dispatch<SetStateAction<boolean>>;
  setPostPaymentModalOpen: Dispatch<SetStateAction<boolean>>;
  setSplitPaymentTable: Dispatch<SetStateAction<number | null>>;
  setSplitPaymentSelections: Dispatch<SetStateAction<Record<string, number>>>;
  setSplitTipAmountInput: Dispatch<SetStateAction<string>>;
  setSplitPaymentProcessing: Dispatch<SetStateAction<boolean>>;
};

export function useBarCaisseUiActions(params: UseBarCaisseUiActionsParams) {
  const {
    tableHasServiceInProgress,
    paymentBlockMessage,
    setEncaisseModalTable,
    setPaymentModalStep,
    setSelectedPaymentMethod,
    setTipAmountInput,
    setTicketEmail,
    setPaymentProcessing,
    setTicketSending,
    setPostPaymentPayload,
    setPostPaymentEmail,
    setPostPaymentEmailMode,
    setPostPaymentEmailSending,
    setPostPaymentModalOpen,
    setSplitPaymentTable,
    setSplitPaymentSelections,
    setSplitTipAmountInput,
    setSplitPaymentProcessing,
  } = params;

  const closePaymentModal = () => {
    setEncaisseModalTable(null);
    setPaymentModalStep("choice");
    setSelectedPaymentMethod("Carte Bancaire");
    setTipAmountInput("");
    setTicketEmail("");
    setPaymentProcessing(false);
    setTicketSending(false);
  };

  const openPostPaymentModal = (payload: any) => {
    setPostPaymentPayload(payload);
    setPostPaymentEmail("");
    setPostPaymentEmailMode(false);
    setPostPaymentEmailSending(false);
    setPostPaymentModalOpen(true);
  };

  const closePostPaymentModal = () => {
    setPostPaymentModalOpen(false);
    setPostPaymentPayload(null);
    setPostPaymentEmail("");
    setPostPaymentEmailMode(false);
    setPostPaymentEmailSending(false);
  };

  const openPaymentModal = (tableNumber: number) => {
    if (tableHasServiceInProgress.get(tableNumber)) {
      alert(paymentBlockMessage);
      return;
    }
    setEncaisseModalTable(tableNumber);
    setPaymentModalStep("choice");
    setSelectedPaymentMethod("Carte Bancaire");
    setTipAmountInput("");
    setTicketEmail("");
  };

  const closeSplitPaymentModal = () => {
    setSplitPaymentTable(null);
    setSplitPaymentSelections({});
    setSplitTipAmountInput("");
    setSplitPaymentProcessing(false);
  };

  const openSplitPaymentModal = (tableNumber: number) => {
    setSplitPaymentTable(tableNumber);
    setSplitPaymentSelections({});
    setSplitTipAmountInput("");
    setSelectedPaymentMethod("Carte Bancaire");
    setSplitPaymentProcessing(false);
  };

  const updateSplitSelectionQuantity = (rowKey: string, quantity: number, maxQuantity: number) => {
    const safeQuantity = Math.max(0, Math.min(maxQuantity, Math.trunc(Number(quantity) || 0)));
    setSplitPaymentSelections((prev) => ({ ...prev, [rowKey]: safeQuantity }));
  };

  return {
    closePaymentModal,
    openPostPaymentModal,
    closePostPaymentModal,
    openPaymentModal,
    closeSplitPaymentModal,
    openSplitPaymentModal,
    updateSplitSelectionQuantity,
  };
}
