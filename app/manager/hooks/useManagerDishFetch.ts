// @ts-nocheck
import { useEffect } from "react";

export function useManagerDishFetch(deps: Record<string, any>) {
  const {
    scopedRestaurantId,
    supabase,
    setCategories,
    setFormulaLinksByFormulaId,
    setFormulaLinksByDishId,
    setFormulaLinkDefaultOptionsByFormulaId,
    setFormulaMainDishOptionsByFormulaId,
    setFormulaLinkDisplayByFormulaId,
    setFormulaLinkSequenceByFormulaId,
    hasMissingColumnError,
    toLoggableSupabaseError,
    toBoolean,
    parseJsonObject,
    parseExtrasFromUnknown,
    dishesRefetchLockUntilRef,
    lastSaveTimeRef,
    isSavingRef,
    setDishes,
    parseDishOptionsRowsToExtras,
    createLocalId,
    parseObjectRecord,
    parseI18nToken,
    normalizeLanguageKey,
    extractFormulaProductOptionsForManager,
    mergeExtrasUnique,
    mergeProductOptions,
    extractAllergenNamesFromDishPayload,
    normalizeText,
    mergeAllergenLibraryRows,
    setAllergenLibrary,
    editingDish,
    showDishModal,
    formData,
    excludedMainOptionsTouched,
    isRadarLoaded,
    selectedMainDishOptions,
    setSelectedMainDishOptions,
    formulaMainDishOptionsByFormulaId,
  } = deps;

  const fetchCategories = async () => {
    if (!scopedRestaurantId) {
      setCategories([]);
      return;
    }

    let result = await supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", scopedRestaurantId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (result.error && String((result.error as { code?: string })?.code || "") === "42703") {
      result = await supabase
        .from("categories")
        .select("*")
        .eq("restaurant_id", scopedRestaurantId)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true });
    }

    if (result.error && String((result.error as { code?: string })?.code || "") === "42703") {
      result = await supabase
        .from("categories")
        .select("*")
        .eq("restaurant_id", scopedRestaurantId)
        .order("id", { ascending: true });
    }

    if (result.error) {
      console.error("Erreur categories (scope restaurant)", result.error);
      setCategories([]);
      return;
    }

    setCategories((result.data || []) as CategoryItem[]);
  };

  const fetchFormulaDishLinks = async (sourceDishes: Dish[]) => {
    const availableDishIds = new Set(
      sourceDishes
        .map((dish) => String(dish.id || "").trim())
        .filter(Boolean)
    );
    if (availableDishIds.size === 0 || !scopedRestaurantId) {
      setFormulaLinksByFormulaId(new Map());
      setFormulaLinksByDishId(new Map());
      setFormulaLinkDefaultOptionsByFormulaId(new Map());
      setFormulaMainDishOptionsByFormulaId(new Map());
      setFormulaLinkDisplayByFormulaId(new Map());
      setFormulaLinkSequenceByFormulaId(new Map());
      return;
    }

    const formulasPrimary = await supabase
      .from("restaurant_formulas")
      .select("id,dish_id,restaurant_id,formula_config,name,price,image_url,description,calories,allergens,formula_visible,formula_supplements,excluded_main_options")
      .eq("restaurant_id", scopedRestaurantId);
    const formulasFallback =
      formulasPrimary.error && hasMissingColumnError(formulasPrimary.error)
        ? await supabase
            .from("restaurant_formulas")
            .select("id,dish_id,restaurant_id,formula_config")
            .eq("restaurant_id", scopedRestaurantId)
        : null;
    const formulasResult = formulasFallback ?? formulasPrimary;
    if (formulasResult.error) {
      console.warn("restaurant_formulas fetch failed:", toLoggableSupabaseError(formulasResult.error));
      setFormulaLinksByFormulaId(new Map());
      setFormulaLinksByDishId(new Map());
      setFormulaLinkDefaultOptionsByFormulaId(new Map());
      setFormulaMainDishOptionsByFormulaId(new Map());
      setFormulaLinkDisplayByFormulaId(new Map());
      setFormulaLinkSequenceByFormulaId(new Map());
      return;
    }

    const formulaIds: string[] = [];
    const displayByFormula = new Map<
      string,
      {
        name: string;
        imageUrl: string;
        price?: number | null;
        description?: string | null;
        calories?: number | null;
        allergens?: string[] | null;
        formula_visible?: boolean;
        formula_supplements?: ExtrasItem[];
      }
    >();
    (formulasResult.data || []).forEach((row: unknown) => {
      if (!row || typeof row !== "object") return;
      const record = row as any;
      const isFormulaActive = record.formula_visible == null ? true : toBoolean(record.formula_visible, true);
      if (!isFormulaActive) return;
      const formulaId = String(record.dish_id ?? record.id ?? "").trim();
      if (!formulaId) return;
      formulaIds.push(formulaId);
      const formulaConfigRaw = record.formula_config ?? record.options;
      const formulaConfig =
        typeof formulaConfigRaw === "string"
          ? parseJsonObject(formulaConfigRaw)
          : formulaConfigRaw && typeof formulaConfigRaw === "object" && !Array.isArray(formulaConfigRaw)
            ? (formulaConfigRaw as Record<string, unknown>)
            : null;
      const customName = String(formulaConfig?.custom_name || "").trim();
      const customDescription = String(formulaConfig?.custom_description || "").trim();
      const customImageUrl = String(formulaConfig?.custom_image_url || "").trim();
      const customPrice =
        formulaConfig?.custom_price == null ? null : Number(formulaConfig.custom_price);
      const customKcal = formulaConfig?.custom_kcal == null ? null : Number(formulaConfig.custom_kcal);
      const rawImage = String(customImageUrl || record.image_url || record.image_path || record.image || "").trim();
      const allergensRaw = record.allergens;
      const parsedAllergens = Array.isArray(allergensRaw)
        ? allergensRaw.map((a: unknown) => String(a || "").trim()).filter(Boolean)
        : typeof allergensRaw === "string"
          ? String(allergensRaw)
              .split(",")
              .map((a) => a.trim())
              .filter(Boolean)
          : [];
      displayByFormula.set(formulaId, {
        name: String(customName || record.name || "").trim(),
        imageUrl: rawImage,
        price:
          customPrice != null && Number.isFinite(customPrice)
            ? customPrice
            : record.price == null
              ? null
              : Number(record.price),
        description: customDescription || (record.description as string | null) || null,
        calories:
          customKcal != null && Number.isFinite(customKcal)
            ? customKcal
            : record.calories == null
              ? null
              : Number(record.calories),
        allergens: parsedAllergens,
        formula_visible: isFormulaActive,
        formula_supplements: parseExtrasFromUnknown(record.formula_supplements),
      });
    });

    setFormulaLinkDisplayByFormulaId(displayByFormula);

    if (formulaIds.length === 0) {
      setFormulaLinksByFormulaId(new Map());
      setFormulaLinksByDishId(new Map());
      setFormulaLinkDefaultOptionsByFormulaId(new Map());
      setFormulaMainDishOptionsByFormulaId(new Map());
      setFormulaLinkSequenceByFormulaId(new Map());
      return;
    }

    const byFormula = new Map<string, string[]>();
    const byDish = new Map<string, string[]>();
    const sequenceByFormula = new Map<string, Map<string, number>>();

    const normalizeOptionIdList = (value: unknown): string[] => {
      const stripWrappingQuotes = (rawValue: unknown) =>
        String(rawValue || "")
          .trim()
          .replace(/^["']+|["']+$/g, "")
          .trim();
      const normalizeEntry = (entry: unknown): string => {
        if (entry && typeof entry === "object" && !Array.isArray(entry)) {
          const record = entry as Record<string, unknown>;
          return stripWrappingQuotes(record.id ?? record.option_id ?? record.optionId ?? "");
        }
        return stripWrappingQuotes(entry);
      };
      if (Array.isArray(value)) {
        return value.map(normalizeEntry).filter(Boolean);
      }
      if (typeof value === "string") {
        const raw = value.trim();
        if (!raw) return [];
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.map(normalizeEntry).filter(Boolean);
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

    const normalizeDefaultOptionMap = (raw: unknown) => {
      const source =
        typeof raw === "string"
          ? parseJsonObject(raw)
          : raw && typeof raw === "object"
            ? (raw as Record<string, unknown>)
            : null;
      const map = new Map<string, string[]>();
      if (!source || Array.isArray(source)) return map;
      Object.entries(source as Record<string, unknown>).forEach(([dishId, optionIds]) => {
        const normalizedDishId = String(dishId || "").trim();
        if (!normalizedDishId) return;
        const normalizedOptionIds = Array.from(new Set(normalizeOptionIdList(optionIds)));
        map.set(normalizedDishId, normalizedOptionIds);
      });
      return map;
    };

    const defaultOptionsByFormula = new Map<string, Map<string, string[]>>();
    const mainDishOptionsByFormula = new Map<string, string[]>();
    (formulasResult.data || []).forEach((row: unknown) => {
      if (!row || typeof row !== "object") return;
      const record = row as Record<string, unknown>;
      const isFormulaActive = record.formula_visible == null ? true : toBoolean(record.formula_visible, true);
      if (!isFormulaActive) return;
      const formulaId = String(record.dish_id ?? record.id ?? "").trim();
      if (!formulaId) return;
      const formulaConfigRaw = record.formula_config ?? record.options;
      const formulaConfig =
        typeof formulaConfigRaw === "string"
          ? parseJsonObject(formulaConfigRaw)
          : (formulaConfigRaw as Record<string, unknown> | null) || {};
      const optionsRaw =
        (formulaConfig as Record<string, unknown>)?.options ??
        (formulaConfig as Record<string, unknown>)?.default_option_ids ??
        record.options ??
        record.default_option_ids ??
        record.formula_default_option_ids ??
        record.formulaDefaultOptionIds;
      const normalizedDefaults = normalizeDefaultOptionMap(optionsRaw);
      if (normalizedDefaults.size > 0) {
        defaultOptionsByFormula.set(formulaId, normalizedDefaults);
      }
      if (Object.prototype.hasOwnProperty.call(record, "excluded_main_options")) {
        mainDishOptionsByFormula.set(
          formulaId,
          Array.from(new Set(normalizeOptionIdList(record.excluded_main_options)))
        );
      }
    });

    setFormulaLinksByFormulaId(byFormula);
    setFormulaLinksByDishId(byDish);
    setFormulaLinkDefaultOptionsByFormulaId(defaultOptionsByFormula);
    setFormulaMainDishOptionsByFormulaId(mainDishOptionsByFormula);
    setFormulaLinkSequenceByFormulaId(sequenceByFormula);
  };

  useEffect(() => {
    const currentDishId = String(editingDish?.id || "").trim();
    if (!currentDishId) return;
    if (!showDishModal || !formData.is_formula) return;
    if (excludedMainOptionsTouched) return;
    if (isRadarLoaded) return;
    if (selectedMainDishOptions.length > 0) return;
    if (!formulaMainDishOptionsByFormulaId.has(currentDishId)) return;
    const loadedExcludedOptions = formulaMainDishOptionsByFormulaId.get(currentDishId) || [];
    const normalizedLoadedOptions = Array.from(
      new Set(
        (Array.isArray(loadedExcludedOptions) ? loadedExcludedOptions : [])
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      )
    );
    if (normalizedLoadedOptions.length === 0) return;
    setSelectedMainDishOptions(normalizedLoadedOptions);
  }, [
    editingDish?.id,
    showDishModal,
    formData.is_formula,
    formulaMainDishOptionsByFormulaId,
    excludedMainOptionsTouched,
    isRadarLoaded,
    selectedMainDishOptions,
  ]);

  const fetchDishes = async (options?: { force?: boolean }) => {
    const force = Boolean(options?.force);
    const localStorageLockUntil =
      typeof window !== "undefined" && scopedRestaurantId
        ? Number(window.localStorage.getItem(`menuqr:card-layout-save-lock:${scopedRestaurantId}`) || 0)
        : 0;
    const activeLockUntil = Math.max(dishesRefetchLockUntilRef.current, Number.isFinite(localStorageLockUntil) ? localStorageLockUntil : 0);
    const withinSaveGuard = Date.now() - lastSaveTimeRef.current < 5000;
    if (!force && (isSavingRef.current || Date.now() < activeLockUntil || withinSaveGuard)) {
      return;
    }
    if (!scopedRestaurantId) {
      setDishes([]);
      return;
    }

    let result = await supabase
      .from("dishes")
      .select("*")
      .eq("restaurant_id", scopedRestaurantId)
      .order("category_id", { ascending: true })
      .order("id", { ascending: true });

    if (result.error && String((result.error as { code?: string })?.code || "") === "42703") {
      result = await supabase
        .from("dishes")
        .select("*")
        .eq("restaurant_id", scopedRestaurantId)
        .order("category_id", { ascending: true })
        .order("id", { ascending: true });
    }

    if (result.error && String((result.error as { code?: string })?.code || "") === "42703") {
      result = await supabase
        .from("dishes")
        .select("*")
        .eq("restaurant_id", scopedRestaurantId)
        .order("category_id", { ascending: true })
        .order("id", { ascending: true });
    }

    if (result.error) {
      console.error("Erreur fetch dishes (scope restaurant):", result.error);
      setDishes([]);
      return;
    }

    const data = result.data;
    false && console.log("TRACE manager dishes:", data);

    if (Array.isArray(data)) {
      const normalized = data.map((dish: Dish & Record<string, unknown>) => {
        const isChefSuggestion = toBoolean(dish.is_chef_suggestion ?? dish.is_featured ?? dish.is_suggestion, false);
        const isDailySpecial = toBoolean(dish.is_daily_special ?? dish.is_special, false);
        const isSuggestionBadge = toBoolean(dish.is_suggestion ?? isChefSuggestion, false);
        const formulaConfigRaw = (dish as Record<string, unknown>).formula_config;
        const parsedFormulaConfig =
          typeof formulaConfigRaw === "string"
            ? parseJsonObject(formulaConfigRaw)
            : formulaConfigRaw && typeof formulaConfigRaw === "object" && !Array.isArray(formulaConfigRaw)
              ? (formulaConfigRaw as Record<string, unknown>)
              : null;
        const promoPriceRaw = dish.promo_price;
        const promoPrice =
          promoPriceRaw == null || String(promoPriceRaw).trim() === ""
            ? null
            : Number(String(promoPriceRaw).replace(",", "."));
        const promoEnabled = toBoolean((dish as Record<string, unknown>).dish_on_promo ?? dish.is_promo, false);
        const vegetarianEnabled = toBoolean(
          (dish as Record<string, unknown>).dish_is_vegetarian ?? (dish as Record<string, unknown>).is_vegetarian,
          false
        );
        const spicyEnabled = toBoolean(
          (dish as Record<string, unknown>).dish_is_spicy ?? (dish as Record<string, unknown>).is_spicy,
          false
        );
        const newEnabled = toBoolean(
          (dish as Record<string, unknown>).dish_is_new ?? (dish as Record<string, unknown>).is_new,
          false
        );
        const legacyCategoryKey = Object.keys(dish).find((key) => /^cat.*gorie$/i.test(key) && key !== "category");
        return {
          ...dish,
          category_id: dish.category_id ?? null,
          subcategory_id: dish.subcategory_id ?? null,
          categorie: String(
            (dish as unknown as any).category ??
              (dish as unknown as any)["catégorie"] ??
              (legacyCategoryKey ? (dish as unknown as any)[legacyCategoryKey] : undefined) ??
              dish.categorie ??
              ""
          ),
          sub_category: String(dish.sub_category ?? (dish as unknown as any).sous_categorie ?? ""),
          is_featured: isChefSuggestion,
          is_special: isDailySpecial,
          is_chef_suggestion: isChefSuggestion,
          is_daily_special: isDailySpecial,
          is_suggestion: isSuggestionBadge,
          dish_on_promo: promoEnabled,
          dish_is_vegetarian: vegetarianEnabled,
          dish_is_spicy: spicyEnabled,
          dish_is_new: newEnabled,
          is_promo: promoEnabled,
          is_vegetarian: vegetarianEnabled,
          is_spicy: spicyEnabled,
          promo_price: Number.isFinite(promoPrice as number) ? Number(promoPrice) : null,
          formula_config: parsedFormulaConfig,
          ask_cooking: dish.ask_cooking ?? false,
          max_options: dish.max_options ?? 1,
          selected_sides: Array.isArray(dish.selected_sides)
            ? dish.selected_sides
            : typeof dish.selected_sides === "string"
              ? (() => {
                  try {
                    const parsed = JSON.parse(dish.selected_sides);
                    return Array.isArray(parsed) ? parsed : [];
                  } catch {
                    return [];
                  }
                })()
              : [],
        };
      });
      const optionsByDishId = new Map<string, ProductOptionItem[]>();
      const extrasByDishId = new Map<string, ExtrasItem[]>();
      const dishIds = normalized
        .map((dish) => String(dish.id || "").trim())
        .filter(Boolean);
      const nonFormulaDishIds = normalized
        .filter((dish) => !toBoolean((dish as Record<string, unknown>).is_formula, false))
        .map((dish) => String(dish.id || "").trim())
        .filter(Boolean);
      if (dishIds.length > 0) {
        if (nonFormulaDishIds.length > 0) {
          const dishOptionsResult = await supabase
            .from("dish_options")
            .select("*")
            .in("dish_id", nonFormulaDishIds as never)
            .order("created_at", { ascending: true });
          if (!dishOptionsResult.error && Array.isArray(dishOptionsResult.data)) {
            const groupedDishOptions = new Map<string, Array<Record<string, unknown>>>();
            (dishOptionsResult.data as Array<Record<string, unknown>>).forEach((row) => {
              const dishId = String(row.dish_id ?? "").trim();
              if (!dishId) return;
              const current = groupedDishOptions.get(dishId) || [];
              current.push(row);
              groupedDishOptions.set(dishId, current);
            });
            groupedDishOptions.forEach((rows, dishId) => {
              extrasByDishId.set(dishId, parseDishOptionsRowsToExtras(rows));
            });
          } else if (dishOptionsResult.error) {
            console.warn("dish_options fetch failed (manager dishes list):", dishOptionsResult.error.message);
          }
        }

        let productOptionsResult = await supabase
          .from("product_options")
          .select("*")
          .in("product_id", dishIds as never)
          .order("created_at", { ascending: true });
        if (productOptionsResult.error && hasMissingColumnError(productOptionsResult.error, "product_id")) {
          productOptionsResult = await supabase
            .from("product_options")
            .select("*")
            .in("dish_id", dishIds as never)
            .order("created_at", { ascending: true });
        }
        if (!productOptionsResult.error && Array.isArray(productOptionsResult.data)) {
          (productOptionsResult.data as Array<Record<string, unknown>>).forEach((row) => {
            const productId = String(row.product_id ?? row.dish_id ?? "").trim();
            const namesI18n = {
              ...parseObjectRecord(row.names_i18n),
              ...parseI18nToken(String(row.name_en || "")),
            };
            const name = String(row.name_fr || namesI18n.fr || row.name || "").trim();
            if (!productId || !name) return;
            const priceRaw = row.price_override;
            const priceOverride =
              priceRaw == null || String(priceRaw).trim() === ""
                ? null
                : Number.parseFloat(String(priceRaw).replace(",", "."));
            const current = optionsByDishId.get(productId) || [];
            current.push({
              id: String(row.id || createLocalId()),
              name,
              name_fr: name,
              name_en: String(row.name_en || namesI18n.en || "").trim() || null,
              name_es: String(row.name_es || namesI18n.es || "").trim() || null,
              name_de: String(row.name_de || namesI18n.de || "").trim() || null,
              names_i18n: {
                fr: name,
                ...Object.fromEntries(
                  Object.entries(namesI18n)
                    .map(([lang, value]) => [normalizeLanguageKey(lang), String(value || "").trim()])
                    .filter(([lang, value]) => Boolean(lang) && Boolean(value))
                ),
              },
              price_override: Number.isFinite(priceOverride as number) ? Number(priceOverride) : null,
            });
            optionsByDishId.set(productId, current);
          });
        } else if (productOptionsResult.error) {
          console.warn("product_options fetch failed (manager dishes list):", productOptionsResult.error.message);
        }
      }
      const formulaFallbackOptionsByDishId = new Map<string, ProductOptionItem[]>();
      normalized.forEach((dish) => {
        const dishId = String((dish as Record<string, unknown>).id || "").trim();
        if (!dishId) return;
        const extracted = extractFormulaProductOptionsForManager(dish as Record<string, unknown>, {
          createLocalId,
          normalizeLanguageKey,
          parseObjectRecord,
          parseI18nToken,
        }) as unknown as ProductOptionItem[];
        if (Array.isArray(extracted) && extracted.length > 0) {
          formulaFallbackOptionsByDishId.set(dishId, extracted);
        }
      });
      const normalizedWithOptions = normalized.map((dish) => ({
        ...dish,
        extras_list: mergeExtrasUnique(
          extrasByDishId.get(String(dish.id || "").trim()) || [],
          mergeExtrasUnique(
            parseExtrasFromUnknown((dish as any).extras),
            parseExtrasFromUnknown((dish as any).extras_list)
          )
        ),
        product_options: mergeProductOptions(
          ((optionsByDishId.get(String(dish.id || "").trim()) || []) as unknown as Array<Record<string, unknown>>),
          ((formulaFallbackOptionsByDishId.get(String(dish.id || "").trim()) || []) as unknown as Array<Record<string, unknown>>)
        ) as unknown as ProductOptionItem[],
      }));
      setDishes(normalizedWithOptions);
      await fetchFormulaDishLinks(normalizedWithOptions);
      setAllergenLibrary((prev) => {
        if (prev.length > 0) return prev;
        const discoveredRows: AllergenLibraryRow[] = [];
        const seen = new Set<string>();
        normalizedWithOptions.forEach((dish) => {
          const discovered = extractAllergenNamesFromDishPayload(dish as unknown as any);
          discovered.forEach((nameFr) => {
            const key = normalizeText(nameFr);
            if (!key || seen.has(key)) return;
            seen.add(key);
            discoveredRows.push({ id: createLocalId(), name_fr: nameFr, names_i18n: { fr: nameFr } });
          });
        });
        return mergeAllergenLibraryRows(prev, discoveredRows);
      });
    } else {
      setDishes([]);
      setFormulaLinksByFormulaId(new Map());
      setFormulaLinksByDishId(new Map());
      setFormulaLinkDefaultOptionsByFormulaId(new Map());
      setFormulaMainDishOptionsByFormulaId(new Map());
      setFormulaLinkDisplayByFormulaId(new Map());
      setFormulaLinkSequenceByFormulaId(new Map());
    }
  };

  return { fetchCategories, fetchDishes };
}
