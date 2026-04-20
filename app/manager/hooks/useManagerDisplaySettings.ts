import { supabase } from "../../lib/supabase";

export function useManagerDisplaySettings(deps: Record<string, any>) {
  const {
    scopedRestaurantId,
    normalizeLanguageKey,
    setShowCaloriesClient,
    setHeroEnabled,
    setHeroBadgeType,
    setConsultationModeEnabled,
    setSearchBarEnabled,
    setTotalTables,
    normalizeTotalTables,
    DEFAULT_TOTAL_TABLES,
    setActiveLanguageCodes,
    setLanguageLabels,
    parseDisplaySettingsFromRow,
    serializeEnabledLanguageEntries,
    parseObjectRecord,
    autoPrintKitchen,
    toLoggableSupabaseError,
  } = deps;

  const applyDisplaySettings = (
    showCalories: boolean,
    langs: string[],
    labels?: Record<string, string>,
    heroFlag?: boolean,
    badgeType?: string,
    consultationModeFlag?: boolean,
    searchEnabledFlag?: boolean,
    totalTablesCount?: number
  ) => {
    const normalized = Array.from(new Set(langs.map((code) => normalizeLanguageKey(code)).filter(Boolean)));
    if (!normalized.includes("fr")) normalized.unshift("fr");
    setShowCaloriesClient(showCalories);
    if (typeof heroFlag === "boolean") setHeroEnabled(heroFlag);
    if (badgeType === "chef" || badgeType === "daily") setHeroBadgeType(badgeType);
    if (typeof consultationModeFlag === "boolean") setConsultationModeEnabled(consultationModeFlag);
    if (typeof searchEnabledFlag === "boolean") setSearchBarEnabled(searchEnabledFlag);
    if (typeof totalTablesCount === "number") setTotalTables(normalizeTotalTables(totalTablesCount, DEFAULT_TOTAL_TABLES));
    setActiveLanguageCodes(normalized);
    if (labels) {
      setLanguageLabels((prev: Record<string, string>) => ({
        ...prev,
        ...labels,
        fr: labels.fr || prev.fr || "Francais",
      }));
    }
  };

  const loadDisplaySettingsFromDb = async (targetRestaurantId?: string | number) => {
    const resolvedTargetId = String(targetRestaurantId ?? scopedRestaurantId ?? "").trim();
    if (!resolvedTargetId) return false;

    const { data: restaurantDataById, error: restaurantByIdError } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", resolvedTargetId)
      .single();
    if (!restaurantByIdError && restaurantDataById) {
      const parsed = parseDisplaySettingsFromRow(restaurantDataById as any);
      applyDisplaySettings(
        parsed.showCalories,
        parsed.enabledLanguages,
        parsed.languageLabels,
        parsed.heroEnabled,
        parsed.heroBadgeType,
        parsed.consultationMode,
        parsed.searchEnabled,
        parsed.totalTables
      );
      return true;
    }
    console.error("Display settings storage not found in known locations", {
      restaurantByIdError,
      resolvedTargetId,
    });
    return false;
  };

  const persistDisplaySettings = async (
    showCalories: boolean,
    langs: string[],
    labels: Record<string, string>,
    marketingConfig: {
      heroEnabled: boolean;
      heroBadgeType: "chef" | "daily";
      consultationMode: boolean;
      searchEnabled: boolean;
    },
    totalTablesCount: number,
    baseTableConfig: unknown,
    restaurantId?: number | string
  ) => {
    const strictHeroEnabled = Boolean(marketingConfig.heroEnabled);
    const strictConsultationMode = Boolean(marketingConfig.consultationMode);
    const strictSearchEnabled = Boolean(marketingConfig.searchEnabled);
    const enabledLanguagesSerialized = serializeEnabledLanguageEntries(langs, labels);
    const baseConfig = parseObjectRecord(baseTableConfig);
    const baseMarketing = parseObjectRecord(baseConfig.marketing);
    const baseMarketingOptions = parseObjectRecord(baseConfig.marketing_options);
    const nextTableConfig = {
      ...baseConfig,
      show_calories: !!showCalories,
      enabled_languages: enabledLanguagesSerialized,
      show_featured: strictHeroEnabled,
      hero_enabled: strictHeroEnabled,
      search_enabled: strictSearchEnabled,
      auto_print_kitchen: autoPrintKitchen,
      marketing: {
        ...baseMarketing,
        hero_enabled: strictHeroEnabled,
        hero_badge_type: marketingConfig.heroBadgeType,
        consultation_mode: strictConsultationMode,
        search_enabled: strictSearchEnabled,
        show_featured: strictHeroEnabled,
      },
      marketing_options: {
        ...baseMarketingOptions,
        hero_enabled: strictHeroEnabled,
        hero_badge_type: marketingConfig.heroBadgeType,
        consultation_mode: strictConsultationMode,
        search_enabled: strictSearchEnabled,
        show_featured: strictHeroEnabled,
      },
    };
    const normalizedTotalTables = normalizeTotalTables(totalTablesCount, DEFAULT_TOTAL_TABLES);
    const targetRestaurantId = String(restaurantId ?? scopedRestaurantId ?? "").trim();
    if (!targetRestaurantId) {
      return "Restaurant ID manquant pour sauvegarder les parametres.";
    }
    const payloadWithExplicitFeatured = {
      table_count: normalizedTotalTables,
      enabled_languages: enabledLanguagesSerialized,
      show_calories: !!showCalories,
      show_featured: strictHeroEnabled,
      table_config: nextTableConfig,
    };
    const payloadWithoutTopLevelFeatured = {
      table_count: normalizedTotalTables,
      enabled_languages: enabledLanguagesSerialized,
      show_calories: !!showCalories,
      table_config: nextTableConfig,
    };
    const minimalPayload = {
      table_count: normalizedTotalTables,
      table_config: nextTableConfig,
    };

    const tryPersist = async (payload: Record<string, unknown>) => {
      console.log("Valeur envoyee au serveur:", {
        heroEnabled: strictHeroEnabled,
        show_featured: payload.show_featured,
        hero_enabled_table_config: (payload.table_config as any | undefined)?.hero_enabled,
      });
      const response = await supabase
        .from("restaurants")
        .update(payload as never)
        .eq("id", targetRestaurantId)
        .select("*")
        .maybeSingle();
      console.log("Reponse du serveur:", response);
      return response;
    };

    let result = await tryPersist(payloadWithExplicitFeatured);
    if (result.error) {
      const errorCode = String((result.error as { code?: string } | null)?.code || "");
      if (errorCode === "42703") {
        result = await tryPersist(payloadWithoutTopLevelFeatured);
      }
    }
    if (result.error) {
      const errorCode = String((result.error as { code?: string } | null)?.code || "");
      if (errorCode === "42703") {
        result = await tryPersist(minimalPayload);
      }
    }

    if (!result.error) {
      const row = result.data as any | null;
      if (row) {
        const parsed = parseDisplaySettingsFromRow(row);
        applyDisplaySettings(
          parsed.showCalories,
          parsed.enabledLanguages,
          parsed.languageLabels,
          parsed.heroEnabled,
          parsed.heroBadgeType,
          parsed.consultationMode,
          parsed.searchEnabled,
          parsed.totalTables
        );
      } else {
        applyDisplaySettings(
          !!showCalories,
          langs,
          labels,
          strictHeroEnabled,
          marketingConfig.heroBadgeType,
          strictConsultationMode,
          strictSearchEnabled,
          normalizedTotalTables
        );
      }
      return null;
    }

    const errorMessage =
      (result.error as { message?: string } | null)?.message ||
      JSON.stringify(toLoggableSupabaseError(result.error));
    console.error("Display settings not persisted:", errorMessage, {
      payload: {
        table_count: normalizedTotalTables,
        enabled_languages: enabledLanguagesSerialized,
        show_featured: strictHeroEnabled,
      },
    });
    return errorMessage;
  };

  return {
    loadDisplaySettingsFromDb,
    persistDisplaySettings,
  };
}
