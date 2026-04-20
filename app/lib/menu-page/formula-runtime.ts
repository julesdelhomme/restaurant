import { parseAddonPrice } from "./config";
import type { CategoryItem, Dish, FormulaDishLink, ProductOptionItem } from "./runtime-core";

export function isProductOptionVisible(
  option: ProductOptionItem | null | undefined,
  toBooleanFlag: (value: unknown) => boolean
) {
  if (!option) return false;
  const optionRecord = option as unknown as Record<string, unknown>;
  const isDeleted = toBooleanFlag(optionRecord.is_deleted ?? optionRecord.deleted);
  const activeValue = optionRecord.is_active ?? optionRecord.active;
  const isActive = activeValue == null ? true : toBooleanFlag(activeValue);
  return !isDeleted && isActive;
}

export function getSelectableFormulaProductOptions(
  dish: Dish,
  productOptions: ProductOptionItem[],
  formulaDefaultOptionsByDishId: Map<string, string[]>
) {
  const dishId = String(dish.id || "").trim();
  if (!dishId || productOptions.length === 0) return [] as ProductOptionItem[];
  const rawDefaults = formulaDefaultOptionsByDishId.get(dishId) || [];
  const availableOptionIds = new Set(productOptions.map((option) => String(option.id || "").trim()).filter(Boolean));
  const defaultOptionIds = new Set(
    rawDefaults.map((id) => String(id || "").trim()).filter((id) => availableOptionIds.has(id))
  );
  return productOptions.filter((option) => {
    const optionId = String(option.id || "").trim();
    if (!optionId) return false;
    const optionPrice = parseAddonPrice(option.price_override);
    const isPaidOption = optionPrice > 0;
    const isDefaultOption = defaultOptionIds.has(optionId);
    const isLocked = isPaidOption && !isDefaultOption;
    return !isLocked;
  });
}

export function parseFormulaCategoryIds(raw: unknown) {
  if (!raw) return [] as string[];
  if (Array.isArray(raw)) {
    return raw.map((entry) => String(entry || "").trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => String(entry || "").trim()).filter(Boolean);
      }
    } catch {
      // ignore invalid json
    }
    return raw
      .split(",")
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }
  return [] as string[];
}

export function buildFormulaLinkedOptionsByCategory(
  links: FormulaDishLink[],
  dishById: Map<string, Dish>
) {
  const map = new Map<string, Set<string>>();
  if (links.length === 0) return map;
  links.forEach((link) => {
    const categoryId = link.categoryId ? String(link.categoryId || "").trim() : null;
    if (!categoryId) {
      const dish = dishById.get(String(link.dishId || "").trim());
      if (!dish) return;
      const fallbackCategoryId = String(dish.category_id || "").trim();
      if (fallbackCategoryId) {
        const current = map.get(fallbackCategoryId) || new Set<string>();
        current.add(String(link.dishId || "").trim());
        map.set(fallbackCategoryId, current);
      }
      return;
    }
    const current = map.get(categoryId) || new Set<string>();
    current.add(String(link.dishId || "").trim());
    map.set(categoryId, current);
  });
  return map;
}

export type FormulaStepEntryRuntime = {
  step: number;
  categoryId: string;
  sortOrder: number | null;
  isRequired: boolean;
  isMainDish?: boolean;
  priority?: number | string | null;
};

export function resolvePrimaryStepEntry<T extends FormulaStepEntryRuntime>(entries: T[]) {
  if (!entries || entries.length === 0) return null;
  return (
    [...entries].sort((a, b) => {
      if (a.isRequired !== b.isRequired) return a.isRequired ? -1 : 1;
      const aSort = a.sortOrder ?? 9999;
      const bSort = b.sortOrder ?? 9999;
      if (aSort !== bSort) return aSort - bSort;
      return a.step - b.step;
    })[0] || null
  );
}

type PickMainFormulaStepDeps<T extends FormulaStepEntryRuntime> = {
  categoryById: Map<string, CategoryItem>;
  normalizeLookupText: (value: unknown) => string;
  getCategoryLabel: (category: CategoryItem) => string;
};

