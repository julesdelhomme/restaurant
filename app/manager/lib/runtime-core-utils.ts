import { DEFAULT_ALLERGEN_TRANSLATIONS_EXTENDED, PREDEFINED_LANGUAGE_OPTIONS_EXTENDED } from "../../lib/languagesConfig";
import { createLocalId, normalizeLanguageKey, normalizeText } from "../managerRuntimeShared";
import type { AllergenLibraryRow, CookingTranslationKey, FormulaStepEntry } from "../types";

export const supabaseUrl = "https://ezzetspsjqgylsqkukdp.supabase.co";
export const supabaseKey = "sb_publishable_ckJLAlKTmQN1KJw4m2Bk9A_k2Aij-Xd";
export const DEFAULT_RESTAURANT_NAME = "Mon Restaurant";
export const RESTAURANT_LOGOS_BUCKET = "restaurant-logos";
export const RESTAURANT_BANNERS_BUCKET = "banners";
export const DISH_IMAGES_BUCKET = "dishes-images-";
export const DEFAULT_TOTAL_TABLES = 10;
export const MAX_TOTAL_TABLES = 200;
export const CLIENT_ORDERING_DISABLED_KEY = "menuqr_disable_client_ordering_tmp";
export const SUPABASE_STORAGE_PUBLIC_MARKER = "storage/v1/object/public/";
export const HUNGER_LEVELS = ["Petite faim", "Moyenne faim", "Grande faim"];
export const DISH_AVAILABLE_DAY_OPTIONS = [
  { key: "mon", label: "Lundi" },
  { key: "tue", label: "Mardi" },
  { key: "wed", label: "Mercredi" },
  { key: "thu", label: "Jeudi" },
  { key: "fri", label: "Vendredi" },
  { key: "sat", label: "Samedi" },
  { key: "sun", label: "Dimanche" },
];
export const ALLERGEN_OPTIONS = [
  "Gluten",
  "Lactose",
  "Arachides",
  "Œufs",
  "Lait",
  "Poisson",
  "Fruits de mer",
  "Soja",
  "Sésame",
  "Moutarde",
  "Céleri",
];
export const STANDARD_FORMULA_ALLERGENS = [
  "Gluten",
  "Shellfish",
  "Eggs",
  "Fish",
  "Peanuts",
  "Soy",
  "Milk",
  "Nuts",
  "Celery",
  "Mustard",
  "Sesame",
  "Sulphites",
  "Lupin",
  "Molluscs",
];
export const DEFAULT_ALLERGEN_TRANSLATIONS = DEFAULT_ALLERGEN_TRANSLATIONS_EXTENDED;
export const PREDEFINED_LANGUAGE_OPTIONS = PREDEFINED_LANGUAGE_OPTIONS_EXTENDED;
export const FORMULA_PARENT_STEP_KEY = "__formula_parent__";
export const FORMULA_DIRECT_SEND_SEQUENCE = 4;
export const MENU_FONT_OPTIONS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Poppins",
  "Nunito",
  "Work Sans",
  "Source Sans 3",
  "Manrope",
  "Noto Sans",
  "Mulish",
  "Montserrat",
  "Raleway",
  "Ubuntu",
  "Merriweather",
  "Lora",
  "PT Serif",
  "Libre Baskerville",
  "Playfair Display",
  "Cormorant Garamond",
  "Bitter",
  "Fira Sans",
  "Rubik",
  "Oswald",
  "Bebas Neue",
  "Quicksand",
  "Barlow",
  "Cabin",
  "Dancing Script",
  "Pacifico",
  "Satisfy",
  "Amatic SC",
] as const;
export const COOKING_TRANSLATION_ORDER: CookingTranslationKey[] = ["rare", "medium_rare", "medium", "well_done"];
export const DEFAULT_COOKING_TRANSLATIONS: Record<CookingTranslationKey, Record<string, string>> = {
  rare: { fr: "Bleu", en: "Blue", es: "Poco hecho", de: "Sehr blutig", pt: "Mal passado" },
  medium_rare: { fr: "Saignant", en: "Rare", es: "Poco cocido", de: "Blutig", pt: "Sangrando" },
  medium: { fr: "À point", en: "Medium", es: "En su punto", de: "Medium", pt: "Ao ponto" },
  well_done: { fr: "Bien cuit", en: "Well done", es: "Bien cocido", de: "Durchgebraten", pt: "Bem passado" },
};

const MOJIBAKE_MARKERS = /(?:Ãƒ.|Ã‚.|Ã¢[\u0080-\u00BF]|Ã°Å¸|ï¿½)/;

