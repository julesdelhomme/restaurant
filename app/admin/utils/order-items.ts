export type Item = {
  id?: string | number;
  dish_id?: string | number;
  destination?: string | null;
  name?: string;
  name_fr?: string;
  label?: string;
  product_name?: string;
  productName?: string;
  dish_name?: string;
  dishName?: string;
  product?: { name?: string; name_fr?: string; label?: string } | null;
  dish?: { name?: string; name_fr?: string } | null;
  quantity?: number;
  category?: string;
  categorie?: string;
  instructions?: string;
  price?: number;
  cooking?: string | null;
  cuisson?: string | null;
  side?: unknown;
  accompagnement?: unknown;
  accompagnements?: unknown;
  side_dish?: unknown;
  sideDish?: unknown;
  selected_options?: unknown;
  selected_option?: unknown;
  selected_option_id?: string | number | null;
  selected_option_name?: string | null;
  selected_option_price?: number | null;
  selectedOptions?: unknown;
  options?: unknown;
  supplement?: unknown;
  supplements?: unknown;
  selected_side_ids?: string[];
  selected_extra_ids?: string[];
  selected_extras?: Array<{ id: string; label_fr: string; price: number }>;
  selected_cooking_key?: string | null;
  selected_cooking_label_fr?: string | null;
  is_formula?: boolean | null;
  formula_id?: string | number | null;
  special_request?: string;
  selectedSides?: string[];
  selectedExtras?: Array<{ name: string; price: number }>;
  is_drink?: boolean;
  from_recommendation?: boolean;
  created_at?: string | null;
  added_at?: string | null;
  inserted_at?: string | null;
  updated_at?: string | null;
  timestamp?: string | null;
  status?: string | null;
};

