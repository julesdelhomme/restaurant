import { runHandleSubmitFastOrderService } from "../services/fast-order-submit-flow";
import { buildFastOrderItemsService } from "../services/fast-order-items";
import { tryInsertOrderWithFallbacks } from "../services/order-insert";
import { ensureTableIsOrderableForServerService } from "../services/table-orderable";
import { synchronizeCurrentStepPreparingService } from "../services/order-step-sync";

type Params = Record<string, any>;

export function useAdminFastOrderSubmission(params: Params) {
  const {
    supabase,
    restaurantId,
    scopedRestaurantId,
    selectedFastTableNumber,
    fastCoversInput,
    fastLines,
    fastOrderText,
    normalizeCoversValue,
    setFastMessage,
    setFastLoading,
    dishById,
    sideIdByAlias,
    normalizeLookupText,
    toCookingKeyFromLabel,
    parsePriceNumber,
    buildStableExtraId,
    normalizeFormulaStepValue,
    resolveFormulaSelectionDestination,
    resolveDestinationForCategory,
    readBooleanFlag,
    getFormulaPackPrice,
    buildLineInstructions,
    resolveInitialFormulaItemStatus,
    isDirectFormulaSequence,
    formulaDirectSendSequence,
    normalizeFormulaItemsForOrderPayload,
    resolveInitialCurrentStepFromItems,
    resolveLegacyServiceStepFromCurrentStep,
    fetchOrders,
    fetchActiveTables,
    setFastQtyByDish,
    setBaseLineComments,
    setFastOptionLines,
    setModalOpen,
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
  } = params;

  async function ensureTableIsOrderableForServer(tableNumber: number, covers?: number | null) {
    const targetRestaurantId = String(restaurantId || scopedRestaurantId || "").trim();
    return await ensureTableIsOrderableForServerService({
      supabaseClient: supabase,
      tableNumber,
      covers,
      targetRestaurantId,
      normalizeCoversValue,
    });
  }

  async function handleSubmitFastOrder() {
    setFastMessage("");

    function resetFastEntryForm() {
      setFastQtyByDish({});
      setBaseLineComments({});
      setFastOptionLines([]);
      setModalOpen(false);
      setModalDish(null);
      setModalQty(1);
      setModalSideChoices([]);
      setModalSelectedSides([]);
      setModalProductOptions([]);
      setModalSelectedProductOptionId("");
      setModalExtraChoices([]);
      setModalSelectedExtras([]);
      setModalCooking("");
      setModalKitchenComment("");
    }

    await runHandleSubmitFastOrderService({
      selectedFastTableNumber,
      fastCoversInput,
      fastLinesLength: fastLines.length,
      fastOrderText,
      normalizeCoversValue,
      setFastMessage,
      buildItems: (tableNumber: number) =>
        buildFastOrderItemsService({
          fastLines,
          tableNumber,
          dishById,
          sideIdByAlias,
          normalizeLookupText,
          toCookingKeyFromLabel,
          parsePriceNumber,
          buildStableExtraId,
          normalizeFormulaStepValue,
          resolveFormulaSelectionDestination,
          resolveDestinationForCategory,
          readBooleanFlag,
          getFormulaPackPrice,
          buildLineInstructions,
          resolveInitialFormulaItemStatus,
          isDirectFormulaSequence,
          formulaDirectSendSequence,
        }),
      normalizeFormulaItemsForOrderPayload,
      resolveInitialCurrentStepFromItems,
      synchronizeCurrentStepPreparingService,
      normalizeFormulaStepValue,
      parsePriceNumber,
      resolveLegacyServiceStepFromCurrentStep,
      restaurantId: String(restaurantId || ""),
      scopedRestaurantId: String(scopedRestaurantId || ""),
      setFastLoading,
      insertOrder: (payload: any, forcedOrderId?: string) =>
        tryInsertOrderWithFallbacks(supabase, payload, String(forcedOrderId || "")),
      ensureTableIsOrderableForServer,
      resetFastEntryForm,
      fetchOrders,
      fetchActiveTables,
    });
  }

  return { handleSubmitFastOrder };
}
