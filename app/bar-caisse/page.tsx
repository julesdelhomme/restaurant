"use client";

import { useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import { PaymentModal } from "./components/PaymentModal";
import { PostPaymentModal } from "./components/PostPaymentModal";
import { BarCaisseTabs } from "./components/BarCaisseTabs";
import { BoissonsTab } from "./components/BoissonsTab";
import { CaisseTab } from "./components/CaisseTab";
import { InventaireTab } from "./components/InventaireTab";
import { KitchenNoteModal } from "./components/KitchenNoteModal";
import { ServiceNotificationsPanel } from "./components/ServiceNotificationsPanel";
import { SplitPaymentModal } from "./components/SplitPaymentModal";
import { ThermalTicketPrint } from "./components/ThermalTicketPrint";
import { ThermalPrintStyles } from "./components/ThermalPrintStyles";
import { useBarCaisseDerivedData } from "./hooks/useBarCaisseDerivedData";
import { useBarCaissePaymentFlows } from "./hooks/useBarCaissePaymentFlows";
import { useBarCaisseDataLoaders } from "./hooks/useBarCaisseDataLoaders";
import { usePaidTablesHistory } from "./hooks/usePaidTablesHistory";
import { useBarCaisseRealtime } from "./hooks/useBarCaisseRealtime";
import { useBarCaisseUiActions } from "./hooks/useBarCaisseUiActions";
import { useBarCaisseActions } from "./hooks/useBarCaisseActions";
import { insertPaymentTransaction, restorePaidTable } from "./services/bar-caisse-operations";

import type { CashDisplayLine, InventoryDish, Order, OrderItem, PaidTableHistoryEntry, PaymentMethodLabel, RestaurantSocialLinks, ServiceNotification, TicketPayload } from "./bar-caisse-helpers";
import { AUTO_PRINT_TRIGGER_STATUSES, DRINK_QUEUE_STATUSES, ENABLE_ALERTS_ON_BAR_CAISSE, PAYMENT_BLOCK_MESSAGE, SETTINGS_ROW_ID, buildCashDisplayLines, calcLineTotal, deriveOrderStatusFromItems, encodeFeedbackItemsToken, euro, flattenChoiceTextsForDisplay, formatItemInlineDetails, getItemCookingText, getItemExtras, getItemName, getItemNotes, getItemPrepStatus, getItemSelectedOptionText, getItemSideText, getServiceNotificationReasonFr, getUnknownItemLabel, isBarTicketItem, isDrink, isFormulaParentItem, isItemPaid, isItemReady, isMissingColumnOrCacheError, keepStaffFrenchLabel, normalizeItemPaymentStatus, normalizeLookupText, normalizePrepItemStatus, normalizeStatus, normalizeStatusKey, normalizeUniqueTexts, parseItems, parseNotificationPayload, parsePriceNumber, resolveFormulaDisplayName, resolveFormulaGroupKey, resolveStaffDestination, setItemPrepStatus, toErrorInfo } from "./bar-caisse-helpers";

export default function BarCaissePage() {
  const params = useParams<{ id?: string; restaurant_id?: string }>();
  const searchParams = useSearchParams();
  const decodeAndTrim = (value: unknown) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      return decodeURIComponent(raw).trim();
    } catch {
      return raw;
    }
  };
  const scopedRestaurantIdFromPath = decodeAndTrim(params?.restaurant_id || params?.id || "");
  const scopedRestaurantIdFromQuery = decodeAndTrim(searchParams.get("restaurant_id") || "");
  const scopedRestaurantIdFromLocation =
    typeof window !== "undefined" ? decodeAndTrim(window.location.pathname.split("/").filter(Boolean)[0] || "") : "";
  const scopedRestaurantId = String(scopedRestaurantIdFromPath || scopedRestaurantIdFromQuery || scopedRestaurantIdFromLocation || "").trim();
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryDish[]>([]);
  const [dishCategoryIdByDishId, setDishCategoryIdByDishId] = useState<Record<string, string>>({});
  const [categoryDestinationById, setCategoryDestinationById] = useState<Record<string, "cuisine" | "bar">>({});
  const [activeTab, setActiveTab] = useState<"boissons" | "caisse" | "inventaire">("boissons");
  const [expandedTables, setExpandedTables] = useState<Record<number, boolean>>({});

  const inventoryByCategory = useMemo(() => {
    const groups: Record<string, InventoryDish[]> = {};
    inventory.forEach((item) => {
      const label = String((item as any).categories?.name_fr || item.category || item.categorie || "Sans cat�gorie").trim() || "Sans cat�gorie";
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });
    return Object.entries(groups)
      .map(([label, items]) => [
        label,
        [...items].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))),
      ] as const)
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [inventory]);

  const [restaurantId, setRestaurantId] = useState<string | number | null>(null);
  const [restaurantName, setRestaurantName] = useState("Mon Restaurant");
  const [restaurantAddress, setRestaurantAddress] = useState("");
  const [restaurantLogoUrl, setRestaurantLogoUrl] = useState("");
  const [restaurantSocialLinks, setRestaurantSocialLinks] = useState<RestaurantSocialLinks>({});
  const [showSocialOnReceipt, setShowSocialOnReceipt] = useState(false);
  const [gmailUser, setGmailUser] = useState("");
  const [gmailAppPassword, setGmailAppPassword] = useState("");
  const [gmailSaveLoading, setGmailSaveLoading] = useState(false);
  const [gmailMessage, setGmailMessage] = useState("");

  const [encaisseModalTable, setEncaisseModalTable] = useState<number | null>(null);
  const [splitPaymentTable, setSplitPaymentTable] = useState<number | null>(null);
  const [splitPaymentSelections, setSplitPaymentSelections] = useState<Record<string, number>>({});
  const [splitPaymentProcessing, setSplitPaymentProcessing] = useState(false);
  const [splitTipAmountInput, setSplitTipAmountInput] = useState("");
  const [paymentModalStep, setPaymentModalStep] = useState<"choice" | "email">("choice");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodLabel>("Carte Bancaire");
  const [tipAmountInput, setTipAmountInput] = useState("");
  const [ticketEmail, setTicketEmail] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [ticketSending, setTicketSending] = useState(false);
  const [postPaymentModalOpen, setPostPaymentModalOpen] = useState(false);
  const [postPaymentPayload, setPostPaymentPayload] = useState<TicketPayload | null>(null);
  const [postPaymentEmail, setPostPaymentEmail] = useState("");
  const [postPaymentEmailMode, setPostPaymentEmailMode] = useState(false);
  const [postPaymentEmailSending, setPostPaymentEmailSending] = useState(false);
  const [thermalPrintPayload, setThermalPrintPayload] = useState<TicketPayload | null>(null);
  const [hasNewDrinkAlert, setHasNewDrinkAlert] = useState(false);
  const [serviceNotifications, setServiceNotifications] = useState<ServiceNotification[]>([]);
  const [kitchenNoteOpen, setKitchenNoteOpen] = useState(false);
  const [kitchenNoteText, setKitchenNoteText] = useState("");
  const [kitchenNoteSending, setKitchenNoteSending] = useState(false);
  const [kitchenNoteFeedback, setKitchenNoteFeedback] = useState("");
  const {
    paidTablesHistory,
    setPaidTablesHistory,
    appendPaidTableToHistory,
    appendPartialPaymentToHistory,
  } = usePaidTablesHistory();
  const thermalPrintTriggerRef = useRef<number | null>(null);
  const printedRealtimeTransitionsRef = useRef<Record<string, boolean>>({});

  const playBarNotificationBeep = () => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx =
        (window as typeof window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(740, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
      window.setTimeout(() => void ctx.close().catch(() => undefined), 250);
    } catch (error) {
      console.warn("Notification bar impossible:", error);
    }
  };

  const {
    fetchRestaurantSettings,
    fetchOrders,
    fetchServiceNotifications,
  } = useBarCaisseDataLoaders({
    supabase,
    scopedRestaurantId,
    settingsRowId: SETTINGS_ROW_ID,
    restaurantId,
    setRestaurantId,
    setRestaurantName,
    setRestaurantLogoUrl,
    setRestaurantAddress,
    setRestaurantSocialLinks,
    setShowSocialOnReceipt,
    setGmailUser,
    setGmailAppPassword,
    setDishCategoryIdByDishId,
    setCategoryDestinationById,
    setOrders,
    setServiceNotifications,
    setInventory,
  });

  const {
    pendingDrinkOrders,
    activeOrders,
    tables,
    tableHasServiceInProgress,
    readyForCashTables,
    pendingCashTables,
    modalTable,
    splitModalTable,
    splitPaymentRows,
    splitPaymentTotal,
    tableHasUnpaidItems,
  } = useBarCaisseDerivedData({
    orders,
    categoryDestinationById,
    dishCategoryIdByDishId,
    encaisseModalTable,
    splitPaymentTable,
    splitPaymentSelections,
  });

  const recordPaymentTransaction = async (params: {
    tableNumber: number;
    paidAtIso: string;
    totalAmount: number;
    tipAmount: number;
    paymentMethod: PaymentMethodLabel;
    orderIds?: string[];
    isSplit: boolean;
    itemsCount?: number;
  }) => {
    return insertPaymentTransaction({
      supabase,
      restaurantId,
      settingsRowId: SETTINGS_ROW_ID,
      ...params,
    });
  };

  const restorePaidTableFromHistory = async (entry: PaidTableHistoryEntry) => {
    const result = await restorePaidTable({
      supabase,
      entry,
      restaurantId,
      settingsRowId: SETTINGS_ROW_ID,
    });
    if (!result.ok) {
      alert(result.errorMessage);
      return;
    }
    setPaidTablesHistory((prev) => prev.filter((row) => row.id !== entry.id));
    await fetchOrders();
    setActiveTab("caisse");
    alert(`Table ${result.tableNumber} restauree.`);
  };

  const {
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
  } = useBarCaisseActions({
    supabase,
    restaurantId,
    scopedRestaurantId,
    settingsRowId: SETTINGS_ROW_ID,
    orders,
    setOrders,
    setInventory,
    fetchOrders,
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
    paymentBlockMessage: PAYMENT_BLOCK_MESSAGE,
    setThermalPrintPayload,
    thermalPrintTriggerRef,
  });

  const {
    closePaymentModal,
    openPostPaymentModal,
    closePostPaymentModal,
    openPaymentModal,
    closeSplitPaymentModal,
    openSplitPaymentModal,
    updateSplitSelectionQuantity,
  } = useBarCaisseUiActions({
    tableHasServiceInProgress,
    paymentBlockMessage: PAYMENT_BLOCK_MESSAGE,
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
  });

  const { runSplitPaymentFlow, runPaymentFlow } = useBarCaissePaymentFlows({
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
  });

  useBarCaisseRealtime({
    supabase,
    restaurantId,
    activeTab,
    categoryDestinationById,
    dishCategoryIdByDishId,
    enableAlerts: ENABLE_ALERTS_ON_BAR_CAISSE,
    hasNewDrinkAlert,
    setHasNewDrinkAlert,
    setServiceNotifications,
    setThermalPrintPayload,
    thermalPrintTriggerRef,
    printedRealtimeTransitionsRef,
    fetchOrders,
    fetchServiceNotifications,
    fetchRestaurantSettings,
    playBarNotificationBeep,
    buildTicketPayloadFromRealtimeOrder,
    openThermalPrint,
  });

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-black notranslate" translate="no">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1 uppercase">Bar / Caisse</h1>
          <p className="text-sm text-gray-700">{restaurantName} - Poste Bar / Caisse</p>
        </div>
      </div>

      <ServiceNotificationsPanel
        enabled={ENABLE_ALERTS_ON_BAR_CAISSE}
        serviceNotifications={serviceNotifications}
        normalizeStatus={normalizeStatus}
        parseNotificationPayload={parseNotificationPayload}
        getServiceNotificationReasonFr={getServiceNotificationReasonFr}
        markNotificationHandled={markNotificationHandled}
      />

      <BarCaisseTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasNewDrinkAlert={hasNewDrinkAlert}
        setKitchenNoteOpen={setKitchenNoteOpen}
        kitchenNoteFeedback={kitchenNoteFeedback}
      />
      <KitchenNoteModal
        kitchenNoteOpen={kitchenNoteOpen}
        setKitchenNoteOpen={setKitchenNoteOpen}
        kitchenNoteText={kitchenNoteText}
        setKitchenNoteText={setKitchenNoteText}
        kitchenNoteSending={kitchenNoteSending}
        handleSendKitchenNote={handleSendKitchenNote}
      />

      <BoissonsTab
        activeTab={activeTab}
        pendingDrinkOrders={pendingDrinkOrders}
        parseItems={parseItems}
        resolveStaffDestination={resolveStaffDestination}
        categoryDestinationById={categoryDestinationById}
        dishCategoryIdByDishId={dishCategoryIdByDishId}
        isItemReady={isItemReady}
        getItemExtras={getItemExtras}
        getItemNotes={getItemNotes}
        formatItemInlineDetails={formatItemInlineDetails}
        getItemName={getItemName}
        euro={euro}
        calcLineTotal={calcLineTotal}
        handleDrinkReady={handleDrinkReady}
      />

            <CaisseTab
        activeTab={activeTab}
        readyForCashTables={readyForCashTables}
        pendingCashTables={pendingCashTables}
        expandedTables={expandedTables}
        setExpandedTables={setExpandedTables}
        tableHasUnpaidItems={tableHasUnpaidItems}
        euro={euro}
        openSplitPaymentModal={openSplitPaymentModal}
        openPaymentModal={openPaymentModal}
        buildCashDisplayLines={buildCashDisplayLines}
        paidTablesHistory={paidTablesHistory}
        restorePaidTableFromHistory={restorePaidTableFromHistory}
        setPaidTablesHistory={setPaidTablesHistory}
      />

      <InventaireTab
        activeTab={activeTab}
        inventory={inventory}
        inventoryByCategory={inventoryByCategory}
        euro={euro}
        toggleStock={toggleStock}
      />

      <SplitPaymentModal
        splitPaymentTable={splitPaymentTable}
        splitModalTable={splitModalTable}
        closeSplitPaymentModal={closeSplitPaymentModal}
        splitPaymentRows={splitPaymentRows}
        splitPaymentSelections={splitPaymentSelections}
        updateSplitSelectionQuantity={updateSplitSelectionQuantity}
        splitPaymentTotal={splitPaymentTotal}
        selectedPaymentMethod={selectedPaymentMethod}
        setSelectedPaymentMethod={setSelectedPaymentMethod}
        splitTipAmountInput={splitTipAmountInput}
        setSplitTipAmountInput={setSplitTipAmountInput}
        parsePriceNumber={parsePriceNumber}
        euro={euro}
        splitPaymentProcessing={splitPaymentProcessing}
        runSplitPaymentFlow={runSplitPaymentFlow}
      />

      <PaymentModal
        encaisseModalTable={encaisseModalTable}
        modalTable={modalTable}
        closePaymentModal={closePaymentModal}
        selectedPaymentMethod={selectedPaymentMethod}
        setSelectedPaymentMethod={setSelectedPaymentMethod}
        tipAmountInput={tipAmountInput}
        setTipAmountInput={setTipAmountInput}
        euro={euro}
        parsePriceNumber={parsePriceNumber}
        runPaymentFlow={runPaymentFlow}
        paymentProcessing={paymentProcessing}
      />

      <PostPaymentModal
        postPaymentModalOpen={postPaymentModalOpen}
        closePostPaymentModal={closePostPaymentModal}
        postPaymentPayload={postPaymentPayload}
        euro={euro}
        openThermalPrint={openThermalPrint}
        postPaymentEmailMode={postPaymentEmailMode}
        setPostPaymentEmailMode={setPostPaymentEmailMode}
        postPaymentEmail={postPaymentEmail}
        setPostPaymentEmail={setPostPaymentEmail}
        postPaymentEmailSending={postPaymentEmailSending}
        setPostPaymentEmailSending={setPostPaymentEmailSending}
        sendTicketByEmail={sendTicketByEmail}
      />

      <ThermalTicketPrint thermalPrintPayload={thermalPrintPayload} />

      <ThermalPrintStyles />
    </div>
  );
}



