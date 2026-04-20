import { useMemo } from "react";

import type { CategoryItem, DishItem, FormulaDisplay, FormulaSummary } from "../types";
import { parsePriceNumber, readBooleanFlag } from "../utils/page-helpers";
import { isDrink } from "../utils/order-items";

type UseAdminDishHelpersArgs = {
  formulas: FormulaSummary[];
  formulaDisplays: FormulaDisplay[];
  formulaDisplayById: Map<string, { name?: string; imageUrl?: string }>;
  formulaPriceByDishId: Map<string, number>;
  categoryById: Map<string, CategoryItem>;
  categoryByNormalizedLabel: Map<string, CategoryItem>;
  normalizeCategoryKey: (value: string) => string;
};

export function useAdminDishHelpers(args: UseAdminDishHelpersArgs) {
  const {
    formulas,
    formulaDisplays,
    formulaDisplayById,
    formulaPriceByDishId,
    categoryById,
    categoryByNormalizedLabel,
    normalizeCategoryKey,
  } = args;

  return useMemo(() => {
    function getCategoryLabel(category: CategoryItem) {
      return (
        String(category.name_fr || "").trim() ||
        String(category.name || "").trim() ||
        String(category.label || "").trim() ||
        String(category.category || "").trim() ||
        String(category.name_en || "").trim() ||
        String(category.name_es || "").trim() ||
        String(category.name_de || "").trim() ||
        `CatÃƒÂ©gorie ${category.id}`
      );
    }

    function getDishBaseName(dish: DishItem) {
      return String(dish.name || "").trim() || String(dish.name_fr || "").trim() || String(dish.nom || "").trim() || "[Plat sans nom]";
    }

    function resolveFormulaRecordForDish(dish: DishItem | null | undefined) {
      const dishId = String(dish?.id || "").trim();
      if (!dishId) return null;
      return (
        formulas.find((formula) => String(formula.id || "").trim() === dishId) ||
        formulas.find((formula) => String(formula.dish_id || "").trim() === dishId) ||
        null
      );
    }

    function getDishName(dish: DishItem) {
      const isFormula = readBooleanFlag((dish as unknown as { is_formula?: unknown }).is_formula, false);
      if (!isFormula) return getDishBaseName(dish);
      const formulaRecord = resolveFormulaRecordForDish(dish);
      if (formulaRecord?.name) return String(formulaRecord.name).trim();
      const formulaDisplay = formulaDisplays?.find(
        (fd) =>
          String(fd?.id || "").trim() === String(dish?.id || "").trim() ||
          String(fd?.dishId || "").trim() === String(dish?.id || "").trim()
      );
      if (formulaDisplay?.name) return String(formulaDisplay.name).trim();
      const formulaId = String(dish?.id || "").trim();
      const display = formulaDisplayById.get(formulaId);
      return String((dish as Record<string, unknown>).formulaName || display?.name || "").trim() || getDishBaseName(dish);
    }

    function getFormulaCompositionDishName(dish: DishItem | null | undefined) {
      if (!dish) return "[Plat sans nom]";
      return getDishBaseName(dish);
    }

    function getFormulaPackPrice(dish: DishItem | null | undefined) {
      if (!dish || !dish.id) return 0;
      const formulaRecord = resolveFormulaRecordForDish(dish);
      const formulaRecordPrice = parsePriceNumber(formulaRecord?.price);
      if (Number.isFinite(formulaRecordPrice) && formulaRecordPrice > 0) return formulaRecordPrice;

      const formulaDisplay = formulaDisplays?.find(
        (fd) =>
          String(fd?.id || "").trim() === String(dish?.id || "").trim() ||
          String(fd?.dishId || "").trim() === String(dish?.id || "").trim()
      );
      if (formulaDisplay && Number.isFinite(formulaDisplay.price) && formulaDisplay.price > 0) return formulaDisplay.price;

      const formulaId = String(dish?.id || "").trim();
      const formulaTablePrice = formulaPriceByDishId.get(formulaId);
      if (Number.isFinite(formulaTablePrice) && Number(formulaTablePrice) > 0) return Number(Number(formulaTablePrice).toFixed(2));

      const formulaPrice = parsePriceNumber((dish as unknown as { formula_price?: unknown }).formula_price);
      if (Number.isFinite(formulaPrice) && formulaPrice > 0) return formulaPrice;
      const formulaDisplayPrice = (dish as Record<string, unknown>).formulaPrice;
      if (Number.isFinite(Number(formulaDisplayPrice)) && Number(formulaDisplayPrice) > 0) return Number(formulaDisplayPrice);
      const regularPrice = parsePriceNumber(dish.price);
      return Number.isFinite(regularPrice) && regularPrice > 0 ? regularPrice : 0;
    }

    function getDishPrice(dish: DishItem) {
      const isFormula = readBooleanFlag((dish as unknown as { is_formula?: unknown }).is_formula, false);
      if (isFormula) return getFormulaPackPrice(dish);
      const directPrice = parsePriceNumber(dish.price);
      const nestedDishPrice = parsePriceNumber((dish as unknown as { dish?: { price?: unknown } }).dish?.price);
      const fallbackDisplayPrice = parsePriceNumber((dish as unknown as { formulaPrice?: unknown }).formulaPrice);
      const finalPrice = Number(
        (Number.isFinite(directPrice) && directPrice > 0
          ? directPrice
          : Number.isFinite(nestedDishPrice) && nestedDishPrice > 0
            ? nestedDishPrice
            : Number.isFinite(fallbackDisplayPrice) && fallbackDisplayPrice > 0
              ? fallbackDisplayPrice
              : 0)
      );
      return Number.isFinite(finalPrice) ? finalPrice : 0;
    }

    function getFormulaDisplayName(dish: DishItem | null | undefined) {
      if (!dish || !dish.id) return "[Plat sans nom]";
      const formulaRecord = resolveFormulaRecordForDish(dish);
      if (formulaRecord?.name) return String(formulaRecord.name).trim();
      const formulaDisplay = formulaDisplays?.find(
        (fd) =>
          String(fd?.id || "").trim() === String(dish?.id || "").trim() ||
          String(fd?.dishId || "").trim() === String(dish?.id || "").trim()
      );
      if (formulaDisplay && formulaDisplay.name) return formulaDisplay.name;
      const formulaId = String(dish?.id || "").trim();
      const display = formulaDisplayById.get(formulaId);
      return String((dish as Record<string, unknown>).formulaName || display?.name || "").trim() || getDishBaseName(dish);
    }

    function getDishRawDescription(dish: DishItem) {
      const isFormula = readBooleanFlag((dish as unknown as { is_formula?: unknown }).is_formula, false);
      if (isFormula) {
        const formulaRecord = resolveFormulaRecordForDish(dish);
        const formulaRecordDescription = String(formulaRecord?.description || "").trim();
        if (formulaRecordDescription) return formulaRecordDescription;
        const formulaDisplay = formulaDisplays?.find(
          (fd) =>
            String(fd?.id || "").trim() === String(dish?.id || "").trim() ||
            String(fd?.dishId || "").trim() === String(dish?.id || "").trim()
        );
        const formulaDisplayDescription = String(formulaDisplay?.description || "").trim();
        if (formulaDisplayDescription) return formulaDisplayDescription;
      }
      return String(dish.description_fr || dish.description || dish.description_en || dish.description_es || dish.description_de || "").trim();
    }

    function getDishOptionsSource(dish: DishItem) {
      const values = [dish.description_fr, dish.description, dish.description_en, dish.description_es, dish.description_de]
        .map((value) => String(value || "").trim())
        .filter(Boolean);
      return [...new Set(values)].join("\n");
    }

    function getDishCleanDescription(dish: DishItem) {
      return getDishRawDescription(dish).split("__")[0]?.trim() || "";
    }

    function getDishCategoryLabel(dish: DishItem) {
      const fromId = dish.category_id != null ? categoryById.get(String(dish.category_id || "").trim()) : undefined;
      if (fromId) return getCategoryLabel(fromId);
      const fallbackText = String(dish.category || dish.categorie || "").trim();
      if (fallbackText) {
        const fromLabel = categoryByNormalizedLabel.get(normalizeCategoryKey(fallbackText));
        if (fromLabel) return getCategoryLabel(fromLabel);
        return fallbackText;
      }
      if (dish.category_id != null) return `CatÃƒÂ©gorie ${dish.category_id}`;
      return "Autres";
    }

    function resolveDishDestination(dish: DishItem | null | undefined): "cuisine" | "bar" {
      if (!dish) return "cuisine";
      const categoryId = String(dish.category_id || "").trim();
      if (categoryId) {
        const category = categoryById.get(categoryId);
        const destination = String(category?.destination || "").trim().toLowerCase();
        if (destination === "bar") return "bar";
        if (destination === "cuisine" || destination === "kitchen") return "cuisine";
      }
      const categoryLabel = getDishCategoryLabel(dish);
      return isDrink({ category: categoryLabel, destination: null }) ? "bar" : "cuisine";
    }

    function resolveDestinationForCategory(categoryId: unknown, fallbackCategoryLabel = ""): "cuisine" | "bar" {
      const normalizedCategoryId = String(categoryId || "").trim();
      if (normalizedCategoryId) {
        const category = categoryById.get(normalizedCategoryId);
        const destination = String(category?.destination || "").trim().toLowerCase();
        if (destination === "bar") return "bar";
        if (destination === "cuisine" || destination === "kitchen") return "cuisine";
      }
      return isDrink({ category: fallbackCategoryLabel, destination: null }) ? "bar" : "cuisine";
    }

    return {
      getCategoryLabel,
      resolveFormulaRecordForDish,
      getDishName,
      getFormulaCompositionDishName,
      getDishPrice,
      getFormulaPackPrice,
      getFormulaDisplayName,
      getDishRawDescription,
      getDishOptionsSource,
      getDishCleanDescription,
      getDishCategoryLabel,
      resolveDishDestination,
      resolveDestinationForCategory,
    };
  }, [
    formulas,
    formulaDisplays,
    formulaDisplayById,
    formulaPriceByDishId,
    categoryById,
    categoryByNormalizedLabel,
    normalizeCategoryKey,
  ]);
}
