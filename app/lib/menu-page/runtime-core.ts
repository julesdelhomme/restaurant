import { MASTER_UI_DICTIONARY } from "../../../constants/translations";
import {
  DEFAULT_LANGUAGE_FLAGS,
  DEFAULT_LANGUAGE_LABELS,
  PRICE_FORMATTER_EUR,
  formatPriceTwoDecimals,
  parsePriceNumber,
  parseVariantPrice,
  supabaseUrl,
} from "./config";
import { MENU_PAGE_UI_TEXT } from "./ui-text";
import {
  getCookingLabelFr,
  translateAllergenFallback,
  translateHungerLevelFallback,
  translateSpicyLevelFallback,
} from "../ui-translations";

export const UI_TRANSLATIONS = MASTER_UI_DICTIONARY;
export const UI_TEXT = MENU_PAGE_UI_TEXT;
export type CoreUiLang = "fr" | "en" | "es" | "de";
export function normalizeCategory(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export const DAY_KEY_ALIASES: Record<string, string[]> = {
  sun: ["0", "7", "sun", "sunday", "dim", "dimanche"],
  mon: ["1", "mon", "monday", "lun", "lundi"],
  tue: ["2", "tue", "tues", "tuesday", "mar", "mardi"],
  wed: ["3", "wed", "weds", "wednesday", "mer", "mercredi"],
  thu: ["4", "thu", "thur", "thurs", "thursday", "jeu", "jeudi"],
  fri: ["5", "fri", "friday", "ven", "vendredi"],
  sat: ["6", "sat", "saturday", "sam", "samedi"],
};

export function normalizeDayKey(value: unknown): string | null {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  for (const [key, aliases] of Object.entries(DAY_KEY_ALIASES)) {
    if (aliases.includes(raw)) return key;
  }
  return null;
}

export function parseAvailableDays(value: unknown): string[] {
  if (!value) return [];
  const rawList: Array<unknown> = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? (() => {
          const trimmed = value.trim();
          if (!trimmed) return [];
          if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
              const parsed = JSON.parse(trimmed);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          }
          if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            return trimmed
              .slice(1, -1)
              .split(",")
              .map((entry) => entry.replace(/\"/g, "").trim())
              .filter(Boolean);
          }
          return trimmed.split(",").map((entry) => entry.trim()).filter(Boolean);
        })()
      : [];
  const normalized = rawList
    .map((entry) => normalizeDayKey(entry))
    .filter((entry): entry is string => Boolean(entry));
  return Array.from(new Set(normalized));
}

export function parseTimeToMinutes(value: unknown): number | null {
  if (value == null) return null;
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parts = raw.split(":");
  if (parts.length < 2) return null;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const safeHours = Math.min(23, Math.max(0, Math.trunc(hours)));
  const safeMinutes = Math.min(59, Math.max(0, Math.trunc(minutes)));
  return safeHours * 60 + safeMinutes;
}

export function toBooleanFlag(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "y" || normalized === "on";
  }
  return false;
}

export type CardDesignerLayout = {
  layoutToken?: string | null;
  canvas?: { width?: number; height?: number };
  globalStyle?: Record<string, unknown>;
  elements?: Record<
    string,
    {
      visible?: boolean;
      position?: { x?: number; y?: number };
      size?: { width?: number; height?: number };
      style?: Record<string, unknown>;
    }
  >;
  decorations?: Array<Record<string, unknown>>;
};

export function resolveDesignerShadowPreset(raw: unknown): string {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "soft") return "0 18px 35px rgba(15,23,42,0.16)";
  if (value === "strong") return "0 22px 48px rgba(15,23,42,0.32)";
  if (value === "glass") return "0 18px 40px rgba(14,116,144,0.22), inset 0 1px 0 rgba(255,255,255,0.5)";
  return "none";
}

