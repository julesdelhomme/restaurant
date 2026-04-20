const RESERVED_ROUTE_SEGMENTS = new Set([
  "cuisine",
  "admin",
  "manager",
  "bar-caisse",
  "login",
  "login-staff",
  "restaurant",
  "vitrine",
  "feedback",
  "super-admin",
  "api",
]);

const decodeAndTrim = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw;
  }
};

export const normalizeRestaurantScope = (value: unknown) => {
  const normalized = decodeAndTrim(value).replace(/^["'{\s]+|["'}\s]+$/g, "");
  if (!normalized) return "";
  if (RESERVED_ROUTE_SEGMENTS.has(normalized.toLowerCase())) return "";
  return normalized;
};
