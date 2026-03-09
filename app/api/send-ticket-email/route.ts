import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

type TicketLinePayload = {
  dishId?: string | number;
  quantity?: number;
  itemName?: string;
  category?: string;
  baseUnitPrice?: number;
  supplementUnitPrice?: number;
  lineTotal?: number;
  extras?: string[];
  notes?: string[];
};

type TicketPayload = {
  orderId?: string | number;
  restaurantName?: string;
  restaurantLogoUrl?: string;
  lang?: string;
  tableNumber?: number | string;
  paidAt?: string;
  paymentMethod?: string;
  countryCode?: string;
  totalTtc?: number;
  lines?: TicketLinePayload[];
  items?: unknown;
  order_items?: unknown;
};

type SendTicketRequest = {
  to?: string;
  tableNumber?: number | string;
  restaurantId?: string;
  restaurant_id?: string;
  pdfBase64?: string;
  emailTemplate?: string;
  ticketPayload?: TicketPayload;
};

const isValidEmail = (value: unknown) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const escapeHtml = (value: unknown) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const parseObjectRecord = (raw: unknown): Record<string, unknown> => {
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
};

const formatEuro = (value: number) =>
  Number(value || 0).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const DEFAULT_EMAIL_SUBJECT_TEMPLATE = "Votre ticket";
const DEFAULT_EMAIL_BODY_HEADER = "Merci de votre visite";
const DEFAULT_EMAIL_FOOTER = "À bientôt";

const getSocialPromptByLang = (langRaw: unknown) => {
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
};

const replaceEmailPlaceholders = (
  input: string,
  values: { restaurantName: string; tableNumber: string }
) =>
  String(input || "")
    .replaceAll("{{RESTAURANT_NAME}}", values.restaurantName)
    .replaceAll("[Resto Name]", values.restaurantName)
    .replaceAll("{{TABLE_NUMBER}}", values.tableNumber)
    .replaceAll("[Table Number]", values.tableNumber);

const resolveVatRatesByCountry = (countryCodeRaw: string) => {
  const code = String(countryCodeRaw || "FR").trim().toUpperCase();
  if (code === "DE") return { reduced: 7, standard: 19 };
  if (code === "ES") return { reduced: 10, standard: 21 };
  if (code === "BE") return { reduced: 12, standard: 21 };
  if (code === "IT") return { reduced: 10, standard: 22 };
  return { reduced: 10, standard: 20 };
};

const defaultEmailTemplate = `
<div style="font-family:Arial,Helvetica,sans-serif;color:#111;">
  <p>{{EMAIL_BODY_HEADER}}</p>
  {{CONTENU_TICKET}}
  <p>{{EMAIL_FOOTER}}</p>
</div>
`.trim();

function buildBaseEmailTemplate(
  restaurantName: string,
  restaurantLogoUrl: string,
  emailBodyHeader: string,
  emailFooter: string
) {
  const safeName = escapeHtml(restaurantName || "Mon Restaurant");
  const logoUrl = String(restaurantLogoUrl || "").trim();
  const logoBlock = logoUrl
    ? `
    <div style="margin-bottom:12px;text-align:center;">
      <img src="${escapeHtml(logoUrl)}" alt="Logo ${safeName}" style="max-width:160px;max-height:80px;object-fit:contain;" />
    </div>
  `
    : "";

  return `
<div style="font-family:Arial,Helvetica,sans-serif;color:#111;">
  ${logoBlock}
  <p style="margin:0 0 12px 0;">${escapeHtml(emailBodyHeader || DEFAULT_EMAIL_BODY_HEADER)}</p>
  {{CONTENU_TICKET}}
  <p style="margin:14px 0 0 0;">${escapeHtml(emailFooter || DEFAULT_EMAIL_FOOTER)}</p>
</div>
`.trim();
}

function buildFeedbackSectionHtml(origin: string, payload: TicketPayload) {
  const orderId = String(payload.orderId || "").trim();
  if (!orderId) return "";
  const baseOrigin = String(process.env.NEXT_PUBLIC_BASE_URL || "").trim() || String(origin || "").trim();
  const baseUrl = `${baseOrigin.replace(/\/+$/, "")}/feedback/${encodeURIComponent(orderId)}`;

  return `
    <div style="margin-top:16px;border-top:1px solid #e5e7eb;padding-top:12px;">
      <div style="font-size:15px;font-weight:700;margin-bottom:8px;">Donnez votre avis</div>
      <a href="${escapeHtml(baseUrl)}" style="display:inline-block;text-decoration:none;background:#111827;color:#fff;padding:12px 16px;border-radius:8px;font-weight:700;font-size:14px;">
        Donnez votre avis sur votre expérience du jour
      </a>
    </div>
  `.trim();
}