export function parseCardDesignerLayout(raw: unknown): CardDesignerLayout | null {
  const source = parseJsonObject(raw);
  if (!source || typeof source !== "object") return null;
  const layoutToken = String(source.layoutToken ?? source.layout_token ?? source.layout ?? source.token ?? "")
    .trim()
    .toLowerCase();
  const canvasNode = parseJsonObject(source.canvas);
  const canvas: CardDesignerLayout["canvas"] = {
    width: Number.isFinite(Number(canvasNode.width)) ? Number(canvasNode.width) : undefined,
    height: Number.isFinite(Number(canvasNode.height)) ? Number(canvasNode.height) : undefined,
  };
  const globalStyle = parseJsonObject(source.globalStyle ?? source.global_style);
  const elements = parseJsonObject(source.elements) as CardDesignerLayout["elements"];
  const decorations = (Array.isArray(source.decorations) ? source.decorations : []).filter(
    (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object"
  );
  const hasPayload =
    Object.keys(globalStyle).length > 0 ||
    Object.keys(elements || {}).length > 0 ||
    Object.keys(canvas).length > 0 ||
    decorations.length > 0 ||
    Boolean(layoutToken);
  if (!hasPayload) return null;
  return {
    layoutToken: layoutToken || null,
    canvas,
    globalStyle,
    elements,
    decorations,
  };
}

export const ALCOHOL_WARNING_I18N: Record<string, string> = {
  fr: "L'abus d'alcool est dangereux pour la santé, à consommer avec modération.",
  en: "Alcohol abuse is dangerous for your health, consume in moderation.",
  pt: "O abuso de álcool é perigoso para a saúde, consuma com moderação.",
  es: "El abuso de alcohol es peligroso para la salud, consuma con moderación.",
  de: "Alkoholmissbrauch ist gesundheitsschädlich, in Maßen genießen.",
  it: "L'abuso di alcol è pericoloso per la salute, consumare con moderazione.",
  nl: "Alcoholmisbruik is gevaarlijk voor de gezondheid, geniet met mate.",
  pl: "Nadużywanie alkoholu jest niebezpieczne dla zdrowia, spożywaj z umiarem.",
  ro: "Abuzul de alcool este periculos pentru sănătate, consumați cu moderație.",
  el: "Η κατάχρηση αλκοόλ είναι επικίνδυνη για την υγεία, καταναλώστε με μέτρο.",
  ja: "アルコールの過剰摂取は健康に害を及ぼします。適量を守りましょう。",
  zh: "过量饮酒危害健康，请适量饮用。",
  ko: "과도한 음주는 건강에 해롭습니다. 적당히 마시세요.",
  ru: "Чрезмерное употребление алкоголя вредит здоровью, употребляйте умеренно.",
  ar: "الإفراط في تناول الكحول يضر بصحتك، يرجى الاستمتاع بمسؤولية.",
};

export function getAlcoholWarningText(lang: string): string {
  const normalized = normalizeLanguageKey(String(lang || "").trim()) || "fr";
  const aliases: Record<string, string> = { jp: "ja", cn: "zh", kr: "ko", gr: "el" };
  const key = aliases[normalized] || normalized;
  const fromUi =
    UI_TRANSLATIONS[key]?.alcohol_warning ||
    UI_TRANSLATIONS[normalized]?.alcohol_warning ||
    UI_TRANSLATIONS.en?.alcohol_warning;
  return String(fromUi || ALCOHOL_WARNING_I18N[key] || ALCOHOL_WARNING_I18N.en || "").trim();
}

export function dishContainsAlcohol(dish: Dish | null | undefined): boolean {
  if (!dish) return false;
  const dietary = parseJsonObject((dish as unknown as Record<string, unknown>)?.dietary_tag);
  return toBooleanFlag(
    (dish as unknown as Record<string, unknown>)?.is_alcohol ??
      (dietary as Record<string, unknown>)?.is_alcohol ??
      (dietary as Record<string, unknown>)?.alcohol
  );
}

export function isWithinTimeWindow(nowMinutes: number, startMinutes: number | null, endMinutes: number | null): boolean {
  if (startMinutes == null && endMinutes == null) return true;
  if (startMinutes != null && endMinutes != null) {
    if (startMinutes <= endMinutes) {
      return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
    }
    return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
  }
  if (startMinutes != null) return nowMinutes >= startMinutes;
  if (endMinutes != null) return nowMinutes <= endMinutes;
  return true;
}

export function fixDisplayText(value: string) {
  let output = String(value || "");
  const replacements: Array<[string, string]> = [
    ["\u00C3\u00A9", "\u00E9"],
    ["\u00C3\u00A8", "\u00E8"],
    ["\u00C3\u00AA", "\u00EA"],
    ["\u00C3\u00AB", "\u00EB"],
    ["\u00C3\u00A7", "\u00E7"],
    ["\u00C3\u00A0", "\u00E0"],
    ["\u00C3\u00A2", "\u00E2"],
    ["\u00C3\u00B4", "\u00F4"],
    ["\u00C3\u00BB", "\u00FB"],
    ["\u00C3\u00AE", "\u00EE"],
    ["\u00C3\u00B9", "\u00F9"],
    ["\u00C3\u00A1", "\u00E1"],
    ["\u00C3\u00B3", "\u00F3"],
    ["\u00C3\u00BA", "\u00FA"],
    ["\u00C3\u00B1", "\u00F1"],
    ["\u00C3\u00BC", "\u00FC"],
    ["\u00C3\u00A4", "\u00E4"],
    ["\u00C3\u00B6", "\u00F6"],
    ["\u00C3\u0178", "\u00DF"],
    ["\u00C3\u20AC", "\u00C0"],
    ["\u00C2\u00A1", "\u00A1"],
    ["\u00C2\u00BF", "\u00BF"],
    ["\u00E2\u201A\u00AC", "\u20AC"],
    ["\u00C3\u2014", "\u00D7"],
  ];
  replacements.forEach(([from, to]) => {
    output = output.split(from).join(to);
  });
  const decodeMojibakeOnce = (input: string) => {
    const bytes = Uint8Array.from(Array.from(input).map((ch) => ch.charCodeAt(0) & 0xff));
    return new TextDecoder("utf-8").decode(bytes);
  };
  for (let i = 0; i < 2; i += 1) {
    if (!/[\u00C3]/.test(output)) break;
    const decoded = decodeMojibakeOnce(output);
    if (!decoded || decoded === output) break;
    output = decoded;
  }
  return output;
}

export function deepFixDisplayText<T>(value: T): T {
  if (typeof value === "string") {
    return fixDisplayText(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => deepFixDisplayText(entry)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as unknown as any).map(([key, entry]) => [key, deepFixDisplayText(entry)])
    ) as T;
  }
  return value;
}

