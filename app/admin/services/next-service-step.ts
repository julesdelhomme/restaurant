import type { Item } from "../utils/order-items";

type SyncItemsForNextServiceStepParams = {
  parsedItems: Item[];
  normalizedNextStep: number;
  normalizeFormulaStepValue: (value: unknown, strict?: boolean) => number | null;
};

export function syncItemsForNextServiceStepService({
  parsedItems,
  normalizedNextStep,
  normalizeFormulaStepValue,
}: SyncItemsForNextServiceStepParams): Item[] {
  const normalizeStatusText = (value: unknown) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const resolveSyncStep = (record: Record<string, unknown>) =>
    normalizeFormulaStepValue(
      record.step ??
        record.sequence ??
        record.step_number ??
        record.sort_order ??
        record.sortOrder ??
        record.service_step_sequence ??
        record.formula_current_sequence ??
        record.formulaCurrentSequence,
      true
    );

  const syncStatusesForNextStep = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map((entry) => syncStatusesForNextStep(entry));
    if (!value || typeof value !== "object") return value;

    const record = { ...(value as Record<string, unknown>) };
    const step = resolveSyncStep(record);
    const currentStatus = normalizeStatusText(
      record.status ?? record.item_status ?? record.preparation_status ?? record.prep_status ?? record.state
    );

    if (step != null) {
      if (step === normalizedNextStep) {
        if (
          ![
            "served",
            "servi",
            "servie",
            "ready",
            "ready_bar",
            "pret",
            "prete",
            "preparing",
            "in_progress",
            "in progress",
          ].includes(currentStatus)
        ) {
          record.status = "preparing";
        }
      } else if (step > normalizedNextStep) {
        if (!currentStatus || currentStatus === "pending" || currentStatus === "waiting") {
          record.status = "waiting";
        }
      }
    }

    const nestedKeys = [
      "formula_items",
      "formulaItems",
      "selections",
      "selection",
      "formula_selections",
      "formulaSelections",
      "choices",
      "choice",
    ];
    nestedKeys.forEach((key) => {
      if (record[key] != null) record[key] = syncStatusesForNextStep(record[key]);
    });

    if (record.metadata && typeof record.metadata === "object") {
      record.metadata = syncStatusesForNextStep(record.metadata);
    }
    if (record.meta && typeof record.meta === "object") {
      record.meta = syncStatusesForNextStep(record.meta);
    }

    return record;
  };

  if (parsedItems.length === 0) return parsedItems;
  const synced = parsedItems.map((item) => syncStatusesForNextStep(item) as Item);
  false && console.log("TRACE:", {
    context: "admin.syncItemsForNextServiceStepService",
    normalizedNextStep,
    before: parsedItems.map((item) => {
      const record = item as unknown as Record<string, unknown>;
      return {
        order_item_id: String(record.order_item_id ?? record.orderItemId ?? "").trim() || null,
        dish_id: String(record.dish_id ?? record.id ?? "").trim() || null,
        name: String(record.name_fr ?? record.name ?? record.product_name ?? "").trim() || null,
        step:
          normalizeFormulaStepValue(
            record.step ??
              record.sequence ??
              record.step_number ??
              record.sort_order ??
              record.service_step_sequence ??
              record.formula_current_sequence ??
              record.formulaCurrentSequence,
            true
          ) ?? null,
        status: normalizeStatusText(record.status ?? record.item_status ?? record.preparation_status ?? record.prep_status ?? record.state),
      };
    }),
    after: synced.map((item) => {
      const record = item as unknown as Record<string, unknown>;
      return {
        order_item_id: String(record.order_item_id ?? record.orderItemId ?? "").trim() || null,
        dish_id: String(record.dish_id ?? record.id ?? "").trim() || null,
        name: String(record.name_fr ?? record.name ?? record.product_name ?? "").trim() || null,
        step:
          normalizeFormulaStepValue(
            record.step ??
              record.sequence ??
              record.step_number ??
              record.sort_order ??
              record.service_step_sequence ??
              record.formula_current_sequence ??
              record.formulaCurrentSequence,
            true
          ) ?? null,
        status: normalizeStatusText(record.status ?? record.item_status ?? record.preparation_status ?? record.prep_status ?? record.state),
      };
    }),
  });
  return synced;
}

type BuildNextServiceStepNotificationPayloadParams = {
  tableNumber: unknown;
  normalizedNextStep: number;
  orderId: string;
  restaurantId: string;
};

export function buildNextServiceStepNotificationPayload({
  tableNumber,
  normalizedNextStep,
  orderId,
  restaurantId,
}: BuildNextServiceStepNotificationPayloadParams) {
  const tableText = String(tableNumber ?? "").trim();
  const kitchenMessage = `Table ${tableText || "?"} - lancer l'étape ${normalizedNextStep}`;

  return {
    type: "CUISINE",
    status: "pending",
    title: "Service step",
    message: kitchenMessage,
    table_number: tableText || null,
    restaurant_id: restaurantId || null,
    request_type: "next_service_step",
    payload: {
      order_id: orderId,
      table_number: tableText || null,
      step: normalizedNextStep,
      source: "admin_service",
    },
    created_at: new Date().toISOString(),
  };
}
