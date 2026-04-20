type ResolveMenuRouteContextArgs = {
  paramRestaurantId?: unknown;
  paramId?: unknown;
  pathname?: string | null;
  queryRestaurantId?: string | null;
  modeQuery?: string | null;
  locationPathname?: string | null;
};

function decodeAndTrim(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw;
  }
}

export function resolveMenuRouteContext({
  paramRestaurantId,
  paramId,
  pathname,
  queryRestaurantId,
  modeQuery,
  locationPathname,
}: ResolveMenuRouteContextArgs) {
  const scopedRestaurantIdFromPath = decodeAndTrim(paramRestaurantId || paramId || "");
  const scopedRestaurantIdFromQuery = decodeAndTrim(queryRestaurantId || "");
  const scopedRestaurantIdFromLocation = decodeAndTrim(
    String(locationPathname || "")
      .split("/")
      .filter(Boolean)[0] || ""
  );
  const scopedRestaurantId =
    scopedRestaurantIdFromPath || scopedRestaurantIdFromQuery || scopedRestaurantIdFromLocation;

  const modeParam = String(modeQuery || "").trim().toLowerCase();
  const pathSegments = String(pathname || "")
    .split("/")
    .map((part) => String(part || "").trim().toLowerCase())
    .filter(Boolean);
  const isVitrinePath = pathSegments[0] === "vitrine";
  const forceInteractiveMode = ["table", "commande", "order", "command"].includes(modeParam);
  const isVitrineMode =
    !forceInteractiveMode &&
    (isVitrinePath || ["vitrine", "view", "consultation", "readonly", "read-only"].includes(modeParam));

  return {
    scopedRestaurantId,
    pathSegments,
    isVitrineMode,
  };
}
