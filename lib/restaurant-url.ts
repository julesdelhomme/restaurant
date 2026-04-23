import { buildRestaurantSlug } from "./restaurant-slug";

export function getAppBaseUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return String(window.location.origin || "").replace(/\/+$/, "");
  }
  const fromEnvRaw =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_URL ||
    "";
  const fromEnv = String(fromEnvRaw || "").trim();
  if (fromEnv) {
    if (/^https?:\/\//i.test(fromEnv)) return fromEnv.replace(/\/+$/, "");
    return `https://${fromEnv.replace(/\/+$/, "")}`;
  }
  return "https://restaurant-olive-one-15.vercel.app";
}

export function buildRestaurantPublicUrl(restaurantId: string, restaurantName?: string) {
  const safeRestaurantId = String(restaurantId || "").trim();
  const slug = buildRestaurantSlug(String(restaurantName || ""), safeRestaurantId);
  return `${getAppBaseUrl()}/${encodeURIComponent(slug)}`;
}

export function buildRestaurantVitrineUrl(restaurantId: string, restaurantName?: string) {
  const safeRestaurantId = String(restaurantId || "").trim();
  const slug = buildRestaurantSlug(String(restaurantName || ""), safeRestaurantId);
  return `${getAppBaseUrl()}/vitrine/${encodeURIComponent(slug)}`;
}
