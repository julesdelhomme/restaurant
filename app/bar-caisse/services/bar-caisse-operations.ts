import type { GroupedTable, Order, OrderItem, PaidTableHistoryEntry, PaymentMethodLabel } from "../bar-caisse-helpers";
import { BLOCKING_PAYMENT_STATUSES, hasUsefulError, isItemPaid, isMissingColumnOrCacheError, isMissingRelationError, normalizeStatus, parseItems, parsePriceNumber, roundCurrency, setItemPaymentStatus, toErrorInfo } from "../bar-caisse-helpers";

type SupabaseClientLike = any;

export async function insertPaymentTransaction(params: {
  supabase: SupabaseClientLike;
  restaurantId: string | number | null;
  settingsRowId: string;
  tableNumber: number;
  paidAtIso: string;
  totalAmount: number;
  tipAmount: number;
  paymentMethod: PaymentMethodLabel;
  orderIds?: string[];
  isSplit: boolean;
  itemsCount?: number;
}) {
  const {
    supabase,
    restaurantId,
    settingsRowId,
    tableNumber,
    paidAtIso,
    totalAmount,
    tipAmount,
    paymentMethod,
    orderIds = [],
    isSplit,
    itemsCount = 0,
  } = params;

  const safeOrderIds = Array.from(new Set((orderIds || []).map((id) => String(id || "").trim()).filter(Boolean)));
  const firstOrderId = safeOrderIds[0] || null;
  const metadata = {
    source: "bar_caisse",
    payment_scope: isSplit ? "split" : "full",
    order_ids: safeOrderIds,
    items_count: Math.max(0, Math.trunc(Number(itemsCount || 0))),
  };
  const total = roundCurrency(totalAmount);
  const tip = roundCurrency(tipAmount);
  const basePayloads: Array<Record<string, unknown>> = [
    {
      restaurant_id: restaurantId ?? settingsRowId,
      table_number: tableNumber,
      order_id: firstOrderId,
      order_ids: safeOrderIds,
      total_amount: total,
      total_ttc: total,
      amount: total,
      tip_amount: tip,
      tips: tip,
      payment_method: paymentMethod,
      payment_type: paymentMethod,
      method: paymentMethod,
      is_split: isSplit,
      split_payment: isSplit,
      status: "paid",
      paid_at: paidAtIso,
      created_at: paidAtIso,
      metadata,
    },
    {
      restaurant_id: restaurantId ?? settingsRowId,
      table_number: tableNumber,
      order_id: firstOrderId,
      amount: total,
      tip_amount: tip,
      payment_method: paymentMethod,
      is_split: isSplit,
      paid_at: paidAtIso,
      created_at: paidAtIso,
    },
    {
      restaurant_id: restaurantId ?? settingsRowId,
      table_number: tableNumber,
      amount: total,
      tip_amount: tip,
      payment_method: paymentMethod,
      created_at: paidAtIso,
    },
    {
      table_number: tableNumber,
      amount: total,
      tip_amount: tip,
      created_at: paidAtIso,
    },
  ];
  const tablesToTry = ["payment_history", "transactions"];
  for (const tableName of tablesToTry) {
    for (const payload of basePayloads) {
      const insertTry = await supabase.from(tableName).insert([payload as never]);
      if (!insertTry.error) return true;
      if (isMissingColumnOrCacheError(insertTry.error)) continue;
      if (isMissingRelationError(insertTry.error)) break;
      console.warn(`Insertion ${tableName} impossible:`, toErrorInfo(insertTry.error));
      break;
    }
  }
  return false;
}

