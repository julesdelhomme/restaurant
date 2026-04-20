import { useManagerCatalogFetchers } from "./useManagerCatalogFetchers";
import { useManagerDishFetch } from "./useManagerDishFetch";
import { useManagerDisplaySettings } from "./useManagerDisplaySettings";
import { useManagerFormulaModalEffects } from "./useManagerFormulaModalEffects";
import { useManagerLocalEffects } from "./useManagerLocalEffects";
import { useManagerRealtimeSync } from "./useManagerRealtimeSync";
import { useManagerRestaurantFetch } from "./useManagerRestaurantFetch";
import { useManagerSessionEffects } from "./useManagerSessionEffects";
import { useManagerTableAssignments } from "./useManagerTableAssignments";
import { buildManagerDishFetchArgs } from "../lib/hook-args/manager-dish-fetch-args";
import { buildManagerFormulaModalEffectsArgs } from "../lib/hook-args/manager-formula-modal-effects-args";
import { buildManagerLocalEffectsArgs } from "../lib/hook-args/manager-local-effects-args";
import { buildManagerRestaurantFetchArgs } from "../lib/hook-args/manager-restaurant-fetch-args";

export function useManagerBootstrapRuntime(params: any) {
  const {
    runtime,
    refs,
    state,
    setters,
    managerEditorUiState,
    helpers,
    constants,
  } = params;

  const { loadDisplaySettingsFromDb, persistDisplaySettings } = useManagerDisplaySettings({
    scopedRestaurantId: runtime.scopedRestaurantId,
    normalizeLanguageKey: helpers.normalizeLanguageKey,
    setShowCaloriesClient: setters.setShowCaloriesClient,
    setHeroEnabled: setters.setHeroEnabled,
    setHeroBadgeType: setters.setHeroBadgeType,
    setConsultationModeEnabled: setters.setConsultationModeEnabled,
    setSearchBarEnabled: setters.setSearchBarEnabled,
    setTotalTables: setters.setTotalTables,
    normalizeTotalTables: helpers.normalizeTotalTables,
    DEFAULT_TOTAL_TABLES: constants.DEFAULT_TOTAL_TABLES,
    setActiveLanguageCodes: setters.setActiveLanguageCodes,
    setLanguageLabels: setters.setLanguageLabels,
    parseDisplaySettingsFromRow: helpers.parseDisplaySettingsFromRow,
    serializeEnabledLanguageEntries: helpers.serializeEnabledLanguageEntries,
    parseObjectRecord: helpers.parseObjectRecord,
    autoPrintKitchen: state.autoPrintKitchen,
    toLoggableSupabaseError: helpers.toLoggableSupabaseError,
  });

  const { fetchTableAssignments } = useManagerTableAssignments({
    scopedRestaurantId: runtime.scopedRestaurantId,
    supabase: runtime.supabase,
    setTableAssignments: setters.setTableAssignments,
  });

  const { fetchRestaurant } = useManagerRestaurantFetch(
    buildManagerRestaurantFetchArgs({
      runtime: {
        scopedRestaurantId: runtime.scopedRestaurantId,
        supabase: runtime.supabase,
        impersonateMode: runtime.impersonateMode,
      },
      setters: {
        setIsRestaurantLoading: setters.setIsRestaurantLoading,
        setIsSuperAdminSession: setters.setIsSuperAdminSession,
        setManagerAccessError: setters.setManagerAccessError,
        setRestaurant: setters.setRestaurant,
        setManagerOtpEnabled: setters.setManagerOtpEnabled,
        setManagerOtpError: setters.setManagerOtpError,
        setForceFirstLoginPasswordChange: setters.setForceFirstLoginPasswordChange,
        setAutoPrintKitchen: setters.setAutoPrintKitchen,
        setSearchBarEnabled: setters.setSearchBarEnabled,
        setSubCategories: setters.setSubCategories,
        setCookingTranslations: setters.setCookingTranslations,
        setAllergenLibrary: setters.setAllergenLibrary,
        setActiveLanguageCodes: setters.setActiveLanguageCodes,
        setLanguageLabels: setters.setLanguageLabels,
        setRestaurantForm: setters.setRestaurantForm,
      },
      refs: { hasRestaurantLanguagesTableRef: refs.hasRestaurantLanguagesTableRef },
      helpers: {
        toLoggableSupabaseError: helpers.toLoggableSupabaseError,
        normalizeRestaurantId: helpers.normalizeRestaurantId,
        parseObjectRecord: helpers.parseObjectRecord,
        normalizeDensityStyle: helpers.normalizeDensityStyle,
        normalizeManagerFontFamily: helpers.normalizeManagerFontFamily,
        normalizeBackgroundOpacity: helpers.normalizeBackgroundOpacity,
        normalizeCardStyle: helpers.normalizeCardStyle,
        normalizeHexColor: helpers.normalizeHexColor,
        normalizeOpacityPercent: helpers.normalizeOpacityPercent,
        toBoolean: helpers.toBoolean,
        parseCategoryConfig: helpers.parseCategoryConfig,
        parseAutoPrintSetting: helpers.parseAutoPrintSetting,
        parseCookingTranslations: helpers.parseCookingTranslations,
        parseAllergenLibrary: helpers.parseAllergenLibrary,
        createDefaultAllergenLibrary: helpers.createDefaultAllergenLibrary,
        hasMissingColumnError: helpers.hasMissingColumnError,
        isMissingTableError: helpers.isMissingTableError,
        normalizeLanguageKey: helpers.normalizeLanguageKey,
        normalizeWelcomePopupType: helpers.normalizeWelcomePopupType,
        resolveSupabasePublicUrl: helpers.resolveSupabasePublicUrl,
        normalizeMenuLayout: helpers.normalizeMenuLayout,
        parseCardLayoutToken: helpers.parseCardLayoutToken,
      },
      constants: {
        DEFAULT_LANGUAGE_LABELS: constants.DEFAULT_LANGUAGE_LABELS,
        RESTAURANT_BANNERS_BUCKET: constants.RESTAURANT_BANNERS_BUCKET,
      },
      loadDisplaySettingsFromDb,
    })
  );

  const { fetchCategories, fetchDishes } = useManagerDishFetch(
    buildManagerDishFetchArgs({
      managerEditorUiState,
      state,
      runtime: { scopedRestaurantId: runtime.scopedRestaurantId, supabase: runtime.supabase },
      refs: {
        dishesRefetchLockUntilRef: refs.dishesRefetchLockUntilRef,
        lastSaveTimeRef: refs.lastSaveTimeRef,
        isSavingRef: refs.isSavingRef,
      },
      setters: {
        setCategories: setters.setCategories,
        setFormulaLinksByFormulaId: setters.setFormulaLinksByFormulaId,
        setFormulaLinksByDishId: setters.setFormulaLinksByDishId,
        setFormulaLinkDefaultOptionsByFormulaId: setters.setFormulaLinkDefaultOptionsByFormulaId,
        setFormulaMainDishOptionsByFormulaId: setters.setFormulaMainDishOptionsByFormulaId,
        setFormulaLinkDisplayByFormulaId: setters.setFormulaLinkDisplayByFormulaId,
        setFormulaLinkSequenceByFormulaId: setters.setFormulaLinkSequenceByFormulaId,
        setDishes: setters.setDishes,
        setAllergenLibrary: setters.setAllergenLibrary,
      },
      helpers: {
        hasMissingColumnError: helpers.hasMissingColumnError,
        toLoggableSupabaseError: helpers.toLoggableSupabaseError,
        toBoolean: helpers.toBoolean,
        parseJsonObject: helpers.parseJsonObject,
        parseExtrasFromUnknown: helpers.parseExtrasFromUnknown,
        parseDishOptionsRowsToExtras: helpers.parseDishOptionsRowsToExtras,
        createLocalId: helpers.createLocalId,
        parseObjectRecord: helpers.parseObjectRecord,
        parseI18nToken: helpers.parseI18nToken,
        normalizeLanguageKey: helpers.normalizeLanguageKey,
        extractFormulaProductOptionsForManager: helpers.extractFormulaProductOptionsForManager,
        mergeExtrasUnique: helpers.mergeExtrasUnique,
        mergeProductOptions: helpers.mergeProductOptions,
        extractAllergenNamesFromDishPayload: helpers.extractAllergenNamesFromDishPayload,
        normalizeText: helpers.normalizeText,
        mergeAllergenLibraryRows: helpers.mergeAllergenLibraryRows,
      },
    })
  );

  useManagerSessionEffects({
    supabase: runtime.supabase,
    setManagerUserEmail: setters.setManagerUserEmail,
    setGlobalManagerNotification: setters.setGlobalManagerNotification,
  });

  useManagerFormulaModalEffects(
    buildManagerFormulaModalEffectsArgs({
      managerEditorUiState,
      runtime: {
        activeLanguageCodes: state.activeLanguageCodes,
        scopedRestaurantId: runtime.scopedRestaurantId,
        supabase: runtime.supabase,
      },
      core: { dishes: state.dishes, allergenLibrary: state.allergenLibrary },
      helpers: {
        normalizeText: helpers.normalizeText,
        hasMissingColumnError: helpers.hasMissingColumnError,
        parseJsonObject: helpers.parseJsonObject,
        parseObjectRecord: helpers.parseObjectRecord,
        normalizeFormulaStepEntries: helpers.normalizeFormulaStepEntries,
        buildDishStepMapFromFormulaSteps: helpers.buildDishStepMapFromFormulaSteps,
        normalizeOptionIds: helpers.normalizeOptionIds,
        parseExtrasFromUnknown: helpers.parseExtrasFromUnknown,
        toBoolean: helpers.toBoolean,
        buildFormulaStepsFromDishStepMap: helpers.buildFormulaStepsFromDishStepMap,
        normalizeLanguageKey: helpers.normalizeLanguageKey,
      },
    })
  );

  const {
    fetchReviews,
    fetchCriticalStock,
    fetchSubCategories,
    fetchSidesLibrary,
    fetchAllergenLibrary,
    fetchOrders,
    calculateStats,
  } = useManagerCatalogFetchers({
    scopedRestaurantId: runtime.scopedRestaurantId,
    setReviews: setters.setReviews,
    sevenDaysAgoIso: runtime.sevenDaysAgoIso,
    toLoggableSupabaseError: helpers.toLoggableSupabaseError,
    setCriticalStock: setters.setCriticalStock,
    setSubCategoryRows: setters.setSubCategoryRows,
    setSubCategories: setters.setSubCategories,
    categories: state.categories,
    setSidesLibrary: setters.setSidesLibrary,
    setAllergenLibrary: setters.setAllergenLibrary,
    createDefaultAllergenLibrary: helpers.createDefaultAllergenLibrary,
    hasAllergenLibraryTableRef: refs.hasAllergenLibraryTableRef,
    isMissingTableError: helpers.isMissingTableError,
    parseAllergenLibrary: helpers.parseAllergenLibrary,
    supabaseUrl: constants.supabaseUrl,
    supabaseKey: constants.supabaseKey,
    setOrders: setters.setOrders,
    setStats: setters.setStats,
  });

  useManagerRealtimeSync({
    scopedRestaurantId: runtime.scopedRestaurantId,
    fetchRestaurant,
    fetchCategories,
    fetchDishes,
    fetchOrders,
    fetchReviews,
    fetchTableAssignments,
    fetchCriticalStock,
    fetchSubCategories,
    fetchSidesLibrary,
    fetchAllergenLibrary,
    dishesRefetchLockTimerRef: refs.dishesRefetchLockTimerRef,
    isSavingRef: refs.isSavingRef,
    supabase: runtime.supabase,
  });

  useManagerLocalEffects(
    buildManagerLocalEffectsArgs({
      managerEditorUiState,
      core: {
        subCategories: state.subCategories,
        orders: state.orders,
        dishes: state.dishes,
        forceFirstLoginPasswordChange: state.forceFirstLoginPasswordChange,
        restaurant: state.restaurant,
        categories: state.categories,
      },
      setters: {
        setSubCategories: setters.setSubCategories,
        setForceFirstLoginPasswordChange: setters.setForceFirstLoginPasswordChange,
      },
      helpers: { calculateStats, toBoolean: helpers.toBoolean },
      fetchSubCategories,
    })
  );

  return {
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
  };
}