export const CATEGORY_TOKEN = "__CATEGORIES__:";
export const SUBCATEGORY_TOKEN = "__SUBCATEGORIES__:";
export const AUTO_PRINT_TOKEN = "__AUTO_PRINT__:";

export const repairMojibakeUiText = (input: string) => {
  const source = String(input || "");
  if (!source || !MOJIBAKE_MARKERS.test(source)) return source;
  try {
    let current = source;
    for (let index = 0; index < 3; index += 1) {
      if (!MOJIBAKE_MARKERS.test(current)) break;
      const bytes = Uint8Array.from(Array.from(current), (char) => char.charCodeAt(0) & 0xff);
      const repaired = new TextDecoder("utf-8").decode(bytes);
      if (!repaired || repaired === current) break;
      current = repaired;
    }
    return current;
  } catch {
    return source;
  }
};

function readPositiveInteger(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const whole = Math.trunc(parsed);
  return whole > 0 ? whole : null;
}

function findTotalTablesValue(raw: unknown, depth = 0): number | null {
  if (depth > 3) return null;
  if (raw == null) return null;
  const direct = readPositiveInteger(raw);
  if (direct != null) return direct;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return findTotalTablesValue(parsed, depth + 1);
    } catch {
      return null;
    }
  }
  if (typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const directFromRow = readPositiveInteger(source.table_count);
  if (directFromRow != null) return directFromRow;
  return (
    findTotalTablesValue(source.table_config, depth + 1) ??
    findTotalTablesValue(source.marketing_options, depth + 1) ??
    findTotalTablesValue(source.settings, depth + 1)
  );
}

export function normalizeTotalTables(value: unknown, fallback = DEFAULT_TOTAL_TABLES) {
  const resolved = findTotalTablesValue(value) ?? fallback;
  return Math.min(MAX_TOTAL_TABLES, Math.max(1, resolved));
}

export function parseObjectRecord(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

export function normalizeFormulaStepEntries(raw: unknown): FormulaStepEntry[] {
  const source =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        })()
      : raw;
  if (!Array.isArray(source)) return [];
  return source
    .map((item, index) => {
      const row =
        item && typeof item === "object" && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : {};
      const title = String(row.title ?? row.name ?? "").trim();
      const optionsRaw = Array.isArray(row.options)
        ? row.options
        : Array.isArray(row.dish_ids)
          ? row.dish_ids
          : Array.isArray(row.items)
            ? row.items
            : [];
      const rawDestination = String(row.destination ?? row.notify_target ?? row.target ?? "").trim().toLowerCase();
      const destination: "cuisine" | "bar" = rawDestination === "bar" ? "bar" : "cuisine";
      const options = Array.from(new Set(optionsRaw.map((value) => String(value || "").trim()).filter(Boolean)));
      return {
        title: title || `Étape ${index + 1}`,
        options,
        auto_notify: false,
        destination,
      } as FormulaStepEntry;
    })
    .filter((step) => step.options.length > 0 || Boolean(step.title));
}

export function buildDishStepMapFromFormulaSteps(steps: FormulaStepEntry[]): Record<string, number> {
  const map: Record<string, number> = {};
  steps.forEach((step, index) => {
    const stepNumber = index + 1;
    step.options.forEach((dishId) => {
      const normalizedDishId = String(dishId || "").trim();
      if (!normalizedDishId) return;
      map[normalizedDishId] = stepNumber;
    });
  });
  return map;
}

export function buildFormulaStepsFromDishStepMap(
  stepMap: Record<string, number>,
  selectedDishIds: string[] = []
): FormulaStepEntry[] {
  const normalizedSelected = Array.from(
    new Set((Array.isArray(selectedDishIds) ? selectedDishIds : []).map((value) => String(value || "").trim()).filter(Boolean))
  );
  const maxFromMap = Math.max(
    1,
    ...Object.values(stepMap || {})
      .map((value) => Math.max(1, Math.trunc(Number(value) || 1)))
      .filter((value) => Number.isFinite(value) && value > 0)
  );
  const totalSteps = Math.max(1, maxFromMap);
  const steps: FormulaStepEntry[] = Array.from({ length: totalSteps }, (_, index) => ({
    title: `Étape ${index + 1}`,
    options: [],
    auto_notify: false,
    destination: "cuisine",
  }));
  Object.entries(stepMap || {}).forEach(([dishId, step]) => {
    const normalizedDishId = String(dishId || "").trim();
    if (!normalizedDishId) return;
    const index = Math.max(0, Math.min(totalSteps - 1, Math.trunc(Number(step) || 1) - 1));
    const target = steps[index];
    target.options = Array.from(new Set([...(target.options || []), normalizedDishId]));
  });
  normalizedSelected.forEach((dishId) => {
    const exists = steps.some((step) => step.options.includes(dishId));
    if (exists) return;
    steps[0].options = Array.from(new Set([...(steps[0].options || []), dishId]));
  });
  return steps;
}