export const UI_TEXT_CLEAN = deepFixDisplayText(UI_TEXT);

export function normalizeHexColor(value: unknown, fallback: string) {
  const raw = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback;
}

export function sanitizeMediaUrl(value: unknown, fallbackBucket?: string) {
  const raw = String(value || "")
    .replace(/[\r\n"'\\]/g, "")
    .trim();
  if (!raw) return "";
  const lowered = raw.toLowerCase();
  if (["null", "undefined", "false", "[object object]"].includes(lowered)) return "";
  if (/^(data:|blob:)/i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/") && !raw.startsWith("/storage/")) return raw;

  const normalized = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  const storageMarker = "storage/v1/object/public/";
  if (normalized.startsWith(storageMarker)) {
    return `${supabaseUrl}/${normalized}`;
  }
  if (normalized.startsWith("object/public/")) {
    return `${supabaseUrl}/storage/v1/${normalized}`;
  }
  const markerIndex = normalized.indexOf(storageMarker);
  if (markerIndex >= 0) {
    return `${supabaseUrl}/${normalized.slice(markerIndex)}`;
  }
  const knownBuckets = ["logos", "banners", "dishes-images-", "dishes-images"];
  if (knownBuckets.some((bucket) => normalized.startsWith(`${bucket}/`))) {
    return `${supabaseUrl}/storage/v1/object/public/${normalized}`;
  }
  if (fallbackBucket) {
    return `${supabaseUrl}/storage/v1/object/public/${fallbackBucket}/${normalized}`;
  }
  return raw;
}

export function normalizeBackgroundOpacity(value: unknown, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed > 1 && parsed <= 100) return Math.max(0, Math.min(1, parsed / 100));
  return Math.max(0, Math.min(1, parsed));
}

export function normalizeOpacityPercent(value: unknown, fallback = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed >= 0 && parsed <= 1) return Math.max(0, Math.min(100, Math.round(parsed * 100)));
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

export function getHexContrastTextColor(backgroundHex: string) {
  const hex = normalizeHexColor(backgroundHex, "#FFFFFF").slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.55 ? "#FFFFFF" : "#111111";
}

export function withAlpha(hexColor: string, alphaHex: string) {
  return `${normalizeHexColor(hexColor, "#FFFFFF")}${alphaHex}`;
}

export function alphaHexFromPercent(percent: unknown, fallback = 100) {
  const parsed = Number(percent);
  const clamped = Number.isFinite(parsed) ? Math.min(100, Math.max(0, Math.round(parsed))) : fallback;
  return Math.round((clamped / 100) * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
}

export function t(lang: string, key: keyof (typeof UI_TEXT)["fr"]["labels"]) {
  const uiLang = toUiLang(lang);
  return fixDisplayText(UI_TEXT_CLEAN[uiLang].labels[key] || String(key));
}

export type UiDictionary = Record<string, string>;
export type UiTranslationsByLang = Record<string, UiDictionary>;

export const RTL_LANGUAGE_CODES = new Set(["ar", "he", "fa", "ur"]);
export const ENABLE_RESTAURANT_PROFILE_FALLBACK = false;

export function parseUiTranslations(raw: unknown): UiTranslationsByLang {
  const source = parseJsonObject(raw);
  const parsed: UiTranslationsByLang = {};
  Object.entries(source).forEach(([rawCode, value]) => {
    const code = normalizeLanguageKey(rawCode);
    if (!code || !value || typeof value !== "object") return;
    const dict = Object.fromEntries(
      Object.entries(value as unknown as any)
        .map(([k, v]) => [String(k || "").trim(), String(v || "").trim()])
        .filter(([k, v]) => k.length > 0 && v.length > 0)
    ) as UiDictionary;
    if (Object.keys(dict).length > 0) parsed[code] = dict;
  });
  return parsed;
}

export function buildRuntimeUiText(
  base: (typeof UI_TEXT)[keyof typeof UI_TEXT],
  flatTranslations: UiDictionary
): (typeof UI_TEXT)["fr"] {
  const normalizeUiLabelToken = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const translateKnownDbLabel = (rawValue: string) => {
    const normalized = normalizeUiLabelToken(rawValue);
    const canonicalKey =
      normalized === "precision" || normalized === "precisions"
        ? "precision"
        : normalized === "supplement" || normalized === "supplements"
        ? "supplements"
        : normalized === "cuisson"
        ? "cooking"
        : normalized === "accompagnement" || normalized === "accompagnements"
        ? "sideDish"
        : normalized === "kcal"
        ? "kcal"
        : "";

    if (!canonicalKey) return "";
    const translated =
      String(flatTranslations[canonicalKey] || "").trim() ||
      (canonicalKey === "sideDish" ? String(flatTranslations.sidesLabel || "").trim() : "") ||
      (canonicalKey === "supplements" ? String(flatTranslations.extrasLabel || "").trim() : "") ||
      (canonicalKey === "precision" ? String(flatTranslations.specialRequestLabel || "").trim() : "") ||
      (canonicalKey === "cooking" ? String(flatTranslations.cookingLabel || "").trim() : "");
    return translated ? fixDisplayText(translated) : "";
  };

  const pick = (key: string, fallback: string) => {
    const value = String(flatTranslations[key] || "").trim();
    if (value) {
      const mappedValue = translateKnownDbLabel(value);
      return mappedValue || fixDisplayText(value);
    }
    const mappedFallback = translateKnownDbLabel(fallback);
    return mappedFallback || fixDisplayText(fallback);
  };
  const pickAlias = (primaryKey: string, aliasKeys: string[], fallback: string) => {
    for (const key of [primaryKey, ...aliasKeys]) {
      const value = String(flatTranslations[key] || "").trim();
      if (value) {
        const mappedValue = translateKnownDbLabel(value);
        return mappedValue || fixDisplayText(value);
      }
    }
    const mappedFallback = translateKnownDbLabel(fallback);
    return mappedFallback || fixDisplayText(fallback);
  };

  const mergedLabels = { ...base.labels } as Record<keyof typeof base.labels, string>;
  (Object.keys(base.labels) as Array<keyof typeof base.labels>).forEach((labelKey) => {
    mergedLabels[labelKey] = pick(`labels.${String(labelKey)}`, base.labels[labelKey]);
  });
  mergedLabels.all = pickAlias("labels.all", ["categories.all", "all"], base.labels.all);

  const merged = {
    ...base,
    categories: [
      pickAlias("categories.all", ["labels.all", "all"], base.categories[0]),
      pick("categories.starters", base.categories[1]),
      pick("categories.mains", base.categories[2]),
      pick("categories.desserts", base.categories[3]),
      pick("categories.drinks", base.categories[4]),
    ],
    labels: mergedLabels,
    addToCart: pick("addToCart", base.addToCart),
    cart: pick("cart", base.cart),
    total: pick("total", base.total),
    order: pick("order", base.order),
    backToMenu: pick("backToMenu", base.backToMenu),
    menu: pick("menu", base.menu),
    callServer: pick("callServer", base.callServer),
    help: pick("help", base.help),
    categoriesTitle: pickAlias("categoriesTitle", ["categories.title", "categories.header"], base.categoriesTitle),
    close: pick("close", base.close),
    quantity: pickAlias("quantity", [], base.quantity),
    kcal: pickAlias("kcal", [], "kcal"),
    emptyCart: pick("emptyCart", base.emptyCart),
    noDishes: pick("noDishes", base.noDishes),
    specialRequestLabel: pickAlias("specialRequestLabel", ["precision"], base.specialRequestLabel),
    specialRequestPlaceholder: pickAlias(
      "specialRequestPlaceholder",
      ["precisionExample", "special_request_placeholder"],
      base.specialRequestPlaceholder
    ),
    precision: pickAlias("precision", ["specialRequestLabel"], base.specialRequestLabel),
    precisionExample: pickAlias("precisionExample", ["specialRequestPlaceholder"], base.specialRequestPlaceholder),
    optionsAndVariants: pickAlias("optionsAndVariants", ["options_variants"], "Options / Variantes"),
    itemTotal: pickAlias("itemTotal", ["item_total"], "Total article"),
    sidesLabel: pickAlias("sidesLabel", ["sideDish"], base.sidesLabel),
    sideDish: pickAlias("sideDish", ["sidesLabel"], base.sidesLabel),
    allergensLabel: pickAlias("allergensLabel", ["allergens"], base.allergensLabel),
    extraLabel: pick("extraLabel", base.extraLabel),
    extrasLabel: pickAlias("extrasLabel", ["supplements"], base.extrasLabel),
    supplements: pickAlias("supplements", ["extrasLabel"], base.extrasLabel),
    table: pick("table", base.table),
    pin: pick("pin", base.pin),
    yourTable: pickAlias("yourTable", [], base.yourTable),
    pinCode: pick("pinCode", base.pinCode),
    cookingLabel: pickAlias("cookingLabel", ["cooking"], base.cookingLabel),
    cookingText: pickAlias("cooking", ["cookingLabel"], base.cookingLabel),
    hunger: {
      small: pickAlias("hunger.small", ["smallHunger"], base.hunger.small),
      medium: pickAlias("hunger.medium", ["mediumHunger"], base.hunger.medium),
      large: pickAlias("hunger.large", ["bigHunger"], base.hunger.large),
    },
    cooking: {
      blue: pick("cooking.blue", base.cooking.blue),
      rare: pick("cooking.rare", base.cooking.rare),
      medium: pick("cooking.medium", base.cooking.medium),
      wellDone: pick("cooking.wellDone", base.cooking.wellDone),
    },
  };
  return merged as unknown as typeof UI_TEXT["fr"];
}

export interface Dish {
  id: number | string;
  name: string;
  nom?: string;
  name_fr?: string;
  name_en?: string;
  name_es?: string;
  name_de?: string;
  name_el?: string;
  name_nl?: string;
  name_pl?: string;
  name_ro?: string;
  name_zh?: string;
  name_ko?: string;
  name_ru?: string;
  name_ar?: string;
  name_gr?: string;
  name_cn?: string;
  name_kr?: string;
  description?: string;
  description_fr?: string;
  description_en?: string;
  description_es?: string;
  description_de?: string;
  description_el?: string;
  description_nl?: string;
  description_pl?: string;
  description_ro?: string;
  description_zh?: string;
  description_ko?: string;
  description_ru?: string;
  description_ar?: string;
  description_gr?: string;
  description_cn?: string;
  description_kr?: string;
  price: number;
  category_id?: string | number | null;
  subcategory_id?: string | number | null;
  selected_sides?: Array<string | number> | null;
  image_url?: string;
  is_available?: boolean;
  dietary_tag?: string;
  dietary_tags?: string[];
  allergens?: string;
  is_vegetarian?: boolean;
  is_spicy?: boolean;
  spicy_level?: string | null;
  has_sides?: boolean;
  max_options?: number | null;
  has_extras?: boolean;
  allow_multi_select?: boolean | null;
  ask_cooking?: boolean;
  calories_min?: number | null;
  calories?: number | string | null;
  suggestion_message?: string | null;
  is_featured?: boolean | null;
  is_special?: boolean | null;
  is_chef_suggestion?: boolean | null;
  is_daily_special?: boolean | null;
  is_promo?: boolean | null;
  formula_price?: number | null;
  is_formula?: boolean | null;
  formula_category_ids?: Array<string | number> | null;
  only_in_formula?: boolean | null;
  formula_id?: string | number | null;
    promo_price?: number | null;
    is_suggestion?: boolean | null;
    available_days?: string[] | string | null;
    start_time?: string | null;
    end_time?: string | null;
    dish_options?: ExtrasItem[];
  product_options?: ProductOptionItem[];
  translations?: Record<string, unknown> | string | null;
}

export interface ProductOptionItem {
  id?: string;
  product_id?: string | number;
  name: string;
  name_fr?: string | null;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
  names_i18n?: Record<string, string> | string | null;
  price_override?: number | null;
  is_active?: boolean | null;
  active?: boolean | null;
  is_deleted?: boolean | null;
  deleted?: boolean | null;
}

export interface SuggestionRule {
  from_category_id: string;
  to_category_id: string;
}

export interface Restaurant {
  id?: number;
  name?: string;
  custom_legal_notice?: string | null;
  logo_url?: string;
  banner_image_url?: string | null;
  banner_url?: string | null;
  background_url?: string;
  background_image_url?: string | null;
  primary_color?: string | null;
  text_color?: string | null;
  card_bg_color?: string | null;
  card_bg_opacity?: number | null;
  card_text_color?: string | null;
  card_transparent?: boolean | null;
  cards_transparent?: boolean | null;
  font_family?: string | null;
  card_style?: string | null;
  card_density?: string | null;
  density_style?: string | null;
  bg_opacity?: number | null;
  menu_layout?: string | null;
  card_layout?: string | null;
  settings?: Record<string, unknown> | string | null;
  table_config?: Record<string, unknown> | string | null;
  show_calories?: boolean | string | number | null;
  enabled_languages?: string[] | string | null;
  priority_display?: string | null;
}

export function normalizeLanguageKey(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

export function parseEnabledLanguageEntries(raw: unknown): { codes: string[]; labels: Record<string, string> } {
  let values: string[] = [];
  if (Array.isArray(raw)) {
    values = raw.map((v) => String(v || "").trim()).filter(Boolean);
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          values = parsed.map((v) => String(v || "").trim()).filter(Boolean);
        } else {
          values = trimmed.split(",").map((v) => v.trim()).filter(Boolean);
        }
      } catch {
        values = trimmed.split(",").map((v) => v.trim()).filter(Boolean);
      }
    }
  }

  const labels: Record<string, string> = { ...DEFAULT_LANGUAGE_LABELS };
  const orderedCodes: string[] = [];
  const withDefaults = values.length > 0 ? values : ["fr::Fran\u00e7ais", "en::English"];
  withDefaults.forEach((entryRaw) => {
    const entry = String(entryRaw || "").trim();
    if (!entry) return;
    const sepIndex = entry.indexOf("::");
    const rawCode = sepIndex >= 0 ? entry.slice(0, sepIndex).trim() : entry;
    const rawLabel = sepIndex >= 0 ? entry.slice(sepIndex + 2).trim() : entry;
    const code = normalizeLanguageKey(rawCode) || normalizeLanguageKey(rawLabel);
    if (!code) return;
    if (!orderedCodes.includes(code)) orderedCodes.push(code);
    labels[code] = rawLabel || labels[code] || code.toUpperCase();
  });
  if (!orderedCodes.includes("fr")) orderedCodes.unshift("fr");
  labels.fr = labels.fr || "Fran\u00e7ais";
  return { codes: orderedCodes, labels };
}

export function getLanguageFlag(code: string) {
  return DEFAULT_LANGUAGE_FLAGS[code] || "GL";
}

export function parseJsonObject(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as unknown as any) : {};
    } catch {
      return {};
    }
  }
  return raw && typeof raw === "object" ? (raw as unknown as any) : {};
}

