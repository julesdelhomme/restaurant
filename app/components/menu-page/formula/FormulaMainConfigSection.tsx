"use client";

export function FormulaMainConfigSection(props: any) {
  const {
    formulaDish,
    formulaMainConfig,
    formulaInfoById,
    dishById,
    mainFormulaStepLabel,
    getDishName,
    lang,
    getFormulaDisplayName,
    sanitizeMediaUrl,
    selectedMainFormulaDish,
    mainFormulaStep,
    mainFormulaFilteredOptions,
    formulaMainDetails,
    buildInstructionText,
    uiText,
    hideBrokenImage,
    parseOptionIdSet,
    setFormulaSelectionError,
    parsePriceNumber,
    getProductOptionLabel,
    tt,
    sideIdByAlias,
    normalizeLookupText,
    setFormulaMainDetails,
  } = props;

  if (!formulaMainConfig || (!formulaMainConfig.hasRequiredSides && !formulaMainConfig.askCooking)) return null;

  return (
    <div className="mb-4 border-2 border-black rounded-xl p-3">
      {(() => {
        const info = formulaInfoById.get(String(formulaDish?.id || ""));
        const parentDishId = info?.dishId;
        const parentDish = parentDishId ? dishById.get(String(parentDishId)) : null;
        const parentDishNameFromFormula = String(info?.parent_dish_name || "").trim();
        const stepDishName = mainFormulaStepLabel || (parentDish ? getDishName(parentDish, lang) : "") || parentDishNameFromFormula;
        const parentDishName = stepDishName || getFormulaDisplayName(formulaDish);
        const parentDishImageUrl = sanitizeMediaUrl(
          (selectedMainFormulaDish as any)?.image_url || (mainFormulaStep?.dish as any)?.image_url || (parentDish as any)?.image_url,
          "dishes-images-"
        );
        const selectedMainOptions = mainFormulaFilteredOptions.filter((option: any) =>
          formulaMainDetails.selectedProductOptionIds.includes(String(option?.id || "").trim())
        );
        const summary = buildInstructionText(
          lang,
          formulaMainDetails.selectedSides,
          [],
          selectedMainOptions,
          null,
          formulaMainDetails.selectedCooking,
          "",
          uiText
        );
        return (
          <div className="mb-2">
            <div className="flex items-center gap-3">
              {parentDishImageUrl ? (
                <img
                  src={parentDishImageUrl}
                  alt={parentDishName}
                  className="h-10 w-10 rounded-md object-cover border border-black/20"
                  onError={hideBrokenImage}
                />
              ) : null}
              <div className="font-black text-base">{parentDishName}</div>
            </div>
            {summary ? <p className="mt-1 text-xs text-black/70">{summary}</p> : null}
          </div>
        );
      })()}
      <div className="space-y-3">
        {(() => {
          const formule = (formulaDish as any) || {};
          const platPrincipal = {
            ...((selectedMainFormulaDish as any) || {}),
            options: mainFormulaFilteredOptions || [],
          };
          const formulaInfo = formulaInfoById.get(String(formulaDish?.id || ""));
          const excludedMainOptions =
            formule.excluded_main_options ??
            (formulaInfo as any)?.excluded_main_options ??
            ((formule as any)?.metadata?.excluded_options) ??
            ((formule as any)?.excluded_options) ??
            [];
          const excludedIds = Array.isArray(excludedMainOptions)
            ? excludedMainOptions
            : Array.from(parseOptionIdSet(excludedMainOptions));
          const availableOptions = (platPrincipal.options || []).filter((option: any) => {
            const optionId = String((option as any)?.id || "").trim();
            const isExcluded = excludedIds.includes(optionId);
            const isDeleted = Boolean((option as any)?.is_deleted);
            const isInactive = (option as any)?.is_active === false;
            return !isExcluded && !isDeleted && !isInactive;
          });

          if (availableOptions.length === 0) return null;

          return (
            <div>
              <div className="text-xs font-black uppercase tracking-wide mb-2">Options</div>
              <div className="grid grid-cols-1 gap-2">
                {availableOptions.map((option: any) => {
                  const optionId = String(option.id || "").trim();
                  if (!optionId) return null;
                  const checked = formulaMainDetails.selectedProductOptionIds.includes(optionId);
                  const optionLabel = getProductOptionLabel(option, lang);
                  const optionPrice = parsePriceNumber(option.price_override ?? 0);
                  const allowMulti = Boolean(platPrincipal?.allow_multi_select);
                  return (
                    <label key={`formula-main-option-${optionId}`} className="flex items-center gap-2 text-sm font-bold">
                      <input
                        type={allowMulti ? "checkbox" : "radio"}
                        name="formula-main-option"
                        checked={checked}
                        onChange={(event) => {
                          setFormulaSelectionError("");
                          setFormulaMainDetails((current: any) => {
                            const nextIds = allowMulti
                              ? event.target.checked
                                ? [...current.selectedProductOptionIds, optionId]
                                : current.selectedProductOptionIds.filter((id: string) => id !== optionId)
                              : [optionId];
                            return {
                              ...current,
                              selectedProductOptionIds: Array.from(new Set(nextIds.filter(Boolean))),
                            };
                          });
                        }}
                      />
                      <span>
                        {optionLabel}
                        {optionPrice > 0 ? ` (${optionPrice.toFixed(2)} EUR)` : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })()}
        {formulaMainConfig.hasRequiredSides ? (
          <div>
            <div className="text-xs font-black uppercase tracking-wide mb-2">
              {uiText.sidesLabel} ({Math.min(formulaMainConfig.maxSides, formulaMainDetails.selectedSides.length)}/
              {formulaMainConfig.maxSides})
            </div>
            {formulaMainConfig.sideOptions.length === 0 ? (
              <div className="text-xs font-bold text-red-600">{tt("no_side_configured")}</div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {formulaMainConfig.sideOptions.map((sideLabel: string) => {
                  const sideId = sideIdByAlias.get(normalizeLookupText(sideLabel)) || sideLabel;
                  const checked = formulaMainDetails.selectedSideIds.includes(sideId);
                  return (
                    <label key={`formula-main-side-${sideId}`} className="flex items-center gap-2 text-sm font-bold">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          setFormulaSelectionError("");
                          setFormulaMainDetails((current: any) => {
                            const maxSides = formulaMainConfig.maxSides;
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
                              ...current,
                              selectedSideIds: updatedPairs.map((entry: any) => entry.id),
                              selectedSides: updatedPairs.map((entry: any) => entry.label),
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
        {formulaMainConfig.askCooking ? (
          <div>
            <div className="text-xs font-black uppercase tracking-wide mb-2">{uiText.cookingLabel}</div>
            <div className="grid grid-cols-1 gap-2">
              {[uiText.cooking.blue, uiText.cooking.rare, uiText.cooking.medium, uiText.cooking.wellDone].map(
                (cookingLabel) => (
                  <label key={`formula-main-cooking-${cookingLabel}`} className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="radio"
                      name="formula-main-cooking"
                      checked={formulaMainDetails.selectedCooking === cookingLabel}
                      onChange={() => {
                        setFormulaSelectionError("");
                        setFormulaMainDetails((current: any) => ({
                          ...current,
                          selectedCooking: cookingLabel,
                        }));
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
    </div>
  );
}
