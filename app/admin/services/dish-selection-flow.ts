import type { DishItem, ExtraChoice, ProductOptionChoice, SideLibraryItem } from "../types";

type RunOpenOptionsModalServiceParams = {
  dish: DishItem;
  loadDishOptionsFromDishes: (dish: DishItem) => Promise<DishItem>;
  buildOptionsModalState: (params: {
    sourceDish: DishItem;
    sidesLibrary: SideLibraryItem[];
    parseDishSideIds: (dish: DishItem) => Array<string | number>;
    parseDishProductOptions: (dish: DishItem) => ProductOptionChoice[];
    fetchProductOptionsByProductId: (productId: string | number) => Promise<ProductOptionChoice[]>;
    parseDishExtras: (dish: DishItem) => ExtraChoice[];
    loadDishExtrasFromRelations: (dishId: string | number) => Promise<ExtraChoice[]>;
    normalizeLookupText: (value: unknown) => string;
  }) => Promise<{
    sourceDish: DishItem;
    sideChoices: string[];
    variantOptions: ProductOptionChoice[];
    extraChoices: ExtraChoice[];
  }>;
  sidesLibrary: SideLibraryItem[];
  parseDishSideIds: (dish: DishItem) => Array<string | number>;
  parseDishProductOptions: (dish: DishItem) => ProductOptionChoice[];
  fetchProductOptionsByProductId: (productId: string | number) => Promise<ProductOptionChoice[]>;
  parseDishExtras: (dish: DishItem) => ExtraChoice[];
  loadDishExtrasFromRelations: (dishId: string | number) => Promise<ExtraChoice[]>;
  normalizeLookupText: (value: unknown) => string;
  setModalDish: (dish: DishItem | null) => void;
  setModalQty: (value: number) => void;
  setModalSideChoices: (choices: string[]) => void;
  setModalSelectedSides: (sides: string[]) => void;
  setModalProductOptions: (options: ProductOptionChoice[]) => void;
  setModalSelectedProductOptionId: (value: string) => void;
  setModalExtraChoices: (choices: ExtraChoice[]) => void;
  setModalSelectedExtras: (extras: ExtraChoice[]) => void;
  setModalCooking: (value: string) => void;
  setModalKitchenComment: (value: string) => void;
  setModalOpen: (value: boolean) => void;
  setFastMessage: (message: string) => void;
};

export async function runOpenOptionsModalService({
  dish,
  loadDishOptionsFromDishes,
  buildOptionsModalState,
  sidesLibrary,
  parseDishSideIds,
  parseDishProductOptions,
  fetchProductOptionsByProductId,
  parseDishExtras,
  loadDishExtrasFromRelations,
  normalizeLookupText,
  setModalDish,
  setModalQty,
  setModalSideChoices,
  setModalSelectedSides,
  setModalProductOptions,
  setModalSelectedProductOptionId,
  setModalExtraChoices,
  setModalSelectedExtras,
  setModalCooking,
  setModalKitchenComment,
  setModalOpen,
  setFastMessage,
}: RunOpenOptionsModalServiceParams) {
  try {
    const sourceDish = await loadDishOptionsFromDishes(dish);
    console.log("STRUCTURE RÉELLE DU PLAT:", sourceDish);
    const modalState = await buildOptionsModalState({
      sourceDish,
      sidesLibrary,
      parseDishSideIds,
      parseDishProductOptions,
      fetchProductOptionsByProductId,
      parseDishExtras,
      loadDishExtrasFromRelations,
      normalizeLookupText,
    });
    setModalDish(modalState.sourceDish);
    setModalQty(1);
    setModalSideChoices(modalState.sideChoices);
    setModalSelectedSides([]);
    setModalProductOptions(modalState.variantOptions);
    setModalSelectedProductOptionId("");
    setModalExtraChoices(modalState.extraChoices);
    setModalSelectedExtras([]);
    setModalCooking("");
    setModalKitchenComment("");
    setModalOpen(true);
  } catch (error) {
    console.error("Erreur ouverture modal options:", error);
    setFastMessage("Erreur de chargement des options.");
  }
}

type DishSelectionAction =
  | { kind: "open_formula"; sourceDishForFormula: DishItem }
  | { kind: "open_options"; sourceDish: DishItem }
  | { kind: "increment"; dishId: string }
  | { kind: "noop" };

type RunHandleSelectDishServiceParams = {
  dish: DishItem;
  evaluateDishSelectionAction: (params: {
    dish: DishItem;
    dishes: DishItem[];
    loadDishOptionsFromDishes: (dish: DishItem) => Promise<DishItem>;
    parseDishProductOptions: (dish: DishItem) => ProductOptionChoice[];
    fetchProductOptionsByProductId: (productId: string | number) => Promise<ProductOptionChoice[]>;
    parseDishExtras: (dish: DishItem) => ExtraChoice[];
    loadDishExtrasFromRelations: (dishId: string | number) => Promise<ExtraChoice[]>;
    dishNeedsCooking: (dish: DishItem) => boolean;
    parseDishSideIds: (dish: DishItem) => Array<string | number>;
  }) => Promise<DishSelectionAction>;
  dishes: DishItem[];
  loadDishOptionsFromDishes: (dish: DishItem) => Promise<DishItem>;
  parseDishProductOptions: (dish: DishItem) => ProductOptionChoice[];
  fetchProductOptionsByProductId: (productId: string | number) => Promise<ProductOptionChoice[]>;
  parseDishExtras: (dish: DishItem) => ExtraChoice[];
  loadDishExtrasFromRelations: (dishId: string | number) => Promise<ExtraChoice[]>;
  dishNeedsCooking: (dish: DishItem) => boolean;
  parseDishSideIds: (dish: DishItem) => Array<string | number>;
  onOpenFormula: (dish: DishItem) => Promise<void>;
  onOpenOptions: (dish: DishItem) => Promise<void>;
  onIncrementDishQty: (dishId: string) => void;
  setFastMessage: (message: string) => void;
};

export async function runHandleSelectDishService({
  dish,
  evaluateDishSelectionAction,
  dishes,
  loadDishOptionsFromDishes,
  parseDishProductOptions,
  fetchProductOptionsByProductId,
  parseDishExtras,
  loadDishExtrasFromRelations,
  dishNeedsCooking,
  parseDishSideIds,
  onOpenFormula,
  onOpenOptions,
  onIncrementDishQty,
  setFastMessage,
}: RunHandleSelectDishServiceParams) {
  try {
    const action = await evaluateDishSelectionAction({
      dish,
      dishes,
      loadDishOptionsFromDishes,
      parseDishProductOptions,
      fetchProductOptionsByProductId,
      parseDishExtras,
      loadDishExtrasFromRelations,
      dishNeedsCooking,
      parseDishSideIds,
    });
    if (action.kind === "open_formula") {
      await onOpenFormula(action.sourceDishForFormula);
      return;
    }
    if (action.kind === "open_options") {
      await onOpenOptions(action.sourceDish);
      return;
    }
    if (action.kind === "increment") {
      onIncrementDishQty(action.dishId);
    }
  } catch (error) {
    console.error("Erreur sélection plat:", error);
    setFastMessage("Erreur lors de la sélection du plat.");
  }
}