export const toSafeString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function getNameTranslation(source: Record<string, unknown>, langCode: string) {
  const lang = normalizeLanguageKey(langCode);
  const nameFr = toSafeString(source.name_fr);
  if (!lang || lang === "fr") {
    if (nameFr) return nameFr;
  }
  const encodedToken = toSafeString(source.name_en);
  if (encodedToken.startsWith("__I18N__:")) {
    try {
      const parsed = JSON.parse(decodeURIComponent(encodedToken.replace("__I18N__:", ""))) as unknown as any;
      const dynamic = toSafeString(parsed[lang]);
      if (dynamic) return dynamic;
      const dynamicFr = toSafeString(parsed.fr);
      if (dynamicFr) return dynamicFr;
    } catch {
      // ignore malformed token
    }
  }
  const directColumnValue = source[`name_${lang}`];
  const directColumn = toSafeString(directColumnValue);
  if (directColumn) {
    if (directColumn.startsWith("__I18N__:")) {
      try {
        const parsed = JSON.parse(decodeURIComponent(directColumn.replace("__I18N__:", ""))) as unknown as any;
        const dynamic = toSafeString(parsed[lang]);
        if (dynamic) return dynamic;
        const fallback = toSafeString(parsed.fr);
        if (fallback) return fallback;
      } catch {
        // ignore malformed token
      }
    } else {
      return directColumn;
    }
  }
  const translations = parseJsonObject(source.translations);
  const nameNode =
    translations.name && typeof translations.name === "object"
      ? (translations.name as unknown as any)
      : null;
  if (nameNode) {
    const nestedValue = nameNode[lang];
    const nested = toSafeString(nestedValue);
    if (nested) return nested;
  }
  const prefixedValue = translations[`name_${lang}`];
  const prefixed = toSafeString(prefixedValue);
  if (prefixed) return prefixed;
  const langNode = parseJsonObject(translations[lang]);
  const nameValue = langNode.name || langNode.name_fr;
  const nodeName = toSafeString(nameValue);
  if (nodeName) return nodeName;
  const flatValue = translations[lang];
  const flat = toSafeString(flatValue);
  if (flat) return flat;
  return nameFr;
}