export async function restorePaidTable(params: {
  supabase: SupabaseClientLike;
  entry: PaidTableHistoryEntry;
  restaurantId: string | number | null;
  settingsRowId: string;
}) {
  const { supabase, entry, restaurantId, settingsRowId } = params;
  const targetRestaurantId = String(restaurantId ?? settingsRowId ?? "").trim();
  const authUserId = String((await supabase.auth.getUser())?.data?.user?.id || "").trim();
  if (!authUserId) {
    return { ok: false as const, errorMessage: "Session invalide (staff_id manquant)." };
  }
  const withScope = (payload: Record<string, unknown>) => ({
    ...payload,
    restaurant_id: targetRestaurantId,
    ...(authUserId ? { staff_id: authUserId } : {}),
  });

  const tableNumber = Number(entry.tableNumber);
  if (!Number.isFinite(tableNumber) || tableNumber <= 0) {
    return { ok: false as const, errorMessage: "Historique invalide (table)." };
  }

  const items = (Array.isArray(entry.items) ? entry.items : []).map((item) =>
    setItemPaymentStatus({ ...item, quantity: Math.max(1, Number(item.quantity) || 1) }, "unpaid")
  );
  if (items.length === 0) {
    return { ok: false as const, errorMessage: "Historique invalide (aucun article)." };
  }

  const covers = (() => {
    const n = Number(entry.covers || 0);
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
  })();

  const orderPayloadCandidates = [
    {
      restaurant_id: restaurantId ?? settingsRowId,
      table_number: tableNumber,
      covers,
      guest_count: covers,
      customer_count: covers,
      items,
      total_price: Number(entry.total || 0),
      status: "served",
      service_step: "entree",
    },
    {
      restaurant_id: restaurantId ?? settingsRowId,
      table_number: tableNumber,
      covers,
      guest_count: covers,
      items,
      total_price: Number(entry.total || 0),
      status: "served",
      service_step: "entree",
    },
    {
      restaurant_id: restaurantId ?? settingsRowId,
      table_number: tableNumber,
      covers,
      items,
      total_price: Number(entry.total || 0),
      status: "served",
      service_step: "entree",
    },
    {
      restaurant_id: restaurantId ?? settingsRowId,
      table_number: tableNumber,
      items,
      total_price: Number(entry.total || 0),
      status: "served",
      service_step: "entree",
    },
  ];

  let orderInsertError: unknown = null;
  for (const payload of orderPayloadCandidates) {
    const result = await supabase.from("orders").insert([payload]);
    if (!result.error) {
      orderInsertError = null;
      break;
    }
    orderInsertError = result.error;
    const info = toErrorInfo(result.error);
    const missingColumn =
      String(info.code || "") === "42703" ||
      String(info.message || "").toLowerCase().includes("column") ||
      String(info.message || "").toLowerCase().includes("schema cache");
    if (!missingColumn) break;
  }

  if (orderInsertError) {
    console.error("Erreur restauration historique (orders):", toErrorInfo(orderInsertError));
    return { ok: false as const, errorMessage: "Impossible de restaurer la table." };
  }

  const assignmentPayloads = covers
    ? [
        withScope({ table_number: tableNumber, pin_code: "RESTAURE", covers, guest_count: covers, customer_count: covers }),
        withScope({ table_number: tableNumber, pin_code: "RESTAURE", covers, guest_count: covers }),
        withScope({ table_number: tableNumber, pin_code: "RESTAURE", covers }),
        withScope({ table_number: tableNumber, pin_code: "RESTAURE", guest_count: covers }),
        withScope({ table_number: tableNumber, pin_code: "RESTAURE", customer_count: covers }),
        withScope({ table_number: tableNumber, pin_code: "RESTAURE" }),
      ]
    : [withScope({ table_number: tableNumber, pin_code: "RESTAURE" })];
  for (const payload of assignmentPayloads) {
    const res = await supabase.from("table_assignments").upsert([payload], { onConflict: "table_number" });
    if (!res.error) break;
    const info = toErrorInfo(res.error);
    const missingColumn =
      String(info.code || "") === "42703" ||
      String(info.message || "").toLowerCase().includes("column") ||
      String(info.message || "").toLowerCase().includes("schema cache");
    if (!missingColumn) {
      if (hasUsefulError(info)) {
        console.warn("Restauration table_assignments non confirmee:", info);
      }
      break;
    }
  }

  return { ok: true as const, tableNumber };
}

