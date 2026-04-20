import {
  parseAddonPrice,
  PRICE_FORMATTER_EUR,
  formatPriceTwoDecimals,
  parsePriceNumber,
  parseVariantPrice,
} from "./config";
import {
  translateAllergenFallback,
  translateHungerLevelFallback,
  translateSpicyLevelFallback,
} from "../ui-translations";
import {
  UI_TEXT_CLEAN,
  UI_TRANSLATIONS,
  buildStableExtraId,
  getNameTranslation,
  normalizeLanguageKey,
  normalizeLookupText,
  parseI18nToken,
  parseJsonObject,
  toSafeString,
  toUiLang,
  type Dish,
  type ExtrasItem,
  type ParsedOptions,
  type ProductOptionItem,
} from "./runtime-core";
export function parseOptionsFromDescription(description?: string | null): ParsedOptions {
  const result: ParsedOptions = {
    baseDescription: "",
    extrasList: [],
    sideIds: [],
    askCooking: false,
  };
  if (!description) return result;

  const lines = description.split("\n");
  const remaining: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("__SIDE_IDS__:")) {
      const raw = trimmed.replace("__SIDE_IDS__:", "").trim();
      result.sideIds = raw
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isFinite(v));
      return;
    }
    if (trimmed.startsWith("__ASK_COOKING__:")) {
      const raw = trimmed.replace("__ASK_COOKING__:", "").trim().toLowerCase();
      result.askCooking = raw === "true" || raw === "1";
      return;
    }
    if (trimmed.startsWith("__EXTRAS__:")) {
      const raw = trimmed.replace("__EXTRAS__:", "").trim();
      const list = raw
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((entry, index) => {
          const [namePart, pricePart] = entry.split("=").map((p) => p.trim());
          const price = pricePart ? Number(pricePart.replace(",", ".")) : 0;
          return {
            id: buildStableExtraId("legacy", { name_fr: namePart || "Supplément", price: Number.isFinite(price) ? price : 0 }, index),
            name_fr: namePart || "Supplément",
            name_en: namePart || "Supplement",
            name_es: namePart || "Suplemento",
            name_de: namePart || "Zusatz",
            names_i18n: {},
            price: Number.isFinite(price) ? price : 0,
          };
        });
      result.extrasList = list;
      return;
    }
    if (trimmed.startsWith("__EXTRAS_JSON__:")) {
      const raw = trimmed.replace("__EXTRAS_JSON__:", "").trim();
      try {
        const parsed = JSON.parse(decodeURIComponent(raw));
        if (Array.isArray(parsed)) {
          result.extrasList = parsed
            .map((row) => {
              if (!row || typeof row !== "object") return null;
              const item = row as unknown as any;
              const namesObj = (item.names_i18n && typeof item.names_i18n === "object"
                ? (item.names_i18n as unknown as any)
                : {}) as unknown as any;
              const names: Record<string, string> = {};
              Object.entries(namesObj).forEach(([k, v]) => {
                const key = String(k || "").trim().toLowerCase();
                if (!key) return;
                names[key] = String(v || "").trim();
              });
              const fr = String(item.name_fr || names.fr || "").trim() || "Supplément";
              const priceRaw = item.price || 0;
              const price =
                typeof priceRaw === "number" ? priceRaw : Number(String(priceRaw).replace(",", "."));
              return {
                id: String(item.id || ""),
                name_fr: fr,
                name_en: String(item.name_en || names.en || "").trim(),
                name_es: String(item.name_es || names.es || "").trim(),
                name_de: String(item.name_de || names.de || "").trim(),
                names_i18n: names,
                price: Number.isFinite(price) ? Number(price) : 0,
              } as ExtrasItem;
            })
            .filter(Boolean) as ExtrasItem[];
          return;
        }
      } catch {
        // ignore malformed payload
      }
    }
    if (trimmed.startsWith("__EXTRAS_I18N__:")) {
      const raw = trimmed.replace("__EXTRAS_I18N__:", "").trim();
      const list = raw
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((entry, index) => {
          const [labels, pricePart] = entry.split("=").map((p) => p.trim());
          const [fr, en, es, de] = (labels || "").split("~").map((p) => decodeURIComponent((p || "").trim()));
          const price = pricePart ? Number(pricePart.replace(",", ".")) : 0;
          return {
            id: buildStableExtraId("legacy-extra", { name_fr: fr || "Supplément", price: Number.isFinite(price) ? price : 0 }, index),
            name_fr: fr || "Supplément",
            name_en: en || fr || "Supplement",
            name_es: es || fr || "Suplemento",
            name_de: de || fr || "Zusatz",
            names_i18n: {
              fr: fr || "",
              en: en || "",
              es: es || "",
              de: de || "",
            },
            price: Number.isFinite(price) ? price : 0,
          };
        });
      result.extrasList = list;
      return;
    }
    remaining.push(line);
  });

  result.baseDescription = remaining.join("\n").trim();
  return result;
}

