import { supabase } from "../../lib/supabase";
import {
  CLIENT_ORDERING_DISABLED_KEY,
  DEFAULT_TOTAL_TABLES,
  normalizeTotalTables,
  parseObjectRecord,
} from "./runtime-core-utils";
import { 
  createLocalId, 
  normalizeLanguageKey, 
  normalizeText, 
  parseEnabledLanguageEntries 
} from "../managerRuntimeShared";
import type { Dish, DishRecord, ExtrasItem, SuggestionRule } from "../types";

// --- TYPES ET CONSTANTES ---

export type DisplaySettings = {
  showCalories: boolean;
  enabledLanguages: string[];
  languageLabels: Record<string, string>;
  heroEnabled: boolean;
  upsellEnabled: boolean;
  consultationMode: boolean;
  searchEnabled: boolean;
  suggestionRules: SuggestionRule[];
  suggestionMessage: string;
  heroBadgeType: "chef" | "daily";
  totalTables: number;
};

const TOKENS = {
  SIDE_IDS: "__SIDE_IDS__:",
  ASK_COOKING: "__ASK_COOKING__:",
  EXTRAS: "__EXTRAS__:",
  EXTRAS_JSON: "__EXTRAS_JSON__:",
  EXTRAS_I18N: "__EXTRAS_I18N__:",
  CATEGORIES: "__CATEGORIES__:",
  SUBCATEGORIES: "__SUBCATEGORIES__:",
  AUTO_PRINT: "__AUTO_PRINT__:",
};

// --- LOGIQUE DE DESCRIPTION & OPTIONS ---

/**
 * Extrait les métadonnées cachées dans la description d'un plat.
 * C'est ici que tes "valises" d'extras et de réglages sont déballées.
 */
export function parseOptionsFromDescription(description?: string | null) {
  const result = {
    baseDescription: "",
    extrasList: [] as ExtrasItem[],
    sideIds: [] as Array<string | number>,
    askCooking: false,
  };
  
  if (!description) return result;

  const lines = description.split("\n");
  const remaining: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    
    if (trimmed.startsWith(TOKENS.SIDE_IDS)) {
      result.sideIds = trimmed.replace(TOKENS.SIDE_IDS, "").split(",").map(v => v.trim()).filter(Boolean);
    } else if (trimmed.startsWith(TOKENS.ASK_COOKING)) {
      const raw = trimmed.replace(TOKENS.ASK_COOKING, "").trim().toLowerCase();
      result.askCooking = raw === "true" || raw === "1";
    } else if (trimmed.startsWith(TOKENS.EXTRAS)) {
      result.extrasList = parseLegacyExtras(trimmed.replace(TOKENS.EXTRAS, "").trim());
    } else if (trimmed.startsWith(TOKENS.EXTRAS_JSON)) {
      result.extrasList = parseJsonExtras(trimmed.replace(TOKENS.EXTRAS_JSON, "").trim());
    } else if (trimmed.startsWith(TOKENS.EXTRAS_I18N)) {
      result.extrasList = parseI18nExtras(trimmed.replace(TOKENS.EXTRAS_I18N, "").trim());
    } else {
      remaining.push(line);
    }
  });

  result.baseDescription = remaining.join("\n").trim();
  return result;
}

// --- HELPERS DE PARSING INTERNES ---

function parseLegacyExtras(raw: string): ExtrasItem[] {
  return raw.split("|").map(s => s.trim()).filter(Boolean).map(entry => {
    const [name, priceRaw] = entry.split("=").map(p => p.trim());
    const price = Number(priceRaw?.replace(",", ".")) || 0;
    return {
      id: createLocalId(),
      name_fr: name || "Supplément",
      name_en: name, name_es: name, name_de: name,
      names_i18n: {},
      price: Number.isFinite(price) ? price : 0,
    };
  });
}

function parseJsonExtras(raw: string): ExtrasItem[] {
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed.map(item => ({
      id: String(item.id || createLocalId()),
      name_fr: String(item.name_fr || item.names_i18n?.fr || "Supplément"),
      name_en: String(item.name_en || item.names_i18n?.en || ""),
      name_es: String(item.name_es || item.names_i18n?.es || ""),
      name_de: String(item.name_de || item.names_i18n?.de || ""),
      names_i18n: item.names_i18n || {},
      price: Number(String(item.price).replace(",", ".")) || 0,
    }));
  } catch { return []; }
}

