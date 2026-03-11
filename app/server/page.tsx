"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { getCookingLabelFr, normalizeCookingKey } from "../lib/ui-translations";

type Item = {
  id: string | number;
  dish_id: string | number;
  dish: { id: string | number; name_fr: string; name: string; translations: unknown };
  name: string;
  quantity: number;
  categorie: string;
  category: string;
  instructions: string;
  price: number;
  line_total: number;
  total: number;
  total_price: number;
  is_drink: boolean;
  selectedSides: Array<string | number>;
  selected_side_ids: Array<string | number>;
  selected_extra_ids: Array<string | number>;
  selected_extras: Array<{ id: string; label_fr: string; name: string; name_fr: string; price: number }>;
  selected_cooking_key: string | null;
  selected_cooking_label_fr: string | null;
  selected_cooking: string | null;
  special_request: string | null;
  selectedExtras: Array<{ name: string; name_fr: string; price: number }>;
};

type Order = {
  id: string | number;
  table_number: string | number;
  items: unknown;
  status: string;
  created_at: string;
  restaurant_id: string | number | null;
};

type CategoryItem = {
  id: string | number;
  name_fr: string | null;
  name_en: string | null;
  name_es: string | null;
  name_de: string | null;
};

type SideLibraryItem = {
  id: string | number;
  name_fr: string | null;
  name_en: string | null;
  name_es: string | null;
  name_de: string | null;
};

type DishItem = {
  id: string | number;
  name: string | null;
  nom: string | null;
  name_fr: string | null;
  translations: unknown;
  description: string | null;
  description_fr: string | null;
  description_en: string | null;
  description_es: string | null;
  description_de: string | null;
  price: number | string | null;
  category_id: string | number | null;
  category: string | null;
  categorie: string | null;
  active: boolean | null;
  ask_cooking: boolean | null;
  selected_sides: unknown;
  sides: unknown;
  extras: unknown;
  is_featured: boolean | null;
  is_special: boolean | null;
  is_chef_suggestion: boolean | null;
  is_daily_special: boolean | null;
};

type CallItem = {
  id: string | number;
  status: string | null;
  type: string | null;
  table_number: string | number | null;
  table_id: string | number | null;
  message: string | null;
};

type ExtraChoice = {
  id: string;
  name: string;
  price: number;
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
  selectedCooking: string;
  specialRequest: string;
  isDrink: boolean;
  isChefSuggestion: boolean;
  isDailySpecial: boolean;
};

type ParsedDishOptions = {
  sideIds: Array<string | number>;
  extrasList: ExtraChoice[];
  askCooking: boolean;
};

const SETTINGS_ROW_ID = "c9012859-d0af-469d-8dbb-af9dee733aaa";
const COOKING_CHOICES = ["Bleu", "Saignant", "À point", "Bien cuit"];
const MAX_TOTAL_TABLES = 200;
const CLIENT_ORDERING_DISABLED_KEY = "menuqr_disable_client_ordering_tmp";
const KITCHEN_CALL_LABEL = "🔔 APPEL CUISINE";
const I18N_TOKEN = "__I18N__:";

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "1") return true;
    if (v === "false" || v === "0") return false;
  }
  return fallback;
}

function readLocalClientOrderingDisabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CLIENT_ORDERING_DISABLED_KEY) === "1";
}

function resolveClientOrderingDisabled(row: Record<string, unknown>) {
  if (typeof row.is_active === "boolean") return !row.is_active;
  const status = String(row.status ?? "").trim().toLowerCase();
  if (status === "consultation" || status === "menu_only" || status === "disabled") return true;
  return readLocalClientOrderingDisabled();
}

function resolveAllowClientOrders(row: Record<string, unknown>) {
  const defaultValue = !resolveClientOrderingDisabled(row);
  if (Object.prototype.hasOwnProperty.call(row, "allow_client_orders")) {
    return toBoolean(row.allow_client_orders, defaultValue);
  }
  return defaultValue;
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

function readTranslationLabel(rawTranslations: unknown, language = "fr") {
  const parsed = parseJsonObject(rawTranslations);
  if (!parsed) return "";

  const localeVariants = [language, `${language}-${language.toUpperCase()}`, `${language}_${language.toUpperCase()}`];
  for (const locale of localeVariants) {
    const direct = parsed[locale];
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    if (direct && typeof direct === "object") {
      const directObject = direct as Record<string, unknown>;
      const nested = String(directObject.name || directObject.label || directObject.title || "").trim();
      if (nested) return nested;
    }
  }

  const nameNode = parseJsonObject(parsed.name);
  if (nameNode) {
    for (const locale of localeVariants) {
      const candidate = String(nameNode[locale] || "").trim();
      if (candidate) return candidate;
    }
  }
  return "";
}

function readTranslationDescription(rawTranslations: unknown, language = "fr") {
  const parsed = parseJsonObject(rawTranslations);
  if (!parsed) return "";

  const localeVariants = [language, `${language}-${language.toUpperCase()}`, `${language}_${language.toUpperCase()}`];
  const descriptionNode = parseJsonObject(parsed.description);
  if (descriptionNode) {
    for (const locale of localeVariants) {
      const candidate = String(descriptionNode[locale] || "").trim();
      if (candidate) return candidate;
    }
  }

  for (const locale of localeVariants) {
    const localeNode = parseJsonObject(parsed[locale]);
    if (!localeNode) continue;
    const candidate = String(localeNode.description || "").trim();
    if (candidate) return candidate;
  }
  return "";
}

function getDishNameFrValue(dish: {
  translations?: unknown;
  name_fr?: unknown;
  name?: unknown;
  nom?: unknown;
}) {
  return (
    readTranslationLabel(dish.translations, "fr") ||
    String(dish.name_fr || dish.name || dish.nom || "").trim()
  );
}

function parseConsultationMode(raw: unknown) {
  const source = parseJsonObject(raw);
  if (!source) return false;

  const readMode = (container: unknown): boolean => {
    const parsed = parseJsonObject(container);
    if (!parsed) return false;
    const marketing =
      parsed.marketing_options && typeof parsed.marketing_options === "object"
        ? (parsed.marketing_options as Record<string, unknown>)
        : parsed;
    if (toBoolean(marketing.consultation_mode, false)) return true;
    if (parsed.table_config && readMode(parsed.table_config)) return true;
    if (parsed.marketing && readMode(parsed.marketing)) return true;
    if (parsed.settings && readMode(parsed.settings)) return true;
    return false;
  };

  return (
    readMode(source.table_config) ||
    readMode(source.marketing_options) ||
    readMode(source.marketing) ||
    readMode(source.settings) ||
    readMode(source)
  );
}

function resolveTotalTables(raw: unknown) {
  const readNumber = (value: unknown): number | null => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    const whole = Math.trunc(parsed);
    return whole > 0 ? whole : null;
  };

  const walk = (value: unknown, depth = 0): number | null => {
    if (depth > 3 || value == null) return null;
    const direct = readNumber(value);
    if (direct != null) return direct;
    const source = parseJsonObject(value);
    if (!source) return null;
    return (
      readNumber(source.table_count) ??
      walk(source.table_config, depth + 1) ??
      walk(source.settings, depth + 1) ??
      walk(source.marketing_options, depth + 1)
    );
  };

  const resolved = walk(raw);
  if (resolved == null) return null;
  return Math.min(MAX_TOTAL_TABLES, Math.max(1, resolved));
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

function toLoggableSupabaseError(error: unknown) {
  if (error == null) return { message: "Unknown error" };
  if (typeof error === "string") return { message: error };
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message || "Unknown error",
      stack: error.stack,
    };
  }
  if (typeof error !== "object") return { message: String(error) };
  const raw = error as Record<string, unknown>;
  const parsed = {
    code: typeof raw.code === "string" ? raw.code : undefined,
    message: typeof raw.message === "string" ? raw.message : undefined,
    hint: typeof raw.hint === "string" ? raw.hint : undefined,
    details: typeof raw.details === "string" ? raw.details : undefined,
  };
  const hasUsefulFields = Object.values(parsed).some((value) => String(value || "").trim().length > 0);
  if (hasUsefulFields) return parsed;
  try {
    return {
      message: JSON.stringify(raw) || "Unknown error",
      raw,
    };
  } catch {
    return { message: String(raw) };
  }
}

function makeLineId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseOptionsFromDescription(description: string | null): ParsedDishOptions {
  const parsed: ParsedDishOptions = { sideIds: [], extrasList: [], askCooking: false };
  const raw = String(description || "").trim();
  if (!raw) return parsed;

  const readTag = (tag: string) => {
    const escapedTag = tag.replace(/[.*+^${}()|[\]\\]/g, "\\$&");
    const match = raw.match(new RegExp(`${escapedTag}\\s*:\\s*([\\s\\S]*)(=\\s*__[^\\s:]+__\\s*:|$)`, "i"));
    return match?.[1].trim() || "";
  };

  const parseExtrasToken = (tokenValue: string, withI18nLabels: boolean) =>
    tokenValue
      .split("|")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry, index) => {
        const delimiterIndex = entry.lastIndexOf("=");
        const rawName = delimiterIndex >= 0 ? entry.slice(0, delimiterIndex).trim() : entry;
        const rawPrice = delimiterIndex >= 0 ? entry.slice(delimiterIndex + 1).trim() : "0";
        const localizedName = withI18nLabels
          ? rawName
              .split("~")
              .map((part) => part.trim())
              .find(Boolean) || rawName
          : rawName;
        const numericPrice = Number(rawPrice.replace(",", ".").replace(/[^\d.-]/g, ""));
        return {
          id: buildStableExtraId("legacy", localizedName || "Supplement", numericPrice, index),
          name: localizedName || "Supplément",
          price: Number.isFinite(numericPrice) ? numericPrice : 0,
        };
      });

  const sideIdsToken = readTag("__SIDE_IDS__");
  if (sideIdsToken) {
    parsed.sideIds = sideIdsToken
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  const askCookingToken = readTag("__ASK_COOKING__").toLowerCase();
  if (askCookingToken) {
    parsed.askCooking = askCookingToken === "true" || askCookingToken === "1" || askCookingToken === "yes";
  }

  const extrasI18nToken = readTag("__EXTRAS_I18N__");
  if (extrasI18nToken) {
    parsed.extrasList = parseExtrasToken(extrasI18nToken, true);
    return parsed;
  }

  const extrasToken = readTag("__EXTRAS__");
  if (extrasToken) {
    parsed.extrasList = parseExtrasToken(extrasToken, false);
    return parsed;
  }

  const extrasJsonToken = readTag("__EXTRAS_JSON__");
  if (extrasJsonToken) {
    try {
      const payload = JSON.parse(decodeURIComponent(extrasJsonToken));
      if (Array.isArray(payload)) {
        parsed.extrasList = payload
          .map((row) => {
            if (!row || typeof row !== "object") return null;
            const entry = row as Record<string, unknown>;
            const name = String(entry.name_fr || entry.name || "").trim();
            if (!name) return null;
            const amount = parsePriceNumber(entry.price);
            const id = String(entry.id || "").trim();
            return { id, name, price: amount };
          })
          .filter(Boolean) as ExtraChoice[];
      }
    } catch {
      return parsed;
    }
  }

  return parsed;
}

