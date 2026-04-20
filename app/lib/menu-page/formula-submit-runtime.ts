import type { FormulaSelection } from "./runtime";

type HandleFormulaSubmitArgs = {
  formulaDish: any;
  normalizedFormulaCategoryIds: string[];
  formulaOptionsByCategory: Map<string, any[]>;
  formulaSelections: Record<string, string>;
  setFormulaSelectionError: (value: string) => void;
  formulaUi: { missing: string; missingOptions: string };
  getFormulaDishConfig: (dish: any) => any;
  formulaMainDetails: any;
  dishById: Map<string, any>;
  getFormulaSelectionDetails: (categoryId: string) => any;
  getSelectableFormulaProductOptionsForDish: (dish: any, options: any[]) => any[];
  categoryById: Map<string, any>;
  getCategoryLabel: (category: any) => string;
  getDishName: (dish: any, lang: string) => string;
  getProductOptionLabel: (option: any, lang: string) => string;
  lang: string;
  parseAddonPrice: (value: unknown) => number;
  formulaSequenceByDishId: Map<string, number>;
  addToCart: (payload: Record<string, unknown>) => void;
  getFormulaDisplayName: (dish: any) => string;
  getFormulaPackPrice: (dish: any) => number;
  setFormulaDish: (value: any) => void;
  setFormulaSourceDish: (value: any) => void;
  setFormulaSelections: (value: Record<string, string>) => void;
  setFormulaSelectionDetails: (value: Record<string, any>) => void;
  setFormulaMainDetails: (value: any) => void;
  emptyFormulaSelectionDetails: any;
  setFormulaItemDetailsOpen: (value: Record<string, boolean>) => void;
};

