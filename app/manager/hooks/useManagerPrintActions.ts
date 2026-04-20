import { supabase } from "../../lib/supabase";

export function useManagerPrintActions(deps: Record<string, any>) {
  const {
    analyticsRange,
    reportExportedRange,
    setIsPurgingHistory,
    setReportExportedRange,
    fetchOrders,
    preparedDishesSorted,
    categories,
    sidesLibrary,
    managerUiLang,
    parseOptionsFromDescription,
    parseExtrasFromUnknown,
    normalizeText,
    formatEuro,
    getDishDisplayDescription,
    resolveSupabasePublicUrl,
    DISH_IMAGES_BUCKET,
    restaurantForm,
    restaurant,
    RESTAURANT_LOGOS_BUCKET,
    RESTAURANT_BANNERS_BUCKET,
    normalizeHexColor,
    normalizeBackgroundOpacity,
    parseObjectRecord,
    isHexColorDark,
    normalizeManagerFontFamily,
  } = deps;

  const getRangeBounds = (range: "today" | "7d" | "30d") => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
    const start = new Date(startOfToday);
    start.setDate(start.getDate() - (days - 1));
    return { start, end: now };
  };
const handleCloseMonthAndPurge = async () => {
  if (analyticsRange !== "30d") {
    alert("Passez le filtre sur 30 jours pour clôturer le mois.");
    return;
  }
  if (reportExportedRange !== "30d") {
    alert("Téléchargez d'abord le rapport mensuel (PDF).");
    return;
  }
  const confirmed = window.confirm(
    "Clôturer le mois va supprimer les commandes PAYÉES sur la période de 30 jours. Confirmer ?"
  );
  if (!confirmed) return;

  setIsPurgingHistory(true);
  try {
    const { start, end } = getRangeBounds("30d");
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("status", "paid")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    if (error) {
      console.error("Erreur purge commandes payées:", error);
      alert("La purge a échoué. Vérifiez les droits Supabase.");
      return;
    }

    setReportExportedRange(null);
    await fetchOrders();
    alert("Mois clôturé. Les commandes payées de la période ont été purgées.");
  } finally {
    setIsPurgingHistory(false);
  }
};

