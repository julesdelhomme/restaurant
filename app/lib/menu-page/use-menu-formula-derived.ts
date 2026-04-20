"use client";

import { useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import {
  buildFormulaLinkedOptionsByCategory,
  findFormulaStepNodeByStep,
  getSelectableFormulaProductOptions,
  parseFormulaCategoryIds,
  parseOptionIdSet,
  pickMainFormulaStep,
  resolveMainStepFromStructure,
  type FormulaStepEntryRuntime,
} from "./formula-runtime";
import { normalizeFormulaStepValue } from "./formula-order-runtime";
import type {
  CategoryItem,
  Dish,
  FormulaDishLink,
  FormulaSelectionDetails,
  ProductOptionItem,
} from "./runtime";

type FormulaInfoItem = {
  name?: string;
  imageUrl?: string;
  dishId?: string | null;
  price?: number | null;
  description?: string | null;
  calories?: number | null;
  allergens?: string | null;
  formula_category_ids?: unknown;
  parent_dish_name?: string | null;
  formulaConfig?: unknown;
};

type FormulaDishConfig = {
  sideOptions: string[];
  hasRequiredSides: boolean;
  maxSides: number;
  askCooking: boolean;
  productOptions: ProductOptionItem[];
};

type UseMenuFormulaDerivedArgs = {
  selectedCategory: number;
  setSelectedCategory: (value: number) => void;
  categoryListLength: number;
  menuCategories: CategoryItem[];
  sortedCategories: CategoryItem[];
  dishes: Dish[];
  formulaDish: Dish | null;
  formulaSourceDish: Dish | null;
  selectedDish: Dish | null;
  formulaLinksByDishId: Map<string, FormulaDishLink[]>;
  formulaLinksByFormulaId: Map<string, FormulaDishLink[]>;
  formulaInfoById: Map<string, FormulaInfoItem>;
  formulaSelections: Record<string, string>;
  formulaSelectionDetails: Record<string, FormulaSelectionDetails>;
  formulaMainDetails: FormulaSelectionDetails;
  emptyFormulaSelectionDetails: FormulaSelectionDetails;
  setFormulaMainDetails: Dispatch<SetStateAction<FormulaSelectionDetails>>;
  setFormulaActiveCategoryId: Dispatch<SetStateAction<string>>;
  setFormulaSelections: Dispatch<SetStateAction<Record<string, string>>>;
  setFormulaSelectionDetails: Dispatch<SetStateAction<Record<string, FormulaSelectionDetails>>>;
  toBooleanFlag: (value: unknown) => boolean;
  getDishBasePrice: (dish: Dish) => number;
  normalizeLookupText: (value: unknown) => string;
  getCategoryLabel: (category: CategoryItem) => string;
  parseJsonObject: (value: unknown) => Record<string, any>;
  getDishName: (dish: Dish, lang: string) => string;
  lang: string;
  isDishAvailableNow: (dish: Dish) => boolean;
  getFormulaDishConfig: (dish: Dish) => FormulaDishConfig;
};

export function useMenuFormulaDerived({
  selectedCategory,
  setSelectedCategory,
  categoryListLength,
  menuCategories,
  sortedCategories,
  dishes,
  formulaDish,
  formulaSourceDish,
  selectedDish,
  formulaLinksByDishId,
  formulaLinksByFormulaId,
  formulaInfoById,
  formulaSelections,
  formulaSelectionDetails,
  formulaMainDetails,
  emptyFormulaSelectionDetails,
  setFormulaMainDetails,
  setFormulaActiveCategoryId,
  setFormulaSelections,
  setFormulaSelectionDetails,
  toBooleanFlag,
  getDishBasePrice,
  normalizeLookupText,
  getCategoryLabel,
  parseJsonObject,
  getDishName,
  lang,
  isDishAvailableNow,
  getFormulaDishConfig,
}: UseMenuFormulaDerivedArgs) {
  const selectedCategoryId = useMemo(() => {
    if (selectedCategory === 0) return null;
    const category = menuCategories[selectedCategory - 1];
    return category?.id ?? null;
  }, [selectedCategory, menuCategories]);

  useEffect(() => {
    const maxIndex = categoryListLength - 1;
    if (selectedCategory > maxIndex) {
      setSelectedCategory(Math.max(0, maxIndex));
    }
  }, [categoryListLength, selectedCategory, setSelectedCategory]);

  const categoryById = useMemo(() => {
    const map = new Map<string, CategoryItem>();
    sortedCategories.forEach((category) => {
      const key = String(category.id || "").trim();
      if (!key) return;
      map.set(key, category);
    });
    return map;
  }, [sortedCategories]);

  const dishById = useMemo(() => {
    const map = new Map<string, Dish>();
    dishes.forEach((dish) => map.set(String(dish.id || "").trim(), dish));
    return map;
  }, [dishes]);

  const linkedFormulasByDishId = useMemo(() => {
    const map = new Map<string, Dish[]>();
    formulaLinksByDishId.forEach((links, dishId) => {
      const formulas = links
        .map((link) => dishById.get(link.formulaDishId))
        .filter(
          (formula): formula is Dish =>
            Boolean(formula) && toBooleanFlag(((formula as unknown as any).is_formula ?? formula?.is_formula) as unknown)
        );
      if (formulas.length === 0) return;
      const uniqueById = new Map<string, Dish>();
      formulas.forEach((formula) => uniqueById.set(String(formula.id || "").trim(), formula));
      const sorted = [...uniqueById.values()].sort((a, b) => getDishBasePrice(a) - getDishBasePrice(b));
      map.set(dishId, sorted);
    });
    return map;
  }, [formulaLinksByDishId, dishById, toBooleanFlag, getDishBasePrice]);

  const formulaFallbackConfig = formulaDish ? getFormulaDishConfig(formulaDish) : null;

  const formulaDefaultOptionsByDishId = useMemo(() => {
    const map = new Map<string, string[]>();
    const formulaDishId = String(formulaDish?.id || "").trim();
    if (!formulaDishId) return map;
    const links = formulaLinksByFormulaId.get(formulaDishId) || [];
    links.forEach((link) => {
      const dishId = String(link.dishId || "").trim();
      if (!dishId) return;
      const defaults = Array.isArray(link.defaultProductOptionIds) ? link.defaultProductOptionIds : [];
      if (defaults.length > 0) map.set(dishId, defaults);
    });
    return map;
  }, [formulaDish, formulaLinksByFormulaId]);

  const getSelectableFormulaProductOptionsForDish = (dish: Dish, productOptions: ProductOptionItem[]) =>
    getSelectableFormulaProductOptions(dish, productOptions, formulaDefaultOptionsByDishId);

  const formulaDisplayById = useMemo(() => {
    const map = new Map<string, { name?: string; imageUrl?: string; description?: string | null; calories?: number | null }>();
    formulaInfoById.forEach((info, id) => {
      map.set(id, {
        name: info.name,
        imageUrl: info.imageUrl,
        description: info.description,
        calories: info.calories,
      });
    });
    return map;
  }, [formulaInfoById]);

  const getFormulaDisplayName = (formula: Dish | null) => {
    if (!formula) return "";
    const formulaId = String(formula.id || "").trim();
    const display = formulaDisplayById.get(formulaId);
    return String(display?.name || "").trim() || getDishName(formula, lang);
  };

  const formulaLinkedOptionsByCategory = useMemo(() => {
    const formulaDishId = String(formulaDish?.id || "").trim();
    if (!formulaDishId) return new Map<string, Set<string>>();
    const links = formulaLinksByFormulaId.get(formulaDishId) || [];
    return buildFormulaLinkedOptionsByCategory(links, dishById);
  }, [formulaDish, formulaLinksByFormulaId, dishById]);

  const normalizedFormulaCategoryIds = useMemo(() => {
    const raw = (formulaDish as unknown as any | null)?.formula_category_ids;
    return parseFormulaCategoryIds(raw);
  }, [formulaDish]);

  const formulaCategories = useMemo(() => {
    if (normalizedFormulaCategoryIds.length === 0) return [] as CategoryItem[];
    return normalizedFormulaCategoryIds.map((id) => categoryById.get(id)).filter(Boolean) as CategoryItem[];
  }, [normalizedFormulaCategoryIds, categoryById]);

  const formulaOptionsByCategory = useMemo(() => {
    const map = new Map<string, Dish[]>();
    if (formulaCategories.length === 0) return map;
    formulaCategories.forEach((category) => {
      const categoryId = String(category.id || "").trim();
      const linkedIds = formulaLinkedOptionsByCategory.get(categoryId);
      if (!linkedIds || linkedIds.size === 0) {
        map.set(categoryId, []);
        return;
      }
      const options = dishes
        .filter((dish) => String(dish.category_id || "").trim() === categoryId)
        .filter((dish) => dish.is_available !== false)
        .filter((dish) => isDishAvailableNow(dish))
        .filter((dish) => !toBooleanFlag((dish as any).is_formula))
        .filter((dish) => String(dish.id) !== String(formulaDish?.id || ""));
      const filteredOptions = options.filter((dish) => linkedIds.has(String(dish.id || "").trim()));
      const sourceDishId = String(formulaSourceDish?.id || "").trim();
      const sourceCategoryId = String(formulaSourceDish?.category_id || "").trim();
      if (sourceDishId && sourceCategoryId === categoryId) {
        const sourceDish = dishById.get(sourceDishId) || formulaSourceDish;
        if (sourceDish) {
          const exists = filteredOptions.some((dish) => String(dish.id || "").trim() === sourceDishId);
          if (!exists) filteredOptions.unshift(sourceDish);
        }
      }
      map.set(categoryId, filteredOptions);
    });
    return map;
  }, [
    dishes,
    formulaCategories,
    formulaDish,
    formulaLinkedOptionsByCategory,
    formulaSourceDish,
    dishById,
    isDishAvailableNow,
    toBooleanFlag,
  ]);

  const formulaSequenceByDishId = useMemo(() => {
    const map = new Map<string, number>();
    const formulaDishId = String(formulaDish?.id || "").trim();
    if (!formulaDishId) return map;
    const links = formulaLinksByFormulaId.get(formulaDishId) || [];
    links.forEach((link) => {
      const sequence = normalizeFormulaStepValue(link.step ?? link.sequence, true);
      if (sequence == null) return;
      const dishId = String(link.dishId || "").trim();
      if (!dishId) return;
      map.set(dishId, sequence);
    });
    return map;
  }, [formulaDish, formulaLinksByFormulaId]);

  type FormulaStepEntry = FormulaStepEntryRuntime & {
    dish: Dish | null;
    name_fr: string;
  };

  const formulaStepEntries = useMemo(() => {
    const formulaDishId = String(formulaDish?.id || "").trim();
    if (!formulaDishId) return [] as FormulaStepEntry[];
    const links = formulaLinksByFormulaId.get(formulaDishId) || [];
    return links
      .map((link) => {
        const step = normalizeFormulaStepValue(link.step ?? link.sequence, true);
        if (step == null || step <= 0) return null;
        const dishId = String(link.dishId || "").trim();
        const dish = dishById.get(dishId) || null;
        const categoryId = String(link.categoryId || dish?.category_id || "").trim();
        const nameFr = String(dish?.name_fr || dish?.name || "").trim();
        const sortOrder = Number.isFinite(Number(link.sortOrder)) ? Number(link.sortOrder) : null;
        return {
          step,
          dish,
          name_fr: nameFr,
          categoryId,
          sortOrder,
          isRequired: Boolean(link.isRequired),
          isMainDish: Boolean(link.isMainDish),
          priority: link.priority ?? null,
        } as FormulaStepEntry;
      })
      .filter(Boolean) as FormulaStepEntry[];
  }, [formulaDish, formulaLinksByFormulaId, dishById]);

  const mainFormulaStep = useMemo(() => {
    return pickMainFormulaStep(formulaStepEntries, {
      categoryById,
      normalizeLookupText,
      getCategoryLabel,
    });
  }, [formulaStepEntries, categoryById, normalizeLookupText, getCategoryLabel]);

  const formulaStructureConfig = useMemo(() => {
    const formulaId = String(formulaDish?.id || "").trim();
    const info = formulaId ? formulaInfoById.get(formulaId) : null;
    const raw =
      info?.formulaConfig ??
      (formulaDish as any)?.formula_structure ??
      (formulaDish as any)?.formule_structure ??
      (formulaDish as any)?.formula_config;
    return parseJsonObject(raw);
  }, [formulaDish, formulaInfoById, parseJsonObject]);

  const mainStepFromStructure = useMemo(() => {
    return resolveMainStepFromStructure(
      formulaStructureConfig,
      mainFormulaStep?.step ?? null,
      normalizeFormulaStepValue,
      toBooleanFlag
    );
  }, [formulaStructureConfig, mainFormulaStep, toBooleanFlag]);

  const mainFormulaCategoryKey = mainStepFromStructure ? `step:${mainStepFromStructure}` : "";
  const selectedMainFormulaDishId = mainFormulaCategoryKey
    ? String(formulaSelections[mainFormulaCategoryKey] || "").trim()
    : "";
  const selectedMainFormulaDish = selectedMainFormulaDishId ? dishById.get(selectedMainFormulaDishId) || null : null;
  const mainFormulaStepLabel =
    (selectedMainFormulaDish ? getDishName(selectedMainFormulaDish, lang) : "") ||
    mainFormulaStep?.dish?.name_fr ||
    mainFormulaStep?.name_fr ||
    "";
  const formulaMainConfig =
    (selectedMainFormulaDish ? getFormulaDishConfig(selectedMainFormulaDish) : null) || formulaFallbackConfig;
  const formulaDisplayName = formulaDish ? getFormulaDisplayName(formulaDish) : "";

  const mainFormulaStepNode = useMemo(() => {
    return findFormulaStepNodeByStep(formulaStructureConfig, mainStepFromStructure, normalizeFormulaStepValue);
  }, [formulaStructureConfig, mainStepFromStructure]);

  const mainStepAllowedOptionIds = useMemo(() => {
    const fromStep =
      (mainFormulaStepNode as any)?.allowed_options ??
      (mainFormulaStepNode as any)?.allowed_option_ids ??
      (mainFormulaStepNode as any)?.allowedOptions;
    return parseOptionIdSet(fromStep);
  }, [mainFormulaStepNode]);

  const mainStepExcludedOptionIds = useMemo(() => {
    const formulaId = String(formulaDish?.id || "").trim();
    const formulaInfo = formulaId ? (formulaInfoById.get(formulaId) as any) : null;
    const fromStep =
      (mainFormulaStepNode as any)?.excluded_options ??
      (mainFormulaStepNode as any)?.excluded_option_ids ??
      (mainFormulaStepNode as any)?.excludedOptions ??
      (formulaDish as any)?.excluded_main_options ??
      (formulaInfo as any)?.excluded_main_options ??
      formulaStructureConfig.excluded_main_options;
    return parseOptionIdSet(fromStep);
  }, [mainFormulaStepNode, formulaDish, formulaInfoById, formulaStructureConfig]);

  const formulaExcludedMainOptionIds = useMemo(() => {
    const formulaId = String(formulaDish?.id || "").trim();
    const formulaInfo = formulaId ? (formulaInfoById.get(formulaId) as any) : null;
    const formulaConfigNode =
      parseJsonObject(formulaInfo?.formulaConfig) || parseJsonObject((formulaDish as any)?.formula_config) || {};
    const rawExcluded =
      formulaConfigNode.excluded_main_options ??
      (formulaInfo as any)?.excluded_main_options ??
      (formulaDish as any)?.excluded_main_options ??
      [];
    return parseOptionIdSet(rawExcluded);
  }, [formulaDish, formulaInfoById, parseJsonObject]);

  const mainFormulaFilteredOptions = useMemo(() => {
    const allOptions = Array.isArray(formulaMainConfig?.productOptions) ? formulaMainConfig.productOptions : [];
    const availableOptions = allOptions.filter(
      (option) => !formulaExcludedMainOptionIds.has(String((option as any)?.id || "").trim())
    );
    return availableOptions.filter((option) => {
      const optionId = String((option as any)?.id || "").trim();
      if (!optionId) return false;
      if (mainStepAllowedOptionIds.size > 0 && !mainStepAllowedOptionIds.has(optionId)) return false;
      if (mainStepExcludedOptionIds.has(optionId)) return false;
      return true;
    });
  }, [formulaMainConfig, formulaExcludedMainOptionIds, mainStepAllowedOptionIds, mainStepExcludedOptionIds]);

  useEffect(() => {
    if (!mainFormulaFilteredOptions.length) return;
    const allowed = new Set(
      mainFormulaFilteredOptions.map((option) => String((option as any)?.id || "").trim()).filter(Boolean)
    );
    setFormulaMainDetails((current) => {
      const nextIds = current.selectedProductOptionIds.filter((id) => allowed.has(String(id || "").trim()));
      if (nextIds.length === current.selectedProductOptionIds.length) return current;
      return {
        ...current,
        selectedProductOptionIds: nextIds,
      };
    });
  }, [mainFormulaFilteredOptions, setFormulaMainDetails]);

  useEffect(() => {
    if (!formulaDish) {
      setFormulaActiveCategoryId("");
      return;
    }
    if (normalizedFormulaCategoryIds.length === 0) return;
    setFormulaActiveCategoryId((current) => {
      const normalizedCurrent = String(current || "").trim();
      if (normalizedCurrent && normalizedFormulaCategoryIds.includes(normalizedCurrent)) return normalizedCurrent;
      const firstMissing = normalizedFormulaCategoryIds.find((categoryId) => !String(formulaSelections[categoryId] || "").trim());
      return firstMissing || normalizedFormulaCategoryIds[0] || "";
    });
  }, [formulaDish, normalizedFormulaCategoryIds, formulaSelections, setFormulaActiveCategoryId]);

  const selectedDishLinkedFormulas = useMemo(() => {
    if (!selectedDish) return [] as Dish[];
    const dishId = String(selectedDish.id || "").trim();
    return linkedFormulasByDishId.get(dishId) || [];
  }, [selectedDish, linkedFormulasByDishId]);

  const isSelectedFormulaDish = selectedDish
    ? toBooleanFlag((selectedDish as any).is_formula ?? selectedDish.is_formula)
    : false;
  const selectedFormulaButtonDish =
    selectedDishLinkedFormulas[0] || (isSelectedFormulaDish && selectedDish ? selectedDish : null);

  const formulaAddDisabled = (() => {
    if (!formulaDish) return false;
    const formulaMainConfigValue = getFormulaDishConfig(formulaDish);
    if (formulaMainConfigValue) {
      if (formulaMainConfigValue.hasRequiredSides && formulaMainDetails.selectedSides.length === 0) return true;
      if (formulaMainConfigValue.askCooking && !String(formulaMainDetails.selectedCooking || "").trim()) return true;
    }
    const hasMissingCategory = normalizedFormulaCategoryIds.some((categoryId) => {
      const normalizedCategoryId = String(categoryId || "").trim();
      if (!normalizedCategoryId) return false;
      const options = formulaOptionsByCategory.get(normalizedCategoryId) || [];
      if (options.length === 0) return false;
      return !formulaSelections[normalizedCategoryId];
    });
    if (hasMissingCategory) return true;
    const selectedFormulaEntries = Object.entries(formulaSelections || {})
      .map(([rawCategoryId, rawDishId]) => ({
        categoryId: String(rawCategoryId || "").trim(),
        dishId: String(rawDishId || "").trim(),
      }))
      .filter((entry) => Boolean(entry.categoryId) && Boolean(entry.dishId));
    const hasMissingRequiredOptions = selectedFormulaEntries.some((entry) => {
      const normalizedCategoryId = String(entry.categoryId || "").trim();
      if (!normalizedCategoryId) return false;
      const selectedId = String(entry.dishId || "").trim();
      if (!selectedId) return false;
      const selectedDishForCategory = dishById.get(selectedId);
      if (!selectedDishForCategory) return false;
      const config = getFormulaDishConfig(selectedDishForCategory);
      const details = formulaSelectionDetails[normalizedCategoryId] || emptyFormulaSelectionDetails;
      const selectableProductOptions = getSelectableFormulaProductOptionsForDish(
        selectedDishForCategory,
        config.productOptions
      );
      const selectableOptionIdSet = new Set(
        selectableProductOptions.map((option) => String(option.id || "").trim()).filter(Boolean)
      );
      const hasSelectedSelectableOption = details.selectedProductOptionIds.some((id) =>
        selectableOptionIdSet.has(String(id || "").trim())
      );
      if (selectableProductOptions.length > 0 && !hasSelectedSelectableOption) {
        return true;
      }
      if (config.hasRequiredSides && details.selectedSides.length === 0) {
        return true;
      }
      if (config.askCooking && !String(details.selectedCooking || "").trim()) {
        return true;
      }
      return false;
    });
    return hasMissingRequiredOptions;
  })();

  useEffect(() => {
    if (!formulaDish || !formulaSourceDish) return;
    const sourceDishId = String(formulaSourceDish.id || "").trim();
    const sourceCategoryId = String(formulaSourceDish.category_id || "").trim();
    if (!sourceDishId || !sourceCategoryId) return;
    const options = formulaOptionsByCategory.get(sourceCategoryId) || [];
    if (!options.some((dish) => String(dish.id || "").trim() === sourceDishId)) return;
    setFormulaSelections((prev) => {
      if (prev[sourceCategoryId] === sourceDishId) return prev;
      return { ...prev, [sourceCategoryId]: sourceDishId };
    });
    const config = getFormulaDishConfig(formulaSourceDish);
    const rawDefaults = formulaDefaultOptionsByDishId.get(sourceDishId) || [];
    const allowedIds = new Set(config.productOptions.map((option) => String(option.id || "").trim()).filter(Boolean));
    const normalizedDefaults = rawDefaults.filter((id) => allowedIds.has(String(id || "").trim()));
    if (normalizedDefaults.length > 0) {
      const allowMulti = Boolean((formulaSourceDish as any)?.allow_multi_select);
      const nextDefaults = allowMulti ? normalizedDefaults : normalizedDefaults.slice(0, 1);
      setFormulaSelectionDetails((prev) => {
        const current = prev[sourceCategoryId];
        if (current && current.selectedProductOptionIds.length > 0) return prev;
        return {
          ...prev,
          [sourceCategoryId]: {
            selectedSideIds: [],
            selectedSides: [],
            selectedCooking: "",
            selectedProductOptionIds: nextDefaults,
          },
        };
      });
    }
  }, [
    formulaDish,
    formulaSourceDish,
    formulaOptionsByCategory,
    formulaDefaultOptionsByDishId,
    getFormulaDishConfig,
    setFormulaSelectionDetails,
    setFormulaSelections,
  ]);

  return {
    selectedCategoryId,
    categoryById,
    dishById,
    linkedFormulasByDishId,
    formulaDefaultOptionsByDishId,
    getSelectableFormulaProductOptionsForDish,
    formulaDisplayById,
    getFormulaDisplayName,
    normalizedFormulaCategoryIds,
    formulaCategories,
    formulaOptionsByCategory,
    formulaSequenceByDishId,
    formulaStepEntries,
    mainFormulaStep,
    mainStepFromStructure,
    mainFormulaCategoryKey,
    selectedMainFormulaDish,
    mainFormulaStepLabel,
    formulaMainConfig,
    formulaDisplayName,
    mainFormulaFilteredOptions,
    selectedDishLinkedFormulas,
    isSelectedFormulaDish,
    selectedFormulaButtonDish,
    formulaAddDisabled,
  };
}