function parseI18nExtras(raw: string): ExtrasItem[] {
  return raw.split("|").map(s => s.trim()).filter(Boolean).map(entry => {
    const [labels, pricePart] = entry.split("=").map(p => p.trim());
    const [fr, en, es, de] = (labels || "").split("~").map(p => decodeURIComponent(p.trim()));
    return {
      id: createLocalId(),
      name_fr: fr || "Supplément",
      name_en: en || "", name_es: es || "", name_de: de || "",
      names_i18n: { fr, en, es, de },
      price: Number(pricePart?.replace(",", ".")) || 0,
    };
  });
}

// --- EXTRAS ET OPTIONS ---

export function getDishDisplayDescription(dish: Dish): string {
  const candidates = [dish.description_fr, dish.description, dish.description_en].filter(Boolean);
  for (const c of candidates) {
    const { baseDescription } = parseOptionsFromDescription(c);
    if (baseDescription) return baseDescription;
  }
  return "";
}

export function mergeExtrasUnique(primary: ExtrasItem[], secondary: ExtrasItem[]): ExtrasItem[] {
  const seen = new Set(primary.map(e => `${normalizeText(e.name_fr)}__${e.price.toFixed(2)}`));
  const uniqueSecondary = secondary.filter(e => {
    const key = `${normalizeText(e.name_fr)}__${e.price.toFixed(2)}`;
    return seen.has(key) ? false : seen.add(key);
  });
  return [...primary, ...uniqueSecondary];
}

// --- CONFIGURATION RESTAURANT & MARKETING ---

export function parseMarketingOptions(raw: unknown) {
  const source = typeof raw === "string" ? JSON.parse(raw || "{}") : (raw as any || {});
  const m = source.marketing_options || source.marketing || source;

  return {
    heroEnabled: toBoolean(m?.hero_enabled ?? m?.show_featured, true),
    upsellEnabled: toBoolean(m?.upsell_enabled, false),
    consultationMode: toBoolean(m?.consultation_mode, false) || readLocalClientOrderingDisabled(),
    searchEnabled: toBoolean(m?.search_enabled ?? m?.search_bar_enabled, false),
    suggestionRules: (m?.suggestion_rules || []).filter((r: any) => r.from_category_id && r.to_category_id),
    suggestionMessage: String(m?.suggestion_message || "").trim(),
    heroBadgeType: (m?.hero_badge_type === "daily" ? "daily" : "chef") as "chef" | "daily",
  };
}

export function parseDisplaySettingsFromRow(row: Record<string, any>): DisplaySettings {
  const marketing = parseMarketingOptions(row.table_config || row);
  const langs = parseEnabledLanguageEntries(row.enabled_languages);
  
  return {
    showCalories: toBoolean(row.show_calories, true),
    enabledLanguages: langs.codes.length > 0 ? langs.codes : ["fr", "en"],
    languageLabels: langs.labels,
    ...marketing,
    totalTables: normalizeTotalTables(row, DEFAULT_TOTAL_TABLES),
  };
}

// --- GESTION DES FORMULES (SNAPSHOTS) ---

export function resolveBaseDishIdentityFromFormulaConfig(dishRow: any, configRaw: any) {
  const config = readFormulaConfigNode(configRaw);
  const snap = config.base_dish_snapshot;
  if (!snap || Object.keys(snap).length === 0) return dishRow;

  return {
    ...dishRow,
    name_fr: snap.name_fr || snap.name || dishRow.name_fr,
    price: Number.isFinite(snap.price) ? snap.price : dishRow.price,
    calories: snap.kcal ?? snap.calories ?? dishRow.calories,
  };
}

// --- GESTION DES ERREURS SUPABASE ---

export function toLoggableSupabaseError(error: any) {
  return {
    code: error?.code,
    message: error?.message || "Erreur inconnue",
    hint: error?.hint,
    details: error?.details,
  };
}

export function isMissingTableError(error: any): boolean {
  const msg = String(error?.message || "").toLowerCase();
  return error?.code === "42P01" || msg.includes("does not exist") || msg.includes("not found");
}

// --- UTILS DE BASE ---

export function toBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === "boolean") return value;
  const v = String(value).toLowerCase().trim();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return defaultValue;
}

export function readLocalClientOrderingDisabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CLIENT_ORDERING_DISABLED_KEY) === "1";
}

export function readFormulaConfigNode(value: any): Record<string, any> {
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return value && typeof value === "object" ? value : {};
}