import { useMemo } from "react";

import type { GroupedTable, Order } from "../bar-caisse-helpers";
import {
  BLOCKING_PAYMENT_STATUSES,
  calcLineTotal,
  formatItemInlineDetails,
  getItemName,
  isItemPaid,
  isPaidOrArchived,
  normalizeStatus,
  orderHasPendingDrinkItems,
  parseItems,
} from "../bar-caisse-helpers";

type UseBarCaisseDerivedDataParams = {
  orders: Order[];
  categoryDestinationById: Record<string, "cuisine" | "bar">;
  dishCategoryIdByDishId: Record<string, string>;
  encaisseModalTable: number | null;
  splitPaymentTable: number | null;
  splitPaymentSelections: Record<string, number>;
};

export function useBarCaisseDerivedData({
  orders,
  categoryDestinationById,
  dishCategoryIdByDishId,
  encaisseModalTable,
  splitPaymentTable,
  splitPaymentSelections,
}: UseBarCaisseDerivedDataParams) {
  const pendingDrinkOrders = useMemo(
    () => orders.filter((order) => orderHasPendingDrinkItems(order, categoryDestinationById, dishCategoryIdByDishId)),
    [orders, categoryDestinationById, dishCategoryIdByDishId]
  );

  const activeOrders = useMemo(() => orders.filter((o) => !isPaidOrArchived(o)), [orders]);

  const tables = useMemo(() => {
    const normalizeCoversValue = (value: unknown): number | null => {
      const n = Number(value);
      if (!Number.isFinite(n)) return null;
      const whole = Math.trunc(n);
      return whole > 0 ? whole : null;
    };
    const grouped = new Map<number, GroupedTable>();
    activeOrders.forEach((order) => {
      const tableNumber = Number(order.table_number);
      if (!Number.isFinite(tableNumber) || tableNumber <= 0) return;
      const orderItems = parseItems(order.items);
      const total = orderItems
        .filter((item) => !isItemPaid(item))
        .reduce((sum, item) => sum + calcLineTotal(item), 0);
      const current = grouped.get(tableNumber) || { tableNumber, total: 0, items: [], orders: [], covers: null };
      const orderCovers =
        normalizeCoversValue(order.covers) ??
        normalizeCoversValue(order.guest_count) ??
        normalizeCoversValue(order.customer_count);
      grouped.set(tableNumber, {
        tableNumber,
        total: current.total + total,
        items: [...current.items, ...orderItems],
        orders: [...current.orders, order],
        covers: current.covers || orderCovers || null,
      });
    });
    return Array.from(grouped.values()).sort((a, b) => a.tableNumber - b.tableNumber);
  }, [activeOrders]);

  const tableHasServiceInProgress = useMemo(() => {
    const map = new Map<number, boolean>();
    activeOrders.forEach((order) => {
      const table = Number(order.table_number);
      if (!Number.isFinite(table) || table <= 0) return;
      const status = normalizeStatus(order.status);
      const blocked = !["served", "servi", "paid", "archived"].includes(status) || BLOCKING_PAYMENT_STATUSES.has(status);
      map.set(table, (map.get(table) || false) || blocked);
    });
    return map;
  }, [activeOrders]);

  const readyForCashTables = useMemo(
    () => tables.filter((t) => !(tableHasServiceInProgress.get(t.tableNumber) || false)),
    [tables, tableHasServiceInProgress]
  );

  const pendingCashTables = useMemo(
    () => tables.filter((t) => tableHasServiceInProgress.get(t.tableNumber) || false),
    [tables, tableHasServiceInProgress]
  );

  const modalTable = useMemo(
    () => tables.find((t) => t.tableNumber === encaisseModalTable) || null,
    [tables, encaisseModalTable]
  );

  const splitModalTable = useMemo(
    () => tables.find((table) => table.tableNumber === splitPaymentTable) || null,
    [tables, splitPaymentTable]
  );

  const splitPaymentRows = useMemo(() => {
    if (!splitModalTable) {
      return [] as Array<{
        key: string;
        orderId: string;
        itemIndex: number;
        itemName: string;
        detailsText: string;
        maxQuantity: number;
        unitPrice: number;
        totalPrice: number;
      }>;
    }

    const rows: Array<{
      key: string;
      orderId: string;
      itemIndex: number;
      itemName: string;
      detailsText: string;
      maxQuantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    splitModalTable.orders.forEach((order) => {
      const orderId = String(order.id || "").trim();
      if (!orderId) return;
      parseItems(order.items).forEach((item, itemIndex) => {
        if (isItemPaid(item)) return;
        const quantity = Math.max(1, Number(item.quantity) || 1);
        const lineTotal = calcLineTotal(item);
        rows.push({
          key: `${orderId}::${itemIndex}`,
          orderId,
          itemIndex,
          itemName: getItemName(item),
          detailsText: formatItemInlineDetails(item),
          maxQuantity: quantity,
          unitPrice: quantity > 0 ? lineTotal / quantity : lineTotal,
          totalPrice: lineTotal,
        });
      });
    });

    return rows;
  }, [splitModalTable]);

  const splitPaymentTotal = useMemo(() => {
    return splitPaymentRows.reduce((sum, row) => {
      const selectedQuantity = Math.max(0, Math.min(row.maxQuantity, Number(splitPaymentSelections[row.key] || 0)));
      return sum + selectedQuantity * row.unitPrice;
    }, 0);
  }, [splitPaymentRows, splitPaymentSelections]);

  const tableHasUnpaidItems = useMemo(() => {
    const map = new Map<number, boolean>();
    tables.forEach((table) => {
      const hasUnpaid = table.orders.some((order) => parseItems(order.items).some((item) => !isItemPaid(item)));
      map.set(table.tableNumber, hasUnpaid);
    });
    return map;
  }, [tables]);

  return {
    pendingDrinkOrders,
    activeOrders,
    tables,
    tableHasServiceInProgress,
    readyForCashTables,
    pendingCashTables,
    modalTable,
    splitModalTable,
    splitPaymentRows,
    splitPaymentTotal,
    tableHasUnpaidItems,
  };
}