export function normalizePinValue(raw: unknown) {
  return String(raw || "").replace(/\s+/g, "").trim();
}

export function normalizeTableNumberKey(raw: unknown) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && asNumber > 0) return String(Math.trunc(asNumber));
  return trimmed;
}

export function normalizeLookupText(raw: unknown) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function parseI18nToken(raw: unknown) {
  const value = String(raw || "").trim();
  if (!value.startsWith("__I18N__:")) return {} as Record<string, string>;
  try {
    const parsed = JSON.parse(decodeURIComponent(value.replace("__I18N__:", "")));
    if (!parsed || typeof parsed !== "object") return {} as Record<string, string>;
    return Object.fromEntries(
      Object.entries(parsed as unknown as any).map(([k, v]) => [
        String(k || "").toLowerCase(),
        String(v || "").trim(),
      ])
    );
  } catch {
    return {} as Record<string, string>;
  }
}

export function buildStableExtraId(dishId: unknown, extra: ExtrasItem, index: number) {
  const explicit = String(extra.id || "").trim();
  if (explicit) return explicit;
  const dishKey = String(dishId || "").trim();
  const nameKey = normalizeLookupText(extra.name_fr || extra.name_en || extra.name_es || extra.name_de || "");
  const priceKey = parsePriceNumber(extra.price).toFixed(2);
  return `extra:${dishKey}:${nameKey || "option"}:${priceKey}:${index}`;
}

