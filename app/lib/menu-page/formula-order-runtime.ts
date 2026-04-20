import { parsePriceNumber } from "./config";
import { FORMULA_DIRECT_SEND_SEQUENCE } from "./static";
import type { CategoryItem } from "./runtime-core";

type LookupNormalizer = (value: unknown) => string;

type CategoryPredicate = (categoryId?: string | number | null) => boolean;

type ResolveOrderStepDeps = {
  isDrinkCategory: CategoryPredicate;
  isDessertCategory: CategoryPredicate;
  categoryById: Map<string, CategoryItem>;
  normalizeLookupText: LookupNormalizer;
  directSendSequence?: number;
};

export function normalizeFormulaStepValue(value: unknown, allowZero = false) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return null;
  const truncated = Math.trunc(raw);
  if (allowZero && truncated === 0) return 0;
  if (truncated <= 0) return null;
  return Math.max(1, truncated);
}

export function isDirectFormulaStep(
  value: unknown,
  normalizeLookupText: LookupNormalizer,
  directSendSequence = FORMULA_DIRECT_SEND_SEQUENCE
) {
  const normalizedText = normalizeLookupText(value);
  if (normalizedText.includes("direct")) return true;
  const normalizedStep = normalizeFormulaStepValue(value, true);
  if (normalizedStep == null) return false;
  return normalizedStep === 0 || normalizedStep >= directSendSequence;
}

export function resolveInitialFormulaItemStatus(sequence: number | null, sortOrder?: unknown) {
  const normalizedSort = Number(sortOrder);
  if (Number.isFinite(normalizedSort) && Math.trunc(normalizedSort) === 0) return "preparing";
  if (sequence != null && sequence <= 1) return "preparing";
  if (sequence != null && sequence > 1) return "pending";
  return "pending";
}

export function mapSequenceToOrderStep(
  value: unknown,
  normalizeLookupText: LookupNormalizer,
  directSendSequence = FORMULA_DIRECT_SEND_SEQUENCE
) {
  const normalizedStep = normalizeFormulaStepValue(value, true);
  if (normalizedStep == null) return null;
  if (isDirectFormulaStep(normalizedStep, normalizeLookupText, directSendSequence)) return 0;
  if (normalizedStep <= 1) return 1;
  if (normalizedStep === 2) return 2;
  return 3;
}

export function resolveOrderStepForPayloadItem(item: Record<string, unknown>, deps: ResolveOrderStepDeps) {
  const explicitStep = mapSequenceToOrderStep(
    item.step ?? item.sequence ?? item.formula_current_sequence ?? item.formulaCurrentSequence,
    deps.normalizeLookupText,
    deps.directSendSequence
  );
  if (explicitStep != null) return explicitStep;
  const destination = String(item.destination || "").trim().toLowerCase();
  if (destination === "bar") return 0;
  const categoryId = item.category_id as string | number | null | undefined;
  if (item.is_drink === true || deps.isDrinkCategory(categoryId)) return 0;
  const categoryLabel = deps.normalizeLookupText(
    String(item.category || item.categorie || deps.categoryById.get(String(categoryId || "").trim())?.name_fr || "")
  );
  if (/(entree|starter|appetizer)/.test(categoryLabel)) return 1;
  if (deps.isDessertCategory(categoryId) || /(dessert|sweet|sucre)/.test(categoryLabel)) return 3;
  return 2;
}

