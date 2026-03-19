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
  formula_price?: number | string | null;
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
  isMain?: boolean;
  defaultProductOptionIds?: string[];
  formulaName?: string;
  formulaImageUrl?: string;
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
  const [formulaDishIdsFromFormulasTable, setFormulaDishIdsFromFormulasTable] = useState<Set<string>>(new Set());
  const [formulaPriceByDishId, setFormulaPriceByDishId] = useState<Map<string, number>>(new Map());
  const [formulasTableAvailable, setFormulasTableAvailable] = useState<boolean | null>(null);

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
    const formulaId = String(dish.id || "").trim();
    const formulaTablePrice = formulaPriceByDishId.get(formulaId);
    if (Number.isFinite(formulaTablePrice) && Number(formulaTablePrice) > 0) {
      return Number(Number(formulaTablePrice).toFixed(2));
    }
    const formulaPrice = parsePriceNumber((dish as unknown as { formula_price?: unknown }).formula_price);
    if (Number.isFinite(formulaPrice) && formulaPrice > 0) return formulaPrice;
    return getDishPrice(dish);
  };

  const getFormulaDisplayName = (dish: DishItem) => {
    const formulaId = String(dish.id || "").trim();
    const display = formulaDisplayById.get(formulaId);
    return String(display?.name || "").trim() || getDishName(dish);
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
      const raw = Number(value);
      if (!Number.isFinite(raw) || raw <= 0) return;
      values.push(Math.max(1, Math.trunc(raw)));
    };
    pushSequence(record.formula_current_sequence ?? record.formulaCurrentSequence ?? record.sequence);
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
        pushSequence(entry.sequence ?? entry.service_step_sequence ?? entry.step);
      });
    });
    return Array.from(new Set(values)).sort((a, b) => a - b);
  };
  const resolveCurrentFormulaSequenceForItem = (item: Item) => {
    const record = item as unknown as Record<string, unknown>;
    const rawCurrent = Number(
      record.formula_current_sequence ?? record.formulaCurrentSequence ?? record.sequence
    );
    if (Number.isFinite(rawCurrent) && rawCurrent > 0) return Math.max(1, Math.trunc(rawCurrent));
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
        const rawSequence = Number(entry.sequence ?? entry.service_step_sequence ?? entry.step);
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
      const sequence = Number(link.sequence);
      if (!Number.isFinite(sequence)) return;
      const dishId = String(link.dishId || "").trim();
      if (!dishId) return;
      map.set(dishId, Math.max(1, Math.trunc(sequence)));
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
      formulaOptionModalConfig &&
      (
        formulaOptionModalConfig.productOptions.length > 0 ||
        formulaOptionModalConfig.hasRequiredSides ||
        formulaOptionModalConfig.askCooking
      )
  );
  const formulaOptionModalMissingRequired = Boolean(
    formulaOptionModalConfig &&
      (
        (formulaOptionModalConfig.productOptions.length > 0 &&
          formulaOptionModalDetails.selectedProductOptionIds.length === 0) ||
        (formulaOptionModalConfig.hasRequiredSides &&
          formulaOptionModalDetails.selectedSides.length === 0) ||
        (formulaOptionModalConfig.askCooking &&
          !String(formulaOptionModalDetails.selectedCooking || "").trim())
      )
  );

  useEffect(() => {
    if (!formulaModalDish || !formulaModalSourceDish) return;
    const sourceDishId = String(formulaModalSourceDish.id || "").trim();
    const sourceCategoryId = String(formulaModalSourceDish.category_id || "").trim();
    if (!sourceDishId || !sourceCategoryId) return;
    const options = formulaOptionsByCategory.get(sourceCategoryId) || [];
    if (!options.some((dish) => String(dish.id || "").trim() === sourceDishId)) return;
    setFormulaModalSelections((prev) => {
      if (prev[sourceCategoryId] === sourceDishId) return prev;
      return { ...prev, [sourceCategoryId]: sourceDishId };
    });
    const resolvedSourceDish = resolveFormulaDishRecord(formulaModalSourceDish) || formulaModalSourceDish;
    const config = getFormulaDishConfig(resolvedSourceDish);
    const rawDefaults = formulaDefaultOptionsByDishId.get(sourceDishId) || [];
    const allowedIds = new Set(
      config.productOptions.map((option) => String(option.id || "").trim()).filter(Boolean)
    );
    const normalizedDefaults = rawDefaults.filter((id) => allowedIds.has(String(id || "").trim()));
    if (normalizedDefaults.length > 0) {
      const allowMulti = Boolean((resolvedSourceDish as unknown as { allow_multi_select?: unknown }).allow_multi_select);
      const nextDefaults = allowMulti ? normalizedDefaults : normalizedDefaults.slice(0, 1);
      setFormulaModalSelectionDetails((prev) => {
        const current = prev[sourceCategoryId];
        if (current && current.selectedProductOptionIds.length > 0) return prev;
        return {
          ...prev,
          [sourceCategoryId]: {
            selectedSideIds: [],
            selectedSides: [],
            selectedCooking: "",
            selectedProductOptionIds: nextDefaults,
          },
        };
      });
    }
  }, [formulaModalDish, formulaModalSourceDish, formulaOptionsByCategory, formulaDefaultOptionsByDishId, formulaResolvedDishById]);

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
    if (Array.isArray(line.formulaSelections) && line.formulaSelections.length > 0) {
      const formulaText = line.formulaSelections
        .map((selection) => {
          const dishLabel = String(selection.dishName || "").trim();
          if (!dishLabel) return "";
          const categoryLabel = String(selection.categoryLabel || "").trim();
          const detailChunks: string[] = [];
          if (Array.isArray(selection.selectedOptionNames) && selection.selectedOptionNames.length > 0) {
            detailChunks.push(`Options: ${selection.selectedOptionNames.join(", ")}`);
          }
          if (Array.isArray(selection.selectedSides) && selection.selectedSides.length > 0) {
            detailChunks.push(`Accompagnements: ${selection.selectedSides.join(", ")}`);
          }
          if (String(selection.selectedCooking || "").trim()) {
            detailChunks.push(`Cuisson: ${String(selection.selectedCooking || "").trim()}`);
          }
          const detailText = detailChunks.length > 0 ? ` (${detailChunks.join(" | ")})` : "";
          return `${categoryLabel ? `${categoryLabel}: ` : ""}${dishLabel}${detailText}`;
        })
        .filter(Boolean)
        .join(" | ");
      if (formulaText) detailParts.push(`Formule: ${formulaText}`);
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
      setFormulaLinksByFormulaId(new Map());
      setFormulaLinksByDishId(new Map());
      setFormulaDisplayById(new Map());
      setFormulaDishIdsFromLinks(new Set());
      setFormulaDishIdsFromFormulasTable(new Set());
      setFormulaPriceByDishId(new Map());
      setFormulasTableAvailable(null);
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
    const [categoriesQuery, primaryDishesQuery, sidesQuery, tablesQuery] = queryResults;

    const nextCategories = !categoriesQuery.error ? ((categoriesQuery.data || []) as CategoryItem[]) : [];
    let nextDishes = !primaryDishesQuery.error ? ((primaryDishesQuery.data || []) as DishItem[]) : [];
    let dishesError = primaryDishesQuery.error;

    if (dishesError && String((dishesError as { code?: string } | null)?.code || "") === "42703") {
      const minimalSelect = DISH_SELECT_BASE;
      const minimalQuery = await supabase
        .from("dishes")
        .select(minimalSelect)
        .eq("restaurant_id", currentRestaurantId)
        .order("id", { ascending: true });

      if (!minimalQuery.error) {
        nextDishes = (minimalQuery.data || []) as DishItem[];
        dishesError = null;
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
    let hasFormulaCategoryLocal = false;
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
      setActiveDishNames(
        new Set(
          nextDishes
            .filter((dish) => {
              const record = dish as unknown as { active?: unknown };
              if (record.active == null) return true;
              return readBooleanFlag(record.active, true);
            })
            .map((dish) => String((dish as { name?: unknown })?.name || "").trim().toLowerCase())
            .filter(Boolean)
        )
      );
      const formulaDishIdSetFromTable = new Set<string>();
      const formulaPriceMapFromTable = new Map<string, number>();
      let formulasTableIsAvailable = false;
      const applyFormulasRows = (rows: unknown[]) => {
        rows.forEach((row) => {
          if (!row || typeof row !== "object") return;
          const record = row as Record<string, unknown>;
          const rowRestaurantId = String(record.restaurant_id ?? record.restaurantId ?? "").trim();
          if (rowRestaurantId && currentRestaurantId && rowRestaurantId !== currentRestaurantId) return;
          const formulaDishId = String(
            record.formula_dish_id ??
              record.formulaDishId ??
              record.dish_id ??
              record.dishId ??
              record.menu_item_id ??
              record.menuItemId ??
              record.item_id ??
              record.itemId ??
              record.id ??
              ""
          ).trim();
          if (!formulaDishId) return;
          formulaDishIdSetFromTable.add(formulaDishId);
          const formulaPrice = [
            record.formula_price,
            record.formulaPrice,
            record.price,
            record.unit_price,
            record.unitPrice,
            record.amount,
          ]
            .map((value) => parsePriceNumber(value))
            .find((value) => Number.isFinite(value) && value > 0);
          if (formulaPrice && formulaPrice > 0) {
            formulaPriceMapFromTable.set(formulaDishId, Number(formulaPrice.toFixed(2)));
          }
        });
      };
      let formulasResult: { data: unknown[] | null; error: { code?: string; message?: string } | null } = {
        data: null,
        error: null,
      };
      let formulasQuery = supabase.from("formulas").select("*");
      if (currentRestaurantId) formulasQuery = formulasQuery.eq("restaurant_id", currentRestaurantId);
      const formulasPrimary = await formulasQuery;
      formulasResult = {
        data: (formulasPrimary.data as unknown[] | null) ?? null,
        error: formulasPrimary.error as { code?: string; message?: string } | null,
      };
      if (formulasResult.error && String(formulasResult.error.code || "") === "42703") {
        const fallback = await supabase.from("formulas").select("*");
        formulasResult = {
          data: (fallback.data as unknown[] | null) ?? null,
          error: fallback.error as { code?: string; message?: string } | null,
        };
      }
      if (formulasResult.error) {
        const code = String(formulasResult.error.code || "").trim();
        if (code !== "42P01") {
          console.warn("formulas fetch failed (admin):", formulasResult.error.message || formulasResult.error);
        }
        formulasTableIsAvailable = false;
      } else {
        formulasTableIsAvailable = true;
        applyFormulasRows((formulasResult.data || []) as unknown[]);
      }
      setFormulasTableAvailable(formulasTableIsAvailable);
      setFormulaDishIdsFromFormulasTable(new Set(formulaDishIdSetFromTable));
      setFormulaPriceByDishId(new Map(formulaPriceMapFromTable));
      const formulaIdSetForInit = new Set<string>();

      let linksResult: { data: unknown[] | null; error: { code?: string; message?: string } | null } = {
        data: null,
        error: null,
      };
      const formulaSelect =
        "formula_dish_id,formula_id,dish_id,sequence,step,is_main,default_product_option_ids,formula_name,formula_image_url,restaurant_id";
      let linksQuery = supabase.from("formula_dish_links").select(formulaSelect);
      if (currentRestaurantId) linksQuery = linksQuery.eq("restaurant_id", currentRestaurantId);
      const linksPrimary = await linksQuery;
      linksResult = {
        data: (linksPrimary.data as unknown[] | null) ?? null,
        error: linksPrimary.error as { code?: string; message?: string } | null,
      };

      if (linksResult.error && String(linksResult.error.code || "") === "42703") {
        linksQuery = supabase
          .from("formula_dish_links")
          .select("formula_dish_id,dish_id,sequence,default_product_option_ids,formula_name,formula_image_url");
        const linksFallbackWithDefaults = await linksQuery;
        linksResult = {
          data: (linksFallbackWithDefaults.data as unknown[] | null) ?? null,
          error: linksFallbackWithDefaults.error as { code?: string; message?: string } | null,
        };
      }
      if (linksResult.error && String(linksResult.error.code || "") === "42703") {
        linksQuery = supabase.from("formula_dish_links").select("formula_dish_id,dish_id,sequence");
        const linksFallbackBasic = await linksQuery;
        linksResult = {
          data: (linksFallbackBasic.data as unknown[] | null) ?? null,
          error: linksFallbackBasic.error as { code?: string; message?: string } | null,
        };
      }

      if (linksResult.error) {
        console.warn("formula_dish_links fetch failed (admin):", linksResult.error.message || linksResult.error);
        setFormulaLinksByFormulaId(new Map());
        setFormulaLinksByDishId(new Map());
        setFormulaDisplayById(new Map());
        setFormulaDishIdsFromLinks(new Set(formulaIdSetForInit));
      } else {
        const byFormula = new Map<string, FormulaDishLink[]>();
        const byDish = new Map<string, FormulaDishLink[]>();
        const displayByFormula = new Map<string, { name?: string; imageUrl?: string }>();
        (linksResult.data || []).forEach((row: unknown) => {
          if (!row || typeof row !== "object") return;
          const record = row as Record<string, unknown>;
          const formulaDishId = String(record.formula_dish_id ?? record.formula_id ?? "").trim();
          const dishId = String(record.dish_id || "").trim();
          if (!formulaDishId || !dishId) return;
          formulaIdSetForInit.add(formulaDishId);
          const rawSequence = Number(record.sequence ?? record.step);
          const sequence = Number.isFinite(rawSequence) ? Math.max(1, Math.trunc(rawSequence)) : null;
          const isMain = readBooleanFlag(record.is_main, dishId === formulaDishId);
          const rawDefaultOptionIds = record.default_product_option_ids;
          let defaultProductOptionIds: string[] = [];
          if (Array.isArray(rawDefaultOptionIds)) {
            defaultProductOptionIds = rawDefaultOptionIds.map((value: unknown) => String(value || "").trim()).filter(Boolean);
          } else if (typeof rawDefaultOptionIds === "string") {
            try {
              const parsed = JSON.parse(rawDefaultOptionIds) as unknown;
              if (Array.isArray(parsed)) {
                defaultProductOptionIds = parsed.map((value: unknown) => String(value || "").trim()).filter(Boolean);
              }
            } catch {
              defaultProductOptionIds = rawDefaultOptionIds
                .split(",")
                .map((value) => String(value || "").trim())
                .filter(Boolean);
            }
          }
          const formulaName = String(record.formula_name || "").trim();
          const formulaImageUrl = String(record.formula_image_url || "").trim();
          const link: FormulaDishLink = {
            formulaDishId,
            dishId,
            sequence,
            isMain,
            defaultProductOptionIds: defaultProductOptionIds.length > 0 ? defaultProductOptionIds : undefined,
            formulaName: formulaName || undefined,
            formulaImageUrl: formulaImageUrl || undefined,
          };
          const formulaLinks = byFormula.get(formulaDishId) || [];
          if (!formulaLinks.some((entry) => entry.dishId === dishId)) formulaLinks.push(link);
          byFormula.set(formulaDishId, formulaLinks);
          const dishLinks = byDish.get(dishId) || [];
          if (!dishLinks.some((entry) => entry.formulaDishId === formulaDishId)) dishLinks.push(link);
          byDish.set(dishId, dishLinks);
          if (formulaName || formulaImageUrl) {
            const currentDisplay = displayByFormula.get(formulaDishId) || {};
            displayByFormula.set(formulaDishId, {
              name: currentDisplay.name || formulaName,
              imageUrl: currentDisplay.imageUrl || formulaImageUrl,
            });
          }
        });
        setFormulaLinksByFormulaId(byFormula);
        setFormulaLinksByDishId(byDish);
        setFormulaDisplayById(displayByFormula);
        setFormulaDishIdsFromLinks(new Set(formulaIdSetForInit));
      }
      hasFormulaCategoryLocal = formulasTableIsAvailable
        ? formulaDishIdSetFromTable.size > 0
        : formulaIdSetForInit.size > 0;
      console.log("[admin.fetchFastEntryResources] dishes loaded", {
        restaurantId: currentRestaurantId,
        count: nextDishes.length,
        sample: nextDishes[0] || null,
      });
    } else {
      console.error("DEBUG_SQL_TOTAL:", dishesError);
      const message = (dishesError as { message?: string } | null)?.message || "Erreur fetch dishes (admin)";
      console.error("Erreur fetch dishes (admin):", message);
      setFormulasTableAvailable(null);
      setFormulaDishIdsFromFormulasTable(new Set());
      setFormulaPriceByDishId(new Map());
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
      const initialCategory = firstCategory || fallbackCategory || (hasFormulaCategoryLocal ? FORMULAS_CATEGORY_KEY : "");
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
      .on("postgres_changes", { event: "*", schema: "public", table: "formula_dish_links" }, () => void fetchFastEntryResources())
      .on("postgres_changes", { event: "*", schema: "public", table: "formulas" }, () => void fetchFastEntryResources())
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

  const handleServeItems = async (orderId: string, itemIndexes: number[]) => {
    const targetOrder = orders.find((order) => String(order.id) === String(orderId));
    if (!targetOrder) {
      await fetchOrders();
      return;
    }
    const normalizedIndexes = Array.from(new Set(itemIndexes.filter((idx) => Number.isInteger(idx) && idx >= 0)));
    if (normalizedIndexes.length === 0) return;
    const currentItems = parseItems(targetOrder.items);
    const indexSet = new Set<number>(normalizedIndexes);

    const nextItems = currentItems.map((item, idx) =>
      indexSet.has(idx) ? { ...(item || {}), status: "served" } : item
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
      console.error("Erreur service articles:", error);
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

  const formulaParentDishIds = useMemo(() => {
    const ids = new Set<string>();
    if (formulasTableAvailable) {
      formulaDishIdsFromFormulasTable.forEach((id) => {
        const normalizedId = String(id || "").trim();
        if (normalizedId) ids.add(normalizedId);
      });
      return ids;
    }
    formulaLinksByFormulaId.forEach((_, formulaDishId) => {
      const normalizedId = String(formulaDishId || "").trim();
      if (normalizedId) ids.add(normalizedId);
    });
    if (ids.size === 0) {
      formulaDishIdsFromLinks.forEach((id) => {
        const normalizedId = String(id || "").trim();
        if (normalizedId) ids.add(normalizedId);
      });
    }
    return ids;
  }, [formulasTableAvailable, formulaDishIdsFromFormulasTable, formulaLinksByFormulaId, formulaDishIdsFromLinks]);

  const fetchFormulaDishes = () =>
    dishes.filter((dish) => {
      const id = String(dish.id || "").trim();
      return id && formulaParentDishIds.has(id);
    });

  const formulaDishes = fetchFormulaDishes();
  const categoriesForFastEntryBase =
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
  const categoriesForFastEntry = [{ key: FORMULAS_CATEGORY_KEY, label: "Formules" }, ...categoriesForFastEntryBase];

  const availableFastCategoryKeys = new Set(categoriesForFastEntry.map((category) => category.key));
  const effectiveSelectedFastCategoryKey = availableFastCategoryKeys.has(selectedCategory)
    ? selectedCategory
    : categoriesForFastEntry[0]?.key || "";

  const fastEntryDishes =
    !effectiveSelectedFastCategoryKey
      ? dishes
      : effectiveSelectedFastCategoryKey === FORMULAS_CATEGORY_KEY
        ? formulaDishes
        : dishes.filter(
            (dish) =>
              normalizeCategoryKey(getDishCategoryLabel(dish)) === effectiveSelectedFastCategoryKey &&
              !formulaParentDishIds.has(String(dish.id || "").trim())
          );
  const visibleFastEntryDishes =
    effectiveSelectedFastCategoryKey === FORMULAS_CATEGORY_KEY
      ? fastEntryDishes
      : fastEntryDishes.length > 0
        ? fastEntryDishes
        : dishes;

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
        destination: resolveDishDestination(dish),
        isDrink: resolveDishDestination(dish) === "bar",
      });
    });

    return lines;
  })();

  const fastLines = [...fastBaseLines, ...fastOptionLines];

  const resolveFastLineUnitPrice = (line: FastOrderLine) => {
    const isFormulaLine = Boolean(line.isFormula || line.formulaDishId || (line.formulaSelections || []).length > 0);
    if (isFormulaLine) {
      const formulaPrice = Number(line.formulaUnitPrice);
      if (Number.isFinite(formulaPrice) && formulaPrice > 0) return formulaPrice;
    }
    const unitPrice = Number(line.unitPrice || 0);
    return Number.isFinite(unitPrice) ? unitPrice : 0;
  };
  const fastTotal = fastLines.reduce((sum, line) => sum + resolveFastLineUnitPrice(line) * line.quantity, 0);
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

  const closeFormulaModal = () => {
    setFormulaModalOpen(false);
    setFormulaModalDish(null);
    setFormulaModalSourceDish(null);
    setFormulaModalSelections({});
    setFormulaModalSelectionDetails({});
    setFormulaModalError("");
    setFormulaModalItemDetailsOpen({});
    setFormulaResolvedDishById({});
    setFormulaOptionModalState(null);
  };

  const openFormulaModal = (formula: DishItem, sourceDish?: DishItem | null) => {
    const sourceFormula = dishes.find((row) => String(row.id) === String(formula.id)) || formula;
    const resolvedSourceDish = sourceDish
      ? dishes.find((row) => String(row.id) === String(sourceDish.id)) || sourceDish
      : null;
    setFormulaModalDish(sourceFormula);
    setFormulaModalSourceDish(resolvedSourceDish);
    setFormulaModalSelections({});
    setFormulaModalSelectionDetails({});
    setFormulaModalError("");
    setFormulaModalItemDetailsOpen({});
    setFormulaOptionModalState(null);
    setFormulaResolvedDishById(() => {
      const next: Record<string, DishItem> = {};
      const formulaId = String(sourceFormula.id || "").trim();
      if (formulaId) next[formulaId] = sourceFormula;
      const sourceDishId = String(resolvedSourceDish?.id || "").trim();
      if (sourceDishId && resolvedSourceDish) next[sourceDishId] = resolvedSourceDish;
      return next;
    });
    setFormulaModalOpen(true);
  };

  const ensureFormulaDishDetails = async (dish: DishItem | null | undefined) => {
    if (!dish) return null;
    const dishId = String(dish.id || "").trim();
    const cached = dishId ? formulaResolvedDishById[dishId] : null;
    if (cached) return cached;
    const loaded = await loadDishOptionsFromDishes(dish);
    const loadedDish = loaded || dish;
    if (dishId) {
      setFormulaResolvedDishById((prev) => ({ ...prev, [dishId]: loadedDish }));
    }
    return loadedDish;
  };

  const openFormulaItemOptionsModal = async (
    categoryId: string,
    optionDish: DishItem,
    resetSelectionDetails = true
  ) => {
    const normalizedCategoryId = String(categoryId || "").trim();
    const optionId = String(optionDish.id || "").trim();
    if (!normalizedCategoryId || !optionId) return;

    setFormulaModalError("");
    setFormulaModalSelections((prev) => ({ ...prev, [normalizedCategoryId]: optionId }));

    const optionDishResolved = resolveFormulaDishRecord(optionDish) || optionDish;
    const loadedDish = (await ensureFormulaDishDetails(optionDishResolved)) || optionDishResolved;
    const loadedConfig = getFormulaDishConfig(loadedDish);
    const rawDefaultOptionIds = formulaDefaultOptionsByDishId.get(optionId) || [];
    const allowedOptionIds = new Set(
      loadedConfig.productOptions.map((option) => String(option.id || "").trim()).filter(Boolean)
    );
    const normalizedDefaults = rawDefaultOptionIds.filter((id) =>
      allowedOptionIds.has(String(id || "").trim())
    );
    const allowMultiDefaults = Boolean(
      (loadedDish as unknown as { allow_multi_select?: unknown }).allow_multi_select
    );
    const nextDefaultOptionIds = allowMultiDefaults ? normalizedDefaults : normalizedDefaults.slice(0, 1);

    setFormulaModalSelectionDetails((prev) => {
      const current = prev[normalizedCategoryId];
      if (!resetSelectionDetails && current) {
        return prev;
      }
      return {
        ...prev,
        [normalizedCategoryId]: {
          selectedSideIds: [],
          selectedSides: [],
          selectedCooking: "",
          selectedProductOptionIds: nextDefaultOptionIds,
        },
      };
    });

    const hasNestedFormulaOptions =
      loadedConfig.productOptions.length > 0 ||
      loadedConfig.hasRequiredSides ||
      loadedConfig.askCooking;
    if (hasNestedFormulaOptions) {
      setFormulaOptionModalState({ categoryId: normalizedCategoryId, dishId: optionId });
    } else {
      setFormulaOptionModalState(null);
    }
  };

  const appendFormulaLine = (formulaDish: DishItem, selections: FormulaSelection[]) => {
    const currentFormulaSelection =
      [...selections].sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0))[0] || null;
    const formulaDestination = currentFormulaSelection?.destination || resolveDishDestination(formulaDish);
    const category = getDishCategoryLabel(formulaDish);
    const formulaName = getFormulaDisplayName(formulaDish);
    const line: FastOrderLine = {
      lineId: makeLineId(),
      dishId: String(formulaDish.id || ""),
      dishName: formulaName,
      category,
      categoryId: formulaDish.category_id ?? null,
      quantity: 1,
      unitPrice: getFormulaPackPrice(formulaDish),
      selectedSides: [],
      selectedExtras: [],
      selectedProductOptionId: null,
      selectedProductOptionName: null,
      selectedProductOptionPrice: 0,
      selectedCooking: "",
      specialRequest: "",
      isDrink: formulaDestination === "bar",
      destination: formulaDestination,
      isFormula: true,
      formulaDishId: String(formulaDish.id || "").trim() || undefined,
      formulaDishName: formulaName,
      formulaUnitPrice: getFormulaPackPrice(formulaDish),
      formulaSelections: selections,
    };
    setFastOptionLines((prev) => [...prev, line]);
  };

  const resolveFormulaLinksForDish = (formulaDish: DishItem) => {
    const formulaDishId = String(formulaDish.id || "").trim();
    if (!formulaDishId) return [] as FormulaDishLink[];
    const existing = formulaLinksByFormulaId.get(formulaDishId) || [];
    const byDishId = new Map<string, FormulaDishLink>();
    existing.forEach((link) => {
      const dishId = String(link.dishId || "").trim();
      if (!dishId) return;
      if (byDishId.has(dishId)) return;
      byDishId.set(dishId, link);
    });
    if (!byDishId.has(formulaDishId)) {
      byDishId.set(formulaDishId, {
        formulaDishId,
        dishId: formulaDishId,
        sequence: 1,
        isMain: true,
      });
    }
    return [...byDishId.values()];
  };

  const resolveFirstStepFormulaLinks = (formulaDish: DishItem) => {
    const links = resolveFormulaLinksForDish(formulaDish);
    if (links.length === 0) return [] as FormulaDishLink[];
    const normalized = links.map((link) => {
      const rawSequence = Number(link.sequence);
      if (Number.isFinite(rawSequence) && rawSequence > 0) {
        return {
          link,
          sequence: Math.max(1, Math.trunc(rawSequence)),
        };
      }
      if (link.isMain) {
        return {
          link: {
            ...link,
            sequence: 1,
          },
          sequence: 1,
        };
      }
      return {
        link,
        sequence: null as number | null,
      };
    });
    const stepOne = normalized.filter((entry) => entry.sequence === 1).map((entry) => entry.link);
    if (stepOne.length > 0) return stepOne;
    const withSequence = normalized.filter((entry) => Number.isFinite(entry.sequence) && Number(entry.sequence) > 0);
    if (withSequence.length > 0) {
      const minSequence = Math.min(...withSequence.map((entry) => Number(entry.sequence)));
      return withSequence
        .filter((entry) => Number(entry.sequence) === minSequence)
        .map((entry) => entry.link);
    }
    return links;
  };

  const formulaDishNeedsOptions = async (dish: DishItem) => {
    const loadedDish = (await ensureFormulaDishDetails(dish)) || dish;
    const config = getFormulaDishConfig(loadedDish);
    return config.productOptions.length > 0 || config.hasRequiredSides || config.askCooking;
  };

  const buildAutoFormulaSelections = async (formulaDish: DishItem) => {
    const formulaDishId = String(formulaDish.id || "").trim();
    if (!formulaDishId) return [] as FormulaSelection[];
    const links = resolveFormulaLinksForDish(formulaDish);
    const sequenceByDishId = new Map<string, number>();
    const defaultOptionIdsByDishId = new Map<string, string[]>();
    const linkedDishIdsByCategory = new Map<string, Set<string>>();
    links.forEach((link) => {
      const linkedDishId = String(link.dishId || "").trim();
      if (!linkedDishId) return;
      const rawSequence = Number(link.sequence);
      if (Number.isFinite(rawSequence) && rawSequence > 0) {
        sequenceByDishId.set(linkedDishId, Math.max(1, Math.trunc(rawSequence)));
      } else if (Boolean(link.isMain)) {
        sequenceByDishId.set(linkedDishId, 1);
      }
      if (Array.isArray(link.defaultProductOptionIds) && link.defaultProductOptionIds.length > 0) {
        defaultOptionIdsByDishId.set(linkedDishId, link.defaultProductOptionIds);
      }
      const linkedDish = dishById.get(linkedDishId);
      const linkedCategoryId = String(linkedDish?.category_id || "").trim();
      if (!linkedCategoryId) return;
      const currentSet = linkedDishIdsByCategory.get(linkedCategoryId) || new Set<string>();
      currentSet.add(linkedDishId);
      linkedDishIdsByCategory.set(linkedCategoryId, currentSet);
    });
    const parsedCategoryIds = parseFormulaCategoryIds(
      (formulaDish as unknown as { formula_category_ids?: unknown }).formula_category_ids
    );
    const categoryIds =
      parsedCategoryIds.length > 0
        ? parsedCategoryIds
        : Array.from(linkedDishIdsByCategory.keys());
    const selections: FormulaSelection[] = [];
    for (const [categoryIndex, rawCategoryId] of categoryIds.entries()) {
      const categoryId = String(rawCategoryId || "").trim();
      if (!categoryId) continue;
      const linkedIds = linkedDishIdsByCategory.get(categoryId);
      const restrictToLinked = Boolean(linkedIds && linkedIds.size > 0);
      const options = dishes
        .filter((dish) => String(dish.category_id || "").trim() === categoryId)
        .filter((dish) => !readBooleanFlag((dish as unknown as { is_formula?: unknown }).is_formula))
        .filter((dish) => String(dish.id || "").trim() !== formulaDishId)
        .filter((dish) => !restrictToLinked || linkedIds?.has(String(dish.id || "").trim()));
      if (options.length === 0) continue;
      const sortedOptions = [...options].sort((a, b) => {
        const aId = String(a.id || "").trim();
        const bId = String(b.id || "").trim();
        const aSequence = sequenceByDishId.get(aId);
        const bSequence = sequenceByDishId.get(bId);
        const aSort = Number.isFinite(Number(aSequence)) && Number(aSequence) > 0 ? Number(aSequence) : 999;
        const bSort = Number.isFinite(Number(bSequence)) && Number(bSequence) > 0 ? Number(bSequence) : 999;
        if (aSort !== bSort) return aSort - bSort;
        return getDishName(a).localeCompare(getDishName(b), "fr", { sensitivity: "base" });
      });
      const selectedDish = sortedOptions[0];
      const selectedDishId = String(selectedDish.id || "").trim();
      if (!selectedDishId) continue;
      const loadedSelectedDish = (await ensureFormulaDishDetails(selectedDish)) || selectedDish;
      const config = getFormulaDishConfig(loadedSelectedDish);
      const availableOptionIds = new Set(
        config.productOptions.map((option) => String(option.id || "").trim()).filter(Boolean)
      );
      const linkedDefaultOptionIds = (defaultOptionIdsByDishId.get(selectedDishId) || []).filter((id) =>
        availableOptionIds.has(String(id || "").trim())
      );
      const allowMulti = Boolean(
        (loadedSelectedDish as unknown as { allow_multi_select?: unknown }).allow_multi_select
      );
      const selectedOptionIds = allowMulti ? linkedDefaultOptionIds : linkedDefaultOptionIds.slice(0, 1);
      const selectedOptions = config.productOptions.filter((option) =>
        selectedOptionIds.includes(String(option.id || "").trim())
      );
      const selectedOptionNames = selectedOptions
        .map((option) => String(option.name || "").trim())
        .filter(Boolean);
      const selectedOptionPrice = selectedOptions.reduce(
        (sum, option) => sum + parsePriceNumber(option.price),
        0
      );
      const linkedSequence = sequenceByDishId.get(selectedDishId);
      const sequence =
        Number.isFinite(Number(linkedSequence)) && Number(linkedSequence) > 0
          ? Number(linkedSequence)
          : categoryIndex + 1;
      const category = categoryById.get(categoryId);
      selections.push({
        categoryId,
        categoryLabel: category ? getCategoryLabel(category) : "",
        dishId: selectedDishId,
        dishName: getDishName(loadedSelectedDish),
        destination: resolveDishDestination(loadedSelectedDish),
        sequence,
        selectedSideIds: [],
        selectedSides: [],
        selectedCooking: "",
        selectedOptionIds,
        selectedOptionNames,
        selectedOptionPrice,
      } as FormulaSelection);
    }
    return selections;
  };

  const handleSelectFormula = async (formula: DishItem) => {
    const sourceFormula = dishes.find((row) => String(row.id) === String(formula.id)) || formula;
    const stepOneLinks = resolveFirstStepFormulaLinks(sourceFormula);
    for (const stepLink of stepOneLinks) {
      const stepDishId = String(stepLink.dishId || "").trim();
      if (!stepDishId) continue;
      const stepDish =
        stepDishId === String(sourceFormula.id || "").trim()
          ? sourceFormula
          : dishById.get(stepDishId) || null;
      if (!stepDish) continue;
      const needsOptions = await formulaDishNeedsOptions(stepDish);
      if (!needsOptions) continue;
      const stepDishCategoryId = String(stepDish.category_id || "").trim();
      openFormulaModal(sourceFormula, stepDish);
      if (stepDishCategoryId) {
        window.setTimeout(() => {
          void openFormulaItemOptionsModal(stepDishCategoryId, stepDish, true);
        }, 0);
      }
      return;
    }
    const selections = await buildAutoFormulaSelections(sourceFormula);
    appendFormulaLine(sourceFormula, selections);
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

  const handleAddFormulaLine = async () => {
    if (!formulaModalDish) return;
    if (formulaOptionModalOpen) {
      setFormulaModalError("Validez les options du plat sélectionné avant d'ajouter la formule.");
      return;
    }
    const missingCategory = normalizedFormulaCategoryIds.find((categoryId) => {
      const normalizedCategoryId = String(categoryId || "").trim();
      if (!normalizedCategoryId) return false;
      const options = formulaOptionsByCategory.get(normalizedCategoryId) || [];
      if (options.length === 0) return false;
      return !formulaModalSelections[normalizedCategoryId];
    });
    if (missingCategory) {
      setFormulaModalError(formulaUi.missing);
      return;
    }
    const resolvedSelectionsByCategory = new Map<string, DishItem>();
    for (const categoryId of normalizedFormulaCategoryIds) {
      const normalizedCategoryId = String(categoryId || "").trim();
      if (!normalizedCategoryId) continue;
      const selectedId = String(formulaModalSelections[normalizedCategoryId] || "").trim();
      if (!selectedId) continue;
      const sourceDish = resolveFormulaDishRecord(dishById.get(selectedId)) || dishById.get(selectedId);
      if (!sourceDish) continue;
      const loadedDish = await ensureFormulaDishDetails(sourceDish);
      if (loadedDish) resolvedSelectionsByCategory.set(normalizedCategoryId, loadedDish);
    }
    const missingRequiredOptionsCategory = normalizedFormulaCategoryIds
      .map((categoryId) => {
        const normalizedCategoryId = String(categoryId || "").trim();
        if (!normalizedCategoryId) return null;
        const selectedId = String(formulaModalSelections[normalizedCategoryId] || "").trim();
        if (!selectedId) return null;
        const selectedDish =
          resolvedSelectionsByCategory.get(normalizedCategoryId) ||
          resolveFormulaDishRecord(dishById.get(selectedId));
        if (!selectedDish) return null;
        const config = getFormulaDishConfig(selectedDish);
        const details = getFormulaSelectionDetails(normalizedCategoryId);
        const missingProductOption =
          config.productOptions.length > 0 && details.selectedProductOptionIds.length === 0;
        const missingSides = config.hasRequiredSides && details.selectedSides.length === 0;
        const missingCooking = config.askCooking && !String(details.selectedCooking || "").trim();
        if (!missingProductOption && !missingSides && !missingCooking) return null;
        return {
          categoryId: normalizedCategoryId,
          selectedDish,
        };
      })
      .find(Boolean);
    if (missingRequiredOptionsCategory) {
      setFormulaModalError(formulaUi.missingOptions);
      void openFormulaItemOptionsModal(
        missingRequiredOptionsCategory.categoryId,
        missingRequiredOptionsCategory.selectedDish,
        false
      );
      return;
    }

    const selections: FormulaSelection[] = normalizedFormulaCategoryIds
      .map((categoryId, categoryIndex) => {
        const normalizedCategoryId = String(categoryId || "").trim();
        const selectedId = String(formulaModalSelections[normalizedCategoryId] || "").trim();
        if (!normalizedCategoryId || !selectedId) return null;
        const category = categoryById.get(normalizedCategoryId);
        const selectedDish =
          resolvedSelectionsByCategory.get(normalizedCategoryId) ||
          resolveFormulaDishRecord(dishById.get(selectedId));
        if (!selectedDish) return null;
        const config = getFormulaDishConfig(selectedDish);
        const details = getFormulaSelectionDetails(normalizedCategoryId);
        const selectedOptions = config.productOptions.filter((option) =>
          details.selectedProductOptionIds.includes(String(option.id || "").trim())
        );
        const selectedOptionNames = selectedOptions
          .map((option) => String(option.name || "").trim())
          .filter(Boolean);
        const selectedOptionPrice = selectedOptions.reduce(
          (sum, option) => sum + parsePriceNumber(option.price),
          0
        );
        const linkedSequence = formulaSequenceByDishId.get(selectedId);
        const sequence =
          Number.isFinite(Number(linkedSequence)) && Number(linkedSequence) > 0
            ? Number(linkedSequence)
            : categoryIndex + 1;
        return {
          categoryId: normalizedCategoryId,
          categoryLabel: category ? getCategoryLabel(category) : "",
          dishId: selectedId,
          dishName: getDishName(selectedDish),
          destination: resolveDishDestination(selectedDish),
          sequence,
          selectedSideIds: details.selectedSideIds,
          selectedSides: details.selectedSides,
          selectedCooking: details.selectedCooking,
          selectedOptionIds: details.selectedProductOptionIds,
          selectedOptionNames,
          selectedOptionPrice,
        } as FormulaSelection;
      })
      .filter(Boolean) as FormulaSelection[];
    appendFormulaLine(formulaModalDish, selections);
    closeFormulaModal();
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
    const destination = resolveDishDestination(modalDish);
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
      destination,
      isDrink: destination === "bar",
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
    const markTableAsOccupied = async () => {
      const occupancyPayloads = [
        { status: "occupied", occupied: true, restaurant_id: targetRestaurantId || undefined },
        { status: "occupied", restaurant_id: targetRestaurantId || undefined },
        { occupied: true, restaurant_id: targetRestaurantId || undefined },
        { status: "occupied", occupied: true },
        { status: "occupied" },
        { occupied: true },
      ];
      let updateQuery = supabase.from("table_assignments").update(occupancyPayloads[0]).eq("table_number", tableNumber);
      if (targetRestaurantId) updateQuery = updateQuery.eq("restaurant_id", targetRestaurantId);
      let updated = await updateQuery;
      for (let i = 1; updated.error && i < occupancyPayloads.length; i += 1) {
        const code = String((updated.error as { code?: string })?.code || "");
        const msg = String(updated.error.message || "").toLowerCase();
        const missingColumn = code === "42703" || msg.includes("column") || msg.includes("schema cache");
        if (!missingColumn) break;
        let nextUpdateQuery = supabase.from("table_assignments").update(occupancyPayloads[i]).eq("table_number", tableNumber);
        if (targetRestaurantId && i < 3) nextUpdateQuery = nextUpdateQuery.eq("restaurant_id", targetRestaurantId);
        updated = await nextUpdateQuery;
      }
      return updated.error || null;
    };

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
      return await markTableAsOccupied();
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

    return await markTableAsOccupied();
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
        const rawUnitPrice = Number(line.unitPrice || 0);
        const formulaDishId = String(line.formulaDishId || "").trim() || null;
        const formulaDishName = String(line.formulaDishName || "").trim() || null;
        const formulaSelections = Array.isArray(line.formulaSelections) ? line.formulaSelections : [];
        const resolveSelectionDestination = (selection: FormulaSelection): "cuisine" | "bar" => {
          const explicit = String(selection.destination || "").trim().toLowerCase();
          if (explicit === "bar") return "bar";
          if (explicit === "cuisine" || explicit === "kitchen") return "cuisine";
          return resolveDestinationForCategory(selection.categoryId, selection.categoryLabel || "");
        };
        const isFormulaLine = Boolean(line.isFormula || formulaDishId || formulaSelections.length > 0);
        const formulaDishRecord = formulaDishId ? dishById.get(formulaDishId) || null : null;
        const formulaUnitPriceRaw = Number(line.formulaUnitPrice);
        const formulaUnitPrice =
          isFormulaLine
            ? Number.isFinite(formulaUnitPriceRaw) && formulaUnitPriceRaw > 0
              ? Number(formulaUnitPriceRaw.toFixed(2))
              : formulaDishRecord
                ? Number(getFormulaPackPrice(formulaDishRecord).toFixed(2))
                : Number(rawUnitPrice.toFixed(2))
            : null;
        const unitPrice = formulaUnitPrice != null ? formulaUnitPrice : rawUnitPrice;
        const optionPrice = parsePriceNumber(line.selectedProductOptionPrice);
        const extrasPrice = isFormulaLine
          ? 0
          : (line.selectedExtras || []).reduce((sum, extra) => sum + parsePriceNumber(extra.price), 0);
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
        if (formulaSelections.length > 0) {
          formulaSelections.forEach((selection) => {
            if (!selection?.dishId) return;
            const rawSequence = Number(selection.sequence);
            const sequence = Number.isFinite(rawSequence) && rawSequence > 0 ? Math.trunc(rawSequence) : null;
            const selectionSideIds = Array.isArray(selection.selectedSideIds) ? selection.selectedSideIds : [];
            const selectionSides = Array.isArray(selection.selectedSides) ? selection.selectedSides : [];
            const selectionCooking = String(selection.selectedCooking || "").trim();
            const selectionOptionIds = Array.isArray(selection.selectedOptionIds) ? selection.selectedOptionIds : [];
            const selectionOptionNames = Array.isArray(selection.selectedOptionNames) ? selection.selectedOptionNames : [];
            const selectionSideLabelFr = selectionSides.join(", ");
            const selectionOptionLabelFr = selectionOptionNames.join(", ");
            const selectionCookingKey = toCookingKeyFromLabel(selectionCooking);
            const selectionDestination = resolveSelectionDestination(selection);
            selectedOptionsPayload.push({
              kind: "formula",
              formula_dish_id: formulaDishId,
              formula_dish_name: formulaDishName,
              category_id: selection.categoryId || null,
              category_label: selection.categoryLabel || null,
              dish_id: selection.dishId || null,
              value: selection.dishName || null,
              label_fr: selection.dishName || null,
              name_fr: selection.dishName || null,
              price: 0,
              destination: selectionDestination,
              selected_side_ids: selectionSideIds,
              selected_sides: selectionSides,
              selected_side_label_fr: selectionSideLabelFr || null,
              selected_cooking: selectionCooking || null,
              selected_cooking_key: selectionCookingKey || null,
              selected_cooking_label_fr: selectionCooking || null,
              selected_option_ids: selectionOptionIds,
              selected_option_names: selectionOptionNames,
              selected_option_label_fr: selectionOptionLabelFr || null,
              selected_option_price: 0,
              sequence,
            });
            if (selectionSides.length > 0 || selectionSideIds.length > 0) {
              selectedOptionsPayload.push({
                kind: "side",
                source: "formula",
                formula_dish_id: formulaDishId,
                dish_id: selection.dishId || null,
                destination: selectionDestination,
                ids: selectionSideIds,
                values: selectionSides,
                label_fr: selectionSideLabelFr || null,
                sequence,
              });
            }
            if (selectionCooking) {
              selectedOptionsPayload.push({
                kind: "cooking",
                source: "formula",
                formula_dish_id: formulaDishId,
                dish_id: selection.dishId || null,
                destination: selectionDestination,
                key: selectionCookingKey || null,
                value: selectionCooking,
                label_fr: selectionCooking,
                sequence,
              });
            }
            if (selectionOptionNames.length > 0 || selectionOptionIds.length > 0) {
              selectedOptionsPayload.push({
                kind: "option",
                source: "formula",
                formula_dish_id: formulaDishId,
                dish_id: selection.dishId || null,
                destination: selectionDestination,
                id: selectionOptionIds.length > 0 ? selectionOptionIds.join(",") : null,
                values: selectionOptionNames,
                value: selectionOptionLabelFr || null,
                label_fr: selectionOptionLabelFr || null,
                sequence,
              });
            }
          });
        }
        const formulaItemsPayload = formulaSelections
          .map((selection) => {
            if (!selection?.dishId) return null;
            const rawSequence = Number(selection.sequence);
            const sequence = Number.isFinite(rawSequence) && rawSequence > 0 ? Math.trunc(rawSequence) : null;
            const selectionSideIds = Array.isArray(selection.selectedSideIds) ? selection.selectedSideIds : [];
            const selectionSides = Array.isArray(selection.selectedSides) ? selection.selectedSides : [];
            const selectionCooking = String(selection.selectedCooking || "").trim();
            const selectionOptionIds = Array.isArray(selection.selectedOptionIds) ? selection.selectedOptionIds : [];
            const selectionOptionNames = Array.isArray(selection.selectedOptionNames) ? selection.selectedOptionNames : [];
            const selectionSideLabelFr = selectionSides.join(", ");
            const selectionOptionLabelFr = selectionOptionNames.join(", ");
            const selectionCookingKey = toCookingKeyFromLabel(selectionCooking);
            const selectionDestination = resolveSelectionDestination(selection);
            return {
              formula_dish_id: formulaDishId,
              formula_dish_name: formulaDishName,
              category_id: selection.categoryId || null,
              category_label: selection.categoryLabel || null,
              dish_id: selection.dishId || null,
              dish_name: selection.dishName || null,
              dish_name_fr: selection.dishName || null,
              destination: selectionDestination,
              is_drink: selectionDestination === "bar",
              price: 0,
              base_price: 0,
              unit_total_price: 0,
              selected_side_ids: selectionSideIds,
              selected_sides: selectionSides,
              selected_side_label_fr: selectionSideLabelFr || null,
              selected_cooking: selectionCooking || null,
              selected_cooking_key: selectionCookingKey || null,
              selected_cooking_label_fr: selectionCooking || null,
              selected_option_ids: selectionOptionIds,
              selected_option_names: selectionOptionNames,
              selected_option_label_fr: selectionOptionLabelFr || null,
              selected_option_price: 0,
              sequence,
            };
          })
          .filter(Boolean);
        const formulaSequenceValues = formulaSelections
          .map((selection) => Number(selection.sequence))
          .filter((value) => Number.isFinite(value) && value > 0)
          .map((value) => Math.max(1, Math.trunc(value)));
        const formulaCurrentSequence =
          formulaSequenceValues.length > 0 ? Math.min(...formulaSequenceValues) : null;
        const currentFormulaSelection =
          formulaCurrentSequence == null
            ? [...formulaSelections].sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0))[0] || null
            : formulaSelections.find(
                (selection) => Math.max(1, Math.trunc(Number(selection.sequence || 0))) === formulaCurrentSequence
              ) || null;
        const formulaCurrentDestination = currentFormulaSelection
          ? resolveSelectionDestination(currentFormulaSelection)
          : null;
        const explicitLineDestination = String(line.destination || "").trim().toLowerCase();
        const destination: "cuisine" | "bar" =
          explicitLineDestination === "bar"
            ? "bar"
            : explicitLineDestination === "cuisine" || explicitLineDestination === "kitchen"
              ? "cuisine"
              : formulaCurrentDestination ||
                resolveDestinationForCategory(line.categoryId, line.category || "");
        const formulaPayload =
          isFormulaLine && formulaDishName
            ? {
                name: formulaDishName,
                price: Number((formulaUnitPrice != null ? formulaUnitPrice : unitPrice).toFixed(2)),
                items: formulaSelections
                  .map((selection) => {
                    const dishLabel = String(selection.dishName || "").trim();
                    if (!dishLabel) return null;
                    const selectedSides = Array.isArray(selection.selectedSides) ? selection.selectedSides.filter(Boolean) : [];
                    const selectedOptions = Array.isArray(selection.selectedOptionNames)
                      ? selection.selectedOptionNames.filter(Boolean)
                      : [];
                    const selectedCooking = String(selection.selectedCooking || "").trim();
                    const options: Record<string, unknown> = {};
                    if (selectedCooking) options.cuisson = selectedCooking;
                    if (selectedSides.length === 1) options.accompagnement = selectedSides[0];
                    if (selectedSides.length > 1) options.accompagnements = selectedSides;
                    if (selectedOptions.length === 1) options.option = selectedOptions[0];
                    if (selectedOptions.length > 1) options.options = selectedOptions;
                    return {
                      dish: dishLabel,
                      destination: resolveSelectionDestination(selection),
                      price: 0,
                      options,
                    };
                  })
                  .filter(Boolean),
              }
            : null;
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
          destination,
          is_drink: destination === "bar",
          cooking: cookingLabel || null,
          cuisson: cookingLabel || null,
          selected_cooking_label_fr: cookingLabel || null,
          selected_cooking_label: cookingLabel || null,
          selected_cooking_key: cookingKey || null,
          formula_dish_id: formulaDishId,
          formula_dish_name: formulaDishName,
          formula_unit_price: formulaUnitPrice,
          formula_current_sequence: formulaCurrentSequence,
          formula_items: formulaItemsPayload.length > 0 ? formulaItemsPayload : null,
          formula: formulaPayload,
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
      service_step: "entree",
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
      service_step: "entree",
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
        service_step: "entree",
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
        service_step: "entree",
      },
      {
        id: forcedOrderId,
        restaurant_id: payload.restaurant_id,
        table_number: payload.table_number,
        covers: payload.covers,
        items: payload.items,
        total_price: payload.total_price,
        status: "pending",
        service_step: "entree",
      },
      {
        id: forcedOrderId,
        restaurant_id: payload.restaurant_id,
        table_number: payload.table_number,
        items: payload.items,
        total_price: payload.total_price,
        status: "pending",
        service_step: "entree",
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

  const resolveFormulaStepStateForOrder = (order: Order) => {
    const formulaItems = parseItems(order.items).filter((item) => isFormulaOrderItem(item));
    if (formulaItems.length === 0) {
      return { currentStep: "", nextStep: "", isCurrentStepServed: false };
    }

    const availableSteps = new Set(formulaItems.flatMap((item) => resolveItemCourses(item)));
    const currentStep =
      normalizeServiceStep(order.service_step) ||
      SERVICE_STEP_SEQUENCE.find((step) => availableSteps.has(step)) ||
      "";
    if (!currentStep) {
      return { currentStep: "", nextStep: "", isCurrentStepServed: false };
    }

    const itemsOfCurrentStep = formulaItems.filter((item) => resolveItemCourse(item) === currentStep);
    const isCurrentStepServed = itemsOfCurrentStep.length > 0 && itemsOfCurrentStep.every((item) => isItemServed(item));

    const currentIndex = SERVICE_STEP_SEQUENCE.indexOf(
      currentStep as (typeof SERVICE_STEP_SEQUENCE)[number]
    );
    let nextStep = "";
    if (currentIndex >= 0 && currentIndex < SERVICE_STEP_SEQUENCE.length - 1) {
      for (let index = currentIndex + 1; index < SERVICE_STEP_SEQUENCE.length; index += 1) {
        const candidate = SERVICE_STEP_SEQUENCE[index];
        if (availableSteps.has(candidate)) {
          nextStep = candidate;
          break;
        }
      }
    }

    return { currentStep, nextStep, isCurrentStepServed };
  };

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

        const formulaActionOrder =
          tableOrders.find((order) => {
            const { nextStep, isCurrentStepServed } = resolveFormulaStepStateForOrder(order);
            if (!nextStep) return false;
            return isCurrentStepServed;
          }) || null;
        const formulaNextServiceStep = formulaActionOrder
          ? resolveFormulaStepStateForOrder(formulaActionOrder).nextStep
          : "";

        return {
          tableNumber,
          allServed,
          waitingMinutes,
          count: tableOrders.length,
          formulaActionOrder,
          formulaNextServiceStep,
        };
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

  const handleSendNextServiceStep = async (order: Order, nextStep: string) => {
    const normalizedNext = normalizeServiceStep(nextStep);
    if (!normalizedNext) return;
    const orderId = String(order.id || "").trim();
    if (!orderId) return;
    if (sendingNextStepOrderIds[orderId]) return;

    setSendingNextStepOrderIds((prev) => ({ ...prev, [orderId]: true }));

    try {
      const currentItems = parseItems(order.items);
      const currentStepState = resolveFormulaStepStateForOrder(order);
      const currentStep = currentStepState.currentStep || normalizeServiceStep(order.service_step);
      const hasFormulaItems = currentItems.some((item) => isFormulaOrderItem(item));
      const nextItems = hasFormulaItems
        ? currentItems.map((item) => {
            if (!isFormulaOrderItem(item)) return item;
            if (currentStep && resolveItemCourse(item) !== currentStep) return item;
            if (!isItemServed(item)) return item;

            const nextSequence = resolveNextFormulaSequenceForItem(item);
            if (!Number.isFinite(nextSequence) || Number(nextSequence) <= 0) return item;
            const normalizedNextSequence = Math.max(1, Math.trunc(Number(nextSequence)));
            const nextFormulaEntry = resolveFormulaEntryForSequence(item, normalizedNextSequence);
            const nextDishId = String(nextFormulaEntry?.dish_id ?? nextFormulaEntry?.dishId ?? item.dish_id ?? item.id ?? "").trim();
            const nextDishName = String(
              nextFormulaEntry?.dish_name ??
                nextFormulaEntry?.dish_name_fr ??
                nextFormulaEntry?.dishName ??
                nextFormulaEntry?.name ??
                nextFormulaEntry?.value ??
                item.name
            ).trim();
            const nextCategoryLabel = String(nextFormulaEntry?.category_label ?? nextFormulaEntry?.categoryLabel ?? item.category ?? item.categorie ?? "").trim();
            const currentItemCategoryId = (item as unknown as Record<string, unknown>).category_id ?? null;
            const nextCategoryId = nextFormulaEntry?.category_id ?? nextFormulaEntry?.categoryId ?? currentItemCategoryId;
            const nextDestinationRaw = String(nextFormulaEntry?.destination ?? "").trim().toLowerCase();
            const nextDestination: "cuisine" | "bar" =
              nextDestinationRaw === "bar"
                ? "bar"
                : nextDestinationRaw === "cuisine" || nextDestinationRaw === "kitchen"
                  ? "cuisine"
                  : resolveDestinationForCategory(nextCategoryId, nextCategoryLabel);

            return {
              ...(item || {}),
              id: nextDishId || item.id,
              dish_id: nextDishId || item.dish_id,
              name: nextDishName || item.name,
              name_fr: nextDishName || item.name_fr,
              category: nextCategoryLabel || item.category,
              categorie: nextCategoryLabel || item.categorie,
              category_id: nextCategoryId,
              destination: nextDestination,
              is_drink: nextDestination === "bar",
              formula_current_sequence: normalizedNextSequence,
              formulaCurrentSequence: normalizedNextSequence,
              status: "pending",
            };
          })
        : currentItems;
      const hasAnyAdvancedFormulaItem =
        hasFormulaItems &&
        nextItems.some((item, index) => {
          if (!isFormulaOrderItem(item)) return false;
          const previous = currentItems[index];
          return Number((item as unknown as Record<string, unknown>).formula_current_sequence ?? 0) !==
            Number((previous as unknown as Record<string, unknown>)?.formula_current_sequence ?? 0);
        });
      const nextStatus = hasFormulaItems ? deriveOrderStatusFromItems(nextItems) : order.status;

      setOrders((prev) =>
        prev.map((row) =>
          String(row.id) === orderId
            ? {
                ...row,
                service_step: normalizedNext,
                items: hasFormulaItems && hasAnyAdvancedFormulaItem ? nextItems : row.items,
                status: hasFormulaItems && hasAnyAdvancedFormulaItem ? nextStatus : row.status,
              }
            : row
        )
      );
      const updatePayload: Record<string, unknown> = { service_step: normalizedNext };
      if (hasFormulaItems && hasAnyAdvancedFormulaItem) {
        updatePayload.items = nextItems;
        updatePayload.status = nextStatus;
      }
      const { error } = await supabase.from("orders").update(updatePayload).eq("id", orderId);
      if (error) {
        console.error("Erreur update service_step:", error);
        await fetchOrders();
      }
    } finally {
      setSendingNextStepOrderIds((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
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
    const hasFormulaItems = items.some((item) => isFormulaOrderItem(item));
    const currentServiceStep = hasFormulaItems ? resolveOrderServiceStep(order, items) : "";
    const serviceStepLabel = currentServiceStep ? SERVICE_STEP_LABELS[currentServiceStep] : "";
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
            {serviceStepLabel ? (
              <div className="mt-1 inline-flex items-center rounded border-2 border-black bg-white px-2 py-1 text-[11px] font-black">
                {serviceStepLabel}
              </div>
            ) : null}
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

        {formulaDishes.length > 0 ? (
          <div className="mb-4 rounded border-2 border-black bg-amber-50 p-3">
            <div className="font-black mb-2 text-black">Formules</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {formulaDishes.map((formula) => (
                <button
                  key={`fast-formula-${formula.id}`}
                  type="button"
                  onClick={() => void handleSelectFormula(formula)}
                  className="w-full text-left px-3 py-3 rounded-lg border-2 border-black bg-white font-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  <div className="text-[11px] uppercase tracking-wide text-black/70">Composer</div>
                  <div className="text-base">
                    {getFormulaDisplayName(formula)} - {getFormulaPackPrice(formula).toFixed(2)} &euro;
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

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
              const isFormulaDish = formulaParentDishIds.has(String(dish.id || "").trim());
              const displayName = isFormulaDish ? getFormulaDisplayName(dish) : getDishName(dish);
              const displayPrice = isFormulaDish ? getFormulaPackPrice(dish) : getDishPrice(dish);
              const linkedDishOptions =
                Array.isArray((dish as DishItem & { dish_options?: unknown }).dish_options)
                  ? (((dish as DishItem & { dish_options?: unknown }).dish_options as unknown[]) || [])
                  : [];
              console.log("Plat:", dish.name, "Options trouvées:", linkedDishOptions);
              const hasOptions = isFormulaDish
                ? true
                : dishNeedsCooking(dish) ||
                  parseDishProductOptions(dish).length > 0 ||
                  parseDishExtras(dish).length > 0 ||
                  linkedDishOptions.length > 0 ||
                  dishIdsWithLinkedExtras.has(dishId) ||
                  parseDishSideIds(dish).length > 0;
              return (
                <div key={dishId} className="grid grid-cols-[1fr_auto_auto] items-center px-3 py-2 border-t border-gray-200">
                  <div>
                    <div className="font-bold">{displayName}</div>
                  </div>
                  <div className="pr-4 text-sm">{displayPrice.toFixed(2)}&euro;</div>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (isFormulaDish) {
                          void handleSelectFormula(dish);
                          return;
                        }
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
                      <span className="font-bold">
                        {(resolveFastLineUnitPrice(line) * line.quantity).toFixed(2)}&euro;
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFastLine(line.lineId)}
                        className="px-2 py-1 text-xs font-bold border border-black bg-white"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                  {Array.isArray(line.formulaSelections) && line.formulaSelections.length > 0 ? (
                    <div className="mt-1 space-y-1 text-xs text-gray-700">
                      {line.formulaSelections.map((selection, index) => (
                        <div key={`fast-summary-formula-${line.lineId}-${selection.dishId || index}`}>
                          Inclus: {selection.dishName} (0.00&euro;)
                        </div>
                      ))}
                    </div>
                  ) : null}
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
                  const readyFoodEntries = readyEntries.filter((entry) => !isDrink(entry.item));
                  const readyDrinkEntries = readyEntries.filter((entry) => isDrink(entry.item));
                  const covers =
                    normalizeCoversValue((order as unknown as Record<string, unknown>).covers) ??
                    normalizeCoversValue((order as unknown as Record<string, unknown>).guest_count) ??
                    normalizeCoversValue((order as unknown as Record<string, unknown>).customer_count) ??
                    tableCoversByNumber.get(Number(order.table_number)) ??
                    null;
                  const renderReadyBlock = (
                    title: "PLATS" | "BOISSONS",
                    entries: Array<{ item: Item; index: number }>
                  ) => {
                    if (entries.length === 0) return null;
                    const isFoodBlock = title === "PLATS";
                    return (
                      <div className={`border-2 p-2 ${isFoodBlock ? "border-orange-300 bg-orange-50" : "border-blue-300 bg-blue-50"}`}>
                        <div className="mb-2 text-xs font-black uppercase">{title}</div>
                        <div className="space-y-2">
                          {entries.map(({ item, index }) => (
                            <div key={`ready-line-${order.id}-${title}-${index}`} className="border border-gray-300 bg-white p-2">
                              <div className="font-bold text-sm">
                                <span className="bg-black text-white px-2 mr-2 rounded">{Number(item.quantity) || 1}x</span>
                                <span className="notranslate" translate="no">
                                  {resolveOrderItemLabel(item)}
                                </span>
                              </div>
                              {String(item.instructions || "").trim() ? (
                                <div className="mt-1 text-xs italic text-gray-700 notranslate" translate="no">
                                  {String(item.instructions || "").trim()}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleServeItems(String(order.id), entries.map((entry) => entry.index))}
                          className={`mt-3 w-full border-2 border-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                            isFoodBlock ? "bg-yellow-400" : "bg-blue-200"
                          }`}
                          style={{ width: "100%", padding: "15px", fontWeight: 800 }}
                        >
                          {isFoodBlock ? "TOUT SERVIR" : "TOUT SERVIR BOISSONS"}
                        </button>
                      </div>
                    );
                  };
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
                      <div className="space-y-3">
                        {renderReadyBlock("PLATS", readyFoodEntries)}
                        {renderReadyBlock("BOISSONS", readyDrinkEntries)}
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
                    {row.formulaActionOrder && row.formulaNextServiceStep ? (
                      <button
                        type="button"
                        disabled={Boolean(sendingNextStepOrderIds[String((row.formulaActionOrder as Order).id || "")])}
                        onClick={() => void handleSendNextServiceStep(row.formulaActionOrder as Order, row.formulaNextServiceStep)}
                        className="mt-2 w-full border-2 border-black bg-orange-200 px-2 py-2 text-xs font-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Entrées terminées / Envoyer la suite
                        {SERVICE_STEP_LABELS[row.formulaNextServiceStep]
                          ? ` (${SERVICE_STEP_LABELS[row.formulaNextServiceStep]})`
                          : ""}
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}

      {formulaModalOpen && formulaModalDish ? (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white border-2 border-black rounded-lg flex flex-col max-h-[90vh]">
            <div className="relative p-4 border-b-2 border-black">
              <button
                type="button"
                onClick={closeFormulaModal}
                className="absolute top-3 right-3 h-9 w-9 border-2 border-black bg-white font-black"
                aria-label="Fermer"
              >
                <X className="h-4 w-4 mx-auto" />
              </button>
              <div className="text-center">
                <div className="text-lg font-black">{formulaUi.title}</div>
                <div className="text-sm text-gray-600">{formulaUi.subtitle}</div>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-24 pt-4">
              <h2 className="text-xl font-black mb-1">{getFormulaDisplayName(formulaModalDish)}</h2>
              <div className="text-base font-black inline-flex items-center gap-1 mb-4">
                {Number(getFormulaPackPrice(formulaModalDish) || 0).toFixed(2)}
                <Euro className="h-4 w-4" />
              </div>
              {formulaCategories.length === 0 ? (
                <div className="text-sm text-gray-600">{formulaUi.noDishes}</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {formulaCategories.map((category) => {
                    const categoryId = String(category.id || "").trim();
                    const options = formulaOptionsByCategory.get(categoryId) || [];
                    const selectedId = formulaModalSelections[categoryId] || "";
                    const selectedDishForCategory = selectedId
                      ? resolveFormulaDishRecord(dishById.get(String(selectedId || "").trim()))
                      : null;
                    const formulaDishConfig = selectedDishForCategory
                      ? getFormulaDishConfig(selectedDishForCategory)
                      : null;
                    const categoryDetails = getFormulaSelectionDetails(categoryId);
                    const allowMultiOptionSelection = Boolean(
                      (selectedDishForCategory as unknown as { allow_multi_select?: unknown })?.allow_multi_select
                    );
                    const selectedDishIdForDefaults = selectedDishForCategory
                      ? String(selectedDishForCategory.id || "").trim()
                      : "";
                    const formulaOptionsPanelId = `formula-options-${categoryId}`;
                    const rawDefaultOptionIdsForSelectedDish = selectedDishIdForDefaults
                      ? formulaDefaultOptionsByDishId.get(selectedDishIdForDefaults) || []
                      : [];
                    const availableOptionIdSet = new Set(
                      (formulaDishConfig?.productOptions || [])
                        .map((option) => String(option.id || "").trim())
                        .filter(Boolean)
                    );
                    const defaultOptionIdsForSelectedDish = rawDefaultOptionIdsForSelectedDish.filter((id) =>
                      availableOptionIdSet.has(String(id || "").trim())
                    );
                    return (
                      <div key={`formula-category-${categoryId}`} className="border-2 border-black rounded-lg p-3">
                        <div className="font-black text-base mb-2">{getCategoryLabel(category)}</div>
                        {options.length === 0 ? (
                          <div className="text-sm text-gray-500">{formulaUi.noDishes}</div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2">
                            {options.map((optionDish) => {
                              const optionId = String(optionDish.id || "").trim();
                              if (!optionId) return null;
                              const isSelected = selectedId === optionId;
                              const optionDishResolved = resolveFormulaDishRecord(optionDish) || optionDish;
                              const optionConfig = getFormulaDishConfig(optionDishResolved);
                              const isDetailsOpen = Boolean(formulaModalItemDetailsOpen[optionId]);
                              const optionDescription = getDishCleanDescription(optionDishResolved);
                              const canEditWithModal =
                                optionConfig.productOptions.length > 0 ||
                                optionConfig.hasRequiredSides ||
                                optionConfig.askCooking;
                              return (
                                <div key={`formula-option-${categoryId}-${optionId}`} className="flex flex-col gap-2">
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormulaModalItemDetailsOpen((prev) => ({
                                          ...prev,
                                          [optionId]: true,
                                        }));
                                        void openFormulaItemOptionsModal(categoryId, optionDishResolved, true);
                                      }}
                                      className={`flex-1 text-left px-3 py-2 rounded border-2 font-black ${
                                        isSelected ? "bg-black text-white border-black" : "bg-white text-black border-black"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {optionDishResolved.image_url ? (
                                          <img
                                            src={optionDishResolved.image_url}
                                            alt={getDishName(optionDishResolved)}
                                            className="h-9 w-9 rounded object-cover border border-black/20"
                                            onError={(event) => {
                                              event.currentTarget.style.display = "none";
                                            }}
                                          />
                                        ) : null}
                                        <span>{getDishName(optionDishResolved)}</span>
                                      </div>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormulaModalItemDetailsOpen((prev) => ({
                                          ...prev,
                                          [optionId]: !prev[optionId],
                                        }));
                                        if (isSelected && canEditWithModal) {
                                          void openFormulaItemOptionsModal(categoryId, optionDishResolved, false);
                                        }
                                      }}
                                      className="px-3 py-2 rounded border-2 border-black bg-white text-xs font-black text-black whitespace-nowrap"
                                    >
                                      {formulaItemDetailsLabel}
                                    </button>
                                  </div>
                                  {isDetailsOpen ? (
                                    <div className="text-sm text-gray-700 rounded border border-black/10 bg-white px-3 py-2 space-y-2">
                                      <div>{optionDescription || "Aucune description."}</div>
                                      <div className="text-xs text-black/80">
                                        Catégorie: {getCategoryLabel(category)} | Prix carte: {getDishPrice(optionDishResolved).toFixed(2)}€
                                      </div>
                                      <div className="text-xs text-black/80">
                                        Options: {optionConfig.productOptions.length} | Accompagnements: {optionConfig.sideOptions.length} | Cuisson: {optionConfig.askCooking ? "Oui" : "Non"}
                                      </div>
                                      {isSelected ? (
                                        <div className="text-xs text-black/80">
                                          Sélection actuelle:
                                          {" "}
                                          {[
                                            categoryDetails.selectedProductOptionIds.length > 0
                                              ? `options ${optionConfig.productOptions
                                                  .filter((option) =>
                                                    categoryDetails.selectedProductOptionIds.includes(
                                                      String(option.id || "").trim()
                                                    )
                                                  )
                                                  .map((option) => String(option.name || "").trim())
                                                  .filter(Boolean)
                                                  .join(", ")}`
                                              : "",
                                            categoryDetails.selectedSides.length > 0
                                              ? `accompagnements ${categoryDetails.selectedSides.join(", ")}`
                                              : "",
                                            String(categoryDetails.selectedCooking || "").trim()
                                              ? `cuisson ${String(categoryDetails.selectedCooking || "").trim()}`
                                              : "",
                                          ]
                                            .filter(Boolean)
                                            .join(" | ") || "Aucune option choisie."}
                                        </div>
                                      ) : null}
                                      {isSelected && canEditWithModal ? (
                                        <button
                                          type="button"
                                          onClick={() => void openFormulaItemOptionsModal(categoryId, optionDishResolved, false)}
                                          className="h-9 px-3 border-2 border-black bg-black text-white text-xs font-black"
                                        >
                                          Modifier les options
                                        </button>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {selectedDishForCategory && formulaDishConfig ? (
                          <div id={formulaOptionsPanelId} className="mt-3 space-y-3 border-t border-black/20 pt-3">
                            {formulaDishConfig.productOptions.length > 0 ? (
                              <div>
                                <div className="text-xs font-black uppercase tracking-wide mb-2">
                                  {formulaOptionsLabel}
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                  {formulaDishConfig.productOptions.map((option) => {
                                    const optionId = String(option.id || "").trim();
                                    if (!optionId) return null;
                                    const optionPrice = parsePriceNumber(option.price);
                                    const isPaidOption = optionPrice > 0;
                                    const isDefaultOption = defaultOptionIdsForSelectedDish.includes(optionId);
                                    const isLocked = isPaidOption && !isDefaultOption;
                                    const selected = categoryDetails.selectedProductOptionIds.includes(optionId);
                                    return (
                                      <label
                                        key={`formula-option-detail-${categoryId}-${optionId}`}
                                        className={`flex items-center gap-2 text-sm font-bold ${
                                          isLocked ? "text-gray-400" : "text-black"
                                        }`}
                                      >
                                        <input
                                          type={allowMultiOptionSelection ? "checkbox" : "radio"}
                                          name={`formula-product-option-${categoryId}`}
                                          checked={selected}
                                          disabled={isLocked}
                                          onChange={(event) => {
                                            if (isLocked) return;
                                            setFormulaModalError("");
                                            setFormulaModalSelectionDetails((prev) => {
                                              const current = prev[categoryId] || {
                                                selectedSideIds: [],
                                                selectedSides: [],
                                                selectedCooking: "",
                                                selectedProductOptionIds: [],
                                              };
                                              const nextIds = allowMultiOptionSelection
                                                ? event.target.checked
                                                  ? [...current.selectedProductOptionIds, optionId]
                                                  : current.selectedProductOptionIds.filter((id) => id !== optionId)
                                                : event.target.checked
                                                  ? [optionId]
                                                  : [];
                                              return {
                                                ...prev,
                                                [categoryId]: {
                                                  ...current,
                                                  selectedProductOptionIds: Array.from(new Set(nextIds)),
                                                },
                                              };
                                            });
                                          }}
                                        />
                                        <span>
                                          {String(option.name || "").trim()}
                                          {optionPrice > 0 ? ` (+${optionPrice.toFixed(2)}\u20AC)` : ""}
                                          {isLocked ? ` (${formulaOptionLockedLabel})` : ""}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}
                            {formulaDishConfig.hasRequiredSides ? (
                              <div>
                                <div className="text-xs font-black uppercase tracking-wide mb-2">
                                  Accompagnements ({Math.min(formulaDishConfig.maxSides, categoryDetails.selectedSides.length)}/
                                  {formulaDishConfig.maxSides})
                                </div>
                                {formulaDishConfig.sideOptions.length === 0 ? (
                                  <div className="text-xs font-bold text-red-600">Aucun accompagnement configuré.</div>
                                ) : (
                                  <div className="grid grid-cols-1 gap-2">
                                    {formulaDishConfig.sideOptions.map((sideLabel) => {
                                      const sideId = sideIdByAlias.get(normalizeLookupText(sideLabel)) || sideLabel;
                                      const checked = categoryDetails.selectedSideIds.includes(sideId);
                                      return (
                                        <label
                                          key={`formula-side-${categoryId}-${sideId}`}
                                          className="flex items-center gap-2 text-sm font-bold"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(event) => {
                                              setFormulaModalError("");
                                              setFormulaModalSelectionDetails((prev) => {
                                                const current = prev[categoryId] || {
                                                  selectedSideIds: [],
                                                  selectedSides: [],
                                                  selectedCooking: "",
                                                  selectedProductOptionIds: [],
                                                };
                                                const maxSides = formulaDishConfig.maxSides;
                                                const nextPairs = current.selectedSideIds.map((id, index) => ({
                                                  id,
                                                  label: current.selectedSides[index] || id,
                                                }));
                                                const exists = nextPairs.some((entry) => entry.id === sideId);
                                                const canAdd = nextPairs.length < maxSides;
                                                const updatedPairs = event.target.checked
                                                  ? exists
                                                    ? nextPairs
                                                    : canAdd
                                                      ? [...nextPairs, { id: sideId, label: sideLabel }]
                                                      : nextPairs
                                                  : nextPairs.filter((entry) => entry.id !== sideId);
                                                return {
                                                  ...prev,
                                                  [categoryId]: {
                                                    ...current,
                                                    selectedSideIds: updatedPairs.map((entry) => entry.id),
                                                    selectedSides: updatedPairs.map((entry) => entry.label),
                                                  },
                                                };
                                              });
                                            }}
                                          />
                                          <span>{sideLabel}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : null}
                            {formulaDishConfig.askCooking ? (
                              <div>
                                <div className="text-xs font-black uppercase tracking-wide mb-2">Cuisson</div>
                                <div className="grid grid-cols-1 gap-2">
                                  {COOKING_CHOICES.map((cookingLabel) => (
                                    <label
                                      key={`formula-cooking-${categoryId}-${cookingLabel}`}
                                      className="flex items-center gap-2 text-sm font-bold"
                                    >
                                      <input
                                        type="radio"
                                        name={`formula-cooking-${categoryId}`}
                                        checked={categoryDetails.selectedCooking === cookingLabel}
                                        onChange={() => {
                                          setFormulaModalError("");
                                          setFormulaModalSelectionDetails((prev) => {
                                            const current = prev[categoryId] || {
                                              selectedSideIds: [],
                                              selectedSides: [],
                                              selectedCooking: "",
                                              selectedProductOptionIds: [],
                                            };
                                            return {
                                              ...prev,
                                              [categoryId]: {
                                                ...current,
                                                selectedCooking: cookingLabel,
                                              },
                                            };
                                          });
                                        }}
                                      />
                                      <span>{cookingLabel}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
              {formulaModalError ? <div className="mt-4 text-sm text-red-600 font-bold">{formulaModalError}</div> : null}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t-2 border-black bg-white">
              <button
                type="button"
                disabled={formulaAddDisabled}
                onClick={handleAddFormulaLine}
                className="w-full h-12 bg-black text-white font-black border-2 border-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ajouter la formule
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {formulaOptionModalOpen && formulaOptionModalDish && formulaOptionModalConfig ? (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white border-2 border-black rounded-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-black px-4 py-3">
              <div>
                <div className="text-xs uppercase font-black text-black/60">ProductOptionsModal</div>
                <div className="text-lg font-black">{getDishName(formulaOptionModalDish)}</div>
              </div>
              <button
                type="button"
                onClick={() => setFormulaOptionModalState(null)}
                className="h-9 w-9 border-2 border-black bg-white font-black"
                aria-label="Fermer"
              >
                &times;
              </button>
            </div>

            <div className="p-4 space-y-4">
              {formulaOptionModalConfig.productOptions.length > 0 ? (
                <div>
                  <div className="text-xs font-black uppercase tracking-wide mb-2">{formulaOptionsLabel}</div>
                  <div className="grid grid-cols-1 gap-2">
                    {formulaOptionModalConfig.productOptions.map((option) => {
                      const optionId = String(option.id || "").trim();
                      if (!optionId) return null;
                      const optionPrice = parsePriceNumber(option.price);
                      const isPaidOption = optionPrice > 0;
                      const isDefaultOption = formulaOptionModalDefaultOptionIds.includes(optionId);
                      const isLocked = isPaidOption && !isDefaultOption;
                      const selected = formulaOptionModalDetails.selectedProductOptionIds.includes(optionId);
                      return (
                        <label
                          key={`formula-option-modal-option-${formulaOptionModalCategoryId}-${optionId}`}
                          className={`flex items-center gap-2 text-sm font-bold ${isLocked ? "text-gray-400" : "text-black"}`}
                        >
                          <input
                            type={formulaOptionModalAllowMulti ? "checkbox" : "radio"}
                            name={`formula-option-modal-${formulaOptionModalCategoryId}`}
                            checked={selected}
                            disabled={isLocked}
                            onChange={(event) => {
                              if (isLocked) return;
                              setFormulaModalError("");
                              setFormulaModalSelectionDetails((prev) => {
                                const current = prev[formulaOptionModalCategoryId] || {
                                  selectedSideIds: [],
                                  selectedSides: [],
                                  selectedCooking: "",
                                  selectedProductOptionIds: [],
                                };
                                const nextIds = formulaOptionModalAllowMulti
                                  ? event.target.checked
                                    ? [...current.selectedProductOptionIds, optionId]
                                    : current.selectedProductOptionIds.filter((id) => id !== optionId)
                                  : event.target.checked
                                    ? [optionId]
                                    : [];
                                return {
                                  ...prev,
                                  [formulaOptionModalCategoryId]: {
                                    ...current,
                                    selectedProductOptionIds: Array.from(new Set(nextIds)),
                                  },
                                };
                              });
                            }}
                          />
                          <span>
                            {String(option.name || "").trim()}
                            {optionPrice > 0 ? ` (+${optionPrice.toFixed(2)}\u20AC)` : ""}
                            {isLocked ? ` (${formulaOptionLockedLabel})` : ""}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {formulaOptionModalConfig.hasRequiredSides ? (
                <div>
                  <div className="text-xs font-black uppercase tracking-wide mb-2">
                    Accompagnements ({Math.min(formulaOptionModalConfig.maxSides, formulaOptionModalDetails.selectedSides.length)}/{formulaOptionModalConfig.maxSides})
                  </div>
                  {formulaOptionModalConfig.sideOptions.length === 0 ? (
                    <div className="text-xs font-bold text-red-600">Aucun accompagnement configuré.</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {formulaOptionModalConfig.sideOptions.map((sideLabel) => {
                        const sideId = sideIdByAlias.get(normalizeLookupText(sideLabel)) || sideLabel;
                        const checked = formulaOptionModalDetails.selectedSideIds.includes(sideId);
                        return (
                          <label
                            key={`formula-option-modal-side-${formulaOptionModalCategoryId}-${sideId}`}
                            className="flex items-center gap-2 text-sm font-bold"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                setFormulaModalError("");
                                setFormulaModalSelectionDetails((prev) => {
                                  const current = prev[formulaOptionModalCategoryId] || {
                                    selectedSideIds: [],
                                    selectedSides: [],
                                    selectedCooking: "",
                                    selectedProductOptionIds: [],
                                  };
                                  const maxSides = formulaOptionModalConfig.maxSides;
                                  const nextPairs = current.selectedSideIds.map((id, index) => ({
                                    id,
                                    label: current.selectedSides[index] || id,
                                  }));
                                  const exists = nextPairs.some((entry) => entry.id === sideId);
                                  const canAdd = nextPairs.length < maxSides;
                                  const updatedPairs = event.target.checked
                                    ? exists
                                      ? nextPairs
                                      : canAdd
                                        ? [...nextPairs, { id: sideId, label: sideLabel }]
                                        : nextPairs
                                    : nextPairs.filter((entry) => entry.id !== sideId);
                                  return {
                                    ...prev,
                                    [formulaOptionModalCategoryId]: {
                                      ...current,
                                      selectedSideIds: updatedPairs.map((entry) => entry.id),
                                      selectedSides: updatedPairs.map((entry) => entry.label),
                                    },
                                  };
                                });
                              }}
                            />
                            <span>{sideLabel}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              {formulaOptionModalConfig.askCooking ? (
                <div>
                  <div className="text-xs font-black uppercase tracking-wide mb-2">Cuisson</div>
                  <div className="grid grid-cols-1 gap-2">
                    {COOKING_CHOICES.map((cookingLabel) => (
                      <label
                        key={`formula-option-modal-cooking-${formulaOptionModalCategoryId}-${cookingLabel}`}
                        className="flex items-center gap-2 text-sm font-bold"
                      >
                        <input
                          type="radio"
                          name={`formula-option-modal-cooking-${formulaOptionModalCategoryId}`}
                          checked={formulaOptionModalDetails.selectedCooking === cookingLabel}
                          onChange={() => {
                            setFormulaModalError("");
                            setFormulaModalSelectionDetails((prev) => {
                              const current = prev[formulaOptionModalCategoryId] || {
                                selectedSideIds: [],
                                selectedSides: [],
                                selectedCooking: "",
                                selectedProductOptionIds: [],
                              };
                              return {
                                ...prev,
                                [formulaOptionModalCategoryId]: {
                                  ...current,
                                  selectedCooking: cookingLabel,
                                },
                              };
                            });
                          }}
                        />
                        <span>{cookingLabel}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setFormulaOptionModalState(null)}
                disabled={formulaOptionModalMissingRequired}
                className="w-full h-11 border-2 border-black bg-black text-white font-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Valider ce plat de formule
              </button>
            </div>
          </div>
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
    <Suspense fallback={<div className="p-10 text-center">Chargement de l&apos;administration...</div>}>
      <AdminContent />
    </Suspense>
  );
}
