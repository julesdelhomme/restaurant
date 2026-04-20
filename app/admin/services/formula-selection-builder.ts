import type { CategoryItem, DishItem, FormulaDishLink, FormulaSelection } from "../types";

export function resolveFormulaLinksForDishService(formulaDish: DishItem, formulaLinksByFormulaId: Map<string, FormulaDishLink[]>) {
  const formulaDishId = String(formulaDish.id || "").trim();
  if (!formulaDishId) return [] as FormulaDishLink[];
  const existing = formulaLinksByFormulaId.get(formulaDishId) || [];
  const byDishId = new Map<string, FormulaDishLink>();
  existing.forEach((link) => {
    const dishId = String(link.dishId || "").trim();
    if (!dishId) return;
    if (byDishId.has(dishId)) return;
    byDishId.set(dishId, link);
  });
  if (!byDishId.has(formulaDishId)) {
    byDishId.set(formulaDishId, {
      formulaDishId,
      dishId: formulaDishId,
      sequence: 1,
      isMain: true,
    });
  }
  return [...byDishId.values()];
}

export function resolveFirstStepFormulaLinksService(
  formulaDish: DishItem,
  formulaLinksByFormulaId: Map<string, FormulaDishLink[]>,
  normalizeFormulaStepValue: (value: unknown, allowZero?: boolean) => number | null
) {
  const links = resolveFormulaLinksForDishService(formulaDish, formulaLinksByFormulaId);
  if (links.length === 0) return [] as FormulaDishLink[];
  const normalized = links.map((link) => {
    const rawSequence = normalizeFormulaStepValue(link.step ?? link.sequence, true);
    if (rawSequence != null && rawSequence > 0) {
      return { link, sequence: rawSequence };
    }
    if (link.isMain) {
      return { link: { ...link, sequence: 1 }, sequence: 1 };
    }
    return { link, sequence: null as number | null };
  });
  const stepOne = normalized.filter((entry) => entry.sequence === 1).map((entry) => entry.link);
  if (stepOne.length > 0) return stepOne;
  const withSequence = normalized.filter((entry) => Number.isFinite(entry.sequence) && Number(entry.sequence) > 0);
  if (withSequence.length > 0) {
    const minSequence = Math.min(...withSequence.map((entry) => Number(entry.sequence)));
    return withSequence.filter((entry) => Number(entry.sequence) === minSequence).map((entry) => entry.link);
  }
  return links;
}