export function parseExtrasFromUnknown(raw: unknown, dishId: unknown): ExtrasItem[] {
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

  const candidate =
    Array.isArray(source)
      ? source
      : typeof source === "object" && source !== null
        ? ((source as any).extras ??
          (source as any).items ??
          (source as any).list)
        : [];

  if (!Array.isArray(candidate)) return [];

  return candidate
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as any;
      const parsedNamesI18n = Object.fromEntries(
        Object.entries(parseJsonObject(row.names_i18n)).map(([k, v]) => [
          normalizeLanguageKey(k),
          String(v || "").trim(),
        ])
      ) as Record<string, string>;
      const nameFr = String(row.name_fr ?? parsedNamesI18n.fr ?? row.name ?? row.label_fr ?? row.label ?? "").trim();
      if (!nameFr) return null;
      const priceRaw = row.price ?? row.amount ?? row.value ?? 0;
      const price =
        typeof priceRaw === "number" ? priceRaw : Number(String(priceRaw).replace(",", "."));
      return {
        id: buildStableExtraId(
          dishId,
          { id: String(row.id ?? row.extra_id ?? ""), name_fr: nameFr, price: Number.isFinite(price) ? price : 0 },
          index
        ),
        name_fr: nameFr,
        name_en: String(row.name_en ?? parsedNamesI18n.en ?? "").trim(),
        name_es: String(row.name_es ?? parsedNamesI18n.es ?? "").trim(),
        name_de: String(row.name_de ?? parsedNamesI18n.de ?? "").trim(),
        names_i18n: {
          ...parsedNamesI18n,
          fr: parsedNamesI18n.fr || nameFr,
        },
        price: Number.isFinite(price) ? Number(price) : 0,
      } as ExtrasItem;
    })
    .filter(Boolean) as ExtrasItem[];
}

export function parseDishOptionsRowsToExtras(rows: Array<Record<string, unknown>>, dishId: unknown): ExtrasItem[] {
  return rows
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
      const priceRaw = row.price ?? row.option_price ?? 0;
      const price =
        typeof priceRaw === "number" ? priceRaw : Number(String(priceRaw || "0").replace(",", "."));
      return {
        id: buildStableExtraId(
          dishId,
          { id: String(row.id || ""), name_fr: nameFr, price: Number.isFinite(price) ? price : 0 },
          index
        ),
        name_fr: nameFr,
        name_en: String(row.name_en ?? parsedNamesI18n.en ?? dynamicNameColumns.en ?? "").trim(),
        name_es: String(row.name_es ?? parsedNamesI18n.es ?? dynamicNameColumns.es ?? "").trim(),
        name_de: String(row.name_de ?? parsedNamesI18n.de ?? dynamicNameColumns.de ?? "").trim(),
        names_i18n: {
          ...parsedNamesI18n,
          ...dynamicNameColumns,
          fr: parsedNamesI18n.fr || dynamicNameColumns.fr || nameFr,
        },
        price: Number.isFinite(price) ? price : 0,
      } as ExtrasItem;
    })
    .filter(Boolean) as ExtrasItem[];
}

