export type GenericOrderItem = Record<string, unknown>;

const normalizeText = (value: unknown) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const isUuidLike = (value: unknown) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());

const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  const raw = value.trim();
  if (!raw) return value;
  try {
    return JSON.parse(raw);
  } catch {
    return value;
  }
};

const parseFormulaEntryList = (value: unknown): Array<Record<string, unknown>> => {
  const parsed = parseMaybeJson(value);
  if (Array.isArray(parsed)) {
    return parsed
      .map((entry) => (entry && typeof entry === "object" ? (entry as Record<string, unknown>) : null))
      .filter((entry): entry is Record<string, unknown> => Boolean(entry));
  }
  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    if (Array.isArray(record.items)) {
      return record.items
        .map((entry) => (entry && typeof entry === "object" ? (entry as Record<string, unknown>) : null))
        .filter((entry): entry is Record<string, unknown> => Boolean(entry));
    }
    const objectValues = Object.values(record).filter(
      (entry) => entry && typeof entry === "object"
    ) as Array<Record<string, unknown>>;
    if (objectValues.length > 0) {
      return objectValues;
    }
    return [record];
  }
  return [];
};

const toDishLabel = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const nestedCandidates: unknown[] = [
      record.fr,
      record["fr-FR"],
      record.name_fr,
      record.name,
      record.label_fr,
      record.label,
      record.title,
      record.value,
    ];
    for (const candidate of nestedCandidates) {
      const normalized = toDishLabel(candidate);
      if (normalized) return normalized;
    }
    return "";
  }
  const raw = String(value || "").trim();
  if (!raw || raw === "[object Object]") return "";
  return raw.split(/\s\/\s/).map((part) => part.trim()).filter(Boolean)[0] || raw;
};

const isFormulaItem = (item: GenericOrderItem) => {
  const directFlag = item.is_formula ?? item.formula ?? item.isFormula;
  if (typeof directFlag === "boolean") return directFlag;
  if (typeof directFlag === "number") return directFlag === 1;
  if (typeof directFlag === "string") {
    const normalized = normalizeText(directFlag);
    if (["1", "true", "yes", "oui"].includes(normalized)) return true;
    if (["0", "false", "no", "non"].includes(normalized)) return false;
  }
  return Boolean(item.formula_id || item.formulaId || item.formula_dish_id || item.formulaDishId);
};

const normalizeStep = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.max(1, Math.trunc(parsed));
};

const resolveFormulaSequenceForItem = (item: GenericOrderItem) => {
  const directCandidates: unknown[] = [
    item.formula_current_sequence,
    item.formulaCurrentSequence,
    item.formula_sequence,
    item.formulaSequence,
    item.sequence,
    item.step,
  ];
  for (const candidate of directCandidates) {
    const step = normalizeStep(candidate);
    if (step != null) return step;
  }
  const sources = [
    item.selected_options,
    item.selectedOptions,
    item.options,
    item.formula_items,
    item.formulaItems,
    item.formula,
    item.formula_data,
    item.formulaData,
    item.selections,
    item.selection,
    item.formula_selections,
    item.formulaSelections,
  ];
  for (const source of sources) {
    const entries = parseFormulaEntryList(source);
    for (const entry of entries) {
      const isFormulaEntry =
        normalizeText(entry.kind ?? entry.type ?? entry.group ?? "").includes("formula") ||
        entry.formula_dish_id != null ||
        entry.sequence != null;
      if (!isFormulaEntry) continue;
      const step = normalizeStep(entry.sequence ?? entry.step ?? entry.service_step_sequence);
      if (step != null) return step;
    }
  }
  return null;
};

const resolveFormulaEntryForCurrentSequence = (item: GenericOrderItem) => {
  const currentSequence = resolveFormulaSequenceForItem(item);
  if (!currentSequence) return null;
  const sources = [
    item.selected_options,
    item.selectedOptions,
    item.options,
    item.formula_items,
    item.formulaItems,
    item.formula,
    item.formula_data,
    item.formulaData,
    item.selections,
    item.selection,
    item.formula_selections,
    item.formulaSelections,
  ];
  for (const source of sources) {
    const entries = parseFormulaEntryList(source);
    for (const entry of entries) {
      const isFormulaEntry =
        normalizeText(entry.kind ?? entry.type ?? entry.group ?? "").includes("formula") ||
        entry.formula_dish_id != null ||
        entry.sequence != null;
      if (!isFormulaEntry) continue;
      const entrySequence = normalizeStep(entry.step ?? entry.sequence ?? entry.service_step_sequence);
      if (entrySequence != null) {
        if (entrySequence === currentSequence) return entry;
        continue;
      }
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

export function resolveSelectedDishLabel(itemLike: unknown): string {
  const item = (itemLike && typeof itemLike === "object" ? itemLike : {}) as GenericOrderItem;
  const nestedDish = item.dish && typeof item.dish === "object" ? (item.dish as GenericOrderItem) : null;
  const directDisplayName =
    toDishLabel(item.name_fr) ||
    toDishLabel(nestedDish?.name_fr) ||
    toDishLabel(nestedDish?.name) ||
    toDishLabel(item.name);
  if (directDisplayName && !isUuidLike(directDisplayName)) return directDisplayName;
  if (isFormulaItem(item)) {
    const currentEntry = resolveFormulaEntryForCurrentSequence(item);
    if (currentEntry) {
      const fromFormulaEntry = toDishLabel(
        currentEntry.dish_name_fr ??
          currentEntry.dish_name ??
          currentEntry.dishName ??
          currentEntry.name_fr ??
          currentEntry.name ??
          currentEntry.label_fr ??
          currentEntry.value ??
          ""
      );
      if (fromFormulaEntry && !isUuidLike(fromFormulaEntry)) return fromFormulaEntry;
    }

    const formulaRootCandidates: unknown[] = [
      item.selected_dish_name_fr,
      item.selected_dish_name,
      item.selectedDishName,
      item.parent_dish_name,
      item.parentDishName,
      item.main_dish_name,
      item.mainDishName,
    ];
    for (const candidate of formulaRootCandidates) {
      const label = toDishLabel(candidate);
      if (label && !isUuidLike(label) && !normalizeText(label).includes("formule")) return label;
    }
  }

  const candidates: unknown[] = [
    item.dish_name_fr,
    item.dish_name,
    item.dishName,
    item.product_name,
    item.productName,
    item.name_fr,
    item.name,
    item.label,
    nestedDish?.name_fr,
    nestedDish?.name,
  ];
  for (const candidate of candidates) {
    const label = toDishLabel(candidate);
    if (label && !isUuidLike(label)) return label;
  }
  return "";
}
