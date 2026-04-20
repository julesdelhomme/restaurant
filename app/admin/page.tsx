"use client";

import { Suspense, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useScopedRestaurantId } from "./hooks/useAdminPageDerived";
import { useMojibakeRepair } from "./hooks/useMojibakeRepair";
import { useReadyOrderAlerts } from "./hooks/useReadyOrderAlerts";
import { useFormulaOptionModalController } from "./hooks/useFormulaOptionModalController";
import { useAdminLookups } from "./hooks/useAdminLookups";
import { useAdminDataFetchers } from "./hooks/useAdminDataFetchers";
import { useAdminCrudActions } from "./hooks/useAdminCrudActions";
import { useAdminFastEntryDerived } from "./hooks/useAdminFastEntryDerived";
import { useAdminFormulaActions } from "./hooks/useAdminFormulaActions";
import { useAdminDishHelpers } from "./hooks/useAdminDishHelpers";
import { useAdminFormulaWorkflow } from "./hooks/useAdminFormulaWorkflow";
import { useAdminFormulaConfig } from "./hooks/useAdminFormulaConfig";
import { useAdminFormulaSteps } from "./hooks/useAdminFormulaSteps";
import { useAdminFormulaModalDerived } from "./hooks/useAdminFormulaModalDerived";
import { useAdminServiceOrderBuckets } from "./hooks/useAdminServiceOrderBuckets";
import { useAdminServiceStepActions } from "./hooks/useAdminServiceStepActions";
import { useAdminFastOrderSubmission } from "./hooks/useAdminFastOrderSubmission";
import { useAdminFastOrderUi } from "./hooks/useAdminFastOrderUi";
import { useAdminCoreState } from "./hooks/useAdminCoreState";
import { useAdminFastEntryState } from "./hooks/useAdminFastEntryState";
import { useAdminFormulaState } from "./hooks/useAdminFormulaState";
import { useAdminParsersAndFormatters } from "./hooks/useAdminParsersAndFormatters";
import { useAdminRealtimeEffects } from "./hooks/useAdminRealtimeEffects";
import { AdminContentView } from "./components/AdminContentView";
import {
  dedupeOrderItems,
  getOrderItemProgress,
  hasExplicitItemStatus,
  isDrink,
  getItemPrepStatus,
  getItemStatusClass,
  getItemStatusLabel,
  getStableOrderItemKey,
  isItemReady,
  isItemServed,
  isPreparingLikeOrderStatus,
  parseItems,
  summarizeItems,
  type Item,
} from "./utils/order-items";
import {
  buildStableExtraId,
  makeLineId,
  FAST_ORDER_I18N,
  FORMULA_DIRECT_SEND_SEQUENCE,
  FORMULAS_CATEGORY_KEY,
  normalizeAssignedTables,
  normalizeLookupText,
  parseJsonObject,
  parsePriceNumber,
  readBooleanFlag,
  repairMojibakeUiText,
  resolveClientOrderingDisabled,
  resolveTotalTables,
  toCookingKeyFromLabel,
} from "./utils/page-helpers";
import {
  isKitchenOnlyNotification,
  logFetchOrdersError,
  normalizeCoversValue,
  normalizeNotificationRow,
  readCoversFromRow,
} from "./utils/admin-core-helpers";
import {
  isDirectFormulaSequence,
  normalizeCategoryKey,
  normalizeFormulaStepValue,
  resolveInitialFormulaItemStatus,
} from "./utils/formula-workflow-helpers";
import {
  dishNeedsCooking as dishNeedsCookingParser,
  getSideMaxSelections as getSideMaxSelectionsParser,
  isProductOptionSelectionRequired as isProductOptionSelectionRequiredParser,
  isSideSelectionRequired as isSideSelectionRequiredParser,
  parseDishExtras as parseDishExtrasParser,
  parseDishProductOptions as parseDishProductOptionsParser,
  parseDishSideIds as parseDishSideIdsParser,
} from "./utils/dish-option-parsers";
import {
  resolveFastLineUnitPrice as resolveFastLineUnitPricePricing,
} from "./utils/fast-line-pricing";
import {
  isPaidStatus,
  isServedOrArchivedStatus,
  normalizeOrderStatus,
  normalizeWorkflowItemStatus,
} from "./utils/order-status-workflow";
import {
  DISH_SELECT_BASE,
  DISH_SELECT_WITH_OPTIONS,
  fetchDishExtrasByDishId,
  fetchProductOptionsByProductId,
  fetchRestaurantFormulaRowByDishId,
} from "./services/formula-data";
import { loadDishOptionsFromDishesService } from "./services/dish-loader";
import { resolveFormulaModalOpeningData } from "./services/formula-modal";
import { buildOptionsModalState, evaluateDishSelectionAction } from "./services/fast-entry-actions";
import {
  FORMULA_ITEM_DETAILS_LABEL,
  FORMULA_OPTION_LOCKED_LABEL,
  FORMULA_OPTIONS_LABEL,
  FORMULA_UI_TEXT,
} from "./constants/formula-ui";
import { buildAdminContentViewProps } from "./services/build-admin-content-view-props";