export function parseItems(items: unknown): Item[] {
  if (Array.isArray(items)) return items as Item[];
  if (typeof items === "string") {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? (parsed as Item[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function isUuidLike(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

export function getStableOrderItemKey(item: Item | Record<string, unknown>) {
  const record = item as Record<string, unknown>;
  const orderItemId = String(record.order_item_id ?? record.orderItemId ?? "").trim();
  if (orderItemId) return `order_item:${orderItemId}`;
  const explicitLineId = String(
    record.line_id ?? record.lineId ?? record.order_line_id ?? record.orderLineId ?? record.cart_line_id ?? ""
  ).trim();
  if (explicitLineId) return `line:${explicitLineId}`;
  return "";
}

export function dedupeOrderItems(items: Item[]) {
  const seen = new Set<string>();
  const result: Item[] = [];
  items.forEach((item) => {
    const key = getStableOrderItemKey(item);
    if (!key) {
      result.push(item);
      return;
    }
    if (seen.has(key)) {
      const record = item as unknown as Record<string, unknown>;
      false && console.log("TRACE:", {
        context: "admin.dedupeOrderItems.duplicateSkipped",
        key,
        orderItemId: String(record.order_item_id ?? record.orderItemId ?? "").trim() || null,
        dishId: String(record.dish_id ?? record.id ?? "").trim() || null,
        name: String(record.name_fr ?? record.name ?? record.product_name ?? "").trim() || null,
      });
      return;
    }
    seen.add(key);
    result.push(item);
  });
  return result;
}

function getCategory(item: Item) {
  return String(item?.category || item?.categorie || "").toLowerCase().trim();
}

export function isDrink(item: Item) {
  const explicitDestination = String(item?.destination || "").trim().toLowerCase();
  if (explicitDestination === "bar") return true;
  if (explicitDestination === "cuisine") return false;
  if (item?.is_drink === true) return true;
  const category = getCategory(item);
  return [
    "boisson",
    "boissons",
    "vin",
    "vins",
    "bar",
    "drink",
    "drinks",
    "wine",
    "wines",
    "beverage",
    "beverages",
  ].includes(category);
}

function normalizePrepItemStatus(raw: unknown): "pending" | "preparing" | "ready" {
  const normalized = String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  if (["ready", "ready_bar", "pret", "prete", "ready_to_serve", "served", "servi", "servie"].includes(normalized)) {
    return "ready";
  }
  if (
    [
      "preparing",
      "in_progress",
      "in progress",
      "to_prepare",
      "to_prepare_kitchen",
      "to_prepare_bar",
      "en_preparation",
      "preparant",
    ].includes(normalized)
  ) {
    return "preparing";
  }
  return "pending";
}

export function isItemServed(item: Item) {
  const record = item as unknown as Record<string, unknown>;
  const rawStatus = record.status ?? record.item_status ?? record.preparation_status ?? record.prep_status ?? record.state;
  const normalized = String(rawStatus || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return normalized === "served" || normalized === "servi" || normalized === "servie";
}

export function getItemPrepStatus(item: Item): "pending" | "preparing" | "ready" {
  const record = item as unknown as Record<string, unknown>;
  const rawStatus = record.status ?? record.item_status ?? record.preparation_status ?? record.prep_status ?? record.state;
  return normalizePrepItemStatus(rawStatus);
}

export function hasExplicitItemStatus(item: Item) {
  const record = item as unknown as Record<string, unknown>;
  const rawStatus = record.status ?? record.item_status ?? record.preparation_status ?? record.prep_status ?? record.state;
  return String(rawStatus || "").trim().length > 0;
}

export function isItemReady(item: Item) {
  return getItemPrepStatus(item) === "ready" && !isItemServed(item);
}

export function getItemStatusLabel(item: Item) {
  if (isItemServed(item)) return "Servi";
  const status = getItemPrepStatus(item);
  if (status === "ready") return "Pr\u00eat";
  if (status === "preparing") return "En pr\u00e9paration";
  return "En attente";
}

export function getItemStatusClass(item: Item) {
  if (isItemServed(item)) return "border-blue-700 bg-blue-600 text-white";
  const status = getItemPrepStatus(item);
  if (status === "ready") return "border-green-700 bg-green-600 text-white";
  if (status === "preparing") return "border-amber-700 bg-amber-500 text-black";
  return "border-gray-500 bg-white text-gray-800";
}

export function summarizeItems(items: Item[]) {
  const total = items.length;
  const served = items.filter((item) => isItemServed(item)).length;
  const activeItems = items.filter((item) => !isItemServed(item));
  const ready = activeItems.filter((item) => isItemReady(item)).length;
  const preparing = activeItems.filter((item) => getItemPrepStatus(item) === "preparing").length;
  const pending = Math.max(0, activeItems.length - ready - preparing);
  return { total, ready, preparing, pending, served, active: activeItems.length };
}

export function isReadyLikeOrderStatus(status: unknown) {
  const normalized = String(status || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return ["ready", "ready_bar", "pret", "ready_to_serve"].includes(normalized);
}

export function isPreparingLikeOrderStatus(status: unknown) {
  const normalized = String(status || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return [
    "preparing",
    "in_progress",
    "in progress",
    "to_prepare",
    "to_prepare_kitchen",
    "to_prepare_bar",
    "en_preparation",
    "en preparation",
  ].includes(normalized);
}

type OrderLike = { items: unknown; status: unknown };

export function getOrderItemProgress(order: OrderLike) {
  const items = parseItems(order.items);
  const activeItems = items.filter((item) => !isItemServed(item));
  const hasAnyItemStatus = activeItems.some((item) => hasExplicitItemStatus(item));
  const orderReadyLike = isReadyLikeOrderStatus(order.status);
  const readyItems = !hasAnyItemStatus && orderReadyLike ? [...activeItems] : activeItems.filter((item) => isItemReady(item));
  const pendingOrPreparingItems = activeItems.filter((item) => !readyItems.includes(item));
  const drinks = items.filter((item) => isDrink(item));
  const foods = items.filter((item) => !isDrink(item));
  const activeDrinks = activeItems.filter((item) => isDrink(item));
  const activeFoods = activeItems.filter((item) => !isDrink(item));
  return {
    items,
    activeItems,
    readyItems,
    pendingOrPreparingItems,
    drinks,
    foods,
    all: summarizeItems(items),
    drink: summarizeItems(activeDrinks),
    food: summarizeItems(activeFoods),
  };
}
