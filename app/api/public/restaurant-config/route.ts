import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

function toPublicRestaurantRow(raw: Record<string, unknown>) {
  return {
    id: raw.id ?? null,
    name: raw.name ?? null,
    logo_url: raw.logo_url ?? null,
    bg_image_url: raw.bg_image_url ?? null,
    banner_image_url: raw.banner_image_url ?? null,
    banner_url: raw.banner_url ?? null,
    background_url: raw.background_url ?? null,
    background_image_url: raw.background_image_url ?? null,
    primary_color: raw.primary_color ?? null,
    text_color: raw.text_color ?? null,
    card_bg_color: raw.card_bg_color ?? null,
    card_text_color: raw.card_text_color ?? null,
    card_bg_opacity: raw.card_bg_opacity ?? null,
    table_config: raw.table_config ?? null,
    settings: raw.settings ?? null,
    show_calories: raw.show_calories ?? null,
    enabled_languages: raw.enabled_languages ?? null,
    priority_display: raw.priority_display ?? null,
    is_order_disabled: raw.is_order_disabled ?? null,
    show_featured: raw.show_featured ?? null,
    font_family: raw.font_family ?? null,
    menu_layout: raw.menu_layout ?? null,
    card_layout: raw.card_layout ?? null,
    card_style: raw.card_style ?? null,
    card_density: raw.card_density ?? null,
    density_style: raw.density_style ?? null,
    bg_opacity: raw.bg_opacity ?? null,
    is_active: raw.is_active ?? null,
    views_vitrine: raw.views_vitrine ?? null,
  };
}

export async function GET(request: NextRequest) {
  const restaurantId = String(
    request.nextUrl.searchParams.get("restaurant_id") || request.nextUrl.searchParams.get("id") || ""
  ).trim();
  const supabase = createSupabaseAdminClient();

  const query = restaurantId
    ? supabase.from("restaurants").select("*").eq("id", restaurantId).limit(1)
    : supabase.from("restaurants").select("*").order("created_at", { ascending: true }).limit(1);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message || "Lecture restaurant impossible." }, { status: 400 });
  }

  const row = Array.isArray(data) && data[0] && typeof data[0] === "object" ? (data[0] as Record<string, unknown>) : null;
  if (!row) {
    return NextResponse.json({ error: "Restaurant introuvable." }, { status: 404 });
  }

  return NextResponse.json({ restaurant: toPublicRestaurantRow(row) }, { status: 200 });
}
