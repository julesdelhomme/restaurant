import type { Dish, ProductOptionItem, SideLibraryItem } from "./runtime-core";

type CartLikeItem = Record<string, any>;
type OrderItem = Record<string, unknown>;

type BuildOrderItemsArgs = {
  cart: CartLikeItem[];
  parsedTableNumber: number;
  dishById: Map<string, Dish>;
  sideIdByAlias: Map<string, string>;
  sidesLibrary: SideLibraryItem[];
  lang: string;
  isFormulaCartItem: (item: CartLikeItem) => boolean;
  getSelectedProductOptionsList: (
    selectedProductOptions?: ProductOptionItem[] | null,
    selectedProductOption?: ProductOptionItem | null
  ) => ProductOptionItem[];
  getCartItemUnitPrice: (item: CartLikeItem) => number;
  isDrinkCategory: (categoryId?: string | number | null) => boolean;
  normalizeLookupText: (value: unknown) => string;
  dedupeDisplayValues: (values: unknown[]) => string[];
  buildStableExtraId: (dishId: unknown, extra: any, index: number) => string;
  normalizeCookingKey: (value: string) => string;
  getCookingLabelFr: (key: string) => string;
  parsePriceNumber: (value: unknown) => number;
  parseAddonPrice: (value: unknown) => number;
  getProductOptionLabel: (option: ProductOptionItem, lang: string) => string;
  getCategoryDestination: (categoryId?: string | number | null) => string;
};

