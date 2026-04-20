export type OrderItem = {
  id?: string | number;
  dish_id?: string | number;
  category_id?: string | number | null;
  destination?: string | null;
  name?: string;
  display_name?: string;
  name_fr?: string;
  label_fr?: string;
  label?: string;
  item_name?: string;
  product_name?: string;
  productName?: string;
  dish_name?: string;
  dishName?: string;
  title?: string;
  designation?: string;
  product?: {
    name?: string;
    display_name?: string;
    name_fr?: string;
    label?: string;
    label_fr?: string;
    product_name?: string;
    productName?: string;
    title?: string;
  } | null;
  dish?: { name?: string; display_name?: string; name_fr?: string; label?: string; title?: string } | null;
  quantity?: number;
  category?: string;
  categorie?: string;
  price?: number;
  base_price?: number;
  unit_total_price?: number;
  instructions?: string;
  special_request?: string | null;
  selected_cooking?: string | null;
  selected_cooking_label_fr?: string | null;
  cooking?: string | null;
  cuisson?: string | null;
  side?: unknown;
  accompaniment?: unknown;
  accompagnement?: unknown;
  accompaniments?: unknown;
  supplements?: unknown;
  supplement?: unknown;
  details?: unknown;
  detail?: unknown;
  selected_options?: unknown;
  selected_option?: unknown;
  selected_option_id?: string | number | null;
  selected_option_name?: string | null;
  selected_option_price?: number | null;
  selectedOptions?: unknown;
  options?: unknown;
  selected_side_label_fr?: string | null;
  accompagnement_fr?: string | null;
  selected_side_ids?: Array<string | number>;
  selectedSides?: Array<string | number | Record<string, unknown>>;
  selectedExtras?: Array<{ name?: string; name_fr?: string; price?: number }>;
  selected_extras?: Array<{ label_fr?: string; name?: string; name_fr?: string; price?: number }>;
  status?: string | null;
  payment_status?: "unpaid" | "paid" | string | null;
  [key: string]: unknown;
};

export type Order = {
  id: string | number;
  table_number: number | string;
  items: unknown;
  status: string;
  created_at: string;
  tip_amount?: number | null;
  tips?: number | null;
  covers?: number | null;
  guest_count?: number | null;
  customer_count?: number | null;
  updated_at?: string | null;
  closed_at?: string | null;
  paid_at?: string | null;
  restaurant_id?: string | number | null;
};

export type InventoryDish = {
  id: string | number;
  name?: string;
  category?: string;
  categorie?: string;
  price?: number;
  active?: boolean;
};

export type RestaurantRow = {
  id: string | number;
  name?: string | null;
  logo_url?: string | null;
  address?: string | null;
  adresse?: string | null;
  city?: string | null;
  postal_code?: string | null;
  zip_code?: string | null;
  google_review_url?: string | null;
  smtp_user?: string | null;
  smtp_password?: string | null;
  table_config?: Record<string, unknown> | string | null;
};

export type RestaurantSocialLinks = {
  instagram?: string;
  snapchat?: string;
  facebook?: string;
  x?: string;
  website?: string;
};

export type ServiceNotification = {
  id: string | number;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  status?: string | null;
  table_number?: string | number | null;
  table_id?: string | number | null;
  restaurant_id?: string | number | null;
  created_at?: string | null;
  payload?: unknown;
  request_type?: string | null;
};

export type TicketLinePayload = {
  dishId?: string | number;
  quantity: number;
  itemName: string;
  category: string;
  baseUnitPrice?: number;
  supplementUnitPrice?: number;
  lineTotal: number;
  extras: string[];
  notes: string[];
};

export type TicketPayload = {
  orderId?: string | number;
  restaurantName: string;
  restaurantAddress?: string;
  restaurantLogoUrl?: string;
  lang?: string;
  tableNumber: number;
  paidAt: string;
  paymentMethod: string;
  countryCode: string;
  totalTtc: number;
  tipAmount?: number;
  lines: TicketLinePayload[];
  socialLinks?: RestaurantSocialLinks;
  showSocialOnReceipt?: boolean;
  feedbackUrl?: string;
};

export type PaymentMethodLabel = "Carte Bancaire" | "Espèces";

export type GroupedTable = {
  tableNumber: number;
  total: number;
  items: OrderItem[];
  orders: Order[];
  covers?: number | null;
};

export type PaidTableHistoryEntry = {
  id: string;
  tableNumber: number;
  covers?: number | null;
  total: number;
  tipAmount?: number;
  closedAt: string;
  paymentMethod: PaymentMethodLabel;
  items: OrderItem[];
};

