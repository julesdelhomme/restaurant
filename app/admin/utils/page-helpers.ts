import type { ParsedDishOptions, ProductOptionChoice } from "../types";

const MAX_TOTAL_TABLES = 200;
const CLIENT_ORDERING_DISABLED_KEY = "menuqr_disable_client_ordering_tmp";
const MOJIBAKE_MARKERS = /(?:ÃƒÆ’.|Ãƒâ€š.|ÃƒÂ¢[\u0080-\u00BF]|ÃƒÂ°Ã…Â¸|Ã¯Â¿Â½)/;

export const COOKING_CHOICES = ["Bleu", "Saignant", "\u00C0 point", "Bien cuit"];
export const FORMULAS_CATEGORY_KEY = "__formulas__";
export const FORMULA_DIRECT_SEND_SEQUENCE = 4;

export const FAST_ORDER_I18N = {
  fr: {
    tableInvalid: "Num\u00E9ro de table invalide.",
    addItem: "Ajoutez au moins un article.",
    noValidItem: "Aucun article valide \u00E0 envoyer.",
    sendError: "Erreur lors de l'envoi.",
    sent: "Service envoy\u00E9",
  },
  en: {
    tableInvalid: "Invalid table number.",
    addItem: "Add at least one item.",
    noValidItem: "Aucun article valide \u00E0 envoyer.",
    sendError: "Error while sending the order.",
    sent: "Service envoy\u00E9",
  },
  es: {
    tableInvalid: "NÃƒÆ’Ã‚Âºmero de mesa invÃƒÆ’Ã‚Â¡lido.",
    addItem: "AÃƒÆ’Ã‚Â±ada al menos un artÃƒÆ’Ã‚Â­culo.",
    noValidItem: "Aucun article valide \u00E0 envoyer.",
    sendError: "Error al enviar el pedido.",
    sent: "Service envoy\u00E9",
  },
  de: {
    tableInvalid: "UngÃƒÆ’Ã‚Â¼ltige Tischnummer.",
    addItem: "FÃƒÆ’Ã‚Â¼gen Sie mindestens einen Artikel hinzu.",
    noValidItem: "Aucun article valide \u00E0 envoyer.",
    sendError: "Fehler beim Senden der Bestellung.",
    sent: "Service envoy\u00E9",
  },
} as const;

export function repairMojibakeUiText(input: string) {
  const source = String(input || "");
  if (!source || !MOJIBAKE_MARKERS.test(source)) return source;
  try {
    let current = source;
    for (let index = 0; index < 3; index += 1) {
      if (!MOJIBAKE_MARKERS.test(current)) break;
      const bytes = Uint8Array.from(Array.from(current), (char) => char.charCodeAt(0) & 0xff);
      const repaired = new TextDecoder("utf-8").decode(bytes);
      if (!repaired || repaired === current) break;
      current = repaired;
    }
    return current;
  } catch {
    return source;
  }
}

export function toCookingKeyFromLabel(label: string) {
  const normalized = String(label || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (normalized === "bleu") return "rare";
  if (normalized === "saignant") return "medium_rare";
  if (normalized === "a point" || normalized === "a point") return "medium";
  if (normalized === "bien cuit") return "well_done";
  return "";
}

function readLocalClientOrderingDisabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CLIENT_ORDERING_DISABLED_KEY) === "1";
}

export function resolveClientOrderingDisabled(row: Record<string, unknown>) {
  if (typeof row.is_active === "boolean") return !row.is_active;
  const status = String(row.status || "").trim().toLowerCase();
  if (status === "consultation" || status === "menu_only" || status === "disabled") return true;
  return readLocalClientOrderingDisabled();
}

export function parseJsonObject(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return null;
}