const handleGeneratePrintableMenu = () => {
  const previewWindow = window.open("", "_blank");
  if (!previewWindow) {
    alert("Impossible d'ouvrir la previsualisation. Autorisez les pop-ups puis reessayez.");
    return;
  }

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const grouped = new Map<string, any[]>();
  const sideNameById = new Map<string, string>(
    (sidesLibrary || []).map((side: any) => [String(side.id || ""), String(side.name_fr || "").trim()])
  );

  const normalizePrintableUrl = (value: unknown, fallbackBucket?: string) =>
    resolveSupabasePublicUrl(value, fallbackBucket);
  const getPrintableExtraLabel = (extra: any) =>
    String(
      extra.names_i18n?.[managerUiLang] ||
        extra.names_i18n?.fr ||
        extra.name_fr ||
        ""
    ).trim();
  const getPrintableOptionLabel = (option: any) =>
    String(
      option.names_i18n?.[managerUiLang] ||
        option.names_i18n?.fr ||
        option.name_fr ||
        option.name ||
        ""
    ).trim();

  const buildDishPrintableMeta = (dish: any) => {
    const parsedDescription = parseOptionsFromDescription(String(dish.description || ""));
    const sideIds = Array.isArray(dish.selected_sides) ? dish.selected_sides : parsedDescription.sideIds;
    const sideLabels = sideIds
      .map((sideId: unknown) => sideNameById.get(String(sideId || "").trim()) || "")
      .map((label: string) => String(label || "").trim())
      .filter(Boolean);
    const allergenLabels = String(dish.allergens || "")
      .split(",")
      .map((value: string) => String(value || "").trim())
      .filter(Boolean);

    const extrasMergedMap = new Map<string, any>();
    const addExtra = (extra: any) => {
      const key = `${normalizeText(extra.name_fr)}::${Number(extra.price || 0).toFixed(2)}`;
      if (!extrasMergedMap.has(key)) extrasMergedMap.set(key, extra);
    };
    const rawDish = dish as unknown as any;
    [dish.extras_list, rawDish.dish_options, rawDish.extras, rawDish.extras_json].forEach((rawValue: unknown) => {
      parseExtrasFromUnknown(rawValue).forEach(addExtra);
    });
    parsedDescription.extrasList.forEach(addExtra);
    const optionLabels = (Array.isArray(dish.product_options) ? dish.product_options : [])
      .map((option: any) => {
        const label = getPrintableOptionLabel(option);
        if (!label) return "";
        const parsedPrice = Number(option.price_override || 0);
        return Number.isFinite(parsedPrice) && parsedPrice > 0 ? `${label} (${formatEuro(parsedPrice)})` : label;
      })
      .filter(Boolean);
    return {
      sideLabels,
      allergenLabels,
      supplements: Array.from(extrasMergedMap.values()),
      optionLabels,
      hasCookingChoice: Boolean(dish.ask_cooking ?? parsedDescription.askCooking),
    };
  };
  preparedDishesSorted.forEach((dish: any) => {
    const categoryLabel =
      categories.find((category: any) => String(category.id) === String(dish.category_id))?.name_fr ||
      String(dish.categorie || "Autres");
    const current = grouped.get(categoryLabel) || [];
    current.push(dish);
    grouped.set(categoryLabel, current);
  });

  const sectionsHtml = Array.from(grouped.entries())
    .map(([categoryName, dishesInCategory]) => {
      const items = dishesInCategory
        .map((dish: any) => {
          const description = getDishDisplayDescription(dish);
          const dishImageUrl = normalizePrintableUrl((dish as unknown as any).image_url, DISH_IMAGES_BUCKET);
          const printableMeta = buildDishPrintableMeta(dish);
          const supplementsHtml =
            printableMeta.supplements.length > 0
              ? `<div class="dish-supplements">${printableMeta.supplements
                    .map((extra: any) => {
                    const price = Number(extra.price || 0);
                    const label = getPrintableExtraLabel(extra) || extra.name_fr;
                    const priceText = Number.isFinite(price) && price > 0 ? ` (${formatEuro(price)})` : "";
                    return `<div class="dish-supplement">+ ${escapeHtml(label)}${escapeHtml(priceText)}</div>`;
                  })
                  .join("")}</div>`
              : "";
          const allergensHtml =
            printableMeta.allergenLabels.length > 0
              ? `<div class="dish-allergens">Allerg&egrave;nes : ${escapeHtml(printableMeta.allergenLabels.join(", "))}</div>`
              : "";
          const optionsHtml =
            printableMeta.optionLabels.length > 0 || printableMeta.hasCookingChoice
              ? `<div class="dish-options">${
                  printableMeta.optionLabels.length > 0
                    ? `<div>Options : ${escapeHtml(printableMeta.optionLabels.join(", "))}</div>`
                    : ""
                }${
                  printableMeta.hasCookingChoice
                    ? `<div>Cuisson : ${escapeHtml(managerUiLang === "de" ? "wahlbar" : managerUiLang === "es" ? "a elegir" : "au choix")}</div>`
                    : ""
                }</div>`
              : "";
          const sidesHtml =
            printableMeta.sideLabels.length > 0
              ? `<div class="dish-accompaniments">Accompagnements : ${escapeHtml(printableMeta.sideLabels.join(", "))}</div>`
              : "";
          return `
            <article class="dish-row">
              ${
                dishImageUrl
                  ? `<img src="${escapeHtml(dishImageUrl)}" alt="${escapeHtml(dish.name || "Plat")}" class="dish-photo" crossorigin="anonymous" />`
                  : `<div class="dish-photo dish-photo-placeholder" aria-hidden="true"></div>`
              }
              <div class="dish-main">
                <div class="dish-name">${escapeHtml(dish.name || "Plat")}</div>
                ${description ? `<div class="dish-description">${escapeHtml(description)}</div>` : ""}
                ${optionsHtml}
                ${supplementsHtml}
                ${allergensHtml}
                ${sidesHtml}
              </div>
              <div class="dish-price">${escapeHtml(formatEuro(Number(dish.price || 0)))}</div>
            </article>
          `;
        })
        .join("");
      return `
        <section class="category-block">
          <h2>${escapeHtml(categoryName)}</h2>
          ${items}
        </section>
      `;
    })
    .join("");

  const logoUrl = normalizePrintableUrl(restaurantForm.logo_url || restaurant?.logo_url, RESTAURANT_LOGOS_BUCKET);
  const restaurantName = String(restaurantForm.name || restaurant?.name || "").trim();
  const backgroundUrl = normalizePrintableUrl(
    (restaurantForm as any).background_url ||
      (restaurantForm as any).background_image_url ||
      (restaurant as any | null)?.background_url ||
      (restaurant as any | null)?.background_image_url,
    RESTAURANT_BANNERS_BUCKET
  );
  const primaryColor = normalizeHexColor(restaurantForm.primary_color || restaurant?.primary_color, "#FFFFFF");
  const backgroundOpacity = normalizeBackgroundOpacity(
    (restaurantForm as any).bg_opacity ??
      (restaurant as any | null)?.bg_opacity ??
      parseObjectRecord((restaurant as any | null)?.table_config).bg_opacity,
    1
  );
  const backgroundOverlayOpacity = Math.max(0, Math.min(1, 1 - backgroundOpacity)).toFixed(2);
  const useLightPrintText = isHexColorDark(primaryColor) || backgroundOpacity >= 0.72;
  const printTextColor = useLightPrintText ? "#FFFFFF" : "#111111";
  const printMutedTextColor = useLightPrintText ? "rgba(255,255,255,0.86)" : "#444444";
  const printSubtleTextColor = useLightPrintText ? "rgba(255,255,255,0.78)" : "#2f2f2f";
  const printDividerColor = useLightPrintText ? "rgba(255,255,255,0.36)" : "#d0d0d0";
  const printDottedDividerColor = useLightPrintText ? "rgba(255,255,255,0.30)" : "#d8d8d8";
  const printSheetBackground = useLightPrintText ? "rgba(0,0,0,0.42)" : "rgba(255,255,255,0.78)";
  const pageBackgroundCss = backgroundUrl
    ? `background-image:
         linear-gradient(rgba(255,255,255,${backgroundOverlayOpacity}), rgba(255,255,255,${backgroundOverlayOpacity})),
         url('${backgroundUrl}'),
         url('${backgroundUrl}');
       background-size: cover, cover, auto;
       background-repeat: no-repeat, no-repeat, repeat;
       background-position: center center, center center, top left;`
    : `background: ${primaryColor};`;
  const printFontName = normalizeManagerFontFamily(restaurantForm.font_family);
  const printFontFamily = `'${printFontName}', sans-serif`;
  const printFontHref = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(printFontName).replace(/%20/g, "+")}:wght@400;700;800&display=swap`;

  const html = `
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${restaurantName ? `Carte - ${escapeHtml(restaurantName)}` : "Carte"}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="${escapeHtml(printFontHref)}" rel="stylesheet">
        <style>
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            color: ${printTextColor};
            font-family: ${printFontFamily};
            color-scheme: ${useLightPrintText ? "dark" : "light"};
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          body {
            background: transparent;
          }
          .preview-actions {
            position: sticky;
            top: 0;
            z-index: 3;
            display: flex;
            justify-content: center;
            gap: 10px;
            padding: 14px 16px;
            background: rgba(17, 24, 39, 0.92);
            backdrop-filter: blur(6px);
          }
          .preview-actions button {
            border: 0;
            border-radius: 999px;
            padding: 10px 18px;
            font: inherit;
            font-weight: 700;
            cursor: pointer;
          }
          .preview-actions .primary {
            background: #ffffff;
            color: #111827;
          }
          .preview-actions .secondary {
            background: transparent;
            color: #ffffff;
            border: 1px solid rgba(255,255,255,0.35);
          }
          .print-page-bg {
            position: fixed;
            inset: 0;
            z-index: 0;
            ${pageBackgroundCss}
          }
          .sheet {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            padding: 12mm;
            background: ${printSheetBackground};
            position: relative;
            z-index: 1;
          }
          .header { text-align: center; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 2px solid ${printDividerColor}; }
          .logo { width: 96px; height: 96px; object-fit: contain; display: inline-block; margin-bottom: 8px; }
          .title { font-size: 32px; font-weight: 700; margin: 0; letter-spacing: 0.5px; }
          .category-block { margin: 18px 0 24px; break-inside: avoid; }
          .category-block h2 { font-size: 22px; margin: 0 0 10px; border-bottom: 1px solid ${printDividerColor}; padding-bottom: 4px; }
          .dish-row {
            display: grid;
            grid-template-columns: 88px 1fr auto;
            gap: 12px;
            align-items: start;
            border-bottom: 1px dotted ${printDottedDividerColor};
            padding: 10px 0;
            break-inside: avoid;
          }
          .dish-photo {
            width: 88px;
            height: 88px;
            object-fit: cover;
            border: 1px solid ${printDividerColor};
            background: ${useLightPrintText ? "rgba(255,255,255,0.12)" : "#f3f3f3"};
          }
          .dish-photo-placeholder {
            background: repeating-linear-gradient(
              45deg,
              ${useLightPrintText ? "rgba(255,255,255,0.16)" : "#efefef"} 0,
              ${useLightPrintText ? "rgba(255,255,255,0.16)" : "#efefef"} 8px,
              ${useLightPrintText ? "rgba(255,255,255,0.06)" : "#f8f8f8"} 8px,
              ${useLightPrintText ? "rgba(255,255,255,0.06)" : "#f8f8f8"} 16px
            );
          }
          .dish-main { min-width: 0; }
          .dish-name { font-size: 17px; font-weight: 700; margin-bottom: 2px; }
          .dish-description { font-size: 13px; color: ${printMutedTextColor}; line-height: 1.45; white-space: pre-wrap; }
          .dish-supplements,
          .dish-options,
          .dish-allergens,
          .dish-accompaniments {
            margin-top: 6px;
            font-size: 12px;
            line-height: 1.45;
            color: ${printSubtleTextColor};
          }
          .dish-supplement { margin-top: 2px; }
          .dish-price { white-space: nowrap; font-size: 18px; font-weight: 800; }
          @media print {
            @page { margin: 0; }
            html, body { width: auto; min-height: auto; }
            body { margin: 1.6cm !important; }
            .preview-actions { display: none !important; }
            .print-page-bg {
              position: fixed;
              inset: 0;
            }
            .sheet {
              max-width: none;
              min-height: auto;
              margin: 0;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="preview-actions">
          <button class="primary" type="button" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
          <button class="secondary" type="button" onclick="window.close()">Fermer</button>
        </div>
        <div class="print-page-bg" aria-hidden="true"></div>
        <main class="sheet">
          <header class="header">
            ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo restaurant" class="logo" crossorigin="anonymous" />` : ""}
            ${restaurantName ? `<h1 class="title">${escapeHtml(restaurantName)}</h1>` : ""}
          </header>
          ${sectionsHtml || "<p>Aucun plat disponible.</p>"}
        </main>
      </body>
    </html>
  `;
  previewWindow.document.open();
  previewWindow.document.write(html);
  previewWindow.document.close();
};
  return {
    handleCloseMonthAndPurge,
    handleGeneratePrintableMenu,
  };
}
