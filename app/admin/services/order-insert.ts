type OrderPayload = {
  restaurant_id: string;
  table_number: number;
  covers: number;
  guest_count: number;
  customer_count: number;
  items: unknown;
  total_price: number;
  service_step: string;
  current_step: number;
};

type OrderInsertError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
} | null;

export async function tryInsertOrderWithFallbacks(
  supabaseClient: any,
  payload: OrderPayload,
  forcedOrderId: string
): Promise<OrderInsertError> {
  const coversInt = Math.max(0, Math.trunc(Number(payload.covers || 0)));
  const guestCountInt = Math.max(0, Math.trunc(Number(payload.guest_count || coversInt)));
  const customerCountInt = Math.max(0, Math.trunc(Number(payload.customer_count || coversInt)));

  const orderInsertPayloads = [
    {
      id: forcedOrderId,
      restaurant_id: payload.restaurant_id,
      table_number: payload.table_number,
      covers: coversInt,
      nb_persons: coversInt,
      guest_count: guestCountInt,
      customer_count: customerCountInt,
      items: payload.items,
      total_price: payload.total_price,
      status: "pending",
      service_step: payload.service_step,
      current_step: payload.current_step,
    },
    {
      id: forcedOrderId,
      restaurant_id: payload.restaurant_id,
      table_number: payload.table_number,
      covers: coversInt,
      nb_persons: coversInt,
      guest_count: guestCountInt,
      items: payload.items,
      total_price: payload.total_price,
      status: "pending",
      service_step: payload.service_step,
      current_step: payload.current_step,
    },
    {
      id: forcedOrderId,
      restaurant_id: payload.restaurant_id,
      table_number: payload.table_number,
      covers: coversInt,
      nb_persons: coversInt,
      items: payload.items,
      total_price: payload.total_price,
      status: "pending",
      service_step: payload.service_step,
      current_step: payload.current_step,
    },
    {
      id: forcedOrderId,
      restaurant_id: payload.restaurant_id,
      table_number: payload.table_number,
      nb_persons: coversInt,
      items: payload.items,
      total_price: payload.total_price,
      status: "pending",
      service_step: payload.service_step,
      current_step: payload.current_step,
    },
    {
      id: forcedOrderId,
      restaurant_id: payload.restaurant_id,
      table_number: payload.table_number,
      items: payload.items,
      total_price: payload.total_price,
      status: "pending",
      service_step: payload.service_step,
      current_step: payload.current_step,
    },
    {
      id: forcedOrderId,
      restaurant_id: payload.restaurant_id,
      table_number: payload.table_number,
      items: payload.items,
      total_price: payload.total_price,
      status: "pending",
      service_step: payload.service_step,
    },
  ];

  let insertError: {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  } | null = null;

  for (const candidate of orderInsertPayloads) {
    const coversValue = Number((candidate as { covers?: unknown }).covers ?? payload.covers ?? 0) || 0;
    console.log("Saisie couverts détectée :", coversValue);
    const result = await supabaseClient.from("orders").insert([candidate]);
    if (!result.error) {
      insertError = null;
      break;
    }
    insertError = result.error as { message?: string; code?: string; details?: string; hint?: string };
    const code = String(insertError.code || "");
    const msg = String(insertError.message || "").toLowerCase();
    const missingColumn = code === "42703" || msg.includes("column") || msg.includes("schema cache");
    if (!missingColumn) break;
  }

  return insertError;
}