function buildSocialReceiptSectionHtml(restaurantRow: Record<string, unknown>, payload: TicketPayload) {
  const tableConfig = parseObjectRecord(restaurantRow.table_config);
  const enabled = Boolean(tableConfig.show_social_on_digital_receipt ?? tableConfig.show_social_on_receipt);
  if (!enabled) return "";
  const socialLinks = parseObjectRecord(tableConfig.social_links);
  const entries = [
    { key: "instagram", label: "Instagram", icon: "IG", color: "#E1306C" },
    { key: "snapchat", label: "Snapchat", icon: "SC", color: "#FFFC00", text: "#111" },
    { key: "facebook", label: "Facebook", icon: "f", color: "#1877F2" },
    { key: "x", label: "X", icon: "X", color: "#111111" },
    { key: "website", label: "Site Web", icon: "WWW", color: "#2563EB" },
  ]
    .map((item) => {
      const url = String(socialLinks[item.key] || "").trim();
      return url ? { ...item, url } : null;
    })
    .filter(Boolean) as Array<{ label: string; icon: string; color: string; url: string; text?: string }>;
  if (entries.length === 0) return "";

  const prompt = getSocialPromptByLang(payload.lang);
  const linksHtml = entries
    .map(
      (entry) => `
      <a href="${escapeHtml(entry.url)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;text-decoration:none;border:1px solid #d1d5db;border-radius:999px;padding:6px 10px;background:#fff;">
        <span style="display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;border-radius:999px;background:${entry.color};color:${entry.text || "#fff"};font-size:11px;font-weight:700;padding:0 6px;">${escapeHtml(entry.icon)}</span>
        <span style="font-size:13px;font-weight:600;color:#111;">${escapeHtml(entry.label)}</span>
      </a>
    `.trim()
    )
    .join("\n");

  return `
    <div style="margin-top:16px;border-top:1px solid #e5e7eb;padding-top:12px;">
      <div style="font-size:14px;font-weight:700;margin-bottom:8px;">${escapeHtml(prompt)}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${linksHtml}
      </div>
    </div>
  `.trim();
}

