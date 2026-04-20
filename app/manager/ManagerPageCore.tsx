// -*- coding: utf-8 -*-
"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import DashboardOtpGate from "../components/DashboardOtpGate";
import ManagerMenuPanel from "./components/ManagerMenuPanel";
import ManagerDashboardSection from "./components/ManagerDashboardSection";
import ManagerHeaderSection from "./components/ManagerHeaderSection";
import ManagerOverlays from "./components/ManagerOverlays";
import DishEditorModal from "./components/DishEditorModal";
import ManagerAccessAlerts from "./components/ManagerAccessAlerts";
import ManagerSaasLayout from "./components/ManagerSaasLayout";
import { useManagerBootstrapRuntime } from "./hooks/useManagerBootstrapRuntime";
import { useManagerCoreState } from "./hooks/useManagerCoreState";
import { useManagerReportingRuntime } from "./hooks/useManagerReportingRuntime";
import { useManagerMenuCrud } from "./hooks/useManagerMenuCrud";
import { useManagerAdminActions } from "./hooks/useManagerAdminActions";
import { useManagerFormulaEditor } from "./hooks/useManagerFormulaEditor";
import { useManagerDishAssetsAndBadges } from "./hooks/useManagerDishAssetsAndBadges";
import { useManagerDishCollections } from "./hooks/useManagerDishCollections";
import { useManagerDishSave } from "./hooks/useManagerDishSave";
import { useManagerDishEditorLoad } from "./hooks/useManagerDishEditorLoad";
import { useManagerDishFormLifecycle } from "./hooks/useManagerDishFormLifecycle";
import { useManagerReviewInsights } from "./hooks/useManagerReviewInsights";
import { useManagerEditorUiState } from "./hooks/useManagerEditorUiState";
import { useManagerUiLabels } from "./hooks/useManagerUiLabels";
import { useManagerDomRepairEffect } from "./hooks/useManagerDomRepairEffect";
import { useManagerFormulaIndexes } from "./hooks/useManagerFormulaIndexes";
import { useManagerViewProps } from "./hooks/useManagerViewProps";
import {
  ANALYTICS_I18N,
  DEFAULT_LANGUAGE_LABELS,
  buildI18nToken,
  createEmptyHungerLevels,
  createLocalId,
  getLanguageColumnKeys,
  getExtraKey,
  normalizeHungerLevel,
  normalizeLanguageKey,
  normalizeText,
  parseHungerLevels,
  parseI18nToken,
  parseJsonObject,
  resolveLegacyHungerLevelLabel,
  serializeEnabledLanguageEntries,
} from "./managerRuntimeShared";
import {
  extractFormulaProductOptionsForManager,
  mergeProductOptions,
} from "./lib/supabase-mappers";
import { getManagerStatsLabels } from "./lib/manager-stats-labels";
import { getManagerIdentity, getManagerSectionTitle } from "./lib/manager-view-meta";
import {
  normalizeRestaurantId,
  resolveImpersonateMode,
  resolveScopedRestaurantId,
} from "./lib/manager-route-utils";
import { buildManagerAdminActionsArgs } from "./lib/hook-args/manager-admin-actions-args";
import { buildManagerBootstrapRuntimeConfig } from "./lib/hook-args/manager-bootstrap-runtime-config";
import { buildManagerDishAssetsArgs } from "./lib/hook-args/manager-dish-assets-args";
import { buildManagerDishEditorLoadArgs } from "./lib/hook-args/manager-dish-editor-load-args";
import { buildManagerMenuCrudArgs } from "./lib/hook-args/manager-menu-crud-args";
import { buildManagerReportingRuntimeConfig } from "./lib/hook-args/manager-reporting-runtime-config";
import { buildManagerSharedBundlesConfig } from "./lib/hook-args/manager-shared-bundles-config";
import { buildManagerSharedBundles } from "./lib/hook-args/manager-shared-bundles";
import { buildManagerViewPropsArgs } from "./lib/hook-args/manager-view-props-args";
import { normalizeCategoryDestination, normalizeSortOrder } from "./lib/manager-category-utils";
import {
  normalizeDayKey,
  normalizeTimeInput,
  parseDishAvailableDays,
  parseTimeToMinutes,
} from "./lib/manager-schedule-utils";
import {
  buildDescriptionWithOptions,
  getDishDisplayDescription,
  hasMissingColumnError,
  isMissingTableError,
  mergeExtrasUnique,
  normalizeOptionIds,
  parseAutoPrintSetting,
  parseCategoryConfig,
  parseDisplaySettingsFromRow,
  parseDishOptionsRowsToExtras,
  parseExtrasFromUnknown,
  parseOptionsFromDescription,
  resolveBaseDishIdentityFromFormulaConfig,
  restoreRawDishFromFormulaSnapshot,
  toBoolean,
  toLoggableSupabaseError,
  writeLocalClientOrderingDisabled,
  extractMissingColumnName,
} from "./lib/runtime-data-utils";
import {
  ALLERGEN_OPTIONS,
  COOKING_TRANSLATION_ORDER,
  DEFAULT_COOKING_TRANSLATIONS,
  DEFAULT_TOTAL_TABLES,
  DISH_AVAILABLE_DAY_OPTIONS,
  DISH_IMAGES_BUCKET,
  FORMULA_DIRECT_SEND_SEQUENCE,
  FORMULA_PARENT_STEP_KEY,
  HUNGER_LEVELS,
  MAX_TOTAL_TABLES,
  MENU_FONT_OPTIONS,
  PREDEFINED_LANGUAGE_OPTIONS,
  RESTAURANT_BANNERS_BUCKET,
  RESTAURANT_LOGOS_BUCKET,
  STANDARD_FORMULA_ALLERGENS,
  buildDishStepMapFromFormulaSteps,
  buildFormulaStepsFromDishStepMap,
  createDefaultAllergenLibrary,
  extractAllergenNamesFromDishPayload,
  isHexColorDark,
  mergeAllergenLibraryRows,
  normalizeBackgroundOpacity,
  normalizeCardLayout,
  normalizeCardStyle,
  normalizeDensityStyle,
  normalizeFormulaStepEntries,
  normalizeHexColor,
  normalizeManagerFontFamily,
  normalizeMenuLayout,
  normalizeOpacityPercent,
  normalizeTotalTables,
  normalizeWelcomePopupType,
  parseAllergenLibrary,
  parseCardLayoutToken,
  parseCookingTranslations,
  parseObjectRecord,
  repairMojibakeUiText,
  resolveSupabasePublicUrl,
  supabaseKey,
  supabaseUrl,
} from "./lib/runtime-core-utils";

