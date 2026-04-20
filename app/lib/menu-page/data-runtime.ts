import { parsePriceNumber } from "./config";
import { normalizeFormulaStepValue } from "./formula-order-runtime";
import {
  normalizePinValue,
  normalizeTableNumberKey,
  normalizeBackgroundOpacity,
  normalizeHexColor,
  normalizeOpacityPercent,
  normalizeLanguageKey,
  parseDisplaySettingsFromRow,
  parseDisplaySettingsFromSettingsJson,
  parseI18nToken,
  parseJsonObject,
  parseShowCalories,
  sanitizeMediaUrl,
  toBooleanFlag,
  toLoggableSupabaseError,
  type CategoryItem,
  type Dish,
  type ExtrasItem,
  type FormulaDishLink,
  type ProductOptionItem,
  type Restaurant,
  type SideLibraryItem,
  type SubCategoryItem,
} from "./runtime-core";
import { parseDishOptionsRowsToExtras, parseOptionsFromDescription } from "./runtime-dish";

type FormulaInfo = {
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
  excluded_main_options?: unknown;
};

type FetchFormulaLinksResult = {
  byFormula: Map<string, FormulaDishLink[]>;
  byDish: Map<string, FormulaDishLink[]>;
  formulaInfoById: Map<string, FormulaInfo>;
};

type FetchFormulaLinksArgs = {
  supabase: any;
  scopedRestaurantId: string;
  sourceDishes: Dish[];
};

