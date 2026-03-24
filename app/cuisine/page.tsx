"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import { getCookingLabelFr, normalizeCookingKey } from "../lib/ui-translations";
import { BellRing } from "lucide-react";

type Item = {
  id: string | number;
  order_item_id?: string | number | null;
  dish_id: string | number;
  category_id?: string | number | null;
  dish: { id: string | number; name_fr: string; name: string };
  name: string;
  name_fr?: string;
  label?: string;
  product_name?: string;
  quantity: number;
  categorie: string;
  category: string;
  instructions: string;
  cooking?: string | null;
  cuisson?: string | null;
  side?: unknown;
  accompagnement?: unknown;
  accompagnements?: unknown;
  side_dish?: unknown;
  sideDish?: unknown;
  selected_options?: unknown;
  options?: unknown;
  selected_option?: unknown;
  selected_option_id?: string | number | null;
  selected_option_name?: string | null;
  selected_option_price?: number | null;
  selectedOptions?: unknown;
  selected_side_ids: Array<string | number>;
  selected_extra_ids: Array<string | number>;
  selected_extras: Array<{ id: string; label_fr: string; name: string; name_fr: string; price: number }>;
  selected_cooking_key: string | null;
  selected_cooking_label_fr: string | null;
  selected_cooking_label?: string | null;
  selected_cooking_label_pt?: string | null;
  selected_cooking: string | null;
  is_formula?: boolean | null;
  formula_id?: string | number | null;
  formula_dish_id?: string | number | null;
  formula_name?: string | null;
  formula_dish_name?: string | null;
  formula_current_sequence?: number | null;
  step?: number | null;
  sequence?: number | null;
  selected_side_label_fr?: string | null;
  selected_side_label?: string | null;
  selected_side_label_pt?: string | null;
  special_request: string | null;
  selectedSides: Array<string | number>;
  selectedExtras: Array<{ name: string; name_fr: string; price: number }>;
  status?: string | null;
};

type Order = {
  id: string;
  table_number: string;
  items: any;
  order_items?: any[] | null;
  status: string;
  created_at: string;
  service_step?: string | null;
  current_step?: number | null;
  covers?: number | null;
  guest_count?: number | null;
  customer_count?: number | null;
  restaurant_id?: string | number | null;
};

const I18N_TOKEN = "__I18N__:";
const SETTINGS_ROW_ID = "c9012859-d0af-469d-8dbb-af9dee733aaa";

