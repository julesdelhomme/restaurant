import { supabase } from "../../lib/supabase";
import { createLocalId, normalizeLanguageKey, normalizeText, parseEnabledLanguageEntries } from "../managerRuntimeShared";
import {
  CLIENT_ORDERING_DISABLED_KEY,
  DEFAULT_TOTAL_TABLES,
  normalizeTotalTables,
  parseObjectRecord,
} from "./runtime-core-utils";
import type { ExtrasItem, SuggestionRule } from "../types";

const SIDE_IDS_TOKEN = "__SIDE_IDS__:";
const ASK_COOKING_TOKEN = "__ASK_COOKING__:";
const EXTRAS_TOKEN = "__EXTRAS__:";
const EXTRAS_JSON_TOKEN = "__EXTRAS_JSON__:";
const EXTRAS_I18N_TOKEN = "__EXTRAS_I18N__:";
const CATEGORY_TOKEN = "__CATEGORIES__:";
const SUBCATEGORY_TOKEN = "__SUBCATEGORIES__:";
const AUTO_PRINT_TOKEN = "__AUTO_PRINT__:";

function normalizeLookupText(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function parsePriceNumber(value: unknown) {
  const parsed =
    typeof value === "number" ? value : Number(String(value || "0").replace(",", "."));
  return Number.isFinite(parsed) ? Number(parsed) : 0;
}

function parseJsonObject(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function buildStableExtraId(
  dishId: unknown,
  extra: { id?: string; name_fr?: string; price?: number },
  index: number
) {
  const rawId = String(extra.id || "").trim();
  if (rawId) return rawId;
  const dishToken = String(dishId ?? "dish").trim() || "dish";
  const nameToken = normalizeLookupText(extra.name_fr || "extra") || "extra";
  const priceToken = parsePriceNumber(extra.price).toFixed(2);
  return `${dishToken}::${nameToken}::${priceToken}::${index}`;
}

export function parseOptionsFromDescription(description?: string | null) {
  const result = {
    baseDescription: "",
    extrasList: [] as ExtrasItem[],
    sideIds: [] as Array<string | number>,
    askCooking: false,
  };

  if (!description) return result;

  const lines = String(description).split("\n");
  const remaining: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.startsWith(SIDE_IDS_TOKEN)) {
      const raw = trimmed.replace(SIDE_IDS_TOKEN, "").trim();
      result.sideIds = raw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      return;
    }

    if (trimmed.startsWith(ASK_COOKING_TOKEN)) {
      const raw = trimmed.replace(ASK_COOKING_TOKEN, "").trim().toLowerCase();
      result.askCooking = raw === "true" || raw === "1";
      return;
    }

    if (trimmed.startsWith(EXTRAS_TOKEN)) {
      const raw = trimmed.replace(EXTRAS_TOKEN, "").trim();
      result.extrasList = raw
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((entry, index) => {
          const [namePart, pricePart] = entry.split("=").map((p) => p.trim());
          const price = pricePart ? Number(pricePart.replace(",", ".")) : 0;
          const safePrice = Number.isFinite(price) ? price : 0;
          return {
            id: buildStableExtraId("legacy", { name_fr: namePart || "Supplement", price: safePrice }, index),
            name_fr: namePart || "Supplement",
            name_en: namePart || "Supplement",
            name_es: namePart || "Suplemento",
            name_de: namePart || "Zusatz",
            names_i18n: {},
            price: safePrice,
          } as ExtrasItem;
        });
      return;
    }

    if (trimmed.startsWith(EXTRAS_JSON_TOKEN)) {
      const raw = trimmed.replace(EXTRAS_JSON_TOKEN, "").trim();
      try {
        const parsed = JSON.parse(decodeURIComponent(raw));
        if (Array.isArray(parsed)) {
          result.extrasList = parsed
            .map((row, index) => {
              if (!row || typeof row !== "object") return null;
              const item = row as Record<string, unknown>;
              const namesObj = parseJsonObject(item.names_i18n);
              const names: Record<string, string> = Object.fromEntries(
                Object.entries(namesObj)
                  .map(([k, v]) => [normalizeLanguageKey(k), String(v ?? "").trim()])
                  .filter(([k, v]) => Boolean(k) && Boolean(v))
              );
              const nameFr = String(item.name_fr ?? names.fr ?? "").trim() || "Supplement";
              const price = parsePriceNumber(item.price);
              return {
                id: buildStableExtraId("json", { id: String(item.id || ""), name_fr: nameFr, price }, index),
                name_fr: nameFr,
                name_en: String(item.name_en ?? names.en ?? "").trim(),
                name_es: String(item.name_es ?? names.es ?? "").trim(),
                name_de: String(item.name_de ?? names.de ?? "").trim(),
                names_i18n: { ...names, fr: names.fr || nameFr },
                price,
              } as ExtrasItem;
            })
            .filter(Boolean) as ExtrasItem[];
          return;
        }
      } catch {
        // ignore malformed payload
      }
    }

    if (trimmed.startsWith(EXTRAS_I18N_TOKEN)) {
      const raw = trimmed.replace(EXTRAS_I18N_TOKEN, "").trim();
      result.extrasList = raw
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((entry, index) => {
          const [labels, pricePart] = entry.split("=").map((p) => p.trim());
          const [fr, en, es, de] = (labels || "").split("~").map((p) => decodeURIComponent((p || "").trim()));
          const price = pricePart ? Number(pricePart.replace(",", ".")) : 0;
          const safePrice = Number.isFinite(price) ? price : 0;
          return {
            id: buildStableExtraId("i18n", { name_fr: fr || "Supplement", price: safePrice }, index),
            name_fr: fr || "Supplement",
            name_en: en || "",
            name_es: es || "",
            name_de: de || "",
            names_i18n: { fr: fr || "", en: en || "", es: es || "", de: de || "" },
            price: safePrice,
          } as ExtrasItem;
        });
      return;
    }

    remaining.push(line);
  });

  result.baseDescription = remaining.join("\n").trim();
  return result;
}

