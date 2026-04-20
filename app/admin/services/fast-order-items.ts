import type { Item } from "../utils/order-items";
import type { DishItem, FastOrderLine, FormulaSelection } from "../types";

type BuildFastOrderItemsServiceParams = {
  fastLines: FastOrderLine[];
  tableNumber: number;
  dishById: Map<string, DishItem>;
  sideIdByAlias: Map<string, string>;
  normalizeLookupText: (value: string) => string;
  toCookingKeyFromLabel: (value: string) => string;
  parsePriceNumber: (value: unknown) => number;
  buildStableExtraId: (dishId: string | number, extraName: string, extraPrice: unknown, extraIndex: number) => string;
  normalizeFormulaStepValue: (value: unknown, strict?: boolean) => number | null;
  resolveFormulaSelectionDestination: (
    selection: FormulaSelection,
    selectedDish: DishItem | null | undefined
  ) => "cuisine" | "bar";
  resolveDestinationForCategory: (categoryId: unknown, categoryLabel?: string) => "cuisine" | "bar";
  readBooleanFlag: (value: unknown, fallback?: boolean) => boolean;
  getFormulaPackPrice: (dish: DishItem) => number;
  buildLineInstructions: (line: FastOrderLine) => string;
  resolveInitialFormulaItemStatus: (
    sequence: number | null,
    directSequenceThreshold: number,
    sortOrder?: unknown
  ) => string;
  isDirectFormulaSequence: (value: unknown, directSequenceThreshold: number) => boolean;
  formulaDirectSendSequence: number;
};

