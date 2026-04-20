import type { DishItem, FormulaSelectionDetails } from "../types";
import type { Dispatch, SetStateAction } from "react";

export function runCloseFormulaModalService(params: {
  setConfigModalOpen: (value: boolean) => void;
  setFormulaToConfig: (dish: DishItem | null) => void;
  setFormulaModalOpen: (value: boolean) => void;
  setFormulaModalDish: (dish: DishItem | null) => void;
  setFormulaModalSourceDish: (dish: DishItem | null) => void;
  setFormulaModalSelections: (value: Record<string, string>) => void;
  setFormulaModalSelectionDetails: (value: Record<string, FormulaSelectionDetails>) => void;
  setFormulaModalError: (value: string) => void;
  setFormulaModalItemDetailsOpen: (value: Record<string, boolean>) => void;
  setFormulaResolvedDishById: (value: Record<string, DishItem>) => void;
  setFormulaOptionModalState: Dispatch<SetStateAction<{ categoryId: string; dishId: string } | null>>;
}): void {
  const {
    setConfigModalOpen,
    setFormulaToConfig,
    setFormulaModalOpen,
    setFormulaModalDish,
    setFormulaModalSourceDish,
    setFormulaModalSelections,
    setFormulaModalSelectionDetails,
    setFormulaModalError,
    setFormulaModalItemDetailsOpen,
    setFormulaResolvedDishById,
    setFormulaOptionModalState,
  } = params;
  setConfigModalOpen(false);
  setFormulaToConfig(null);
  setFormulaModalOpen(false);
  setFormulaModalDish(null);
  setFormulaModalSourceDish(null);
  setFormulaModalSelections({});
  setFormulaModalSelectionDetails({});
  setFormulaModalError("");
  setFormulaModalItemDetailsOpen({});
  setFormulaResolvedDishById({});
  setFormulaOptionModalState(null);
}

export async function runOpenFormulaModalService(params: {
  formula: DishItem;
  sourceDish?: DishItem | null;
  dishes: DishItem[];
  restaurantId: string | number | null;
  scopedRestaurantId: string;
  readBooleanFlag: (value: unknown, defaultValue?: boolean) => boolean;
  fetchRestaurantFormulaRowByDishId: (dishId: string | number) => Promise<Record<string, unknown> | null>;
  resolveFormulaModalOpeningData: (params: any) => Promise<{
    formulaDishId: string;
    resolvedSourceDish: DishItem | null;
    enrichedFormula: DishItem;
    loadError: string | null;
    configEmpty: boolean;
  }>;
  setFormulaModalError: (value: string) => void;
  setFormulaModalDish: (dish: DishItem | null) => void;
  setFormulaModalSourceDish: (dish: DishItem | null) => void;
  setFormulaModalSelections: (value: Record<string, string>) => void;
  setFormulaModalSelectionDetails: (value: Record<string, FormulaSelectionDetails>) => void;
  setFormulaModalItemDetailsOpen: (value: Record<string, boolean>) => void;
  setFormulaOptionModalState: Dispatch<SetStateAction<{ categoryId: string; dishId: string } | null>>;
  setFormulaResolvedDishById: (updater: (prev: Record<string, DishItem>) => Record<string, DishItem>) => void;
  setFormulaModalOpen: (value: boolean) => void;
}): Promise<void> {
  const {
    formula,
    sourceDish,
    dishes,
    restaurantId,
    scopedRestaurantId,
    readBooleanFlag,
    fetchRestaurantFormulaRowByDishId,
    resolveFormulaModalOpeningData,
    setFormulaModalError,
    setFormulaModalDish,
    setFormulaModalSourceDish,
    setFormulaModalSelections,
    setFormulaModalSelectionDetails,
    setFormulaModalItemDetailsOpen,
    setFormulaOptionModalState,
    setFormulaResolvedDishById,
    setFormulaModalOpen,
  } = params;
  try {
    const currentRestaurantId = String(restaurantId || scopedRestaurantId || "").trim();
    const { formulaDishId, resolvedSourceDish, enrichedFormula, loadError, configEmpty } =
      await resolveFormulaModalOpeningData({
        formula,
        sourceDish,
        dishes,
        currentRestaurantId,
        readBooleanFlag,
        fetchRestaurantFormulaRowByDishId,
      });

    if (loadError) {
      setFormulaModalError(loadError);
    } else if (configEmpty) {
      setFormulaModalError("Configuration formule vide: aucun plat assigne (dish_ids).");
    } else {
      setFormulaModalError("");
    }

    setFormulaModalDish(enrichedFormula);
    setFormulaModalSourceDish(resolvedSourceDish);
    setFormulaModalSelections({});
    setFormulaModalSelectionDetails({});
    setFormulaModalItemDetailsOpen({});
    setFormulaOptionModalState(null);
    setFormulaResolvedDishById(() => {
      const next: Record<string, DishItem> = {};
      if (formulaDishId) next[formulaDishId] = enrichedFormula;
      const sourceDishId = String(resolvedSourceDish?.id || "").trim();
      if (sourceDishId && resolvedSourceDish) next[sourceDishId] = resolvedSourceDish;
      return next;
    });
    setFormulaModalOpen(true);
  } catch (error) {
    console.error("Erreur ouverture modal formule:", error);
    setFormulaModalError("Erreur lors de l'ouverture de la formule.");
    setFormulaModalOpen(true);
  }
}

export async function runEnsureFormulaDishDetailsService(params: {
  dish: DishItem | null | undefined;
  formulaResolvedDishById: Record<string, DishItem>;
  loadDishOptionsFromDishes: (dish: DishItem) => Promise<DishItem>;
  setFormulaResolvedDishById: (updater: (prev: Record<string, DishItem>) => Record<string, DishItem>) => void;
}): Promise<DishItem | null> {
  const { dish, formulaResolvedDishById, loadDishOptionsFromDishes, setFormulaResolvedDishById } = params;
  if (!dish) return null;
  const dishId = String(dish.id || "").trim();
  const cached = dishId ? formulaResolvedDishById[dishId] : null;
  if (cached) return cached;
  const loaded = await loadDishOptionsFromDishes(dish);
  const loadedDish = loaded || dish;
  if (dishId) {
    setFormulaResolvedDishById((prev) => ({ ...prev, [dishId]: loadedDish }));
  }
  return loadedDish;
}
