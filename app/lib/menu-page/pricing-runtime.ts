export function createMenuPricingRuntime(ctx: any) {
  const {
    parsePriceNumber,
    parseVariantPrice,
    toBooleanFlag,
    getSelectedProductOptionsList,
    dishes,
  } = ctx;

  const toFinitePrice = (raw: unknown) => {
    if (raw == null) return null;
    if (typeof raw === "string" && raw.trim() === "") return null;
    return parsePriceNumber(raw);
  };

  const getPromoStateForDish = (dish: any) => {
    const source = dish as Record<string, unknown>;
    const basePrice = parsePriceNumber((source as any).price ?? dish.price);
    const promoPrice = toFinitePrice((source as any).promo_price);
    const promoByFlag = Boolean(
      (source as any).is_promo ??
        (source as any).dish_on_promo ??
        (source as any).promo ??
        (source as any).promotion ??
        false
    );
    const promoByReducedPrice = promoPrice != null && promoPrice > 0 && (basePrice > 0 ? promoPrice < basePrice : true);
    const isActuallyPromo = promoByFlag || promoByReducedPrice;
    return {
      isActuallyPromo,
      promoPrice: promoByReducedPrice ? promoPrice : null,
    };
  };

  const getPromoPriceForDish = (dish: any) => getPromoStateForDish(dish).promoPrice;

  const getDishBasePrice = (dish: any) => parsePriceNumber(dish.price);

  const getFormulaPackPrice = (dish: any) => {
    const formulaPrice = Number((dish as any).formula_price);
    if (Number.isFinite(formulaPrice) && formulaPrice > 0) {
      return formulaPrice;
    }
    return getDishBasePrice(dish);
  };

  const getDishVariantReplacementPrice = (selectedProductOptions?: any[] | null, selectedProductOption?: any | null) => {
    const selectedOptions = getSelectedProductOptionsList(selectedProductOptions, selectedProductOption);
    for (const option of selectedOptions) {
      const variantPrice = parseVariantPrice(option?.price_override);
      if (variantPrice != null) return variantPrice;
    }
    return null;
  };

  const getDishUnitPrice = (dish: any, selectedProductOptions?: any[] | null, selectedProductOption?: any | null) => {
    const isFormulaDish = toBooleanFlag((dish as any).is_formula ?? dish.is_formula);
    if (isFormulaDish) return getFormulaPackPrice(dish);

    const basePrice = getDishBasePrice(dish);
    const variantReplacementPrice = getDishVariantReplacementPrice(selectedProductOptions, selectedProductOption);
    const promoPrice = getPromoPriceForDish(dish);
    const effectiveBasePrice = promoPrice != null && promoPrice < basePrice ? promoPrice : basePrice;
    return variantReplacementPrice ?? effectiveBasePrice;
  };

  const isFormulaCartItem = (item: any) =>
    Boolean(String(item.formulaDishId || "").trim()) ||
    Number(item.formulaUnitPrice || 0) > 0 ||
    toBooleanFlag(((item.dish as any)?.is_formula ?? item.dish?.is_formula) as unknown);

  const getCartItemUnitPrice = (item: any) => {
    const formulaPrice = Number(item.formulaUnitPrice);
    if (Number.isFinite(formulaPrice) && formulaPrice > 0) {
      return formulaPrice;
    }
    const formulaDishId = String(item.formulaDishId || "").trim();
    if (formulaDishId) {
      const formulaDish = dishes.find((dish: any) => String(dish.id || "").trim() === formulaDishId);
      if (formulaDish) return getFormulaPackPrice(formulaDish);
    }
    if (toBooleanFlag(((item.dish as any)?.is_formula ?? item.dish?.is_formula) as unknown)) {
      return getFormulaPackPrice(item.dish);
    }
    return getDishUnitPrice(
      item.dish,
      getSelectedProductOptionsList(item.selectedProductOptions, item.selectedProductOption),
      item.selectedProductOption
    );
  };

  const getDishSuggestionBadge = (dish: any) => {
    const source = dish as any;
    return Boolean(source.is_suggestion || source.is_chef_suggestion || source.is_featured);
  };

  return {
    toFinitePrice,
    getPromoStateForDish,
    getPromoPriceForDish,
    getDishBasePrice,
    getFormulaPackPrice,
    getDishVariantReplacementPrice,
    getDishUnitPrice,
    isFormulaCartItem,
    getCartItemUnitPrice,
    getDishSuggestionBadge,
  };
}
