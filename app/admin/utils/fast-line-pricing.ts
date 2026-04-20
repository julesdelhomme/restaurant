import type { FastOrderLine } from "../types";
import type { Item } from "./order-items";
import { parsePriceNumber } from "./page-helpers";

export function deriveOrderStatusFromItems(
  items: Item[],
  helpers: {
    isItemServed: (item: Item) => boolean;
    isItemReady: (item: Item) => boolean;
    isDrink: (item: Item) => boolean;
    getItemPrepStatus: (item: Item) => "pending" | "preparing" | "ready";
  }
) {
  const { isItemServed, isItemReady, isDrink, getItemPrepStatus } = helpers;
  const activeItems = items.filter((item) => !isItemServed(item));
  if (activeItems.length === 0) return "served";
  if (activeItems.every((item) => isItemReady(item))) {
    return activeItems.every((item) => isDrink(item)) ? "ready_bar" : "ready";
  }
  if (activeItems.some((item) => isItemReady(item) || getItemPrepStatus(item) === "preparing")) return "preparing";
  return "pending";
}

export function resolveFastLineUnitPrice(
  line: FastOrderLine,
  options: {
    dishById: Map<string, { id?: string | number }>;
    getFormulaPackPrice: (dish: any) => number;
  }
) {
  const { dishById, getFormulaPackPrice } = options;
  const isFormulaLine = Boolean(line.isFormula || line.formulaDishId || (line.formulaSelections || []).length > 0);
  if (isFormulaLine) {
    const formulaExtrasPrice = (line.formulaSelections || []).reduce(
      (sum, selection) =>
        sum +
        (Array.isArray(selection.selectedExtras)
          ? selection.selectedExtras.reduce((inner, extra) => inner + parsePriceNumber(extra.price), 0)
          : 0),
      0
    );
    const mainExtrasPrice = (line.selectedExtras || []).reduce((sum, extra) => sum + parsePriceNumber(extra.price), 0);
    const formulaDishId = String(line.formulaDishId || line.dishId || "").trim();
    const formulaDish = formulaDishId ? dishById.get(formulaDishId) : undefined;
    if (formulaDish) {
      const forcedPrice = getFormulaPackPrice(formulaDish);
      if (Number.isFinite(forcedPrice) && forcedPrice > 0) {
        return Number((forcedPrice + formulaExtrasPrice + mainExtrasPrice).toFixed(2));
      }
    }
    const storedFormulaPrice = Number(line.formulaUnitPrice);
    if (Number.isFinite(storedFormulaPrice) && storedFormulaPrice > 0) {
      return Number((storedFormulaPrice + formulaExtrasPrice + mainExtrasPrice).toFixed(2));
    }
  }
  const unitPrice = Number(line.unitPrice || 0);
  return Number.isFinite(unitPrice) ? unitPrice : 0;
}