function buildTicketContentHtml(payload: TicketPayload) {
  const restaurantName = String(payload.restaurantName || "Mon Restaurant").trim() || "Mon Restaurant";
  const tableNumber = String(payload.tableNumber || "").trim();
  const paidAt = new Date(String(payload.paidAt || new Date().toISOString()));
  const paidAtDisplay = Number.isNaN(paidAt.getTime()) ? new Date().toLocaleString("fr-FR") : paidAt.toLocaleString("fr-FR");
  const paymentMethod = String(payload.paymentMethod || "Non renseigne").trim() || "Non renseigne";
  const parseRawItems = (raw: unknown): Array<Record<string, unknown>> => {
    const flattenFromObject = (record: Record<string, unknown>): Array<Record<string, unknown>> => {
      const nestedCandidates = [
        record.items,
        record.order_items,
        record.kitchenItems,
        record.barItems,
        record.kitchen_items,
        record.bar_items,
      ];
      const nested = nestedCandidates.flatMap((candidate) => parseRawItems(candidate));
      if (nested.length > 0) return nested;
      const looksLikeItem =
        ["dish_id", "id", "itemName", "item_name", "name", "product_name", "label", "title"].some((key) => key in record) &&
        ["price", "unit_total_price", "line_total", "total", "total_price"].some((key) => key in record);
      if (looksLikeItem) return [record];
      return Object.values(record).flatMap((candidate) => parseRawItems(candidate));
    };

    if (Array.isArray(raw)) {
      return raw.flatMap((row) => {
        if (Array.isArray(row)) return parseRawItems(row);
        if (row && typeof row === "object") return [row as Record<string, unknown>];
        return [];
      });
    }
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return parseRawItems(parsed);
      } catch {
        return [];
      }
    }
    if (raw && typeof raw === "object") {
      return flattenFromObject(raw as Record<string, unknown>);
    }
    return [];
  };

  const fallbackLinesFromItems = (() => {
    const parsedPayloadItems = parseRawItems(payload.items);
    const rawItems = parsedPayloadItems.length > 0 ? parsedPayloadItems : parseRawItems(payload.order_items);
    return rawItems.map((item) => {
      const quantity = Math.max(1, Number(item.quantity ?? item.qty ?? 1) || 1);
      const itemName =
        String(
          item.itemName ??
            item.item_name ??
            item.name ??
            item.product_name ??
            item.label ??
            item.title ??
            ""
        ).trim() || "Article";
      const unitPrice = Number(item.unit_total_price ?? item.price ?? 0);
      const lineTotal = Number(item.line_total ?? item.total ?? item.total_price ?? unitPrice * quantity);
      const selectedExtras = Array.isArray(item.selectedExtras)
        ? item.selectedExtras
        : Array.isArray(item.selected_extras)
          ? item.selected_extras
          : [];
      const extras = selectedExtras
        .map((row) => {
          if (!row) return "";
          if (typeof row === "string") return row.trim();
          if (typeof row === "object") {
            const rec = row as Record<string, unknown>;
            return String(rec.name ?? rec.label_fr ?? rec.name_fr ?? "").trim();
          }
          return "";
        })
        .filter(Boolean);
      const notes = [
        String(item.instructions || "").trim(),
        String(item.special_request || "").trim(),
      ].filter(Boolean);
      return {
        quantity,
        itemName,
        lineTotal: Number.isFinite(lineTotal) ? lineTotal : unitPrice * quantity,
        baseUnitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
        supplementUnitPrice: 0,
        extras,
        notes,
      } as TicketLinePayload;
    });
  })();

  const payloadLines = Array.isArray(payload.lines) ? payload.lines : [];
  const lines = payloadLines.length > 0 ? payloadLines : fallbackLinesFromItems;
  const lineRowsHtml = lines
    .map((line) => {
      const quantity = Number(line.quantity || 0);
      if (!Number.isFinite(quantity) || quantity <= 0) return "";
      const lineRecord = line as unknown as Record<string, unknown>;
      const itemName =
        String(line.itemName || lineRecord.name || lineRecord.product_name || lineRecord.label || lineRecord.title || lineRecord.display_name || "").trim() ||
        "Unknown item";
      const lineTotal = Number(line.lineTotal || 0);
      const unitPrice = quantity > 0 ? lineTotal / quantity : lineTotal;
      const baseUnitPrice = Number((line as Record<string, unknown>).baseUnitPrice || 0);
      const supplementUnitPrice = Number((line as Record<string, unknown>).supplementUnitPrice || 0);
      const unitPriceDisplay = Number.isFinite(unitPrice) ? unitPrice : 0;
      const lineTotalDisplay = Number.isFinite(lineTotal) ? lineTotal : unitPriceDisplay * quantity;

      const extras = Array.isArray(line.extras)
        ? line.extras.map((entry) => String(entry || "").trim()).filter(Boolean)
        : [];
      const notes = Array.isArray(line.notes)
        ? line.notes.map((entry) => String(entry || "").trim()).filter(Boolean)
        : [];
      const extraLine =
        extras.length > 0
          ? `<div style="font-size:12px;font-style:italic;color:#555;">Supplements : ${escapeHtml(extras.join(", "))}</div>`
          : "";
      const noteLine =
        notes.length > 0
          ? `<div style="font-size:12px;font-style:italic;color:#555;">Precisions : ${escapeHtml(notes.join(" | "))}</div>`
          : "";
      const breakdownLine =
        supplementUnitPrice > 0
          ? `<div style="font-size:12px;color:#555;">Base ${escapeHtml(formatEuro(baseUnitPrice))} + Suppléments ${escapeHtml(
              formatEuro(supplementUnitPrice)
            )} = ${escapeHtml(formatEuro(unitPriceDisplay))} / unité</div>`
          : quantity > 1
            ? `<div style="font-size:12px;color:#555;">Total ligne ${escapeHtml(formatEuro(lineTotalDisplay))}</div>`
            : "";
      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">
            <div style="font-weight:600;">${escapeHtml(itemName)}</div>
            ${breakdownLine}
            ${extraLine}
            ${noteLine}
          </td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">
            <div>${escapeHtml(formatEuro(unitPriceDisplay))}</div>
            ${quantity > 1 ? `<div style="font-size:12px;color:#555;">x ${quantity} = ${escapeHtml(formatEuro(lineTotalDisplay))}</div>` : ""}
          </td>
        </tr>
      `;
    })
    .filter(Boolean)
    .join("");
  const computedTotalTtc = lines.reduce((sum, line) => {
    const q = Math.max(1, Number(line.quantity || 1) || 1);
    const lt = Number(line.lineTotal);
    if (Number.isFinite(lt)) return sum + lt;
    const unit = Number((line as Record<string, unknown>).baseUnitPrice ?? 0);
    return sum + (Number.isFinite(unit) ? unit * q : 0);
  }, 0);
  const totalTtc = computedTotalTtc > 0 ? computedTotalTtc : Number(payload.totalTtc || 0);
  const totalHt = totalTtc / 1.1;
  const vatAmount10 = totalTtc - totalHt;

  const ticketBodyRows =
    lineRowsHtml ||
    `
    <tr>
      <td colspan="3" style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;color:#666;">Aucun article</td>
    </tr>
  `;

  return `
    <div style="border:1px solid #d1d5db;border-radius:8px;padding:16px;background:#fff;">
      <div style="margin-bottom:12px;">
        <div style="font-size:18px;font-weight:700;">${escapeHtml(restaurantName)}</div>
        <div style="font-size:13px;color:#333;">Date : ${escapeHtml(paidAtDisplay)}</div>
        <div style="font-size:13px;color:#333;">Table : ${escapeHtml(tableNumber)}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px;text-align:center;border-bottom:1px solid #d1d5db;">Quantite</th>
            <th style="padding:8px;text-align:left;border-bottom:1px solid #d1d5db;">Article</th>
            <th style="padding:8px;text-align:right;border-bottom:1px solid #d1d5db;">Prix unitaire</th>
          </tr>
        </thead>
        <tbody>
          ${ticketBodyRows}
        </tbody>
      </table>

      <div style="margin-top:14px;border-top:1px solid #e5e7eb;padding-top:10px;">
        <div style="font-size:18px;font-weight:700;">TOTAL TTC : ${escapeHtml(formatEuro(totalTtc))}</div>
        <div style="margin-top:6px;font-size:12px;color:#333;">Total HT : ${escapeHtml(formatEuro(totalHt))}</div>
        <div style="margin-top:4px;font-size:12px;color:#333;">TVA 10% : ${escapeHtml(formatEuro(vatAmount10))}</div>
        <div style="margin-top:6px;font-size:13px;color:#111;">Mode de paiement : ${escapeHtml(paymentMethod)}</div>
        <div style="margin-top:10px;font-size:12px;color:#555;">Ceci est un justificatif de paiement d&eacute;mat&eacute;rialis&eacute;.</div>
      </div>
    </div>
  `.trim();
}

export async function POST(request: Request) {
  let body: SendTicketRequest = {};
  try {
    body = (await request.json()) as SendTicketRequest;
  } catch {
    return NextResponse.json({ error: "Payload JSON invalide." }, { status: 400 });
  }

  const to = String(body.to || "").trim();
  const tableNumber = String(body.tableNumber || "").trim();
  const restaurantId = String(body.restaurantId || body.restaurant_id || "").trim();
  const rawPdfBase64 = String(body.pdfBase64 || "").trim();
  const pdfBase64 = rawPdfBase64.replace(/^data:application\/pdf;base64,/, "");
  const ticketPayload = (body.ticketPayload || {}) as TicketPayload;
  const requestOrigin = new URL(request.url).origin;

  if (!isValidEmail(to)) {
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  }
  if (!restaurantId) {
    return NextResponse.json({ error: "restaurant_id manquant." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing server env for ticket email route:", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
    });
    return NextResponse.json(
      {
        error:
          "Configuration serveur manquante (SUPABASE_SERVICE_ROLE_KEY). Ajoutez SUPABASE_SERVICE_ROLE_KEY dans .env.local puis redemarrez le serveur.",
      },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: restaurantRow, error: restaurantError } = await supabaseAdmin
    .from("restaurants")
    .select("*")
    .eq("id", restaurantId)
    .maybeSingle();

  if (restaurantError) {
    console.error("SMTP lookup restaurants failed:", {
      restaurantId,
      message: restaurantError.message,
      details: restaurantError.details,
      hint: restaurantError.hint,
    });
    return NextResponse.json({ error: "Impossible de charger la configuration email du restaurant." }, { status: 500 });
  }

  if (!restaurantRow) {
    return NextResponse.json({ error: "Restaurant introuvable." }, { status: 404 });
  }

  const envEmailUser = String(process.env.EMAIL_USER || "").trim();
  const envEmailAppPassword = String(process.env.EMAIL_APP_PASSWORD || "").trim();
  const dbSmtpUser = String((restaurantRow as Record<string, unknown>).smtp_user || "").trim();
  const dbSmtpPassword = String((restaurantRow as Record<string, unknown>).smtp_password || "").trim();
  const smtpUser = dbSmtpUser || envEmailUser;
  const smtpPassword = dbSmtpPassword || envEmailAppPassword;
  if (!isValidEmail(smtpUser) || !smtpPassword) {
    return NextResponse.json(
      { error: "SMTP not configured. Set EMAIL_USER / EMAIL_APP_PASSWORD or fill restaurant Gmail app password." },
      { status: 400 }
    );
  }

  const managerTemplate = String(body.emailTemplate || "").trim();
  const resolvedRestaurantName =
    String(ticketPayload.restaurantName || (restaurantRow as Record<string, unknown>).name || "Mon Restaurant").trim() ||
    "Mon Restaurant";
  const resolvedRestaurantLogoUrl = String(
    ticketPayload.restaurantLogoUrl || (restaurantRow as Record<string, unknown>).logo_url || ""
  ).trim();
  const resolvedTableNumber = tableNumber || String(ticketPayload.tableNumber || "-");
  const emailSubjectTemplate =
    String((restaurantRow as Record<string, unknown>).email_subject || "").trim() ||
    DEFAULT_EMAIL_SUBJECT_TEMPLATE;
  const emailBodyHeader =
    String((restaurantRow as Record<string, unknown>).email_body_header || "").trim() ||
    DEFAULT_EMAIL_BODY_HEADER;
  const emailFooter =
    String((restaurantRow as Record<string, unknown>).email_footer || "").trim() ||
    DEFAULT_EMAIL_FOOTER;

  try {
    const feedbackSectionHtml = buildFeedbackSectionHtml(requestOrigin, ticketPayload);
    const socialSectionHtml = buildSocialReceiptSectionHtml(restaurantRow as Record<string, unknown>, ticketPayload);
    const ticketContentHtml = `${buildTicketContentHtml(ticketPayload)}${feedbackSectionHtml ? `\n${feedbackSectionHtml}` : ""}${socialSectionHtml ? `\n${socialSectionHtml}` : ""}`;
    const defaultWithLogo = buildBaseEmailTemplate(
      resolvedRestaurantName,
      resolvedRestaurantLogoUrl,
      emailBodyHeader,
      emailFooter
    );

    const templateWithTag = replaceEmailPlaceholders(
      (managerTemplate || defaultWithLogo || defaultEmailTemplate)
        .replaceAll("{{EMAIL_BODY_HEADER}}", escapeHtml(emailBodyHeader))
        .replaceAll("{{EMAIL_FOOTER}}", escapeHtml(emailFooter)),
      {
        restaurantName: resolvedRestaurantName,
        tableNumber: resolvedTableNumber,
      }
    );
    const htmlBody = templateWithTag.includes("{{CONTENU_TICKET}}")
      ? templateWithTag.replaceAll("{{CONTENU_TICKET}}", ticketContentHtml)
      : `${defaultWithLogo}`.replaceAll("{{CONTENU_TICKET}}", ticketContentHtml);
    const subject = replaceEmailPlaceholders(emailSubjectTemplate, {
      restaurantName: resolvedRestaurantName,
      tableNumber: resolvedTableNumber,
    });

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      tls: {
        rejectUnauthorized: false,
      },
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    await transporter.verify();

    const sendInfo = await transporter.sendMail({
      from: smtpUser,
      to,
      subject: subject || `Votre ticket de caisse - ${resolvedRestaurantName}`,
      html: htmlBody,
      attachments: pdfBase64
        ? [
            {
              filename: `ticket-table-${resolvedTableNumber || "x"}.pdf`,
              content: Buffer.from(pdfBase64, "base64"),
              contentType: "application/pdf",
            },
          ]
        : [],
    });

    return NextResponse.json({
      ok: true,
      message: "Email envoyé.",
      messageId: sendInfo.messageId,
    });
  } catch (error) {
    const err = error as { message?: string; code?: string; response?: string };
    console.error("SMTP send failed:", {
      restaurantId,
      smtpUser,
      code: err.code || null,
      message: err.message || "",
      response: err.response || null,
    });
    return NextResponse.json(
      { error: String(err.message || "Echec envoi email.") },
      { status: 502 }
    );
  }
}