export function buildFastOrderItemsService({
  fastLines,
  tableNumber,
  dishById,
  sideIdByAlias,
  normalizeLookupText,
  toCookingKeyFromLabel,
  parsePriceNumber,
  buildStableExtraId,
  normalizeFormulaStepValue,
  resolveFormulaSelectionDestination,
  resolveDestinationForCategory,
  readBooleanFlag,
  getFormulaPackPrice,
  buildLineInstructions,
  resolveInitialFormulaItemStatus,
  isDirectFormulaSequence,
  formulaDirectSendSequence,
}: BuildFastOrderItemsServiceParams): Item[] {
  return fastLines.flatMap((line, lineIndex) => {
    const quantity = Number(line.quantity || 0);
    const rawUnitPrice = Number(line.unitPrice || 0);
    const formulaDishId = String(line.formulaDishId || "").trim() || null;
    const formulaInstanceId = formulaDishId
      ? `admin:${tableNumber}:${lineIndex}:${formulaDishId}`
      : null;
    const formulaDishName = String(line.formulaDishName || "").trim() || null;
    const formulaSelections = Array.isArray(line.formulaSelections) ? line.formulaSelections : [];
    const resolveSelectionDestination = (selection: FormulaSelection): "cuisine" | "bar" => {
      const selectedDish = dishById.get(String(selection.dishId || "").trim()) || null;
      return resolveFormulaSelectionDestination(selection, selectedDish);
    };
    const isFormulaLine = Boolean(line.isFormula || formulaDishId || formulaSelections.length > 0);
    const formulaDishRecord = formulaDishId ? dishById.get(formulaDishId) || null : null;
    const formulaGroupId =
      isFormulaLine && typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : isFormulaLine
          ? `${tableNumber}-${lineIndex}-${formulaDishId || "formula"}-${Date.now()}`
          : null;
    const formulaUnitPriceRaw = Number(line.formulaUnitPrice);
    const formulaUnitPrice =
      isFormulaLine
        ? Number.isFinite(formulaUnitPriceRaw) && formulaUnitPriceRaw > 0
          ? Number(formulaUnitPriceRaw.toFixed(2))
          : formulaDishRecord
            ? Number(getFormulaPackPrice(formulaDishRecord).toFixed(2))
            : 0
        : null;
    const unitPrice = formulaUnitPrice != null ? formulaUnitPrice : rawUnitPrice;
    const optionPrice = parsePriceNumber(line.selectedProductOptionPrice);
    const extrasPrice = isFormulaLine
      ? 0
      : (line.selectedExtras || []).reduce((sum, extra) => sum + parsePriceNumber(extra.price), 0);
    const baseUnitPrice = Number((unitPrice - extrasPrice - optionPrice).toFixed(2));
    const safeSelectedSides = Array.isArray(line.selectedSides) ? line.selectedSides : [];
    const safeSelectedExtras = Array.isArray(line.selectedExtras) ? line.selectedExtras : [];
    const selectedSideIds = safeSelectedSides
      .map((label) => sideIdByAlias.get(normalizeLookupText(label)) || "")
      .filter(Boolean);
    const cookingLabel = String(line.selectedCooking || "").trim();
    const cookingKey = toCookingKeyFromLabel(cookingLabel);
    const selectedOptionId = String(line.selectedProductOptionId || "").trim() || null;
    const selectedOptionName = String(line.selectedProductOptionName || "").trim() || null;
    const selectedOptionsPayload: Array<Record<string, unknown>> = [];
    if (selectedOptionName) {
      selectedOptionsPayload.push({
        kind: "option",
        id: selectedOptionId,
        value: selectedOptionName,
        label_fr: selectedOptionName,
        price: optionPrice,
      });
    }
    if (selectedSideIds.length > 0) {
      selectedOptionsPayload.push({
        kind: "side",
        ids: selectedSideIds,
        values: safeSelectedSides,
      });
    }
    if (cookingLabel) {
      selectedOptionsPayload.push({
        kind: "cooking",
        key: cookingKey || null,
        value: cookingLabel,
        label_fr: cookingLabel,
      });
    }
    if (formulaSelections.length > 0) {
      formulaSelections.forEach((selection) => {
        if (!selection?.dishId) return;
        const sequence = normalizeFormulaStepValue(selection.sequence, true);
        const selectionSideIds = Array.isArray(selection.selectedSideIds) ? selection.selectedSideIds : [];
        const selectionSides = Array.isArray(selection.selectedSides) ? selection.selectedSides : [];
        const selectionCooking = String(selection.selectedCooking || "").trim();
        const selectionOptionsRaw = Array.isArray(selection.selectedOptions) ? selection.selectedOptions : [];
        const selectionOptionIds = Array.isArray(selection.selectedOptionIds) ? selection.selectedOptionIds : [];
        const selectionOptionNames = Array.isArray(selection.selectedOptionNames)
          ? selection.selectedOptionNames
          : selectionOptionsRaw
              .map((option) => String((option as any)?.name || "").trim())
              .filter(Boolean);
        const selectionExtras = Array.isArray(selection.selectedExtras)
          ? selection.selectedExtras
          : Array.isArray(selection.supplements)
            ? selection.supplements.map((extra) => ({
                name: String((extra as any)?.name || "").trim(),
                price: parsePriceNumber((extra as any)?.price ?? 0),
              }))
            : [];
        const selectionSideLabelFr = selectionSides.join(", ");
        const selectionOptionLabelFr = selectionOptionNames.join(", ");
        const selectionCookingKey = toCookingKeyFromLabel(selectionCooking);
        const selectionDestination = resolveSelectionDestination(selection);
        const selectionExtrasLabelFr = selectionExtras.map((extra) => String(extra.name || "").trim()).filter(Boolean).join(", ");
        selectedOptionsPayload.push({
          kind: "formula",
          formula_dish_id: formulaDishId,
          formula_dish_name: formulaDishName,
          category_id: selection.categoryId || null,
          category_label: selection.categoryLabel || null,
          dish_id: selection.dishId || null,
          value: selection.dishName || null,
          label_fr: selection.dishName || null,
          name_fr: selection.dishName || null,
          price: 0,
          destination: selectionDestination,
          selected_side_ids: selectionSideIds,
          selected_sides: selectionSides,
          selected_side_label_fr: selectionSideLabelFr || null,
          selected_extras: selectionExtras,
          selected_extra_label_fr: selectionExtrasLabelFr || null,
          selected_cooking: selectionCooking || null,
          selected_cooking_key: selectionCookingKey || null,
          selected_cooking_label_fr: selectionCooking || null,
          selected_option_ids: selectionOptionIds,
          selected_option_names: selectionOptionNames,
          selected_option_label_fr: selectionOptionLabelFr || null,
          selected_option_price: 0,
          sequence,
        });
        if (selectionSides.length > 0 || selectionSideIds.length > 0) {
          selectedOptionsPayload.push({
            kind: "side",
            source: "formula",
            formula_dish_id: formulaDishId,
            dish_id: selection.dishId || null,
            destination: selectionDestination,
            ids: selectionSideIds,
            values: selectionSides,
            label_fr: selectionSideLabelFr || null,
            sequence,
          });
        }
        if (selectionExtras.length > 0) {
          selectedOptionsPayload.push({
            kind: "extra",
            source: "formula",
            formula_dish_id: formulaDishId,
            dish_id: selection.dishId || null,
            destination: selectionDestination,
            values: selectionExtras.map((extra) => String(extra.name || "").trim()).filter(Boolean),
            label_fr: selectionExtrasLabelFr || null,
            sequence,
          });
        }
        if (selectionCooking) {
          selectedOptionsPayload.push({
            kind: "cooking",
            source: "formula",
            formula_dish_id: formulaDishId,
            dish_id: selection.dishId || null,
            destination: selectionDestination,
            key: selectionCookingKey || null,
            value: selectionCooking,
            label_fr: selectionCooking,
            sequence,
          });
        }
        if (selectionOptionNames.length > 0 || selectionOptionIds.length > 0) {
          selectedOptionsPayload.push({
            kind: "option",
            source: "formula",
            formula_dish_id: formulaDishId,
            dish_id: selection.dishId || null,
            destination: selectionDestination,
            id: selectionOptionIds.length > 0 ? selectionOptionIds.join(",") : null,
            values: selectionOptionNames,
            value: selectionOptionLabelFr || null,
            label_fr: selectionOptionLabelFr || null,
            sequence,
          });
        }
      });
    }
    const formulaItemsPayload = formulaSelections
      .map((selection) => {
        if (!selection?.dishId) return null;
        const sequence = normalizeFormulaStepValue(selection.sequence, true);
        const selectionSideIds = Array.isArray(selection.selectedSideIds) ? selection.selectedSideIds : [];
        const selectionSides = Array.isArray(selection.selectedSides) ? selection.selectedSides : [];
        const selectionCooking = String(selection.selectedCooking || "").trim();
        const selectionOptionsRaw = Array.isArray(selection.selectedOptions) ? selection.selectedOptions : [];
        const selectionOptionIds = Array.isArray(selection.selectedOptionIds) ? selection.selectedOptionIds : [];
        const selectionOptionNames = Array.isArray(selection.selectedOptionNames)
          ? selection.selectedOptionNames
          : selectionOptionsRaw
              .map((option) => String((option as any)?.name || "").trim())
              .filter(Boolean);
        const selectionExtras = Array.isArray(selection.selectedExtras)
          ? selection.selectedExtras
          : Array.isArray(selection.supplements)
            ? selection.supplements.map((extra) => ({
                name: String((extra as any)?.name || "").trim(),
                price: parsePriceNumber((extra as any)?.price ?? 0),
              }))
            : [];
        const selectionSideLabelFr = selectionSides.join(", ");
        const selectionOptionLabelFr = selectionOptionNames.join(", ");
        const selectionCookingKey = toCookingKeyFromLabel(selectionCooking);
        const selectionDestination = resolveSelectionDestination(selection);
        const selectionExtraIds = selectionExtras.map((extra, index) =>
          buildStableExtraId(selection.dishId, extra.name, extra.price, index)
        );
        const selectionExtrasPayload = selectionExtras.map((extra, index) => ({
          id: buildStableExtraId(selection.dishId, extra.name, extra.price, index),
          label_fr: String(extra.name || "").trim(),
          price: parsePriceNumber(extra.price),
        }));
        const selectionExtrasPrice = selectionExtras.reduce(
          (sum, extra) => sum + parsePriceNumber(extra.price),
          0
        );
        return {
          formula_dish_id: formulaDishId,
          formula_dish_name: formulaDishName,
          formula_group_id: formulaGroupId,
          category_id: selection.categoryId || null,
          category_label: selection.categoryLabel || null,
          dish_id: selection.dishId || null,
          dish_name: selection.dishName || null,
          dish_name_fr: selection.dishName || null,
          destination: selectionDestination,
          is_drink: selectionDestination === "bar",
          price: Number(selectionExtrasPrice.toFixed(2)),
          base_price: Number(selectionExtrasPrice.toFixed(2)),
          unit_total_price: Number(selectionExtrasPrice.toFixed(2)),
          extras_price: Number(selectionExtrasPrice.toFixed(2)),
          selected_side_ids: selectionSideIds,
          selected_sides: selectionSides,
          selected_side_label_fr: selectionSideLabelFr || null,
          selected_extras: selectionExtrasPayload,
          selected_extra_ids: selectionExtraIds,
          selected_cooking: selectionCooking || null,
          selected_cooking_key: selectionCookingKey || null,
          selected_cooking_label_fr: selectionCooking || null,
          selected_option_ids: selectionOptionIds,
          selected_option_names: selectionOptionNames,
          selected_option_label_fr: selectionOptionLabelFr || null,
          selected_option_price: 0,
          sequence,
          is_main: String(selection.dishId || "").trim() === String(formulaDishId || "").trim(),
          is_formula_child: true,
          is_formula_parent: false,
          is_formula: true,
          sort_order: sequence != null ? sequence : null,
          step_number: sequence != null ? sequence : null,
        };
      })
      .filter(Boolean);
    const formulaSequenceValues = formulaSelections
      .map((selection) => Number(selection.sequence))
      .filter((value) => Number.isFinite(value) && value > 0)
      .map((value) => Math.max(1, Math.trunc(value)));
    const formulaCurrentSequence =
      formulaSequenceValues.length > 0 ? Math.min(...formulaSequenceValues) : null;
    const currentFormulaSelection =
      formulaCurrentSequence == null
        ? [...formulaSelections].sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0))[0] || null
        : formulaSelections.find(
            (selection) => normalizeFormulaStepValue(selection.sequence, true) === formulaCurrentSequence
          ) || null;
    const formulaCurrentDestination = currentFormulaSelection
      ? resolveSelectionDestination(currentFormulaSelection)
      : null;
    const explicitLineDestination = String(line.destination || "").trim().toLowerCase();
    const destination: "cuisine" | "bar" =
      explicitLineDestination === "bar"
        ? "bar"
        : explicitLineDestination === "cuisine" || explicitLineDestination === "kitchen"
          ? "cuisine"
          : formulaCurrentDestination ||
            resolveDestinationForCategory(line.categoryId, line.category || "");
    const formulaPayload =
      isFormulaLine && formulaDishName
        ? {
            name: formulaDishName,
            price: Number((formulaUnitPrice != null ? formulaUnitPrice : unitPrice).toFixed(2)),
            items: formulaSelections
              .map((selection) => {
                const dishLabel = String(selection.dishName || "").trim();
                if (!dishLabel) return null;
                const selectedSides = Array.isArray(selection.selectedSides) ? selection.selectedSides.filter(Boolean) : [];
                const selectedOptions = Array.isArray(selection.selectedOptionNames)
                  ? selection.selectedOptionNames.filter(Boolean)
                  : [];
                const selectedExtras = Array.isArray(selection.selectedExtras)
                  ? selection.selectedExtras.map((extra) => String(extra.name || "").trim()).filter(Boolean)
                  : [];
                const selectedCooking = String(selection.selectedCooking || "").trim();
                const options: Record<string, unknown> = {};
                if (selectedCooking) options.cuisson = selectedCooking;
                if (selectedSides.length === 1) options.accompagnement = selectedSides[0];
                if (selectedSides.length > 1) options.accompagnements = selectedSides;
                if (selectedExtras.length === 1) options.supplement = selectedExtras[0];
                if (selectedExtras.length > 1) options.supplements = selectedExtras;
                if (selectedOptions.length === 1) options.option = selectedOptions[0];
                if (selectedOptions.length > 1) options.options = selectedOptions;
                return {
                  dish: dishLabel,
                  destination: resolveSelectionDestination(selection),
                  price: 0,
                  options,
                };
              })
              .filter(Boolean),
          }
        : null;
    if (!line.dishId || !line.dishName || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice)) {
      return [] as Item[];
    }

    const lineInstructions = buildLineInstructions(line);
    const resolvedFormulaLinePrice = Number((formulaUnitPrice != null ? formulaUnitPrice : unitPrice).toFixed(2));
    const formulaMainItemIndex = (() => {
      if (!isFormulaLine || formulaItemsPayload.length === 0) return 0;
      const entries = formulaItemsPayload as Array<Record<string, unknown>>;
      const formulaId = String(formulaDishId || "").trim();
      const explicitMainIndex = entries.findIndex((entry) => {
        const entryDishId = String(entry.dish_id || "").trim();
        return readBooleanFlag(entry.is_main, false) || (formulaId && entryDishId === formulaId);
      });
      if (explicitMainIndex >= 0) return explicitMainIndex;
      const firstStepOneIndex = entries.findIndex((entry) => {
        const step = normalizeFormulaStepValue(entry.sequence ?? entry.step, true);
        return step === 1;
      });
      if (firstStepOneIndex >= 0) return firstStepOneIndex;
      return 0;
    })();

    if (isFormulaLine && formulaItemsPayload.length > 0) {
      const formulaSelectionItems = (formulaItemsPayload as Array<Record<string, unknown>>).map((entry, index) => {
        const entryDishId = String(entry.dish_id || "").trim();
        const entryDishName = String(
          entry.dish_name_fr ?? entry.dish_name ?? entry.dishName ?? entry.value ?? line.dishName
        ).trim();
        const entryCategoryLabel = String((entry.category_label ?? entry.categoryLabel ?? line.category) || "").trim();
        const entryCategoryId = String(entry.category_id ?? entry.categoryId ?? line.categoryId ?? "").trim() || null;
        const normalizedEntrySequence = normalizeFormulaStepValue(entry.sequence ?? entry.step, true);
        const entrySequence =
          normalizedEntrySequence != null
            ? normalizedEntrySequence
            : normalizeFormulaStepValue(formulaCurrentSequence, true) ?? 1;
        const entryDestinationRaw = String(entry.destination || "").trim().toLowerCase();
        const entryDestination: "cuisine" | "bar" =
          isDirectFormulaSequence(entrySequence, formulaDirectSendSequence)
            ? "bar"
            : entryDestinationRaw === "bar"
              ? "bar"
              : entryDestinationRaw === "cuisine" || entryDestinationRaw === "kitchen"
                ? "cuisine"
                : resolveDestinationForCategory(entryCategoryId, entryCategoryLabel);
        const entrySideIds = Array.isArray(entry.selected_side_ids)
          ? entry.selected_side_ids.map((value) => String(value || "").trim()).filter(Boolean)
          : [];
        const entrySides = Array.isArray(entry.selected_sides)
          ? entry.selected_sides.map((value) => String(value || "").trim()).filter(Boolean)
          : [];
        const entryCooking = String(entry.selected_cooking || "").trim();
        const entryCookingKey = String(entry.selected_cooking_key || "").trim() || toCookingKeyFromLabel(entryCooking);
        const entryOptionIds = Array.isArray(entry.selected_option_ids)
          ? entry.selected_option_ids.map((value) => String(value || "").trim()).filter(Boolean)
          : [];
        const entryOptionNames = Array.isArray(entry.selected_option_names)
          ? entry.selected_option_names.map((value) => String(value || "").trim()).filter(Boolean)
          : [];
        const entryExtras = Array.isArray(entry.selected_extras)
          ? entry.selected_extras
          : Array.isArray(entry.selectedExtras)
            ? entry.selectedExtras
            : [];
        const entryExtraIds = Array.isArray(entry.selected_extra_ids)
          ? entry.selected_extra_ids.map((value) => String(value || "").trim()).filter(Boolean)
          : [];
        const entryExtrasPrice = entryExtras.reduce(
          (sum, extra) => sum + parsePriceNumber((extra as Record<string, unknown>).price),
          0
        );
        const entryOptionLabelFr = entryOptionNames.join(", ");
        const entryOptionsPayload: Array<Record<string, unknown>> = [];
        if (entryOptionNames.length > 0 || entryOptionIds.length > 0) {
          entryOptionsPayload.push({
            kind: "option",
            source: "formula",
            id: entryOptionIds.length > 0 ? entryOptionIds.join(",") : null,
            values: entryOptionNames,
            value: entryOptionLabelFr || null,
            label_fr: entryOptionLabelFr || null,
            price: 0,
            sequence: entrySequence,
          });
        }
        if (entrySides.length > 0 || entrySideIds.length > 0) {
          entryOptionsPayload.push({
            kind: "side",
            source: "formula",
            ids: entrySideIds,
            values: entrySides,
            label_fr: entrySides.join(", ") || null,
            sequence: entrySequence,
          });
        }
        if (entryExtras.length > 0 || entryExtraIds.length > 0) {
          entryOptionsPayload.push({
            kind: "extra",
            source: "formula",
            ids: entryExtraIds.length > 0 ? entryExtraIds : null,
            values: entryExtras
              .map((extra) => String((extra as any)?.name || (extra as any)?.label_fr || "").trim())
              .filter(Boolean),
            label_fr: entryExtras
              .map((extra) => String((extra as any)?.name || (extra as any)?.label_fr || "").trim())
              .filter(Boolean)
              .join(", ") || null,
            sequence: entrySequence,
          });
        }
        if (entryCooking) {
          entryOptionsPayload.push({
            kind: "cooking",
            source: "formula",
            key: entryCookingKey || null,
            value: entryCooking,
            label_fr: entryCooking,
            sequence: entrySequence,
          });
        }

        const entryUnitPrice =
          (index === formulaMainItemIndex ? resolvedFormulaLinePrice : 0) + Number(entryExtrasPrice.toFixed(2));
        const entrySortOrder = index === formulaMainItemIndex ? 0 : entrySequence ?? index + 1;
        return {
          id: entryDishId || line.dishId,
          dish_id: entryDishId || line.dishId,
          name: entryDishName || line.dishName,
          name_fr: entryDishName || line.dishName,
          quantity,
          category: entryCategoryLabel || line.category,
          categorie: entryCategoryLabel || line.category,
          category_id: entryCategoryId,
          price: Number(entryUnitPrice.toFixed(2)),
          base_price: Number(entryUnitPrice.toFixed(2)),
          extras_price: Number(entryExtrasPrice.toFixed(2)),
          unit_total_price: Number(entryUnitPrice.toFixed(2)),
          selected_option_id: entryOptionIds.length > 0 ? entryOptionIds[0] : null,
          selected_option_name: entryOptionNames.length > 0 ? entryOptionNames[0] : null,
          selected_option_price: 0,
          selected_option: entryOptionsPayload.find((option) => String(option.kind || "").trim() === "option") || null,
          selected_options: entryOptionsPayload,
          selectedOptions: entryOptionsPayload,
          options: entryOptionsPayload,
          selectedSides: entrySides,
          selected_sides: entrySides,
          selected_side_ids: entrySideIds,
          side: entrySides.length > 0 ? entrySides[0] : null,
          accompagnement: entrySides.length > 0 ? entrySides[0] : null,
          accompagnements: entrySides,
          selectedExtras: entryExtras,
          selected_extras: entryExtras,
          selected_extra_ids: entryExtraIds,
          supplements: entryExtras.map((extra) => String((extra as any)?.name || (extra as any)?.label_fr || "").trim()).filter(Boolean),
          supplement: entryExtras.map((extra) => String((extra as any)?.name || (extra as any)?.label_fr || "").trim()).filter(Boolean),
          destination: entryDestination,
          is_drink: entryDestination === "bar",
          cooking: entryCooking || null,
          cuisson: entryCooking || null,
          selected_cooking: entryCooking || null,
          selected_cooking_label_fr: entryCooking || null,
          selected_cooking_label: entryCooking || null,
          selected_cooking_key: entryCookingKey || null,
          formula_dish_id: formulaDishId,
          formula_dish_name: formulaDishName,
          formula_unit_price: resolvedFormulaLinePrice,
          formula_instance_id: formulaInstanceId,
          is_formula: true,
          formula_group_id: formulaGroupId,
          is_formula_parent: index === formulaMainItemIndex,
          is_formula_child: index !== formulaMainItemIndex,
          formula_current_sequence: entrySequence,
          sequence: entrySequence,
          step: entrySequence,
          sort_order: entrySortOrder,
          step_number: entrySortOrder,
          formula_items: [entry],
          formula: index === formulaMainItemIndex ? formulaPayload : null,
          special_request: String(line.specialRequest || "").trim(),
          instructions: lineInstructions,
          status: resolveInitialFormulaItemStatus(entrySequence, formulaDirectSendSequence, entrySortOrder),
          from_recommendation: false,
        } as Item;
      });
      return formulaSelectionItems;
    }

    const baseSequence = normalizeFormulaStepValue(formulaCurrentSequence, true) ?? 1;
    const baseStatus = formulaDishId
      ? resolveInitialFormulaItemStatus(baseSequence, formulaDirectSendSequence, formulaDishId ? 0 : null)
      : "pending";
    return [{
      id: line.dishId,
      name: line.dishName,
      quantity,
      category: line.category,
      categorie: line.category,
      price: Number(unitPrice.toFixed(2)),
      base_price: Number.isFinite(baseUnitPrice) ? baseUnitPrice : Number(unitPrice.toFixed(2)),
      extras_price: Number(extrasPrice.toFixed(2)),
      unit_total_price: Number(unitPrice.toFixed(2)),
      selected_option_id: selectedOptionId,
      selected_option_name: selectedOptionName,
      selected_option_price: optionPrice,
      selected_option: selectedOptionsPayload.find((entry) => String(entry.kind || "").trim() === "option") || null,
      selected_options: selectedOptionsPayload,
      selectedOptions: selectedOptionsPayload,
      options: selectedOptionsPayload,
      selectedSides: safeSelectedSides,
      selected_sides: safeSelectedSides,
      selected_side_ids: selectedSideIds,
      side: safeSelectedSides.length > 0 ? safeSelectedSides[0] : null,
      accompagnement: safeSelectedSides.length > 0 ? safeSelectedSides[0] : null,
      accompagnements: safeSelectedSides,
      selectedExtras: safeSelectedExtras.map((extra) => ({ name: extra.name, price: extra.price })),
      selected_extras: safeSelectedExtras.map((extra, index) => ({
        id: buildStableExtraId(line.dishId, extra.name, extra.price, index),
        label_fr: String(extra.name || "").trim(),
        price: parsePriceNumber(extra.price),
      })),
      selected_extra_ids: safeSelectedExtras.map((extra, index) =>
        buildStableExtraId(line.dishId, extra.name, extra.price, index)
      ),
      supplements: safeSelectedExtras.map((extra) => String(extra.name || "").trim()).filter(Boolean),
      supplement: safeSelectedExtras.map((extra) => String(extra.name || "").trim()).filter(Boolean),
      destination,
      is_drink: destination === "bar",
      cooking: cookingLabel || null,
      cuisson: cookingLabel || null,
      selected_cooking: cookingLabel || null,
      selected_cooking_label_fr: cookingLabel || null,
      selected_cooking_label: cookingLabel || null,
      selected_cooking_key: cookingKey || null,
      formula_dish_id: formulaDishId,
      formula_dish_name: formulaDishName,
      formula_unit_price: formulaUnitPrice,
      formula_instance_id: formulaInstanceId,
      formula_group_id: formulaGroupId,
      is_formula_parent: Boolean(formulaDishId),
      is_formula_child: false,
      is_formula: Boolean(formulaDishId),
      sort_order: formulaDishId ? 0 : null,
      step_number: formulaDishId ? 0 : null,
      formula_current_sequence: formulaCurrentSequence,
      formula_items: formulaItemsPayload.length > 0 ? formulaItemsPayload : null,
      formula: formulaPayload,
      special_request: String(line.specialRequest || "").trim(),
      instructions: lineInstructions,
      status: baseStatus,
      from_recommendation: false,
    } as Item];
  });
}
