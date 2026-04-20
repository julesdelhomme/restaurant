"use client";

import {
  normalizeOrderPayloadForSubmit,
  submitOrderToApi,
  validateOrderBeforeSubmit,
} from "./order-submit-runtime";
import { buildOrderItemsFromCart } from "./order-runtime";
import { resolveLegacyServiceStepFromCurrentStep } from "./formula-order-runtime";
import { MENU_PAGE_UI_TEXT } from "./ui-text";
import type {
  CartItem,
  CategoryItem,
  Dish,
  ExtrasItem,
  ProductOptionItem,
  SideLibraryItem,
} from "./runtime";

type UiLabelKey = keyof (typeof MENU_PAGE_UI_TEXT)["fr"]["labels"];

type UseMenuSubmitOrderArgs = {
  cart: CartItem[];
  isInteractionDisabled: boolean;
  isSubmittingOrder: boolean;
  setIsSubmittingOrder: (value: boolean) => void;
  tableNumber: string;
  typedValidationCode: string;
  isValidationCodeValid: boolean;
  tableValidationPromptMessage: string;
  tt: (key: UiLabelKey) => string;
  dishById: Map<string, Dish>;
  sideIdByAlias: Map<string, string>;
  sidesLibrary: SideLibraryItem[];
  lang: string;
  getSelectedProductOptionsList: (
    selectedProductOptions?: ProductOptionItem[] | null,
    selectedProductOption?: ProductOptionItem | null
  ) => ProductOptionItem[];
  isFormulaCartItem: (item: CartItem) => boolean;
  getCartItemUnitPrice: (item: CartItem) => number;
  isDrinkCategory: (categoryId?: string | number | null) => boolean;
  normalizeLookupText: (value: unknown) => string;
  dedupeDisplayValues: (values: unknown[]) => string[];
  buildStableExtraId: (dishId: unknown, extra: ExtrasItem, index: number) => string;
  normalizeCookingKey: (value: unknown) => string;
  getCookingLabelFr: (value: string) => string;
  parsePriceNumber: (value: unknown) => number;
  parseAddonPrice: (value: unknown) => number;
  getProductOptionLabel: (option: ProductOptionItem, lang: string) => string;
  getCategoryDestination: (categoryId?: string | number | null) => "cuisine" | "bar";
  normalizeFormulaOrderItemsForPayload: (
    orderItems: Array<Record<string, unknown>>,
    deps: {
      isDrinkCategory: (categoryId?: string | number | null) => boolean;
      isDessertCategory: (categoryId?: string | number | null) => boolean;
      categoryById: Map<string, CategoryItem>;
      normalizeLookupText: (value: unknown) => string;
    }
  ) => Array<Record<string, unknown>>;
  isDessertCategory: (categoryId?: string | number | null) => boolean;
  categoryById: Map<string, CategoryItem>;
  resolveInitialCurrentStepFromOrderItems: (orderItems: Array<Record<string, unknown>>) => number;
  restaurant: { id?: string | number | null } | null;
  SETTINGS_ROW_ID: string;
  triggerHaptic: (pattern: number | number[]) => void;
  setCart: (value: CartItem[]) => void;
  setOrderSuccess: (value: boolean) => void;
  toLoggableSupabaseError: (error: unknown) => unknown;
};