export async function fetchFormulaLinksForMenuData(args: FetchFormulaLinksArgs): Promise<FetchFormulaLinksResult> {
  const empty: FetchFormulaLinksResult = {
    byFormula: new Map(),
    byDish: new Map(),
    formulaInfoById: new Map(),
  };
  if (!args.scopedRestaurantId) return empty;

  const formulasResult = await args.supabase
    .from("restaurant_formulas")
    .select("*,excluded_main_options")
    .eq("restaurant_id", args.scopedRestaurantId)
    .eq("active", true);
  if (formulasResult.error) {
    console.warn("restaurant_formulas fetch failed (menu public):", toLoggableSupabaseError(formulasResult.error));
    return empty;
  }

  const formulaInfoByIdLocal = new Map<string, FormulaInfo>();
  const formulaIds: string[] = [];
  const sourceDishById = new Map<string, Dish>();
  args.sourceDishes.forEach((dish) => sourceDishById.set(String(dish.id || "").trim(), dish));

  (formulasResult.data || []).forEach((row: unknown) => {
    if (!row || typeof row !== "object") return;
    const record = row as Record<string, unknown>;
    const formulaId = String(record.id || "").trim();
    if (!formulaId) return;
    const isActive = record.active == null ? true : toBooleanFlag(record.active);
    if (!isActive) return;
    const linkedDishId = record.dish_id ? String(record.dish_id) : null;
    const linkedDish = linkedDishId != null ? sourceDishById.get(String(linkedDishId || "").trim()) || null : null;
    const linkedDishPrice = parsePriceNumber(linkedDish?.price);
    const rawImage = sanitizeMediaUrl(
      record.image_url ?? record.image_path ?? record.image ?? linkedDish?.image_url,
      "dishes-images-"
    );
    formulaInfoByIdLocal.set(formulaId, {
      name: String(record.name || "").trim() || undefined,
      imageUrl: rawImage || undefined,
      dishId: linkedDishId,
      price: Number.isFinite(parsePriceNumber(record.price)) ? parsePriceNumber(record.price) : linkedDishPrice,
      description: (record.description ?? null) as string | null,
      calories: (record.calories ?? null) as number | null,
      allergens: (record.allergens ?? null) as string | null,
      parent_dish_name: (record.parent_dish_name ?? record.parentDishName ?? null) as string | null,
      formula_category_ids: record.formula_category_ids ?? null,
      formulaConfig: record.formula_structure ?? record.formule_structure ?? record.formula_config ?? null,
      excluded_main_options: record.excluded_main_options ?? null,
    });
    formulaIds.push(formulaId);
  });

  if (formulaIds.length === 0) return empty;

  const formulaIdSet = new Set(formulaIds);
  const stepsRows: unknown[] = [];
  (formulasResult.data || []).forEach((rawFormula: unknown) => {
    if (!rawFormula || typeof rawFormula !== "object") return;
    const formulaRecord = rawFormula as Record<string, unknown>;
    const formulaId = String(formulaRecord.id || "").trim();
    if (!formulaId || !formulaIdSet.has(formulaId)) return;
    const formulaConfig = parseJsonObject(
      formulaRecord.formula_structure ?? formulaRecord.formule_structure ?? formulaRecord.formula_config
    );
    const rawStructuredSteps = Array.isArray(formulaConfig.steps)
      ? formulaConfig.steps
      : Array.isArray(formulaConfig.formula_structure)
        ? formulaConfig.formula_structure
        : [];
    const structuredRows = rawStructuredSteps.flatMap((rawStep, stepIndex) => {
      if (!rawStep || typeof rawStep !== "object") return [];
      const stepNode = rawStep as Record<string, unknown>;
      const optionIds = Array.isArray(stepNode.options)
        ? stepNode.options
        : Array.isArray(stepNode.dish_ids)
          ? stepNode.dish_ids
          : [];
      const rawRequired = stepNode.is_required ?? stepNode.required;
      const stepNumber =
        normalizeFormulaStepValue(stepNode.step ?? stepNode.step_number ?? stepNode.order ?? stepNode.position, true) ??
        stepIndex + 1;
      const sortOrder = Number(stepNode.sort_order ?? stepNode.sortOrder ?? stepNode.priority ?? stepIndex + 1);
      const isMainDish = toBooleanFlag(stepNode.is_main_dish ?? stepNode.isMainDish ?? stepNode.main_dish);
      const priority = (stepNode.priority as number | string | null | undefined) ?? null;
      return optionIds
        .map((optionDishId, optionIndex) => {
          const dishId = String(optionDishId || "").trim();
          if (!dishId) return null;
          return {
            formula_id: formulaId,
            dish_id: dishId,
            step_number: stepNumber,
            is_required: toBooleanFlag(rawRequired),
            sort_order: Number.isFinite(sortOrder) ? sortOrder * 100 + optionIndex : stepIndex * 100 + optionIndex,
            is_main_dish: isMainDish,
            priority,
          };
        })
        .filter(Boolean);
    });

    if (structuredRows.length > 0) {
      stepsRows.push(...structuredRows);
    }
  });

  const byFormula = new Map<string, FormulaDishLink[]>();
  const byDish = new Map<string, FormulaDishLink[]>();
  (stepsRows || []).forEach((rawRow: unknown) => {
    if (!rawRow || typeof rawRow !== "object") return;
    const row = rawRow as Record<string, unknown>;
    const formulaDishId = String(row.formula_id || "").trim();
    const dishId = String(row.dish_id || "").trim();
    if (!formulaDishId || !dishId || !formulaIdSet.has(formulaDishId)) return;
    const sequence = normalizeFormulaStepValue(row.step_number, true);
    const linkedDish = sourceDishById.get(dishId);
    const categoryId = linkedDish ? String(linkedDish.category_id || "").trim() : null;
    const formulaInfo = formulaInfoByIdLocal.get(formulaDishId);
    const formulaDish = sourceDishById.get(formulaDishId);
    const defaultOptions =
      formulaDish && (formulaDish as any).formula_default_option_ids
        ? ((formulaDish as any).formula_default_option_ids as any)[dishId] || []
        : [];
    const sortOrderRaw = Number(row.sort_order);
    const sortOrder = Number.isFinite(sortOrderRaw) ? sortOrderRaw : null;
    const rawPriority = row.priority;
    const priority = typeof rawPriority === "number" || typeof rawPriority === "string" ? rawPriority : null;
    const link: FormulaDishLink = {
      formulaDishId,
      dishId,
      categoryId,
      sequence,
      step: sequence,
      defaultProductOptionIds: Array.isArray(defaultOptions) ? defaultOptions : [],
      isRequired: toBooleanFlag(row.is_required),
      sortOrder,
      isMainDish: toBooleanFlag(row.is_main_dish),
      priority,
      formulaName: formulaInfo?.name,
      formulaImageUrl: formulaInfo?.imageUrl,
      formulaMainDishId: formulaInfo?.dishId || null,
      formulaPrice: formulaInfo?.price ?? null,
    };
    const formulaLinks = byFormula.get(formulaDishId) || [];
    if (!formulaLinks.some((entry) => entry.dishId === dishId)) formulaLinks.push(link);
    byFormula.set(formulaDishId, formulaLinks);
    const dishLinks = byDish.get(dishId) || [];
    if (!dishLinks.some((entry) => entry.formulaDishId === formulaDishId)) dishLinks.push(link);
    byDish.set(dishId, dishLinks);
  });

  return {
    byFormula,
    byDish,
    formulaInfoById: formulaInfoByIdLocal,
  };
}

