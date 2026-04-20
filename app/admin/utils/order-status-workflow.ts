import type { DishItem, Order } from "../types";
import type { Item } from "./order-items";
import { isDrink } from "./order-items";
import { resolveSelectedDishLabel } from "@/app/lib/order-item-display";

export function normalizeOrderStatus(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function isPaidStatus(status: unknown) {
  const normalized = normalizeOrderStatus(status);
  return normalized === "paid" || normalized === "paye" || normalized === "payee";
}

export function isServedOrArchivedStatus(status: unknown) {
  const normalized = normalizeOrderStatus(status);
  return (
    normalized === "served" ||
    normalized === "servi" ||
    normalized === "servie" ||
    normalized === "archived" ||
    normalized === "archive" ||
    normalized === "archivee"
  );
}

export function normalizeWorkflowItemStatus(item: Item) {
  const record = item as unknown as Record<string, unknown>;
  return String(record.status ?? record.item_status ?? record.preparation_status ?? record.prep_status ?? record.state ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function isItemStepDone(item: Item, isItemServedFn: (item: Item) => boolean) {
  return isItemServedFn(item);
}

export function isItemWaitingOrPending(
  item: Item,
  getItemPrepStatusFn: (item: Item) => "pending" | "preparing" | "ready"
) {
  const normalized = normalizeWorkflowItemStatus(item);
  if (!normalized) return true;
  if (["waiting", "en_attente", "attente", "queued", "queue", "pending"].includes(normalized)) return true;
  return getItemPrepStatusFn(item) === "pending";
}

export function isItemWaitingForNextStep(item: Item) {
  const normalized = normalizeWorkflowItemStatus(item);
  return ["waiting", "en_attente", "attente", "queued", "queue"].includes(normalized);
}

export function resolveLastServedItemTimestampMs(
  order: Order,
  parseItemsFn: (items: unknown) => Item[],
  isItemServedFn: (item: Item) => boolean
): number | null {
  const servedItems = parseItemsFn(order.items).filter((item) => isItemServedFn(item));
  if (servedItems.length === 0) return null;
  const timestamps = servedItems
    .map((item) => {
      const record = item as unknown as Record<string, unknown>;
      const rawTimestamp = record.updated_at ?? record.served_at ?? record.status_updated_at ?? record.timestamp ?? record.created_at ?? null;
      const parsed = new Date(String(rawTimestamp || "")).getTime();
      return Number.isFinite(parsed) ? parsed : null;
    })
    .filter((value): value is number => Number.isFinite(value));
  if (timestamps.length === 0) return null;
  return timestamps.sort((a, b) => b - a)[0] ?? null;
}

export function resolveOrderItemLabel(item: Item, dishes: DishItem[]) {
  const itemRecord = item as unknown as Record<string, unknown>;
  const isFormulaLike = Boolean(
    itemRecord.is_formula ??
      itemRecord.formula_id ??
      itemRecord.formulaId ??
      itemRecord.formula_dish_id ??
      itemRecord.formulaDishId
  );

  if (isFormulaLike) {
    const formulaDishObject =
      itemRecord.dish && typeof itemRecord.dish === "object" ? (itemRecord.dish as Record<string, unknown>) : null;
    const formulaSpecificCandidates = [
      itemRecord.display_name,
      itemRecord.selected_dish_name_fr,
      itemRecord.selected_dish_name,
      itemRecord.selectedDishName,
      itemRecord.dish_name_fr,
      itemRecord.dish_name,
      itemRecord.dishName,
      formulaDishObject?.name_fr,
      formulaDishObject?.name,
      itemRecord.product_name,
      itemRecord.productName,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .filter((value) => !value.toLowerCase().includes("formule"));
    if (formulaSpecificCandidates.length > 0) {
      return formulaSpecificCandidates[0] as string;
    }
  }

  const directLabel = resolveSelectedDishLabel(item);
  if (directLabel) return directLabel;

  const dishId = String(item.dish_id ?? item.id ?? "").trim();
  if (dishId) {
    const sourceDish = dishes?.find((dish) => String(dish?.id || "").trim() === dishId);
    const catalogLabel = String(sourceDish?.name_fr || "").trim() || String(sourceDish?.name || "").trim() || String(sourceDish?.nom || "").trim();
    if (catalogLabel) return catalogLabel;
  }
  return isDrink(item) ? "Boisson" : "Plat inconnu";
}

export function getReadyItemEntries(
  order: Order,
  parseItemsFn: (items: unknown) => Item[],
  isItemServedFn: (item: Item) => boolean,
  isItemReadyFn: (item: Item) => boolean
) {
  const activeEntries = parseItemsFn(order.items)
    .map((item, index) => ({ item, index }))
    .filter((entry) => !isItemServedFn(entry.item));
  const readyEntries = activeEntries
    .filter((entry) => isItemReadyFn(entry.item))
    .map((entry) => {
      const record = entry.item as unknown as Record<string, unknown>;
      const orderItemId = String(record.order_item_id ?? record.orderItemId ?? "").trim();
      const fallbackItemId = String(record.id ?? record.dish_id ?? "").trim();
      return {
        ...entry,
        orderItemId: orderItemId || null,
        fallbackItemId: fallbackItemId || null,
      };
    });
  false && console.log("TRACE:", {
    context: "admin.getReadyItemEntries",
    orderId: order.id,
    readyEntries: readyEntries.map((entry) => ({
      index: entry.index,
      orderItemId: entry.orderItemId,
      fallbackItemId: entry.fallbackItemId,
      itemName: String(
        (entry.item as Record<string, unknown>).name_fr ??
          (entry.item as Record<string, unknown>).name ??
          (entry.item as Record<string, unknown>).product_name ??
          ""
      ).trim() || null,
    })),
  });
  return readyEntries;
}
