import { supabase } from "../../lib/supabase";
import type { DishItem } from "../types";
import { DISH_SELECT_BASE, DISH_SELECT_WITH_OPTIONS } from "./formula-data";

export async function loadDishOptionsFromDishesService(dish: DishItem, currentRestaurantId: string) {
  if (!currentRestaurantId) return dish;

  const dishId = String(dish.id || "").trim();
  if (dishId) {
    let byIdPrimaryQuery = supabase.from("dishes").select(DISH_SELECT_WITH_OPTIONS).eq("id", dish.id).limit(1);
    byIdPrimaryQuery = byIdPrimaryQuery.eq("restaurant_id", currentRestaurantId);
    const byIdPrimary = await byIdPrimaryQuery;
    let byIdData = Array.isArray(byIdPrimary.data) ? (byIdPrimary.data[0] as DishItem | undefined) : undefined;

    if (byIdPrimary.error) {
      let byIdStarFallbackQuery = supabase.from("dishes").select("*").eq("id", dish.id).limit(1);
      byIdStarFallbackQuery = byIdStarFallbackQuery.eq("restaurant_id", currentRestaurantId);
      const byIdStarFallback = await byIdStarFallbackQuery;
      byIdData = Array.isArray(byIdStarFallback.data) ? (byIdStarFallback.data[0] as DishItem | undefined) : undefined;
      if (!byIdStarFallback.error && byIdData) {
        return { ...(dish as Record<string, unknown>), ...(byIdData as Record<string, unknown>) } as DishItem;
      }
      let byIdFallbackQuery = supabase.from("dishes").select(DISH_SELECT_BASE).eq("id", dish.id).limit(1);
      byIdFallbackQuery = byIdFallbackQuery.eq("restaurant_id", currentRestaurantId);
      const byIdFallback = await byIdFallbackQuery;
      byIdData = Array.isArray(byIdFallback.data) ? (byIdFallback.data[0] as DishItem | undefined) : undefined;
      if (byIdFallback.error) {
        let byIdUltraFallbackQuery = supabase.from("dishes").select("id,name,price").eq("id", dish.id).limit(1);
        byIdUltraFallbackQuery = byIdUltraFallbackQuery.eq("restaurant_id", currentRestaurantId);
        const byIdUltraFallback = await byIdUltraFallbackQuery;
        byIdData = Array.isArray(byIdUltraFallback.data) ? (byIdUltraFallback.data[0] as DishItem | undefined) : undefined;
      }
    }
    if (byIdData) return { ...(dish as Record<string, unknown>), ...(byIdData as Record<string, unknown>) } as DishItem;
  }

  const dishName = String(dish.name || "").trim();
  if (dishName) {
    let byNamePrimaryQuery = supabase.from("dishes").select(DISH_SELECT_WITH_OPTIONS).eq("name", dishName).limit(1);
    byNamePrimaryQuery = byNamePrimaryQuery.eq("restaurant_id", currentRestaurantId);
    const byNamePrimary = await byNamePrimaryQuery;
    let byNameData = Array.isArray(byNamePrimary.data) ? (byNamePrimary.data[0] as DishItem | undefined) : undefined;

    if (byNamePrimary.error) {
      let byNameStarFallbackQuery = supabase.from("dishes").select("*").eq("name", dishName).limit(1);
      byNameStarFallbackQuery = byNameStarFallbackQuery.eq("restaurant_id", currentRestaurantId);
      const byNameStarFallback = await byNameStarFallbackQuery;
      byNameData = Array.isArray(byNameStarFallback.data) ? (byNameStarFallback.data[0] as DishItem | undefined) : undefined;
      if (!byNameStarFallback.error && byNameData) {
        return { ...(dish as Record<string, unknown>), ...(byNameData as Record<string, unknown>) } as DishItem;
      }
      let byNameFallbackQuery = supabase.from("dishes").select(DISH_SELECT_BASE).eq("name", dishName).limit(1);
      byNameFallbackQuery = byNameFallbackQuery.eq("restaurant_id", currentRestaurantId);
      const byNameFallback = await byNameFallbackQuery;
      byNameData = Array.isArray(byNameFallback.data) ? (byNameFallback.data[0] as DishItem | undefined) : undefined;
      if (byNameFallback.error) {
        let byNameUltraFallbackQuery = supabase.from("dishes").select("id,name,price").eq("name", dishName).limit(1);
        byNameUltraFallbackQuery = byNameUltraFallbackQuery.eq("restaurant_id", currentRestaurantId);
        const byNameUltraFallback = await byNameUltraFallbackQuery;
        byNameData = Array.isArray(byNameUltraFallback.data) ? (byNameUltraFallback.data[0] as DishItem | undefined) : undefined;
      }
    }
    if (byNameData) return { ...(dish as Record<string, unknown>), ...(byNameData as Record<string, unknown>) } as DishItem;
  }

  return dish;
}