export function useMenuSubmitOrder({
  cart,
  isInteractionDisabled,
  isSubmittingOrder,
  setIsSubmittingOrder,
  tableNumber,
  typedValidationCode,
  isValidationCodeValid,
  tableValidationPromptMessage,
  tt,
  dishById,
  sideIdByAlias,
  sidesLibrary,
  lang,
  getSelectedProductOptionsList,
  isFormulaCartItem,
  getCartItemUnitPrice,
  isDrinkCategory,
  normalizeLookupText,
  dedupeDisplayValues,
  buildStableExtraId,
  normalizeCookingKey,
  getCookingLabelFr,
  parsePriceNumber,
  parseAddonPrice,
  getProductOptionLabel,
  getCategoryDestination,
  normalizeFormulaOrderItemsForPayload,
  isDessertCategory,
  categoryById,
  resolveInitialCurrentStepFromOrderItems,
  restaurant,
  SETTINGS_ROW_ID,
  triggerHaptic,
  setCart,
  setOrderSuccess,
  toLoggableSupabaseError,
}: UseMenuSubmitOrderArgs) {
  async function handleSubmitOrder() {
    console.log("Tentative de commande...", cart);
    if (isInteractionDisabled || isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    try {
      const validationMessage = validateOrderBeforeSubmit({
        tableNumber,
        typedValidationCode,
        isValidationCodeValid,
        cart,
        tableValidationPromptMessage,
        tt,
      });
      if (validationMessage) {
        alert(validationMessage);
        return;
      }

      const parsedTableNumber = Number(String(tableNumber || "").trim());

      const { orderItems } = buildOrderItemsFromCart({
        cart: cart as unknown as Array<Record<string, unknown>>,
        parsedTableNumber,
        dishById,
        sideIdByAlias,
        sidesLibrary,
        lang,
        isFormulaCartItem: (item) => isFormulaCartItem(item as CartItem),
        getSelectedProductOptionsList,
        getCartItemUnitPrice: (item) => getCartItemUnitPrice(item as CartItem),
        isDrinkCategory,
        normalizeLookupText,
        dedupeDisplayValues,
        buildStableExtraId,
        normalizeCookingKey,
        getCookingLabelFr,
        parsePriceNumber,
        parseAddonPrice,
        getProductOptionLabel,
        getCategoryDestination,
      });

      console.log("📤 ENVOI COMMANDE AU SERVEUR :", JSON.stringify(orderItems, null, 2));

      type OrderPayloadItem = NonNullable<(typeof orderItems)[number]>;
      const { normalizedOrderItems, kitchenItems, finalPayload, finalCurrentStep, finalTotalPrice } =
        normalizeOrderPayloadForSubmit({
          orderItems: orderItems.filter((entry): entry is OrderPayloadItem => entry != null),
          normalizeFormulaOrderItemsForPayload,
          isDrinkCategory,
          isDessertCategory,
          categoryById,
          normalizeLookupText,
          resolveInitialCurrentStepFromOrderItems,
        });

      const resolvedRestaurantId = restaurant?.id ?? SETTINGS_ROW_ID;

      const newOrder = {
        table_number: String(parsedTableNumber),
        items: finalPayload,
        total_price: finalTotalPrice,
        status: "pending",
        restaurant_id: resolvedRestaurantId,
        service_step: resolveLegacyServiceStepFromCurrentStep(finalCurrentStep || 1),
        current_step: finalCurrentStep > 0 ? finalCurrentStep : 1,
      };

      console.table(
        finalPayload.map((item) => ({
          id: item.id,
          name_fr: item.name_fr,
          sort_order: item.sort_order,
          step_number: item.step_number,
          destination: item.destination,
          description_fr: item.description_fr,
          is_formula_parent: item.is_formula_parent,
          is_formula_child: item.is_formula_child,
        }))
      );

      console.log("CRITICAL: Sending payload length:", finalPayload.length);

      const submitResult = await submitOrderToApi(newOrder as Record<string, unknown>);
      if (!submitResult.ok && !submitResult.duplicate) {
        console.log("Détails erreur commande:", submitResult.errorMessage);
        alert(`${tt("supabase_error_prefix")} ${submitResult.errorMessage}`);
        return;
      }

      triggerHaptic([15, 40, 15, 40, 25]);
      alert(tt("order_success"));
      setCart([]);
      setOrderSuccess(true);
    } catch (error) {
      console.error("Erreur envoi commande:", toLoggableSupabaseError(error));
      alert(`${tt("supabase_error_prefix")} ${error instanceof Error ? error.message : "Erreur inconnue"}`);
    } finally {
      setIsSubmittingOrder(false);
    }
  }

  return { handleSubmitOrder };
}