export function mergeExtrasUnique(primary: ExtrasItem[], secondary: ExtrasItem[]) {
  const out = [...primary];
  const seen = new Set(
    primary.map((extra) => `${normalizeLookupText(extra.name_fr || "")}__${parsePriceNumber(extra.price).toFixed(2)}`)
  );
  secondary.forEach((extra) => {
    const key = `${normalizeLookupText(extra.name_fr || "")}__${parsePriceNumber(extra.price).toFixed(2)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(extra);
  });
  return out;
}

export function getDishExtras(dish: Dish) {
  const dishRecord = dish as unknown as any;
  const fromRelation = Array.isArray(dishRecord.dish_options)
    ? parseDishOptionsRowsToExtras(dishRecord.dish_options as Array<Record<string, unknown>>, dish.id)
    : [];
  const fromColumns = mergeExtrasUnique(
    parseExtrasFromUnknown(dishRecord.extras, dish.id),
    parseExtrasFromUnknown(dishRecord.extras_list, dish.id)
  );
  const fromDescription = parseOptionsFromDescription(String(dish.description || "")).extrasList || [];
  return mergeExtrasUnique(fromRelation, mergeExtrasUnique(fromColumns, fromDescription));
}

export function getDishName(dish: Dish, lang: string) {
  const uiLang = toUiLang(lang);
  const dishRecord = dish as unknown as any;
  const normalizedLang = normalizeLanguageKey(lang);
  const fallbackNameFr =
    toSafeString(dish.name_fr) ||
    toSafeString(dish.name) ||
    toSafeString(dish.nom);
  // Prioritize JSONB translations
  const fromTranslations = getNameTranslation(
    {
      ...dishRecord,
      name_fr: fallbackNameFr,
    },
    lang
  );
  if (fromTranslations) return fromTranslations;
  // Fallback to individual columns
  const langColumnCandidates = [
    `name_${normalizedLang}`,
    `name_${uiLang}`,
    normalizedLang === "ja" ? "name_ja" : "",
    normalizedLang === "ja" ? "name_jp" : "",
    normalizedLang === "zh" ? "name_zh" : "",
    normalizedLang === "zh" ? "name_cn" : "",
    normalizedLang === "ko" ? "name_ko" : "",
    normalizedLang === "ko" ? "name_kr" : "",
    normalizedLang === "el" ? "name_el" : "",
    normalizedLang === "el" ? "name_gr" : "",
    normalizedLang === "ro" ? "name_ro" : "",
    normalizedLang === "pl" ? "name_pl" : "",
    normalizedLang === "it" ? "name_it" : "",
    normalizedLang === "nl" ? "name_nl" : "",
    normalizedLang === "ar" ? "name_ar" : "",
    normalizedLang === "ru" ? "name_ru" : "",
  ].filter(Boolean);
  for (const key of langColumnCandidates) {
    const directColumnValue = toSafeString(dishRecord[key]);
    if (directColumnValue) return directColumnValue;
  }

  const meta = (dish as unknown as any).dietary_tag;
  const parsedMeta =
    typeof meta === "string"
      ? (() => {
          try {
            return JSON.parse(meta) as unknown as any;
          } catch {
            return {};
          }
        })()
      : (meta as unknown as any | null) || {};
  const i18nName =
    parsedMeta.i18n && typeof parsedMeta.i18n === "object"
      ? ((parsedMeta.i18n as unknown as any).name as unknown as any | undefined)
      : undefined;
  if (i18nName && typeof i18nName === "object") {
    const normalizedDynamicValue = i18nName[normalizedLang as keyof typeof i18nName];
    if (typeof normalizedDynamicValue === "string" && normalizedDynamicValue.trim()) return normalizedDynamicValue.trim();
    const uiDynamicValue = i18nName[uiLang as keyof typeof i18nName];
    if (typeof uiDynamicValue === "string" && uiDynamicValue.trim()) return uiDynamicValue.trim();
    const rawDynamicValue = i18nName[lang as keyof typeof i18nName];
    if (typeof rawDynamicValue === "string" && rawDynamicValue.trim()) return rawDynamicValue.trim();
  }
  const nameEn = toSafeString(dish.name_en);
  if (lang === "en" && nameEn) return nameEn;
  const nameEs = toSafeString(dish.name_es);
  if (lang === "es" && nameEs) return nameEs;
  const nameDe = toSafeString(dish.name_de);
  if (lang === "de" && nameDe) return nameDe;
  const fallbackName = fallbackNameFr || "Plat";
  const normalizedFallbackName = normalizeLookupText(fallbackName);
  if (normalizedFallbackName === "plat du jour" || normalizedFallbackName === "platdujour") {
    return String(
      UI_TRANSLATIONS[normalizedLang]?.platDuJour ||
        UI_TRANSLATIONS[normalizedLang]?.featured_daily ||
        UI_TRANSLATIONS[uiLang]?.platDuJour ||
        UI_TRANSLATIONS[uiLang]?.featured_daily ||
        fallbackName
    );
  }
  return fallbackName;
}

export function getDescription(dish: Dish, lang: string) {
  const langCode = normalizeLanguageKey(lang);
  const uiLang = toUiLang(lang);
  const dishRecord = dish as unknown as any;
  // Prioritize JSONB translations
  const translations = parseJsonObject((dish as unknown as any).translations);
  const directTranslation = translations[langCode] ?? translations[lang] ?? translations[uiLang];
  if (typeof directTranslation === "string" && directTranslation.trim()) {
    return parseOptionsFromDescription(directTranslation.trim()).baseDescription;
  }
  if (directTranslation && typeof directTranslation === "object") {
    const directDesc = (directTranslation as Record<string, unknown>).description;
    if (typeof directDesc === "string" && directDesc.trim()) {
      return parseOptionsFromDescription(directDesc.trim()).baseDescription;
    }
  }
  const descriptionNode =
    translations.description && typeof translations.description === "object"
      ? (translations.description as unknown as any)
      : {};
  const descValue = descriptionNode[langCode];
  const translatedDescription = typeof descValue === 'string' ? descValue.trim() : "";
  if (translatedDescription) {
    return parseOptionsFromDescription(translatedDescription).baseDescription;
  }
  // Fallback to individual columns
  const directDescriptionColumnCandidates = [
    `description_${langCode}`,
    `description_${uiLang}`,
    langCode === "ja" ? "description_ja" : "",
    langCode === "ja" ? "description_jp" : "",
    langCode === "zh" ? "description_zh" : "",
    langCode === "zh" ? "description_cn" : "",
    langCode === "ko" ? "description_ko" : "",
    langCode === "ko" ? "description_kr" : "",
    langCode === "el" ? "description_el" : "",
    langCode === "el" ? "description_gr" : "",
  ].filter(Boolean);
  for (const key of directDescriptionColumnCandidates) {
    const directValue = dishRecord[key];
    const direct = typeof directValue === 'string' ? directValue.trim() : "";
    if (direct) return parseOptionsFromDescription(direct).baseDescription;
  }

  const meta = (dish as unknown as any).dietary_tag;
  const parsedMeta =
    typeof meta === "string"
      ? (() => {
          try {
            return JSON.parse(meta) as unknown as any;
          } catch {
            return {};
          }
        })()
      : (meta as unknown as any | null) || {};
  const i18nDescription =
    parsedMeta.i18n && typeof parsedMeta.i18n === "object"
      ? ((parsedMeta.i18n as unknown as any).description as unknown as any | undefined)
      : undefined;
  if (i18nDescription && typeof i18nDescription === "object") {
    const normalizedDynamicValue = i18nDescription[langCode as keyof typeof i18nDescription];
    if (typeof normalizedDynamicValue === "string" && normalizedDynamicValue.trim()) return normalizedDynamicValue.trim();
    const uiDynamicValue = i18nDescription[toUiLang(lang) as keyof typeof i18nDescription];
    if (typeof uiDynamicValue === "string" && uiDynamicValue.trim()) return uiDynamicValue.trim();
    const rawDynamicValue = i18nDescription[lang as keyof typeof i18nDescription];
    if (typeof rawDynamicValue === "string" && rawDynamicValue.trim()) return rawDynamicValue.trim();
  }
  const key = `description_${toUiLang(lang)}` as const;
  const rawValue = (dish as Record<string, any>)[key] || dish.description_fr || dish.description || "";
  const raw = typeof rawValue === 'string' ? rawValue : "";
  return parseOptionsFromDescription(raw).baseDescription;
}

export function getExtraLabel(extra: ExtrasItem, lang: string) {
  const names = (extra as unknown as any).names_i18n;
  const normalizedLang = normalizeLanguageKey(lang);
  const uiLang = toUiLang(lang);
  if (names && typeof names === "object") {
    const namesRecord = names as unknown as any;
    const dynamicValue = namesRecord[normalizedLang] ?? namesRecord[uiLang] ?? namesRecord[lang];
    if (typeof dynamicValue === "string" && dynamicValue.trim()) return dynamicValue.trim();
  }
  if (normalizedLang === "en" && extra.name_en) return extra.name_en;
  if (normalizedLang === "es" && extra.name_es) return extra.name_es;
  if (normalizedLang === "de" && extra.name_de) return extra.name_de;
  return extra.name_fr || "Supplément";
}
export function getAllergens(dish: Dish) {
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

  const dietaryMeta = parseJsonObject((dish as unknown as any).dietary_tag);
  const dietaryI18n = parseJsonObject(dietaryMeta.i18n);
  const topLevelDietaryList = parseList(
    dietaryMeta.allergens_selected ?? dietaryMeta.allergens_fr ?? dietaryMeta.allergens
  );
  const manualAllergensByName = parseJsonObject(dietaryI18n.allergens_manual);
  const manualKeys = Object.keys(manualAllergensByName).map((value) => String(value || "").trim()).filter(Boolean);
  const i18nAllergensByLang = parseJsonObject(dietaryI18n.allergens);
  const i18nFrList = parseList(i18nAllergensByLang.fr ?? i18nAllergensByLang.default);

  const parts = (topLevelDietaryList.length > 0 ? topLevelDietaryList : manualKeys.length > 0 ? manualKeys : i18nFrList)
    .map((a) => a.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const unique: string[] = [];
  parts.forEach((item) => {
    const key = item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(item);
  });
  return unique;
}

export function getLocalizedAllergens(dish: Dish, lang: string) {
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

  const fromField = getAllergens(dish);
  const dietaryMeta = parseJsonObject((dish as unknown as any).dietary_tag);
  const dietaryI18n = parseJsonObject(dietaryMeta.i18n);
  const translations = parseJsonObject((dish as unknown as any).translations);
  const requestedLang = normalizeLanguageKey(lang);
  const uiLang = toUiLang(lang);

  const manualAllergensByName = parseJsonObject(dietaryI18n.allergens_manual);
  const manualKeys = Object.keys(manualAllergensByName);
  if (manualKeys.length > 0) {
    const baseList = fromField.length > 0 ? fromField : manualKeys;
    const localizedFromManual = baseList
      .map((allergenFr) => {
        const manualNode = parseJsonObject(
          manualAllergensByName[allergenFr] ?? manualAllergensByName[String(allergenFr || "").trim()]
        );
        return String(manualNode[requestedLang] ?? manualNode[uiLang] ?? manualNode.fr ?? allergenFr).trim();
      })
      .filter(Boolean);
    if (localizedFromManual.length > 0) return localizedFromManual;
  }

  const dietaryAllergensNode = dietaryI18n.allergens;
  if (dietaryAllergensNode) {
    if (Array.isArray(dietaryAllergensNode) || typeof dietaryAllergensNode === "string") {
      const local = parseList(dietaryAllergensNode);
      if (local.length > 0) return local;
    } else if (typeof dietaryAllergensNode === "object") {
      const source = dietaryAllergensNode as any;
      const localizedRaw = source[requestedLang] ?? source[uiLang] ?? source.fr ?? source.default;
      const localized = parseList(localizedRaw);
      if (localized.length > 0) return localized;
    }
  }

  const langNode = parseJsonObject(translations[requestedLang] ?? translations[uiLang]);
  const allergensNode = langNode.allergens ?? translations.allergens;
  if (!allergensNode) return fromField;

  if (Array.isArray(allergensNode) || typeof allergensNode === "string") {
    const local = parseList(allergensNode);
    return local.length > 0 ? local : fromField;
  }
  if (typeof allergensNode !== "object") return fromField;

  const source = allergensNode as any;
  const localizedRaw = source[requestedLang] ?? source[uiLang] ?? source.fr ?? source.default;
  const localized = parseList(localizedRaw);
  return localized.length > 0 ? localized : fromField;
}

export function translateAllergen(allergen: string, lang: string) {
  return translateAllergenFallback(allergen, lang);
}

export function normalizeAllergenKey(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function buildAllergenLibraryLookup(raw: unknown) {
  const rows = Array.isArray(raw) ? raw : [];
  const lookup: Record<string, Record<string, string>> = {};
  rows.forEach((entry) => {
    const row = parseJsonObject(entry);
    const rowId = String(row.id || "").trim();
    const nameFr = String(row.name_fr || row.name || "").trim();
    if (!nameFr) return;
    const names = parseJsonObject(row.names_i18n);
    const record: Record<string, string> = {};
    Object.entries(names).forEach(([lang, label]) => {
      const code = normalizeLanguageKey(lang);
      const value = String(label || "").trim();
      if (!code || !value) return;
      record[code] = value;
    });
    record.fr = record.fr || nameFr;
    const canonical = normalizeAllergenKey(nameFr);
    if (canonical) lookup[canonical] = record;
    if (rowId) lookup[normalizeAllergenKey(rowId)] = record;
    const aliases = [row.name, row.name_en, row.name_es, row.name_de]
      .map((value) => normalizeAllergenKey(value))
      .filter(Boolean);
    aliases.forEach((alias) => {
      lookup[alias] = record;
    });
  });
  return lookup;
}

export function getSpicyBadgeLabel(dish: Dish, lang: string) {
  const uiLang = toUiLang(lang);
  const requestedLang = normalizeLanguageKey(lang);
  const translations = parseJsonObject((dish as unknown as any).translations);
  const langNode = parseJsonObject(translations[requestedLang] ?? translations[uiLang]);
  const spicyNode = langNode.spicy_level ?? translations.spicy_level;
  let localized = "";

  if (typeof spicyNode === "string") {
    localized = spicyNode.trim();
  } else if (spicyNode && typeof spicyNode === "object") {
    const source = spicyNode as any;
    localized = String(source[requestedLang] ?? source[uiLang] ?? source.fr ?? "").trim();
  }

  const fallback = String(localized || dish.spicy_level || "").trim();
  if (!fallback) return dish.is_spicy ? UI_TEXT_CLEAN[uiLang].labels.spicy : "";

  return translateSpicyLevelFallback(fallback, lang) || fallback;
}

export function getDishStyleBadgeFlags(dish: Dish) {
  const dietaryMeta = parseJsonObject((dish as unknown as any).dietary_tag);
  const badges = parseJsonObject(dietaryMeta.badges);
  const spicyFallback = Boolean(String((dish as unknown as any).spicy_level || "").trim());
  return {
    vegetarian: Boolean(dish.is_vegetarian ?? dietaryMeta.is_vegetarian ?? badges.vegetarian),
    spicy: Boolean(dish.is_spicy ?? dietaryMeta.is_spicy ?? badges.spicy ?? spicyFallback),
    isNew: Boolean(dietaryMeta.is_new ?? dietaryMeta.new_badge ?? badges.new),
    glutenFree: Boolean(dietaryMeta.is_gluten_free ?? dietaryMeta.gluten_free ?? badges.gluten_free),
  };
}
export function getHungerLevel(dish: Dish, lang: string) {
  const uiLang = toUiLang(lang);
  const normalizedLang = normalizeLanguageKey(lang);
  const translatedHungerLabel = (size: "small" | "medium" | "big", fallback: string) =>
    String(
      (size === "small"
        ? UI_TRANSLATIONS[normalizedLang]?.smallHunger
        : size === "medium"
          ? UI_TRANSLATIONS[normalizedLang]?.mediumHunger
          : UI_TRANSLATIONS[normalizedLang]?.bigHunger) ||
        (size === "small"
          ? UI_TRANSLATIONS[uiLang]?.smallHunger
          : size === "medium"
            ? UI_TRANSLATIONS[uiLang]?.mediumHunger
            : UI_TRANSLATIONS[uiLang]?.bigHunger) ||
        fallback
    );
  const directHungerRaw = String((dish as unknown as any).hunger_level || "").trim();
  if (directHungerRaw) {
    const normalizedHungerRaw = normalizeLookupText(directHungerRaw);
    if (normalizedHungerRaw === "petite faim") return translatedHungerLabel("small", directHungerRaw);
    if (normalizedHungerRaw === "moyenne faim") return translatedHungerLabel("medium", directHungerRaw);
    if (normalizedHungerRaw === "grosse faim") return translatedHungerLabel("big", directHungerRaw);
    if (normalizedHungerRaw === "small hunger") return translatedHungerLabel("small", directHungerRaw);
    if (normalizedHungerRaw === "medium hunger") return translatedHungerLabel("medium", directHungerRaw);
    if (normalizedHungerRaw === "big hunger") return translatedHungerLabel("big", directHungerRaw);
  }
  const translateFrenchHungerFallback = (value: string) => {
    const normalized = normalizeLookupText(value);
    if (normalized === "petite faim") return translatedHungerLabel("small", value);
    if (normalized === "moyenne faim") return translatedHungerLabel("medium", value);
    if (normalized === "grosse faim") return translatedHungerLabel("big", value);
    return value;
  };
  const translations = parseJsonObject((dish as unknown as any).translations);
  const langNode = parseJsonObject(translations[normalizedLang] ?? translations[uiLang]);
  const cal = Number((dish.calories ?? dish.calories_min) || 0);
  if (!cal || Number.isNaN(cal)) return "";
  const levelKey = cal >= 800 ? "large" : cal >= 500 ? "medium" : "small";
  const hungerNodeRaw = langNode.hunger_level ?? langNode.hunger ?? translations.hunger_level ?? translations.hunger;
  const hungerNode = parseJsonObject(hungerNodeRaw);
  if (hungerNode && Object.keys(hungerNode).length > 0) {
    const directValue = String(hungerNode[levelKey] || "").trim();
    if (directValue) return translateFrenchHungerFallback(directValue);
    const nestedLang = parseJsonObject(hungerNode[normalizedLang] ?? hungerNode[uiLang]);
    const nestedValue = String(nestedLang[levelKey] || "").trim();
    if (nestedValue) return translateFrenchHungerFallback(nestedValue);
  }
  if (cal >= 800) {
    return normalizedLang === "fr" || normalizedLang === "en" || normalizedLang === "es" || normalizedLang === "de"
      ? UI_TEXT_CLEAN[uiLang].hunger.large
      : translatedHungerLabel("big", translateHungerLevelFallback("large", lang));
  }
  if (cal >= 500) {
    return normalizedLang === "fr" || normalizedLang === "en" || normalizedLang === "es" || normalizedLang === "de"
      ? UI_TEXT_CLEAN[uiLang].hunger.medium
      : translatedHungerLabel("medium", translateHungerLevelFallback("medium", lang));
  }
  return normalizedLang === "fr" || normalizedLang === "en" || normalizedLang === "es" || normalizedLang === "de"
    ? UI_TEXT_CLEAN[uiLang].hunger.small
    : translatedHungerLabel("small", translateHungerLevelFallback("small", lang));
}

export function getCaloriesLabel(dish: Dish, kcalLabel = "kcal") {
  const unit = String(kcalLabel || "kcal").trim() || "kcal";
  const formatValue = (value: unknown) => {
    const cleaned = String(value ?? "")
      .replace(/\b(kcal|千卡|ккал)\b/gi, "")
      .replace(/سعرة(?:\s+حرارية)?/gi, "")
      .trim();
    return cleaned;
  };

  const min = dish.calories_min;
  if (min) return `${min} ${unit}`;

  const singleCalories = formatValue(dish.calories);
  if (singleCalories) return `${singleCalories} ${unit}`;
  return "";
}

export function collapseDuplicateWords(value: string) {
  const parts = String(value || "")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const unique: string[] = [];
  let previousKey = "";
  parts.forEach((part) => {
    const key = part
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!key || key === previousKey) return;
    unique.push(part);
    previousKey = key;
  });
  return unique.join(" ").trim();
}

export function dedupeDisplayValues(values: unknown[]) {
  const seen = new Set<string>();
  const output: string[] = [];
  values.forEach((value) => {
    const collapsed = collapseDuplicateWords(String(value || "").trim());
    if (!collapsed) return;
    const key = collapsed
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (seen.has(key)) return;
    seen.add(key);
    output.push(collapsed);
  });
  return output;
}

export function getProductOptionLabel(option: ProductOptionItem | null | undefined, lang: string) {
  if (!option) return "";
  const normalizedLang = normalizeLanguageKey(lang);
  const optionNames = {
    ...parseJsonObject(option.names_i18n),
    ...parseI18nToken(String(option.name_en || "")),
  };
  const fallbackFr = String(option.name_fr || option.name || "").trim();
  if (!normalizedLang || normalizedLang === "fr") return fallbackFr;
  const translated =
    String(optionNames[normalizedLang] || "").trim() ||
    String(
      normalizedLang === "en"
        ? option.name_en
        : normalizedLang === "es"
          ? option.name_es
          : normalizedLang === "de"
            ? option.name_de
            : ""
    ).trim();
  return translated || fallbackFr;
}

export function getSelectedProductOptionsList(
  selectedProductOptions?: ProductOptionItem[] | null,
  selectedProductOption?: ProductOptionItem | null
) {
  if (Array.isArray(selectedProductOptions) && selectedProductOptions.length > 0) {
    return selectedProductOptions.filter(Boolean);
  }
  return selectedProductOption ? [selectedProductOption] : [];
}

export function buildInstructionText(
  lang: string,
  selectedSides?: string[],
  selectedExtras?: ExtrasItem[],
  selectedProductOptions?: ProductOptionItem[] | null,
  selectedProductOption?: ProductOptionItem | null,
  selectedCooking?: string,
  specialRequest?: string,
  uiCopy?: (typeof UI_TEXT_CLEAN)["fr"]
) {
  const uiLang = toUiLang(lang);
  const labels = uiCopy || UI_TEXT_CLEAN[uiLang];
  const parts: string[] = [];
  const uniqueSides = dedupeDisplayValues((selectedSides || []) as unknown[]);
  if (uniqueSides.length > 0) {
    parts.push(`${labels.sidesLabel}: ${uniqueSides.join(", ")}`);
  }
  const optionLabels = dedupeDisplayValues(
    getSelectedProductOptionsList(selectedProductOptions, selectedProductOption).map((option) => {
      const optionLabel = getProductOptionLabel(option, lang);
      const optionPrice = parseAddonPrice(option.price_override);
      return optionPrice > 0 ? `${optionLabel} (+${formatPriceTwoDecimals(optionPrice)})` : optionLabel;
    })
  );
  if (optionLabels.length > 0) {
    parts.push(`Option: ${optionLabels.join(", ")}`);
  }
  if (selectedCooking) parts.push(`${labels.cookingLabel}: ${selectedCooking}`);
  if (selectedExtras && selectedExtras.length > 0) {
    const extrasText = dedupeDisplayValues(
      selectedExtras.map((e) => {
        const extraName = String(e.name_fr || "Suppl\u00e9ment").trim() || "Suppl\u00e9ment";
        const extraPrice = parsePriceNumber(e.price);
        return extraPrice > 0 ? `${extraName} (+${PRICE_FORMATTER_EUR.format(extraPrice)})` : extraName;
      })
    )
      .join(", ");
    if (extrasText) parts.push(`${labels.extrasLabel}: ${extrasText}`);
  }
  if (specialRequest && specialRequest.trim()) {
    parts.push(`${labels.specialRequestLabel}: ${specialRequest.trim()}`);
  }
  return parts.join(" | ");
}