export function translateCookingToFrench(raw: unknown) {
  return getCookingLabelFr(raw);
}

export function parseShowCalories(raw: unknown, fallback: boolean) {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") {
    const v = raw.trim().toLowerCase();
    if (v === "true" || v === "1") return true;
    if (v === "false" || v === "0") return false;
  }
  if (typeof raw === "number") return raw !== 0;
  return fallback;
}

export function toLoggableSupabaseError(error: unknown) {
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
  const raw = error as unknown as any;
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

export function isMissingColumnError(error: unknown, columnNames: string[]) {
  const info = toLoggableSupabaseError(error) as unknown as any;
  const code = String(info.code || "").trim();
  const joined = [info.message, info.details, info.hint].map((value) => String(value || "")).join(" ").toLowerCase();
  if (code === "42703") return true;
  if (!joined.includes("column")) return false;
  return columnNames.some((name) => joined.includes(String(name || "").toLowerCase()));
}

export function parseDisplaySettingsFromRow(row: Record<string, unknown>) {
  const settingsPayload = parseDisplaySettingsFromSettingsJson(row.settings);
  const langs = parseEnabledLanguageEntries(row.enabled_languages ?? settingsPayload?.enabledLanguages);
  const marketing = parseMarketingOptions(row.table_config || row.settings || row);
  const tableConfig = parseJsonObject(row.table_config);
  const settingsConfig = parseJsonObject(row.settings);
  const uiTranslations = {
    ...parseUiTranslations(settingsPayload?.uiTranslations),
    ...parseUiTranslations(tableConfig.ui_translations || tableConfig.translations_ui),
    ...parseUiTranslations(settingsConfig.ui_translations || settingsConfig.translations_ui),
    ...parseUiTranslations(row.ui_translations || row.translations_ui),
  };
  const priorityRaw = String(row.priority_display || "").toLowerCase().trim();
  const priorityDisplay = priorityRaw === "daily" ? "daily" : priorityRaw === "chef" ? "chef" : marketing.heroBadgeType;
  const consultationMode =
    Object.prototype.hasOwnProperty.call(row, "is_order_disabled")
      ? parseShowCalories(row.is_order_disabled, marketing.consultationMode)
      : marketing.consultationMode;
  return {
    showCalories: parseShowCalories(row.show_calories, settingsPayload?.showCalories ?? true),
    enabledLanguages: langs.codes,
    languageLabels: langs.labels,
    heroEnabled: marketing.heroEnabled,
    upsellEnabled: marketing.upsellEnabled,
    consultationMode,
    orderValidationCode: marketing.orderValidationCode,
    suggestionRules: marketing.suggestionRules,
    suggestionMessage: marketing.suggestionMessage,
    suggestionMessagesI18n: marketing.suggestionMessagesI18n,
    heroBadgeType: priorityDisplay,
    uiTranslations,
  };
}

export function parseDisplaySettingsFromSettingsJson(raw: unknown) {
  const source =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as unknown as any;
          } catch {
            return null;
          }
        })()
      : (raw as unknown as any | null);
  if (!source || typeof source !== "object") return null;
  const langs = parseEnabledLanguageEntries(source.enabled_languages);
  const marketing = parseMarketingOptions(source.table_config || source.marketing_options || source.marketing || source);
  const config = parseJsonObject(source.table_config);
  const uiTranslations = {
    ...parseUiTranslations(config.ui_translations || config.translations_ui),
    ...parseUiTranslations(source.ui_translations || source.translations_ui),
  };
  const priorityRaw = String(source.priority_display || "").toLowerCase().trim();
  const priorityDisplay = priorityRaw === "daily" ? "daily" : priorityRaw === "chef" ? "chef" : marketing.heroBadgeType;
  return {
    showCalories: parseShowCalories(source.show_calories, true),
    enabledLanguages: langs.codes,
    languageLabels: langs.labels,
    heroEnabled: marketing.heroEnabled,
    upsellEnabled: marketing.upsellEnabled,
    consultationMode: marketing.consultationMode,
    orderValidationCode: marketing.orderValidationCode,
    suggestionRules: marketing.suggestionRules,
    suggestionMessage: marketing.suggestionMessage,
    suggestionMessagesI18n: marketing.suggestionMessagesI18n,
    heroBadgeType: priorityDisplay,
    uiTranslations,
  };
}

