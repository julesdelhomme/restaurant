"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { jsPDF } from "jspdf";
import { Banknote, BellRing, CheckCircle2, CreditCard, Printer, X } from "lucide-react";
import { supabase } from "../lib/supabase";

type OrderItem = {
  id?: string | number;
  dish_id?: string | number;
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
  selected_side_ids?: Array<string | number>;
  selectedSides?: Array<string | number | Record<string, unknown>>;
  selectedExtras?: Array<{ name?: string; name_fr?: string; price?: number }>;
  selected_extras?: Array<{ label_fr?: string; name?: string; name_fr?: string; price?: number }>;
  status?: string | null;
  [key: string]: unknown;
};

type Order = {
  id: string | number;
  table_number: number | string;
  items: unknown;
  status: string;
  created_at: string;
  tip_amount?: number | null;
  covers?: number | null;
  guest_count?: number | null;
  customer_count?: number | null;
  updated_at?: string | null;
  closed_at?: string | null;
  paid_at?: string | null;
  restaurant_id?: string | number | null;
};

type InventoryDish = {
  id: string | number;
  name?: string;
  category?: string;
  categorie?: string;
  price?: number;
  active?: boolean;
};

type RestaurantRow = {
  id: string | number;
  name?: string | null;
  logo_url?: string | null;
  smtp_user?: string | null;
  smtp_password?: string | null;
  table_config?: Record<string, unknown> | string | null;
};

type RestaurantSocialLinks = {
  instagram?: string;
  snapchat?: string;
  facebook?: string;
  x?: string;
  website?: string;
};

