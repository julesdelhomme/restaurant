import type { Item, Order } from "./types";

const isUuidLike = (value: unknown) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());

export const normalizeStepValue = (value: unknown, allowZero = false) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const normalized = Math.trunc(parsed);
  if (allowZero) return normalized >= 0 ? normalized : null;
  return normalized > 0 ? normalized : null;
};

const normalizeStatusValue = (value: unknown) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const normalizeItemStatus = (value: unknown): "pending" | "preparing" | "ready" => {
  const normalized = normalizeStatusValue(value);
  if (
    [
      "ready",
      "ready_bar",
      "pret",
      "prêt",
      "prete",
      "prête",
      "ready_to_serve",
      "served",
      "servi",
      "servie",
    ].includes(normalized)
  ) {
    return "ready";
  }
  if (
    [
      "preparing",
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
};

export const getItemStatus = (item: Item): "pending" | "preparing" | "ready" => {
  const record = item as unknown as Record<string, unknown>;
  const rawStatus =
    record.status ??
    record.item_status ??
    record.preparation_status ??
    record.prep_status ??
    record.state;
  return normalizeItemStatus(rawStatus);
};

export const isItemReady = (item: Item) => getItemStatus(item) === "ready";

export const setItemStatus = (item: Item, status: "pending" | "preparing" | "ready"): Item => ({
  ...item,
  status,
});

export const deriveOrderStatusFromItems = (items: Item[]) => {
  if (items.length === 0) return "pending";
  const statuses = items.map((item) => getItemStatus(item));
  if (statuses.every((status) => status === "ready")) return "ready";
  if (statuses.some((status) => status === "ready" || status === "preparing")) return "preparing";
  return "pending";
};

export const parseItems = (items: any): Item[] => {
  if (Array.isArray(items)) return items;
  if (typeof items === "string") {
    try {
      return JSON.parse(items);
    } catch {
      return [];
    }
  }
  return [];
};

export const getStableOrderItemKey = (item: Item | Record<string, unknown>) => {
  const record = item as Record<string, unknown>;
  const orderItemId = String(record.order_item_id ?? record.orderItemId ?? "").trim();
  if (orderItemId) return `order_item:${orderItemId}`;
  const itemId = String(record.id ?? "").trim();
  if (isUuidLike(itemId)) return `item:${itemId}`;
  return "";
};

export const dedupeOrderItems = (items: Item[]) => {
  const seen = new Set<string>();
  const result: Item[] = [];
  items.forEach((item) => {
    const key = getStableOrderItemKey(item);
    if (!key) {
      result.push(item);
      return;
    }
    if (seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });
  return result;
};

const parseOrderItemsRelation = (order: Order): Item[] => {
  const rows = Array.isArray(order.order_items) ? order.order_items : [];
  if (rows.length === 0) return [];
  const parseMaybeJson = (value: unknown) => {
    if (typeof value !== "string") return value;
    const raw = value.trim();
    if (!raw) return value;
    try {
      return JSON.parse(raw);
    } catch {
      return value;
    }
  };
  const toArray = (value: unknown): unknown[] => {
    const parsed = parseMaybeJson(value);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") return [parsed];
    return [];
  };
  return rows.map((row: any) => {
    const dishRow =
      row?.dishes && typeof row.dishes === "object"
        ? row.dishes
        : row?.dish && typeof row.dish === "object"
          ? row.dish
          : null;
    const orderItemOptions = Array.isArray(row?.order_item_options)
      ? row.order_item_options
      : Array.isArray(row?.item_options)
        ? row.item_options
        : [];
    const normalizedOptionEntries = orderItemOptions.flatMap((entry: any) => {
      const optionSource =
        (entry?.dish_option && typeof entry.dish_option === "object" ? entry.dish_option : null) ||
        (entry?.option && typeof entry.option === "object" ? entry.option : null);
      const parsedEntry =
        typeof entry === "string"
          ? (() => {
              try {
                return JSON.parse(entry);
              } catch {
                return entry;
              }
            })()
          : entry;
      const parsedObject = parsedEntry && typeof parsedEntry === "object" ? (parsedEntry as Record<string, unknown>) : null;
      const payloadValue = parsedObject?.option_payload ?? parsedObject?.payload ?? parsedObject?.value ?? null;
      const parsedPayload = typeof payloadValue === "string"
        ? (() => {
            try {
              return JSON.parse(payloadValue);
            } catch {
              return payloadValue;
            }
          })()
        : payloadValue;
      const payloadObject = parsedPayload && typeof parsedPayload === "object" ? (parsedPayload as Record<string, unknown>) : null;
      const optionLabel =
        String(
          optionSource?.name_fr ||
            optionSource?.name ||
            parsedObject?.option_name ||
            parsedObject?.name ||
            payloadObject?.name_fr ||
            payloadObject?.name ||
            payloadObject?.label ||
            ""
        ).trim() || null;
      if (!optionLabel) return [];
      return [
        {
          id: entry?.id ?? optionSource?.id ?? null,
          kind: String(optionSource?.kind || optionSource?.type || entry?.kind || "option").trim() || "option",
          source: "order_item_options",
          label_fr: optionLabel,
          name_fr: optionLabel,
          name: optionLabel,
          value: optionLabel,
          values: [optionLabel],
          option_payload: payloadObject ?? null,
        },
      ];
    });
    const selectedOptions = [
      ...toArray(row?.selected_options),
      ...toArray(row?.selectedOptions),
      ...normalizedOptionEntries,
    ];
    const formulaDetails = [
      ...toArray(row?.formula_details),
      ...toArray(row?.formulaDetails),
      ...toArray(row?.formula_data),
      ...toArray(row?.formulaData),
      ...toArray(row?.metadata),
      ...toArray(row?.meta),
    ];
    false && console.log("TRACE:", {
      context: "kitchen.parseOrderItemsRelation.row",
      orderId: order.id,
      orderItemId: String(row?.id || "").trim() || null,
      dishId: String(row?.dish_id ?? dishRow?.id ?? "").trim() || null,
      name: String(row?.name_fr || dishRow?.name_fr || row?.name || dishRow?.name || "").trim() || null,
      orderItemOptionsCount: orderItemOptions.length,
      selectedOptionsCount: selectedOptions.length,
      formulaDetailsCount: formulaDetails.length,
    });
    return {
      ...(row || {}),
      id: row?.id ?? row?.dish_id ?? dishRow?.id ?? "",
      order_item_id: row?.id ?? null,
      dish_id: row?.dish_id ?? dishRow?.id ?? "",
      category_id: row?.category_id ?? dishRow?.category_id ?? null,
      dish: dishRow || undefined,
      name: String(row?.name_fr || dishRow?.name_fr || row?.name || row?.product_name || dishRow?.name || "").trim(),
      name_fr: String(row?.name_fr || dishRow?.name_fr || dishRow?.name || row?.name || "").trim(),
      quantity: Number(row?.quantity || 1),
      categorie: String(row?.categorie || row?.category || dishRow?.categorie || dishRow?.category || "").trim(),
      category: String(row?.category || row?.categorie || dishRow?.category || dishRow?.categorie || "").trim(),
      instructions: String(row?.instructions || row?.notes || "").trim(),
      is_formula: Boolean(row?.is_formula ?? dishRow?.is_formula),
      formula_id: row?.formula_id ?? row?.formulaDishId ?? row?.formula_dish_id ?? null,
      formula_dish_id: row?.formula_dish_id ?? row?.formulaDishId ?? row?.formula_id ?? null,
      formula_name: String(row?.formula_name || row?.formula_dish_name || "").trim() || null,
      formula_dish_name: String(row?.formula_dish_name || row?.formula_name || "").trim() || null,
      formula_current_sequence: Number.isFinite(Number(row?.formula_current_sequence))
        ? Number(row?.formula_current_sequence)
        : null,
      order_item_options: orderItemOptions,
      selected_options: selectedOptions,
      selectedOptions: selectedOptions,
      options: selectedOptions,
      formula_details: formulaDetails,
      formulaDetails: formulaDetails,
      status: row?.status ?? row?.item_status ?? row?.prep_status ?? null,
      selected_option_name: String(row?.selected_option_name || row?.option_name || "").trim() || null,
      selected_cooking_label_fr:
        String(row?.selected_cooking_label_fr || row?.selected_cooking_label || row?.cooking || row?.cuisson || "").trim() || null,
      step: normalizeStepValue(
        row?.step ??
          row?.step_number ??
          row?.service_step_sequence ??
          row?.sort_order ??
          row?.sequence ??
          row?.formula_current_sequence ??
          row?.formulaCurrentSequence,
        true
      ),
    } as Item;
  });
};

export const getOrderItems = (order: Order): Item[] => {
  const directItems = parseItems(order.items);
  if (directItems.length > 0) return directItems;
  const relationalItems = parseOrderItemsRelation(order);
  if (relationalItems.length > 0) return relationalItems;
  return [];
};

export const getRealtimeTransitionItemKey = (item: Item, index: number) => {
  const record = item as unknown as Record<string, unknown>;
  const orderItemId = String(record.order_item_id ?? record.orderItemId ?? "").trim();
  if (orderItemId) return `order_item:${orderItemId}`;
  const dishId = String(record.dish_id ?? record.id ?? "").trim();
  const sequence = normalizeStepValue(record.step ?? record.sequence ?? record.formula_current_sequence ?? record.formulaCurrentSequence, true) ?? 0;
  const quantity = Number(record.quantity || 1);
  return `dish:${dishId || "unknown"}:step:${sequence}:qty:${quantity}:idx:${index}`;
};

export const hasKitchenPreparingTransition = (
  oldItems: Item[],
  newItems: Item[],
  isKitchenCourse: (item: Item) => boolean
) => {
  const oldStatusByKey = new Map<string, "pending" | "preparing" | "ready">();
  oldItems.forEach((item, index) => {
    if (!isKitchenCourse(item)) return;
    oldStatusByKey.set(getRealtimeTransitionItemKey(item, index), getItemStatus(item));
  });
  for (let index = 0; index < newItems.length; index += 1) {
    const item = newItems[index];
    if (!isKitchenCourse(item)) continue;
    const nextStatus = getItemStatus(item);
    if (nextStatus !== "preparing") continue;
    const key = getRealtimeTransitionItemKey(item, index);
    const oldStatus = oldStatusByKey.get(key) || "pending";
    if (oldStatus !== "preparing") return true;
  }
  return false;
};
