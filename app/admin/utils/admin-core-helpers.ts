import type { ServiceNotification, TableAssignment } from "../types";

export function toErrorInfo(error: unknown) {
  if (!error || typeof error !== "object") {
    return { code: null, status: null, message: String(error || "unknown"), details: null, hint: null };
  }
  const raw = error as Record<string, unknown>;
  return {
    code: raw.code ?? null,
    status: raw.status ?? null,
    message: raw.message ?? null,
    details: raw.details ?? null,
    hint: raw.hint ?? null,
  };
}

export function hasUsefulError(info: ReturnType<typeof toErrorInfo>) {
  return ["code", "status", "message", "details", "hint"].some((key) => {
    const value = info[key as keyof typeof info];
    if (value == null) return false;
    const text = String(value).trim().toLowerCase();
    return text !== "" && text !== "{}" && text !== "unknown" && text !== "null" && text !== "[object object]";
  });
}

export function logFetchOrdersError(label: string, error: unknown) {
  false && console.error("TRACE_SQL_TOTAL:", error);
  console.error(label, error);
}

export function normalizeNotificationRow(row: Record<string, unknown>): ServiceNotification {
  return {
    id: String(row.id || ""),
    type: row.type != null ? String(row.type) : null,
    title: row.title != null ? String(row.title) : null,
    message: row.message != null ? String(row.message) : null,
    status: row.status != null ? String(row.status) : null,
    table_number: row.table_number != null ? String(row.table_number) : null,
    restaurant_id: row.restaurant_id != null ? String(row.restaurant_id) : null,
    created_at: row.created_at != null ? String(row.created_at) : null,
    payload: row.payload ?? null,
    request_type: row.request_type != null ? String(row.request_type) : null,
    request_key: row.request_key != null ? String(row.request_key) : null,
  };
}

export function isKitchenOnlyNotification(row: Record<string, unknown> | ServiceNotification | null | undefined) {
  if (!row || typeof row !== "object") return false;
  const requestType = String((row as { request_type?: unknown }).request_type || "").trim().toLowerCase();
  if (requestType === "next_service_step") return true;
  const payload = (row as { payload?: unknown }).payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const source = String((payload as { source?: unknown }).source || "").trim().toLowerCase();
  return source === "admin_service";
}

export function normalizeCoversValue(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const whole = Math.trunc(n);
  return whole > 0 ? whole : null;
}

export function readCoversFromRow(row: Record<string, unknown> | null | undefined): number | null {
  if (!row) return null;
  return normalizeCoversValue(row.covers) ?? normalizeCoversValue(row.guest_count) ?? normalizeCoversValue(row.customer_count) ?? null;
}

export function isActiveTableSession(row: TableAssignment | null | undefined) {
  if (!row) return false;
  const pin = String(row.pin_code || "").trim();
  const status = String(row.status || "").toLowerCase().trim();
  const paymentStatus = String(row.payment_status || "").toLowerCase().trim();
  const occupiedFlag = row.occupied;
  if (occupiedFlag === false) return false;
  if (status && ["free", "libre", "available", "disponible", "closed", "paid", "archived"].includes(status)) return false;
  if (paymentStatus && ["paid", "paye", "payee"].includes(paymentStatus)) return false;
  if (!pin || pin === "0000") return false;
  return true;
}
