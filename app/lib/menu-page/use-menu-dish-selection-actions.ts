"use client";

import { useMemo } from "react";
import { getDishExtras, parseOptionsFromDescription } from "./runtime-dish";
import type { CartItem, Dish, FormulaSelectionDetails, ProductOptionItem, SideLibraryItem } from "./runtime-core";

type UseMenuDishSelectionActionsArgs = {
  dishes: Dish[];
  sidesLibrary: SideLibraryItem[];
  selectedCategoryId: string | number | null;
  FORMULAS_CATEGORY_ID: string;
  lang: string;
  selectedSides: string[];
  selectedExtras: Array<{ price: number | string; name_fr?: string; name?: string }>;
  modalSelectedProductOptions: ProductOptionItem[];
  modalSelectedProductOption: ProductOptionItem | null;
  selectedCooking: string;
  specialRequest: string;
  uiText: any;
  emptyFormulaSelectionDetails: FormulaSelectionDetails;
  toBooleanFlag: (value: unknown) => boolean;
  getSideLabel: (side: SideLibraryItem) => string;
  buildInstructionText: (
    lang: string,
    selectedSides?: string[],
    selectedExtras?: any[],
    selectedProductOptions?: ProductOptionItem[] | null,
    selectedProductOption?: ProductOptionItem | null,
    selectedCooking?: string,
    specialRequest?: string,
    uiCopy?: any
  ) => string;
  addToCart: (item: CartItem, options?: { skipUpsell?: boolean; fromRecommendation?: boolean }) => void;
  setFormulaDish: (value: Dish | null) => void;
  setFormulaSourceDish: (value: Dish | null) => void;
  setFormulaSelections: (value: Record<string, string>) => void;
  setFormulaSelectionDetails: (value: Record<string, FormulaSelectionDetails>) => void;
  setFormulaMainDetails: (value: FormulaSelectionDetails) => void;
  setFormulaSelectionError: (value: string) => void;
  setFormulaItemDetailsOpen: (value: Record<string, boolean>) => void;
  setFormulaActiveCategoryId: (value: string) => void;
  setSelectedDish: (value: Dish | null) => void;
  setModalProductOptions: (value: ProductOptionItem[]) => void;
  setSelectedProductOptionIds: (value: string[]) => void;
  setRecommendationSourceDishId: (value: string) => void;
  setDishModalQuantity: (value: number) => void;
  setSpecialRequest: (value: string) => void;
  setSelectedSides: (value: string[]) => void;
  setSelectedCooking: (value: string) => void;
  setSelectedExtras: (value: any[]) => void;
  setModalSidesOptions: (value: string[]) => void;
  setModalExtrasOptions: (value: any[]) => void;
  setModalAskCooking: (value: boolean) => void;
  setSideError: (value: string) => void;
};

