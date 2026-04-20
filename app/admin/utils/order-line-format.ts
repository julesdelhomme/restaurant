import type { ExtraChoice, FastOrderLine } from "../types";
import { parsePriceNumber } from "./page-helpers";

export function parseExtraChoicesFromRows(rows: Array<Record<string, unknown>>): ExtraChoice[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return rows
    .map((row) => {
      const name = String(row.name_fr || row.name || row.label_fr || row.label || "").trim();
      if (!name) return null;
      const price = parsePriceNumber(row.price ?? row.amount ?? 0);
      return { name, price };
    })
    .filter(Boolean) as ExtraChoice[];
}

export function buildLineInstructions(line: FastOrderLine) {
  const detailParts: string[] = [];
  if (line.selectedProductOptionName?.trim()) {
    const optionPrice = parsePriceNumber(line.selectedProductOptionPrice);
    detailParts.push(optionPrice > 0 ? `Option: ${line.selectedProductOptionName} (+${optionPrice.toFixed(2)}\u20AC)` : `Option: ${line.selectedProductOptionName}`);
  }
  if (line.selectedSides.length > 0) detailParts.push(`Accompagnements: ${line.selectedSides.join(", ")}`);
  if (line.selectedExtras.length > 0) {
    detailParts.push(
      `Supplements: ${line.selectedExtras
        .map((extra) => {
          const amount = parsePriceNumber(extra.price);
          return amount > 0 ? `${extra.name} (+${amount.toFixed(2)}\u20AC)` : `${extra.name}`;
        })
      .join(", ")}`
    );
  }
  if (line.selectedCooking.trim()) detailParts.push(`Cuisson: ${line.selectedCooking.trim()}`);
  if (line.specialRequest.trim()) detailParts.push(`Remarque: ${line.specialRequest.trim()}`);
  return detailParts.length > 0 ? `Details: ${detailParts.join(" | ")}` : "";
}
