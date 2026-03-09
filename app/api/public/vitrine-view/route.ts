import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

type Body = {
  restaurant_id?: string;
  restaurantId?: string;
};

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const restaurantId = String(body.restaurant_id || body.restaurantId || "").trim();
  if (!restaurantId) {
    return NextResponse.json({ error: "restaurant_id manquant." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const rowResult = await supabase
    .from("restaurants")
    .select("id,is_active,views_vitrine")
    .eq("id", restaurantId)
    .maybeSingle();

  if (rowResult.error) {
    const missingViewsColumn = String((rowResult.error as { code?: string } | null)?.code || "") === "42703";
    if (missingViewsColumn) {
      return NextResponse.json(
        { error: "La colonne restaurants.views_vitrine est absente. Exécutez le script SQL vitrine." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: rowResult.error.message || "Lecture restaurant impossible." }, { status: 400 });
  }

  const row = rowResult.data as { id?: string; is_active?: boolean | null; views_vitrine?: number | null } | null;
  if (!row?.id) return NextResponse.json({ error: "Restaurant introuvable." }, { status: 404 });
  if (typeof row.is_active === "boolean" && !row.is_active) {
    return NextResponse.json({ error: "Restaurant hors ligne." }, { status: 409 });
  }

  const currentViews = Number(row.views_vitrine || 0);
  const nextViews = Number.isFinite(currentViews) ? currentViews + 1 : 1;
  const updateResult = await supabase
    .from("restaurants")
    .update({ views_vitrine: nextViews })
    .eq("id", restaurantId)
    .select("views_vitrine")
    .maybeSingle();

  if (updateResult.error) {
    const missingViewsColumn = String((updateResult.error as { code?: string } | null)?.code || "") === "42703";
    if (missingViewsColumn) {
      return NextResponse.json(
        { error: "La colonne restaurants.views_vitrine est absente. Exécutez le script SQL vitrine." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: updateResult.error.message || "Incrément impossible." }, { status: 400 });
  }

  return NextResponse.json(
    { ok: true, restaurant_id: restaurantId, views_vitrine: Number(updateResult.data?.views_vitrine || nextViews) },
    { status: 200 }
  );
}