type FetchNormalizedDishesArgs = {
  supabase: any;
  scopedRestaurantId: string;
};

type FetchNormalizedDishesResult = {
  dishes: Dish[];
  error: unknown;
};

export async function fetchNormalizedDishesForMenu(
  args: FetchNormalizedDishesArgs
): Promise<FetchNormalizedDishesResult> {
  const buildDishesQuery = ({
    selectClause,
    filterActive,
    orderByCategory,
    withScope,
    scopeColumn,
  }: {
    selectClause: string;
    filterActive: boolean;
    orderByCategory: boolean;
    withScope: boolean;
    scopeColumn: "restaurant_id";
  }) => {
    let query = args.supabase.from("dishes").select(selectClause);
    if (withScope && args.scopedRestaurantId) query = query.eq(scopeColumn, args.scopedRestaurantId);
    if (filterActive) query = query.eq("active", true);
    if (orderByCategory) query = query.order("category_id", { ascending: true });
    return query.order("id", { ascending: true });
  };

  const dishesQueryAttempts: Array<{
    label: string;
    selectClause: string;
    filterActive: boolean;
    orderByCategory: boolean;
    withScope: boolean;
    scopeColumn: "restaurant_id";
  }> = [
    {
      label: "dishes-rich-select+active+category",
      selectClause:
        "*, is_chef_suggestion, is_suggestion, is_daily_special, suggestion_message_fr, suggestion_message_en, suggestion_message_es, suggestion_message_de, formula_default_option_ids, formula_sequence_by_dish",
      filterActive: true,
      orderByCategory: true,
      withScope: Boolean(args.scopedRestaurantId),
      scopeColumn: "restaurant_id",
    },
    {
      label: "dishes-rich-select+active+category(retry-2)",
      selectClause:
        "*, is_chef_suggestion, is_suggestion, is_daily_special, suggestion_message_fr, suggestion_message_en, suggestion_message_es, suggestion_message_de, formula_default_option_ids, formula_sequence_by_dish",
      filterActive: true,
      orderByCategory: true,
      withScope: Boolean(args.scopedRestaurantId),
      scopeColumn: "restaurant_id",
    },
    {
      label: "dishes-basic-select+active+category",
      selectClause: "*",
      filterActive: true,
      orderByCategory: true,
      withScope: Boolean(args.scopedRestaurantId),
      scopeColumn: "restaurant_id",
    },
    {
      label: "dishes-basic-select+active+category(retry-2)",
      selectClause: "*",
      filterActive: true,
      orderByCategory: true,
      withScope: Boolean(args.scopedRestaurantId),
      scopeColumn: "restaurant_id",
    },
    {
      label: "dishes-basic-select+category",
      selectClause: "*",
      filterActive: false,
      orderByCategory: true,
      withScope: Boolean(args.scopedRestaurantId),
      scopeColumn: "restaurant_id",
    },
    {
      label: "dishes-basic-select+category(retry-2)",
      selectClause: "*",
      filterActive: false,
      orderByCategory: true,
      withScope: Boolean(args.scopedRestaurantId),
      scopeColumn: "restaurant_id",
    },
    {
      label: "rich-select+active+category",
      selectClause:
        "*, is_chef_suggestion, is_suggestion, is_daily_special, suggestion_message_fr, suggestion_message_en, suggestion_message_es, suggestion_message_de",
      filterActive: true,
      orderByCategory: true,
      withScope: Boolean(args.scopedRestaurantId),
      scopeColumn: "restaurant_id",
    },
    {
      label: "rich-select+active+category(retry-2)",
      selectClause:
        "*, is_chef_suggestion, is_suggestion, is_daily_special, suggestion_message_fr, suggestion_message_en, suggestion_message_es, suggestion_message_de",
      filterActive: true,
      orderByCategory: true,
      withScope: Boolean(args.scopedRestaurantId),
      scopeColumn: "restaurant_id",
    },
    {
      label: "basic-select+active+category",
      selectClause: "*",
      filterActive: true,
      orderByCategory: true,
      withScope: Boolean(args.scopedRestaurantId),
      scopeColumn: "restaurant_id",
    },
    {
      label: "basic-select+active+category(retry-2)",
      selectClause: "*",
      filterActive: true,
      orderByCategory: true,
      withScope: Boolean(args.scopedRestaurantId),
      scopeColumn: "restaurant_id",
    },
    {
      label: "basic-select+category",
      selectClause: "*",
      filterActive: false,
      orderByCategory: true,
      withScope: Boolean(args.scopedRestaurantId),
      scopeColumn: "restaurant_id",
    },
    {
      label: "basic-select+category(retry-2)",
      selectClause: "*",
      filterActive: false,
      orderByCategory: true,
      withScope: Boolean(args.scopedRestaurantId),
      scopeColumn: "restaurant_id",
    },
    {
      label: "basic-select+id",
      selectClause: "*",
      filterActive: false,
      orderByCategory: false,
      withScope: Boolean(args.scopedRestaurantId),
      scopeColumn: "restaurant_id",
    },
    {
      label: "basic-select+id(retry-2)",
      selectClause: "*",
      filterActive: false,
      orderByCategory: false,
      withScope: Boolean(args.scopedRestaurantId),
      scopeColumn: "restaurant_id",
    },
  ];
  if (!args.scopedRestaurantId) {
    dishesQueryAttempts.push(
      {
        label: "dishes-basic-select+active+category(unscoped)",
        selectClause: "*",
        filterActive: true,
        orderByCategory: true,
        withScope: false,
        scopeColumn: "restaurant_id",
      },
      {
        label: "dishes-basic-select+id(unscoped)",
        selectClause: "*",
        filterActive: false,
        orderByCategory: false,
        withScope: false,
        scopeColumn: "restaurant_id",
      },
      {
        label: "basic-select+active+category(unscoped)",
        selectClause: "*",
        filterActive: true,
        orderByCategory: true,
        withScope: false,
        scopeColumn: "restaurant_id",
      },
      {
        label: "basic-select+id(unscoped)",
        selectClause: "*",
        filterActive: false,
        orderByCategory: false,
        withScope: false,
        scopeColumn: "restaurant_id",
      }
    );
  }

  let dishesData: unknown[] | null = null;
  let dishesError: unknown = null;
  for (const attempt of dishesQueryAttempts) {
    const result = await buildDishesQuery(attempt);
    if (!result.error) {
      dishesData = (result.data as unknown[] | null) || [];
      dishesError = null;
      break;
    }
    dishesError = result.error;
    console.warn("Dishes query attempt failed:", attempt.label, toLoggableSupabaseError(result.error));
  }

  if (dishesError || !Array.isArray(dishesData)) {
    return { dishes: [], error: dishesError };
  }

  const normalized = (dishesData as Array<Record<string, any>>)
    .filter((dish) => {
      if (!Object.prototype.hasOwnProperty.call(dish, "active")) return true;
      return Boolean((dish as any).active);
    })
    .map((dish) => {
      const row = dish as Dish & Record<string, any>;
      const selectedSides = Array.isArray(row.selected_sides)
        ? row.selected_sides
        : (() => {
            if (typeof row.selected_sides !== "string") return null;
            try {
              const parsed = JSON.parse(row.selected_sides);
              return Array.isArray(parsed) ? parsed : null;
            } catch {
              return null;
            }
          })();

      return {
        ...row,
        image_url: sanitizeMediaUrl(row.image_url ?? row.image ?? row.photo_url, "dishes-images-"),
        is_chef_suggestion: Boolean(row.is_chef_suggestion ?? row.is_featured ?? row.is_suggestion ?? false),
        is_suggestion: Boolean(row.is_suggestion ?? row.is_chef_suggestion ?? row.is_featured ?? false),
        is_promo: Boolean(row.is_promo ?? false),
        promo_price:
          row.promo_price == null || String(row.promo_price).trim() === ""
            ? null
            : Number(String(row.promo_price).replace(",", ".")),
        category_id: row.category_id ?? row.category ?? null,
        subcategory_id: row.subcategory_id ?? null,
        selected_sides: selectedSides,
        is_available: row.active ?? true,
        max_options: Number(row.max_options || 1),
        ask_cooking: row.ask_cooking ?? parseOptionsFromDescription(String(row.description || "")).askCooking,
      };
    });
  const optionsByDishId = new Map<string, ProductOptionItem[]>();
  const extrasByDishId = new Map<string, ExtrasItem[]>();
  const dishIds = normalized.map((row) => String(row.id || "").trim()).filter(Boolean);
  if (dishIds.length > 0) {
    const dishOptionsResult = await args.supabase.from("dish_options").select("*").in("dish_id", dishIds as never);
    if (!dishOptionsResult.error && Array.isArray(dishOptionsResult.data)) {
      const rowsByDishId = new Map<string, Array<Record<string, unknown>>>();
      (dishOptionsResult.data as Array<Record<string, unknown>>).forEach((row) => {
        const dishId = String(row.dish_id ?? "").trim();
        if (!dishId) return;
        const current = rowsByDishId.get(dishId) || [];
        current.push(row);
        rowsByDishId.set(dishId, current);
      });
      rowsByDishId.forEach((rows, dishId) => {
        const parsedRows = parseDishOptionsRowsToExtras(rows, dishId);
        if (parsedRows.length > 0) extrasByDishId.set(dishId, parsedRows);
      });
    } else if (dishOptionsResult.error) {
      console.warn("dish_options fetch failed (menu public):", toLoggableSupabaseError(dishOptionsResult.error));
    }

    const primaryProductOptionsResult = await args.supabase
      .from("product_options")
      .select("*")
      .in("product_id", dishIds as never)
      .order("created_at", { ascending: true });
    const useFallback =
      primaryProductOptionsResult.error &&
      String((primaryProductOptionsResult.error as { code?: string })?.code || "") === "42703";
    const fallbackProductOptionsResult = useFallback
      ? await args.supabase.from("product_options").select("*").in("dish_id", dishIds as never).order("created_at", { ascending: true })
      : null;
    const finalProductOptionsData = useFallback ? fallbackProductOptionsResult?.data : primaryProductOptionsResult.data;
    const finalProductOptionsError = useFallback ? fallbackProductOptionsResult?.error : primaryProductOptionsResult.error;

    if (!finalProductOptionsError && Array.isArray(finalProductOptionsData)) {
      (finalProductOptionsData as Array<Record<string, unknown>>).forEach((row) => {
        const dishId = String(row.product_id ?? row.dish_id ?? "").trim();
        const optionNames = {
          ...parseJsonObject(row.names_i18n),
          ...parseI18nToken(String(row.name_en || "")),
        };
        const optionName = String(row.name_fr || optionNames.fr || row.name || "").trim();
        if (!dishId || !optionName) return;
        const optionPrice = parsePriceNumber(row.price_override);
        const current = optionsByDishId.get(dishId) || [];
        current.push({
          id: String(row.id || ""),
          product_id: dishId,
          name: optionName,
          name_fr: optionName,
          name_en: String(row.name_en || optionNames.en || "").trim() || null,
          name_es: String(row.name_es || optionNames.es || "").trim() || null,
          name_de: String(row.name_de || optionNames.de || "").trim() || null,
          names_i18n: {
            fr: optionName,
            ...Object.fromEntries(
              Object.entries(optionNames)
                .map(([lang, value]) => [normalizeLanguageKey(lang), String(value || "").trim()])
                .filter(([lang, value]) => Boolean(lang) && Boolean(value))
            ),
          },
          price_override: optionPrice > 0 ? optionPrice : 0,
          is_active:
            typeof row.is_active === "boolean" ? row.is_active : typeof row.active === "boolean" ? row.active : null,
          active: typeof row.active === "boolean" ? row.active : null,
          is_deleted:
            typeof row.is_deleted === "boolean" ? row.is_deleted : typeof row.deleted === "boolean" ? row.deleted : null,
          deleted: typeof row.deleted === "boolean" ? row.deleted : null,
        });
        optionsByDishId.set(dishId, current);
      });
    } else if (finalProductOptionsError) {
      console.warn("product_options fetch failed (menu public):", toLoggableSupabaseError(finalProductOptionsError));
    }
  }

  const normalizedWithOptions = normalized.map((dish) => ({
    ...dish,
    dish_options: extrasByDishId.get(String(dish.id || "").trim()) || [],
    has_extras: Boolean(dish.has_extras) || (extrasByDishId.get(String(dish.id || "").trim()) || []).length > 0,
    product_options: optionsByDishId.get(String(dish.id || "").trim()) || [],
  }));

  return {
    dishes: normalizedWithOptions as Dish[],
    error: null,
  };
}

