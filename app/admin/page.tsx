"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import { getCookingLabelFr, normalizeCookingKey } from "../lib/ui-translations";
import { Check, Euro, X } from "lucide-react";

export const dynamic = "force-dynamic";

const MAX_TOTAL_TABLES = 200;
const COOKING_CHOICES = ["Bleu", "Saignant", "À point", "Bien cuit"];

function toCookingKeyFromLabel(label: string) {
  const normalized = String(label || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (normalized === "bleu") return "rare";
  if (normalized === "saignant") return "medium_rare";
  if (normalized === "a point" || normalized === "a point") return "medium";
  if (normalized === "bien cuit") return "well_done";
  return "";
}
const CLIENT_ORDERING_DISABLED_KEY = "menuqr_disable_client_ordering_tmp";

function readLocalClientOrderingDisabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CLIENT_ORDERING_DISABLED_KEY) === "1";
}

function resolveClientOrderingDisabled(row: Record<string, unknown>) {
  if (typeof row.is_active === "boolean") return !row.is_active;
  const status = String(row.status || "").trim().toLowerCase();
  if (status === "consultation" || status === "menu_only" || status === "disabled") return true;
  return readLocalClientOrderingDisabled();
}

function parseJsonObject(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return null;
}

function parsePriceNumber(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? Number(raw.toFixed(2)) : 0;
  const text = String(raw).trim();
  if (!text) return 0;
  const cleaned = text.replace(/\s+/g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return 0;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function resolveTotalTables(value: unknown): number | null {
  const readNumber = (entry: unknown): number | null => {
    const numeric = Number(entry);
    if (!Number.isFinite(numeric)) return null;
    const whole = Math.trunc(numeric);
    return whole > 0 ? whole : null;
  };

  const walk = (entry: unknown, depth = 0): number | null => {
    if (depth > 3 || entry == null) return null;
    const direct = readNumber(entry);
    if (direct != null) return direct;
    const source = parseJsonObject(entry);
    if (!source) return null;
    return (
      readNumber(source.table_count) ??
      walk(source.table_config, depth + 1) ??
      walk(source.settings, depth + 1) ??
      walk(source.marketing_options, depth + 1)
    );
  };

  const resolved = walk(value);
  if (resolved == null) return null;
  return Math.min(MAX_TOTAL_TABLES, Math.max(1, resolved));
}

const FAST_ORDER_I18N = {
  fr: {
    tableInvalid: "Numéro de table invalide.",
    addItem: "Ajoutez au moins un article.",
    noValidItem: "Aucun article valide à envoyer.",
    sendError: "Erreur lors de l'envoi.",
    sent: "Commande envoyée en cuisine.",
  },
  en: {
    tableInvalid: "Invalid table number.",
    addItem: "Add at least one item.",
    noValidItem: "No valid item to send.",
    sendError: "Error while sending the order.",
    sent: "Order sent to kitchen.",
  },
  es: {
    tableInvalid: "Número de mesa inválido.",
    addItem: "Añada al menos un artículo.",
    noValidItem: "Ningún artículo válido para enviar.",
    sendError: "Error al enviar el pedido.",
    sent: "Pedido enviado a cocina.",
  },
  de: {
    tableInvalid: "Ungültige Tischnummer.",
    addItem: "Fügen Sie mindestens einen Artikel hinzu.",
    noValidItem: "Kein gültiger Artikel zum Senden.",
    sendError: "Fehler beim Senden der Bestellung.",
    sent: "Bestellung an die Küche gesendet.",
  },
} as const;

type Item = {
  id?: string | number;
  dish_id?: string | number;
  name?: string;
  name_fr?: string;
  label?: string;
  product_name?: string;
  productName?: string;
  dish_name?: string;
  dishName?: string;
  product?: { name?: string; name_fr?: string; label?: string } | null;
  dish?: { name?: string; name_fr?: string } | null;
  quantity?: number;
  category?: string;
  categorie?: string;
  instructions?: string;
  price?: number;
  cooking?: string | null;
  cuisson?: string | null;
  side?: unknown;
  accompagnement?: unknown;
  accompagnements?: unknown;
  side_dish?: unknown;
  sideDish?: unknown;
  selected_options?: unknown;
  selected_option?: unknown;
  selected_option_id?: string | number | null;
  selected_option_name?: string | null;
  selected_option_price?: number | null;
  selectedOptions?: unknown;
  options?: unknown;
  supplement?: unknown;
  supplements?: unknown;
  selected_side_ids?: string[];
  selected_extra_ids?: string[];
  selected_extras?: Array<{ id: string; label_fr: string; price: number }>;
  selected_cooking_key?: string | null;
  selected_cooking_label_fr?: string | null;
  special_request?: string;
  selectedSides?: string[];
  selectedExtras?: Array<{ name: string; price: number }>;
  is_drink?: boolean;
  from_recommendation?: boolean;
  created_at?: string | null;
  added_at?: string | null;
  inserted_at?: string | null;
  updated_at?: string | null;
  timestamp?: string | null;
  status?: string | null;
};

type Order = {
  id: string;
  table_number: number;
  items: unknown;
  status: string;
  created_at: string;
  covers?: number | null;
  guest_count?: number | null;
  customer_count?: number | null;
};

type ServiceNotification = {
  id: string;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  status?: string | null;
  table_number?: string | number | null;
  restaurant_id?: string | number | null;
  created_at?: string | null;
};

type TableAssignment = {
  id?: number;
  table_number: number;
  pin_code?: string | null;
  covers?: number | null;
  guest_count?: number | null;
  customer_count?: number | null;
  status?: string | null;
  payment_status?: string | null;
  occupied?: boolean | null;
};

type CategoryItem = {
  id: string | number;
  name_fr?: string | null;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
  name?: string | null;
  label?: string | null;
  category?: string | null;
};

type DishItem = {
  id: string | number;
  name?: string | null;
  nom?: string | null;
  description?: string | null;
  description_fr?: string | null;
  description_en?: string | null;
  description_es?: string | null;
  description_de?: string | null;
  name_fr?: string | null;
  category_id?: string | number | null;
  category?: string | null;
  categorie?: string | null;
  price?: number | string | null;
  active?: boolean | null;
  has_sides?: boolean | null;
  max_options?: number | null;
  selected_sides?: unknown;
  sides?: unknown;
  ask_cooking?: boolean | null;
  extras?: unknown;
  supplement?: unknown;
  supplements?: unknown;
  options?: unknown;
  selected_options?: unknown;
  dish_options?: unknown;
};

type SideLibraryItem = {
  id: string | number;
  name_fr?: string | null;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
};

type ExtraChoice = {
  name: string;
  price: number;
};

type ProductOptionChoice = {
  id: string;
  name: string;
  price: number;
  required: boolean;
};

type FastOrderLine = {
  lineId: string;
  dishId: string;
  dishName: string;
  category: string;
  categoryId: string | number | null;
  quantity: number;
  unitPrice: number;
  selectedSides: string[];
  selectedExtras: ExtraChoice[];
  selectedProductOptionId: string | null;
  selectedProductOptionName: string | null;
  selectedProductOptionPrice: number;
  selectedCooking: string;
  specialRequest: string;
  isDrink: boolean;
};

const DISH_SELECT_BASE = "id,name,price,category_id,restaurant_id";
const DISH_SELECT_WITH_OPTIONS = `${DISH_SELECT_BASE},description,description_fr,description_en,description_es,description_de,ask_cooking,selected_sides,sides,has_sides,max_options,extras,supplement,supplements,options,selected_options`;

interface ParsedDishOptions {
  sideIds: Array<string | number>;
  extrasList: ExtraChoice[];
  askCooking: boolean;
}

function readBooleanFlag(raw: unknown, fallback = false): boolean {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw !== 0;
  if (typeof raw === "string") {
    const value = raw.trim().toLowerCase();
    if (["true", "1", "yes", "oui", "required", "obligatoire", "mandatory"].includes(value)) return true;
    if (["false", "0", "no", "non"].includes(value)) return false;
  }
  return fallback;
}

function normalizeProductOptionRows(rows: Array<Record<string, unknown>>): ProductOptionChoice[] {
  const seen = new Set<string>();
  return rows
    .map((row, index) => {
      const namesI18n = parseJsonObject(row.names_i18n);
      const label =
        String(row.name_fr || row.name || row.label_fr || row.label || namesI18n?.fr || "").trim() || "";
      if (!label) return null;
      const id = String(row.id || `option-${index}`).trim();
      const key = `${id}::${normalizeLookupText(label)}`;
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        id,
        name: label,
        price: parsePriceNumber(row.price_override ?? row.option_price ?? row.price ?? row.amount ?? 0),
        required: readBooleanFlag(
          row.is_required ??
            row.required ??
            row.mandatory ??
            row.is_mandatory ??
            row.obligatoire ??
            row.is_obligatoire,
          false
        ),
      } as ProductOptionChoice;
    })
    .filter(Boolean) as ProductOptionChoice[];
}

function parseItems(items: unknown): Item[] {
  if (Array.isArray(items)) return items as Item[];
  if (typeof items === "string") {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? (parsed as Item[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getCategory(item: Item) {
  return String(item?.category || item?.categorie || "").toLowerCase().trim();
}

function isDrink(item: Item) {
  if (item?.is_drink === true) return true;
  const c = getCategory(item);
  return c === "boisson" || c === "boissons" || c === "bar" || c === "drink" || c === "drinks";
}

function normalizePrepItemStatus(raw: unknown): "pending" | "preparing" | "ready" {
  const normalized = String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
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
}

function isItemServed(item: Item) {
  const record = item as unknown as Record<string, unknown>;
  const rawStatus =
    record.status ??
    record.item_status ??
    record.preparation_status ??
    record.prep_status ??
    record.state;
  const normalized = String(rawStatus || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return normalized === "served" || normalized === "servi" || normalized === "servie";
}

function getItemPrepStatus(item: Item): "pending" | "preparing" | "ready" {
  const record = item as unknown as Record<string, unknown>;
  const rawStatus =
    record.status ??
    record.item_status ??
    record.preparation_status ??
    record.prep_status ??
    record.state;
  return normalizePrepItemStatus(rawStatus);
}

function hasExplicitItemStatus(item: Item) {
  const record = item as unknown as Record<string, unknown>;
  const rawStatus =
    record.status ??
    record.item_status ??
    record.preparation_status ??
    record.prep_status ??
    record.state;
  return String(rawStatus || "").trim().length > 0;
}

function isItemReady(item: Item) {
  return getItemPrepStatus(item) === "ready" && !isItemServed(item);
}

function getItemStatusLabel(item: Item) {
  if (isItemServed(item)) return "SERVI";
  const status = getItemPrepStatus(item);
  if (status === "ready") return "PRÊT";
  if (status === "preparing") return "EN PRÉPARATION";
  return "EN ATTENTE";
}

function getItemStatusClass(item: Item) {
  if (isItemServed(item)) return "border-blue-700 bg-blue-600 text-white";
  const status = getItemPrepStatus(item);
  if (status === "ready") return "border-green-700 bg-green-600 text-white";
  if (status === "preparing") return "border-amber-700 bg-amber-500 text-black";
  return "border-gray-500 bg-white text-gray-800";
}

function summarizeItems(items: Item[]) {
  const total = items.length;
  const served = items.filter((item) => isItemServed(item)).length;
  const activeItems = items.filter((item) => !isItemServed(item));
  const ready = activeItems.filter((item) => isItemReady(item)).length;
  const preparing = activeItems.filter((item) => getItemPrepStatus(item) === "preparing").length;
  const pending = Math.max(0, activeItems.length - ready - preparing);
  return { total, ready, preparing, pending, served, active: activeItems.length };
}

function getOrderItemProgress(order: Order) {
  const items = parseItems(order.items);
  const activeItems = items.filter((item) => !isItemServed(item));
  const hasAnyItemStatus = activeItems.some((item) => hasExplicitItemStatus(item));
  const orderReadyLike = isReadyLikeOrderStatus(order.status);
  const readyItems =
    !hasAnyItemStatus && orderReadyLike
      ? [...activeItems]
      : activeItems.filter((item) => isItemReady(item));
  const pendingOrPreparingItems = activeItems.filter((item) => !readyItems.includes(item));
  const drinks = items.filter((item) => isDrink(item));
  const foods = items.filter((item) => !isDrink(item));
  const activeDrinks = activeItems.filter((item) => isDrink(item));
  const activeFoods = activeItems.filter((item) => !isDrink(item));
  return {
    items,
    activeItems,
    readyItems,
    pendingOrPreparingItems,
    drinks,
    foods,
    all: summarizeItems(items),
    drink: summarizeItems(activeDrinks),
    food: summarizeItems(activeFoods),
  };
}

function isReadyLikeOrderStatus(status: unknown) {
  const normalized = String(status || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return ["ready", "ready_bar", "pret", "prêt", "ready_to_serve"].includes(normalized);
}

function makeLineId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeLookupText(raw: unknown) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildStableExtraId(dishId: unknown, name: unknown, price: unknown, index = 0) {
  const dishKey = String(dishId || "").trim();
  const nameKey = normalizeLookupText(name || "");
  const safeAmount = parsePriceNumber(price).toFixed(2);
  return `extra:${dishKey}:${nameKey || "option"}:${safeAmount}:${index}`;
}

function parseDescriptionOptions(description?: string | null): ParsedDishOptions {
  const raw = String(description || "").trim();
  if (!raw) return { sideIds: [], extrasList: [], askCooking: false };

  const askCooking = /__ASK_COOKING__:\s*true/i.test(raw);
  const sidesMatch = raw.match(/__SIDE_IDS__:\s*([^\n\r]+)/);
  const sideIds = sidesMatch
    ? sidesMatch[1]
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    : [];

  const extrasMatch = raw.match(/__EXTRAS_I18N__:\s*([^\n\r]+)/) || raw.match(/__EXTRAS__:\s*([^\n\r]+)/);
  const extrasList = extrasMatch
    ? extrasMatch[1]
        .split("|")
        .map((item) => {
          const [namePart, pricePart] = item.split("=");
          const nameFr = String(namePart || "")
            .split("~")[0]
            .trim();
          let decodedName = nameFr;
          try {
            decodedName = decodeURIComponent(nameFr);
          } catch {
            decodedName = nameFr;
          }
          const price = Number.parseFloat(String(pricePart || "0").replace(",", "."));
          return { name: decodedName || "Supplément", price: Number.isFinite(price) ? Number(price.toFixed(2)) : 0 };
        })
        .filter((extra) => extra.name.trim().length > 0)
    : [];

  return { sideIds, extrasList, askCooking };
}

function AdminContent() {
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
  const scopedRestaurantIdFromPath = decodeAndTrim(params?.id || params?.restaurant_id || "");
  const scopedRestaurantIdFromQuery = decodeAndTrim(searchParams.get("restaurant_id") || "");
  const scopedRestaurantId = String(scopedRestaurantIdFromPath || scopedRestaurantIdFromQuery || "").trim();
  const [orders, setOrders] = useState<Order[]>([]);
  const [serviceNotifications, setServiceNotifications] = useState<ServiceNotification[]>([]);
  const [activeTables, setActiveTables] = useState<TableAssignment[]>([]);
  const [activeDishNames, setActiveDishNames] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"orders" | "sessions" | "new-order">("orders");

  const [tableNumberInput, setTableNumberInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [coversInput, setCoversInput] = useState("1");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [disableClientOrderingEnabled, setDisableClientOrderingEnabled] = useState(false);
  const [totalTables, setTotalTables] = useState(0);
  const [restaurantSettingsError, setRestaurantSettingsError] = useState("");
  const [restaurantId, setRestaurantId] = useState<string | number | null>(null);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [dishes, setDishes] = useState<DishItem[]>([]);
  const [sidesLibrary, setSidesLibrary] = useState<SideLibraryItem[]>([]);
  const [dishIdsWithLinkedExtras, setDishIdsWithLinkedExtras] = useState<Set<string>>(new Set());
  const [tableNumbers, setTableNumbers] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedFastTableNumber, setSelectedFastTableNumber] = useState("");
  const [fastCoversInput, setFastCoversInput] = useState("1");
  const [fastQtyByDish, setFastQtyByDish] = useState<Record<string, number>>({});
  const [baseLineComments, setBaseLineComments] = useState<Record<string, string>>({});
  const [fastOptionLines, setFastOptionLines] = useState<FastOrderLine[]>([]);
  const [fastLoading, setFastLoading] = useState(false);
  const [fastMessage, setFastMessage] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDish, setModalDish] = useState<DishItem | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [modalSideChoices, setModalSideChoices] = useState<string[]>([]);
  const [modalSelectedSides, setModalSelectedSides] = useState<string[]>([]);
  const [modalProductOptions, setModalProductOptions] = useState<ProductOptionChoice[]>([]);
  const [modalSelectedProductOptionId, setModalSelectedProductOptionId] = useState("");
  const [modalExtraChoices, setModalExtraChoices] = useState<ExtraChoice[]>([]);
  const [modalSelectedExtras, setModalSelectedExtras] = useState<ExtraChoice[]>([]);
  const [modalCooking, setModalCooking] = useState("");
  const [modalKitchenComment, setModalKitchenComment] = useState("");
  const [readyAlertOrderIds, setReadyAlertOrderIds] = useState<Record<string, boolean>>({});
  const [hasReadyTabAlert, setHasReadyTabAlert] = useState(false);
  const [waitClockMs, setWaitClockMs] = useState(() => Date.now());
  const fastEntryInitializedRef = useRef(false);
  const selectedCategoryInitializedRef = useRef(false);
  const readyAlertTimeoutsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const id = window.setInterval(() => {
      setWaitClockMs(Date.now());
    }, 30000);
    return () => window.clearInterval(id);
  }, []);

  const playReadyNotificationBeep = () => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx =
        (window as typeof window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.2);
      window.setTimeout(() => void ctx.close().catch(() => undefined), 300);
    } catch (error) {
      console.warn("Beep notification impossible:", error);
    }
  };

  const triggerReadyOrderAlert = (orderId: string, playSound = true) => {
    const key = String(orderId || "").trim();
    if (!key) return;
    setReadyAlertOrderIds((prev) => ({ ...prev, [key]: true }));
    const existing = readyAlertTimeoutsRef.current[key];
    if (existing) window.clearTimeout(existing);
    readyAlertTimeoutsRef.current[key] = window.setTimeout(() => {
      setReadyAlertOrderIds((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      delete readyAlertTimeoutsRef.current[key];
    }, 8000);
    setHasReadyTabAlert(true);
    if (playSound) playReadyNotificationBeep();
  };

  const applyDisableClientOrdering = (enabled: boolean) => {
    setDisableClientOrderingEnabled(enabled);
    setActiveTab((current) => {
      if (current === "new-order") return "new-order";
      return current;
    });
  };

  const showNewOrderTab = true;
  const adminUiLang = useMemo<"fr" | "en" | "es" | "de">(() => {
    if (typeof window === "undefined") return "fr";
    const lang = String(window.navigator.language || "").toLowerCase();
    if (lang.startsWith("de")) return "de";
    if (lang.startsWith("es")) return "es";
    if (lang.startsWith("en")) return "en";
    return "fr";
  }, []);
  const fastOrderText = FAST_ORDER_I18N[adminUiLang];

  const toErrorInfo = (error: unknown) => {
    if (!error || typeof error !== "object") {
      return { code: null, status: null, message: String(error || "unknown"), details: null, hint: null };
    }
    const raw = error as Record<string, unknown>;
    return {
      code: raw.code ?? null,
      status: raw.status ?? null,
      message: raw.message ?? null,
      details: raw.details ?? null,
      hint: raw.hint ?? null,
    };
  };

  const hasUsefulError = (info: ReturnType<typeof toErrorInfo>) =>
    ["code", "status", "message", "details", "hint"].some((key) => {
      const value = info[key as keyof typeof info];
      if (value == null) return false;
      const text = String(value).trim().toLowerCase();
      return text !== "" && text !== "{}" && text !== "unknown" && text !== "null" && text !== "[object object]";
    });

  const logFetchOrdersError = (label: string, error: unknown) => {
    console.error("DEBUG_SQL_TOTAL:", error);
    console.error(label, error);
  };

  const fetchOrders = async () => {
    try {
      const currentRestaurantId = String(restaurantId || scopedRestaurantId || "").trim();
      console.log("ID utilisé:", currentRestaurantId, "[admin.fetchOrders]");
      console.log("ID Resto Admin:", currentRestaurantId);
      if (!currentRestaurantId) {
        setOrders([]);
        return;
      }

      let scopedQuery = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", currentRestaurantId)
        .order("created_at", { ascending: true });
      if (scopedQuery.error && currentRestaurantId && String((scopedQuery.error as { code?: string }).code || "") === "42703") {
        scopedQuery = await supabase
          .from("orders")
          .select("*")
          .eq("id_restaurant", currentRestaurantId)
          .order("created_at", { ascending: true });
      }

      if (scopedQuery.error) {
        logFetchOrdersError("Erreur fetchOrders:", scopedQuery.error);
        return;
      }

      const data = (scopedQuery.data || []) as Order[];
      const activeRows = data.filter((order) => {
        const status = String(order.status || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();
        const isPaid = status === "paid" || status === "paye" || status === "payee";
        return !isPaid && !["archived", "archive", "archivee"].includes(status);
      });

      setOrders(activeRows);
    } catch (error) {
      logFetchOrdersError("Erreur fetchOrders inattendue:", error);
    }
  };

  const fetchNotifications = async (
    restaurantScope: string | number | null = restaurantId || scopedRestaurantId || null
  ) => {
    const currentRestaurantId = String(restaurantScope ?? "").trim();
    console.log("ID utilisé:", currentRestaurantId, "[admin.fetchNotifications]");
    if (!currentRestaurantId) {
      setServiceNotifications([]);
      return;
    }
    const query = supabase
      .from("notifications")
      .select("*")
      .eq("restaurant_id", currentRestaurantId)
      .order("created_at", { ascending: false })
      .limit(50);
    let { data, error } = await query;
    if (error && currentRestaurantId && String((error as { code?: string }).code || "") === "42703") {
      const fallback = await supabase
        .from("notifications")
        .select("*")
        .eq("id_restaurant", currentRestaurantId)
        .order("created_at", { ascending: false })
        .limit(50);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      const errMsg = String((error as { message?: string } | null)?.message || "").toLowerCase();
      if (!errMsg.includes("does not exist")) {
        console.warn("Notifications admin indisponibles:", error);
      }
      setServiceNotifications([]);
      return;
    }

    const rows = ((data || []) as Array<Record<string, unknown>>)
      .filter((row) => {
        const status = String(row.status || "").trim().toLowerCase();
        if (status && status !== "pending") return false;
        return true;
      })
      .map((row) => normalizeNotificationRow(row)) as ServiceNotification[];

    setServiceNotifications(rows);
  };

  const normalizeNotificationRow = (row: Record<string, unknown>): ServiceNotification => ({
    id: String(row.id || ""),
    type: row.type != null ? String(row.type) : null,
    title: row.title != null ? String(row.title) : null,
    message: row.message != null ? String(row.message) : null,
    status: row.status != null ? String(row.status) : null,
    table_number: row.table_number != null ? String(row.table_number) : null,
    restaurant_id: row.restaurant_id != null ? String(row.restaurant_id) : null,
    created_at: row.created_at != null ? String(row.created_at) : null,
  });

  const fetchActiveTables = async (
    restaurantScope: string | number | null = restaurantId || scopedRestaurantId || null
  ) => {
    const currentRestaurantId = String(restaurantScope ?? "").trim();
    console.log("ID utilisé:", currentRestaurantId, "[admin.fetchActiveTables]");
    if (!currentRestaurantId) {
      setActiveTables([]);
      return;
    }
    let { data, error } = await supabase
      .from("table_assignments")
      .select("*")
      .eq("restaurant_id", currentRestaurantId)
      .order("table_number", { ascending: true });
    if (error && currentRestaurantId) {
      const idRestaurantFallback = await supabase
        .from("table_assignments")
        .select("*")
        .eq("id_restaurant", currentRestaurantId)
        .order("table_number", { ascending: true });
      if (!idRestaurantFallback.error) {
        data = idRestaurantFallback.data;
        error = null;
      }
    }
    if (error) {
      console.error("Erreur fetchActiveTables:", error);
      setActiveTables([]);
      return;
    }

    setActiveTables((data || []) as TableAssignment[]);
  };

  const normalizeCoversValue = (value: unknown): number | null => {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const whole = Math.trunc(n);
    return whole > 0 ? whole : null;
  };

  const readCoversFromRow = (row: Record<string, unknown> | null | undefined): number | null => {
    if (!row) return null;
    return (
      normalizeCoversValue(row.covers) ??
      normalizeCoversValue(row.guest_count) ??
      normalizeCoversValue(row.customer_count) ??
      null
    );
  };

  const tableCoversByNumber = useMemo(() => {
    const map = new Map<number, number>();
    activeTables.forEach((row) => {
      const tableNum = Number(row.table_number);
      const covers = readCoversFromRow(row as unknown as Record<string, unknown>);
      if (Number.isFinite(tableNum) && tableNum > 0 && covers) map.set(tableNum, covers);
    });
    return map;
  }, [activeTables]);

  const fetchActiveDishes = async (
    restaurantScope: string | number | null = restaurantId || scopedRestaurantId || null
  ) => {
    const currentRestaurantId = String(restaurantScope ?? "").trim();
    console.log("ID utilisé:", currentRestaurantId, "[admin.fetchActiveDishes]");
    if (!currentRestaurantId) {
      setActiveDishNames(new Set());
      return;
    }
    let { data, error } = await supabase
      .from("dishes")
      .select("name")
      .eq("active", true)
      .eq("restaurant_id", currentRestaurantId);
    if (error && currentRestaurantId && String((error as { code?: string }).code || "") === "42703") {
      const idRestaurantFallback = await supabase
        .from("dishes")
        .select("name")
        .eq("id_restaurant", currentRestaurantId)
        .eq("active", true);
      if (!idRestaurantFallback.error) {
        data = idRestaurantFallback.data;
        error = null;
      }
    }
    if (error) {
      setActiveDishNames(new Set());
      return;
    }
    const names = new Set<string>(
      (data || [])
        .map((dish) => String((dish as { name?: unknown })?.name || "").trim().toLowerCase())
        .filter(Boolean)
    );
    setActiveDishNames(names);
  };

  const fetchRestaurantSettings = async () => {
    try {
      const targetRestaurantId = String(scopedRestaurantId || "").trim();
      console.log("ID utilisé:", targetRestaurantId, "[admin.fetchRestaurantSettings]");
      if (!targetRestaurantId) {
        setSettings(null);
        setTotalTables(0);
        setRestaurantId(null);
        setRestaurantSettingsError("ID restaurant manquant dans l'URL.");
        return;
      }
      const restaurantByIdQuery = await supabase.from("restaurants").select("*").eq("id", targetRestaurantId).maybeSingle();
      const restaurantRow = (!restaurantByIdQuery.error && restaurantByIdQuery.data
        ? (restaurantByIdQuery.data as Record<string, unknown>)
        : null) as Record<string, unknown> | null;

      if (restaurantRow) {
        const showOrderTab = resolveClientOrderingDisabled(restaurantRow);
        const nextSettings = { ...restaurantRow };
        setSettings(nextSettings);
        setTotalTables(resolveTotalTables(restaurantRow) || 0);
        setRestaurantId(String((restaurantRow.id as string | number | undefined) || targetRestaurantId));
        setRestaurantSettingsError("");
        applyDisableClientOrdering(showOrderTab);
        console.log("RESTAURANT SETTINGS RÉCUPÉRÉS :", nextSettings);
      } else {
        const message =
          (restaurantByIdQuery.error as { message?: string } | null)?.message ||
          "Configuration restaurants introuvable pour cet ID.";
        console.error("Erreur fetch restaurants (admin):", message);
        setSettings(null);
        setTotalTables(0);
        setRestaurantId(targetRestaurantId || null);
        setRestaurantSettingsError(message);
      }
    } catch (error) {
      console.error("DEBUG_SQL_TOTAL:", error);
      const message = "Impossible de contacter restaurants.";
      console.error("fetchRestaurantSettings restaurants échoue:", message);
      setSettings(null);
      setTotalTables(0);
      setRestaurantId(null);
      setRestaurantSettingsError(message);
    }
  };

  const activeTableByNumber = useMemo(() => {
    const map = new Map<number, TableAssignment>();
    activeTables.forEach((row) => {
      const tableNumber = Number(row.table_number);
      if (!Number.isFinite(tableNumber)) return;
      map.set(tableNumber, row);
    });
    return map;
  }, [activeTables]);
  const configuredTotalTables = useMemo(() => {
    const fromSettings = resolveTotalTables(settings?.table_count ?? settings);
    if (fromSettings != null) return fromSettings;
    return totalTables > 0 ? totalTables : 0;
  }, [settings, totalTables]);

  const isActiveTableSession = (row: TableAssignment | null | undefined) => {
    if (!row) return false;
    const pin = String(row.pin_code || "").trim();
    const status = String(row.status || "").toLowerCase().trim();
    const paymentStatus = String(row.payment_status || "").toLowerCase().trim();
    const occupiedFlag = row.occupied;
    if (occupiedFlag === false) return false;
    if (status && ["free", "libre", "available", "disponible", "closed", "paid", "archived"].includes(status)) return false;
    if (paymentStatus && ["paid", "paye", "payee"].includes(paymentStatus)) return false;
    if (!pin || pin === "0000") return false;
    return true;
  };

  const tableSlots = useMemo(
    () =>
      Array.from({ length: configuredTotalTables }, (_, index) => index + 1).map((tableNumber) => {
        const row = activeTableByNumber.get(tableNumber);
        return {
          tableNumber,
          isOccupied: isActiveTableSession(row),
          row: row || null,
        };
      }),
    [activeTableByNumber, configuredTotalTables]
  );

  const categoryById = useMemo(() => {
    const map = new Map<string, CategoryItem>();
    categories.forEach((category) => map.set(String(category.id || "").trim(), category));
    return map;
  }, [categories]);

  const categoryByNormalizedLabel = useMemo(() => {
    const map = new Map<string, CategoryItem>();
    categories.forEach((category) => {
      const key = normalizeCategoryKey(
        String(category.name_fr || category.name || category.label || category.category || "").trim()
      );
      if (key && !map.has(key)) map.set(key, category);
    });
    return map;
  }, [categories]);

  const sideIdByAlias = useMemo(() => {
    const map = new Map<string, string>();
    sidesLibrary.forEach((side) => {
      const row = side as unknown as Record<string, unknown>;
      const sideId = String(side.id || "").trim();
      if (!sideId) return;

      const candidateLabels = [
        row.name_fr,
        row.name_en,
        row.name_es,
        row.name_de,
        row.name,
        row.label,
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean);

      const translationsNode = parseJsonObject(row.translations);
      if (translationsNode) {
        Object.values(translationsNode).forEach((value) => {
          const label = String(value || "").trim();
          if (label) candidateLabels.push(label);
        });
      }

      candidateLabels.forEach((label) => {
        const key = normalizeLookupText(label);
        if (!key) return;
        if (!map.has(key)) map.set(key, sideId);
      });
    });
    return map;
  }, [sidesLibrary]);

  const getCategoryLabel = (category: CategoryItem) => {
    return (
      String(category.name_fr || "").trim() ||
      String(category.name || "").trim() ||
      String(category.label || "").trim() ||
      String(category.category || "").trim() ||
      String(category.name_en || "").trim() ||
      String(category.name_es || "").trim() ||
      String(category.name_de || "").trim() ||
      `Catégorie ${category.id}`
    );
  };

  const getDishName = (dish: DishItem) => {
    return String(dish.name || "").trim() || "[Plat sans nom]";
  };

  const getDishPrice = (dish: DishItem) => {
    return parsePriceNumber(dish.price);
  };

  const getDishRawDescription = (dish: DishItem) =>
    String(dish.description_fr || dish.description || dish.description_en || dish.description_es || dish.description_de || "").trim();

  const getDishOptionsSource = (dish: DishItem) => {
    const values = [
      dish.description_fr,
      dish.description,
      dish.description_en,
      dish.description_es,
      dish.description_de,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    return [...new Set(values)].join("\n");
  };

  const getDishCleanDescription = (dish: DishItem) => getDishRawDescription(dish).split("__")[0]?.trim() || "";

  const getDishCategoryLabel = (dish: DishItem) => {
    const fromId = dish.category_id != null ? categoryById.get(String(dish.category_id || "").trim()) : undefined;
    if (fromId) return getCategoryLabel(fromId);
    const fallbackText = String(dish.category || dish.categorie || "").trim();
    if (fallbackText) {
      const fromLabel = categoryByNormalizedLabel.get(normalizeCategoryKey(fallbackText));
      if (fromLabel) return getCategoryLabel(fromLabel);
      return fallbackText;
    }
    if (dish.category_id != null) return `Catégorie ${dish.category_id}`;
    return "Autres";
  };
  function normalizeCategoryKey(value: unknown) {
    const normalized = String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    if (normalized.length > 3 && normalized.endsWith("s")) {
      return normalized.slice(0, -1);
    }
    return normalized;
  }

  const parseDishExtras = (dish: DishItem): ExtraChoice[] => {
    const fromDescription = parseDescriptionOptions(getDishOptionsSource(dish)).extrasList;
    if (fromDescription.length > 0) return fromDescription;

    const normalizeArray = (raw: unknown) => {
      if (!Array.isArray(raw)) return [] as ExtraChoice[];
      return raw
        .map((entry) => {
          if (typeof entry === "string") {
            const cleaned = entry.trim();
            if (!cleaned) return null;
            const [namePart, pricePart] = cleaned.split("=").map((part) => part.trim());
            const fallbackPrice = parsePriceNumber(pricePart || "0");
            return { name: namePart || cleaned, price: fallbackPrice };
          }
          if (!entry || typeof entry !== "object") return null;
          const row = entry as Record<string, unknown>;
          const name = String(row.name_fr || row.name || "").trim();
          if (!name) return null;
          const price = parsePriceNumber(row.price);
          return { name, price };
        })
        .filter(Boolean) as ExtraChoice[];
    };
    const normalizeObject = (raw: unknown) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [] as ExtraChoice[];
      const source = raw as Record<string, unknown>;
      return Object.entries(source)
        .map(([name, value]) => {
          const label = String(name || "").trim();
          if (!label) return null;
          const amount = parsePriceNumber(value);
          return { name: label, price: amount };
        })
        .filter(Boolean) as ExtraChoice[];
    };

    const parseExtraSource = (raw: unknown): ExtraChoice[] => {
      const directArray = normalizeArray(raw);
      if (directArray.length > 0) return directArray;
      const directObject = normalizeObject(raw);
      if (directObject.length > 0) return directObject;

      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          const arrayParsed = normalizeArray(parsed);
          if (arrayParsed.length > 0) return arrayParsed;
          const objectParsed = normalizeObject(parsed);
          if (objectParsed.length > 0) return objectParsed;
          const parsedObject = parseJsonObject(parsed);
          if (parsedObject) {
            for (const nestedCandidate of [parsedObject.extras, parsedObject.supplements, parsedObject.options]) {
              const nested = normalizeArray(nestedCandidate);
              if (nested.length > 0) return nested;
            }
          }
        } catch {
          return raw
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean)
            .map((name) => ({ name, price: 0 }));
        }
      }

      const rawObject = parseJsonObject(raw);
      if (rawObject) {
        const nestedCandidates = [rawObject.extras, rawObject.supplements, rawObject.supplement, rawObject.options];
        for (const candidate of nestedCandidates) {
          const nestedArray = normalizeArray(candidate);
          if (nestedArray.length > 0) return nestedArray;
          const nestedObject = normalizeObject(candidate);
          if (nestedObject.length > 0) return nestedObject;
        }
      }

      return [];
    };

    const extraCandidates = [dish.extras, dish.supplements, dish.supplement, dish.options, dish.selected_options];
    for (const candidate of extraCandidates) {
      const parsed = parseExtraSource(candidate);
      if (parsed.length > 0) return parsed;
    }

    return parseDescriptionOptions(getDishOptionsSource(dish)).extrasList;
  };

  const parseSideSource = (raw: unknown): Array<string | number> => {
    if (Array.isArray(raw)) {
      return raw
        .map((entry) => {
          if (typeof entry === "string" || typeof entry === "number") return entry;
          if (!entry || typeof entry !== "object") return null;
          const row = entry as Record<string, unknown>;
          return (
            row.id ??
            row.side_id ??
            row.value ??
            row.name_fr ??
            row.name ??
            row.label ??
            null
          );
        })
        .filter((value): value is string | number => value != null && String(value).trim() !== "");
    }

    if (raw && typeof raw === "object") {
      const source = raw as Record<string, unknown>;
      if (Array.isArray(source.sides)) return parseSideSource(source.sides);
      if (Array.isArray(source.options)) return parseSideSource(source.options);
      if (Array.isArray(source.items)) return parseSideSource(source.items);
      return Object.entries(source)
        .map(([key, value]) => {
          const label = String(key || "").trim();
          if (!label) return null;
          if (value == null || value === false) return null;
          return label;
        })
        .filter((value): value is string => value != null && value.trim() !== "");
    }

    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parseSideSource(parsed);
      } catch {
        return trimmed
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
      }
    }

    return [];
  };

  const parseDishSideIds = (dish: DishItem): Array<string | number> => {
    const fromDescription = parseDescriptionOptions(getDishOptionsSource(dish)).sideIds;
    if (fromDescription.length > 0) return fromDescription;

    const selectedSides = parseSideSource(dish.selected_sides);
    if (selectedSides.length > 0) return selectedSides;
    const sides = parseSideSource(dish.sides);
    if (sides.length > 0) return sides;
    return parseDescriptionOptions(getDishOptionsSource(dish)).sideIds;
  };

  const dishNeedsCooking = (dish: DishItem) => parseDescriptionOptions(getDishOptionsSource(dish)).askCooking;

  const parseDishProductOptions = (dish: DishItem): ProductOptionChoice[] => {
    const record = dish as unknown as Record<string, unknown>;
    const directCandidates: unknown[] = [record.product_options, record.productOptions, record.variants];
    for (const candidate of directCandidates) {
      if (!candidate) continue;
      if (Array.isArray(candidate)) {
        const normalized = normalizeProductOptionRows(candidate as Array<Record<string, unknown>>);
        if (normalized.length > 0) return normalized;
        continue;
      }
      if (typeof candidate === "string") {
        try {
          const parsed = JSON.parse(candidate);
          if (Array.isArray(parsed)) {
            const normalized = normalizeProductOptionRows(parsed as Array<Record<string, unknown>>);
            if (normalized.length > 0) return normalized;
          }
        } catch {
          // ignore parse errors and try next source
        }
      }
    }
    const looseOptions = record.options;
    if (Array.isArray(looseOptions)) {
      const variantLikeRows = (looseOptions as Array<Record<string, unknown>>).filter((row) =>
        Boolean(row && typeof row === "object" && (row.price_override != null || row.is_required != null || row.required != null))
      );
      if (variantLikeRows.length > 0) {
        return normalizeProductOptionRows(variantLikeRows);
      }
    }
    return [];
  };

  const isSideSelectionRequired = (dish: DishItem, choices: string[]) => {
    if (choices.length === 0) return false;
    const row = dish as unknown as Record<string, unknown>;
    const explicit = row.side_required ?? row.sides_required ?? row.is_side_required ?? row.requires_side ?? row.required_side;
    if (explicit != null) return readBooleanFlag(explicit, false);
    if (row.has_sides != null) return readBooleanFlag(row.has_sides, false);
    const maxOptions = Number(row.max_options ?? 0);
    return Number.isFinite(maxOptions) && maxOptions > 0;
  };

  const getSideMaxSelections = (dish: DishItem, choices: string[]) => {
    if (choices.length === 0) return 0;
    const row = dish as unknown as Record<string, unknown>;
    const raw = Number(row.max_options ?? 1);
    if (!Number.isFinite(raw) || raw <= 0) return 1;
    return Math.max(1, Math.min(choices.length, Math.trunc(raw)));
  };

  const isProductOptionSelectionRequired = (dish: DishItem, options: ProductOptionChoice[]) => {
    if (options.length === 0) return false;
    const row = dish as unknown as Record<string, unknown>;
    const explicit =
      row.option_required ??
      row.options_required ??
      row.is_option_required ??
      row.requires_option ??
      row.required_option;
    if (explicit != null) return readBooleanFlag(explicit, false);
    return options.some((option) => option.required);
  };

  const loadDishProductOptionsFromDatabase = async (dishId: string | number): Promise<ProductOptionChoice[]> => {
    const normalizedDishId = String(dishId || "").trim();
    if (!normalizedDishId) return [];
    const queryByColumn = async (column: "product_id" | "dish_id") =>
      supabase
        .from("product_options")
        .select("*")
        .eq(column, normalizedDishId);

    const first = await queryByColumn("product_id");
    if (!first.error && Array.isArray(first.data) && first.data.length > 0) {
      return normalizeProductOptionRows(first.data as Array<Record<string, unknown>>);
    }

    const firstMissingColumn = String((first.error as { code?: string } | null)?.code || "") === "42703";
    if (first.error && !firstMissingColumn) return [];

    const second = await queryByColumn("dish_id");
    if (second.error || !Array.isArray(second.data)) return [];
    return normalizeProductOptionRows(second.data as Array<Record<string, unknown>>);
  };

  const parseExtraChoicesFromRows = (rows: Array<Record<string, unknown>>) => {
    const parsed = rows
      .map((row) => {
        const name = String(
          row.name_fr ||
            row.name ||
            row.label_fr ||
            row.label ||
            row.option_name ||
            row.supplement_name ||
            row.extra_name ||
            row.title ||
            ""
        ).trim();
        if (!name) return null;
        const price = parsePriceNumber(
          row.price ??
            row.option_price ??
            row.supplement_price ??
            row.extra_price ??
            row.amount ??
            row.value ??
            0
        );
        return { name, price } as ExtraChoice;
      })
      .filter(Boolean) as ExtraChoice[];

    const deduped = new Map<string, ExtraChoice>();
    parsed.forEach((extra) => {
      const key = `${normalizeLookupText(extra.name)}:${parsePriceNumber(extra.price).toFixed(2)}`;
      if (!deduped.has(key)) deduped.set(key, extra);
    });
    return [...deduped.values()];
  };

  const loadDishExtrasFromRelations = async (dishId: string | number): Promise<ExtraChoice[]> => {
    const directDishOptionsQuery = await supabase
      .from("dish_options")
      .select("id,dish_id,name,price")
      .eq("dish_id", dishId);
    if (!directDishOptionsQuery.error && Array.isArray(directDishOptionsQuery.data) && directDishOptionsQuery.data.length > 0) {
      const directDishOptions = parseExtraChoicesFromRows(directDishOptionsQuery.data as Array<Record<string, unknown>>);
      if (directDishOptions.length > 0) return directDishOptions;
    }

    const relationTables = ["dish_options", "dish_extras", "dish_supplements"];
    const libraryTables = ["options_library", "extras_library", "supplements_library"];

    for (const relationTable of relationTables) {
      const relationQuery = await supabase.from(relationTable).select("*").eq("dish_id", dishId);
      if (relationQuery.error || !Array.isArray(relationQuery.data) || relationQuery.data.length === 0) continue;

      const relationRows = relationQuery.data as Array<Record<string, unknown>>;
      const directExtras = parseExtraChoicesFromRows(relationRows);
      if (directExtras.length > 0) return directExtras;

      const linkIds = Array.from(
        new Set(
          relationRows
            .flatMap((row) => [row.option_id, row.extra_id, row.supplement_id, row.linked_id])
            .map((value) => String(value || "").trim())
            .filter(Boolean)
        )
      );
      if (linkIds.length === 0) continue;

      for (const libraryTable of libraryTables) {
        const libraryQuery = await supabase.from(libraryTable).select("*").in("id", linkIds);
        if (libraryQuery.error || !Array.isArray(libraryQuery.data) || libraryQuery.data.length === 0) continue;
        const libRows = libraryQuery.data as Array<Record<string, unknown>>;
        const byId = new Map<string, Record<string, unknown>>();
        libRows.forEach((row) => {
          const key = String(row.id || "").trim();
          if (key) byId.set(key, row);
        });

        const mergedRows = relationRows.map((row) => {
          const linkedId = String(row.option_id || row.extra_id || row.supplement_id || row.linked_id || "").trim();
          if (!linkedId) return row;
          const lib = byId.get(linkedId);
          return lib ? { ...lib, ...row } : row;
        });
        const mergedExtras = parseExtraChoicesFromRows(mergedRows);
        if (mergedExtras.length > 0) return mergedExtras;
      }
    }

    return [];
  };

  const buildLineInstructions = (line: FastOrderLine) => {
    const detailParts: string[] = [];
    if (line.selectedProductOptionName) {
      const optionPrice = parsePriceNumber(line.selectedProductOptionPrice);
      detailParts.push(
        optionPrice > 0
          ? `Option: ${line.selectedProductOptionName} (+${optionPrice.toFixed(2)}\u20AC)`
          : `Option: ${line.selectedProductOptionName}`
      );
    }
    if (line.selectedSides.length > 0) {
      detailParts.push(`Accompagnements: ${line.selectedSides.join(", ")}`);
    }
    if (line.selectedExtras.length > 0) {
      detailParts.push(
        `Suppléments: ${line.selectedExtras
          .map((extra) => {
            const amount = parsePriceNumber(extra.price);
            return amount > 0 ? `${extra.name} (+${amount.toFixed(2)}\u20AC)` : `${extra.name}`;
          })
          .join(", ")}`
      );
    }
    if (line.selectedCooking.trim()) detailParts.push(`Cuisson: ${line.selectedCooking.trim()}`);
    if (line.specialRequest.trim()) detailParts.push(`Remarque: ${line.specialRequest.trim()}`);
    return detailParts.length > 0 ? `Détails: ${detailParts.join(" | ")}` : "";
  };

  const fetchFastEntryResources = async (
    restaurantScope: string | number | null = restaurantId || scopedRestaurantId || null
  ) => {
    const currentRestaurantId = String(restaurantScope ?? "").trim();
    console.log("ID utilisé:", currentRestaurantId, "[admin.fetchFastEntryResources]");
    if (!currentRestaurantId) {
      setCategories([]);
      setDishes([]);
      setSidesLibrary([]);
      setTableNumbers([]);
      return;
    }
    const categoriesBaseQuery = supabase.from("categories").select("*").order("id", { ascending: true });
    const dishesBaseQuery = supabase.from("dishes").select(DISH_SELECT_WITH_OPTIONS).order("id", { ascending: true });
    const sidesBaseQuery = supabase.from("sides_library").select("*").order("id", { ascending: true });
    const tablesBaseQuery = supabase.from("table_assignments").select("table_number").order("table_number", { ascending: true });

    const relationExtraTables = ["dish_options", "dish_extras", "dish_supplements"] as const;
    const queryResults = await Promise.all([
      categoriesBaseQuery.eq("restaurant_id", currentRestaurantId),
      dishesBaseQuery.eq("restaurant_id", currentRestaurantId),
      sidesBaseQuery.eq("restaurant_id", currentRestaurantId),
      tablesBaseQuery.eq("restaurant_id", currentRestaurantId),
    ]);
    let [categoriesQuery, primaryDishesQuery, sidesQuery, tablesQuery] = queryResults;

    if (currentRestaurantId) {
      const needsIdRestaurantFallback = (q: { error: unknown }) =>
        Boolean(q.error) && String(((q.error as { code?: string } | null)?.code || "")).trim() === "42703";

      if (needsIdRestaurantFallback(categoriesQuery)) {
        categoriesQuery = await categoriesBaseQuery.eq("id_restaurant", currentRestaurantId);
      }
      if (needsIdRestaurantFallback(primaryDishesQuery)) {
        primaryDishesQuery = await dishesBaseQuery.eq("id_restaurant", currentRestaurantId);
      }
      if (needsIdRestaurantFallback(sidesQuery)) {
        sidesQuery = await sidesBaseQuery.eq("id_restaurant", currentRestaurantId);
      }
      if (needsIdRestaurantFallback(tablesQuery)) {
        tablesQuery = await tablesBaseQuery.eq("id_restaurant", currentRestaurantId);
      }
    }

    const nextCategories = !categoriesQuery.error ? ((categoriesQuery.data || []) as CategoryItem[]) : [];
    let nextDishes = !primaryDishesQuery.error ? ((primaryDishesQuery.data || []) as DishItem[]) : [];
    let dishesError = primaryDishesQuery.error;

    if (dishesError && String((dishesError as { code?: string } | null)?.code || "") === "42703") {
      const minimalSelect = DISH_SELECT_BASE;
      let minimalQuery = await supabase
        .from("dishes")
        .select(minimalSelect)
        .eq("restaurant_id", currentRestaurantId)
        .order("id", { ascending: true });

      if (minimalQuery.error && String((minimalQuery.error as { code?: string } | null)?.code || "") === "42703") {
        minimalQuery = await supabase
          .from("dishes")
          .select(minimalSelect)
          .eq("id_restaurant", currentRestaurantId)
          .order("id", { ascending: true });
      }

      if (!minimalQuery.error) {
        nextDishes = (minimalQuery.data || []) as DishItem[];
        dishesError = null;
      }
    }

    if (!dishesError && currentRestaurantId && nextDishes.length === 0) {
      const idRestaurantRows = await dishesBaseQuery.eq("id_restaurant", currentRestaurantId);
      if (!idRestaurantRows.error) {
        nextDishes = (idRestaurantRows.data || []) as DishItem[];
        console.warn("[admin.fetchFastEntryResources] fallback id_restaurant used for dishes", {
          restaurantId: currentRestaurantId,
          rows: nextDishes.length,
        });
      }
    }

    let relationExtraQueries: Array<{ data: unknown[] | null; error: unknown }> = [];
    const scopedDishIds = nextDishes
      .map((row) => String((row as { id?: string | number | null })?.id ?? "").trim())
      .filter(Boolean);
    if (scopedDishIds.length > 0) {
      relationExtraQueries = await Promise.all(
        relationExtraTables.map(async (tableName) => {
          const selectClause = tableName === "dish_options" ? "id,dish_id,name,price" : "*";
          const result = await supabase.from(tableName).select(selectClause).in("dish_id", scopedDishIds).limit(5000);
          return {
            data: (result.data as unknown[] | null) ?? null,
            error: result.error,
          };
        })
      );
    }

    if (!categoriesQuery.error) setCategories(nextCategories);
    if (!dishesError) {
      const linkedOptionsByDishId = new Map<string, Array<Record<string, unknown>>>();
      relationExtraQueries.forEach((queryResult) => {
        if (queryResult.error || !Array.isArray(queryResult.data)) return;
        (queryResult.data as Array<Record<string, unknown>>).forEach((row) => {
          const dishId = String(row.dish_id || row.dishId || row.plat_id || row.item_id || "").trim();
          if (!dishId) return;
          const list = linkedOptionsByDishId.get(dishId) || [];
          list.push(row);
          linkedOptionsByDishId.set(dishId, list);
        });
      });

      nextDishes = nextDishes.map((dish) => {
        const fallbackCategory = dish.category_id != null ? `cat_${dish.category_id}` : "autres";
        const dishId = String(dish.id || "").trim();
        return {
          ...dish,
          category: String(dish.category || dish.categorie || fallbackCategory),
          categorie: String(dish.categorie || dish.category || fallbackCategory),
          dish_options: dishId ? linkedOptionsByDishId.get(dishId) || [] : [],
        };
      });
      setDishes(nextDishes);
      console.log("[admin.fetchFastEntryResources] dishes loaded", {
        restaurantId: currentRestaurantId,
        count: nextDishes.length,
        sample: nextDishes[0] || null,
      });
    } else {
      console.error("DEBUG_SQL_TOTAL:", dishesError);
      const message = (dishesError as { message?: string } | null)?.message || "Erreur fetch dishes (admin)";
      console.error("Erreur fetch dishes (admin):", message);
    }
    if (!sidesQuery.error) setSidesLibrary((sidesQuery.data || []) as SideLibraryItem[]);
    if (!tablesQuery.error) {
      const values = (tablesQuery.data || [])
        .map((entry) => Number((entry as { table_number?: unknown }).table_number))
        .filter((value) => Number.isFinite(value) && value > 0);
      const unique = Array.from(new Set(values)).sort((a, b) => a - b);
      setTableNumbers(unique);
      if (!fastEntryInitializedRef.current && unique[0]) {
        setSelectedFastTableNumber((current) => (current.trim() ? current : String(unique[0])));
      }
    }
    const linkedExtraDishIds = new Set<string>();
    relationExtraQueries.forEach((queryResult) => {
      if (queryResult.error || !Array.isArray(queryResult.data)) return;
      (queryResult.data as Array<Record<string, unknown>>).forEach((row) => {
        const dishId = String(row.dish_id || row.dishId || row.plat_id || row.item_id || "").trim();
        if (dishId) linkedExtraDishIds.add(dishId);
      });
    });
    setDishIdsWithLinkedExtras(linkedExtraDishIds);
    if (!selectedCategoryInitializedRef.current && !selectedCategory.trim()) {
      const firstCategory = nextCategories[0]
        ? normalizeCategoryKey(getCategoryLabel(nextCategories[0]))
        : "";
      const fallbackCategory = nextDishes[0]
        ? normalizeCategoryKey(getDishCategoryLabel(nextDishes[0]))
        : "";
      const initialCategory = firstCategory || fallbackCategory;
      if (initialCategory) {
        setSelectedCategory(initialCategory);
        selectedCategoryInitializedRef.current = true;
      }
    }
    if (!fastEntryInitializedRef.current) fastEntryInitializedRef.current = true;
  };

  useEffect(() => {
    const initialScope = scopedRestaurantId || null;
    fetchRestaurantSettings();
    fetchActiveTables(initialScope);
    fetchActiveDishes(initialScope);
    fetchFastEntryResources(initialScope);

    const channel = supabase
      .channel("admin-orders-and-tables")
      .on("postgres_changes", { event: "*", schema: "public", table: "table_assignments" }, () => void fetchActiveTables())
      .on("postgres_changes", { event: "*", schema: "public", table: "dishes" }, () => void fetchActiveDishes())
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => void fetchFastEntryResources())
      .on("postgres_changes", { event: "*", schema: "public", table: "dishes" }, () => void fetchFastEntryResources())
      .on("postgres_changes", { event: "*", schema: "public", table: "table_assignments" }, () => void fetchFastEntryResources())
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurants" }, () => void fetchRestaurantSettings())
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_profile" }, () => void fetchRestaurantSettings())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scopedRestaurantId]);

  useEffect(() => {
    void fetchOrders();

    const ordersChannel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        console.log("LOG_NOTIF ADMIN orders:", payload);
        const eventPayload = payload as {
          eventType?: string;
          old?: Record<string, unknown>;
          new?: Record<string, unknown>;
        };
        const normalizeRealtimeStatus = (value: unknown) =>
          String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[\s-]+/g, "_")
            .trim();
        const readyStatuses = new Set(["ready", "ready_bar", "pret", "prete", "prêt"]);
        const preparingStatuses = new Set(["preparing", "en_preparation", "to_prepare", "to_prepare_bar", "to_prepare_kitchen", "preparant"]);
        const oldStatus = normalizeRealtimeStatus(eventPayload.old?.status);
        const newStatus = normalizeRealtimeStatus(eventPayload.new?.status);
        const isReadyTransition = !!newStatus && readyStatuses.has(newStatus) && !readyStatuses.has(oldStatus);
        if (isReadyTransition) {
          const changedOrderId = String(eventPayload.new?.id ?? eventPayload.old?.id ?? "").trim();
          if (changedOrderId) triggerReadyOrderAlert(changedOrderId, preparingStatuses.has(oldStatus));
        }
        const nextRestaurantId = String(eventPayload.new?.restaurant_id ?? eventPayload.old?.restaurant_id ?? "").trim();
        const currentRestaurantId = String(restaurantId || "").trim();
        if (currentRestaurantId && nextRestaurantId && currentRestaurantId !== nextRestaurantId) {
          console.warn("Admin realtime restaurant_id mismatch, forcing refresh anyway", {
            currentRestaurantId,
            nextRestaurantId,
          });
        }
        void fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [restaurantId]);

  useEffect(() => {
    return () => {
      Object.values(readyAlertTimeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
      readyAlertTimeoutsRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (activeTab === "orders" && hasReadyTabAlert) {
      setHasReadyTabAlert(false);
    }
  }, [activeTab, hasReadyTabAlert]);

  useEffect(() => {
    console.log("SETTINGS RÉCUPÉRÉS :", settings);
  }, [settings]);

  useEffect(() => {
    void fetchNotifications();

    const channel = supabase
      .channel(`admin-notifications-${String(restaurantId ?? "global")}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        const row = normalizeNotificationRow(((payload as { new?: Record<string, unknown> }).new || {}) as Record<string, unknown>);
        if (!row.id) return;
        const status = String(row.status || "").trim().toLowerCase();
        if (status && status !== "pending") return;
        const currentRestaurantId = String(restaurantId ?? "").trim();
        const rowRestaurantId = String(row.restaurant_id ?? "").trim();
        if (currentRestaurantId && rowRestaurantId && rowRestaurantId !== currentRestaurantId) return;
        setServiceNotifications((prev) => {
          if (prev.some((entry) => String(entry.id) === String(row.id))) return prev;
          return [row, ...prev];
        });
        playReadyNotificationBeep();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, (payload) => {
        const row = normalizeNotificationRow(((payload as { new?: Record<string, unknown> }).new || {}) as Record<string, unknown>);
        const status = String(row.status || "").trim().toLowerCase();
        setServiceNotifications((prev) => {
          const filtered = prev.filter((entry) => String(entry.id) !== String(row.id));
          if (status === "pending") return [row, ...filtered];
          return filtered;
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications" }, (payload) => {
        const oldRow = ((payload as { old?: Record<string, unknown> }).old || {}) as Record<string, unknown>;
        const oldId = String(oldRow.id || "").trim();
        if (!oldId) return;
        setServiceNotifications((prev) => prev.filter((entry) => String(entry.id) !== oldId));
      })
      .subscribe((status) => {
        console.log("Realtime notifications admin:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const handleSaveTable = async () => {
    const tableNumber = Number(tableNumberInput);
    const pin = pinInput.trim();
    const covers = normalizeCoversValue(coversInput);
    const targetRestaurantId = String(restaurantId || scopedRestaurantId || "").trim();
    if (!targetRestaurantId) {
      setMessage("ID restaurant manquant dans l'URL.");
      return;
    }

    if (!tableNumber || !pin || !covers) {
      setMessage("Veuillez saisir le numéro de table, le PIN et le nombre de couverts.");
      return;
    }

    setSaving(true);
    setMessage("");

    const enrichWithRestaurantId = (payload: Record<string, unknown>) =>
      targetRestaurantId ? { ...payload, restaurant_id: targetRestaurantId } : payload;
    const sessionPayloads = [
      enrichWithRestaurantId({ table_number: tableNumber, pin_code: pin, covers, guest_count: covers, customer_count: covers }),
      enrichWithRestaurantId({ table_number: tableNumber, pin_code: pin, covers, guest_count: covers }),
      enrichWithRestaurantId({ table_number: tableNumber, pin_code: pin, covers }),
      enrichWithRestaurantId({ table_number: tableNumber, pin_code: pin, guest_count: covers }),
      enrichWithRestaurantId({ table_number: tableNumber, pin_code: pin, customer_count: covers }),
      enrichWithRestaurantId({ table_number: tableNumber, pin_code: pin }),
      { table_number: tableNumber, pin_code: pin, covers, guest_count: covers, customer_count: covers },
      { table_number: tableNumber, pin_code: pin },
    ];

    let insertResult = await supabase.from("table_assignments").insert(sessionPayloads[0]);
    for (let i = 1; insertResult.error && i < sessionPayloads.length; i += 1) {
      const code = String((insertResult.error as { code?: string })?.code || "");
      const msg = String(insertResult.error.message || "").toLowerCase();
      const missingColumn = code === "42703" || msg.includes("column") || msg.includes("schema cache");
      if (!missingColumn) break;
      insertResult = await supabase.from("table_assignments").insert(sessionPayloads[i]);
    }

    if (insertResult.error) {
      const code = String((insertResult.error as { code?: string })?.code || "");
      const message = String(insertResult.error.message || "").toLowerCase();
      const duplicate =
        code === "23505" ||
        message.includes("duplicate key") ||
        message.includes("unique");

      if (!duplicate) {
        setMessage("Erreur enregistrement: " + insertResult.error.message);
        setSaving(false);
        return;
      }

      const updatePayloads = [
        enrichWithRestaurantId({ pin_code: pin, covers, guest_count: covers, customer_count: covers }),
        enrichWithRestaurantId({ pin_code: pin, covers, guest_count: covers }),
        enrichWithRestaurantId({ pin_code: pin, covers }),
        enrichWithRestaurantId({ pin_code: pin, guest_count: covers }),
        enrichWithRestaurantId({ pin_code: pin, customer_count: covers }),
        enrichWithRestaurantId({ pin_code: pin }),
        { pin_code: pin, covers, guest_count: covers, customer_count: covers },
        { pin_code: pin },
      ];
      let updateQuery = supabase.from("table_assignments").update(updatePayloads[0]).eq("table_number", tableNumber);
      if (targetRestaurantId) updateQuery = updateQuery.eq("restaurant_id", targetRestaurantId);
      let updateResult = await updateQuery;
      for (let i = 1; updateResult.error && i < updatePayloads.length; i += 1) {
        const code = String((updateResult.error as { code?: string })?.code || "");
        const msg = String(updateResult.error.message || "").toLowerCase();
        const missingColumn = code === "42703" || msg.includes("column") || msg.includes("schema cache");
        if (!missingColumn) break;
        let nextUpdateQuery = supabase.from("table_assignments").update(updatePayloads[i]).eq("table_number", tableNumber);
        if (targetRestaurantId && i < 6) nextUpdateQuery = nextUpdateQuery.eq("restaurant_id", targetRestaurantId);
        updateResult = await nextUpdateQuery;
      }

      if (updateResult.error) {
        setMessage("Erreur enregistrement: " + updateResult.error.message);
        setSaving(false);
        return;
      }
    }

    setMessage("Table enregistrée.");
    setPinInput("");
    setCoversInput(String(covers));
    setSaving(false);
    fetchActiveTables(targetRestaurantId);
  };

  const handleDeleteTable = async (row: TableAssignment) => {
    const tableNumber = Number(row.table_number);
    const targetRestaurantId = String(restaurantId || scopedRestaurantId || "").trim();
    if (!targetRestaurantId) {
      setMessage("ID restaurant manquant dans l'URL.");
      return;
    }
    let deleteQuery = supabase.from("table_assignments").delete().eq("table_number", tableNumber);
    if (targetRestaurantId) deleteQuery = deleteQuery.eq("restaurant_id", targetRestaurantId);
    const deleteResult = await deleteQuery;
    if (deleteResult.error) {
      setMessage("Erreur fermeture table: " + String(deleteResult.error.message || ""));
      return;
    }

    setMessage("Table fermée.");
    fetchActiveTables(targetRestaurantId);
  };

  const fillFormForEdit = (row: TableAssignment) => {
    setTableNumberInput(String(row.table_number));
    setPinInput(String(row.pin_code || ""));
    setCoversInput(String(readCoversFromRow(row as unknown as Record<string, unknown>) || 1));
    setMessage("");
  };

  const deriveOrderStatusFromItems = (items: Item[]) => {
    const activeItems = items.filter((item) => !isItemServed(item));
    if (activeItems.length === 0) return "served";
    if (activeItems.every((item) => isItemReady(item))) {
      return activeItems.every((item) => isDrink(item)) ? "ready_bar" : "ready";
    }
    if (activeItems.some((item) => isItemReady(item) || getItemPrepStatus(item) === "preparing")) {
      return "preparing";
    }
    return "pending";
  };

  const handleServeItem = async (orderId: string, itemIndex: number) => {
    const targetOrder = orders.find((order) => String(order.id) === String(orderId));
    if (!targetOrder) {
      await fetchOrders();
      return;
    }
    const currentItems = parseItems(targetOrder.items);
    if (itemIndex < 0 || itemIndex >= currentItems.length) return;

    const nextItems = currentItems.map((item, idx) =>
      idx === itemIndex ? { ...(item || {}), status: "served" } : item
    );
    const nextStatus = deriveOrderStatusFromItems(nextItems);

    setOrders((prev) =>
      prev.map((order) =>
        String(order.id) === String(orderId)
          ? { ...order, items: nextItems, status: nextStatus }
          : order
      )
    );

    const { error } = await supabase
      .from("orders")
      .update({ items: nextItems, status: nextStatus })
      .eq("id", orderId);

    if (error) {
      console.error("Erreur service article:", error);
      await fetchOrders();
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ status: "completed" })
      .eq("id", notificationId);
    if (error) {
      console.error("Erreur traitement notification:", error);
      return;
    }
    setServiceNotifications((prev) => prev.filter((row) => String(row.id) !== String(notificationId)));
  };

  const categoriesForFastEntry =
    categories.length > 0
      ? categories.map((category) => {
          const label = getCategoryLabel(category);
          return { key: normalizeCategoryKey(label), label };
        })
      : (() => {
          const unique = new Map<string, string>();
          dishes.forEach((dish) => {
            const label = getDishCategoryLabel(dish);
            const key = normalizeCategoryKey(label);
            if (!unique.has(key)) unique.set(key, label);
          });
          return [...unique.entries()].map(([key, label]) => ({ key, label }));
        })();

  const availableFastCategoryKeys = new Set(categoriesForFastEntry.map((category) => category.key));
  const effectiveSelectedFastCategoryKey = availableFastCategoryKeys.has(selectedCategory)
    ? selectedCategory
    : categoriesForFastEntry[0]?.key || "";

  const fastEntryDishes =
    !effectiveSelectedFastCategoryKey
      ? dishes
      : dishes.filter(
          (dish) => normalizeCategoryKey(getDishCategoryLabel(dish)) === effectiveSelectedFastCategoryKey
        );
  const visibleFastEntryDishes = fastEntryDishes.length > 0 ? fastEntryDishes : dishes;

  const fastBaseLines = (() => {
    const lines: FastOrderLine[] = [];
    const dishById = new Map<string, DishItem>();
    dishes.forEach((dish) => dishById.set(String(dish.id), dish));

    Object.entries(fastQtyByDish).forEach(([dishId, quantity]) => {
      if (!quantity || quantity <= 0) return;
      const dish = dishById.get(dishId);
      if (!dish) return;
      const category = getDishCategoryLabel(dish);
      lines.push({
        lineId: `base-${dishId}`,
        dishId,
        dishName: getDishName(dish),
        category,
        categoryId: dish.category_id ?? null,
        quantity,
        unitPrice: getDishPrice(dish),
        selectedSides: [],
        selectedExtras: [],
        selectedProductOptionId: null,
        selectedProductOptionName: null,
        selectedProductOptionPrice: 0,
        selectedCooking: "",
        specialRequest: String(baseLineComments[dishId] || ""),
        isDrink: isDrink({ category }),
      });
    });

    return lines;
  })();

  const fastLines = [...fastBaseLines, ...fastOptionLines];

  const fastTotal = fastLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const fastItemCount = fastLines.reduce((sum, line) => sum + line.quantity, 0);
  const tableSelectOptions = Array.from(
    new Set([
      ...Array.from({ length: configuredTotalTables }, (_, index) => index + 1),
      ...tableNumbers,
    ])
  ).sort((a, b) => a - b);

  const loadDishOptionsFromDishes = async (dish: DishItem) => {
    const currentRestaurantId = String(restaurantId || scopedRestaurantId || "").trim();
    if (!currentRestaurantId) return dish;

    const dishId = String(dish.id || "").trim();
    if (dishId) {
      let byIdPrimaryQuery = supabase
        .from("dishes")
        .select(DISH_SELECT_WITH_OPTIONS)
        .eq("id", dish.id)
        .limit(1);
      if (currentRestaurantId) byIdPrimaryQuery = byIdPrimaryQuery.eq("restaurant_id", currentRestaurantId);
      const byIdPrimary = await byIdPrimaryQuery;
      let byIdData = Array.isArray(byIdPrimary.data) ? (byIdPrimary.data[0] as DishItem | undefined) : undefined;

      if (byIdPrimary.error) {
        let byIdStarFallbackQuery = supabase.from("dishes").select("*").eq("id", dish.id).limit(1);
        if (currentRestaurantId) byIdStarFallbackQuery = byIdStarFallbackQuery.eq("restaurant_id", currentRestaurantId);
        const byIdStarFallback = await byIdStarFallbackQuery;
        byIdData = Array.isArray(byIdStarFallback.data) ? (byIdStarFallback.data[0] as DishItem | undefined) : undefined;
        if (!byIdStarFallback.error && byIdData) {
          return { ...(dish as Record<string, unknown>), ...(byIdData as Record<string, unknown>) } as DishItem;
        }
        let byIdFallbackQuery = supabase
          .from("dishes")
          .select(DISH_SELECT_BASE)
          .eq("id", dish.id)
          .limit(1);
        if (currentRestaurantId) byIdFallbackQuery = byIdFallbackQuery.eq("restaurant_id", currentRestaurantId);
        const byIdFallback = await byIdFallbackQuery;
        byIdData = Array.isArray(byIdFallback.data) ? (byIdFallback.data[0] as DishItem | undefined) : undefined;
        if (byIdFallback.error) {
          let byIdUltraFallbackQuery = supabase.from("dishes").select("id,name,price").eq("id", dish.id).limit(1);
          if (currentRestaurantId) byIdUltraFallbackQuery = byIdUltraFallbackQuery.eq("restaurant_id", currentRestaurantId);
          const byIdUltraFallback = await byIdUltraFallbackQuery;
          byIdData = Array.isArray(byIdUltraFallback.data)
            ? (byIdUltraFallback.data[0] as DishItem | undefined)
            : undefined;
        }
      }
      if (byIdData) {
        return { ...(dish as Record<string, unknown>), ...(byIdData as Record<string, unknown>) } as DishItem;
      }
    }

    const dishName = String(dish.name || "").trim();
    if (dishName) {
      let byNamePrimaryQuery = supabase
        .from("dishes")
        .select(DISH_SELECT_WITH_OPTIONS)
        .eq("name", dishName)
        .limit(1);
      if (currentRestaurantId) byNamePrimaryQuery = byNamePrimaryQuery.eq("restaurant_id", currentRestaurantId);
      const byNamePrimary = await byNamePrimaryQuery;
      let byNameData = Array.isArray(byNamePrimary.data) ? (byNamePrimary.data[0] as DishItem | undefined) : undefined;

      if (byNamePrimary.error) {
        let byNameStarFallbackQuery = supabase.from("dishes").select("*").eq("name", dishName).limit(1);
        if (currentRestaurantId) byNameStarFallbackQuery = byNameStarFallbackQuery.eq("restaurant_id", currentRestaurantId);
        const byNameStarFallback = await byNameStarFallbackQuery;
        byNameData = Array.isArray(byNameStarFallback.data)
          ? (byNameStarFallback.data[0] as DishItem | undefined)
          : undefined;
        if (!byNameStarFallback.error && byNameData) {
          return { ...(dish as Record<string, unknown>), ...(byNameData as Record<string, unknown>) } as DishItem;
        }
        let byNameFallbackQuery = supabase
          .from("dishes")
          .select(DISH_SELECT_BASE)
          .eq("name", dishName)
          .limit(1);
        if (currentRestaurantId) byNameFallbackQuery = byNameFallbackQuery.eq("restaurant_id", currentRestaurantId);
        const byNameFallback = await byNameFallbackQuery;
        byNameData = Array.isArray(byNameFallback.data) ? (byNameFallback.data[0] as DishItem | undefined) : undefined;
        if (byNameFallback.error) {
          let byNameUltraFallbackQuery = supabase.from("dishes").select("id,name,price").eq("name", dishName).limit(1);
          if (currentRestaurantId) byNameUltraFallbackQuery = byNameUltraFallbackQuery.eq("restaurant_id", currentRestaurantId);
          const byNameUltraFallback = await byNameUltraFallbackQuery;
          byNameData = Array.isArray(byNameUltraFallback.data)
            ? (byNameUltraFallback.data[0] as DishItem | undefined)
            : undefined;
        }
      }
      if (byNameData) {
        return { ...(dish as Record<string, unknown>), ...(byNameData as Record<string, unknown>) } as DishItem;
      }
    }

    return dish;
  };

  const openOptionsModal = async (dish: DishItem) => {
    const sourceDish = await loadDishOptionsFromDishes(dish);
    console.log("STRUCTURE RÉELLE DU PLAT:", sourceDish);
    const sideIds = parseDishSideIds(sourceDish);
    const sideMap = new Map<string, string>();
    sidesLibrary.forEach((side) => {
      const label =
        String(side.name_fr || "").trim() ||
        String(side.name_en || "").trim() ||
        String(side.name_es || "").trim() ||
        String(side.name_de || "").trim() ||
        String(side.id);
      sideMap.set(String(side.id), label);
    });

    setModalDish(sourceDish);
    setModalQty(1);
    setModalSideChoices(sideIds.map((id) => sideMap.get(String(id)) || String(id)));
    setModalSelectedSides([]);
    const inlineProductOptions = parseDishProductOptions(sourceDish);
    const dbProductOptions =
      inlineProductOptions.length === 0 && sourceDish.id != null
        ? await loadDishProductOptionsFromDatabase(sourceDish.id)
        : [];
    setModalProductOptions(inlineProductOptions.length > 0 ? inlineProductOptions : dbProductOptions);
    setModalSelectedProductOptionId("");
    const parsedExtras = parseDishExtras(sourceDish);
    const relationExtras =
      parsedExtras.length === 0 && sourceDish.id != null ? await loadDishExtrasFromRelations(sourceDish.id) : [];
    setModalExtraChoices(parsedExtras.length > 0 ? parsedExtras : relationExtras);
    setModalSelectedExtras([]);
    setModalCooking("");
    setModalKitchenComment("");
    setModalOpen(true);
  };

  const handleAddOptionLine = () => {
    if (!modalDish) return;
    const selectedProductOption =
      modalProductOptions.find((option) => String(option.id) === String(modalSelectedProductOptionId)) || null;
    const sideRequired = isSideSelectionRequired(modalDish, modalSideChoices);
    const sideMaxSelections = getSideMaxSelections(modalDish, modalSideChoices);
    const optionRequired = isProductOptionSelectionRequired(modalDish, modalProductOptions);

    if (sideRequired && modalSelectedSides.length === 0) {
      alert("Veuillez choisir au moins un accompagnement.");
      return;
    }
    if (sideMaxSelections > 0 && modalSelectedSides.length > sideMaxSelections) {
      alert(`Vous pouvez choisir au maximum ${sideMaxSelections} accompagnement${sideMaxSelections > 1 ? "s" : ""}.`);
      return;
    }
    if (optionRequired && !selectedProductOption) {
      alert("Veuillez choisir une option obligatoire.");
      return;
    }
    if (dishNeedsCooking(modalDish) && !modalCooking.trim()) {
      alert("Veuillez choisir une cuisson.");
      return;
    }
    const category = getDishCategoryLabel(modalDish);
    const optionUnit = parsePriceNumber(selectedProductOption?.price ?? 0);
    const extrasUnit = modalSelectedExtras.reduce((sum, extra) => sum + parsePriceNumber(extra.price), 0);
    const normalizedSelectedSides =
      sideMaxSelections > 0 ? modalSelectedSides.slice(0, sideMaxSelections) : modalSelectedSides;
    const line: FastOrderLine = {
      lineId: makeLineId(),
      dishId: String(modalDish.id),
      dishName: getDishName(modalDish),
      category,
      categoryId: modalDish.category_id ?? null,
      quantity: modalQty,
      unitPrice: Number((getDishPrice(modalDish) + optionUnit + extrasUnit).toFixed(2)),
      selectedSides: normalizedSelectedSides,
      selectedExtras: modalSelectedExtras,
      selectedProductOptionId: selectedProductOption?.id || null,
      selectedProductOptionName: selectedProductOption?.name || null,
      selectedProductOptionPrice: optionUnit,
      selectedCooking: modalCooking,
      specialRequest: modalKitchenComment,
      isDrink: isDrink({ category }),
    };
    setFastOptionLines((prev) => [...prev, line]);
    setModalOpen(false);
    setModalDish(null);
    setModalProductOptions([]);
    setModalSelectedProductOptionId("");
  };

  const removeFastLine = (lineId: string) => {
    if (lineId.startsWith("base-")) {
      const dishId = lineId.replace("base-", "");
      setFastQtyByDish((prev) => {
        const next = { ...prev };
        delete next[dishId];
        return next;
      });
      setBaseLineComments((prev) => {
        const next = { ...prev };
        delete next[dishId];
        return next;
      });
      return;
    }
    setFastOptionLines((prev) => prev.filter((line) => line.lineId !== lineId));
  };

  const updateLineKitchenComment = (lineId: string, comment: string) => {
    if (lineId.startsWith("base-")) {
      const dishId = lineId.replace("base-", "");
      setBaseLineComments((prev) => ({ ...prev, [dishId]: comment }));
      return;
    }
    setFastOptionLines((prev) =>
      prev.map((line) => (line.lineId === lineId ? { ...line, specialRequest: comment } : line))
    );
  };

  const ensureTableIsOrderableForServer = async (tableNumber: number, covers?: number | null) => {
    const targetRestaurantId = String(restaurantId || scopedRestaurantId || "").trim();
    if (!targetRestaurantId) return null;
    let selectPrimaryQuery = supabase.from("table_assignments").select("table_number,pin_code").eq("table_number", tableNumber).limit(1);
    if (targetRestaurantId) selectPrimaryQuery = selectPrimaryQuery.eq("restaurant_id", targetRestaurantId);
    let selectPrimary = await selectPrimaryQuery;
    if (selectPrimary.error && String((selectPrimary.error as { code?: string }).code || "") === "42703" && targetRestaurantId) {
      selectPrimary = await supabase.from("table_assignments").select("table_number,pin_code").eq("table_number", tableNumber).limit(1);
    }

    if (selectPrimary.error) return selectPrimary.error;

    const row =
      Array.isArray(selectPrimary.data) && selectPrimary.data[0]
        ? (selectPrimary.data[0] as { pin_code?: unknown })
        : null;
    const currentPin = String(row?.pin_code || "").trim();

    if (!row) {
      const normalizedCovers = normalizeCoversValue(covers);
      const upsertPayloads = normalizedCovers
        ? [
            { table_number: tableNumber, pin_code: "SERVEUR", covers: normalizedCovers, guest_count: normalizedCovers, customer_count: normalizedCovers, restaurant_id: targetRestaurantId || undefined },
            { table_number: tableNumber, pin_code: "SERVEUR", covers: normalizedCovers, guest_count: normalizedCovers, restaurant_id: targetRestaurantId || undefined },
            { table_number: tableNumber, pin_code: "SERVEUR", covers: normalizedCovers, restaurant_id: targetRestaurantId || undefined },
            { table_number: tableNumber, pin_code: "SERVEUR", guest_count: normalizedCovers, restaurant_id: targetRestaurantId || undefined },
            { table_number: tableNumber, pin_code: "SERVEUR", customer_count: normalizedCovers, restaurant_id: targetRestaurantId || undefined },
            { table_number: tableNumber, pin_code: "SERVEUR", restaurant_id: targetRestaurantId || undefined },
            { table_number: tableNumber, pin_code: "SERVEUR", covers: normalizedCovers, guest_count: normalizedCovers, customer_count: normalizedCovers },
          ]
        : [
            { table_number: tableNumber, pin_code: "SERVEUR", restaurant_id: targetRestaurantId || undefined },
            { table_number: tableNumber, pin_code: "SERVEUR" },
          ];
      let inserted = await supabase
        .from("table_assignments")
        .upsert([upsertPayloads[0]], { onConflict: "table_number" });
      for (let i = 1; inserted.error && i < upsertPayloads.length; i += 1) {
        const code = String((inserted.error as { code?: string })?.code || "");
        const msg = String(inserted.error.message || "").toLowerCase();
        const missingColumn = code === "42703" || msg.includes("column") || msg.includes("schema cache");
        if (!missingColumn) break;
        inserted = await supabase.from("table_assignments").upsert([upsertPayloads[i]], { onConflict: "table_number" });
      }
      if (inserted.error) return inserted.error;
      return null;
    }

    if (!currentPin || currentPin === "0000" || normalizeCoversValue(covers)) {
      const normalizedCovers = normalizeCoversValue(covers);
      const updatePayloads = normalizedCovers
        ? [
            { pin_code: "SERVEUR", covers: normalizedCovers, guest_count: normalizedCovers, customer_count: normalizedCovers, restaurant_id: targetRestaurantId || undefined },
            { pin_code: "SERVEUR", covers: normalizedCovers, guest_count: normalizedCovers, restaurant_id: targetRestaurantId || undefined },
            { pin_code: "SERVEUR", covers: normalizedCovers, restaurant_id: targetRestaurantId || undefined },
            { pin_code: "SERVEUR", guest_count: normalizedCovers, restaurant_id: targetRestaurantId || undefined },
            { pin_code: "SERVEUR", customer_count: normalizedCovers, restaurant_id: targetRestaurantId || undefined },
            { pin_code: "SERVEUR", restaurant_id: targetRestaurantId || undefined },
            { pin_code: "SERVEUR", covers: normalizedCovers, guest_count: normalizedCovers, customer_count: normalizedCovers },
          ]
        : [{ pin_code: "SERVEUR", restaurant_id: targetRestaurantId || undefined }, { pin_code: "SERVEUR" }];
      let updateQuery = supabase.from("table_assignments").update(updatePayloads[0]).eq("table_number", tableNumber);
      if (targetRestaurantId) updateQuery = updateQuery.eq("restaurant_id", targetRestaurantId);
      let updated = await updateQuery;
      for (let i = 1; updated.error && i < updatePayloads.length; i += 1) {
        const code = String((updated.error as { code?: string })?.code || "");
        const msg = String(updated.error.message || "").toLowerCase();
        const missingColumn = code === "42703" || msg.includes("column") || msg.includes("schema cache");
        if (!missingColumn) break;
        let nextUpdateQuery = supabase.from("table_assignments").update(updatePayloads[i]).eq("table_number", tableNumber);
        if (targetRestaurantId && i < 6) nextUpdateQuery = nextUpdateQuery.eq("restaurant_id", targetRestaurantId);
        updated = await nextUpdateQuery;
      }
      if (updated.error) return updated.error;
    }

    return null;
  };

  const handleSubmitFastOrder = async () => {
    setFastMessage("");
    const resetFastEntryForm = () => {
      setFastQtyByDish({});
      setBaseLineComments({});
      setFastOptionLines([]);
      setModalOpen(false);
      setModalDish(null);
      setModalQty(1);
      setModalSideChoices([]);
      setModalSelectedSides([]);
      setModalProductOptions([]);
      setModalSelectedProductOptionId("");
      setModalExtraChoices([]);
      setModalSelectedExtras([]);
      setModalCooking("");
      setModalKitchenComment("");
    };

    const tableNumber = Number(String(selectedFastTableNumber || "").trim());
    const enteredCovers = normalizeCoversValue(fastCoversInput);
    if (!Number.isFinite(tableNumber) || tableNumber <= 0) {
      setFastMessage(fastOrderText.tableInvalid);
      return;
    }
    if (!enteredCovers) {
      setFastMessage("Nombre de couverts invalide.");
      return;
    }
    if (fastLines.length === 0) {
      setFastMessage(fastOrderText.addItem);
      return;
    }

    const items: Item[] = fastLines
      .map((line) => {
        const quantity = Number(line.quantity || 0);
        const unitPrice = Number(line.unitPrice || 0);
        const optionPrice = parsePriceNumber(line.selectedProductOptionPrice);
        const extrasPrice = (line.selectedExtras || []).reduce((sum, extra) => sum + parsePriceNumber(extra.price), 0);
        const baseUnitPrice = Number((unitPrice - extrasPrice - optionPrice).toFixed(2));
        const selectedSideIds = (line.selectedSides || [])
          .map((label) => sideIdByAlias.get(normalizeLookupText(label)) || "")
          .filter(Boolean);
        const cookingLabel = String(line.selectedCooking || "").trim();
        const cookingKey = toCookingKeyFromLabel(cookingLabel);
        const selectedOptionId = String(line.selectedProductOptionId || "").trim() || null;
        const selectedOptionName = String(line.selectedProductOptionName || "").trim() || null;
        const selectedOptionsPayload: Array<Record<string, unknown>> = [];
        if (selectedOptionName) {
          selectedOptionsPayload.push({
            kind: "option",
            id: selectedOptionId,
            value: selectedOptionName,
            label_fr: selectedOptionName,
            price: optionPrice,
          });
        }
        if (selectedSideIds.length > 0) {
          selectedOptionsPayload.push({
            kind: "side",
            ids: selectedSideIds,
            values: line.selectedSides,
          });
        }
        if (cookingLabel) {
          selectedOptionsPayload.push({
            kind: "cooking",
            key: cookingKey || null,
            value: cookingLabel,
            label_fr: cookingLabel,
          });
        }
        if (!line.dishId || !line.dishName || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice)) {
          return null;
        }
        return {
          id: line.dishId,
          name: line.dishName,
          quantity,
          category: line.category,
          categorie: line.category,
          price: Number(unitPrice.toFixed(2)),
          base_price: Number.isFinite(baseUnitPrice) ? baseUnitPrice : Number(unitPrice.toFixed(2)),
          extras_price: Number(extrasPrice.toFixed(2)),
          unit_total_price: Number(unitPrice.toFixed(2)),
          selected_option_id: selectedOptionId,
          selected_option_name: selectedOptionName,
          selected_option_price: optionPrice,
          selected_option: selectedOptionsPayload.find((entry) => String(entry.kind || "").trim() === "option") || null,
          selected_options: selectedOptionsPayload,
          selectedOptions: selectedOptionsPayload,
          options: selectedOptionsPayload,
          selectedSides: line.selectedSides,
          selected_side_ids: selectedSideIds,
          side: line.selectedSides.length > 0 ? line.selectedSides[0] : null,
          accompagnement: line.selectedSides.length > 0 ? line.selectedSides[0] : null,
          accompagnements: line.selectedSides,
          selectedExtras: line.selectedExtras.map((extra) => ({ name: extra.name, price: extra.price })),
          selected_extras: line.selectedExtras.map((extra, index) => ({
            id: buildStableExtraId(line.dishId, extra.name, extra.price, index),
            label_fr: String(extra.name || "").trim(),
            price: parsePriceNumber(extra.price),
          })),
          selected_extra_ids: line.selectedExtras.map((extra, index) =>
            buildStableExtraId(line.dishId, extra.name, extra.price, index)
          ),
          supplements: line.selectedExtras.map((extra) => String(extra.name || "").trim()).filter(Boolean),
          supplement: line.selectedExtras.map((extra) => String(extra.name || "").trim()).filter(Boolean),
          is_drink: line.isDrink,
          cooking: cookingLabel || null,
          cuisson: cookingLabel || null,
          selected_cooking_label_fr: cookingLabel || null,
          selected_cooking_label: cookingLabel || null,
          selected_cooking_key: cookingKey || null,
          special_request: String(line.specialRequest || "").trim(),
          instructions: buildLineInstructions(line),
          status: "pending",
          from_recommendation: false,
        } as Item;
      })
      .filter(Boolean) as Item[];

    if (items.length === 0) {
      setFastMessage(fastOrderText.noValidItem);
      return;
    }

    const totalPrice = Number(fastTotal.toFixed(2));
    const resolvedRestaurantId = String(restaurantId || scopedRestaurantId || "").trim();
    if (!resolvedRestaurantId) {
      setFastMessage("ID restaurant manquant dans l'URL.");
      return;
    }
    const sessionCovers = enteredCovers;
    const payload = {
      restaurant_id: resolvedRestaurantId,
      table_number: tableNumber,
      covers: sessionCovers,
      guest_count: sessionCovers,
      customer_count: sessionCovers,
      items: items,
      total_price: totalPrice,
      status: "pending",
    };
    const payloadWithoutId = [{
      restaurant_id: payload.restaurant_id,
      table_number: payload.table_number,
      covers: payload.covers,
      guest_count: payload.guest_count,
      customer_count: payload.customer_count,
      items: items,
      total_price: payload.total_price,
      status: "pending",
    }];
    const forcedOrderId = crypto.randomUUID();

    setFastLoading(true);
    console.log("Données envoyées à Supabase:", payload);
    console.log("CONTENU EXACT DU PAYLOAD ENVOYÉ:", payloadWithoutId);
    const orderInsertPayloads = [
      {
        id: forcedOrderId,
        restaurant_id: payload.restaurant_id,
        table_number: payload.table_number,
        covers: payload.covers,
        guest_count: payload.guest_count,
        customer_count: payload.customer_count,
        items: payload.items,
        total_price: payload.total_price,
        status: "pending",
      },
      {
        id: forcedOrderId,
        restaurant_id: payload.restaurant_id,
        table_number: payload.table_number,
        covers: payload.covers,
        guest_count: payload.guest_count,
        items: payload.items,
        total_price: payload.total_price,
        status: "pending",
      },
      {
        id: forcedOrderId,
        restaurant_id: payload.restaurant_id,
        table_number: payload.table_number,
        covers: payload.covers,
        items: payload.items,
        total_price: payload.total_price,
        status: "pending",
      },
      {
        id: forcedOrderId,
        restaurant_id: payload.restaurant_id,
        table_number: payload.table_number,
        items: payload.items,
        total_price: payload.total_price,
        status: "pending",
      },
    ];
    let insertError: { message?: string; code?: string; details?: string; hint?: string } | null = null;
    for (const candidate of orderInsertPayloads) {
      const result = await supabase.from("orders").insert([candidate]);
      if (!result.error) {
        insertError = null;
        break;
      }
      insertError = result.error as { message?: string; code?: string; details?: string; hint?: string };
      const code = String(insertError.code || "");
      const msg = String(insertError.message || "").toLowerCase();
      const missingColumn = code === "42703" || msg.includes("column") || msg.includes("schema cache");
      if (!missingColumn) break;
    }
    setFastLoading(false);

    if (insertError) {
      console.error("DÉTAIL ERREUR SQL:", insertError.message, {
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        restaurant_id: restaurantId,
        table_number: payload.table_number,
        items_count: items.length,
        total_price: payload.total_price,
        status: payload.status,
      });
      setFastMessage(fastOrderText.sendError);
      resetFastEntryForm();
      return;
    }

    const activationError = await ensureTableIsOrderableForServer(tableNumber, sessionCovers);
    if (activationError) {
      console.warn("Activation table serveur impossible après envoi commande:", activationError);
    }

    resetFastEntryForm();
    setFastMessage(fastOrderText.sent);
    fetchOrders();
    fetchActiveTables();
  };

  function normalizeOrderStatus(value: unknown) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function isPaidStatus(status: unknown) {
    const normalized = normalizeOrderStatus(status);
    return normalized === "paid" || normalized === "paye" || normalized === "payee";
  }

  function isServedOrArchivedStatus(status: unknown) {
    const normalized = normalizeOrderStatus(status);
    return (
      normalized === "served" ||
      normalized === "servi" ||
      normalized === "servie" ||
      normalized === "archived" ||
      normalized === "archive" ||
      normalized === "archivee"
    );
  }

  const serviceVisibleOrders = useMemo(
    () => orders.filter((order) => !isServedOrArchivedStatus(order.status) && !isPaidStatus(order.status)),
    [orders]
  );

  const preparingOrders = useMemo(
    () =>
      serviceVisibleOrders.filter((order) => {
        const progress = getOrderItemProgress(order);
        return progress.pendingOrPreparingItems.length > 0;
      }),
    [serviceVisibleOrders]
  );

  const readyOrders = useMemo(
    () =>
      serviceVisibleOrders.filter((order) => {
        const progress = getOrderItemProgress(order);
        return progress.readyItems.length > 0;
      }),
    [serviceVisibleOrders]
  );

  const tableStatusRows = useMemo(() => {
    const activeTableOrders = orders.filter((order) => {
      const status = normalizeOrderStatus(order.status);
      return !isPaidStatus(status) && !["archived", "archive", "archivee"].includes(status);
    });
    const byTable = new Map<number, Order[]>();
    activeTableOrders.forEach((order) => {
      const table = Number(order.table_number);
      if (!Number.isFinite(table) || table <= 0) return;
      byTable.set(table, [...(byTable.get(table) || []), order]);
    });

    return Array.from(byTable.entries())
      .map(([tableNumber, tableOrders]) => {
        const allServed = tableOrders.length > 0 && tableOrders.every((order) => {
          const status = normalizeOrderStatus(order.status);
          return ["served", "servi", "servie"].includes(status);
        });

        let waitingMinutes: number | null = null;
        if (!allServed) {
          const latestPendingItemTimestamp = tableOrders
            .flatMap((order) => {
              const status = normalizeOrderStatus(order.status);
              if (["served", "servi", "servie"].includes(status)) return [];

              const parsedItems = parseItems(order.items);
              const itemTimestamps = parsedItems
                .map((item) => {
                  const candidates = [
                    item?.created_at,
                    item?.added_at,
                    item?.inserted_at,
                    item?.updated_at,
                    item?.timestamp,
                  ];
                  const firstValid = candidates.find((value) => {
                    const time = new Date(String(value || "")).getTime();
                    return Number.isFinite(time);
                  });
                  if (!firstValid) return null;
                  const time = new Date(String(firstValid)).getTime();
                  return Number.isFinite(time) ? time : null;
                })
                .filter((value): value is number => Number.isFinite(value));

              if (itemTimestamps.length > 0) return itemTimestamps;

              const orderTimestamp = new Date(order.created_at).getTime();
              return Number.isFinite(orderTimestamp) ? [orderTimestamp] : [];
            })
            .filter((value) => Number.isFinite(value))
            .sort((a, b) => b - a)[0];
          if (Number.isFinite(latestPendingItemTimestamp)) {
            waitingMinutes = Math.max(0, Math.floor((waitClockMs - latestPendingItemTimestamp) / 60000));
          }
        }

        return { tableNumber, allServed, waitingMinutes, count: tableOrders.length };
      })
      .sort((a, b) => a.tableNumber - b.tableNumber);
  }, [orders, waitClockMs]);

  const pendingNotifications = useMemo(
    () => serviceNotifications.filter((n) => !n.status || String(n.status).toLowerCase() === "pending"),
    [serviceNotifications]
  );
  const resolvedActiveTab: "orders" | "sessions" | "new-order" =
    !showNewOrderTab && activeTab === "new-order"
      ? "orders"
      : activeTab;

  const resolveOrderItemLabel = (item: Item) => {
    const directLabel =
      String(item.name || "").trim() ||
      String(item.name_fr || "").trim() ||
      String(item.label || "").trim() ||
      String(item.product_name || "").trim() ||
      String(item.productName || "").trim() ||
      String(item.dish_name || "").trim() ||
      String(item.dishName || "").trim() ||
      String(item.product?.name_fr || "").trim() ||
      String(item.product?.name || "").trim() ||
      String(item.product?.label || "").trim() ||
      String(item.dish?.name_fr || "").trim() ||
      String(item.dish?.name || "").trim();
    if (directLabel) return directLabel;

    const dishId = String(item.dish_id ?? item.id ?? "").trim();
    if (dishId) {
      const sourceDish = dishes.find((dish) => String(dish.id || "").trim() === dishId);
      const catalogLabel =
        String(sourceDish?.name_fr || "").trim() ||
        String(sourceDish?.name || "").trim() ||
        String(sourceDish?.nom || "").trim();
      if (catalogLabel) return catalogLabel;
    }

    return isDrink(item) ? "Boisson" : "Plat inconnu";
  };

  const getReadyItemEntries = (order: Order) => {
    const activeEntries = parseItems(order.items)
      .map((item, index) => ({ item, index }))
      .filter((entry) => !isItemServed(entry.item));
    const hasAnyItemStatus = activeEntries.some((entry) => hasExplicitItemStatus(entry.item));
    if (!hasAnyItemStatus && isReadyLikeOrderStatus(order.status)) {
      return activeEntries;
    }
    return activeEntries.filter((entry) => isItemReady(entry.item));
  };

  const renderOrderCard = (
    order: Order,
    mode: "all" | "drinks" | "foods",
    actionLabel?: string,
    actionHandler?: () => void,
    actionColorClass = "bg-black text-white",
    itemVisibility: "all_active" | "pending_preparing" = "all_active"
  ) => {
    const resolvedCovers = (() => {
      const direct =
        normalizeCoversValue((order as unknown as Record<string, unknown>).covers) ??
        normalizeCoversValue((order as unknown as Record<string, unknown>).guest_count) ??
        normalizeCoversValue((order as unknown as Record<string, unknown>).customer_count);
      if (direct) return direct;
      return tableCoversByNumber.get(Number(order.table_number)) || null;
    })();
    const getOrderItemLabel = (item: Item) => resolveOrderItemLabel(item);
    const flattenChoiceTexts = (value: unknown): string[] => {
      if (value == null) return [];
      if (Array.isArray(value)) return value.flatMap((entry) => flattenChoiceTexts(entry));
      if (typeof value === "string" || typeof value === "number") {
        const text = String(value || "").trim();
        return text ? [text] : [];
      }
      if (typeof value === "object") {
        const rec = value as Record<string, unknown>;
        return [
          rec.label_fr,
          rec.label,
          rec.name_fr,
          rec.name,
          rec.value_fr,
          rec.value,
          rec.choice,
          rec.selected,
          rec.text,
          rec.title,
        ]
          .map((entry) => String(entry || "").trim())
          .filter(Boolean);
      }
      return [];
    };
    const uniqueTexts = (values: string[]) => {
      const seen = new Set<string>();
      return values.filter((value) => {
        const normalized = String(value || "")
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        if (!normalized || seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });
    };
    const stripDetailPrefix = (text: string, type: "side" | "cooking" | "extra") => {
      const raw = String(text || "").trim();
      if (!raw) return "";
      if (type === "side" && /^(accompagnements|sides|acompa(:n|ñ)amientos|beilage(:n)?)\s*:/i.test(raw)) {
        return raw.replace(/^[^:]+:\s*/i, "").trim();
      }
      if (type === "cooking" && /^(cuisson|cooking|garstufe|cocci[oó]n)\s*:/i.test(raw)) {
        return raw.replace(/^[^:]+:\s*/i, "").trim();
      }
      if (type === "extra" && /^(supplements?|extras?|suplementos?)\s*:/i.test(raw)) {
        return raw.replace(/^[^:]+:\s*/i, "").trim();
      }
      return raw;
    };
    const getOrderItemDetails = (item: Item) => {
      const rec = item as unknown as Record<string, unknown>;
      const selectedOptions = rec.selected_options ?? rec.options;
      const optionEntries = Array.isArray(selectedOptions)
        ? selectedOptions
        : selectedOptions && typeof selectedOptions === "object"
          ? Object.values(selectedOptions as Record<string, unknown>)
          : [];

      const optionValuesByKind = optionEntries.reduce(
        (acc, entry) => {
          if (entry == null) return acc;
          if (typeof entry === "string" || typeof entry === "number") {
            const raw = String(entry || "").trim();
            if (!raw) return acc;
            if (/^(accompagnements|sides|acompa(:n|ñ)amientos|beilage(:n)?)\s*:/i.test(raw)) acc.side.push(stripDetailPrefix(raw, "side"));
            else if (/^(cuisson|cooking|garstufe|cocci[oó]n)\s*:/i.test(raw)) acc.cooking.push(stripDetailPrefix(raw, "cooking"));
            else if (/^(supplements?|extras?|suplementos?)\s*:/i.test(raw)) acc.extras.push(stripDetailPrefix(raw, "extra"));
            return acc;
          }
          const optionRec = entry as Record<string, unknown>;
          const kind = String(optionRec.kind || optionRec.type || optionRec.key || optionRec.group || optionRec.category || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
          const values = flattenChoiceTexts(
            optionRec.values ??
              optionRec.value ??
              optionRec.selection ??
              optionRec.selected ??
              optionRec.choice ??
              optionRec.option ??
              optionRec
          );
          if (/(side|accompagnement|acomp|beilage)/.test(kind)) acc.side.push(...values.map((v) => stripDetailPrefix(v, "side")));
          else if (/(cooking|cuisson|garstufe|cocc)/.test(kind)) acc.cooking.push(...values.map((v) => stripDetailPrefix(v, "cooking")));
          else if (/(extra|supplement|suplemento)/.test(kind)) acc.extras.push(...values.map((v) => stripDetailPrefix(v, "extra")));
          return acc;
        },
        { side: [] as string[], cooking: [] as string[], extras: [] as string[] }
      );

      const sideValues = uniqueTexts(
        [
          ...flattenChoiceTexts(rec.side),
          ...flattenChoiceTexts(rec.accompaniment),
          ...flattenChoiceTexts(rec.accompagnement),
          ...flattenChoiceTexts(rec.accompaniments),
          ...flattenChoiceTexts(rec.accompagnements),
          ...flattenChoiceTexts(rec.side_dish),
          ...flattenChoiceTexts(rec.sideDish),
          ...optionValuesByKind.side,
        ].map((v) => stripDetailPrefix(v, "side"))
      );
      const cookingValues = uniqueTexts(
        [
          String(rec.cooking || "").trim(),
          String(rec.cuisson || "").trim(),
          String(item.selected_cooking_label_fr || "").trim(),
          String(item.selected_cooking_key || "").trim(),
          ...optionValuesByKind.cooking,
        ].map((v) => stripDetailPrefix(v, "cooking"))
      );
      const extraValues = uniqueTexts(
        [
          ...flattenChoiceTexts(rec.supplement),
          ...flattenChoiceTexts(rec.supplements),
          ...(Array.isArray(item.selected_extras)
            ? item.selected_extras.map((extra) => String(extra?.label_fr || "").trim()).filter(Boolean)
            : []),
          ...(Array.isArray(item.selectedExtras)
            ? item.selectedExtras.map((extra) => String(extra?.name || "").trim()).filter(Boolean)
            : []),
          ...optionValuesByKind.extras,
        ].map((v) => stripDetailPrefix(v, "extra"))
      );

      const parts: string[] = [];
      if (cookingValues.length > 0) parts.push(`Cuisson: ${cookingValues.join(", ")}`);
      if (sideValues.length > 0) parts.push(`Accompagnements: ${sideValues.join(", ")}`);
      if (extraValues.length > 0) parts.push(`Suppléments: ${extraValues.join(", ")}`);
      return parts.join(" | ");
    };

    const items = parseItems(order.items)
      .filter((item) => {
        if (mode === "drinks") return isDrink(item);
        if (mode === "foods") return !isDrink(item);
        return true;
      })
      .filter((item) => !isItemServed(item))
      .filter((item) => (itemVisibility === "pending_preparing" ? !isItemReady(item) : true));
    if (items.length === 0) return null;
    const foodItems = items.filter((item) => !isDrink(item));
    const drinkItems = items.filter((item) => isDrink(item));
    const itemProgress = summarizeItems(items);
    const isReadyCard = itemProgress.total > 0 && itemProgress.ready === itemProgress.total;
    const isReadyHighlighted = isReadyCard && !!readyAlertOrderIds[String(order.id)];
    const hasPartiallyReadyItems = !isReadyCard && itemProgress.ready > 0;
    const readyToneClass = isReadyCard
      ? "bg-green-100 border-green-500"
      : hasPartiallyReadyItems
        ? "bg-amber-50 border-amber-400"
        : "bg-white border-black";
    const buildItemDetailLine = (item: Item) => {
      const details = getOrderItemDetails(item);
      const instructionValues = uniqueTexts(
        [String(item.instructions || "").trim(), String(item.special_request || "").trim()]
          .map((value) =>
            String(value || "")
              .replace(/^details?\s*:\s*/i, "")
              .replace(/^commentaire cuisine\s*:\s*/i, "")
              .trim()
          )
          .filter(Boolean)
      );
      const parts = details ? [details] : [];
      instructionValues.forEach((value) => {
        const normalizedValue = normalizeLookupText(value);
        const alreadyIncluded = parts.some((part) => {
          const normalizedPart = normalizeLookupText(part);
          return normalizedPart.includes(normalizedValue) || normalizedValue.includes(normalizedPart);
        });
        if (!alreadyIncluded) parts.push(value);
      });
      const merged = uniqueTexts(parts);
      return merged.length > 0 ? `Détails: ${merged.join(" | ")}` : "";
    };
    const renderItemsSection = (sectionLabel: "Plats" | "Boissons", sectionItems: Item[]) => {
      if (sectionItems.length === 0) return null;
      const sectionProgress = summarizeItems(sectionItems);
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded border border-black bg-white px-2 py-1">
            <span className="text-xs font-black uppercase">{sectionLabel}</span>
            <span className="text-[11px] font-bold text-gray-700">
              {sectionProgress.ready}/{sectionProgress.total} prêts
            </span>
          </div>
          {sectionItems.map((item, idx) => {
            const detailsLine = buildItemDetailLine(item);
            const statusLabel = getItemStatusLabel(item);
            const statusClass = getItemStatusClass(item);
            return (
              <div key={`${sectionLabel}-${idx}-${String(item.dish_id ?? item.id ?? idx)}`} className="bg-gray-100 px-2 py-2 border border-gray-200">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-base">
                    <span className="bg-black text-white px-2 mr-2 rounded">{Number(item.quantity) || 1}x</span>
                    <span translate="no" className="notranslate">
                      {getOrderItemLabel(item)}
                    </span>
                  </div>
                  <span className={`mt-0.5 rounded border px-2 py-0.5 text-[10px] font-black uppercase ${statusClass}`}>
                    {statusLabel}
                  </span>
                </div>
                {detailsLine ? (
                  <div className="mt-1 text-xs italic text-gray-800 notranslate" translate="no">
                    {detailsLine}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <div
        key={`${order.id}-${mode}`}
        className={`${readyToneClass} border-2 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between transition-all ${
          isReadyHighlighted ? "ring-4 ring-green-400 animate-pulse bg-green-50" : ""
        }`}
      >
        <div className="flex items-start justify-between mb-3 border-b-2 border-black pb-2">
          <div>
            <div className="text-2xl font-black uppercase">
              T-{order.table_number ?? "?"}
              {resolvedCovers ? ` | 👥 ${resolvedCovers}` : ""}
            </div>
          </div>
          <div className="text-xs font-mono text-gray-500">#{String(order.id).slice(0, 4)}</div>
        </div>
        <div className="space-y-3 text-sm text-black">
          {mode !== "drinks" ? renderItemsSection("Plats", foodItems) : null}
          {mode !== "foods" ? renderItemsSection("Boissons", drinkItems) : null}
        </div>

        {actionLabel && actionHandler ? (
          <button
            onClick={actionHandler}
            className={`mt-4 w-full border-2 border-black py-3 text-base font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all ${actionColorClass}`}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    );
  };

  console.log("Current Orders:", orders);

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-black notranslate" translate="no" data-disable-client-ordering={disableClientOrderingEnabled ? "1" : "0"}>
      <h1 className="text-2xl font-bold mb-6 uppercase">Serveur</h1>
      {restaurantSettingsError ? (
        <div className="mb-4 rounded border-2 border-red-700 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
          {restaurantSettingsError}
        </div>
      ) : null}

      {pendingNotifications.length > 0 ? (
        <section className="mb-4 rounded border-2 border-black bg-white p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="font-black uppercase">Live Alerts ({pendingNotifications.length})</div>
            <div className="text-xs font-bold text-gray-600">Temps réel</div>
          </div>
          <div className="space-y-2">
            {pendingNotifications.map((notification) => {
              const type = String(notification.type || "").trim().toUpperCase();
              const isCuisine = type === "CUISINE";
              const tableLabel = String(notification.table_number || "").trim();
              const titleLabel = isCuisine ? "CUISINE" : `TABLE ${tableLabel || "?"}`;
              const detailLabel = String(notification.message || "Appel simple").trim() || "Appel simple";
              return (
                <div
                  key={`notif-${notification.id}`}
                  className={`flex items-center justify-between gap-3 border-2 p-2 ${
                    isCuisine ? "border-red-500 bg-red-50 animate-pulse" : "border-blue-300 bg-blue-50"
                  }`}
                >
                  <div>
                    <div className={`font-black ${isCuisine ? "text-red-700" : "text-blue-900"}`}>{titleLabel}</div>
                    <div className="text-sm font-semibold text-black">{detailLabel}</div>
                    <div className="text-xs text-gray-600">
                      {notification.created_at ? new Date(notification.created_at).toLocaleTimeString("fr-FR") : "-"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void markNotificationRead(notification.id)}
                    className="inline-flex items-center gap-2 border-2 border-black bg-green-700 px-3 py-2 text-sm font-black text-white"
                  >
                    <Check className="h-4 w-4" />
                    Marquer comme lu
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="mb-4 w-full overflow-x-auto whitespace-nowrap">
        <div className="inline-flex gap-2">
          {showNewOrderTab ? (
            <button onClick={() => setActiveTab("new-order")} className={`px-4 py-3 border-2 border-black font-black ${resolvedActiveTab === "new-order" ? "bg-black text-white" : "bg-white text-black"}`}>
              Prendre une commande
            </button>
          ) : null}
          <button onClick={() => setActiveTab("orders")} className={`relative px-4 py-3 border-2 border-black font-black ${resolvedActiveTab === "orders" ? "bg-black text-white" : "bg-white text-black"}`}>
            Commandes
            {hasReadyTabAlert && resolvedActiveTab !== "orders" ? <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse border border-black" /> : null}
          </button>
          <button onClick={() => setActiveTab("sessions")} className={`px-4 py-3 border-2 border-black font-black ${resolvedActiveTab === "sessions" ? "bg-black text-white" : "bg-white text-black"}`}>
            Ouvrir une table
          </button>
        </div>
      </div>

      {resolvedActiveTab === "new-order" ? (
        <section className="bg-white border-2 border-black rounded-lg p-4">
          <h2 className="text-lg font-bold mb-3">Nouvelle Commande (Saisie rapide)</h2>

          <div className="mb-4 flex flex-wrap items-end gap-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
              <label className="block text-sm font-bold mb-1">Numéro de table</label>
              <select
                value={selectedFastTableNumber}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setSelectedFastTableNumber(nextValue);
                  const tableNum = Number(nextValue);
                  const knownCovers = tableCoversByNumber.get(tableNum);
                  if (knownCovers) setFastCoversInput(String(knownCovers));
                }}
                className="h-12 w-40 border-2 border-black px-3 text-lg font-bold bg-white"
              >
                <option value="">Choisir</option>
                {tableSelectOptions.map((table) => (
                  <option key={table} value={table}>
                    Table {table}
                  </option>
                ))}
              </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Couverts</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFastCoversInput(String(Math.max(1, Number(fastCoversInput || 1) - 1)))}
                    className="h-12 w-10 border-2 border-black bg-white font-black text-lg"
                    aria-label="Diminuer les couverts"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    required
                    value={fastCoversInput}
                    onChange={(e) => setFastCoversInput(e.target.value)}
                    className="h-12 w-24 border-2 border-black px-2 text-lg font-bold bg-white text-center"
                    placeholder="Couverts"
                  />
                  <button
                    type="button"
                    onClick={() => setFastCoversInput(String(Math.max(1, Number(fastCoversInput || 0) + 1)))}
                    className="h-12 w-10 border-2 border-black bg-white font-black text-lg"
                    aria-label="Augmenter les couverts"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <div className="text-sm font-bold">Articles: {fastItemCount}</div>
            <div className="text-sm font-bold">Total: {fastTotal.toFixed(2)}&euro;</div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {categoriesForFastEntry.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => setSelectedCategory(category.key)}
                className={`px-4 py-2 border-2 border-black font-bold ${
                  effectiveSelectedFastCategoryKey === category.key ? "bg-black text-white" : "bg-white text-black"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="border-2 border-black rounded overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] bg-gray-100 border-b-2 border-black px-3 py-2 font-bold text-sm">
              <div>Produit</div>
              <div className="pr-4">Prix</div>
              <div className="text-center">Action</div>
            </div>
            {visibleFastEntryDishes.length === 0 ? <div className="px-3 py-3 text-sm">Aucun article.</div> : null}
            {visibleFastEntryDishes.map((dish) => {
              const dishId = String(dish.id);
              const linkedDishOptions =
                Array.isArray((dish as DishItem & { dish_options?: unknown }).dish_options)
                  ? (((dish as DishItem & { dish_options?: unknown }).dish_options as unknown[]) || [])
                  : [];
              console.log("Plat:", dish.name, "Options trouvées:", linkedDishOptions);
              const hasOptions =
                dishNeedsCooking(dish) ||
                parseDishProductOptions(dish).length > 0 ||
                parseDishExtras(dish).length > 0 ||
                linkedDishOptions.length > 0 ||
                dishIdsWithLinkedExtras.has(dishId) ||
                parseDishSideIds(dish).length > 0;
              return (
                <div key={dishId} className="grid grid-cols-[1fr_auto_auto] items-center px-3 py-2 border-t border-gray-200">
                  <div>
                    <div className="font-bold">{getDishName(dish)}</div>
                  </div>
                  <div className="pr-4 text-sm">{getDishPrice(dish).toFixed(2)}&euro;</div>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        void openOptionsModal(dish);
                      }}
                      className={`h-10 px-3 border-2 border-black text-xs font-bold ${hasOptions ? "bg-white" : "bg-gray-100"}`}
                    >
                      {hasOptions ? "Configurer" : "Ajouter"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded border-2 border-black p-3 max-h-56 overflow-y-auto">
            <h3 className="font-bold mb-2">Récapitulatif commande</h3>
            {fastLines.length === 0 ? <p className="text-sm text-gray-600">Aucune ligne.</p> : null}
            <div className="space-y-2">
              {fastLines.map((line) => (
                <div key={line.lineId} className="border border-gray-300 rounded p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">
                      {line.quantity}x {line.dishName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{(line.unitPrice * line.quantity).toFixed(2)}&euro;</span>
                      <button
                        type="button"
                        onClick={() => removeFastLine(line.lineId)}
                        className="px-2 py-1 text-xs font-bold border border-black bg-white"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                  {buildLineInstructions(line) ? (
                    <div className="mt-1 text-xs text-gray-700">{buildLineInstructions(line)}</div>
                  ) : null}
                  <div className="mt-2">
                    <label className="block text-xs font-bold mb-1">Commentaire cuisine</label>
                    <textarea
                      value={line.specialRequest}
                      onChange={(event) => updateLineKitchenComment(line.lineId, event.target.value)}
                      placeholder="Ex: sans oignons"
                      className="w-full border border-black px-2 py-1 text-xs"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmitFastOrder}
            disabled={fastLoading || fastLines.length === 0 || !selectedFastTableNumber.trim() || !normalizeCoversValue(fastCoversInput)}
            className="mt-4 w-full h-14 bg-green-700 text-white text-xl font-bold border-2 border-black disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <span className="inline-flex items-center gap-2">
              <Check className="h-5 w-5" />
              {fastLoading ? "ENVOI..." : "Valider la commande"}
            </span>
          </button>
          {fastMessage ? <p className="mt-2 text-sm font-semibold">{fastMessage}</p> : null}
        </section>
      ) : null}

      {resolvedActiveTab === "sessions" ? (
        <section className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-xl font-bold mb-4 uppercase bg-emerald-100 p-2 rounded">Disponibilité des tables</h2>
          <div className="grid grid-cols-1 gap-3 max-w-md">
            <input type="number" placeholder="Numéro de table" value={tableNumberInput} onChange={(e) => setTableNumberInput(e.target.value)} className="h-11 px-3 border-2 border-black bg-white text-black" />
            <input type="text" placeholder="Code PIN" value={pinInput} onChange={(e) => setPinInput(e.target.value)} className="h-11 px-3 border-2 border-black bg-white text-black" />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCoversInput(String(Math.max(1, Number(coversInput || 1) - 1)))}
                className="h-11 w-11 border-2 border-black bg-white font-black text-xl"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                placeholder="Nombre de couverts"
                value={coversInput}
                onChange={(e) => setCoversInput(e.target.value)}
                className="h-11 flex-1 px-3 border-2 border-black bg-white text-black"
              />
              <button
                type="button"
                onClick={() => setCoversInput(String(Math.max(1, Number(coversInput || 0) + 1)))}
                className="h-11 w-11 border-2 border-black bg-white font-black text-xl"
              >
                +
              </button>
            </div>
            <button onClick={handleSaveTable} disabled={saving} className="h-11 bg-green-700 text-white border-2 border-black font-black disabled:opacity-60">
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4" />
                {saving ? "Enregistrement..." : "Valider"}
              </span>
            </button>
            {message ? <p className="text-sm font-semibold">{message}</p> : null}
          </div>

          <div className="mt-6">
            <h3 className="text-base font-bold mb-2 uppercase">État des tables (1 à {configuredTotalTables})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tableSlots.map((slot) => (
                <div
                  key={`table-slot-${slot.tableNumber}`}
                  className={`border-2 border-black p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-2 ${
                    slot.isOccupied ? "bg-red-100" : "bg-green-100"
                  }`}
                >
                  <div className="font-bold text-sm">
                    TABLE {slot.tableNumber} | {slot.isOccupied ? "Occupée" : "Libre"}
                    {slot.isOccupied ? ` | PIN: ${String(slot.row?.pin_code || "")}` : ""}
                    {slot.isOccupied
                      ? (() => {
                          const covers = readCoversFromRow((slot.row || null) as unknown as Record<string, unknown>);
                          return covers ? ` | 👥 ${covers}` : "";
                        })()
                      : ""}
                  </div>
                  {slot.isOccupied && slot.row ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => fillFormForEdit(slot.row as TableAssignment)} className="px-3 py-1 border-2 border-black bg-white font-black text-xs">
                        Modifier
                      </button>
                      <button onClick={() => handleDeleteTable(slot.row as TableAssignment)} className="px-3 py-1 border-2 border-black bg-red-700 text-white font-black text-xs">
                        Fermer la Table
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

        </section>
      ) : null}

      {resolvedActiveTab === "orders" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <section className="bg-amber-50 border-2 border-amber-300 p-4">
            <h2 className="text-xl font-bold mb-4 uppercase bg-amber-100 p-2 rounded">En préparation</h2>
            <div className="space-y-2">
              {preparingOrders.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Aucune commande en préparation.</p>
              ) : (
                preparingOrders.map((order) => renderOrderCard(order, "all", undefined, undefined, undefined, "pending_preparing"))
              )}
            </div>
          </section>

          <section className="bg-green-50 border-2 border-green-300 p-4">
            <h2 className="text-xl font-bold mb-4 uppercase bg-green-100 p-2 rounded">Prêt</h2>
            <div className="space-y-2">
              {readyOrders.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Aucune commande prête.</p>
              ) : (
                readyOrders.map((order) => {
                  const readyEntries = getReadyItemEntries(order);
                  if (readyEntries.length === 0) return null;
                  const covers =
                    normalizeCoversValue((order as unknown as Record<string, unknown>).covers) ??
                    normalizeCoversValue((order as unknown as Record<string, unknown>).guest_count) ??
                    normalizeCoversValue((order as unknown as Record<string, unknown>).customer_count) ??
                    tableCoversByNumber.get(Number(order.table_number)) ??
                    null;
                  return (
                    <div
                      key={`ready-items-${order.id}`}
                      className="border-2 border-green-500 bg-white p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <div className="mb-2 flex items-center justify-between border-b-2 border-black pb-2">
                        <div className="text-xl font-black uppercase">
                          T-{order.table_number ?? "?"}
                          {covers ? ` | 👥 ${covers}` : ""}
                        </div>
                        <div className="text-xs font-mono text-gray-500">#{String(order.id).slice(0, 4)}</div>
                      </div>
                      <div className="space-y-2">
                        {readyEntries.map(({ item, index }) => (
                          <div key={`ready-line-${order.id}-${index}`} className="border border-gray-300 bg-green-50 p-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-bold text-sm">
                                <span className="bg-black text-white px-2 mr-2 rounded">{Number(item.quantity) || 1}x</span>
                                <span className="notranslate" translate="no">
                                  {resolveOrderItemLabel(item)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => void handleServeItem(String(order.id), index)}
                                className="border-2 border-black bg-yellow-400 px-2 py-1 text-xs font-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                              >
                                MARQUER SERVI
                              </button>
                            </div>
                            {String(item.instructions || "").trim() ? (
                              <div className="mt-1 text-xs italic text-gray-700 notranslate" translate="no">
                                {String(item.instructions || "").trim()}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="bg-emerald-50 border-2 border-emerald-300 p-4">
            <h2 className="text-xl font-bold mb-4 uppercase bg-emerald-100 p-2 rounded">Statut des Tables</h2>
            <div className="space-y-2">
              {tableStatusRows.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Aucune table active.</p>
              ) : (
                tableStatusRows.map((row) => (
                  <div key={`table-status-${row.tableNumber}`} className="border border-emerald-300 bg-white p-3 rounded">
                    <div className="font-bold">
                      {row.allServed
                        ? `Table ${row.tableNumber} est en train de manger`
                        : `Table ${row.tableNumber} attend sa commande`}
                    </div>
                    <div className="mt-1 text-xs text-gray-700">
                      {row.allServed ? `Commandes servies : ${row.count}` : `Commandes en cours : ${row.count}`}
                    </div>
                    {!row.allServed && row.waitingMinutes != null ? (
                      <div className="mt-1 text-sm font-black text-orange-700">Attente : {row.waitingMinutes} min</div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}

      {modalOpen && modalDish ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border-2 border-black rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-black">Options - {getDishName(modalDish)}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="h-9 w-9 border-2 border-black font-black">&times;</button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-black">Quantité</span>
              <button type="button" onClick={() => setModalQty((prev) => Math.max(1, prev - 1))} className="h-9 w-9 border-2 border-black font-black">-</button>
              <span className="min-w-8 text-center font-black text-lg">{modalQty}</span>
              <button type="button" onClick={() => setModalQty((prev) => prev + 1)} className="h-9 w-9 border-2 border-black font-black">+</button>
            </div>

            <div className="mb-3 text-sm font-bold">
              {(() => {
                const basePrice = getDishPrice(modalDish);
                const selectedOption =
                  modalProductOptions.find((option) => String(option.id) === String(modalSelectedProductOptionId)) || null;
                const optionPrice = parsePriceNumber(selectedOption?.price ?? 0);
                const extrasPrice = modalSelectedExtras.reduce((sum, extra) => sum + parsePriceNumber(extra.price), 0);
                const unitTotal = basePrice + optionPrice + extrasPrice;
                const lineTotal = unitTotal * modalQty;
                if (optionPrice > 0 || extrasPrice > 0) {
                  return `Prix: ${basePrice.toFixed(2)}\u20AC + option ${optionPrice.toFixed(2)}\u20AC + suppléments ${extrasPrice.toFixed(2)}\u20AC = ${unitTotal.toFixed(2)}\u20AC (x${modalQty} = ${lineTotal.toFixed(2)}\u20AC)`;
                }
                return `Prix: ${unitTotal.toFixed(2)}\u20AC (x${modalQty} = ${lineTotal.toFixed(2)}\u20AC)`;
              })()}
            </div>

            {modalProductOptions.length > 0 ? (
              <div className="mb-3">
                {(() => {
                  const optionRequired = isProductOptionSelectionRequired(modalDish, modalProductOptions);
                  return (
                    <>
                      <div className="font-black mb-1">
                        Options / Variantes{" "}
                        {optionRequired ? <span className="text-red-700 text-xs">(Obligatoire)</span> : <span className="text-gray-500 text-xs">(Facultatif)</span>}
                      </div>
                      <div className="space-y-1">
                        {!optionRequired ? (
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name="modal-product-option"
                              checked={!modalSelectedProductOptionId}
                              onChange={() => setModalSelectedProductOptionId("")}
                            />
                            <span>Aucune option</span>
                          </label>
                        ) : null}
                        {modalProductOptions.map((option) => {
                          const checked = String(modalSelectedProductOptionId) === String(option.id);
                          const optionPrice = parsePriceNumber(option.price);
                          return (
                            <label key={option.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name="modal-product-option"
                                checked={checked}
                                onChange={() => setModalSelectedProductOptionId(String(option.id))}
                              />
                              <span>
                                {option.name}
                                {optionPrice > 0 ? ` (+${optionPrice.toFixed(2)}\u20AC)` : ""}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : null}

            {modalSideChoices.length > 0 ? (
              <div className="mb-3">
                {(() => {
                  const sideRequired = isSideSelectionRequired(modalDish, modalSideChoices);
                  const selectedSide = modalSelectedSides[0] || "";
                  return (
                    <>
                      <div className="font-black mb-1">
                        Accompagnements{" "}
                        {sideRequired ? (
                          <span className="text-red-700 text-xs">(Obligatoire)</span>
                        ) : (
                          <span className="text-gray-500 text-xs">(Facultatif)</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {!sideRequired ? (
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name="modal-side-option"
                              checked={!selectedSide}
                              onChange={() => setModalSelectedSides([])}
                            />
                            <span>Aucun accompagnement</span>
                          </label>
                        ) : null}
                        {modalSideChoices.map((side) => {
                          const checked = selectedSide === side;
                          return (
                            <label key={side} className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name="modal-side-option"
                                checked={checked}
                                onChange={() => setModalSelectedSides([side])}
                              />
                              <span>{side}</span>
                            </label>
                          );
                        })}
                      </div>
                      {!sideRequired ? (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setModalSelectedSides([])}
                            className="border-2 border-black bg-gray-100 px-3 py-2 text-sm font-bold text-black"
                          >
                            Réinitialiser
                          </button>
                        </div>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            ) : null}

            {modalExtraChoices.length > 0 ? (
              <div className="mb-3">
                <div className="font-black mb-1">Suppléments</div>
                <div className="space-y-1">
                  {modalExtraChoices.map((extra) => {
                    const key = `${extra.name}-${extra.price}`;
                    const checked = modalSelectedExtras.some((value) => `${value.name}-${value.price}` === key);
                    return (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setModalSelectedExtras((prev) => [...prev, extra]);
                            } else {
                              setModalSelectedExtras((prev) =>
                                prev.filter((value) => `${value.name}-${value.price}` !== key)
                              );
                            }
                          }}
                        />
                        <span>
                          {extra.name}
                          {parsePriceNumber(extra.price) > 0 ? ` (+${parsePriceNumber(extra.price).toFixed(2)}\u20AC)` : ""}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mb-3">
              {modalDish && dishNeedsCooking(modalDish) ? (
                <>
                  <label className="block font-black mb-1">Cuisson</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {COOKING_CHOICES.map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => setModalCooking((prev) => (prev === choice ? "" : choice))}
                        className={`border-2 border-black px-2 py-2 text-sm font-bold ${
                          modalCooking === choice ? "bg-black text-white" : "bg-white text-black"
                        }`}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              <label className="block font-black mb-1">Commentaire cuisine</label>
              <textarea
                value={modalKitchenComment}
                onChange={(event) => setModalKitchenComment(event.target.value)}
                placeholder="Ex: sans oignons"
                className="w-full border-2 border-black px-3 py-2"
                rows={3}
              />
            </div>

            <button type="button" onClick={handleAddOptionLine} className="w-full h-12 bg-black text-white border-2 border-black font-black">
              Ajouter avec options
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Chargement de l'administration...</div>}>
      <AdminContent />
    </Suspense>
  );
}
