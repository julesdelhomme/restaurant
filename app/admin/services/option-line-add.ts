import type { DishItem, ExtraChoice, FastOrderLine, ProductOptionChoice } from "../types";

type RunHandleAddOptionLineServiceParams = {
  modalDish: DishItem | null;
  modalProductOptions: ProductOptionChoice[];
  modalSelectedProductOptionId: string;
  modalSideChoices: string[];
  modalSelectedSides: string[];
  modalSelectedExtras: ExtraChoice[];
  modalCooking: string;
  modalKitchenComment: string;
  modalQty: number;
  parsePriceNumber: (value: unknown) => number;
  isSideSelectionRequired: (dish: DishItem, sides: string[]) => boolean;
  getSideMaxSelections: (dish: DishItem, sides: string[]) => number;
  isProductOptionSelectionRequired: (dish: DishItem, options: ProductOptionChoice[]) => boolean;
  dishNeedsCooking: (dish: DishItem) => boolean;
  shouldSkipAdd: (signature: string) => boolean;
  getDishCategoryLabel: (dish: DishItem) => string;
  resolveDishDestination: (dish: DishItem) => "cuisine" | "bar";
  makeLineId: () => string;
  getDishName: (dish: DishItem) => string;
  getDishPrice: (dish: DishItem) => number;
  setFastOptionLines: (updater: (prev: FastOrderLine[]) => FastOrderLine[]) => void;
  setModalOpen: (value: boolean) => void;
  setModalDish: (value: DishItem | null) => void;
  setModalProductOptions: (value: ProductOptionChoice[]) => void;
  setModalSelectedProductOptionId: (value: string) => void;
  alertFn?: (message: string) => void;
};