export async function markTablePaid(params: {
  supabase: SupabaseClientLike;
  orders: Order[];
  tableNumber: number;
  tipAmountRaw: unknown;
}) {
  const { supabase, orders, tableNumber, tipAmountRaw } = params;

  const isMissingColumnError = (error: unknown) => {
    const info = toErrorInfo(error);
    return String(info.code || "").trim() === "42703" || String(info.message || "").toLowerCase().includes("column");
  };

  const hasServiceInProgress = orders.some((order) => {
    if (Number(order.table_number) !== Number(tableNumber)) return false;
    const status = normalizeStatus(order.status);
    return !["served", "servi", "paid", "archived"].includes(status) || BLOCKING_PAYMENT_STATUSES.has(status);
  });
  if (hasServiceInProgress) {
    return { ok: false as const, blocked: true as const };
  }

  const tableOrders = orders.filter((order) => Number(order.table_number) === Number(tableNumber));
  for (const order of tableOrders) {
    const nextItems = parseItems(order.items).map((item) => {
      const quantity = Math.max(1, Number(item.quantity) || 1);
      return setItemPaymentStatus({ ...item, quantity }, "paid");
    });
    const { error: itemUpdateError } = await supabase
      .from("orders")
      .update({ items: nextItems })
      .eq("id", order.id);
    if (itemUpdateError) {
      console.error("Erreur mise a jour payment_status des lignes:", toErrorInfo(itemUpdateError));
      return { ok: false as const, blocked: false as const };
    }
  }

  const updatedOrders = orders.map((order) => {
    if (Number(order.table_number) !== Number(tableNumber)) return order;
    const nextItems = parseItems(order.items).map((item) => {
      const quantity = Math.max(1, Number(item.quantity) || 1);
      return setItemPaymentStatus({ ...item, quantity }, "paid");
    });
    return { ...order, items: nextItems };
  });

  const paidAt = new Date().toISOString();
  const tipAmount = parsePriceNumber(tipAmountRaw);
  let ordersError: unknown = null;
  const updatePayloadCandidates: Array<Record<string, unknown>> = [
    { status: "paid", closed_at: paidAt, paid_at: paidAt, updated_at: paidAt, tip_amount: tipAmount },
    { status: "paid", closed_at: paidAt, paid_at: paidAt, updated_at: paidAt, tips: tipAmount },
    { status: "paid", paid_at: paidAt, updated_at: paidAt, tip_amount: tipAmount },
    { status: "paid", paid_at: paidAt, updated_at: paidAt, tips: tipAmount },
    { status: "paid", updated_at: paidAt, tip_amount: tipAmount },
    { status: "paid", updated_at: paidAt, tips: tipAmount },
    { status: "paid", tip_amount: tipAmount },
    { status: "paid", tips: tipAmount },
    { status: "paid" },
  ];
  for (const payload of updatePayloadCandidates) {
    const tryUpdate = await supabase
      .from("orders")
      .update(payload)
      .eq("table_number", tableNumber)
      .neq("status", "paid")
      .neq("status", "archived");
    ordersError = tryUpdate.error;
    if (!ordersError) break;
    if (!isMissingColumnError(ordersError)) break;
  }

  if (ordersError) {
    console.error("Erreur encaissement orders:", toErrorInfo(ordersError));
    return { ok: false as const, blocked: false as const };
  }

  let warning: string | null = null;
  const resetDelete = await supabase.from("table_assignments").delete().eq("table_number", tableNumber);
  if (resetDelete.error) {
    const info = toErrorInfo(resetDelete.error);
    if (hasUsefulError(info)) {
      console.error("Erreur liberation table apres encaissement:", info);
      warning = "Encaissement valide, mais liberation table non confirmee.";
    }
  }

  return {
    ok: true as const,
    blocked: false as const,
    updatedOrders,
    warning,
  };
}