export function normalizeManagerFontFamily(raw: unknown) {
  const value = String(raw || "").trim();
  return (MENU_FONT_OPTIONS as readonly string[]).includes(value) ? value : "Montserrat";
}

export function normalizeDensityStyle(raw: unknown): "compact" | "spacious" {
  const value = String(raw || "").trim().toLowerCase();
  if (["compact", "compacte", "dense"].includes(value)) return "compact";
  return "spacious";
}

export function normalizeMenuLayout(raw: unknown): "classic_grid" | "modern_list" {
  const value = String(raw || "").trim().toLowerCase();
  return value === "modern_list" || value === "horizontal" ? "modern_list" : "classic_grid";
}

export function parseCardLayoutToken(raw: unknown): "default" | "overlay" | "bicolor" | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const source = raw as Record<string, unknown>;
    const fromNested = source.layout_token ?? source.layoutToken ?? source.layout ?? source.variant ?? source.mode;
    if (fromNested != null) {
      return parseCardLayoutToken(fromNested);
    }
    return null;
  }
  const value = String(raw || "").trim().toLowerCase();
  if (value === "overlay" || value === "grid_overlay") return "overlay";
  if (value === "bicolor" || value === "modern_bicolor") return "bicolor";
  if (value === "minimalist" || value === "minimal") return "bicolor";
  if (value === "default" || value === "classic" || value === "standard") return "default";
  return null;
}

export function normalizeCardLayout(raw: unknown): "default" | "overlay" | "bicolor" {
  return parseCardLayoutToken(raw) || "default";
}

export function normalizeCardStyle(raw: unknown): "rounded" | "sharp" {
  const value = String(raw || "").trim().toLowerCase();
  if (["sharp", "pointu", "carre", "square", "angled"].includes(value)) return "sharp";
  return "rounded";
}

export function normalizeWelcomePopupType(raw: unknown): "text" | "image" {
  return String(raw || "").trim().toLowerCase() === "image" ? "image" : "text";
}

