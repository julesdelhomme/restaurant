import type { DishItem, FastOrderLine, FormulaSelection } from "../types";
import type { MutableRefObject } from "react";

export function runAppendFormulaLineService(params: {
  formulaDish: DishItem;
  selections: FormulaSelection[];
  parsePriceNumber: (value: unknown) => number;
  shouldSkipFastAddAction: (
    ref: MutableRefObject<{ key: string; at: number } | null>,
    signature: string
  ) => boolean;
  lastFastAddRef: MutableRefObject<{ key: string; at: number } | null>;
  resolveFormulaSelectionDestination: (selection: FormulaSelection, selectedDish: DishItem | null) => "bar" | "cuisine";
  resolveDishDestination: (dish: DishItem) => "bar" | "cuisine";
  getDishCategoryLabel: (dish: DishItem) => string;
  getFormulaDisplayName: (dish: DishItem) => string;
  getFormulaPackPrice: (dish: DishItem) => number;
  dishById: Map<string, DishItem>;
  makeLineId: () => string;
  setFastOptionLines: (updater: (prev: FastOrderLine[]) => FastOrderLine[]) => void;
}): void {
  const {
    formulaDish,
    selections,
    parsePriceNumber,
    shouldSkipFastAddAction,
    lastFastAddRef,
    resolveFormulaSelectionDestination,
    resolveDishDestination,
    getDishCategoryLabel,
    getFormulaDisplayName,
    getFormulaPackPrice,
    dishById,
    makeLineId,
    setFastOptionLines,
  } = params;

  const selectionSignature = [...selections]
    .map((selection) => {
      const optionIds = (selection.selectedOptionIds || [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .sort()
        .join(",");
      const sideIds = (selection.selectedSideIds || [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .sort()
        .join(",");
      const extrasKey = (selection.selectedExtras || [])
        .map((extra) => `${extra.name}:${parsePriceNumber(extra.price).toFixed(2)}`)
        .sort()
        .join(",");
      const cooking = String(selection.selectedCooking || "").trim();
      return `${selection.categoryId}:${selection.dishId}:${optionIds}:${sideIds}:${extrasKey}:${cooking}`;
    })
    .sort()
    .join("|");

  const addSignature = `formula:${String(formulaDish.id || "")}::${selectionSignature}`;
  if (shouldSkipFastAddAction(lastFastAddRef, addSignature)) return;

  const currentFormulaSelection = [...selections].sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0))[0] || null;
  const currentSelectionDish = currentFormulaSelection
    ? dishById.get(String(currentFormulaSelection.dishId || "").trim()) || null
    : null;
  const formulaDestination = currentFormulaSelection
    ? resolveFormulaSelectionDestination(currentFormulaSelection, currentSelectionDish)
    : resolveDishDestination(formulaDish);
  const category = getDishCategoryLabel(formulaDish);
  const formulaName = getFormulaDisplayName(formulaDish);
  const formulaPackPrice = getFormulaPackPrice(formulaDish);

  const line: FastOrderLine = {
    lineId: makeLineId(),
    dishId: String(formulaDish.id || ""),
    dishName: formulaName,
    category,
    categoryId: formulaDish.category_id ?? null,
    quantity: 1,
    unitPrice: formulaPackPrice,
    selectedSides: [],
    selectedExtras: [],
    selectedProductOptionId: null,
    selectedProductOptionName: null,
    selectedProductOptionPrice: 0,
    selectedCooking: "",
    specialRequest: "",
    isDrink: formulaDestination === "bar",
    destination: formulaDestination,
    isFormula: true,
    formulaDishId: String(formulaDish.id || "").trim() || undefined,
    formulaDishName: formulaName,
    formulaUnitPrice: formulaPackPrice,
    formulaSelections: selections,
  };
  if (typeof setFastOptionLines === "function") {
    setFastOptionLines((prev) => [...prev, line]);
  } else {
    console.error("Ajout formule impossible: setFastOptionLines indisponible.");
  }
}