export function parseMarketingOptions(raw: unknown) {
  const source =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as unknown as any;
          } catch {
            return null;
          }
        })()
      : (raw as unknown as any | null);
  const marketingContainer =
    source && typeof source === "object" && source.marketing_options && typeof source.marketing_options === "object"
      ? (source.marketing_options as unknown as any)
      : source && typeof source === "object" && source.marketing && typeof source.marketing === "object"
        ? (source.marketing as unknown as any)
        : source;
  const rawRules =
    marketingContainer?.suggestion_rules && Array.isArray(marketingContainer.suggestion_rules)
      ? marketingContainer.suggestion_rules
      : [];
  const suggestionRules = rawRules
    .map((item: unknown) => {
      if (!item || typeof item !== "object") return null;
      const row = item as unknown as any;
      const from = String(row.from_category_id || "").trim();
      const to = String(row.to_category_id || "").trim();
      if (!from || !to) return null;
      return { from_category_id: from, to_category_id: to } as SuggestionRule;
    })
    .filter(Boolean) as SuggestionRule[];
  const suggestionMessage = String(marketingContainer?.suggestion_message || "").trim();
  const rawSuggestionMessages =
    marketingContainer?.suggestion_message_i18n && typeof marketingContainer.suggestion_message_i18n === "object"
      ? (marketingContainer.suggestion_message_i18n as unknown as any)
      : {};
  const suggestionMessagesI18n = Object.fromEntries(
    Object.entries(rawSuggestionMessages)
      .map(([code, value]) => [normalizeLanguageKey(code), String(value || "").trim()])
      .filter(([code, value]) => String(code || "").trim().length > 0 && String(value || "").trim().length > 0)
  ) as Record<string, string>;
  if (suggestionMessage && !suggestionMessagesI18n.fr) {
    suggestionMessagesI18n.fr = suggestionMessage;
  }
  const orderValidationCode = String(
    marketingContainer?.order_validation_code ||
      marketingContainer?.validation_code ||
      source?.order_validation_code ||
      source?.validation_code ||
      "1234"
  ).trim();
  const heroBadgeTypeRaw = String(marketingContainer?.hero_badge_type || "chef").toLowerCase();
  const heroBadgeType = heroBadgeTypeRaw === "daily" ? "daily" : "chef";
  return {
    heroEnabled: parseShowCalories(marketingContainer?.hero_enabled ?? marketingContainer?.show_featured ?? source?.show_featured, true),
    upsellEnabled: parseShowCalories(marketingContainer?.upsell_enabled, false),
    consultationMode: parseShowCalories(
      marketingContainer?.consultation_mode ?? marketingContainer?.is_order_disabled ?? source?.is_order_disabled,
      false
    ),
    orderValidationCode: orderValidationCode || "1234",
    suggestionRules,
    suggestionMessage,
    suggestionMessagesI18n,
    heroBadgeType,
  };
}

