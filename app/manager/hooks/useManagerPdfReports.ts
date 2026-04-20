import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../../lib/supabase";

export function useManagerPdfReports(deps: Record<string, any>) {
  const {
    analyticsRange,
    setReportExportedRange,
    displayedAnalytics,
    analyticsText,
    avgOccupationRateLabel,
    formatEuro,
    reviews,
    dishNameById,
    reviewAverage,
    topReviewedDish,
    reviewCriteriaAverages,
    weeklyAiSummary,
    managerUiLang,
    restaurantForm,
    restaurant,
    preparedDishesSorted,
    categories,
    resolveSupabasePublicUrl,
    RESTAURANT_LOGOS_BUCKET,
    parseOptionsFromDescription,
    parseExtrasFromUnknown,
    normalizeText,
    getDishDisplayDescription,
    DISH_IMAGES_BUCKET,
    sidesLibrary,
    scopedRestaurantId,
  } = deps;

const getManagerAccessToken = async () => {
  const { data } = await supabase.auth.getSession();
  return String(data.session?.access_token || "").trim();
};

const normalizeArchiveFileToken = (value: string) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const buildArchiveMonthToken = (date = new Date()) => {
  const monthLabel = date.toLocaleString("fr-FR", { month: "long" });
  return `${normalizeArchiveFileToken(monthLabel)}_${date.getFullYear()}`;
};

const blobToBase64 = async (blob: Blob) => {
  const arrayBuffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  bytes.forEach((byte: number) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const blobToDataUrl = async (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Conversion image impossible."));
    reader.readAsDataURL(blob);
  });

const fetchImageAsDataUrl = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Chargement de l'image impossible.");
  }
  const blob = await response.blob();
  const dataUrl = await blobToDataUrl(blob);
  return {
    dataUrl,
    mimeType: String(blob.type || "").toLowerCase(),
  };
};

const downloadPdfBlob = (blob: Blob, fileName: string) => {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
};

const savePdfReportToArchive = async (folderKey: string, fileName: string, blob: Blob) => {
  const accessToken = await getManagerAccessToken();
  const restaurantId = String(restaurant?.id || scopedRestaurantId || "").trim();
  if (!accessToken || !restaurantId) return;

  const response = await fetch("/api/manager-reports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      restaurantId,
      folderKey,
      fileName,
      pdfBase64: await blobToBase64(blob),
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    console.warn("Archivage PDF impossible:", payload.error || response.statusText);
  }
};

const getRangeBounds = (range: "today" | "7d" | "30d") => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
  const start = new Date(startOfToday);
  start.setDate(start.getDate() - (days - 1));
  return { start, end: now };
};

const getRangeLabel = (range: "today" | "7d" | "30d") => {
  if (range === "today") return analyticsText.today;
  if (range === "7d") return analyticsText.last7Days;
  return analyticsText.last30Days;
};

