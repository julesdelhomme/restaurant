import type { DishItem } from "../types";

export async function runLoadDishOptionsFromDishesService(params: {
  dish: DishItem;
  restaurantId: string | number | null;
  scopedRestaurantId: string;
  loadDishOptionsFromDishesService: (dish: DishItem, currentRestaurantId: string) => Promise<DishItem>;
}): Promise<DishItem> {
  const { dish, restaurantId, scopedRestaurantId, loadDishOptionsFromDishesService } = params;
  const currentRestaurantId = String(restaurantId || scopedRestaurantId || "").trim();
  return loadDishOptionsFromDishesService(dish, currentRestaurantId);
}

export async function runFormulaDishNeedsOptionsService(params: {
  dish: DishItem;
  ensureFormulaDishDetails: (dish: DishItem) => Promise<DishItem | null>;
  getFormulaDishConfig: (dish: DishItem) => {
    productOptions: unknown[];
    hasRequiredSides: boolean;
    askCooking: boolean;
    extras: unknown[];
  };
}): Promise<boolean> {
  const { dish, ensureFormulaDishDetails, getFormulaDishConfig } = params;
  const loadedDish = (await ensureFormulaDishDetails(dish)) || dish;
  const config = getFormulaDishConfig(loadedDish);
  return config.productOptions.length > 0 || config.hasRequiredSides || config.askCooking || config.extras.length > 0;
}

export async function runHandleSelectFormulaService(params: {
  formula: DishItem;
  dishes: DishItem[];
  setFormulaToConfig: (dish: DishItem | null) => void;
  openFormulaModal: (formula: DishItem, sourceDish?: DishItem | null) => Promise<void>;
  setConfigModalOpen: (value: boolean) => void;
  setFormulaModalError: (value: string) => void;
  setFormulaModalOpen: (value: boolean) => void;
}): Promise<void> {
  const {
    formula,
    dishes,
    setFormulaToConfig,
    openFormulaModal,
    setConfigModalOpen,
    setFormulaModalError,
    setFormulaModalOpen,
  } = params;
  try {
    const sourceFormula = dishes?.find((row) => String(row?.id || "") === String(formula?.id || "")) || formula;
    setFormulaToConfig(sourceFormula);
    await openFormulaModal(sourceFormula, null);
    setConfigModalOpen(true);
  } catch (error) {
    console.error("Erreur selection formule:", error);
    setFormulaModalError("Erreur lors de la selection de la formule.");
    setFormulaModalOpen(true);
  }
}
