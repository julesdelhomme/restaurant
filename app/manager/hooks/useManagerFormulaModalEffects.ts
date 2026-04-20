// @ts-nocheck
import { useEffect } from "react";

export function useManagerFormulaModalEffects(deps: Record<string, any>) {
  const {
    activeLanguageCodes,
    selectedDishLanguageCode,
    setSelectedDishLanguageCode,
    selectedOptionLanguageCode,
    setSelectedOptionLanguageCode,
    selectedExtraLanguageCode,
    setSelectedExtraLanguageCode,
    selectedFormulaLanguageCode,
    setSelectedFormulaLanguageCode,
    formulaAllergens,
    selectedFormulaDishes,
    dishes,
    allergenLibrary,
    normalizeText,
    setFormulaAllergens,
    setFormData,
    showDishModal,
    formData,
    editingDish,
    scopedRestaurantId,
    supabase,
    hasMissingColumnError,
    setIsRadarLoaded,
    setFormulaMainOptionsFormulaId,
    parseJsonObject,
    parseObjectRecord,
    normalizeFormulaStepEntries,
    buildDishStepMapFromFormulaSteps,
    setSelectedFormulaDishes,
    setDishSteps,
    normalizeOptionIds,
    parseExtrasFromUnknown,
    extrasTouched,
    setLoadedDishExtras,
    excludedMainOptionsTouched,
    setSelectedMainDishOptions,
    setExcludedMainOptionsTouched,
    setMainDishStep,
    setFormulaDescription,
    setFormulaImage,
    setFormulaKcal,
    setFormulaImagePreviewUrl,
    toBoolean,
    buildFormulaStepsFromDishStepMap,
    normalizeLanguageKey,
  } = deps;

  useEffect(() => {
    const available = activeLanguageCodes.length > 0 ? activeLanguageCodes : ["fr"];
    const fallback = available.includes("fr") ? "fr" : available[0];
    if (!available.includes(selectedDishLanguageCode)) setSelectedDishLanguageCode(fallback);
    if (!available.includes(selectedOptionLanguageCode)) setSelectedOptionLanguageCode(fallback);
    if (!available.includes(selectedExtraLanguageCode)) setSelectedExtraLanguageCode(fallback);
    if (!available.includes(selectedFormulaLanguageCode)) setSelectedFormulaLanguageCode(fallback);
  }, [activeLanguageCodes, selectedDishLanguageCode, selectedOptionLanguageCode, selectedExtraLanguageCode, selectedFormulaLanguageCode]);

  useEffect(() => {
    const current = new Set(Array.isArray(formulaAllergens) ? formulaAllergens : []);
    selectedFormulaDishes.forEach((dishIdRaw) => {
      const dish = dishes.find((d) => String(d.id) === String(dishIdRaw));
      const raw = String((dish as any)?.allergens || "").trim();
      if (!raw) return;
      raw
        .split(/[,;]+/)
        .map((v) => v.trim())
        .filter(Boolean)
        .forEach((v) => {
          const normalizedValue = normalizeText(v);
          if (!normalizedValue) return;
          const mapped = allergenLibrary.find(
            (entry) => normalizeText(String(entry.name_fr || "").trim()) === normalizedValue
          );
          if (mapped?.id) current.add(String(mapped.id));
        });
    });
    const next = Array.from(current);
    if (next.sort().join("|") !== (formulaAllergens || []).slice().sort().join("|")) {
      setFormulaAllergens(next);
      setFormData((prev) => ({ ...prev, formula_allergens: next }));
    }
  }, [selectedFormulaDishes, dishes, formulaAllergens, allergenLibrary]);

  useEffect(() => {
    if (!showDishModal || !formData.is_formula || !editingDish?.id || !scopedRestaurantId) return;
    let cancelled = false;
    (async () => {
      const formulaPrimary = await supabase
        .from("restaurant_formulas")
        .select("id,description,image_url,calories,allergens,formula_visible,formula_supplements,formula_config,excluded_main_options")
        .eq("restaurant_id", scopedRestaurantId)
        .eq("dish_id", String(editingDish.id))
        .maybeSingle();
      const formulaFallback =
        formulaPrimary.error && hasMissingColumnError(formulaPrimary.error)
          ? await supabase
              .from("restaurant_formulas")
              .select("id,description,image_url,calories,allergens,formula_config,excluded_main_options")
              .eq("restaurant_id", scopedRestaurantId)
              .eq("dish_id", String(editingDish.id))
              .maybeSingle()
          : null;
      const formulaQuery = formulaFallback ?? formulaPrimary;
      if (cancelled) return;
      if (formulaQuery.error || !formulaQuery.data) {
        if (formulaQuery.error) {
          console.warn("restaurant_formulas formula_config load failed:", formulaQuery.error.message);
        }
        setIsRadarLoaded(true);
        return;
      }
      const row = formulaQuery.data as Record<string, unknown>;
      const currentFormulaId = String(row.id || "").trim();
      setFormulaMainOptionsFormulaId(currentFormulaId);
      const formulaConfigRaw = row.formula_config;
      const formulaConfig =
        typeof formulaConfigRaw === "string"
          ? parseJsonObject(formulaConfigRaw)
          : formulaConfigRaw && typeof formulaConfigRaw === "object" && !Array.isArray(formulaConfigRaw)
            ? (formulaConfigRaw as Record<string, unknown>)
            : {};
      const stepsDetailsNode = parseObjectRecord(formulaConfig?.steps_details || {});
      const mappedDefaultOptionsFromStepsDetails = Object.fromEntries(
        Object.entries(stepsDetailsNode)
          .map(([dishId, node]) => {
            const normalizedDishId = String(dishId || "").trim();
            if (!normalizedDishId) return null;
            const row = parseObjectRecord(node);
            const rawOptions = Array.isArray(row.option_ids)
              ? (row.option_ids as unknown[])
              : Array.isArray(row.selected_options)
                ? (row.selected_options as unknown[])
                : [];
            const optionIds = rawOptions.map((value) => String(value || "").trim()).filter(Boolean);
            return [normalizedDishId, Array.from(new Set(optionIds))] as [string, string[]];
          })
          .filter(Boolean) as Array<[string, string[]]>
      ) as Record<string, string[]>;
      const initSelectedDishes = Array.isArray((formulaConfig as Record<string, unknown>)?.selected_dishes)
        ? ((formulaConfig as Record<string, unknown>)?.selected_dishes as unknown[])
            .map((value) => String(value || "").trim())
            .filter(Boolean)
        : [];
      const parsedFormulaStepEntries = normalizeFormulaStepEntries((formulaConfig as Record<string, unknown>)?.steps);
      const initStepsFromStructured = buildDishStepMapFromFormulaSteps(parsedFormulaStepEntries);
      const initStepsLegacyRaw = parseObjectRecord((formulaConfig as Record<string, unknown>)?.steps_by_dish || formulaConfig?.steps || {});
      const initStepsLegacy = Object.fromEntries(
        Object.entries(initStepsLegacyRaw)
          .map(([dishId, step]) => [String(dishId || "").trim(), Math.max(1, Math.trunc(Number(step) || 1))])
          .filter(([dishId]) => Boolean(dishId))
      ) as Record<string, number>;
      const initSteps = Object.keys(initStepsFromStructured).length > 0 ? initStepsFromStructured : initStepsLegacy;
      setSelectedFormulaDishes(initSelectedDishes);
      setDishSteps(initSteps);
      const i18nNode = parseObjectRecord(formulaConfig?.i18n);
      const nameI18nNode = parseObjectRecord(i18nNode.name);
      const descriptionI18nNode = parseObjectRecord(i18nNode.description);
      const customNameI18nNode = parseObjectRecord((formulaConfig as Record<string, unknown> | null)?.custom_name_i18n);
      const customDescriptionI18nNode = parseObjectRecord(
        (formulaConfig as Record<string, unknown> | null)?.custom_description_i18n
      );
      const rawSelectedDishes = formulaConfig?.selected_dishes ?? [];
      const selectedDishes = (Array.isArray(rawSelectedDishes) ? rawSelectedDishes : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean);
      const rawSteps = parseObjectRecord((formulaConfig as Record<string, unknown>)?.steps_by_dish || formulaConfig?.steps || {});
      const parsedStepsLegacy = Object.fromEntries(
        Object.entries(rawSteps)
          .map(([dishId, step]) => [String(dishId || "").trim(), Math.max(1, Math.trunc(Number(step) || 1))])
          .filter(([dishId]) => Boolean(dishId))
      ) as Record<string, number>;
      const parsedStepsFromStructured = buildDishStepMapFromFormulaSteps(parsedFormulaStepEntries);
      const parsedSteps =
        Object.keys(parsedStepsFromStructured).length > 0 ? parsedStepsFromStructured : parsedStepsLegacy;
      const parsedMainDishStep = Math.max(
        1,
        Math.trunc(Number(formulaConfig?.main_dish_step ?? formulaConfig?.step_count) || 1)
      );
      const hasExcludedMainOptionsColumn = Object.prototype.hasOwnProperty.call(row, "excluded_main_options");
      const hasFormulaVisibleColumn = Object.prototype.hasOwnProperty.call(row, "formula_visible");
      const hasFormulaSupplementsColumn = Object.prototype.hasOwnProperty.call(row, "formula_supplements");
      const parsedMainDishOptions = hasExcludedMainOptionsColumn
        ? Array.from(new Set(normalizeOptionIds(row.excluded_main_options)))
        : [];
      const parsedFormulaSupplements = hasFormulaSupplementsColumn
        ? parseExtrasFromUnknown(row.formula_supplements)
        : [];
      const loadedMainDishOptions = parsedMainDishOptions;
      const customFormulaName = String(formulaConfig?.custom_name || "").trim();
      const customFormulaDescription = String(formulaConfig?.custom_description || row.description || "").trim();
      const customFormulaImageUrl = String(formulaConfig?.custom_image_url || row.image_url || "").trim();
      const customFormulaKcalValue =
        formulaConfig?.custom_kcal == null
          ? String(row.calories || "").trim()
          : String(formulaConfig?.custom_kcal || "").trim();
      const customFormulaPriceValue =
        formulaConfig?.custom_price == null ? "" : String(formulaConfig?.custom_price || "").trim();
      const rawAllergens = Array.isArray(row.allergens)
        ? (row.allergens as unknown[])
        : String(row.allergens || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
      const allergenIds = rawAllergens
        .map((value) => {
          const normalizedValue = normalizeText(String(value || "").trim());
          if (!normalizedValue) return "";
          const byId = allergenLibrary.find((entry) => normalizeText(String(entry.id || "").trim()) === normalizedValue);
          if (byId?.id) return String(byId.id);
          const byName = allergenLibrary.find((entry) => normalizeText(String(entry.name_fr || "").trim()) === normalizedValue);
          return byName?.id ? String(byName.id) : "";
        })
        .filter(Boolean);

      setFormulaDescription(customFormulaDescription);
      setFormulaImage(customFormulaImageUrl);
      setFormulaKcal(customFormulaKcalValue);
      setFormulaAllergens(Array.from(new Set(allergenIds)));
      if (!extrasTouched && hasFormulaSupplementsColumn) {
        setLoadedDishExtras(parsedFormulaSupplements);
      }
      if (!excludedMainOptionsTouched && hasExcludedMainOptionsColumn) {
        setSelectedMainDishOptions(loadedMainDishOptions || []);
        setExcludedMainOptionsTouched(false);
      }
      setIsRadarLoaded(true);
      setSelectedFormulaDishes(selectedDishes || []);
      setDishSteps(parsedSteps || {});
      setMainDishStep(parsedMainDishStep);
      setFormulaImagePreviewUrl(customFormulaImageUrl);
      setFormData((prev) => ({
        ...prev,
        formula_name: customFormulaName || prev.formula_name || String(prev.name_fr || "").trim(),
        formula_description: customFormulaDescription,
        formula_image_url: customFormulaImageUrl,
        formula_calories: customFormulaKcalValue,
        formula_price: customFormulaPriceValue || prev.formula_price || "",
        formula_allergens: Array.from(new Set(allergenIds)),
        formula_dish_ids: selectedDishes.length > 0 ? selectedDishes : prev.formula_dish_ids,
        is_formula_active: hasFormulaVisibleColumn
          ? toBoolean(row.formula_visible, true)
          : prev.is_formula_active,
        ...(hasFormulaSupplementsColumn && !extrasTouched
          ? {
              extras_list: parsedFormulaSupplements,
              has_extras: parsedFormulaSupplements.length > 0,
            }
          : {}),
        formula_config: {
          ...(prev.formula_config && typeof prev.formula_config === "object" && !Array.isArray(prev.formula_config)
            ? (prev.formula_config as Record<string, unknown>)
            : {}),
          ...formulaConfig,
          selected_dishes: selectedDishes.length > 0 ? selectedDishes : prev.formula_dish_ids,
          steps:
            parsedFormulaStepEntries.length > 0
              ? parsedFormulaStepEntries
              : buildFormulaStepsFromDishStepMap(parsedSteps, selectedDishes.length > 0 ? selectedDishes : prev.formula_dish_ids),
          steps_by_dish: parsedSteps,
        },
        formula_default_option_ids:
          Object.keys(mappedDefaultOptionsFromStepsDetails).length > 0
            ? mappedDefaultOptionsFromStepsDetails
            : prev.formula_default_option_ids,
        formula_name_i18n: {
          ...(prev.formula_name_i18n || {}),
          ...Object.fromEntries(
            activeLanguageCodes.map((code) => {
              const normalizedCode = normalizeLanguageKey(code);
              return [
                normalizedCode,
                String(
                  customNameI18nNode[normalizedCode] ||
                    customNameI18nNode[code] ||
                    nameI18nNode[normalizedCode] ||
                    nameI18nNode[code] ||
                    ""
                ).trim(),
              ];
            })
          ),
        },
        formula_description_i18n: {
          ...(prev.formula_description_i18n || {}),
          ...Object.fromEntries(
            activeLanguageCodes.map((code) => {
              const normalizedCode = normalizeLanguageKey(code);
              return [
                normalizedCode,
                String(
                  customDescriptionI18nNode[normalizedCode] ||
                    customDescriptionI18nNode[code] ||
                    descriptionI18nNode[normalizedCode] ||
                    descriptionI18nNode[code] ||
                    ""
                ).trim(),
              ];
            })
          ),
        },
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [
    showDishModal,
    formData.is_formula,
    editingDish?.id,
    scopedRestaurantId,
    allergenLibrary,
    activeLanguageCodes,
    excludedMainOptionsTouched,
    extrasTouched,
  ]);
}