const formatReportDate = (value: Date) =>
  new Intl.DateTimeFormat(managerUiLang === "es" ? "es-ES" : managerUiLang === "de" ? "de-DE" : "fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);


const handleExportMonthlyReportPdfArchive = async () => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  let cursorY = 46;
  const { start, end } = getRangeBounds(analyticsRange);
  const occupationRows =
    (displayedAnalytics.occupationByTimeSlots || []).length > 0
      ? (displayedAnalytics.occupationByTimeSlots || []).map((slot: {
          label: string;
          occupancyRate: number;
          averageOccupiedTables: number;
          peakOccupiedTables: number;
        }) => [
          slot.label,
          `${Number(slot.occupancyRate || 0).toFixed(1)}%`,
          Number(slot.averageOccupiedTables || 0).toFixed(2),
          Number(slot.peakOccupiedTables || 0).toFixed(0),
        ])
      : [["Aucune donnee", "", "", ""]];
  const topRevenueRows =
    (displayedAnalytics.topRevenue5 || []).length > 0
      ? (displayedAnalytics.topRevenue5 || []).map((entry: { name: string; count: number; revenue: number }) => [
          entry.name,
          String(entry.count || 0),
          formatEuro(entry.revenue || 0),
        ])
      : [["Aucune donnee", "", ""]];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Rapport financier manager", margin, cursorY);
  cursorY += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Periode: ${getRangeLabel(analyticsRange)} (${formatReportDate(start)} - ${formatReportDate(end)})`, margin, cursorY);
  cursorY += 24;

  autoTable(doc, {
    startY: cursorY,
    head: [["Indicateur", "Valeur"]],
    body: [
      ["CA total", formatEuro(displayedAnalytics.realRevenue)],
      [analyticsText.tipsTotal, formatEuro(displayedAnalytics.totalTips || 0)],
      ["Panier moyen", formatEuro(displayedAnalytics.averageBasket)],
      ["Commandes payees", String(displayedAnalytics.paidOrdersCount || 0)],
      [avgOccupationRateLabel, `${Number(displayedAnalytics.averageOccupationRate || 0).toFixed(1)}%`],
    ],
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [17, 24, 39] },
    margin: { left: margin, right: margin },
  });
  cursorY = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || cursorY) + 18;

  autoTable(doc, {
    startY: cursorY,
    head: [["Tranche", "Taux", "Tables moyennes", "Pic"]],
    body: occupationRows,
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: margin, right: margin },
  });
  cursorY = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || cursorY) + 18;

  autoTable(doc, {
    startY: cursorY,
    head: [["Produit", "Ventes", "CA"]],
    body: topRevenueRows,
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [5, 150, 105] },
    margin: { left: margin, right: margin },
  });

  const fileName = `analyses_financieres_${buildArchiveMonthToken(end)}.pdf`;
  const blob = doc.output("blob");
  await savePdfReportToArchive("financial", fileName, blob);
  downloadPdfBlob(blob, fileName);
  setReportExportedRange(analyticsRange);
};


const handlePrintWeeklyReviewsReportPdf = async () => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  let cursorY = 46;
  const commentRows = reviews
    .filter((review: any) => String(review.comment || "").trim().length > 0)
    .slice(0, 30)
    .map((review: any) => {
      const rating = Number(review.rating || 0);
      const dishName =
        String(review.dish?.name_fr || review.dish?.name || "").trim() ||
        (review.dish_id ? dishNameById.get(String(review.dish_id)) : "") ||
        "Restaurant";
      return [
        review.created_at ? new Date(review.created_at).toLocaleString("fr-FR") : "-",
        String(review.dish_id || "").trim() ? `Plat: ${dishName}` : "Avis restaurant",
        rating > 0 ? `${rating}/5` : "-",
        String(review.comment || "").trim(),
      ];
    });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Rapport hebdomadaire des avis", margin, cursorY);
  cursorY += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Genere le ${new Date().toLocaleString("fr-FR")}`, margin, cursorY);
  cursorY += 22;

  autoTable(doc, {
    startY: cursorY,
    head: [["Indicateur", "Valeur"]],
    body: [
      ["Note moyenne", reviewAverage > 0 ? `${reviewAverage}/5` : "-"],
      ["Top plat", topReviewedDish ? topReviewedDish.name : "Aucun"],
      ["Nombre d'avis", String(reviews.length)],
    ],
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [17, 24, 39] },
    margin: { left: margin, right: margin },
  });
  cursorY = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || cursorY) + 18;

  autoTable(doc, {
    startY: cursorY,
    head: [["Critere", "Note moyenne", "Nb. avis"]],
    body:
      reviewCriteriaAverages.length > 0
        ? reviewCriteriaAverages.map((criterion: any) => [
            criterion.label,
            `${criterion.average.toFixed(2)}/5`,
            String(criterion.count),
          ])
        : [["Aucun critere detaille disponible.", "", ""]],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: margin, right: margin },
  });
  cursorY = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || cursorY) + 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Points forts", margin, cursorY);
  cursorY += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  (weeklyAiSummary.strengths.length > 0 ? weeklyAiSummary.strengths : ["Aucun signal fort detecte"]).forEach((item: string) => {
    const lines = doc.splitTextToSize(`- ${item}`, 500);
    doc.text(lines, margin, cursorY);
    cursorY += lines.length * 12;
  });
  cursorY += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("A surveiller", margin, cursorY);
  cursorY += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  (weeklyAiSummary.watchouts.length > 0 ? weeklyAiSummary.watchouts : ["Aucun point critique detecte"]).forEach((item: string) => {
    const lines = doc.splitTextToSize(`- ${item}`, 500);
    doc.text(lines, margin, cursorY);
    cursorY += lines.length * 12;
  });
  cursorY += 8;

  autoTable(doc, {
    startY: cursorY,
    head: [["Date", "Type", "Note", "Commentaire"]],
    body: commentRows.length > 0 ? commentRows : [["-", "-", "-", "Aucun commentaire disponible."]],
    styles: { fontSize: 8, cellPadding: 5, overflow: "linebreak" },
    headStyles: { fillColor: [5, 150, 105] },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 110 },
      2: { cellWidth: 50 },
    },
  });

  const fileName = `avis_clients_${buildArchiveMonthToken(new Date())}.pdf`;
  const blob = doc.output("blob");
  await savePdfReportToArchive("reviews", fileName, blob);
  downloadPdfBlob(blob, fileName);
};


