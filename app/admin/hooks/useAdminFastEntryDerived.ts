import { useMemo } from "react";
import type { DishItem, FastOrderLine, FormulaDishLink, FormulaSummary } from "../types";
import {
  buildCategoriesForFastEntry,
  buildFastBaseLines,
  buildFastEntryDishes,
  buildFormulaParentDishIds,
  buildTableSelectOptions,
  resolveEffectiveSelectedFastCategoryKey,
} from "../services/fast-entry-derived";

type Params = Record<string, any>;

export function useAdminFastEntryDerived(params: Params) {
  const {
    dishes,
    readBooleanFlag,
    categories,
    normalizeCategoryKey,
    getCategoryLabel,
    getDishCategoryLabel,
    formulasCategoryKey,
    selectedCategory,
    formulas,
    formulaLinksByFormulaId,
    getDishName,
    getDishPrice,
    parsePriceNumber,
    fastQtyByDish,
    baseLineComments,
    resolveDishDestination,
    fastOptionLines,
    resolveFastLineUnitPricePricing,
    dishById,
    getFormulaPackPrice,
    configuredTotalTables,
    tableNumbers,
  } = params;

  const formulaParentDishIds = useMemo(
    () => buildFormulaParentDishIds({ dishes, readBooleanFlag }),
    [dishes, readBooleanFlag]
  );
  const categoriesForFastEntry = useMemo(
    () =>
      buildCategoriesForFastEntry({
        categories,
        dishes,
        normalizeCategoryKey,
        getCategoryLabel,
        getDishCategoryLabel,
        formulasCategoryKey,
      }),
    [categories, dishes, normalizeCategoryKey, getCategoryLabel, getDishCategoryLabel, formulasCategoryKey]
  );
  const effectiveSelectedFastCategoryKey = useMemo(
    () => resolveEffectiveSelectedFastCategoryKey({ categoriesForFastEntry, selectedCategory }),
    [categoriesForFastEntry, selectedCategory]
  );
  const fastEntryDishes = useMemo(
    () =>
      buildFastEntryDishes({
        effectiveSelectedFastCategoryKey,
        dishes: dishes as DishItem[],
        formulas: formulas as FormulaSummary[],
        formulasCategoryKey,
        formulaParentDishIds,
        formulaLinksByFormulaId: formulaLinksByFormulaId as Map<string, FormulaDishLink[]>,
        readBooleanFlag,
        normalizeCategoryKey,
        getDishCategoryLabel,
        getDishName,
        getDishPrice,
        parsePriceNumber,
      }),
    [
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
    ]
  );
  const fastBaseLines = useMemo(
    () =>
      buildFastBaseLines({
        fastQtyByDish,
        dishes,
        baseLineComments,
        getDishCategoryLabel,
        getDishName,
        getDishPrice,
        resolveDishDestination,
      }),
    [fastQtyByDish, dishes, baseLineComments, getDishCategoryLabel, getDishName, getDishPrice, resolveDishDestination]
  );
  const fastLines = [...(fastBaseLines as FastOrderLine[]), ...(fastOptionLines as FastOrderLine[])];
  const resolveFastLineUnitPrice = (line: FastOrderLine) =>
    resolveFastLineUnitPricePricing(line, { dishById, getFormulaPackPrice });
  const fastTotal = fastLines.reduce((sum, line) => sum + resolveFastLineUnitPrice(line) * line.quantity, 0);
  const fastItemCount = fastLines.reduce((sum, line) => sum + line.quantity, 0);
  const tableSelectOptions = useMemo(
    () => buildTableSelectOptions(configuredTotalTables, tableNumbers),
    [configuredTotalTables, tableNumbers]
  );

  return {
    formulaParentDishIds,
    categoriesForFastEntry,
    effectiveSelectedFastCategoryKey,
    fastEntryDishes,
    visibleFastEntryDishes: fastEntryDishes,
    fastBaseLines,
    fastLines,
    resolveFastLineUnitPrice,
    fastTotal,
    fastItemCount,
    tableSelectOptions,
  };
}
