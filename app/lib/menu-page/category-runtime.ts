import type { CategoryItem, Dish } from "./runtime";

type CategoryNormalizer = (value: string) => string;

const DRINK_CATEGORY_KEYS = new Set([
  "boisson",
  "boissons",
  "bar",
  "drink",
  "drinks",
  "beverage",
  "beverages",
  "getranke",
]);

const DESSERT_CATEGORY_MATCHERS = ["dessert", "postre", "nachtisch", "sweet"];

function getCategoryLookupKeys(category: CategoryItem, normalizeCategory: CategoryNormalizer) {
  return [
    normalizeCategory(category.name_fr || ""),
    normalizeCategory(category.name_en || ""),
    normalizeCategory(category.name_es || ""),
    normalizeCategory(category.name_de || ""),
  ];
}

export function isDrinkCategoryFromMap(
  categoryById: Map<string, CategoryItem>,
  normalizeCategory: CategoryNormalizer,
  categoryId?: string | number | null
) {
  if (!categoryId) return false;
  const category = categoryById.get(String(categoryId || "").trim());
  if (!category) return false;
  return getCategoryLookupKeys(category, normalizeCategory).some((key) => DRINK_CATEGORY_KEYS.has(key));
}

export function isDessertCategoryFromMap(
  categoryById: Map<string, CategoryItem>,
  normalizeCategory: CategoryNormalizer,
  categoryId?: string | number | null
) {
  if (!categoryId) return false;
  const category = categoryById.get(String(categoryId || "").trim());
  if (!category) return false;
  return getCategoryLookupKeys(category, normalizeCategory).some((key) =>
    DESSERT_CATEGORY_MATCHERS.some((matcher) => key.includes(matcher))
  );
}

export function getCategoryDestinationFromMap(
  categoryById: Map<string, CategoryItem>,
  normalizeCategory: CategoryNormalizer,
  categoryId?: string | number | null
) {
  if (!categoryId) return "cuisine";
  const category = categoryById.get(String(categoryId || "").trim());
  const destination = String(category?.destination || "").trim().toLowerCase();
  if (destination === "bar") return "bar";
  if (destination === "cuisine") return "cuisine";
  return isDrinkCategoryFromMap(categoryById, normalizeCategory, categoryId) ? "bar" : "cuisine";
}

export function isMainDishFromCategory(
  dish: Dish,
  isDrinkCategory: (categoryId?: string | number | null) => boolean,
  isDessertCategory: (categoryId?: string | number | null) => boolean
) {
  if (isDrinkCategory(dish.category_id)) return false;
  if (isDessertCategory(dish.category_id)) return false;
  return true;
}
