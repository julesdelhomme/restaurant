"use client";

import { useCallback } from "react";
import { BACKGROUND_URL, supabaseKey, supabaseUrl } from "./config";
import {
  fetchCategoriesForMenu,
  fetchFormulaLinksForMenuData,
  fetchNormalizedDishesForMenu,
  fetchSidesLibraryForMenu,
  fetchSubCategoriesForMenu,
  fetchTablePinCodesForMenu,
  resolveMenuRestaurantRuntime,
} from "./data-runtime";
import {
  ENABLE_RESTAURANT_PROFILE_FALLBACK,
  fetchPublicRestaurantConfig,
  parseDisplaySettingsFromRow,
  parseDisplaySettingsFromSettingsJson,
  parseJsonObject,
  toLoggableSupabaseError,
  type CategoryItem,
  type Dish,
  type FormulaDishLink,
  type Restaurant,
  type SideLibraryItem,
  type SubCategoryItem,
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

type UseMenuFetchDataArgs = {
  supabase: any;
  scopedRestaurantId: string;
  setLoading: (value: boolean) => void;
  setIsRestaurantOffline: (value: boolean) => void;
  setOfflineRestaurantName: (value: string) => void;
  setSuggestionLeadByLang: (value: Record<string, string>) => void;
  setServiceHours: (value: { lunch_start: string; lunch_end: string; dinner_start: string; dinner_end: string }) => void;
  setTablePinCodesByNumber: (value: Record<string, string>) => void;
  setRestaurant: (value: Restaurant | null) => void;
  setDishes: (value: Dish[]) => void;
  setCategories: (value: CategoryItem[]) => void;
  setSubCategoryRows: (value: SubCategoryItem[]) => void;
  setSidesLibrary: (value: SideLibraryItem[]) => void;
  setFormulaLinksByFormulaId: (value: Map<string, FormulaDishLink[]>) => void;
  setFormulaLinksByDishId: (value: Map<string, FormulaDishLink[]>) => void;
  setFormulaInfoById: (value: Map<string, FormulaInfoItem>) => void;
  setShowCaloriesClient: (value: boolean) => void;
  setEnabledLanguagesClient: (value: string[]) => void;
  setEnabledLanguageLabels: (value: Record<string, string>) => void;
  setHeroEnabledClient: (value: boolean) => void;
  setHeroBadgeTypeClient: (value: "chef" | "daily") => void;
  setConsultationModeClient: (value: boolean) => void;
  setOrderValidationCode: (value: string) => void;
  setUiTranslationsByLang: (value: any) => void;
  setCategoryDrawerEnabled: (value: boolean) => void;
  setKeepSuggestionsOnTop: (value: boolean) => void;
};

export function useMenuFetchData({
  supabase,
  scopedRestaurantId,
  setLoading,
  setIsRestaurantOffline,
  setOfflineRestaurantName,
  setSuggestionLeadByLang,
  setServiceHours,
  setTablePinCodesByNumber,
  setRestaurant,
  setDishes,
  setCategories,
  setSubCategoryRows,
  setSidesLibrary,
  setFormulaLinksByFormulaId,
  setFormulaLinksByDishId,
  setFormulaInfoById,
  setShowCaloriesClient,
  setEnabledLanguagesClient,
  setEnabledLanguageLabels,
  setHeroEnabledClient,
  setHeroBadgeTypeClient,
  setConsultationModeClient,
  setOrderValidationCode,
  setUiTranslationsByLang,
  setCategoryDrawerEnabled,
  setKeepSuggestionsOnTop,
}: UseMenuFetchDataArgs) {
  const fetchFormulaLinksForMenu = useCallback(
    async (sourceDishes: Dish[]) => {
      const result = await fetchFormulaLinksForMenuData({
        supabase,
        scopedRestaurantId,
        sourceDishes,
      });
      setFormulaLinksByFormulaId(result.byFormula);
      setFormulaLinksByDishId(result.byDish);
      setFormulaInfoById(result.formulaInfoById);
    },
    [scopedRestaurantId, setFormulaInfoById, setFormulaLinksByDishId, setFormulaLinksByFormulaId, supabase]
  );

  const fetchData = useCallback(async () => {
    console.log("ID utilisé:", scopedRestaurantId, "[client.fetchData]");
    setLoading(true);
    setIsRestaurantOffline(false);
    setOfflineRestaurantName("");
    setSuggestionLeadByLang({});
    setServiceHours({ lunch_start: "", lunch_end: "", dinner_start: "", dinner_end: "" });
    setTablePinCodesByNumber({});

    if (scopedRestaurantId) {
      const cacheBypassTs = Date.now();
      console.log("CACHE_BYPASS_TS:", cacheBypassTs);
      const { data: freshSettingsData, error: freshSettingsError } = await supabase
        .from("restaurants")
        .select("settings")
        .eq("id", scopedRestaurantId)
        .single();
      if (!freshSettingsError && freshSettingsData) {
        const freshSettings = parseJsonObject((freshSettingsData as Record<string, unknown>).settings);
        const freshCardLayout = parseJsonObject(freshSettings.card_layout);
        console.log(
          "DATA REÇUE DU SERVEUR :",
          String(
            freshSettings.layoutToken ??
              freshSettings.resolved ??
              freshCardLayout.layoutToken ??
              freshCardLayout.layout_token ??
              ""
          ).trim() || null
        );
      }
    }

    let displayFound = false;
    let restaurantFound = false;
    const applyRestaurantRow = (baseRow: Restaurant & Record<string, unknown>) => {
      const runtime = resolveMenuRestaurantRuntime(baseRow, BACKGROUND_URL);
      const restaurantRow = runtime.restaurantRow;
      if (!restaurantRow) return true;
      if (!runtime.isActive) {
        setRestaurant(restaurantRow as Restaurant);
        setIsRestaurantOffline(true);
        setOfflineRestaurantName(String(restaurantRow.name || "").trim());
        setDishes([]);
        setCategories([]);
        setSubCategoryRows([]);
        setSidesLibrary([]);
        return false;
      }

      setIsRestaurantOffline(false);
      setOfflineRestaurantName("");
      setRestaurant(restaurantRow);
      console.log("POLICE RECUPEREE:", restaurantRow.font_family || null);
      console.log("Etat du mode consultation recu du serveur :", (restaurantRow as any).is_order_disabled ?? null);
      restaurantFound = true;
      if (runtime.displaySettings) {
        const parsed = runtime.displaySettings;
        setShowCaloriesClient(parsed.showCalories);
        setEnabledLanguagesClient(parsed.enabledLanguages);
        setEnabledLanguageLabels(parsed.languageLabels);
        setHeroEnabledClient(parsed.heroEnabled);
        setHeroBadgeTypeClient(parsed.heroBadgeType === "daily" ? "daily" : "chef");
        setConsultationModeClient(parsed.consultationMode);
        setOrderValidationCode(parsed.orderValidationCode || "1234");
        setSuggestionLeadByLang(parsed.suggestionMessagesI18n || {});
        setUiTranslationsByLang(parsed.uiTranslations || {});
        displayFound = true;
      }
      setCategoryDrawerEnabled(runtime.categoryDrawerEnabled);
      setKeepSuggestionsOnTop(runtime.keepSuggestionsOnTop);
      setServiceHours(runtime.serviceHours);
      return true;
    };

    const publicRestaurantRow = await fetchPublicRestaurantConfig(scopedRestaurantId);
    if (publicRestaurantRow) {
      const shouldContinue = applyRestaurantRow(publicRestaurantRow as Restaurant & Record<string, unknown>);
      if (!shouldContinue) {
        setLoading(false);
        return;
      }
    }

    if (!restaurantFound) {
      const restaurantsResult = scopedRestaurantId
        ? await supabase.from("restaurants").select("*").eq("id", scopedRestaurantId).limit(1)
        : await supabase.from("restaurants").select("*").limit(1);
      const restaurantsData = restaurantsResult.data;
      const restaurantsError = restaurantsResult.error;
      if (!restaurantsError && Array.isArray(restaurantsData) && restaurantsData[0]) {
        const shouldContinue = applyRestaurantRow(restaurantsData[0] as Restaurant & Record<string, unknown>);
        if (!shouldContinue) {
          setLoading(false);
          return;
        }
      }
    }

    if (!scopedRestaurantId && !displayFound && ENABLE_RESTAURANT_PROFILE_FALLBACK) {
      const { data: profileData, error: profileError } = await supabase.from("restaurant_profile").select("*").limit(1);
      if (!profileError && Array.isArray(profileData) && profileData[0]) {
        const row = profileData[0] as any;
        if (!restaurantFound) {
          const normalizedProfileRow = {
            ...row,
            font_family: String(row.font_family || "").trim() || null,
          } as Restaurant;
          setRestaurant(normalizedProfileRow);
          console.log("POLICE RECUPEREE:", (normalizedProfileRow as any).font_family || null);
        }
        if (
          Object.prototype.hasOwnProperty.call(row, "show_calories") ||
          Object.prototype.hasOwnProperty.call(row, "enabled_languages")
        ) {
          const parsed = parseDisplaySettingsFromRow(row);
          console.log(
            "État du mode consultation reçu du serveur :",
            row.is_order_disabled ?? null,
            "=> parsed:",
            parsed.consultationMode
          );
          setShowCaloriesClient(parsed.showCalories);
          setEnabledLanguagesClient(parsed.enabledLanguages);
          setEnabledLanguageLabels(parsed.languageLabels);
          setHeroEnabledClient(parsed.heroEnabled);
          setHeroBadgeTypeClient(parsed.heroBadgeType === "daily" ? "daily" : "chef");
          setConsultationModeClient(parsed.consultationMode);
          setOrderValidationCode(parsed.orderValidationCode || "1234");
          setSuggestionLeadByLang(parsed.suggestionMessagesI18n || {});
          setUiTranslationsByLang(parsed.uiTranslations || {});
          displayFound = true;
        } else {
          const parsed = parseDisplaySettingsFromSettingsJson((row as { settings?: unknown }).settings);
          if (parsed) {
            setShowCaloriesClient(parsed.showCalories);
            setEnabledLanguagesClient(parsed.enabledLanguages);
            setEnabledLanguageLabels(parsed.languageLabels);
            setHeroEnabledClient(parsed.heroEnabled);
            setHeroBadgeTypeClient(parsed.heroBadgeType === "daily" ? "daily" : "chef");
            setConsultationModeClient(parsed.consultationMode);
            setOrderValidationCode(parsed.orderValidationCode || "1234");
            setSuggestionLeadByLang(parsed.suggestionMessagesI18n || {});
            setUiTranslationsByLang(parsed.uiTranslations || {});
            displayFound = true;
          }
        }
      }
    }

    if (!restaurantFound) {
      try {
        const restaurantPath = scopedRestaurantId
          ? `${supabaseUrl}/rest/v1/restaurants?select=*&id=eq.${encodeURIComponent(scopedRestaurantId)}&limit=1`
          : `${supabaseUrl}/rest/v1/restaurants?select=*&limit=1`;
        const restoResponse = await fetch(restaurantPath, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
        });
        const restoData = await restoResponse.json();
        if (Array.isArray(restoData) && restoData[0]) {
          const shouldContinue = applyRestaurantRow(restoData[0] as Restaurant & Record<string, unknown>);
          if (!shouldContinue) {
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error("Unable to fetch restaurants via REST fallback:", error);
      }
    }

    const categoriesData = await fetchCategoriesForMenu(supabase, scopedRestaurantId);
    setCategories(categoriesData);

    const subRows = await fetchSubCategoriesForMenu(supabase, scopedRestaurantId);
    setSubCategoryRows(subRows);

    const dishesResult = await fetchNormalizedDishesForMenu({
      supabase,
      scopedRestaurantId,
    });
    if (!dishesResult.error) {
      setDishes(dishesResult.dishes);
      await fetchFormulaLinksForMenu(dishesResult.dishes);
    } else {
      console.error("Erreur Supabase dishes:", toLoggableSupabaseError(dishesResult.error));
      setDishes([]);
      setFormulaLinksByFormulaId(new Map());
      setFormulaLinksByDishId(new Map());
      setFormulaInfoById(new Map());
    }

    const sideRows = await fetchSidesLibraryForMenu(supabase, scopedRestaurantId);
    setSidesLibrary(sideRows);

    const nextPinsByTable = await fetchTablePinCodesForMenu(supabase, scopedRestaurantId);
    setTablePinCodesByNumber(nextPinsByTable);

    setLoading(false);
  }, [
    fetchFormulaLinksForMenu,
    scopedRestaurantId,
    setCategories,
    setCategoryDrawerEnabled,
    setConsultationModeClient,
    setDishes,
    setEnabledLanguageLabels,
    setEnabledLanguagesClient,
    setFormulaInfoById,
    setFormulaLinksByDishId,
    setFormulaLinksByFormulaId,
    setHeroBadgeTypeClient,
    setHeroEnabledClient,
    setIsRestaurantOffline,
    setKeepSuggestionsOnTop,
    setLoading,
    setOfflineRestaurantName,
    setOrderValidationCode,
    setRestaurant,
    setServiceHours,
    setShowCaloriesClient,
    setSidesLibrary,
    setSubCategoryRows,
    setSuggestionLeadByLang,
    setTablePinCodesByNumber,
    setUiTranslationsByLang,
    supabase,
  ]);

  return { fetchData };
}

