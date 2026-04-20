import type { FastOrderLine } from "../types";

export function shouldSkipFastAddAction(
  lastRef: { current: { key: string; at: number } | null },
  signature: string
) {
  const now = Date.now();
  const last = lastRef.current;
  if (last && last.key === signature && now - last.at < 400) return true;
  lastRef.current = { key: signature, at: now };
  return false;
}

export function removeFastLineById(lines: FastOrderLine[], lineId: string) {
  return lines.filter((line) => line.lineId !== lineId);
}

export function updateFastLineComment(lines: FastOrderLine[], lineId: string, comment: string) {
  return lines.map((line) => (line.lineId === lineId ? { ...line, specialRequest: comment } : line));
}
