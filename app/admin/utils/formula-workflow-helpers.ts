import { normalizeLookupText } from "./page-helpers";

export const SERVICE_STEP_SEQUENCE = ["entree", "plat", "dessert"] as const;
export const SERVICE_STEP_LABELS: Record<string, string> = {
  entree: "ENTRÉE",
  plat: "PLAT",
  dessert: "DESSERT",
};

export function normalizeFormulaStepValue(value: unknown, allowZero = false) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return null;
  const truncated = Math.trunc(raw);
  if (allowZero && truncated === 0) return 0;
  if (truncated <= 0) return null;
  return Math.max(1, truncated);
}

export function isDirectFormulaSequence(value: unknown, directSequenceThreshold: number) {
  const asText = normalizeLookupText(value);
  if (asText.includes("direct")) return true;
  const raw = Number(value);
  if (!Number.isFinite(raw)) return false;
  const sequence = Math.trunc(raw);
  if (sequence === 0) return true;
  if (sequence < 0) return false;
  return Math.max(1, sequence) >= directSequenceThreshold;
}

export function resolveInitialFormulaItemStatus(
  sequence: number | null,
  directSequenceThreshold: number,
  sortOrder?: unknown
) {
  if (isDirectFormulaSequence(sequence, directSequenceThreshold)) return "pending";
  const normalizedSort = Number(sortOrder);
  if (Number.isFinite(normalizedSort) && Math.trunc(normalizedSort) === 0) return "preparing";
  if (sequence != null && sequence <= 1) return "preparing";
  if (sequence != null && sequence > 1) return "pending";
  return "pending";
}

export function mapSequenceToOrderStep(value: unknown, directSequenceThreshold: number) {
  const sequence = normalizeFormulaStepValue(value, true);
  if (sequence == null) return null;
  if (isDirectFormulaSequence(sequence, directSequenceThreshold)) return 0;
  if (sequence <= 1) return 1;
  if (sequence === 2) return 2;
  return 3;
}

export function normalizeCategoryKey(value: unknown) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (normalized.length > 3 && normalized.endsWith("s")) return normalized.slice(0, -1);
  return normalized;
}

export function normalizeServiceStep(value: unknown) {
  const normalized = normalizeCategoryKey(value);
  if (["entree", "starter", "appetizer"].includes(normalized)) return "entree";
  if (["dessert", "sweet"].includes(normalized)) return "dessert";
  if (["plat", "main", "dish", "principal"].includes(normalized)) return "plat";
  return "";
}

export function resolveCourseFromCategoryLabel(value: unknown) {
  const normalized = normalizeCategoryKey(value);
  if (/entree|starter|appetizer/.test(normalized)) return "entree";
  if (/dessert|sucre|sweet/.test(normalized)) return "dessert";
  if (/plat|main|dish|principal/.test(normalized)) return "plat";
  return "plat";
}

export function resolveCourseFromSequence(value: unknown) {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw <= 0) return "";
  const sequence = Math.max(1, Math.trunc(raw));
  if (sequence === 1) return "entree";
  if (sequence >= 3) return "dessert";
  return "plat";
}

export function parseFormulaEntryList(value: unknown): Array<Record<string, unknown>> {
  let source = value;
  if (typeof source === "string") {
    const raw = source.trim();
    if (!raw) return [];
    try {
      source = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (Array.isArray(source)) {
    return source.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object");
  }
  if (source && typeof source === "object") return [source as Record<string, unknown>];
  return [];
}
