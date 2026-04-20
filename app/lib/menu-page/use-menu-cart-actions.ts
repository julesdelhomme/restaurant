"use client";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { CartItem, Dish } from "./runtime";

type UseMenuCartActionsArgs = {
  isInteractionDisabled: boolean;
  tableNumber: string;
  typedValidationCode: string;
  isValidationCodeValid: boolean;
  tt: (key: any) => string;
  tableValidationPromptMessage: string;
  toBooleanFlag: (value: unknown) => boolean;
  dishes: Dish[];
  getFormulaDisplayName: (formula: Dish | null) => string;
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  setOrderSuccess: (value: boolean) => void;
  setCartBump: (value: boolean) => void;
  toastTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  triggerHaptic: (pattern: number | number[]) => void;
  setToastMessage: (value: string) => void;
  getSalesAdvice: (dish: Dish) => { message: string; linkedDishId: string };
  setSalesAdviceMessage: (value: string) => void;
  setSalesAdviceDishId: (value: string) => void;
  setShowSalesAdviceModal: (value: boolean) => void;
  getSelectedProductOptionsList: (
    selectedProductOptions?: any,
    selectedProductOption?: any
  ) => Array<{ id?: string | number | null }>;
};

export function useMenuCartActions({
  isInteractionDisabled,
  tableNumber,
  typedValidationCode,
  isValidationCodeValid,
  tt,
  tableValidationPromptMessage,
  toBooleanFlag,
  dishes,
  getFormulaDisplayName,
  setCart,
  setOrderSuccess,
  setCartBump,
  toastTimeoutRef,
  triggerHaptic,
  setToastMessage,
  getSalesAdvice,
  setSalesAdviceMessage,
  setSalesAdviceDishId,
  setShowSalesAdviceModal,
  getSelectedProductOptionsList,
}: UseMenuCartActionsArgs) {
  const addToCart = (item: CartItem, options?: { skipUpsell?: boolean; fromRecommendation?: boolean }) => {
    if (isInteractionDisabled) {
      return;
    }
    if (!tableNumber) {
      alert(tt("table_required"));
      return;
    }
    if (!typedValidationCode) {
      alert(tableValidationPromptMessage);
      return;
    }
    if (!isValidationCodeValid) {
      alert(tt("validation_code_invalid"));
      return;
    }
    const formulaDishIdForCart = String(item.formulaDishId || "").trim();
    const isFormulaCartEntry =
      Boolean(formulaDishIdForCart) ||
      toBooleanFlag(((item.dish as unknown as any)?.is_formula ?? item.dish?.is_formula) as unknown);
    const resolvedFormulaDish =
      formulaDishIdForCart
        ? dishes.find((dish) => String(dish.id || "").trim() === formulaDishIdForCart) || null
        : isFormulaCartEntry
          ? item.dish
          : null;
    const resolvedFormulaName = String(
      item.formulaDishName || (resolvedFormulaDish ? getFormulaDisplayName(resolvedFormulaDish) : "")
    ).trim();
    const normalizedCartItem: CartItem = isFormulaCartEntry
      ? {
          ...item,
          dish: {
            ...item.dish,
            ...(resolvedFormulaDish || {}),
            id: resolvedFormulaDish?.id ?? item.dish.id,
            is_formula: true,
            name:
              resolvedFormulaName ||
              String((resolvedFormulaDish as any)?.name || "").trim() ||
              String(item.dish.name || "").trim(),
            name_fr:
              resolvedFormulaName ||
              String((resolvedFormulaDish as any)?.name_fr || "").trim() ||
              String((item.dish as any)?.name_fr || item.dish.name || "").trim(),
            description:
              String((resolvedFormulaDish as any)?.description || "").trim() ||
              String((item.dish as any)?.description || "").trim(),
            description_fr:
              String((resolvedFormulaDish as any)?.description_fr || "").trim() ||
              String((resolvedFormulaDish as any)?.description || "").trim() ||
              String((item.dish as any)?.description_fr || item.dish.description || "").trim(),
          },
          formulaDishId:
            formulaDishIdForCart ||
            String(resolvedFormulaDish?.id || "").trim() ||
            item.formulaDishId,
          formulaDishName: resolvedFormulaName || item.formulaDishName,
        }
      : item;
    setCart((prev) => {
      const idx = prev.findIndex(
        (c) =>
          c.dish.id === normalizedCartItem.dish.id &&
          JSON.stringify(
            getSelectedProductOptionsList(c.selectedProductOptions, c.selectedProductOption)
              .map((option) => String(option.id || ""))
              .sort()
          ) ===
            JSON.stringify(
              getSelectedProductOptionsList(normalizedCartItem.selectedProductOptions, normalizedCartItem.selectedProductOption)
                .map((option) => String(option.id || ""))
                .sort()
            ) &&
          JSON.stringify(c.selectedSides || []) === JSON.stringify(normalizedCartItem.selectedSides || []) &&
          JSON.stringify(c.selectedSideIds || []) === JSON.stringify(normalizedCartItem.selectedSideIds || []) &&
          JSON.stringify(c.selectedExtras || []) === JSON.stringify(normalizedCartItem.selectedExtras || []) &&
          JSON.stringify(c.formulaSelections || []) === JSON.stringify(normalizedCartItem.formulaSelections || []) &&
          (c.formulaDishId || "") === (normalizedCartItem.formulaDishId || "") &&
          Number(c.formulaUnitPrice || 0) === Number(normalizedCartItem.formulaUnitPrice || 0) &&
          (c.selectedCooking || "") === (normalizedCartItem.selectedCooking || "") &&
          (c.specialRequest || "") === (normalizedCartItem.specialRequest || "")
      );
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx].quantity += normalizedCartItem.quantity;
        if (normalizedCartItem.fromRecommendation || options?.fromRecommendation) {
          updated[idx].fromRecommendation = true;
        }
        return updated;
      }
      return [
        ...prev,
        {
          ...normalizedCartItem,
          fromRecommendation: normalizedCartItem.fromRecommendation || !!options?.fromRecommendation,
        },
      ];
    });
    setOrderSuccess(false);
    setCartBump(true);
    setTimeout(() => setCartBump(false), 300);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    triggerHaptic(10);
    setToastMessage(tt("item_added"));
    if (!options?.skipUpsell) {
      const advice = getSalesAdvice(normalizedCartItem.dish);
      if (advice.message) {
        setSalesAdviceMessage(advice.message);
        setSalesAdviceDishId(advice.linkedDishId);
        setShowSalesAdviceModal(true);
      }
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage("");
    }, 1200);
  };

  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  return {
    addToCart,
    removeFromCart,
  };
}
