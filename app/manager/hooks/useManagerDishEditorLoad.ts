// @ts-nocheck
import { supabase } from "../../lib/supabase";

export function useManagerDishEditorLoad(deps: Record<string, any>) {
  const {
    setDishSaveStatus,
    setMainOptionsSaveStatus,
    setFormulaVisibilitySaveStatus,
    setFormulaSupplementsSaveStatus,
    setActiveDishModalTab,
    setFormulaMainOptionsFormulaId,
    setSelectedMainDishOptions,
    setExcludedMainOptionsTouched,
    setSelectedFormulaDishes,
    setDishSteps,
    setMainDishStep,
    setIsRadarLoaded,
    setFormulaDescription,
    setFormulaImage,
    setFormulaKcal,
    setFormulaAllergens,
    parseOptionsFromDescription,
    parseObjectRecord,
    parseHungerLevels,
    normalizeHungerLevel,
    resolveLegacyHungerLevelLabel,
    parseJsonObject,
    activeLanguageCodes,
    normalizeLanguageKey,
    getLanguageColumnKeys,
    toBoolean,
    formulaLinksByDishId,
    formulaLinksByFormulaId,
    formulaLinkSequenceByFormulaId,
    formulaLinkDefaultOptionsByFormulaId,
    formulaLinkDisplayByFormulaId,
    scopedRestaurantId,
    hasMissingColumnError,
    normalizeFormulaStepEntries,
    buildDishStepMapFromFormulaSteps,
    buildFormulaStepsFromDishStepMap,
    parseExtrasFromUnknown,
    normalizeText,
    allergenLibrary,
    mergeExtrasUnique,
    createLocalId,
    parseDishOptionsRowsToExtras,
    parseI18nToken,
    setFormData,
    getDishDisplayDescription,
    parseDishAvailableDays,
    normalizeTimeInput,
    setImagePreviewUrl,
    setFormulaImagePreviewUrl,
    setEditingDish,
    setAllergenFormI18n,
    setDishExtraDraft,
    setEditingExtraId,
    setEditingExtraOriginKey,
    setLoadedDishExtras,
    setExtrasTouched,
    setProductOptionDraft,
    setEditingProductOptionId,
    setOpenDishLanguagePanels,
    setSelectedDishLanguageCode,
    setSelectedOptionLanguageCode,
    setSelectedExtraLanguageCode,
    setSelectedFormulaLanguageCode,
    setShowDishModal,
  } = deps;

  const handleEditDish = async (dish: Dish) => {
    setDishSaveStatus("idle");
    setMainOptionsSaveStatus("idle");
    setFormulaVisibilitySaveStatus("idle");
    setFormulaSupplementsSaveStatus("idle");
    setActiveDishModalTab("general");
    setFormulaMainOptionsFormulaId("");
    setSelectedMainDishOptions([]);
    setExcludedMainOptionsTouched(false);
    setSelectedFormulaDishes([]);
    setDishSteps({});
    setMainDishStep(1);
    setIsRadarLoaded(false);
    setFormulaDescription("");
    setFormulaImage("");
    setFormulaKcal("");
    setFormulaAllergens([]);
    const dishRecord = dish as unknown as any;
    const parsed = parseOptionsFromDescription(dish.description || "");
    const dietaryRaw = (dish as unknown as any).dietary_tag;
    const dietary =
      typeof dietaryRaw === "string"
        ? (() => {
            try {
              return JSON.parse(dietaryRaw) as any;
            } catch {
              return {};
            }
          })()
        : (dietaryRaw as any | null) || {};
    const badgeFlags = parseObjectRecord((dietary as any).badges);
    const nameI18n =
      dietary?.i18n && typeof dietary.i18n === "object" && (dietary.i18n as any).name
        ? ((dietary.i18n as any).name as any)
        : {};
    const descriptionI18n =
      dietary?.i18n && typeof dietary.i18n === "object" && (dietary.i18n as any).description
        ? ((dietary.i18n as any).description as any)
        : {};
    const dietaryI18nNode =
      dietary?.i18n && typeof dietary.i18n === "object" ? (dietary.i18n as any) : {};
    const resolvedHungerLevels = parseHungerLevels(
      dishRecord.hunger_levels ??
        (dietary as any).hunger_levels ??
        dishRecord.hunger_level ??
        (dietary as any).hunger_level ??
        (dietary as any).hunger
    );
    const resolvedHungerLevel =
      normalizeHungerLevel(dishRecord.hunger_level ?? (dietary as any).hunger_level ?? (dietary as any).hunger) ||
      resolveLegacyHungerLevelLabel(resolvedHungerLevels);
    const salesTipI18nNode = parseJsonObject((dietary as any).sales_tip_i18n);
    const dishTranslationsNode = parseJsonObject(dishRecord.translations);
    const translatedNamesNode = parseJsonObject(dishTranslationsNode.name);
    const translatedDescriptionsNode = parseJsonObject(dishTranslationsNode.description);
    const directNameByLang = Object.fromEntries(
      activeLanguageCodes.map((code) => {
        const normalizedCode = normalizeLanguageKey(code);
        const translatedNestedValue = String(translatedNamesNode[normalizedCode] ?? translatedNamesNode[code] ?? "").trim();
        const translatedDirectNode = parseJsonObject(dishTranslationsNode[normalizedCode] ?? dishTranslationsNode[code]);
        const translatedDirectValue = String(
          translatedDirectNode.name ?? translatedDirectNode.name_fr ?? dishTranslationsNode[`name_${normalizedCode}`] ?? ""
        ).trim();
        const value =
          getLanguageColumnKeys("name", code)
            .map((key) => String(dishRecord[key] || "").trim())
            .find(Boolean) ||
          translatedNestedValue ||
          translatedDirectValue ||
          "";
        return [code, value];
      })
    ) as Record<string, string>;
    const directDescriptionByLang = Object.fromEntries(
      activeLanguageCodes.map((code) => {
        const normalizedCode = normalizeLanguageKey(code);
        const translatedNestedValue = String(
          translatedDescriptionsNode[normalizedCode] ?? translatedDescriptionsNode[code] ?? ""
        ).trim();
        const translatedDirectNode = parseJsonObject(dishTranslationsNode[normalizedCode] ?? dishTranslationsNode[code]);
        const translatedDirectValue = String(
          translatedDirectNode.description ??
            translatedDirectNode.description_fr ??
            dishTranslationsNode[`description_${normalizedCode}`] ??
            ""
        ).trim();
        const value =
          getLanguageColumnKeys("description", code)
            .map((key) => String(dishRecord[key] || "").trim())
            .find(Boolean) ||
          translatedNestedValue ||
          translatedDirectValue ||
          "";
        return [code, value];
      })
    ) as Record<string, string>;
    const directSuggestionByLang = Object.fromEntries(
      activeLanguageCodes.map((code) => {
        const value =
          [
            ...getLanguageColumnKeys("suggestion", code),
            ...getLanguageColumnKeys("suggestion_message", code),
          ]
            .map((key) => String(dishRecord[key] || "").trim())
            .find(Boolean) || "";
        return [code, value];
      })
    ) as Record<string, string>;
    const rawFormulaCategoryIds = (dishRecord as any).formula_category_ids;
    const normalizedFormulaCategoryIds = Array.isArray(rawFormulaCategoryIds)
      ? rawFormulaCategoryIds.map((id) => String(id)).filter(Boolean)
      : typeof rawFormulaCategoryIds === "string"
        ? rawFormulaCategoryIds
            .replace(/[{}]/g, "")
            .split(",")
            .map((value) => String(value || "").trim())
            .filter(Boolean)
        : [];
    const isFormula = toBoolean((dishRecord as any).is_formula, false);
    const onlyInFormula = toBoolean((dishRecord as any).only_in_formula, false);
    const currentDishId = String(dish.id || "").trim();
    const linkedFormulaIds = currentDishId ? formulaLinksByDishId.get(currentDishId) || [] : [];
    const linkedFormulaDishIds = currentDishId ? formulaLinksByFormulaId.get(currentDishId) || [] : [];
    const linkedFormulaSequenceMap = currentDishId
      ? Object.fromEntries(Array.from(formulaLinkSequenceByFormulaId.get(currentDishId) || new Map()).map(([k, v]) => [k, v]))
      : {};
      const linkedFormulaDefaultOptions =
        currentDishId && formulaLinkDefaultOptionsByFormulaId.get(currentDishId)
          ? Object.fromEntries(formulaLinkDefaultOptionsByFormulaId.get(currentDishId) || [])
          : {};
      const linkedFormulaDisplay = currentDishId ? formulaLinkDisplayByFormulaId.get(currentDishId) : undefined;
      let formulaConfigFromRestaurantFormulas: Record<string, unknown> | null = null;
      let formulaSupplementsFromRestaurantFormulas: unknown = null;
      let hasFormulaSupplementsFromRestaurantFormulas = false;
      let excludedMainOptionsFromRestaurantFormulas: unknown = null;
      let hasExcludedMainOptionsFromRestaurantFormulas = false;
      let formulaVisibleFromRestaurantFormulas: boolean | null = null;
      let formulaRowIdForMainOptions = "";
      if (isFormula && scopedRestaurantId && currentDishId) {
        const formulaRowPrimary = await supabase
          .from("restaurant_formulas")
          .select("id,dish_id,restaurant_id,name,price,description,calories,allergens,formula_visible,formula_supplements,formula_config,excluded_main_options")
          .eq("restaurant_id", scopedRestaurantId)
          .eq("dish_id", currentDishId)
          .maybeSingle();
        const formulaRowFallback =
          formulaRowPrimary.error && hasMissingColumnError(formulaRowPrimary.error)
            ? await supabase
                .from("restaurant_formulas")
                .select("id,dish_id,restaurant_id,name,price,description,calories,allergens,formula_config,excluded_main_options")
                .eq("restaurant_id", scopedRestaurantId)
                .eq("dish_id", currentDishId)
                .maybeSingle()
            : null;
        const formulaRowQuery = formulaRowFallback ?? formulaRowPrimary;
        if (formulaRowQuery.error) {
          console.warn("restaurant_formulas fetch failed (manager edit modal):", formulaRowQuery.error.message);
        } else if (formulaRowQuery.data && typeof formulaRowQuery.data === "object") {
          const row = formulaRowQuery.data as Record<string, unknown>;
          formulaRowIdForMainOptions = String(row.id || "").trim();
          hasFormulaSupplementsFromRestaurantFormulas = Object.prototype.hasOwnProperty.call(
            row,
            "formula_supplements"
          );
          formulaSupplementsFromRestaurantFormulas = row.formula_supplements;
          hasExcludedMainOptionsFromRestaurantFormulas = Object.prototype.hasOwnProperty.call(
            row,
            "excluded_main_options"
          );
          excludedMainOptionsFromRestaurantFormulas = row.excluded_main_options;
          formulaVisibleFromRestaurantFormulas =
            row.formula_visible == null ? null : toBoolean(row.formula_visible, true);
          const raw = row.formula_config;
          formulaConfigFromRestaurantFormulas =
            typeof raw === "string"
              ? parseJsonObject(raw)
              : raw && typeof raw === "object" && !Array.isArray(raw)
                ? (raw as Record<string, unknown>)
                : null;
        }
      }
      const formulaConfigRaw = formulaConfigFromRestaurantFormulas ?? dishRecord.formula_config;
      const formulaConfig =
        typeof formulaConfigRaw === "string"
          ? parseJsonObject(formulaConfigRaw)
          : (formulaConfigRaw as Record<string, unknown> | null) || {};
      const normalizeOptionIdList = (value: unknown): string[] => {
        const stripWrappingQuotes = (rawValue: unknown) =>
          String(rawValue || "")
            .trim()
            .replace(/^["']+|["']+$/g, "")
            .trim();
        if (Array.isArray(value)) {
          return value.map((entry) => stripWrappingQuotes(entry)).filter(Boolean);
        }
        if (typeof value === "string") {
          const raw = value.trim();
          if (!raw) return [];
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              return parsed.map((entry) => stripWrappingQuotes(entry)).filter(Boolean);
            }
          } catch {
            // Ignore malformed JSON and fall back to CSV parsing.
          }
          return raw
            .replace(/[{}]/g, "")
            .split(",")
            .map((entry) => stripWrappingQuotes(entry))
            .filter(Boolean);
        }
        return [];
      };
      const mainOptionsFromConfig = hasExcludedMainOptionsFromRestaurantFormulas
        ? normalizeOptionIdList(excludedMainOptionsFromRestaurantFormulas)
        : [];
      const resolvedMainDishOptionIdsForState = Array.from(
        new Set(mainOptionsFromConfig.map((value) => String(value || "").trim()).filter(Boolean))
      );
      setFormulaMainOptionsFormulaId(formulaRowIdForMainOptions || "");
      const parsedFormulaStepsFromConfig = normalizeFormulaStepEntries(
        (formulaConfig as Record<string, unknown> | null)?.steps
      );
      const rawStepsFromConfig = parseObjectRecord(
        (formulaConfig as Record<string, unknown> | null)?.steps_by_dish ??
          (formulaConfig as Record<string, unknown> | null)?.steps
      );
      const normalizedDishStepsLegacyFromConfig = Object.fromEntries(
        Object.entries(rawStepsFromConfig)
          .map(([dishId, step]) => [String(dishId || "").trim(), Math.max(1, Math.trunc(Number(step) || 1))])
          .filter(([dishId]) => Boolean(dishId))
      ) as Record<string, number>;
      const normalizedMainDishStepFromConfig = Math.max(
        1,
        Math.trunc(
          Number(
            (formulaConfig as Record<string, unknown> | null)?.main_dish_step ??
              (formulaConfig as Record<string, unknown> | null)?.step_count ??
              linkedFormulaSequenceMap[currentDishId] ??
              1
          ) || 1
        )
      );
      const rawFormulaDishIdsFromConfig =
        (formulaConfig as Record<string, unknown>)?.dish_ids ??
        (formulaConfig as Record<string, unknown>)?.selected_dishes ??
        (formulaConfig as Record<string, unknown>)?.selected_dish_ids ??
        (formulaConfig as Record<string, unknown>)?.dishIds ??
        [];
      const normalizedFormulaDishIdsFromConfig = Array.from(new Set(normalizeOptionIdList(rawFormulaDishIdsFromConfig)));
      const resolvedFormulaDishIds = Array.from(
        new Set(
          [...(Array.isArray(linkedFormulaDishIds) ? linkedFormulaDishIds : []), ...normalizedFormulaDishIdsFromConfig]
            .map((value) => String(value || "").trim())
            .filter(Boolean)
        )
      );
      const normalizedDishStepsFromStructured = buildDishStepMapFromFormulaSteps(parsedFormulaStepsFromConfig);
      const normalizedDishStepsFromConfig =
        Object.keys(normalizedDishStepsFromStructured).length > 0
          ? normalizedDishStepsFromStructured
          : normalizedDishStepsLegacyFromConfig;
      const resolvedFormulaSequenceMap = isFormula
        ? {
            ...linkedFormulaSequenceMap,
            ...normalizedDishStepsFromConfig,
            ...(currentDishId ? { [currentDishId]: normalizedMainDishStepFromConfig } : {}),
          }
        : {};
      if (!excludedMainOptionsTouched && hasExcludedMainOptionsFromRestaurantFormulas) {
        setSelectedMainDishOptions(resolvedMainDishOptionIdsForState);
        setExcludedMainOptionsTouched(false);
      }
      setSelectedFormulaDishes(resolvedFormulaDishIds);
      setDishSteps(normalizedDishStepsFromConfig);
      setMainDishStep(normalizedMainDishStepFromConfig);
      const resolvedFormulaConfig =
        isFormula
          ? {
              ...(formulaConfig || {}),
              options:
                (formulaConfig as Record<string, unknown>)?.options ??
                linkedFormulaDefaultOptions,
              default_option_ids:
                (formulaConfig as Record<string, unknown>)?.default_option_ids ??
                (formulaConfig as Record<string, unknown>)?.options ??
                linkedFormulaDefaultOptions,
              dish_ids: resolvedFormulaDishIds,
              selected_dishes: resolvedFormulaDishIds,
              steps:
                parsedFormulaStepsFromConfig.length > 0
                  ? parsedFormulaStepsFromConfig
                  : buildFormulaStepsFromDishStepMap(normalizedDishStepsFromConfig, resolvedFormulaDishIds),
              steps_by_dish: normalizedDishStepsFromConfig,
              main_dish_step: normalizedMainDishStepFromConfig,
            }
          : null;
      const formulaI18nNode = parseObjectRecord((resolvedFormulaConfig as Record<string, unknown> | null)?.i18n);
      const formulaNameI18nNode = parseObjectRecord(formulaI18nNode.name);
      const formulaDescriptionI18nNode = parseObjectRecord(formulaI18nNode.description);
      const formulaCustomNameI18nNode = parseObjectRecord(
        (resolvedFormulaConfig as Record<string, unknown> | null)?.custom_name_i18n
      );
      const formulaCustomDescriptionI18nNode = parseObjectRecord(
        (resolvedFormulaConfig as Record<string, unknown> | null)?.custom_description_i18n
      );
      const linkedFormulaPrice =
        linkedFormulaDisplay && linkedFormulaDisplay.price != null && Number.isFinite(Number(linkedFormulaDisplay.price))
          ? Number(linkedFormulaDisplay.price)
          : null;
      const formulaSupplementsFromColumn = hasFormulaSupplementsFromRestaurantFormulas
        ? parseExtrasFromUnknown(formulaSupplementsFromRestaurantFormulas)
        : [];
      const formulaSupplementsFromDisplay = parseExtrasFromUnknown(
        (linkedFormulaDisplay as { formula_supplements?: ExtrasItem[] } | undefined)?.formula_supplements
      );
      const formulaActiveFlag =
        isFormula && formulaVisibleFromRestaurantFormulas != null
          ? Boolean(formulaVisibleFromRestaurantFormulas)
          : isFormula && linkedFormulaDisplay
            ? toBoolean((linkedFormulaDisplay as any).formula_visible ?? true, true)
          : true;
    const rawFormulaAllergensFromDisplay = isFormula
      ? Array.isArray((linkedFormulaDisplay as any)?.allergens)
        ? ((linkedFormulaDisplay as any)?.allergens as string[])
        : String((linkedFormulaDisplay as any)?.allergens || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
      : [];
    const mappedFormulaAllergenIdsFromDisplay = rawFormulaAllergensFromDisplay
      .map((value) => {
        const normalizedValue = normalizeText(String(value || "").trim());
        if (!normalizedValue) return "";
        const byId = allergenLibrary.find((row) => normalizeText(String(row.id || "").trim()) === normalizedValue);
        if (byId?.id) return String(byId.id);
        const byName = allergenLibrary.find((row) => normalizeText(String(row.name_fr || "").trim()) === normalizedValue);
        return byName?.id ? String(byName.id) : "";
      })
      .filter(Boolean);
    const manualAllergensByName = parseJsonObject(dietaryI18nNode.allergens_manual);
    const dietaryAllergensListRaw =
      (dietary as any).allergens_selected ??
      (dietary as any).allergens_fr ??
      (dietary as any).allergens;
    const dishAllergensRaw = (dish as unknown as any).allergens;
    const combinedAllergenValues = [
      ...(Array.isArray(dietaryAllergensListRaw)
        ? dietaryAllergensListRaw
        : typeof dietaryAllergensListRaw === "string"
          ? dietaryAllergensListRaw.split(",")
          : []),
      ...(Array.isArray(dishAllergensRaw)
        ? dishAllergensRaw
        : typeof dishAllergensRaw === "string"
          ? dishAllergensRaw.split(",")
          : []),
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    const initialAllergenIds = Array.from(
      new Set(
        combinedAllergenValues
          .map((value) => {
            const normalizedValue = normalizeText(value);
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
    const initialAllergenTranslations = Object.fromEntries(
      initialAllergenIds.map((allergenId) => {
        const allergenRow = allergenLibrary.find((entry) => String(entry.id || "") === allergenId);
        const allergenFr = String(allergenRow?.name_fr || allergenId).trim();
        const row = parseJsonObject(manualAllergensByName[allergenFr]);
        const values = Object.fromEntries(
          activeLanguageCodes.map((code) => {
            const normalizedCode = normalizeLanguageKey(String(code || ""));
            const fallbackFr = normalizedCode === "fr" ? allergenFr : "";
            return [normalizedCode, String(row[normalizedCode] || row[code] || fallbackFr || "").trim()];
          })
        );
        return [allergenFr, values];
      })
    ) as Record<string, Record<string, string>>;
    const extrasFromColumn = mergeExtrasUnique(
      parseExtrasFromUnknown(dish.extras),
      parseExtrasFromUnknown(dish.extras_list)
    );
    let initialExtras = isFormula
      ? mergeExtrasUnique(formulaSupplementsFromColumn, formulaSupplementsFromDisplay)
      : mergeExtrasUnique(extrasFromColumn, parsed.extrasList || []);
    if (isFormula && initialExtras.length === 0) {
      initialExtras = mergeExtrasUnique(extrasFromColumn, parsed.extrasList || []);
    }
    let initialProductOptions: ProductOptionItem[] = [];
    if (dish.id != null) {
      if (!isFormula) {
        const dishOptionsQuery = await supabase
          .from("dish_options")
          .select("*")
          .eq("dish_id", dish.id);
        if (!dishOptionsQuery.error && Array.isArray(dishOptionsQuery.data)) {
          const extrasFromDishOptions = parseDishOptionsRowsToExtras(
            dishOptionsQuery.data as Array<Record<string, unknown>>
          );
          if (extrasFromDishOptions.length > 0) {
            initialExtras = extrasFromDishOptions;
          }
        } else if (dishOptionsQuery.error) {
          console.warn("dish_options fetch failed (manager edit modal):", dishOptionsQuery.error.message);
        }
      }

      let productOptionsQuery = await supabase
        .from("product_options")
        .select("*")
        .eq("product_id", dish.id)
        .order("created_at", { ascending: true });
      if (productOptionsQuery.error && hasMissingColumnError(productOptionsQuery.error, "product_id")) {
        productOptionsQuery = await supabase
          .from("product_options")
          .select("*")
          .eq("dish_id", dish.id)
          .order("created_at", { ascending: true });
      }
      if (!productOptionsQuery.error && Array.isArray(productOptionsQuery.data)) {
        initialProductOptions = (productOptionsQuery.data as Array<Record<string, unknown>>)
          .map((row) => {
            const optionNames = {
              ...parseObjectRecord(row.names_i18n),
              ...parseI18nToken(String(row.name_en || "")),
            };
            const name = String(row.name_fr || optionNames.fr || row.name || "").trim();
            if (!name) return null;
            const priceRaw = row.price_override;
            const priceOverride =
              priceRaw == null || String(priceRaw).trim() === ""
                ? null
                : Number.parseFloat(String(priceRaw).replace(",", "."));
            return {
              id: String(row.id || createLocalId()),
              product_id: String(row.product_id || row.dish_id || dish.id || ""),
              name,
              name_fr: name,
              name_en: String(row.name_en || optionNames.en || "").trim() || null,
              name_es: String(row.name_es || optionNames.es || "").trim() || null,
              name_de: String(row.name_de || optionNames.de || "").trim() || null,
              names_i18n: {
                fr: name,
                ...Object.fromEntries(
                  Object.entries(optionNames)
                    .map(([lang, value]) => [normalizeLanguageKey(lang), String(value || "").trim()])
                    .filter(([lang, value]) => Boolean(lang) && Boolean(value))
                ),
              },
              price_override: Number.isFinite(priceOverride as number) ? Number(priceOverride) : null,
            } as ProductOptionItem;
          })
          .filter(Boolean) as ProductOptionItem[];
      } else if (productOptionsQuery.error) {
        console.warn("product_options fetch failed (manager edit modal):", productOptionsQuery.error.message);
      }
    }
    setFormData({
      name_fr: dish.name_fr || dish.name || "",
      name_en: dish.name_en || "",
      name_es: dish.name_es || "",
      name_de: dish.name_de || "",
      name_i18n: {
        ...Object.fromEntries(
          Object.entries(nameI18n || {}).map(([k, v]) => [String(k || "").toLowerCase(), String(v ?? "")])
        ),
        ...Object.fromEntries(
          Object.entries(translatedNamesNode || {}).map(([k, v]) => [normalizeLanguageKey(k), String(v || "").trim()])
        ),
        ...Object.fromEntries(activeLanguageCodes.map((code) => [code, directNameByLang[code] || ""])),
      },
      description_fr: getDishDisplayDescription(dish) || "",
      description_en: dish.description_en || "",
      description_es: dish.description_es || "",
      description_de: dish.description_de || "",
      description_i18n: {
        ...Object.fromEntries(
          Object.entries(descriptionI18n || {}).map(([k, v]) => [String(k || "").toLowerCase(), String(v ?? "")])
        ),
        ...Object.fromEntries(
          Object.entries(translatedDescriptionsNode || {}).map(([k, v]) => [normalizeLanguageKey(k), String(v || "").trim()])
        ),
        ...Object.fromEntries(activeLanguageCodes.map((code) => [code, directDescriptionByLang[code] || ""])),
      },
      price: dish.price?.toString() || "",
      formula_price:
        isFormula && linkedFormulaPrice != null
          ? String(linkedFormulaPrice)
          : (dish as unknown as any).formula_price == null
            ? ""
            : String((dish as unknown as any).formula_price),
      available_days: parseDishAvailableDays(dish.available_days),
      start_time: normalizeTimeInput(dish.start_time),
      end_time: normalizeTimeInput(dish.end_time),
      category_id: dish.category_id != null ? String(dish.category_id) : "",
      subcategory_id: dish.subcategory_id != null ? String(dish.subcategory_id) : "",
      hunger_level: resolvedHungerLevel,
      hunger_levels: resolvedHungerLevels,
      image_url: dish.image_url || "",
      calories:
        ((dish as unknown as any).calories ?? (dish as unknown as any).calories_min) == null
          ? ""
          : String((dish as unknown as any).calories ?? (dish as unknown as any).calories_min),
      allergens: initialAllergenIds.join(", "),
      has_sides: !!dish.has_sides,
      has_extras: initialExtras.length > 0 ? true : !!dish.has_extras,
      allow_multi_select: !!(dish as unknown as any).allow_multi_select,
      ask_cooking: dish.ask_cooking ?? !!parsed.askCooking,
      is_vegetarian_badge: toBoolean(
        (dish as unknown as any).dish_is_vegetarian ??
          (dish as unknown as any).is_vegetarian ??
          (dietary as any).is_vegetarian ??
          badgeFlags.vegetarian,
        false
      ),
      is_spicy_badge: toBoolean(
        (dish as unknown as any).dish_is_spicy ??
          (dish as unknown as any).is_spicy ??
          (dietary as any).is_spicy ??
          badgeFlags.spicy,
        false
      ),
      is_new_badge: toBoolean(
        (dish as unknown as any).dish_is_new ??
          (dietary as any).is_new ??
          (dietary as any).new_badge ??
          badgeFlags.new,
        false
      ),
      is_gluten_free_badge: toBoolean(
        (dietary as any).is_gluten_free ??
          (dietary as any).gluten_free ??
          badgeFlags.gluten_free,
        false
      ),
      is_chef_suggestion: toBoolean(
        (dish as unknown as any).is_chef_suggestion ?? dish.is_featured,
        false
      ),
      is_daily_special: toBoolean(
        (dish as unknown as any).is_daily_special ?? dish.is_special,
        false
      ),
      is_promo: toBoolean((dish as unknown as any).dish_on_promo ?? (dish as unknown as any).is_promo, false),
      is_alcohol: toBoolean(
        (dish as unknown as any).is_alcohol ??
          (dietary as any).is_alcohol ??
          (dietary as any).alcohol,
        false
      ),
      promo_price:
        (dish as unknown as any).promo_price == null
          ? ""
          : String((dish as unknown as any).promo_price),
      is_suggestion: toBoolean(
        (dish as unknown as any).is_suggestion ??
          (dish as unknown as any).is_chef_suggestion ??
          dish.is_featured,
        false
      ),
        is_formula: isFormula,
        formula_category_ids: isFormula ? normalizedFormulaCategoryIds : [],
        formula_dish_ids: isFormula ? resolvedFormulaDishIds : [],
        formula_default_option_ids: isFormula ? linkedFormulaDefaultOptions : {},
        formula_config: resolvedFormulaConfig,
        formula_sequence_by_dish: resolvedFormulaSequenceMap,
      formula_name: isFormula ? String(linkedFormulaDisplay?.name || dish.name_fr || dish.name || "").trim() : "",
      formula_name_i18n: isFormula
        ? Object.fromEntries(
            activeLanguageCodes.map((code) => {
              const normalizedCode = normalizeLanguageKey(code);
              const fallback = normalizedCode === "fr" ? String(linkedFormulaDisplay?.name || dish.name_fr || dish.name || "").trim() : "";
              return [
                normalizedCode,
                String(
                  formulaCustomNameI18nNode[normalizedCode] ||
                    formulaCustomNameI18nNode[code] ||
                    formulaNameI18nNode[normalizedCode] ||
                    formulaNameI18nNode[code] ||
                    fallback ||
                    ""
                ).trim(),
              ];
            })
          )
        : {},
      formula_image_url: isFormula ? String(linkedFormulaDisplay?.imageUrl || "").trim() : "",
      formula_description: isFormula ? String((linkedFormulaDisplay as any)?.description || "").trim() : "",
      formula_description_i18n: isFormula
        ? Object.fromEntries(
            activeLanguageCodes.map((code) => {
              const normalizedCode = normalizeLanguageKey(code);
              const fallback = normalizedCode === "fr" ? String((linkedFormulaDisplay as any)?.description || "").trim() : "";
              return [
                normalizedCode,
                String(
                  formulaCustomDescriptionI18nNode[normalizedCode] ||
                    formulaCustomDescriptionI18nNode[code] ||
                    formulaDescriptionI18nNode[normalizedCode] ||
                    formulaDescriptionI18nNode[code] ||
                    fallback ||
                    ""
                ).trim(),
              ];
            })
          )
        : {},
      formula_calories:
        isFormula && (linkedFormulaDisplay as any)?.calories != null
          ? String((linkedFormulaDisplay as any).calories)
          : "",
      formula_allergens: isFormula ? mappedFormulaAllergenIdsFromDisplay : [],
      only_in_formula: onlyInFormula,
      linked_formula_ids: !isFormula ? linkedFormulaIds : [],
      max_options: String(dish.max_options ?? 1),
      selected_side_ids: Array.isArray(dish.selected_sides)
        ? dish.selected_sides
        : parsed.sideIds || [],
      extras_list: initialExtras,
      product_options: initialProductOptions,
      sales_tip:
        directSuggestionByLang.fr ||
        String(dish.suggestion_message || "").trim() ||
        (typeof (dietary as any).sales_tip === "string"
          ? String((dietary as any).sales_tip)
          : ""),
      sales_tip_i18n: Object.fromEntries(
        activeLanguageCodes.map((code) => [
          code,
          String(directSuggestionByLang[code] || salesTipI18nNode[normalizeLanguageKey(code)] || salesTipI18nNode[code] || "").trim(),
        ])
      ),
      sales_tip_dish_id:
        typeof (dietary as any).sales_tip_dish_id === "string"
          ? String((dietary as any).sales_tip_dish_id)
          : typeof (dish as any).suggested_dish_id === "string" || typeof (dish as any).suggested_dish_id === "number"
            ? String((dish as any).suggested_dish_id)
          : "",
      is_active: toBoolean((dish as unknown as any).active ?? true, true),
      is_formula_active: formulaActiveFlag,
    });
    setFormulaDescription(isFormula ? String((linkedFormulaDisplay as any)?.description || "").trim() : "");
    setFormulaImage(isFormula ? String(linkedFormulaDisplay?.imageUrl || "").trim() : "");
    setFormulaKcal(
      isFormula && (linkedFormulaDisplay as any)?.calories != null ? String((linkedFormulaDisplay as any).calories) : ""
    );
    setFormulaAllergens(Array.from(new Set(mappedFormulaAllergenIdsFromDisplay)));
    setImagePreviewUrl(dish.image_url || "");
    setFormulaImagePreviewUrl(
      toBoolean((dish as any).is_formula ?? dish.is_formula, false)
        ? String((linkedFormulaDisplay || {}).imageUrl || "").trim()
        : ""
    );
    setEditingDish(dish);
    setAllergenFormI18n(initialAllergenTranslations);
    setDishExtraDraft({ name_fr: "", name_en: "", name_es: "", name_de: "", names_i18n: {}, price: "" });
    setEditingExtraId(null);
    setEditingExtraOriginKey(null);
    setLoadedDishExtras(initialExtras);
    setExtrasTouched(false);
    setProductOptionDraft({ name: "", price_override: "", names_i18n: {} });
    setEditingProductOptionId(null);
    setOpenDishLanguagePanels(
      Object.fromEntries(activeLanguageCodes.map((code) => [code, code === "fr"]))
    );
    setSelectedDishLanguageCode("fr");
    setSelectedOptionLanguageCode("fr");
    setSelectedExtraLanguageCode("fr");
    setSelectedFormulaLanguageCode("fr");
    setShowDishModal(true);
  };

  return { handleEditDish };
}
