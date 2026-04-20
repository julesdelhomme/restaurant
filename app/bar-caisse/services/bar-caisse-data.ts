import type { InventoryDish, Order, OrderItem, RestaurantRow, ServiceNotification } from "../bar-caisse-helpers";
import { normalizeStatus, parseItems, parseObjectRecord, resolveRestaurantAddress } from "../bar-caisse-helpers";

type SupabaseClientLike = any;

export async function loadRestaurantSettings(params: {
  supabase: SupabaseClientLike;
  scopedRestaurantId: string;
  settingsRowId: string;
}) {
  const { supabase, scopedRestaurantId, settingsRowId } = params;
  const targetRestaurantId = String(scopedRestaurantId || settingsRowId || "").trim();
  const byId = await supabase.from("restaurants").select("*").eq("id", targetRestaurantId).maybeSingle();
  let row = (byId.data as RestaurantRow | null) || null;
  if (!row && !scopedRestaurantId) {
    const fallback = await supabase.from("restaurants").select("*").limit(1).maybeSingle();
    row = (fallback.data as RestaurantRow | null) || null;
  }
  if (!row) {
    return {
      found: false as const,
      restaurantId: targetRestaurantId || settingsRowId,
    };
  }

  const tableConfig = parseObjectRecord(row.table_config);
  const socialLinks = parseObjectRecord(tableConfig.social_links);

  return {
    found: true as const,
    restaurantId: row.id ?? settingsRowId,
    restaurantName: String(row.name || "Mon Restaurant").trim() || "Mon Restaurant",
    restaurantLogoUrl: String(row.logo_url || "").trim(),
    restaurantAddress: resolveRestaurantAddress(row, tableConfig),
    restaurantSocialLinks: {
      instagram: String(socialLinks.instagram || "").trim() || undefined,
      snapchat: String(socialLinks.snapchat || "").trim() || undefined,
      facebook: String(socialLinks.facebook || "").trim() || undefined,
      x: String(socialLinks.x || socialLinks.twitter || "").trim() || undefined,
      website: String(socialLinks.website || socialLinks.site || "").trim() || undefined,
    },
    showSocialOnReceipt: Boolean(
      tableConfig.show_social_on_digital_receipt ?? tableConfig.show_social_on_receipt
    ),
    gmailUser: String(row.smtp_user || "").trim(),
    gmailAppPassword: String(row.smtp_password || "").trim(),
  };
}

