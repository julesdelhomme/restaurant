"use client";

export function FormulaCategoriesSection(props: any) {
  const {
    formulaCategories,
    uiText,
    formulaOptionsByCategory,
    formulaSelections,
    dishById,
    getFormulaDishConfig,
    getFormulaSelectionDetails,
    formulaDefaultOptionsByDishId,
    getSelectableFormulaProductOptionsForDish,
    getCategoryLabel,
    setFormulaActiveCategoryId,
    setFormulaSelectionError,
    setFormulaSelections,
    setFormulaSelectionDetails,
    formulaItemDetailsOpen,
    getDescription,
    lang,
    hideBrokenImage,
    getDishName,
    setFormulaItemDetailsOpen,
    itemDetailsLabel,
    tt,
    optionVariantsLabel,
    parseAddonPrice,
    formulaOptionLockedLabel,
    sideIdByAlias,
    normalizeLookupText,
  } = props;

  if (formulaCategories.length === 0) {
    return <div className="text-sm text-black/70">{uiText.noDishes}</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {formulaCategories.map((category: any) => {
        const categoryId = String(category.id || "").trim();
        const options = formulaOptionsByCategory.get(categoryId) || [];
        const selectedId = formulaSelections[categoryId] || "";
        const selectedDishForCategory = selectedId ? dishById.get(String(selectedId || "").trim()) || null : null;
        const formulaDishConfig = selectedDishForCategory ? getFormulaDishConfig(selectedDishForCategory) : null;
        const categoryDetails = getFormulaSelectionDetails(categoryId);
        const allowMultiOptionSelection = Boolean((selectedDishForCategory as any)?.allow_multi_select);
        const selectedDishIdForDefaults = selectedDishForCategory ? String(selectedDishForCategory.id || "").trim() : "";
        const rawDefaultOptionIdsForSelectedDish = selectedDishIdForDefaults
          ? formulaDefaultOptionsByDishId.get(selectedDishIdForDefaults) || []
          : [];
        const availableOptionIdSet = new Set(
          (formulaDishConfig?.productOptions || []).map((option: any) => String(option.id || "").trim()).filter(Boolean)
        );
        const defaultOptionIdsForSelectedDish = rawDefaultOptionIdsForSelectedDish.filter((id: string) =>
          availableOptionIdSet.has(String(id || "").trim())
        );
        const selectableProductOptionsForCategory =
          selectedDishForCategory && formulaDishConfig
            ? getSelectableFormulaProductOptionsForDish(selectedDishForCategory, formulaDishConfig.productOptions)
            : [];

        return (
          <div key={`formula-category-${categoryId}`} className="border-2 border-black rounded-xl p-3">
            <div className="font-black text-base mb-2">{getCategoryLabel(category)}</div>
            {options.length === 0 ? (
              <div className="text-sm text-black/60">{uiText.noDishes}</div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {options.map((optionDish: any) => {
                  const optionId = String(optionDish.id || "").trim();
                  if (!optionId) return null;
                  const isSelected = selectedId === optionId;
                  const optionConfig = getFormulaDishConfig(optionDish);
                  const rawDefaultOptionIds = formulaDefaultOptionsByDishId.get(optionId) || [];
                  const optionProductOptionIds = new Set(
                    optionConfig.productOptions.map((option: any) => String(option.id || "").trim()).filter(Boolean)
                  );
                  const normalizedDefaultOptionIds = rawDefaultOptionIds.filter((id: string) =>
                    optionProductOptionIds.has(String(id || "").trim())
                  );
                  const allowMultiDefaults = Boolean((optionDish as any)?.allow_multi_select);
                  const defaultOptionIds = allowMultiDefaults ? normalizedDefaultOptionIds : normalizedDefaultOptionIds.slice(0, 1);
                  const isDetailsOpen = Boolean(formulaItemDetailsOpen[optionId]);
                  const optionDescription = getDescription(optionDish, lang);
                  return (
                    <div key={`formula-option-${categoryId}-${optionId}`} className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFormulaActiveCategoryId(categoryId);
                            setFormulaSelectionError("");
                            setFormulaSelections((prev: any) => ({ ...prev, [categoryId]: optionId }));
                            setFormulaSelectionDetails((prev: any) => ({
                              ...prev,
                              [categoryId]: {
                                selectedSideIds: [],
                                selectedSides: [],
                                selectedCooking: "",
                                selectedProductOptionIds: defaultOptionIds,
                              },
                            }));
                          }}
                          className={`flex-1 text-left px-3 py-2 rounded-lg border-2 font-black ${
                            isSelected ? "bg-black text-white border-black" : "bg-white text-black border-black"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {optionDish.image_url ? (
                              <img
                                src={optionDish.image_url}
                                alt={getDishName(optionDish, lang)}
                                className="h-10 w-10 rounded-md object-cover border border-black/20"
                                onError={hideBrokenImage}
                              />
                            ) : null}
                            <span>{getDishName(optionDish, lang)}</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormulaItemDetailsOpen((prev: any) => ({ ...prev, [optionId]: !prev[optionId] }))}
                          className="px-3 py-2 rounded-lg border-2 border-black bg-white text-xs font-black text-black whitespace-nowrap"
                        >
                          {itemDetailsLabel}
                        </button>
                      </div>
                      {isDetailsOpen ? (
                        <div className="text-sm text-black/70 rounded-lg border border-black/10 bg-white px-3 py-2">
                          {optionDescription || tt("details_none")}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
            {selectedDishForCategory && formulaDishConfig ? (
              <div className="mt-3 space-y-3 border-t border-black/20 pt-3">
                <h3 className="font-black text-base mb-2">{getDishName(selectedDishForCategory, lang)}</h3>
                {selectableProductOptionsForCategory.length > 0 ? (
                  <div>
                    <div className="text-xs font-black uppercase tracking-wide mb-2">{optionVariantsLabel}</div>
                    <div className="grid grid-cols-1 gap-2">
                      {selectableProductOptionsForCategory.map((option: any) => {
                        const optionId = String(option.id || "").trim();
                        if (!optionId) return null;
                        const optionPrice = parseAddonPrice(option.price_override);
                        const isPaidOption = optionPrice > 0;
                        const isDefaultOption = defaultOptionIdsForSelectedDish.includes(optionId);
                        const isLocked = isPaidOption && !isDefaultOption;
                        const selected = categoryDetails.selectedProductOptionIds.includes(optionId);
                        return (
                          <label
                            key={`formula-option-detail-${categoryId}-${optionId}`}
                            className={`flex items-center gap-2 text-sm font-bold ${isLocked ? "text-gray-400" : ""}`}
                          >
                            <input
                              type={allowMultiOptionSelection ? "checkbox" : "radio"}
                              name={`formula-product-option-${categoryId}`}
                              checked={selected}
                              disabled={isLocked}
                              onChange={(event) => {
                                if (isLocked) return;
                                setFormulaSelectionError("");
                                setFormulaSelectionDetails((prev: any) => {
                                  const current = prev[categoryId] || {
                                    selectedSideIds: [],
                                    selectedSides: [],
                                    selectedCooking: "",
                                    selectedProductOptionIds: [],
                                  };
                                  const nextIds = allowMultiOptionSelection
                                    ? event.target.checked
                                      ? [...current.selectedProductOptionIds, optionId]
                                      : current.selectedProductOptionIds.filter((id: string) => id !== optionId)
                                    : event.target.checked
                                      ? [optionId]
                                      : [];
                                  return {
                                    ...prev,
                                    [categoryId]: {
                                      ...current,
                                      selectedProductOptionIds: Array.from(new Set(nextIds)),
                                    },
                                  };
                                });
                              }}
                            />
                            <span>
                              {props.getProductOptionLabel(option, lang)}
                              {isLocked ? ` (${formulaOptionLockedLabel})` : ""}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {formulaDishConfig.hasRequiredSides ? (
                  <div>
                    <div className="text-xs font-black uppercase tracking-wide mb-2">
                      {uiText.sidesLabel} ({Math.min(formulaDishConfig.maxSides, categoryDetails.selectedSides.length)}/
                      {formulaDishConfig.maxSides})
                    </div>
                    {formulaDishConfig.sideOptions.length === 0 ? (
                      <div className="text-xs font-bold text-red-600">{tt("no_side_configured")}</div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {formulaDishConfig.sideOptions.map((sideLabel: string) => {
                          const sideId = sideIdByAlias.get(normalizeLookupText(sideLabel)) || sideLabel;
                          const checked = categoryDetails.selectedSideIds.includes(sideId);
                          return (
                            <label key={`formula-side-${categoryId}-${sideId}`} className="flex items-center gap-2 text-sm font-bold">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => {
                                  setFormulaSelectionError("");
                                  setFormulaSelectionDetails((prev: any) => {
                                    const current = prev[categoryId] || {
                                      selectedSideIds: [],
                                      selectedSides: [],
                                      selectedCooking: "",
                                      selectedProductOptionIds: [],
                                    };
                                    const maxSides = formulaDishConfig.maxSides;
                                    const nextPairs = current.selectedSideIds.map((id: string, index: number) => ({
                                      id,
                                      label: current.selectedSides[index] || id,
                                    }));
                                    const exists = nextPairs.some((entry: any) => entry.id === sideId);
                                    const canAdd = nextPairs.length < maxSides;
                                    const updatedPairs = event.target.checked
                                      ? exists
                                        ? nextPairs
                                        : canAdd
                                          ? [...nextPairs, { id: sideId, label: sideLabel }]
                                          : nextPairs
                                      : nextPairs.filter((entry: any) => entry.id !== sideId);
                                    return {
                                      ...prev,
                                      [categoryId]: {
                                        ...current,
                                        selectedSideIds: updatedPairs.map((entry: any) => entry.id),
                                        selectedSides: updatedPairs.map((entry: any) => entry.label),
                                      },
                                    };
                                  });
                                }}
                              />
                              <span>{sideLabel}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
                {formulaDishConfig.askCooking ? (
                  <div>
                    <div className="text-xs font-black uppercase tracking-wide mb-2">{uiText.cookingLabel}</div>
                    <div className="grid grid-cols-1 gap-2">
                      {[uiText.cooking.blue, uiText.cooking.rare, uiText.cooking.medium, uiText.cooking.wellDone].map(
                        (cookingLabel) => (
                          <label key={`formula-cooking-${categoryId}-${cookingLabel}`} className="flex items-center gap-2 text-sm font-bold">
                            <input
                              type="radio"
                              name={`formula-cooking-${categoryId}`}
                              checked={categoryDetails.selectedCooking === cookingLabel}
                              onChange={() => {
                                setFormulaSelectionError("");
                                setFormulaSelectionDetails((prev: any) => {
                                  const current = prev[categoryId] || {
                                    selectedSideIds: [],
                                    selectedSides: [],
                                    selectedCooking: "",
                                    selectedProductOptionIds: [],
                                  };
                                  return {
                                    ...prev,
                                    [categoryId]: {
                                      ...current,
                                      selectedCooking: cookingLabel,
                                    },
                                  };
                                });
                              }}
                            />
                            <span>{cookingLabel}</span>
                          </label>
                        )
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