export async function processSplitPayment(params: {
  supabase: SupabaseClientLike;
  orders: Order[];
  splitModalTable: GroupedTable;
  splitPaymentRows: Array<{
    key: string;
    orderId: string;
    itemIndex: number;
    itemName: string;
    detailsText: string;
    maxQuantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  splitPaymentSelections: Record<string, number>;
  splitTipAmountInput: string;
  splitPaymentTotal: number;
  isMissingColumnOrCacheError: (error: unknown) => boolean;
}) {
  const {
    supabase,
    orders,
    splitModalTable,
    splitPaymentRows,
    splitPaymentSelections,
    splitTipAmountInput,
    splitPaymentTotal,
    isMissingColumnOrCacheError,
  } = params;

  const selectedRows = splitPaymentRows.filter((row) => {
    const quantity = Math.max(0, Math.min(row.maxQuantity, Number(splitPaymentSelections[row.key] || 0)));
    return quantity > 0;
  });
  if (selectedRows.length === 0) {
    return { ok: false as const, errorMessage: "Selectionnez au moins un article a encaisser." };
  }

  const paidAtIso = new Date().toISOString();
  const splitTipAmount = parsePriceNumber(splitTipAmountInput);
  const selectedAmountByOrder = new Map<string, number>();
  selectedRows.forEach((row) => {
    const selectedQuantity = Math.max(0, Math.min(row.maxQuantity, Number(splitPaymentSelections[row.key] || 0)));
    const lineAmount = roundCurrency(selectedQuantity * row.unitPrice);
    selectedAmountByOrder.set(row.orderId, roundCurrency((selectedAmountByOrder.get(row.orderId) || 0) + lineAmount));
  });

  const paidSelectionItems: OrderItem[] = [];
  const nextItemsByOrderId = new Map<string, OrderItem[]>();
  const targetOrderIds = Array.from(new Set(selectedRows.map((row) => row.orderId)));
  let remainingTipToAllocate = splitTipAmount;

  for (const orderId of targetOrderIds) {
    const sourceOrder = orders.find((order) => String(order.id || "").trim() === orderId);
    if (!sourceOrder) continue;
    const sourceItems = parseItems(sourceOrder.items);
    const nextItems: OrderItem[] = [];
    sourceItems.forEach((item, itemIndex) => {
      const itemQuantity = Math.max(1, Number(item.quantity) || 1);
      const selectionKey = `${orderId}::${itemIndex}`;
      const selectedQuantity = Math.max(
        0,
        Math.min(itemQuantity, Number(splitPaymentSelections[selectionKey] || 0))
      );
      if (selectedQuantity <= 0 || isItemPaid(item)) {
        nextItems.push(item);
        return;
      }
      if (selectedQuantity >= itemQuantity) {
        paidSelectionItems.push(setItemPaymentStatus({ ...item, quantity: itemQuantity }, "paid"));
        nextItems.push(setItemPaymentStatus({ ...item, quantity: itemQuantity }, "paid"));
        return;
      }
      paidSelectionItems.push(setItemPaymentStatus({ ...item, quantity: selectedQuantity }, "paid"));
      nextItems.push(
        setItemPaymentStatus({ ...item, quantity: itemQuantity - selectedQuantity }, "unpaid")
      );
      nextItems.push(setItemPaymentStatus({ ...item, quantity: selectedQuantity }, "paid"));
    });

    const orderIndex = targetOrderIds.indexOf(orderId);
    const orderAmount = roundCurrency(selectedAmountByOrder.get(orderId) || 0);
    const orderTipShare =
      splitTipAmount <= 0
        ? 0
        : orderIndex === targetOrderIds.length - 1
          ? remainingTipToAllocate
          : roundCurrency((orderAmount / Math.max(splitPaymentTotal, 0.01)) * splitTipAmount);
    remainingTipToAllocate = roundCurrency(remainingTipToAllocate - orderTipShare);
    const existingOrderTip = parsePriceNumber(sourceOrder.tip_amount ?? sourceOrder.tips);
    const nextOrderTip = roundCurrency(existingOrderTip + orderTipShare);
    const updatePayloads: Array<Record<string, unknown>> = [
      { items: nextItems, updated_at: paidAtIso, tip_amount: nextOrderTip, tips: nextOrderTip },
      { items: nextItems, updated_at: paidAtIso, tip_amount: nextOrderTip },
      { items: nextItems, updated_at: paidAtIso, tips: nextOrderTip },
      { items: nextItems, updated_at: paidAtIso },
    ];
    let updateError: unknown = null;
    for (const payload of updatePayloads) {
      const updateTry = await supabase.from("orders").update(payload).eq("id", sourceOrder.id);
      updateError = updateTry.error;
      if (!updateError) break;
      if (!isMissingColumnOrCacheError(updateError)) break;
    }
    if (updateError) {
      throw new Error(toErrorInfo(updateError).message || "Erreur lors de l'encaissement partiel.");
    }
    nextItemsByOrderId.set(orderId, nextItems);
  }

  const updatedOrders =
    nextItemsByOrderId.size > 0
      ? orders.map((order) => {
          const key = String(order.id || "").trim();
          const nextItems = nextItemsByOrderId.get(key);
          if (!nextItems) return order;
          return { ...order, items: nextItems };
        })
      : orders;

  const ticketOrderId = targetOrderIds.length > 0 ? targetOrderIds[targetOrderIds.length - 1] : null;

  return {
    ok: true as const,
    paidAtIso,
    splitTipAmount,
    paidSelectionItems,
    targetOrderIds,
    ticketOrderId,
    updatedOrders,
    tableNumber: splitModalTable.tableNumber,
    tableCovers: splitModalTable.covers ?? null,
  };
}
