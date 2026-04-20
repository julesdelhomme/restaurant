import type { CategoryItem, DishItem, FastOrderLine, FormulaDishLink, FormulaSummary } from "../types";

export function buildFormulaParentDishIds(params: {
  dishes: DishItem[];
  readBooleanFlag: (value: unknown, defaultValue?: boolean) => boolean;
}): Set<string> {
  const { dishes, readBooleanFlag } = params;
  const ids = new Set<string>();
  dishes.forEach((dish) => {
    if (!readBooleanFlag((dish as unknown as { is_formula?: unknown }).is_formula, false)) return;
    const normalizedId = String(dish.id || "").trim();
    if (normalizedId) ids.add(normalizedId);
  });
  return ids;
}

export function buildCategoriesForFastEntry(params: {
  categories: CategoryItem[];
  dishes: DishItem[];
  normalizeCategoryKey: (value: string) => string;
  getCategoryLabel: (category: CategoryItem) => string;
  getDishCategoryLabel: (dish: DishItem) => string;
  formulasCategoryKey: string;
}): Array<{ key: string; label: string }> {
  const { categories, dishes, normalizeCategoryKey, getCategoryLabel, getDishCategoryLabel, formulasCategoryKey } = params;
  const categoriesForFastEntryBase =
    categories.length > 0
      ? categories.map((category) => {
          const label = getCategoryLabel(category);
          return { key: normalizeCategoryKey(label), label };
        })
      : (() => {
          const unique = new Map<string, string>();
          dishes.forEach((dish) => {
            const label = getDishCategoryLabel(dish);
            const key = normalizeCategoryKey(label);
            if (!unique.has(key)) unique.set(key, label);
          });
          return [...unique.entries()].map(([key, label]) => ({ key, label }));
        })();

  return [{ key: formulasCategoryKey, label: "Formules" }, ...categoriesForFastEntryBase];
}

export function resolveEffectiveSelectedFastCategoryKey(params: {
  categoriesForFastEntry: Array<{ key: string; label: string }>;
  selectedCategory: string;
}): string {
  const { categoriesForFastEntry, selectedCategory } = params;
  const availableFastCategoryKeys = new Set(categoriesForFastEntry.map((category) => category.key));
  return availableFastCategoryKeys.has(selectedCategory) ? selectedCategory : categoriesForFastEntry[0]?.key || "";
}

