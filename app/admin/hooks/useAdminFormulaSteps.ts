import { useMemo } from "react";

import type { CategoryItem, DishItem, FormulaDishLink } from "../types";
import { normalizeFormulaStepValue } from "../utils/formula-workflow-helpers";

type FormulaStepConfigRow = {
  step: number;
  category_ids: Array<string | number>;
  dish_ids: Array<string | number>;
  is_main_dish?: boolean;
  priority?: number | null;
  raw: Record<string, unknown>;
};

type FormulaStepGroup = {
  key: string;
  step: number;
  title: string;
  options: DishItem[];
  raw: Record<string, unknown>;
  noDishesMessage: string | null;
  isMainDishStep: boolean;
  mainDishId: string;
};

type Args = {
  dishes: DishItem[];
  formulaModalDish: DishItem | null;
  formulaToConfig: DishItem | null;
  formulaModalSourceDish: DishItem | null;
  formulaLinksByFormulaId: Map<string, FormulaDishLink[]>;
  parseJsonObject: (raw: unknown) => Record<string, unknown> | null;
};

export function useAdminFormulaSteps(args: Args) {
  const { dishes, formulaModalDish, formulaToConfig, formulaModalSourceDish, formulaLinksByFormulaId, parseJsonObject } = args;

  const formulaConfigParsed = useMemo(() => {
    const rawConfig =
      (formulaModalDish as unknown as { formula_structure?: unknown; formule_structure?: unknown; formula_config?: unknown } | null)?.formula_structure ??
      (formulaModalDish as unknown as { formula_structure?: unknown; formule_structure?: unknown; formula_config?: unknown } | null)?.formule_structure ??
      (formulaModalDish as unknown as { formula_config?: unknown } | null)?.formula_config ??
      (formulaToConfig as unknown as { formula_structure?: unknown; formule_structure?: unknown; formula_config?: unknown } | null)?.formula_structure ??
      (formulaToConfig as unknown as { formula_structure?: unknown; formule_structure?: unknown; formula_config?: unknown } | null)?.formule_structure ??
      (formulaToConfig as unknown as { formula_config?: unknown } | null)?.formula_config;
    let parsedConfig: unknown;

    if (typeof rawConfig === "string") {
      try {
        parsedConfig = JSON.parse(rawConfig);
      } catch {
        return [];
      }
    } else {
      parsedConfig = rawConfig ?? [];
    }

    if (parsedConfig && typeof parsedConfig === "object" && !Array.isArray(parsedConfig)) {
      const configNode = parsedConfig as Record<string, unknown>;
      const rawSteps = Array.isArray(configNode.steps)
        ? (configNode.steps as Array<Record<string, unknown>>)
        : Array.isArray(configNode.formula_structure)
          ? (configNode.formula_structure as Array<Record<string, unknown>>)
          : [];

      return rawSteps
        .map((rawStep, index) => {
          const stepNode = rawStep && typeof rawStep === "object" && !Array.isArray(rawStep) ? (rawStep as Record<string, unknown>) : {};
          const step = Math.max(1, Math.trunc(Number(stepNode.step ?? stepNode.step_number ?? stepNode.order ?? index + 1) || 1));
          const category_ids = Array.isArray(stepNode.category_ids)
            ? (stepNode.category_ids as Array<string | number>).map((v) => String(v || "").trim()).filter(Boolean)
            : [];
          const dish_ids = Array.isArray(stepNode.options)
            ? (stepNode.options as Array<string | number>).map((v) => String(v || "").trim()).filter(Boolean)
            : Array.isArray(stepNode.dish_ids)
              ? (stepNode.dish_ids as Array<string | number>).map((v) => String(v || "").trim()).filter(Boolean)
              : [];
          const is_main_dish = Boolean(stepNode.is_main_dish ?? stepNode.isMainDish ?? stepNode.main_dish);
          const priority = Number(stepNode.priority);
          return {
            step,
            category_ids,
            dish_ids,
            is_main_dish,
            priority: Number.isFinite(priority) ? priority : null,
            raw: stepNode,
          } as FormulaStepConfigRow;
        })
        .sort((a, b) => a.step - b.step);
    }

    return [];
  }, [formulaModalDish, formulaToConfig]);

  const formulaStepsConfig = useMemo(() => {
    const stepRecords = Array.isArray(formulaConfigParsed)
      ? formulaConfigParsed
      : formulaConfigParsed && typeof formulaConfigParsed === "object"
        ? Object.values(formulaConfigParsed)
        : [];

    const processedSteps = stepRecords
      .map((stepRaw, index) => {
        const step = stepRaw && typeof stepRaw === "object" && !Array.isArray(stepRaw) ? (stepRaw as Record<string, unknown>) : {};
        const stepNumber = Math.max(
          1,
          Math.trunc(Number(step.step ?? step.step_number ?? step.position ?? step.order ?? step._step_key ?? index + 1) || 1)
        );
        const category_ids = Array.isArray(step.category_ids)
          ? (step.category_ids as Array<string | number>).filter((value) => value != null && String(value).trim().length > 0)
          : [];
        const dish_ids = Array.isArray(step.dish_ids)
          ? (step.dish_ids as Array<string | number>).filter((value) => value != null && String(value).trim().length > 0)
          : [];
        return { step: stepNumber, category_ids, dish_ids, raw: step };
      })
      .sort((a, b) => a.step - b.step);

    if (processedSteps.length === 0) return [];
    return processedSteps.sort((a, b) => a.step - b.step);
  }, [formulaConfigParsed]);

  const formulaStepGroups = useMemo(() => {
    const allDishes = Array.isArray(dishes) ? dishes : [];
    const rawConfig =
      (formulaModalDish as unknown as { formula_config?: unknown } | null)?.formula_config ??
      (formulaToConfig as unknown as { formula_config?: unknown } | null)?.formula_config;
    let mainStepFromConfig: number | null = null;

    if (rawConfig && typeof rawConfig === "object" && !Array.isArray(rawConfig)) {
      const managerConfig = rawConfig as Record<string, unknown>;
      const parsedMainStep = Math.trunc(Number(managerConfig.main_dish_step) || 0);
      mainStepFromConfig = parsedMainStep > 0 ? parsedMainStep : null;
    }

    const explicitMainStep = formulaStepsConfig.find((step) => Boolean((step as any).is_main_dish))?.step ?? null;
    const prioritizedMainStep =
      [...formulaStepsConfig]
        .filter((step) => Number.isFinite(Number((step as any).priority)))
        .sort((a, b) => Number((a as any).priority) - Number((b as any).priority))[0]?.step ?? null;
    const resolvedMainStep = explicitMainStep || prioritizedMainStep || mainStepFromConfig || null;

    return formulaStepsConfig.map((step) => {
      const categoryIds = step.category_ids || [];
      const resolvedStepIsMainDish = resolvedMainStep === step.step;
      const isMainDishStep = Boolean((step as any).is_main_dish) || resolvedStepIsMainDish;
      const formulaNode = (formulaToConfig || formulaModalDish || {}) as Record<string, unknown>;
      const fallbackMainDishId = String(formulaNode.main_dish_id ?? formulaNode.dish_id ?? formulaNode.id ?? "").trim();
      const formulaMainDish = formulaNode.main_dish && typeof formulaNode.main_dish === "object" ? (formulaNode.main_dish as DishItem) : null;

      let safeDishIds = Array.isArray(step.dish_ids)
        ? (step.dish_ids as Array<string | number>).map((id) => String(id || "").trim()).filter(Boolean)
        : [];
      if (isMainDishStep && safeDishIds.length === 0 && fallbackMainDishId) safeDishIds = [fallbackMainDishId];

      const hasDishIdsField = "dish_ids" in step && Array.isArray(step.dish_ids);
      const resolvedMainDish =
        formulaMainDish ||
        (fallbackMainDishId ? allDishes.find((dish) => String(dish.id || "").trim() === fallbackMainDishId) || null : null) ||
        (formulaModalSourceDish ? (formulaModalSourceDish as DishItem) : null);
      const filteredByStepDishIds = allDishes.filter((dish) => {
        const dishId = String(dish.id || "").trim();
        return safeDishIds.some((id) => String(id || "").trim() === dishId);
      });
      const dishesToDisplay = isMainDishStep ? (resolvedMainDish ? [resolvedMainDish] : []) : filteredByStepDishIds;

      let options: typeof allDishes = dishesToDisplay;
      if (!isMainDishStep) {
        if (hasDishIdsField) {
          options = safeDishIds.length > 0 ? filteredByStepDishIds : [];
        } else if (categoryIds.length > 0) {
          options = allDishes.filter((d) => {
            const dishCategoryId = String(d.category_id || "").trim();
            return categoryIds.some((catId) => String(catId).trim() === dishCategoryId);
          });
        } else {
          options = [];
        }
      }

      let noDishesMessage: string | null = null;
      if (options.length === 0) {
        if (!isMainDishStep && hasDishIdsField && safeDishIds.length > 0) noDishesMessage = "Filtrage strict: aucun plat trouve.";
        else if (!isMainDishStep) noDishesMessage = "Aucun plat disponible dans ces categories.";
        else noDishesMessage = "Plat principal introuvable.";
      }

      const mainDishId = resolvedStepIsMainDish ? String(options[0]?.id || "").trim() : "";
      return {
        key: `step:${step.step}`,
        step: step.step,
        title: `Etape ${step.step} - Choisissez votre plat`,
        options,
        raw: step.raw,
        noDishesMessage,
        isMainDishStep: resolvedStepIsMainDish,
        mainDishId,
      } as FormulaStepGroup;
    });
  }, [dishes, formulaModalDish, formulaModalSourceDish, formulaStepsConfig, formulaToConfig]);

  const normalizedFormulaCategoryIds = useMemo(() => formulaStepGroups.map((group) => group.key), [formulaStepGroups]);

  const formulaCategories = useMemo(
    () =>
      formulaStepGroups.map(
        (group) =>
          ({
            id: group.key,
            name_fr: group.title,
          }) as CategoryItem
      ),
    [formulaStepGroups]
  );

  const formulaOptionsByCategory = useMemo(() => {
    const map = new Map<string, DishItem[]>();
    formulaStepGroups.forEach((group) => map.set(group.key, group.options));
    return map;
  }, [formulaStepGroups]);

  const formulaNoDishesMessageByCategory = useMemo(() => {
    const map = new Map<string, string | null>();
    formulaStepGroups.forEach((group) => map.set(group.key, group.noDishesMessage));
    return map;
  }, [formulaStepGroups]);

  const formulaStepTitleByKey = useMemo(() => new Map(formulaStepGroups.map((group) => [group.key, group.title])), [formulaStepGroups]);

  const formulaSequenceByDishId = useMemo(() => {
    const map = new Map<string, number>();
    formulaStepGroups.forEach((group) => {
      group.options.forEach((dish) => {
        const dishId = String(dish?.id || "").trim();
        if (!dishId || map.has(dishId)) return;
        map.set(dishId, group.step);
      });
    });
    const formulaDishId = String(formulaModalDish?.id || "").trim();
    if (!formulaDishId) return map;
    const links = formulaLinksByFormulaId.get(formulaDishId) || [];
    links.forEach((link) => {
      const dishId = String(link.dishId || "").trim();
      if (!dishId || map.has(dishId)) return;
      const sequence = normalizeFormulaStepValue(link.step ?? link.sequence, true);
      if (sequence == null) return;
      map.set(dishId, sequence);
    });
    return map;
  }, [formulaModalDish, formulaLinksByFormulaId, formulaStepGroups]);

  return {
    formulaConfigParsed,
    formulaStepsConfig,
    formulaStepGroups,
    normalizedFormulaCategoryIds,
    formulaCategories,
    formulaOptionsByCategory,
    formulaNoDishesMessageByCategory,
    formulaStepTitleByKey,
    formulaSequenceByDishId,
  };
}
