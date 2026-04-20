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
const FORMULAS_CATEGORY_KEY = "__formulas__";
const FORMULA_DIRECT_SEND_SEQUENCE = 4;

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
    tableInvalid: "Num\u00E9ro de table invalide.",
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
  destination?: string | null;
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
  is_formula?: boolean | null;
  formula_id?: string | number | null;
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
  service_step?: string | null;
  current_step?: number | null;
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
  destination?: string | null;
};

type DishItem = {
  id: string | number;
  name?: string | null;
  nom?: string | null;
  image_url?: string | null;
  formulaImage?: string | null;  // NEW: for formula display image
  description?: string | null;
  description_fr?: string | null;
  description_en?: string | null;
  description_es?: string | null;
  description_de?: string | null;
  name_fr?: string | null;
  formulaName?: string | null;   // NEW: formula display name
  category_id?: string | number | null;
  category?: string | null;
  categorie?: string | null;
  price?: number | string | null;
  formula_price?: number | string | null;
  formulaPrice?: number | null;  // NEW: computed formula price
  is_formula?: boolean | null;
  formula_category_ids?: Array<string | number> | string | null;
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

type FormulaSelection = {
  categoryId: string;
  categoryLabel: string;
  dishId: string;
  dishName: string;
  destination?: "cuisine" | "bar";
  sequence?: number | null;
  selectedSideIds?: string[];
  selectedSides?: string[];
  selectedCooking?: string;
  selectedOptionIds?: string[];
  selectedOptionNames?: string[];
  selectedOptionPrice?: number;
};

type FormulaSelectionDetails = {
  selectedSideIds: string[];
  selectedSides: string[];
  selectedCooking: string;
  selectedProductOptionIds: string[];
};

type FormulaDishLink = {
  formulaDishId: string;
  dishId: string;
  sequence: number | null;
  step?: number | null;
  isMain?: boolean;
  defaultProductOptionIds?: string[];
  formulaName?: string;
  formulaImageUrl?: string;
};

type FormulaDisplay = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  dishId?: string;
  formulaCategoryIds?: string[];
  selectedDishIds?: string[];
  dishSteps?: Record<string, number>;
  defaultOptionIdsByDishId?: Record<string, string[]>;
  formulaLinks: FormulaDishLink[];
};

type FastOrderLine = {
  lineId: string;
  dishId: string;
  dishName: string;
  category: string;
  categoryId: string | number | null;
  destination?: "cuisine" | "bar";
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
  isFormula?: boolean;
  formulaDishId?: string;
  formulaDishName?: string;
  formulaUnitPrice?: number;
  formulaSelections?: FormulaSelection[];
};

const DISH_SELECT_BASE =
  "id,name,price,category_id,restaurant_id,is_formula,formula_config";
const DISH_SELECT_WITH_OPTIONS = `${DISH_SELECT_BASE}`;

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
  const explicitDestination = String(item?.destination || "").trim().toLowerCase();
  if (explicitDestination === "bar") return true;
  if (explicitDestination === "cuisine") return false;
  if (item?.is_drink === true) return true;
  const c = getCategory(item);
  return ["boisson", "boissons", "vin", "vins", "bar", "drink", "drinks", "wine", "wines", "beverage", "beverages"].includes(c);
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
  if (isItemServed(item)) return "Servi";
  const status = getItemPrepStatus(item);
  if (status === "ready") return "Pr\u00eat";
  if (status === "preparing") return "En pr\u00e9paration";
  return "En attente";
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
  const [activeTab, setActiveTab] = useState<"orders" | "sessions" | "new-order" | "service">("orders");

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

const [formulaLinksByFormulaId, setFormulaLinksByFormulaId] = useState<Map<string, FormulaDishLink[]>>(new Map());
  const [formulaLinksByDishId, setFormulaLinksByDishId] = useState<Map<string, FormulaDishLink[]>>(new Map());
  const [formulaDisplayById, setFormulaDisplayById] = useState<Map<string, { name?: string; imageUrl?: string }>>(new Map());
  const [formulaDishIdsFromLinks, setFormulaDishIdsFromLinks] = useState<Set<string>>(new Set());
  const [formulaDisplays, setFormulaDisplays] = useState<FormulaDisplay[]>([]);
  // const [formulaDishIdsFromFormulasTable, setFormulaDishIdsFromFormulasTable] = useState<Set<string>>(new Set());
  const [formulaPriceByDishId, setFormulaPriceByDishId] = useState<Map<string, number>>(new Map());