export function buildFastEntryDishes(params: {
  effectiveSelectedFastCategoryKey: string;
  dishes: DishItem[];
  formulas: FormulaSummary[];
  formulasCategoryKey: string;
  formulaParentDishIds: Set<string>;
  formulaLinksByFormulaId: Map<string, FormulaDishLink[]>;
  readBooleanFlag: (value: unknown, defaultValue?: boolean) => boolean;
  normalizeCategoryKey: (value: string) => string;
  getDishCategoryLabel: (dish: DishItem) => string;
  getDishName: (dish: DishItem) => string;
  getDishPrice: (dish: DishItem) => number;
  parsePriceNumber: (value: unknown) => number;
}): DishItem[] {
  const {
    effectiveSelectedFastCategoryKey,
    dishes,
    formulas,
    formulasCategoryKey,
    formulaParentDishIds,
    formulaLinksByFormulaId,
    readBooleanFlag,
    normalizeCategoryKey,
    getDishCategoryLabel,
    getDishName,
    getDishPrice,
    parsePriceNumber,
  } = params;

  if (!effectiveSelectedFastCategoryKey) return dishes;

  if (effectiveSelectedFastCategoryKey === formulasCategoryKey) {
    const formulasFromTable = formulas.map((f) => {
      const linkedDishId = String((f as { dish_id?: unknown })?.dish_id || "").trim();
      const baseDish = dishes?.find((dish) => {
        const dishId = String(dish?.id || "").trim();
        return dishId === String(f?.id || "").trim() || (linkedDishId && dishId === linkedDishId);
      });
      const price = parsePriceNumber(f.price);
      return {
        ...(baseDish || {
          id: f.id,
          name: f.name,
          name_fr: f.name,
          price,
          image_url: f.image_url || undefined,
          category: "Formules",
          category_id: "formules",
        }),
        formulaName: f.name,
        formulaPrice: Number.isFinite(price) ? price : 0,
        formulaImage: f.image_url || (baseDish as { image_url?: string | null } | undefined)?.image_url,
        isFormulaDisplay: true as const,
        is_formula: true,
        formula_id: f.id,
        dish_id: linkedDishId || null,
      } as DishItem;
    });

    const formulasFromDishes = dishes
      .filter((dish) => readBooleanFlag((dish as unknown as { is_formula?: unknown }).is_formula, false))
      .map((dish) => {
        const dishId = String(dish.id || "").trim();
        const tableFormula = formulas?.find((formula) => {
          const formulaId = String(formula?.id || "").trim();
          const formulaDishId = String((formula as { dish_id?: unknown })?.dish_id || "").trim();
          return formulaId === dishId || (formulaDishId && formulaDishId === dishId);
        });
        return {
          ...dish,
          formulaName: tableFormula?.name || getDishName(dish),
          formulaPrice: tableFormula ? parsePriceNumber(tableFormula.price) : getDishPrice(dish),
          formulaImage: tableFormula?.image_url || dish.image_url,
          isFormulaDisplay: true as const,
          is_formula: true,
          formula_id: dishId || (dish as unknown as { formula_id?: string | number }).formula_id || null,
        } as DishItem;
      });

    const deduped = new Map<string, DishItem>();
    [...formulasFromTable, ...formulasFromDishes].forEach((formulaDish) => {
      const key = String(formulaDish.id || (formulaDish as unknown as { formula_id?: string | number }).formula_id || "").trim();
      if (!key) return;
      if (!deduped.has(key)) deduped.set(key, formulaDish);
    });
    return Array.from(deduped.values());
  }

  const matchingCategory = dishes.filter(
    (dish) => normalizeCategoryKey(getDishCategoryLabel(dish)) === effectiveSelectedFastCategoryKey
  );

  return matchingCategory.flatMap((dish) => {
    const sourceDishId = String(dish.id || "").trim();
    const isFormulaDish =
      formulaParentDishIds.has(sourceDishId) ||
      formulaLinksByFormulaId.has(sourceDishId) ||
      readBooleanFlag((dish as unknown as { is_formula?: unknown }).is_formula, false);
    if (!isFormulaDish) return [dish];

    const rawDishCard: DishItem = { ...dish, is_formula: false, formulaDisplayMode: "base", formula_base_dish_id: sourceDishId };
    const formulaDishCard: DishItem = {
      ...dish,
      is_formula: true,
      formulaDisplayMode: "formula",
      formula_base_dish_id: sourceDishId,
    };
    return [rawDishCard, formulaDishCard];
  });
}

export function buildFastBaseLines(params: {
  fastQtyByDish: Record<string, number>;
  dishes: DishItem[];
  baseLineComments: Record<string, string>;
  getDishCategoryLabel: (dish: DishItem) => string;
  getDishName: (dish: DishItem) => string;
  getDishPrice: (dish: DishItem) => number;
  resolveDishDestination: (dish: DishItem) => "bar" | "cuisine";
}): FastOrderLine[] {
  const { fastQtyByDish, dishes, baseLineComments, getDishCategoryLabel, getDishName, getDishPrice, resolveDishDestination } =
    params;
  const lines: FastOrderLine[] = [];
  const dishById = new Map<string, DishItem>();
  dishes.forEach((dish) => dishById.set(String(dish.id), dish));

  Object.entries(fastQtyByDish).forEach(([dishId, quantity]) => {
    if (!quantity || quantity <= 0) return;
    const dish = dishById.get(dishId);
    if (!dish) return;
    const category = getDishCategoryLabel(dish);
    const finalPrice = Number(
      (dish as unknown as { price?: unknown }).price ??
      (dish as unknown as { dish?: { price?: unknown } }).dish?.price ??
      0
    );
    const resolvedUnitPrice = Number.isFinite(finalPrice) && finalPrice > 0 ? finalPrice : getDishPrice(dish);
    lines.push({
      lineId: `base-${dishId}`,
      dishId,
      dishName: getDishName(dish),
      category,
      categoryId: dish.category_id ?? null,
      quantity,
      unitPrice: Number.isFinite(resolvedUnitPrice) ? resolvedUnitPrice : 0,
      selectedSides: [],
      selectedExtras: [],
      selectedProductOptionId: null,
      selectedProductOptionName: null,
      selectedProductOptionPrice: 0,
      selectedCooking: "",
      specialRequest: String(baseLineComments[dishId] || ""),
      destination: resolveDishDestination(dish),
      isDrink: resolveDishDestination(dish) === "bar",
    });
  });

  return lines;
}

export function buildTableSelectOptions(configuredTotalTables: number, tableNumbers: number[]): number[] {
  return Array.from(new Set([...Array.from({ length: configuredTotalTables }, (_, index) => index + 1), ...tableNumbers])).sort(
    (a, b) => a - b
  );
}