export const SETTINGS_ROW_ID = "c9012859-d0af-469d-8dbb-af9dee733aaa";
export const ENABLE_ALERTS_ON_BAR_CAISSE = true;
export const PAID_TABLE_HISTORY_STORAGE_KEY = "menu_qr_paid_tables_history_v1";
export const PAID_TABLE_HISTORY_TTL_MS = 24 * 60 * 60 * 1000;
export const BLOCKING_PAYMENT_STATUSES = new Set(["pending", "preparing", "ready", "ready_bar", "to_prepare", "to_prepare_bar", "to_prepare_kitchen", "en_attente", "en_preparation", "pret", "prêt"]);
export const DRINK_QUEUE_STATUSES = new Set(["pending", "preparing", "to_prepare", "to_prepare_bar", "en_attente", "en_preparation"]);
export const AUTO_PRINT_TRIGGER_STATUSES = new Set(["paid", "paye", "payee", "confirmed", "confirme", "confirmee"]);
export const PAYMENT_BLOCK_MESSAGE = "Service en cours: tous les plats doivent etre marques SERVIS avant l'encaissement.";
export const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
export function normalizeLookupText(raw: unknown): string {
  if (raw == null) return "";
  if (Array.isArray(raw)) return raw.map((entry) => normalizeLookupText(entry)).filter(Boolean).join(",");
  return String(raw || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
const SERVICE_REQUEST_LABELS_FR: Record<string, string> = {
  help_question: "Aide / Question",
  request_order: "Demander à commander",
  ask_bill: "Demande l'addition",
  need_water: "Besoin d'une carafe d'eau",
  need_bread: "Besoin de pain",
  clear_table: "Demander à débarrasser",
  report_problem: "Signaler un problème",
};

export function parseItems(items: unknown): OrderItem[] {
  if (Array.isArray(items)) return items as OrderItem[];
  if (typeof items === "string") {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? (parsed as OrderItem[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function normalizeStatus(raw: unknown) {
  return String(raw || "").trim().toLowerCase();
}

export function normalizeStatusKey(raw: unknown) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export function parseNotificationPayload(payload: unknown): Record<string, unknown> | null {
  if (!payload) return null;
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof payload === "object") return payload as Record<string, unknown>;
  return null;
}

export function parseObjectRecord(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? (raw as Record<string, unknown>) : {};
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

export function getServiceNotificationReasonFr(notification: ServiceNotification) {
  const payload = parseNotificationPayload(notification.payload);
  const requestKey = String(
    payload?.request_key ||
      payload?.request_type ||
      (notification as unknown as Record<string, unknown>).request_key ||
      notification.request_type ||
      ""
  )
    .trim()
    .toLowerCase();
  if (requestKey && SERVICE_REQUEST_LABELS_FR[requestKey]) {
    return SERVICE_REQUEST_LABELS_FR[requestKey];
  }
  const payloadLabelFr = String(payload?.request_label_fr || "").trim();
  if (payloadLabelFr) return payloadLabelFr;
  const typeNormalized = normalizeStatus(notification.type);
  const message = String(notification.message || notification.title || "").trim();
  if (typeNormalized === "kitchen_call" || typeNormalized === "cuisine") {
    return message || "Plats prêts !";
  }
  if (message) return message;
  return "Appel simple";
}

export function getCategory(item: OrderItem) {
  const record = item as unknown as Record<string, unknown>;
  const nestedProduct =
    record.product && typeof record.product === "object"
      ? (record.product as Record<string, unknown>)
      : null;

  return String(
    record.category ||
      record.categorie ||
      record["catégorie"] ||
      nestedProduct?.category ||
      nestedProduct?.categorie ||
      nestedProduct?.["catégorie"] ||
      ""
  )
    .toLowerCase()
    .trim();
}

export function isDrink(item: OrderItem) {
  const record = item as unknown as Record<string, unknown>;
  const rawIsDrink = record.is_drink ?? record.isDrink;
  if (
    rawIsDrink === true ||
    String(rawIsDrink ?? "")
      .trim()
      .toLowerCase() === "true"
  ) {
    return true;
  }

  const c = getCategory(item);
  return ["boisson", "boissons", "vin", "vins", "bar", "drink", "drinks", "wine", "wines", "beverage", "beverages"].includes(c);
}

export function resolveStaffDestination(
  item: OrderItem,
  categoryDestinationById: Record<string, "cuisine" | "bar">,
  dishCategoryIdByDishId: Record<string, string>
) {
  const record = item as unknown as Record<string, unknown>;
  const explicitDestination = String(item.destination ?? record.destination ?? "").trim().toLowerCase();
  if (explicitDestination === "cuisine" || explicitDestination === "bar") {
    return explicitDestination;
  }
  const nestedDish =
    record.dish && typeof record.dish === "object"
      ? (record.dish as Record<string, unknown>)
      : null;
  const categoryId = String(
    item.category_id ??
      record.categoryId ??
      nestedDish?.category_id ??
      (item.dish_id != null ? dishCategoryIdByDishId[String(item.dish_id)] || "" : "")
  )
    .trim();
  if (categoryId) return categoryDestinationById[categoryId] || "cuisine";
  return isDrink(item) ? "bar" : "cuisine";
}

export function normalizePrepItemStatus(raw: unknown): "pending" | "preparing" | "ready" {
  const normalized = String(raw || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
  if (
    [
      "ready",
      "ready_bar",
      "pret",
      "prêt",
      "prete",
      "prête",
      "ready_to_serve",
      "served",
      "servi",
      "servie",
    ].includes(normalized)
  ) {
    return "ready";
  }
  if (
    [
      "preparing",
      "to_prepare",
      "to_prepare_bar",
      "to_prepare_kitchen",
      "en_preparation",
      "preparant",
    ].includes(normalized)
  ) {
    return "preparing";
  }
  return "pending";
}

export function getItemPrepStatus(item: OrderItem): "pending" | "preparing" | "ready" {
  const record = item as Record<string, unknown>;
  const rawStatus =
    record.status ??
    record.item_status ??
    record.preparation_status ??
    record.prep_status ??
    record.state;
  return normalizePrepItemStatus(rawStatus);
}

export function isItemReady(item: OrderItem) {
  return getItemPrepStatus(item) === "ready";
}

export function setItemPrepStatus(item: OrderItem, status: "pending" | "preparing" | "ready"): OrderItem {
  return { ...(item || {}), status };
}

export function normalizeUrl(raw: unknown) {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}

export function resolveRestaurantAddress(row: RestaurantRow, tableConfig: Record<string, unknown>) {
  const direct =
    String(row.address || row.adresse || "").trim() ||
    String(tableConfig.address || tableConfig.adresse || "").trim();
  if (direct) return direct;

  const line1 =
    String((row as unknown as Record<string, unknown>).address_line1 || (row as unknown as Record<string, unknown>).street_address || "").trim() ||
    String(tableConfig.address_line1 || tableConfig.street_address || "").trim();
  const line2 =
    String((row as unknown as Record<string, unknown>).address_line2 || "").trim() ||
    String(tableConfig.address_line2 || "").trim();
  const postalCode =
    String(row.postal_code || row.zip_code || "").trim() ||
    String(tableConfig.postal_code || tableConfig.zip_code || "").trim();
  const city = String(row.city || "").trim() || String(tableConfig.city || "").trim();

  return [line1, line2, [postalCode, city].filter(Boolean).join(" ").trim()].filter(Boolean).join(", ");
}

export function buildFeedbackUrl(orderId: unknown) {
  const normalizedOrderId = String(orderId || "").trim();
  if (!normalizedOrderId) return "";
  if (typeof window === "undefined") return "";
  const origin = String(window.location.origin || "").trim();
  if (!origin) return "";
  return `${origin.replace(/\/+$/, "")}/feedback/${encodeURIComponent(normalizedOrderId)}`;
}

export function encodeFeedbackItemsToken(
  lines: Array<{ dishId?: string | number; itemName?: string; quantity?: number }>
) {
  if (typeof window === "undefined") return "";
  const compact = (Array.isArray(lines) ? lines : [])
    .map((line) => ({
      d: String(line?.dishId || "").trim() || null,
      n: String(line?.itemName || "").trim(),
      q: Math.max(1, Math.trunc(Number(line?.quantity || 1))),
    }))
    .filter((line) => Boolean(line.n) || Boolean(line.d));
  if (compact.length === 0) return "";
  try {
    const json = JSON.stringify(compact);
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    const encoded = window.btoa(binary);
    return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  } catch {
    return "";
  }
}

export function buildFeedbackUrlWithItems(
  orderId: unknown,
  lines: Array<{ dishId?: string | number; itemName?: string; quantity?: number }>
) {
  const baseUrl = buildFeedbackUrl(orderId);
  if (!baseUrl) return "";
  const token = encodeFeedbackItemsToken(lines);
  if (!token) return baseUrl;
  return `${baseUrl}?items=${encodeURIComponent(token)}`;
}

export function normalizeItemPaymentStatus(raw: unknown): "unpaid" | "paid" {
  const normalized = String(raw || "").trim().toLowerCase();
  if (normalized === "paid" || normalized === "paye" || normalized === "payé") return "paid";
  return "unpaid";
}

export function isItemPaid(item: OrderItem): boolean {
  const record = item as Record<string, unknown>;
  return normalizeItemPaymentStatus(record.payment_status ?? record.paymentStatus) === "paid";
}

export function setItemPaymentStatus(item: OrderItem, status: "unpaid" | "paid"): OrderItem {
  return { ...(item || {}), payment_status: status };
}

export function isBarTicketItem(item: OrderItem) {
  const explicitDestination = String(item.destination || "").trim().toLowerCase();
  if (explicitDestination === "bar") return true;
  if (explicitDestination === "cuisine") return false;
  return isDrink(item);
}

export function deriveOrderStatusFromItems(items: OrderItem[]): string {
  if (items.length === 0) return "pending";
  const statuses = items.map((item) => getItemPrepStatus(item));
  if (statuses.every((status) => status === "ready")) {
    const allBarItems = items.every((item) => isBarTicketItem(item));
    return allBarItems ? "ready_bar" : "ready";
  }
  if (statuses.some((status) => status === "ready" || status === "preparing")) return "preparing";
  return "pending";
}

export function orderHasPendingDrinkItems(
  order: Order,
  categoryDestinationById: Record<string, "cuisine" | "bar">,
  dishCategoryIdByDishId: Record<string, string>
) {
  return parseItems(order.items).some(
    (item) =>
      resolveStaffDestination(item, categoryDestinationById, dishCategoryIdByDishId) === "bar" && !isItemReady(item)
  );
}

export function detectUiLang() {
  if (typeof document !== "undefined") {
    const htmlLang = String(document.documentElement.lang || "").trim().toLowerCase();
    if (htmlLang) return htmlLang;
  }
  if (typeof navigator !== "undefined") {
    const navLang = String(navigator.language || "").trim().toLowerCase();
    if (navLang) return navLang;
  }
  return "fr";
}

export function getReceiptSocialPrompt(langRaw: string) {
  const lang = String(langRaw || "fr").toLowerCase();
  if (lang.startsWith("en")) return "Thank you for your visit! Follow us on social media:";
  if (lang.startsWith("es")) return "¡Gracias por su visita! Síganos en nuestras redes sociales:";
  if (lang.startsWith("it")) return "Grazie per la visita! Seguici sui nostri social:";
  if (lang.startsWith("de")) return "Vielen Dank für Ihren Besuch! Folgen Sie uns in den sozialen Netzwerken:";
  if (lang.startsWith("nl")) return "Bedankt voor uw bezoek! Volg ons op sociale media:";
  if (lang.startsWith("pt")) return "Obrigado pela sua visita! Siga-nos nas redes sociais:";
  if (lang.startsWith("pl")) return "Dziękujemy za wizytę! Obserwuj nas w mediach społecznościowych:";
  if (lang.startsWith("ro")) return "Vă mulțumim pentru vizită! Urmăriți-ne pe rețelele sociale:";
  if (lang.startsWith("el")) return "Ευχαριστούμε για την επίσκεψη! Ακολουθήστε μας στα κοινωνικά δίκτυα:";
  if (lang.startsWith("ru")) return "Спасибо за визит! Подписывайтесь на нас в соцсетях:";
  if (lang.startsWith("zh")) return "谢谢光临！关注我们的社交媒体：";
  if (lang.startsWith("ja")) return "ご来店ありがとうございました！SNSでフォローしてください：";
  if (lang.startsWith("ko")) return "방문해 주셔서 감사합니다! 소셜 미디어를 팔로우하세요:";
  if (lang.startsWith("ar")) return "شكرًا لزيارتكم! تابعونا على شبكاتنا الاجتماعية:";
  return "Merci de votre visite ! Suivez-nous sur nos réseaux :";
}

export function getUnknownItemLabel() {
  return detectUiLang().startsWith("en") ? "Item" : "Article";
}

export function flattenChoiceTextsForDisplay(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap((entry) => flattenChoiceTextsForDisplay(entry));
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value || "").trim();
    return text ? [text] : [];
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const direct = [
      rec.label_fr,
      rec.label,
      rec.name_fr,
      rec.name,
      rec.value_fr,
      rec.value,
      rec.choice,
      rec.selected,
      rec.text,
      rec.title,
    ]
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    if (direct.length > 0) return direct;
    return Object.values(rec).flatMap((entry) => flattenChoiceTextsForDisplay(entry));
  }
  return [];
}

export function normalizeUniqueTexts(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function keepStaffFrenchLabel(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return (raw.split(/\s\/\s/).map((part) => part.trim()).filter(Boolean)[0] || raw)
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function getItemCookingText(item: OrderItem) {
  const direct = keepStaffFrenchLabel(item.selected_cooking_label_fr || item.cooking || item.cuisson || item.selected_cooking || "");
  if (direct) return direct;
  return "";
}

export function getItemSideText(item: OrderItem) {
  const directSide = normalizeUniqueTexts([
    keepStaffFrenchLabel(item.selected_side_label_fr || ""),
    keepStaffFrenchLabel(item.accompagnement_fr || ""),
    ...flattenChoiceTextsForDisplay(item.side),
    ...flattenChoiceTextsForDisplay(item.accompaniment),
    ...flattenChoiceTextsForDisplay(item.accompagnement),
    ...flattenChoiceTextsForDisplay(item.accompaniments),
  ].map((value) => keepStaffFrenchLabel(value)).filter(Boolean));
  if (directSide.length > 0) return directSide.join(", ");
  return "";
}

export function getItemSelectedOptionText(item: OrderItem) {
  const record = item as unknown as Record<string, unknown>;
  const extractOptionOnly = (value: unknown): string[] => {
    if (value == null) return [];
    if (Array.isArray(value)) return value.flatMap((entry) => extractOptionOnly(entry));
    if (typeof value === "string" || typeof value === "number") {
      const raw = keepStaffFrenchLabel(value);
      if (!raw) return [];
      if (/^(option|options|variante|variantes|variant|variants|format|formats)\s*:/i.test(raw)) {
        return [keepStaffFrenchLabel(raw.replace(/^[^:]+:\s*/i, "").trim())];
      }
      return [];
    }
    if (typeof value === "object") {
      const rec = value as Record<string, unknown>;
      const kind = String(rec.kind || rec.type || rec.key || rec.group || rec.category || "").toLowerCase().trim();
      const optionLike = /(option|variant|variante|format|taille)/.test(kind);
      if (optionLike) {
        const direct = [
          rec.label_fr,
          rec.name_fr,
          rec.value_fr,
        ]
          .map((entry) => keepStaffFrenchLabel(entry))
          .filter(Boolean);
        if (direct.length > 0) return direct;
        const fallback = [
          rec.label,
          rec.name,
          rec.value,
          rec.choice,
          rec.selected,
        ]
          .map((entry) => keepStaffFrenchLabel(entry))
          .filter(Boolean);
        return fallback;
      }
      return [];
    }
    return [];
  };
  const selectedOptionValues = normalizeUniqueTexts([
    ...flattenChoiceTextsForDisplay(item.selected_option),
    ...extractOptionOnly(record.selected_options ?? record.selectedOptions ?? record.options),
    keepStaffFrenchLabel(item.selected_option_name || ""),
  ].map((value) => keepStaffFrenchLabel(value)).filter(Boolean));
  return selectedOptionValues.join(", ");
}

export function formatItemInlineDetails(item: OrderItem) {
  const cooking = getItemCookingText(item);
  const side = getItemSideText(item);
  const selectedOption = getItemSelectedOptionText(item);
  const supplements = getItemExtras(item);
  const parts: string[] = [];
  if (cooking) parts.push(`(${cooking})`);
  if (selectedOption) parts.push(`- Option: ${selectedOption}`);
  if (side) parts.push(`- Accompagnement: ${side}`);
  if (supplements.length > 0) parts.push(`+ ${supplements.join(", ")}`);
  return parts.join(" ").trim();
}

export function getItemName(item: OrderItem) {
  const nestedProduct = item.product && typeof item.product === "object" ? item.product : null;
  const nestedDish = item.dish && typeof item.dish === "object" ? item.dish : null;
  const record = item as unknown as Record<string, unknown>;
  const resolved =
    keepStaffFrenchLabel(
      item.name_fr ||
        item.label_fr ||
        nestedProduct?.name_fr ||
        nestedProduct?.label_fr ||
        nestedDish?.name_fr ||
        item.name ||
        item.product_name ||
        item.label ||
        item.title ||
        item.display_name ||
        item.productName ||
        item.item_name ||
        item.dish_name ||
        item.dishName ||
        item.designation ||
        record["display_name"] ||
        record["displayName"] ||
        record["productLabel"] ||
        record["product_label"] ||
        nestedProduct?.name ||
        nestedProduct?.product_name ||
        nestedProduct?.display_name ||
        nestedProduct?.productName ||
        nestedProduct?.label ||
        nestedProduct?.title ||
        nestedDish?.name ||
        nestedDish?.display_name ||
        nestedDish?.label ||
        nestedDish?.title ||
        ""
    );
  if (resolved) return resolved;
  return getUnknownItemLabel();
}

export function getItemExtras(item: OrderItem) {
  const flattenChoiceTexts = (value: unknown): string[] => {
    if (value == null) return [];
    if (Array.isArray(value)) return value.flatMap((entry) => flattenChoiceTexts(entry));
    if (typeof value === "string" || typeof value === "number") {
      const text = keepStaffFrenchLabel(value);
      return text ? [text] : [];
    }
    if (typeof value === "object") {
      const rec = value as Record<string, unknown>;
      const direct = [rec.label_fr, rec.label, rec.name_fr, rec.name, rec.value_fr, rec.value, rec.choice, rec.selected]
        .map((entry) => keepStaffFrenchLabel(entry))
        .filter(Boolean);
      return direct.length > 0 ? direct : Object.values(rec).flatMap((entry) => flattenChoiceTexts(entry));
    }
    return [];
  };
  const normalizeUnique = (values: string[]) => normalizeUniqueTexts(values);
  const legacy = Array.isArray(item.selectedExtras) ? item.selectedExtras : [];
  const modern = Array.isArray(item.selected_extras) ? item.selected_extras : [];
  return normalizeUnique([
    ...legacy.map((e) => keepStaffFrenchLabel(e?.name_fr || e?.name || "")),
    ...modern.map((e) => keepStaffFrenchLabel(e?.label_fr || e?.name_fr || e?.name || "")),
    ...flattenChoiceTexts(item.supplement),
    ...flattenChoiceTexts(item.supplements),
  ].filter(Boolean));
}

export function getItemNotes(item: OrderItem) {
  const flattenChoiceTexts = (value: unknown): string[] => {
    if (value == null) return [];
    if (Array.isArray(value)) return value.flatMap((entry) => flattenChoiceTexts(entry));
    if (typeof value === "string" || typeof value === "number") {
      const text = keepStaffFrenchLabel(value);
      return text ? [text] : [];
    }
    if (typeof value === "object") {
      const rec = value as Record<string, unknown>;
      const direct = [
        rec.label_fr,
        rec.name_fr,
        rec.value_fr,
        rec.text,
        rec.title,
      ]
        .map((entry) => keepStaffFrenchLabel(entry))
        .filter(Boolean);
      if (direct.length > 0) return direct;
      const fallback = [
        rec.label,
        rec.name,
        rec.value,
        rec.choice,
        rec.selected,
      ]
        .map((entry) => keepStaffFrenchLabel(entry))
        .filter(Boolean);
      return fallback;
    }
    return [];
  };

  const normalizeUnique = (values: string[]) => normalizeUniqueTexts(values);

  const optionValues = normalizeUnique(
    flattenChoiceTexts(
      (item as unknown as Record<string, unknown>).selected_options ??
        (item as unknown as Record<string, unknown>).selectedOptions ??
        (item as unknown as Record<string, unknown>).options
    )
  );

  return normalizeUnique([
    ...flattenChoiceTexts(item.selected_option),
    keepStaffFrenchLabel(item.selected_option_name || ""),
    keepStaffFrenchLabel(item.cooking || item.cuisson || ""),
    keepStaffFrenchLabel(item.selected_cooking_label_fr || item.selected_cooking || ""),
    keepStaffFrenchLabel(item.selected_side_label_fr || ""),
    keepStaffFrenchLabel(item.accompagnement_fr || ""),
    ...flattenChoiceTexts(item.side),
    ...flattenChoiceTexts(item.accompaniment),
    ...flattenChoiceTexts(item.accompagnement),
    ...flattenChoiceTexts(item.accompaniments),
    ...flattenChoiceTexts(item.detail),
    ...flattenChoiceTexts(item.details),
    ...optionValues,
    keepStaffFrenchLabel(item.special_request || ""),
    keepStaffFrenchLabel(item.instructions || ""),
  ]);
}

export function calcLineBreakdown(item: OrderItem) {
  const quantity = Math.max(1, Number(item.quantity) || 1);
  const record = item as Record<string, unknown>;
  const readBoolean = (value: unknown) => {
    if (typeof value === "boolean") return value;
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return false;
    return ["true", "1", "yes", "oui", "on"].includes(normalized);
  };
  const isFormulaItem = Boolean(
    record.formula_dish_id ??
      record.formulaDishId ??
      record.formula_id ??
      record.formulaId ??
      record.is_formula
  );
  const formulaUnitCandidates: unknown[] = [
    record.formula_unit_price,
    record.formulaUnitPrice,
    record.formula_price,
    (item.dish as Record<string, unknown> | null)?.formula_price,
  ];
  const formulaUnitPrice = formulaUnitCandidates
    .map((value) => parsePriceNumber(value))
    .find((value) => value > 0) || 0;
  const isFormulaParent =
    readBoolean(record.is_formula_parent ?? record.isFormulaParent ?? record.is_main ?? record.isMain) ||
    parsePriceNumber(record.price) > 0 ||
    parsePriceNumber(record.base_price) > 0 ||
    parsePriceNumber(record.unit_total_price) > 0;
  if (isFormulaItem && formulaUnitPrice > 0 && isFormulaParent) {
    const unitTotal = formulaUnitPrice;
    return {
      quantity,
      baseUnitPrice: formulaUnitPrice,
      supplementUnitPrice: 0,
      unitTotal,
      lineTotal: unitTotal * quantity,
      baseLineTotal: unitTotal * quantity,
      supplementLineTotal: 0,
    };
  }
  const readOptionSupplement = () => {
    const directCandidates: unknown[] = [item.selected_option_price];
    const selectedOptionRecord =
      item.selected_option && typeof item.selected_option === "object"
        ? (item.selected_option as Record<string, unknown>)
        : null;
    if (selectedOptionRecord) {
      directCandidates.push(selectedOptionRecord.price, selectedOptionRecord.price_override, selectedOptionRecord.amount);
    }
    const selectedOptionsRaw =
      record.selected_options ?? record.selectedOptions ?? record.options;
    if (Array.isArray(selectedOptionsRaw)) {
      selectedOptionsRaw.forEach((entry) => {
        if (!entry || typeof entry !== "object") return;
        const row = entry as Record<string, unknown>;
        const kind = String(row.kind || row.type || row.key || "").toLowerCase().trim();
        if (kind && !/(option|variant|variante|format|taille)/.test(kind)) return;
        directCandidates.push(row.price, row.price_override, row.amount);
      });
    }
    for (const candidate of directCandidates) {
      const amount = parsePriceNumber(candidate);
      if (amount > 0) return amount;
    }
    return 0;
  };
  const optionSupplementUnitPrice = readOptionSupplement();
  const supplementUnitPrice =
    optionSupplementUnitPrice +
    (Array.isArray(item.selectedExtras) ? item.selectedExtras.reduce((sum, e) => sum + parsePriceNumber(e?.price), 0) : 0) +
    (Array.isArray(item.selected_extras) ? item.selected_extras.reduce((sum, e) => sum + parsePriceNumber(e?.price), 0) : 0);
  const explicitBaseCandidates = [
    item.base_price,
    record.basePrice,
    record.unit_base_price,
    record.unitBasePrice,
    (item.product as Record<string, unknown> | null)?.price,
    (item.dish as Record<string, unknown> | null)?.price,
  ];
  const explicitTotalCandidates = [item.unit_total_price, record.unitTotalPrice, record.total_unit_price, record.totalUnitPrice];
  const explicitBase = explicitBaseCandidates.map((v) => Number(v)).find((v) => Number.isFinite(v));
  const explicitTotal = explicitTotalCandidates.map((v) => Number(v)).find((v) => Number.isFinite(v));
  const rawUnitPrice = parsePriceNumber(item.price);

  let baseUnitPrice = 0;
  let unitTotal = 0;
  if (Number.isFinite(explicitBase as number)) {
    baseUnitPrice = Number(explicitBase);
    unitTotal = Number.isFinite(explicitTotal as number) ? Number(explicitTotal) : baseUnitPrice + supplementUnitPrice;
  } else if (Number.isFinite(explicitTotal as number)) {
    unitTotal = Number(explicitTotal);
    baseUnitPrice = Math.max(0, unitTotal - supplementUnitPrice);
  } else if (supplementUnitPrice > 0) {
    // Legacy orders stored `price` as already-increased unit total. Derive the base to avoid double counting.
    unitTotal = rawUnitPrice;
    baseUnitPrice = Math.max(0, rawUnitPrice - supplementUnitPrice);
  } else {
    baseUnitPrice = rawUnitPrice;
    unitTotal = rawUnitPrice;
  }
  const lineTotal = unitTotal * quantity;
  return {
    quantity,
    baseUnitPrice,
    supplementUnitPrice,
    unitTotal,
    lineTotal,
    baseLineTotal: baseUnitPrice * quantity,
    supplementLineTotal: supplementUnitPrice * quantity,
  };
}

export function calcLineTotal(item: OrderItem) {
  return calcLineBreakdown(item).lineTotal;
}

export type CashDisplayLine = {
  key: string;
  quantity: number;
  name: string;
  detailsText: string;
  extras: string[];
  notes: string[];
  amount: number;
  isFormulaGroup: boolean;
  subDishNames: string[];
  paymentStatus: "unpaid" | "paid" | "mixed";
};

export function resolveFormulaDisplayName(item: OrderItem) {
  const record = item as Record<string, unknown>;
  const candidates: unknown[] = [
    record.formula_dish_name,
    record.formulaDishName,
    record.formula_name,
    record.formulaName,
    record.formula_label,
    record.formulaLabel,
  ];
  for (const candidate of candidates) {
    const normalized = keepStaffFrenchLabel(candidate);
    if (normalized) return normalized;
  }
  return "";
}

export function resolveFormulaGroupKey(item: OrderItem) {
  const record = item as Record<string, unknown>;
  const formulaInstanceId = String(record.formula_instance_id ?? record.formulaInstanceId ?? "").trim();
  if (formulaInstanceId) return `instance:${formulaInstanceId}`;
  const formulaDishId = String(record.formula_dish_id ?? record.formulaDishId ?? record.formula_id ?? record.formulaId ?? "").trim();
  const isFormula = Boolean(formulaDishId || record.is_formula || record.isFormula);
  if (!isFormula) return "";
  if (formulaDishId) return `formula:${formulaDishId}`;
  return `formula-name:${normalizeLookupText(getItemName(item))}`;
}

export function isFormulaParentItem(item: OrderItem) {
  const record = item as Record<string, unknown>;
  const raw = String(record.is_formula_parent ?? record.isFormulaParent ?? record.is_main ?? record.isMain ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "oui", "on"].includes(raw)) return true;
  return parsePriceNumber(record.formula_unit_price ?? record.formulaUnitPrice ?? record.formula_price) > 0;
}

export function buildCashDisplayLines(items: OrderItem[]) {
  const formulaGroups = new Map<string, { firstIndex: number; items: OrderItem[] }>();
  const singles: Array<{ index: number; item: OrderItem }> = [];

  items.forEach((item, index) => {
    const groupKey = resolveFormulaGroupKey(item);
    if (!groupKey) {
      singles.push({ index, item });
      return;
    }
    const existing = formulaGroups.get(groupKey);
    if (existing) {
      existing.items.push(item);
      return;
    }
    formulaGroups.set(groupKey, { firstIndex: index, items: [item] });
  });

  const ordered = [
    ...singles.map((entry) => ({ index: entry.index, type: "single" as const, item: entry.item })),
    ...Array.from(formulaGroups.entries()).map(([groupKey, value]) => ({
      index: value.firstIndex,
      type: "formula" as const,
      groupKey,
      items: value.items,
    })),
  ].sort((a, b) => a.index - b.index);

  const rawLines = ordered.map((entry): CashDisplayLine => {
    if (entry.type === "single") {
      const detailsText = formatItemInlineDetails(entry.item);
      return {
        key: `single-${entry.index}`,
        quantity: Math.max(1, Number(entry.item.quantity) || 1),
        name: getItemName(entry.item),
        detailsText,
        extras: getItemExtras(entry.item),
        notes: getItemNotes(entry.item),
        amount: calcLineTotal(entry.item),
        isFormulaGroup: false,
        subDishNames: [],
        paymentStatus: isItemPaid(entry.item) ? "paid" : "unpaid",
      };
    }

    const groupItems = entry.items;
    const parent =
      groupItems.find((item) => isFormulaParentItem(item)) ||
      [...groupItems].sort((a, b) => calcLineTotal(b) - calcLineTotal(a))[0];
    const parentName = parent ? getItemName(parent) : getItemName(groupItems[0]);
    const formulaDisplayName =
      (parent ? resolveFormulaDisplayName(parent) : "") ||
      groupItems.map((item) => resolveFormulaDisplayName(item)).find(Boolean) ||
      "";
    const lineName = formulaDisplayName || parentName;
    const parentQuantity = parent ? Math.max(1, Number(parent.quantity) || 1) : 1;
    const detailsText = parent ? formatItemInlineDetails(parent) : "";
    const amount = groupItems.reduce((sum, item) => sum + calcLineTotal(item), 0);
    const extras = Array.from(new Set(groupItems.flatMap((item) => getItemExtras(item))));
    const notes = Array.from(new Set(groupItems.flatMap((item) => getItemNotes(item))));
    const subDishNames = Array.from(
      new Set(
        groupItems
          .filter((item) => item !== parent)
          .map((item) => getItemName(item))
          .filter((name) => normalizeLookupText(name) !== normalizeLookupText(lineName))
      )
    );

    return {
      key: entry.groupKey,
      quantity: parentQuantity,
      name: lineName,
      detailsText,
      extras,
      notes,
      amount,
      isFormulaGroup: true,
      subDishNames,
      paymentStatus: (() => {
        const statuses = groupItems.map((item) => (isItemPaid(item) ? "paid" : "unpaid"));
        if (statuses.every((status) => status === "paid")) return "paid";
        if (statuses.every((status) => status === "unpaid")) return "unpaid";
        return "mixed";
      })(),
    };
  });

  const normalizeForSignature = (value: string) => normalizeLookupText(value || "");
  const normalizeListForSignature = (values: string[]) =>
    values
      .map((value) => normalizeForSignature(value))
      .filter(Boolean)
      .sort()
      .join("|");
  const grouped = new Map<string, CashDisplayLine>();
  rawLines.forEach((line, index) => {
    const signature = [
      normalizeForSignature(line.name),
      normalizeForSignature(line.detailsText),
      normalizeListForSignature(line.extras),
      normalizeListForSignature(line.notes),
      line.isFormulaGroup ? "formula" : "single",
      normalizeListForSignature(line.subDishNames),
    ].join("||");
    const existing = grouped.get(signature);
    if (!existing) {
      grouped.set(signature, { ...line, key: `${line.key}-${index}` });
      return;
    }
    existing.quantity += line.quantity;
    existing.amount += line.amount;
    existing.extras = Array.from(new Set([...existing.extras, ...line.extras]));
    existing.notes = Array.from(new Set([...existing.notes, ...line.notes]));
    if (existing.isFormulaGroup || line.isFormulaGroup) {
      existing.isFormulaGroup = true;
      existing.subDishNames = Array.from(new Set([...existing.subDishNames, ...line.subDishNames]));
    }
    if (existing.paymentStatus !== line.paymentStatus) {
      existing.paymentStatus = "mixed";
    }
  });

  return Array.from(grouped.values());
}

export function isPaidOrArchived(order: Order) {
  const status = normalizeStatus(order.status);
  return status === "paid" || status === "archived";
}

export function toErrorInfo(error: unknown) {
  if (!error || typeof error !== "object") {
    return { code: null, status: null, message: String(error || "") || null, details: null, hint: null };
  }
  const raw = error as Record<string, unknown>;
  return {
    code: raw.code ?? null,
    status: raw.status ?? null,
    message: String(raw.message || "").trim() || null,
    details: raw.details ?? null,
    hint: raw.hint ?? null,
  };
}

export function hasUsefulError(info: ReturnType<typeof toErrorInfo>) {
  return ["code", "status", "message", "details", "hint"].some((k) => {
    const v = info[k as keyof typeof info];
    if (v == null) return false;
    const t = String(v).trim().toLowerCase();
    return !!t && t !== "{}" && t !== "[object object]" && t !== "unknown" && t !== "null";
  });
}

export function isMissingColumnOrCacheError(error: unknown) {
  const info = toErrorInfo(error);
  const code = String(info.code || "").trim();
  const message = `${String(info.message || "")} ${String(info.details || "")} ${String(info.hint || "")}`.toLowerCase();
  return code === "42703" || message.includes("column") || message.includes("schema cache");
}

export function isMissingRelationError(error: unknown) {
  const info = toErrorInfo(error);
  const code = String(info.code || "").trim();
  const message = `${String(info.message || "")} ${String(info.details || "")} ${String(info.hint || "")}`.toLowerCase();
  return code === "42P01" || message.includes("relation") || message.includes("does not exist");
}

export function roundCurrency(value: number) {
  return Number.parseFloat(Number(value || 0).toFixed(2));
}

