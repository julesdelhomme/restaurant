import { useMemo } from "react";
import type { DishItem, ExtraChoice, FormulaSelectionDetails, ProductOptionChoice } from "../types";

export function useFormulaOptionModalController(params: {
  formulaOptionModalState: { categoryId: string; dishId: string } | null;
  resolveFormulaDishRecord: (dish: DishItem | null | undefined) => DishItem | null;
  dishById: Map<string, DishItem>;
  getFormulaDishConfig: (dish: DishItem) => {
    productOptions: ProductOptionChoice[];
    hasRequiredSides: boolean;
    sideOptions: string[];
    maxSides: number;
    askCooking: boolean;
    extras: ExtraChoice[];
  };
  getFormulaSelectionDetails: (categoryId: string) => FormulaSelectionDetails;
  emptyFormulaSelectionDetails: FormulaSelectionDetails;
  hasFormulaConfigOptionsForDish: (categoryId: string, dishId: string) => boolean;
  isProductOptionSelectionRequired: (dish: DishItem, options: ProductOptionChoice[]) => boolean;
  formulaDefaultOptionsByDishId: Map<string, string[]>;
  parsePriceNumber: (value: unknown) => number;
  setFormulaModalSelectionDetails: (
    updater: (prev: Record<string, FormulaSelectionDetails>) => Record<string, FormulaSelectionDetails>
  ) => void;
}) {
  const {
    formulaOptionModalState,
    resolveFormulaDishRecord,
    dishById,
    getFormulaDishConfig,
    getFormulaSelectionDetails,
    emptyFormulaSelectionDetails,
    hasFormulaConfigOptionsForDish,
    isProductOptionSelectionRequired,
    formulaDefaultOptionsByDishId,
    parsePriceNumber,
    setFormulaModalSelectionDetails,
  } = params;

  const formulaOptionModalCategoryId = String(formulaOptionModalState?.categoryId || "").trim();
  const formulaOptionModalDishId = String(formulaOptionModalState?.dishId || "").trim();
  const formulaOptionModalDish = formulaOptionModalDishId
    ? resolveFormulaDishRecord(dishById.get(formulaOptionModalDishId))
    : null;
  const formulaOptionModalConfig = formulaOptionModalDish ? getFormulaDishConfig(formulaOptionModalDish) : null;
  const formulaOptionModalDetails = formulaOptionModalCategoryId
    ? getFormulaSelectionDetails(formulaOptionModalCategoryId)
    : emptyFormulaSelectionDetails;
  const formulaOptionModalAllowMulti = Boolean(
    (formulaOptionModalDish as unknown as { allow_multi_select?: unknown } | null)?.allow_multi_select
  );
  const formulaOptionModalAvailableOptionIds = new Set(
    (formulaOptionModalConfig?.productOptions || [])
      .map((option) => String(option.id || "").trim())
      .filter(Boolean)
  );
  const formulaOptionModalDefaultOptionIds = (formulaOptionModalDishId
    ? formulaDefaultOptionsByDishId.get(formulaOptionModalDishId) || []
    : []
  ).filter((id) => formulaOptionModalAvailableOptionIds.has(String(id || "").trim()));
  const formulaOptionModalHasConfigOptions =
    formulaOptionModalCategoryId && formulaOptionModalDishId
      ? hasFormulaConfigOptionsForDish(formulaOptionModalCategoryId, formulaOptionModalDishId)
      : false;
  const formulaOptionModalHasChoices = Boolean(
    formulaOptionModalConfig &&
      (formulaOptionModalConfig.productOptions.length > 0 ||
        formulaOptionModalConfig.hasRequiredSides ||
        formulaOptionModalConfig.askCooking ||
        formulaOptionModalConfig.extras.length > 0 ||
        formulaOptionModalHasConfigOptions)
  );
  const formulaOptionModalOpen = Boolean(
    formulaOptionModalCategoryId && formulaOptionModalDishId && formulaOptionModalDish && formulaOptionModalHasChoices
  );
  const formulaOptionRequiresProductChoice = Boolean(
    formulaOptionModalDish &&
      formulaOptionModalConfig &&
      isProductOptionSelectionRequired(formulaOptionModalDish, formulaOptionModalConfig.productOptions)
  );
  const formulaOptionModalMissingRequired = Boolean(
    formulaOptionModalConfig &&
      ((formulaOptionRequiresProductChoice && formulaOptionModalDetails.selectedProductOptionIds.length === 0) ||
        (formulaOptionModalConfig.hasRequiredSides && formulaOptionModalDetails.selectedSides.length === 0) ||
        (formulaOptionModalConfig.askCooking && !String(formulaOptionModalDetails.selectedCooking || "").trim()))
  );

  const updateFormulaOptionModalDetails = (
    updater: (current: FormulaSelectionDetails) => FormulaSelectionDetails
  ) => {
    if (!formulaOptionModalCategoryId) return;
    setFormulaModalSelectionDetails((prev) => {
      const current = prev[formulaOptionModalCategoryId] || {
        selectedSideIds: [],
        selectedSides: [],
        selectedCooking: "",
        selectedProductOptionIds: [],
        selectedExtras: [],
      };
      return {
        ...prev,
        [formulaOptionModalCategoryId]: updater(current),
      };
    });
  };

  const handleFormulaOptionModalProductChange = (optionId: string, checked: boolean) => {
    updateFormulaOptionModalDetails((current) => {
      const nextIds = formulaOptionModalAllowMulti
        ? checked
          ? [...current.selectedProductOptionIds, optionId]
          : current.selectedProductOptionIds.filter((id) => id !== optionId)
        : checked
          ? [optionId]
          : [];
      return {
        ...current,
        selectedProductOptionIds: Array.from(new Set(nextIds)),
      };
    });
  };

  const handleFormulaOptionModalSideToggle = (sideId: string, sideLabel: string, checked: boolean, maxSides: number) => {
    updateFormulaOptionModalDetails((current) => {
      const nextPairs = current.selectedSideIds.map((id, index) => ({
        id,
        label: current.selectedSides[index] || id,
      }));
      const exists = nextPairs.some((entry) => entry.id === sideId);
      const canAdd = nextPairs.length < maxSides;
      const updatedPairs = checked
        ? exists
          ? nextPairs
          : canAdd
            ? [...nextPairs, { id: sideId, label: sideLabel }]
            : nextPairs
        : nextPairs.filter((entry) => entry.id !== sideId);
      return {
        ...current,
        selectedSideIds: updatedPairs.map((entry) => entry.id),
        selectedSides: updatedPairs.map((entry) => entry.label),
      };
    });
  };

  const handleFormulaOptionModalExtraToggle = (extra: ExtraChoice, checked: boolean) => {
    updateFormulaOptionModalDetails((current) => {
      const extraKey = `${extra.name}:${parsePriceNumber(extra.price).toFixed(2)}`;
      const nextExtras = checked
        ? [...current.selectedExtras, extra]
        : current.selectedExtras.filter(
            (value) => `${value.name}:${parsePriceNumber(value.price).toFixed(2)}` !== extraKey
          );
      return {
        ...current,
        selectedExtras: nextExtras,
      };
    });
  };

  const handleFormulaOptionModalCookingChange = (cookingLabel: string) => {
    updateFormulaOptionModalDetails((current) => ({
      ...current,
      selectedCooking: cookingLabel,
    }));
  };

  return useMemo(
    () => ({
      formulaOptionModalCategoryId,
      formulaOptionModalDishId,
      formulaOptionModalDish,
      formulaOptionModalConfig,
      formulaOptionModalDetails,
      formulaOptionModalAllowMulti,
      formulaOptionModalDefaultOptionIds,
      formulaOptionModalOpen,
      formulaOptionModalMissingRequired,
      handleFormulaOptionModalProductChange,
      handleFormulaOptionModalSideToggle,
      handleFormulaOptionModalExtraToggle,
      handleFormulaOptionModalCookingChange,
    }),
    [
      formulaOptionModalCategoryId,
      formulaOptionModalDishId,
      formulaOptionModalDish,
      formulaOptionModalConfig,
      formulaOptionModalDetails,
      formulaOptionModalAllowMulti,
      formulaOptionModalDefaultOptionIds,
      formulaOptionModalOpen,
      formulaOptionModalMissingRequired,
    ]
  );
}
