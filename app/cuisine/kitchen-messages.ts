import type { KitchenMessage } from "./types";

export const normalizeKitchenMessageRow = (row: Record<string, unknown>): KitchenMessage => ({
  id: String(row.id || "").trim(),
  restaurant_id: (row.restaurant_id ?? null) as string | number | null,
  message: String(row.message ?? "").trim() || null,
  content: String(row.content ?? "").trim() || null,
  note: String(row.note ?? "").trim() || null,
  sender_name: String(row.sender_name ?? "").trim() || null,
  is_active: typeof row.is_active === "boolean" ? row.is_active : true,
  created_at: String(row.created_at ?? "").trim() || null,
});

export const extractKitchenMessageText = (row: KitchenMessage) =>
  String(row.message || row.content || row.note || "").trim();

export const formatKitchenMessageAge = (value: string | null | undefined) => {
  const input = String(value || "").trim();
  if (!input) return "à l'instant";
  const date = new Date(input);
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "à l'instant";
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes <= 0) return "à l'instant";
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `il y a ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `il y a ${diffDays} j`;
};
