import { supabase } from "../../lib/supabase";
import { normalizeProductOptionRows, readBooleanFlag } from "../utils/page-helpers";
import type { ProductOptionChoice } from "../types";

export const DISH_SELECT_BASE =
  "id,name,price,category_id,restaurant_id,is_formula,formula_config,has_sides,ask_cooking,max_options,selected_sides,description";
export const DISH_SELECT_WITH_OPTIONS = `${DISH_SELECT_BASE}`;

export async function fetchProductOptionsByProductId(productId: string | number): Promise<ProductOptionChoice[]> {
  const normalizedProductId = String(productId || "").trim();
  if (!normalizedProductId) return [];
  const result = await supabase.from("product_options").select("*").eq("product_id", normalizedProductId);
  if (result.error || !Array.isArray(result.data) || result.data.length === 0) return [];
  return normalizeProductOptionRows(result.data as Array<Record<string, unknown>>);
}

export async function fetchDishExtrasByDishId(dishId: string | number): Promise<Array<Record<string, unknown>>> {
  const normalizedDishId = String(dishId || "").trim();
  if (!normalizedDishId) return [];
  const result = await supabase.from("dish_options").select("id,dish_id,name,price").eq("dish_id", normalizedDishId);
  if (result.error || !Array.isArray(result.data) || result.data.length === 0) return [];
  return result.data as Array<Record<string, unknown>>;
}

export async function fetchRestaurantFormulaRowByDishId(
  formulaDishId: string | number,
  restaurantId?: string | number | null
): Promise<{
  formula_config: unknown;
  excluded_main_options: unknown;
  formula_visible: boolean | null;
  formula_supplements: unknown;
} | null> {
  const normalizedDishId = String(formulaDishId || "").trim();
  if (!normalizedDishId) return null;
  let queryByDishId = supabase
    .from("restaurant_formulas")
    .select("id,dish_id,formula_config,excluded_main_options,formula_visible,formula_supplements")
    .eq("dish_id", normalizedDishId);
  const normalizedRestaurantId = String(restaurantId || "").trim();
  if (normalizedRestaurantId) {
    queryByDishId = queryByDishId.eq("restaurant_id", normalizedRestaurantId);
  }
  const byDishId = await queryByDishId.limit(1).maybeSingle();
  if (!byDishId.error && byDishId.data) {
    const row = byDishId.data as {
      formula_config?: unknown;
      excluded_main_options?: unknown;
      formula_visible?: unknown;
      formula_supplements?: unknown;
    } | null;
    return {
      formula_config: row?.formula_config ?? null,
      excluded_main_options: row?.excluded_main_options ?? null,
      formula_visible: row?.formula_visible == null ? null : readBooleanFlag(row.formula_visible, true),
      formula_supplements: row?.formula_supplements ?? null,
    };
  }

  let queryByFormulaId = supabase
    .from("restaurant_formulas")
    .select("id,dish_id,formula_config,excluded_main_options,formula_visible,formula_supplements")
    .eq("id", normalizedDishId);
  if (normalizedRestaurantId) {
    queryByFormulaId = queryByFormulaId.eq("restaurant_id", normalizedRestaurantId);
  }
  const byFormulaId = await queryByFormulaId.limit(1).maybeSingle();
  if (byFormulaId.error) {
    throw byFormulaId.error;
  }
  const row = byFormulaId.data as {
    formula_config?: unknown;
    excluded_main_options?: unknown;
    formula_visible?: unknown;
    formula_supplements?: unknown;
  } | null;
  return {
    formula_config: row?.formula_config ?? null,
    excluded_main_options: row?.excluded_main_options ?? null,
    formula_visible: row?.formula_visible == null ? null : readBooleanFlag(row.formula_visible, true),
    formula_supplements: row?.formula_supplements ?? null,
  };
}
