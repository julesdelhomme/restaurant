import type { DishItem, ExtraChoice } from "../types";
import { parsePriceNumber } from "../utils/page-helpers";

type Args = {
  categoryId: string;
  optionDish: DishItem;
  resetSelectionDetails: boolean;
  setFormulaModalError: (value: string) => void;
  setFormulaModalSelections: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  resolveFormulaDishRecord: (dish: DishItem | null | undefined) => DishItem | null;
  ensureFormulaDishDetails: (dish: DishItem | null | undefined) => Promise<DishItem | null>;
  parseDishProductOptions: (dish: DishItem) => Array<{ id: string; name: string; price: number; required: boolean }>;
  fetchProductOptionsByProductId: (productId: string | number) => Promise<Array<{ id: string; name: string; price: number; required: boolean }>>;
  normalizeLookupText: (raw: unknown) => string;
  formulaMainDishIdForOptions: string;
  formulaMainDishExcludedOptionIds: string[];
  parseDishExtras: (dish: DishItem) => ExtraChoice[];
  loadDishExtrasFromRelations: (dishId: string | number) => Promise<ExtraChoice[]>;
  setFormulaResolvedDishById: (updater: (prev: Record<string, DishItem>) => Record<string, DishItem>) => void;
  getFormulaDishConfig: (dish: DishItem) => {
    productOptions: Array<{ id: string; name: string; price: number; required: boolean }>;
    hasRequiredSides: boolean;
    askCooking: boolean;
    extras: ExtraChoice[];
  };
  formulaDefaultOptionsByDishId: Map<string, string[]>;
  setFormulaModalSelectionDetails: (
    updater: (
      prev: Record<
        string,
        {
          selectedSideIds: string[];
          selectedSides: string[];
          selectedCooking: string;
          selectedProductOptionIds: string[];
          selectedExtras: ExtraChoice[];
        }
      >
    ) => Record<
      string,
      {
        selectedSideIds: string[];
        selectedSides: string[];
        selectedCooking: string;
        selectedProductOptionIds: string[];
        selectedExtras: ExtraChoice[];
      }
    >
  ) => void;
  hasFormulaConfigOptionsForDish: (categoryId: string, dishId: string) => boolean;
  setFormulaOptionModalState: (value: { categoryId: string; dishId: string } | null) => void;
};

export async function runOpenFormulaItemOptionsModal(args: Args) {
  const {
    categoryId,
    optionDish,
    resetSelectionDetails,
    setFormulaModalError,
    setFormulaModalSelections,
    resolveFormulaDishRecord,
    ensureFormulaDishDetails,
    parseDishProductOptions,
    fetchProductOptionsByProductId,
    normalizeLookupText,
    formulaMainDishIdForOptions,
    formulaMainDishExcludedOptionIds,
    parseDishExtras,
    loadDishExtrasFromRelations,
    setFormulaResolvedDishById,
    getFormulaDishConfig,
    formulaDefaultOptionsByDishId,
    setFormulaModalSelectionDetails,
    hasFormulaConfigOptionsForDish,
    setFormulaOptionModalState,
  } = args;

  try {
    const normalizedCategoryId = String(categoryId || "").trim();
    const optionId = String(optionDish.id || "").trim();
    if (!normalizedCategoryId || !optionId) return;

    setFormulaModalError("");
    setFormulaModalSelections((prev) => ({ ...prev, [normalizedCategoryId]: optionId }));

    const optionDishResolved = resolveFormulaDishRecord(optionDish) || optionDish;
    const loadedDish = (await ensureFormulaDishDetails(optionDishResolved)) || optionDishResolved;
    const inlineProductOptions = parseDishProductOptions(loadedDish);
    const dbProductOptions = optionId ? await fetchProductOptionsByProductId(optionId) : [];
    let relevantProductOptions = [...inlineProductOptions, ...dbProductOptions].filter((option, index, all) => {
      const optionIdKey = String(option.id || "").trim();
      const optionNameKey = normalizeLookupText(String(option.name || "").trim());
      return (
        all.findIndex((candidate) => {
          const candidateIdKey = String(candidate.id || "").trim();
          const candidateNameKey = normalizeLookupText(String(candidate.name || "").trim());
          return candidateIdKey === optionIdKey && candidateNameKey === optionNameKey;
        }) === index
      );
    });
    const normalizedMainDishId = String(formulaMainDishIdForOptions || "").trim();
    const isMainDishSelection = Boolean(normalizedMainDishId) && optionId === normalizedMainDishId;
    if (isMainDishSelection) {
      const excludedMainOptionIds = Array.from(
        new Set((Array.isArray(formulaMainDishExcludedOptionIds) ? formulaMainDishExcludedOptionIds : []).map((value) => String(value || "").trim()).filter(Boolean))
      );
      const excludedMainOptionIdSet = new Set(excludedMainOptionIds);
      relevantProductOptions = relevantProductOptions.filter((option) => !excludedMainOptionIdSet.has(String(option.id || "").trim()));
    }
    const inlineExtras = parseDishExtras(loadedDish);
    const dbExtras = inlineExtras.length === 0 && optionId ? await loadDishExtrasFromRelations(optionId) : [];
    const relevantExtras = inlineExtras.length > 0 ? inlineExtras : dbExtras;
    const enrichedDish: unknown = Object.assign({}, loadedDish);
    const enrichedDishRecord = enrichedDish as Record<string, unknown>;
    enrichedDishRecord.product_options = relevantProductOptions;
    if (relevantExtras.length > 0) {
      enrichedDishRecord.dish_options = relevantExtras.map((e) => ({ name: e.name, price: e.price }));
    }
    if (optionId) {
      setFormulaResolvedDishById((prev) => ({
        ...prev,
        [optionId]: enrichedDishRecord as DishItem,
      }));
    }
    const loadedConfig = getFormulaDishConfig(enrichedDishRecord as DishItem);
    const rawDefaultOptionIds = formulaDefaultOptionsByDishId.get(optionId) || [];
    const allowedOptionIds = new Set(loadedConfig.productOptions.map((option) => String(option.id || "").trim()).filter(Boolean));
    const normalizedDefaults = rawDefaultOptionIds.filter((id) => allowedOptionIds.has(String(id || "").trim()));
    const allowMultiDefaults = Boolean((loadedDish as unknown as { allow_multi_select?: unknown }).allow_multi_select);
    const nextDefaultOptionIds = isMainDishSelection ? [] : allowMultiDefaults ? normalizedDefaults : normalizedDefaults.slice(0, 1);

    setFormulaModalSelectionDetails((prev) => {
      const current = prev[normalizedCategoryId];
      if (!resetSelectionDetails && current) return prev;
      return {
        ...prev,
        [normalizedCategoryId]: {
          selectedSideIds: [],
          selectedSides: [],
          selectedCooking: "",
          selectedProductOptionIds: nextDefaultOptionIds,
          selectedExtras: [],
        },
      };
    });

    const hasFormulaConfigOptions = hasFormulaConfigOptionsForDish(normalizedCategoryId, optionId);
    const hasNestedFormulaOptions =
      loadedConfig.productOptions.length > 0 ||
      loadedConfig.hasRequiredSides ||
      loadedConfig.askCooking ||
      loadedConfig.extras.length > 0 ||
      hasFormulaConfigOptions;
    if (hasNestedFormulaOptions) setFormulaOptionModalState({ categoryId: normalizedCategoryId, dishId: optionId });
    else setFormulaOptionModalState(null);
  } catch (error) {
    console.error("Erreur chargement options formule:", error);
    setFormulaModalError("Erreur chargement options du plat.");
    setFormulaOptionModalState(null);
  }
}