// const [, setFormulasTableAvailable] = useState<boolean | null>(null);

  const [formulaModalOpen, setFormulaModalOpen] = useState(false);
  const [formulaModalDish, setFormulaModalDish] = useState<DishItem | null>(null);
  const [formulaModalSourceDish, setFormulaModalSourceDish] = useState<DishItem | null>(null);
  const [formulaModalSelections, setFormulaModalSelections] = useState<Record<string, string>>({});
  const [formulaModalSelectionDetails, setFormulaModalSelectionDetails] = useState<Record<string, FormulaSelectionDetails>>({});
  const [formulaModalError, setFormulaModalError] = useState("");
  const [formulaModalItemDetailsOpen, setFormulaModalItemDetailsOpen] = useState<Record<string, boolean>>({});
  const [formulaResolvedDishById, setFormulaResolvedDishById] = useState<Record<string, DishItem>>({});
  const [formulaOptionModalState, setFormulaOptionModalState] = useState<{ categoryId: string; dishId: string } | null>(null);
  const [readyAlertOrderIds, setReadyAlertOrderIds] = useState<Record<string, boolean>>({});
  const [hasReadyTabAlert, setHasReadyTabAlert] = useState(false);
  const [sendingNextStepOrderIds, setSendingNextStepOrderIds] = useState<Record<string, boolean>>({});
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
    false && console.error("TRACE_SQL_TOTAL:", error);
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

      const scopedQuery = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", currentRestaurantId)
        .order("created_at", { ascending: true });

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
    const { data, error } = await query;

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
    const { data, error } = await supabase
      .from("table_assignments")
      .select("*")
      .eq("restaurant_id", currentRestaurantId)
      .order("table_number", { ascending: true });
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
    const names = new Set<string>(
      dishes
        .filter((dish) => {
          const record = dish as unknown as { restaurant_id?: unknown; active?: unknown };
          const scopedId = String(record.restaurant_id || "").trim();
          if (scopedId && scopedId !== currentRestaurantId) return false;
          if (record.active == null) return true;
          return readBooleanFlag(record.active, true);
        })
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
      false && console.error("TRACE_SQL_TOTAL:", error);
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

  const dishById = useMemo(() => {
    const map = new Map<string, DishItem>();
    dishes.forEach((dish) => {
      const key = String(dish.id || "").trim();
      if (key) map.set(key, dish);
    });
    return map;
  }, [dishes]);

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

  const sideLabelById = useMemo(() => {
    const map = new Map<string, string>();
    sidesLibrary.forEach((side) => {
      const label =
        String(side.name_fr || "").trim() ||
        String(side.name_en || "").trim() ||
        String(side.name_es || "").trim() ||
        String(side.name_de || "").trim() ||
        String(side.id || "").trim();
      const key = String(side.id || "").trim();
      if (key && label) map.set(key, label);
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
    return (
      String(dish.name || "").trim() ||
      String(dish.name_fr || "").trim() ||
      String(dish.nom || "").trim() ||
      "[Plat sans nom]"
    );
  };

  const getDishPrice = (dish: DishItem) => {
    return parsePriceNumber(dish.price);
  };

const getFormulaPackPrice = (dish: DishItem) => {
  // NEW: Prioritize formulaDisplays price
  const formulaDisplay = formulaDisplays.find(fd => String(fd.id) === String(dish.id));
  if (formulaDisplay && Number.isFinite(formulaDisplay.price) && formulaDisplay.price > 0) {
    return formulaDisplay.price;
  }
  
  const formulaId = String(dish.id || "").trim();
  const formulaTablePrice = formulaPriceByDishId.get(formulaId);
  if (Number.isFinite(formulaTablePrice) && Number(formulaTablePrice) > 0) {
    return Number(Number(formulaTablePrice).toFixed(2));
  }
  const formulaPrice = parsePriceNumber((dish as unknown as { formula_price?: unknown }).formula_price);
  if (Number.isFinite(formulaPrice) && formulaPrice > 0) return formulaPrice;
  const formulaDisplayPrice = (dish as any).formulaPrice;
  if (Number.isFinite(formulaDisplayPrice) && formulaDisplayPrice > 0) return formulaDisplayPrice;
  const regularPrice = parsePriceNumber(dish.price);
  return Number.isFinite(regularPrice) && regularPrice > 0 ? regularPrice : 0;
};

const getFormulaDisplayName = (dish: DishItem) => {
  // NEW: Prioritize formulaDisplays name
  const formulaDisplay = formulaDisplays.find(fd => String(fd.id) === String(dish.id));
  if (formulaDisplay && formulaDisplay.name) {
    return formulaDisplay.name;
  }
  
  const formulaId = String(dish.id || "").trim();
  const display = formulaDisplayById.get(formulaId);
  return String((dish as any).formulaName || display?.name || "").trim() || getDishName(dish);
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
  const resolveDishDestination = (dish: DishItem | null | undefined): "cuisine" | "bar" => {
    if (!dish) return "cuisine";
    const categoryId = String(dish.category_id || "").trim();
    if (categoryId) {
      const category = categoryById.get(categoryId);
      const destination = String(category?.destination || "").trim().toLowerCase();
      if (destination === "bar") return "bar";
      if (destination === "cuisine" || destination === "kitchen") return "cuisine";
    }
    const categoryLabel = getDishCategoryLabel(dish);
    return isDrink({ category: categoryLabel, destination: null }) ? "bar" : "cuisine";
  };
  const resolveDestinationForCategory = (
    categoryId: unknown,
    fallbackCategoryLabel = ""
  ): "cuisine" | "bar" => {
    const normalizedCategoryId = String(categoryId || "").trim();
    if (normalizedCategoryId) {
      const category = categoryById.get(normalizedCategoryId);
      const destination = String(category?.destination || "").trim().toLowerCase();
      if (destination === "bar") return "bar";
      if (destination === "cuisine" || destination === "kitchen") return "cuisine";
    }
    return isDrink({ category: fallbackCategoryLabel, destination: null }) ? "bar" : "cuisine";
  };
  const normalizeFormulaStepValue = (value: unknown, allowZero = false) => {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return null;
    const truncated = Math.trunc(raw);
    if (allowZero && truncated === 0) return 0;
    if (truncated <= 0) return null;
    return Math.max(1, truncated);
  };
  const isDirectFormulaSequence = (value: unknown) => {
    const asText = normalizeLookupText(value);
    if (asText.includes("direct")) return true;
    const raw = Number(value);
    if (!Number.isFinite(raw)) return false;
    const sequence = Math.trunc(raw);
    if (sequence === 0) return true;
    if (sequence < 0) return false;
    return Math.max(1, sequence) >= FORMULA_DIRECT_SEND_SEQUENCE;
  };
  const mapSequenceToOrderStep = (value: unknown) => {
    const sequence = normalizeFormulaStepValue(value, true);
    if (sequence == null) return null;
    if (isDirectFormulaSequence(sequence)) return 0;
    if (sequence <= 1) return 1;
    if (sequence === 2) return 2;
    return 3;
  };
  const resolveOrderStepForPayloadItem = (item: Record<string, unknown>) => {
    const explicit = mapSequenceToOrderStep(
      item.step ?? item.sequence ?? item.formula_current_sequence ?? item.formulaCurrentSequence
    );
    if (explicit != null) return explicit;
    const destination = String(item.destination || "").trim().toLowerCase();
    if (destination === "bar") return 0;
    const categoryId = item.category_id ?? item.categoryId ?? null;
    if (item.is_drink === true || isDrink(item as unknown as Item)) return 0;
    const resolvedDestination = resolveDestinationForCategory(categoryId, String(item.category || item.categorie || ""));
    if (resolvedDestination === "bar") return 0;
    const categoryLabel = normalizeLookupText(String(item.category || item.categorie || ""));
    if (/(entree|starter|appetizer)/.test(categoryLabel)) return 1;
    if (/(dessert|sweet|sucre|postre)/.test(categoryLabel)) return 3;
    return 2;
  };
  const normalizeFormulaItemsForOrderPayload = <T extends Record<string, unknown>>(items: T[]) => {
    const normalized = items.map((entry) => {
      const current = { ...entry } as T;
      const step = resolveOrderStepForPayloadItem(current as Record<string, unknown>);
      const currentRecord = current as Record<string, unknown>;
      currentRecord.step = step;
      currentRecord.sequence = step;
      return current;
    });

    const byFormulaInstance = new Map<string, number[]>();
    normalized.forEach((entry, index) => {
      const record = entry as Record<string, unknown>;
      const formulaDishId = String(
        record.formula_dish_id ?? record.formulaDishId ?? record.formula_id ?? record.formulaId ?? ""
      ).trim();
      const isFormulaItem = readBooleanFlag(record.is_formula, false) || Boolean(formulaDishId);
      if (!isFormulaItem || !formulaDishId) return;
      const explicitInstance = String(record.formula_instance_id ?? record.formulaInstanceId ?? "").trim();
      const key = explicitInstance || formulaDishId;
      const list = byFormulaInstance.get(key) || [];
      list.push(index);
      byFormulaInstance.set(key, list);
    });

    byFormulaInstance.forEach((indexes) => {
      if (indexes.length === 0) return;
      const pickParentIndex = () => {
        for (const index of indexes) {
          const rec = normalized[index] as Record<string, unknown>;
          if (readBooleanFlag(rec.is_formula_parent ?? rec.isFormulaParent, false)) return index;
        }
        for (const index of indexes) {
          const rec = normalized[index] as Record<string, unknown>;
          if (readBooleanFlag(rec.is_main ?? rec.isMain, false)) return index;
        }
        for (const index of indexes) {
          const rec = normalized[index] as Record<string, unknown>;
          if (parsePriceNumber(rec.price) > 0 || parsePriceNumber(rec.formula_unit_price) > 0) return index;
        }
        return indexes[0];
      };
      const parentIndex = pickParentIndex();
      const parent = normalized[parentIndex] as Record<string, unknown>;
      const parentUnitPrice =
        parsePriceNumber(parent.price) > 0 ? parsePriceNumber(parent.price) : parsePriceNumber(parent.formula_unit_price);
      parent.is_formula = true;
      parent.is_formula_parent = true;
      parent.price = parentUnitPrice;
      parent.base_price = parentUnitPrice;
      parent.unit_total_price = parentUnitPrice;
      parent.formula_unit_price = parentUnitPrice;

      indexes.forEach((index) => {
        if (index === parentIndex) return;
        const child = normalized[index] as Record<string, unknown>;
        child.is_formula = true;
        child.is_formula_parent = false;
        child.price = 0;
        child.base_price = 0;
        child.unit_total_price = 0;
        child.formula_unit_price = 0;
      });
    });

    return normalized;
  };
  const resolveInitialCurrentStepFromItems = (items: Array<Record<string, unknown>>) => {
    const values = items
      .map((item) => Number(item.step))
      .filter((value) => Number.isFinite(value))
      .map((value) => Math.trunc(value));
    const positive = values.filter((value) => value > 0);
    if (positive.length > 0) return Math.min(...positive);
    return 0;
  };
  const resolveLegacyServiceStepFromCurrentStep = (currentStep: number) => {
    if (currentStep >= 3) return "dessert";
    if (currentStep <= 1) return "entree";
    return "plat";
  };
  const resolveFormulaSelectionDestination = (
    selection: Pick<FormulaSelection, "sequence" | "destination" | "categoryId" | "categoryLabel">,
    dish: DishItem | null | undefined
  ): "cuisine" | "bar" => {
    if (isDirectFormulaSequence(selection.sequence)) return "bar";
    const explicit = String(selection.destination || "").trim().toLowerCase();
    if (explicit === "bar") return "bar";
    if (explicit === "cuisine" || explicit === "kitchen") return "cuisine";
    if (dish) return resolveDishDestination(dish);
    return resolveDestinationForCategory(selection.categoryId, selection.categoryLabel || "");
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

  const SERVICE_STEP_SEQUENCE = ["entree", "plat", "dessert"] as const;
  const SERVICE_STEP_LABELS: Record<string, string> = {
    entree: "ENTRÉE",
    plat: "PLAT",
    dessert: "DESSERT",
  };
  const normalizeServiceStep = (value: unknown) => {
    const normalized = normalizeCategoryKey(value);
    if (["entree", "starter", "appetizer"].includes(normalized)) return "entree";
    if (["dessert", "sweet"].includes(normalized)) return "dessert";
    if (["plat", "main", "dish", "principal"].includes(normalized)) return "plat";
    return "";
  };
  const resolveCourseFromCategoryLabel = (value: unknown) => {
    const normalized = normalizeCategoryKey(value);
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
  const isFormulaOrderItem = (item: Item) => {
    const record = item as unknown as Record<string, unknown>;
    const isFormulaFlag = readBooleanFlag(record.is_formula, false);
    const formulaId = String(
      record.formula_id ?? record.formulaId ?? record.formula_dish_id ?? record.formulaDishId ?? ""
    ).trim();
    return isFormulaFlag || Boolean(formulaId);
  };
  const resolveFormulaSequenceListForItem = (item: Item) => {
    const record = item as unknown as Record<string, unknown>;
    const values: number[] = [];
    const pushSequence = (value: unknown) => {
      const normalized = normalizeFormulaStepValue(value, true);
      if (normalized == null || normalized <= 0) return;
      values.push(normalized);
    };
    pushSequence(record.step ?? record.sequence ?? record.formula_current_sequence ?? record.formulaCurrentSequence);
    const sources = [
      record.formula_items,
      record.formulaItems,
      record.selected_options,
      record.selectedOptions,
      record.options,
    ];
    sources.forEach((source) => {
      parseFormulaEntryList(source).forEach((entry) => {
        const kind = normalizeLookupText(entry.kind ?? entry.type ?? entry.group ?? "");
        const isFormulaEntry =
          kind === "formula" ||
          kind.includes("formula") ||
          entry.formula_dish_id != null ||
          entry.sequence != null;
        if (!isFormulaEntry) return;
        pushSequence(entry.step ?? entry.sequence ?? entry.service_step_sequence);
      });
    });
    return Array.from(new Set(values)).sort((a, b) => a - b);
  };
  const resolveCurrentFormulaSequenceForItem = (item: Item) => {
    const record = item as unknown as Record<string, unknown>;
    const directCurrent = normalizeFormulaStepValue(
      record.step ?? record.sequence ?? record.formula_current_sequence ?? record.formulaCurrentSequence,
      true
    );
    if (directCurrent != null && directCurrent > 0) return directCurrent;
    const sequences = resolveFormulaSequenceListForItem(item);
    if (sequences.length === 0) return null;
    return sequences[0];
  };
  const resolveNextFormulaSequenceForItem = (item: Item) => {
    const currentSequence = resolveCurrentFormulaSequenceForItem(item);
    if (!Number.isFinite(currentSequence)) return null;
    const sequences = resolveFormulaSequenceListForItem(item);
    return sequences.find((sequence) => sequence > Number(currentSequence)) || null;
  };
  const resolveFormulaEntryForSequence = (item: Item, sequence: number) => {
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
        const normalizedSequence = Math.max(1, Math.trunc(rawSequence));
        if (normalizedSequence === sequence) return entry;
      }
    }
    return null;
  };
  const resolveItemCourse = (item: Item) => {
    const currentFormulaSequence = resolveCurrentFormulaSequenceForItem(item);
    if (Number.isFinite(currentFormulaSequence) && Number(currentFormulaSequence) > 0) {
      const fromSequence = resolveCourseFromSequence(currentFormulaSequence);
      if (fromSequence) return fromSequence;
    }
    const record = item as unknown as Record<string, unknown>;
    const dishData = (record.dish ?? null) as Record<string, unknown> | null;
    const itemCategoryId = String(record.category_id ?? record.categoryId ?? "").trim();
    const dishCategoryId =
      itemCategoryId ||
      String(
        dishData?.category_id ?? dishData?.categoryId ?? record.dish_id ?? record.id ?? ""
      ).trim();
    const categoryRow = dishCategoryId ? categoryById.get(String(dishCategoryId || "").trim()) : undefined;
    const categoryLabel = categoryRow ? getCategoryLabel(categoryRow) : String(record.categorie || record.category || "").trim();
    return resolveCourseFromCategoryLabel(categoryLabel);
  };
  const resolveItemCourses = (item: Item) => {
    const sequenceCourses = resolveFormulaSequenceListForItem(item)
      .map((sequence) => resolveCourseFromSequence(sequence))
      .filter(Boolean);
    if (sequenceCourses.length > 0) {
      return Array.from(new Set(sequenceCourses));
    }
    return [resolveItemCourse(item)];
  };
  const resolveOrderServiceStep = (order: Order, items: Item[]) => {
    const foodItems = items.filter((item) => !isDrink(item));
    if (foodItems.length === 0) return "";
    const availableSteps = new Set(foodItems.flatMap((item) => resolveItemCourses(item)));
    const normalized = normalizeServiceStep(order.service_step);
    if (normalized && availableSteps.has(normalized)) return normalized;
    const fallback = SERVICE_STEP_SEQUENCE.find((step) => availableSteps.has(step));
    return fallback || normalized || "";
  };
  const resolveNextServiceStep = (order: Order, items: Item[]) => {
    const foodItems = items.filter((item) => !isDrink(item));
    if (foodItems.length === 0) return "";
    const availableSteps = new Set(foodItems.flatMap((item) => resolveItemCourses(item)));
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

  const parseFormulaCategoryIds = (raw: unknown): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((entry) => String(entry || "").trim()).filter(Boolean);
    }
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((entry) => String(entry || "").trim()).filter(Boolean);
        }
      } catch {
        // ignore invalid json
      }
      return trimmed
        .replace(/[{}]/g, "")
        .split(",")
        .map((entry) => String(entry || "").trim())
        .filter(Boolean);
    }
    return [];
  };
  const parseFormulaOptionIds = (raw: unknown): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return Array.from(new Set(raw.map((entry) => String(entry || "").trim()).filter(Boolean)));
    }
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return Array.from(new Set(parsed.map((entry) => String(entry || "").trim()).filter(Boolean)));
        }
      } catch {
        // ignore invalid json
      }
      return Array.from(
        new Set(
          trimmed
            .replace(/[{}]/g, "")
            .split(",")
            .map((entry) => String(entry || "").trim())
            .filter(Boolean)
        )
      );
    }
    return [];
  };
  const parseFormulaStepsMap = (raw: unknown): Record<string, number> => {
    if (Array.isArray(raw)) {
      const map: Record<string, number> = {};
      raw.forEach((entry, index) => {
        const row =
          entry && typeof entry === "object" && !Array.isArray(entry)
            ? (entry as Record<string, unknown>)
            : {};
        const optionsRaw = Array.isArray(row.options)
          ? row.options
          : Array.isArray(row.dish_ids)
            ? row.dish_ids
            : [];
        optionsRaw
          .map((dishId) => String(dishId || "").trim())
          .filter(Boolean)
          .forEach((dishId) => {
            map[dishId] = index + 1;
          });
      });
      return map;
    }
    const source =
      typeof raw === "string"
        ? parseJsonObject(raw)
        : raw && typeof raw === "object" && !Array.isArray(raw)
          ? (raw as Record<string, unknown>)
          : null;
    if (!source) return {};
    return Object.fromEntries(
      Object.entries(source)
        .map(([dishId, step]) => [String(dishId || "").trim(), Math.max(1, Math.trunc(Number(step) || 1))])
        .filter(([dishId]) => Boolean(dishId))
    ) as Record<string, number>;
  };
  const parseFormulaDefaultOptionMap = (raw: unknown): Record<string, string[]> => {
    const source =
      typeof raw === "string"
        ? parseJsonObject(raw)
        : raw && typeof raw === "object" && !Array.isArray(raw)
          ? (raw as Record<string, unknown>)
          : null;
    if (!source) return {};
    return Object.fromEntries(
      Object.entries(source)
        .map(([dishId, optionIds]) => [String(dishId || "").trim(), parseFormulaOptionIds(optionIds)] as [string, string[]])
        .filter(([dishId]) => Boolean(dishId))
    );
  };

  const dishNeedsCooking = (dish: DishItem) => {
    const parsed = parseDescriptionOptions(getDishOptionsSource(dish));
    const record = dish as unknown as { ask_cooking?: unknown };
    const normalizedName = normalizeLookupText(getDishName(dish)).replace(/[^a-z0-9]+/g, " ");
    const normalizedDetails = normalizeLookupText(getDishOptionsSource(dish)).replace(/[^a-z0-9]+/g, " ");
    const hasCookingNameOverride =
      normalizedName.includes("cote de boeuf") || normalizedDetails.includes("cote de boeuf");
    return Boolean(record.ask_cooking || parsed.askCooking || hasCookingNameOverride);
  };

  const parseDishProductOptions = (dish: DishItem): ProductOptionChoice[] => {
    const record = dish as unknown as Record<string, unknown>;
    const directCandidates: unknown[] = [record.product_options, record.productOptions, record.variants, record.dish_options];
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

  const formulaUi = {
    title: "Composer la formule",
    subtitle: "Choisissez un plat par catégorie",
    noDishes: "Aucun plat disponible.",
    missing: "Veuillez choisir un plat pour chaque catégorie.",
    missingOptions: "Veuillez compléter les options obligatoires.",
  };
  const formulaItemDetailsLabel = "Détails";
  const formulaOptionsLabel = "Options / Variantes";
  const formulaOptionLockedLabel = "Supplément payant";

  const emptyFormulaSelectionDetails: FormulaSelectionDetails = {
    selectedSideIds: [],
    selectedSides: [],
    selectedCooking: "",
    selectedProductOptionIds: [],
  };

  const getFormulaSelectionDetails = (categoryId: string) => {
    return formulaModalSelectionDetails[categoryId] || emptyFormulaSelectionDetails;
  };

  const getFormulaDishConfig = (dish: DishItem) => {
    const selectedSideIdsRaw = parseDishSideIds(dish);
    const sideOptions = selectedSideIdsRaw
      .map((id) => sideLabelById.get(String(id)) || String(id))
      .filter(Boolean);
    const hasRequiredSides = Boolean(dish.has_sides) || sideOptions.length > 0;
    const maxSides = getSideMaxSelections(dish, sideOptions);
    const askCooking = dishNeedsCooking(dish);
    const productOptions = parseDishProductOptions(dish);
    return { sideOptions, hasRequiredSides, maxSides, askCooking, productOptions };
  };

  const formulaDefaultOptionsByDishId = useMemo(() => {
    const map = new Map<string, string[]>();
    const formulaDishId = String(formulaModalDish?.id || "").trim();
    if (!formulaDishId) return map;
    const links = formulaLinksByFormulaId.get(formulaDishId) || [];
    links.forEach((link) => {
      const dishId = String(link.dishId || "").trim();
      if (!dishId) return;
      const defaults = Array.isArray(link.defaultProductOptionIds) ? link.defaultProductOptionIds : [];
      if (defaults.length > 0) map.set(dishId, defaults);
    });
    return map;
  }, [formulaModalDish, formulaLinksByFormulaId]);

  const linkedFormulaCategoryIds = useMemo(() => {
    const formulaDishId = String(formulaModalDish?.id || "").trim();
    if (!formulaDishId) return [] as string[];
    const links = formulaLinksByFormulaId.get(formulaDishId) || [];
    if (links.length === 0) return [] as string[];
    const categoryIds = new Set<string>();
    links.forEach((link) => {
      const linkedDish = dishById.get(String(link.dishId || "").trim());
      const categoryId = String(linkedDish?.category_id || "").trim();
      if (categoryId) categoryIds.add(categoryId);
    });
    return [...categoryIds];
  }, [formulaModalDish, formulaLinksByFormulaId, dishById]);

  const normalizedFormulaCategoryIds = useMemo(() => {
    const parsedCategoryIds = parseFormulaCategoryIds(
      (formulaModalDish as unknown as { formula_category_ids?: unknown } | null)?.formula_category_ids
    );
    if (parsedCategoryIds.length > 0) return parsedCategoryIds;
    return linkedFormulaCategoryIds;
  }, [formulaModalDish, linkedFormulaCategoryIds]);

  const formulaCategories = useMemo(() => {
    if (normalizedFormulaCategoryIds.length === 0) return [] as CategoryItem[];
    return normalizedFormulaCategoryIds
      .map((id) => categoryById.get(String(id || "").trim()))
      .filter(Boolean) as CategoryItem[];
  }, [normalizedFormulaCategoryIds, categoryById]);

  const formulaLinkedOptionsByCategory = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const formulaDishId = String(formulaModalDish?.id || "").trim();
    if (!formulaDishId) return map;
    const links = formulaLinksByFormulaId.get(formulaDishId) || [];
    if (links.length === 0) return map;
    links.forEach((link) => {
      const dish = dishById.get(String(link.dishId || "").trim());
      if (!dish) return;
      const categoryId = String(dish.category_id || "").trim();
      if (!categoryId) return;
      const current = map.get(categoryId) || new Set<string>();
      current.add(String(dish.id || "").trim());
      map.set(categoryId, current);
    });
    return map;
  }, [formulaModalDish, formulaLinksByFormulaId, dishById]);

  const formulaOptionsByCategory = useMemo(() => {
    const map = new Map<string, DishItem[]>();
    if (formulaCategories.length === 0) return map;
    formulaCategories.forEach((category) => {
      const categoryId = String(category.id || "").trim();
      if (!categoryId) return;
      const linkedIds = formulaLinkedOptionsByCategory.get(categoryId);
      const restrictToLinked = linkedIds != null && linkedIds.size > 0;
      const baseOptions = dishes
        .filter((dish) => String(dish.category_id || "").trim() === categoryId)
        .filter((dish) => !readBooleanFlag((dish as unknown as { is_formula?: unknown }).is_formula))
        .filter((dish) => String(dish.id || "").trim() !== String(formulaModalDish?.id || "").trim());
      const filtered = restrictToLinked
        ? baseOptions.filter((dish) => linkedIds?.has(String(dish.id || "").trim()))
        : baseOptions;
      // Fallback: si les liens sont vides/cassés, on garde tous les plats de la catégorie.
      const resolvedOptions = restrictToLinked && filtered.length === 0 ? baseOptions : filtered;
      const filteredDishes = resolvedOptions.map((dish) => ({
        id: String(dish.id || "").trim(),
        name: String(dish.name_fr || dish.name || "").trim(),
      }));
      false && console.log("TRACE : Plats trouvés pour l'étape :", { categoryId, filteredDishes });
      const sourceDishId = String(formulaModalSourceDish?.id || "").trim();
      const sourceCategoryId = String(formulaModalSourceDish?.category_id || "").trim();
      if (sourceDishId && sourceCategoryId === categoryId) {
        const sourceDish = dishById.get(sourceDishId) || formulaModalSourceDish;
        if (sourceDish) {
          const exists = resolvedOptions.some((dish) => String(dish.id || "").trim() === sourceDishId);
          if (!exists) resolvedOptions.unshift(sourceDish);
        }
      }
      map.set(categoryId, resolvedOptions);
    });
    return map;
  }, [dishes, formulaCategories, formulaModalDish, formulaLinkedOptionsByCategory, formulaModalSourceDish, dishById]);

  const formulaSequenceByDishId = useMemo(() => {
    const map = new Map<string, number>();
    const formulaDishId = String(formulaModalDish?.id || "").trim();
    if (!formulaDishId) return map;
    const links = formulaLinksByFormulaId.get(formulaDishId) || [];
    links.forEach((link) => {
      const sequence = normalizeFormulaStepValue(link.step ?? link.sequence, true);
      if (sequence == null) return;
      const dishId = String(link.dishId || "").trim();
      if (!dishId) return;
      map.set(dishId, sequence);
    });
    return map;
  }, [formulaModalDish, formulaLinksByFormulaId]);

  const resolveFormulaDishRecord = (dish: DishItem | null | undefined) => {
    if (!dish) return null;
    const dishId = String(dish.id || "").trim();
    if (!dishId) return dish;
    return formulaResolvedDishById[dishId] || dish;
  };

  const formulaAddDisabled = (() => {
    if (!formulaModalDish) return false;
    const hasMissingCategory = normalizedFormulaCategoryIds.some((categoryId) => {
      const normalizedCategoryId = String(categoryId || "").trim();
      if (!normalizedCategoryId) return false;
      const options = formulaOptionsByCategory.get(normalizedCategoryId) || [];
      if (options.length === 0) return false;
      return !formulaModalSelections[normalizedCategoryId];
    });
    return hasMissingCategory;
  })();

  const formulaOptionModalCategoryId = String(formulaOptionModalState?.categoryId || "").trim();
  const formulaOptionModalDishId = String(formulaOptionModalState?.dishId || "").trim();
  const formulaOptionModalDish = formulaOptionModalDishId
    ? resolveFormulaDishRecord(dishById.get(formulaOptionModalDishId))
    : null;
  const formulaOptionModalConfig = formulaOptionModalDish ? getFormulaDishConfig(formulaOptionModalDish) : null;
  const formulaOptionModalDetails = formulaOptionModalCategoryId
    ? getFormulaSelectionDetails(formulaOptionModalCategoryId)
    : emptyFormulaSelectionDetails;
  const formulaOptionModalAllowMulti = Boolean(
    (formulaOptionModalDish as unknown as { allow_multi_select?: unknown } | null)?.allow_multi_select
  );
  const formulaOptionModalAvailableOptionIds = new Set(
    (formulaOptionModalConfig?.productOptions || [])
      .map((option) => String(option.id || "").trim())
      .filter(Boolean)
  );
  const formulaOptionModalDefaultOptionIds = (formulaOptionModalDishId
    ? formulaDefaultOptionsByDishId.get(formulaOptionModalDishId) || []
    : []
  ).filter((id) => formulaOptionModalAvailableOptionIds.has(String(id || "").trim()));
  const formulaOptionModalOpen = Boolean(
    formulaOptionModalCategoryId &&
      formulaOptionModalDishId &&
      formulaOptionModalDish &&
      formulaOptionModalConfig
  );

  const isFastOrderReadyToSend =
    selectedFastTableNumber.trim() !== "" && fastOptionLines.some((line) => line.quantity > 0);

  const resetFastOrder = () => {
    setFastQtyByDish({});
    setBaseLineComments({});
    setFastOptionLines([]);
    setFastMessage("");
  };

  const resetModal = () => {
    setModalDish(null);
    setModalQty(1);
    setModalSideChoices([]);
    setModalSelectedSides([]);
    setModalExtraChoices([]);
    setModalSelectedExtras([]);
    setModalCooking("");
    setModalKitchenComment("");
    setModalProductOptions([]);
    setModalSelectedProductOptionId("");
    setModalOpen(false);
  };

  const resetFormulaModal = () => {
    setFormulaModalOpen(false);
    setFormulaModalDish(null);
    setFormulaModalSourceDish(null);
    setFormulaModalSelections({});
    setFormulaModalSelectionDetails({});
    setFormulaModalError("");
    setFormulaModalItemDetailsOpen({});
    setFormulaResolvedDishById({});
  };

  const resetFormulaOptionModal = () => {
    setFormulaOptionModalState(null);
  };

  const updateActiveDishNamesFromOrders = (orders: Order[]) => {
    const names = new Set<string>();
    orders.forEach((order) => {
      parseItems(order.items).forEach((item) => {
        const dishName = String((item as { name?: string }).name || "").trim();
        if (dishName) names.add(dishName.toLowerCase());
      });
    });
    fetchActiveDishes();
  };

  const handleOrderUpdate = (payload: { new: Order }) => {
    const updatedOrder = payload.new;
    setOrders((currentOrders) => {
      const updatedId = String(updatedOrder?.id ?? "").trim();
      if (!updatedId) return currentOrders;
      const index = currentOrders.findIndex((o) => String(o.id ?? "").trim() === updatedId);
      if (index > -1) {
        const nextOrders = [...currentOrders];
        nextOrders[index] = updatedOrder;
        return nextOrders;
      }
      return [...currentOrders, updatedOrder];
    });
  };

  const handleNotification = (payload: { new: Record<string, unknown> }) => {
    const newNotification = normalizeNotificationRow(payload.new);
    if (!newNotification.id) return;
    const isPending = !newNotification.status || newNotification.status === "pending";
    if (isPending) {
      setServiceNotifications((current) => [newNotification, ...current]);
      playReadyNotificationBeep();
    }
  };

  const handleTableAssignmentUpdate = (payload: { new: TableAssignment }) => {
    const updated = payload.new;
    setActiveTables((current) => {
      const index = current.findIndex((t) => t.id === updated.id);
      const next = [...current];
      if (index > -1) {
        next[index] = updated;
      } else {
        next.push(updated);
      }
      return next.sort((a, b) => a.table_number - b.table_number);
    });
  };
  
  const handleNewOrderFromFastEntry = async () => {
    if (fastLoading || !isFastOrderReadyToSend) return;
  
    setFastLoading(true);
    setFastMessage("");
  
    try {
      const tableNumber = Number(selectedFastTableNumber.trim());
      if (!Number.isFinite(tableNumber) || tableNumber <= 0) {
        throw new Error(fastOrderText.tableInvalid);
      }
  
      const validLines = fastOptionLines.filter((line) => line.quantity > 0);
      if (validLines.length === 0) {
        throw new Error(fastOrderText.noValidItem);
      }
  
      const itemsForPayload = normalizeFormulaItemsForOrderPayload(
        validLines.flatMap<Record<string, unknown>>((line) => {
          const dish = dishById.get(String(line.dishId || ""));
          const base: Record<string, unknown> = {
            dish_id: line.dishId,
            name: line.dishName,
            quantity: line.quantity,
            price: line.unitPrice,
            category: line.category,
            category_id: line.categoryId,
            destination: line.destination,
            cooking: line.selectedCooking,
            side: line.selectedSides.join(", "),
            extras: line.selectedExtras,
            special_request: line.specialRequest,
            is_drink: line.isDrink,
          };

          if (line.isFormula && line.formulaSelections) {
            const formulaDish = dishById.get(String(line.formulaDishId || ""));
            const formulaPrice = getFormulaPackPrice(formulaDish as DishItem);
            const formulaDetails: Record<string, unknown> = {
              ...base,
              name: line.formulaDishName,
              is_formula: true,
              is_formula_parent: true,
              formula_id: line.formulaDishId,
              price: line.formulaUnitPrice,
              formula_unit_price: line.formulaUnitPrice,
              formula_items: line.formulaSelections.map((sel) => ({
                ...sel,
                kind: "formula",
                sequence: sel.sequence,
                step: sel.sequence,
              })),
            };
            const childItems = (line.formulaSelections || []).map((sel) => {
              const childDish = dishById.get(String(sel.dishId));
              return {
                dish_id: sel.dishId,
                name: sel.dishName,
                quantity: 1,
                price: 0, // Children have no price
                category: childDish ? getDishCategoryLabel(childDish) : sel.categoryLabel,
                category_id: sel.categoryId,
                destination: resolveDestinationForCategory(sel.categoryId, sel.categoryLabel),
                cooking: sel.selectedCooking,
                side: (sel.selectedSides || []).join(", "),
                is_formula: true,
                is_formula_parent: false,
                formula_id: line.formulaDishId,
                sequence: sel.sequence,
                step: sel.sequence,
              } as Record<string, unknown>;
            });

            const combined: Record<string, unknown>[] = [formulaDetails, ...childItems];
            // Repeat for quantity
            return Array.from({ length: line.quantity }, () => combined).flat();
          }

          return Array.from({ length: line.quantity }, () => base);
        }) as Record<string, unknown>[]
      );
      
      const covers = Number(fastCoversInput.trim()) || 1;
      const initialCurrentStep = resolveInitialCurrentStepFromItems(itemsForPayload);
      const initialServiceStep = resolveLegacyServiceStepFromCurrentStep(initialCurrentStep);
  
      const { error } = await supabase.from("orders").insert({
        restaurant_id: restaurantId,
        table_number: tableNumber,
        items: itemsForPayload,
        status: "pending",
        covers: covers > 1 ? covers : null,
        service_step: initialServiceStep || null,
        current_step: initialCurrentStep,
      });
  
      if (error) throw error;
  
      setFastMessage(fastOrderText.sent);
      resetFastOrder();
      fetchOrders();
      window.setTimeout(() => setFastMessage(""), 4000);
    } catch (error) {
      console.error("Erreur commande rapide:", error);
      const info = toErrorInfo(error);
      const text = hasUsefulError(info)
        ? `${info.message || ""}${info.details ? ` (${info.details})` : ""}`
        : fastOrderText.sendError;
      setFastMessage(text);
    } finally {
      setFastLoading(false);
    }
  };
  
  const handleOpenModal = (dish: DishItem) => {
    const dishId = String(dish.id || "").trim();
    if (!dishId) return;

    if (readBooleanFlag((dish as unknown as { is_formula?: unknown }).is_formula)) {
      setFormulaModalDish(dish);
      setFormulaModalSourceDish(dish);
      const selections: Record<string, string> = {};
      const details: Record<string, FormulaSelectionDetails> = {};
      
      const links = formulaLinksByFormulaId.get(dishId) || [];
      links.forEach(link => {
        const linkedDish = dishById.get(String(link.dishId).trim());
        if (!linkedDish) return;
        const categoryId = String(linkedDish.category_id).trim();
        if (!categoryId) return;
        
        selections[categoryId] = linkedDish.id as string;
        details[categoryId] = {
          selectedSideIds: [],
          selectedSides: [],
          selectedCooking: "",
          selectedProductOptionIds: link.defaultProductOptionIds || [],
        };
      });

      setFormulaModalSelections(selections);
      setFormulaModalSelectionDetails(details);
      setFormulaModalOpen(true);
      return;
    }

    const sideIds = parseDishSideIds(dish).map((id) => String(id));
    const sideChoices = sideIds.map((id) => sideLabelById.get(id) || id).filter(Boolean);
    const extraChoices = parseDishExtras(dish);
    const productOptions = parseDishProductOptions(dish);

    setModalDish(dish);
    setModalQty(fastQtyByDish[dishId] || 1);
    setModalSideChoices(sideChoices);
    setModalExtraChoices(extraChoices);
    setModalProductOptions(productOptions);

    const existingLine = fastOptionLines.find(
      (line) => line.dishId === dishId && !line.isFormula && !line.selectedProductOptionId
    );
    if (existingLine) {
      setModalSelectedSides(existingLine.selectedSides);
      setModalSelectedExtras(existingLine.selectedExtras);
      setModalCooking(existingLine.selectedCooking);
      setModalKitchenComment(existingLine.specialRequest);
    } else {
      setModalSelectedSides([]);
      setModalSelectedExtras([]);
      setModalCooking("");
      setModalKitchenComment(baseLineComments[dishId] || "");
    }
    
    if (productOptions.length > 0) {
      const requiredDefault = productOptions.find(opt => opt.required);
      setModalSelectedProductOptionId(requiredDefault ? requiredDefault.id : "");
    } else {
       setModalSelectedProductOptionId("");
    }

    setModalOpen(true);
  };
  
  const handleAddOrUpdateFastOptionLine = () => {
    if (!modalDish) return;
    const dishId = String(modalDish.id || "").trim();
    if (!dishId) return;

    const lineId =
      fastOptionLines.find(
        (line) =>
          line.dishId === dishId &&
          line.selectedProductOptionId === modalSelectedProductOptionId &&
          line.selectedCooking === modalCooking &&
          JSON.stringify(line.selectedSides.sort()) === JSON.stringify(modalSelectedSides.sort()) &&
          JSON.stringify(line.selectedExtras.sort((a, b) => a.name.localeCompare(b.name))) ===
            JSON.stringify(modalSelectedExtras.sort((a, b) => a.name.localeCompare(b.name))) &&
          line.specialRequest === modalKitchenComment
      )?.lineId || makeLineId();
      
    const selectedOption = modalProductOptions.find(opt => opt.id === modalSelectedProductOptionId);
    let unitPrice = getDishPrice(modalDish);
    if (selectedOption) {
      unitPrice += selectedOption.price;
    }
    modalSelectedExtras.forEach(extra => unitPrice += extra.price);

    const newLine: FastOrderLine = {
      lineId,
      dishId,
      dishName: getDishName(modalDish),
      category: getDishCategoryLabel(modalDish),
      categoryId: modalDish.category_id || null,
      destination: resolveDishDestination(modalDish),
      quantity: modalQty,
      unitPrice,
      selectedSides: modalSelectedSides,
      selectedExtras: modalSelectedExtras,
      selectedProductOptionId: modalSelectedProductOptionId,
      selectedProductOptionName: selectedOption?.name || null,
      selectedProductOptionPrice: selectedOption?.price || 0,
      selectedCooking: modalCooking,
      specialRequest: modalKitchenComment,
      isDrink: isDrink({ category: getDishCategoryLabel(modalDish) }),
    };

    setFastOptionLines((prev) => {
      const index = prev.findIndex((line) => line.lineId === lineId);
      if (index > -1) {
        const next = [...prev];
        next[index] = newLine;
        return next;
      }
      return [...prev, newLine];
    });

    resetModal();
  };

  const handleAddFormulaToFastOrder = () => {
    if (!formulaModalDish) return;

    const formulaId = String(formulaModalDish.id).trim();
    const selections: FormulaSelection[] = [];
    let formulaPrice = getFormulaPackPrice(formulaModalDish);

    for (const category of formulaCategories) {
      const categoryId = String(category.id).trim();
      const dishId = formulaModalSelections[categoryId];
      if (!dishId) {
        setFormulaModalError(`${formulaUi.missing} (${getCategoryLabel(category)})`);
        return;
      }
      const dish = dishById.get(dishId);
      if (!dish) continue;

      const details = getFormulaSelectionDetails(categoryId);
      const config = getFormulaDishConfig(dish);

      if (config.askCooking && !details.selectedCooking) {
        setFormulaModalError(`${formulaUi.missingOptions} (Cuisson pour ${getDishName(dish)})`);
        return;
      }
      if (config.hasRequiredSides && isSideSelectionRequired(dish, config.sideOptions) && details.selectedSideIds.length === 0) {
         setFormulaModalError(`${formulaUi.missingOptions} (Accompagnement pour ${getDishName(dish)})`);
        return;
      }

      const selectedProductOptionIds = details.selectedProductOptionIds || [];
      if (config.productOptions.length > 0 && isProductOptionSelectionRequired(dish, config.productOptions)) {
        if (selectedProductOptionIds.length === 0) {
          setFormulaModalError(`${formulaUi.missingOptions} (Option pour ${getDishName(dish)})`);
          return;
        }
      }
      
      const optionPrices = selectedProductOptionIds.reduce((total, id) => {
        const option = config.productOptions.find(opt => opt.id === id);
        return total + (option?.price || 0);
      }, 0);
      formulaPrice += optionPrices;
      
      const sequence = formulaSequenceByDishId.get(dishId);

      selections.push({
        categoryId,
        categoryLabel: getCategoryLabel(category),
        dishId,
        dishName: getDishName(dish),
        destination: resolveDishDestination(dish),
        sequence: sequence,
        selectedSideIds: details.selectedSideIds,
        selectedSides: details.selectedSideIds.map(id => sideLabelById.get(id) || id),
        selectedCooking: details.selectedCooking,
        selectedOptionIds: selectedProductOptionIds,
        selectedOptionNames: selectedProductOptionIds.map(id => config.productOptions.find(opt => opt.id === id)?.name || ""),
        selectedOptionPrice: optionPrices,
      });
    }
    
    const lineId = makeLineId();
    const newLine: FastOrderLine = {
      lineId,
      dishId: formulaId,
      dishName: getFormulaDisplayName(formulaModalDish),
      category: "Formules",
      categoryId: null,
      destination: "cuisine",
      quantity: 1, // multiple formulas can be added as separate lines
      unitPrice: formulaPrice,
      isFormula: true,
      formulaDishId: formulaId,
      formulaDishName: getFormulaDisplayName(formulaModalDish),
      formulaUnitPrice: formulaPrice,
      formulaSelections: selections,
      selectedSides: [],
      selectedExtras: [],
      selectedProductOptionId: null,
      selectedProductOptionName: null,
      selectedProductOptionPrice: 0,
      selectedCooking: "",
      specialRequest: "",
      isDrink: false,
    };
    
    setFastOptionLines(prev => [...prev, newLine]);
    resetFormulaModal();
  };

  const handleUpdateFormulaSelectionDetails = (
    categoryId: string,
    updates: Partial<FormulaSelectionDetails>
  ) => {
    setFormulaModalSelectionDetails((prev) => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || emptyFormulaSelectionDetails),
        ...updates,
      },
    }));
  };
  
  const handleFormulaOptionModalSave = () => {
    if (!formulaOptionModalState) return;
    const { categoryId, dishId } = formulaOptionModalState;
    handleUpdateFormulaSelectionDetails(categoryId, {
      selectedCooking: modalCooking,
      selectedSideIds: modalSelectedSides,
      selectedProductOptionIds: modalSelectedProductOptionId ? [modalSelectedProductOptionId] : [],
    });
    resetFormulaOptionModal();
    resetModal();
  };
  
  const handleOpenFormulaOptionModal = (categoryId: string, dishId: string) => {
    const dish = dishById.get(dishId);
    if (!dish) return;

    const details = getFormulaSelectionDetails(categoryId);
    const config = getFormulaDishConfig(dish);

    setModalDish(dish); // For shared modal state
    setModalSideChoices(config.sideOptions);
    setModalSelectedSides(details.selectedSideIds);
    setModalCooking(details.selectedCooking);
    setModalProductOptions(config.productOptions);

    const defaultOptionIds = formulaDefaultOptionsByDishId.get(dishId) || [];
    const currentOptionId = details.selectedProductOptionIds.length > 0 ? details.selectedProductOptionIds[0] : (defaultOptionIds.length > 0 ? defaultOptionIds[0] : "");
    setModalSelectedProductOptionId(currentOptionId);

    setFormulaOptionModalState({ categoryId, dishId });
  };
  
  const handleSendNextStep = async (orderId: string, nextStep: string) => {
    setSendingNextStepOrderIds(prev => ({ ...prev, [orderId]: true }));
    try {
      const { error } = await supabase
        .from("orders")
        .update({ service_step: nextStep, status: `pending_${nextStep}` })
        .eq("id", orderId);
      if (error) throw error;
      await fetchOrders();
    } catch (error) {
      console.error("Erreur envoi étape suivante:", error);
    } finally {
      setSendingNextStepOrderIds(prev => ({ ...prev, [orderId]: false }));
    }
  };

  useEffect(() => {
    fetchRestaurantSettings();
  }, [scopedRestaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    fetchOrders();
    fetchNotifications();
    fetchActiveTables();

    const ordersChannel = supabase
      .channel(`public:orders:restaurant_id=eq.${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => handleOrderUpdate(payload as unknown as { new: Order })
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel(`public:notifications:restaurant_id=eq.${restaurantId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) =>
        handleNotification(payload as { new: Record<string, unknown> })
      )
      .subscribe();

    const tablesChannel = supabase
      .channel(`public:table_assignments:restaurant_id=eq.${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "table_assignments" },
        (payload) => handleTableAssignmentUpdate(payload as unknown as { new: TableAssignment })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(tablesChannel);
    };
  }, [restaurantId]);

  useEffect(() => {
    const activeDishNamesFromOrders = new Set<string>();
    orders.forEach((order) => {
      parseItems(order.items).forEach((item) => {
        const dishName = String((item as { name?: string }).name || "").trim();
        if (dishName) activeDishNamesFromOrders.add(dishName.toLowerCase());
      });
    });
  }, [orders]);
  
  useEffect(() => {
    if (orders.length === 0) return;
    const now = Date.now();
    let hasAnyAlert = false;
    orders.forEach(order => {
      const { readyItems, pendingOrPreparingItems } = getOrderItemProgress(order);
      if (readyItems.length > 0 && pendingOrPreparingItems.length === 0) {
        const orderTimestamp = new Date(order.created_at).getTime();
        const shouldAlert = (now - orderTimestamp) > 10000;
        if (shouldAlert && !readyAlertOrderIds[order.id] && !readyAlertTimeoutsRef.current[order.id]) {
          triggerReadyOrderAlert(order.id, true);
        }
      }
      if (readyAlertOrderIds[order.id]) {
        hasAnyAlert = true;
      }
    });
    setHasReadyTabAlert(hasAnyAlert);
  }, [orders, waitClockMs]);

  useEffect(() => {
    if (!restaurantId || fastEntryInitializedRef.current) return;
    (async () => {
      const fetchMenu = async (): Promise<DishItem[]> => {
        const { data, error } = await supabase.from("dishes").select(DISH_SELECT_WITH_OPTIONS).eq("restaurant_id", restaurantId).order("sort_order", { ascending: true });
        if (error) throw error;
        return ((data || []) as DishItem[]).map(d => ({ ...d, id: String(d.id) }));
      };
      const fetchCategories = async () => {
        const { data, error } = await supabase.from("categories").select("*").eq("restaurant_id", restaurantId).order("sort_order", { ascending: true });
        if (error) throw error;
        return data.map(c => ({ ...c, id: String(c.id) }));
      };
      const fetchSides = async () => {
        const { data, error } = await supabase.from("sides_library").select("*").eq("restaurant_id", restaurantId);
        if (error) throw error;
        return data.map(s => ({ ...s, id: String(s.id) }));
      };
      const fetchFormulas = async () => {
        const { data, error } = await supabase
          .from('restaurant_formulas')
          .select('id, dish_id, name, price, image_url, restaurant_id, formula_category_ids, formula_config, options, is_active')
          .eq('restaurant_id', restaurantId);
        if (error) {
          // setFormulasTableAvailable(false);
          return [];
        }
        // setFormulasTableAvailable(true);
        return (data || []).map(f => ({ ...f, id: String(f.id) }));
      };

      try {
        setFastLoading(true);
        const [dishes, categories, sides, formulas] = await Promise.all([
          fetchMenu(),
          fetchCategories(),
          fetchSides(),
          fetchFormulas(),
        ]);
        
        const activeFormulas = formulas.filter((f: any) => {
          const activeFlag = f.is_active == null ? true : readBooleanFlag(f.is_active, true);
          return activeFlag;
        });

        const formulaDishIds = new Set(dishes.filter(d => readBooleanFlag(d.is_formula)).map(d => String(d.id)));
        const formulaIdsFromFormulas = new Set(activeFormulas.map((f: any) => String(f.id)));
        const linkedDishIdsFromFormulas = new Set(
          activeFormulas
            .map((f: any) => String(f.dish_id || "").trim())
            .filter(Boolean)
        );
        const allFormulaIds = new Set([...formulaDishIds, ...formulaIdsFromFormulas, ...linkedDishIdsFromFormulas]);
        
        const activeDishes = dishes.filter(d => readBooleanFlag(d.active, true) && !allFormulaIds.has(String(d.id)));
        const activeCategories = categories.filter(c => readBooleanFlag(c.is_active, true));

        const displays = activeFormulas.map((f: any) => {
          const formulaConfig =
            typeof f.formula_config === "string"
              ? parseJsonObject(f.formula_config)
              : f.formula_config && typeof f.formula_config === "object" && !Array.isArray(f.formula_config)
                ? (f.formula_config as Record<string, unknown>)
                : {};
          const selectedDishIds = parseFormulaOptionIds(
            formulaConfig?.selected_dishes ??
            formulaConfig?.selected_dish_ids ??
            formulaConfig?.dish_ids
          );
          const stepsMap = parseFormulaStepsMap(formulaConfig?.steps);
          const defaultOptionMap = parseFormulaDefaultOptionMap(
            formulaConfig?.default_option_ids ??
            formulaConfig?.options
          );
          const stepsDetailsMap =
            formulaConfig?.steps_details && typeof formulaConfig.steps_details === "object" && !Array.isArray(formulaConfig.steps_details)
              ? (formulaConfig.steps_details as Record<string, { step?: unknown }>)
              : {};
          const formulaLinks = selectedDishIds.map((dishId) => {
            const normalizedDishId = String(dishId || "").trim();
            const sequence = normalizeFormulaStepValue(
              stepsMap[normalizedDishId] ??
              stepsDetailsMap?.[normalizedDishId]?.step ??
              1
            );
            return {
              formulaDishId: String(f.id),
              dishId: normalizedDishId,
              sequence,
              step: sequence,
              isMain: false,
              defaultProductOptionIds: Array.isArray(defaultOptionMap[normalizedDishId]) ? defaultOptionMap[normalizedDishId] : [],
              formulaName: f.name,
              formulaImageUrl: f.image_url,
            } as FormulaDishLink;
          });
          return {
            id: String(f.id),
            name: f.name,
            price: parsePriceNumber(f.price),
            imageUrl: f.image_url,
            dishId: String(f.dish_id || "").trim() || undefined,
            formulaCategoryIds: parseFormulaCategoryIds(
              f.formula_category_ids ??
              formulaConfig?.formula_category_ids
            ),
            selectedDishIds,
            dishSteps: stepsMap,
            defaultOptionIdsByDishId: defaultOptionMap,
            formulaLinks,
          };
        });

        const linksByFormulaId = new Map<string, FormulaDishLink[]>();
        const linksByDishId = new Map<string, FormulaDishLink[]>();
        const dishIdsWithLinks = new Set<string>();

        displays.forEach((display) => {
          const formulaId = String(display.id || "").trim();
          if (!formulaId) return;
          const linkedFormulaDishId = String(display.dishId || "").trim();
          const formulaKeys = linkedFormulaDishId ? [formulaId, linkedFormulaDishId] : [formulaId];
          display.formulaLinks.forEach((record) => {
            const dishId = String(record.dishId || "").trim();
            if (!dishId) return;
            formulaKeys.forEach((key) => {
              const formulaList = linksByFormulaId.get(key) || [];
              formulaList.push(record);
              linksByFormulaId.set(key, formulaList);
            });

            const dishList = linksByDishId.get(dishId) || [];
            dishList.push(record);
            linksByDishId.set(dishId, dishList);
            dishIdsWithLinks.add(dishId);
          });
        });

        const priceMap = new Map<string, number>();
        activeFormulas.forEach((f: any) => {
          const formulaId = String(f.id || "").trim();
          const linkedDishId = String(f.dish_id || "").trim();
          const price = parsePriceNumber(f.price);
          if (formulaId) priceMap.set(formulaId, price);
          if (linkedDishId) priceMap.set(linkedDishId, price);
        });

        const displayMap = new Map<string, { name?: string; imageUrl?: string }>();
        activeFormulas.forEach((f: any) => {
          const formulaId = String(f.id || "").trim();
          const linkedDishId = String(f.dish_id || "").trim();
          const displayPayload = { name: f.name, imageUrl: f.image_url };
          if (formulaId) displayMap.set(formulaId, displayPayload);
          if (linkedDishId) displayMap.set(linkedDishId, displayPayload);
        });
        
        const formulaDishes = dishes.filter(d => allFormulaIds.has(String(d.id)));
        const finalDishes = [...activeDishes, ...formulaDishes];

        setDishes(finalDishes);
        setCategories(activeCategories);
        setSidesLibrary(sides);
        setFormulaDisplays(displays);
        setFormulaLinksByFormulaId(linksByFormulaId);
        setFormulaLinksByDishId(linksByDishId);
        setFormulaDishIdsFromLinks(dishIdsWithLinks);
        setFormulaPriceByDishId(priceMap);
        setFormulaDisplayById(displayMap);
        
        const idsWithExtras = new Set<string>();
        finalDishes.forEach(d => {
          if (parseDishExtras(d).length > 0) {
            idsWithExtras.add(String(d.id));
          }
        });
        setDishIdsWithLinkedExtras(idsWithExtras);
        
      } catch (error) {
        console.error("Menu init error:", error);
      } finally {
        setFastLoading(false);
        fastEntryInitializedRef.current = true;
      }
    })();
  }, [restaurantId]);
  
  useEffect(() => {
    if (!fastEntryInitializedRef.current || selectedCategoryInitializedRef.current) return;
    if (categories.length > 0) {
      const firstSelectable = categories.find(c => {
        const key = normalizeCategoryKey(getCategoryLabel(c));
        return !key.includes('formule');
      });
      if (firstSelectable) {
        setSelectedCategory(String(firstSelectable.id));
        selectedCategoryInitializedRef.current = true;
      }
    }
  }, [categories, fastEntryInitializedRef.current]);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [orders]);
  
  const fastOrderCategoryDishes = useMemo(() => {
    if (!selectedCategory) return [];
    return dishes.filter(dish => {
      const isActive = readBooleanFlag(dish.active, true);
      if (!isActive) return false;
      const isFormula = readBooleanFlag(dish.is_formula, false);
      const isLinkedToFormula = formulaLinksByDishId.has(String(dish.id));
      if (isFormula || isLinkedToFormula) return false;
      return String(dish.category_id) === selectedCategory;
    });
  }, [dishes, selectedCategory, formulaLinksByDishId]);
  
  const formulaDishesForFastOrder = useMemo(() => {
    return formulaDisplays.map(display => {
      const dish: DishItem = {
        id: display.id,
        name: display.name,
        name_fr: display.name,
        price: display.price,
        image_url: display.imageUrl,
        is_formula: true,
        category_id: FORMULAS_CATEGORY_KEY,
        formula_category_ids: display.formulaCategoryIds || [],
      };
      return dish;
    });
  }, [formulaDisplays]);

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">
          Interface de Service - Restaurant {restaurantId || scopedRestaurantId}
        </h1>

        <div className="mb-4">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("orders")}
                className={`${
                  activeTab === "orders"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm relative`}
              >
                Commandes
                {hasReadyTabAlert && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse">
                    {"Pr\u00EAt !"}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("sessions")}
                className={`${
                  activeTab === "sessions"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Sessions Tables
              </button>
              {showNewOrderTab && (
                <button
                  onClick={() => setActiveTab("new-order")}
                  className={`${
                    activeTab === "new-order"
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Nouvelle Commande
                </button>
              )}
            </nav>
          </div>
        </div>

        {activeTab === "orders" && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Commandes Actives</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedOrders.map((order) => {
                const { readyItems, pendingOrPreparingItems, all, food, drink } = getOrderItemProgress(order);
                const orderTime = new Date(order.created_at);
                const totalMinutes = Math.floor((waitClockMs - orderTime.getTime()) / 60000);
                const isUrgent = totalMinutes >= 15;
                const isReady = readyItems.length > 0 && pendingOrPreparingItems.length === 0;
                
                const currentServiceStep = resolveOrderServiceStep(order, parseItems(order.items));
                const nextServiceStep = resolveNextServiceStep(order, parseItems(order.items));

                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-lg shadow-md p-4 border-2 ${
                      readyAlertOrderIds[order.id]
                        ? "border-green-500 animate-pulse-border"
                        : isUrgent
                        ? "border-red-500"
                        : "border-transparent"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-bold">Table {order.table_number}</h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          isReady ? "bg-green-100 text-green-800" : isUrgent ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {totalMinutes} min
                      </span>
                    </div>
                    
                    {readCoversFromRow(order) && (
                      <p className="text-sm text-gray-500 mb-2">Couverts: {readCoversFromRow(order)}</p>
                    )}

                    <div className="space-y-2">
                      {pendingOrPreparingItems.length > 0 && (
                        <div className="border-t pt-2">
                          <h4 className="font-semibold text-gray-700 mb-1">{"En attente / pr\u00E9paration"}</h4>
                          {pendingOrPreparingItems.map((item) => {
                            const isFormula = isFormulaOrderItem(item);
                            // Create a synthetic DishItem for formula items to pass to helpers
                            const dishForFormula = isFormula
                              ? ({
                                  id: item.formula_id,
                                  ...item,
                                } as DishItem)
                              : null;

                            const name = dishForFormula
                              ? getFormulaDisplayName(dishForFormula)
                              : getDishName(item as unknown as DishItem);
                            const unitPrice = dishForFormula
                              ? getFormulaPackPrice(dishForFormula)
                              : parsePriceNumber(item.price);

                            const total = unitPrice * (item.quantity ?? 1);

                            return (
                              <div key={item.id} className="mb-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="font-semibold">
                                    {item.quantity}x {name}
                                  </span>
                                  <span className="font-semibold">{total.toFixed(2)}€</span>
                                </div>

                                {(item.cooking || item.cuisson) && !isFormula && (
                                  <div className="pl-4 text-xs text-gray-600">
                                    - Cuisson:{" "}
                                    {getCookingLabelFr(
                                      normalizeCookingKey(
                                        (item.cooking || item.cuisson) as "rare" | "medium_rare" | "medium" | "well_done"
                                      )
                                    )}
                                  </div>
                                )}
                                {isFormulaOrderItem(item) &&
                                  resolveFormulaSequenceListForItem(item).map((sequence) => {
                                    const entry = resolveFormulaEntryForSequence(item, sequence);
                                    if (!entry) return null;

                                    const dishName = String(entry.dish_name || entry.dishName || entry.name || "").trim();
                                    if (!dishName) return null;

                                    const cookingLabel =
                                      getCookingLabelFr(
                                        normalizeCookingKey(
                                          (entry.cuisson || entry.cooking || "") as
                                            | "rare"
                                            | "medium_rare"
                                            | "medium"
                                            | "well_done"
                                        )
                                      ) || "";

                                    const sides =
                                      parseSideSource(entry.accompagnement || entry.accompagnements || entry.side || entry.sides)
                                        .map((side) => (typeof side === "string" ? side : side.toString()))
                                        .join(", ") || "";

                                    return (
                                      <div key={`${item.id}-formula-${sequence}`} className="pl-4 text-xs text-gray-600">
                                        - Étape {sequence}: {dishName}
                                        {cookingLabel && <span className="ml-2">({cookingLabel})</span>}
                                        {sides && <div className="pl-6">Accompagnements: {sides}</div>}
                                      </div>
                                    );
                                  })}

                                {Boolean(item.side || item.accompagnement) && !isFormula && (
                                  <div className="pl-4 text-xs text-gray-600">
                                    - Accompagnement: {String(item.side || item.accompagnement)}
                                  </div>
                                )}
                                {(((item as any).selected_options || (item as any).selectedOptions) &&
                                  (Array.isArray((item as any).selected_options || (item as any).selectedOptions)
                                    ? ((item as any).selected_options || (item as any).selectedOptions).length > 0
                                    : Object.keys((item as any).selected_options || (item as any).selectedOptions).length > 0)) && (
                                  <div className="pl-4">
                                    {(Array.isArray((item as any).selected_options || (item as any).selectedOptions)
                                      ? ((item as any).selected_options || (item as any).selectedOptions)
                                      : Object.values((item as any).selected_options || (item as any).selectedOptions)
                                    ).map((opt: any, idx: number) => {
                                      const label = String(opt?.label_fr || opt?.value || opt?.name_fr || "").trim();
                                      if (!label) return null;
                                      return (
                                        <div key={`${item.id}-selopt-${idx}`} className="text-xs text-gray-500 italic">
                                          - {label}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {Array.isArray((item as any).selected_extras) &&
                                  (item as any).selected_extras.length > 0 && (
                                    <div className="pl-4 text-xs text-gray-600">
                                      - Suppléments:{" "}
                                      {(item as any).selected_extras
                                        .map((extra: { label_fr: string; price: number }) =>
                                          `${extra.label_fr}${
                                            extra.price > 0 ? ` (+${extra.price.toFixed(2)}€)` : ""
                                          }`
                                        )
                                        .join(", ")}
                                    </div>
                                  )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {readyItems.length > 0 && (
                        <div className="border-t pt-2">
                          <h4 className="font-semibold text-green-700 mb-1">{"Pr\u00EAts \u00E0 servir"}</h4>
                          {readyItems.map((item) => (
                            <div key={item.id} className="mb-2 text-sm bg-green-50 p-1 rounded">
                               <div className="flex justify-between">
                                <span className="font-semibold">
                                  {item.quantity}x {getDishName(item as unknown as DishItem)}
                                </span>
                              </div>
                               {(item.cooking || item.cuisson) && (
                                <div className="pl-4 text-xs text-gray-600">
                                  - Cuisson:{" "}
                                  {getCookingLabelFr(
                                    normalizeCookingKey(
                                      (item.cooking || item.cuisson) as "rare" | "medium_rare" | "medium" | "well_done"
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {nextServiceStep && (
                      <div className="mt-4 pt-2 border-t">
                        <button 
                          onClick={() => handleSendNextStep(order.id, nextServiceStep)}
                          disabled={sendingNextStepOrderIds[order.id]}
                          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
                        >
                          {sendingNextStepOrderIds[order.id] ? "Envoi..." : "Envoyer la suite"}
                        </button>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "sessions" && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Sessions Actives par Table</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 text-center">
              {tableSlots.map(({ tableNumber, isOccupied, row }) => (
                <div
                  key={tableNumber}
                  className={`p-2 border-2 rounded-lg ${
                    isOccupied ? "bg-red-500 border-red-700 text-white" : "bg-green-500 border-green-700 text-white"
                  }`}
                >
                  <div className="font-bold text-lg">{tableNumber}</div>
                  <div className="text-xs">{isOccupied ? "Occup\u00E9e" : "Libre"}</div>
                  {isOccupied && row && readCoversFromRow(row) && (
                    <div className="text-xs mt-1">({readCoversFromRow(row)} couv.)</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "new-order" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-2">Menu</h2>
               <div className="flex flex-wrap gap-2 mb-4">
                 <button
                    onClick={() => setSelectedCategory(FORMULAS_CATEGORY_KEY)}
                    className={`px-3 py-1 text-sm font-medium rounded-full ${
                      selectedCategory === FORMULAS_CATEGORY_KEY
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Formules
                  </button>
                {categories.map((cat) => {
                  const key = normalizeCategoryKey(getCategoryLabel(cat));
                  if (key.includes('formule')) return null;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(String(cat.id))}
                      className={`px-3 py-1 text-sm font-medium rounded-full ${
                        selectedCategory === String(cat.id)
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {getCategoryLabel(cat)}
                    </button>
                  )
                })}
              </div>
              
              <div className="space-y-2">
                {(selectedCategory === FORMULAS_CATEGORY_KEY ? formulaDishesForFastOrder : fastOrderCategoryDishes).map((dish) => (
                  <div key={dish.id} className="bg-white p-2 rounded-md shadow-sm flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{getDishName(dish)}</div>
                      <div className="text-sm text-gray-600">{getDishPrice(dish).toFixed(2)}€</div>
                    </div>
                    <div className="flex items-center gap-2">
                       <button
                          onClick={() => handleOpenModal(dish)}
                          className="px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-xs"
                        >
                          Options
                        </button>
                      <button
                        onClick={() =>
                          setFastQtyByDish((prev) => ({ ...prev, [dish.id]: Math.max(0, (prev[dish.id] || 0) - 1) }))
                        }
                        className="px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                      >
                        -
                      </button>
                      <span>{fastQtyByDish[dish.id] || 0}</span>
                      <button
                        onClick={() =>
                          setFastQtyByDish((prev) => ({ ...prev, [dish.id]: (prev[dish.id] || 0) + 1 }))
                        }
                        className="px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="sticky top-4 self-start">
              <div className="bg-white p-4 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4">Commande Rapide</h2>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="fast-table-number" className="block text-sm font-medium text-gray-700">
                      N° de Table
                    </label>
                    <input
                      type="number"
                      id="fast-table-number"
                      value={selectedFastTableNumber}
                      onChange={(e) => setSelectedFastTableNumber(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="fast-covers" className="block text-sm font-medium text-gray-700">
                      Couverts
                    </label>
                    <input
                      type="number"
                      id="fast-covers"
                      value={fastCoversInput}
                      onChange={(e) => setFastCoversInput(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      min="1"
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                 {fastOptionLines.map(line => (
                    <div key={line.lineId} className="border-t pt-2">
                       <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{line.quantity}x {line.isFormula ? line.formulaDishName : line.dishName}</div>
                           <div className="text-xs text-gray-500 pl-2">
                            {line.selectedCooking && <span>{line.selectedCooking}, </span>}
                            {line.selectedSides.length > 0 && <span>Acc: {line.selectedSides.join(", ")}, </span>}
                            {line.selectedExtras.length > 0 && <span>Sup: {line.selectedExtras.map(e => e.name).join(", ")}, </span>}
                            {line.specialRequest && <span>"{line.specialRequest}"</span>}
                          </div>
                          {line.isFormula && (line.formulaSelections || []).map(sel => (
                            <div key={sel.dishId} className="text-xs text-gray-500 pl-4">
                              - {sel.dishName}
                            </div>
                          ))}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-semibold">{(line.unitPrice * line.quantity).toFixed(2)}€</div>
                          <button onClick={() => setFastOptionLines(prev => prev.filter(l => l.lineId !== line.lineId))} className="text-red-500 hover:text-red-700 text-xs">
                            Suppr.
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleNewOrderFromFastEntry}
                  disabled={!isFastOrderReadyToSend || fastLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {fastLoading ? "Envoi..." : "Envoyer la Commande"}
                </button>
                {fastMessage && <p className="mt-2 text-sm text-center text-green-600">{fastMessage}</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === "service" && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Appels Service</h2>
            <div className="space-y-4">
              {serviceNotifications.map((notif) => (
                <div key={notif.id} className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
                  <div className="flex">
                    <div className="py-1">
                      <svg className="h-6 w-6 text-yellow-500 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold">
                        Table {notif.table_number || "?"} - {notif.title || "Appel"}
                      </p>
                      <p className="text-sm">{notif.message || "Un client demande de l'aide."}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Modals */}
      {modalOpen && modalDish && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">{getDishName(modalDish)}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantité</label>
                <input type="number" value={modalQty} onChange={e => setModalQty(Number(e.target.value))} min="1" className="mt-1 w-full border border-gray-300 rounded-md p-2"/>
              </div>
              {dishNeedsCooking(modalDish) && (
                 <div>
                  <label className="block text-sm font-medium text-gray-700">Cuisson</label>
                  <select value={modalCooking} onChange={e => setModalCooking(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md p-2">
                    <option value="">{"S\u00E9lectionner"}</option>
                    {COOKING_CHOICES.map(c => <option key={c} value={toCookingKeyFromLabel(c)}>{c}</option>)}
                  </select>
                </div>
              )}
               {modalSideChoices.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Accompagnements ({getSideMaxSelections(modalDish, modalSideChoices)} max)
                  </label>
                  <div className="mt-2 space-y-2">
                    {modalSideChoices.map(side => (
                      <label key={side} className="flex items-center">
                        <input
                          type="checkbox"
                          value={side}
                          checked={modalSelectedSides.includes(side)}
                          onChange={e => {
                            const checked = e.target.checked;
                            const max = getSideMaxSelections(modalDish, modalSideChoices);
                            setModalSelectedSides(prev => {
                              if (checked) {
                                if (prev.length >= max) return prev;
                                return [...prev, side];
                              }
                              return prev.filter(s => s !== side);
                            });
                          }}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{side}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {modalProductOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Options</label>
                  <div className="mt-2 space-y-2">
                    {modalProductOptions.map(option => (
                       <label key={option.id} className="flex items-center">
                        <input
                          type="radio"
                          name="product-option"
                          value={option.id}
                          checked={modalSelectedProductOptionId === option.id}
                          onChange={e => setModalSelectedProductOptionId(e.target.value)}
                          className="h-4 w-4 text-indigo-600 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">{option.name}</span>
                        {option.price > 0 && <span className="ml-2 text-xs text-gray-500">(+{option.price.toFixed(2)}€)</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {modalExtraChoices.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Suppléments</label>
                   <div className="mt-2 space-y-2">
                      {modalExtraChoices.map(extra => (
                        <label key={extra.name} className="flex items-center">
                          <input
                            type="checkbox"
                            value={extra.name}
                            checked={modalSelectedExtras.some(e => e.name === extra.name)}
                            onChange={e => {
                              const checked = e.target.checked;
                              setModalSelectedExtras(prev => {
                                if (checked) return [...prev, extra];
                                return prev.filter(e => e.name !== extra.name);
                              })
                            }}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{extra.name} (+{extra.price.toFixed(2)}€)</span>
                        </label>
                      ))}
                    </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Instructions cuisine</label>
                <input type="text" value={modalKitchenComment} onChange={e => setModalKitchenComment(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md p-2"/>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button onClick={resetModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Annuler</button>
              <button onClick={handleAddOrUpdateFastOptionLine} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Valider</button>
            </div>
          </div>
        </div>
      )}

      {formulaModalOpen && formulaModalDish && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <h3 className="text-xl font-bold leading-6 text-gray-900">{formulaUi.title}</h3>
            <p className="text-sm text-gray-500 mb-4">{formulaUi.subtitle}: <span className="font-semibold">{getFormulaDisplayName(formulaModalDish)}</span></p>

            <div className="space-y-6">
              {formulaCategories.map(category => {
                const categoryId = String(category.id);
                const options = formulaOptionsByCategory.get(categoryId) || [];
                const selectedDishId = formulaModalSelections[categoryId] || "";
                const selectedDish = selectedDishId ? dishById.get(selectedDishId) : null;
                const details = getFormulaSelectionDetails(categoryId);

                return (
                  <div key={categoryId}>
                    <h4 className="font-semibold text-lg text-gray-800 border-b pb-1 mb-2">{getCategoryLabel(category)}</h4>
                    {options.length === 0 ? (
                      <p className="text-sm text-gray-500">{formulaUi.noDishes}</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {options.map(dish => (
                          <button
                            key={dish.id}
                            onClick={() => setFormulaModalSelections(prev => ({ ...prev, [categoryId]: String(dish.id) }))}
                            className={`p-2 border rounded-md text-left ${selectedDishId === String(dish.id) ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-500' : 'bg-white border-gray-300'}`}
                          >
                            <span className="font-semibold">{getDishName(dish)}</span>
                            <p className="text-xs text-gray-600">{getDishCleanDescription(dish)}</p>
                          </button>
                        ))}
                      </div>
                    )}
                     {selectedDish && (
                      <div className="mt-2 pl-2">
                        <button onClick={() => setFormulaModalItemDetailsOpen(prev => ({...prev, [categoryId]: !prev[categoryId]}))} className="text-sm text-indigo-600 hover:underline">
                          {formulaModalItemDetailsOpen[categoryId] ? 'Masquer' : 'Afficher'} les détails
                        </button>
                        {formulaModalItemDetailsOpen[categoryId] && (
                          <div className="mt-2 p-2 bg-gray-50 rounded-md space-y-2">
                             {dishNeedsCooking(selectedDish) && (
                               <div>
                                <label className="block text-xs font-medium text-gray-500">Cuisson</label>
                                <select 
                                  value={details.selectedCooking} 
                                  onChange={e => handleUpdateFormulaSelectionDetails(categoryId, { selectedCooking: e.target.value })} 
                                  className="mt-1 text-sm w-full border border-gray-300 rounded-md p-1"
                                >
                                  <option value="">{"S\u00E9lectionner"}</option>
                                  {COOKING_CHOICES.map(c => <option key={c} value={toCookingKeyFromLabel(c)}>{c}</option>)}
                                </select>
                              </div>
                            )}
                          </div>
                        )}
                        <button
                          onClick={() => handleOpenFormulaOptionModal(categoryId, selectedDishId)}
                          className="text-sm text-indigo-600 hover:underline ml-4"
                        >
                          {formulaOptionsLabel}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {formulaModalError && <p className="mt-4 text-sm text-red-600">{formulaModalError}</p>}

            <div className="mt-6 flex justify-end space-x-2">
              <button onClick={resetFormulaModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Annuler</button>
              <button onClick={handleAddFormulaToFastOrder} disabled={formulaAddDisabled} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400">Ajouter à la commande</button>
            </div>
          </div>
        </div>
      )}
      
      {formulaOptionModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50">
           <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">Options pour {getDishName(formulaOptionModalDish as DishItem)}</h3>
            <div className="space-y-4">
              {formulaOptionModalConfig?.askCooking && (
                 <div>
                  <label className="block text-sm font-medium text-gray-700">Cuisson</label>
                  <select value={modalCooking} onChange={e => setModalCooking(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md p-2">
                    <option value="">{"S\u00E9lectionner"}</option>
                    {COOKING_CHOICES.map(c => <option key={c} value={toCookingKeyFromLabel(c)}>{c}</option>)}
                  </select>
                </div>
              )}
               {formulaOptionModalConfig && formulaOptionModalConfig.sideOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Accompagnements ({formulaOptionModalConfig.maxSides} max)
                  </label>
                  <div className="mt-2 space-y-2">
                    {formulaOptionModalConfig.sideOptions.map(side => (
                      <label key={side} className="flex items-center">
                        <input
                          type={formulaOptionModalConfig.maxSides === 1 ? "radio" : "checkbox"}
                          name="formula-side-option"
                          value={side}
                          checked={modalSelectedSides.includes(side)}
                          onChange={e => {
                            const checked = e.target.checked;
                            setModalSelectedSides(prev => {
                              if (formulaOptionModalConfig.maxSides === 1) return [side];
                              if (checked) {
                                if (prev.length >= (formulaOptionModalConfig.maxSides || 1)) return prev;
                                return [...prev, side];
                              }
                              return prev.filter(s => s !== side);
                            });
                          }}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{side}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {formulaOptionModalConfig && formulaOptionModalConfig.productOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Variante / Option</label>
                  <div className="mt-2 space-y-2">
                    {formulaOptionModalConfig.productOptions.map(option => (
                       <label key={option.id} className="flex items-center">
                        <input
                          type="radio"
                          name="formula-product-option"
                          value={option.id}
                          checked={modalSelectedProductOptionId === option.id}
                          onChange={e => setModalSelectedProductOptionId(e.target.value)}
                          className="h-4 w-4 text-indigo-600 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">{option.name}</span>
                        {option.price > 0 && (
                          <span className="ml-2 text-xs text-gray-500">
                            (<strong>{formulaOptionLockedLabel}</strong>: +{option.price.toFixed(2)}€)
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button onClick={() => { resetFormulaOptionModal(); resetModal(); }} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Annuler</button>
              <button onClick={handleFormulaOptionModalSave} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Valider</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div>Chargement de l'interface...</div>}>
      <AdminContent />
    </Suspense>
  );
}