async function fetchScopedRows({
  supabase,
  table,
  selectClause = "*",
  scopedRestaurantId,
  orderBy = "id",
  ascending = true,
}: {
  supabase: any;
  table: string;
  selectClause?: string;
  scopedRestaurantId: string;
  orderBy?: string;
  ascending?: boolean;
}) {
  let query = supabase.from(table).select(selectClause);
  if (scopedRestaurantId) {
    query = query.eq("restaurant_id", scopedRestaurantId);
  }
  const result = await query.order(orderBy, { ascending });
  if (result.error && !scopedRestaurantId) {
    return supabase.from(table).select(selectClause).order(orderBy, { ascending });
  }
  return result;
}

export async function fetchCategoriesForMenu(supabase: any, scopedRestaurantId: string): Promise<CategoryItem[]> {
  const result = await fetchScopedRows({
    supabase,
    table: "categories",
    scopedRestaurantId,
    orderBy: "id",
    ascending: true,
  });
  if (result.error) return [];
  return (result.data || []) as CategoryItem[];
}

export async function fetchSubCategoriesForMenu(
  supabase: any,
  scopedRestaurantId: string
): Promise<SubCategoryItem[]> {
  const result = await fetchScopedRows({
    supabase,
    table: "subcategories",
    scopedRestaurantId,
    orderBy: "id",
    ascending: true,
  });
  if (result.error) return [];
  return (result.data || []) as SubCategoryItem[];
}