export default function MenuManager() {
  const router = useRouter();
  const params = useParams<{ id?: string; restaurant_id?: string }>();
  const searchParams = useSearchParams();
  const scopedRestaurantId = resolveScopedRestaurantId(params, searchParams);
  const impersonateMode = resolveImpersonateMode(searchParams);
  const managerCoreState = useManagerCoreState();
  const {
    refs: {
      hasAllergenLibraryTableRef, hasRestaurantLanguagesTableRef, dishesRefetchLockUntilRef,
      lastSaveTimeRef, isSavingRef, dishesRefetchLockTimerRef,
    },
    state: {
      dishes, migrating, formulaLinksByFormulaId, formulaLinksByDishId, formulaLinkDefaultOptionsByFormulaId,
      formulaMainDishOptionsByFormulaId, formulaLinkSequenceByFormulaId, formulaLinkDisplayByFormulaId, orders, reviews,
      stats, restaurant, categories, subCategories, autoPrintKitchen, showCaloriesClient, heroEnabled, heroBadgeType,
      consultationModeEnabled, searchBarEnabled, totalTables, activeLanguageCodes, languageLabels, cookingTranslations,
      allergenLibrary, newAllergenFr, languageInput, languageCodeInput, languagePresetToAdd, criticalStock,
      subCategoryRows, sidesLibrary, tableAssignments, analyticsTab, analyticsRange, activeManagerTab, reportExportedRange,
      isPurgingHistory, managerUserEmail, passwordForm, passwordUpdateLoading, passwordUpdateMessage, passwordUpdateError,
      managerOtpEnabled, managerOtpLoading, managerOtpMessage, managerOtpError, forceFirstLoginPasswordChange,
      isRestaurantLoading, isSuperAdminSession, managerAccessError, globalManagerNotification, restaurantForm,
    },
    setters: {
      setDishes, setMigrating, setFormulaLinksByFormulaId, setFormulaLinksByDishId, setFormulaLinkDefaultOptionsByFormulaId,
      setFormulaMainDishOptionsByFormulaId, setFormulaLinkSequenceByFormulaId, setFormulaLinkDisplayByFormulaId, setOrders,
      setReviews, setStats, setRestaurant, setCategories, setSubCategories, setAutoPrintKitchen, setShowCaloriesClient,
      setHeroEnabled, setHeroBadgeType, setConsultationModeEnabled, setSearchBarEnabled, setTotalTables,
      setActiveLanguageCodes, setLanguageLabels, setCookingTranslations, setAllergenLibrary, setNewAllergenFr,
      setLanguageInput, setLanguageCodeInput, setLanguagePresetToAdd, setCriticalStock, setSubCategoryRows,
      setSidesLibrary, setTableAssignments, setAnalyticsTab, setAnalyticsRange, setActiveManagerTab, setReportExportedRange,
      setIsPurgingHistory, setManagerUserEmail, setPasswordForm, setPasswordUpdateLoading, setPasswordUpdateMessage,
      setPasswordUpdateError, setManagerOtpEnabled, setManagerOtpLoading, setManagerOtpMessage, setManagerOtpError,
      setForceFirstLoginPasswordChange, setIsRestaurantLoading, setIsSuperAdminSession, setManagerAccessError,
      setGlobalManagerNotification, setRestaurantForm,
    },
  } = managerCoreState;
  const { formulaDishes, dishesById } = useManagerFormulaIndexes({
    dishes,
    formulaLinksByFormulaId,
  });
  const managerEditorUiState = useManagerEditorUiState({ createEmptyHungerLevels });
  const {
    selectedDishLanguageCode, setSelectedDishLanguageCode, selectedOptionLanguageCode, setSelectedOptionLanguageCode,
    selectedExtraLanguageCode, setSelectedExtraLanguageCode, selectedFormulaLanguageCode, setSelectedFormulaLanguageCode,
    formulaAllergens, selectedFormulaDishes, setFormulaAllergens, setFormData, showDishModal, formData, editingDish,
    setIsRadarLoaded, setFormulaMainOptionsFormulaId, setSelectedFormulaDishes, setDishSteps, extrasTouched,
    setLoadedDishExtras, excludedMainOptionsTouched, setSelectedMainDishOptions, setExcludedMainOptionsTouched,
    setMainDishStep, setFormulaDescription, setFormulaImage, setFormulaKcal, setFormulaImagePreviewUrl,
    setIsUploadingRestaurantLogo, setIsUploadingRestaurantBanner, setIsUploadingRestaurantBackground,
    setIsUploadingRestaurantWelcome, setImagePreviewUrl, setIsUploadingImage, setDishToDelete,
    setShowDeleteModal, setEditingDish, dishToDelete,
  } = managerEditorUiState;


  useManagerDomRepairEffect({ repairMojibakeUiText });

  const managerUiLabels = useManagerUiLabels({ ANALYTICS_I18N });
  const sevenDaysAgoIso = managerUiLabels.sevenDaysAgoIso;
  const managerReviewInsights = useManagerReviewInsights({
    reviews,
    dishes,
    normalizeText,
  });
  const managerStatsLabels = getManagerStatsLabels(managerUiLabels.managerUiLang);

  const {
    persistDisplaySettings,
    fetchTableAssignments,
    fetchRestaurant,
    fetchCategories,
    fetchDishes,
    fetchReviews,
    fetchCriticalStock,
    fetchSubCategories,
    fetchSidesLibrary,
    fetchAllergenLibrary,
    fetchOrders,
    calculateStats,
  } = useManagerBootstrapRuntime(
    buildManagerBootstrapRuntimeConfig({
      scopedRestaurantId,
      supabase,
      impersonateMode,
      sevenDaysAgoIso,
      managerCoreState,
      managerEditorUiState,
      normalizeLanguageKey,
      normalizeRestaurantId,
      parseJsonObject,
      parseI18nToken,
      createLocalId,
      normalizeText,
      serializeEnabledLanguageEntries,
      normalizeTotalTables,
    })
  );
  const managerDishFormLifecycle = useManagerDishFormLifecycle({
    ...managerEditorUiState,
    categories,
    createEmptyHungerLevels,
  });

  const managerDishEditorLoad = useManagerDishEditorLoad(
    buildManagerDishEditorLoadArgs({
      managerEditorUiState,
      runtime: { activeLanguageCodes, scopedRestaurantId },
      formulaMaps: {
        formulaLinksByDishId,
        formulaLinksByFormulaId,
        formulaLinkSequenceByFormulaId,
        formulaLinkDefaultOptionsByFormulaId,
        formulaLinkDisplayByFormulaId,
      },
      helpers: {
        parseOptionsFromDescription,
        parseObjectRecord,
        parseHungerLevels,
        normalizeHungerLevel,
        resolveLegacyHungerLevelLabel,
        parseJsonObject,
        normalizeLanguageKey,
        getLanguageColumnKeys,
        toBoolean,
        hasMissingColumnError,
        normalizeFormulaStepEntries,
        buildDishStepMapFromFormulaSteps,
        buildFormulaStepsFromDishStepMap,
        parseExtrasFromUnknown,
        normalizeText,
        mergeExtrasUnique,
        createLocalId,
        parseDishOptionsRowsToExtras,
        parseI18nToken,
        getDishDisplayDescription,
        parseDishAvailableDays,
        normalizeTimeInput,
      },
      core: { allergenLibrary },
    })
  );

  const managerDishAssetsAndBadges = useManagerDishAssetsAndBadges(
    buildManagerDishAssetsArgs({
      scopedRestaurantId,
      managerCoreState,
      managerEditorUiState,
      fetchDishes,
    })
  );
  const { updateDishBadgeColumnAtomic } = managerDishAssetsAndBadges;

  const managerDishCollections = useManagerDishCollections({
    dishes,
    categories,
    editingDish,
    getDishDisplayDescription,
    parseOptionsFromDescription,
  });
  const {
    getCategoryLabel,
    sortedCategories,
    preparedDishesSorted,
    preparedDishesGroupedByCategory,
    formulaSelectableDishGroups,
  } = managerDishCollections;

  const managerFormulaEditor = useManagerFormulaEditor({
    ...managerEditorUiState,
    ...managerDishCollections,
    editingDish,
    scopedRestaurantId,
    dishes,
    toBoolean,
    setFormulaLinkDisplayByFormulaId,
    createLocalId,
    normalizeLanguageKey,
    FORMULA_PARENT_STEP_KEY,
    normalizeFormulaStepEntries,
    buildFormulaStepsFromDishStepMap,
    buildDishStepMapFromFormulaSteps,
    FORMULA_DIRECT_SEND_SEQUENCE,
  });
  const { readFormulaDefaultOptionIdsMap } = managerFormulaEditor;

  const managerDishSave = useManagerDishSave({
    ...managerEditorUiState,
    scopedRestaurantId,
    editingDish,
    toBoolean,
    activeLanguageCodes,
    normalizeLanguageKey,
    normalizeText,
    allergenLibrary,
    parseHungerLevels,
    normalizeHungerLevel,
    resolveLegacyHungerLevelLabel,
    parseJsonObject,
    parseObjectRecord,
    normalizeFormulaStepEntries,
    buildFormulaStepsFromDishStepMap,
    buildDishStepMapFromFormulaSteps,
    readFormulaDefaultOptionIdsMap,
    formulaMainDishOptionsByFormulaId,
    resolveBaseDishIdentityFromFormulaConfig,
    restoreRawDishFromFormulaSnapshot,
    setDishes,
    hasMissingColumnError,
    updateDishBadgeColumnAtomic,
    isMissingTableError,
    createLocalId,
    extractMissingColumnName,
    mergeExtrasUnique,
    buildDescriptionWithOptions,
    normalizeDayKey,
    normalizeTimeInput,
    dishes,
  });

  const { managerSharedState, managerSharedSetters, managerSharedHelpers, managerSharedConstants } =
    buildManagerSharedBundles(
      buildManagerSharedBundlesConfig({
        managerCoreState,
        managerEditorUiState,
      })
    );

  const managerMenuCrud = useManagerMenuCrud(
    buildManagerMenuCrudArgs({
      managerEditorUiState,
      runtime: { scopedRestaurantId, fetchSubCategories, fetchCategories, fetchSidesLibrary },
      state: { activeLanguageCodes },
      setters: { setCategories, setSubCategoryRows },
      helpers: {
        buildI18nToken,
        normalizeCategoryDestination,
        normalizeSortOrder,
        parseI18nToken,
        getExtraKey,
        createLocalId,
        normalizeLanguageKey,
        normalizeText,
      },
    })
  );

  const managerAdminActions = useManagerAdminActions(
    buildManagerAdminActionsArgs({
      managerEditorUiState,
      managerDishAssetsAndBadges,
      runtime: {
        persistDisplaySettings,
        fetchRestaurant,
        fetchCategories,
        fetchSubCategories,
        fetchSidesLibrary,
        fetchDishes,
        fetchAllergenLibrary,
        impersonateMode,
        scopedRestaurantId,
        router,
      },
      state: managerSharedState,
      setters: managerSharedSetters,
      refs: { hasRestaurantLanguagesTableRef },
      helpers: managerSharedHelpers,
      constants: managerSharedConstants,
    })
  );
  const { handleManagerSignOut } = managerAdminActions;

  const { managerAnalyticsRuntime, managerRestaurantLinks, managerPrintActions, managerPdfReports } =
    useManagerReportingRuntime(
      buildManagerReportingRuntimeConfig({
        scopedRestaurantId,
        fetchOrders,
        managerCoreState,
        managerDishCollections,
        managerReviewInsights,
        managerUiLabels,
        managerStatsLabels,
      })
    );

  const {
    managerAppearancePanelProps,
    managerStatsPanelProps,
    managerMenuPanelProps,
    managerStaffAndRoomsProps,
    managerCategorySideModalsProps,
    managerAccessAlertsProps,
    managerHeaderSectionProps,
    managerOverlaysProps,
    managerDashboardSectionProps,
    dishEditorModalProps,
  } = useManagerViewProps(
    buildManagerViewPropsArgs({
      bundles: {
        managerEditorUiState,
        managerUiLabels,
        managerStatsLabels,
        managerReviewInsights,
        managerAnalyticsRuntime,
        managerRestaurantLinks,
        managerMenuCrud,
        managerAdminActions,
        managerDishCollections,
        managerFormulaEditor,
        managerDishAssetsAndBadges,
        managerDishFormLifecycle,
        managerDishEditorLoad,
        managerDishSave,
        managerPrintActions,
        managerPdfReports,
      },
      runtime: { activeManagerTab, analyticsRange, analyticsTab, scopedRestaurantId, router },
      state: managerSharedState,
      setters: managerSharedSetters,
      helpers: managerSharedHelpers,
      constants: managerSharedConstants,
    })
  );

  const ENABLE_MANAGER_LAYOUT_V2 = true;
  const managerSectionTitle = getManagerSectionTitle(activeManagerTab);
  const { managerProfileName, managerRestaurantName } = getManagerIdentity({
    managerUserEmail,
    restaurantFormName: restaurantForm.name,
    restaurantName: restaurant?.name,
  });

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50 text-black" style={{ fontFamily: "Inter, Montserrat, sans-serif" }}>
      <DashboardOtpGate scope="manager" restaurantId={String(params?.id || params?.restaurant_id || "")} />

      {ENABLE_MANAGER_LAYOUT_V2 ? (
        <ManagerSaasLayout
          activeTab={activeManagerTab}
          onTabChange={setActiveManagerTab}
          onOpenArchives={() => router.push(`/${scopedRestaurantId}/manager/archives`)}
          onSignOut={() => void handleManagerSignOut()}
          restaurantName={managerRestaurantName}
          profileName={managerProfileName}
          sectionTitle={managerSectionTitle}
        >
          <div className={forceFirstLoginPasswordChange ? "pointer-events-none select-none" : ""}>
            <ManagerAccessAlerts {...managerAccessAlertsProps} />
            {activeManagerTab === "menu" || activeManagerTab === "stats" ? <ManagerMenuPanel {...managerMenuPanelProps} /> : null}
            <ManagerDashboardSection {...managerDashboardSectionProps} />
          </div>
        </ManagerSaasLayout>
      ) : (
        <div className={`max-w-6xl mx-auto p-6 ${forceFirstLoginPasswordChange ? "pointer-events-none select-none" : ""}`}>
          <ManagerAccessAlerts {...managerAccessAlertsProps} />
          <ManagerHeaderSection {...managerHeaderSectionProps} />
          <ManagerDashboardSection {...managerDashboardSectionProps} />
        </div>
      )}

      <DishEditorModal {...dishEditorModalProps} />
      <ManagerOverlays {...managerOverlaysProps} />
    </div>
  );
}








