import type { AccessContext, ProRole } from "@/lib/auth/types";
import type { TableAssignment } from "../types";

export async function runFetchServerNotificationScopeService(params: {
  restaurantId: string | number | null;
  scopedRestaurantId: string;
  getAccessToken: () => Promise<string | null>;
  normalizeAssignedTables: (raw: unknown) => number[];
  setServerTableScopeEnabled: (value: boolean) => void;
  setServerAssignedTables: (value: number[]) => void;
}): Promise<void> {
  const {
    restaurantId,
    scopedRestaurantId,
    getAccessToken,
    normalizeAssignedTables,
    setServerTableScopeEnabled,
    setServerAssignedTables,
  } = params;
  const targetRestaurantId = String(restaurantId || scopedRestaurantId || "").trim();
  if (!targetRestaurantId) {
    setServerTableScopeEnabled(false);
    setServerAssignedTables([]);
    return;
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    setServerTableScopeEnabled(false);
    setServerAssignedTables([]);
    return;
  }

  const contextResponse = await fetch("/api/auth/access-context", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!contextResponse.ok) {
    setServerTableScopeEnabled(false);
    setServerAssignedTables([]);
    return;
  }
  const context = (await contextResponse.json()) as AccessContext;
  const restaurantAccess = context.restaurants.find(
    (entry) => String(entry.restaurantId || "").trim() === targetRestaurantId
  );
  const roles = Array.isArray(restaurantAccess?.roles)
    ? (restaurantAccess?.roles.filter(Boolean) as ProRole[])
    : [];
  const isServerOnlyScope = roles.includes("server") && !roles.includes("manager");
  if (!isServerOnlyScope) {
    setServerTableScopeEnabled(false);
    setServerAssignedTables([]);
    return;
  }

  const selfResponse = await fetch(`/api/staff-accounts/self?restaurant_id=${encodeURIComponent(targetRestaurantId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!selfResponse.ok) {
    setServerTableScopeEnabled(true);
    setServerAssignedTables([]);
    return;
  }

  const selfPayload = (await selfResponse.json().catch(() => ({}))) as {
    hasStaffAccount?: boolean;
    role?: string | null;
    assignedTables?: unknown;
  };
  const normalizedRole = String(selfPayload.role || "").trim().toLowerCase();
  const shouldScope = normalizedRole === "server";
  setServerTableScopeEnabled(shouldScope);
  setServerAssignedTables(shouldScope ? normalizeAssignedTables(selfPayload.assignedTables) : []);
}

export async function runFetchActiveTablesService(params: {
  supabase: any;
  restaurantScope: string | number | null;
  setActiveTables: (value: TableAssignment[]) => void;
}): Promise<void> {
  const { supabase, restaurantScope, setActiveTables } = params;
  const currentRestaurantId = String(restaurantScope ?? "").trim();
  console.log("ID utilise:", currentRestaurantId, "[admin.fetchActiveTables]");
  if (!currentRestaurantId) {
    setActiveTables([]);
    return;
  }
  const { data, error } = await supabase
    .from("table_assignments")
    .select("*")
    .eq("restaurant_id", currentRestaurantId)
    .order("table_number", { ascending: true });
  if (error) {
    console.error("Erreur fetchActiveTables:", error);
    setActiveTables([]);
    return;
  }
  setActiveTables((data || []) as TableAssignment[]);
}