export function buildOrderItemsFromCart(args: BuildOrderItemsArgs): { orderItems: OrderItem[]; totalPrice: number } {
  const orderItems: OrderItem[] = [];

  args.cart.forEach((item, cartIndex) => {
    const formulaDishId = String(item.formulaDishId || "").trim() || null;
    const formulaInstanceId = formulaDishId ? `client:${String(args.parsedTableNumber)}:${cartIndex}:${formulaDishId}` : null;
    const formulaGroupId =
      formulaDishId && typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : formulaDishId
          ? `${args.parsedTableNumber}:${cartIndex}:${formulaDishId}:${Date.now()}`
          : null;
    const rawExtrasPrice = (item.selectedExtras || []).reduce(
      (sum: number, extra: unknown) => sum + args.parsePriceNumber((extra as { price?: unknown })?.price),
      0
    );
    const extrasPrice = args.isFormulaCartItem(item) ? 0 : rawExtrasPrice;
    const normalizedSelectedProductOptions = args.getSelectedProductOptionsList(
      item.selectedProductOptions,
      item.selectedProductOption
    );
    const unitPrice = args.getCartItemUnitPrice({
      ...item,
      selectedProductOptions: normalizedSelectedProductOptions,
    });
    const drinkItem = args.isDrinkCategory(item.dish.category_id);
    const selectedSideIds = Array.isArray(item.selectedSideIds)
      ? item.selectedSideIds.map((id: unknown) => String(id || "").trim()).filter(Boolean)
      : [];
    const fallbackSideIds =
      selectedSideIds.length > 0
        ? selectedSideIds
        : (item.selectedSides || [])
            .map((label: unknown) => args.sideIdByAlias.get(args.normalizeLookupText(label)) || "")
            .filter(Boolean);
    const selectedSideLabelsFr = args.dedupeDisplayValues(
      fallbackSideIds
        .map((id: unknown) => args.sidesLibrary.find((side: SideLibraryItem) => String(side.id) === String(id)))
        .filter(Boolean)
        .map((side: SideLibraryItem) => String((side as SideLibraryItem).name_fr || "").trim())
    );
    const selectedExtraIds = (item.selectedExtras || [])
      .map((extra: unknown, index: number) => args.buildStableExtraId(item.dish.id, extra, index))
      .filter(Boolean);
    const cookingKey = args.normalizeCookingKey(item.selectedCooking || "");
    const hasCookingChoice = Boolean(item?.dish?.ask_cooking);
    const cookingLabelFr = cookingKey ? args.getCookingLabelFr(cookingKey) : hasCookingChoice ? "Saignant" : null;
    const stableCookingValue = (cookingKey || "") || (cookingLabelFr || "") || "";
    const selectedOptionIds = normalizedSelectedProductOptions
      .map((option) => String(option.id || "").trim())
      .filter(Boolean);
    const selectedOptionNamesFr = normalizedSelectedProductOptions
      .map((option) => {
        const namesI18n = option.names_i18n && typeof option.names_i18n === "object" ? (option.names_i18n as any) : null;
        return String(option.name_fr || namesI18n?.fr || option.name || "").trim();
      })
      .filter(Boolean);
    const selectedOptionNames = normalizedSelectedProductOptions
      .map((option) => args.getProductOptionLabel(option, args.lang))
      .filter(Boolean);
    const selectedOptionPrice = normalizedSelectedProductOptions.reduce(
      (sum, option) => sum + args.parseAddonPrice(option.price_override),
      0
    );
    const selectedExtras = (item.selectedExtras || []).map((extra: any, index: number) => ({
      id: args.buildStableExtraId(item.dish.id, extra, index),
      label_fr: String(extra.name_fr || extra.name || "").trim() || "Supplément",
      price: args.parsePriceNumber(extra.price),
    }));
    const selectedOptionsPayload: Array<Record<string, unknown>> = [];
    normalizedSelectedProductOptions.forEach((option) => {
      const optionId = String(option.id || "").trim() || null;
      const namesI18n = option.names_i18n && typeof option.names_i18n === "object" ? (option.names_i18n as any) : null;
      const optionNameFr = String(option.name_fr || namesI18n?.fr || option.name || "").trim() || null;
      const optionName = args.getProductOptionLabel(option, args.lang) || optionNameFr || null;
      if (!optionNameFr && !optionName) return;
      selectedOptionsPayload.push({
        kind: "option",
        id: optionId,
        value: optionName,
        label_fr: optionNameFr || optionName,
        name_fr: optionNameFr || optionName,
        price: args.parseAddonPrice(option.price_override),
      });
    });
    if (fallbackSideIds.length > 0) {
      selectedOptionsPayload.push({
        kind: "side",
        ids: fallbackSideIds,
        values:
          selectedSideLabelsFr.length > 0 ? selectedSideLabelsFr : args.dedupeDisplayValues((item.selectedSides || []) as unknown[]),
        label_fr: selectedSideLabelsFr.join(", "),
      });
    }
    if (stableCookingValue) {
      selectedOptionsPayload.push({
        kind: "cooking",
        key: cookingKey || null,
        value: stableCookingValue,
        label_fr: cookingLabelFr || stableCookingValue,
      });
    }
    const formulaDishName = String(item.formulaDishName || "").trim() || null;
    const formulaUnitPriceRaw = Number(item.formulaUnitPrice);
    const formulaUnitPrice = Number.isFinite(formulaUnitPriceRaw) && formulaUnitPriceRaw > 0 ? formulaUnitPriceRaw : null;
    const formulaSelections = Array.isArray(item.formulaSelections) ? item.formulaSelections : [];
    const sortedFormulaSelections = [...formulaSelections].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    console.log(
      `FORMULA SELECTIONS for ${formulaDishId}:`,
      sortedFormulaSelections.map((s) => ({ id: s.dishId, name: s.dishName, seq: s.sequence }))
    );

    if (formulaDishId) {
      const parentStep = 2;
      const parentOrderItem = {
        dish_id: String(item.dish.id || "").trim(),
        id: String(item.dish.id || "").trim(),
        formula_group_id: formulaGroupId,
        formula_id: formulaDishId,
        category_id: item.dish.category_id ?? null,
        destination: args.getCategoryDestination(item.dish.category_id),
        is_drink: drinkItem,
        name_fr: String(item.dish.name_fr || item.dish.name || item.dish.nom || "").trim() || "Plat",
        description_fr: String(item.dish.description_fr || item.dish.description || "").trim() || null,
        quantity: item.quantity,
        price: unitPrice + extrasPrice,
        selected_option_id: selectedOptionIds.length > 0 ? selectedOptionIds.join(",") : null,
        selected_option_name:
          selectedOptionNamesFr.length > 0
            ? selectedOptionNamesFr.join(", ")
            : selectedOptionNames.length > 0
              ? selectedOptionNames.join(", ")
              : null,
        selected_option_price: selectedOptionPrice,
        selected_options: selectedOptionsPayload,
        selectedOptions: selectedOptionsPayload,
        selected_side_ids: fallbackSideIds,
        selected_side_label_fr: selectedSideLabelsFr.join(", ") || null,
        accompagnement_fr: selectedSideLabelsFr.join(", ") || null,
        selected_extra_ids: selectedExtraIds,
        selected_extras: selectedExtras,
        selected_cooking: stableCookingValue || null,
        selected_cooking_key: cookingKey || null,
        selected_cooking_label_fr: cookingLabelFr,
        formula_dish_id: formulaDishId,
        formula_dish_name: formulaDishName,
        formula_unit_price: formulaUnitPrice,
        formula_instance_id: formulaInstanceId,
        is_formula_parent: true,
        is_formula_child: false,
        is_formula: true,
        sort_order: parentStep,
        step_number: parentStep,
        special_request: String(item.specialRequest || "").trim(),
        from_recommendation: !!item.fromRecommendation,
        status: Number(parentStep) === 1 ? "preparing" : "pending",
      };
      orderItems.push(parentOrderItem);

      sortedFormulaSelections.forEach((sel) => {
        if (!sel?.dishId) return;
        const childDish = args.dishById.get(String(sel.dishId));
        const childSelectedOptionsRaw = Array.isArray((sel as any).selectedOptions)
          ? ((sel as any).selectedOptions as Array<Record<string, unknown>>)
          : [];
        const childSelectedOptionIds = Array.isArray(sel.selectedOptionIds)
          ? sel.selectedOptionIds.map((id: unknown) => String(id || "").trim()).filter(Boolean)
          : childSelectedOptionsRaw
              .map((option) => String(option?.id || "").trim())
              .filter(Boolean);
        const childSelectedOptionNames = Array.isArray(sel.selectedOptionNames)
          ? sel.selectedOptionNames.map((name: unknown) => String(name || "").trim()).filter(Boolean)
          : childSelectedOptionsRaw
              .map((option) => String(option?.name || option?.value || option?.label || "").trim())
              .filter(Boolean);
        const childSelectedOptionsPayload: Array<Record<string, unknown>> =
          childSelectedOptionsRaw.length > 0
            ? childSelectedOptionsRaw
                .map((option, index) => {
                  const name = String(option?.name || option?.value || option?.label || "").trim();
                  if (!name) return null;
                  return {
                    kind: "option",
                    id: String(option?.id || "").trim() || childSelectedOptionIds[index] || childSelectedOptionIds[0] || null,
                    value: name,
                    label_fr: name,
                    name_fr: name,
                    price: args.parseAddonPrice(option?.price ?? 0),
                  };
                })
                .filter(Boolean) as Array<Record<string, unknown>>
            : childSelectedOptionNames.map((name: string, index: number) => ({
                kind: "option",
                id: childSelectedOptionIds[index] || childSelectedOptionIds[0] || null,
                value: name,
                label_fr: name,
                name_fr: name,
              }));
        const childSideLabels = Array.isArray(sel.selectedSides)
          ? sel.selectedSides.map((side: unknown) => String(side || "").trim()).filter(Boolean)
          : [];
        const childSideIds = Array.isArray(sel.selectedSideIds)
          ? sel.selectedSideIds.map((id: unknown) => String(id || "").trim()).filter(Boolean)
          : [];
        const childSelectedExtrasRaw = Array.isArray((sel as any).selectedExtras)
          ? ((sel as any).selectedExtras as Array<Record<string, unknown>>)
          : Array.isArray((sel as any).supplements)
            ? ((sel as any).supplements as Array<Record<string, unknown> | string>)
            : [];
        const childSelectedExtras = childSelectedExtrasRaw
          .map((extra: any, index: number) => {
            if (typeof extra === "string" || typeof extra === "number") {
              const name = String(extra || "").trim();
              if (!name) return null;
              return {
                id: `formula-extra:${String(sel.dishId || "")}:${index}`,
                label_fr: name,
                price: 0,
              };
            }
            const name = String(extra?.name || extra?.label || extra?.label_fr || "").trim();
            if (!name) return null;
            return {
              id: String(extra?.id || "").trim() || `formula-extra:${String(sel.dishId || "")}:${index}`,
              label_fr: name,
              price: args.parsePriceNumber(extra?.price ?? 0),
            };
          })
          .filter(Boolean) as Array<{ id: string; label_fr: string; price: number }>;
        const childSelectedExtraIds = childSelectedExtras.map((extra) => extra.id).filter(Boolean);
        if (childSideLabels.length > 0 || childSideIds.length > 0) {
          childSelectedOptionsPayload.push({
            kind: "side",
            ids: childSideIds,
            values: childSideLabels,
            label_fr: childSideLabels.join(", "),
          });
        }
        const childCookingLabel = String(sel.selectedCooking || "").trim();
        if (childCookingLabel) {
          childSelectedOptionsPayload.push({
            kind: "cooking",
            key: args.normalizeCookingKey(childCookingLabel) || null,
            value: childCookingLabel,
            label_fr: childCookingLabel,
          });
        }
        if (childSelectedExtras.length > 0) {
          childSelectedOptionsPayload.push({
            kind: "extra",
            ids: childSelectedExtraIds,
            values: childSelectedExtras.map((extra) => extra.label_fr),
            label_fr: childSelectedExtras.map((extra) => extra.label_fr).join(", "),
          });
        }
        const childOrderItem = {
          dish_id: String(sel.dishId || "").trim(),
          id: String(sel.dishId || "").trim(),
          formula_group_id: formulaGroupId,
          formula_id: formulaDishId,
          category_id: sel.categoryId || null,
          destination: args.getCategoryDestination(sel.categoryId) || "cuisine",
          is_drink: false,
          name_fr: String(sel.dishNameFr || sel.dishName || "").trim() || "Plat formule",
          description_fr: childDish ? String(childDish.description_fr || childDish.description || "").trim() || null : null,
          quantity: item.quantity,
          price: 0,
          selected_option_id: childSelectedOptionIds.length > 0 ? childSelectedOptionIds.join(",") : null,
          selected_option_name: childSelectedOptionNames.length > 0 ? childSelectedOptionNames.join(", ") : null,
          selected_option_price: Number(sel.selectedOptionPrice || 0) || 0,
          selected_options: childSelectedOptionsPayload,
          selectedOptions: childSelectedOptionsPayload,
          selected_side_ids: childSideIds,
          selected_side_label_fr: childSideLabels.length > 0 ? childSideLabels.join(", ") : null,
          accompagnement_fr: childSideLabels.length > 0 ? childSideLabels.join(", ") : null,
          selected_extra_ids: childSelectedExtraIds,
          selected_extras: childSelectedExtras,
          selected_cooking: childCookingLabel || null,
          selected_cooking_key: args.normalizeCookingKey(childCookingLabel) || null,
          selected_cooking_label_fr: childCookingLabel || null,
          formula_dish_id: formulaDishId,
          formula_dish_name: formulaDishName,
          formula_unit_price: 0,
          formula_instance_id: formulaInstanceId,
          is_formula_parent: false,
          is_formula_child: true,
          is_formula: true,
          sort_order: sel.sequence,
          step_number: sel.sequence,
          special_request: String(item.specialRequest || "").trim(),
          from_recommendation: !!item.fromRecommendation,
          status: Number(sel.sequence) === 1 ? "preparing" : "pending",
        };
        orderItems.push(childOrderItem);
      });
    } else {
      const nonFormulaItem = {
        dish_id: String(item.dish.id || "").trim(),
        id: String(item.dish.id || "").trim(),
        formula_group_id: null,
        formula_id: null,
        category_id: item.dish.category_id ?? null,
        destination: args.getCategoryDestination(item.dish.category_id),
        is_drink: drinkItem,
        name_fr: String(item.dish.name_fr || item.dish.name || item.dish.nom || "").trim() || "Plat",
        description_fr: String(item.dish.description_fr || item.dish.description || "").trim() || null,
        quantity: item.quantity,
        price: unitPrice + extrasPrice,
        selected_option_id: selectedOptionIds.length > 0 ? selectedOptionIds.join(",") : null,
        selected_option_name:
          selectedOptionNamesFr.length > 0
            ? selectedOptionNamesFr.join(", ")
            : selectedOptionNames.length > 0
              ? selectedOptionNames.join(", ")
              : null,
        selected_option_price: selectedOptionPrice,
        selected_options: selectedOptionsPayload,
        selectedOptions: selectedOptionsPayload,
        selected_side_ids: fallbackSideIds,
        selected_side_label_fr: selectedSideLabelsFr.join(", ") || null,
        accompagnement_fr: selectedSideLabelsFr.join(", ") || null,
        selected_extra_ids: selectedExtraIds,
        selected_extras: selectedExtras,
        selected_cooking: stableCookingValue || null,
        selected_cooking_key: cookingKey || null,
        selected_cooking_label_fr: cookingLabelFr,
        formula_dish_id: null,
        formula_dish_name: null,
        formula_unit_price: null,
        formula_instance_id: null,
        is_formula_parent: false,
        is_formula_child: false,
        is_formula: false,
        sort_order: null,
        step_number: null,
        special_request: String(item.specialRequest || "").trim(),
        from_recommendation: !!item.fromRecommendation,
        status: "pending",
      };
      orderItems.push(nonFormulaItem);
    }
  });

  const totalPrice = args.cart.reduce((sum, item) => {
    const rawExtrasPrice = (item.selectedExtras || []).reduce(
      (acc: number, extra: unknown) => acc + args.parsePriceNumber((extra as { price?: unknown })?.price),
      0
    );
    const extrasPrice = args.isFormulaCartItem(item) ? 0 : rawExtrasPrice;
    return sum + (args.getCartItemUnitPrice(item) + extrasPrice) * item.quantity;
  }, 0);

  return {
    orderItems,
    totalPrice,
  };
}
