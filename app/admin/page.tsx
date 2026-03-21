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
  "id,name,name_fr,name_en,name_es,name_de,price,category_id,restaurant_id";
const DISH_SELECT_WITH_OPTIONS = `${DISH_SELECT_BASE},formula_price,is_formula,formula_category_ids,allow_multi_select,description,description_fr,description_en,description_es,description_de,ask_cooking,selected_sides,sides,has_sides,max_options,extras,supplement,supplements,options,selected_options`;

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
      const sourceDishId = String(formulaModalSourceDish?.id || "").trim();
      const sourceCategoryId = String(formulaModalSourceDish?.category_id || "").trim();
      if (sourceDishId && sourceCategoryId === categoryId) {
        const sourceDish = dishById.get(sourceDishId) || formulaModalSourceDish;
        if (sourceDish) {
          const exists = filtered.some((dish) => String(dish.id || "").trim() === sourceDishId);
          if (!exists) filtered.unshift(sourceDish);
        }
      }
      map.set(categoryId, filtered);
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