export function parsePriceNumber(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? Number(raw.toFixed(2)) : 0;
  const text = String(raw).trim();
  if (!text) return 0;
  const cleaned = text.replace(/\s+/g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return 0;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

export function resolveTotalTables(value: unknown): number | null {
  const readNumber = (entry: unknown): number | null => {
    const numeric = Number(entry);
    if (!Number.isFinite(numeric)) return null;
    const whole = Math.trunc(numeric);
    return whole > 0 ? whole : null;
  };

  const walk = (entry: unknown, depth = 0): number | null => {
    if (depth > 3 || entry == null) return null;
    const direct = readNumber(entry);
    if (direct != null) return direct;
    const source = parseJsonObject(entry);
    if (!source) return null;
    return (
      readNumber(source.table_count) ??
      walk(source.table_config, depth + 1) ??
      walk(source.settings, depth + 1) ??
      walk(source.marketing_options, depth + 1)
    );
  };

  const resolved = walk(value);
  if (resolved == null) return null;
  return Math.min(MAX_TOTAL_TABLES, Math.max(1, resolved));
}

export function normalizeAssignedTables(raw: unknown): number[] {
  const values = Array.isArray(raw) ? raw : [];
  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => Math.trunc(value))
    )
  ).sort((a, b) => a - b);
}

export function readBooleanFlag(raw: unknown, fallback = false): boolean {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw !== 0;
  if (typeof raw === "string") {
    const value = raw.trim().toLowerCase();
    if (["true", "1", "yes", "oui", "required", "obligatoire", "mandatory"].includes(value)) return true;
    if (["false", "0", "no", "non"].includes(value)) return false;
  }
  return fallback;
}

export function normalizeLookupText(raw: unknown) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function buildStableExtraId(dishId: unknown, name: unknown, price: unknown, index = 0) {
  const dishKey = String(dishId || "").trim();
  const nameKey = normalizeLookupText(name || "");
  const safeAmount = parsePriceNumber(price).toFixed(2);
  return `extra:${dishKey}:${nameKey || "option"}:${safeAmount}:${index}`;
}

export function makeLineId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function parseDescriptionOptions(description?: string | null): ParsedDishOptions {
  const raw = String(description || "").trim();
  if (!raw) return { sideIds: [], extrasList: [], askCooking: false };

  const askCooking = /__ASK_COOKING__:\s*true/i.test(raw);
  const sidesMatch = raw.match(/__SIDE_IDS__:\s*([^\n\r]+)/);
  const sideIds = sidesMatch
    ? sidesMatch[1]
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    : [];

  const extrasMatch = raw.match(/__EXTRAS_I18N__:\s*([^\n\r]+)/) || raw.match(/__EXTRAS__:\s*([^\n\r]+)/);
  const extrasList = extrasMatch
    ? extrasMatch[1]
        .split("|")
        .map((item) => {
          const [namePart, pricePart] = item.split("=");
          const nameFr = String(namePart || "")
            .split("~")[0]
            .trim();
          let decodedName = nameFr;
          try {
            decodedName = decodeURIComponent(nameFr);
          } catch {
            decodedName = nameFr;
          }
          const price = Number.parseFloat(String(pricePart || "0").replace(",", "."));
          return { name: decodedName || "Supplement", price: Number.isFinite(price) ? Number(price.toFixed(2)) : 0 };
        })
        .filter((extra) => extra.name.trim().length > 0)
    : [];

  return { sideIds, extrasList, askCooking };
}

export function normalizeProductOptionRows(rows: Array<Record<string, unknown>>): ProductOptionChoice[] {
  const seen = new Set<string>();
  return rows
    .map((row, index) => {
      const namesI18n = parseJsonObject(row.names_i18n);
      const label = String(row.name_fr || row.name || row.label_fr || row.label || namesI18n?.fr || "").trim() || "";
      if (!label) return null;
      const id = String(row.id || `option-${index}`).trim();
      const key = `${id}::${normalizeLookupText(label)}`;
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        id,
        name: label,
        price: parsePriceNumber(row.price_override ?? row.option_price ?? row.price ?? row.amount ?? 0),
        required: readBooleanFlag(
          row.is_required ??
            row.required ??
            row.mandatory ??
            row.is_mandatory ??
            row.obligatoire ??
            row.is_obligatoire,
          false
        ),
      } as ProductOptionChoice;
    })
    .filter(Boolean) as ProductOptionChoice[];
}

