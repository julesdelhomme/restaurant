import type { Item } from "../utils/order-items";

type FastOrderPayload = {
  restaurant_id: string;
  table_number: number;
  covers: number;
  guest_count: number;
  customer_count: number;
  items: Item[];
  total_price: number;
  status: "pending";
  service_step: string;
  current_step: number;
};

type RunHandleSubmitFastOrderServiceParams = {
  selectedFastTableNumber: string;
  fastCoversInput: string;
  fastLinesLength: number;
  fastOrderText: {
    tableInvalid: string;
    addItem: string;
    noValidItem: string;
    sendError: string;
    sent: string;
  };
  normalizeCoversValue: (value: unknown) => number | null;
  setFastMessage: (message: string) => void;
  buildItems: (tableNumber: number) => Item[];
  normalizeFormulaItemsForOrderPayload: (items: Array<Record<string, unknown>>) => Array<Record<string, unknown>>;
  resolveInitialCurrentStepFromItems: (items: Array<Record<string, unknown>>) => number;
  synchronizeCurrentStepPreparingService: (params: {
    items: Array<Record<string, unknown>>;
    currentStep: number;
    normalizeFormulaStepValue: (value: unknown, strict?: boolean) => number | null;
  }) => Array<Record<string, unknown>>;
  normalizeFormulaStepValue: (value: unknown, strict?: boolean) => number | null;
  parsePriceNumber: (value: unknown) => number;
  resolveLegacyServiceStepFromCurrentStep: (currentStep: number) => string;
  restaurantId: string;
  scopedRestaurantId: string;
  setFastLoading: (value: boolean) => void;
  insertOrder: (
    payload: FastOrderPayload,
    forcedOrderId: string
  ) => Promise<{ message?: string; code?: string; details?: string; hint?: string } | null>;
  ensureTableIsOrderableForServer: (tableNumber: number, covers?: number | null) => Promise<unknown>;
  resetFastEntryForm: () => void;
  fetchOrders: () => void;
  fetchActiveTables: () => void;
};

export async function runHandleSubmitFastOrderService({
  selectedFastTableNumber,
  fastCoversInput,
  fastLinesLength,
  fastOrderText,
  normalizeCoversValue,
  setFastMessage,
  buildItems,
  normalizeFormulaItemsForOrderPayload,
  resolveInitialCurrentStepFromItems,
  synchronizeCurrentStepPreparingService,
  normalizeFormulaStepValue,
  parsePriceNumber,
  resolveLegacyServiceStepFromCurrentStep,
  restaurantId,
  scopedRestaurantId,
  setFastLoading,
  insertOrder,
  ensureTableIsOrderableForServer,
  resetFastEntryForm,
  fetchOrders,
  fetchActiveTables,
}: RunHandleSubmitFastOrderServiceParams) {
  const tableNumber = Number(String(selectedFastTableNumber || "").trim());
  const enteredCovers = normalizeCoversValue(fastCoversInput);

  if (!Number.isFinite(tableNumber) || tableNumber <= 0) {
    setFastMessage(fastOrderText.tableInvalid);
    return;
  }
  if (!enteredCovers) {
    setFastMessage("Nombre de couverts invalide.");
    return;
  }
  if (fastLinesLength === 0) {
    setFastMessage(fastOrderText.addItem);
    return;
  }

  const items = buildItems(tableNumber);
  if (items.length === 0) {
    setFastMessage(fastOrderText.noValidItem);
    return;
  }

  const normalizedItems = normalizeFormulaItemsForOrderPayload(
    items as Array<Record<string, unknown>>
  ) as Item[];
  normalizedItems.forEach((item) => {
    if ((item as Record<string, unknown>).formula_dish_id || (item as Record<string, unknown>).is_formula) {
      false && console.log("TRACE FORMULE:", item);
    }
  });

  const currentStep = resolveInitialCurrentStepFromItems(
    normalizedItems as Array<Record<string, unknown>>
  );
  const synchronizedItems = synchronizeCurrentStepPreparingService({
    items: normalizedItems as Array<Record<string, unknown>>,
    currentStep,
    normalizeFormulaStepValue,
  }) as Item[];

  const totalPrice = Number(
    synchronizedItems
      .reduce(
        (sum, item) =>
          sum + parsePriceNumber((item as Record<string, unknown>).price) * Math.max(1, Number(item.quantity || 1)),
        0
      )
      .toFixed(2)
  );

  const resolvedRestaurantId = String(restaurantId || scopedRestaurantId || "").trim();
  if (!resolvedRestaurantId) {
    setFastMessage("ID restaurant manquant dans l'URL.");
    return;
  }

  const sessionCovers = enteredCovers;
  const payload: FastOrderPayload = {
    restaurant_id: resolvedRestaurantId,
    table_number: tableNumber,
    covers: sessionCovers,
    guest_count: sessionCovers,
    customer_count: sessionCovers,
    items: synchronizedItems,
    total_price: totalPrice,
    status: "pending",
    service_step: resolveLegacyServiceStepFromCurrentStep(currentStep || 1),
    current_step: currentStep > 0 ? currentStep : 1,
  };

  const payloadWithoutId = [{
    restaurant_id: payload.restaurant_id,
    table_number: payload.table_number,
    covers: payload.covers,
    guest_count: payload.guest_count,
    customer_count: payload.customer_count,
    items: synchronizedItems,
    total_price: payload.total_price,
    status: "pending",
    service_step: payload.service_step,
    current_step: payload.current_step,
  }];
  const forcedOrderId = crypto.randomUUID();

  setFastLoading(true);
  console.log("Données envoyées à Supabase:", payload);
  console.log("CONTENU EXACT DU PAYLOAD ENVOYÉ:", payloadWithoutId);
  const insertError = await insertOrder(payload, forcedOrderId);
  setFastLoading(false);

  if (insertError) {
    console.error("DÉTAIL ERREUR SQL:", insertError.message, {
      code: insertError.code,
      details: insertError.details,
      hint: insertError.hint,
      restaurant_id: restaurantId,
      table_number: payload.table_number,
      items_count: items.length,
      total_price: payload.total_price,
      status: payload.status,
    });
    setFastMessage(fastOrderText.sendError);
    resetFastEntryForm();
    return;
  }

  const activationError = await ensureTableIsOrderableForServer(tableNumber, sessionCovers);
  if (activationError) {
    console.warn("Activation table serveur impossible après envoi commande:", activationError);
  }

  resetFastEntryForm();
  setFastMessage(fastOrderText.sent);
  fetchOrders();
  fetchActiveTables();
}
