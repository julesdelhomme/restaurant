import type { DishItem, FormulaSelection, ProductOptionChoice } from "../types";

type RunHandleAddFormulaLineServiceParams = {
  formulaModalDish: DishItem | null;
  formulaOptionModalOpen: boolean;
  normalizedFormulaCategoryIds: string[];
  formulaOptionsByCategory: Map<string, DishItem[]>;
  formulaModalSelections: Record<string, string>;
  dishById: Map<string, DishItem>;
  resolveFormulaDishRecord: (dish: DishItem | null | undefined) => DishItem | null;
  ensureFormulaDishDetails: (dish: DishItem | null | undefined) => Promise<DishItem | null>;
  getFormulaDishConfig: (dish: DishItem) => {
    productOptions: ProductOptionChoice[];
    hasRequiredSides: boolean;
    askCooking: boolean;
  };
  getFormulaSelectionDetails: (categoryId: string) => {
    selectedSideIds: string[];
    selectedSides: string[];
    selectedCooking: string;
    selectedProductOptionIds: string[];
    selectedExtras: Array<{ name: string; price: number }>;
  };
  isProductOptionSelectionRequired: (
    dish: DishItem,
    productOptions: ProductOptionChoice[]
  ) => boolean;
  formulaStepTitleByKey: Map<string, string>;
  parsePriceNumber: (value: unknown) => number;
  formulaSequenceByDishId: Map<string, number>;
  getFormulaCompositionDishName: (dish: DishItem) => string;
  resolveFormulaSelectionDestination: (
    selectionContext: {
      sequence: number;
      destination?: "cuisine" | "bar";
      categoryId: string;
      categoryLabel: string;
    },
    selectedDish: DishItem
  ) => "cuisine" | "bar";
  openFormulaItemOptionsModal: (
    categoryId: string,
    selectedDish: DishItem,
    resetSelectionDetails?: boolean
  ) => Promise<void>;
  appendFormulaLine: (formulaDish: DishItem, selections: FormulaSelection[]) => void;
  closeFormulaModal: () => void;
  setFormulaModalError: (message: string) => void;
  formulaUi: {
    missing: string;
    missingOptions: string;
  };
  onAddToCart?: (formulaItem: { formulaDish: DishItem; selections: FormulaSelection[] }) => void;
  onAdd?: (formulaItem: { formulaDish: DishItem; selections: FormulaSelection[] }) => void;
};

