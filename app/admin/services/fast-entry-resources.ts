import type React from "react";
import type { CategoryItem, DishItem, FormulaDishLink, FormulaDisplay, FormulaSummary, SideLibraryItem } from "../types";

export async function runFetchFastEntryResourcesService(params: {
  supabase: any;
  restaurantId: string | number | null;
  scopedRestaurantId: string;
  dishSelectWithOptions: string;
  dishSelectBase: string;
  formulasCategoryKey: string;
  selectedCategory: string;
  fastEntryInitializedRef: React.MutableRefObject<boolean>;
  selectedCategoryInitializedRef: React.MutableRefObject<boolean>;
  setIsDishesLoading: (loading: boolean) => void;
  setCategories: (categories: CategoryItem[]) => void;
  setDishes: (dishes: DishItem[]) => void;
  setActiveDishNames: (value: Set<string>) => void;
  setFormulas: (formulas: FormulaSummary[]) => void;
  setFormulaDisplays: (value: FormulaDisplay[]) => void;
  setFormulaLinksByFormulaId: (value: Map<string, FormulaDishLink[]>) => void;
  setFormulaLinksByDishId: (value: Map<string, FormulaDishLink[]>) => void;
  setFormulaDisplayById: (value: Map<string, { name?: string; imageUrl?: string }>) => void;
  setFormulaDishIdsFromLinks: (value: Set<string>) => void;
  setFormulaPriceByDishId: (value: Map<string, number>) => void;
  setSidesLibrary: (value: SideLibraryItem[]) => void;
  setTableNumbers: (value: number[]) => void;
  setSelectedFastTableNumber: (updater: (current: string) => string) => void;
  setDishIdsWithLinkedExtras: (value: Set<string>) => void;
  setSelectedCategory: (value: string) => void;
  readBooleanFlag: (value: unknown, defaultValue?: boolean) => boolean;
  parseJsonObject: (value: unknown) => Record<string, unknown> | null;
  parsePriceNumber: (value: unknown) => number;
  normalizeCategoryKey: (value: string) => string;
  getCategoryLabel: (category: CategoryItem) => string;
  getDishCategoryLabel: (dish: DishItem) => string;
}): Promise<void> {
  const {
    supabase,
    restaurantId,
    scopedRestaurantId,
    dishSelectWithOptions,
    dishSelectBase,
    formulasCategoryKey,
    selectedCategory,
    fastEntryInitializedRef,
    selectedCategoryInitializedRef,
    setIsDishesLoading,
    setCategories,
    setDishes,
    setActiveDishNames,
    setFormulas,
    setFormulaDisplays,
    setFormulaLinksByFormulaId,
    setFormulaLinksByDishId,
    setFormulaDisplayById,
    setFormulaDishIdsFromLinks,
    setFormulaPriceByDishId,
    setSidesLibrary,
    setTableNumbers,
    setSelectedFastTableNumber,
    setDishIdsWithLinkedExtras,
    setSelectedCategory,
    readBooleanFlag,
    parseJsonObject,
    parsePriceNumber,
    normalizeCategoryKey,
    getCategoryLabel,
    getDishCategoryLabel,
  } = params;

  setIsDishesLoading(true);
  const currentRestaurantId = String(restaurantId || scopedRestaurantId || "").trim();

  const categoriesBaseQuery = supabase.from("categories").select("*").order("id", { ascending: true });
  const dishesBaseQuery = supabase.from("dishes").select(dishSelectWithOptions).order("id", { ascending: true });
  const sidesBaseQuery = supabase.from("sides_library").select("*").order("id", { ascending: true });
  const tablesBaseQuery = supabase.from("table_assignments").select("table_number").order("table_number", { ascending: true });

  let primaryDishesQuery;
  try {
    primaryDishesQuery = await dishesBaseQuery.eq("restaurant_id", currentRestaurantId);
  } catch {
    primaryDishesQuery = await dishesBaseQuery;
  }

  const relationExtraTables = ["dish_options"] as const;
  const queryResults = await Promise.all([
    categoriesBaseQuery.eq("restaurant_id", currentRestaurantId),
    Promise.resolve(primaryDishesQuery),
    sidesBaseQuery.eq("restaurant_id", currentRestaurantId),
    tablesBaseQuery.eq("restaurant_id", currentRestaurantId),
  ]);
  const [categoriesQuery, primaryDishesQueryRes, sidesQuery, tablesQuery] = queryResults;
  primaryDishesQuery = primaryDishesQueryRes;

  const nextCategories = !categoriesQuery.error ? ((categoriesQuery.data || []) as CategoryItem[]) : [];
  let nextDishes = !primaryDishesQuery.error ? ((primaryDishesQuery.data || []) as DishItem[]) : [];
  let dishesError = primaryDishesQuery.error;

  if (dishesError && String((dishesError as { code?: string } | null)?.code || "") === "42703") {
    const minimalQuery = await supabase.from("dishes").select(dishSelectBase).order("id", { ascending: true });
    if (!minimalQuery.error) {
      nextDishes = (minimalQuery.data || []) as DishItem[];
      dishesError = null;
    }
  }

  let relationExtraQueries: Array<{ data: unknown[] | null; error: unknown }> = [];
  const scopedDishIds = nextDishes
    .map((row) => String((row as { id?: string | number | null })?.id ?? "").trim())
    .filter(Boolean);
  if (scopedDishIds.length > 0) {
    relationExtraQueries = await Promise.all(
      relationExtraTables.map(async (tableName) => {
        const selectClause = tableName === "dish_options" ? "id,dish_id,name,price" : "*";
        const result = await supabase.from(tableName).select(selectClause).in("dish_id", scopedDishIds).limit(5000);
        return { data: (result.data as unknown[] | null) ?? null, error: result.error };
      })
    );
  }

  if (!categoriesQuery.error) setCategories(nextCategories);
  let hasFormulaCategoryLocal = false;
  if (!dishesError) {
    const linkedOptionsByDishId = new Map<string, Array<Record<string, unknown>>>();
    relationExtraQueries.forEach((queryResult) => {
      if (queryResult.error || !Array.isArray(queryResult.data)) return;
      (queryResult.data as Array<Record<string, unknown>>).forEach((row) => {
        const dishId = String(row.dish_id || row.dishId || row.plat_id || row.item_id || "").trim();
        if (!dishId) return;
        const list = linkedOptionsByDishId.get(dishId) || [];
        list.push(row);
        linkedOptionsByDishId.set(dishId, list);
      });
    });

    nextDishes = nextDishes.map((dish) => {
      const fallbackCategory = dish.category_id != null ? `cat_${dish.category_id}` : "autres";
      const dishId = String(dish.id || "").trim();
      return {
        ...dish,
        category: String(dish.category || dish.categorie || fallbackCategory),
        categorie: String(dish.categorie || dish.category || fallbackCategory),
        dish_options: dishId ? linkedOptionsByDishId.get(dishId) || [] : [],
      };
    });

    setDishes(nextDishes);
    setActiveDishNames(
      new Set(
        nextDishes
          .filter((dish) => {
            const record = dish as unknown as { active?: unknown };
            if (record.active == null) return true;
            return readBooleanFlag(record.active, true);
          })
          .map((dish) => String((dish as { name?: unknown })?.name || "").trim().toLowerCase())
          .filter(Boolean)
      )
    );

    const formulaIdSetForInit = new Set<string>();
    const byFormula = new Map<string, FormulaDishLink[]>();
    const byDish = new Map<string, FormulaDishLink[]>();
    const displayByFormula = new Map<string, { name?: string; imageUrl?: string }>();
    const formulaDisplaysMap = new Map<string, FormulaDisplay>();
    const formulaPriceMap = new Map<string, number>();

    const formulasSelect =
      "id,dish_id,restaurant_id,name,price,image_url,description,calories,formula_visible,formula_supplements,formula_category_ids,formula_config,options,excluded_main_options";
    const formulasResult = currentRestaurantId
      ? await supabase
          .from("restaurant_formulas")
          .select(formulasSelect)
          .eq("restaurant_id", currentRestaurantId)
          .eq("formula_visible", true)
      : await supabase.from("restaurant_formulas").select(formulasSelect).eq("formula_visible", true);

    if (formulasResult.error) {
      console.warn("restaurant_formulas fetch failed (admin):", formulasResult.error.message || formulasResult.error);
      setFormulas([]);
      setFormulaDisplays([]);
      setFormulaLinksByFormulaId(new Map());
      setFormulaLinksByDishId(new Map());
      setFormulaDisplayById(new Map());
      setFormulaDishIdsFromLinks(new Set());
      setFormulaPriceByDishId(new Map());
    } else {
      const formulaIds: string[] = [];
      (formulasResult.data || []).forEach((row: unknown) => {
        if (!row || typeof row !== "object") return;
        const record = row as Record<string, unknown>;
        const formulaId = String(record.id || "").trim();
        if (!formulaId) return;
        const isActive = record.formula_visible == null ? true : readBooleanFlag(record.formula_visible, true);
        if (!isActive) return;
        const linkedDishId = String(record.dish_id || "").trim();
        const formulaConfigRaw = record.formula_config ?? record.options ?? null;
        const formulaConfig =
          typeof formulaConfigRaw === "string"
            ? parseJsonObject(formulaConfigRaw)
            : formulaConfigRaw && typeof formulaConfigRaw === "object" && !Array.isArray(formulaConfigRaw)
              ? (formulaConfigRaw as Record<string, unknown>)
              : null;
        const customName = String(formulaConfig?.custom_name || "").trim();
        const customImageUrl = String(formulaConfig?.custom_image_url || "").trim();
        const customPrice = formulaConfig?.custom_price == null ? null : parsePriceNumber(formulaConfig.custom_price);
        const customDescription = String(formulaConfig?.custom_description || "").trim();
        const customKcal = formulaConfig?.custom_kcal == null ? null : Number(formulaConfig.custom_kcal);
        const displayName = customName || String(record.name || "").trim() || `Formule ${formulaId.slice(-4)}`;
        const rawImage = String(customImageUrl || record.image_url || record.image_path || record.image || "").trim();
        const price = customPrice != null && Number.isFinite(customPrice) ? customPrice : parsePriceNumber(record.price);
        formulaIds.push(formulaId);
        displayByFormula.set(formulaId, { name: displayName, imageUrl: rawImage || undefined });
        if (linkedDishId) displayByFormula.set(linkedDishId, { name: displayName, imageUrl: rawImage || undefined });

        formulaDisplaysMap.set(formulaId, {
          id: formulaId,
          dishId: linkedDishId || undefined,
          name: displayName || "Formule",
          price: Number.isFinite(price) ? Number(price) : 0,
          imageUrl: rawImage || "",
          formulaLinks: [],
          description: customDescription || String(record.description || "").trim() || undefined,
          calories:
            customKcal != null && Number.isFinite(customKcal)
              ? Math.trunc(customKcal)
              : Number.isFinite(Number(record.calories))
                ? Math.trunc(Number(record.calories))
                : undefined,
        });

        if (Number.isFinite(price) && price > 0) {
          formulaPriceMap.set(formulaId, Number(price.toFixed(2)));
          if (linkedDishId) formulaPriceMap.set(linkedDishId, Number(price.toFixed(2)));
        }
      });

      setFormulas(
        (formulasResult.data || []).map((row: unknown) => {
          const record = row as Record<string, unknown>;
          const formulaConfigRaw = record.formula_config ?? record.options ?? null;
          const formulaConfig =
            typeof formulaConfigRaw === "string"
              ? parseJsonObject(formulaConfigRaw)
              : formulaConfigRaw && typeof formulaConfigRaw === "object" && !Array.isArray(formulaConfigRaw)
                ? (formulaConfigRaw as Record<string, unknown>)
                : null;
          const customName = String(formulaConfig?.custom_name || "").trim();
          const customPrice = formulaConfig?.custom_price == null ? null : parsePriceNumber(formulaConfig.custom_price);
          const customImageUrl = String(formulaConfig?.custom_image_url || "").trim();
          const customDescription = String(formulaConfig?.custom_description || "").trim();
          const customKcal = formulaConfig?.custom_kcal == null ? null : Number(formulaConfig.custom_kcal);
          return {
            id: String(record.id || ""),
            dish_id: String(record.dish_id || "").trim() || null,
            name: customName || String(record.name || ""),
            price: customPrice != null && Number.isFinite(customPrice) ? customPrice : parsePriceNumber(record.price),
            image_url: customImageUrl || (record.image_url as string | null) || null,
            description: customDescription || String(record.description || "").trim() || null,
            calories:
              customKcal != null && Number.isFinite(customKcal)
                ? Math.trunc(customKcal)
                : Number.isFinite(Number(record.calories))
                  ? Math.trunc(Number(record.calories))
                  : null,
            formula_config: record.formula_config ?? null,
            formula_visible: record.formula_visible == null ? null : readBooleanFlag(record.formula_visible, true),
            formula_supplements: record.formula_supplements ?? null,
          } as FormulaSummary;
        })
      );

      formulaIds.forEach((formulaDishId) => {
        if (!formulaDishId) return;
        formulaIdSetForInit.add(formulaDishId);
        const link: FormulaDishLink = {
          formulaDishId,
          dishId: formulaDishId,
          sequence: 1,
          step: 1,
          isMain: true,
          formulaName: displayByFormula.get(formulaDishId)?.name,
          formulaImageUrl: displayByFormula.get(formulaDishId)?.imageUrl,
        };
        const formulaLinks = byFormula.get(formulaDishId) || [];
        if (!formulaLinks.some((entry) => entry.dishId === formulaDishId)) formulaLinks.push(link);
        byFormula.set(formulaDishId, formulaLinks);
        const dishLinks = byDish.get(formulaDishId) || [];
        if (!dishLinks.some((entry) => entry.formulaDishId === formulaDishId)) dishLinks.push(link);
        byDish.set(formulaDishId, dishLinks);
      });

      formulaDisplaysMap.forEach((display, formulaId) => {
        display.formulaLinks = byFormula.get(formulaId) || [];
        const linkedDishId = String(display.dishId || "").trim();
        if (linkedDishId) {
          const linkedDishLinks = byFormula.get(linkedDishId) || [];
          if (linkedDishLinks.length === 0) byFormula.set(linkedDishId, display.formulaLinks);
        }
      });

      setFormulaDisplays(Array.from(formulaDisplaysMap.values()));
      setFormulaLinksByFormulaId(byFormula);
      setFormulaLinksByDishId(byDish);
      setFormulaDisplayById(displayByFormula);
      setFormulaDishIdsFromLinks(new Set(formulaIdSetForInit));
      setFormulaPriceByDishId(formulaPriceMap);
    }

    hasFormulaCategoryLocal =
      formulaDisplaysMap.size > 0 ||
      nextDishes.some((dish) => readBooleanFlag((dish as unknown as { is_formula?: unknown }).is_formula, false));
    console.log("[admin.fetchFastEntryResources] dishes loaded", {
      restaurantId: currentRestaurantId,
      count: nextDishes.length,
      sample: nextDishes[0] || null,
    });
  } else {
    false && console.error("TRACE_SQL_TOTAL:", dishesError);
    const message = (dishesError as { message?: string } | null)?.message || "Erreur fetch dishes (admin)";
    console.error("Erreur fetch dishes (admin):", message);
    setFormulaPriceByDishId(new Map());
  }

  if (!sidesQuery.error) setSidesLibrary((sidesQuery.data || []) as SideLibraryItem[]);
  if (!tablesQuery.error) {
    const values = (tablesQuery.data || [])
      .map((entry: unknown) => Number((entry as { table_number?: unknown }).table_number))
      .filter((value: number) => Number.isFinite(value) && value > 0);
    const unique = Array.from(new Set<number>(values)).sort((a: number, b: number) => a - b);
    setTableNumbers(unique);
    if (!fastEntryInitializedRef.current && unique[0]) {
      setSelectedFastTableNumber((current) => (current.trim() ? current : String(unique[0])));
    }
  }

  const linkedExtraDishIds = new Set<string>();
  relationExtraQueries.forEach((queryResult) => {
    if (queryResult.error || !Array.isArray(queryResult.data)) return;
    (queryResult.data as Array<Record<string, unknown>>).forEach((row) => {
      const dishId = String(row.dish_id || row.dishId || row.plat_id || row.item_id || "").trim();
      if (dishId) linkedExtraDishIds.add(dishId);
    });
  });
  setDishIdsWithLinkedExtras(linkedExtraDishIds);

  if (!selectedCategoryInitializedRef.current && !selectedCategory.trim()) {
    const firstCategory = nextCategories[0] ? normalizeCategoryKey(getCategoryLabel(nextCategories[0])) : "";
    const fallbackCategory = nextDishes[0] ? normalizeCategoryKey(getDishCategoryLabel(nextDishes[0])) : "";
    const initialCategory = firstCategory || fallbackCategory || (hasFormulaCategoryLocal ? formulasCategoryKey : "");
    if (initialCategory) {
      setSelectedCategory(initialCategory);
      selectedCategoryInitializedRef.current = true;
    }
  }

  if (!fastEntryInitializedRef.current) fastEntryInitializedRef.current = true;
  setIsDishesLoading(false);
}