export function useMenuDishSelectionActions(args: UseMenuDishSelectionActionsArgs) {
  const openFormulaModal = (formula: Dish, sourceDish?: Dish | null) => {
    const sourceFormula = args.dishes.find((row) => String(row.id) === String(formula.id)) || formula;
    const resolvedSourceDish = sourceDish
      ? args.dishes.find((row) => String(row.id) === String(sourceDish.id)) || sourceDish
      : null;
    args.setFormulaDish(sourceFormula);
    args.setFormulaSourceDish(resolvedSourceDish);
    args.setFormulaSelections({});
    args.setFormulaSelectionDetails({});
    args.setFormulaMainDetails(args.emptyFormulaSelectionDetails);
    args.setFormulaSelectionError("");
    args.setFormulaItemDetailsOpen({});
    args.setFormulaActiveCategoryId("");
    args.setSelectedDish(null);
    args.setModalProductOptions([]);
    args.setSelectedProductOptionIds([]);
    args.setRecommendationSourceDishId("");
  };

  const handleSelectDish = (dish: Dish) => {
    const isFormulaDish = args.toBooleanFlag((dish as any).is_formula ?? dish.is_formula);
    if (isFormulaDish && String(args.selectedCategoryId || "") === args.FORMULAS_CATEGORY_ID) {
      openFormulaModal(dish, null);
      return;
    }
    const sourceDish = args.dishes.find((row) => String(row.id) === String(dish.id)) || dish;
    const parsed = parseOptionsFromDescription(sourceDish.description || "");
    const sourceDishRecord = sourceDish as unknown as any;
    const productOptions = Array.isArray(sourceDishRecord.product_options)
      ? ((sourceDishRecord.product_options as ProductOptionItem[]) || [])
      : [];
    const dishExtras = getDishExtras(sourceDish);
    const sideIds = Array.isArray(sourceDish.selected_sides) ? sourceDish.selected_sides : [];
    const sideOptionsFromLibrary = sideIds
      .map((id) => args.sidesLibrary.find((side) => String(side.id) === String(id)))
      .filter(Boolean)
      .map((side) => args.getSideLabel(side as SideLibraryItem));
    args.setSelectedDish(sourceDish);
    args.setDishModalQuantity(1);
    args.setSpecialRequest("");
    args.setSelectedSides([]);
    args.setSelectedCooking("");
    args.setSelectedExtras([]);
    args.setModalProductOptions(productOptions);
    args.setModalSidesOptions(sideOptionsFromLibrary);
    args.setModalExtrasOptions(dishExtras);
    args.setModalAskCooking(!!(sourceDish.ask_cooking || parsed.askCooking));
    args.setSideError("");
    args.setSelectedProductOptionIds([]);
  };

  const dishNeedsQuickAddModal = (dish: Dish) => {
    const sourceDish = args.dishes.find((row) => String(row.id) === String(dish.id)) || dish;
    const parsed = parseOptionsFromDescription(sourceDish.description || "");
    const sourceDishRecord = sourceDish as unknown as any;
    const productOptions = Array.isArray(sourceDishRecord.product_options)
      ? ((sourceDishRecord.product_options as ProductOptionItem[]) || [])
      : [];
    const extras = getDishExtras(sourceDish);
    const selectedSideIds = Array.isArray(sourceDish.selected_sides) ? sourceDish.selected_sides : [];
    const hasRequiredSides =
      Boolean(sourceDish.has_sides) ||
      selectedSideIds.length > 0 ||
      (Array.isArray(parsed.sideIds) && parsed.sideIds.length > 0);
    const needsCooking = Boolean(sourceDish.ask_cooking || parsed.askCooking);
    return hasRequiredSides || needsCooking || productOptions.length > 0 || extras.length > 0;
  };

  const handleQuickAddFromList = (dish: Dish) => {
    if (args.toBooleanFlag((dish as any).is_formula ?? dish.is_formula)) {
      openFormulaModal(dish, null);
      return;
    }
    if (dishNeedsQuickAddModal(dish)) {
      handleSelectDish(dish);
      return;
    }
    args.addToCart({
      dish,
      quantity: 1,
      selectedSides: [],
      selectedSideIds: [],
      selectedExtras: [],
      selectedProductOptions: [],
      selectedProductOption: null,
      selectedCooking: "",
      specialRequest: "",
    });
  };

  const modalInstructionPreview = useMemo(() => {
    return args.buildInstructionText(
      args.lang,
      args.selectedSides,
      args.selectedExtras,
      args.modalSelectedProductOptions,
      args.modalSelectedProductOption,
      args.selectedCooking,
      args.specialRequest,
      args.uiText
    );
  }, [
    args.lang,
    args.selectedSides,
    args.selectedExtras,
    args.modalSelectedProductOptions,
    args.modalSelectedProductOption,
    args.selectedCooking,
    args.specialRequest,
    args.uiText,
    args.buildInstructionText,
  ]);

  return {
    openFormulaModal,
    handleSelectDish,
    dishNeedsQuickAddModal,
    handleQuickAddFromList,
    modalInstructionPreview,
  };
}
