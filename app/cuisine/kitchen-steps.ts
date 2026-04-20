import { normalizeStepValue } from "./item-status";
import { normalizeLookupText } from "./kitchen-text-utils";
import type { Item } from "./types";

export const SERVICE_STEP_SEQUENCE = ["entree", "plat", "dessert"] as const;

export const SERVICE_STEP_LABELS: Record<string, string> = {
  entree: "ÉTAPE 1",
  plat: "ÉTAPE 2",
  dessert: "ÉTAPE 3",
};

export const normalizeServiceStep = (value: unknown) => {
  const normalized = normalizeLookupText(value);
  if (["entree", "starter", "appetizer"].includes(normalized)) return "entree";
  if (["dessert", "sweet"].includes(normalized)) return "dessert";
  if (["plat", "main", "dish", "principal"].includes(normalized)) return "plat";
  return "";
};

export const resolveCourseFromLabel = (value: unknown) => {
  const normalized = normalizeLookupText(value);
  if (/entree|starter|appetizer/.test(normalized)) return "entree";
  if (/dessert|sucre|sweet/.test(normalized)) return "dessert";
  if (/plat|main|dish|principal/.test(normalized)) return "plat";
  return "plat";
};

export const resolveCourseFromSequence = (value: unknown) => {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw <= 0) return "";
  const sequence = Math.max(1, Math.trunc(raw));
  if (sequence === 1) return "entree";
  if (sequence >= 3) return "dessert";
  return "plat";
};

export const parseFormulaEntryList = (value: unknown): Array<Record<string, unknown>> => {
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
    return source
      .map((entry) => (entry && typeof entry === "object" ? (entry as Record<string, unknown>) : null))
      .filter((entry): entry is Record<string, unknown> => Boolean(entry));
  }
  if (source && typeof source === "object") {
    const record = source as Record<string, unknown>;
    if (Array.isArray(record.items)) {
      return record.items
        .map((entry) => (entry && typeof entry === "object" ? (entry as Record<string, unknown>) : null))
        .filter((entry): entry is Record<string, unknown> => Boolean(entry));
    }
  }
  return [];
};

export const isFormulaItem = (item: Item) => {
  const record = item as unknown as Record<string, unknown>;
  const directFlag = record.is_formula ?? record.formula ?? record.isFormula;
  if (typeof directFlag === "boolean") return directFlag;
  if (typeof directFlag === "number") return directFlag === 1;
  if (typeof directFlag === "string") {
    const normalized = normalizeLookupText(directFlag);
    if (["1", "true", "yes", "oui"].includes(normalized)) return true;
    if (["0", "false", "no", "non"].includes(normalized)) return false;
  }
  return Boolean(record.formula_id || record.formulaId || record.formula_dish_id || record.formulaDishId);
};

export const resolveFormulaSequenceForItem = (item: Item) => {
  if (!isFormulaItem(item)) return null;
  const record = item as unknown as Record<string, unknown>;
  const directCandidates: unknown[] = [
    record.formula_current_sequence,
    record.formulaCurrentSequence,
    record.formula_sequence,
    record.formulaSequence,
    record.sequence,
    record.step,
  ];
  for (const candidate of directCandidates) {
    const normalized = normalizeStepValue(candidate);
    if (normalized != null) return normalized;
  }
  const sources: unknown[] = [
    record.selected_options,
    record.selectedOptions,
    record.options,
    record.formula_items,
    record.formulaItems,
    record.formula,
    record.formula_data,
    record.formulaData,
    record.selections,
    record.selection,
    record.formula_selections,
    record.formulaSelections,
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
      const rawSequence = Number(entry.sequence ?? entry.step ?? entry.service_step_sequence);
      if (!Number.isFinite(rawSequence) || rawSequence <= 0) continue;
      return Math.max(1, Math.trunc(rawSequence));
    }
  }
  return null;
};

export const resolveFormulaEntryForCurrentSequence = (item: Item) => {
  if (!isFormulaItem(item)) return null;
  const currentSequence = resolveFormulaSequenceForItem(item);
  const normalizedCurrent = Number.isFinite(currentSequence) && Number(currentSequence) > 0
    ? Math.max(1, Math.trunc(Number(currentSequence)))
    : null;
  if (!normalizedCurrent) return null;
  const record = item as unknown as Record<string, unknown>;
  const sources: unknown[] = [
    record.selected_options,
    record.selectedOptions,
    record.options,
    record.formula_items,
    record.formulaItems,
    record.formula,
    record.formula_data,
    record.formulaData,
    record.selections,
    record.selection,
    record.formula_selections,
    record.formulaSelections,
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
      if (Number.isFinite(rawSequence) && rawSequence > 0) {
        const entrySequence = Math.max(1, Math.trunc(rawSequence));
        if (entrySequence === normalizedCurrent) return entry;
        continue;
      }
      // Some legacy formula snapshots don't carry sequence per nested item.
      // If the current item is already the active step row, accept the first valid dish-like entry.
      if (
        entry.dish_id != null ||
        entry.dish_name != null ||
        entry.dish_name_fr != null ||
        entry.name != null ||
        entry.name_fr != null
      ) {
        return entry;
      }
    }
  }
  return null;
};
