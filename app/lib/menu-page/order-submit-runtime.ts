import type { CategoryItem } from "./runtime-core";

type Translator = (key: any) => string;

type ValidateOrderArgs<TCartItem> = {
  tableNumber: string;
  typedValidationCode: string;
  isValidationCodeValid: boolean;
  cart: TCartItem[];
  tableValidationPromptMessage: string;
  tt: Translator;
};

export function validateOrderBeforeSubmit<TCartItem extends Record<string, any>>(
  args: ValidateOrderArgs<TCartItem>
): string | null {
  if (!args.tableNumber) return args.tt("table_required");
  if (!args.typedValidationCode) return args.tableValidationPromptMessage;
  if (!args.isValidationCodeValid) return args.tt("validation_code_invalid");
  if (args.cart.length === 0) return args.tt("empty_cart_error");

  const missingSide = args.cart.find(
    (item) => item?.dish?.has_sides && (!item.selectedSides || item.selectedSides.length === 0)
  );
  if (missingSide) return args.tt("side_required_error");

  const missingCooking = args.cart.find(
    (item) => item?.dish?.ask_cooking && !(item.selectedCooking && item.selectedCooking.trim())
  );
  if (missingCooking) return args.tt("cooking_required_error");

  return null;
}

type NormalizeOrderPayloadArgs<TOrderItem extends Record<string, unknown>> = {
  orderItems: TOrderItem[];
  normalizeFormulaOrderItemsForPayload: (
    items: TOrderItem[],
    deps: {
      isDrinkCategory: (categoryId?: string | number | null) => boolean;
      isDessertCategory: (categoryId?: string | number | null) => boolean;
      categoryById: Map<string, CategoryItem>;
      normalizeLookupText: (value: unknown) => string;
    }
  ) => TOrderItem[];
  isDrinkCategory: (categoryId?: string | number | null) => boolean;
  isDessertCategory: (categoryId?: string | number | null) => boolean;
  categoryById: Map<string, CategoryItem>;
  normalizeLookupText: (value: unknown) => string;
  resolveInitialCurrentStepFromOrderItems: (items: Array<Record<string, unknown>>) => number;
};

export function normalizeOrderPayloadForSubmit<TOrderItem extends Record<string, unknown>>(
  args: NormalizeOrderPayloadArgs<TOrderItem>
) {
  const normalizedOrderItems = args.normalizeFormulaOrderItemsForPayload(args.orderItems, {
    isDrinkCategory: args.isDrinkCategory,
    isDessertCategory: args.isDessertCategory,
    categoryById: args.categoryById,
    normalizeLookupText: args.normalizeLookupText,
  });

  const barItems = normalizedOrderItems.filter(
    (item) => String(item.destination || "").trim().toLowerCase() === "bar"
  );
  const kitchenItems = normalizedOrderItems.filter(
    (item) => String(item.destination || "cuisine").trim().toLowerCase() === "cuisine"
  );

  const finalPayload = [...kitchenItems, ...barItems];

  const finalCurrentStep =
    finalPayload.length > 0 ? args.resolveInitialCurrentStepFromOrderItems(finalPayload as Array<Record<string, unknown>>) : 1;

  const finalTotalPrice = finalPayload.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );

  finalPayload.sort((a, b) => {
    const aOrder = Number(a.sort_order || a.step_number || 0);
    const bOrder = Number(b.sort_order || b.step_number || 0);
    return aOrder - bOrder;
  });

  return {
    normalizedOrderItems,
    kitchenItems,
    barItems,
    finalPayload,
    finalCurrentStep,
    finalTotalPrice,
  };
}

export async function submitOrderToApi(order: Record<string, unknown>) {
  const response = await fetch("/api/orders/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ order }),
  });

  const result = (await response.json().catch(() => ({}))) as {
    error?: string;
    duplicate?: boolean;
    message?: string;
  };

  if (!response.ok && !result.duplicate) {
    const errorMessage = String(result.error || result.message || "").trim() || `HTTP ${response.status}`;
    return {
      ok: false,
      duplicate: false,
      errorMessage,
    } as const;
  }

  return {
    ok: true,
    duplicate: Boolean(result.duplicate),
    errorMessage: "",
  } as const;
}