export async function loadOrdersData(params: {
  supabase: SupabaseClientLike;
  restaurantScope: string | number | null;
  scopedRestaurantId: string;
}) {
  const { supabase, restaurantScope, scopedRestaurantId } = params;
  const currentRestaurantId = String(restaurantScope ?? scopedRestaurantId ?? "").trim();
  let query = supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (currentRestaurantId) query = query.eq("restaurant_id", currentRestaurantId);
  const { data, error } = await query;
  if (error) return { error, hydratedOrders: [] as Order[], dishCategoryIdByDishId: {}, categoryDestinationById: {} };

  const nextOrders = (data || []) as Order[];
  const normalizeCoversValue = (value: unknown): number | null => {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const whole = Math.trunc(n);
    return whole > 0 ? whole : null;
  };
  const readOrderCovers = (order: Order) =>
    normalizeCoversValue(order.covers) ??
    normalizeCoversValue(order.guest_count) ??
    normalizeCoversValue(order.customer_count);

  const missingCoverTables = Array.from(
    new Set(
      nextOrders
        .filter((order) => !readOrderCovers(order))
        .map((order) => String(order.table_number ?? "").trim())
        .filter(Boolean)
    )
  );

  const coversByTable = new Map<string, number>();
  if (missingCoverTables.length > 0) {
    let tableRowsQuery = supabase.from("table_assignments").select("*").in("table_number", missingCoverTables);
    if (currentRestaurantId) tableRowsQuery = tableRowsQuery.eq("restaurant_id", currentRestaurantId);
    const { data: tableRows } = await tableRowsQuery;
    (Array.isArray(tableRows) ? tableRows : []).forEach((row) => {
      const key = String(row?.table_number || "").trim();
      const covers =
        normalizeCoversValue(row?.covers) ??
        normalizeCoversValue(row?.guest_count) ??
        normalizeCoversValue(row?.customer_count);
      if (key && covers) coversByTable.set(key, covers);
    });
  }

  const nextOrdersWithCovers = nextOrders.map((order) => {
    if (readOrderCovers(order)) return order;
    const fallback = coversByTable.get(String(order.table_number ?? "").trim());
    if (!fallback) return order;
    return { ...order, covers: fallback, guest_count: fallback, customer_count: fallback };
  });

  const hasVisibleName = (item: OrderItem) =>
    Boolean(String(item.name || item.product_name || item.label || item.title || item.display_name || "").trim());
  const getDishId = (item: OrderItem) => {
    const rec = item as unknown as Record<string, unknown>;
    const nestedDish = rec.dish && typeof rec.dish === "object" ? (rec.dish as Record<string, unknown>) : null;
    return String(item.dish_id ?? item.id ?? nestedDish?.id ?? "").trim();
  };
  const extractSideIds = (item: OrderItem): string[] => {
    const raw = [
      ...(Array.isArray(item.selected_side_ids) ? item.selected_side_ids : []),
      ...(Array.isArray(item.selectedSides) ? item.selectedSides : []),
    ];
    return raw
      .map((entry) => {
        if (entry && typeof entry === "object") {
          const rec = entry as Record<string, unknown>;
          return String(rec.id ?? rec.side_id ?? rec.value ?? "").trim();
        }
        return String(entry ?? "").trim();
      })
      .filter(Boolean);
  };
  const hasSideText = (item: OrderItem) =>
    [
      item.side,
      item.accompaniment,
      item.accompagnement,
      item.accompaniments,
      (item as unknown as Record<string, unknown>).accompagnements,
    ].some((v) => {
      if (v == null) return false;
      if (Array.isArray(v)) return v.length > 0;
      return String(v).trim().length > 0;
    });

  const itemsByOrder = nextOrdersWithCovers.map((order) => parseItems(order.items));
  const allDishIds = Array.from(
    new Set(
      itemsByOrder
        .flatMap((items) => items)
        .map((item) => getDishId(item))
        .filter(Boolean)
    )
  );
  const missingSideIds = Array.from(
    new Set(
      itemsByOrder
        .flatMap((items) => items)
        .filter((item) => !hasSideText(item))
        .flatMap((item) => extractSideIds(item))
    )
  )
    .map((id) => String(id ?? "").trim())
    .filter((id) => id.length > 0 && id !== "undefined" && id !== "null" && !id.includes(","));
  const validSideIds = (missingSideIds || []).filter(
    (id): id is string => Boolean(id) && typeof id === "string" && id.length > 5
  );
  if (validSideIds.length > 0) {
    console.log("🚨 PAYLOAD SIDES_LIBRARY (Crash 400) :", validSideIds);
  }

  const categoriesLookupPromise = (() => {
    let catQuery = supabase.from("categories").select("id,destination");
    if (currentRestaurantId) catQuery = catQuery.eq("restaurant_id", currentRestaurantId);
    return catQuery;
  })();

  const [dishesLookup, sidesLookup, categoriesLookup] = await Promise.all([
    allDishIds.length > 0
      ? supabase.from("dishes").select("id,name,name_fr,translations,category_id").in("id", allDishIds)
      : Promise.resolve({ data: [], error: null }),
    validSideIds.length > 0
      ? supabase
          .from("sides_library")
          .select("id,name,name_fr,name_en,name_es,name_de,label,title")
          .in("id", validSideIds)
      : Promise.resolve({ data: [], error: null }),
    categoriesLookupPromise,
  ]);

  const dishNameById: Record<string, string> = {};
  const nextDishCategoryIdByDishId: Record<string, string> = {};
  ((dishesLookup.data || []) as Array<Record<string, unknown>>).forEach((row) => {
    const id = String(row.id ?? "").trim();
    const translations = row.translations && typeof row.translations === "object" ? (row.translations as Record<string, unknown>) : null;
    const translated =
      String(translations?.fr ?? translations?.en ?? translations?.name_fr ?? translations?.name ?? "").trim();
    const name = String(row.name_fr || translated || row.name || "").trim();
    if (id && name) dishNameById[id] = name;
    const categoryId = String(row.category_id ?? "").trim();
    if (id && categoryId) nextDishCategoryIdByDishId[id] = categoryId;
  });

  const nextCategoryDestinationById: Record<string, "cuisine" | "bar"> = {};
  ((categoriesLookup.data || []) as Array<Record<string, unknown>>).forEach((row) => {
    const id = String(row.id ?? "").trim();
    if (!id) return;
    nextCategoryDestinationById[id] = String(row.destination || "").trim().toLowerCase() === "bar" ? "bar" : "cuisine";
  });

  const sideNameById: Record<string, string> = {};
  ((sidesLookup.data || []) as Array<Record<string, unknown>>).forEach((row) => {
    const id = String(row.id ?? "").trim();
    const name = String(row.name_fr || row.name || row.label || row.title || row.name_en || "").trim();
    if (id && name) sideNameById[id] = name;
  });

  const hydratedOrders = nextOrdersWithCovers.map((order, index) => {
    const parsed = itemsByOrder[index];
    const hydratedItems = parsed.map((item) => {
      const nextItem: OrderItem & Record<string, unknown> = { ...item };

      if (!hasVisibleName(item)) {
        const dishId = getDishId(item);
        if (dishId && dishNameById[dishId]) {
          nextItem.name = dishNameById[dishId];
          nextItem.name_fr = dishNameById[dishId];
        }
      }

      if (!String(nextItem.category_id || "").trim()) {
        const dishId = getDishId(item);
        if (dishId && nextDishCategoryIdByDishId[dishId]) {
          nextItem.category_id = nextDishCategoryIdByDishId[dishId];
        }
      }

      const sideNames = extractSideIds(item).map((id) => sideNameById[id]).filter(Boolean);
      if (sideNames.length > 0) {
        nextItem.accompaniment = sideNames.join(", ");
        nextItem.accompagnement = sideNames.join(", ");
      }

      return nextItem as OrderItem;
    });
    return { ...order, items: hydratedItems };
  });

  return {
    error: null,
    hydratedOrders,
    dishCategoryIdByDishId: nextDishCategoryIdByDishId,
    categoryDestinationById: nextCategoryDestinationById,
  };
}