export const dynamic = "force-dynamic";

function AdminContent() {
  const params = useParams<{ id?: string; restaurant_id?: string }>();
  const searchParams = useSearchParams();
  const scopedRestaurantId = useScopedRestaurantId(params, searchParams);
  const { orders, setOrders, serviceNotifications, setServiceNotifications, activeTables, setActiveTables, setActiveDishNames, activeTab, setActiveTab, tableNumberInput, setTableNumberInput, pinInput, setPinInput, coversInput, setCoversInput, saving, setSaving, message, setMessage, settings, setSettings, disableClientOrderingEnabled, setDisableClientOrderingEnabled, totalTables, setTotalTables, restaurantSettingsError, setRestaurantSettingsError, restaurantId, setRestaurantId, serverTableScopeEnabled, setServerTableScopeEnabled, serverAssignedTables, setServerAssignedTables, categories, setCategories, dishes, setDishes, isDishesLoading, setIsDishesLoading, formulas, setFormulas, formulaDisplays, setFormulaDisplays, sidesLibrary, setSidesLibrary, dishIdsWithLinkedExtras, setDishIdsWithLinkedExtras, tableNumbers, setTableNumbers, selectedCategory, setSelectedCategory, selectedFastTableNumber, setSelectedFastTableNumber } = useAdminCoreState();

  const { fastCoversInput, setFastCoversInput, fastQtyByDish, setFastQtyByDish, baseLineComments, setBaseLineComments, fastOptionLines, setFastOptionLines, fastLoading, setFastLoading, fastMessage, setFastMessage, kitchenNoteOpen, setKitchenNoteOpen, kitchenNoteText, setKitchenNoteText, kitchenNoteSending, setKitchenNoteSending, kitchenNoteFeedback, setKitchenNoteFeedback, modalOpen, setModalOpen, modalDish, setModalDish, modalQty, setModalQty, modalSideChoices, setModalSideChoices, modalSelectedSides, setModalSelectedSides, modalProductOptions, setModalProductOptions, modalSelectedProductOptionId, setModalSelectedProductOptionId, modalExtraChoices, setModalExtraChoices, modalSelectedExtras, setModalSelectedExtras, modalCooking, setModalCooking, modalKitchenComment, setModalKitchenComment } = useAdminFastEntryState();

  useMojibakeRepair(repairMojibakeUiText);

  const { formulaLinksByFormulaId, setFormulaLinksByFormulaId, setFormulaLinksByDishId, formulaDisplayById, setFormulaDisplayById, setFormulaDishIdsFromLinks, formulaPriceByDishId, setFormulaPriceByDishId, formulaModalOpen, setFormulaModalOpen, formulaModalDish, setFormulaModalDish, configModalOpen, setConfigModalOpen, formulaToConfig, setFormulaToConfig, formulaModalSourceDish, setFormulaModalSourceDish, formulaModalSelections, setFormulaModalSelections, formulaModalSelectionDetails, setFormulaModalSelectionDetails, formulaModalError, setFormulaModalError, formulaModalItemDetailsOpen, setFormulaModalItemDetailsOpen, formulaResolvedDishById, setFormulaResolvedDishById, formulaOptionModalState, setFormulaOptionModalState, sendingNextStepOrderIds, setSendingNextStepOrderIds, tablesAwaitingNextStepUntilMs, setTablesAwaitingNextStepUntilMs, sendingServiceStepOrderIds, setSendingServiceStepOrderIds, waitClockMs, setWaitClockMs } = useAdminFormulaState();
  const fastEntryInitializedRef = useRef(false);
  const selectedCategoryInitializedRef = useRef(false);
  const lastFastAddRef = useRef<{ key: string; at: number } | null>(null);
  const { readyAlertOrderIds, hasReadyTabAlert, triggerReadyOrderAlert, playReadyNotificationBeep } = useReadyOrderAlerts<Item>(
    orders,
    { parseItems, isItemReady, isItemServed }
  );
  const serverAssignedTablesSet = useMemo(
    () => new Set(serverAssignedTables.map((value) => Math.trunc(Number(value))).filter((value) => Number.isFinite(value) && value > 0)),
    [serverAssignedTables]
  );
  const serverAssignedTablesKey = useMemo(() => serverAssignedTables.join(","), [serverAssignedTables]);

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return String(data.session?.access_token || "").trim();
  };

  const canAccessAssignedTable = (tableNumberRaw: unknown) => {
    if (!serverTableScopeEnabled) return true;
    if (serverAssignedTablesSet.size === 0) return true;
    const tableNumber = Number(tableNumberRaw);
    if (!Number.isFinite(tableNumber) || tableNumber <= 0) return false;
    return serverAssignedTablesSet.has(Math.trunc(tableNumber));
  };

  function applyDisableClientOrdering(enabled: boolean) {
    setDisableClientOrderingEnabled(enabled);
    setActiveTab((current) => {
      if (current === "new-order") return "new-order";
      return current;
    });
  }

  const showNewOrderTab = true;
  const adminUiLang = useMemo<"fr" | "en" | "es" | "de">(() => {
    if (typeof window === "undefined") return "fr";
    const lang = String(window.navigator.language || "").toLowerCase();
    if (lang.startsWith("de")) return "de";
    if (lang.startsWith("es")) return "es";
    if (lang.startsWith("en")) return "en";
    return "fr";
  }, []);
  const fastOrderText = FAST_ORDER_I18N[adminUiLang];

  const {
    tableCoversByNumber,
    configuredTotalTables,
    tableSlots,
    categoryById,
    categoryByNormalizedLabel,
    dishById,
    sideIdByAlias,
    sideLabelById,
  } = useAdminLookups({
    activeTables,
    settings,
    totalTables,
    resolveTotalTables,
    categories,
    dishes,
    sidesLibrary,
    normalizeCategoryKey,
    parseJsonObject,
    normalizeLookupText,
  });

  const {
    getCategoryLabel,
    getDishName,
    getFormulaCompositionDishName,
    getDishPrice,
    getFormulaPackPrice,
    getFormulaDisplayName,
    getDishOptionsSource,
    getDishCleanDescription,
    getDishCategoryLabel,
    resolveDishDestination,
    resolveDestinationForCategory,
  } = useAdminDishHelpers({
    formulas,
    formulaDisplays,
    formulaDisplayById,
    formulaPriceByDishId,
    categoryById,
    categoryByNormalizedLabel,
    normalizeCategoryKey,
  });

  const { fetchServerNotificationScope, fetchOrders, fetchNotifications, fetchActiveTables, fetchActiveDishes, fetchRestaurantSettings, fetchFastEntryResources } = useAdminDataFetchers({ supabase, restaurantId, scopedRestaurantId, getAccessToken, normalizeAssignedTables, setServerTableScopeEnabled, setServerAssignedTables, canAccessAssignedTable, setOrders, logFetchOrdersError, isKitchenOnlyNotification, normalizeNotificationRow, setServiceNotifications, setActiveTables, dishes, readBooleanFlag, setActiveDishNames, resolveClientOrderingDisabled, resolveTotalTables, applyDisableClientOrdering, setSettings, setTotalTables, setRestaurantId, setRestaurantSettingsError, dishSelectWithOptions: DISH_SELECT_WITH_OPTIONS, dishSelectBase: DISH_SELECT_BASE, formulasCategoryKey: FORMULAS_CATEGORY_KEY, selectedCategory, fastEntryInitializedRef, selectedCategoryInitializedRef, setIsDishesLoading, setCategories, setDishes, setFormulas, setFormulaDisplays, setFormulaLinksByFormulaId, setFormulaLinksByDishId, setFormulaDisplayById, setFormulaDishIdsFromLinks, setFormulaPriceByDishId, setSidesLibrary, setTableNumbers, setSelectedFastTableNumber, setDishIdsWithLinkedExtras, setSelectedCategory, parseJsonObject, parsePriceNumber, normalizeCategoryKey, getCategoryLabel, getDishCategoryLabel });

  const { normalizeFormulaItemsForOrderPayload, resolveInitialCurrentStepFromItems, resolveLegacyServiceStepFromCurrentStep, resolveFormulaSelectionDestination, isFormulaOrderItem, resolveOrderServiceStep, resolveNextServiceStep, resolveWorkflowStepForItem, resolveOrderCurrentStep, resolveNextFormulaStep, resolveImmediateNextFormulaStep } = useAdminFormulaWorkflow({ formulaDirectSendSequence: FORMULA_DIRECT_SEND_SEQUENCE, categoryById, getCategoryLabel, resolveDishDestination, resolveDestinationForCategory, parseItems, isDrink, isItemServed, getItemPrepStatus });

  const { parseDishExtras, parseDishSideIds, dishNeedsCooking, parseDishProductOptions, isSideSelectionRequired, getSideMaxSelections, isProductOptionSelectionRequired, loadDishExtrasFromRelations, buildLineInstructions, deriveOrderStatusFromItems, resolveOrderItemLabel, getReadyItemEntries, resolveLastServedItemTimestamp } = useAdminParsersAndFormatters({ dishes, getDishName, getDishOptionsSource, parseDishExtrasParser, parseDishProductOptionsParser, parseDishSideIdsParser, dishNeedsCookingParser, isSideSelectionRequiredParser, getSideMaxSelectionsParser, isProductOptionSelectionRequiredParser, fetchDishExtrasByDishId, parseItems, isItemServed, isItemReady, isDrink, getItemPrepStatus });

  const formulaUi = FORMULA_UI_TEXT;
  const formulaItemDetailsLabel = FORMULA_ITEM_DETAILS_LABEL;
  const formulaOptionsLabel = FORMULA_OPTIONS_LABEL;
  const formulaOptionLockedLabel = FORMULA_OPTION_LOCKED_LABEL;

  const {
    formulaStepGroups,
    normalizedFormulaCategoryIds,
    formulaCategories,
    formulaOptionsByCategory,
    formulaNoDishesMessageByCategory,
    formulaStepTitleByKey,
    formulaSequenceByDishId,
  } = useAdminFormulaSteps({
    dishes,
    formulaModalDish,
    formulaToConfig,
    formulaModalSourceDish,
    formulaLinksByFormulaId,
    parseJsonObject,
  });

  const {
    formulaDefaultOptionsByDishId,
    formulaMainDishExcludedOptionIds,
    formulaMainDishIdForOptions,
    formulaAddDisabled,
  } = useAdminFormulaModalDerived({
    formulaModalDish,
    formulaToConfig,
    formulaLinksByFormulaId,
    formulaStepGroups,
    normalizedFormulaCategoryIds,
    formulaOptionsByCategory,
    formulaModalSelections,
  });

  const {
    emptyFormulaSelectionDetails,
    getFormulaSelectionDetails,
    hasFormulaConfigOptionsForDish,
    getFormulaDishConfig,
    resolveFormulaDishRecord,
  } = useAdminFormulaConfig({
    formulaModalSelectionDetails,
    formulaStepGroups,
    sideLabelById,
    formulaResolvedDishById,
    parseDishSideIds,
    getSideMaxSelections,
    dishNeedsCooking,
    parseDishProductOptions,
    parseDishExtras,
  });

  const {
    formulaOptionModalCategoryId,
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
  } = useFormulaOptionModalController({
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
  });

  useAdminRealtimeEffects({ formulaModalDish, formulaModalSourceDish, normalizedFormulaCategoryIds, formulaOptionsByCategory, formulaDefaultOptionsByDishId, resolveFormulaDishRecord, getFormulaDishConfig, setFormulaModalSelections, setFormulaModalSelectionDetails, scopedRestaurantId, fetchRestaurantSettings, fetchActiveTables, fetchActiveDishes, fetchFastEntryResources, fetchServerNotificationScope, restaurantId, serverTableScopeEnabled, serverAssignedTablesKey, supabase, fetchOrders, settings, setOrders, setServiceNotifications, canAccessAssignedTable, fetchNotifications, parseItems, dedupeOrderItems, getStableOrderItemKey, triggerReadyOrderAlert, isKitchenOnlyNotification, normalizeNotificationRow, playReadyNotificationBeep, setWaitClockMs });

  const { handleSaveTable, handleDeleteTable, fillFormForEdit, handleServeItems, handleSendKitchenNote, markNotificationRead } = useAdminCrudActions({ supabase, tableNumberInput, pinInput, coversInput, restaurantId, scopedRestaurantId, normalizeCoversValue, setMessage, setSaving, setPinInput, setCoversInput, fetchActiveTables, readCoversFromRow, setTableNumberInput, orders, fetchOrders, parseItems, deriveOrderStatusFromItems, setOrders, kitchenNoteText, setKitchenNoteFeedback, setKitchenNoteSending, setKitchenNoteText, setKitchenNoteOpen, setServiceNotifications });

  const { formulaParentDishIds, categoriesForFastEntry, effectiveSelectedFastCategoryKey, visibleFastEntryDishes, fastLines, resolveFastLineUnitPrice, fastTotal, fastItemCount, tableSelectOptions } = useAdminFastEntryDerived({ dishes, readBooleanFlag, categories, normalizeCategoryKey, getCategoryLabel, getDishCategoryLabel, formulasCategoryKey: FORMULAS_CATEGORY_KEY, selectedCategory, formulas, formulaLinksByFormulaId, getDishName, getDishPrice, parsePriceNumber, fastQtyByDish, baseLineComments, resolveDishDestination, fastOptionLines, resolveFastLineUnitPricePricing, dishById, getFormulaPackPrice, configuredTotalTables, tableNumbers });

  const { closeFormulaModal, openFormulaItemOptionsModal, handleSelectDish, handleAddFormulaLine, handleAddOptionLine, removeFastLine, updateLineKitchenComment } = useAdminFormulaActions({ restaurantId, scopedRestaurantId, loadDishOptionsFromDishesService, setConfigModalOpen, setFormulaToConfig, setFormulaModalOpen, setFormulaModalDish, setFormulaModalSourceDish, setFormulaModalSelections, setFormulaModalSelectionDetails, setFormulaModalError, setFormulaModalItemDetailsOpen, setFormulaResolvedDishById, setFormulaOptionModalState, dishes, readBooleanFlag, fetchRestaurantFormulaRowByDishId, resolveFormulaModalOpeningData, formulaResolvedDishById, resolveFormulaDishRecord, parseDishProductOptions, fetchProductOptionsByProductId, normalizeLookupText, formulaMainDishIdForOptions, formulaMainDishExcludedOptionIds, parseDishExtras, loadDishExtrasFromRelations, getFormulaDishConfig, formulaDefaultOptionsByDishId, hasFormulaConfigOptionsForDish, parsePriceNumber, resolveFormulaSelectionDestination, resolveDishDestination, getDishCategoryLabel, getFormulaDisplayName, getFormulaPackPrice, dishById, makeLineId, setFastOptionLines, formulaModalDish, formulaOptionModalOpen, normalizedFormulaCategoryIds, formulaOptionsByCategory, formulaModalSelections, getFormulaSelectionDetails, isProductOptionSelectionRequired, formulaStepTitleByKey, formulaSequenceByDishId, getFormulaCompositionDishName, formulaUi, modalDish, modalProductOptions, modalSelectedProductOptionId, modalSideChoices, modalSelectedSides, modalSelectedExtras, modalCooking, modalKitchenComment, modalQty, isSideSelectionRequired, getSideMaxSelections, dishNeedsCooking, setModalOpen, setModalDish, setModalProductOptions, setModalSelectedProductOptionId, evaluateDishSelectionAction, setFastMessage, sidesLibrary, buildOptionsModalState, parseDishSideIds, setModalQty, setModalSideChoices, setModalSelectedSides, setModalExtraChoices, setModalSelectedExtras, setModalCooking, setModalKitchenComment, setFastQtyByDish, lastFastAddRef, setBaseLineComments });

  const { handleSubmitFastOrder } = useAdminFastOrderSubmission({ supabase, restaurantId, scopedRestaurantId, selectedFastTableNumber, fastCoversInput, fastLines, fastOrderText, normalizeCoversValue, setFastMessage, setFastLoading, dishById, sideIdByAlias, normalizeLookupText, toCookingKeyFromLabel, parsePriceNumber, buildStableExtraId, normalizeFormulaStepValue, resolveFormulaSelectionDestination, resolveDestinationForCategory, readBooleanFlag, getFormulaPackPrice, buildLineInstructions, resolveInitialFormulaItemStatus, isDirectFormulaSequence, formulaDirectSendSequence: FORMULA_DIRECT_SEND_SEQUENCE, normalizeFormulaItemsForOrderPayload, resolveInitialCurrentStepFromItems, resolveLegacyServiceStepFromCurrentStep, fetchOrders, fetchActiveTables, setFastQtyByDish, setBaseLineComments, setFastOptionLines, setModalOpen, setModalDish, setModalQty, setModalSideChoices, setModalSelectedSides, setModalProductOptions, setModalSelectedProductOptionId, setModalExtraChoices, setModalSelectedExtras, setModalCooking, setModalKitchenComment });

  const { preparingOrders, readyOrders, tableStatusRows, pendingNotifications, resolvedActiveTab } = useAdminServiceOrderBuckets({ orders, serviceNotifications, tablesAwaitingNextStepUntilMs, waitClockMs, showNewOrderTab, activeTab, parseItems, isDrink, isItemServed, isPaidStatus, isServedOrArchivedStatus, getOrderItemProgress, hasExplicitItemStatus, normalizeWorkflowItemStatus, getItemPrepStatus, isPreparingLikeOrderStatus, normalizeOrderStatus, resolveOrderCurrentStep, resolveWorkflowStepForItem, resolveLastServedItemTimestampMs: resolveLastServedItemTimestamp, resolveNextFormulaStep, resolveImmediateNextFormulaStep });

  const { handleSendNextServiceStep } = useAdminServiceStepActions({ supabase, restaurantId, scopedRestaurantId, sendingNextStepOrderIds, setSendingNextStepOrderIds, sendingServiceStepOrderIds, setSendingServiceStepOrderIds, setOrders, setTablesAwaitingNextStepUntilMs, parseItems, normalizeFormulaStepValue, deriveOrderStatusFromItems, resolveLegacyServiceStepFromCurrentStep, resolveNextServiceStep, fetchOrders });

  const { handleFastTableSelection, handleFastCoversDecrement, handleFastCoversIncrement, canSubmitFastOrder, handleSessionCoversDecrement, handleSessionCoversIncrement } = useAdminFastOrderUi({ setSelectedFastTableNumber, tableCoversByNumber, setFastCoversInput, fastCoversInput, coversInput, fastLoading, fastLinesLength: fastLines.length, selectedFastTableNumber, normalizeCoversValue, setCoversInput });

  const viewProps = buildAdminContentViewProps({
    disableClientOrderingEnabled, restaurantSettingsError, pendingNotifications, markNotificationRead, showNewOrderTab, resolvedActiveTab,
    hasReadyTabAlert, setActiveTab, setKitchenNoteOpen, kitchenNoteOpen, kitchenNoteFeedback, kitchenNoteText, kitchenNoteSending,
    setKitchenNoteText, handleSendKitchenNote, tableSelectOptions, selectedFastTableNumber, fastCoversInput, fastItemCount, fastTotal,
    categoriesForFastEntry, effectiveSelectedFastCategoryKey, visibleFastEntryDishes, formulaParentDishIds, dishIdsWithLinkedExtras, fastLines,
    fastLoading, fastMessage, canSubmitFastOrder, handleFastTableSelection, handleFastCoversDecrement, handleFastCoversIncrement, setFastCoversInput,
    setSelectedCategory, handleSelectDish, removeFastLine, updateLineKitchenComment, handleSubmitFastOrder, readBooleanFlag, getFormulaDisplayName,
    getDishName, getFormulaPackPrice, getDishPrice, dishNeedsCooking, parseDishProductOptions, parseDishExtras, parseDishSideIds,
    resolveFastLineUnitPrice, buildLineInstructions, tableNumberInput, pinInput, coversInput, saving, message, configuredTotalTables, tableSlots,
    setTableNumberInput, setPinInput, setCoversInput, handleSessionCoversDecrement, handleSessionCoversIncrement, handleSaveTable, readCoversFromRow,
    fillFormForEdit, handleDeleteTable, preparingOrders, tableCoversByNumber, readyAlertOrderIds, normalizeCoversValue, resolveOrderItemLabel,
    normalizeLookupText, parseItems, isItemServed, hasExplicitItemStatus, normalizeWorkflowItemStatus, getItemPrepStatus, isPreparingLikeOrderStatus,
    isDrink, isFormulaOrderItem, resolveOrderServiceStep, summarizeItems, getItemStatusLabel, getItemStatusClass, readyOrders, getReadyItemEntries,
    handleServeItems, tableStatusRows, sendingNextStepOrderIds, handleSendNextServiceStep, dishes, formulaToConfig, configModalOpen, formulaModalOpen,
    formulaModalDish, closeFormulaModal, formulaUi, formulaCategories, formulaStepGroups, getCategoryLabel, formulaNoDishesMessageByCategory,
    formulaOptionsByCategory, formulaModalSelections, resolveFormulaDishRecord, dishById, getFormulaDishConfig, getFormulaSelectionDetails,
    formulaDefaultOptionsByDishId, hasFormulaConfigOptionsForDish, formulaModalItemDetailsOpen, setFormulaModalItemDetailsOpen,
    openFormulaItemOptionsModal, getFormulaCompositionDishName, getDishCleanDescription, formulaItemDetailsLabel, formulaOptionsLabel,
    parsePriceNumber, formulaOptionLockedLabel, sideIdByAlias, setFormulaModalError, setFormulaModalSelectionDetails, formulaModalError,
    formulaAddDisabled, handleAddFormulaLine, formulaOptionModalCategoryId, formulaOptionModalDish, formulaOptionModalConfig, formulaOptionModalDetails,
    formulaOptionModalAllowMulti, formulaOptionModalDefaultOptionIds, formulaOptionModalMissingRequired, setFormulaOptionModalState,
    handleFormulaOptionModalProductChange, handleFormulaOptionModalSideToggle, handleFormulaOptionModalExtraToggle, handleFormulaOptionModalCookingChange,
    modalOpen, modalDish, modalQty, modalSideChoices, modalSelectedSides, modalProductOptions, modalSelectedProductOptionId, modalExtraChoices,
    modalSelectedExtras, modalCooking, modalKitchenComment, isProductOptionSelectionRequired, isSideSelectionRequired, setModalOpen, setModalQty,
    setModalSelectedProductOptionId, setModalSelectedSides, setModalSelectedExtras, setModalCooking, setModalKitchenComment, handleAddOptionLine,
    isDishesLoading, tableNumbers,
  });

  return <AdminContentView {...viewProps} />;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Chargement de l&apos;administration...</div>}>
      <AdminContent />
    </Suspense>
  );
}