export function pickMainFormulaStep<T extends FormulaStepEntryRuntime>(
  formulaStepEntries: T[],
  deps: PickMainFormulaStepDeps<T>
) {
  if (formulaStepEntries.length === 0) return null;
  const explicitMain = formulaStepEntries.filter((entry) => Boolean(entry.isMainDish));
  if (explicitMain.length > 0) {
    return resolvePrimaryStepEntry(explicitMain);
  }
  const explicitPriority = formulaStepEntries.filter((entry) => {
    const p = Number(entry.priority);
    return Number.isFinite(p) && p > 0;
  });
  if (explicitPriority.length > 0) {
    return [...explicitPriority].sort((a, b) => Number(a.priority || 9999) - Number(b.priority || 9999))[0] || null;
  }
  const requiredEntries = formulaStepEntries.filter((entry) => entry.isRequired);
  if (requiredEntries.length > 0) {
    return resolvePrimaryStepEntry(requiredEntries);
  }
  const mainCourseEntries = formulaStepEntries.filter((entry) => {
    const category = deps.categoryById.get(String(entry.categoryId || "").trim());
    const categoryLabel = deps.normalizeLookupText(category ? deps.getCategoryLabel(category) : "");
    return /(plat|main|dish|principal)/.test(categoryLabel);
  });
  if (mainCourseEntries.length > 0) {
    return resolvePrimaryStepEntry(mainCourseEntries);
  }
  return null;
}

export function resolveMainStepFromStructure(
  formulaStructureConfig: Record<string, unknown>,
  mainFormulaStep: number | null,
  normalizeFormulaStepValue: (value: unknown, allowZero?: boolean) => number | null,
  toBooleanFlag: (value: unknown) => boolean
) {
  const steps = Array.isArray(formulaStructureConfig.steps) ? formulaStructureConfig.steps : [];
  if (steps.length > 0) {
    const flagged = steps.find((row) =>
      toBooleanFlag((row as any)?.is_main_dish ?? (row as any)?.isMainDish ?? (row as any)?.main_dish)
    ) as Record<string, unknown> | undefined;
    if (flagged) {
      const flaggedStep = normalizeFormulaStepValue(
        flagged.step ?? flagged.step_number ?? flagged.order ?? flagged.position,
        true
      );
      if (flaggedStep != null && flaggedStep > 0) return flaggedStep;
    }
    const prioritized = steps
      .map((row) => ({
        row: row as Record<string, unknown>,
        priority: Number((row as any)?.priority),
      }))
      .filter((entry) => Number.isFinite(entry.priority) && entry.priority > 0)
      .sort((a, b) => a.priority - b.priority)[0];
    if (prioritized) {
      const prioritizedStep = normalizeFormulaStepValue(
        prioritized.row.step ?? prioritized.row.step_number ?? prioritized.row.order ?? prioritized.row.position,
        true
      );
      if (prioritizedStep != null && prioritizedStep > 0) return prioritizedStep;
    }
  }
  const fromConfig = normalizeFormulaStepValue(formulaStructureConfig.main_dish_step, true);
  if (fromConfig != null && fromConfig > 0) return fromConfig;
  return mainFormulaStep;
}

export function findFormulaStepNodeByStep(
  formulaStructureConfig: Record<string, unknown>,
  mainStepFromStructure: number | null,
  normalizeFormulaStepValue: (value: unknown, allowZero?: boolean) => number | null
) {
  const steps = Array.isArray(formulaStructureConfig.steps) ? formulaStructureConfig.steps : [];
  if (!steps.length) return null;
  return (
    steps.find((row) => {
      const stepValue = normalizeFormulaStepValue(
        (row as any)?.step ?? (row as any)?.step_number ?? (row as any)?.order ?? (row as any)?.position,
        true
      );
      return stepValue != null && mainStepFromStructure != null && stepValue === mainStepFromStructure;
    }) || null
  );
}

export function parseOptionIdSet(value: unknown) {
  if (Array.isArray(value)) {
    return new Set(value.map((entry) => String(entry || "").trim()).filter(Boolean));
  }
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return new Set<string>();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.map((entry) => String(entry || "").trim()).filter(Boolean));
      }
    } catch {
      // Ignore malformed JSON and fallback to CSV-style parsing.
    }
    const normalized = raw.replace(/[\[\]{}"]/g, "");
    return new Set(normalized.split(",").map((entry) => String(entry || "").trim()).filter(Boolean));
  }
  return new Set<string>();
}
