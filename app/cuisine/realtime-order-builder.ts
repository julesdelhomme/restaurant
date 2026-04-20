import type { Item, Order } from "./types";

type BuildOrderFromRealtimeRowArgs = {
  row: Record<string, unknown>;
  existingOrders: Order[];
  parseItems: (items: any) => Item[];
  dedupeOrderItems: (items: Item[]) => Item[];
};

export const buildOrderFromRealtimeRowWithState = ({
  row,
  existingOrders,
  parseItems,
  dedupeOrderItems,
}: BuildOrderFromRealtimeRowArgs): Order | null => {
  const rowId = String(row.id || "").trim();
  if (!rowId) return null;
  const existingOrder = existingOrders.find((order) => String(order.id || "").trim() === rowId) || null;
  const parsedItems = dedupeOrderItems(parseItems(row.items ?? existingOrder?.items ?? []));
  const parseNullableNumber = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    id: rowId,
    table_number: String(row.table_number ?? existingOrder?.table_number ?? "").trim(),
    items: parsedItems,
    order_items: Array.isArray(row.order_items) ? (row.order_items as any[]) : existingOrder?.order_items ?? null,
    status: String(row.status ?? existingOrder?.status ?? "pending").trim() || "pending",
    created_at: String(row.created_at ?? existingOrder?.created_at ?? new Date().toISOString()),
    service_step: String(row.service_step ?? existingOrder?.service_step ?? "").trim() || null,
    current_step:
      parseNullableNumber(row.current_step) ??
      parseNullableNumber(existingOrder?.current_step) ??
      null,
    covers:
      parseNullableNumber(row.covers) ??
      parseNullableNumber(existingOrder?.covers) ??
      null,
    guest_count:
      parseNullableNumber(row.guest_count) ??
      parseNullableNumber(existingOrder?.guest_count) ??
      null,
    customer_count:
      parseNullableNumber(row.customer_count) ??
      parseNullableNumber(existingOrder?.customer_count) ??
      null,
    restaurant_id:
      (row.restaurant_id as string) ??
      (existingOrder?.restaurant_id as string) ??
      null,
  };
};
