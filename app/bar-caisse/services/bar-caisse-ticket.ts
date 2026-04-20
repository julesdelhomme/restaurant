import { jsPDF } from "jspdf";

import type {
  Order,
  OrderItem,
  PaymentMethodLabel,
  RestaurantSocialLinks,
  TicketLinePayload,
  TicketPayload,
} from "../bar-caisse-helpers";
import {
  buildFeedbackUrlWithItems,
  calcLineBreakdown,
  detectUiLang,
  getCategory,
  getItemExtras,
  getItemName,
  getItemNotes,
  getReceiptSocialPrompt,
  isItemPaid,
  normalizeStatusKey,
  normalizeUrl,
  parseItems,
  parsePriceNumber,
} from "../bar-caisse-helpers";

export function createTicketPayloadForTable(params: {
  tableNumber: number;
  activeOrders: Order[];
  paidAtIso?: string;
  paymentMethod: PaymentMethodLabel;
  tipAmountRaw: unknown;
  restaurantName: string;
  restaurantAddress: string;
  restaurantLogoUrl: string;
  restaurantSocialLinks: RestaurantSocialLinks;
  showSocialOnReceipt: boolean;
}): TicketPayload | null {
  const {
    tableNumber,
    activeOrders,
    paidAtIso,
    paymentMethod,
    tipAmountRaw,
    restaurantName,
    restaurantAddress,
    restaurantLogoUrl,
    restaurantSocialLinks,
    showSocialOnReceipt,
  } = params;

  const tableOrders = activeOrders.filter((o) => Number(o.table_number) === Number(tableNumber));
  if (tableOrders.length === 0) return null;

  let totalTtc = 0;
  const tipAmount = parsePriceNumber(tipAmountRaw);
  const lines: TicketLinePayload[] = [];
  const latestOrder = [...tableOrders].sort(
    (a, b) => new Date(String(b.created_at || 0)).getTime() - new Date(String(a.created_at || 0)).getTime()
  )[0];

  tableOrders.forEach((order) => {
    parseItems(order.items)
      .filter((item) => !isItemPaid(item))
      .forEach((item) => {
        const breakdown = calcLineBreakdown(item);
        totalTtc += breakdown.lineTotal;
        lines.push({
          dishId: (item.dish_id ?? item.id) as string | number | undefined,
          quantity: breakdown.quantity,
          itemName: getItemName(item),
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
    restaurantAddress,
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
    feedbackUrl: buildFeedbackUrlWithItems(latestOrder?.id, lines),
  };
}

export function createTicketPayloadFromItems(params: {
  tableNumber: number;
  items: OrderItem[];
  paidAtIso: string;
  paymentMethod: PaymentMethodLabel;
  tipAmountRaw: unknown;
  orderIdOverride?: string | number | null;
  restaurantName: string;
  restaurantAddress: string;
  restaurantLogoUrl: string;
  restaurantSocialLinks: RestaurantSocialLinks;
  showSocialOnReceipt: boolean;
}): TicketPayload | null {
  const {
    tableNumber,
    items,
    paidAtIso,
    paymentMethod,
    tipAmountRaw,
    orderIdOverride,
    restaurantName,
    restaurantAddress,
    restaurantLogoUrl,
    restaurantSocialLinks,
    showSocialOnReceipt,
  } = params;

  const safeItems = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) return null;

  const tipAmount = parsePriceNumber(tipAmountRaw);
  const lines: TicketLinePayload[] = [];
  let totalTtc = 0;
  safeItems.forEach((item) => {
    const breakdown = calcLineBreakdown(item);
    totalTtc += breakdown.lineTotal;
    lines.push({
      dishId: (item.dish_id ?? item.id) as string | number | undefined,
      quantity: breakdown.quantity,
      itemName: getItemName(item),
      category: getCategory(item),
      baseUnitPrice: breakdown.baseUnitPrice,
      supplementUnitPrice: breakdown.supplementUnitPrice,
      lineTotal: breakdown.lineTotal,
      extras: getItemExtras(item),
      notes: getItemNotes(item),
    });
  });
  if (lines.length === 0) return null;

  return {
    orderId: orderIdOverride ?? undefined,
    restaurantName: restaurantName || "Mon Restaurant",
    restaurantAddress,
    restaurantLogoUrl,
    lang: detectUiLang(),
    tableNumber,
    paidAt: paidAtIso,
    paymentMethod,
    countryCode: "FR",
    totalTtc,
    tipAmount,
    lines,
    socialLinks: restaurantSocialLinks,
    showSocialOnReceipt,
    feedbackUrl: buildFeedbackUrlWithItems(orderIdOverride, lines),
  };
}

export function createTicketPayloadFromRealtimeOrder(params: {
  orderRow: Record<string, unknown>;
  restaurantName: string;
  restaurantAddress: string;
  restaurantLogoUrl: string;
  restaurantSocialLinks: RestaurantSocialLinks;
  showSocialOnReceipt: boolean;
}): TicketPayload | null {
  const { orderRow, restaurantName, restaurantAddress, restaurantLogoUrl, restaurantSocialLinks, showSocialOnReceipt } =
    params;

  const tableNumber = Number(orderRow.table_number);
  if (!Number.isFinite(tableNumber) || tableNumber <= 0) return null;
  const items = parseItems(orderRow.items);
  if (items.length === 0) return null;

  const lines: TicketLinePayload[] = [];
  let totalTtc = 0;
  items.forEach((item) => {
    const breakdown = calcLineBreakdown(item);
    totalTtc += breakdown.lineTotal;
    lines.push({
      dishId: (item.dish_id ?? item.id) as string | number | undefined,
      quantity: breakdown.quantity,
      itemName: getItemName(item),
      category: getCategory(item),
      baseUnitPrice: breakdown.baseUnitPrice,
      supplementUnitPrice: breakdown.supplementUnitPrice,
      lineTotal: breakdown.lineTotal,
      extras: getItemExtras(item),
      notes: getItemNotes(item),
    });
  });
  if (lines.length === 0) return null;

  const normalizedStatus = normalizeStatusKey(orderRow.status);
  const paymentMethod =
    normalizedStatus === "confirmed" || normalizedStatus === "confirme" || normalizedStatus === "confirmee"
      ? "Commande confirmee"
      : "Carte Bancaire";
  const paidAt =
    String(orderRow.paid_at || orderRow.closed_at || orderRow.updated_at || "").trim() || new Date().toISOString();

  return {
    orderId: (orderRow.id as string | number | undefined) ?? undefined,
    restaurantName: restaurantName || "Mon Restaurant",
    restaurantAddress,
    restaurantLogoUrl,
    lang: detectUiLang(),
    tableNumber,
    paidAt,
    paymentMethod,
    countryCode: "FR",
    totalTtc,
    tipAmount: parsePriceNumber(orderRow.tip_amount ?? orderRow.tips),
    lines,
    socialLinks: restaurantSocialLinks,
    showSocialOnReceipt,
    feedbackUrl: buildFeedbackUrlWithItems(orderRow.id, lines),
  };
}

export function buildTicketPdf(payload: TicketPayload) {
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
  if (String(payload.restaurantAddress || "").trim()) {
    printLine(`Adresse: ${String(payload.restaurantAddress || "").trim()}`, undefined, false, true);
  }
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
    if (line.extras.length > 0) printLine(`Supplements : ${line.extras.join(", ")}`, undefined, false, true);
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

  const feedbackUrl = normalizeUrl(payload.feedbackUrl);
  if (feedbackUrl) {
    y += 12;
    doc.line(margin, y, width - margin, y);
    y += 16;
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Donner votre avis :", margin, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235);
    const docWithLink = doc as unknown as {
      textWithLink?: (text: string, x: number, y: number, options: { url: string }) => void;
    };
    if (typeof docWithLink.textWithLink === "function") {
      docWithLink.textWithLink(feedbackUrl, margin, y, { url: feedbackUrl });
    } else {
      doc.text(feedbackUrl, margin, y);
    }
    doc.setTextColor(0, 0, 0);
  }

  const dataUri = doc.output("datauristring");
  const pdfBase64 = String(dataUri).replace(/^data:application\/pdf;filename=generated\.pdf;base64,/, "");
  const blobUrl = doc.output("bloburl");
  return { doc, dataUri, pdfBase64, blobUrl };
}

export async function sendTicketEmail(params: {
  email: string;
  payload: TicketPayload;
  restaurantId: string | number | null;
  settingsRowId: string;
}) {
  const { email, payload, restaurantId, settingsRowId } = params;
  const to = email.trim();
  if (!to) throw new Error("Adresse email requise.");
  const { pdfBase64 } = buildTicketPdf(payload);
  const response = await fetch("/api/send-ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to,
      tableNumber: payload.tableNumber,
      restaurantId: String(restaurantId ?? settingsRowId),
      pdfBase64,
      ticketPayload: payload,
    }),
  });
  const json = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!response.ok) throw new Error(String(json.error || "Echec de l'envoi email."));
  return json;
}
