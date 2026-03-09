import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

type ResolveBody = {
  identifier?: string;
  restaurantId?: string;
};

type StaffAccountRow = {
  auth_user_id: string | null;
  restaurant_id: string | null;
  role: string | null;
};

function normalizeIdentifier(raw: unknown) {
  return String(raw || "").trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  let body: ResolveBody;
  try {
    body = (await request.json()) as ResolveBody;
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const identifier = normalizeIdentifier(body.identifier);
  const restaurantId = String(body.restaurantId || "").trim();
  if (!identifier) {
    return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("staff_accounts")
    .select("auth_user_id,restaurant_id,role")
    .eq("normalized_identifier", identifier)
    .eq("is_active", true);
  if (restaurantId) query = query.eq("restaurant_id", restaurantId);

  const staffRowsResult = await query;
  if (staffRowsResult.error) {
    const missingTable = String((staffRowsResult.error as { code?: string } | null)?.code || "") === "42P01";
    const errorMessage = missingTable
      ? "La table staff_accounts est absente. Exécutez le script SQL de sécurisation."
      : "Impossible de résoudre cet identifiant.";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  const rows = (staffRowsResult.data || []) as StaffAccountRow[];
  if (rows.length === 0) {
    return NextResponse.json({ error: "Identifiant introuvable." }, { status: 404 });
  }
  if (!restaurantId && rows.length > 1) {
    return NextResponse.json(
      { error: "Identifiant ambigu. Ouvrez d'abord l'URL du restaurant puis reconnectez-vous." },
      { status: 409 }
    );
  }

  const selectedRow = rows[0];
  const authUserId = String(selectedRow.auth_user_id || "").trim();
  if (!authUserId) {
    return NextResponse.json({ error: "Compte staff invalide." }, { status: 400 });
  }

  const authUserResult = await supabase.auth.admin.getUserById(authUserId);
  const email = String(authUserResult.data.user?.email || "").trim().toLowerCase();
  if (authUserResult.error || !email) {
    return NextResponse.json({ error: "Email de connexion introuvable." }, { status: 400 });
  }

  return NextResponse.json(
    {
      email,
      restaurantId: String(selectedRow.restaurant_id || "").trim(),
      role: String(selectedRow.role || "").trim(),
    },
    { status: 200 }
  );
}

