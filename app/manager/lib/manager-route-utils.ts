export const decodeAndTrim = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw;
  }
};

export const normalizeRestaurantId = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/^["'{\s]+|["'}\s]+$/g, "")
    .toLowerCase();

export function resolveScopedRestaurantId(
  params: { id?: string; restaurant_id?: string } | null | undefined,
  searchParams: { get: (name: string) => string | null }
) {
  const scopedRestaurantIdFromPath = normalizeRestaurantId(decodeAndTrim(params?.id || params?.restaurant_id || ""));
  const scopedRestaurantIdFromQuery = normalizeRestaurantId(decodeAndTrim(searchParams.get("restaurant_id") || ""));
  return String(scopedRestaurantIdFromPath || scopedRestaurantIdFromQuery || "").trim();
}

export function resolveImpersonateMode(searchParams: { get: (name: string) => string | null }) {
  return String(searchParams.get("impersonate") || "").trim() === "1";
}