export async function fetchSidesLibraryForMenu(
  supabase: any,
  scopedRestaurantId: string
): Promise<SideLibraryItem[]> {
  const result = await fetchScopedRows({
    supabase,
    table: "sides_library",
    scopedRestaurantId,
    orderBy: "id",
    ascending: true,
  });
  if (result.error) return [];
  return (result.data || []) as SideLibraryItem[];
}

export async function fetchTablePinCodesForMenu(supabase: any, scopedRestaurantId: string): Promise<Record<string, string>> {
  let query = supabase.from("table_assignments").select("table_number,pin_code");
  if (scopedRestaurantId) {
    query = query.eq("restaurant_id", scopedRestaurantId);
  }
  let result = await query;
  if (result.error && !scopedRestaurantId) {
    result = await supabase.from("table_assignments").select("table_number,pin_code");
  }
  if (result.error) return {};
  const nextPinsByTable: Record<string, string> = {};
  (result.data || []).forEach((row: unknown) => {
    const source = row as { table_number?: unknown; pin_code?: unknown };
    const tableKey = normalizeTableNumberKey(source.table_number);
    const pinCode = normalizePinValue(source.pin_code);
    if (!tableKey || !pinCode || pinCode === "0000") return;
    nextPinsByTable[tableKey] = pinCode;
  });
  return nextPinsByTable;
}