function normalizeOrderStatus(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeEntityId(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLookupText(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isUuidLike(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

function buildStableExtraId(dishId: unknown, name: unknown, price: unknown, index = 0) {
  const dishKey = String(dishId || "").trim();
  const nameKey = normalizeLookupText(name || "");
  const safePrice = parsePriceNumber(price).toFixed(2);
  return `extra:${dishKey}:${nameKey || "option"}:${safePrice}:${index}`;
}

function parseI18nToken(value: unknown) {
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
}

function sanitizeDisplayText(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw
    .replace(/\(\+\s*[\d.,]+\s*\u20AC\)/gi, "")
    .replace(/\+\s*[\d.,]+\s*\u20AC\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function translateClientTextToFrench(value: unknown) {
  let text = sanitizeDisplayText(value);
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
    if (/^(accompagnements|beilage(:n)|sides|acompa(:n|ñ)amientos)\s*:/i.test(trimmed)) {
      return trimmed.replace(/^[^:]+:\s*/i, "Accompagnements: ");
    }
    if (/^(cuisson|cooking|garstufe|coccion)\s*:/i.test(trimmed)) {
      return trimmed.replace(/^[^:]+:\s*/i, "Cuisson: ");
    }
    if (/^(supplements?|extras?|suplementos?)\s*:/i.test(trimmed)) {
      return trimmed.replace(/^[^:]+:\s*/i, "Suppléments: ");
    }
    if (/^(demande|special request|request|peticion especial|besonderer wunsch)\s*:/i.test(trimmed)) {
      return trimmed.replace(/^[^:]+:\s*/i, "Précisions: ");
    }
    return trimmed;
  };

  return text
    .split("|")
    .map((segment) => normalizeSegmentPrefix(segment))
    .filter(Boolean)
    .join(" | ");
}

function ReadyOrdersBadge({ count, urgent, highlight }: { count: number; urgent: boolean; highlight: boolean }) {
  const hasReady = count > 0;
  return (
    <span
      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-black ${
        urgent
          ? "border border-black bg-orange-500 text-black animate-[pulse_0.7s_ease-in-out_infinite]"
          : highlight
            ? "border border-white bg-red-600 text-white animate-[pulse_0.8s_ease-in-out_infinite]"
            : hasReady
              ? "border border-white bg-red-600 text-white"
            : "border border-gray-400 bg-gray-200 text-gray-700"
      }`}
    >
      {count}
    </span>
  );
}

export default function ServerPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [calls, setCalls] = useState<CallItem[]>([]);
  const [callsTableName, setCallsTableName] = useState<"calls" | "call_logs">("calls");
  const [restaurantName, setRestaurantName] = useState("Mon Restaurant");
  const [restaurantId, setRestaurantId] = useState<string | number | null>(null);
  const [restaurantSettingsError, setRestaurantSettingsError] = useState("");
  const [totalTables, setTotalTables] = useState(0);
  const totalTablesRef = useRef(totalTables);

  const [consultationModeEnabled, setConsultationModeEnabled] = useState(false);
  const [allowClientOrdersEnabled, setAllowClientOrdersEnabled] = useState(false);
  const [serverTab, setServerTab] = useState<"new-order" | "service">("service");
  const [hasServerTabOverride, setHasServerTabOverride] = useState(false);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [dishes, setDishes] = useState<DishItem[]>([]);
  const [sidesLibrary, setSidesLibrary] = useState<SideLibraryItem[]>([]);
  const [tableNumbers, setTableNumbers] = useState<number[]>([]);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState("");
  const [selectedTableNumber, setSelectedTableNumber] = useState("");
  const selectedCategoryKeyRef = useRef(selectedCategoryKey);
  const selectedTableNumberRef = useRef(selectedTableNumber);
  const fastEntryInitializedRef = useRef(false);
  const selectedCategoryInitializedRef = useRef(false);

  const [fastLines, setFastLines] = useState<FastOrderLine[]>([]);
  const [fastMessage, setFastMessage] = useState("");
  const [fastLoading, setFastLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDish, setModalDish] = useState<DishItem | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [modalSideChoices, setModalSideChoices] = useState<string[]>([]);
  const [modalExtraChoices, setModalExtraChoices] = useState<ExtraChoice[]>([]);
  const [modalSelectedSides, setModalSelectedSides] = useState<string[]>([]);
  const [modalSelectedExtras, setModalSelectedExtras] = useState<ExtraChoice[]>([]);
  const [modalCooking, setModalCooking] = useState("");
  const [modalRequest, setModalRequest] = useState("");
  const [readyBadgePulse, setReadyBadgePulse] = useState(false);
  const [readyToastVisible, setReadyToastVisible] = useState(false);
  const [readyToastMessage, setReadyToastMessage] = useState("");
  const [hasReadyOrders, setHasReadyOrders] = useState(false);
  const [orderDishNamesFrById, setOrderDishNamesFrById] = useState<Record<string, string>>({});
  const [urgentReminderActive, setUrgentReminderActive] = useState(false);
  const readyCountRef = useRef(0);
  const readyIdsRef = useRef<Set<string>>(new Set());
  const readyToastHideTimerRef = useRef<number | null>(null);
  const urgentReminderHideTimerRef = useRef<number | null>(null);
  const readyNotificationInitializedRef = useRef(false);

  const dishNamesFrById = useMemo(() => {
    const map = new Map<string, string>();
    dishes.forEach((dish) => {
      const key = normalizeEntityId(dish.id);
      if (!key) return;
      const label = getDishNameFrValue(dish);
      if (!label) return;
      map.set(key, label);
    });
    return map;
  }, [dishes]);

  const sideNamesFrById = useMemo(() => {
    const map = new Map<string, string>();
    sidesLibrary.forEach((side) => {
      const key = normalizeEntityId(side.id);
      if (!key) return;
      const label = String(side.name_fr || "").trim();
      if (!label) return;
      map.set(key, label);
    });
    return map;
  }, [sidesLibrary]);

  const sideNamesFrByAlias = useMemo(() => {
    const map = new Map<string, string>();
    sidesLibrary.forEach((side) => {
      const frLabel = String(side.name_fr || "").trim();
      if (!frLabel) return;
      const aliases = new Set<string>();
      [side.name_fr, side.name_en, side.name_es, side.name_de].forEach((value) => {
        const asText = String(value || "").trim();
        if (!asText) return;
        aliases.add(asText);
        const tokenValues = parseI18nToken(asText);
        Object.values(tokenValues).forEach((label) => {
          const normalizedLabel = String(label || "").trim();
          if (normalizedLabel) aliases.add(normalizedLabel);
        });
      });
      aliases.forEach((alias) => {
        const key = normalizeLookupText(alias);
        if (!key) return;
        map.set(key, frLabel);
      });
    });
    return map;
  }, [sidesLibrary]);

  const sideIdByAlias = useMemo(() => {
    const map = new Map<string, string>();
    sidesLibrary.forEach((side) => {
      const sideId = String(side.id || "").trim();
      if (!sideId) return;
      const aliases = new Set<string>();
      [side.name_fr, side.name_en, side.name_es, side.name_de].forEach((value) => {
        const asText = String(value || "").trim();
        if (!asText) return;
        aliases.add(asText);
        const tokenValues = parseI18nToken(asText);
        Object.values(tokenValues).forEach((label) => {
          const normalizedLabel = String(label || "").trim();
          if (normalizedLabel) aliases.add(normalizedLabel);
        });
      });
      aliases.forEach((alias) => {
        const key = normalizeLookupText(alias);
        if (!key) return;
        map.set(key, sideId);
      });
    });
    return map;
  }, [sidesLibrary]);

  const resolveServerDishName = (item: Item) => {
    const nestedDish = item.dish && typeof item.dish === "object" ? item.dish : null;
    const candidateIds = [
      normalizeEntityId(item.id),
      normalizeEntityId(item.dish_id),
      normalizeEntityId(nestedDish?.id),
    ].filter(Boolean);
    for (const id of candidateIds) {
      const fromOrderLookup = String(orderDishNamesFrById[id] || "").trim();
      if (fromOrderLookup) return fromOrderLookup;
      const fromMap = String(dishNamesFrById.get(id) || "").trim();
      if (fromMap) return fromMap;
    }
    const nestedFrName =
      readTranslationLabel(nestedDish?.translations, "fr") ||
      String(nestedDish?.name_fr || "").trim() ||
      String(nestedDish?.name || "").trim();
    if (nestedFrName) return nestedFrName;
    const fallbackName = String((item as Record<string, unknown>).name_fr || item.name || "").trim();
    if (fallbackName && !isUuidLike(fallbackName)) return fallbackName;
    return "Plat inconnu";
  };

  const hydrateDishNamesFromOrders = async (ordersToHydrate: Order[]) => {
    const ids = Array.from(
      new Set(
        ordersToHydrate
          .flatMap((order) => parseItems(order.items))
          .map((item) => normalizeEntityId(item.dish_id || item.id || item.dish.id))
          .filter(Boolean)
      )
    );
    if (ids.length === 0) return;
    const query = await supabase.from("dishes").select("id,name").in("id", ids);
    if (query.error) {
      console.warn("Lookup dishes serveur échoué:", query.error);
      return;
    }
    const byId: Record<string, string> = {};
    (query.data || []).forEach((row) => {
      const source = row as { id: unknown; name_fr: unknown; name: unknown; translations: unknown };
      const key = normalizeEntityId(source.id);
      const label = getDishNameFrValue(source);
      if (!key || !label) return;
      byId[key] = label;
    });
    if (Object.keys(byId).length > 0) {
      setOrderDishNamesFrById((prev) => ({ ...prev, ...byId }));
    }
  };

  const resolveFrenchSideName = (value: unknown) => {
    const key = normalizeEntityId(value);
    if (!key) return "";
    const tokenValues = parseI18nToken(key);
    const tokenFr =
      String(tokenValues.fr || "").trim() ||
      String(tokenValues["fr-fr"] || "").trim();
    if (tokenFr) return tokenFr;
    const fromMap = String(sideNamesFrById.get(key) || "").trim();
    if (fromMap) return fromMap;
    const alias = normalizeLookupText(key);
    const fromAlias = String(sideNamesFrByAlias.get(alias) || "").trim();
    if (fromAlias) return fromAlias;
    if (isUuidLike(key)) return "";
    const translated = translateClientTextToFrench(key);
    return isUuidLike(translated) ? "" : translated;
  };

  const getServerItemNotes = (item: Item) => {
    const notes = new Set<string>();
    const dedupeList = (values: string[]) => {
      const seen = new Set<string>();
      const output: string[] = [];
      values.forEach((value) => {
        const cleaned = String(value || "").trim().replace(/\s{2,}/g, " ");
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

    const selectedSidesRaw = Array.isArray(item.selectedSides)
      ? item.selectedSides
      : Array.isArray(item.selected_side_ids)
        ? item.selected_side_ids
        : [];
    const selectedSides = dedupeList(
      selectedSidesRaw.map((entry) => resolveFrenchSideName(entry)).filter(Boolean) as string[]
    );
    if (selectedSides.length > 0) {
      notes.add(`Accompagnements: ${selectedSides.join(", ")}`);
    }

    const dishId =
      normalizeEntityId(item.dish_id) ||
      normalizeEntityId(item.id) ||
      normalizeEntityId(item?.dish?.id);
    const sourceDish =
      dishes.find((dish) => normalizeEntityId(dish.id) === dishId) || null;
    const extrasCatalog = sourceDish ? parseDishExtras(sourceDish) : [];
    const extrasById = new Map<string, string>();
    extrasCatalog.forEach((extra, index) => {
      const extraId = String(extra.id || "").trim() || buildStableExtraId(dishId, extra.name, extra.price, index);
      const label = String(extra.name || "").trim();
      if (!extraId || !label) return;
      extrasById.set(extraId, label);
    });
    const selectedExtraIdsRaw = Array.isArray(item.selected_extra_ids) ? item.selected_extra_ids : [];
    const selectedExtraNamesFromIds = dedupeList(
      selectedExtraIdsRaw
        .map((extraId) => String(extrasById.get(String(extraId || "").trim()) || "").trim())
        .filter(Boolean)
    );
    if (selectedExtraNamesFromIds.length > 0) {
      notes.add(`Suppléments: ${selectedExtraNamesFromIds.join(", ")}`);
    } else {
      const selectedExtrasSnapshot = dedupeList(
        (Array.isArray(item.selected_extras) ? item.selected_extras : [])
          .map((extra) => translateClientTextToFrench(extra.label_fr || extra.name_fr || extra.name))
          .filter(Boolean) as string[]
      );
      if (selectedExtrasSnapshot.length > 0) {
        notes.add(`Suppléments: ${selectedExtrasSnapshot.join(", ")}`);
      } else {
        const selectedExtrasRaw = Array.isArray(item.selectedExtras)
          ? item.selectedExtras
          : Array.isArray(item.selected_extras)
            ? item.selected_extras
            : [];
        const selectedExtras = dedupeList(
          selectedExtrasRaw
            .map((extra) => translateClientTextToFrench(extra.name_fr || extra.name))
            .filter(Boolean) as string[]
        );
        if (selectedExtras.length > 0) {
          notes.add(`Suppléments: ${selectedExtras.join(", ")}`);
        }
      }
    }

    const cookingLabelFr = String(item.selected_cooking_label_fr || "").trim();
    if (cookingLabelFr) {
      notes.add(`Cuisson: ${cookingLabelFr}`);
    } else {
      const cookingKey = normalizeCookingKey(item.selected_cooking_key || item.selected_cooking || "");
      if (cookingKey) {
        notes.add(`Cuisson: ${getCookingLabelFr(cookingKey)}`);
      }
    }

    const specialRequest = String(item.special_request || "").trim();
    if (specialRequest) {
      notes.add(`Précisions: ${translateClientTextToFrench(specialRequest)}`);
    }

    const rawInstructions = String(item.instructions || "").trim();
    if (rawInstructions) {
      rawInstructions
        .split("|")
        .map((segment) => String(segment || "").trim())
        .filter(Boolean)
        .forEach((segment) => {
          if (/^(accompagnements|beilage(:n)|sides|acompa(:n|ñ)amientos)\s*:/i.test(segment)) return;
          if (/^(supplements?|extras?|suplementos?)\s*:/i.test(segment)) return;
          if (/^(cuisson|cooking|garstufe|cocci[oó]n)\s*:/i.test(segment)) return;
          const cleaned = translateClientTextToFrench(segment);
          if (!cleaned || isUuidLike(cleaned)) return;
          notes.add(cleaned);
        });
    }

    return Array.from(notes).join(" | ");
  };

  useEffect(() => {
    selectedCategoryKeyRef.current = selectedCategoryKey;
  }, [selectedCategoryKey]);

  useEffect(() => {
    selectedTableNumberRef.current = selectedTableNumber;
  }, [selectedTableNumber]);

  useEffect(() => {
    totalTablesRef.current = totalTables;
  }, [totalTables]);

  const getCategory = (item: Record<string, unknown>) => {
    return String(item.category || item.categorie || item["catégorie"] || "")
      .toLowerCase()
      .trim();
  };

  const isDrink = (item: Record<string, unknown>) => {
    if (item.is_drink === true) return true;
    const cat = getCategory(item);
    return ["boisson", "boissons", "bar", "drink", "drinks", "beverage", "beverages"].includes(cat);
  };

  const handleFetchError = (error: unknown, source: string) => {
    const err = (error || {}) as { code: string; message: string; details: string; hint: string };
    console.error("DEBUG_SQL_TOTAL:", error);
    console.error("DEBUG_SQL_TOTAL_FIELDS:", {
      source,
      code: err.code || null,
      message: err.message || null,
      details: err.details || null,
      hint: err.hint || null,
    });
  };

  const isMissingRelationError = (error: unknown) =>
    String((error as { code: string } | null)?.code || "").trim() === "42P01";

  const resolveCallsTable = async () => {
    const primary = await supabase.from("calls").select("id").limit(1);
    if (!primary.error) {
      if (callsTableName !== "calls") setCallsTableName("calls");
      return "calls" as const;
    }
    if (isMissingRelationError(primary.error)) {
      const fallback = await supabase.from("call_logs").select("id").limit(1);
      if (!fallback.error) {
        if (callsTableName !== "call_logs") setCallsTableName("call_logs");
        return "call_logs" as const;
      }
      handleFetchError(fallback.error, "server.resolveCallsTable.fallback");
      return "calls" as const;
    }
    handleFetchError(primary.error, "server.resolveCallsTable.primary");
    return "calls" as const;
  };

  const getCallTableNumber = (row: Record<string, unknown>) => {
    const direct = row.table_number ?? row.table_id;
    if (direct != null && String(direct).trim()) return String(direct).trim();
    const message = String(row.message || "");
    const match = message.match(/table\s*([0-9]+)/i);
    return match?.[1] || "";
  };

  const fetchOrders = async () => {
    try {
      const currentRestaurantId = String(restaurantId ?? "").trim();
      console.log("ID Resto Serveur:", currentRestaurantId);
      const scopedQuery = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: true });

      if (scopedQuery.error) {
        handleFetchError(scopedQuery.error, "Erreur fetch orders:");
        return;
      }
      const data = (scopedQuery.data || []) as Order[];
      const filtered = !currentRestaurantId
        ? data
        : ((data || []) as Order[]).filter((order) => {
            const orderRestaurantId = String(order.restaurant_id ?? "").trim();
            return !orderRestaurantId || orderRestaurantId === currentRestaurantId;
          });
      await hydrateDishNamesFromOrders(filtered);
      setOrders(filtered);
    } catch (error) {
      handleFetchError(error, "Unexpected fetchOrders error:");
    }
  };

  const fetchCalls = async () => {
    try {
      const targetTable = await resolveCallsTable();
      const { data, error } = await supabase.from(targetTable).select("*").order("created_at", { ascending: false });
      if (error) {
        handleFetchError(error, "Erreur fetch calls:");
        return;
      }
      const rows = (data || []).map((entry) => ({
        ...(entry as Record<string, unknown>),
        table_number: getCallTableNumber((entry as Record<string, unknown>) || {}),
      }));
      setCalls(rows as CallItem[]);
    } catch (error) {
      handleFetchError(error, "Unexpected fetchCalls error:");
    }
  };

  const fetchRestaurantSettings = async () => {
    const restaurantByIdQuery = await supabase.from("restaurants").select("*").eq("id", SETTINGS_ROW_ID).single();
    if (!restaurantByIdQuery.error && restaurantByIdQuery.data) {
      const row = restaurantByIdQuery.data as Record<string, unknown>;
      const name = String(row.name || "").trim();
      if (name) setRestaurantName(name);
      setRestaurantId((row.id as string | number | undefined) ?? null);
      setConsultationModeEnabled(resolveClientOrderingDisabled(row));
      setAllowClientOrdersEnabled(resolveAllowClientOrders(row));
      setTotalTables(resolveTotalTables(row) ?? 0);
      setRestaurantSettingsError("");
      return;
    }

    const message =
      (restaurantByIdQuery.error as { message: string } | null)?.message ||
      "Configuration restaurants introuvable pour cet ID.";
    console.error("Erreur fetch restaurants (server):", message);
    setTotalTables(0);
    setRestaurantId(null);
    setAllowClientOrdersEnabled(false);
    setRestaurantSettingsError(message);
  };

  const fetchFastEntryResources = async () => {
    const [categoriesQuery, primaryDishesQuery, sidesQuery, tablesQuery] = await Promise.all([
      supabase.from("categories").select("*").order("id", { ascending: true }),
      supabase
        .from("dishes")
        .select(
          "id,name,price,category_id,extras,sides,description,is_featured,is_special,is_chef_suggestion,is_daily_special"
        )
        .order("id", { ascending: true }),
      supabase.from("sides_library").select("*").order("id", { ascending: true }),
      supabase.from("table_assignments").select("table_number").order("table_number", { ascending: true }),
    ]);

    const nextCategories = !categoriesQuery.error ? ((categoriesQuery.data || []) as CategoryItem[]) : [];
    let nextDishes = !primaryDishesQuery.error ? ((primaryDishesQuery.data || []) as DishItem[]) : [];
    let dishesError = primaryDishesQuery.error;

    if (dishesError) {
      const fallbackDishesQuery = await supabase
        .from("dishes")
        .select(
          "id,name,price,category_id,extras,sides,description,is_featured,is_special,is_chef_suggestion,is_daily_special"
        )
        .order("id", { ascending: true });
      if (!fallbackDishesQuery.error) {
        nextDishes = (fallbackDishesQuery.data || []) as DishItem[];
        dishesError = null;
      } else {
        const ultraFallbackDishesQuery = await supabase
          .from("dishes")
          .select("id,name,price")
          .order("id", { ascending: true });
        if (!ultraFallbackDishesQuery.error) {
          nextDishes = (ultraFallbackDishesQuery.data || []) as DishItem[];
          dishesError = null;
        } else {
          dishesError = ultraFallbackDishesQuery.error;
        }
      }
    }

    if (!categoriesQuery.error) setCategories(nextCategories);
    if (!dishesError) {
      nextDishes = nextDishes.map((dish) => {
        const fallbackCategory = dish.category_id != null ? `cat_${dish.category_id}` : "autres";
        const isChefSuggestion = toBoolean(dish.is_chef_suggestion ?? dish.is_featured, false);
        const isDailySpecial = toBoolean(dish.is_daily_special ?? dish.is_special, false);
        return {
          ...dish,
          category: String(dish.category || dish.categorie || fallbackCategory),
          categorie: String(dish.categorie || dish.category || fallbackCategory),
          is_featured: isChefSuggestion,
          is_special: isDailySpecial,
          is_chef_suggestion: isChefSuggestion,
          is_daily_special: isDailySpecial,
        };
      });
      setDishes(nextDishes);
      console.log("DATA DISHES:", nextDishes);
      console.log("STRUCTURE DISHES:", nextDishes[0] ?? null);
    } else {
      const message =
        (dishesError as { message: string } | null)?.message ||
        JSON.stringify(toLoggableSupabaseError(dishesError));
      console.error("Erreur fetch dishes serveur:", message);
    }
    if (!sidesQuery.error) setSidesLibrary((sidesQuery.data || []) as SideLibraryItem[]);
    if (!tablesQuery.error) {
      const configuredCount = resolveTotalTables(totalTablesRef.current) ?? 0;
      const configured = Array.from({ length: configuredCount }, (_, index) => index + 1);
      setTableNumbers(configured);
      if (!fastEntryInitializedRef.current && !selectedTableNumberRef.current.trim() && configured[0]) {
        setSelectedTableNumber(String(configured[0]));
      }
    } else {
      const configuredCount = resolveTotalTables(totalTablesRef.current) ?? 0;
      const configured = Array.from({ length: configuredCount }, (_, index) => index + 1);
      setTableNumbers(configured);
      if (!fastEntryInitializedRef.current && !selectedTableNumberRef.current.trim() && configured[0]) {
        setSelectedTableNumber(String(configured[0]));
      }
    }

    if (!selectedCategoryInitializedRef.current && !selectedCategoryKeyRef.current.trim()) {
      const firstCategoryKey = nextCategories[0]
        ? normalizeCategoryKey(getCategoryLabel(nextCategories[0]))
        : "";
      if (firstCategoryKey) {
        setSelectedCategoryKey(firstCategoryKey);
        selectedCategoryInitializedRef.current = true;
      } else if (nextDishes[0]) {
        const fallbackKey = normalizeCategoryKey(getDishCategoryLabel(nextDishes[0]));
        if (fallbackKey) {
          setSelectedCategoryKey(fallbackKey);
          selectedCategoryInitializedRef.current = true;
        }
      }
    }
    if (!fastEntryInitializedRef.current) fastEntryInitializedRef.current = true;
  };

  const getDishName = (dish: DishItem) => {
    return getDishNameFrValue(dish) || "[Plat sans nom]";
  };

  const getDishPrice = (dish: DishItem) => {
    return parsePriceNumber(dish.price);
  };

  const getDishRawDescription = (dish: DishItem) =>
    String(dish.description || "").trim() ||
    readTranslationDescription(dish.translations, "fr");

  const getDishOptionsSource = (dish: DishItem) => {
    const values = [String(dish.description || "").trim(), readTranslationDescription(dish.translations, "fr")].filter(Boolean);
    return [...new Set(values)].join("\n");
  };

  const getDishCleanDescription = (dish: DishItem) => getDishRawDescription(dish).split("__")[0].trim() || "";

  const parseDishSideIds = (dish: DishItem): Array<string | number> => {
    const fromDescription = parseOptionsFromDescription(getDishOptionsSource(dish)).sideIds;
    if (fromDescription.length > 0) return fromDescription;

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
          return parseSideSource(parsed);
        } catch {
          return trimmed
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
        }
      }

      return [];
    };

    const selectedSides = parseSideSource(dish.selected_sides);
    if (selectedSides.length > 0) return selectedSides;
    const sides = parseSideSource(dish.sides);
    if (sides.length > 0) return sides;
    if (Array.isArray(dish.selected_sides)) return dish.selected_sides as Array<string | number>;
    if (typeof dish.selected_sides === "string") {
      try {
        const parsed = JSON.parse(dish.selected_sides);
        return Array.isArray(parsed) ? (parsed as Array<string | number>) : [];
      } catch {
        return parseOptionsFromDescription(getDishOptionsSource(dish)).sideIds;
      }
    }
    return parseOptionsFromDescription(getDishOptionsSource(dish)).sideIds;
  };

  const parseDishExtras = (dish: DishItem): ExtraChoice[] => {
    const fromDescription = parseOptionsFromDescription(getDishOptionsSource(dish)).extrasList;
    if (fromDescription.length > 0) {
      return fromDescription.map((extra, index) => ({
        ...extra,
        id: String(extra.id || "").trim() || buildStableExtraId(dish.id, extra.name, extra.price, index),
      }));
    }

    const normalizeArray = (raw: unknown) => {
      if (!Array.isArray(raw)) return [] as ExtraChoice[];
      return raw
        .map((entry, index) => {
          if (typeof entry === "string") {
            const cleaned = entry.trim();
            if (!cleaned) return null;
            const [namePart, pricePart] = cleaned.split("=").map((part) => part.trim());
            const price = parsePriceNumber(pricePart || "0");
            return {
              id: buildStableExtraId(dish.id, namePart || cleaned, price, index),
              name: namePart || cleaned,
              price,
            };
          }
          if (!entry || typeof entry !== "object") return null;
          const row = entry as Record<string, unknown>;
          const name = String(row.name_fr || row.name || "").trim();
          if (!name) return null;
          const safePrice = parsePriceNumber(row.price);
          return {
            id: String(row.id || "").trim() || buildStableExtraId(dish.id, name, safePrice, index),
            name,
            price: safePrice,
          };
        })
        .filter(Boolean) as ExtraChoice[];
    };
    const normalizeObject = (raw: unknown) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [] as ExtraChoice[];
      const source = raw as Record<string, unknown>;
      return Object.entries(source)
        .map(([name, value], index) => {
          const label = String(name || "").trim();
          if (!label) return null;
          const safeAmount = parsePriceNumber(value);
          return {
            id: buildStableExtraId(dish.id, label, safeAmount, index),
            name: label,
            price: safeAmount,
          };
        })
        .filter(Boolean) as ExtraChoice[];
    };

    const direct = normalizeArray(dish.extras);
    if (direct.length > 0) return direct;
    const directMap = normalizeObject(dish.extras);
    if (directMap.length > 0) return directMap;
    if (typeof dish.extras === "string") {
      try {
        const parsed = JSON.parse(dish.extras);
        const arrayParsed = normalizeArray(parsed);
        if (arrayParsed.length > 0) return arrayParsed;
        const objectParsed = normalizeObject(parsed);
        if (objectParsed.length > 0) return objectParsed;
        return [];
      } catch {
        return dish.extras
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
          .map((name, index) => ({ id: buildStableExtraId(dish.id, name, 0, index), name, price: 0 }));
      }
    }
    return parseOptionsFromDescription(getDishOptionsSource(dish)).extrasList.map((extra, index) => ({
      ...extra,
      id: String(extra.id || "").trim() || buildStableExtraId(dish.id, extra.name, extra.price, index),
    }));
  };

  const buildLineInstructions = (line: FastOrderLine) => {
    const parts: string[] = [];
    if (line.selectedSides.length > 0) parts.push(`Accompagnements: ${line.selectedSides.join(", ")}`);
    if (line.selectedExtras.length > 0) {
      parts.push(
        `Suppléments: ${line.selectedExtras
          .map((extra) => {
            const amount = parsePriceNumber(extra.price);
            return amount > 0 ? `${extra.name} (+${amount.toFixed(2)}\u20AC)` : `${extra.name}`;
          })
          .join(", ")}`
      );
    }
    if (line.selectedCooking) parts.push(`Cuisson: ${line.selectedCooking}`);
    if (line.specialRequest.trim()) parts.push(`Demande: ${line.specialRequest.trim()}`);
    return parts.join(" | ");
  };

  const categoryById = useMemo(() => {
    const map = new Map<string, CategoryItem>();
    categories.forEach((category) => map.set(String(category.id), category));
    return map;
  }, [categories]);

  const getCategoryLabel = (category: CategoryItem) => {
    return (
      String(category.name_fr || "").trim() ||
      String(category.name_en || "").trim() ||
      String(category.name_es || "").trim() ||
      String(category.name_de || "").trim() ||
      `Catégorie ${category.id}`
    );
  };

  const getDishCategoryLabel = (dish: DishItem) => {
    const fromId = dish.category_id != null ? categoryById.get(String(dish.category_id)) : undefined;
    if (fromId) return getCategoryLabel(fromId);
    const fallbackText = String(dish.category || dish.categorie || "").trim();
    if (fallbackText) return fallbackText;
    if (dish.category_id != null) return `Catégorie ${dish.category_id}`;
    return "Autres";
  };
  const normalizeCategoryKey = (value: unknown) =>
    (() => {
      const normalized = String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
      if (normalized.length > 3 && normalized.endsWith("s")) {
        return normalized.slice(0, -1);
      }
      return normalized;
    })();
  const dishNeedsCooking = (dish: DishItem) => parseOptionsFromDescription(getDishOptionsSource(dish)).askCooking;
  const getDishRecommendationFlags = (dish: DishItem | null | undefined) => {
    const isChefSuggestion = toBoolean(dish?.is_chef_suggestion ?? dish?.is_featured, false);
    const isDailySpecial = toBoolean(dish?.is_daily_special ?? dish?.is_special, false);
    return {
      isChefSuggestion,
      isDailySpecial,
      fromRecommendation: isChefSuggestion || isDailySpecial,
    };
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
  const effectiveSelectedCategoryKey = availableFastCategoryKeys.has(selectedCategoryKey)
    ? selectedCategoryKey
    : categoriesForFastEntry[0]?.key || "";

  const fastEntryDishes =
    !effectiveSelectedCategoryKey
      ? dishes
      : dishes.filter(
          (dish) => normalizeCategoryKey(getDishCategoryLabel(dish)) === effectiveSelectedCategoryKey
        );
  const visibleFastEntryDishes = fastEntryDishes.length > 0 ? fastEntryDishes : dishes;

  const linesByDish = useMemo(() => {
    const map = new Map<string, number>();
    fastLines.forEach((line) => {
      map.set(line.dishId, (map.get(line.dishId) || 0) + line.quantity);
    });
    return map;
  }, [fastLines]);

  const fastTotal = useMemo(() => {
    return fastLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  }, [fastLines]);

  const isOrderReadyForService = (order: Order) => {
    const normalized = normalizeOrderStatus(order.status);
    return (
      normalized === "ready" ||
      normalized === "ready_bar" ||
      normalized === "pret" ||
      normalized === "pret_bar" ||
      normalized === "ready_to_serve"
    );
  };
  const isPaidStatus = (status: unknown) => {
    const normalized = normalizeOrderStatus(status);
    return normalized === "paid" || normalized === "paye" || normalized === "payee";
  };
  const isServedOrArchivedStatus = (status: unknown) => {
    const normalized = normalizeOrderStatus(status);
    return (
      normalized === "served" ||
      normalized === "servi" ||
      normalized === "servie" ||
      normalized === "archived" ||
      normalized === "archive" ||
      normalized === "archivee"
    );
  };
  const isReadyStatus = (status: unknown) => {
    const normalized = normalizeOrderStatus(status);
    return (
      normalized === "ready" ||
      normalized === "ready_bar" ||
      normalized === "pret" ||
      normalized === "pret_bar" ||
      normalized === "ready_to_serve"
    );
  };

  const serviceVisibleOrders = orders.filter((order) => !isServedOrArchivedStatus(order.status));

  const barOrders = serviceVisibleOrders.filter((order) => {
    const items = parseItems(order.items);
    return ["pending", "to_prepare", "en_attente", "en_preparation"].includes(normalizeOrderStatus(order.status)) &&
      items.some((item) => isDrink(item as unknown as Record<string, unknown>));
  });

  const kitchenTrackingOrders = serviceVisibleOrders.filter((order) => {
    const items = parseItems(order.items);
    return ["pending", "to_prepare", "en_attente", "en_preparation"].includes(normalizeOrderStatus(order.status)) &&
      items.some((item) => !isDrink(item as unknown as Record<string, unknown>));
  });

  const toServeOrders = serviceVisibleOrders.filter((order) => isOrderReadyForService(order));
  const paidOrders = serviceVisibleOrders.filter((order) => isPaidStatus(order.status));
  const pendingNotifications = calls.filter((n) => {
    const status = normalizeOrderStatus(n.status);
    const type = String(n.type || "").toLowerCase().trim();
    const message = String(n.message || "").toLowerCase();
    return (
      status === "new" ||
      status === "pending" ||
      status === "ready_reminder" ||
      status === "kitchen_call" ||
      type === "cuisine" ||
      message.includes("general_kitchen_call") ||
      message.includes("la cuisine demande un serveur") ||
      !status
    );
  });

  const isKitchenCallNotification = (notif: CallItem) => {
    const status = normalizeOrderStatus(notif.status);
    const type = String(notif.type || "").toLowerCase().trim();
    const message = String(notif.message || "").toLowerCase();
    const tableLabel = String(notif.table_number || "").trim().toUpperCase();
    return (
      status === "kitchen_call" ||
      type === "cuisine" ||
      message.includes("general_kitchen_call") ||
      message.includes("la cuisine demande un serveur") ||
      tableLabel === "0" ||
      tableLabel === "CUISINE"
    );
  };

  const playReadySound = () => {
    if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return;
    try {
      const context = new window.AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(920, context.currentTime);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.24);
      window.setTimeout(() => {
        void context.close();
      }, 280);
    } catch (error) {
      console.warn("Son notification ready indisponible:", error);
    }
  };

  const buildReadyToastMessage = (newReadyOrders: Order[]) => {
    const tableLabels = Array.from(
      new Set(
        newReadyOrders
          .map((order) => String(order.table_number ?? "").trim())
          .filter(Boolean)
      )
    );
    if (tableLabels.some((label) => label === "0" || label.toUpperCase() === "CUISINE")) return KITCHEN_CALL_LABEL;
    if (tableLabels.length === 0) return "Nouveaux plats prêts en cuisine !";
    if (tableLabels.length === 1) return `Table ${tableLabels[0]} : Plats prêts !`;
    if (tableLabels.length === 2) return `Tables ${tableLabels[0]} et ${tableLabels[1]} : Plats prêts !`;
    const preview = tableLabels.slice(0, 3).join(", ");
    return `Tables ${preview}${tableLabels.length > 3 ? "..." : ""} : Plats prêts !`;
  };

  const triggerUrgentReminderAlert = (tableLabel: string) => {
    setUrgentReminderActive(true);
    setReadyBadgePulse(true);
    setReadyToastMessage(`Rappel cuisine: Table ${tableLabel} attend le service.`);
    setReadyToastVisible(true);
    playReadySound();
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([220, 120, 220]);
    }
    if (readyToastHideTimerRef.current != null) {
      window.clearTimeout(readyToastHideTimerRef.current);
    }
    readyToastHideTimerRef.current = window.setTimeout(() => setReadyToastVisible(false), 5000);
    if (urgentReminderHideTimerRef.current != null) {
      window.clearTimeout(urgentReminderHideTimerRef.current);
    }
    urgentReminderHideTimerRef.current = window.setTimeout(() => {
      setUrgentReminderActive(false);
      setReadyBadgePulse(false);
    }, 8000);
  };

  useEffect(() => {
    const nextReadyCount = toServeOrders.length;
    const nextReadyIds = new Set(toServeOrders.map((order) => String(order.id)));
    if (!readyNotificationInitializedRef.current) {
      readyNotificationInitializedRef.current = true;
      readyCountRef.current = nextReadyCount;
      readyIdsRef.current = nextReadyIds;
      if (nextReadyCount > 0) setHasReadyOrders(true);
      return;
    }
    const newReadyOrders = toServeOrders.filter((order) => !readyIdsRef.current.has(String(order.id)));
    const hasNewReadyOrder = newReadyOrders.length > 0;
    if (hasNewReadyOrder || nextReadyCount > readyCountRef.current) {
      const notificationOnTimer = window.setTimeout(() => setHasReadyOrders(true), 0);
      const pulseOnTimer = window.setTimeout(() => setReadyBadgePulse(true), 0);
      const toastOnTimer = window.setTimeout(() => {
        setReadyToastMessage(buildReadyToastMessage(newReadyOrders));
        setReadyToastVisible(true);
      }, 0);
      if (readyToastHideTimerRef.current != null) {
        window.clearTimeout(readyToastHideTimerRef.current);
      }
      readyToastHideTimerRef.current = window.setTimeout(() => setReadyToastVisible(false), 5000);
      playReadySound();
      const pulseOffTimer = window.setTimeout(() => setReadyBadgePulse(false), 1400);
      readyCountRef.current = nextReadyCount;
      readyIdsRef.current = nextReadyIds;
      return () => {
        window.clearTimeout(notificationOnTimer);
        window.clearTimeout(pulseOnTimer);
        window.clearTimeout(toastOnTimer);
        window.clearTimeout(pulseOffTimer);
      };
    }
    readyCountRef.current = nextReadyCount;
    readyIdsRef.current = nextReadyIds;
    return undefined;
  }, [toServeOrders]);

  useEffect(() => {
    return () => {
      if (readyToastHideTimerRef.current != null) {
        window.clearTimeout(readyToastHideTimerRef.current);
      }
      if (urgentReminderHideTimerRef.current != null) {
        window.clearTimeout(urgentReminderHideTimerRef.current);
      }
    };
  }, []);

  const addSimpleLine = (dish: DishItem, delta: number) => {
    setFastLines((prev) => {
      const dishId = String(dish.id);
      const idx = prev.findIndex(
        (line) =>
          line.dishId === dishId &&
          line.selectedSides.length === 0 &&
          line.selectedExtras.length === 0 &&
          !line.selectedCooking &&
          !line.specialRequest
      );

      if (idx === -1) {
        if (delta <= 0) return prev;
        const category = getDishCategoryLabel(dish);
        const recommendationFlags = getDishRecommendationFlags(dish);
        return [
          ...prev,
          {
            lineId: makeLineId(),
            dishId,
            dishName: getDishName(dish),
            category,
            categoryId: dish.category_id ?? null,
            quantity: delta,
            unitPrice: getDishPrice(dish),
            selectedSides: [],
            selectedExtras: [],
            selectedCooking: "",
            specialRequest: "",
            isDrink: isDrink({ category }),
            isChefSuggestion: recommendationFlags.isChefSuggestion,
            isDailySpecial: recommendationFlags.isDailySpecial,
          },
        ];
      }

      const next = [...prev];
      const nextQty = next[idx].quantity + delta;
      if (nextQty <= 0) next.splice(idx, 1);
      else next[idx] = { ...next[idx], quantity: nextQty };
      return next;
    });
  };

  const dishNeedsOptions = (dish: DishItem) => {
    const hasSides = parseDishSideIds(dish).length > 0;
    const hasExtras = parseDishExtras(dish).length > 0;
    const hasCooking = dishNeedsCooking(dish);
    return hasSides || hasExtras || hasCooking;
  };

  const loadDishOptionsFromDishes = async (dish: DishItem) => {
    const dishId = String(dish.id || "").trim();
    if (dishId) {
      let byId: any = await supabase
        .from("dishes")
        .select(
          "id,name,price,category_id,extras,sides,description,is_featured,is_special,is_chef_suggestion,is_daily_special"
        )
        .eq("id", dish.id)
        .limit(1);
      if (byId.error) {
        byId = await supabase
          .from("dishes")
          .select(
            "id,name,price,category_id,extras,sides,description,is_featured,is_special,is_chef_suggestion,is_daily_special"
          )
          .eq("id", dish.id)
          .limit(1);
      }
      if (byId.error) {
        byId = await supabase.from("dishes").select("id,name,price").eq("id", dish.id).limit(1);
      }
      if (!byId.error && Array.isArray(byId.data) && byId.data[0]) {
        return { ...(dish as Record<string, unknown>), ...((byId.data[0] as DishItem) as Record<string, unknown>) } as DishItem;
      }
    }

    const dishName = String(dish.name || "").trim();
    if (dishName) {
      let byName: any = await supabase
        .from("dishes")
        .select(
          "id,name,price,category_id,extras,sides,description,is_featured,is_special,is_chef_suggestion,is_daily_special"
        )
        .eq("name", dishName)
        .limit(1);
      if (byName.error) {
        byName = await supabase
          .from("dishes")
          .select(
            "id,name,price,category_id,extras,sides,description,is_featured,is_special,is_chef_suggestion,is_daily_special"
          )
          .eq("name", dishName)
          .limit(1);
      }
      if (byName.error) {
        byName = await supabase.from("dishes").select("id,name,price").eq("name", dishName).limit(1);
      }
      if (!byName.error && Array.isArray(byName.data) && byName.data[0]) {
        return { ...(dish as Record<string, unknown>), ...((byName.data[0] as DishItem) as Record<string, unknown>) } as DishItem;
      }
    }

    return dish;
  };

  const fetchSideLabelsByIds = async (sideIds: Array<string | number>) => {
    const normalizedIds = sideIds
      .map((value) => String(value).trim())
      .filter(Boolean)
      .filter((value, index, all) => all.indexOf(value) === index);
    if (normalizedIds.length === 0) return [] as string[];

    const fallbackMap = new Map<string, string>();
    sidesLibrary.forEach((side) => {
      const label =
        String(side.name_fr || "").trim() ||
        String(side.name_en || "").trim() ||
        String(side.name_es || "").trim() ||
        String(side.name_de || "").trim() ||
        String(side.id);
      fallbackMap.set(String(side.id), label);
    });

    const mapRows = (rows: Array<Record<string, unknown>>) => {
      const map = new Map<string, string>();
      rows.forEach((row) => {
        const id = String(row.id ?? "").trim();
        if (!id) return;
        const label =
          String(row.name_fr || "").trim() ||
          String(row.name || "").trim() ||
          String(row.nom || "").trim() ||
          String(row.label || "").trim() ||
          id;
        map.set(id, label);
      });
      return normalizedIds.map((id) => map.get(id) || fallbackMap.get(id) || id);
    };

    const fetchFromSides = async (ids: Array<string | number>) => {
      const query = await supabase.from("sides_library").select("*").in("id", ids);
      if (query.error) {
        const message = (query.error as { message: string } | null)?.message || String(query.error);
        console.error("Erreur fetch sides by ids:", message);
        return null;
      }
      if (!Array.isArray(query.data)) return [] as Array<Record<string, unknown>>;
      return query.data as Array<Record<string, unknown>>;
    };

    const numericIds = normalizedIds
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
      .map((value) => Math.trunc(value));

    let rows: Array<Record<string, unknown>> | null = null;
    if (numericIds.length === normalizedIds.length) {
      rows = await fetchFromSides(numericIds);
    }
    if (!rows || rows.length === 0) {
      rows = await fetchFromSides(normalizedIds);
    }
    if (rows && rows.length > 0) return mapRows(rows);

    return normalizedIds.map((id) => fallbackMap.get(id) || id);
  };

  const openOptionsModal = async (dish: DishItem) => {
    const sourceDish = await loadDishOptionsFromDishes(dish);
    console.log("STRUCTURE RÉELLE DU PLAT:", sourceDish);
    const sideIds = parseDishSideIds(sourceDish);
    const sideLabels = await fetchSideLabelsByIds(sideIds);

    setModalDish(sourceDish);
    setModalQty(1);
    setModalSideChoices(sideLabels);
    setModalExtraChoices(parseDishExtras(sourceDish));
    setModalSelectedSides([]);
    setModalSelectedExtras([]);
    setModalCooking("");
    setModalRequest("");
    setModalOpen(true);
  };

  const handleFastPlus = async (dish: DishItem) => {
    if (dishNeedsOptions(dish)) {
      await openOptionsModal(dish);
      return;
    }
    addSimpleLine(dish, 1);
  };

  const handleFastMinus = (dish: DishItem) => {
    const dishId = String(dish.id);
    setFastLines((prev) => {
      const entries = prev
        .map((line, index) => ({ line, index }))
        .filter((entry) => entry.line.dishId === dishId);
      if (entries.length === 0) return prev;
      const plain = entries.find(
        (entry) =>
          entry.line.selectedSides.length === 0 &&
          entry.line.selectedExtras.length === 0 &&
          !entry.line.selectedCooking &&
          !entry.line.specialRequest
      );
      const target = plain || entries[entries.length - 1];
      const next = [...prev];
      const qty = next[target.index].quantity - 1;
      if (qty <= 0) next.splice(target.index, 1);
      else next[target.index] = { ...next[target.index], quantity: qty };
      return next;
    });
  };

  const handleConfirmOptions = () => {
    if (!modalDish) return;
    if (modalSideChoices.length > 0 && modalSelectedSides.length === 0) {
      alert("Choisissez au moins un accompagnement.");
      return;
    }
    if (dishNeedsCooking(modalDish) && !modalCooking.trim()) {
      alert("Choisissez une cuisson.");
      return;
    }

    const extrasUnitPrice = modalSelectedExtras.reduce((sum, extra) => sum + parsePriceNumber(extra.price), 0);
    const category = getDishCategoryLabel(modalDish);
    const newLine: FastOrderLine = {
      lineId: makeLineId(),
      dishId: String(modalDish.id),
      dishName: getDishName(modalDish),
      category,
      categoryId: modalDish.category_id ?? null,
      quantity: modalQty,
      unitPrice: Number((getDishPrice(modalDish) + extrasUnitPrice).toFixed(2)),
      selectedSides: modalSelectedSides,
      selectedExtras: modalSelectedExtras,
      selectedCooking: modalCooking,
      specialRequest: modalRequest,
      isDrink: isDrink({ category }),
      isChefSuggestion: getDishRecommendationFlags(modalDish).isChefSuggestion,
      isDailySpecial: getDishRecommendationFlags(modalDish).isDailySpecial,
    };

    setFastLines((prev) => [...prev, newLine]);
    setModalOpen(false);
    setModalDish(null);
  };

  const handleSendFastOrder = async () => {
    setFastMessage("");
    const tableNumber = Number(String(selectedTableNumber || "").trim());
    if (!Number.isFinite(tableNumber) || tableNumber <= 0) {
      alert("Numéro de table invalide.");
      return;
    }
    if (fastLines.length === 0) {
      alert("Ajoutez au moins un article.");
      return;
    }

    const ensureTableIsOrderableForServer = async () => {
      const selectPrimary = await supabase
        .from("table_assignments")
        .select("table_number,pin_code")
        .eq("table_number", tableNumber)
        .limit(1);

      if (selectPrimary.error) return selectPrimary.error;

      const row =
        Array.isArray(selectPrimary.data) && selectPrimary.data[0]
          ? (selectPrimary.data[0] as { pin_code: unknown })
          : null;
      const currentPin = String(row?.pin_code || "").trim();
      if (!row) {
        const inserted = await supabase
          .from("table_assignments")
          .insert([{ table_number: tableNumber, pin_code: "SERVEUR" }]);
        if (inserted.error) return inserted.error;
      } else if (!currentPin || currentPin === "0000") {
        const updated = await supabase
          .from("table_assignments")
          .update({ pin_code: "SERVEUR" })
          .eq("table_number", tableNumber);
        if (updated.error) return updated.error;
      }
      return null;
    };

    const activationError = await ensureTableIsOrderableForServer();
    if (activationError) {
      console.warn("Activation table serveur impossible, tentative d'envoi quand même:", activationError);
    }

    const items = fastLines.map((line) => {
      const dishById = dishes.find((dish) => String(dish.id) === String(line.dishId));
      const dishByName = dishes.find(
        (dish) => String(dish.name || dish.nom || dish.name_fr || "").trim().toLowerCase() === line.dishName.trim().toLowerCase()
      );
      const sourceDish = dishById || dishByName;
      const sourceFlags = getDishRecommendationFlags(sourceDish);
      const isChefSuggestion = line.isChefSuggestion || sourceFlags.isChefSuggestion;
      const isDailySpecial = line.isDailySpecial || sourceFlags.isDailySpecial;
      const selectedSideIds = line.selectedSides
        .map((sideLabel) => String(sideIdByAlias.get(normalizeLookupText(sideLabel)) || "").trim())
        .filter(Boolean);
      const selectedExtraIds = line.selectedExtras
        .map((extra, index) => String(extra.id || "").trim() || buildStableExtraId(line.dishId, extra.name, extra.price, index))
        .filter(Boolean);
      const selectedExtras = line.selectedExtras.map((extra, index) => ({
        id: String(extra.id || "").trim() || buildStableExtraId(line.dishId, extra.name, extra.price, index),
        label_fr: String(extra.name || "").trim() || "Supplément",
        price: parsePriceNumber(extra.price),
      }));
      const cookingKey = normalizeCookingKey(line.selectedCooking || "");

      return {
        dish_id: line.dishId,
        id: line.dishId,
        category_id: line.categoryId,
        is_drink: line.isDrink,
        quantity: line.quantity,
        price: Number(line.unitPrice.toFixed(2)),
        selected_side_ids: selectedSideIds,
        selected_extra_ids: selectedExtraIds,
        selected_extras: selectedExtras,
        selected_cooking_key: cookingKey || null,
        selected_cooking_label_fr: cookingKey ? getCookingLabelFr(cookingKey) : null,
        special_request: String(line.specialRequest || "").trim(),
        from_recommendation: isChefSuggestion || isDailySpecial,
        is_chef_suggestion: isChefSuggestion,
        is_daily_special: isDailySpecial,
        is_featured: isChefSuggestion,
        is_special: isDailySpecial,
      };
    });

    const totalPrice = Number(fastTotal.toFixed(2));
    const resolvedRestaurantId = restaurantId ?? SETTINGS_ROW_ID;
    const payload = {
      table_number: String(tableNumber),
      items,
      status: "pending",
      total_price: totalPrice,
      created_at: new Date().toISOString(),
      restaurant_id: resolvedRestaurantId,
    };

    setFastLoading(true);
    const result = await supabase.from("orders").insert([payload]);
    setFastLoading(false);

    if (result.error) {
      console.error("Erreur création commande serveur:", result.error);
      setFastMessage("Erreur envoi commande.");
      return;
    }

    setFastLines([]);
    setFastMessage("Commande envoyée en cuisine.");
    fetchOrders();
  };

  const handleStatusChange = async (orderId: string | number, nextStatus: string) => {
    const orderToClose = orders.find((order) => String(order.id) === String(orderId)) || null;
    setOrders((current) => current.filter((order) => String(order.id) !== String(orderId)));
    const normalizedStatus = String(nextStatus || "").toLowerCase().trim();
    const isServedStatus = ["served", "servi", "servie", "served_to_table"].includes(normalizedStatus);
    if (isServedStatus) {
      setHasReadyOrders(false);
      setReadyBadgePulse(false);
    }
    const isClosingStatus = ["paid", "paye", "payee", "termine", "terminee", "terminé", "terminée", "finished", "done"].includes(normalizedStatus);
    const isPaidStatus = ["paid", "paye", "payee"].includes(normalizedStatus);
    const closedAt = new Date().toISOString();

    let error: unknown = null;
    if (isClosingStatus) {
      const withClosedAt = await supabase
        .from("orders")
        .update({ status: nextStatus, closed_at: closedAt, paid_at: closedAt, updated_at: closedAt })
        .eq("id", orderId);
      error = withClosedAt.error;

      const hasMissingColumnError =
        !!error &&
        (String((error as { code: string }).code || "").trim() === "42703" ||
          String((error as { message: string }).message || "").toLowerCase().includes("column"));

      if (hasMissingColumnError) {
        const withUpdatedAt = await supabase
          .from("orders")
          .update({ status: nextStatus, updated_at: closedAt })
          .eq("id", orderId);
        error = withUpdatedAt.error;
      }

      if (error && String((error as { code: string }).code || "").trim() === "42703") {
        const statusOnly = await supabase
          .from("orders")
          .update({ status: nextStatus })
          .eq("id", orderId);
        error = statusOnly.error;
      }
    } else {
      const statusOnly = await supabase.from("orders").update({ status: nextStatus }).eq("id", orderId);
      error = statusOnly.error;
    }

    if (error) {
      console.error("Update failed in DB:", error);
      fetchOrders();
      return;
    }

    if (isPaidStatus) {
      const tableNumber = Number(String(orderToClose?.table_number || "").trim());
      if (Number.isFinite(tableNumber) && tableNumber > 0) {
        const releaseResult = await supabase
          .from("table_assignments")
          .delete()
          .eq("table_number", tableNumber);
        if (releaseResult.error) {
          console.warn("Impossible de supprimer la session table apres paiement:", releaseResult.error);
          const archiveTry = await supabase
            .from("table_assignments")
            .update({ pin_code: "0000", status: "available", occupied: false } as never)
            .eq("table_number", tableNumber);
          if (archiveTry.error) {
            console.warn("Impossible d'archiver le PIN de la table apres paiement:", archiveTry.error);
          }
        }

        const updateTables = await supabase
          .from("tables")
          .update({ status: "disponible", occupied: false, pin_code: null, pin: null } as never)
          .eq("table_number", tableNumber);
        if (updateTables.error) {
          const message = String((updateTables.error as { message: string }).message || "").toLowerCase();
          const code = String((updateTables.error as { code: string }).code || "");
          const relationMissing = code === "42P01" || message.includes("does not exist");
          if (!relationMissing) {
            console.warn("Mise ? jour tables échouée après paiement:", updateTables.error);
          }
        }

        const updateTableSessions = await supabase
          .from("table_sessions")
          .update({ status: "closed", occupied: false, pin_code: null, pin: null, active: false } as never)
          .eq("table_number", tableNumber);
        if (updateTableSessions.error) {
          const message = String((updateTableSessions.error as { message: string }).message || "").toLowerCase();
          const code = String((updateTableSessions.error as { code: string }).code || "");
          const relationMissing = code === "42P01" || message.includes("does not exist");
          if (!relationMissing) {
            console.warn("Mise ? jour table_sessions échouée après paiement:", updateTableSessions.error);
          }
        }

        const updateActiveSessions = await supabase
          .from("active_sessions")
          .update({ status: "closed", occupied: false, pin_code: null, pin: null, active: false } as never)
          .eq("table_number", tableNumber);
        if (updateActiveSessions.error) {
          const message = String((updateActiveSessions.error as { message: string }).message || "").toLowerCase();
          const code = String((updateActiveSessions.error as { code: string }).code || "");
          const relationMissing = code === "42P01" || message.includes("does not exist");
          if (!relationMissing) {
            console.warn("Mise ? jour active_sessions échouée après paiement:", updateActiveSessions.error);
          }
        }
      }
    }
  };

  const handleDeleteNotification = async (notifId: string | number) => {
    const targetTable = await resolveCallsTable();
    const { error } = await supabase.from(targetTable).delete().eq("id", notifId);
    if (error) {
      handleFetchError(error, "server.handleDeleteNotification");
    }
    fetchCalls();
  };

  const handleReleaseTable = async (tableRaw: string | number) => {
    const tableNumber = Number(String(tableRaw || "").trim());
    if (!Number.isFinite(tableNumber) || tableNumber <= 0) return;

    const primaryUpdate = await supabase
      .from("table_assignments")
      .update({ pin_code: "0000" })
      .eq("table_number", tableNumber)
      .select("table_number");

    if (!primaryUpdate.error) {
      const updatedRows = Array.isArray(primaryUpdate.data) ? primaryUpdate.data.length : 0;
      if (updatedRows === 0) {
        console.warn("Aucune ligne modifiée lors de la libération table:", { table_number: tableNumber });
      }
      return;
    }

    const fallbackUpdate = await supabase
      .from("table_assignments")
      .update({ pin: "0000" })
      .eq("table_number", tableNumber)
      .select("table_number");

    if (!fallbackUpdate.error) {
      const updatedRows = Array.isArray(fallbackUpdate.data) ? fallbackUpdate.data.length : 0;
      if (updatedRows === 0) {
        console.warn("Aucune ligne modifiée lors de la libération table (fallback pin):", {
          table_number: tableNumber,
        });
      }
      return;
    }

    console.error("Erreur liberation table update pin_code/pin:", primaryUpdate.error, fallbackUpdate.error);
  };

  const computeVatSummary = (items: Item[]) => {
    const totals = { ttc10: 0, ttc20: 0 };
    const resolveLineTotal = (item: Item) => {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.price || 0);
      const directTotal = Number(item.line_total || item.total || item.total_price || 0);
      if (Number.isFinite(directTotal) && directTotal > 0) return directTotal;
      return quantity * unitPrice;
    };
    items.forEach((item) => {
      const lineTotal = resolveLineTotal(item);
      if (isDrink(item as unknown as Record<string, unknown>)) totals.ttc20 += lineTotal;
      else totals.ttc10 += lineTotal;
    });
    const vat10 = totals.ttc10 - totals.ttc10 / 1.1;
    const vat20 = totals.ttc20 - totals.ttc20 / 1.2;
    const total = totals.ttc10 + totals.ttc20;
    return { vat10, vat20, total };
  };

  const openPrintTicket = (order: Order) => {
    const items = parseItems(order.items);
    const printableItems = items.map((item) => {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.price || 0);
      const directTotal = Number(item.line_total || item.total || item.total_price || 0);
      const lineTotal = Number.isFinite(directTotal) && directTotal > 0 ? directTotal : quantity * unitPrice;
      const notes = getServerItemNotes(item);
      return { name: resolveServerDishName(item) || "Article", quantity, lineTotal, notes };
    });
    const vat = computeVatSummary(items);
    const dateLabel = new Date(order.created_at).toLocaleString("fr-FR");
    const printWindow = window.open("", "_blank", "width=420,height=720");
    if (!printWindow) return;
    const html = `
      <html>
        <head>
          <title>Ticket ${String(order.id)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
            h1 { font-size: 20px; margin: 0 0 6px 0; }
            .meta { margin-bottom: 10px; font-size: 13px; }
            .line { display: flex; justify-content: space-between; margin: 4px 0; font-size: 14px; }
            .section { margin-top: 12px; border-top: 1px dashed #333; padding-top: 10px; }
            .total { font-weight: 700; font-size: 16px; margin-top: 8px; }
          </style>
        </head>
        <body>
          <h1>${restaurantName}</h1>
          <div class="meta">Table ${order.table_number} - ${dateLabel}</div>
          <div class="section">
            ${printableItems
              .map(
                (item) =>
                  `<div class="line"><span>${item.quantity}x ${item.name}${item.notes ? `<br/><small>${item.notes}</small>` : ""}</span><span>${item.lineTotal.toFixed(2)} \u20AC</span></div>`
              )
              .join("")}
          </div>
          <div class="section">
            <div class="line"><span>TVA 10%</span><span>${vat.vat10.toFixed(2)} \u20AC</span></div>
            <div class="line"><span>TVA 20%</span><span>${vat.vat20.toFixed(2)} \u20AC</span></div>
            <div class="line total"><span>Total</span><span>${vat.total.toFixed(2)} \u20AC</span></div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  useEffect(() => {
    void fetchRestaurantSettings();
  }, []);

  useEffect(() => {
    void fetchOrders();

    const ordersChannel = supabase
      .channel("server-orders")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        console.log("LOG_NOTIF: Changement reçu", payload);
        const eventPayload = payload as {
          old: Record<string, unknown>;
          new: Record<string, unknown>;
        };
        const nextRestaurantId = String(eventPayload.new.restaurant_id ?? "").trim();
        const currentRestaurantId = String(restaurantId ?? "").trim();
        if (currentRestaurantId && nextRestaurantId && currentRestaurantId !== nextRestaurantId) {
          return;
        }
        const nextStatus = normalizeOrderStatus((eventPayload.new.status as unknown) || "");
        const previousStatus = normalizeOrderStatus((eventPayload.old.status as unknown) || "");
        const nextReady = isReadyStatus(nextStatus);
        const previousReady = isReadyStatus(previousStatus);
        const isReadyTransition = nextReady && (!previousReady || nextStatus !== previousStatus);
        if (isReadyTransition) {
          setHasReadyOrders(true);
          setReadyBadgePulse(true);
          setReadyToastMessage(buildReadyToastMessage([eventPayload.new as unknown as Order]));
          setReadyToastVisible(true);
          if (readyToastHideTimerRef.current != null) {
            window.clearTimeout(readyToastHideTimerRef.current);
          }
          readyToastHideTimerRef.current = window.setTimeout(() => setReadyToastVisible(false), 5000);
          playReadySound();
          window.setTimeout(() => setReadyBadgePulse(false), 1400);
        }
        void fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [restaurantId]);

  useEffect(() => {
    void (async () => {
      await resolveCallsTable();
      await fetchCalls();
    })();

    const callsChannel = supabase
      .channel("server-calls")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: callsTableName }, (payload) => {
        const row = ((payload as { new: unknown }).new as Record<string, unknown>) || {};
        const tableLabel = getCallTableNumber(row) || "";
        const normalizedTableLabel = String(tableLabel || "").trim().toUpperCase();
        const message = String(row.message || "").toLowerCase();
        const status = String(row.status || "").toLowerCase();
        const type = String(row.type || "").toLowerCase();
        const isReadyReminder =
          status === "ready_reminder" ||
          message.includes("rappel_serveur_ready") ||
          message.includes("rappeler serveur");
        const isGeneralKitchenCall =
          status === "kitchen_call" ||
          type === "cuisine" ||
          message.includes("general_kitchen_call") ||
          message.includes("la cuisine demande un serveur");

        if (isReadyReminder) {
          triggerUrgentReminderAlert(tableLabel);
          void fetchCalls();
          return;
        }

        if (isGeneralKitchenCall) {
          setUrgentReminderActive(true);
          setReadyBadgePulse(true);
          setReadyToastMessage(KITCHEN_CALL_LABEL);
          setReadyToastVisible(true);
          playReadySound();
          if (readyToastHideTimerRef.current != null) {
            window.clearTimeout(readyToastHideTimerRef.current);
          }
          readyToastHideTimerRef.current = window.setTimeout(() => setReadyToastVisible(false), 5000);
          if (urgentReminderHideTimerRef.current != null) {
            window.clearTimeout(urgentReminderHideTimerRef.current);
          }
          urgentReminderHideTimerRef.current = window.setTimeout(() => {
            setUrgentReminderActive(false);
            setReadyBadgePulse(false);
          }, 8000);
          void fetchCalls();
          return;
        }

        if (normalizedTableLabel === "0" || normalizedTableLabel === "CUISINE") {
          alert(KITCHEN_CALL_LABEL);
        } else {
          alert(`APPEL TABLE ${tableLabel}`);
        }
        void fetchCalls();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(callsChannel);
    };
  }, [callsTableName]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchOrders();
      void fetchCalls();
    }, 10000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [restaurantId, callsTableName]);

  useEffect(() => {
    void (async () => {
      await fetchFastEntryResources();
    })();

    const resourcesChannel = supabase
      .channel("server-fast-entry")
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => fetchFastEntryResources())
      .on("postgres_changes", { event: "*", schema: "public", table: "dishes" }, () => fetchFastEntryResources())
      .on("postgres_changes", { event: "*", schema: "public", table: "sides_library" }, () => fetchFastEntryResources())
      .on("postgres_changes", { event: "*", schema: "public", table: "table_assignments" }, () => fetchFastEntryResources())
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurants" }, () => fetchRestaurantSettings())
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_profile" }, () => fetchRestaurantSettings())
      .subscribe();

    return () => {
      supabase.removeChannel(resourcesChannel);
    };
  }, []);

  const effectiveServerTab = allowClientOrdersEnabled ? "service" : serverTab;

  const renderOrderCard = (
    order: Order,
    showButton: boolean,
    buttonText: string,
    buttonAction: () => void,
    buttonColor: string,
    isKitchen: boolean
  ) => {
    const items = parseItems(order.items);
    const normalizedStatus = normalizeOrderStatus(order.status);
    const isReadyLike = isReadyStatus(order.status);
    const hasBarItem = items.some((item) => {
      const rec = item as unknown as Record<string, unknown>;
      return rec.is_bar === true || isDrink(rec);
    });
    const inferredReadySource = isReadyLike
      ? normalizedStatus === "ready_bar" || normalizedStatus === "pret_bar" || hasBarItem
        ? "bar"
        : "cuisine"
      : null;
    const readyCardTone =
      inferredReadySource === "cuisine"
        ? "border-orange-500 bg-orange-100"
        : inferredReadySource === "bar"
          ? "border-blue-500 bg-blue-100"
          : "border-black bg-white";
    const readyBadgeTone =
      inferredReadySource === "cuisine"
        ? "border-orange-700 bg-orange-500 text-black"
        : inferredReadySource === "bar"
          ? "border-blue-700 bg-blue-600 text-white"
          : "";

    return (
      <div
        key={String(order.id)}
        className={`${readyCardTone} border-2 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between`}
      >
        <div>
          <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-2">
            <div>
              <h2 className="text-3xl font-black">TABLE {order.table_number}</h2>
              {inferredReadySource ? (
                <span className={`mt-1 inline-flex rounded border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${readyBadgeTone}`}>
                  {inferredReadySource === "cuisine" ? "CUISINE" : "BAR"}
                </span>
              ) : null}
            </div>
            <span className="text-xs font-mono text-gray-500">#{String(order.id).slice(0, 4)}</span>
          </div>

          <div className="space-y-2 mb-4">
            {items.map((item, idx) => {
              const itemRecord = item as unknown as Record<string, unknown>;
              const itemType =
                String(itemRecord.type || "").toLowerCase() === "bar" || itemRecord.is_bar === true || isDrink(itemRecord)
                  ? "bar"
                  : "cuisine";
              const dishLabel = resolveServerDishName(item);
              const notes = getServerItemNotes(item);
              return (
                <div
                  key={`${String(order.id)}-${idx}`}
                  className="flex justify-between items-center p-2 border"
                  style={{
                    backgroundColor: itemType === "bar" ? "#dbeafe" : "#ffedd5",
                    borderColor: itemType === "bar" ? "#3b82f6" : "#f59e0b",
                  }}
                >
                  <span className="font-bold text-lg">
                    <span className="bg-black text-white px-2 mr-2 rounded">{item.quantity}x</span>
                    <span className={`mr-2 rounded px-2 py-0.5 text-xs font-black ${itemType === "bar" ? "bg-blue-600 text-white" : "bg-orange-500 text-black"}`}>
                      {itemType === "bar" ? "BAR" : "CUISINE"}
                    </span>
                    {dishLabel}
                  </span>
                  {notes ? <span className="text-red-500 text-sm italic block">Attention: {notes}</span> : null}
                </div>
              );
            })}
          </div>
        </div>

        {showButton ? (
          <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-300">
            <button
              onClick={buttonAction}
              className={`w-full ${buttonColor} hover:opacity-90 text-white font-bold py-4 text-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all`}
            >
              {buttonText}
            </button>
            <button
              onClick={() => handleReleaseTable(order.table_number)}
              className="mt-2 w-full bg-red-600 hover:opacity-90 text-white font-black py-4 text-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
              Forcer la libération
            </button>
            <button
              onClick={() => openPrintTicket(order)}
              className={`mt-2 w-full ${isKitchen ? "bg-orange-500" : "bg-slate-700"} hover:opacity-90 text-white font-bold py-3 text-base border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all`}
            >
              Imprimer Ticket
            </button>
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-300">
            <button
              onClick={() => handleReleaseTable(order.table_number)}
              className="mb-2 w-full bg-red-600 hover:opacity-90 text-white font-black py-4 text-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
              Forcer la libération
            </button>
            <button
              onClick={() => openPrintTicket(order)}
              className="w-full bg-slate-700 hover:opacity-90 text-white font-bold py-3 text-base border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
              Imprimer Ticket
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-black">
      <h1 className="text-2xl font-bold mb-6 uppercase">SERVEUR</h1>
      {readyToastVisible && readyToastMessage ? (
        <div className="fixed top-3 left-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 border-2 border-red-900 bg-red-700 px-4 py-3 text-white shadow-xl">
          <div className="text-sm font-black uppercase tracking-wide">Commandes prêtes</div>
          <div className="text-sm font-semibold">{readyToastMessage}</div>
        </div>
      ) : null}
      {restaurantSettingsError ? (
        <div className="mb-4 rounded border-2 border-red-700 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
          {restaurantSettingsError}
        </div>
      ) : null}

      <div className="mb-6 bg-orange-100 border-2 border-orange-500 p-4">
        <h2 className="text-lg font-bold mb-3 uppercase text-orange-900">APPELS SERVEUR</h2>
        <div className="mb-3">
          <button onClick={fetchCalls} className="bg-orange-600 text-white px-3 py-1 text-sm">
            Rafraichir
          </button>
        </div>
        {pendingNotifications.length === 0 && <p className="text-orange-800 italic">Aucun appel en cours.</p>}
        {pendingNotifications.map((notif) => (
          <div key={String(notif.id)} className="flex items-center justify-between border-b border-orange-300 py-2 last:border-b-0">
            <span className="font-bold text-red-700">
              {(() => {
                if (isKitchenCallNotification(notif)) return KITCHEN_CALL_LABEL;
                return `Appel Table ${notif.table_number || ""}`;
              })()}
            </span>
            <button onClick={() => handleDeleteNotification(notif.id)} className="bg-red-600 text-white px-3 py-1 text-sm font-bold">
              Marquer comme traité
            </button>
          </div>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        {!allowClientOrdersEnabled ? (
          <button
            type="button"
            onClick={() => {
              setHasServerTabOverride(true);
              setServerTab("new-order");
            }}
            className={`px-4 py-3 border-2 border-black font-black ${
              effectiveServerTab === "new-order" ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            Nouvelle Commande
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setHasServerTabOverride(true);
            setServerTab("service");
            setHasReadyOrders(false);
            setReadyBadgePulse(false);
          }}
          className={`relative px-4 py-3 border-2 border-black font-black ${
            effectiveServerTab === "service" ? "bg-black text-white" : "bg-white text-black"
          } ${
            urgentReminderActive
              ? "animate-[pulse_0.6s_ease-in-out_infinite] ring-4 ring-orange-500"
              : hasReadyOrders
                ? `ring-4 ring-red-400 animate-[pulse_1.4s_ease-in-out_infinite] ${
                    readyBadgePulse ? "scale-[1.02]" : ""
                  }`
                : ""
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`inline-block h-3 w-3 rounded-full ${
                urgentReminderActive
                  ? "bg-orange-500 animate-[ping_0.8s_linear_infinite]"
                  : hasReadyOrders
                    ? "bg-red-500 animate-[pulse_1.1s_ease-in-out_infinite]"
                    : "bg-gray-400"
              }`}
            />
            <span>Commandes</span>
            <ReadyOrdersBadge count={toServeOrders.length} urgent={urgentReminderActive} highlight={hasReadyOrders} />
          </span>
          {hasReadyOrders ? (
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border border-white bg-red-600 animate-[pulse_0.9s_ease-in-out_infinite]" aria-hidden="true" />
          ) : null}
        </button>
      </div>

      {!allowClientOrdersEnabled && effectiveServerTab === "new-order" && (
        <section className="bg-white border-2 border-black p-4 mb-6">
          <div className="mb-4 flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-black mb-1">Table</label>
              <input
                list="server-table-list"
                value={selectedTableNumber}
                onChange={(event) => setSelectedTableNumber(event.target.value)}
                placeholder="Ex: 12"
                className="h-12 w-36 border-2 border-black px-3 text-lg font-black"
              />
              <datalist id="server-table-list">
                {tableNumbers.map((table) => (
                  <option key={table} value={table} />
                ))}
              </datalist>
            </div>
            <div className="text-sm font-bold">Articles: {fastLines.reduce((sum, line) => sum + line.quantity, 0)}</div>
            <div className="text-sm font-bold">Total: {fastTotal.toFixed(2)}&euro;</div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {categoriesForFastEntry.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => setSelectedCategoryKey(category.key)}
                className={`px-4 py-2 border-2 border-black font-black ${
                  selectedCategoryKey === category.key ? "bg-black text-white" : "bg-white text-black"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="border-2 border-black">
            <div className="grid grid-cols-[1fr_auto_auto] bg-gray-100 border-b-2 border-black px-3 py-2 font-black text-sm">
              <div>Article</div>
              <div className="pr-4">Prix</div>
              <div className="text-center">Qté</div>
            </div>
            {visibleFastEntryDishes.length === 0 && <div className="px-3 py-3 text-sm">Aucun article.</div>}
            {visibleFastEntryDishes.map((dish) => {
              const dishId = String(dish.id);
              const qty = linesByDish.get(dishId) || 0;
              const cleanDescription = getDishCleanDescription(dish);
              return (
                <div key={dishId} className="grid grid-cols-[1fr_auto_auto] items-center px-3 py-2 border-t border-gray-200">
                  <div>
                    <div className="font-bold">{getDishName(dish)}</div>
                    {cleanDescription ? <div className="text-xs text-gray-600">{cleanDescription}</div> : null}
                  </div>
                  <div className="pr-4 text-sm">{getDishPrice(dish).toFixed(2)}&euro;</div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => handleFastMinus(dish)} className="h-10 w-10 border-2 border-black font-black">
                      -
                    </button>
                    <span className="min-w-10 text-center text-lg font-black">{qty}</span>
                    <button
                      type="button"
                      onClick={() => {
                        void handleFastPlus(dish);
                      }}
                      className="h-10 w-10 border-2 border-black bg-black text-white font-black"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 border-2 border-black p-3 max-h-56 overflow-y-auto">
            <h3 className="font-black mb-2">Récapitulatif</h3>
            {fastLines.length === 0 && <p className="text-sm text-gray-600">Aucune ligne.</p>}
            <div className="space-y-2">
              {fastLines.map((line) => (
                <div key={line.lineId} className="border border-gray-300 p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      {line.quantity}x {line.dishName}
                    </span>
                    <span className="font-black">{(line.unitPrice * line.quantity).toFixed(2)}&euro;</span>
                  </div>
                  {buildLineInstructions(line) ? <div className="text-xs text-gray-700 mt-1">{buildLineInstructions(line)}</div> : null}
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSendFastOrder}
            disabled={fastLoading || fastLines.length === 0 || !selectedTableNumber.trim()}
            className="mt-4 w-full h-14 bg-green-700 text-white text-xl font-black border-2 border-black disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {fastLoading ? "ENVOI..." : "ENVOYER EN CUISINE"}
          </button>
          {fastMessage ? <p className="mt-2 text-sm font-bold">{fastMessage}</p> : null}
        </section>
      )}

      {effectiveServerTab === "service" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div>
            <h2 className="text-xl font-bold mb-4 uppercase bg-blue-100 p-2 rounded">BAR</h2>
            <div className="space-y-4">
              {barOrders.length === 0 && <p className="text-gray-500 italic">Aucune boisson en attente.</p>}
              {barOrders.map((order) =>
                renderOrderCard(order, true, "BOISSON PRETE", () => handleStatusChange(order.id, "ready_bar"), "bg-blue-500", false)
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4 uppercase bg-yellow-100 p-2 rounded">SUIVI CUISINE</h2>
            <div className="space-y-4">
              {kitchenTrackingOrders.length === 0 && <p className="text-gray-500 italic">Aucune commande en cuisine.</p>}
              {kitchenTrackingOrders.map((order) => renderOrderCard(order, false, "", () => {}, "", true))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4 uppercase bg-green-100 p-2 rounded">A SERVIR</h2>
            <div className="space-y-4">
              {toServeOrders.length === 0 && <p className="text-gray-500 italic">Aucune commande prete.</p>}
              {toServeOrders.map((order) =>
                renderOrderCard(order, true, "COMMANDE SERVIE", () => handleStatusChange(order.id, "served"), "bg-yellow-400", false)
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4 uppercase bg-emerald-100 p-2 rounded">PAYEES</h2>
            <div className="space-y-4">
              {paidOrders.length === 0 && <p className="text-gray-500 italic">Aucune commande payee.</p>}
              {paidOrders.map((order) => renderOrderCard(order, false, "", () => {}, "", false))}
            </div>
          </div>
        </div>
      )}

      {modalOpen && modalDish && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border-2 border-black p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-black">Options - {getDishName(modalDish)}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="h-9 w-9 border-2 border-black font-black">×</button>
            </div>
            {getDishCleanDescription(modalDish) ? <p className="mb-3 text-sm text-gray-700">{getDishCleanDescription(modalDish)}</p> : null}

            <div className="flex items-center gap-2 mb-3">
              <span className="font-black">Quantité</span>
              <button type="button" onClick={() => setModalQty((prev) => Math.max(1, prev - 1))} className="h-9 w-9 border-2 border-black font-black">-</button>
              <span className="min-w-8 text-center font-black text-lg">{modalQty}</span>
              <button type="button" onClick={() => setModalQty((prev) => prev + 1)} className="h-9 w-9 border-2 border-black font-black">+</button>
            </div>

            {modalSideChoices.length > 0 && (
              <div className="mb-3">
                <div className="font-black mb-1">Accompagnements</div>
                <div className="flex flex-col gap-1">
                  {modalSideChoices.map((side) => {
                    const checked = modalSelectedSides.includes(side);
                    return (
                      <label key={side} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            if (event.target.checked) setModalSelectedSides((prev) => [...prev, side]);
                            else setModalSelectedSides((prev) => prev.filter((value) => value !== side));
                          }}
                        />
                        <span>{side}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {modalExtraChoices.length > 0 && (
              <div className="mb-3">
                <div className="font-black mb-1">Suppléments</div>
                <div className="flex flex-col gap-1">
                  {modalExtraChoices.map((extra) => {
                    const key = String(extra.id || `${extra.name}-${extra.price}`);
                    const checked = modalSelectedExtras.some(
                      (value) => String(value.id || `${value.name}-${value.price}`) === key
                    );
                    return (
                      <label key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            if (event.target.checked) setModalSelectedExtras((prev) => [...prev, extra]);
                            else
                              setModalSelectedExtras((prev) =>
                                prev.filter((value) => String(value.id || `${value.name}-${value.price}`) !== key)
                              );
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
            )}

            {dishNeedsCooking(modalDish) && (
              <div className="mb-3">
                <div className="font-black mb-1">Cuisson</div>
                <div className="flex flex-wrap gap-2">
                  {COOKING_CHOICES.map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setModalCooking(choice)}
                      className={`px-3 py-1 border-2 border-black font-bold ${
                        modalCooking === choice ? "bg-black text-white" : "bg-white text-black"
                      }`}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-3">
              <div className="font-black mb-1">Demande spéciale</div>
              <input
                type="text"
                value={modalRequest}
                onChange={(event) => setModalRequest(event.target.value)}
                placeholder="Ex: sans oignons"
                className="w-full h-10 border-2 border-black px-3"
              />
            </div>

            <button type="button" onClick={handleConfirmOptions} className="w-full h-12 bg-black text-white border-2 border-black font-black">
              Ajouter à la commande
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