const handleGeneratePrintableMenuPdf = async () => {
  const previewWindow = window.open("", "_blank");
  if (!previewWindow) {
    alert("Impossible d'ouvrir la previsualisation PDF. Autorisez les pop-ups puis reessayez.");
    return;
  }
  previewWindow.document.write(
    "<!doctype html><html><head><title>Generation du PDF...</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111} .box{max-width:480px;margin:64px auto;border:1px solid #ddd;border-radius:16px;padding:24px} h1{font-size:20px;margin:0 0 12px} p{margin:0;color:#555;line-height:1.5}</style></head><body><div class='box'><h1>Preparation de la carte papier</h1><p>Le PDF est en cours de generation. La previsualisation va s'ouvrir automatiquement dans cet onglet.</p></div></body></html>"
  );
  previewWindow.document.close();
  try {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 46;
    const contentWidth = pageWidth - marginX * 2;
    const priceColumnWidth = 84;
    const textWidth = contentWidth - priceColumnWidth - 18;
    const bottomLimit = pageHeight - 54;
    let cursorY = 56;

    const resolvePrintableDishName = (dish: any) => {
      if (managerUiLang === "de") return String(dish.name_de || dish.name_fr || dish.name || "Plat").trim();
      if (managerUiLang === "es") return String(dish.name_es || dish.name_fr || dish.name || "Plat").trim();
      return String(dish.name_fr || dish.name || "Plat").trim();
    };

    const resolvePrintableOptionName = (option: any) => {
      if (managerUiLang === "de") {
        return String(option.names_i18n?.de || option.name_de || option.name_fr || option.name || "Option").trim();
      }
      if (managerUiLang === "es") {
        return String(option.names_i18n?.es || option.name_es || option.name_fr || option.name || "Option").trim();
      }
      return String(option.names_i18n?.fr || option.name_fr || option.name || "Option").trim();
    };

    const resolvePrintableExtraLabel = (extra: any) => {
      if (managerUiLang === "de") return String(extra.names_i18n?.de || extra.name_de || extra.name_fr || "").trim();
      if (managerUiLang === "es") return String(extra.names_i18n?.es || extra.name_es || extra.name_fr || "").trim();
      return String(extra.names_i18n?.fr || extra.name_fr || "").trim();
    };

    const normalizePrintableUrl = (value: unknown, fallbackBucket?: string) =>
      resolveSupabasePublicUrl(value, fallbackBucket);

    const extractSupplementsForDish = (dish: any) => {
      const parsedDescription = parseOptionsFromDescription(String(dish.description || ""));
      const merged = new Map<string, any>();
      const addExtra = (extra: any) => {
        const key = `${normalizeText(extra.name_fr || "")}::${Number(extra.price || 0).toFixed(2)}`;
        if (!merged.has(key)) merged.set(key, extra);
      };
      const rawDish = dish as unknown as any;
      [dish.extras_list, rawDish.dish_options, rawDish.extras, rawDish.extras_json].forEach((rawValue: unknown) => {
        parseExtrasFromUnknown(rawValue).forEach(addExtra);
      });
      parsedDescription.extrasList.forEach(addExtra);
      return Array.from(merged.values());
    };

    const grouped = new Map<string, any[]>();
    preparedDishesSorted.forEach((dish: any) => {
      const categoryLabel =
        categories.find((category: any) => String(category.id) === String(dish.category_id))?.name_fr || String(dish.categorie || "Autres");
      const current = grouped.get(categoryLabel) || [];
      current.push(dish);
      grouped.set(categoryLabel, current);
    });

    const ensureSpace = (requiredHeight: number) => {
      if (cursorY + requiredHeight <= bottomLimit) return;
      doc.addPage();
      cursorY = 58;
      doc.setDrawColor(217, 217, 217);
      doc.line(marginX, cursorY - 20, pageWidth - marginX, cursorY - 20);
    };

    const logoUrl = normalizePrintableUrl(restaurantForm.logo_url || restaurant?.logo_url, RESTAURANT_LOGOS_BUCKET);
    if (logoUrl) {
      try {
        const { dataUrl, mimeType } = await fetchImageAsDataUrl(logoUrl);
        const imageFormat = mimeType.includes("png") ? "PNG" : "JPEG";
        doc.addImage(dataUrl, imageFormat, pageWidth / 2 - 34, cursorY, 68, 68, undefined, "FAST");
        cursorY += 82;
      } catch (error) {
        console.warn("Chargement du logo PDF impossible:", error);
      }
    }

    const restaurantName = String(restaurantForm.name || restaurant?.name || "Carte").trim() || "Carte";
    doc.setFont("times", "bold");
    doc.setFontSize(26);
    doc.setTextColor(25, 25, 25);
    doc.text(restaurantName, pageWidth / 2, cursorY, { align: "center" });
    cursorY += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text("Carte papier synchronisee avec la carte virtuelle", pageWidth / 2, cursorY, { align: "center" });
    cursorY += 18;

    doc.setDrawColor(205, 205, 205);
    doc.line(marginX + 18, cursorY, pageWidth - marginX - 18, cursorY);
    cursorY += 22;

    Array.from(grouped.entries()).forEach(([categoryName, dishesInCategory], categoryIndex) => {
      ensureSpace(categoryIndex === 0 ? 28 : 44);

      doc.setFont("times", "bold");
      doc.setFontSize(17);
      doc.setTextColor(32, 32, 32);
      doc.text(String(categoryName || "Autres").trim(), marginX, cursorY);
      cursorY += 8;
      doc.setDrawColor(190, 190, 190);
      doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
      cursorY += 18;

      dishesInCategory.forEach((dish: any) => {
        const dishName = resolvePrintableDishName(dish);
        const dishPrice = formatEuro(Number(dish.price || 0));
        const description = getDishDisplayDescription(dish);
        const descriptionLines = description ? doc.splitTextToSize(description, textWidth) : [];
        const supplements = extractSupplementsForDish(dish);
        const supplementLines = supplements.flatMap((extra: any) => {
          const label = resolvePrintableExtraLabel(extra) || extra.name_fr || "Supplement";
          const price = Number(extra.price || 0);
          const formatted = price > 0 ? `+ ${label} (${formatEuro(price)})` : `+ ${label}`;
          return doc.splitTextToSize(formatted, textWidth - 10);
        });
        const rawOptions = Array.isArray(dish.product_options) ? dish.product_options : [];
        const optionLines = rawOptions.flatMap((option: any) => {
          const label = resolvePrintableOptionName(option);
          if (!label) return [];
          const parsedPrice = Number(option.price_override || 0);
          const formatted = parsedPrice > 0 ? `Option: ${label} (${formatEuro(parsedPrice)})` : `Option: ${label}`;
          return doc.splitTextToSize(formatted, textWidth - 10);
        });

        const estimatedHeight =
          20 +
          descriptionLines.length * 12 +
          supplementLines.length * 11 +
          optionLines.length * 11 +
          16;
        ensureSpace(Math.max(estimatedHeight, 48));

        doc.setFont("times", "bold");
        doc.setFontSize(13);
        doc.setTextColor(20, 20, 20);
        doc.text(dishName || "Plat", marginX, cursorY);
        doc.text(dishPrice, pageWidth - marginX, cursorY, { align: "right" });
        cursorY += 14;

        if (descriptionLines.length > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(105, 105, 105);
          doc.text(descriptionLines, marginX, cursorY);
          cursorY += descriptionLines.length * 12;
        }

        if (supplementLines.length > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(82, 82, 82);
          supplementLines.forEach((line: any) => {
            doc.text(String(line), marginX + 10, cursorY);
            cursorY += 11;
          });
        }

        if (optionLines.length > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(110, 110, 110);
          optionLines.forEach((line: any) => {
            doc.text(String(line), marginX + 10, cursorY);
            cursorY += 11;
          });
        }

        cursorY += 8;
      });

      cursorY += 8;
    });

    const fileName = `statistiques_carte_${buildArchiveMonthToken(new Date())}.pdf`;
    const blob = doc.output("blob");
    await savePdfReportToArchive("stats", fileName, blob);

    const blobUrl = window.URL.createObjectURL(blob);
    previewWindow.location.href = blobUrl;
    window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 5 * 60 * 1000);
  } catch (error) {
    console.error("Generation du PDF carte impossible:", error);
    previewWindow.document.open();
    previewWindow.document.write(
      "<!doctype html><html><head><title>Erreur PDF</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111} .box{max-width:520px;margin:64px auto;border:1px solid #f0c9c9;background:#fff7f7;border-radius:16px;padding:24px} h1{font-size:20px;margin:0 0 12px;color:#991b1b} p{margin:0;color:#7f1d1d;line-height:1.5}</style></head><body><div class='box'><h1>Impossible de generer la carte papier</h1><p>La previsualisation PDF a echoue. Verifiez les donnees du menu ou rechargez la page, puis reessayez.</p></div></body></html>"
    );
    previewWindow.document.close();
  }
};


  return {
    handleExportMonthlyReportPdfArchive,
    handlePrintWeeklyReviewsReportPdf,
    handleGeneratePrintableMenuPdf,
  };
}
