export function handleFormulaModalSubmit(ctx: any) {
  try {
    const {
      formulaDish,
      normalizedFormulaCategoryIds,
      formulaOptionsByCategory,
      formulaSelections,
      formulaUi,
      setFormulaSelectionError,
      getFormulaDishConfig,
      formulaMainDetails,
      dishById,
      getFormulaSelectionDetails,
      getSelectableFormulaProductOptionsForDish,
      categoryById,
      getProductOptionLabel,
      parseAddonPrice,
      formulaSequenceByDishId,
      getCategoryLabel,
      getDishName,
      lang,
      addToCart,
      onAddToCart,
      onAdd,
      getFormulaDisplayName,
      getFormulaPackPrice,
      resetFormulaState,
    } = ctx;

    if (!formulaDish) return;

    const safeCategoryIds = Array.isArray(normalizedFormulaCategoryIds) ? normalizedFormulaCategoryIds : [];
    const safeFormulaSelections =
      formulaSelections && typeof formulaSelections === "object" ? formulaSelections : {};
    const safeMainDetailsRaw =
      formulaMainDetails && typeof formulaMainDetails === "object" ? formulaMainDetails : {};
    const safeMainDetails = {
      selectedProductOptionIds: Array.isArray(safeMainDetailsRaw.selectedProductOptionIds)
        ? safeMainDetailsRaw.selectedProductOptionIds
        : [],
      selectedSides: Array.isArray(safeMainDetailsRaw.selectedSides) ? safeMainDetailsRaw.selectedSides : [],
      selectedSideIds: Array.isArray(safeMainDetailsRaw.selectedSideIds) ? safeMainDetailsRaw.selectedSideIds : [],
      selectedCooking: String(safeMainDetailsRaw.selectedCooking || "").trim(),
    };
    const selectedFormulaEntries = Object.entries(safeFormulaSelections)
      .map(([rawCategoryId, rawDishId]) => ({
        categoryId: String(rawCategoryId || "").trim(),
        dishId: String(rawDishId || "").trim(),
      }))
      .filter((entry) => Boolean(entry.categoryId) && Boolean(entry.dishId));

    const missingCategory = safeCategoryIds.find((categoryId: any) => {
      const normalizedCategoryId = String(categoryId || "").trim();
      if (!normalizedCategoryId) return false;
      const options = formulaOptionsByCategory?.get?.(normalizedCategoryId) || [];
      if (!Array.isArray(options) || options.length === 0) return false;
      return !safeFormulaSelections[normalizedCategoryId];
    });
    if (missingCategory) {
      setFormulaSelectionError(formulaUi?.missing || "");
      return;
    }

    const formulaMainConfigRaw = getFormulaDishConfig?.(formulaDish) || {};
    const formulaMainProductOptions = Array.isArray(formulaMainConfigRaw?.productOptions)
      ? formulaMainConfigRaw.productOptions
      : [];
    const mainSelectedProductOptions = formulaMainProductOptions.filter((option: any) =>
      safeMainDetails.selectedProductOptionIds.includes(String(option?.id || "").trim())
    );

    if (formulaMainConfigRaw) {
      if (Boolean(formulaMainConfigRaw.hasRequiredSides) && safeMainDetails.selectedSides.length === 0) {
        setFormulaSelectionError(formulaUi?.missingOptions || "");
        return;
      }
      if (Boolean(formulaMainConfigRaw.askCooking) && !safeMainDetails.selectedCooking) {
        setFormulaSelectionError(formulaUi?.missingOptions || "");
        return;
      }
    }

    const missingRequiredOptionsCategory = selectedFormulaEntries.find((entry: any) => {
      const normalizedCategoryId = String(entry?.categoryId || "").trim();
      if (!normalizedCategoryId) return false;
      const selectedId = String(entry?.dishId || "").trim();
      if (!selectedId) return false;

      const selectedDish = dishById?.get?.(selectedId);
      if (!selectedDish) return false;

      const configRaw = getFormulaDishConfig?.(selectedDish) || {};
      const configProductOptions = Array.isArray(configRaw?.productOptions) ? configRaw.productOptions : [];
      const detailsRaw = getFormulaSelectionDetails?.(normalizedCategoryId) || {};
      const details = {
        selectedProductOptionIds: Array.isArray(detailsRaw?.selectedProductOptionIds)
          ? detailsRaw.selectedProductOptionIds
          : [],
        selectedSides: Array.isArray(detailsRaw?.selectedSides) ? detailsRaw.selectedSides : [],
        selectedCooking: String(detailsRaw?.selectedCooking || "").trim(),
      };

      const selectableProductOptionsRaw =
        getSelectableFormulaProductOptionsForDish?.(selectedDish, configProductOptions) || [];
      const selectableProductOptions = Array.isArray(selectableProductOptionsRaw) ? selectableProductOptionsRaw : [];
      const selectableOptionIdSet = new Set(
        selectableProductOptions.map((option: any) => String(option?.id || "").trim()).filter(Boolean)
      );
      const hasSelectedSelectableOption = details.selectedProductOptionIds.some((id: any) =>
        selectableOptionIdSet.has(String(id || "").trim())
      );

      if (selectableProductOptions.length > 0 && !hasSelectedSelectableOption) return true;
      if (Boolean(configRaw?.hasRequiredSides) && details.selectedSides.length === 0) return true;
      if (Boolean(configRaw?.askCooking) && !details.selectedCooking) return true;
      return false;
    });
    if (missingRequiredOptionsCategory) {
      setFormulaSelectionError(formulaUi?.missingOptions || "");
      return;
    }

    const selections = selectedFormulaEntries
      .map((entry: any, entryIndex: number) => {
        const normalizedCategoryId = String(entry?.categoryId || "").trim();
        const selectedId = String(entry?.dishId || "").trim();
        if (!normalizedCategoryId || !selectedId) return null;

        const category = categoryById?.get?.(normalizedCategoryId);
        const selectedDish = dishById?.get?.(selectedId);
        if (!selectedDish) return null;

        const configRaw = getFormulaDishConfig?.(selectedDish) || {};
        const configProductOptions = Array.isArray(configRaw?.productOptions) ? configRaw.productOptions : [];
        const detailsRaw = getFormulaSelectionDetails?.(normalizedCategoryId) || {};
        const details = {
          selectedSideIds: Array.isArray(detailsRaw?.selectedSideIds) ? detailsRaw.selectedSideIds : [],
          selectedSides: Array.isArray(detailsRaw?.selectedSides) ? detailsRaw.selectedSides : [],
          selectedCooking: String(detailsRaw?.selectedCooking || "").trim(),
          selectedProductOptionIds: Array.isArray(detailsRaw?.selectedProductOptionIds)
            ? detailsRaw.selectedProductOptionIds
            : [],
          selectedOptions: Array.isArray(detailsRaw?.selectedOptions) ? detailsRaw.selectedOptions : [],
        };

        const selectedOptions = configProductOptions.filter((option: any) =>
          details.selectedProductOptionIds.includes(String(option?.id || "").trim())
        );
        const selectedOptionNames = selectedOptions
          .map((option: any) => getProductOptionLabel?.(option, lang))
          .filter(Boolean);
        const selectedOptionPrice = selectedOptions.reduce((sum: number, option: any) => {
          const safePrice = parseAddonPrice?.(option?.price_override ?? option?.price ?? 0) || 0;
          return sum + (Number.isFinite(Number(safePrice)) ? Number(safePrice) : 0);
        }, 0);
        const formattedSelectedOptions = selectedOptions.map((option: any) => ({
          id: String(option?.id || "").trim() || null,
          name: String(getProductOptionLabel?.(option, lang) || option?.name || "").trim() || null,
          price: Number(parseAddonPrice?.(option?.price_override ?? option?.price ?? 0) || 0),
        }));
        const rawSupplements = Array.isArray((detailsRaw as any)?.supplements)
          ? (detailsRaw as any).supplements
          : Array.isArray((detailsRaw as any)?.selectedExtras)
            ? (detailsRaw as any).selectedExtras
            : [];
        const supplements = rawSupplements
          .map((extra: any) => {
            if (typeof extra === "string" || typeof extra === "number") {
              const label = String(extra || "").trim();
              return label ? { name: label, price: 0 } : null;
            }
            const label = String(extra?.name || extra?.label || extra?.label_fr || "").trim();
            if (!label) return null;
            return {
              name: label,
              price: Number(parseAddonPrice?.(extra?.price ?? 0) || 0),
            };
          })
          .filter(Boolean);
        const linkedSequence = formulaSequenceByDishId?.get?.(selectedId);
        const sequenceIndexFromCategories = safeCategoryIds.findIndex(
          (categoryId: any) => String(categoryId || "").trim() === normalizedCategoryId
        );
        const fallbackSequence =
          sequenceIndexFromCategories >= 0 ? sequenceIndexFromCategories + 1 : entryIndex + 1;
        const sequence = Number.isFinite(Number(linkedSequence)) ? Number(linkedSequence) : fallbackSequence;

        return {
          categoryId: normalizedCategoryId,
          categoryLabel: category ? getCategoryLabel?.(category) : "",
          dishId: selectedId,
          dishName: getDishName?.(selectedDish, lang),
          dishNameFr:
            String(selectedDish?.name_fr || selectedDish?.name || selectedDish?.nom || "").trim() ||
            getDishName?.(selectedDish, lang),
          sequence,
          selectedSideIds: details.selectedSideIds || [],
          selectedSides: details.selectedSides || [],
          selectedCooking: details.selectedCooking || "",
          selectedOptionIds: details.selectedProductOptionIds || [],
          selectedOptions: formattedSelectedOptions,
          selectedOptionNames,
          selectedOptionPrice,
          supplements,
        };
      })
      .filter(Boolean);
    const formattedFormulaItems = (Array.isArray(selections) ? selections : []).sort(
      (a: any, b: any) => Number(a?.sequence || 0) - Number(b?.sequence || 0)
    );

    const finalFormulaItem = {
      dish: formulaDish,
      quantity: 1,
      selectedSides: safeMainDetails.selectedSides || [],
      selectedSideIds: safeMainDetails.selectedSideIds || [],
      selectedExtras: [],
      selectedProductOptions: mainSelectedProductOptions || [],
      selectedProductOption: (mainSelectedProductOptions || [])[0] || null,
      selectedCooking: safeMainDetails.selectedCooking || "",
      specialRequest: "",
      formulaSelections: formattedFormulaItems,
      formulaDishId: String(formulaDish?.id || "").trim() || undefined,
      formulaDishName: getFormulaDisplayName?.(formulaDish),
      formulaUnitPrice: getFormulaPackPrice?.(formulaDish),
    };

    if (typeof onAddToCart === "function") {
      onAddToCart(finalFormulaItem);
    } else if (typeof onAdd === "function") {
      onAdd(finalFormulaItem);
    } else if (typeof addToCart === "function") {
      addToCart(finalFormulaItem);
    } else {
      console.error("Erreur Ajout Formule :", new Error("Aucun callback d'ajout disponible"));
      return;
    }

    if (typeof resetFormulaState === "function") {
      resetFormulaState();
    }
  } catch (error) {
    console.error("Erreur Ajout Formule :", error);
  }
}
