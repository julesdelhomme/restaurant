import type { DishItem, FormulaSelection } from "../types";
import { runHandleSelectDishService, runOpenOptionsModalService } from "../services/dish-selection-flow";
import { runOpenFormulaItemOptionsModal } from "../services/formula-option-modal";
import { runHandleAddFormulaLineService } from "../services/formula-add-line";
import { runAppendFormulaLineService } from "../services/formula-line-append";
import {
  runFormulaDishNeedsOptionsService,
  runHandleSelectFormulaService,
  runLoadDishOptionsFromDishesService,
} from "../services/formula-selection-actions";
import {
  runCloseFormulaModalService,
  runEnsureFormulaDishDetailsService,
  runOpenFormulaModalService,
} from "../services/formula-modal-actions";
import { runHandleAddOptionLineService } from "../services/option-line-add";
import { removeFastLineById, shouldSkipFastAddAction, updateFastLineComment } from "../utils/fast-line-actions";

type Params = Record<string, any>;

export function useAdminFormulaActions(params: Params) {
  const {
    dish,
    restaurantId,
    scopedRestaurantId,
    loadDishOptionsFromDishesService,
    setConfigModalOpen,
    setFormulaToConfig,
    setFormulaModalOpen,
    setFormulaModalDish,
    setFormulaModalSourceDish,
    setFormulaModalSelections,
    setFormulaModalSelectionDetails,
    setFormulaModalError,
    setFormulaModalItemDetailsOpen,
    setFormulaResolvedDishById,
    setFormulaOptionModalState,
    dishes,
    readBooleanFlag,
    fetchRestaurantFormulaRowByDishId,
    resolveFormulaModalOpeningData,
    formulaResolvedDishById,
    resolveFormulaDishRecord,
    parseDishProductOptions,
    fetchProductOptionsByProductId,
    normalizeLookupText,
    formulaMainDishIdForOptions,
    formulaMainDishExcludedOptionIds,
    parseDishExtras,
    loadDishExtrasFromRelations,
    getFormulaDishConfig,
    formulaDefaultOptionsByDishId,
    hasFormulaConfigOptionsForDish,
    parsePriceNumber,
    resolveFormulaSelectionDestination,
    resolveDishDestination,
    getDishCategoryLabel,
    getFormulaDisplayName,
    getFormulaPackPrice,
    getDishName,
    getDishPrice,
    dishById,
    makeLineId,
    setFastOptionLines,
    formulaModalDish,
    formulaOptionModalOpen,
    normalizedFormulaCategoryIds,
    formulaOptionsByCategory,
    formulaModalSelections,
    getFormulaSelectionDetails,
    isProductOptionSelectionRequired,
    formulaStepTitleByKey,
    formulaSequenceByDishId,
    getFormulaCompositionDishName,
    formulaUi,
    modalDish,
    modalProductOptions,
    modalSelectedProductOptionId,
    modalSideChoices,
    modalSelectedSides,
    modalSelectedExtras,
    modalCooking,
    modalKitchenComment,
    modalQty,
    isSideSelectionRequired,
    getSideMaxSelections,
    dishNeedsCooking,
    setModalOpen,
    setModalDish,
    setModalProductOptions,
    setModalSelectedProductOptionId,
    evaluateDishSelectionAction,
    onIncrementDishQty,
    setFastMessage,
    sidesLibrary,
    buildOptionsModalState,
    parseDishSideIds,
    setModalQty,
    setModalSideChoices,
    setModalSelectedSides,
    setModalExtraChoices,
    setModalSelectedExtras,
    setModalCooking,
    setModalKitchenComment,
    fastQtyByDish,
    setFastQtyByDish,
    lastFastAddRef,
    setBaseLineComments,
  } = params;

  const loadDishOptionsFromDishes = async (targetDish: DishItem) =>
    runLoadDishOptionsFromDishesService({
      dish: targetDish,
      restaurantId,
      scopedRestaurantId,
      loadDishOptionsFromDishesService,
    });

  const closeFormulaModal = () =>
    runCloseFormulaModalService({
      setConfigModalOpen,
      setFormulaToConfig,
      setFormulaModalOpen,
      setFormulaModalDish,
      setFormulaModalSourceDish,
      setFormulaModalSelections,
      setFormulaModalSelectionDetails,
      setFormulaModalError,
      setFormulaModalItemDetailsOpen,
      setFormulaResolvedDishById,
      setFormulaOptionModalState,
    });

  const openFormulaModal = async (formula: DishItem, sourceDish?: DishItem | null) =>
    runOpenFormulaModalService({
      formula,
      sourceDish,
      dishes,
      restaurantId,
      scopedRestaurantId,
      readBooleanFlag,
      fetchRestaurantFormulaRowByDishId,
      resolveFormulaModalOpeningData,
      setFormulaModalError,
      setFormulaModalDish,
      setFormulaModalSourceDish,
      setFormulaModalSelections,
      setFormulaModalSelectionDetails,
      setFormulaModalItemDetailsOpen,
      setFormulaOptionModalState,
      setFormulaResolvedDishById,
      setFormulaModalOpen,
    });

  const ensureFormulaDishDetails = async (targetDish: DishItem | null | undefined) =>
    runEnsureFormulaDishDetailsService({
      dish: targetDish,
      formulaResolvedDishById,
      loadDishOptionsFromDishes,
      setFormulaResolvedDishById,
    });

  const openFormulaItemOptionsModal = async (
    categoryId: string,
    optionDish: DishItem,
    resetSelectionDetails = true
  ) =>
    runOpenFormulaItemOptionsModal({
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
    });

  const appendFormulaLine = (formulaDish: DishItem, selections: FormulaSelection[]) =>
    runAppendFormulaLineService({
      formulaDish,
      selections,
      parsePriceNumber,
      shouldSkipFastAddAction,
      lastFastAddRef,
      resolveFormulaSelectionDestination,
      resolveDishDestination,
      getDishCategoryLabel,
      getFormulaDisplayName,
      getFormulaPackPrice,
      dishById,
      makeLineId,
      setFastOptionLines,
    });

  const formulaDishNeedsOptions = async (targetDish: DishItem) =>
    runFormulaDishNeedsOptionsService({
      dish: targetDish,
      ensureFormulaDishDetails: (d) => ensureFormulaDishDetails(d),
      getFormulaDishConfig,
    });

  const handleSelectFormula = async (formula: DishItem) =>
    runHandleSelectFormulaService({
      formula,
      dishes,
      setFormulaToConfig,
      openFormulaModal,
      setConfigModalOpen,
      setFormulaModalError,
      setFormulaModalOpen,
    });

  const handleSelectDish = async (targetDish: DishItem) =>
    runHandleSelectDishService({
      dish: targetDish,
      evaluateDishSelectionAction,
      dishes,
      loadDishOptionsFromDishes,
      parseDishProductOptions,
      fetchProductOptionsByProductId,
      parseDishExtras,
      loadDishExtrasFromRelations,
      dishNeedsCooking,
      parseDishSideIds,
      onOpenFormula: handleSelectFormula,
      onOpenOptions: openOptionsModal,
      onIncrementDishQty: (dishId: string) =>
        setFastQtyByDish((prev: Record<string, number>) => ({
          ...prev,
          [dishId]: Math.max(1, Number(prev[dishId] || 0) + 1),
        })),
      setFastMessage,
    });

  const openOptionsModal = async (targetDish: DishItem) =>
    runOpenOptionsModalService({
      dish: targetDish,
      loadDishOptionsFromDishes,
      buildOptionsModalState,
      sidesLibrary,
      parseDishSideIds,
      parseDishProductOptions,
      fetchProductOptionsByProductId,
      parseDishExtras,
      loadDishExtrasFromRelations,
      normalizeLookupText,
      setModalDish,
      setModalQty,
      setModalSideChoices,
      setModalSelectedSides,
      setModalProductOptions,
      setModalSelectedProductOptionId,
      setModalExtraChoices,
      setModalSelectedExtras,
      setModalCooking,
      setModalKitchenComment,
      setModalOpen,
      setFastMessage,
    });

  const handleAddFormulaLine = async () => {
    try {
      await runHandleAddFormulaLineService({
        formulaModalDish,
        formulaOptionModalOpen,
        normalizedFormulaCategoryIds,
        formulaOptionsByCategory,
        formulaModalSelections,
        dishById,
        resolveFormulaDishRecord,
        ensureFormulaDishDetails,
        getFormulaDishConfig,
        getFormulaSelectionDetails,
        isProductOptionSelectionRequired,
        formulaStepTitleByKey,
        parsePriceNumber,
        formulaSequenceByDishId,
        getFormulaCompositionDishName,
        resolveFormulaSelectionDestination,
        openFormulaItemOptionsModal,
        appendFormulaLine,
        closeFormulaModal,
        setFormulaModalError,
        formulaUi,
      });
    } catch (error) {
      console.error("Erreur ajout à la formule:", error);
    }
  };

  const handleAddOptionLine = () => {
    try {
      runHandleAddOptionLineService({
        modalDish,
        modalProductOptions,
        modalSelectedProductOptionId,
        modalSideChoices,
        modalSelectedSides,
        modalSelectedExtras,
        modalCooking,
        modalKitchenComment,
        modalQty,
        parsePriceNumber,
        isSideSelectionRequired,
        getSideMaxSelections,
        isProductOptionSelectionRequired,
        dishNeedsCooking,
        shouldSkipAdd: (signature: string) => shouldSkipFastAddAction(lastFastAddRef, signature),
        getDishCategoryLabel,
        resolveDishDestination,
        makeLineId,
        getDishName,
        getDishPrice,
        setFastOptionLines,
        setModalOpen,
        setModalDish,
        setModalProductOptions,
        setModalSelectedProductOptionId,
      });
    } catch (error) {
      console.error("Erreur ajout avec option:", error);
    }
  };

  const removeFastLine = (lineId: string) => {
    if (lineId.startsWith("base-")) {
      const dishId = lineId.replace("base-", "");
      setFastQtyByDish((prev: Record<string, number>) => {
        const next = { ...prev };
        delete next[dishId];
        return next;
      });
      setBaseLineComments((prev: Record<string, string>) => {
        const next = { ...prev };
        delete next[dishId];
        return next;
      });
      return;
    }
    setFastOptionLines((prev: unknown[]) => removeFastLineById(prev as any, lineId));
  };

  const updateLineKitchenComment = (lineId: string, comment: string) => {
    if (lineId.startsWith("base-")) {
      const dishId = lineId.replace("base-", "");
      setBaseLineComments((prev: Record<string, string>) => ({ ...prev, [dishId]: comment }));
      return;
    }
    setFastOptionLines((prev: unknown[]) => updateFastLineComment(prev as any, lineId, comment));
  };

  return {
    loadDishOptionsFromDishes,
    closeFormulaModal,
    openFormulaModal,
    ensureFormulaDishDetails,
    openFormulaItemOptionsModal,
    appendFormulaLine,
    formulaDishNeedsOptions,
    handleSelectFormula,
    handleSelectDish,
    openOptionsModal,
    handleAddFormulaLine,
    handleAddOptionLine,
    removeFastLine,
    updateLineKitchenComment,
  };
}