export async function buildAutoFormulaSelectionsService(args: {
  formulaDish: DishItem;
  formulaLinksByFormulaId: Map<string, FormulaDishLink[]>;
  normalizeFormulaStepValue: (value: unknown, allowZero?: boolean) => number | null;
  parseFormulaCategoryIds: (raw: unknown) => string[];
  dishes: DishItem[];
  dishById: Map<string, DishItem>;
  readBooleanFlag: (raw: unknown, fallback?: boolean) => boolean;
  ensureFormulaDishDetails: (dish: DishItem | null | undefined) => Promise<DishItem | null>;
  getFormulaDishConfig: (dish: DishItem) => {
    productOptions: Array<{ id: string; name: string; price: number }>;
  };
  parsePriceNumber: (raw: unknown) => number;
  categoryById: Map<string, CategoryItem>;
  getCategoryLabel: (category: CategoryItem) => string;
  getDishName: (dish: DishItem) => string;
  getFormulaCompositionDishName: (dish: DishItem | null | undefined) => string;
  resolveFormulaSelectionDestination: (
    selection: Pick<FormulaSelection, "sequence" | "destination" | "categoryId" | "categoryLabel">,
    dish: DishItem | null | undefined
  ) => "cuisine" | "bar";
}) {
  const {
    formulaDish,
    formulaLinksByFormulaId,
    normalizeFormulaStepValue,
    parseFormulaCategoryIds,
    dishes,
    dishById,
    readBooleanFlag,
    ensureFormulaDishDetails,
    getFormulaDishConfig,
    parsePriceNumber,
    categoryById,
    getCategoryLabel,
    getDishName,
    getFormulaCompositionDishName,
    resolveFormulaSelectionDestination,
  } = args;

  const formulaDishId = String(formulaDish.id || "").trim();
  if (!formulaDishId) return [] as FormulaSelection[];
  const links = resolveFormulaLinksForDishService(formulaDish, formulaLinksByFormulaId);
  const sequenceByDishId = new Map<string, number>();
  const defaultOptionIdsByDishId = new Map<string, string[]>();
  const linkedDishIdsByCategory = new Map<string, Set<string>>();
  links.forEach((link) => {
    const linkedDishId = String(link.dishId || "").trim();
    if (!linkedDishId) return;
    const rawSequence = normalizeFormulaStepValue(link.step ?? link.sequence, true);
    if (rawSequence != null) sequenceByDishId.set(linkedDishId, rawSequence);
    else if (Boolean(link.isMain)) sequenceByDishId.set(linkedDishId, 1);
    if (Array.isArray(link.defaultProductOptionIds) && link.defaultProductOptionIds.length > 0) {
      defaultOptionIdsByDishId.set(linkedDishId, link.defaultProductOptionIds);
    }
    const linkedDish = dishById.get(linkedDishId);
    const linkedCategoryId = String(linkedDish?.category_id || "").trim();
    if (!linkedCategoryId) return;
    const currentSet = linkedDishIdsByCategory.get(linkedCategoryId) || new Set<string>();
    currentSet.add(linkedDishId);
    linkedDishIdsByCategory.set(linkedCategoryId, currentSet);
  });
  const parsedCategoryIds = parseFormulaCategoryIds((formulaDish as unknown as { formula_category_ids?: unknown }).formula_category_ids);
  const categoryIds = parsedCategoryIds.length > 0 ? parsedCategoryIds : Array.from(linkedDishIdsByCategory.keys());
  const selections: FormulaSelection[] = [];
  for (const [categoryIndex, rawCategoryId] of categoryIds.entries()) {
    const categoryId = String(rawCategoryId || "").trim();
    if (!categoryId) continue;
    const linkedIds = linkedDishIdsByCategory.get(categoryId);
    const restrictToLinked = Boolean(linkedIds && linkedIds.size > 0);
    const options = dishes
      .filter((dish) => String(dish.category_id || "").trim() === categoryId)
      .filter((dish) => !readBooleanFlag((dish as unknown as { is_formula?: unknown }).is_formula))
      .filter((dish) => String(dish.id || "").trim() !== formulaDishId)
      .filter((dish) => !restrictToLinked || linkedIds?.has(String(dish.id || "").trim()));
    if (options.length === 0) continue;
    const sortedOptions = [...options].sort((a, b) => {
      const aId = String(a.id || "").trim();
      const bId = String(b.id || "").trim();
      const aSequence = sequenceByDishId.get(aId);
      const bSequence = sequenceByDishId.get(bId);
      const aSort = Number.isFinite(Number(aSequence)) && Number(aSequence) > 0 ? Number(aSequence) : 999;
      const bSort = Number.isFinite(Number(bSequence)) && Number(bSequence) > 0 ? Number(bSequence) : 999;
      if (aSort !== bSort) return aSort - bSort;
      return getDishName(a).localeCompare(getDishName(b), "fr", { sensitivity: "base" });
    });
    const selectedDish = sortedOptions[0];
    const selectedDishId = String(selectedDish.id || "").trim();
    if (!selectedDishId) continue;
    const loadedSelectedDish = (await ensureFormulaDishDetails(selectedDish)) || selectedDish;
    const config = getFormulaDishConfig(loadedSelectedDish);
    const availableOptionIds = new Set(config.productOptions.map((option) => String(option.id || "").trim()).filter(Boolean));
    const linkedDefaultOptionIds = (defaultOptionIdsByDishId.get(selectedDishId) || []).filter((id) =>
      availableOptionIds.has(String(id || "").trim())
    );
    const allowMulti = Boolean((loadedSelectedDish as unknown as { allow_multi_select?: unknown }).allow_multi_select);
    const selectedOptionIds = allowMulti ? linkedDefaultOptionIds : linkedDefaultOptionIds.slice(0, 1);
    const selectedOptions = config.productOptions.filter((option) => selectedOptionIds.includes(String(option.id || "").trim()));
    const selectedOptionNames = selectedOptions.map((option) => String(option.name || "").trim()).filter(Boolean);
    const selectedOptionPrice = selectedOptions.reduce((sum, option) => sum + parsePriceNumber(option.price), 0);
    const linkedSequence = sequenceByDishId.get(selectedDishId);
    const sequence = Number.isFinite(Number(linkedSequence)) ? Number(linkedSequence) : categoryIndex + 1;
    const category = categoryById.get(categoryId);
    const selectionContext = {
      sequence,
      destination: undefined,
      categoryId,
      categoryLabel: category ? getCategoryLabel(category) : "",
    };
    selections.push({
      categoryId,
      categoryLabel: selectionContext.categoryLabel,
      dishId: selectedDishId,
      dishName: getFormulaCompositionDishName(loadedSelectedDish),
      destination: resolveFormulaSelectionDestination(selectionContext, loadedSelectedDish),
      sequence,
      selectedSideIds: [],
      selectedSides: [],
      selectedCooking: "",
      selectedOptionIds,
      selectedOptionNames,
      selectedOptionPrice,
      selectedExtras: [],
    } as FormulaSelection);
  }
  return selections;
}
