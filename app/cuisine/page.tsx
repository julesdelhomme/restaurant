"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import { getCookingLabelFr, normalizeCookingKey } from "../lib/ui-translations";
import { KitchenPageLayout } from "./components/KitchenPageLayout";
import {
  buildStableExtraId,
  getFrenchTranslationValue,
  isUuidLike,
  keepStaffFrenchLabel,
  normalizeEntityId,
  normalizeLookupText,
  parseI18nToken,
  parseJsonRecord,
  repairUtf8Text,
  sanitizeKitchenText,
  translateClientTextToFrench,
} from "./kitchen-text-utils";
import {
  isFormulaItem,
  parseFormulaEntryList,
  resolveCourseFromLabel,
  resolveCourseFromSequence,
  resolveFormulaEntryForCurrentSequence,
  resolveFormulaSequenceForItem,
  SERVICE_STEP_LABELS,
  SERVICE_STEP_SEQUENCE,
  normalizeServiceStep,
} from "./kitchen-steps";
import { createKitchenOptionHelpers } from "./kitchen-options";
import { loadKitchenCatalogNames } from "./catalog-loader";
import { createKitchenNameResolvers } from "./kitchen-name-resolvers";
import {
  fetchKitchenAutoPrintSetting,
  hydrateDishNamesFromOrders as hydrateDishNamesFromOrdersHelper,
  isRateLimitError,
  resolveCallsTable as resolveCallsTableHelper,
} from "./kitchen-runtime-helpers";
import { useKitchenOrderActions } from "./use-kitchen-order-actions";
import { createKitchenCourseLogic } from "./kitchen-course-logic";
import { useKitchenDataEffects } from "./use-kitchen-data-effects";
import { buildOrderFromRealtimeRowWithState } from "./realtime-order-builder";
import { runKitchenFetchCycle } from "./kitchen-fetch-cycle";
import {
  dedupeOrderItems,
  deriveOrderStatusFromItems,
  getItemStatus,
  getOrderItems,
  getRealtimeTransitionItemKey,
  getStableOrderItemKey,
  hasKitchenPreparingTransition,
  isItemReady,
  normalizeItemStatus,
  normalizeStepValue,
  parseItems,
  setItemStatus,
} from "./item-status";
import { extractKitchenMessageText, formatKitchenMessageAge, normalizeKitchenMessageRow } from "./kitchen-messages";
import { normalizeRestaurantScope } from "./restaurant-scope";
import { logSqlError } from "./sql-utils";
import type { Item, KitchenMessage, Order } from "./types";

const I18N_TOKEN = "__I18N__:";
const SETTINGS_ROW_ID = "c9012859-d0af-469d-8dbb-af9dee733aaa";

