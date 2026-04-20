/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DishItem, ExtraChoice, FastOrderLine, Order, ProductOptionChoice } from "../types";
import type { Item } from "../utils/order-items";
import { parseExtraChoicesFromRowsAdvanced } from "../utils/dish-option-parsers";
import { buildLineInstructions as buildLineInstructionsFormatter } from "../utils/order-line-format";
import { deriveOrderStatusFromItems as deriveOrderStatusFromItemsPricing } from "../utils/fast-line-pricing";
import {
  getReadyItemEntries as getReadyItemEntriesFromWorkflow,
  resolveLastServedItemTimestampMs,
  resolveOrderItemLabel as resolveOrderItemLabelFromWorkflow,
} from "../utils/order-status-workflow";

type Params = Record<string, any>;

export function useAdminParsersAndFormatters(params: Params) {
  const {
    dishes,
    getDishName,
    getDishOptionsSource,
    parseDishExtrasParser,
    parseDishProductOptionsParser,
    parseDishSideIdsParser,
    dishNeedsCookingParser,
    isSideSelectionRequiredParser,
    getSideMaxSelectionsParser,
    isProductOptionSelectionRequiredParser,
    fetchDishExtrasByDishId,
    parseItems,
    isItemServed,
    isItemReady,
    isDrink,
    getItemPrepStatus,
  } = params;

  const parseExtraChoicesFromRows = (rows: Array<Record<string, unknown>>) => parseExtraChoicesFromRowsAdvanced(rows);
  const parseDishExtras = (dish: DishItem): ExtraChoice[] => parseDishExtrasParser(dish, getDishOptionsSource, parseExtraChoicesFromRows);
  const parseDishSideIds = (dish: DishItem): Array<string | number> => parseDishSideIdsParser(dish, getDishOptionsSource);
  const dishNeedsCooking = (dish: DishItem) => dishNeedsCookingParser(dish, getDishOptionsSource, getDishName);
  const parseDishProductOptions = (dish: DishItem): ProductOptionChoice[] => parseDishProductOptionsParser(dish);
  const isSideSelectionRequired = (dish: DishItem, choices: string[]) => isSideSelectionRequiredParser(dish, choices);
  const getSideMaxSelections = (dish: DishItem, choices: string[]) => getSideMaxSelectionsParser(dish, choices);
  const isProductOptionSelectionRequired = (dish: DishItem, options: ProductOptionChoice[]) =>
    isProductOptionSelectionRequiredParser(dish, options);

  async function loadDishExtrasFromRelations(dishId: string | number): Promise<ExtraChoice[]> {
    const rows = await fetchDishExtrasByDishId(dishId);
    if (rows.length === 0) return [];
    const directDishOptions = parseExtraChoicesFromRows(rows);
    return directDishOptions.length > 0 ? directDishOptions : [];
  }

  const buildLineInstructions = (line: FastOrderLine) => buildLineInstructionsFormatter(line);
  const deriveOrderStatusFromItems = (items: Item[]) =>
    deriveOrderStatusFromItemsPricing(items, { isItemServed, isItemReady, isDrink, getItemPrepStatus });
  const resolveOrderItemLabel = (item: Item) => resolveOrderItemLabelFromWorkflow(item, dishes);
  const getReadyItemEntries = (order: Order) => getReadyItemEntriesFromWorkflow(order, parseItems, isItemServed, isItemReady);
  const resolveLastServedItemTimestamp = (order: Order) => resolveLastServedItemTimestampMs(order, parseItems, isItemServed);

  return {
    parseDishExtras,
    parseDishSideIds,
    dishNeedsCooking,
    parseDishProductOptions,
    isSideSelectionRequired,
    getSideMaxSelections,
    isProductOptionSelectionRequired,
    loadDishExtrasFromRelations,
    buildLineInstructions,
    deriveOrderStatusFromItems,
    resolveOrderItemLabel,
    getReadyItemEntries,
    resolveLastServedItemTimestamp,
  };
}
