import type { DishItem, ExtraChoice, SideLibraryItem } from "../types";
import { parsePriceNumber } from "../utils/page-helpers";

type EvaluateDishSelectionArgs = {
  dish: DishItem;
  dishes: DishItem[];
  loadDishOptionsFromDishes: (dish: DishItem) => Promise<DishItem>;
  parseDishProductOptions: (dish: DishItem) => Array<{ id: string; name: string; price: number; required: boolean }>;
  fetchProductOptionsByProductId: (productId: string | number) => Promise<Array<{ id: string; name: string; price: number; required: boolean }>>;
  parseDishExtras: (dish: DishItem) => ExtraChoice[];
  loadDishExtrasFromRelations: (dishId: string | number) => Promise<ExtraChoice[]>;
  dishNeedsCooking: (dish: DishItem) => boolean;
  parseDishSideIds: (dish: DishItem) => Array<string | number>;
};

export async function evaluateDishSelectionAction(args: EvaluateDishSelectionArgs) {
  const {
    dish,
    dishes,
    loadDishOptionsFromDishes,
    parseDishProductOptions,
    fetchProductOptionsByProductId,
    parseDishExtras,
    loadDishExtrasFromRelations,
    dishNeedsCooking,
    parseDishSideIds,
  } = args;
  const displayMode = String((dish as DishItem & { formulaDisplayMode?: unknown }).formulaDisplayMode || "")
    .trim()
    .toLowerCase();
  const formulaSourceDishId = String((dish as DishItem & { formula_base_dish_id?: unknown }).formula_base_dish_id || dish.id || "").trim();
  const sourceDishForFormula = dishes.find((row) => String(row.id || "").trim() === formulaSourceDishId) || dish;
  const shouldOpenFormula =
    displayMode === "formula"
      ? true
      : displayMode === "base"
        ? false
        : Boolean((dish as DishItem & { is_formula?: boolean | null }).is_formula);
  if (shouldOpenFormula) {
    return { kind: "open_formula", sourceDishForFormula } as const;
  }
  if (dish.ask_cooking || dish.has_sides) {
    return { kind: "open_options", sourceDish: dish } as const;
  }
  const sourceDish = await loadDishOptionsFromDishes(dish);
  if (sourceDish.ask_cooking || sourceDish.has_sides) {
    return { kind: "open_options", sourceDish } as const;
  }
  const inlineProductOptions = parseDishProductOptions(sourceDish);
  const dbProductOptions =
    inlineProductOptions.length === 0 && sourceDish.id != null
      ? await fetchProductOptionsByProductId(sourceDish.id)
      : [];
  const allProductOptions = inlineProductOptions.length > 0 ? inlineProductOptions : dbProductOptions;
  const parsedExtras = parseDishExtras(sourceDish);
  const relationExtras =
    parsedExtras.length === 0 && sourceDish.id != null ? await loadDishExtrasFromRelations(sourceDish.id) : [];
  const hasCooking = dishNeedsCooking(sourceDish);
  const hasSides = parseDishSideIds(sourceDish).length > 0;
  const hasOptions =
    allProductOptions.length > 0 || hasCooking || hasSides || parsedExtras.length > 0 || relationExtras.length > 0;
  if (hasOptions) {
    return { kind: "open_options", sourceDish } as const;
  }
  const dishId = String(sourceDish.id || "").trim();
  if (!dishId) return { kind: "noop" } as const;
  return { kind: "increment", dishId } as const;
}

type BuildOptionsModalArgs = {
  sourceDish: DishItem;
  sidesLibrary: SideLibraryItem[];
  parseDishSideIds: (dish: DishItem) => Array<string | number>;
  parseDishProductOptions: (dish: DishItem) => Array<{ id: string; name: string; price: number; required: boolean }>;
  fetchProductOptionsByProductId: (productId: string | number) => Promise<Array<{ id: string; name: string; price: number; required: boolean }>>;
  parseDishExtras: (dish: DishItem) => ExtraChoice[];
  loadDishExtrasFromRelations: (dishId: string | number) => Promise<ExtraChoice[]>;
  normalizeLookupText: (raw: unknown) => string;
};

export async function buildOptionsModalState(args: BuildOptionsModalArgs) {
  const {
    sourceDish,
    sidesLibrary,
    parseDishSideIds,
    parseDishProductOptions,
    fetchProductOptionsByProductId,
    parseDishExtras,
    loadDishExtrasFromRelations,
    normalizeLookupText,
  } = args;
  const sideIds = parseDishSideIds(sourceDish);
  const sideMap = new Map<string, string>();
  sidesLibrary.forEach((side) => {
    const label =
      String(side.name_fr || "").trim() ||
      String(side.name_en || "").trim() ||
      String(side.name_es || "").trim() ||
      String(side.name_de || "").trim() ||
      String(side.id);
    sideMap.set(String(side.id), label);
  });

  const sideChoices = sideIds.map((id) => sideMap.get(String(id)) || String(id));
  const inlineProductOptions = parseDishProductOptions(sourceDish);
  const dbProductOptions =
    inlineProductOptions.length === 0 && sourceDish.id != null
      ? await fetchProductOptionsByProductId(sourceDish.id)
      : [];
  const allProductOptions = inlineProductOptions.length > 0 ? inlineProductOptions : dbProductOptions;
  const variantOptions = allProductOptions.filter((option) => parsePriceNumber(option.price) <= 0);
  const paidProductOptionsAsExtras: ExtraChoice[] = allProductOptions
    .filter((option) => parsePriceNumber(option.price) > 0)
    .map((option) => ({ name: option.name, price: parsePriceNumber(option.price) }));

  const parsedExtras = parseDishExtras(sourceDish);
  const relationExtras =
    parsedExtras.length === 0 && sourceDish.id != null ? await loadDishExtrasFromRelations(sourceDish.id) : [];
  const baseExtras = parsedExtras.length > 0 ? parsedExtras : relationExtras;
  const mergedExtras = [...baseExtras, ...paidProductOptionsAsExtras];
  const uniqueExtras = new Map<string, ExtraChoice>();
  mergedExtras.forEach((extra) => {
    const key = `${normalizeLookupText(extra.name)}:${parsePriceNumber(extra.price).toFixed(2)}`;
    if (!uniqueExtras.has(key)) uniqueExtras.set(key, { name: extra.name, price: parsePriceNumber(extra.price) });
  });
  const extraChoices = Array.from(uniqueExtras.values());

  return {
    sourceDish,
    sideChoices,
    variantOptions,
    extraChoices,
  };
}
