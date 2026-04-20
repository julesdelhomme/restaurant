import { useMemo } from "react";
import type { DishItem, FormulaDishLink } from "../types";

type Params = Record<string, any>;

export function useAdminFormulaModalDerived(params: Params) {
  const {
    formulaModalDish,
    formulaToConfig,
    formulaLinksByFormulaId,
    formulaStepGroups,
    normalizedFormulaCategoryIds,
    formulaOptionsByCategory,
    formulaModalSelections,
  } = params;

  const formulaDefaultOptionsByDishId = useMemo(() => {
    const map = new Map<string, string[]>();
    const formulaDishId = String(formulaModalDish?.id || "").trim();
    if (!formulaDishId) return map;
    const links: FormulaDishLink[] = formulaLinksByFormulaId.get(formulaDishId) || [];
    links.forEach((link) => {
      const dishId = String(link.dishId || "").trim();
      if (!dishId) return;
      const defaults = Array.isArray(link.defaultProductOptionIds) ? link.defaultProductOptionIds : [];
      if (defaults.length > 0) map.set(dishId, defaults);
    });
    return map;
  }, [formulaModalDish, formulaLinksByFormulaId]);

  const formulaMainDishExcludedOptionIds = useMemo(() => {
    const parseOptionIds = (value: unknown): string[] => {
      if (Array.isArray(value)) {
        return Array.from(new Set(value.map((entry) => String(entry || "").trim()).filter(Boolean)));
      }
      if (typeof value === "string") {
        const raw = value.trim();
        if (!raw) return [];
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return Array.from(new Set(parsed.map((entry) => String(entry || "").trim()).filter(Boolean)));
          }
        } catch {
          // Ignore malformed JSON and fallback CSV style.
        }
        return Array.from(
          new Set(
            raw
              .replace(/[{}]/g, "")
              .split(",")
              .map((entry) => String(entry || "").trim())
              .filter(Boolean)
          )
        );
      }
      return [];
    };
    const rawExcluded =
      (formulaModalDish as unknown as { excluded_main_options?: unknown } | null)?.excluded_main_options ??
      (formulaToConfig as unknown as { excluded_main_options?: unknown } | null)?.excluded_main_options;
    return parseOptionIds(rawExcluded);
  }, [formulaModalDish, formulaToConfig]);

  const formulaMainDishIdForOptions = useMemo(() => {
    const mainStepGroup = formulaStepGroups.find((group: { isMainDishStep?: boolean; mainDishId?: unknown }) => {
      return group.isMainDishStep && String(group.mainDishId || "").trim();
    });
    if (mainStepGroup?.mainDishId) return String(mainStepGroup.mainDishId || "").trim();
    return String((formulaToConfig as DishItem | null)?.id || (formulaModalDish as DishItem | null)?.id || "").trim();
  }, [formulaStepGroups, formulaToConfig, formulaModalDish]);

  const formulaAddDisabled = useMemo(() => {
    if (!formulaModalDish) return false;
    return normalizedFormulaCategoryIds.some((categoryId: string) => {
      const normalizedCategoryId = String(categoryId || "").trim();
      if (!normalizedCategoryId) return false;
      const options = formulaOptionsByCategory.get(normalizedCategoryId) || [];
      if (options.length === 0) return false;
      return !formulaModalSelections[normalizedCategoryId];
    });
  }, [formulaModalDish, normalizedFormulaCategoryIds, formulaOptionsByCategory, formulaModalSelections]);

  return {
    formulaDefaultOptionsByDishId,
    formulaMainDishExcludedOptionIds,
    formulaMainDishIdForOptions,
    formulaAddDisabled,
  };
}