export function parseExtrasFromUnknown(raw: unknown, dishId?: unknown): ExtrasItem[] {
  if (raw == null) return [];

  let source: unknown = raw;
  if (typeof source === "string") {
    const trimmed = source.trim();
    if (!trimmed) return [];
    try {
      source = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }

  const candidate = Array.isArray(source)
    ? source
    : typeof source === "object" && source !== null
      ? ((source as Record<string, unknown>).extras ??
          (source as Record<string, unknown>).items ??
          (source as Record<string, unknown>).list)
      : [];

  if (!Array.isArray(candidate)) return [];

  return candidate
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const parsedNamesI18n = Object.fromEntries(
        Object.entries(parseJsonObject(row.names_i18n)).map(([k, v]) => [
          normalizeLanguageKey(k),
          String(v || "").trim(),
        ])
      ) as Record<string, string>;

      const nameFr = String(
        row.name_fr ?? parsedNamesI18n.fr ?? row.name ?? row.label_fr ?? row.label ?? ""
      ).trim();
      if (!nameFr) return null;

      const price = parsePriceNumber(row.price ?? row.amount ?? row.value ?? 0);

      return {
        id: buildStableExtraId(
          dishId,
          { id: String(row.id ?? row.extra_id ?? ""), name_fr: nameFr, price },
          index
        ),
        name_fr: nameFr,
        name_en: String(row.name_en ?? parsedNamesI18n.en ?? "").trim(),
        name_es: String(row.name_es ?? parsedNamesI18n.es ?? "").trim(),
        name_de: String(row.name_de ?? parsedNamesI18n.de ?? "").trim(),
        names_i18n: { ...parsedNamesI18n, fr: parsedNamesI18n.fr || nameFr },
        price,
      } as ExtrasItem;
    })
    .filter(Boolean) as ExtrasItem[];
}

export function parseDishOptionsRowsToExtras(rows: Array<Record<string, unknown>>, dishId?: unknown): ExtrasItem[] {
  return (Array.isArray(rows) ? rows : [])
    .map((row, index) => {
      const parsedNamesI18n = Object.fromEntries(
        Object.entries(parseJsonObject(row.names_i18n)).map(([k, v]) => [
          normalizeLanguageKey(k),
          String(v || "").trim(),
        ])
      ) as Record<string, string>;

      const dynamicNameColumns = Object.fromEntries(
        Object.entries(row)
          .filter(([key]) => /^name_[a-z]{2}$/i.test(String(key || "")))
          .map(([key, value]) => [String(key).slice(5).toLowerCase(), String(value || "").trim()])
          .filter(([, value]) => Boolean(value))
      ) as Record<string, string>;

      const nameFr = String(
        row.name_fr ?? parsedNamesI18n.fr ?? dynamicNameColumns.fr ?? row.name ?? row.label_fr ?? row.label ?? ""
      ).trim();
      if (!nameFr) return null;

      const price = parsePriceNumber(row.price ?? row.option_price ?? 0);

      return {
        id: buildStableExtraId(dishId, { id: String(row.id || ""), name_fr: nameFr, price }, index),
        name_fr: nameFr,
        name_en: String(row.name_en ?? parsedNamesI18n.en ?? dynamicNameColumns.en ?? "").trim(),
        name_es: String(row.name_es ?? parsedNamesI18n.es ?? dynamicNameColumns.es ?? "").trim(),
        name_de: String(row.name_de ?? parsedNamesI18n.de ?? dynamicNameColumns.de ?? "").trim(),
        names_i18n: {
          ...parsedNamesI18n,
          ...dynamicNameColumns,
          fr: parsedNamesI18n.fr || dynamicNameColumns.fr || nameFr,
        },
        price,
      } as ExtrasItem;
    })
    .filter(Boolean) as ExtrasItem[];
}

