import { useEffect, useState } from "react";

import type { GroupedTable, OrderItem, PaidTableHistoryEntry, PaymentMethodLabel } from "../bar-caisse-helpers";
import { PAID_TABLE_HISTORY_STORAGE_KEY, PAID_TABLE_HISTORY_TTL_MS } from "../bar-caisse-helpers";

export function usePaidTablesHistory() {
  const [paidTablesHistory, setPaidTablesHistory] = useState<PaidTableHistoryEntry[]>([]);

  const prunePaidTableHistoryEntries = (entries: PaidTableHistoryEntry[]) => {
    const nowTs = Date.now();
    return entries
      .filter((entry) => {
        const ts = Date.parse(String(entry.closedAt || ""));
        return Number.isFinite(ts) && nowTs - ts <= PAID_TABLE_HISTORY_TTL_MS;
      })
      .sort((a, b) => Date.parse(String(b.closedAt || "")) - Date.parse(String(a.closedAt || "")));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(PAID_TABLE_HISTORY_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const safeEntries = Array.isArray(parsed)
        ? parsed
            .filter((row) => row && typeof row === "object")
            .map((row) => row as PaidTableHistoryEntry)
        : [];
      const pruned = prunePaidTableHistoryEntries(safeEntries);
      setPaidTablesHistory(pruned);
      window.localStorage.setItem(PAID_TABLE_HISTORY_STORAGE_KEY, JSON.stringify(pruned));
    } catch (error) {
      console.warn("Historique caisse local illisible:", error);
      setPaidTablesHistory([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const pruned = prunePaidTableHistoryEntries(paidTablesHistory);
      window.localStorage.setItem(PAID_TABLE_HISTORY_STORAGE_KEY, JSON.stringify(pruned));
    } catch (error) {
      console.warn("Sauvegarde historique caisse local impossible:", error);
    }
  }, [paidTablesHistory]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const interval = window.setInterval(() => {
      setPaidTablesHistory((prev) => prunePaidTableHistoryEntries(prev));
    }, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  const appendPaidTableToHistory = (
    table: GroupedTable,
    closedAtIso: string,
    paymentMethod: PaymentMethodLabel,
    tipAmount = 0
  ) => {
    const entry: PaidTableHistoryEntry = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `paid-${table.tableNumber}-${Date.now()}`,
      tableNumber: Number(table.tableNumber),
      covers: Number(table.covers || 0) > 0 ? Number(table.covers || 0) : null,
      total: Number(table.total || 0),
      tipAmount,
      closedAt: closedAtIso,
      paymentMethod,
      items: Array.isArray(table.items) ? table.items : [],
    };
    setPaidTablesHistory((prev) => prunePaidTableHistoryEntries([entry, ...prev]));
  };

  const appendPartialPaymentToHistory = (
    tableNumber: number,
    covers: number | null | undefined,
    total: number,
    items: OrderItem[],
    closedAtIso: string,
    paymentMethod: PaymentMethodLabel,
    tipAmount = 0
  ) => {
    const entry: PaidTableHistoryEntry = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `split-${tableNumber}-${Date.now()}`,
      tableNumber: Number(tableNumber),
      covers: Number(covers || 0) > 0 ? Number(covers || 0) : null,
      total: Number(total || 0),
      tipAmount,
      closedAt: closedAtIso,
      paymentMethod,
      items: Array.isArray(items) ? items : [],
    };
    setPaidTablesHistory((prev) => prunePaidTableHistoryEntries([entry, ...prev]));
  };

  return {
    paidTablesHistory,
    setPaidTablesHistory,
    appendPaidTableToHistory,
    appendPartialPaymentToHistory,
  };
}