export function normalizeFormulaOrderItemsForPayload<T extends Record<string, unknown>>(items: T[], deps: ResolveOrderStepDeps) {
  const normalized = items.map((entry) => {
    const current = { ...entry } as T;
    const step = resolveOrderStepForPayloadItem(current as Record<string, unknown>, deps);
    const currentRecord = current as Record<string, unknown>;
    currentRecord.step = step;
    currentRecord.sequence = step;
    const formulaDishId = String(
      currentRecord.formula_dish_id ?? currentRecord.formulaDishId ?? currentRecord.formula_id ?? currentRecord.formulaId ?? ""
    ).trim();
    const isFormulaItem = Boolean(currentRecord.is_formula ?? formulaDishId);
    if (isFormulaItem) {
      const existingStatus = String(currentRecord.status || "").trim().toLowerCase();
      if (!existingStatus || existingStatus === "pending" || existingStatus === "waiting") {
        const sequence = normalizeFormulaStepValue(
          currentRecord.step ??
            currentRecord.sequence ??
            currentRecord.formula_current_sequence ??
            currentRecord.formulaCurrentSequence,
          true
        );
        const sortOrder = currentRecord.sort_order ?? currentRecord.step_number ?? currentRecord.sortOrder;
        currentRecord.status = resolveInitialFormulaItemStatus(sequence, sortOrder);
      }
    }
    return current;
  });

  const byFormulaInstance = new Map<string, number[]>();
  normalized.forEach((entry, index) => {
    const record = entry as Record<string, unknown>;
    const formulaDishId = String(
      record.formula_dish_id ?? record.formulaDishId ?? record.formula_id ?? record.formulaId ?? ""
    ).trim();
    const isFormulaItem = Boolean(record.is_formula ?? formulaDishId);
    if (!isFormulaItem || !formulaDishId) return;
    const explicitInstanceId = String(record.formula_instance_id ?? record.formulaInstanceId ?? "").trim();
    const instanceKey = explicitInstanceId || formulaDishId;
    const group = byFormulaInstance.get(instanceKey) || [];
    group.push(index);
    byFormulaInstance.set(instanceKey, group);
  });

  byFormulaInstance.forEach((indexes) => {
    if (indexes.length === 0) return;
    const chooseParentIndex = () => {
      for (const index of indexes) {
        const record = normalized[index] as Record<string, unknown>;
        if (record.is_formula_parent === true || record.isFormulaParent === true) return index;
      }
      for (const index of indexes) {
        const record = normalized[index] as Record<string, unknown>;
        if (record.is_main === true || record.isMain === true) return index;
      }
      for (const index of indexes) {
        const record = normalized[index] as Record<string, unknown>;
        if (parsePriceNumber(record.price) > 0 || parsePriceNumber(record.formula_unit_price) > 0) return index;
      }
      return indexes[0];
    };
    const parentIndex = chooseParentIndex();
    const parentRecord = normalized[parentIndex] as Record<string, unknown>;
    const parentUnitPrice =
      parsePriceNumber(parentRecord.price) > 0
        ? parsePriceNumber(parentRecord.price)
        : parsePriceNumber(parentRecord.formula_unit_price);
    parentRecord.is_formula = true;
    parentRecord.is_formula_parent = true;
    parentRecord.price = parentUnitPrice;
    parentRecord.base_price = parentUnitPrice;
    parentRecord.unit_total_price = parentUnitPrice;
    parentRecord.formula_unit_price = parentUnitPrice;

    indexes.forEach((index) => {
      if (index === parentIndex) return;
      const childRecord = normalized[index] as Record<string, unknown>;
      childRecord.is_formula = true;
      childRecord.is_formula_parent = false;
      childRecord.price = 0;
      childRecord.base_price = 0;
      childRecord.unit_total_price = 0;
      childRecord.formula_unit_price = 0;
    });
  });

  return normalized;
}

export function resolveInitialCurrentStepFromOrderItems(items: Array<Record<string, unknown>>) {
  const stepValues = items
    .map((item) => Number(item.step))
    .filter((value) => Number.isFinite(value))
    .map((value) => Math.trunc(value));
  const positive = stepValues.filter((value) => value > 0);
  if (positive.length > 0) return Math.min(...positive);
  return 0;
}

export function resolveLegacyServiceStepFromCurrentStep(currentStep: number) {
  if (currentStep >= 3) return "dessert";
  if (currentStep <= 1) return "entree";
  return "plat";
}
