import type { Order } from "./types";

type FetchKitchenOrdersQueryArgs = {
  supabase: any;
  restaurantId: string;
  getOrderItems: (order: Order) => any[];
  isKitchenCourse: (item: any) => boolean;
};

export const fetchKitchenOrdersQuery = async ({
  supabase,
  restaurantId,
  getOrderItems,
  isKitchenCourse,
}: FetchKitchenOrdersQueryArgs) => {
  const sinceIso = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  let ordersResult = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .gt("created_at", sinceIso)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  const { data: rawOrders, error } = ordersResult;
  if (error) {
    return {
      error,
      kitchenOrdersWithCovers: [] as Order[],
    };
  }

  const baseOrders = (rawOrders || []) as Array<Record<string, unknown>>;
  const itemsByOrderId = new Map<string, Array<Record<string, unknown>>>();
  baseOrders.forEach((row) => {
    const orderId = String(row.id || "").trim();
    if (!orderId) return;
    const items = getOrderItems(row as unknown as Order) as Array<Record<string, unknown>>;
    itemsByOrderId.set(orderId, Array.isArray(items) ? items : []);
  });
  const dishIds = [...new Set(
    Array.from(itemsByOrderId.values())
      .flat()
      .map((item) => item.dish_id ?? item.id)
      .filter(Boolean)
      .map((value) => String(value))
  )];
  const { data: dishes } = dishIds.length > 0
    ? await supabase.from("dishes").select("*").in("id", dishIds)
    : { data: [] as Array<Record<string, unknown>> };
  const dishById = new Map<string, Record<string, unknown>>();
  (dishes || []).forEach((dish: Record<string, unknown>) => {
    const key = String(dish.id || "").trim();
    if (key) dishById.set(key, dish);
  });

  const dataWithItems = baseOrders.map((row) => {
    const orderId = String(row.id || "").trim();
    const orderItems = orderId ? itemsByOrderId.get(orderId) || [] : [];
    const enrichedItems = orderItems.map((item) => {
      const dishId = String(item.dish_id ?? item.id ?? "").trim();
      return {
        ...item,
        dish: dishId ? dishById.get(dishId) || null : null,
      };
    });
    return {
      ...row,
      items: enrichedItems.length > 0 ? enrichedItems : row.items,
      order_items: enrichedItems,
    };
  });
  const closedStatuses = new Set([
    "paid",
    "paye",
    "payee",
    "archived",
    "archive",
    "archivee",
    "closed",
    "cloture",
    "cloturee",
    "cancelled",
    "canceled",
    "annule",
    "annulee",
  ]);

  const kitchenOrders = dataWithItems.filter((order: any) => {
    const normalizedStatus = String(order.status || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    if (closedStatuses.has(normalizedStatus)) return false;
    const items = getOrderItems(order as Order);
    return items.some((item: any) => isKitchenCourse(item));
  });

  const normalizeCoversValue = (value: unknown) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const whole = Math.trunc(n);
    return whole > 0 ? whole : null;
  };
  const readOrderCovers = (order: any) =>
    normalizeCoversValue(order?.covers) ??
    normalizeCoversValue(order?.guest_count) ??
    normalizeCoversValue(order?.customer_count);

  const missingCoverTables = Array.from(
    new Set(
      kitchenOrders
        .filter((order: any) => !readOrderCovers(order))
        .map((order: any) => String(order.table_number || "").trim())
        .filter(Boolean)
    )
  );

  let coversByTable = new Map<string, number>();
  if (missingCoverTables.length > 0) {
    const { data: tableRows } = await supabase
      .from("table_assignments")
      .select("*")
      .in("table_number", missingCoverTables);
    coversByTable = new Map<string, number>();
    (tableRows || []).forEach((row: any) => {
      const key = String(row?.table_number || "").trim();
      const covers =
        normalizeCoversValue(row?.covers) ??
        normalizeCoversValue(row?.guest_count) ??
        normalizeCoversValue(row?.customer_count);
      if (key && covers) coversByTable.set(key, covers);
    });
  }

  const kitchenOrdersWithCovers = kitchenOrders.map((order: any) => {
    if (readOrderCovers(order)) return order;
    const fallback = coversByTable.get(String(order?.table_number || "").trim());
    if (!fallback) return order;
    return { ...order, covers: fallback, guest_count: fallback, customer_count: fallback };
  });

  return {
    error: null,
    kitchenOrdersWithCovers: kitchenOrdersWithCovers as Order[],
  };
};