export default function KitchenPage() {
  const params = useParams<{ id?: string; restaurant_id?: string }>();
  const searchParams = useSearchParams();
  const scopedRestaurantIdFromPath = normalizeRestaurantScope(params?.restaurant_id || params?.id || "");
  const scopedRestaurantIdFromQuery = normalizeRestaurantScope(searchParams.get("restaurant_id") || "");
  const scopedRestaurantIdFromLocation =
    typeof window !== "undefined"
      ? normalizeRestaurantScope(window.location.pathname.split("/").filter(Boolean)[0] || "")
      : "";
  const resolvedRestaurantId = String(
    scopedRestaurantIdFromPath || scopedRestaurantIdFromQuery || scopedRestaurantIdFromLocation || SETTINGS_ROW_ID || ""
  ).trim();
  const [orders, setOrders] = useState<Order[]>([]);
  const [kitchenMessages, setKitchenMessages] = useState<KitchenMessage[]>([]);
  const [readingKitchenMessageId, setReadingKitchenMessageId] = useState<string>("");
  const [dishNamesFrById, setDishNamesFrById] = useState<Record<string, string>>({});
  const [dishCategoryIdByDishId, setDishCategoryIdByDishId] = useState<Record<string, string>>({});
  const [categoryDestinationById, setCategoryDestinationById] = useState<Record<string, "cuisine" | "bar">>({});
  const [categoryNameById, setCategoryNameById] = useState<Record<string, string>>({});
  const [categorySortOrderById, setCategorySortOrderById] = useState<Record<string, number>>({});
  const [sideNamesFrById, setSideNamesFrById] = useState<Record<string, string>>({});
  const [sideNamesFrByAlias, setSideNamesFrByAlias] = useState<Record<string, string>>({});
  const [extraNamesFrByDishAndId, setExtraNamesFrByDishAndId] = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [refreshMs, setRefreshMs] = useState(3000);
  const [isOrderStatusUpdating, setIsOrderStatusUpdating] = useState(false);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [printOrderId, setPrintOrderId] = useState<string>("");
  const [triggerOrderId, setTriggerOrderId] = useState<string>("");
  const [triggerPrintNonce, setTriggerPrintNonce] = useState<number>(0);
  const [lastPrintedId, setLastPrintedId] = useState<string | null>(null);
  const [printedHistory, setPrintedHistory] = useState<string[]>([]);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
  const [callsTableName, setCallsTableName] = useState<"calls">("calls");
  const knownPendingIdsRef = useRef<Record<string, boolean>>({});
  const lastPendingCountRef = useRef(0);
  const hasInitializedPendingSnapshotRef = useRef(false);
  const lastPrintedStepByOrderIdRef = useRef<Record<string, number>>({});
  const printedRealtimeTransitionsRef = useRef<Record<string, boolean>>({});
  const printHydratingRef = useRef<Record<string, boolean>>({});
  const printRequestLockByOrderRef = useRef<Record<string, number>>({});
  const printQueueRef = useRef<Array<{ orderData: Order | null; printKey: string }>>([]);
  const printQueueProcessingRef = useRef(false);
  const queuedPrintKeysRef = useRef<Set<string>>(new Set());
  const printedHistoryRef = useRef<Set<string>>(new Set());
  const isOrderStatusUpdatingRef = useRef(false);
  const needsOrderRefreshRef = useRef(false);

  const fetchKitchenMessages = async () => {
    const targetRestaurantId = String(resolvedRestaurantId || "").trim();
    if (!targetRestaurantId) {
      setKitchenMessages([]);
      return;
    }
    const { data, error } = await supabase
      .from("kitchen_messages")
      .select("*")
      .eq("restaurant_id", targetRestaurantId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) {
      logSqlError("kitchen.fetchKitchenMessages", error);
      return;
    }
    const rows = Array.isArray(data) ? data : [];
    const normalized = rows
      .map((entry) => normalizeKitchenMessageRow((entry || {}) as Record<string, unknown>))
      .filter((entry) => Boolean(entry.id) && Boolean(extractKitchenMessageText(entry)));
    setKitchenMessages(normalized);
  };

  const markKitchenMessageRead = async (messageId: string) => {
    const targetId = String(messageId || "").trim();
    if (!targetId) return;
    setReadingKitchenMessageId(targetId);
    try {
      const { error } = await supabase.from("kitchen_messages").update({ is_active: false }).eq("id", targetId);
      if (error) {
        logSqlError("kitchen.markKitchenMessageRead", error);
        return;
      }
      setKitchenMessages((prev) => prev.filter((row) => String(row.id) !== targetId));
    } finally {
      setReadingKitchenMessageId("");
    }
  };

  const getCategory = (item: any) => {
    return String(item.category || item.categorie || item?.["catÃ©gorie"] || "")
      .toLowerCase()
      .trim();
  };

  const isDrink = (item: any) => {
    if (item.is_drink === true) return true;
    const cat = getCategory(item);
    return (
      cat === "boisson" ||
      cat === "boissons" ||
      cat === "vin" ||
      cat === "vins" ||
      cat === "bar" ||
      cat === "drink" ||
      cat === "drinks" ||
      cat === "wine" ||
      cat === "wines" ||
      cat === "beverage" ||
      cat === "beverages"
    );
  };

  const isKitchenCourse = (item: any) => {
    const record = item as Record<string, unknown>;
    const explicitDestination = String(record.destination || "").trim().toLowerCase();
    if (explicitDestination === "cuisine") return true;
    if (explicitDestination === "bar") return false;
    const itemCategoryId = normalizeEntityId(
      record.category_id ??
      record.categoryId ??
      (record.dish && typeof record.dish === "object" ? (record.dish as Record<string, unknown>).category_id : null)
    );
    const dishId = normalizeEntityId(record.dish_id ?? record.id);
    const resolvedCategoryId = itemCategoryId || (dishId ? dishCategoryIdByDishId[dishId] || "" : "");
    if (resolvedCategoryId) {
      return (categoryDestinationById[resolvedCategoryId] || "cuisine") === "cuisine";
    }
    if (isDrink(item)) return false;
    const category = getCategory(item);
    if (!category) return true;
    return /(entree|entrÃ©e|starter|appetizer|plat|plats|main|dish|dessert|sucre|sweet)/.test(category);
  };

  const buildOrderFromRealtimeRow = (row: Record<string, unknown>): Order | null => {
    return buildOrderFromRealtimeRowWithState({
      row,
      existingOrders: orders,
      parseItems,
      dedupeOrderItems,
    });
  };

  const triggerRealtimePreparingPrint = (order: Order) => {
    const orderId = String(order.id || "").trim();
    if (!orderId) return;
    const kitchenItems = getKitchenItems(order);
    if (kitchenItems.length === 0) {
      void hydratePrintOrder(orderId);
      return;
    }
    const currentStep = resolveOrderCurrentStep(order, kitchenItems as Item[]);
    const normalizedStep = Number.isFinite(currentStep) && Number(currentStep) > 0 ? Number(currentStep) : 1;
    const itemKey = kitchenItems
      .map((item, index) => getRealtimeTransitionItemKey(item as Item, index))
      .sort()
      .join("|");
    const transitionKey = `${orderId}:${normalizedStep}:${itemKey}`;
    if (printedRealtimeTransitionsRef.current[transitionKey]) return;
    printedRealtimeTransitionsRef.current[transitionKey] = true;
    lastPrintedStepByOrderIdRef.current[orderId] = normalizedStep;
    setPrintOrderId(orderId);
    setPrintOrder(order);
    setLastPrintedId(`${orderId}:step:${normalizedStep}`);
    handleAutoPrint(order);
  };

  const hydratePrintOrder = async (orderId: string) => {
    const normalizedId = String(orderId || "").trim();
    if (!normalizedId || printHydratingRef.current[normalizedId]) return;
    printHydratingRef.current[normalizedId] = true;
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", normalizedId)
        .maybeSingle();
      if (error || !data) return;
      const hydrated = data as Order;
      const hydratedWithItems = hydrated as Order;
      const items = getKitchenItems(hydratedWithItems);
      if (items.length === 0) return;
      setPrintOrderId(normalizedId);
      setPrintOrder(hydratedWithItems);
      false && console.log("TRACE:", {
        context: "kitchen.hydratePrintOrder",
        orderId: normalizedId,
        tableNumber: hydratedWithItems.table_number,
        itemsCount: items.length,
      });
      return hydratedWithItems;
    } catch (error) {
      console.warn("Hydration impression cuisine Ã©chouÃ©e:", error);
    } finally {
      printHydratingRef.current[normalizedId] = false;
    }
  };

  const {
    resolveItemStepRank,
    getKitchenItems,
    getPendingKitchenItems,
    getKitchenItemsForServiceStep,
    getUpcomingKitchenItems,
    hasPendingKitchenItems,
    hasPreparingOrReadyKitchenItems,
    resolveItemCourse,
    resolveOrderCurrentStep,
    resolveServiceStepFromCurrentStep,
    resolveNextServiceStep,
  } = createKitchenCourseLogic({
    getOrderItems,
    isKitchenCourse,
    isItemReady,
    getItemStatus,
    normalizeStepValue,
    normalizeEntityId,
    dishCategoryIdByDishId,
    categorySortOrderById,
    categoryNameById,
    normalizeServiceStep,
    resolveCourseFromSequence,
    resolveCourseFromLabel,
    isFormulaItem,
    resolveFormulaSequenceForItem,
    serviceStepSequence: SERVICE_STEP_SEQUENCE,
    serviceStepLabels: SERVICE_STEP_LABELS,
  });
  const { resolveDishNameFrFromRow, resolveKitchenDishName, resolveFrenchSideName } =
    createKitchenNameResolvers({
      getFrenchTranslationValue,
      keepStaffFrenchLabel,
      isUuidLike,
      normalizeEntityId,
      resolveFormulaEntryForCurrentSequence,
      dishNamesFrById,
      sideNamesFrById,
      sideNamesFrByAlias,
      normalizeLookupText,
      translateClientTextToFrench,
    });

  const { getKitchenNotes, getInlineCookingLevel, getKitchenFinalDetails, getKitchenSelectedOptionLines } =
    createKitchenOptionHelpers({
      extraNamesFrByDishAndId,
      normalizeEntityId,
      normalizeLookupText,
      keepStaffFrenchLabel,
      translateClientTextToFrench,
      isUuidLike,
      isFormulaItem,
      resolveFormulaSequenceForItem,
      resolveFrenchSideName,
    });

  const fetchCatalogNames = async () => {
    const scopeId = String(resolvedRestaurantId || '').trim();
    const catalog = await loadKitchenCatalogNames({
      supabase,
      scopeId,
      resolveDishNameFrFromRow,
      keepStaffFrenchLabel,
      normalizeEntityId,
      buildStableExtraId,
      normalizeLookupText,
      parseI18nToken,
      i18nToken: I18N_TOKEN,
    });
    setCategoryDestinationById(catalog.categoryDestinationById);
    setCategoryNameById(catalog.categoryNameById);
    setCategorySortOrderById(catalog.categorySortOrderById);
    setDishNamesFrById(catalog.dishNamesFrById);
    setDishCategoryIdByDishId(catalog.dishCategoryIdByDishId);
    setExtraNamesFrByDishAndId(catalog.extraNamesFrByDishAndId);
    setSideNamesFrById(catalog.sideNamesFrById);
    setSideNamesFrByAlias(catalog.sideNamesFrByAlias);
  };

  const printableCuisineItems = (order: Order) => {
    const stepItems = getKitchenItemsForServiceStep(order);
    if (stepItems.length > 0) return stepItems;
    const persistedCurrentStep = Number(
      (order as unknown as Record<string, unknown>).current_step ??
        (order as unknown as Record<string, unknown>).currentStep ??
        NaN
    );
    if (Number.isFinite(persistedCurrentStep) && persistedCurrentStep > 0) {
      false && console.log("TRACE:", {
        context: "kitchen.printableCuisineItems.strictCurrentStepEmpty",
        orderId: order.id,
        persistedCurrentStep,
      });
      return [];
    }
    const fallbackItems = getPendingKitchenItems(order);
    false && console.log("TRACE:", {
      context: "kitchen.printableCuisineItems.fallback",
      orderId: order.id,
      stepItemsCount: stepItems.length,
      fallbackItemsCount: fallbackItems.length,
      fallbackItems: fallbackItems.map((item) => {
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
    return fallbackItems;
  };

  const resolveCallsTable = async () => {
    const resolved = await resolveCallsTableHelper({ supabase, logSqlError });
    if (callsTableName !== resolved) setCallsTableName(resolved);
    return resolved;
  };

  const fetchKitchenSettings = async () => {
    const restaurantId = String(resolvedRestaurantId || '').trim();
    const nextAutoPrint = await fetchKitchenAutoPrintSetting({ supabase, restaurantId });
    if (nextAutoPrint == null) return;
    console.log('Auto-print activÃ© ?', nextAutoPrint);
    setAutoPrintEnabled(nextAutoPrint);
  };

  const hydrateDishNamesFromOrders = async (ordersToHydrate: Order[]) => {
    const byId = await hydrateDishNamesFromOrdersHelper({
      supabase,
      ordersToHydrate,
      getOrderItems,
      normalizeEntityId,
      resolveDishNameFrFromRow,
    });
    if (Object.keys(byId).length > 0) {
      setDishNamesFrById((prev) => ({ ...prev, ...byId }));
    }
  };

  const fetchOrders = async (allowAutoPrint = false) => {
    if (isOrderStatusUpdatingRef.current) return false;
    try {
      const restaurantId = String(resolvedRestaurantId || "").trim();
      if (!restaurantId) {
        setOrders([]);
        return false;
      }
      const result = await runKitchenFetchCycle({
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
      });
      if (!result.ok) {
        logSqlError("kitchen.fetchOrders.primary", result.error);
        if (isRateLimitError(result.error)) setRefreshMs((prev) => (prev === 5000 ? prev : 5000));
        return;
      }
      return result.shouldTriggerAutoPrint;
    } catch (error) {
      logSqlError("kitchen.fetchOrders.unexpected", error);
      if (isRateLimitError(error)) setRefreshMs((prev) => (prev === 5000 ? prev : 5000));
      return false;
    }
  };

  const resolvePrintStep = (orderLike?: Order | null) => {
    const parsed = Number(
      (orderLike as unknown as Record<string, unknown> | null)?.current_step ??
        (orderLike as unknown as Record<string, unknown> | null)?.currentStep ??
        NaN
    );
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 1;
  };

  const resolvePrintKey = (orderLike?: Order | null, fallbackOrderId?: string) => {
    const orderId = String(orderLike?.id || fallbackOrderId || printOrderId || "").trim();
    if (!orderId) return "";
    const step = resolvePrintStep(orderLike || printOrder);
    return `${orderId}-${step}`;
  };

  const handleAutoPrintCore = async (orderData?: Order | null) => {
    const targetOrderId = String(orderData?.id || printOrderId || "").trim();
    if (!targetOrderId) return;
    const initialStep = resolvePrintStep(orderData || printOrder);
    const initialPrintKey = `${targetOrderId}-${initialStep}`;
    const now = Date.now();
    const lastRequestedAt = Number(printRequestLockByOrderRef.current[initialPrintKey] || 0);
    if (lastRequestedAt && now - lastRequestedAt < 1200) {
      false && console.log("TRACE:", {
        context: "kitchen.handleAutoPrint.lockedDuplicate",
        orderId: targetOrderId,
        step: initialStep,
        lastRequestedAt,
      });
      return;
    }
    printRequestLockByOrderRef.current[initialPrintKey] = now;
    setPrintOrder(null);
    setPrintOrderId(targetOrderId);

    const hydrated = await hydratePrintOrder(targetOrderId);
    const hydratedOrder = (hydrated || null) as Order | null;
    const nextPrintOrder = hydratedOrder || orderData || null;
    if (nextPrintOrder) {
      setPrintOrder(nextPrintOrder);
    } else {
      delete printRequestLockByOrderRef.current[initialPrintKey];
      return;
    }
    const hydratedStep = resolvePrintStep(nextPrintOrder);
    const hydratedPrintKey = `${targetOrderId}-${hydratedStep}`;
    if (hydratedPrintKey !== initialPrintKey) {
      printRequestLockByOrderRef.current[hydratedPrintKey] = now;
      delete printRequestLockByOrderRef.current[initialPrintKey];
    }
    setTriggerOrderId(targetOrderId);
    setTriggerPrintNonce((prev) => prev + 1);
    console.log("PRINT TRIGGERED FOR:", targetOrderId);
    false && console.log("TRACE:", {
      context: "kitchen.handleAutoPrint.queuedTrigger",
      targetOrderId,
      printStep: hydratedStep,
      printKey: hydratedPrintKey,
      hasHydratedOrder: Boolean(hydratedOrder),
      hasFallbackOrder: Boolean(orderData),
    });
  };

  const flushPrintQueue = async () => {
    if (printQueueProcessingRef.current) return;
    printQueueProcessingRef.current = true;
    try {
      while (printQueueRef.current.length > 0) {
        const next = printQueueRef.current.shift();
        if (!next) break;
        const queueItem = next;
        await new Promise<void>((resolve) => window.setTimeout(resolve, 500));
        await handleAutoPrintCore(queueItem.orderData || undefined);
        queuedPrintKeysRef.current.delete(queueItem.printKey);
        false && console.log("TRACE:", {
          context: "kitchen.printQueue.flushed",
          printKey: queueItem.printKey,
          remaining: printQueueRef.current.length,
        });
      }
    } finally {
      printQueueProcessingRef.current = false;
    }
  };

  const handleAutoPrint = (orderData?: Order | null) => {
    const printKey = resolvePrintKey(orderData || null, String(orderData?.id || printOrderId || "").trim());
    if (!printKey) return;
    if (queuedPrintKeysRef.current.has(printKey)) {
      false && console.log("TRACE:", {
        context: "kitchen.printQueue.skipAlreadyQueued",
        printKey,
      });
      return;
    }
    queuedPrintKeysRef.current.add(printKey);
    printQueueRef.current.push({ orderData: orderData || null, printKey });
    false && console.log("TRACE:", {
      context: "kitchen.printQueue.enqueued",
      printKey,
      queueLength: printQueueRef.current.length,
    });
    void flushPrintQueue();
  };

  const handleTicketPrinted = ({ orderId, nonce, step }: { orderId: string; nonce: number; step: number }) => {
    const normalizedOrderId = String(orderId || "").trim();
    const normalizedStep = Number.isFinite(Number(step)) && Number(step) > 0 ? Math.trunc(Number(step)) : 1;
    const historyKey = normalizedOrderId ? `${normalizedOrderId}_step${normalizedStep}` : "";
    if (historyKey && !printedHistoryRef.current.has(historyKey)) {
      printedHistoryRef.current.add(historyKey);
      setPrintedHistory((prev) => (prev.includes(historyKey) ? prev : [...prev, historyKey]));
    }
    false && console.log("TRACE:", {
      context: "kitchen.handleTicketPrinted",
      orderId: normalizedOrderId || null,
      nonce,
      step: normalizedStep,
      historyKey: historyKey || null,
    });
    console.log("PRINT_DEBUG:", printedHistoryRef.current);
    setTriggerOrderId("");
    if (normalizedOrderId) {
      const knownKeys = Object.keys(printRequestLockByOrderRef.current).filter((key) =>
        key.startsWith(`${normalizedOrderId}-`)
      );
      window.setTimeout(() => {
        knownKeys.forEach((key) => {
          delete printRequestLockByOrderRef.current[key];
        });
      }, 400);
    }
  };

  useKitchenDataEffects({ supabase, isOrderStatusUpdating, isOrderStatusUpdatingRef, resolveCallsTable, fetchKitchenSettings, fetchOrders, fetchCatalogNames, refreshMs, autoPrintEnabled, resolvedRestaurantId, buildOrderFromRealtimeRow, dedupeOrderItems, getOrderItems, getStableOrderItemKey, setOrders, setPrintOrder, setLastPrintedId, handleAutoPrint, hydratePrintOrder, normalizeItemStatus, parseItems, hasKitchenPreparingTransition, isKitchenCourse, isFormulaItem, triggerRealtimePreparingPrint, fetchKitchenMessages, normalizeKitchenMessageRow, extractKitchenMessageText, setKitchenMessages, setIsMounted, setCurrentTime, printOrder, lastPrintedId, printableCuisineItems, orders, hasPreparingOrReadyKitchenItems, lastPendingCountRef, categoryDestinationById, dishCategoryIdByDishId });

  const { readyGroupLoadingKey, handleReadyGroup, handleRemindServer } = useKitchenOrderActions({ orders, supabase, resolvedRestaurantId, setOrders, setIsOrderStatusUpdating, isOrderStatusUpdatingRef, needsOrderRefreshRef, fetchOrders, logSqlError, getOrderItems, isKitchenCourse, resolveOrderCurrentStep, resolveItemStepRank, setItemStatus, deriveOrderStatusFromItems, resolveServiceStepFromCurrentStep });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const priorityOrders = orders.filter((order) => hasPendingKitchenItems(order as Order));
  const buildKitchenFlowRows = () => {
    const sortedOrders = [...orders].sort((a, b) => {
      const timeA = new Date(String(a.created_at || "")).getTime();
      const timeB = new Date(String(b.created_at || "")).getTime();
      return timeA - timeB;
    });

    const enCoursRows = sortedOrders
      .map((order) => {
        const kitchenItems = getKitchenItems(order as Order);
        const currentStep = resolveOrderCurrentStep(order as Order, kitchenItems as Item[]);
        const activeItems = kitchenItems.filter((item) => {
          const stepRank = resolveItemStepRank(item);
          return stepRank === currentStep;
        });
        return {
          order,
          currentStep,
          items: activeItems,
        };
      })
      .filter((row) => row.items.length > 0);

    const aSuivreRows = sortedOrders
      .map((order) => {
        const kitchenItems = getKitchenItems(order as Order);
        const currentStep = resolveOrderCurrentStep(order as Order, kitchenItems as Item[]);
        const hasFollowUp = kitchenItems.some((item) => {
          const step = resolveItemStepRank(item);
          return Number.isFinite(step) && step > currentStep;
        });
        if (!hasFollowUp) {
          return {
            order,
            currentStep,
            items: [] as Item[],
          };
        }
        const nextAvailableStep = kitchenItems
          .map((item) => resolveItemStepRank(item))
          .filter((step): step is number => Number.isFinite(step) && step > currentStep)
          .sort((a, b) => a - b)[0];
        const waitingItems = Number.isFinite(nextAvailableStep)
          ? kitchenItems.filter((item) => resolveItemStepRank(item) === nextAvailableStep)
          : [];
        return {
          order,
          currentStep,
          items: waitingItems,
        };
      })
      .filter((row) => row.items.length > 0);

    false && console.log("TRACE:", {
      context: "kitchen.buildKitchenFlowRows",
      enCoursCount: enCoursRows.length,
      aSuivreCount: aSuivreRows.length,
      enCours: enCoursRows.map((row) => ({
        orderId: row.order.id,
        tableNumber: row.order.table_number,
        currentStep: row.currentStep,
        items: row.items.map((item) => {
          const record = item as unknown as Record<string, unknown>;
          return {
            order_item_id: String(record.order_item_id ?? record.orderItemId ?? "").trim() || null,
            name: resolveKitchenDishName(item),
            stepRank: resolveItemStepRank(item),
            status: getItemStatus(item),
          };
        }),
      })),
      aSuivre: aSuivreRows.map((row) => ({
        orderId: row.order.id,
        tableNumber: row.order.table_number,
        currentStep: row.currentStep,
        items: row.items.map((item) => {
          const record = item as unknown as Record<string, unknown>;
          return {
            order_item_id: String(record.order_item_id ?? record.orderItemId ?? "").trim() || null,
            name: resolveKitchenDishName(item),
            stepRank: resolveItemStepRank(item),
            status: getItemStatus(item),
          };
        }),
      })),
    });

    return { enCoursRows, aSuivreRows };
  };
  const { enCoursRows, aSuivreRows } = buildKitchenFlowRows();

  useEffect(() => {
    if (!autoPrintEnabled) return;
    orders.forEach((order) => {
      const orderId = String(order?.id || "").trim();
      if (!orderId) return;
      const kitchenItems = getKitchenItems(order as Order);
      const currentStepResolved = resolveOrderCurrentStep(order as Order, kitchenItems as Item[]);
      const currentStep = Number.isFinite(Number(currentStepResolved)) && Number(currentStepResolved) > 0
        ? Math.trunc(Number(currentStepResolved))
        : 1;
      const itemsAtCurrentStep = kitchenItems.filter((item) => resolveItemStepRank(item) === currentStep);
      const hasPreparingCurrentStep = itemsAtCurrentStep.some((item) => getItemStatus(item as Item) === "preparing");
      if (!hasPreparingCurrentStep) return;
      const printKey = `${orderId}_step${currentStep}`;
      if (typeof window === "undefined") return;
      if (window.sessionStorage.getItem(printKey)) return;
      window.sessionStorage.setItem(printKey, "true");
      window.setTimeout(() => {
        false && console.log("TRACE:", {
          context: "kitchen.enCoursAutoPrint.newOrderStep",
          orderId: String(order.id || "").trim() || null,
          currentStep,
          printKey,
          itemsAtCurrentStep: itemsAtCurrentStep.length,
          hasPreparingCurrentStep,
        });
        handleAutoPrint(order as Order);
      }, 500);
    });
  }, [orders, autoPrintEnabled, handleAutoPrint, getKitchenItems, resolveOrderCurrentStep, resolveItemStepRank]);

  useEffect(() => {
    console.log("PRINT_DEBUG:", printedHistory);
  }, [printedHistory]);

  const handleManualPrint = () => {
    const targetOrder = enCoursRows[0]?.order || priorityOrders[0] || orders[0] || null;
    if (!targetOrder) return;
    setPrintOrderId(String(targetOrder.id || "").trim());
    setPrintOrder(targetOrder);
    handleAutoPrint(targetOrder);
  };
  return (
    <KitchenPageLayout
      isMounted={isMounted}
      currentTime={currentTime}
      autoPrintEnabled={autoPrintEnabled}
      orders={orders}
      onManualPrint={handleManualPrint}
      onRemindServer={() => void handleRemindServer()}
      kitchenMessages={kitchenMessages}
      readingKitchenMessageId={readingKitchenMessageId}
      extractKitchenMessageText={extractKitchenMessageText}
      formatKitchenMessageAge={formatKitchenMessageAge}
      onMarkKitchenMessageRead={markKitchenMessageRead}
      enCoursRows={enCoursRows}
      aSuivreRows={aSuivreRows}
      readyGroupLoadingKey={readyGroupLoadingKey}
      formatTime={formatTime}
      getKitchenSelectedOptionLines={getKitchenSelectedOptionLines}
      resolveKitchenDishName={resolveKitchenDishName}
      onReadyGroup={handleReadyGroup}
      printOrderId={printOrderId}
      printOrder={printOrder}
      printableCuisineItems={printableCuisineItems}
      getUpcomingKitchenItems={getUpcomingKitchenItems}
      triggerOrderId={triggerOrderId}
      triggerPrintNonce={triggerPrintNonce}
      onTicketPrinted={handleTicketPrinted}
    />
  );
}

