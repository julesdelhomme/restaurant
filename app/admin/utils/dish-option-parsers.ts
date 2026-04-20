import type { DishItem, ExtraChoice, ProductOptionChoice } from "../types";
import {
  normalizeLookupText,
  normalizeProductOptionRows,
  parseDescriptionOptions,
  parseJsonObject,
  parsePriceNumber,
  readBooleanFlag,
} from "./page-helpers";

export function parseSideSource(raw: unknown): Array<string | number> {
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => {
        if (typeof entry === "string" || typeof entry === "number") return entry;
        if (!entry || typeof entry !== "object") return null;
        const row = entry as Record<string, unknown>;
        return row.id ?? row.side_id ?? row.value ?? row.name_fr ?? row.name ?? row.label ?? null;
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
}

export function parseDishSideIds(dish: DishItem, getDishOptionsSource: (dish: DishItem) => string): Array<string | number> {
  const fromDescription = parseDescriptionOptions(getDishOptionsSource(dish)).sideIds;
  if (fromDescription.length > 0) return fromDescription;

  const selectedSides = parseSideSource(dish.selected_sides);
  if (selectedSides.length > 0) return selectedSides;
  const sides = parseSideSource(dish.sides);
  if (sides.length > 0) return sides;
  return parseDescriptionOptions(getDishOptionsSource(dish)).sideIds;
}

export function parseFormulaCategoryIds(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((entry) => String(entry || "").trim()).filter(Boolean);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((entry) => String(entry || "").trim()).filter(Boolean);
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
}

export function dishNeedsCooking(
  dish: DishItem,
  getDishOptionsSource: (dish: DishItem) => string,
  getDishName: (dish: DishItem) => string
) {
  const parsed = parseDescriptionOptions(getDishOptionsSource(dish));
  const record = dish as unknown as { ask_cooking?: unknown };
  const normalizedName = normalizeLookupText(getDishName(dish)).replace(/[^a-z0-9]+/g, " ");
  const normalizedDetails = normalizeLookupText(getDishOptionsSource(dish)).replace(/[^a-z0-9]+/g, " ");
  const hasCookingNameOverride = normalizedName.includes("cote de boeuf") || normalizedDetails.includes("cote de boeuf");
  return Boolean(record.ask_cooking || parsed.askCooking || hasCookingNameOverride);
}

export function parseDishProductOptions(dish: DishItem): ProductOptionChoice[] {
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
    if (variantLikeRows.length > 0) return normalizeProductOptionRows(variantLikeRows);
  }
  return [];
}

export function isSideSelectionRequired(dish: DishItem, choices: string[]) {
  if (choices.length === 0) return false;
  const row = dish as unknown as Record<string, unknown>;
  const explicit = row.side_required ?? row.sides_required ?? row.is_side_required ?? row.requires_side ?? row.required_side;
  if (explicit != null) return readBooleanFlag(explicit, false);
  if (row.has_sides != null) return readBooleanFlag(row.has_sides, false);
  const maxOptions = Number(row.max_options ?? 0);
  return Number.isFinite(maxOptions) && maxOptions > 0;
}

export function getSideMaxSelections(dish: DishItem, choices: string[]) {
  if (choices.length === 0) return 0;
  const row = dish as unknown as Record<string, unknown>;
  const raw = Number(row.max_options ?? 1);
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return Math.max(1, Math.min(choices.length, Math.trunc(raw)));
}

export function isProductOptionSelectionRequired(dish: DishItem, options: ProductOptionChoice[]) {
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
}

export function parseDishExtras(
  dish: DishItem,
  getDishOptionsSource: (dish: DishItem) => string,
  parseExtraChoicesFromRows: (rows: Array<Record<string, unknown>>) => ExtraChoice[]
): ExtraChoice[] {
  const fromDescription = parseDescriptionOptions(getDishOptionsSource(dish)).extrasList;
  const fromRelations = Array.isArray((dish as unknown as { dish_options?: unknown }).dish_options)
    ? parseExtraChoicesFromRows((dish as unknown as { dish_options?: Array<Record<string, unknown>> }).dish_options || [])
    : [];

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
          for (const nestedCandidate of [parsedObject.formula_supplements, parsedObject.extras, parsedObject.supplements, parsedObject.options]) {
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
      const nestedCandidates = [rawObject.formula_supplements, rawObject.extras, rawObject.supplements, rawObject.supplement, rawObject.options];
      for (const candidate of nestedCandidates) {
        const nestedArray = normalizeArray(candidate);
        if (nestedArray.length > 0) return nestedArray;
        const nestedObject = normalizeObject(candidate);
        if (nestedObject.length > 0) return nestedObject;
      }
    }

    return [];
  };

  const extraCandidates = [dish.formula_supplements, dish.extras, dish.supplements, dish.supplement, dish.options, dish.selected_options];
  const extrasFromFields: ExtraChoice[] = [];
  for (const candidate of extraCandidates) {
    const parsed = parseExtraSource(candidate);
    if (parsed.length > 0) extrasFromFields.push(...parsed);
  }

  const merged = new Map<string, ExtraChoice>();
  const addExtras = (extras: ExtraChoice[]) => {
    extras.forEach((extra) => {
      const key = `${normalizeLookupText(extra.name)}:${parsePriceNumber(extra.price).toFixed(2)}`;
      if (!merged.has(key)) merged.set(key, extra);
    });
  };
  addExtras(fromRelations);
  addExtras(fromDescription);
  addExtras(extrasFromFields);
  return [...merged.values()];
}

export function parseExtraChoicesFromRowsAdvanced(rows: Array<Record<string, unknown>>) {
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
      const hasOptionFlag = row.is_option != null || row.isOption != null;
      const hasExtraFlag = row.is_extra != null || row.isExtra != null;
      const isOption = hasOptionFlag ? readBooleanFlag(row.is_option ?? row.isOption, false) : false;
      const isExtra = hasExtraFlag ? readBooleanFlag(row.is_extra ?? row.isExtra, false) : false;
      const shouldInclude = !(hasOptionFlag || hasExtraFlag) ? true : isOption || isExtra || price > 0;
      if (!shouldInclude) return null;
      return { name, price };
    })
    .filter(Boolean) as ExtraChoice[];

  const deduped = new Map<string, ExtraChoice>();
  parsed.forEach((extra) => {
    const key = `${normalizeLookupText(extra.name)}:${parsePriceNumber(extra.price).toFixed(2)}`;
    if (!deduped.has(key)) deduped.set(key, extra);
  });
  return [...deduped.values()];
}
