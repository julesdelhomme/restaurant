// @ts-nocheck
import { supabase } from "../../lib/supabase";
import type { Dish } from "../types";
import type { DishBadgeAtomicField } from "./useManagerDishAssetsAndBadges";

export function useManagerDishSave(deps: Record<string, any>) {
  const {
    scopedRestaurantId,
    formData,
    formulaKcal,
    editingDish,
    loadedDishExtras,
    extrasTouched,
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
    selectedFormulaDishes,
    normalizeFormulaStepEntries,
    buildFormulaStepsFromDishStepMap,
    dishSteps,
    buildDishStepMapFromFormulaSteps,
    mainDishStep,
    readFormulaDefaultOptionIdsMap,
    excludedMainOptionsTouched,
    formulaMainDishOptionsByFormulaId,
    selectedMainDishOptions,
    activeDishModalTab,
    resolveBaseDishIdentityFromFormulaConfig,
    restoreRawDishFromFormulaSnapshot,
    setDishSaveStatus,
    setDishes,
    setEditingDish,
    hasMissingColumnError,
    updateDishBadgeColumnAtomic,
    isMissingTableError,
    setFormData,
    setSelectedMainDishOptions,
    setShowDishModal,
    createLocalId,
    extractMissingColumnName,
    mergeExtrasUnique,
    buildDescriptionWithOptions,
    normalizeDayKey,
    normalizeTimeInput,
    formulaAllergens,
    formulaDescription,
    formulaImage,
    dishes,
  } = deps;

  const handleSave = async () => {
    if (!scopedRestaurantId) {
      alert("Restaurant non défini dans l'URL.");
      return;
    }

    const priceFloat = parseFloat(formData.price);
    if (!formData.name_fr || Number.isNaN(priceFloat) || priceFloat <= 0) {
      alert("Nom et prix valides obligatoires");
      return;
    }
    const parsedPromoPrice = String(formData.promo_price || "").trim()
      ? Number.parseFloat(String(formData.promo_price || "").trim().replace(",", "."))
      : null;
    const parsedFormulaPrice = String(formData.formula_price || "").trim()
      ? Number.parseFloat(String(formData.formula_price || "").trim().replace(",", "."))
      : null;
    const parsedCalories = String(formData.calories || "").trim()
      ? Number.parseFloat(String(formData.calories || "").trim().replace(",", "."))
      : null;
    const parsedFormulaCalories = String(formulaKcal || formData.formula_calories || "").trim()
      ? Number.parseFloat(String(formulaKcal || formData.formula_calories || "").trim().replace(",", "."))
      : null;
    const unifiedSuggestionFlag = Boolean(formData.is_suggestion || formData.is_chef_suggestion);
    if (formData.is_promo && parsedPromoPrice == null) {
      alert("Le prix promo est obligatoire quand le badge PROMO est activ?.");
      return;
    }
    if (formData.is_promo && (!Number.isFinite(parsedPromoPrice as number) || Number(parsedPromoPrice) <= 0)) {
      alert("Prix promo invalide.");
      return;
    }
    if (parsedFormulaPrice != null && (!Number.isFinite(parsedFormulaPrice as number) || Number(parsedFormulaPrice) <= 0)) {
      alert("Prix formule invalide.");
      return;
    }
    if (parsedCalories != null && !Number.isFinite(parsedCalories as number)) {
      alert("Calories invalides.");
      return;
    }
    if (parsedFormulaCalories != null && !Number.isFinite(parsedFormulaCalories as number)) {
      alert("Calories formule invalides.");
      return;
    }

    if (!formData.category_id) {
      alert("Catégorie invalide");
      return;
    }
    if (formData.has_sides && formData.selected_side_ids.length === 0) {
      alert("Sélectionnez au moins un accompagnement");
      return;
    }
    const mergedEditExtras = editingDish?.id
      ? mergeExtrasUnique(loadedDishExtras, formData.extras_list)
      : formData.extras_list;
    const extrasToPersist = editingDish?.id
      ? (extrasTouched
          ? formData.extras_list
          : mergeExtrasUnique(loadedDishExtras, mergedEditExtras))
      : formData.extras_list;

    const isFormulaDish = toBoolean(formData.is_formula, false);
    const normalizedDescriptionFr = String(formData.description_fr || "").trim();
    const finalDescription = buildDescriptionWithOptions(normalizedDescriptionFr);
    const normalizedActiveLanguageCodes = Array.from(
      new Set(
        (activeLanguageCodes.length > 0 ? activeLanguageCodes : ["fr"])
          .map((code) => normalizeLanguageKey(String(code || "")))
          .filter(Boolean)
      )
    );
    if (!normalizedActiveLanguageCodes.includes("fr")) normalizedActiveLanguageCodes.unshift("fr");
    const normalizeI18nMap = (source: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(source || {})
          .map(([key, value]) => [normalizeLanguageKey(key), String(value || "").trim()] as [string, string])
          .filter(([key, value]) => Boolean(key) && Boolean(value))
      ) as Record<string, string>;
    const normalizedNameI18nBase = normalizeI18nMap({
      ...(formData.name_i18n || {}),
      fr: String(formData.name_fr || "").trim(),
      en: String(formData.name_en || "").trim(),
      es: String(formData.name_es || "").trim(),
      de: String(formData.name_de || "").trim(),
    });
    const normalizedDescriptionI18nBase = normalizeI18nMap({
      ...(formData.description_i18n || {}),
      fr: normalizedDescriptionFr,
      en: String(formData.description_en || "").trim(),
      es: String(formData.description_es || "").trim(),
      de: String(formData.description_de || "").trim(),
    });
    const normalizedSalesTipI18n = normalizeI18nMap({
      ...(formData.sales_tip_i18n || {}),
      fr: String(formData.sales_tip || "").trim(),
    });
    const normalizedNameI18n = normalizedNameI18nBase;
    const normalizedDescriptionI18n = normalizedDescriptionI18nBase;
    const translationsByLang = Object.fromEntries(
      normalizedActiveLanguageCodes
        .map((code) => {
          const normalizedCode = normalizeLanguageKey(code);
          const nameValue = String(normalizedNameI18n[normalizedCode] || "").trim();
          const descriptionValue = String(normalizedDescriptionI18n[normalizedCode] || "").trim();
          const node: Record<string, string> = {
            name: nameValue,
            description: descriptionValue,
          };
          return [normalizedCode, node] as [string, Record<string, string>];
        })
    ) as Record<string, Record<string, string>>;
    const translationsPayload = {
      name: normalizedNameI18n,
      description: normalizedDescriptionI18n,
      sales_tip: normalizedSalesTipI18n,
      ...Object.fromEntries(Object.entries(normalizedNameI18n).map(([code, value]) => [`name_${code}`, value])),
      ...Object.fromEntries(
        Object.entries(normalizedDescriptionI18n).map(([code, value]) => [`description_${code}`, value])
      ),
      ...Object.fromEntries(Object.entries(normalizedSalesTipI18n).map(([code, value]) => [`sales_tip_${code}`, value])),
      ...translationsByLang,
    };
    const selectedAllergenTokens = String(formData.allergens || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const selectedAllergenIds = Array.from(
      new Set(
        selectedAllergenTokens
          .map((value) => {
            const normalizedValue = normalizeText(String(value || "").trim());
            if (!normalizedValue) return "";
            const byId = allergenLibrary.find(
              (entry) => normalizeText(String(entry.id || "").trim()) === normalizedValue
            );
            if (byId?.id) return String(byId.id);
            const byName = allergenLibrary.find(
              (entry) => normalizeText(String(entry.name_fr || "").trim()) === normalizedValue
            );
            return byName?.id ? String(byName.id) : "";
          })
          .filter(Boolean)
      )
    );
    const selectedAllergenLabels = selectedAllergenIds.map((id) => {
      const row = allergenLibrary.find((entry) => String(entry.id || "").trim() === String(id));
      return String(row?.name_fr || id).trim();
    });
    const linkedSalesDishId = String(formData.sales_tip_dish_id || "").trim();
    const normalizedHungerLevels = parseHungerLevels(
      formData.hunger_levels && typeof formData.hunger_levels === "object"
        ? formData.hunger_levels
        : formData.hunger_level
    );
    const normalizedHungerLevel = normalizeHungerLevel(formData.hunger_level) || resolveLegacyHungerLevelLabel(normalizedHungerLevels);
    const persistedHungerLevels = {
      small: Boolean(normalizedHungerLevels.small),
      medium: Boolean(normalizedHungerLevels.medium),
      large: Boolean(normalizedHungerLevels.large),
    };
    const editingDietaryRaw = editingDish
      ? (editingDish as unknown as Record<string, unknown>).dietary_tag
      : null;
    const baseDietaryTag =
      typeof editingDietaryRaw === "string"
        ? parseJsonObject(editingDietaryRaw) || {}
        : parseObjectRecord(editingDietaryRaw);
    const dietaryTagPayload = {
      ...baseDietaryTag,
      sales_tip: String(formData.sales_tip || "").trim() || null,
      sales_tip_dish_id: linkedSalesDishId || null,
      sales_tip_i18n: normalizedSalesTipI18n,
      hunger_level: normalizedHungerLevel || null,
      hunger_levels: persistedHungerLevels,
      allergens_selected: selectedAllergenIds,
      allergens_fr: selectedAllergenLabels,
    };
    const normalizedFormulaDishIds = Array.from(
      new Set((selectedFormulaDishes || []).map((value) => String(value || "").trim()).filter(Boolean))
    );
    const rawFormulaStepEntriesForSave = normalizeFormulaStepEntries(
      formData.formula_config && typeof formData.formula_config === "object"
        ? (formData.formula_config as Record<string, unknown>).steps
        : null
    );
    const formulaStepEntriesForFormulaConfig = (
      rawFormulaStepEntriesForSave.length > 0
        ? rawFormulaStepEntriesForSave
        : buildFormulaStepsFromDishStepMap(
            Object.fromEntries(
              Object.entries(dishSteps || {})
                .map(([dishId, step]) => [
                  String(dishId || "").trim(),
                  Math.max(1, Math.trunc(Number(step) || 1)),
                ] as [string, number])
                .filter(([dishId]) => Boolean(dishId))
            ) as Record<string, number>,
            normalizedFormulaDishIds
          )
    ).map((step, index) => ({
      title: String(step.title || "").trim() || `Étape ${index + 1}`,
      options: Array.from(new Set((step.options || []).map((dishId) => String(dishId || "").trim()).filter(Boolean))),
      auto_notify: false,
      destination: (step.destination === "bar" ? "bar" : "cuisine") as "bar" | "cuisine",
    }));
    const normalizedDishStepsFromState = Object.fromEntries(
      Object.entries(dishSteps || {})
        .map(([dishId, step]) => [String(dishId || "").trim(), Math.max(1, Math.trunc(Number(step) || 1))] as [string, number])
        .filter(([dishId]) => Boolean(dishId) && normalizedFormulaDishIds.includes(String(dishId)))
    ) as Record<string, number>;
    const normalizedDishStepsFromStructured = Object.fromEntries(
      Object.entries(buildDishStepMapFromFormulaSteps(formulaStepEntriesForFormulaConfig)).filter(([dishId]) =>
        normalizedFormulaDishIds.includes(String(dishId))
      )
    ) as Record<string, number>;
    const normalizedMainStep = Math.max(1, Math.trunc(Number(mainDishStep) || 1));
    const selectedFormulaDishesForFormulaConfig = normalizedFormulaDishIds;
    const dishStepsForFormulaConfig =
      Object.keys(normalizedDishStepsFromStructured).length > 0
        ? normalizedDishStepsFromStructured
        : normalizedDishStepsFromState;
    const mainStepForFormulaConfig = normalizedMainStep;
    const normalizedFormulaDefaultOptionMap = Object.fromEntries(
      Object.entries(readFormulaDefaultOptionIdsMap(formData))
        .map(([dishId, optionIds]) => {
          const normalizedDishId = String(dishId || "").trim();
          if (!normalizedDishId) return null;
          const normalizedOptionIds = (Array.isArray(optionIds) ? optionIds : [])
            .map((optionId) => String(optionId || "").trim())
            .filter(Boolean);
          return [normalizedDishId, Array.from(new Set(normalizedOptionIds))] as [string, string[]];
        })
        .filter(Boolean) as Array<[string, string[]]>
    ) as Record<string, string[]>;
    const normalizeOptionKey = (value: unknown) =>
      String(value || "")
        .trim()
        .replace(/^["']+|["']+$/g, "")
        .trim();
    const currentFormulaDishIdForSave = String(editingDish?.id || "").trim();
    const fallbackExcludedMainOptionIds =
      !excludedMainOptionsTouched && currentFormulaDishIdForSave
        ? formulaMainDishOptionsByFormulaId.get(currentFormulaDishIdForSave) || []
        : [];
    const requestedExcludedMainOptionIds = Array.from(
      new Set(
        (
          Array.isArray(selectedMainDishOptions) && selectedMainDishOptions.length > 0
            ? selectedMainDishOptions
            : fallbackExcludedMainOptionIds
        )
          .map((value) => normalizeOptionKey(value))
          .filter(Boolean)
      )
    );
    const validMainOptionIds = Array.isArray(formData.product_options)
      ? formData.product_options
          .map((option) => normalizeOptionKey(option?.id))
          .filter(Boolean)
      : [];
    const validMainOptionIdSetLower = new Set(validMainOptionIds.map((id) => id.toLowerCase()));
    const normalizedExcludedMainOptionIdsForSave =
      validMainOptionIdSetLower.size > 0
        ? requestedExcludedMainOptionIds.filter((id) => validMainOptionIdSetLower.has(id.toLowerCase()))
        : requestedExcludedMainOptionIds;
    const stepsDetailsForFormulaConfig = Object.fromEntries(
      selectedFormulaDishesForFormulaConfig.map((dishId) => {
        const normalizedDishId = String(dishId || "").trim();
        const step = Math.max(1, Math.trunc(Number(dishStepsForFormulaConfig[normalizedDishId] || 1)));
        const optionIds = Array.isArray(normalizedFormulaDefaultOptionMap[normalizedDishId])
          ? normalizedFormulaDefaultOptionMap[normalizedDishId]
          : [];
        return [
          normalizedDishId,
          {
            step,
            option_ids: optionIds,
          },
        ] as [string, { step: number; option_ids: string[] }];
      })
    ) as Record<string, { step: number; option_ids: string[] }>;
    const dishData = {
      name: String(formData.name_fr || "").trim(),
      description: finalDescription || null,
      name_en: normalizedNameI18n.en || null,
      name_es: normalizedNameI18n.es || null,
      name_de: normalizedNameI18n.de || null,
      description_en: normalizedDescriptionI18n.en || null,
      description_es: normalizedDescriptionI18n.es || null,
      description_de: normalizedDescriptionI18n.de || null,
      name_fr: String(formData.name_fr || "").trim() || null,
      description_fr: normalizedDescriptionFr || null,
      translations: translationsPayload,
      price: priceFloat,
      image_url: formData.image_url || null,
      hunger_level: normalizedHungerLevel || null,
      hunger_levels: persistedHungerLevels,
      category_id: String(formData.category_id || "").trim() || null,
      subcategory_id: String(formData.subcategory_id || "").trim() || null,
      available_days:
        Array.isArray(formData.available_days) && formData.available_days.length > 0
          ? Array.from(
              new Set(
                formData.available_days
                  .map((value) => normalizeDayKey(value))
                  .filter((value): value is string => Boolean(value))
              )
            )
          : null,
      start_time: normalizeTimeInput(formData.start_time) || null,
      end_time: normalizeTimeInput(formData.end_time) || null,
      calories: parsedCalories == null ? null : Math.trunc(Number(parsedCalories)),
      calories_min: parsedCalories == null ? null : Math.trunc(Number(parsedCalories)),
      allergens: selectedAllergenIds.length > 0 ? selectedAllergenIds : null,
      suggestion_message: String(formData.sales_tip || "").trim() || null,
      suggested_dish_id: linkedSalesDishId || null,
      dietary_tag: dietaryTagPayload,
      is_formula: isFormulaDish,
      is_alcohol: Boolean(formData.is_alcohol),
      active: formData.is_active,
      restaurant_id: scopedRestaurantId,
    };
    const isFormulaTabSave = Boolean(isFormulaDish && activeDishModalTab === "formula");
    const dishDataForPersistence = (() => {
      if (!isFormulaTabSave || !editingDish) return dishData;
      const currentDish = resolveBaseDishIdentityFromFormulaConfig(
        editingDish as unknown as Record<string, unknown>,
        formData.formula_config
      );
      const preservedCaloriesRaw =
        currentDish.calories ?? currentDish.calories_min ?? dishData.calories ?? dishData.calories_min;
      const preservedCalories = preservedCaloriesRaw == null ? null : Math.trunc(Number(preservedCaloriesRaw) || 0);
      return {
        ...dishData,
        name: String(currentDish.name ?? dishData.name ?? "").trim() || dishData.name,
        name_fr: String(currentDish.name_fr ?? currentDish.name ?? dishData.name_fr ?? "").trim() || dishData.name_fr,
        name_en: String(currentDish.name_en ?? dishData.name_en ?? "").trim() || dishData.name_en,
        name_es: String(currentDish.name_es ?? dishData.name_es ?? "").trim() || dishData.name_es,
        name_de: String(currentDish.name_de ?? dishData.name_de ?? "").trim() || dishData.name_de,
        description:
          String(currentDish.description ?? dishData.description ?? "").trim() || dishData.description,
        description_fr:
          String(currentDish.description_fr ?? currentDish.description ?? dishData.description_fr ?? "").trim() ||
          dishData.description_fr,
        description_en:
          String(currentDish.description_en ?? dishData.description_en ?? "").trim() || dishData.description_en,
        description_es:
          String(currentDish.description_es ?? dishData.description_es ?? "").trim() || dishData.description_es,
        description_de:
          String(currentDish.description_de ?? dishData.description_de ?? "").trim() || dishData.description_de,
        price: Number.isFinite(Number(currentDish.price)) ? Number(currentDish.price) : dishData.price,
        image_url:
          String(currentDish.image_url ?? dishData.image_url ?? "").trim() || dishData.image_url,
        calories: preservedCalories,
        calories_min: preservedCalories,
        translations:
          currentDish.translations && typeof currentDish.translations === "object"
            ? (currentDish.translations as Record<string, unknown>)
            : dishData.translations,
      };
    })();

    setDishSaveStatus("saving");
    let saveCompleted = false;
    try {
      const editingDishId = String(editingDish?.id || "").trim();
      const normalizedFormulaAllergenIds = Array.from(
        new Set((Array.isArray(formulaAllergens) ? formulaAllergens : []).map((value) => String(value || "").trim()).filter(Boolean))
      );
      const withAllergensAsString = (payload: Record<string, unknown>) => ({
        ...payload,
        allergens: Array.isArray(payload.allergens)
          ? (payload.allergens as string[]).join(", ") || null
          : payload.allergens ?? null,
      });
      const hasAllergensTypeMismatch = (error: unknown) => {
        const message = String((error as { message?: string })?.message || "").toLowerCase();
        return message.includes("allergens") && (message.includes("type") || message.includes("malformed"));
      };
      const customFormulaName = String(formData.formula_name || "").trim();
      const customFormulaDescription = String(formulaDescription || formData.formula_description || "").trim();
      const customFormulaImageUrl = String(formulaImage || formData.formula_image_url || "").trim();
      const customFormulaPrice = parsedFormulaPrice == null ? null : Number(parsedFormulaPrice);
      const customFormulaKcal = parsedFormulaCalories == null ? null : Number(parsedFormulaCalories);
      const baseDishSnapshot = {
        name: String(dishDataForPersistence.name || "").trim() || null,
        name_fr: String(dishDataForPersistence.name_fr || dishDataForPersistence.name || "").trim() || null,
        name_en: String(dishDataForPersistence.name_en || "").trim() || null,
        name_es: String(dishDataForPersistence.name_es || "").trim() || null,
        name_de: String(dishDataForPersistence.name_de || "").trim() || null,
        description: String(dishDataForPersistence.description || "").trim() || null,
        description_fr:
          String(dishDataForPersistence.description_fr || dishDataForPersistence.description || "").trim() || null,
        description_en: String(dishDataForPersistence.description_en || "").trim() || null,
        description_es: String(dishDataForPersistence.description_es || "").trim() || null,
        description_de: String(dishDataForPersistence.description_de || "").trim() || null,
        price: Number.isFinite(Number(dishDataForPersistence.price)) ? Number(dishDataForPersistence.price) : null,
        kcal:
          dishDataForPersistence.calories == null
            ? dishDataForPersistence.calories_min == null
              ? null
              : Number(dishDataForPersistence.calories_min)
            : Number(dishDataForPersistence.calories),
        image_url: String(dishDataForPersistence.image_url || "").trim() || null,
      };
      const baseFormulaConfigForSave =
        formData.formula_config && typeof formData.formula_config === "object" && !Array.isArray(formData.formula_config)
          ? (formData.formula_config as Record<string, unknown>)
          : {};

      const sanitizedHungerLevelsForDish =
        persistedHungerLevels && typeof persistedHungerLevels === "object"
          ? {
              small: Boolean((persistedHungerLevels as Record<string, unknown>).small),
              medium: Boolean((persistedHungerLevels as Record<string, unknown>).medium),
              large: Boolean((persistedHungerLevels as Record<string, unknown>).large),
            }
          : null;
      const baseDishData = {
        ...(editingDishId ? { id: editingDishId } : {}),
        name: String(dishDataForPersistence.name || "").trim() || null,
        description: String(dishDataForPersistence.description || "").trim() || null,
        name_en: String(dishDataForPersistence.name_en || "").trim() || null,
        name_es: String(dishDataForPersistence.name_es || "").trim() || null,
        name_de: String(dishDataForPersistence.name_de || "").trim() || null,
        description_en: String(dishDataForPersistence.description_en || "").trim() || null,
        description_es: String(dishDataForPersistence.description_es || "").trim() || null,
        description_de: String(dishDataForPersistence.description_de || "").trim() || null,
        name_fr: String(dishDataForPersistence.name_fr || dishDataForPersistence.name || "").trim() || null,
        description_fr: String(dishDataForPersistence.description_fr || dishDataForPersistence.description || "").trim() || null,
        translations:
          dishDataForPersistence.translations && typeof dishDataForPersistence.translations === "object"
            ? (dishDataForPersistence.translations as Record<string, unknown>)
            : null,
        price: Number.isFinite(Number(dishDataForPersistence.price)) ? Number(dishDataForPersistence.price) : null,
        image_url: String(dishDataForPersistence.image_url || "").trim() || null,
        hunger_level: normalizedHungerLevel || null,
        hunger_levels: sanitizedHungerLevelsForDish,
        category_id: String(dishDataForPersistence.category_id || "").trim() || null,
        subcategory_id: String(dishDataForPersistence.subcategory_id || "").trim() || null,
        available_days: Array.isArray(dishDataForPersistence.available_days)
          ? (dishDataForPersistence.available_days as string[])
          : null,
        start_time: normalizeTimeInput(dishDataForPersistence.start_time) || null,
        end_time: normalizeTimeInput(dishDataForPersistence.end_time) || null,
        calories:
          dishDataForPersistence.calories == null ? null : Math.trunc(Number(dishDataForPersistence.calories) || 0),
        calories_min:
          dishDataForPersistence.calories_min == null
            ? null
            : Math.trunc(Number(dishDataForPersistence.calories_min) || 0),
        allergens: Array.isArray(dishDataForPersistence.allergens) ? dishDataForPersistence.allergens : null,
        suggestion_message: String(dishDataForPersistence.suggestion_message || "").trim() || null,
        suggested_dish_id: String(dishDataForPersistence.suggested_dish_id || "").trim() || null,
        dietary_tag:
          dietaryTagPayload && typeof dietaryTagPayload === "object"
            ? {
                ...dietaryTagPayload,
                hunger_levels: sanitizedHungerLevelsForDish,
              }
            : null,
        is_formula: Boolean(dishDataForPersistence.is_formula),
        is_alcohol: Boolean(dishDataForPersistence.is_alcohol),
        active: Boolean(dishDataForPersistence.active),
        restaurant_id: scopedRestaurantId,
      };
      console.log("[DishEditorModal] dishes payload", baseDishData);
      const dishColumnAllowList = new Set([
        "id",
        "name",
        "description",
        "name_en",
        "name_es",
        "name_de",
        "description_en",
        "description_es",
        "description_de",
        "name_fr",
        "description_fr",
        "translations",
        "price",
        "image_url",
        "hunger_level",
        "hunger_levels",
        "category_id",
        "subcategory_id",
        "available_days",
        "start_time",
        "end_time",
        "calories",
        "calories_min",
        "allergens",
        "suggestion_message",
        "suggested_dish_id",
        "dietary_tag",
        "is_formula",
        "is_alcohol",
        "active",
        "restaurant_id",
      ]);
      const sanitizeDishUpsertPayload = (payload: Record<string, unknown>) =>
        Object.fromEntries(
          Object.entries(payload).filter(([key, value]) => dishColumnAllowList.has(key) && value !== undefined)
        ) as Record<string, unknown>;
      const optionalFallbackColumns = [
        "suggested_dish_id",
        "suggestion_message",
        "hunger_level",
        "hunger_levels",
        "dietary_tag",
        "translations",
        "subcategory_id",
        "available_days",
        "start_time",
        "end_time",
        "calories_min",
        "description_en",
        "description_es",
        "description_de",
        "name_en",
        "name_es",
        "name_de",
        "is_alcohol",
      ];
      const upsertDishWithSchemaFallback = async (initialPayload: Record<string, unknown>) => {
        let payloadForAttempt = sanitizeDishUpsertPayload(initialPayload);
        const removedColumns = new Set<string>();
        let lastResult: { data: unknown; error: unknown } = { data: null, error: null };
        for (let attempt = 0; attempt < 20; attempt += 1) {
          const upsertResult = await supabase
            .from("dishes")
            .upsert(payloadForAttempt as never, { onConflict: "id" })
            .select("*")
            .single();
          lastResult = { data: upsertResult.data, error: upsertResult.error };
          if (!upsertResult.error) {
            return {
              upsertResult,
              sanitizedPayload: payloadForAttempt,
              removedColumns: Array.from(removedColumns),
            };
          }
          if (hasAllergensTypeMismatch(upsertResult.error)) {
            payloadForAttempt = sanitizeDishUpsertPayload(
              withAllergensAsString(payloadForAttempt as Record<string, unknown>) as Record<string, unknown>
            );
            continue;
          }
          if (hasMissingColumnError(upsertResult.error)) {
            const missingColumnName =
              extractMissingColumnName((upsertResult.error as { message?: unknown })?.message) ||
              extractMissingColumnName((upsertResult.error as { hint?: unknown })?.hint) ||
              extractMissingColumnName((upsertResult.error as { details?: unknown })?.details);
            if (missingColumnName && Object.prototype.hasOwnProperty.call(payloadForAttempt, missingColumnName)) {
              const nextPayload = { ...payloadForAttempt };
              delete nextPayload[missingColumnName];
              removedColumns.add(missingColumnName);
              payloadForAttempt = sanitizeDishUpsertPayload(nextPayload);
              continue;
            }
            const fallbackColumn = optionalFallbackColumns.find(
              (column) =>
                Object.prototype.hasOwnProperty.call(payloadForAttempt, column) && !removedColumns.has(column)
            );
            if (fallbackColumn) {
              const nextPayload = { ...payloadForAttempt };
              delete nextPayload[fallbackColumn];
              removedColumns.add(fallbackColumn);
              payloadForAttempt = sanitizeDishUpsertPayload(nextPayload);
              continue;
            }
          }
          break;
        }
        return {
          upsertResult: {
            data: lastResult.data as any,
            error: lastResult.error as any,
          },
          sanitizedPayload: payloadForAttempt,
          removedColumns: Array.from(removedColumns),
        };
      };
      if (isFormulaTabSave && editingDishId) {
        await restoreRawDishFromFormulaSnapshot(editingDishId, scopedRestaurantId, formData.formula_config);
      }
      const saveToDishes = (async () => {
        if (isFormulaTabSave && editingDishId) {
          const updateResult = await supabase
            .from("dishes")
            .update({ is_formula: true } as never)
            .eq("id", editingDishId)
            .eq("restaurant_id", scopedRestaurantId)
            .select("*")
            .single();
          return updateResult;
        }
        const { upsertResult, sanitizedPayload, removedColumns } = await upsertDishWithSchemaFallback(
          baseDishData as Record<string, unknown>
        );
        if (removedColumns.length > 0) {
          console.warn("[DishEditorModal] Colonnes retirées du payload dishes:", removedColumns);
          const missingAvailabilityColumns = removedColumns.filter((column) =>
            ["available_days", "start_time", "end_time"].includes(String(column || ""))
          );
          if (missingAvailabilityColumns.length > 0) {
            alert(
              `Les colonnes de disponibilité sont absentes sur la table dishes: ${missingAvailabilityColumns.join(", ")}.`
            );
          }
        }
        console.log("[DishEditorModal] dishes payload final", sanitizedPayload);
        return upsertResult;
      })();
      const { data: savedDishRow, error: dishError } = await saveToDishes;
      console.log("Données reçues après save:", savedDishRow);
      if (dishError) {
        alert(`Erreur sauvegarde dishes: ${dishError.message}`);
        return;
      }
      let savedDishIdRaw: unknown = editingDish?.id ?? savedDishRow?.id ?? null;
      if (savedDishIdRaw == null) {
        const fallbackDishLookup = await supabase
          .from("dishes")
          .select("id")
          .eq("name", formData.name_fr)
          .eq("restaurant_id", scopedRestaurantId)
          .order("id", { ascending: false })
          .limit(1);
        if (
          fallbackDishLookup.error &&
          String((fallbackDishLookup.error as { code?: string })?.code || "") === "42703"
        ) {
          const fallbackByLegacyColumn = await supabase
            .from("dishes")
            .select("id")
            .eq("name", formData.name_fr)
            .eq("restaurant_id", scopedRestaurantId)
            .order("id", { ascending: false })
            .limit(1);
          if (!fallbackByLegacyColumn.error && Array.isArray(fallbackByLegacyColumn.data) && fallbackByLegacyColumn.data[0]) {
            savedDishIdRaw = (fallbackByLegacyColumn.data[0] as any).id ?? null;
          } else if (fallbackByLegacyColumn.error) {
            console.warn("Fallback lookup dish id failed:", fallbackByLegacyColumn.error.message);
          }
        } else if (!fallbackDishLookup.error && Array.isArray(fallbackDishLookup.data) && fallbackDishLookup.data[0]) {
          savedDishIdRaw = (fallbackDishLookup.data[0] as any).id ?? null;
        } else if (fallbackDishLookup.error) {
          console.warn("Fallback lookup dish id failed:", fallbackDishLookup.error.message);
        }
      }

      const savedDishId = String(savedDishIdRaw || "").trim();
      const savedRowRecord =
        savedDishRow && typeof savedDishRow === "object" && !Array.isArray(savedDishRow)
          ? (savedDishRow as Record<string, unknown>)
          : {};
      if (savedDishId) {
        const optimisticPromoEnabled = Boolean(formData.is_promo);
        const optimisticPromoPrice = optimisticPromoEnabled ? parsedPromoPrice : null;
        setDishes((prev) => {
          const hasRow = prev.some((row) => String(row.id || "").trim() === savedDishId);
          const mergedRow = {
            ...(dishDataForPersistence as unknown as Record<string, unknown>),
            ...savedRowRecord,
            id: savedDishId,
            dish_on_promo:
              savedRowRecord.dish_on_promo == null
                ? optimisticPromoEnabled
                : Boolean(savedRowRecord.dish_on_promo),
            is_promo:
              savedRowRecord.is_promo == null
                ? optimisticPromoEnabled
                : Boolean(savedRowRecord.is_promo),
            promo_price:
              savedRowRecord.promo_price == null
                ? optimisticPromoPrice
                : savedRowRecord.promo_price,
          } as unknown as Dish;
          if (!hasRow) return [...prev, mergedRow];
          return prev.map((row) =>
            String(row.id || "").trim() === savedDishId
              ? ({ ...row, ...mergedRow } as Dish)
              : row
          );
        });
        setEditingDish((prev) => {
          if (!prev || String(prev.id || "").trim() !== savedDishId) return prev;
          return {
            ...prev,
            ...(savedRowRecord as Record<string, unknown>),
            dish_on_promo:
              savedRowRecord.dish_on_promo == null
                ? optimisticPromoEnabled
                : Boolean(savedRowRecord.dish_on_promo),
            is_promo:
              savedRowRecord.is_promo == null
                ? optimisticPromoEnabled
                : Boolean(savedRowRecord.is_promo),
            promo_price:
              savedRowRecord.promo_price == null
                ? optimisticPromoPrice
                : savedRowRecord.promo_price,
          } as unknown as Dish;
        });
      }
      if (savedDishId) {
        const suggestedDishIdToSave = String(formData.sales_tip_dish_id || "").trim();
        const suggestedDishUpdate = await supabase
          .from("dishes")
          .update({ suggested_dish_id: suggestedDishIdToSave || null } as never)
          .eq("id", savedDishIdRaw as never)
          .eq("restaurant_id", scopedRestaurantId);
        if (suggestedDishUpdate.error && !hasMissingColumnError(suggestedDishUpdate.error, "suggested_dish_id")) {
          console.warn("Erreur update suggested_dish_id:", suggestedDishUpdate.error.message);
        }

        const badgeSyncPlan: Array<{ field: DishBadgeAtomicField; value: boolean; promoPrice?: number | null }> = [
          { field: "is_new_badge", value: Boolean(formData.is_new_badge) },
          { field: "is_spicy_badge", value: Boolean(formData.is_spicy_badge) },
          { field: "is_vegetarian_badge", value: Boolean(formData.is_vegetarian_badge) },
          {
            field: "is_promo",
            value: Boolean(formData.is_promo),
            promoPrice: formData.is_promo ? parsedPromoPrice : null,
          },
        ];
        for (const entry of badgeSyncPlan) {
          const synced = await updateDishBadgeColumnAtomic(savedDishId, entry.field, entry.value, {
            promoPrice: entry.promoPrice,
          });
          if (!synced) return;
        }

        if (!isFormulaDish) {
          console.log("[manager.save] supplements payload before Supabase", {
            dishId: savedDishId,
            extrasCount: Array.isArray(extrasToPersist) ? extrasToPersist.length : 0,
            extras: extrasToPersist,
          });
          console.log("Tentative d'insertion dans dish_options pour le plat:", savedDishId);
          const deleteOptionsResult = await supabase.from("dish_options").delete().eq("dish_id", savedDishIdRaw as never);
          if (deleteOptionsResult.error) {
            if (isMissingTableError(deleteOptionsResult.error)) {
              console.warn("Table dish_options absente: synchronisation suppléments ignorée.");
            } else {
              console.error("Erreur suppression options dish_options:", deleteOptionsResult.error);
              alert(`Plat sauvegardé mais erreur de synchronisation des suppléments: ${deleteOptionsResult.error.message}`);
              return;
            }
          }

          const optionsToInsert = extrasToPersist
            .map((extra) => {
              const names = Object.fromEntries(
                Object.entries({
                  ...(extra.names_i18n || {}),
                  fr: String(extra.name_fr || "").trim(),
                  en: String(extra.name_en || extra.names_i18n?.en || "").trim(),
                  es: String(extra.name_es || extra.names_i18n?.es || "").trim(),
                  de: String(extra.name_de || extra.names_i18n?.de || "").trim(),
                })
                  .map(([lang, value]) => [normalizeLanguageKey(lang), String(value || "").trim()])
                  .filter(([lang, value]) => Boolean(lang) && Boolean(value))
              ) as Record<string, string>;
              names.fr = names.fr || String(extra.name_fr || "").trim();
              const row: Record<string, unknown> = {
                dish_id: savedDishIdRaw,
                name: String(names.fr || "").trim(),
                names_i18n: names,
                price: Number.parseFloat(String(extra.price || 0)) || 0,
              };
              return row;
            })
            .filter((row) => row.name);

          if (optionsToInsert.length > 0) {
            const insertOptionsResult = await supabase.from("dish_options").insert(optionsToInsert as never);
            if (insertOptionsResult.error) {
              if (isMissingTableError(insertOptionsResult.error)) {
                console.warn("Table dish_options absente: insertion suppléments ignorée.");
              } else {
                console.error("Erreur insertion options:", insertOptionsResult.error);
                const schemaHint =
                  String((insertOptionsResult.error as { code?: string })?.code || "") === "42703"
                    ? " Exécutez la migration ensure_dish_options_i18n_and_fk.sql."
                    : "";
                alert(
                  `Plat sauvegardé mais erreur d'enregistrement des suppléments: ${insertOptionsResult.error.message}.${schemaHint}`
                );
                return;
              }
            }
          }
        }

        const shouldSyncProductOptions = !(isFormulaDish && isFormulaTabSave);
        const isUuidLike = (value: string) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            String(value || "").trim()
          );
        const variantRowsRich = (formData.product_options || [])
          .map((option) => {
            const nameFr = String(option.name_fr || option.name || "").trim();
            if (!nameFr) return null;
            const normalizedNames = Object.fromEntries(
              Object.entries(option.names_i18n || {})
                .map(([lang, value]) => [normalizeLanguageKey(lang), String(value || "").trim()])
                .filter(([lang]) => Boolean(lang))
            ) as Record<string, string>;
            normalizedNames.fr = nameFr;
            const normalizedOptionId = String(option.id || "").trim();
            return {
              ...(isUuidLike(normalizedOptionId) ? { id: normalizedOptionId } : {}),
              product_id: savedDishIdRaw,
              name: nameFr,
              name_fr: nameFr,
              names_i18n: normalizedNames,
              price_override:
                option.price_override == null || !Number.isFinite(option.price_override)
                  ? null
                  : Number(option.price_override),
            };
          })
          .filter(Boolean) as Array<Record<string, unknown>>;
        const variantRowsBasicByProductId = variantRowsRich.map((row) => ({
          product_id: row.product_id,
          name: row.name,
          price_override: row.price_override,
        }));
        const variantRowsBasicByDishId = variantRowsRich.map((row) => ({
          dish_id: row.product_id,
          name: row.name,
          price_override: row.price_override,
        }));
        if (shouldSyncProductOptions) {
        let productOptionsDeleteResult = await supabase
          .from("product_options")
          .delete()
          .eq("product_id", savedDishIdRaw as never);
        if (productOptionsDeleteResult.error && hasMissingColumnError(productOptionsDeleteResult.error, "product_id")) {
          productOptionsDeleteResult = await supabase
            .from("product_options")
            .delete()
            .eq("dish_id", savedDishIdRaw as never);
        }
        if (productOptionsDeleteResult.error) {
          if (isMissingTableError(productOptionsDeleteResult.error)) {
            console.warn("Table product_options absente: synchronisation variantes ignorée.");
          } else {
            console.error("Erreur suppression product_options:", productOptionsDeleteResult.error);
            alert(`Plat sauvegardé mais erreur de synchronisation des variantes: ${productOptionsDeleteResult.error.message}`);
            if (!isFormulaDish) return;
          }
        }
        if (variantRowsRich.length > 0) {
          let insertVariantsResult = await supabase.from("product_options").insert(variantRowsRich as never);
          if (insertVariantsResult.error && hasMissingColumnError(insertVariantsResult.error)) {
            insertVariantsResult = await supabase.from("product_options").insert(variantRowsBasicByProductId as never);
          }
          if (insertVariantsResult.error && hasMissingColumnError(insertVariantsResult.error, "product_id")) {
            insertVariantsResult = await supabase.from("product_options").insert(variantRowsBasicByDishId as never);
          }
          if (insertVariantsResult.error) {
            if (isMissingTableError(insertVariantsResult.error)) {
              console.warn("Table product_options absente: insertion variantes ignorée.");
            } else {
              console.error("Erreur insertion variantes product_options:", insertVariantsResult.error);
              alert(`Plat sauvegardé mais erreur d'enregistrement des variantes: ${insertVariantsResult.error.message}`);
              if (!isFormulaDish) return;
            }
          }
        }

        }
        const formulaTableMigrationHint = " Vérifiez la table restaurant_formulas.";
        if (isFormulaDish) {
          const forceFormulaFlagResult = await supabase
            .from("dishes")
            .update({ is_formula: true } as never)
            .eq("id", savedDishIdRaw as never)
            .eq("restaurant_id", scopedRestaurantId);
          if (forceFormulaFlagResult.error) {
            alert(`Erreur SQL : ${forceFormulaFlagResult.error.message}`);
            return;
          }
          let dataToSave = {
            dish_id: savedDishId,
            restaurant_id: scopedRestaurantId,
            allergens: normalizedFormulaAllergenIds.length > 0 ? normalizedFormulaAllergenIds : null,
            ...(excludedMainOptionsTouched ? { excluded_main_options: normalizedExcludedMainOptionIdsForSave } : {}),
            formula_config: {
              ...baseFormulaConfigForSave,
              selected_dishes: selectedFormulaDishesForFormulaConfig,
              steps: formulaStepEntriesForFormulaConfig,
              steps_by_dish: dishStepsForFormulaConfig,
              main_dish_step: mainStepForFormulaConfig,
              step_count: Math.max(1, formulaStepEntriesForFormulaConfig.length),
              steps_details: stepsDetailsForFormulaConfig,
              custom_name: customFormulaName || null,
              custom_price: customFormulaPrice,
              custom_kcal: customFormulaKcal,
              custom_description: customFormulaDescription || null,
              custom_image_url: customFormulaImageUrl || null,
              custom_name_i18n:
                formData.formula_name_i18n && typeof formData.formula_name_i18n === "object"
                  ? formData.formula_name_i18n
                  : {},
              custom_description_i18n:
                formData.formula_description_i18n && typeof formData.formula_description_i18n === "object"
                  ? formData.formula_description_i18n
                  : {},
              base_dish_snapshot: baseDishSnapshot,
            },
          };
          let upsertFormulaResult:
            | { error: { message?: string; code?: string } | null; formulaId: string | null }
            | { error: unknown; formulaId: string | null } = await (async () => {
            const formulaData = { ...dataToSave };
            console.log("PAYLOAD ENVOYÉ :", formulaData);
            const upsertResult = await supabase
              .from("restaurant_formulas")
              .upsert(formulaData as never, { onConflict: "dish_id" });
            return {
              error: upsertResult.error,
              formulaId: null,
            };
          })();
          if (upsertFormulaResult.error && hasAllergensTypeMismatch(upsertFormulaResult.error)) {
            dataToSave = withAllergensAsString(dataToSave as unknown as Record<string, unknown>) as typeof dataToSave;
            const formulaData = { ...dataToSave };
            console.log("PAYLOAD ENVOYÉ :", formulaData);
            const retryUpsertResult = await supabase
              .from("restaurant_formulas")
              .upsert(formulaData as never, { onConflict: "dish_id" });
            upsertFormulaResult = {
              error: retryUpsertResult.error,
              formulaId: null,
            };
          }
          if (upsertFormulaResult.error) {
            const upsertFormulaError = upsertFormulaResult.error as { message?: string; code?: string };
            const errMessage = upsertFormulaError.message || String(upsertFormulaError);
            console.warn("Erreur sauvegarde restaurant_formulas:", errMessage);
            alert(`Erreur SQL : ${errMessage}`);
          } else {
            let formulaId = String(upsertFormulaResult.formulaId || "").trim();
            if (!formulaId) {
              const formulaIdLookup = await supabase
                .from("restaurant_formulas")
                .select("id")
                .eq("dish_id", savedDishId)
                .eq("restaurant_id", scopedRestaurantId)
                .maybeSingle();
              if (formulaIdLookup.error) {
                console.warn("Lookup formula id failed after upsert:", formulaIdLookup.error.message);
              } else {
                formulaId = String((formulaIdLookup.data as Record<string, unknown> | null)?.id || "").trim();
              }
            }
            setFormData((prev) => ({
              ...prev,
              formula_config: {
                ...(prev.formula_config && typeof prev.formula_config === "object" && !Array.isArray(prev.formula_config)
                  ? (prev.formula_config as Record<string, unknown>)
                  : {}),
                ...(dataToSave.formula_config as Record<string, unknown>),
              },
            }));
            setSelectedMainDishOptions(normalizedExcludedMainOptionIdsForSave);
            alert("Formule sauvegardée avec succès !");
          }
        } else {
          const deleteFormulaResult = await supabase.from("restaurant_formulas").delete().eq("dish_id", savedDishIdRaw as never);
          if (deleteFormulaResult.error) {
            console.warn("Erreur suppression restaurant_formulas:", deleteFormulaResult.error.message);
          }
        }
      } else {
        console.warn("Impossible de synchroniser dish_options/product_options: dishId introuvable après sauvegarde du plat");
      }

      // Évite le revert visuel immédiat: on conserve l'état optimiste local
      // basé sur la réponse serveur, sans refetch instantané potentiellement stale.
      setDishSaveStatus("success");
      saveCompleted = true;
      window.setTimeout(() => {
        setShowDishModal(false);
      }, 900);
    } catch (error: any) {
      console.error("Unexpected save error:", error);
      alert("Erreur: " + (error?.message || "Erreur inconnue"));
    } finally {
      if (!saveCompleted) {
        setDishSaveStatus("idle");
      }
    }
  };

  return { handleSave };
}