export function handleFormulaSubmit(args: HandleFormulaSubmitArgs) {
  const selectedFormulaEntries = Object.entries(args.formulaSelections || {})
    .map(([rawCategoryId, rawDishId]) => ({
      categoryId: String(rawCategoryId || "").trim(),
      dishId: String(rawDishId || "").trim(),
    }))
    .filter((entry) => Boolean(entry.categoryId) && Boolean(entry.dishId));
  const missingCategory = args.normalizedFormulaCategoryIds.find((categoryId) => {
    const normalizedCategoryId = String(categoryId || "").trim();
    if (!normalizedCategoryId) return false;
    const options = args.formulaOptionsByCategory.get(normalizedCategoryId) || [];
    if (options.length === 0) return false;
    return !args.formulaSelections[normalizedCategoryId];
  });
  if (missingCategory) {
    args.setFormulaSelectionError(args.formulaUi.missing);
    return;
  }

  const formulaMainConfig = args.formulaDish ? args.getFormulaDishConfig(args.formulaDish) : null;
  const mainSelectedProductOptions = formulaMainConfig
    ? formulaMainConfig.productOptions.filter((option: any) =>
        args.formulaMainDetails.selectedProductOptionIds.includes(String(option.id || "").trim())
      )
    : [];
  if (formulaMainConfig) {
    if (formulaMainConfig.hasRequiredSides && args.formulaMainDetails.selectedSides.length === 0) {
      args.setFormulaSelectionError(args.formulaUi.missingOptions);
      return;
    }
    if (formulaMainConfig.askCooking && !String(args.formulaMainDetails.selectedCooking || "").trim()) {
      args.setFormulaSelectionError(args.formulaUi.missingOptions);
      return;
    }
  }

  const missingRequiredOptionsCategory = selectedFormulaEntries.find((entry) => {
    const normalizedCategoryId = String(entry.categoryId || "").trim();
    if (!normalizedCategoryId) return false;
    const selectedId = String(entry.dishId || "").trim();
    if (!selectedId) return false;
    const selectedDish = args.dishById.get(selectedId);
    if (!selectedDish) return false;
    const config = args.getFormulaDishConfig(selectedDish);
    const details = args.getFormulaSelectionDetails(normalizedCategoryId);
    const selectableProductOptions = args.getSelectableFormulaProductOptionsForDish(selectedDish, config.productOptions);
    const selectableOptionIdSet = new Set(
      selectableProductOptions.map((option) => String(option.id || "").trim()).filter(Boolean)
    );
    const hasSelectedSelectableOption = details.selectedProductOptionIds.some((id: string) =>
      selectableOptionIdSet.has(String(id || "").trim())
    );
    if (selectableProductOptions.length > 0 && !hasSelectedSelectableOption) return true;
    if (config.hasRequiredSides && details.selectedSides.length === 0) return true;
    if (config.askCooking && !String(details.selectedCooking || "").trim()) return true;
    return false;
  });
  if (missingRequiredOptionsCategory) {
    args.setFormulaSelectionError(args.formulaUi.missingOptions);
    return;
  }

  const selections: FormulaSelection[] = selectedFormulaEntries
    .map((entry, entryIndex) => {
      const normalizedCategoryId = String(entry.categoryId || "").trim();
      const selectedId = String(entry.dishId || "").trim();
      if (!normalizedCategoryId || !selectedId) return null;
      const category = args.categoryById.get(normalizedCategoryId);
      const selectedDish = args.dishById.get(selectedId);
      if (!selectedDish) return null;
      const config = args.getFormulaDishConfig(selectedDish);
      const details = args.getFormulaSelectionDetails(normalizedCategoryId);
      const selectedOptions = config.productOptions.filter((option: any) =>
        details.selectedProductOptionIds.includes(String(option.id || "").trim())
      );
      const formattedSelectedOptions = selectedOptions.map((option: any) => ({
        id: String(option.id || "").trim() || null,
        name: String(args.getProductOptionLabel(option, args.lang) || option.name || "").trim() || null,
        price: Number(args.parseAddonPrice(option.price_override ?? option.price ?? 0) || 0),
      }));
      const selectedOptionNames = selectedOptions
        .map((option: any) => args.getProductOptionLabel(option, args.lang))
        .filter(Boolean);
      const selectedOptionPrice = selectedOptions.reduce(
        (sum: number, option: any) => sum + args.parseAddonPrice(option.price_override ?? option.price ?? 0),
        0
      );
      const rawSupplements = Array.isArray(details.supplements)
        ? details.supplements
        : Array.isArray(details.selectedExtras)
          ? details.selectedExtras
          : [];
      const supplements = rawSupplements
        .map((extra: any) => {
          if (typeof extra === "string" || typeof extra === "number") {
            const name = String(extra || "").trim();
            return name ? { name, price: 0 } : null;
          }
          const name = String(extra?.name || extra?.label || extra?.label_fr || "").trim();
          if (!name) return null;
          return {
            name,
            price: Number(args.parseAddonPrice(extra?.price ?? 0) || 0),
          };
        })
        .filter(Boolean);
      const linkedSequence = args.formulaSequenceByDishId.get(selectedId);
      const categoryIndexInFormula = args.normalizedFormulaCategoryIds.findIndex(
        (categoryId) => String(categoryId || "").trim() === normalizedCategoryId
      );
      const fallbackSequence = categoryIndexInFormula >= 0 ? categoryIndexInFormula + 1 : entryIndex + 1;
      const sequence = Number.isFinite(Number(linkedSequence)) ? Number(linkedSequence) : fallbackSequence;
      return {
        categoryId: normalizedCategoryId,
        categoryLabel: category ? args.getCategoryLabel(category) : "",
        dishId: selectedId,
        dishName: args.getDishName(selectedDish, args.lang),
        dishNameFr:
          String(selectedDish.name_fr || selectedDish.name || selectedDish.nom || "").trim() ||
          args.getDishName(selectedDish, args.lang),
        sequence,
        selectedSideIds: details.selectedSideIds,
        selectedSides: details.selectedSides,
        selectedCooking: details.selectedCooking,
        selectedOptionIds: details.selectedProductOptionIds,
        selectedOptions: formattedSelectedOptions,
        selectedOptionNames,
        selectedOptionPrice,
        supplements,
      };
    })
    .filter(Boolean) as FormulaSelection[];

  args.addToCart({
    dish: args.formulaDish,
    quantity: 1,
    selectedSides: args.formulaMainDetails.selectedSides,
    selectedSideIds: args.formulaMainDetails.selectedSideIds,
    selectedExtras: [],
    selectedProductOptions: mainSelectedProductOptions,
    selectedProductOption: mainSelectedProductOptions[0] || null,
    selectedCooking: args.formulaMainDetails.selectedCooking,
    specialRequest: "",
    formulaSelections: selections,
    formulaDishId: String(args.formulaDish.id || "").trim() || undefined,
    formulaDishName: args.getFormulaDisplayName(args.formulaDish),
    formulaUnitPrice: args.getFormulaPackPrice(args.formulaDish),
  });

  args.setFormulaDish(null);
  args.setFormulaSourceDish(null);
  args.setFormulaSelections({});
  args.setFormulaSelectionDetails({});
  args.setFormulaMainDetails(args.emptyFormulaSelectionDetails);
  args.setFormulaSelectionError("");
  args.setFormulaItemDetailsOpen({});
}