export function runHandleAddOptionLineService({
  modalDish,
  modalProductOptions,
  modalSelectedProductOptionId,
  modalSideChoices,
  modalSelectedSides,
  modalSelectedExtras,
  modalCooking,
  modalKitchenComment,
  modalQty,
  parsePriceNumber,
  isSideSelectionRequired,
  getSideMaxSelections,
  isProductOptionSelectionRequired,
  dishNeedsCooking,
  shouldSkipAdd,
  getDishCategoryLabel,
  resolveDishDestination,
  makeLineId,
  getDishName,
  getDishPrice,
  setFastOptionLines,
  setModalOpen,
  setModalDish,
  setModalProductOptions,
  setModalSelectedProductOptionId,
  alertFn,
}: RunHandleAddOptionLineServiceParams) {
  if (!modalDish) return;

  const notify = typeof alertFn === "function" ? alertFn : (message: string) => alert(message);

  try {
    const safeParsePriceNumber =
      typeof parsePriceNumber === "function"
        ? parsePriceNumber
        : (value: unknown) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : 0;
          };
    const safeIsSideSelectionRequired =
      typeof isSideSelectionRequired === "function" ? isSideSelectionRequired : () => false;
    const safeGetSideMaxSelections = typeof getSideMaxSelections === "function" ? getSideMaxSelections : () => 0;
    const safeIsProductOptionSelectionRequired =
      typeof isProductOptionSelectionRequired === "function" ? isProductOptionSelectionRequired : () => false;
    const safeDishNeedsCooking = typeof dishNeedsCooking === "function" ? dishNeedsCooking : () => false;
    const safeShouldSkipAdd = typeof shouldSkipAdd === "function" ? shouldSkipAdd : () => false;
    const safeGetDishCategoryLabel =
      typeof getDishCategoryLabel === "function" ? getDishCategoryLabel : () => "Cuisine";
    const safeResolveDishDestination =
      typeof resolveDishDestination === "function"
        ? resolveDishDestination
        : (): "cuisine" | "bar" => "cuisine";
    const safeMakeLineId = typeof makeLineId === "function" ? makeLineId : () => `line-${Date.now()}`;
    const safeGetDishName = typeof getDishName === "function" ? getDishName : (dish: DishItem) => String(dish.name_fr || dish.name || "");
    const safeGetDishPrice = typeof getDishPrice === "function" ? getDishPrice : () => 0;

    const safeProductOptions = Array.isArray(modalProductOptions) ? modalProductOptions : [];
    const safeSideChoices = Array.isArray(modalSideChoices) ? modalSideChoices : [];
    const safeSelectedSides = Array.isArray(modalSelectedSides) ? modalSelectedSides : [];
    const safeSelectedExtras = Array.isArray(modalSelectedExtras) ? modalSelectedExtras : [];

    const selectedProductOption =
      safeProductOptions.find((option) => String(option?.id || "") === String(modalSelectedProductOptionId)) || null;
    const sideRequired = safeIsSideSelectionRequired(modalDish, safeSideChoices);
    const sideMaxSelections = safeGetSideMaxSelections(modalDish, safeSideChoices);
    const optionRequired = safeIsProductOptionSelectionRequired(modalDish, safeProductOptions);

    if (sideRequired && safeSelectedSides.length === 0) {
      notify("Veuillez choisir au moins un accompagnement.");
      return;
    }
    if (sideMaxSelections > 0 && safeSelectedSides.length > sideMaxSelections) {
      notify(`Vous pouvez choisir au maximum ${sideMaxSelections} accompagnement${sideMaxSelections > 1 ? "s" : ""}.`);
      return;
    }
    if (optionRequired && !selectedProductOption) {
      notify("Veuillez choisir une option obligatoire.");
      return;
    }
    if (safeDishNeedsCooking(modalDish) && !String(modalCooking || "").trim()) {
      notify("Veuillez choisir une cuisson.");
      return;
    }

    const addSignature = [
      String(modalDish.id || ""),
      String(modalQty || 1),
      String(selectedProductOption?.id || ""),
      safeSelectedSides.slice().sort().join("|"),
      safeSelectedExtras
        .map((extra) => `${String(extra?.name || "").trim()}:${safeParsePriceNumber(extra?.price).toFixed(2)}`)
        .sort()
        .join("|"),
      String(modalCooking || ""),
      String(modalKitchenComment || ""),
    ].join("::");
    if (safeShouldSkipAdd(addSignature)) return;

    const category = safeGetDishCategoryLabel(modalDish);
    const destination = safeResolveDishDestination(modalDish) === "bar" ? "bar" : "cuisine";
    const optionUnit = safeParsePriceNumber(selectedProductOption?.price ?? 0);
    const extrasUnit = safeSelectedExtras.reduce((sum, extra) => {
      const safeExtraPrice = safeParsePriceNumber(extra?.price);
      return sum + (Number.isFinite(safeExtraPrice) ? safeExtraPrice : 0);
    }, 0);
    const baseDishPrice = Number(
      (modalDish as unknown as { price?: unknown }).price ??
      (modalDish as unknown as { dish?: { price?: unknown } }).dish?.price ??
      0
    );
    const finalPrice = Number.isFinite(baseDishPrice) && baseDishPrice > 0 ? baseDishPrice : safeGetDishPrice(modalDish);
    const normalizedSelectedSides =
      sideMaxSelections > 0 ? safeSelectedSides.slice(0, sideMaxSelections) : safeSelectedSides;

    const line: FastOrderLine = {
      lineId: safeMakeLineId(),
      dishId: String(modalDish.id),
      dishName: safeGetDishName(modalDish),
      category,
      categoryId: modalDish.category_id ?? null,
      quantity: modalQty,
      unitPrice: Number(((Number.isFinite(finalPrice) ? finalPrice : 0) + optionUnit + extrasUnit).toFixed(2)),
      selectedSides: normalizedSelectedSides,
      selectedExtras: safeSelectedExtras,
      selectedProductOptionId: selectedProductOption?.id || null,
      selectedProductOptionName: selectedProductOption?.name || null,
      selectedProductOptionPrice: optionUnit,
      selectedCooking: modalCooking,
      specialRequest: modalKitchenComment,
      destination,
      isDrink: destination === "bar",
    };

    if (typeof setFastOptionLines === "function") {
      setFastOptionLines((prev) => [...(Array.isArray(prev) ? prev : []), line]);
    } else {
      console.error("setFastOptionLines est indisponible, ajout annulé.");
      return;
    }
    if (typeof setModalOpen === "function") setModalOpen(false);
    if (typeof setModalDish === "function") setModalDish(null);
    if (typeof setModalProductOptions === "function") setModalProductOptions([]);
    if (typeof setModalSelectedProductOptionId === "function") setModalSelectedProductOptionId("");
  } catch (error) {
    console.error("Erreur ajout avec options:", error);
  }
}
