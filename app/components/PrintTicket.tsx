"use client";

import React, { useMemo, useRef, useEffect } from "react";

interface OrderItem {
  dish?: {
    name?: string;
    nom?: string;
    price?: number;
    categorie?: string;
    category?: string;
  };
  name?: string;
  categorie?: string;
  category?: string;
  quantity?: number;
  price?: number;
  cooking?: string | null;
  cuisson?: string | null;
  selected_cooking_label_fr?: string | null;
  selected_cooking?: string | null;
  selected_option_name?: string | null;
  selected_option?: unknown;
  selected_options?: unknown;
  options?: unknown;
  side?: unknown;
  accompaniment?: unknown;
  accompagnement?: unknown;
  accompaniments?: unknown;
  accompagnements?: unknown;
  details?: unknown;
  detail?: unknown;
  notes?: unknown;
  special_request?: string;
  instructions?: string;
  [key: string]: unknown;
}

interface Order {
  id: string;
  table_number: number;
  items: unknown;
  status: string;
  created_at: string;
  notes?: string;
}

interface PrintTicketProps {
  order: Order | null;
  isVisible: boolean;
  logoUrl?: string;
  restaurantName?: string;
  categoryFilter?: 'drinks' | 'food' | null;
}

function normalizeTextKey(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function uniqueTexts(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = normalizeTextKey(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function flattenChoiceTexts(value: unknown): string[] {
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
}

function buildTicketDetailLine(item: OrderItem) {
  const record = item as Record<string, unknown>;
  const cookingValues: string[] = [];
  const optionValues: string[] = [];
  const accompanimentValues: string[] = [];
  const remarkValues: string[] = [];

  const parseSegment = (segmentRaw: unknown) => {
    const segment = String(segmentRaw || "")
      .replace(/^details?\s*:\s*/i, "")
      .replace(/^notes?\s*:\s*/i, "")
      .trim();
    if (!segment) return;
    if (/^cuisson\s*:/i.test(segment)) {
      cookingValues.push(segment.replace(/^cuisson\s*:\s*/i, "").trim());
      return;
    }
    if (/^(option|options|suppl[eé]ments?|supplements?)\s*:/i.test(segment)) {
      optionValues.push(segment.replace(/^(option|options|suppl[eé]ments?|supplements?)\s*:\s*/i, "").trim());
      return;
    }
    if (/^(accompagnement|accompagnements|side|sides)\s*:/i.test(segment)) {
      accompanimentValues.push(
        segment.replace(/^(accompagnement|accompagnements|side|sides)\s*:\s*/i, "").trim()
      );
      return;
    }
    if (/^(pr[eé]cisions?|commentaire cuisine|remarque|remarks?)\s*:/i.test(segment)) {
      remarkValues.push(segment.replace(/^(pr[eé]cisions?|commentaire cuisine|remarque|remarks?)\s*:\s*/i, "").trim());
      return;
    }
    remarkValues.push(segment);
  };

  cookingValues.push(
    ...[
      String(item.cooking || "").trim(),
      String(item.cuisson || "").trim(),
      String(item.selected_cooking_label_fr || "").trim(),
      String(item.selected_cooking || "").trim(),
    ].filter(Boolean)
  );
  optionValues.push(
    ...[
      String(item.selected_option_name || "").trim(),
      ...flattenChoiceTexts(item.selected_option),
      ...flattenChoiceTexts(record.selected_options ?? record.options),
    ].filter(Boolean)
  );
  accompanimentValues.push(
    ...[
      ...flattenChoiceTexts(item.side),
      ...flattenChoiceTexts(item.accompaniment),
      ...flattenChoiceTexts(item.accompagnement),
      ...flattenChoiceTexts(item.accompaniments),
      ...flattenChoiceTexts(item.accompagnements),
    ].filter(Boolean)
  );
  [item.special_request, item.instructions, record.details, record.detail, record.notes]
    .flatMap((entry) => (typeof entry === "string" ? String(entry).split("|") : flattenChoiceTexts(entry)))
    .forEach((segment) => parseSegment(segment));

  const cooking = uniqueTexts(cookingValues);
  const options = uniqueTexts(optionValues);
  const accompaniments = uniqueTexts(accompanimentValues);
  const remarks = uniqueTexts(remarkValues).filter((remark) => {
    const key = normalizeTextKey(remark);
    return ![...cooking, ...options, ...accompaniments].some((value) => normalizeTextKey(value) === key);
  });

  const parts: string[] = [];
  if (cooking.length > 0) parts.push(`Cuisson: ${cooking.join(", ")}`);
  if (options.length > 0) parts.push(`Options: ${options.join(", ")}`);
  if (accompaniments.length > 0) parts.push(`Accompagnement: ${accompaniments.join(", ")}`);
  if (remarks.length > 0) parts.push(`Remarque: ${remarks.join(" | ")}`);
  return parts.join(" | ");
}

function buildTicketFinalDetailsLine(item: OrderItem) {
  const record = item as Record<string, unknown>;
  const normalize = (value: unknown) =>
    String(value || "")
      .replace(/^[-•]\s*/, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  const splitByComma = (value: unknown) =>
    normalize(value)
      .split(",")
      .map((part) => normalize(part))
      .filter(Boolean);
  const unique = (values: string[]) => {
    const seen = new Set<string>();
    return values
      .map((value) => normalize(value))
      .filter(Boolean)
      .filter((value) => {
        const key = normalizeTextKey(value);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  const cooking: string[] = [];
  const accompaniments: string[] = [];
  const supplements: string[] = [];
  const options: string[] = [];
  const remarks: string[] = [];

  const selectedOptionsRaw = record.selected_options ?? record.options;
  const selectedOptions = Array.isArray(selectedOptionsRaw)
    ? selectedOptionsRaw
    : selectedOptionsRaw && typeof selectedOptionsRaw === "object"
      ? Object.values(selectedOptionsRaw as Record<string, unknown>)
      : [];

  const routeSegment = (raw: unknown) => {
    const segment = normalize(raw)
      .replace(/^details?\s*:\s*/i, "")
      .replace(/^notes?\s*:\s*/i, "")
      .replace(/^propos?\s*:\s*/i, "")
      .trim();
    if (!segment) return;
    if (/^(cuisson|cooking|cui)\s*:/i.test(segment)) {
      cooking.push(...splitByComma(segment.replace(/^(cuisson|cooking|cui)\s*:\s*/i, "")));
      return;
    }
    if (/^(accompagnement|accompagnements|side|sides|acc)\s*:/i.test(segment)) {
      accompaniments.push(...splitByComma(segment.replace(/^(accompagnement|accompagnements|side|sides|acc)\s*:\s*/i, "")));
      return;
    }
    if (/^(suppl[eé]ments?|supplements?|extras?|sup)\s*:/i.test(segment)) {
      supplements.push(...splitByComma(segment.replace(/^(suppl[eé]ments?|supplements?|extras?|sup)\s*:\s*/i, "")));
      return;
    }
    if (/^(option|options|op)\s*:/i.test(segment)) {
      options.push(...splitByComma(segment.replace(/^(option|options|op)\s*:\s*/i, "")));
      return;
    }
    if (/^(pr[eé]cisions?|commentaire cuisine|remarque|remarks?|rq)\s*:/i.test(segment)) {
      remarks.push(...splitByComma(segment.replace(/^(pr[eé]cisions?|commentaire cuisine|remarque|remarks?|rq)\s*:\s*/i, "")));
      return;
    }
    remarks.push(...splitByComma(segment));
  };

  cooking.push(
    ...[
      item.cooking,
      item.cuisson,
      item.selected_cooking_label_fr,
      item.selected_cooking,
    ]
      .map((value) => normalize(value))
      .filter(Boolean)
  );

  accompaniments.push(
    ...[
      ...flattenChoiceTexts(item.side),
      ...flattenChoiceTexts(item.accompaniment),
      ...flattenChoiceTexts(item.accompagnement),
      ...flattenChoiceTexts(item.accompaniments),
      ...flattenChoiceTexts(item.accompagnements),
    ]
      .flatMap((value) => splitByComma(value))
      .filter(Boolean)
  );

  supplements.push(
    ...[
      ...flattenChoiceTexts(record.supplement),
      ...flattenChoiceTexts(record.supplements),
      ...flattenChoiceTexts(record.selected_extras),
      ...flattenChoiceTexts(record.selectedExtras),
    ]
      .flatMap((value) => splitByComma(value))
      .filter(Boolean)
  );

  options.push(
    ...[
      item.selected_option_name,
      ...flattenChoiceTexts(item.selected_option),
    ]
      .flatMap((value) => splitByComma(value))
      .filter(Boolean)
  );

  selectedOptions.forEach((entry) => {
    if (entry == null) return;
    if (typeof entry === "string" || typeof entry === "number") {
      routeSegment(entry);
      return;
    }
    const row = entry as Record<string, unknown>;
    const kind = normalizeTextKey(row.kind || row.type || row.key || row.group || row.category || "");
    const values = flattenChoiceTexts(
      row.values ?? row.value ?? row.selection ?? row.selected ?? row.choice ?? row.option ?? row
    );
    if (/(cooking|cuisson|garstufe|cocc)/.test(kind)) {
      cooking.push(...values.flatMap((value) => splitByComma(value)));
      return;
    }
    if (/(side|accompagnement|acomp|beilage)/.test(kind)) {
      accompaniments.push(...values.flatMap((value) => splitByComma(value)));
      return;
    }
    if (/(extra|supplement|suplemento)/.test(kind)) {
      supplements.push(...values.flatMap((value) => splitByComma(value)));
      return;
    }
    if (/(option|variant|variante|format|taille)/.test(kind)) {
      options.push(...values.flatMap((value) => splitByComma(value)));
      return;
    }
    values.forEach((value) => routeSegment(value));
  });

  [item.special_request, item.instructions, record.details, record.detail, record.notes]
    .flatMap((entry) => (typeof entry === "string" ? String(entry).split("|") : flattenChoiceTexts(entry)))
    .forEach((entry) => routeSegment(entry));

  const cVals = unique(cooking);
  const accVals = unique(accompaniments);
  const supVals = unique(supplements);
  const opVals = unique(options);
  const rqVals = unique(remarks).filter((remark) => {
    const remarkKey = normalizeTextKey(remark);
    return ![...accVals, ...opVals].some((value) => normalizeTextKey(value) === remarkKey);
  });

  const chunks: string[] = [];
  if (cVals.length > 0) chunks.push(`CUI : ${cVals.join(" / ")}`);
  if (accVals.length > 0) chunks.push(`ACC : ${accVals.join(" / ")}`);
  if (supVals.length > 0) chunks.push(`SUP : ${supVals.join(" / ")}`);
  if (opVals.length > 0) chunks.push(`OP : ${opVals.join(" / ")}`);
  if (rqVals.length > 0) chunks.push(`RQ : ${rqVals.join(" / ")}`);
  return chunks.join(", ");
}

export default function PrintTicket({ order, isVisible, logoUrl, restaurantName, categoryFilter }: PrintTicketProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const parsedItems = useMemo<OrderItem[]>(() => {
    const raw = order?.items;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as OrderItem[];
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw || "[]");
        return Array.isArray(parsed) ? (parsed as OrderItem[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [order?.items]);

  const filteredItems = useMemo(() => {
    return parsedItems.filter((item) => {
      if (!categoryFilter) return true;
      const category = (item?.categorie || item?.category || "").toLowerCase();
      const isDrink = category === "boisson" || category === "boissons";
      return categoryFilter === 'drinks' ? isDrink : !isDrink;
    });
  }, [parsedItems, categoryFilter]);

  useEffect(() => {
    if (isVisible && order && iframeRef.current && filteredItems.length > 0) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(`
          <html>
            <head>
              <style>
                body {
                  font-family: monospace;
                  font-size: 14px;
                  line-height: 1.2;
                  margin: 0;
                  padding: 0;
                  color: #000;
                  background: #fff;
                }
                .ticket {
                  border: 1px dashed #000;
                  padding: 10px;
                  max-width: 80mm;
                  margin: 0 auto;
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
                    visibility: visible !important;
                  }
                  .ticket {
                    border: 1px dashed #000 !important;
                    padding: 10px !important;
                    margin: 0 !important;
                    width: 80mm !important;
                  }
                }
              </style>
            </head>
            <body>
              <div class="ticket">
                ${(logoUrl || restaurantName) ? `
                  <div style="text-align: center; margin-bottom: 10px;">
                    ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height: 40px; object-fit: contain;" />` : ''}
                    ${restaurantName ? `<div style="font-weight: bold;">${restaurantName}</div>` : ''}
                  </div>
                ` : ''}
                <div style="text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 5px;">TABLE ${order.table_number}</div>
                <div style="text-align: center; font-size: 12px; margin-bottom: 10px;">
                  ${new Date(order.created_at).toLocaleTimeString("fr-FR")}
                </div>
                <div style="border-bottom: 1px dashed #000; margin-bottom: 10px;"></div>
                <div>
                  ${filteredItems.map((item, index) => {
                    const itemName = item?.name || "Plat inconnu";
                    const finalDetails = buildTicketFinalDetailsLine(item);
                    return `
                      <div style="margin-bottom: 5px;">
                        <div style="display: flex; justify-content: space-between;">
                          <span>${item?.quantity || 0}x</span>
                          <span style="flex: 1; margin-left: 10px;">${itemName}</span>
                        </div>
                        ${finalDetails ? `
                          <span style="color: #000; font-weight: bold; font-size: 12px;">
                            - ${finalDetails}
                          </span>
                        ` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </body>
          </html>
        `);
        iframeDoc.close();

        // Trigger print after a short delay
        setTimeout(() => {
          iframe.contentWindow?.print();
        }, 100);
      }
    }
  }, [isVisible, order, logoUrl, restaurantName, categoryFilter, filteredItems]);

  return (
    <iframe
      ref={iframeRef}
      style={{ display: 'none' }}
      title="Print Ticket"
    />
  );
}