export default function KitchenPage() {
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
  const RESERVED_ROUTE_SEGMENTS = new Set([
    "cuisine",
    "admin",
    "manager",
    "bar-caisse",
    "login",
    "login-staff",
    "restaurant",
    "vitrine",
    "feedback",
    "super-admin",
    "api",
  ]);
  const normalizeRestaurantScope = (value: unknown) => {
    const normalized = decodeAndTrim(value).replace(/^["'{\s]+|["'}\s]+$/g, "");
    if (!normalized) return "";
    if (RESERVED_ROUTE_SEGMENTS.has(normalized.toLowerCase())) return "";
    return normalized;
  };
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
  const [dishNamesFrById, setDishNamesFrById] = useState<Record<string, string>>({});
  const [dishCategoryIdByDishId, setDishCategoryIdByDishId] = useState<Record<string, string>>({});
  const [categoryDestinationById, setCategoryDestinationById] = useState<Record<string, "cuisine" | "bar">>({});
  const [categoryNameById, setCategoryNameById] = useState<Record<string, string>>({});
  const [sideNamesFrById, setSideNamesFrById] = useState<Record<string, string>>({});
  const [sideNamesFrByAlias, setSideNamesFrByAlias] = useState<Record<string, string>>({});
  const [extraNamesFrByDishAndId, setExtraNamesFrByDishAndId] = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [refreshMs, setRefreshMs] = useState(3000);
  const [isOrderStatusUpdating, setIsOrderStatusUpdating] = useState(false);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [lastPrintedId, setLastPrintedId] = useState<string | null>(null);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
  const [callsTableName, setCallsTableName] = useState<"calls">("calls");
  const knownPendingIdsRef = useRef<Record<string, boolean>>({});
  const hasInitializedPendingSnapshotRef = useRef(false);
  const lastPrintedStepByOrderIdRef = useRef<Record<string, number>>({});
  const printedRealtimeTransitionsRef = useRef<Record<string, boolean>>({});
  const isOrderStatusUpdatingRef = useRef(false);
  const needsOrderRefreshRef = useRef(false);

  const logSqlError = (context: string, error: unknown) => {
    const err = (error || {}) as { code: string; message: string; details: string; hint: string };
    console.error("VRAI MESSAGE SQL:", err.message || null, "DETAILS:", err.details || null, "HINT:", err.hint || null);
    console.error("SQL CONTEXT:", context, "CODE:", err.code || null);
  };

  const getCategory = (item: any) => {
    return String(item.category || item.categorie || item?.["catégorie"] || item?.["catÃ©gorie"] || "")
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
    return /(entree|entrée|starter|appetizer|plat|plats|main|dish|dessert|sucre|sweet)/.test(category);
  };

  const normalizeStatusValue = (value: unknown) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const normalizeItemStatus = (value: unknown): "pending" | "preparing" | "ready" => {
    const normalized = normalizeStatusValue(value);
    if (
      [
        "ready",
        "ready_bar",
        "pret",
        "prêt",
        "prete",
        "prête",
        "ready_to_serve",
        "served",
        "servi",
        "servie",
      ].includes(normalized)
    ) {
      return "ready";
    }
    if (
      [
        "preparing",
        "to_prepare",
        "to_prepare_kitchen",
        "to_prepare_bar",
        "en_preparation",
        "preparant",
      ].includes(normalized)
    ) {
      return "preparing";
    }
    return "pending";
  };

  const getItemStatus = (item: Item): "pending" | "preparing" | "ready" => {
    const record = item as unknown as Record<string, unknown>;
    const rawStatus =
      record.status ??
      record.item_status ??
      record.preparation_status ??
      record.prep_status ??
      record.state;
    return normalizeItemStatus(rawStatus);
  };

  const isItemReady = (item: Item) => getItemStatus(item) === "ready";

  const setItemStatus = (item: Item, status: "pending" | "preparing" | "ready"): Item => ({
    ...item,
    status,
  });

  const deriveOrderStatusFromItems = (items: Item[]) => {
    if (items.length === 0) return "pending";
    const statuses = items.map((item) => getItemStatus(item));
    if (statuses.every((status) => status === "ready")) return "ready";
    if (statuses.some((status) => status === "ready" || status === "preparing")) return "preparing";
    return "pending";
  };

  const parseItems = (items: any): Item[] => {
    if (Array.isArray(items)) return items;
    if (typeof items === "string") {
      try {
        return JSON.parse(items);
      } catch {
        return [];
      }
    }
    return [];
  };

  const parseOrderItemsRelation = (order: Order): Item[] => {
    const rows = Array.isArray(order.order_items) ? order.order_items : [];
    if (rows.length === 0) return [];
    return rows.map((row: any) => {
      const dishRow =
        row?.dishes && typeof row.dishes === "object"
          ? row.dishes
          : row?.dish && typeof row.dish === "object"
            ? row.dish
            : null;
      return {
        ...(row || {}),
        id: row?.id ?? row?.dish_id ?? dishRow?.id ?? "",
        order_item_id: row?.id ?? null,
        dish_id: row?.dish_id ?? dishRow?.id ?? "",
        category_id: row?.category_id ?? dishRow?.category_id ?? null,
        dish: dishRow || undefined,
        name: String(row?.name_fr || dishRow?.name_fr || row?.name || row?.product_name || dishRow?.name || "").trim(),
        name_fr: String(row?.name_fr || dishRow?.name_fr || dishRow?.name || row?.name || "").trim(),
        quantity: Number(row?.quantity || 1),
        categorie: String(row?.categorie || row?.category || dishRow?.categorie || dishRow?.category || "").trim(),
        category: String(row?.category || row?.categorie || dishRow?.category || dishRow?.categorie || "").trim(),
        instructions: String(row?.instructions || row?.notes || "").trim(),
        is_formula: Boolean(row?.is_formula ?? dishRow?.is_formula),
        formula_id: row?.formula_id ?? row?.formulaDishId ?? row?.formula_dish_id ?? null,
        formula_dish_id: row?.formula_dish_id ?? row?.formulaDishId ?? row?.formula_id ?? null,
        formula_name: String(row?.formula_name || row?.formula_dish_name || "").trim() || null,
        formula_dish_name: String(row?.formula_dish_name || row?.formula_name || "").trim() || null,
        formula_current_sequence: Number.isFinite(Number(row?.formula_current_sequence))
          ? Number(row?.formula_current_sequence)
          : null,
        step: normalizeStepValue(
          row?.step ?? row?.step_number ?? row?.sort_order ?? row?.sequence ?? row?.formula_current_sequence ?? row?.formulaCurrentSequence,
          true
        ),
      } as Item;
    });
  };

  const getOrderItems = (order: Order): Item[] => {
    const directItems = parseItems(order.items);
    if (directItems.length > 0) return directItems;
    const relationalItems = parseOrderItemsRelation(order);
    if (relationalItems.length > 0) return relationalItems;
    return [];
  };

  const getRealtimeTransitionItemKey = (item: Item, index: number) => {
    const record = item as unknown as Record<string, unknown>;
    const orderItemId = String(record.order_item_id ?? record.orderItemId ?? "").trim();
    if (orderItemId) return `order_item:${orderItemId}`;
    const dishId = String(record.dish_id ?? record.id ?? "").trim();
    const sequence = normalizeStepValue(record.step ?? record.sequence ?? record.formula_current_sequence ?? record.formulaCurrentSequence, true) ?? 0;
    const quantity = Number(record.quantity || 1);
    return `dish:${dishId || "unknown"}:step:${sequence}:qty:${quantity}:idx:${index}`;
  };

  const hasKitchenPreparingTransition = (oldItems: Item[], newItems: Item[]) => {
    const oldStatusByKey = new Map<string, "pending" | "preparing" | "ready">();
    oldItems.forEach((item, index) => {
      if (!isKitchenCourse(item)) return;
      oldStatusByKey.set(getRealtimeTransitionItemKey(item, index), getItemStatus(item));
    });
    for (let index = 0; index < newItems.length; index += 1) {
      const item = newItems[index];
      if (!isKitchenCourse(item)) continue;
      const nextStatus = getItemStatus(item);
      if (nextStatus !== "preparing") continue;
      const key = getRealtimeTransitionItemKey(item, index);
      const oldStatus = oldStatusByKey.get(key) || "pending";
      if (oldStatus !== "preparing") return true;
    }
    return false;
  };

  const buildOrderFromRealtimeRow = (row: Record<string, unknown>): Order | null => {
    const rowId = String(row.id || "").trim();
    if (!rowId) return null;
    const existingOrder = orders.find((order) => String(order.id || "").trim() === rowId) || null;
    const parseNullableNumber = (value: unknown) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };
    return {
      id: rowId,
      table_number: String(row.table_number ?? existingOrder?.table_number ?? "").trim(),
      items: row.items ?? existingOrder?.items ?? [],
      order_items: Array.isArray(row.order_items) ? (row.order_items as any[]) : existingOrder?.order_items ?? null,
      status: String(row.status ?? existingOrder?.status ?? "pending").trim() || "pending",
      created_at: String(row.created_at ?? existingOrder?.created_at ?? new Date().toISOString()),
      service_step: String(row.service_step ?? existingOrder?.service_step ?? "").trim() || null,
      current_step:
        parseNullableNumber(row.current_step) ??
        parseNullableNumber(existingOrder?.current_step) ??
        null,
      covers:
        parseNullableNumber(row.covers) ??
        parseNullableNumber(existingOrder?.covers) ??
        null,
      guest_count:
        parseNullableNumber(row.guest_count) ??
        parseNullableNumber(existingOrder?.guest_count) ??
        null,
      customer_count:
        parseNullableNumber(row.customer_count) ??
        parseNullableNumber(existingOrder?.customer_count) ??
        null,
      restaurant_id: row.restaurant_id ?? existingOrder?.restaurant_id ?? null,
    };
  };

  const triggerRealtimePreparingPrint = (order: Order) => {
    const orderId = String(order.id || "").trim();
    if (!orderId) return;
    const kitchenItems = getKitchenItems(order);
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
    setPrintOrder(order);
    setLastPrintedId(orderId);
    handleAutoPrint();
  };

  const normalizeStepValue = (value: unknown, allowZero = false) => {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return null;
    const truncated = Math.trunc(raw);
    if (allowZero && truncated === 0) return 0;
    if (truncated <= 0) return null;
    return Math.max(1, truncated);
  };
  const resolveItemExplicitStep = (item: Item) => {
    const record = item as unknown as Record<string, unknown>;
    const candidates: unknown[] = [
      record.step,
      (item as { step?: unknown }).step,
      record.sequence,
      (item as { sequence?: unknown }).sequence,
      record.formula_current_sequence,
      record.formulaCurrentSequence,
    ];
    for (const candidate of candidates) {
      const normalized = normalizeStepValue(candidate, true);
      if (normalized != null && normalized > 0) return normalized;
    }
    return null;
  };
  const resolveServiceStepRank = (step: unknown) => {
    const normalized = normalizeServiceStep(step);
    const index = SERVICE_STEP_SEQUENCE.indexOf(normalized as (typeof SERVICE_STEP_SEQUENCE)[number]);
    return index >= 0 ? index + 1 : 99;
  };
  const resolveItemStepRank = (item: Item) => {
    const explicitStep = resolveItemExplicitStep(item);
    if (explicitStep != null) return explicitStep;
    const formulaSequence = normalizeStepValue(resolveFormulaSequenceForItem(item));
    if (formulaSequence != null) return formulaSequence;
    return resolveServiceStepRank(resolveItemCourse(item));
  };
  const readItemSortOrder = (item: Item) => {
    const record = item as unknown as Record<string, unknown>;
    const raw = record.sort_order ?? record.step_number ?? record.sortOrder;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const sortKitchenItemsByStep = (items: Item[]) =>
    [...items].sort((a, b) => {
      const aSort = readItemSortOrder(a);
      const bSort = readItemSortOrder(b);
      if (aSort != null || bSort != null) {
        if (aSort == null) return 1;
        if (bSort == null) return -1;
        if (aSort !== bSort) return aSort - bSort;
      }
      const stepDiff = resolveItemStepRank(a) - resolveItemStepRank(b);
      if (stepDiff !== 0) return stepDiff;
      const aOrderItemId = normalizeEntityId((a as unknown as Record<string, unknown>).order_item_id ?? a.id);
      const bOrderItemId = normalizeEntityId((b as unknown as Record<string, unknown>).order_item_id ?? b.id);
      return aOrderItemId.localeCompare(bOrderItemId, "fr", { numeric: true, sensitivity: "base" });
    });

  const getKitchenItems = (order: Order) => {
    let items = getOrderItems(order).filter((item: any) => isKitchenCourse(item));
    items = items.map((item: Item) => {
      // Assign explicit step if missing
      if (resolveItemExplicitStep(item) == null) {
        const courseStep = resolveServiceStepRank(resolveItemCourse(item));
        return { ...item, step: courseStep, sequence: courseStep };
      }
      return item;
    });
    const sortedItems = sortKitchenItemsByStep(items);
    if (sortedItems.length === 0) return [];
    const currentStep = resolveOrderCurrentStep(order, sortedItems);
    if (!Number.isFinite(currentStep) || Number(currentStep) <= 0) return [];
    return sortedItems.filter((item) => {
      if (resolveItemStepRank(item) !== Number(currentStep)) return false;
      return getItemStatus(item as Item) === "preparing";
    });
  };
  const hasPendingKitchenItems = (order: Order) => getKitchenItems(order).some((item) => !isItemReady(item));
  const hasPreparingOrReadyKitchenItems = (order: Order) => getKitchenItems(order).some((item) => {
    const status = getItemStatus(item as Item);
    return status === "preparing" || status === "ready";
  });
  const getServedOrReadyKitchenItems = (order: Order) =>
    sortKitchenItemsByStep(
      getOrderItems(order)
      .filter((item) => isKitchenCourse(item))
      .filter((item) => getItemStatus(item as Item) === "ready")
    );

  const normalizeEntityId = (value: unknown) => String(value ?? "").trim();
  const repairUtf8Text = (value: unknown) => {
    if (value == null) return "";
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return "";
    const raw = String(value).trim();
    if (!raw) return "";

    let repaired = raw;
    if (/[ÃÂâ\u20AC]/.test(raw)) {
      try {
        const bytes = Uint8Array.from([...raw].map((char) => char.charCodeAt(0) & 0xff));
        const decoded = new TextDecoder("utf-8").decode(bytes).trim();
        const mojibakeScore = (input: string) => (input.match(/[ÃÂâ\u20AC]/g) || []).length;
        if (decoded && !decoded.includes("�") && mojibakeScore(decoded) < mojibakeScore(raw)) {
          repaired = decoded;
        }
      } catch {
        repaired = raw;
      }
    }

    return repaired.normalize("NFC");
  };
  const normalizeLookupText = (value: unknown) =>
    repairUtf8Text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const SERVICE_STEP_SEQUENCE = ["entree", "plat", "dessert"] as const;
  const SERVICE_STEP_LABELS: Record<string, string> = {
    entree: "ÉTAPE 1",
    plat: "ÉTAPE 2",
    dessert: "ÉTAPE 3",
  };
  const normalizeServiceStep = (value: unknown) => {
    const normalized = normalizeLookupText(value);
    if (["entree", "starter", "appetizer"].includes(normalized)) return "entree";
    if (["dessert", "sweet"].includes(normalized)) return "dessert";
    if (["plat", "main", "dish", "principal"].includes(normalized)) return "plat";
    return "";
  };
  const resolveCourseFromLabel = (value: unknown) => {
    const normalized = normalizeLookupText(value);
    if (/entree|starter|appetizer/.test(normalized)) return "entree";
    if (/dessert|sucre|sweet/.test(normalized)) return "dessert";
    if (/plat|main|dish|principal/.test(normalized)) return "plat";
    return "plat";
  };
  const resolveCourseFromSequence = (value: unknown) => {
    const raw = Number(value);
    if (!Number.isFinite(raw) || raw <= 0) return "";
    const sequence = Math.max(1, Math.trunc(raw));
    if (sequence === 1) return "entree";
    if (sequence >= 3) return "dessert";
    return "plat";
  };
  const parseFormulaEntryList = (value: unknown): Array<Record<string, unknown>> => {
    let source = value;
    if (typeof source === "string") {
      const raw = source.trim();
      if (!raw) return [];
      try {
        source = JSON.parse(raw);
      } catch {
        return [];
      }
    }
    if (Array.isArray(source)) {
      return source.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object");
    }
    if (source && typeof source === "object") {
      return [source as Record<string, unknown>];
    }
    return [];
  };
  const isFormulaItem = (item: Item) => {
    const record = item as unknown as Record<string, unknown>;
    const isFormulaFlag = Boolean(
      record.is_formula ??
        (record.dish && typeof record.dish === "object"
          ? (record.dish as Record<string, unknown>).is_formula
          : false)
    );
    const formulaId = normalizeEntityId(
      record.formula_id ??
        record.formulaId ??
        record.formula_dish_id ??
        record.formulaDishId ??
        ""
    );
    return isFormulaFlag || Boolean(formulaId);
  };
  const resolveFormulaSequenceForItem = (item: Item) => {
    if (!isFormulaItem(item)) return null;
    const record = item as unknown as Record<string, unknown>;
    const directCandidates: unknown[] = [
      record.step,
      record.sequence,
      record.formula_current_sequence,
      record.formulaCurrentSequence,
    ];
    for (const candidate of directCandidates) {
      const directCurrent = normalizeStepValue(candidate, true);
      if (directCurrent != null && directCurrent > 0) return directCurrent;
    }
    const targetDishId = normalizeEntityId(
      record.dish_id ??
        record.id ??
        (record.dish && typeof record.dish === "object" ? (record.dish as Record<string, unknown>).id : "")
    );
    const sources = [
      record.selected_options,
      record.selectedOptions,
      record.options,
      record.formula_items,
      record.formulaItems,
    ];
    let fallbackSequence: number | null = null;
    for (const source of sources) {
      const entries = parseFormulaEntryList(source);
      for (const entry of entries) {
        const kind = normalizeLookupText(entry.kind ?? entry.type ?? entry.group ?? "");
        const isFormulaEntry =
          kind === "formula" ||
          kind.includes("formula") ||
          entry.formula_dish_id != null ||
          entry.sequence != null;
        if (!isFormulaEntry) continue;
        const rawSequence = Number(entry.step ?? entry.sequence ?? entry.service_step_sequence);
        if (!Number.isFinite(rawSequence) || rawSequence <= 0) continue;
        const sequence = Math.max(1, Math.trunc(rawSequence));
        const entryDishId = normalizeEntityId(entry.dish_id ?? entry.dishId ?? entry.id ?? "");
        if (!targetDishId || !entryDishId || entryDishId === targetDishId) {
          return sequence;
        }
        if (fallbackSequence == null) {
          fallbackSequence = sequence;
        }
      }
    }
    return fallbackSequence;
  };
  const resolveFormulaEntryForCurrentSequence = (item: Item) => {
    if (!isFormulaItem(item)) return null;
    const currentSequence = resolveFormulaSequenceForItem(item);
    if (!Number.isFinite(currentSequence) || Number(currentSequence) <= 0) return null;
    const normalizedCurrent = Math.max(1, Math.trunc(Number(currentSequence)));
    const record = item as unknown as Record<string, unknown>;
    const sources = [
      record.formula_items,
      record.formulaItems,
      record.selected_options,
      record.selectedOptions,
      record.options,
    ];
    for (const source of sources) {
      const entries = parseFormulaEntryList(source);
      for (const entry of entries) {
        const kind = normalizeLookupText(entry.kind ?? entry.type ?? entry.group ?? "");
        const isFormulaEntry =
          kind === "formula" ||
          kind.includes("formula") ||
          entry.formula_dish_id != null ||
          entry.sequence != null;
        if (!isFormulaEntry) continue;
        const rawSequence = Number(entry.step ?? entry.sequence ?? entry.service_step_sequence);
        if (!Number.isFinite(rawSequence) || rawSequence <= 0) continue;
        const entrySequence = Math.max(1, Math.trunc(rawSequence));
        if (entrySequence === normalizedCurrent) return entry;
      }
    }
    return null;
  };
  const resolveItemCourse = (item: Item) => {
    const record = item as unknown as Record<string, unknown>;
    const sequenceCourse = resolveCourseFromSequence(resolveFormulaSequenceForItem(item));
    if (sequenceCourse) return sequenceCourse;
    const itemCategoryId = normalizeEntityId(
      record.category_id ??
        record.categoryId ??
        (record.dish && typeof record.dish === "object" ? (record.dish as Record<string, unknown>).category_id : null)
    );
    const dishId = normalizeEntityId(record.dish_id ?? record.id);
    const resolvedCategoryId = itemCategoryId || (dishId ? dishCategoryIdByDishId[dishId] || "" : "");
    const categoryLabel = resolvedCategoryId ? categoryNameById[resolvedCategoryId] || "" : "";
    const fallbackCategory = getCategory(item);
    return resolveCourseFromLabel(categoryLabel || fallbackCategory);
  };
  const resolveOrderServiceStep = (order: Order, items: Item[]) => {
    const foodItems = items.filter((item) => isKitchenCourse(item) && !isItemReady(item));
    if (foodItems.length === 0) return "";
    const availableSteps = new Set(foodItems.map((item) => resolveItemCourse(item)));
    const normalized = normalizeServiceStep(order.service_step);
    if (normalized && availableSteps.has(normalized)) return normalized;
    const fallback = SERVICE_STEP_SEQUENCE.find((step) => availableSteps.has(step));
    return fallback || normalized || "";
  };
  const resolveOrderCurrentStep = (order: Order, items: Item[]) => {
    const direct = normalizeStepValue(
      (order as unknown as Record<string, unknown>).current_step ??
        (order as unknown as Record<string, unknown>).currentStep,
      true
    );
    if (direct != null) return direct;
    const normalizedServiceStep = normalizeServiceStep(order.service_step);
    if (normalizedServiceStep === "entree") return 1;
    if (normalizedServiceStep === "plat") return 2;
    if (normalizedServiceStep === "dessert") return 3;
    const explicitSteps = items
      .map((item) => resolveItemExplicitStep(item))
      .filter((value): value is number => Number.isFinite(value));
    const positive = explicitSteps.filter((value) => value > 0);
    if (positive.length > 0) return Math.min(...positive);
    const fallbackStep = resolveOrderServiceStep(order, items);
    if (fallbackStep === "entree") return 1;
    if (fallbackStep === "plat") return 2;
    if (fallbackStep === "dessert") return 3;
    return 1;
  };
  const resolveServiceStepFromCurrentStep = (currentStep: number) => {
    if (currentStep >= 3) return "dessert";
    if (currentStep <= 1) return "entree";
    return "plat";
  };
  const resolveNextServiceStep = (order: Order, items: Item[]) => {
    const foodItems = items.filter((item) => isKitchenCourse(item) && !isItemReady(item));
    if (foodItems.length === 0) return "";
    const availableSteps = new Set(foodItems.map((item) => resolveItemCourse(item)));
    const current = resolveOrderServiceStep(order, items);
    const startIndex = current ? SERVICE_STEP_SEQUENCE.indexOf(current as (typeof SERVICE_STEP_SEQUENCE)[number]) : -1;
    const firstAvailable = SERVICE_STEP_SEQUENCE.find((step) => availableSteps.has(step)) || "";
    if (startIndex < 0) return firstAvailable;
    for (let index = startIndex + 1; index < SERVICE_STEP_SEQUENCE.length; index += 1) {
      const step = SERVICE_STEP_SEQUENCE[index];
      if (availableSteps.has(step)) return step;
    }
    return "";
  };
  const isUuidLike = (value: unknown) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(value || "").trim()
    );
  const resolveFormulaNameForItem = (item: Item) => {
    if (!isFormulaItem(item)) return "";
    const record = item as unknown as Record<string, unknown>;
    const directCandidates = [
      record.formula_dish_name,
      record.formulaDishName,
      record.formula_name,
      record.formulaName,
      (item as { formula_dish_name?: unknown }).formula_dish_name,
      (item as { formula_name?: unknown }).formula_name,
    ];
    for (const candidate of directCandidates) {
      const normalized = String(candidate || "").trim();
      if (normalized && !isUuidLike(normalized)) return normalized;
    }

    const targetDishId = normalizeEntityId(record.dish_id ?? record.id ?? "");
    const sources = [
      record.selected_options,
      record.selectedOptions,
      record.options,
      record.formula_items,
      record.formulaItems,
    ];
    for (const source of sources) {
      const entries = parseFormulaEntryList(source);
      for (const entry of entries) {
        const kind = normalizeLookupText(entry.kind ?? entry.type ?? entry.group ?? "");
        const isFormulaEntry =
          kind === "formula" ||
          kind.includes("formula") ||
          entry.formula_dish_id != null ||
          entry.sequence != null;
        if (!isFormulaEntry) continue;
        const entryDishId = normalizeEntityId(entry.dish_id ?? entry.dishId ?? entry.id ?? "");
        if (targetDishId && entryDishId && entryDishId !== targetDishId) continue;
        const candidate = String(
          entry.formula_dish_name ??
            entry.formula_name ??
            entry.formulaDishName ??
            entry.formulaName ??
            ""
        ).trim();
        if (candidate && !isUuidLike(candidate)) return candidate;
      }
    }

    const fallbackFormulaId = normalizeEntityId(
      record.formula_dish_id ??
        record.formulaDishId ??
        record.formula_id ??
        record.formulaId ??
        ""
    );
    if (fallbackFormulaId) return `Formule #${fallbackFormulaId}`;
    return "Formule";
  };
  const resolveFormulaStepLabelForItem = (item: Item) => {
    const explicitStep = resolveItemExplicitStep(item);
    if (explicitStep != null && explicitStep > 0) return `ÉTAPE ${explicitStep}`;
    if (!isFormulaItem(item)) return "";
    const sequence = resolveFormulaSequenceForItem(item);
    if (Number.isFinite(sequence) && Number(sequence) > 0) {
      return `ÉTAPE ${Math.max(1, Math.trunc(Number(sequence)))}`;
    }
    const step = resolveItemCourse(item);
    return SERVICE_STEP_LABELS[step] || "";
  };
  const getFormulaDisplayTagForItem = (item: Item) => {
    if (!isFormulaItem(item)) return "";
    const formulaName = resolveFormulaNameForItem(item);
    const stepLabel = resolveFormulaStepLabelForItem(item);
    if (formulaName && stepLabel) return `${formulaName} - ${stepLabel}`;
    if (formulaName) return formulaName;
    return stepLabel;
  };
  const buildStableExtraId = (dishId: unknown, name: unknown, price: unknown, index = 0) => {
    const dishKey = normalizeEntityId(dishId);
    const nameKey = normalizeLookupText(name || "");
    const amount = Number(price || 0);
    const safeAmount = Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
    return `extra:${dishKey}:${nameKey || "option"}:${safeAmount}:${index}`;
  };
  const parseI18nToken = (value: unknown) => {
    const raw = String(value || "").trim();
    if (!raw.startsWith(I18N_TOKEN)) return {} as Record<string, string>;
    try {
      const parsed = JSON.parse(decodeURIComponent(raw.replace(I18N_TOKEN, "")));
      if (!parsed || typeof parsed !== "object") return {} as Record<string, string>;
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [
          String(k || "").toLowerCase(),
          String(v || "").trim(),
        ])
      );
    } catch {
      return {} as Record<string, string>;
    }
  };

  const parseJsonRecord = (value: unknown): Record<string, unknown> | null => {
    if (!value) return null;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
      } catch {
        return null;
      }
    }
    if (typeof value === "object") return value as Record<string, unknown>;
    return null;
  };

  const getFrenchTranslationValue = (translations: unknown) => {
    const parsed = parseJsonRecord(translations);
    if (!parsed) return "";
    const direct = repairUtf8Text(parsed.fr || parsed["fr-FR"] || parsed["fr_fr"] || "");
    if (direct) return direct;

    const nameNode = parseJsonRecord(parsed.name);
    if (nameNode) {
      const fromNameNode = repairUtf8Text(nameNode.fr || nameNode["fr-FR"] || nameNode["fr_fr"] || "");
      if (fromNameNode) return fromNameNode;
    }

    const frNode = parseJsonRecord(parsed.fr);
    if (frNode) {
      const fromFrNode = repairUtf8Text(frNode.name || frNode.label || frNode.title || "");
      if (fromFrNode) return fromFrNode;
    }
    return "";
  };

  const keepStaffFrenchLabel = (value: unknown) => {
    const raw = repairUtf8Text(value);
    if (!raw) return "";
    const firstSegment = raw.split(/\s\/\s/).map((part) => part.trim()).filter(Boolean)[0] || raw;
    return firstSegment.replace(/\s{2,}/g, " ").trim();
  };

  const resolveDishNameFrFromRow = (row: Record<string, unknown>) =>
    keepStaffFrenchLabel(getFrenchTranslationValue(row.translations)) ||
    keepStaffFrenchLabel(row.name_fr || row.name || "");

  const resolveKitchenDishName = (item: Item) => {
    const itemAsRecord = item as Record<string, unknown>;
    const currentFormulaEntry = resolveFormulaEntryForCurrentSequence(item);
    if (currentFormulaEntry) {
      const fromFormulaEntry = keepStaffFrenchLabel(
        currentFormulaEntry.dish_name_fr ??
          currentFormulaEntry.dish_name ??
          currentFormulaEntry.dishName ??
          currentFormulaEntry.value ??
          currentFormulaEntry.label_fr ??
          ""
      );
      if (fromFormulaEntry && !isUuidLike(fromFormulaEntry)) return fromFormulaEntry;
    }
    const nestedDish =
      itemAsRecord.dish && typeof itemAsRecord.dish === "object"
        ? (itemAsRecord.dish as Record<string, unknown>)
        : null;
    const candidateId =
      normalizeEntityId(item.id) ||
      normalizeEntityId(item.dish_id) ||
      normalizeEntityId(nestedDish?.id);
    const fromCatalog = candidateId ? keepStaffFrenchLabel(dishNamesFrById[candidateId] || "") : "";
    if (fromCatalog) return fromCatalog;
    const nestedTranslationsName = keepStaffFrenchLabel(getFrenchTranslationValue(nestedDish?.translations));
    if (nestedTranslationsName) return nestedTranslationsName;
    const fallbackCandidates = [
      keepStaffFrenchLabel(nestedDish?.name_fr || ""),
      keepStaffFrenchLabel((item as Record<string, unknown>).name_fr || ""),
      keepStaffFrenchLabel(nestedDish?.name || ""),
      keepStaffFrenchLabel(item.name || ""),
    ];
    for (const candidate of fallbackCandidates) {
      if (candidate && !isUuidLike(candidate)) return candidate;
    }
    return "Plat inconnu";
  };

  const resolveFrenchSideName = (value: unknown) => {
    const candidate = normalizeEntityId(value);
    if (!candidate) return "";
    const fromCatalog = keepStaffFrenchLabel(sideNamesFrById[candidate] || "");
    if (fromCatalog) return fromCatalog;
    const alias = normalizeLookupText(candidate);
    const fromAlias = keepStaffFrenchLabel(sideNamesFrByAlias[alias] || "");
    if (fromAlias) return fromAlias;
    if (isUuidLike(candidate)) return "";
    const translated = translateClientTextToFrench(candidate);
    return isUuidLike(translated) ? "" : keepStaffFrenchLabel(translated);
  };

  const sanitizeKitchenText = (value: unknown) => {
    const raw = repairUtf8Text(value);
    if (!raw) return "";
    return raw
      .replace(/\(\+\s*[\d.,]+\s*(?:\u20AC|â‚¬)\)/gi, "")
      .replace(/\+\s*[\d.,]+\s*(?:\u20AC|â‚¬)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  const translateClientTextToFrench = (value: unknown) => {
    let text = sanitizeKitchenText(value);
    if (!text) return "";

    const directReplacements: Array<[RegExp, string]> = [
      [/\bkeine pilze\b/gi, "pas de champignons"],
      [/\bohne pilze\b/gi, "sans champignons"],
      [/\bno mushrooms\b/gi, "pas de champignons"],
      [/\bsin champinones\b/gi, "sans champignons"],
      [/\bsin setas\b/gi, "sans champignons"],
      [/\bno onions\b/gi, "sans oignons"],
      [/\bohne zwiebeln\b/gi, "sans oignons"],
      [/\bsin cebolla\b/gi, "sans oignons"],
      [/\bplease\b/gi, "svp"],
      [/\bbitte\b/gi, "svp"],
      [/\bpor favor\b/gi, "svp"],
      [/\bwell done\b/gi, "bien cuit"],
      [/\bmedium\b/gi, "a point"],
      [/\brare\b/gi, "saignant"],
      [/\bblutig\b/gi, "saignant"],
      [/\bdurchgebraten\b/gi, "bien cuit"],
    ];
    directReplacements.forEach(([pattern, replacement]) => {
      text = text.replace(pattern, replacement);
    });

    const normalizeSegmentPrefix = (segment: string) => {
      const trimmed = segment.trim();
      if (!trimmed) return "";
      if (/^(accompagnements|beilage(:n)|sides|acompa(:n|Ã±)amientos)\s*:/i.test(trimmed)) {
        return trimmed.replace(/^[^:]+:\s*/i, "Accompagnements: ");
      }
      if (/^(cuisson|cooking|garstufe|cocci[oÃ³]n)\s*:/i.test(trimmed)) {
        return trimmed.replace(/^[^:]+:\s*/i, "Cuisson: ");
      }
      if (/^(supplements?|extras?|suplementos?)\s*:/i.test(trimmed)) {
        return trimmed.replace(/^[^:]+:\s*/i, "Suppléments: ");
      }
      if (/^(demande|special request|request|petici[oÃ³]n especial|besonderer wunsch)\s*:/i.test(trimmed)) {
        return trimmed.replace(/^[^:]+:\s*/i, "Précisions: ");
      }
      return trimmed;
    };

    return repairUtf8Text(
      text
      .split("|")
      .map((segment) => normalizeSegmentPrefix(segment))
      .filter(Boolean)
      .join(" | ")
    );
  };

  const getKitchenNotes = (item: Item) => {
    const notes: string[] = [];
    const dedupeList = (values: string[]) => {
      const seen = new Set<string>();
      const output: string[] = [];
      values.forEach((value) => {
        const cleaned = keepStaffFrenchLabel(value).replace(/\s{2,}/g, " ");
        if (!cleaned) return;
        const collapsed = cleaned
          .split(/\s+/)
          .filter(Boolean)
          .filter((part, index, arr) => {
            if (index === 0) return true;
            const prev = arr[index - 1]
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "");
            const current = part
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "");
            return current !== prev;
          })
          .join(" ")
          .trim();
        if (!collapsed) return;
        const key = normalizeLookupText(collapsed);
        if (!key || seen.has(key)) return;
        seen.add(key);
        output.push(collapsed);
      });
      return output;
    };
    const toRawChoiceList = (value: unknown): string[] => {
      if (value == null) return [];
      if (Array.isArray(value)) return value.flatMap((entry) => toRawChoiceList(entry));
      if (typeof value === "string" || typeof value === "number") {
        const text = keepStaffFrenchLabel(translateClientTextToFrench(value));
        return text ? [text] : [];
      }
      if (typeof value === "object") {
        const rec = value as Record<string, unknown>;
        const direct = [
          rec.label_fr,
          rec.name_fr,
          rec.value_fr,
          rec.text,
          rec.title,
        ]
          .map((entry) => keepStaffFrenchLabel(entry))
          .filter(Boolean);
        if (direct.length > 0) return direct;
        return [
          rec.label,
          rec.name,
          rec.value,
          rec.choice,
          rec.selected,
        ]
          .map((entry) => keepStaffFrenchLabel(translateClientTextToFrench(entry)))
          .filter(Boolean);
      }
      return [];
    };
    const stripPrefixedValue = (entry: string, type: "side" | "cooking" | "option") => {
      const text = String(entry || "").trim();
      if (!text) return "";
      if (type === "side") {
        if (/^(accompagnements|beilage(:n)?|sides|acompa(:n|Ã±)amientos)\s*:/i.test(text)) {
          return text.replace(/^[^:]+:\s*/i, "").trim();
        }
      }
      if (type === "cooking") {
        if (/^(cuisson|cooking|garstufe|cocci[oÃ³]n)\s*:/i.test(text)) {
          return text.replace(/^[^:]+:\s*/i, "").trim();
        }
      }
      if (type === "option") {
        if (/^(option|options|variante|variantes|variant|variants|format|formats)\s*:/i.test(text)) {
          return text.replace(/^[^:]+:\s*/i, "").trim();
        }
      }
      return text;
    };
    const formulaSequenceForNotes = isFormulaItem(item) ? resolveFormulaSequenceForItem(item) : null;
    const extractOptionValuesByKind = (value: unknown, kinds: Array<"side" | "cooking" | "option">) => {
      const result: Record<"side" | "cooking" | "option", string[]> = { side: [], cooking: [], option: [] };
      const entries = Array.isArray(value)
        ? value
        : value && typeof value === "object"
          ? Object.values(value as Record<string, unknown>)
          : [];
      entries.forEach((entry) => {
        if (entry == null) return;
        if (typeof entry === "string" || typeof entry === "number") {
          const rawText = String(entry || "").trim();
          if (!rawText) return;
          if (kinds.includes("side") && /^(accompagnements|beilage(:n)?|sides|acompa(:n|Ã±)amientos)\s*:/i.test(rawText)) {
            result.side.push(stripPrefixedValue(rawText, "side"));
            return;
          }
          if (kinds.includes("cooking") && /^(cuisson|cooking|garstufe|cocci[oÃ³]n)\s*:/i.test(rawText)) {
            result.cooking.push(stripPrefixedValue(rawText, "cooking"));
            return;
          }
          if (kinds.includes("option") && /^(option|options|variante|variantes|variant|variants|format|formats)\s*:/i.test(rawText)) {
            result.option.push(stripPrefixedValue(rawText, "option"));
          }
          return;
        }

        const rec = entry as Record<string, unknown>;
        const source = normalizeLookupText(rec.source || "");
        const kind = normalizeLookupText(rec.kind || rec.type || rec.key || rec.group || rec.category || "");
        if (Number.isFinite(formulaSequenceForNotes) && Number(formulaSequenceForNotes) > 0 && (source === "formula" || kind.includes("formula"))) {
          const rawEntrySequence = Number(rec.sequence ?? rec.service_step_sequence ?? rec.step);
          if (Number.isFinite(rawEntrySequence) && rawEntrySequence > 0) {
            const normalizedEntrySequence = Math.max(1, Math.trunc(rawEntrySequence));
            const normalizedFormulaSequence = Math.max(1, Math.trunc(Number(formulaSequenceForNotes)));
            if (normalizedEntrySequence !== normalizedFormulaSequence) return;
          }
        }
        const rawValues = toRawChoiceList(
          rec.values ?? rec.value ?? rec.selected ?? rec.selection ?? rec.choice ?? rec.option ?? rec
        );
        if (kinds.includes("side") && /(side|accompagnement|beilage|acomp)/.test(kind)) {
          result.side.push(...rawValues.map((v) => stripPrefixedValue(v, "side")));
          return;
        }
        if (kinds.includes("cooking") && /(cooking|cuisson|garstufe|cocc)/.test(kind)) {
          result.cooking.push(...rawValues.map((v) => stripPrefixedValue(v, "cooking")));
          return;
        }
        if (kinds.includes("option") && /(option|variant|variante|format|taille)/.test(kind)) {
          result.option.push(...rawValues.map((v) => stripPrefixedValue(v, "option")));
        }
      });
      return result;
    };
    const itemRecord = item as unknown as Record<string, unknown>;

    const dishId =
      normalizeEntityId(item.dish_id) ||
      normalizeEntityId(item.id) ||
      normalizeEntityId(item?.dish?.id);

    const selectedSidesByIds = dedupeList(
      (Array.isArray(item.selected_side_ids)
        ? item.selected_side_ids
        : Array.isArray(item.selectedSides)
          ? item.selectedSides
          : []
      )
        .map((side) => resolveFrenchSideName(side))
        .filter(Boolean) as string[]
    );
    const optionValues = extractOptionValuesByKind(
      itemRecord.selected_options ?? itemRecord.selectedOptions ?? itemRecord.options,
      ["side", "cooking", "option"]
    );
    const directSideValues = dedupeList(
      [
        keepStaffFrenchLabel(itemRecord.accompagnement_fr || ""),
        keepStaffFrenchLabel(itemRecord.selected_side_label_fr || ""),
        ...toRawChoiceList(itemRecord.side),
        ...toRawChoiceList(itemRecord.accompaniment),
        ...toRawChoiceList(itemRecord.accompagnement),
        ...toRawChoiceList(itemRecord.accompaniments),
        ...toRawChoiceList(itemRecord.accompagnements),
        ...toRawChoiceList(itemRecord.side_dish),
        ...toRawChoiceList(itemRecord.sideDish),
        ...optionValues.side,
      ].map((entry) => stripPrefixedValue(entry, "side"))
    );
    const selectedSides = dedupeList([...selectedSidesByIds, ...directSideValues]);
    if (selectedSides.length > 0) notes.push(`Accompagnements: ${selectedSides.join(", ")}`);

    const selectedOptions = dedupeList(
      [
        ...toRawChoiceList(itemRecord.selected_option),
        ...optionValues.option,
        keepStaffFrenchLabel(translateClientTextToFrench(itemRecord.selected_option_name || "")),
      ].map((entry) => stripPrefixedValue(entry, "option"))
    );
    if (selectedOptions.length > 0) notes.push(`Option: ${selectedOptions.join(", ")}`);

    const selectedExtraIds = Array.isArray(item.selected_extra_ids) ? item.selected_extra_ids : [];
    const selectedExtrasById = dedupeList(
      selectedExtraIds
        .map((extraId) => keepStaffFrenchLabel(extraNamesFrByDishAndId[`${dishId}::${String(extraId || "").trim()}`] || ""))
        .filter(Boolean)
    );
    if (selectedExtrasById.length > 0) {
      notes.push(`Suppléments: ${selectedExtrasById.join(", ")}`);
    } else {
      const selectedExtrasSnapshot = dedupeList(
        (Array.isArray(item.selected_extras) ? item.selected_extras : [])
          .map((extra) => keepStaffFrenchLabel(translateClientTextToFrench(extra.label_fr || extra.name_fr || extra.name)))
          .filter(Boolean) as string[]
      );
      if (selectedExtrasSnapshot.length > 0) {
        notes.push(`Suppléments: ${selectedExtrasSnapshot.join(", ")}`);
      } else {
        const selectedExtras = dedupeList(
          Array.isArray(item.selectedExtras)
            ? item.selectedExtras
                .map((extra) => keepStaffFrenchLabel(translateClientTextToFrench(extra.name_fr || extra.name)))
                .filter(Boolean) as string[]
            : []
        );
        if (selectedExtras.length > 0) notes.push(`Suppléments: ${selectedExtras.join(", ")}`);
      }
    }

    const directCookingValue = dedupeList(
      [
      keepStaffFrenchLabel(itemRecord.cooking || ""),
      keepStaffFrenchLabel(itemRecord.cuisson || ""),
      keepStaffFrenchLabel(itemRecord.cooking_level || ""),
      keepStaffFrenchLabel(itemRecord.cuisson_label || ""),
      keepStaffFrenchLabel(itemRecord.selected_cooking_label || ""),
      keepStaffFrenchLabel(itemRecord.selected_cooking_label_fr || ""),
      ...optionValues.cooking,
    ].map((entry) => stripPrefixedValue(entry, "cooking"))
    )[0] || "";
    const cookingLabelFr =
      keepStaffFrenchLabel(item.selected_cooking_label_fr || "") ||
      keepStaffFrenchLabel((itemRecord.selected_cooking_label as string) || "");
    if (cookingLabelFr) {
      notes.push(`Cuisson: ${cookingLabelFr}`);
    } else {
      const cookingKey = normalizeCookingKey(item.selected_cooking_key || item.selected_cooking || "");
      if (cookingKey) {
        notes.push(`Cuisson: ${getCookingLabelFr(cookingKey)}`);
      } else if (directCookingValue) {
        notes.push(`Cuisson: ${directCookingValue}`);
      }
    }

    const detailValues: string[] = [];
    const specialRequest = String(item.special_request || "").trim();
    if (specialRequest) {
      detailValues.push(keepStaffFrenchLabel(translateClientTextToFrench(specialRequest)));
    }

    const instructions = String(item.instructions || "")
      .split("|")
      .map((segment) => String(segment || "").trim())
      .filter(Boolean)
      .map((segment) => {
        if (/^(accompagnements|beilage(:n)|sides|acompa(:n|Ã±)amientos)\s*:/i.test(segment)) return "";
        if (/^(supplements?|extras?|suplementos?)\s*:/i.test(segment)) return "";
        if (/^(cuisson|cooking|garstufe|cocci[oÃ³]n)\s*:/i.test(segment)) return "";
        if (/^(option|options|variante|variantes|variant|variants|format|formats)\s*:/i.test(segment)) return "";
        const normalized = translateClientTextToFrench(segment);
        if (!normalized || isUuidLike(normalized)) return "";
        return keepStaffFrenchLabel(normalized);
      })
      .filter(Boolean)
      .join(" | ");
    if (instructions) detailValues.push(instructions);

    const dedupedDetailValues = dedupeList(
      detailValues.map((value) =>
        String(value || "")
          .replace(/^details?\s*:\s*/i, "")
          .replace(/^precisions?\s*:\s*/i, "")
          .replace(/^commentaire cuisine\s*:\s*/i, "")
          .trim()
      )
    );
    if (dedupedDetailValues.length > 0) {
      notes.push(`Précisions: ${dedupedDetailValues.join(" | ")}`);
    }

    return keepStaffFrenchLabel(notes.join(" | "));
  };

  const getInlineCookingLevel = (item: Item) => {
    const itemRecord = item as unknown as Record<string, unknown>;
    const direct =
      String(item.selected_cooking_label_fr || "").trim() ||
      String((itemRecord.selected_cooking_label as string) || "").trim() ||
      String(item.cooking || "").trim() ||
      String(item.cuisson || "").trim();
    if (direct) return direct;
    const cookingKey = normalizeCookingKey(item.selected_cooking_key || item.selected_cooking || "");
    return cookingKey ? getCookingLabelFr(cookingKey) : "";
  };

  const getKitchenFinalDetails = (item: Item) => {
    const normalizeKey = (value: string) =>
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    const uniqueValues = (values: string[]) => {
      const seen = new Set<string>();
      return values
        .map((value) =>
          String(value || "")
            .replace(/^[-•]\s*/, "")
            .replace(/\s{2,}/g, " ")
            .trim()
        )
        .filter(Boolean)
        .filter((value) => {
          const key = normalizeKey(value);
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    };
    const stripPrefix = (value: string) =>
      String(value || "")
        .replace(/^details?\s*:\s*/i, "")
        .replace(/^notes?\s*:\s*/i, "")
        .trim();
    const extractTokens = (value: string) =>
      keepStaffFrenchLabel(value || "")
        .split(",")
        .map((token) => keepStaffFrenchLabel(token))
        .filter(Boolean);

    const cooking: string[] = [];
    const accompaniments: string[] = [];
    const supplements: string[] = [];
    const options: string[] = [];
    const remarks: string[] = [];

    String(getKitchenNotes(item) || "")
      .split("|")
      .map((entry) => stripPrefix(entry))
      .filter(Boolean)
      .forEach((entry) => {
        if (/^(cuisson|cooking|cui)\s*:/i.test(entry)) {
          cooking.push(...extractTokens(entry.replace(/^(cuisson|cooking|cui)\s*:\s*/i, "").trim()));
          return;
        }
        if (/^(accompagnement|accompagnements|side|sides|acc)\s*:/i.test(entry)) {
          accompaniments.push(
            ...extractTokens(entry.replace(/^(accompagnement|accompagnements|side|sides|acc)\s*:\s*/i, "").trim())
          );
          return;
        }
        if (/^(suppl[eé]ments?|supplements?|extras?|sup)\s*:/i.test(entry)) {
          supplements.push(
            ...extractTokens(entry.replace(/^(suppl[eé]ments?|supplements?|extras?|sup)\s*:\s*/i, "").trim())
          );
          return;
        }
        if (/^(option|options|op)\s*:/i.test(entry)) {
          options.push(...extractTokens(entry.replace(/^(option|options|op)\s*:\s*/i, "").trim()));
          return;
        }
        if (/^(pr[eé]cisions?|commentaire cuisine|remarque|remarks?|rq)\s*:/i.test(entry)) {
          remarks.push(
            ...extractTokens(entry.replace(/^(pr[eé]cisions?|commentaire cuisine|remarque|remarks?|rq)\s*:\s*/i, "").trim())
          );
          return;
        }
        remarks.push(...extractTokens(entry));
      });

    const cookingValues = uniqueValues(cooking);
    const accompanimentValues = uniqueValues(accompaniments);
    const supplementValues = uniqueValues(supplements);
    const optionValues = uniqueValues(options);
    const remarkValues = uniqueValues(remarks).filter((remark) => {
      const remarkKey = normalizeKey(remark);
      const alreadyInOtherSection = [...cookingValues, ...accompanimentValues, ...supplementValues, ...optionValues].some(
        (value) => normalizeKey(value) === remarkKey
      );
      return !alreadyInOtherSection;
    });

    const parts: string[] = [];
    if (cookingValues.length > 0) parts.push(`CUI : ${cookingValues.join(", ")}`);
    if (accompanimentValues.length > 0) parts.push(`ACC : ${accompanimentValues.join(", ")}`);
    if (supplementValues.length > 0) parts.push(`SUP : ${supplementValues.join(", ")}`);
    if (optionValues.length > 0) parts.push(`OP : ${optionValues.join(", ")}`);
    if (remarkValues.length > 0) parts.push(`RQ : ${remarkValues.join(", ")}`);
    return parts.join(", ");
  };

  const fetchCatalogNames = async () => {
    const scopeId = String(resolvedRestaurantId || "").trim();
    const dishesBaseQuery = supabase
      .from("dishes")
      .select("id,name,name_fr,translations,price,category_id,extras,sides,description")
      .order("id", { ascending: true });
    const sidesBaseQuery = supabase.from("sides_library").select("id,name_fr,name_en,name_es,name_de").order("id", { ascending: true });
    const categoriesBaseQuery = supabase.from("categories").select("id,destination,name_fr,name").order("id", { ascending: true });

    const [primaryDishesQuery, primarySidesQuery, primaryCategoriesQuery] = await Promise.all([
      scopeId ? dishesBaseQuery.eq("restaurant_id", scopeId) : dishesBaseQuery,
      scopeId ? sidesBaseQuery.eq("restaurant_id", scopeId) : sidesBaseQuery,
      scopeId ? categoriesBaseQuery.eq("restaurant_id", scopeId) : categoriesBaseQuery,
    ]);
    let dishesData = ((primaryDishesQuery.data || []) as Array<Record<string, unknown>>);
    let dishesError = primaryDishesQuery.error;
    if (dishesError) {
      const missingColumn = String((dishesError as { code?: string }).code || "") === "42703";
      if (scopeId && missingColumn) {
        const retryWithoutScope = await dishesBaseQuery;
        if (!retryWithoutScope.error) {
          dishesData = ((retryWithoutScope.data || []) as Array<Record<string, unknown>>);
          dishesError = null;
        }
      }
      const fallbackDishesQuery = await supabase
        .from("dishes")
        .select("id,name,name_fr,translations,price,category_id,extras,sides,description")
        .order("id", { ascending: true });
      if (!fallbackDishesQuery.error) {
        dishesData = ((fallbackDishesQuery.data || []) as Array<Record<string, unknown>>);
        dishesError = null;
      }
    }
    let sidesData = ((primarySidesQuery.data || []) as Array<Record<string, unknown>>);
    let sidesError = primarySidesQuery.error;
    if (sidesError) {
      const missingColumn = String((sidesError as { code?: string }).code || "") === "42703";
      if (scopeId && missingColumn) {
        const retryWithoutScope = await sidesBaseQuery;
        if (!retryWithoutScope.error) {
          sidesData = ((retryWithoutScope.data || []) as Array<Record<string, unknown>>);
          sidesError = null;
        }
      }
      const fallbackSidesQuery = await supabase
        .from("sides_library")
        .select("id,name_fr")
        .order("id", { ascending: true });
      if (!fallbackSidesQuery.error) {
        sidesData = ((fallbackSidesQuery.data || []) as Array<Record<string, unknown>>);
        sidesError = null;
      }
    }
    let categoriesData = ((primaryCategoriesQuery.data || []) as Array<Record<string, unknown>>);
    let categoriesError = primaryCategoriesQuery.error;
    if (categoriesError) {
      const fallbackCategoriesQuery = await supabase
        .from("categories")
        .select("id,destination,name_fr,name")
        .order("id", { ascending: true });
      if (!fallbackCategoriesQuery.error) {
        categoriesData = ((fallbackCategoriesQuery.data || []) as Array<Record<string, unknown>>);
        categoriesError = null;
      }
    }

    if (!categoriesError) {
      const byId: Record<string, "cuisine" | "bar"> = {};
      const nameById: Record<string, string> = {};
      categoriesData.forEach((row) => {
        const key = normalizeEntityId(row.id);
        if (!key) return;
        byId[key] = String(row.destination || "").trim().toLowerCase() === "bar" ? "bar" : "cuisine";
        nameById[key] = String(row.name_fr || row.name || "").trim();
      });
      setCategoryDestinationById(byId);
      setCategoryNameById(nameById);
    } else {
      setCategoryDestinationById({});
      setCategoryNameById({});
    }

    if (!dishesError) {
      const byId: Record<string, string> = {};
      const dishToCategory: Record<string, string> = {};
      const extrasByDishAndId: Record<string, string> = {};
      dishesData.forEach((row) => {
        const source = row as {
          id: unknown;
          name_fr: unknown;
          name: unknown;
          extras: unknown;
          description: unknown;
          translations: unknown;
          category_id: unknown;
        };
        const key = normalizeEntityId(source.id);
        if (!key) return;
        const categoryId = normalizeEntityId(source.category_id);
        if (categoryId) dishToCategory[key] = categoryId;
        byId[key] = resolveDishNameFrFromRow(source as Record<string, unknown>);

        const descriptionSource = String(source.description || "").trim();
        const extrasFromDescription = (() => {
          const matches = descriptionSource.match(/__EXTRAS_JSON__:\s*([^\n]+)/i);
          if (!matches?.[1]) return [] as Array<{ id: string; name: string; price: number }>;
          try {
            const parsed = JSON.parse(decodeURIComponent(matches[1].trim()));
            if (!Array.isArray(parsed)) return [] as Array<{ id: string; name: string; price: number }>;
            return parsed
              .map((entry, index) => {
                if (!entry || typeof entry !== "object") return null;
                const rowEntry = entry as Record<string, unknown>;
                const name = keepStaffFrenchLabel(rowEntry.name_fr || rowEntry.name || "");
                if (!name) return null;
                const id = String(rowEntry.id || "").trim() || buildStableExtraId(key, name, rowEntry.price, index);
                const amount = Number(rowEntry.price || 0);
                return { id, name, price: Number.isFinite(amount) ? amount : 0 };
              })
              .filter(Boolean) as Array<{ id: string; name: string; price: number }>;
          } catch {
            return [] as Array<{ id: string; name: string; price: number }>;
          }
        })();
        const extrasFromRaw =
          Array.isArray(source.extras)
            ? source.extras
            : typeof source.extras === "string"
              ? (() => {
                  try {
                    const parsed = JSON.parse(source.extras);
                    return Array.isArray(parsed) ? parsed : [];
                  } catch {
                    return [];
                  }
                })()
              : [];
        const normalizedExtras = extrasFromRaw
          .map((entry, index) => {
            if (typeof entry === "string") {
              const cleaned = entry.trim();
              if (!cleaned) return null;
              const [namePart, pricePart] = cleaned.split("=").map((part) => part.trim());
              const amount = Number((pricePart || "0").replace(",", "."));
              return {
                id: buildStableExtraId(key, keepStaffFrenchLabel(namePart || cleaned), amount, index),
                name: keepStaffFrenchLabel(namePart || cleaned),
              };
            }
            if (!entry || typeof entry !== "object") return null;
            const rowEntry = entry as Record<string, unknown>;
            const name = keepStaffFrenchLabel(rowEntry.name_fr || rowEntry.name || "");
            if (!name) return null;
            const amount = Number(rowEntry.price || 0);
            return {
              id: String(rowEntry.id || "").trim() || buildStableExtraId(key, name, amount, index),
              name,
            };
          })
          .filter(Boolean) as Array<{ id: string; name: string }>;
        const mergedExtras = [...extrasFromDescription, ...normalizedExtras];
        mergedExtras.forEach((extra) => {
          const extraId = String(extra.id || "").trim();
          const extraLabel = keepStaffFrenchLabel(extra.name || "");
          if (!extraId || !extraLabel) return;
          extrasByDishAndId[`${key}::${extraId}`] = extraLabel;
        });
      });
      setDishNamesFrById(byId);
      setDishCategoryIdByDishId(dishToCategory);
      setExtraNamesFrByDishAndId(extrasByDishAndId);
    } else {
      setDishNamesFrById({});
      setDishCategoryIdByDishId({});
      setExtraNamesFrByDishAndId({});
    }

    if (!sidesError) {
      const byId: Record<string, string> = {};
      const byAlias: Record<string, string> = {};
      sidesData.forEach((row) => {
        const source = row as {
          id: unknown;
          name_fr: unknown;
          name_en: unknown;
          name_es: unknown;
          name_de: unknown;
        };
        const key = normalizeEntityId(source.id);
        if (!key) return;
        const frLabel = String(source.name_fr || "").trim();
        byId[key] = frLabel;
        if (!frLabel) return;
        [source.name_fr, source.name_en, source.name_es, source.name_de].forEach((nameValue) => {
          const label = String(nameValue || "").trim();
          if (!label) return;
          const aliasKey = normalizeLookupText(label);
          if (aliasKey) byAlias[aliasKey] = frLabel;
          const tokenValues = parseI18nToken(label);
          Object.values(tokenValues).forEach((tokenLabel) => {
            const tokenAliasKey = normalizeLookupText(tokenLabel);
            if (tokenAliasKey) byAlias[tokenAliasKey] = frLabel;
          });
        });
      });
      setSideNamesFrById(byId);
      setSideNamesFrByAlias(byAlias);
    }
  };

  const printableCuisineItems = (order: Order) => getKitchenItems(order);

  const isRateLimitError = (error: any) => {
    const code = String(error.code || error.status || "").toLowerCase();
    const message = String(error.message || "").toLowerCase();
    return code === "429" || message.includes("too many requests") || message.includes("rate limit");
  };

  const hydrateDishNamesFromOrders = async (ordersToHydrate: Order[]) => {
    const ids = Array.from(
      new Set(
        ordersToHydrate
          .flatMap((order) => getOrderItems(order))
          .map((item) => normalizeEntityId(item.dish_id || item.id || item.dish.id))
          .filter(Boolean)
      )
    );
    if (ids.length === 0) return;

    const lookup = await supabase.from("dishes").select("id,name,name_fr,translations").in("id", ids);
    if (lookup.error) {
      console.warn("Lookup dishes cuisine échoué:", lookup.error);
      return;
    }

    const byId: Record<string, string> = {};
    (lookup.data || []).forEach((row) => {
      const source = row as { id: unknown; name_fr: unknown; name: unknown; translations: unknown };
      const key = normalizeEntityId(source.id);
      const label = resolveDishNameFrFromRow(source as Record<string, unknown>);
      if (!key || !label) return;
      byId[key] = label;
    });

    if (Object.keys(byId).length > 0) {
      setDishNamesFrById((prev) => ({ ...prev, ...byId }));
    }
  };

  const resolveCallsTable = async () => {
    const primary = await supabase.from("calls").select("id").limit(1);
    if (!primary.error) {
      if (callsTableName !== "calls") setCallsTableName("calls");
      return "calls" as const;
    }
    logSqlError("kitchen.resolveCallsTable.primary", primary.error);
    return "calls" as const;
  };

  const fetchKitchenSettings = async () => {
    const restaurantId = String(resolvedRestaurantId || "").trim();
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", restaurantId)
      .maybeSingle();
    if (error || !data) return;
    const row = data as Record<string, unknown>;
    const tableConfig =
      typeof row.table_config === "string"
        ? (() => {
            try {
              return JSON.parse(String(row.table_config || "{}")) as Record<string, unknown>;
            } catch {
              return {} as Record<string, unknown>;
            }
          })()
        : (row.table_config as Record<string, unknown> | null) || {};
    const direct = row.auto_print;
    const nested = tableConfig.auto_print;
    const hasDirectAutoPrintValue = direct !== null && direct !== undefined && String(direct).trim() !== "";
    const nextAutoPrint = hasDirectAutoPrintValue
      ? direct === true || direct === "true"
      : nested === true || nested === "true";
    console.log("Auto-print activé ?", row.auto_print ?? null, "=>", nextAutoPrint);
    setAutoPrintEnabled(nextAutoPrint);
  };

  const fetchOrders = async (allowAutoPrint = false) => {
    if (isOrderStatusUpdatingRef.current) return false;
    let shouldTriggerAutoPrint = false;
    try {
      const restaurantId = String(resolvedRestaurantId || "").trim();
      if (!restaurantId) {
        setOrders([]);
        return false;
      }
      const sinceIso = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const ordersResult = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gt("created_at", sinceIso)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
      const { data: rawOrders, error } = ordersResult;

      if (error) {
        logSqlError("kitchen.fetchOrders.primary", error);
        if (isRateLimitError(error)) setRefreshMs((prev) => (prev === 5000 ? prev : 5000));
        return;
      }

      const data = (rawOrders || []) as Array<Record<string, unknown>>;

      const closedStatuses = new Set([
        "paid",
        "paye",
        "payee",
        "archived",
        "archive",
        "archivee",
        "closed",
        "cloture",
        "cloturee",
        "cancelled",
        "canceled",
        "annule",
        "annulee",
      ]);

      const kitchenOrders = (data || []).filter((order: any) => {
        const normalizedStatus = String(order.status || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();
        if (closedStatuses.has(normalizedStatus)) return false;
        const items = getOrderItems(order as Order);
        return items.some((item: any) => isKitchenCourse(item));
      });

      const normalizeCoversValue = (value: unknown) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return null;
        const whole = Math.trunc(n);
        return whole > 0 ? whole : null;
      };
      const readOrderCovers = (order: any) =>
        normalizeCoversValue(order?.covers) ??
        normalizeCoversValue(order?.guest_count) ??
        normalizeCoversValue(order?.customer_count);

      const missingCoverTables = Array.from(
        new Set(
          kitchenOrders
            .filter((order: any) => !readOrderCovers(order))
            .map((order: any) => String(order.table_number || "").trim())
            .filter(Boolean)
        )
      );
      let coversByTable = new Map<string, number>();
      if (missingCoverTables.length > 0) {
        const { data: tableRows } = await supabase
          .from("table_assignments")
          .select("*")
          .in("table_number", missingCoverTables);
        coversByTable = new Map<string, number>();
        (tableRows || []).forEach((row: any) => {
          const key = String(row?.table_number || "").trim();
          const covers =
            normalizeCoversValue(row?.covers) ??
            normalizeCoversValue(row?.guest_count) ??
            normalizeCoversValue(row?.customer_count);
          if (key && covers) coversByTable.set(key, covers);
        });
      }
      const kitchenOrdersWithCovers = kitchenOrders.map((order: any) => {
        if (readOrderCovers(order)) return order;
        const fallback = coversByTable.get(String(order?.table_number || "").trim());
        if (!fallback) return order;
        return { ...order, covers: fallback, guest_count: fallback, customer_count: fallback };
      });

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
      return shouldTriggerAutoPrint;
    } catch (error) {
      logSqlError("kitchen.fetchOrders.unexpected", error);
      if (isRateLimitError(error)) setRefreshMs((prev) => (prev === 5000 ? prev : 5000));
      return false;
    }
  };

  const handleAutoPrint = () => {
    // On laisse 1 seconde pour que le ticket soit généré dans le DOM
    setTimeout(() => {
      try {
        if (typeof window !== "undefined" && typeof window.print === "function") {
          window.print();
        }
      } catch (error) {
        console.warn("Auto-print failed:", error);
      }
    }, 1000);
  };

  useEffect(() => {
    isOrderStatusUpdatingRef.current = isOrderStatusUpdating;
  }, [isOrderStatusUpdating]);

  useEffect(() => {
    void (async () => {
      await resolveCallsTable();
      await fetchKitchenSettings();
      await fetchOrders();
      await fetchCatalogNames();
    })();

    const channel = supabase
      .channel("kitchen-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        async (payload) => {
          const eventType = String(payload?.eventType || "").toUpperCase();
          if (eventType === "UPDATE") {
            const oldRow = (payload?.old || {}) as Record<string, unknown>;
            const newRow = (payload?.new || {}) as Record<string, unknown>;
            const oldOrderStatus = normalizeStatusValue(oldRow.status);
            const newOrderStatus = normalizeStatusValue(newRow.status);
            const oldItems = parseItems(oldRow.items);
            const newItems = parseItems(newRow.items);
            const preparingTransitionByStatus =
              oldOrderStatus !== "preparing" && newOrderStatus === "preparing";
            const preparingTransitionByItems =
              newItems.length > 0 && hasKitchenPreparingTransition(oldItems, newItems);
            const hasPreparingTransition = preparingTransitionByStatus || preparingTransitionByItems;
            if (autoPrintEnabled && hasPreparingTransition) {
              const printOrderFromRealtime = buildOrderFromRealtimeRow(newRow);
              if (printOrderFromRealtime) {
                triggerRealtimePreparingPrint(printOrderFromRealtime);
                await fetchOrders(false);
                return;
              }
            }
          }
          await fetchOrders(eventType === "INSERT" || eventType === "UPDATE");
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        async (payload) => {
          const row = (payload?.new || {}) as Record<string, unknown>;
          const type = String(row.type || "").trim().toUpperCase();
          if (type !== "CUISINE_PRINT" && type !== "KITCHEN_PRINT") return;
          const rowRestaurantId = String(row.restaurant_id || "").trim();
          const currentRestaurantId = String(resolvedRestaurantId || "").trim();
          if (rowRestaurantId && currentRestaurantId && rowRestaurantId !== currentRestaurantId) return;
          await fetchOrders(true);
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurants" }, () => void fetchKitchenSettings())
      .on("postgres_changes", { event: "*", schema: "public", table: "dishes" }, () => void fetchCatalogNames())
      .on("postgres_changes", { event: "*", schema: "public", table: "sides_library" }, () => void fetchCatalogNames())
      .subscribe();

    const poll = window.setInterval(() => {
      void fetchOrders();
    }, refreshMs);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(poll);
    };
  }, [refreshMs, autoPrintEnabled, resolvedRestaurantId]);

  useEffect(() => {
    setIsMounted(true);
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    if (!printOrder || !autoPrintEnabled) return;
    const nextOrderId = String(printOrder.id || "").trim();
    if (!nextOrderId || nextOrderId === lastPrintedId) return;
    console.log("Nouvelle commande reçue, tentative d'impression...");
    setLastPrintedId(nextOrderId);
    handleAutoPrint();
  }, [printOrder, autoPrintEnabled, lastPrintedId]);

  const handleReady = async (orderId: string | number) => {
    try {
      const targetOrder = orders.find((order) => String(order.id) === String(orderId));
      if (!targetOrder) {
        needsOrderRefreshRef.current = true;
        return;
      }

      const currentItems = getOrderItems(targetOrder as Order);
      if (currentItems.length === 0) return;
      const kitchenItems = currentItems.filter((item) => isKitchenCourse(item));
      const currentStep = resolveOrderCurrentStep(targetOrder, kitchenItems as Item[]);
      const persistedCurrentStep = Number.isFinite(currentStep) && Number(currentStep) > 0 ? Number(currentStep) : 1;
      const hasFormulaItems = currentItems.some((item) => {
        const record = item as Record<string, unknown>;
        return Boolean(
          record.is_formula ??
            record.formula_dish_id ??
            record.formulaDishId ??
            record.formula_id ??
            record.formulaId
        );
      });
      const hasNextKitchenStep = kitchenItems.some((item) => resolveItemStepRank(item) > persistedCurrentStep);
      const nextItems = currentItems.map((item) => {
        console.log(`DEBUG Cuisine: Item ${(item as any).name_fr}, destination: ${(item as any).destination}, step: ${resolveItemStepRank(item)}, currentStep: ${persistedCurrentStep}, isKitchen: ${isKitchenCourse(item)}`);
        if (!isKitchenCourse(item)) return item;
        const itemStep = resolveItemStepRank(item);
        if (itemStep === persistedCurrentStep) {
          return setItemStatus(item, "ready");
        }
        return item;
      });
      const nextStatus = deriveOrderStatusFromItems(nextItems);
      const nextCurrentStep = hasFormulaItems && hasNextKitchenStep ? persistedCurrentStep : persistedCurrentStep + 1;
      const nextServiceStep = resolveServiceStepFromCurrentStep(nextCurrentStep);
      const orderUpdatePayload = {
        items: nextItems,
        status: nextStatus,
        service_step: nextServiceStep,
        current_step: nextCurrentStep,
      };

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
        console.log("update_order_item_status failed:", updateResult.error);
        console.error("Erreur update orders:", updateResult.error?.message || updateResult.error);
        needsOrderRefreshRef.current = true;
        return;
      }

      setOrders((prev) =>
        prev.map((order) => {
          if (String(order.id) !== String(orderId)) return order;
          return {
            ...order,
            items: nextItems,
            status: nextStatus,
            service_step: nextServiceStep,
            current_step: nextCurrentStep,
          };
        })
      );
    } catch (error) {
      console.error("update_order_item_status unexpected error:", error);
      needsOrderRefreshRef.current = true;
    }
  };

  const handleSendNextStep = async (orderId: string | number) => {
    try {
      const targetOrder = orders.find((order) => String(order.id) === String(orderId));
      if (!targetOrder) {
        needsOrderRefreshRef.current = true;
        return;
      }

      const currentItems = getOrderItems(targetOrder as Order);
      if (currentItems.length === 0) return;
      const kitchenItems = currentItems.filter((item) => isKitchenCourse(item));
      const currentStep = resolveOrderCurrentStep(targetOrder, kitchenItems as Item[]);
      const persistedCurrentStep = Number.isFinite(currentStep) && Number(currentStep) > 0 ? Number(currentStep) : 1;
      const nextItems = currentItems.map((item) => {
        if (!isKitchenCourse(item)) return item;
        const itemStep = resolveItemStepRank(item);
        if (itemStep === persistedCurrentStep + 1) {
          return setItemStatus(item, "preparing");
        }
        return item;
      });
      const nextStatus = deriveOrderStatusFromItems(nextItems);
      const nextCurrentStep = persistedCurrentStep + 1;
      const nextServiceStep = resolveServiceStepFromCurrentStep(nextCurrentStep);
      const orderUpdatePayload = {
        items: nextItems,
        status: nextStatus,
        service_step: nextServiceStep,
        current_step: nextCurrentStep,
      };

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
        console.log("handleSendNextStep failed:", updateResult.error);
        console.error("Erreur handleSendNextStep:", updateResult.error?.message || updateResult.error);
        needsOrderRefreshRef.current = true;
        return;
      }

      setOrders((prev) =>
        prev.map((order) => {
          if (String(order.id) !== String(orderId)) return order;
          return {
            ...order,
            items: nextItems,
            status: nextStatus,
            service_step: nextServiceStep,
            current_step: nextCurrentStep,
          };
        })
      );
    } catch (error) {
      console.error("handleSendNextStep unexpected error:", error);
      needsOrderRefreshRef.current = true;
    }
  };

  const [readyGroupLoadingKey, setReadyGroupLoadingKey] = useState<string>("");
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
    const targetRestaurantId = String(resolvedRestaurantId || "").trim();
    if (!targetRestaurantId) {
      alert("Restaurant introuvable, rappel impossible.");
      return;
    }

    const notificationPayload = {
      type: "CUISINE",
      message: "La cuisine appelle les serveurs",
      table_number: "CUISINE",
      status: "pending",
      restaurant_id: targetRestaurantId,
    };
    const notifInsert = await supabase.from("notifications").insert([notificationPayload]);
    if (notifInsert.error) {
      logSqlError("kitchen.handleRemindServer.notifications", notifInsert.error);
      alert("Impossible d'envoyer le rappel serveur.");
      return;
    }

    alert("Alerte envoyée aux serveurs.");
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const priorityOrders = orders.filter((order) => hasPreparingOrReadyKitchenItems(order as Order));
  const readyHistoryOrders = orders.filter((order) => getServedOrReadyKitchenItems(order as Order).length > 0);
  const groupedPriorityOrders = (() => {
    const getHourKey = (createdAt: string) => {
      const date = new Date(createdAt);
      if (!Number.isFinite(date.getTime())) return String(createdAt || "").slice(0, 13);
      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
    };
    const toCovers = (order: Order) => {
      const value = Number(order.covers || order.guest_count || order.customer_count || 0);
      return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null;
    };

    type KitchenGroup = {
      groupKey: string;
      tableNumber: string;
      covers: number | null;
      createdAt: string;
      orderIds: Array<string | number>;
      serviceStep: string;
      hasFormulaItems: boolean;
      items: Array<{ orderId: string | number; item: Item; idx: number }>;
    };

    const map = new Map<string, KitchenGroup>();
    priorityOrders.forEach((order) => {
      const hourKey = getHourKey(String(order.created_at || ""));
      const tableNumber = String(order.table_number || "").trim() || "?";
      const kitchenItems = getKitchenItems(order as Order);
      const hasFormulaItems = kitchenItems.some((item) => isFormulaItem(item as Item));
      const serviceStep = hasFormulaItems ? resolveOrderServiceStep(order as Order, kitchenItems as Item[]) : "";
      const groupKey = `${tableNumber}-${hourKey}-${serviceStep || "plat"}`;
      if (kitchenItems.length === 0) return;
      const existing = map.get(groupKey);
      if (existing) {
        existing.orderIds.push(order.id);
        existing.items.push(
          ...kitchenItems.map((item, idx) => ({ orderId: order.id, item: item as Item, idx }))
        );
        if (!existing.hasFormulaItems && hasFormulaItems) existing.hasFormulaItems = true;
        const nextCovers = toCovers(order);
        if (!existing.covers && nextCovers) existing.covers = nextCovers;
        if (new Date(order.created_at).getTime() < new Date(existing.createdAt).getTime()) {
          existing.createdAt = order.created_at;
        }
        return;
      }
      map.set(groupKey, {
        groupKey,
        tableNumber,
        covers: toCovers(order),
        createdAt: order.created_at,
        orderIds: [order.id],
        serviceStep,
        hasFormulaItems,
        items: kitchenItems.map((item, idx) => ({ orderId: order.id, item: item as Item, idx })),
      });
    });
    return [...map.values()]
      .map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) => {
          const stepDiff = resolveItemStepRank(a.item) - resolveItemStepRank(b.item);
          if (stepDiff !== 0) return stepDiff;
          const orderDiff = String(a.orderId).localeCompare(String(b.orderId), "fr", { numeric: true, sensitivity: "base" });
          if (orderDiff !== 0) return orderDiff;
          return a.idx - b.idx;
        }),
      }))
      .sort((a, b) => {
        const tableA = Number(a.tableNumber);
        const tableB = Number(b.tableNumber);
        if (Number.isFinite(tableA) && Number.isFinite(tableB) && tableA !== tableB) {
          return tableA - tableB;
        }
        const tableDiff = a.tableNumber.localeCompare(b.tableNumber, "fr", { numeric: true, sensitivity: "base" });
        if (tableDiff !== 0) return tableDiff;
        const stepDiff = resolveServiceStepRank(a.serviceStep) - resolveServiceStepRank(b.serviceStep);
        if (stepDiff !== 0) return stepDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  })();
  const handleManualPrint = () => {
    const targetOrder = priorityOrders[0] || readyHistoryOrders[0] || orders[0] || null;
    if (!targetOrder) return;
    setPrintOrder(targetOrder);
    handleAutoPrint();
  };
  const printFormulaTags = printOrder
    ? Array.from(
        new Set(
          printableCuisineItems(printOrder)
            .map((item) => getFormulaDisplayTagForItem(item as Item))
            .filter((value) => String(value || "").trim().length > 0)
        )
      )
    : [];

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-black">
      <div className="mb-6 bg-white p-4 shadow rounded-lg">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold uppercase">
            CUISINE - <span suppressHydrationWarning>{isMounted ? currentTime.toLocaleTimeString("fr-FR") : "--:--:--"}</span>
          </h1>
          <div className="flex items-center gap-2">
            {autoPrintEnabled ? (
              <span className="rounded border-2 border-black bg-green-100 px-3 py-2 text-xs font-black text-green-900">
                Impression auto...
              </span>
            ) : (
              <button
                onClick={handleManualPrint}
                disabled={orders.length === 0}
                className="rounded border-2 border-black bg-white px-4 py-2 text-sm font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-gray-100 disabled:opacity-50 disabled:shadow-none"
              >
                IMPRIMER
              </button>
            )}
            <button
              onClick={() => handleRemindServer()}
              className="rounded border-2 border-black bg-orange-600 px-4 py-2 text-sm font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-orange-700"
            >
              <span className="inline-flex items-center gap-2">
                <BellRing className="h-4 w-4" />
                APPELER SERVEUR
              </span>
            </button>
          </div>
        </div>
      </div>

      {orders.length === 0 && <p className="text-gray-500 italic">Aucune commande en attente pour la cuisine.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupedPriorityOrders.map((group) => {
          const isSubmitting = readyGroupLoadingKey === group.groupKey;
          if (group.items.length === 0) return null;
          const itemsByStep = group.items.reduce(
            (map, entry) => {
              const sourceItem = entry.item as Item;
              const stepRank = resolveItemStepRank(sourceItem);
              const explicitStep = resolveItemExplicitStep(sourceItem);
              const stepLabel = explicitStep
                ? `ÉTAPE ${explicitStep}`
                : resolveFormulaStepLabelForItem(sourceItem) ||
                  SERVICE_STEP_LABELS[resolveItemCourse(sourceItem)] ||
                  "PLAT";
              const stepKey = `${stepRank}-${stepLabel}`;
              const existing = map.get(stepKey);
              if (existing) {
                existing.items.push(entry);
                return map;
              }
              map.set(stepKey, {
                stepKey,
                stepRank,
                stepLabel,
                items: [entry],
              });
              return map;
            },
            new Map<
              string,
              {
                stepKey: string;
                stepRank: number;
                stepLabel: string;
                items: Array<{ orderId: string | number; item: Item; idx: number }>;
              }
            >()
          );
          const orderedStepGroups = [...itemsByStep.values()].sort((a, b) => a.stepRank - b.stepRank);

          return (
            <div
              key={group.groupKey}
              className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-2">
                  <div>
                    <h2 className="text-3xl font-black">
                      T-{group.tableNumber}
                      {group.covers ? ` | 👥 ${group.covers}` : ""}
                    </h2>
                    {orderedStepGroups.length > 0 ? (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {orderedStepGroups.map((stepGroup) => (
                          <span
                            key={`${group.groupKey}-${stepGroup.stepKey}`}
                            className="inline-flex items-center rounded border-2 border-black bg-white px-2 py-1 text-[11px] font-black"
                          >
                            {stepGroup.stepLabel}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <span className="text-xs font-mono text-gray-500">{group.orderIds.length} commande(s)</span>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600">Arrivée: {formatTime(group.createdAt)}</p>
                </div>

                <div className="space-y-3 mb-4">
                  {orderedStepGroups.map((stepGroup) => (
                    <div key={`${group.groupKey}-${stepGroup.stepKey}`} className="space-y-2">
                      <div className="text-[11px] font-black uppercase tracking-wide text-gray-700">{stepGroup.stepLabel}</div>
                      {stepGroup.items.map(({ item, orderId, idx }) => {
                        const sourceItem = item as Item;
                        const finalDetails = getKitchenFinalDetails(sourceItem);
                        const formulaTag = getFormulaDisplayTagForItem(sourceItem);
                        return (
                          <div
                            key={`${String(orderId)}-${idx}-${String(sourceItem.dish_id || sourceItem.id || "")}`}
                            className="bg-gray-100 p-2"
                          >
                            <div className="font-bold text-lg">
                              <span className="bg-black text-white px-2 mr-2 rounded">{sourceItem.quantity}x</span>
                              <span translate="no" className="notranslate">
                                {resolveKitchenDishName(sourceItem)}
                              </span>
                            </div>
                            {formulaTag ? (
                              <div className="mt-1 text-[11px] font-black text-red-700">{formulaTag}</div>
                            ) : null}
                            {finalDetails ? (
                              <div className="mt-1 text-xs italic text-gray-800 leading-tight" translate="no">
                                <span className="notranslate">- {finalDetails}</span>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-300">
                <div className="space-y-2">
                  <button
                    onClick={() => void handleReadyGroup(group.groupKey, group.orderIds)}
                    disabled={isSubmitting}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-5 text-2xl border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ width: "100%", padding: "20px", fontSize: "1.5rem" }}
                  >
                    {isSubmitting ? "MISE À JOUR..." : "TOUT EST PRÊT"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {readyHistoryOrders.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-black uppercase text-gray-700">Plats servis/prêts</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {readyHistoryOrders.map((order) => {
              const kitchenItems = getServedOrReadyKitchenItems(order as Order);
              if (kitchenItems.length === 0) return null;
              return (
                <div key={`ready-${order.id}`} className="rounded border border-gray-300 bg-gray-50 p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-sm font-black">
                      T-{order.table_number}
                      {Number(order.covers || order.guest_count || order.customer_count) > 0
                        ? ` | 👥 ${Number(order.covers || order.guest_count || order.customer_count)}`
                        : ""}
                    </div>
                    <span className="rounded bg-green-600 px-2 py-0.5 text-[10px] font-bold text-white">SERVI/PRÊT</span>
                  </div>
                  <div className="space-y-1">
                    {kitchenItems.map((item: any, idx: number) => {
                      const finalDetails = getKitchenFinalDetails(item as Item);
                      const formulaTag = getFormulaDisplayTagForItem(item as Item);
                      return (
                        <div key={`${String(order.id)}-ready-${idx}-${String(item.dish_id || item.id || "")}`} className="text-xs text-black">
                          <div className="font-semibold">
                            {item.quantity}x{" "}
                            <span translate="no" className="notranslate">
                              {resolveKitchenDishName(item)}
                            </span>
                          </div>
                          {formulaTag ? (
                            <div className="text-[11px] font-black text-red-700">{formulaTag}</div>
                          ) : null}
                          {finalDetails ? (
                            <div className="text-[11px] italic text-gray-700" translate="no">
                              <span className="notranslate">- {finalDetails}</span>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
      {printOrder ? (
        <>
          <div id="ticket-print" className="hidden print:block p-4 text-black">
            <div className="text-xl font-bold">
              CUISINE - T-{printOrder.table_number}
              {Number(printOrder.covers || printOrder.guest_count || printOrder.customer_count) > 0
                ? ` | 👥 ${Number(printOrder.covers || printOrder.guest_count || printOrder.customer_count)}`
                : ""}
            </div>
            {printFormulaTags.length > 0 ? (
              <div className="mt-1 flex flex-col gap-0.5 text-sm font-black">
                {printFormulaTags.map((tag) => (
                  <span key={`print-formula-tag-${tag}`}>{tag}</span>
                ))}
              </div>
            ) : null}
            <div className="border-t border-b border-dashed border-black py-2">
              {printableCuisineItems(printOrder).map((item: any, idx: number) => {
                const finalDetails = getKitchenFinalDetails(item as Item);
                const formulaTag = getFormulaDisplayTagForItem(item as Item);
                return (
                  <div key={`print-${String(printOrder.id)}-${idx}-${String(item.dish_id || item.id || "")}`}>
                    {item.quantity}x{" "}
                    <span translate="no" className="notranslate">
                      {resolveKitchenDishName(item)}
                    </span>
                    {formulaTag ? (
                      <div translate="no" className="notranslate text-[11px] font-black">
                        {formulaTag}
                      </div>
                    ) : null}
                    {finalDetails ? (
                      <div translate="no" className="notranslate italic text-xs">
                        - {finalDetails}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          <style>{`
            @media print {
              @page {
                size: 80mm auto;
                margin: 0 !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 80mm !important;
                background: #fff !important;
              }
              body * { visibility: hidden !important; }
              #ticket-print, #ticket-print * { visibility: visible !important; }
              #ticket-print {
                position: fixed;
                top: 0;
                left: 0;
                width: 80mm;
                margin: 0;
                padding: 3mm;
                font-family: "Courier New", Courier, monospace;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          `}</style>
        </>
      ) : null}
    </div>
  );
}