export function toUiLang(lang: string): CoreUiLang {
  if (lang === "en" || lang === "es" || lang === "de" || lang === "fr") return lang;
  return "fr";
}

export async function fetchPublicRestaurantConfig(restaurantId: string) {
  const query = restaurantId ? `?restaurant_id=${encodeURIComponent(restaurantId)}` : "";
  const response = await fetch(`/api/public/restaurant-config${query}`, {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => ({}))) as { restaurant?: Record<string, unknown> };
  const row = payload.restaurant;
  if (!row || typeof row !== "object") return null;
  return row;
}

export interface ExtrasItem {
  id?: string;
  name_fr: string;
  name?: string;
  name_en?: string;
  name_es?: string;
  name_de?: string;
  names_i18n?: Record<string, string>;
  price: number;
}

export interface SideLibraryItem {
  id: string | number;
  name_fr: string;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
  translations?: Record<string, unknown> | string | null;
}

export interface CategoryItem {
  id: string | number;
  name_fr: string;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
  translations?: Record<string, unknown> | string | null;
  destination?: string | null;
  sort_order?: number | null;
}

export interface SubCategoryItem {
  id: string | number;
  category_id?: string | number | null;
  name_fr: string;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
  translations?: Record<string, unknown> | string | null;
}

export interface ParsedOptions {
  baseDescription: string;
  extrasList: ExtrasItem[];
  sideIds: number[];
  askCooking: boolean;
}

export interface CartItem {
  dish: Dish;
  quantity: number;
  selectedSides?: string[];
  selectedSideIds?: string[];
  selectedExtras?: ExtrasItem[];
  selectedProductOptions?: ProductOptionItem[];
  selectedProductOption?: ProductOptionItem | null;
  selectedCooking?: string;
  specialRequest?: string;
  fromRecommendation?: boolean;
  formulaSelections?: FormulaSelection[];
  formulaDishId?: string;
  formulaDishName?: string;
  formulaUnitPrice?: number | null;
}

export interface FormulaSelection {
  categoryId: string;
  categoryLabel: string;
  dishId: string;
  dishName: string;
  dishNameFr: string;
  sequence?: number | null;
  selectedSideIds?: string[];
  selectedSides?: string[];
  selectedCooking?: string;
  selectedOptionIds?: string[];
  selectedOptions?: Array<{
    id?: string | null;
    name?: string | null;
    price?: number;
  }>;
  selectedOptionNames?: string[];
  selectedOptionPrice?: number;
  supplements?: Array<{
    name?: string | null;
    price?: number;
  }>;
}

export interface FormulaSelectionDetails {
  selectedSideIds: string[];
  selectedSides: string[];
  selectedCooking: string;
  selectedProductOptionIds: string[];
}

export interface FormulaDishLink {
  formulaDishId: string;
  dishId: string;
  categoryId?: string | null;
  sequence: number | null;
  isMainDish?: boolean;
  priority?: number | string | null;
  step?: number | null;
  defaultProductOptionIds?: string[];
  isRequired?: boolean;
  sortOrder?: number | null;
  formulaName?: string;
  formulaImageUrl?: string;
  formulaMainDishId?: string | null;
  formulaPrice?: number | null;
}