type ServiceNotification = {
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

type TicketLinePayload = {
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

type TicketPayload = {
  orderId?: string | number;
  restaurantName: string;
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
};

type PaymentMethodLabel = "Carte Bancaire" | "Espèces";

type GroupedTable = {
  tableNumber: number;
  total: number;
  items: OrderItem[];
  orders: Order[];
  covers?: number | null;
};

type PaidTableHistoryEntry = {
  id: string;
  tableNumber: number;
  covers?: number | null;
  total: number;
  tipAmount?: number;
  closedAt: string;
  paymentMethod: PaymentMethodLabel;
  items: OrderItem[];
};

const SETTINGS_ROW_ID = "c9012859-d0af-469d-8dbb-af9dee733aaa";
const ENABLE_ALERTS_ON_BAR_CAISSE = false;
const PAID_TABLE_HISTORY_STORAGE_KEY = "menu_qr_paid_tables_history_v1";
const PAID_TABLE_HISTORY_TTL_MS = 24 * 60 * 60 * 1000;
const BLOCKING_PAYMENT_STATUSES = new Set(["pending", "preparing", "ready", "ready_bar", "to_prepare", "to_prepare_bar", "to_prepare_kitchen", "en_attente", "en_preparation", "pret", "prêt"]);
const DRINK_QUEUE_STATUSES = new Set(["pending", "preparing", "to_prepare", "to_prepare_bar", "en_attente", "en_preparation"]);
const PAYMENT_BLOCK_MESSAGE = "Service en cours: tous les plats doivent etre marques SERVIS avant l'encaissement.";
const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
const SERVICE_REQUEST_LABELS_FR: Record<string, string> = {
  help_question: "Aide / Question",
  ask_bill: "Demande l'addition",
  need_water: "Besoin d'une carafe d'eau",
  need_bread: "Besoin de pain",
  clear_table: "Demander à débarrasser",
  report_problem: "Signaler un problème",
};

function parseItems(items: unknown): OrderItem[] {
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

function normalizeStatus(raw: unknown) {
  return String(raw || "").trim().toLowerCase();
}

function parseNotificationPayload(payload: unknown): Record<string, unknown> | null {
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

function parseObjectRecord(raw: unknown): Record<string, unknown> {
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

function parsePriceNumber(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? Number(raw.toFixed(2)) : 0;
  const text = String(raw).trim();
  if (!text) return 0;
  const cleaned = text.replace(/\s+/g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return 0;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function getServiceNotificationReasonFr(notification: ServiceNotification) {
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

function getCategory(item: OrderItem) {
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

function isDrink(item: OrderItem) {
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
  return ["boisson", "boissons", "bar", "drink", "drinks", "beverage", "beverages"].includes(c);
}

function normalizePrepItemStatus(raw: unknown): "pending" | "preparing" | "ready" {
  const normalized = String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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

function getItemPrepStatus(item: OrderItem): "pending" | "preparing" | "ready" {
  const record = item as Record<string, unknown>;
  const rawStatus =
    record.status ??
    record.item_status ??
    record.preparation_status ??
    record.prep_status ??
    record.state;
  return normalizePrepItemStatus(rawStatus);
}

function isItemReady(item: OrderItem) {
  return getItemPrepStatus(item) === "ready";
}

function setItemPrepStatus(item: OrderItem, status: "pending" | "preparing" | "ready"): OrderItem {
  return { ...(item || {}), status };
}

function deriveOrderStatusFromItems(items: OrderItem[]): string {
  if (items.length === 0) return "pending";
  const statuses = items.map((item) => getItemPrepStatus(item));
  if (statuses.every((status) => status === "ready")) {
    const allDrinks = items.every((item) => isDrink(item));
    return allDrinks ? "ready_bar" : "ready";
  }
  if (statuses.some((status) => status === "ready" || status === "preparing")) return "preparing";
  return "pending";
}

function orderHasPendingDrinkItems(order: Order) {
  return parseItems(order.items).some((item) => isDrink(item) && !isItemReady(item));
}

function detectUiLang() {
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

function getReceiptSocialPrompt(langRaw: string) {
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

function getUnknownItemLabel() {
  return detectUiLang().startsWith("en") ? "Item" : "Article";
}

function flattenChoiceTextsForDisplay(value: unknown): string[] {
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

function normalizeUniqueTexts(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function getItemCookingText(item: OrderItem) {
  const direct = String(item.cooking || item.cuisson || item.selected_cooking_label_fr || item.selected_cooking || "").trim();
  if (direct) return direct;
  return "";
}

function getItemSideText(item: OrderItem) {
  const directSide = normalizeUniqueTexts([
    ...flattenChoiceTextsForDisplay(item.side),
    ...flattenChoiceTextsForDisplay(item.accompaniment),
    ...flattenChoiceTextsForDisplay(item.accompagnement),
    ...flattenChoiceTextsForDisplay(item.accompaniments),
  ]);
  if (directSide.length > 0) return directSide.join(", ");
  return "";
}

function getItemSelectedOptionText(item: OrderItem) {
  const record = item as unknown as Record<string, unknown>;
  const extractOptionOnly = (value: unknown): string[] => {
    if (value == null) return [];
    if (Array.isArray(value)) return value.flatMap((entry) => extractOptionOnly(entry));
    if (typeof value === "string" || typeof value === "number") {
      const raw = String(value || "").trim();
      if (!raw) return [];
      if (/^(option|options|variante|variantes|variant|variants|format|formats)\s*:/i.test(raw)) {
        return [raw.replace(/^[^:]+:\s*/i, "").trim()];
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
          rec.label,
          rec.name_fr,
          rec.name,
          rec.value_fr,
          rec.value,
          rec.choice,
          rec.selected,
        ]
          .map((entry) => String(entry || "").trim())
          .filter(Boolean);
        if (direct.length > 0) return direct;
        return Object.values(rec).flatMap((entry) => flattenChoiceTextsForDisplay(entry));
      }
      return [];
    }
    return [];
  };
  const selectedOptionValues = normalizeUniqueTexts([
    String(item.selected_option_name || "").trim(),
    ...flattenChoiceTextsForDisplay(item.selected_option),
    ...extractOptionOnly(record.selected_options ?? record.selectedOptions ?? record.options),
  ].filter(Boolean));
  return selectedOptionValues.join(", ");
}

function formatItemInlineDetails(item: OrderItem) {
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

function getItemName(item: OrderItem) {
  const nestedProduct = item.product && typeof item.product === "object" ? item.product : null;
  const nestedDish = item.dish && typeof item.dish === "object" ? item.dish : null;
  const record = item as unknown as Record<string, unknown>;
  const resolved =
    String(
      item.name ||
        item.product_name ||
        item.label ||
        item.title ||
        item.display_name ||
        item.productName ||
        item.name_fr ||
        item.item_name ||
        item.label_fr ||
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
        nestedProduct?.name_fr ||
        nestedProduct?.label_fr ||
        nestedProduct?.label ||
        nestedProduct?.title ||
        nestedDish?.name_fr ||
        nestedDish?.name ||
        nestedDish?.display_name ||
        nestedDish?.label ||
        nestedDish?.title ||
        ""
    ).trim();
  if (resolved) return resolved;
  console.log("BAR-CAISSE ITEM NAME MISSING:", item);
  return getUnknownItemLabel();
}

function getItemExtras(item: OrderItem) {
  const flattenChoiceTexts = (value: unknown): string[] => {
    if (value == null) return [];
    if (Array.isArray(value)) return value.flatMap((entry) => flattenChoiceTexts(entry));
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value || "").trim();
      return text ? [text] : [];
    }
    if (typeof value === "object") {
      const rec = value as Record<string, unknown>;
      const direct = [rec.label_fr, rec.label, rec.name_fr, rec.name, rec.value_fr, rec.value, rec.choice, rec.selected]
        .map((entry) => String(entry || "").trim())
        .filter(Boolean);
      return direct.length > 0 ? direct : Object.values(rec).flatMap((entry) => flattenChoiceTexts(entry));
    }
    return [];
  };
  const normalizeUnique = (values: string[]) => normalizeUniqueTexts(values);
  const legacy = Array.isArray(item.selectedExtras) ? item.selectedExtras : [];
  const modern = Array.isArray(item.selected_extras) ? item.selected_extras : [];
  return normalizeUnique([
    ...legacy.map((e) => String(e?.name_fr || e?.name || "").trim()),
    ...modern.map((e) => String(e?.label_fr || e?.name_fr || e?.name || "").trim()),
    ...flattenChoiceTexts(item.supplement),
    ...flattenChoiceTexts(item.supplements),
  ].filter(Boolean));
}

function getItemNotes(item: OrderItem) {
  const flattenChoiceTexts = (value: unknown): string[] => {
    if (value == null) return [];
    if (Array.isArray(value)) return value.flatMap((entry) => flattenChoiceTexts(entry));
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
      return Object.values(rec).flatMap((entry) => flattenChoiceTexts(entry));
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
    String(item.selected_option_name || "").trim(),
    ...flattenChoiceTexts(item.selected_option),
    String(item.cooking || item.cuisson || "").trim(),
    String(item.selected_cooking_label_fr || item.selected_cooking || "").trim(),
    ...flattenChoiceTexts(item.side),
    ...flattenChoiceTexts(item.accompaniment),
    ...flattenChoiceTexts(item.accompagnement),
    ...flattenChoiceTexts(item.accompaniments),
    ...flattenChoiceTexts(item.detail),
    ...flattenChoiceTexts(item.details),
    ...optionValues,
    String(item.special_request || "").trim(),
    String(item.instructions || "").trim(),
  ]);
}

function calcLineBreakdown(item: OrderItem) {
  const quantity = Math.max(1, Number(item.quantity) || 1);
  const record = item as Record<string, unknown>;
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

function calcLineTotal(item: OrderItem) {
  return calcLineBreakdown(item).lineTotal;
}

function isPaidOrArchived(order: Order) {
  const status = normalizeStatus(order.status);
  return status === "paid" || status === "archived";
}

function toErrorInfo(error: unknown) {
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

function hasUsefulError(info: ReturnType<typeof toErrorInfo>) {
  return ["code", "status", "message", "details", "hint"].some((k) => {
    const v = info[k as keyof typeof info];
    if (v == null) return false;
    const t = String(v).trim().toLowerCase();
    return !!t && t !== "{}" && t !== "[object object]" && t !== "unknown" && t !== "null";
  });
}

export default function BarCaissePage() {
  const params = useParams<{ id?: string; restaurant_id?: string }>();
  const searchParams = useSearchParams();
  const decodeAndTrim = (value: unknown) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      return decodeURIComponent(raw).trim();
    } catch {
      return raw;
    }
  };
  const scopedRestaurantIdFromPath = decodeAndTrim(params?.restaurant_id || params?.id || "");
  const scopedRestaurantIdFromQuery = decodeAndTrim(searchParams.get("restaurant_id") || "");
  const scopedRestaurantIdFromLocation =
    typeof window !== "undefined" ? decodeAndTrim(window.location.pathname.split("/").filter(Boolean)[0] || "") : "";
  const scopedRestaurantId = String(scopedRestaurantIdFromPath || scopedRestaurantIdFromQuery || scopedRestaurantIdFromLocation || "").trim();
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryDish[]>([]);
  const [activeTab, setActiveTab] = useState<"boissons" | "caisse" | "inventaire">("boissons");
  const [expandedTables, setExpandedTables] = useState<Record<number, boolean>>({});

  const [restaurantId, setRestaurantId] = useState<string | number | null>(null);
  const [restaurantName, setRestaurantName] = useState("Mon Restaurant");
  const [restaurantLogoUrl, setRestaurantLogoUrl] = useState("");
  const [restaurantSocialLinks, setRestaurantSocialLinks] = useState<RestaurantSocialLinks>({});
  const [showSocialOnReceipt, setShowSocialOnReceipt] = useState(false);
  const [gmailUser, setGmailUser] = useState("");
  const [gmailAppPassword, setGmailAppPassword] = useState("");
  const [gmailSaveLoading, setGmailSaveLoading] = useState(false);
  const [gmailMessage, setGmailMessage] = useState("");

  const [encaisseModalTable, setEncaisseModalTable] = useState<number | null>(null);
  const [paymentModalStep, setPaymentModalStep] = useState<"choice" | "email">("choice");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodLabel>("Carte Bancaire");
  const [tipAmountInput, setTipAmountInput] = useState("");
  const [ticketEmail, setTicketEmail] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [ticketSending, setTicketSending] = useState(false);
  const [thermalPrintPayload, setThermalPrintPayload] = useState<TicketPayload | null>(null);
  const [hasNewDrinkAlert, setHasNewDrinkAlert] = useState(false);
  const [serviceNotifications, setServiceNotifications] = useState<ServiceNotification[]>([]);
  const [paidTablesHistory, setPaidTablesHistory] = useState<PaidTableHistoryEntry[]>([]);
  const thermalPrintTriggerRef = useRef<number | null>(null);

  const playBarNotificationBeep = () => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx =
        (window as typeof window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(740, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
      window.setTimeout(() => void ctx.close().catch(() => undefined), 250);
    } catch (error) {
      console.warn("Notification bar impossible:", error);
    }
  };

  const fetchRestaurantSettings = async () => {
    const targetRestaurantId = String(scopedRestaurantId || SETTINGS_ROW_ID || "").trim();
    const byId = await supabase.from("restaurants").select("*").eq("id", targetRestaurantId).maybeSingle();
    let row = (byId.data as RestaurantRow | null) || null;
    if (!row && !scopedRestaurantId) {
      const fallback = await supabase.from("restaurants").select("*").limit(1).maybeSingle();
      row = (fallback.data as RestaurantRow | null) || null;
    }
    if (!row) {
      setRestaurantId(targetRestaurantId || SETTINGS_ROW_ID);
      return;
    }
    setRestaurantId(row.id ?? SETTINGS_ROW_ID);
    setRestaurantName(String(row.name || "Mon Restaurant").trim() || "Mon Restaurant");
    setRestaurantLogoUrl(String(row.logo_url || "").trim());
    const tableConfig = parseObjectRecord(row.table_config);
    const socialLinks = parseObjectRecord(tableConfig.social_links);
    setRestaurantSocialLinks({
      instagram: String(socialLinks.instagram || "").trim() || undefined,
      snapchat: String(socialLinks.snapchat || "").trim() || undefined,
      facebook: String(socialLinks.facebook || "").trim() || undefined,
      x: String(socialLinks.x || socialLinks.twitter || "").trim() || undefined,
      website: String(socialLinks.website || socialLinks.site || "").trim() || undefined,
    });
    setShowSocialOnReceipt(
      Boolean(tableConfig.show_social_on_digital_receipt ?? tableConfig.show_social_on_receipt)
    );
    setGmailUser(String(row.smtp_user || "").trim());
    setGmailAppPassword(String(row.smtp_password || "").trim());
  };

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

  const fetchOrders = async (restaurantScope: string | number | null = restaurantId) => {
    const currentRestaurantId = String(restaurantScope ?? scopedRestaurantId ?? "").trim();
    let query = supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (currentRestaurantId) query = query.eq("restaurant_id", currentRestaurantId);
    const { data, error } = await query;
    if (error) {
      console.error("Erreur fetchOrders:", error);
      return;
    }
    const nextOrders = (data || []) as Order[];

    const normalizeCoversValue = (value: unknown): number | null => {
      const n = Number(value);
      if (!Number.isFinite(n)) return null;
      const whole = Math.trunc(n);
      return whole > 0 ? whole : null;
    };
    const readOrderCovers = (order: Order) =>
      normalizeCoversValue(order.covers) ??
      normalizeCoversValue(order.guest_count) ??
      normalizeCoversValue(order.customer_count);
    const missingCoverTables = Array.from(
      new Set(
        nextOrders
          .filter((order) => !readOrderCovers(order))
          .map((order) => String(order.table_number ?? "").trim())
          .filter(Boolean)
      )
    );
    const coversByTable = new Map<string, number>();
    if (missingCoverTables.length > 0) {
      let tableRowsQuery = supabase.from("table_assignments").select("*").in("table_number", missingCoverTables);
      if (currentRestaurantId) tableRowsQuery = tableRowsQuery.eq("restaurant_id", currentRestaurantId);
      const { data: tableRows } = await tableRowsQuery;
      (Array.isArray(tableRows) ? tableRows : []).forEach((row) => {
        const key = String(row?.table_number || "").trim();
        const covers =
          normalizeCoversValue(row?.covers) ??
          normalizeCoversValue(row?.guest_count) ??
          normalizeCoversValue(row?.customer_count);
        if (key && covers) coversByTable.set(key, covers);
      });
    }
    const nextOrdersWithCovers = nextOrders.map((order) => {
      if (readOrderCovers(order)) return order;
      const fallback = coversByTable.get(String(order.table_number ?? "").trim());
      if (!fallback) return order;
      return { ...order, covers: fallback, guest_count: fallback, customer_count: fallback };
    });

    const hasVisibleName = (item: OrderItem) =>
      Boolean(String(item.name || item.product_name || item.label || item.title || item.display_name || "").trim());
    const getDishId = (item: OrderItem) => {
      const rec = item as unknown as Record<string, unknown>;
      const nestedDish = rec.dish && typeof rec.dish === "object" ? (rec.dish as Record<string, unknown>) : null;
      return String(item.dish_id ?? item.id ?? nestedDish?.id ?? "").trim();
    };
    const extractSideIds = (item: OrderItem): string[] => {
      const raw = [
        ...(Array.isArray(item.selected_side_ids) ? item.selected_side_ids : []),
        ...(Array.isArray(item.selectedSides) ? item.selectedSides : []),
      ];
      return raw
        .map((entry) => {
          if (entry && typeof entry === "object") {
            const rec = entry as Record<string, unknown>;
            return String(rec.id ?? rec.side_id ?? rec.value ?? "").trim();
          }
          return String(entry ?? "").trim();
        })
        .filter(Boolean);
    };
    const hasSideText = (item: OrderItem) =>
      [
        item.side,
        item.accompaniment,
        item.accompagnement,
        item.accompaniments,
        (item as unknown as Record<string, unknown>).accompagnements,
      ].some((v) => {
        if (v == null) return false;
        if (Array.isArray(v)) return v.length > 0;
        return String(v).trim().length > 0;
      });

    const itemsByOrder = nextOrdersWithCovers.map((order) => parseItems(order.items));
    const missingDishIds = Array.from(
      new Set(
        itemsByOrder
          .flatMap((items) => items)
          .filter((item) => !hasVisibleName(item))
          .map((item) => getDishId(item))
          .filter(Boolean)
      )
    );
    const missingSideIds = Array.from(
      new Set(
        itemsByOrder
          .flatMap((items) => items)
          .filter((item) => !hasSideText(item))
          .flatMap((item) => extractSideIds(item))
      )
    );

    const [dishesLookup, sidesLookup] = await Promise.all([
      missingDishIds.length > 0
        ? supabase.from("dishes").select("id,name,name_fr,translations").in("id", missingDishIds)
        : Promise.resolve({ data: [], error: null }),
      missingSideIds.length > 0
        ? supabase
            .from("sides_library")
            .select("id,name,name_fr,name_en,name_es,name_de,label,title")
            .in("id", missingSideIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (dishesLookup.error) console.warn("Lookup noms plats bar-caisse échoué:", dishesLookup.error);
    if (sidesLookup.error) console.warn("Lookup accompagnements bar-caisse échoué:", sidesLookup.error);

    const dishNameById: Record<string, string> = {};
    ((dishesLookup.data || []) as Array<Record<string, unknown>>).forEach((row) => {
      const id = String(row.id ?? "").trim();
      const translations = row.translations && typeof row.translations === "object" ? (row.translations as Record<string, unknown>) : null;
      const translated =
        String(translations?.fr ?? translations?.en ?? translations?.name_fr ?? translations?.name ?? "").trim();
      const name = String(row.name_fr || translated || row.name || "").trim();
      if (id && name) dishNameById[id] = name;
    });

    const sideNameById: Record<string, string> = {};
    ((sidesLookup.data || []) as Array<Record<string, unknown>>).forEach((row) => {
      const id = String(row.id ?? "").trim();
      const name = String(row.name_fr || row.name || row.label || row.title || row.name_en || "").trim();
      if (id && name) sideNameById[id] = name;
    });

    const hydratedOrders = nextOrdersWithCovers.map((order, index) => {
      const parsed = itemsByOrder[index];
      const hydratedItems = parsed.map((item) => {
        const rec = item as unknown as Record<string, unknown>;
        const nextItem: OrderItem & Record<string, unknown> = { ...item };

        if (!hasVisibleName(item)) {
          const dishId = getDishId(item);
          if (dishId && dishNameById[dishId]) {
            nextItem.name = dishNameById[dishId];
          }
        }

        if (!hasSideText(item)) {
          const sideNames = extractSideIds(item).map((id) => sideNameById[id]).filter(Boolean);
          if (sideNames.length > 0) {
            nextItem.accompaniment = sideNames.join(", ");
          }
        }

        return nextItem as OrderItem;
      });
      return { ...order, items: hydratedItems };
    });

    setOrders(hydratedOrders);
  };

  const fetchServiceNotifications = async (restaurantScope: string | number | null = restaurantId) => {
    const currentRestaurantId = String(restaurantScope ?? scopedRestaurantId ?? "").trim();
    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (currentRestaurantId) query = query.eq("restaurant_id", currentRestaurantId);
    const { data, error } = await query;

    if (error) {
      const message = String((error as { message?: string })?.message || "").toLowerCase();
      if (!message.includes("does not exist")) {
        console.warn("Notifications indisponibles:", error);
      }
      setServiceNotifications([]);
      return;
    }

    const pending = ((data || []) as ServiceNotification[]).filter((row) => {
      const status = normalizeStatus(row.status);
      if (status && status !== "pending") return false;
      const type = normalizeStatus(row.type);
      return type === "client_call" || type === "kitchen_call" || type === "appel" || type === "cuisine";
    });

    setServiceNotifications(pending);
  };

  const fetchInventory = async () => {
    const currentRestaurantId = String(restaurantId ?? scopedRestaurantId ?? "").trim();
    let query = supabase.from("dishes").select("*").order("id", { ascending: true });
    if (currentRestaurantId) query = query.eq("restaurant_id", currentRestaurantId);
    let { data, error } = await query;
    if (error && String((error as { code?: string }).code || "") === "42703" && currentRestaurantId) {
      const fallback = await supabase.from("dishes").select("*").order("id", { ascending: true });
      data = fallback.data;
      error = fallback.error;
    }
    if (error) {
      console.error("Erreur fetchInventory:", error);
      alert("Erreur base de donnees: " + error.message);
      return;
    }
    setInventory((data || []) as InventoryDish[]);
  };

  useEffect(() => {
    void fetchRestaurantSettings();
  }, [scopedRestaurantId]);

  useEffect(() => {
    if (!restaurantId && !scopedRestaurantId) return;
    void fetchInventory();
  }, [restaurantId, scopedRestaurantId]);

  useEffect(() => {
    void fetchOrders();
    if (ENABLE_ALERTS_ON_BAR_CAISSE) void fetchServiceNotifications();
    const ordersChannel = supabase
      .channel(`bar-caisse-orders-${String(restaurantId ?? "global")}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        const eventPayload = payload as { eventType?: string; new?: Record<string, unknown>; old?: Record<string, unknown> };
        const eventType = String(eventPayload.eventType || "").toUpperCase();
        const newRow = (eventPayload.new || {}) as Record<string, unknown>;
        const currentRestaurantId = String(restaurantId ?? "").trim();
        const nextRestaurantId = String(newRow.restaurant_id ?? "").trim();
        const sameRestaurant = !currentRestaurantId || !nextRestaurantId || nextRestaurantId === currentRestaurantId;
        if (eventType === "INSERT" && sameRestaurant) {
          const insertedItems = parseItems(newRow.items);
          const insertedStatus = normalizeStatus(newRow.status);
          if (DRINK_QUEUE_STATUSES.has(insertedStatus) && insertedItems.some((item) => isDrink(item))) {
            setHasNewDrinkAlert(true);
            if (activeTab !== "boissons") playBarNotificationBeep();
          }
        }
        void fetchOrders();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [restaurantId, activeTab]);

  useEffect(() => {
    if (!ENABLE_ALERTS_ON_BAR_CAISSE) {
      setServiceNotifications([]);
      return;
    }
    const notificationsChannel = supabase
      .channel(`bar-caisse-notifications-${String(restaurantId ?? "global")}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, (payload) => {
        const eventPayload = payload as { eventType?: string; new?: Record<string, unknown> };
        const eventType = String(eventPayload.eventType || "").toUpperCase();
        const newRow = (eventPayload.new || {}) as Record<string, unknown>;
        const currentRestaurantId = String(restaurantId ?? "").trim();
        const nextRestaurantId = String(newRow.restaurant_id ?? "").trim();
        const sameRestaurant = !currentRestaurantId || !nextRestaurantId || nextRestaurantId === currentRestaurantId;
        if (eventType === "INSERT" && sameRestaurant && normalizeStatus(newRow.status) === "pending") {
          playBarNotificationBeep();
        }
        void fetchServiceNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
    };
  }, [restaurantId]);

  useEffect(() => {
    if (activeTab === "boissons" && hasNewDrinkAlert) {
      setHasNewDrinkAlert(false);
    }
  }, [activeTab, hasNewDrinkAlert]);

  useEffect(() => {
    const restaurantsChannel = supabase
      .channel("bar-caisse-restaurants")
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurants" }, () => {
        void fetchRestaurantSettings();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(restaurantsChannel);
    };
  }, []);

  useEffect(() => {
    const handleAfterPrint = () => setThermalPrintPayload(null);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
      if (thermalPrintTriggerRef.current) {
        window.clearTimeout(thermalPrintTriggerRef.current);
        thermalPrintTriggerRef.current = null;
      }
    };
  }, []);

  const pendingDrinkOrders = useMemo(() => orders.filter((order) => orderHasPendingDrinkItems(order)), [orders]);

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
      const total = orderItems.reduce((sum, item) => sum + calcLineTotal(item), 0);
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
  const modalTable = useMemo(() => tables.find((t) => t.tableNumber === encaisseModalTable) || null, [tables, encaisseModalTable]);

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

  const restorePaidTableFromHistory = async (entry: PaidTableHistoryEntry) => {
    const tableNumber = Number(entry.tableNumber);
    if (!Number.isFinite(tableNumber) || tableNumber <= 0) {
      alert("Historique invalide (table).");
      return;
    }
    const items = Array.isArray(entry.items) ? entry.items : [];
    if (items.length === 0) {
      alert("Historique invalide (aucun article).");
      return;
    }

    const covers = (() => {
      const n = Number(entry.covers || 0);
      return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
    })();

    const orderPayloadCandidates = [
      {
        restaurant_id: restaurantId ?? SETTINGS_ROW_ID,
        table_number: tableNumber,
        covers,
        guest_count: covers,
        customer_count: covers,
        items,
        total_price: Number(entry.total || 0),
        status: "served",
      },
      {
        restaurant_id: restaurantId ?? SETTINGS_ROW_ID,
        table_number: tableNumber,
        covers,
        guest_count: covers,
        items,
        total_price: Number(entry.total || 0),
        status: "served",
      },
      {
        restaurant_id: restaurantId ?? SETTINGS_ROW_ID,
        table_number: tableNumber,
        covers,
        items,
        total_price: Number(entry.total || 0),
        status: "served",
      },
      {
        restaurant_id: restaurantId ?? SETTINGS_ROW_ID,
        table_number: tableNumber,
        items,
        total_price: Number(entry.total || 0),
        status: "served",
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
        String(info.code || "") === "42703" || String(info.message || "").toLowerCase().includes("column") || String(info.message || "").toLowerCase().includes("schema cache");
      if (!missingColumn) break;
    }

    if (orderInsertError) {
      console.error("Erreur restauration historique (orders):", toErrorInfo(orderInsertError));
      alert("Impossible de restaurer la table.");
      return;
    }

    const assignmentPayloads = covers
      ? [
          { table_number: tableNumber, pin_code: "RESTAURE", covers, guest_count: covers, customer_count: covers },
          { table_number: tableNumber, pin_code: "RESTAURE", covers, guest_count: covers },
          { table_number: tableNumber, pin_code: "RESTAURE", covers },
          { table_number: tableNumber, pin_code: "RESTAURE", guest_count: covers },
          { table_number: tableNumber, pin_code: "RESTAURE", customer_count: covers },
          { table_number: tableNumber, pin_code: "RESTAURE" },
        ]
      : [{ table_number: tableNumber, pin_code: "RESTAURE" }];
    for (const payload of assignmentPayloads) {
      const res = await supabase.from("table_assignments").upsert([payload], { onConflict: "table_number" });
      if (!res.error) break;
      const info = toErrorInfo(res.error);
      const missingColumn =
        String(info.code || "") === "42703" || String(info.message || "").toLowerCase().includes("column") || String(info.message || "").toLowerCase().includes("schema cache");
      if (!missingColumn) {
        console.warn("Restauration table_assignments non confirmée:", info);
        break;
      }
    }

    setPaidTablesHistory((prev) => prev.filter((row) => row.id !== entry.id));
    await fetchOrders();
    setActiveTab("caisse");
    alert(`Table ${tableNumber} restaurée.`);
  };

  const saveGmailConfig = async () => {
    setGmailSaveLoading(true);
    setGmailMessage("");
    try {
      const targetRestaurantId = restaurantId ?? SETTINGS_ROW_ID;
      const { error } = await supabase
        .from("restaurants")
        .update({ smtp_user: gmailUser.trim() || null, smtp_password: gmailAppPassword.trim() || null })
        .eq("id", targetRestaurantId);
      if (error) {
        console.error("Erreur sauvegarde Gmail:", error);
        setGmailMessage("Erreur de sauvegarde Gmail.");
        return;
      }
      setGmailMessage("Configuration Gmail enregistree.");
      await fetchRestaurantSettings();
    } finally {
      setGmailSaveLoading(false);
    }
  };

  const handleDrinkReady = async (orderId: string | number) => {
    const targetOrder = orders.find((order) => String(order.id) === String(orderId));
    if (!targetOrder) {
      await fetchOrders();
      return;
    }
    const currentItems = parseItems(targetOrder.items);
    if (currentItems.length === 0) return;
    const nextItems = currentItems.map((item) => (isDrink(item) ? setItemPrepStatus(item, "ready") : item));
    const nextStatus = deriveOrderStatusFromItems(nextItems);

    setOrders((prev) =>
      prev.map((order) =>
        String(order.id) === String(orderId)
          ? { ...order, items: nextItems, status: nextStatus }
          : order
      )
    );

    const { error } = await supabase
      .from("orders")
      .update({ items: nextItems, status: nextStatus })
      .eq("id", orderId);
    if (error) {
      console.error("Erreur Boisson prete:", error);
      await fetchOrders();
    }
  };

  const markNotificationHandled = async (notificationId: string | number) => {
    const { error } = await supabase
      .from("notifications")
      .update({ status: "completed" })
      .eq("id", notificationId);
    if (error) {
      console.error("Erreur traitement notification:", error);
      alert("Impossible de marquer la notification comme traitée.");
      return;
    }
    setServiceNotifications((prev) => prev.filter((row) => String(row.id) !== String(notificationId)));
  };

  const buildTicketPayloadForTable = (
    tableNumber: number,
    paidAtIso?: string,
    paymentMethod: PaymentMethodLabel = selectedPaymentMethod,
    tipAmountRaw: unknown = tipAmountInput
  ): TicketPayload | null => {
    const tableOrders = activeOrders.filter((o) => Number(o.table_number) === Number(tableNumber));
    if (tableOrders.length === 0) return null;
    let totalTtc = 0;
    const tipAmount = parsePriceNumber(tipAmountRaw);
    const lines: TicketLinePayload[] = [];
    const latestOrder = [...tableOrders].sort(
      (a, b) => new Date(String(b.created_at || 0)).getTime() - new Date(String(a.created_at || 0)).getTime()
    )[0];
    tableOrders.forEach((order) => {
      parseItems(order.items).forEach((item) => {
        const breakdown = calcLineBreakdown(item);
        const ticketItemName =
          String(item.name || item.product_name || item.label || item.title || item.display_name || "").trim() || getItemName(item);
        totalTtc += breakdown.lineTotal;
        lines.push({
          dishId: (item.dish_id ?? item.id) as string | number | undefined,
          quantity: breakdown.quantity,
          itemName: ticketItemName,
          category: getCategory(item),
          baseUnitPrice: breakdown.baseUnitPrice,
          supplementUnitPrice: breakdown.supplementUnitPrice,
          lineTotal: breakdown.lineTotal,
          extras: getItemExtras(item),
          notes: getItemNotes(item),
        });
      });
    });
    return {
      orderId: latestOrder?.id,
      restaurantName: restaurantName || "Mon Restaurant",
      restaurantLogoUrl,
      lang: detectUiLang(),
      tableNumber,
      paidAt: paidAtIso || new Date().toISOString(),
      paymentMethod,
      countryCode: "FR",
      totalTtc,
      tipAmount,
      lines,
      socialLinks: restaurantSocialLinks,
      showSocialOnReceipt,
    };
  };

  const buildTicketPdf = (payload: TicketPayload) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const margin = 36;
    let y = 44;
    const ensureSpace = (n = 18) => {
      if (y + n <= height - 36) return;
      doc.addPage();
      y = 44;
    };
    const printLine = (left: string, right?: string, bold = false, small = false) => {
      ensureSpace(small ? 14 : 18);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(small ? 10 : 12);
      doc.text(left, margin, y);
      if (right) doc.text(right, width - margin, y, { align: "right" });
      y += small ? 14 : 18;
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(payload.restaurantName || "Mon Restaurant", margin, y);
    y += 24;
    printLine(`Ticket - Table ${payload.tableNumber}`);
    printLine(`Date: ${new Date(payload.paidAt).toLocaleString("fr-FR")}`, undefined, false, true);
    printLine(`Paiement: ${payload.paymentMethod}`, undefined, false, true);
    y += 4;
    doc.line(margin, y, width - margin, y);
    y += 14;

    payload.lines.forEach((line) => {
      printLine(`${line.quantity}x ${line.itemName}`, `${Number(line.lineTotal || 0).toFixed(2)} EUR`, true, false);
      const baseUnitPrice = Number(line.baseUnitPrice || 0);
      const supplementUnitPrice = Number(line.supplementUnitPrice || 0);
      const unitTotal = Number(line.quantity || 1) > 0 ? Number(line.lineTotal || 0) / Number(line.quantity || 1) : Number(line.lineTotal || 0);
      if (supplementUnitPrice > 0) {
        printLine(
          `Prix: ${baseUnitPrice.toFixed(2)} + Suppl.: ${supplementUnitPrice.toFixed(2)} = ${unitTotal.toFixed(2)} EUR`,
          undefined,
          false,
          true
        );
      } else if (Number(line.quantity || 1) > 1) {
        printLine(`Prix unitaire: ${unitTotal.toFixed(2)} EUR`, undefined, false, true);
      }
      if (line.extras.length > 0) printLine(`Suppléments : ${line.extras.join(", ")}`, undefined, false, true);
      if (line.notes.length > 0) printLine(`Notes: ${line.notes.join(" | ")}`, undefined, false, true);
      y += 2;
    });

    y += 6;
    doc.line(margin, y, width - margin, y);
    y += 16;
    printLine("TOTAL TTC", `${payload.totalTtc.toFixed(2)} EUR`, true, false);
    const tipAmount = Number(payload.tipAmount || 0);
    if (tipAmount > 0) {
      printLine("POURBOIRE", `${tipAmount.toFixed(2)} EUR`, false, true);
      printLine("TOTAL ENCAISSE", `${(Number(payload.totalTtc || 0) + tipAmount).toFixed(2)} EUR`, true, false);
    }
    const totalHt = Number(payload.totalTtc || 0) / 1.1;
    const tvaAmount = Number(payload.totalTtc || 0) - totalHt;
    printLine("TOTAL HT", `${totalHt.toFixed(2)} EUR`, false, true);
    printLine("TVA 10%", `${tvaAmount.toFixed(2)} EUR`, false, true);

    const socialLinks = payload.socialLinks || {};
    const socialEntries = [
      ["Instagram", socialLinks.instagram],
      ["Snapchat", socialLinks.snapchat],
      ["Facebook", socialLinks.facebook],
      ["X", socialLinks.x],
      ["Site Web", socialLinks.website],
    ].filter(([, url]) => Boolean(String(url || "").trim())) as Array<[string, string | undefined]>;
    if (payload.showSocialOnReceipt && socialEntries.length > 0) {
      y += 12;
      doc.line(margin, y, width - margin, y);
      y += 16;
      ensureSpace(36);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(17, 17, 17);
      doc.text(getReceiptSocialPrompt(payload.lang || "fr"), margin, y);
      y += 18;
      socialEntries.forEach(([label, url]) => {
        const safeUrl = String(url || "").trim();
        if (!safeUrl) return;
        ensureSpace(16);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(17, 17, 17);
        doc.text(`${label}:`, margin, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(37, 99, 235);
        const docWithLink = doc as unknown as {
          textWithLink?: (text: string, x: number, y: number, options: { url: string }) => void;
        };
        if (typeof docWithLink.textWithLink === "function") {
          docWithLink.textWithLink(safeUrl, margin + 60, y, { url: safeUrl });
        } else {
          doc.text(safeUrl, margin + 60, y);
        }
        y += 16;
      });
      doc.setTextColor(0, 0, 0);
    }

    const dataUri = doc.output("datauristring");
    const pdfBase64 = String(dataUri).replace(/^data:application\/pdf;filename=generated\.pdf;base64,/, "");
    const blobUrl = doc.output("bloburl");
    return { doc, dataUri, pdfBase64, blobUrl };
  };

  const openPrintTicket = (payload: TicketPayload) => {
    const { blobUrl } = buildTicketPdf(payload);
    const win = window.open(blobUrl, "_blank", "noopener,noreferrer,width=420,height=760");
    if (!win) {
      alert("Impossible d'ouvrir la fenetre d'impression.");
      return;
    }
    win.focus();
  };

  const openThermalPrint = (payload: TicketPayload) => {
    if (thermalPrintTriggerRef.current) {
      window.clearTimeout(thermalPrintTriggerRef.current);
      thermalPrintTriggerRef.current = null;
    }
    setThermalPrintPayload(payload);
    thermalPrintTriggerRef.current = window.setTimeout(() => {
      window.print();
      thermalPrintTriggerRef.current = null;
    }, 80);
  };

  const sendTicketByEmail = async (email: string, payload: TicketPayload) => {
    const to = email.trim();
    if (!to) throw new Error("Adresse email requise.");
    const { pdfBase64 } = buildTicketPdf(payload);
    const response = await fetch("/api/send-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        tableNumber: payload.tableNumber,
        restaurantId: String(restaurantId ?? SETTINGS_ROW_ID),
        pdfBase64,
        ticketPayload: payload,
      }),
    });
    const json = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    if (!response.ok) throw new Error(String(json.error || "Echec de l'envoi email."));
    return json;
  };

  const markTableAsPaid = async (tableNumber: number, tipAmountRaw: unknown = tipAmountInput) => {
    const isMissingColumnError = (error: unknown) => {
      const info = toErrorInfo(error);
      return String(info.code || "").trim() === "42703" || String(info.message || "").toLowerCase().includes("column");
    };
    const logSupabaseErrorIfUseful = (prefix: string, error: unknown) => {
      const info = toErrorInfo(error);
      if (hasUsefulError(info)) console.error(prefix, info);
      return info;
    };

    const hasServiceInProgress = orders.some((order) => {
      if (Number(order.table_number) !== Number(tableNumber)) return false;
      const status = normalizeStatus(order.status);
      return !["served", "servi", "paid", "archived"].includes(status) || BLOCKING_PAYMENT_STATUSES.has(status);
    });
    if (hasServiceInProgress) {
      alert(PAYMENT_BLOCK_MESSAGE);
      return false;
    }

    const paidAt = new Date().toISOString();
    const tipAmount = parsePriceNumber(tipAmountRaw);
    let ordersError: unknown = null;
    const try1 = await supabase
      .from("orders")
      .update({ status: "paid", closed_at: paidAt, paid_at: paidAt, updated_at: paidAt, tip_amount: tipAmount })
      .eq("table_number", tableNumber)
      .neq("status", "paid")
      .neq("status", "archived");
    ordersError = try1.error;

    if (ordersError && isMissingColumnError(ordersError)) {
      const try2 = await supabase
        .from("orders")
        .update({ status: "paid", paid_at: paidAt, updated_at: paidAt, tip_amount: tipAmount })
        .eq("table_number", tableNumber)
        .neq("status", "paid")
        .neq("status", "archived");
      ordersError = try2.error;
    }

    if (ordersError && isMissingColumnError(ordersError)) {
      const try3 = await supabase
        .from("orders")
        .update({ status: "paid", updated_at: paidAt, tip_amount: tipAmount })
        .eq("table_number", tableNumber)
        .neq("status", "paid")
        .neq("status", "archived");
      ordersError = try3.error;
    }

    if (ordersError && isMissingColumnError(ordersError)) {
      const try4 = await supabase
        .from("orders")
        .update({ status: "paid", tip_amount: tipAmount })
        .eq("table_number", tableNumber)
        .neq("status", "paid")
        .neq("status", "archived");
      ordersError = try4.error;
    }

    if (ordersError && isMissingColumnError(ordersError)) {
      const try5 = await supabase
        .from("orders")
        .update({ status: "paid" })
        .eq("table_number", tableNumber)
        .neq("status", "paid")
        .neq("status", "archived");
      ordersError = try5.error;
    }

    if (ordersError) {
      console.error("Erreur encaissement orders:", toErrorInfo(ordersError));
      return false;
    }

    const resetDelete = await supabase.from("table_assignments").delete().eq("table_number", tableNumber);
    if (resetDelete.error) {
      const pinResetError = logSupabaseErrorIfUseful("Erreur liberation table apres encaissement:", resetDelete.error);
      if (pinResetError && hasUsefulError(pinResetError)) {
        alert("Encaissement valide, mais liberation table non confirmee.");
      }
    }

    await fetchOrders();
    return true;
  };

  const closePaymentModal = () => {
    setEncaisseModalTable(null);
    setPaymentModalStep("choice");
    setSelectedPaymentMethod("Carte Bancaire");
    setTipAmountInput("");
    setTicketEmail("");
    setPaymentProcessing(false);
    setTicketSending(false);
  };

  const openPaymentModal = (tableNumber: number) => {
    if (tableHasServiceInProgress.get(tableNumber)) {
      alert(PAYMENT_BLOCK_MESSAGE);
      return;
    }
    setEncaisseModalTable(tableNumber);
    setPaymentModalStep("choice");
    setSelectedPaymentMethod("Carte Bancaire");
    setTipAmountInput("");
    setTicketEmail("");
  };

  const runPaymentFlow = async (mode: "none" | "thermal-print" | "email") => {
    if (!encaisseModalTable) return;
    if (mode === "email" && !ticketEmail.trim()) {
      alert("Saisissez une adresse email.");
      return;
    }

    const tableNumber = encaisseModalTable;
    const paidAtIso = new Date().toISOString();
    const tipAmount = parsePriceNumber(tipAmountInput);
    const ticketPayload = buildTicketPayloadForTable(tableNumber, paidAtIso, selectedPaymentMethod, tipAmount);
    const historyTableSnapshot = modalTable
      ? {
          tableNumber: modalTable.tableNumber,
          total: modalTable.total,
          items: [...modalTable.items],
          orders: [...modalTable.orders],
          covers: modalTable.covers ?? null,
        }
      : null;
    setPaymentProcessing(true);
    if (mode === "email") setTicketSending(true);

    try {
      const paid = await markTableAsPaid(tableNumber, tipAmount);
      if (!paid) return;
      if (historyTableSnapshot) {
        appendPaidTableToHistory(historyTableSnapshot, paidAtIso, selectedPaymentMethod, tipAmount);
      }
      if (mode === "thermal-print" && ticketPayload) openThermalPrint(ticketPayload);
      if (mode === "email") {
        if (!ticketPayload) throw new Error("Ticket introuvable.");
        await sendTicketByEmail(ticketEmail, ticketPayload);
        alert("Ticket envoye par email.");
      }
      closePaymentModal();
    } catch (error) {
      console.error("Erreur paiement/ticket:", error);
      alert(String((error as { message?: string })?.message || "Erreur paiement/ticket."));
    } finally {
      setPaymentProcessing(false);
      setTicketSending(false);
    }
  };

  const toggleStock = async (item: InventoryDish) => {
    const newStatus = !Boolean(item.active);
    const { error } = await supabase.from("dishes").update({ active: newStatus }).eq("id", item.id);
    if (error) {
      console.error("Erreur toggle stock:", error);
      alert("Impossible de mettre a jour le stock.");
      return;
    }
    setInventory((prev) => prev.map((p) => (p.id === item.id ? { ...p, active: newStatus } : p)));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-black notranslate" translate="no">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1 uppercase">Bar / Caisse</h1>
          <p className="text-sm text-gray-700">{restaurantName} - Poste Bar / Caisse</p>
        </div>
      </div>

      {ENABLE_ALERTS_ON_BAR_CAISSE && serviceNotifications.length > 0 ? (
        <section className="mb-6 rounded-xl border-2 border-black bg-amber-50 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-amber-700" />
              <h2 className="text-lg font-black uppercase">Notifications service</h2>
            </div>
            <span className="rounded border-2 border-black bg-white px-2 py-1 text-xs font-black">
              {serviceNotifications.length} en attente
            </span>
          </div>
          <div className="space-y-2">
            {serviceNotifications.map((notification) => {
              const tableText =
                String(notification.table_number ?? "").trim() ||
                String(notification.table_id ?? "").trim() ||
                "-";
              const createdText = notification.created_at
                ? new Date(notification.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                : "--:--";
              const typeNormalized = normalizeStatus(notification.type);
              const isKitchenCall =
                typeNormalized === "kitchen_call" ||
                typeNormalized === "cuisine" ||
                String(tableText).toUpperCase() === "CUISINE";
              const notificationPrefix = isKitchenCall ? "CUISINE" : `Table ${tableText}`;
              return (
                <div
                  key={String(notification.id)}
                  className="flex flex-col gap-3 rounded-lg border-2 border-black bg-white p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      {isKitchenCall ? (
                        <span className="rounded border border-red-700 bg-red-600 px-2 py-0.5 font-black text-white">
                          CUISINE
                        </span>
                      ) : (
                        <span className="rounded border border-black bg-black px-2 py-0.5 font-black text-white">
                          Table {tableText}
                        </span>
                      )}
                      <span className="font-mono text-xs text-gray-600">{createdText}</span>
                      <span className="rounded border border-amber-600 bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                        {String(notification.type || "notification").replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-1 font-bold text-black">
                      {`${notificationPrefix} : ${getServiceNotificationReasonFr(notification)}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void markNotificationHandled(notification.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-black bg-emerald-600 px-3 py-2 font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    OK
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="mb-6 w-full overflow-x-auto whitespace-nowrap">
        <div className="inline-flex gap-2">
          <button onClick={() => setActiveTab("boissons")} className={`relative px-4 py-3 border-2 border-black font-black ${activeTab === "boissons" ? "bg-blue-600 text-white" : "bg-white text-black"}`}>
            Bar - Boissons
            {hasNewDrinkAlert && activeTab !== "boissons" ? <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse border border-black" /> : null}
          </button>
          <button onClick={() => setActiveTab("caisse")} className={`px-4 py-3 border-2 border-black font-black ${activeTab === "caisse" ? "bg-emerald-600 text-white" : "bg-white text-black"}`}>Caisse</button>
          <button onClick={() => setActiveTab("inventaire")} className={`px-4 py-3 border-2 border-black font-black ${activeTab === "inventaire" ? "bg-black text-white" : "bg-white text-black"}`}>Inventaire</button>
        </div>
      </div>

      {activeTab === "boissons" ? (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold uppercase bg-blue-100 p-2 rounded">Bar - Boissons</h2>
            <span className="text-sm font-black">{pendingDrinkOrders.length} en attente</span>
          </div>
          <div className="space-y-4">
            {pendingDrinkOrders.length === 0 ? <p className="text-gray-500 italic">Aucune boisson en attente.</p> : null}
            {pendingDrinkOrders.map((order) => {
              const drinks = parseItems(order.items).filter((i) => isDrink(i) && !isItemReady(i));
              if (drinks.length === 0) return null;
              return (
                <div key={String(order.id)} className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-2">
                      <h3 className="text-3xl font-black uppercase">
                        T-{order.table_number}
                        {Number(order.covers || order.guest_count || order.customer_count) > 0
                          ? ` | 👥 ${Number(order.covers || order.guest_count || order.customer_count)}`
                          : ""}
                      </h3>
                      <span className="text-xs font-mono text-gray-500">#{String(order.id).slice(0, 4)}</span>
                    </div>
                    <div className="space-y-2 mb-4" translate="no">
                      {drinks.map((item, idx) => {
                        const itemExtras = getItemExtras(item);
                        const itemNotes = getItemNotes(item);
                        const inlineDetails = formatItemInlineDetails(item);
                        const drinkLabel =
                          String(item.name || item.product_name || item.label || item.title || item.display_name || "").trim() ||
                          getItemName(item);
                        return (
                          <div key={`${String(order.id)}-${idx}`} className="bg-gray-100 p-2">
                            <div className="flex justify-between items-center gap-2">
                              <span className="font-bold text-lg">
                                <span className="bg-black text-white px-2 mr-2 rounded">{Number(item.quantity) || 1}x</span>
                                <span className="notranslate" translate="no">
                                  {drinkLabel}
                                  {inlineDetails ? ` ${inlineDetails}` : ""}
                                </span>
                              </span>
                              <span className="font-bold text-sm">{euro.format(calcLineTotal(item))}</span>
                            </div>
                            {itemExtras.length > 0 ? (
                              <div className="mt-1 text-xs text-gray-700 notranslate" translate="no">
                                Suppléments : {itemExtras.join(", ")}
                              </div>
                            ) : null}
                            {itemNotes.length > 0 ? (
                              <div className="mt-1 text-xs italic text-gray-700 notranslate" translate="no">
                                Options : {itemNotes.join(" | ")}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <button onClick={() => void handleDrinkReady(order.id)} className="w-full bg-blue-500 hover:opacity-90 text-white font-bold py-4 text-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all">BOISSON PRÊTE</button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeTab === "caisse" ? (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold uppercase bg-emerald-100 p-2 rounded">Caisse</h2>
            <div className="flex gap-2 text-sm font-bold">
              <span className="px-2 py-1 border-2 border-black bg-white">Prêtes: {readyForCashTables.length}</span>
              <span className="px-2 py-1 border-2 border-black bg-white">En service: {pendingCashTables.length}</span>
            </div>
          </div>

          <div className="space-y-4">
            {readyForCashTables.length === 0 ? <p className="text-gray-500 italic">Aucune commande terminée prête à encaisser.</p> : null}
            {readyForCashTables.map((table) => {
              const expanded = !!expandedTables[table.tableNumber];
              return (
                <div key={table.tableNumber} className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-2">
                    <div>
                      <div className="text-3xl font-black uppercase">
                        T-{table.tableNumber}
                        {Number(table.covers || 0) > 0 ? ` | 👥 ${Number(table.covers || 0)}` : ""}
                      </div>
                      <div className="text-sm font-bold">Total : {euro.format(table.total)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setExpandedTables((prev) => ({ ...prev, [table.tableNumber]: !prev[table.tableNumber] }))} className="px-3 py-2 border-2 border-black bg-white font-black">{expanded ? "Masquer" : "Détails"}</button>
                      <button type="button" onClick={() => openPaymentModal(table.tableNumber)} className="px-4 py-3 border-2 border-black bg-emerald-600 text-white font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">MARQUER PAYÉ</button>
                    </div>
                  </div>
                  {expanded ? (
                    <div className="mt-3 space-y-2" translate="no">
                      {table.items.map((item, idx) => (
                        <div key={`${table.tableNumber}-${idx}`} className="flex items-start justify-between gap-2 bg-gray-100 p-2">
                          <div>
                            <div className="font-bold notranslate" translate="no">
                              {Number(item.quantity) || 1}x {getItemName(item)}
                              {formatItemInlineDetails(item) ? ` ${formatItemInlineDetails(item)}` : ""}
                            </div>
                            {getItemExtras(item).length > 0 ? <div className="text-xs text-gray-700">Suppléments : {getItemExtras(item).join(", ")}</div> : null}
                            {getItemNotes(item).length > 0 ? <div className="text-xs text-gray-700">Notes : {getItemNotes(item).join(" | ")}</div> : null}
                          </div>
                          <div className="font-black">{euro.format(calcLineTotal(item))}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {pendingCashTables.length > 0 ? (
            <div className="mt-6 bg-yellow-50 border-2 border-yellow-300 p-4">
              <h3 className="text-lg font-black mb-2 uppercase">Encaissement bloqué (service en cours)</h3>
              <div className="flex flex-wrap gap-2">
                {pendingCashTables.map((t) => (
                  <span key={`blocked-${t.tableNumber}`} className="px-2 py-1 border-2 border-black bg-white font-bold text-sm">Table {t.tableNumber}</span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-lg font-black uppercase">Historique des Tables Encaissées (24h)</h3>
              <span className="px-2 py-1 border-2 border-black bg-gray-100 text-xs font-black">
                {paidTablesHistory.length} entrée{paidTablesHistory.length > 1 ? "s" : ""}
              </span>
            </div>
            {paidTablesHistory.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                Aucune table encaissée conservée. Les entrées sont supprimées automatiquement après 24h.
              </p>
            ) : (
              <div className="space-y-3">
                {paidTablesHistory.map((entry) => {
                  const orderTotal = Number(entry.total || 0);
                  const tipAmount = Number(entry.tipAmount || 0);
                  const paidTotal = orderTotal + tipAmount;
                  return (
                    <details key={entry.id} className="border-2 border-black bg-gray-50 p-3">
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-black uppercase">
                            T-{entry.tableNumber}
                            {Number(entry.covers || 0) > 0 ? ` | 👥 ${Number(entry.covers || 0)}` : ""}
                          </div>
                          <div className="text-sm font-bold">
                            {new Date(entry.closedAt).toLocaleString("fr-FR")} | {euro.format(paidTotal)}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-gray-700 font-semibold">
                          Paiement : {entry.paymentMethod}
                        </div>
                        <div className="mt-1 text-xs text-gray-700">
                          {tipAmount > 0
                            ? `${euro.format(paidTotal)} (dont ${euro.format(tipAmount)} de pourboire)`
                            : euro.format(orderTotal)}
                        </div>
                      </summary>
                      <div className="mt-3 space-y-2">
                        {(Array.isArray(entry.items) ? entry.items : []).map((item, idx) => (
                          <div key={`${entry.id}-item-${idx}`} className="flex items-start justify-between gap-2 bg-white border border-gray-200 p-2">
                            <div className="min-w-0">
                              <div className="font-bold">
                                {Number(item.quantity) || 1}x {getItemName(item)}
                                {formatItemInlineDetails(item) ? ` ${formatItemInlineDetails(item)}` : ""}
                              </div>
                              {getItemExtras(item).length > 0 ? (
                                <div className="text-xs text-gray-700">Suppléments : {getItemExtras(item).join(", ")}</div>
                              ) : null}
                              {getItemNotes(item).length > 0 ? (
                                <div className="text-xs text-gray-700">Notes : {getItemNotes(item).join(" | ")}</div>
                              ) : null}
                            </div>
                            <div className="font-black whitespace-nowrap">{euro.format(calcLineTotal(item))}</div>
                          </div>
                        ))}
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => void restorePaidTableFromHistory(entry)}
                            className="px-3 py-2 border-2 border-black bg-blue-600 text-white font-black"
                          >
                            Restaurer
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaidTablesHistory((prev) => prev.filter((row) => row.id !== entry.id))}
                            className="px-3 py-2 border-2 border-black bg-white font-black"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "inventaire" ? (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold uppercase bg-gray-200 p-2 rounded">Inventaire</h2>
            <span className="text-sm font-black">{inventory.length} articles</span>
          </div>
          <div className="space-y-3" translate="no">
            {inventory.length === 0 ? <p className="text-red-700 text-xl font-black text-center py-8">LA TABLE DISHES RENVOIE 0 LIGNE</p> : null}
            {inventory.map((item) => {
              const inStock = Boolean(item.active);
              return (
                <div key={String(item.id)} className="bg-white border-2 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold">{String(item.name || `Item ${item.id}`)}</div>
                    <div className="text-sm text-gray-600">{String(item.category || item.categorie || "Sans catégorie")} - {euro.format(Number(item.price || 0))}</div>
                  </div>
                  <button onClick={() => void toggleStock(item)} className={`px-3 py-2 border-2 border-black font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] ${inStock ? "bg-green-700" : "bg-red-700"}`}>
                    {inStock ? "En stock" : "Rupture"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {encaisseModalTable != null && modalTable ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border-2 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
              <div>
                <h3 className="text-2xl font-black uppercase">Paiement - Table {encaisseModalTable}</h3>
                <p className="text-sm font-semibold">Total : {euro.format(modalTable.total)}</p>
              </div>
              <button type="button" onClick={closePaymentModal} className="h-10 w-10 border-2 border-black inline-flex items-center justify-center bg-white" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 border-2 border-black bg-gray-50 p-3">
              <div className="mb-2 text-sm font-black uppercase">Mode de paiement</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod("Carte Bancaire")}
                  className={`flex items-center justify-center gap-2 border-2 border-black px-3 py-3 font-black ${
                    selectedPaymentMethod === "Carte Bancaire" ? "bg-emerald-600 text-white" : "bg-white text-black"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  Carte Bancaire
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod("Espèces")}
                  className={`flex items-center justify-center gap-2 border-2 border-black px-3 py-3 font-black ${
                    selectedPaymentMethod === "Espèces" ? "bg-amber-500 text-black" : "bg-white text-black"
                  }`}
                >
                  <Banknote className="h-4 w-4" />
                  Espèces
                </button>
              </div>
            </div>

            <div className="mb-4 border-2 border-black bg-white p-3">
              <label className="mb-1 block text-sm font-black uppercase">Pourboire (facultatif)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={tipAmountInput}
                onChange={(e) => setTipAmountInput(e.target.value)}
                placeholder="0.00"
                className="h-12 w-full border-2 border-black px-3 font-bold"
              />
              <p className="mt-2 text-sm font-semibold text-gray-700">
                Total encaissé : {euro.format(Number(modalTable.total || 0) + parsePriceNumber(tipAmountInput))}
              </p>
            </div>

            {paymentModalStep === "choice" ? (
              <div className="space-y-3">
                <button type="button" onClick={() => void runPaymentFlow("none")} disabled={paymentProcessing} className="w-full border-2 border-black bg-gray-100 p-4 text-left shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:bg-gray-300">
                  <div className="text-lg font-black">Pas de ticket</div>
                  <div className="text-sm text-gray-700 font-semibold">Encaisser et fermer sans impression ni email.</div>
                </button>
                <button type="button" onClick={() => void runPaymentFlow("thermal-print")} disabled={paymentProcessing} className="w-full border-2 border-black bg-indigo-600 text-white p-4 text-left shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:bg-indigo-300">
                  <div className="text-lg font-black flex items-center gap-2"><Printer className="h-5 w-5" />Imprimer le ticket</div>
                  <div className="text-sm text-indigo-100 font-semibold">Impression thermique 80mm (window.print).</div>
                </button>
                <button type="button" onClick={() => setPaymentModalStep("email")} disabled={paymentProcessing} className="w-full border-2 border-black bg-blue-600 text-white p-4 text-left shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:bg-blue-300">
                  <div className="text-lg font-black">Envoyer le ticket par mail</div>
                  <div className="text-sm text-blue-100 font-semibold">Saisir l&apos;email du client et envoyer le ticket.</div>
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-2 text-xs font-semibold text-gray-700">Paiement sélectionné : {selectedPaymentMethod}</div>
                <label className="block text-sm font-black mb-1">Email du client</label>
                <input type="email" value={ticketEmail} onChange={(e) => setTicketEmail(e.target.value)} placeholder="client@email.com" className="h-12 w-full border-2 border-black px-3" autoFocus />
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setPaymentModalStep("choice")} disabled={paymentProcessing || ticketSending} className="px-4 py-2 border-2 border-black bg-white font-black">Retour</button>
                  <button type="button" onClick={() => void runPaymentFlow("email")} disabled={paymentProcessing || ticketSending} className="px-4 py-2 border-2 border-black bg-blue-600 text-white font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:bg-blue-300 disabled:shadow-none">
                    {ticketSending ? "Envoi..." : "Payer + Envoyer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div id="thermal-ticket-print-root" aria-hidden="true">
        {thermalPrintPayload ? (
          <div className="thermal-ticket-card notranslate" translate="no">
            <div className="thermal-center thermal-title">{thermalPrintPayload.restaurantName || "Mon Restaurant"}</div>
            <div className="thermal-center">Table {thermalPrintPayload.tableNumber}</div>
            <div className="thermal-center">{new Date(thermalPrintPayload.paidAt).toLocaleString("fr-FR")}</div>
            <div className="thermal-center">Paiement : {thermalPrintPayload.paymentMethod}</div>
            <div className="thermal-sep" />
            {thermalPrintPayload.lines.map((line, idx) => {
              const qty = Math.max(1, Number(line.quantity) || 1);
              const baseUnit = Number(line.baseUnitPrice || 0);
              const suppUnit = Number(line.supplementUnitPrice || 0);
              const unitTotal = qty > 0 ? Number(line.lineTotal || 0) / qty : Number(line.lineTotal || 0);
              return (
                <div key={`thermal-line-${idx}`} className="thermal-line">
                  <div className="thermal-line-top">
                    <span>{qty}x {line.itemName}</span>
                    <span>{Number(line.lineTotal || 0).toFixed(2)} EUR</span>
                  </div>
                  {suppUnit > 0 ? (
                    <div className="thermal-line-sub">Base {baseUnit.toFixed(2)} + Supp. {suppUnit.toFixed(2)} = {unitTotal.toFixed(2)} EUR</div>
                  ) : qty > 1 ? (
                    <div className="thermal-line-sub">Prix unitaire {unitTotal.toFixed(2)} EUR</div>
                  ) : null}
                  {line.extras.length > 0 ? <div className="thermal-line-sub">Suppléments: {line.extras.join(", ")}</div> : null}
                  {line.notes.length > 0 ? <div className="thermal-line-sub">Notes: {line.notes.join(" | ")}</div> : null}
                </div>
              );
            })}
            <div className="thermal-sep" />
            <div className="thermal-line-top thermal-total"><span>Total TTC</span><span>{Number(thermalPrintPayload.totalTtc || 0).toFixed(2)} EUR</span></div>
            {Number(thermalPrintPayload.tipAmount || 0) > 0 ? (
              <>
                <div className="thermal-line-sub">Pourboire: {Number(thermalPrintPayload.tipAmount || 0).toFixed(2)} EUR</div>
                <div className="thermal-line-top thermal-total">
                  <span>Total encaissé</span>
                  <span>{(Number(thermalPrintPayload.totalTtc || 0) + Number(thermalPrintPayload.tipAmount || 0)).toFixed(2)} EUR</span>
                </div>
              </>
            ) : null}
            <div className="thermal-line-sub">Total HT: {(Number(thermalPrintPayload.totalTtc || 0) / 1.1).toFixed(2)} EUR</div>
            <div className="thermal-line-sub">TVA 10%: {(Number(thermalPrintPayload.totalTtc || 0) - Number(thermalPrintPayload.totalTtc || 0) / 1.1).toFixed(2)} EUR</div>
          </div>
        ) : null}
      </div>

      <style jsx global>{`
        #thermal-ticket-print-root {
          display: none;
        }
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm !important;
            background: #fff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #thermal-ticket-print-root,
          #thermal-ticket-print-root * {
            visibility: visible !important;
          }
          #thermal-ticket-print-root {
            display: block !important;
            position: fixed;
            inset: 0 auto auto 0;
            width: 80mm;
            background: #fff;
            padding: 0;
            margin: 0;
            z-index: 999999;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #thermal-ticket-print-root .thermal-ticket-card {
            width: 80mm;
            padding: 4mm 3mm;
            color: #000;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 11px;
            line-height: 1.25;
          }
          #thermal-ticket-print-root .thermal-center {
            text-align: center;
          }
          #thermal-ticket-print-root .thermal-title {
            font-weight: 700;
            font-size: 13px;
          }
          #thermal-ticket-print-root .thermal-sep {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          #thermal-ticket-print-root .thermal-line {
            margin-bottom: 4px;
          }
          #thermal-ticket-print-root .thermal-line-top {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            font-weight: 700;
          }
          #thermal-ticket-print-root .thermal-line-sub {
            font-size: 10px;
            white-space: normal;
            margin-top: 1px;
          }
          #thermal-ticket-print-root .thermal-total {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}

