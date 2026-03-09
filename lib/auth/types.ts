export type ProRole = "server" | "cuisine" | "bar_caisse" | "manager";
export type RequiredRole = ProRole | "super_admin";

export type RestaurantAccess = {
  restaurantId: string;
  restaurantName: string;
  roles: ProRole[];
};

export type AccessContext = {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  restaurants: RestaurantAccess[];
  defaultRedirect: string | null;
};

export const PRO_ROLE_PRIORITY: ProRole[] = ["manager", "server", "cuisine", "bar_caisse"];

export function normalizeProRole(rawRole: unknown): ProRole | null {
  const role = String(rawRole || "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]/g, "_");

  if (role === "admin" || role === "serveur" || role === "server") return "server";
  if (role === "cuisine") return "cuisine";
  if (role === "bar_caisse" || role === "barcaisse" || role === "bar") return "bar_caisse";
  if (role === "manager" || role === "owner") return "manager";
  return null;
}

export function getRoleLabelFr(role: RequiredRole): string {
  if (role === "server") return "Serveur";
  if (role === "cuisine") return "Cuisine";
  if (role === "bar_caisse") return "Bar-Caisse";
  if (role === "manager") return "Manager";
  return "Super-Admin";
}

export function getRoleRoute(restaurantId: string, role: ProRole): string {
  if (role === "server") return `/${restaurantId}/admin`;
  if (role === "cuisine") return `/${restaurantId}/cuisine`;
  if (role === "bar_caisse") return `/${restaurantId}/bar-caisse`;
  return `/${restaurantId}/manager`;
}

export function inferRequiredRoleFromPath(pathname: string): RequiredRole | null {
  const path = String(pathname || "").trim().toLowerCase();
  if (!path) return null;
  if (path === "/super-admin" || path.startsWith("/super-admin/")) return "super_admin";
  if (/^\/[0-9a-f-]{36}\/admin(?:\/|$)/.test(path)) return "server";
  if (/^\/[0-9a-f-]{36}\/cuisine(?:\/|$)/.test(path)) return "cuisine";
  if (/^\/[0-9a-f-]{36}\/bar-caisse(?:\/|$)/.test(path)) return "bar_caisse";
  if (/^\/[0-9a-f-]{36}\/manager(?:\/|$)/.test(path)) return "manager";
  return null;
}

export function extractRestaurantIdFromPath(pathname: string): string {
  const path = String(pathname || "").trim();
  const match = path.match(/^\/([0-9a-fA-F-]{36})(?:\/|$)/);
  return String(match?.[1] || "").trim();
}