export function normalizeHexColor(raw: unknown, fallback: string) {
  const value = String(raw || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export function isHexColorDark(raw: unknown) {
  const hex = normalizeHexColor(raw, "#FFFFFF").slice(1);
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

export function normalizeOpacityPercent(raw: unknown, fallback = 100) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

export function normalizeBackgroundOpacity(raw: unknown, fallback = 1) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed > 1 && parsed <= 100) return Math.max(0, Math.min(1, parsed / 100));
  return Math.max(0, Math.min(1, parsed));
}

export function resolveSupabasePublicUrl(value: unknown, fallbackBucket?: string) {
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
  if (normalized.startsWith(SUPABASE_STORAGE_PUBLIC_MARKER)) {
    return `${supabaseUrl}/${normalized}`;
  }
  if (normalized.startsWith("object/public/")) {
    return `${supabaseUrl}/storage/v1/${normalized}`;
  }
  const markerIndex = normalized.indexOf(SUPABASE_STORAGE_PUBLIC_MARKER);
  if (markerIndex >= 0) {
    return `${supabaseUrl}/${normalized.slice(markerIndex)}`;
  }
  const knownBuckets = [RESTAURANT_LOGOS_BUCKET, RESTAURANT_BANNERS_BUCKET, DISH_IMAGES_BUCKET, "dishes-images"];
  if (knownBuckets.some((bucket) => normalized.startsWith(`${bucket}/`))) {
    return `${supabaseUrl}/storage/v1/object/public/${normalized}`;
  }
  if (fallbackBucket) {
    return `${supabaseUrl}/storage/v1/object/public/${fallbackBucket}/${normalized}`;
  }
  return raw;
}

export function parseCookingTranslations(raw: unknown) {
  const source = parseObjectRecord(raw);
  const next: Record<CookingTranslationKey, Record<string, string>> = {
    rare: { ...DEFAULT_COOKING_TRANSLATIONS.rare },
    medium_rare: { ...DEFAULT_COOKING_TRANSLATIONS.medium_rare },
    medium: { ...DEFAULT_COOKING_TRANSLATIONS.medium },
    well_done: { ...DEFAULT_COOKING_TRANSLATIONS.well_done },
  };
  COOKING_TRANSLATION_ORDER.forEach((key) => {
    const row = parseObjectRecord(source[key]);
    Object.entries(row).forEach(([lang, label]) => {
      const code = normalizeLanguageKey(lang);
      if (!code) return;
      next[key][code] = String(label || "").trim();
    });
  });
  return next;
}

export function createDefaultAllergenLibrary(): AllergenLibraryRow[] {
  return ALLERGEN_OPTIONS.map((nameFr) => ({
    id: createLocalId(),
    name_fr: String(nameFr || "").trim(),
    names_i18n:
      DEFAULT_ALLERGEN_TRANSLATIONS[normalizeText(String(nameFr || "").trim())] || { fr: String(nameFr || "").trim() },
  }));
}

export function parseAllergenLibrary(raw: unknown): AllergenLibraryRow[] {
  const list = Array.isArray(raw) ? raw : [];
  const parsed = list
    .map((entry, index) => {
      const row = parseObjectRecord(entry);
      const nameFr = String(row.name_fr || row.name || "").trim();
      if (!nameFr) return null;
      const namesRaw = parseObjectRecord(row.names_i18n);
      const names_i18n = Object.fromEntries(
        Object.entries(namesRaw)
          .map(([lang, label]) => [normalizeLanguageKey(lang), String(label || "").trim()])
          .filter(([lang, label]) => Boolean(lang) && Boolean(label))
      ) as Record<string, string>;
      names_i18n.fr = names_i18n.fr || nameFr;
      return {
        id: String(row.id || `allergen-${index}-${createLocalId()}`),
        name_fr: nameFr,
        names_i18n,
      } as AllergenLibraryRow;
    })
    .filter(Boolean) as AllergenLibraryRow[];
  return parsed.length > 0 ? parsed : createDefaultAllergenLibrary();
}

export function mergeAllergenLibraryRows(primary: AllergenLibraryRow[], secondary: AllergenLibraryRow[]) {
  const merged: AllergenLibraryRow[] = [];
  const indexByKey = new Map<string, number>();
  const upsert = (row: AllergenLibraryRow) => {
    const nameFr = String(row.name_fr || "").trim();
    if (!nameFr) return;
    const key = normalizeText(nameFr);
    if (!key) return;
    const cleanedNames = Object.fromEntries(
      Object.entries(row.names_i18n || {})
        .map(([lang, label]) => [normalizeLanguageKey(lang), String(label || "").trim()])
        .filter(([lang, label]) => Boolean(lang) && Boolean(label))
    ) as Record<string, string>;
    cleanedNames.fr = cleanedNames.fr || nameFr;
    const existingIndex = indexByKey.get(key);
    if (existingIndex == null) {
      indexByKey.set(key, merged.length);
      merged.push({
        id: String(row.id || createLocalId()),
        name_fr: nameFr,
        names_i18n: cleanedNames,
      });
      return;
    }
    const existing = merged[existingIndex];
    merged[existingIndex] = {
      ...existing,
      id: String(existing.id || row.id || createLocalId()),
      name_fr: existing.name_fr || nameFr,
      names_i18n: {
        ...(row.names_i18n || {}),
        ...(existing.names_i18n || {}),
        ...cleanedNames,
        fr: String(existing.names_i18n?.fr || cleanedNames.fr || existing.name_fr || nameFr),
      },
    };
  };
  primary.forEach(upsert);
  secondary.forEach(upsert);
  return merged.length > 0 ? merged : createDefaultAllergenLibrary();
}

export function extractAllergenNamesFromDishPayload(rawDish: Record<string, unknown>): string[] {
  const parseList = (value: unknown) => {
    if (Array.isArray(value)) return value.map((entry) => String(entry || "").trim()).filter(Boolean);
    if (typeof value === "string") {
      return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return [] as string[];
  };
  const dietaryRaw = rawDish.dietary_tag;
  const dietary = typeof dietaryRaw === "string" ? parseObjectRecord(dietaryRaw) : (dietaryRaw as Record<string, unknown> | null) || {};
  const i18n = parseObjectRecord(dietary.i18n);
  const manual = parseObjectRecord(i18n.allergens_manual);
  const manualKeys = Object.keys(manual).map((key) => String(key || "").trim()).filter(Boolean);
  const manualValues = Object.values(manual).flatMap((entry) => {
    const row = parseObjectRecord(entry);
    return Object.values(row)
      .map((value) => String(value || "").trim())
      .filter(Boolean);
  });
  const i18nAllergens = parseObjectRecord(i18n.allergens);
  const localizedAllergens = Object.values(i18nAllergens).flatMap((entry) => parseList(entry));
  const fromDietary = parseList(dietary.allergens_selected ?? dietary.allergens_fr ?? dietary.allergens);
  const legacy = parseList(rawDish.allergens);
  const merged = [...fromDietary, ...manualKeys, ...manualValues, ...localizedAllergens, ...legacy];
  const seen = new Set<string>();
  return merged.filter((value) => {
    const key = normalizeText(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
