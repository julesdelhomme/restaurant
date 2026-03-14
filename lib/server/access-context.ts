import "server-only";

import type { User } from "@supabase/supabase-js";
import type { AccessContext, ProRole } from "@/lib/auth/types";
import { PRO_ROLE_PRIORITY, getRoleRoute, normalizeProRole } from "@/lib/auth/types";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

type RestaurantRow = {
  id: string | number | null;
  name: string | null;
  is_active?: boolean | null;
};

type StaffRow = {
  restaurant_id: string | number | null;
  role: string | null;
  is_active: boolean | null;
};

const FALLBACK_SUPER_ADMIN_EMAILS = ["juju0067@outlook.fr"];

export function getBearerToken(authorizationHeader: string | null): string {
  const value = String(authorizationHeader || "").trim();
  const match = value.match(/^Bearer\s+(.+)$/i);
  return String(match?.[1] || "").trim();
}

function listSuperAdminEmails() {
  const singleEmail = String(process.env.SUPER_ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const multipleEmails = String(process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const gmailFallback = String(process.env.GMAIL_USER || "")
    .trim()
    .toLowerCase();
  const configured = Array.from(
    new Set([singleEmail, ...multipleEmails, ...FALLBACK_SUPER_ADMIN_EMAILS].filter((email) => email.includes("@")))
  );
  if (configured.length > 0) return configured;
  return gmailFallback.includes("@") ? [gmailFallback] : [];
}

function isSuperAdminUser(email: string) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return false;
  return listSuperAdminEmails().includes(normalized);
}

function buildDefaultRedirect(context: Omit<AccessContext, "defaultRedirect">): string | null {
  if (context.isSuperAdmin) return "/super-admin";

  for (const role of PRO_ROLE_PRIORITY) {
    const match = context.restaurants.find((entry) => entry.roles.includes(role));
    if (match) return getRoleRoute(match.restaurantId, role);
  }
  return null;
}

export async function readUserFromAccessToken(accessToken: string): Promise<User | null> {
  const token = String(accessToken || "").trim();
  if (!token) return null;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function readAccessContextForUser(user: User): Promise<AccessContext> {
  const supabase = createSupabaseAdminClient();
  const userId = String(user.id || "").trim();
  const email = String(user.email || "").trim().toLowerCase();
  const userMeta = (user.user_metadata || {}) as Record<string, unknown>;
  const appMeta = (user.app_metadata || {}) as Record<string, unknown>;
  const metadataRole = String(userMeta.role || appMeta.role || "").trim().toLowerCase();
  const hasSuperAdminMetadataRole = ["super_admin", "superadmin", "admin"].includes(metadataRole);
  const isSuperAdmin = isSuperAdminUser(email) || hasSuperAdminMetadataRole;

  const rolesByRestaurant = new Map<string, { restaurantName: string; roles: Set<ProRole> }>();

  const ownerRestaurantsWithActive = await supabase.from("restaurants").select("id,name,is_active").eq("owner_id", userId);
  let ownerRestaurantsError = ownerRestaurantsWithActive.error;
  let ownerRows = (ownerRestaurantsWithActive.data || []) as RestaurantRow[];
  if (ownerRestaurantsError && String((ownerRestaurantsError as { code?: string } | null)?.code || "") === "42703") {
    const ownerRestaurantsFallback = await supabase.from("restaurants").select("id,name").eq("owner_id", userId);
    ownerRestaurantsError = ownerRestaurantsFallback.error;
    ownerRows = ((ownerRestaurantsFallback.data || []) as Omit<RestaurantRow, "is_active">[]).map((row) => ({
      ...row,
      is_active: null,
    }));
  }
  if (ownerRestaurantsError) {
    ownerRows = [];
  }
  ownerRows.forEach((row) => {
    if (typeof row.is_active === "boolean" && !row.is_active) return;
    const restaurantId = String(row.id || "").trim();
    if (!restaurantId) return;
    const existing = rolesByRestaurant.get(restaurantId) || {
      restaurantName: String(row.name || "").trim() || "Restaurant",
      roles: new Set<ProRole>(),
    };
    existing.roles.add("manager");
    if (!existing.restaurantName) existing.restaurantName = "Restaurant";
    rolesByRestaurant.set(restaurantId, existing);
  });

  const staffRowsResult = await supabase
    .from("staff_accounts")
    .select("restaurant_id,role,is_active")
    .eq("auth_user_id", userId)
    .eq("is_active", true);

  const missingStaffTable = String((staffRowsResult.error as { code?: string } | null)?.code || "") === "42P01";
  if (!staffRowsResult.error || missingStaffTable) {
    const staffRows = (staffRowsResult.data || []) as StaffRow[];
    const staffRestaurantIds = Array.from(
      new Set(
        staffRows
          .map((row) => String(row.restaurant_id || "").trim())
          .filter(Boolean)
      )
    );
    let activeRestaurantIds = new Set<string>();
    if (staffRestaurantIds.length > 0) {
      const activeRestaurantsResult = await supabase
        .from("restaurants")
        .select("id,is_active")
        .in("id", staffRestaurantIds as string[]);
      const missingIsActiveColumn =
        String((activeRestaurantsResult.error as { code?: string } | null)?.code || "") === "42703";
      if (missingIsActiveColumn) {
        activeRestaurantIds = new Set(staffRestaurantIds);
      } else if (!activeRestaurantsResult.error) {
        const activeRows = (activeRestaurantsResult.data || []) as RestaurantRow[];
        activeRows.forEach((row) => {
          const restaurantId = String(row.id || "").trim();
          if (!restaurantId) return;
          const isActive = typeof row.is_active === "boolean" ? row.is_active : true;
          if (isActive) activeRestaurantIds.add(restaurantId);
        });
      }
    }

    staffRows.forEach((row) => {
      const restaurantId = String(row.restaurant_id || "").trim();
      const role = normalizeProRole(row.role);
      if (!restaurantId || !role) return;
      if (activeRestaurantIds.size > 0 && !activeRestaurantIds.has(restaurantId)) return;
      const existing = rolesByRestaurant.get(restaurantId) || {
        restaurantName: "Restaurant",
        roles: new Set<ProRole>(),
      };
      existing.roles.add(role);
      rolesByRestaurant.set(restaurantId, existing);
    });
  }

  const contextWithoutRedirect: Omit<AccessContext, "defaultRedirect"> = {
    userId,
    email,
    isSuperAdmin,
    restaurants: Array.from(rolesByRestaurant.entries()).map(([restaurantId, entry]) => ({
      restaurantId,
      restaurantName: entry.restaurantName || "Restaurant",
      roles: PRO_ROLE_PRIORITY.filter((role) => entry.roles.has(role)),
    })),
  };

  return {
    ...contextWithoutRedirect,
    defaultRedirect: buildDefaultRedirect(contextWithoutRedirect),
  };
}

export function userCanAccessRole(
  context: AccessContext,
  restaurantId: string,
  requiredRole: ProRole,
  allowSuperAdmin = true
): boolean {
  if (allowSuperAdmin && context.isSuperAdmin) return true;
  const targetRestaurantId = String(restaurantId || "").trim();
  if (!targetRestaurantId) return false;
  const entry = context.restaurants.find((item) => item.restaurantId === targetRestaurantId);
  if (!entry) return false;
  return entry.roles.includes(requiredRole);
}