export async function runHandleAddFormulaLineService({
  formulaModalDish,
  formulaOptionModalOpen,
  normalizedFormulaCategoryIds,
  formulaOptionsByCategory,
  formulaModalSelections,
  dishById,
  resolveFormulaDishRecord,
  ensureFormulaDishDetails,
  getFormulaDishConfig,
  getFormulaSelectionDetails,
  isProductOptionSelectionRequired,
  formulaStepTitleByKey,
  parsePriceNumber,
  formulaSequenceByDishId,
  getFormulaCompositionDishName,
  resolveFormulaSelectionDestination,
  openFormulaItemOptionsModal,
  appendFormulaLine,
  closeFormulaModal,
  setFormulaModalError,
  formulaUi,
  onAddToCart,
  onAdd,
}: RunHandleAddFormulaLineServiceParams) {
  if (!formulaModalDish) return;

  if (formulaOptionModalOpen) {
    setFormulaModalError("Validez les options du plat sélectionné avant d'ajouter la formule.");
    return;
  }

  const missingCategory = normalizedFormulaCategoryIds.find((categoryId) => {
    const normalizedCategoryId = String(categoryId || "").trim();
    if (!normalizedCategoryId) return false;
    const options = formulaOptionsByCategory.get(normalizedCategoryId) || [];
    if (options.length === 0) return false;
    return !formulaModalSelections[normalizedCategoryId];
  });
  if (missingCategory) {
    setFormulaModalError(formulaUi.missing);
    return;
  }

  const resolvedSelectionsByCategory = new Map<string, DishItem>();
  for (const categoryId of normalizedFormulaCategoryIds) {
    const normalizedCategoryId = String(categoryId || "").trim();
    if (!normalizedCategoryId) continue;
    const selectedId = String(formulaModalSelections[normalizedCategoryId] || "").trim();
    if (!selectedId) continue;
    const sourceDish = resolveFormulaDishRecord(dishById.get(selectedId)) || dishById.get(selectedId) || null;
    if (!sourceDish) continue;
    const loadedDish = await ensureFormulaDishDetails(sourceDish);
    if (loadedDish) resolvedSelectionsByCategory.set(normalizedCategoryId, loadedDish);
  }

  const missingRequiredOptionsCategory = normalizedFormulaCategoryIds
    .map((categoryId) => {
      const normalizedCategoryId = String(categoryId || "").trim();
      if (!normalizedCategoryId) return null;
      const selectedId = String(formulaModalSelections[normalizedCategoryId] || "").trim();
      if (!selectedId) return null;
      const selectedDish =
        resolvedSelectionsByCategory.get(normalizedCategoryId) ||
        resolveFormulaDishRecord(dishById.get(selectedId));
      if (!selectedDish) return null;
      const config = getFormulaDishConfig(selectedDish);
            const detailsRaw = getFormulaSelectionDetails(normalizedCategoryId);
      const details = {
        selectedSideIds: Array.isArray(detailsRaw?.selectedSideIds) ? detailsRaw.selectedSideIds : [],
        selectedSides: Array.isArray(detailsRaw?.selectedSides) ? detailsRaw.selectedSides : [],
        selectedCooking: String(detailsRaw?.selectedCooking || ""),
        selectedProductOptionIds: Array.isArray(detailsRaw?.selectedProductOptionIds) ? detailsRaw.selectedProductOptionIds : [],
        selectedExtras: Array.isArray(detailsRaw?.selectedExtras) ? detailsRaw.selectedExtras : [],
      };
      const missingProductOption =
        isProductOptionSelectionRequired(selectedDish, config.productOptions) &&
        details.selectedProductOptionIds.length === 0;
      const missingSides = config.hasRequiredSides && details.selectedSides.length === 0;
      const missingCooking = config.askCooking && !String(details.selectedCooking || "").trim();
      if (!missingProductOption && !missingSides && !missingCooking) return null;
      return {
        categoryId: normalizedCategoryId,
        selectedDish,
      };
    })
    .find(Boolean);

  if (missingRequiredOptionsCategory) {
    setFormulaModalError(formulaUi.missingOptions);
    await openFormulaItemOptionsModal(
      missingRequiredOptionsCategory.categoryId,
      missingRequiredOptionsCategory.selectedDish,
      false
    );
    return;
  }

  const selections: FormulaSelection[] = normalizedFormulaCategoryIds
    .map((categoryId, categoryIndex) => {
      const normalizedCategoryId = String(categoryId || "").trim();
      const selectedId = String(formulaModalSelections[normalizedCategoryId] || "").trim();
      if (!normalizedCategoryId || !selectedId) return null;
      const categoryLabelFromStep = String(formulaStepTitleByKey.get(normalizedCategoryId) || "").trim();
      const selectedDish =
        resolvedSelectionsByCategory.get(normalizedCategoryId) ||
        resolveFormulaDishRecord(dishById.get(selectedId));
      if (!selectedDish) return null;
      const config = getFormulaDishConfig(selectedDish);
            const detailsRaw = getFormulaSelectionDetails(normalizedCategoryId);
      const details = {
        selectedSideIds: Array.isArray(detailsRaw?.selectedSideIds) ? detailsRaw.selectedSideIds : [],
        selectedSides: Array.isArray(detailsRaw?.selectedSides) ? detailsRaw.selectedSides : [],
        selectedCooking: String(detailsRaw?.selectedCooking || ""),
        selectedProductOptionIds: Array.isArray(detailsRaw?.selectedProductOptionIds) ? detailsRaw.selectedProductOptionIds : [],
        selectedExtras: Array.isArray(detailsRaw?.selectedExtras) ? detailsRaw.selectedExtras : [],
      };
      const selectedOptions = config.productOptions.filter((option) =>
        details.selectedProductOptionIds.includes(String(option.id || "").trim())
      );
      const selectedOptionNames = selectedOptions
        .map((option) => String(option.name || "").trim())
        .filter(Boolean);
      const selectedOptionPrice = selectedOptions.reduce(
        (sum, option) => sum + parsePriceNumber(option.price),
        0
      );
      const formattedSelectedOptions = selectedOptions.map((option) => ({
        id: String(option.id || "").trim() || null,
        name: String(option.name || "").trim() || null,
        price: parsePriceNumber(option.price),
      }));
      const supplements = details.selectedExtras
        .map((extra) => ({
          name: String(extra?.name || "").trim() || null,
          price: parsePriceNumber(extra?.price ?? 0),
        }))
        .filter((extra) => Boolean(extra.name));
      const linkedSequence = formulaSequenceByDishId.get(selectedId);
      const sequence =
        Number.isFinite(Number(linkedSequence))
          ? Number(linkedSequence)
          : categoryIndex + 1;
      const categoryLabel = categoryLabelFromStep || `Etape ${sequence}`;
      const selectionContext = {
        sequence,
        destination: undefined,
        categoryId: normalizedCategoryId,
        categoryLabel,
      };
      return {
        categoryId: normalizedCategoryId,
        categoryLabel,
        dishId: selectedId,
        dishName: getFormulaCompositionDishName(selectedDish),
        destination: resolveFormulaSelectionDestination(selectionContext, selectedDish),
        sequence,
        selectedSideIds: details.selectedSideIds,
        selectedSides: details.selectedSides,
        selectedCooking: details.selectedCooking,
        selectedOptionIds: details.selectedProductOptionIds,
        selectedOptions: formattedSelectedOptions,
        selectedOptionNames,
        selectedOptionPrice,
        supplements,
        selectedExtras: details.selectedExtras,
      } as FormulaSelection;
    })
    .filter(Boolean) as FormulaSelection[];

  const formulaItem = { formulaDish: formulaModalDish, selections };
  if (typeof appendFormulaLine === "function") {
    appendFormulaLine(formulaItem.formulaDish, formulaItem.selections);
  } else if (typeof onAddToCart === "function") {
    onAddToCart(formulaItem);
  } else if (typeof onAdd === "function") {
    onAdd(formulaItem);
  } else {
    console.error("Ajout formule impossible: aucun callback disponible.");
    setFormulaModalError("Erreur ajout formule: callback manquant.");
    return;
  }
  if (typeof closeFormulaModal === "function") closeFormulaModal();
}

