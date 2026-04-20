import { useMemo } from "react";

import type { DishItem, ExtraChoice, FormulaSelectionDetails, ProductOptionChoice } from "../types";

type FormulaStepGroup = {
  key: string;
  raw?: unknown;
};

type FormulaDishConfig = {
  sideOptions: string[];
  hasRequiredSides: boolean;
  maxSides: number;
  askCooking: boolean;
  productOptions: ProductOptionChoice[];
  extras: ExtraChoice[];
};

type Args = {
  formulaModalSelectionDetails: Record<string, FormulaSelectionDetails>;
  formulaStepGroups: FormulaStepGroup[];
  sideLabelById: Map<string, string>;
  formulaResolvedDishById: Record<string, DishItem>;
  parseDishSideIds: (dish: DishItem) => Array<string | number>;
  getSideMaxSelections: (dish: DishItem, choices: string[]) => number;
  dishNeedsCooking: (dish: DishItem) => boolean;
  parseDishProductOptions: (dish: DishItem) => ProductOptionChoice[];
  parseDishExtras: (dish: DishItem) => ExtraChoice[];
};

export function useAdminFormulaConfig(args: Args) {
  const {
    formulaModalSelectionDetails,
    formulaStepGroups,
    sideLabelById,
    formulaResolvedDishById,
    parseDishSideIds,
    getSideMaxSelections,
    dishNeedsCooking,
    parseDishProductOptions,
    parseDishExtras,
  } = args;

  return useMemo(() => {
    const emptyFormulaSelectionDetails: FormulaSelectionDetails = {
      selectedSideIds: [],
      selectedSides: [],
      selectedCooking: "",
      selectedProductOptionIds: [],
      selectedExtras: [],
    };

    function getFormulaSelectionDetails(categoryId: string) {
      const details = formulaModalSelectionDetails[categoryId];
      return details ? { ...emptyFormulaSelectionDetails, ...details } : emptyFormulaSelectionDetails;
    }

    function hasFormulaConfigOptionsValue(rawOptions: unknown, dishId: string): boolean {
      if (rawOptions == null) return false;
      if (Array.isArray(rawOptions)) return rawOptions.length > 0;
      if (typeof rawOptions === "string") {
        const trimmed = rawOptions.trim();
        if (!trimmed) return false;
        try {
          return hasFormulaConfigOptionsValue(JSON.parse(trimmed), dishId);
        } catch {
          return true;
        }
      }
      if (typeof rawOptions !== "object") return false;
      const record = rawOptions as Record<string, unknown>;
      const byDish = record[dishId];
      if (byDish !== undefined) return hasFormulaConfigOptionsValue(byDish, dishId);
      const generic = record.all ?? record.default ?? record.global ?? record.allowed ?? record.items ?? record.choices;
      if (generic !== undefined) return hasFormulaConfigOptionsValue(generic, dishId);
      return Object.values(record).some((value) => hasFormulaConfigOptionsValue(value, dishId));
    }

    function hasFormulaConfigOptionsForDish(categoryId: string, dishId: string): boolean {
      const normalizedCategoryId = String(categoryId || "").trim();
      const normalizedDishId = String(dishId || "").trim();
      if (!normalizedCategoryId || !normalizedDishId) return false;
      const step = formulaStepGroups.find((group) => String(group.key || "").trim() === normalizedCategoryId);
      if (!step || !step.raw || typeof step.raw !== "object") return false;
      const rawStep = step.raw as Record<string, unknown>;
      const directOptions = rawStep.options;
      if (hasFormulaConfigOptionsValue(directOptions, normalizedDishId)) return true;
      const nested = rawStep.formula_config;
      if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        const nestedOptions = (nested as Record<string, unknown>).options;
        if (hasFormulaConfigOptionsValue(nestedOptions, normalizedDishId)) return true;
      }
      return false;
    }

    function getFormulaDishConfig(dish: DishItem): FormulaDishConfig {
      const selectedSideIdsRaw = parseDishSideIds(dish);
      const sideOptions = selectedSideIdsRaw.map((id) => sideLabelById.get(String(id)) || String(id)).filter(Boolean);
      const hasRequiredSides = Boolean(dish.has_sides) || sideOptions.length > 0;
      const maxSides = getSideMaxSelections(dish, sideOptions);
      const askCooking = dishNeedsCooking(dish);
      const productOptions = parseDishProductOptions(dish);
      const extras = parseDishExtras(dish);
      return { sideOptions, hasRequiredSides, maxSides, askCooking, productOptions, extras };
    }

    function resolveFormulaDishRecord(dish: DishItem | null | undefined) {
      if (!dish) return null;
      const dishId = String(dish.id || "").trim();
      if (!dishId) return dish;
      return formulaResolvedDishById[dishId] || dish;
    }

    return {
      emptyFormulaSelectionDetails,
      getFormulaSelectionDetails,
      hasFormulaConfigOptionsForDish,
      getFormulaDishConfig,
      resolveFormulaDishRecord,
    };
  }, [
    formulaModalSelectionDetails,
    formulaStepGroups,
    sideLabelById,
    formulaResolvedDishById,
    parseDishSideIds,
    getSideMaxSelections,
    dishNeedsCooking,
    parseDishProductOptions,
    parseDishExtras,
  ]);
}
