import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

type OrderRecord = Record<string, unknown>;

function normalizeObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => normalizeObject(entry));
  if (!value || typeof value !== "object") return value ?? null;
  const source = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  Object.keys(source)
    .sort((a, b) => a.localeCompare(b))
    .forEach((key) => {
      next[key] = normalizeObject(source[key]);
    });
  return next;
}

function buildOrderFingerprint(order: OrderRecord) {
  const tableNumber = String(order.table_number ?? "").trim();
  const restaurantId = String(order.restaurant_id ?? "").trim();
  const totalPrice = Number(order.total_price ?? 0);
  const currentStep = Number(order.current_step ?? 0);
  const serviceStep = String(order.service_step ?? "").trim();
  const items = normalizeObject(order.items ?? []);
  return JSON.stringify({
    table_number: tableNumber,
    restaurant_id: restaurantId,
    total_price: Number.isFinite(totalPrice) ? Number(totalPrice.toFixed(2)) : 0,
    current_step: Number.isFinite(currentStep) ? currentStep : 0,
    service_step: serviceStep,
    items,
  });
}

function toOrderPayload(body: unknown): OrderRecord | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const nestedOrder = record.order;
  if (nestedOrder && typeof nestedOrder === "object") return nestedOrder as OrderRecord;
  return record;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const order = toOrderPayload(body);
  if (!order) {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const tableNumber = String(order.table_number ?? "").trim();
  const items = Array.isArray(order.items) ? order.items : [];
  if (!tableNumber || items.length === 0) {
    return NextResponse.json({ error: "Commande incomplète." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const restaurantId = String(order.restaurant_id ?? "").trim();
  const sinceIso = new Date(Date.now() - 2_000).toISOString();

  let duplicateQuery = supabase
    .from("orders")
    .select("id, table_number, restaurant_id, total_price, service_step, current_step, items, created_at")
    .eq("table_number", tableNumber)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(20);

  if (restaurantId) {
    duplicateQuery = duplicateQuery.eq("restaurant_id", restaurantId);
  }

  const { data: recentOrders, error: duplicateError } = await duplicateQuery;
  if (duplicateError) {
    return NextResponse.json({ error: duplicateError.message || "Vérification doublon impossible." }, { status: 400 });
  }

  const incomingFingerprint = buildOrderFingerprint(order);
  const duplicate = (recentOrders || []).find((row) => {
    const candidate = row as OrderRecord;
    const candidateRestaurantId = String(candidate.restaurant_id ?? "").trim();
    if (restaurantId !== candidateRestaurantId) return false;
    return buildOrderFingerprint(candidate) === incomingFingerprint;
  });

  if (duplicate) {
    return NextResponse.json(
      {
        duplicate: true,
        orderId: String((duplicate as OrderRecord).id ?? ""),
        message: "Commande déjà enregistrée.",
      },
      { status: 409 }
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from("orders")
    .insert([order as never])
    .select("id, created_at")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message || "Insertion impossible." }, { status: 400 });
  }

  return NextResponse.json({ success: true, order: inserted }, { status: 201 });
}

