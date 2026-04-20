import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, readAccessContextForUser, readUserFromAccessToken } from "@/lib/server/access-context";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

type StaffSelfRow = {
  id: string;
  role: string | null;
  assigned_tables?: unknown;
  is_active?: boolean | null;
};

function normalizeAssignedTables(raw: unknown): number[] {
  const parseArray = (value: unknown): unknown[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      const text = value.trim();
      if (!text) return [];
      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : text.split(",");
      } catch {
        return text.split(",");
      }
    }
    return [];
  };

  const parsed = parseArray(raw)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.trunc(value));

  return Array.from(new Set(parsed)).sort((a, b) => a - b);
}

export async function GET(request: NextRequest) {
  const accessToken = getBearerToken(request.headers.get("authorization"));
  if (!accessToken) {
    return NextResponse.json({ error: "Session manquante." }, { status: 401 });
  }

  const user = await readUserFromAccessToken(accessToken);
  if (!user) {
    return NextResponse.json({ error: "Session invalide." }, { status: 401 });
  }

  const restaurantId = String(request.nextUrl.searchParams.get("restaurant_id") || "").trim();
  if (!restaurantId) {
    return NextResponse.json({ error: "restaurant_id manquant." }, { status: 400 });
  }

  const context = await readAccessContextForUser(user);
  const canAccessRestaurant =
    context.isSuperAdmin || context.restaurants.some((entry) => String(entry.restaurantId || "").trim() === restaurantId);
  if (!canAccessRestaurant) {
    return NextResponse.json({ error: "Acc\u00e8s refus\u00e9." }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  const selectWithAssignedTables = "id,role,assigned_tables,is_active";
  const selectWithoutAssignedTables = "id,role,is_active";
  let rowResult = await supabase
    .from("staff_accounts")
    .select(selectWithAssignedTables)
    .eq("restaurant_id", restaurantId)
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  let assignedTablesColumnMissing = false;
  if (rowResult.error) {
    const missingAssignedTables =
      String((rowResult.error as { code?: string } | null)?.code || "") === "42703" &&
      String((rowResult.error as { message?: string } | null)?.message || "").toLowerCase().includes("assigned_tables");
    if (missingAssignedTables) {
      assignedTablesColumnMissing = true;
      rowResult = await supabase
        .from("staff_accounts")
        .select(selectWithoutAssignedTables)
        .eq("restaurant_id", restaurantId)
        .eq("auth_user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
    }
  }

  if (rowResult.error) {
    const missingTable = String((rowResult.error as { code?: string } | null)?.code || "") === "42P01";
    const message = missingTable
      ? "La table staff_accounts est absente. Exécutez le script SQL de sécurisation."
      : rowResult.error.message || "Impossible de lire le profil staff.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const row = (rowResult.data || null) as StaffSelfRow | null;
  if (!row) {
    return NextResponse.json({ hasStaffAccount: false, role: null, assignedTables: [] }, { status: 200 });
  }

  return NextResponse.json(
    {
      hasStaffAccount: true,
      id: row.id,
      role: String(row.role || "").trim().toLowerCase(),
      assignedTables: assignedTablesColumnMissing ? [] : normalizeAssignedTables(row.assigned_tables),
    },
    { status: 200 }
  );
}