export async function loadServiceNotifications(params: {
  supabase: SupabaseClientLike;
  restaurantScope: string | number | null;
  scopedRestaurantId: string;
}) {
  const { supabase, restaurantScope, scopedRestaurantId } = params;
  const currentRestaurantId = String(restaurantScope ?? scopedRestaurantId ?? "").trim();
  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (currentRestaurantId) query = query.eq("restaurant_id", currentRestaurantId);
  const { data, error } = await query;

  if (error) return { error, pending: [] as ServiceNotification[] };

  const pending = ((data || []) as ServiceNotification[]).filter((row) => {
    const status = normalizeStatus(row.status);
    if (status && status !== "pending") return false;
    const type = normalizeStatus(row.type);
    return type === "client" || type === "client_call" || type === "kitchen_call" || type === "appel" || type === "cuisine";
  });

  return { error: null, pending };
}

export async function loadInventoryData(params: {
  supabase: SupabaseClientLike;
  restaurantId: string | number | null;
  scopedRestaurantId: string;
}) {
  const { supabase, restaurantId, scopedRestaurantId } = params;
  const currentRestaurantId = String(restaurantId ?? scopedRestaurantId ?? "").trim();
  let query = supabase.from("dishes").select("*, categories(name_fr)").order("id", { ascending: true });
  if (currentRestaurantId) query = query.eq("restaurant_id", currentRestaurantId);
  let { data, error } = await query;
  if (error && String((error as { code?: string }).code || "") === "42703" && currentRestaurantId) {
    const fallback = await supabase.from("dishes").select("*, categories(name_fr)").order("id", { ascending: true });
    data = fallback.data;
    error = fallback.error;
  }
  return { data: ((data || []) as InventoryDish[]), error };
}

export async function completeNotification(params: {
  supabase: SupabaseClientLike;
  notificationId: string | number;
}) {
  const { supabase, notificationId } = params;
  const { error } = await supabase
    .from("notifications")
    .update({ status: "completed" })
    .eq("id", notificationId);
  return { error };
}

export async function sendKitchenNote(params: {
  supabase: SupabaseClientLike;
  restaurantId: string;
  message: string;
  isMissingColumnOrCacheError: (error: unknown) => boolean;
}) {
  const { supabase, restaurantId, message, isMissingColumnOrCacheError } = params;
  const payload = {
    restaurant_id: restaurantId,
    content: message,
    message,
    sender_name: "Bar/Caisse",
    is_active: true,
  };
  let insertResult = await supabase.from("kitchen_messages").insert([payload]);
  if (insertResult.error && isMissingColumnOrCacheError(insertResult.error)) {
    const fallbackPayload = {
      restaurant_id: restaurantId,
      content: message,
      message,
      is_active: true,
    };
    insertResult = await supabase.from("kitchen_messages").insert([fallbackPayload]);
  }
  return { error: insertResult.error };
}
