import { MENU_FONT_OPTIONS } from "./config";
import { parseCardDesignerLayout, parseJsonObject, type CardDesignerLayout, type CategoryItem, type Dish, type Restaurant } from "./runtime-core";

export function getSideMaxOptions(dish?: Dish | null) {
  if (!dish) return 1;
  const value = Number(dish.max_options || 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

export function isIceCreamDish(
  dish: Dish | null | undefined,
  categoryById: Map<string, CategoryItem>,
  normalizeCategory: (value: string) => string
) {
  if (!dish) return false;
  const category = dish.category_id ? categoryById.get(String(dish.category_id || "").trim()) : undefined;
  const label = normalizeCategory(
    `${category?.name_fr || ""} ${category?.name_en || ""} ${category?.name_es || ""} ${category?.name_de || ""}`
  );
  return label.includes("glace") || label.includes("icecream") || label.includes("helado");
}

export function resolveMenuFontFamily(restaurant: Restaurant | null) {
  const tableConfig = parseJsonObject(restaurant?.table_config);
  const restaurantRecord = restaurant as any | null;
  const raw = String(restaurantRecord?.font_family || tableConfig.font_family || "Montserrat").trim();
  const allowed = new Set(MENU_FONT_OPTIONS as readonly string[]);
  return allowed.has(raw) ? raw : "Montserrat";
}

export function resolveMenuLayout(restaurant: Restaurant | null): "classic_grid" | "modern_list" {
  const tableConfig = parseJsonObject(restaurant?.table_config);
  const raw = String((restaurant as any | null)?.menu_layout || tableConfig.menu_layout || "classic_grid")
    .trim()
    .toLowerCase();
  return raw === "modern_list" || raw === "horizontal" ? "modern_list" : "classic_grid";
}

function parseCardLayoutToken(raw: unknown): "default" | "overlay" | "bicolor" | null {
  if (raw && typeof raw === "object") {
    const nested = parseJsonObject(raw);
    const nestedToken =
      nested.layoutToken ??
      nested.layout_token ??
      nested.layout ??
      nested.token ??
      nested.card_layout ??
      nested.card_style;
    return parseCardLayoutToken(nestedToken);
  }
  const value = String(raw || "").trim().toLowerCase();
  if (value === "overlay" || value === "grid_overlay") return "overlay";
  if (value === "bicolor" || value === "modern_bicolor") return "bicolor";
  if (value === "minimalist" || value === "minimal") return "bicolor";
  if (value === "default" || value === "classic" || value === "standard") return "default";
  return null;
}

export function resolveCardLayout(restaurant: Restaurant | null): "default" | "overlay" | "bicolor" {
  const tableConfig = parseJsonObject(restaurant?.table_config);
  const settingsConfig = parseJsonObject((restaurant as any | null)?.settings);
  return (
    parseCardLayoutToken(settingsConfig.resolved) ||
    parseCardLayoutToken(settingsConfig.layoutToken) ||
    parseCardLayoutToken(settingsConfig.layout_token) ||
    parseCardLayoutToken(settingsConfig.card_layout) ||
    parseCardLayoutToken(settingsConfig.card_designer) ||
    parseCardLayoutToken((restaurant as any | null)?.card_layout) ||
    parseCardLayoutToken(tableConfig.card_layout) ||
    parseCardLayoutToken((restaurant as any | null)?.card_style) ||
    parseCardLayoutToken(tableConfig.card_style) ||
    "default"
  );
}

export function resolveRestaurantCardDesignerLayout(restaurant: Restaurant | null): CardDesignerLayout | null {
  const restaurantRecord = restaurant as any | null;
  const settingsConfig = parseJsonObject(restaurantRecord?.settings);
  const tableConfig = parseJsonObject(restaurantRecord?.table_config);
  return (
    parseCardDesignerLayout(settingsConfig.card_designer) ||
    parseCardDesignerLayout(settingsConfig.card_layout) ||
    parseCardDesignerLayout(restaurantRecord?.card_layout) ||
    parseCardDesignerLayout(tableConfig.card_designer) ||
    parseCardDesignerLayout(tableConfig.card_layout)
  );
}

function parseVisualStyle(raw: unknown): "rounded" | "sharp" | null {
  const value = String(raw || "").trim().toLowerCase();
  if (["sharp", "pointu", "carre", "square", "angled"].includes(value)) return "sharp";
  if (["rounded", "arrondi", "moderne"].includes(value)) return "rounded";
  return null;
}

export function resolveCardVisualStyle(restaurant: Restaurant | null): "rounded" | "sharp" {
  const tableConfig = parseJsonObject(restaurant?.table_config);
  return parseVisualStyle(tableConfig.card_style) || parseVisualStyle((restaurant as any | null)?.card_style) || "rounded";
}

export function resolveDensityStyle(restaurant: Restaurant | null): "compact" | "spacious" {
  const tableConfig = parseJsonObject(restaurant?.table_config);
  const raw = String(
    (restaurant as any | null)?.card_density ??
      (restaurant as any | null)?.density_style ??
      tableConfig.card_density ??
      tableConfig.density_style ??
      "spacious"
  )
    .trim()
    .toLowerCase();
  return ["compact", "compacte", "dense"].includes(raw) ? "compact" : "spacious";
}