export type MenuServiceHours = {
  lunch_start: string;
  lunch_end: string;
  dinner_start: string;
  dinner_end: string;
};

export type MenuRestaurantRuntime = {
  restaurantRow: (Restaurant & Record<string, unknown>) | null;
  isActive: boolean;
  displaySettings:
    | ReturnType<typeof parseDisplaySettingsFromRow>
    | ReturnType<typeof parseDisplaySettingsFromSettingsJson>
    | null;
  categoryDrawerEnabled: boolean;
  keepSuggestionsOnTop: boolean;
  serviceHours: MenuServiceHours;
};

export function resolveMenuRestaurantRuntime(
  baseRow: Restaurant & Record<string, unknown>,
  backgroundUrlFallback: string
): MenuRestaurantRuntime {
  const tableConfig = parseJsonObject(baseRow.table_config);
  const bannerImage = sanitizeMediaUrl(
    baseRow.banner_image_url || baseRow.banner_url || tableConfig.banner_image_url || tableConfig.banner_url || ""
  );
  const backgroundImage = sanitizeMediaUrl(
    baseRow.background_url ||
      baseRow.background_image_url ||
      (baseRow as any).bg_image_url ||
      tableConfig.background_url ||
      tableConfig.background_image_url ||
      tableConfig.bg_image_url ||
      ""
  );
  const resolvedCardTransparent = parseShowCalories(
    baseRow.card_transparent ?? tableConfig.card_transparent ?? tableConfig.cards_transparent,
    false
  );
  const restaurantRow = {
    ...baseRow,
    font_family: String(baseRow.font_family || "").trim() || null,
    name: String(baseRow.name ?? "").trim(),
    logo_url: sanitizeMediaUrl(baseRow.logo_url),
    banner_image_url: bannerImage,
    banner_url: bannerImage,
    primary_color: normalizeHexColor(baseRow.primary_color, "#FFFFFF"),
    text_color: normalizeHexColor(baseRow.text_color ?? tableConfig.text_color ?? tableConfig.global_text_color, "#111111"),
    card_bg_color: normalizeHexColor(baseRow.card_bg_color, "#FFFFFF"),
    card_text_color: normalizeHexColor(baseRow.card_text_color ?? tableConfig.card_text_color, "#111111"),
    card_bg_opacity: normalizeOpacityPercent(
      baseRow.card_bg_opacity ?? tableConfig.card_bg_opacity,
      resolvedCardTransparent ? 0 : 100
    ),
    card_transparent: resolvedCardTransparent,
    card_density:
      String(baseRow.card_density || baseRow.density_style || tableConfig.card_density || tableConfig.density_style || "").trim() ||
      null,
    density_style:
      String(baseRow.density_style || baseRow.card_density || tableConfig.density_style || tableConfig.card_density || "").trim() ||
      null,
    bg_opacity: normalizeBackgroundOpacity(baseRow.bg_opacity ?? tableConfig.bg_opacity, 1),
    background_url: backgroundImage || backgroundUrlFallback,
    background_image_url: backgroundImage || backgroundUrlFallback,
  } as Restaurant & Record<string, unknown>;

  const isActive = typeof restaurantRow.is_active === "boolean" ? restaurantRow.is_active : true;
  if (!isActive) {
    return {
      restaurantRow,
      isActive: false,
      displaySettings: null,
      categoryDrawerEnabled: false,
      keepSuggestionsOnTop: false,
      serviceHours: { lunch_start: "", lunch_end: "", dinner_start: "", dinner_end: "" },
    };
  }

  const displaySettings =
    Object.prototype.hasOwnProperty.call(restaurantRow, "show_calories") ||
    Object.prototype.hasOwnProperty.call(restaurantRow, "enabled_languages")
      ? parseDisplaySettingsFromRow(restaurantRow)
      : parseDisplaySettingsFromSettingsJson(restaurantRow.settings);

  const rawDrawerEnabled =
    tableConfig.category_drawer_enabled ??
    tableConfig.show_category_drawer ??
    (restaurantRow as any).category_drawer_enabled ??
    (restaurantRow as any).show_category_drawer;
  const rawKeepSuggestions =
    tableConfig.keep_suggestions_on_top ??
    tableConfig.pin_suggestions ??
    (restaurantRow as any).keep_suggestions_on_top ??
    (restaurantRow as any).pin_suggestions;

  return {
    restaurantRow,
    isActive: true,
    displaySettings: displaySettings || null,
    categoryDrawerEnabled: Boolean(rawDrawerEnabled),
    keepSuggestionsOnTop: Boolean(rawKeepSuggestions),
    serviceHours: {
      lunch_start: String(tableConfig.service_lunch_start || tableConfig.lunch_start || "").trim(),
      lunch_end: String(tableConfig.service_lunch_end || tableConfig.lunch_end || "").trim(),
      dinner_start: String(tableConfig.service_dinner_start || tableConfig.dinner_start || "").trim(),
      dinner_end: String(tableConfig.service_dinner_end || tableConfig.dinner_end || "").trim(),
    },
  };
}
