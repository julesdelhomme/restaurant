export function getAppBaseUrl() {
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
  if (typeof window !== "undefined" && window.location?.origin) {
    return String(window.location.origin || "").replace(/\/+$/, "");
  }
  return "https://restaurant-7e47fyry2-jules-delhommes-projects.vercel.app";
}

export function buildRestaurantPublicUrl(restaurantId: string) {
  const safeRestaurantId = String(restaurantId || "").trim();
  return `${getAppBaseUrl()}/restaurant/${encodeURIComponent(safeRestaurantId)}`;
}

export function buildRestaurantVitrineUrl(restaurantId: string) {
  const safeRestaurantId = String(restaurantId || "").trim();
  return `${getAppBaseUrl()}/vitrine/${encodeURIComponent(safeRestaurantId)}`;
}