export function mergeExtrasUnique(primary: ExtrasItem[], secondary: ExtrasItem[]) {
  const out = [...(Array.isArray(primary) ? primary : [])];
  const seen = new Set(
    out.map((extra) => `${normalizeLookupText(extra.name_fr || "")}__${parsePriceNumber(extra.price).toFixed(2)}`)
  );
  (Array.isArray(secondary) ? secondary : []).forEach((extra) => {
    const key = `${normalizeLookupText(extra.name_fr || "")}__${parsePriceNumber(extra.price).toFixed(2)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(extra);
  });
  return out;
}

export function buildDescriptionWithOptions(
  baseDescription: string,
  sideIds: Array<string | number> = [],
  extrasList: ExtrasItem[] = [],
  askCooking = false
) {
  const parts: string[] = [];
  if (String(baseDescription || "").trim()) parts.push(String(baseDescription || "").trim());
  if (Array.isArray(sideIds) && sideIds.length > 0) parts.push(`${SIDE_IDS_TOKEN} ${sideIds.map(String).join(",")}`);
  if (askCooking) parts.push(`${ASK_COOKING_TOKEN} true`);

  if (Array.isArray(extrasList) && extrasList.length > 0) {
    const extrasPayload = extrasList
      .filter((e) => String(e?.name_fr || "").trim())
      .map((e) => {
        const names = {
          ...(e.names_i18n || {}),
          fr: String(e.name_fr || "").trim(),
          en: String(e.name_en || "").trim(),
          es: String(e.name_es || "").trim(),
          de: String(e.name_de || "").trim(),
        };
        return {
          id: e.id || createLocalId(),
          name_fr: String(e.name_fr || "").trim(),
          name_en: String(e.name_en || "").trim(),
          name_es: String(e.name_es || "").trim(),
          name_de: String(e.name_de || "").trim(),
          names_i18n: names,
          price: Number(parsePriceNumber(e.price)).toFixed(2),
        };
      });

    if (extrasPayload.length > 0) {
      parts.push(`${EXTRAS_JSON_TOKEN} ${encodeURIComponent(JSON.stringify(extrasPayload))}`);
    }
  }

  return parts.join("\n");
}

export function parseCategoryConfig(customTags: string[] | undefined) {
  const tags = Array.isArray(customTags) ? customTags : [];
  let categories: string[] | null = null;
  let subCategories: Record<string, string[]> | null = null;

  tags.forEach((tag) => {
    if (tag.startsWith(CATEGORY_TOKEN)) {
      try {
        categories = JSON.parse(tag.replace(CATEGORY_TOKEN, ""));
      } catch {
        categories = null;
      }
    }
    if (tag.startsWith(SUBCATEGORY_TOKEN)) {
      try {
        subCategories = JSON.parse(tag.replace(SUBCATEGORY_TOKEN, ""));
      } catch {
        subCategories = null;
      }
    }
  });

  const rest = tags.filter(
    (tag) =>
      !tag.startsWith(CATEGORY_TOKEN) &&
      !tag.startsWith(SUBCATEGORY_TOKEN) &&
      !tag.startsWith(AUTO_PRINT_TOKEN)
  );

  return { categories, subCategories, rest };
}

export function parseAutoPrintSetting(customTags: string[] | undefined) {
  const tags = Array.isArray(customTags) ? customTags : [];
  let autoPrintKitchen = true;

  tags.forEach((tag) => {
    if (tag.startsWith(AUTO_PRINT_TOKEN)) {
      try {
        const parsed = JSON.parse(tag.replace(AUTO_PRINT_TOKEN, ""));
        if (typeof parsed?.kitchen === "boolean") autoPrintKitchen = parsed.kitchen;
      } catch {
        // ignore malformed setting
      }
    }
  });

  return autoPrintKitchen;
}

function parseMarketingOptions(raw: unknown) {
  const source =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as Record<string, unknown>;
          } catch {
            return null;
          }
        })()
      : (raw as Record<string, unknown> | null);

  const marketingContainer =
    source && typeof source === "object" && source.marketing_options && typeof source.marketing_options === "object"
      ? (source.marketing_options as Record<string, unknown>)
      : source || {};

  const rawRules =
    marketingContainer?.suggestion_rules && Array.isArray(marketingContainer.suggestion_rules)
      ? marketingContainer.suggestion_rules
      : [];

  const suggestionRules = rawRules
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const from = String(row.from_category_id || "").trim();
      const to = String(row.to_category_id || "").trim();
      if (!from || !to) return null;
      return { from_category_id: from, to_category_id: to } as SuggestionRule;
    })
    .filter(Boolean) as SuggestionRule[];

  const suggestionMessage = String(marketingContainer?.suggestion_message || "").trim();
  const heroBadgeTypeRaw = String(marketingContainer?.hero_badge_type || "chef").toLowerCase();
  const heroBadgeType = heroBadgeTypeRaw === "daily" ? "daily" : "chef";

  return {
    heroEnabled: toBoolean(marketingContainer?.hero_enabled, true),
    upsellEnabled: toBoolean(marketingContainer?.upsell_enabled, false),
    consultationMode: toBoolean(marketingContainer?.consultation_mode, false) || readLocalClientOrderingDisabled(),
    searchEnabled: toBoolean(marketingContainer?.search_enabled, false),
    suggestionRules,
    suggestionMessage,
    heroBadgeType,
  };
}

export function parseDisplaySettingsFromRow(row: Record<string, unknown>) {
  const show = toBoolean((row as any)?.show_calories, true);
  const langs = parseEnabledLanguageEntries((row as any)?.enabled_languages);
  const marketing = parseMarketingOptions((row as any)?.table_config || row);
  const totalTables = normalizeTotalTables(row, DEFAULT_TOTAL_TABLES);

  return {
    showCalories: show,
    enabledLanguages: langs.codes.length > 0 ? langs.codes : ["fr", "en"],
    languageLabels: langs.labels,
    heroEnabled: marketing.heroEnabled,
    upsellEnabled: marketing.upsellEnabled,
    consultationMode: marketing.consultationMode,
    searchEnabled: marketing.searchEnabled,
    suggestionRules: marketing.suggestionRules,
    suggestionMessage: marketing.suggestionMessage,
    heroBadgeType: marketing.heroBadgeType,
    totalTables,
  };
}

export function parseDisplaySettingsFromSettingsJson(raw: unknown) {
  const source =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as Record<string, unknown>;
          } catch {
            return null;
          }
        })()
      : (raw as Record<string, unknown> | null);

  if (!source || typeof source !== "object") return null;

  const show = toBoolean(source.show_calories, true);
  const langs = parseEnabledLanguageEntries(source.enabled_languages);
  const marketing = parseMarketingOptions(source.table_config || source.marketing_options || source.marketing || source);
  const totalTables = normalizeTotalTables(source, DEFAULT_TOTAL_TABLES);

  return {
    showCalories: show,
    enabledLanguages: langs.codes.length > 0 ? langs.codes : ["fr", "en"],
    languageLabels: langs.labels,
    heroEnabled: marketing.heroEnabled,
    upsellEnabled: marketing.upsellEnabled,
    consultationMode: marketing.consultationMode,
    searchEnabled: marketing.searchEnabled,
    suggestionRules: marketing.suggestionRules,
    suggestionMessage: marketing.suggestionMessage,
    heroBadgeType: marketing.heroBadgeType,
    totalTables,
  };
}

export function toBoolean(value: unknown, defaultValue: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "1") return true;
    if (v === "false" || v === "0") return false;
  }
  if (typeof value === "number") return value !== 0;
  return defaultValue;
}

function readLocalClientOrderingDisabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CLIENT_ORDERING_DISABLED_KEY) === "1";
}

export function writeLocalClientOrderingDisabled(value: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLIENT_ORDERING_DISABLED_KEY, value ? "1" : "0");
}

export function toLoggableSupabaseError(error: unknown) {
  if (!error || typeof error !== "object") return { message: String(error || "Unknown error") };
  const raw = error as Record<string, unknown>;
  return {
    code: typeof raw.code === "string" ? raw.code : undefined,
    message: typeof raw.message === "string" ? raw.message : undefined,
    hint: typeof raw.hint === "string" ? raw.hint : undefined,
    details: typeof raw.details === "string" ? raw.details : undefined,
  };
}

export function isMissingTableError(error: unknown): boolean {
  const info = toLoggableSupabaseError(error);
  const message = String(info.message || "").toLowerCase();
  return info.code === "42P01" || message.includes("relation") && message.includes("does not exist");
}

export function hasMissingColumnError(error: unknown, column?: string): boolean {
  const info = toLoggableSupabaseError(error);
  const message = String(info.message || "").toLowerCase();
  const hint = String(info.hint || "").toLowerCase();
  const details = String(info.details || "").toLowerCase();

  const isMissing =
    info.code === "42703" ||
    message.includes("column") && message.includes("does not exist") ||
    hint.includes("column") && hint.includes("does not exist") ||
    details.includes("column") && details.includes("does not exist");

  if (!isMissing) return false;
  if (!column) return true;
  const target = String(column || "").toLowerCase();
  return [message, hint, details].some((text) => text.includes(target));
}

export function extractMissingColumnName(raw: unknown): string | null {
  const text = String(raw || "");
  if (!text.trim()) return null;

  const patterns = [
    /column\s+"?([a-zA-Z0-9_]+)"?\s+does\s+not\s+exist/i,
    /column\s+([a-zA-Z0-9_]+)\s+of\s+relation/i,
    /unknown\s+column\s+"?([a-zA-Z0-9_]+)"?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return String(match[1]).trim();
  }

  return null;
}

export function normalizeOptionIds(value: unknown): string[] {
  const toList = (input: unknown): unknown[] => {
    if (Array.isArray(input)) return input;
    if (typeof input === "string") {
      const trimmed = input.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [trimmed];
      } catch {
        return trimmed.split(",");
      }
    }
    return input == null ? [] : [input];
  };

  return Array.from(
    new Set(
      toList(value)
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );
}

export function readFormulaConfigNode(value: any): Record<string, any> {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" ? value : {};
}

export function resolveBaseDishIdentityFromFormulaConfig(dishRow: any, configRaw: any) {
  const config = readFormulaConfigNode(configRaw);
  const snap = parseObjectRecord(config.base_dish_snapshot ?? config.baseDishSnapshot);
  if (!snap || Object.keys(snap).length === 0) return dishRow;

  return {
    ...dishRow,
    name_fr: String(snap.name_fr || snap.name || dishRow?.name_fr || "").trim() || dishRow?.name_fr,
    price: Number.isFinite(Number(snap.price)) ? Number(snap.price) : dishRow?.price,
    calories: snap.kcal ?? snap.calories ?? dishRow?.calories,
  };
}

export async function restoreRawDishFromFormulaSnapshot(
  dishId: unknown,
  restaurantId: unknown,
  formulaConfigRaw: unknown
) {
  const normalizedDishId = String(dishId || "").trim();
  if (!normalizedDishId) return;

  const config = readFormulaConfigNode(formulaConfigRaw as any);
  const snapshot = parseObjectRecord(config.base_dish_snapshot ?? config.baseDishSnapshot);
  if (!snapshot || Object.keys(snapshot).length === 0) return;

  const payload: Record<string, unknown> = {};
  const allowedFields = [
    "name",
    "name_fr",
    "name_en",
    "name_es",
    "name_de",
    "description",
    "description_fr",
    "description_en",
    "description_es",
    "description_de",
    "price",
    "category_id",
    "subcategory_id",
    "calories",
    "allergens",
    "image_url",
  ];

  allowedFields.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
      payload[key] = snapshot[key];
    }
  });

  if (Object.keys(payload).length === 0) return;

  let query = supabase.from("dishes").update(payload as never).eq("id", normalizedDishId);
  const normalizedRestaurantId = String(restaurantId || "").trim();
  if (normalizedRestaurantId) {
    query = query.eq("restaurant_id", normalizedRestaurantId);
  }
  await query;
}

export function getDishDisplayDescription(dish: any): string {
  const candidates = [dish?.description_fr, dish?.description, dish?.description_en].filter(Boolean);
  for (const candidate of candidates) {
    const parsed = parseOptionsFromDescription(String(candidate));
    if (parsed.baseDescription) return parsed.baseDescription;
  }
  return "";
}
