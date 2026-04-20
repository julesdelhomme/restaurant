import { Euro, X } from "lucide-react";
import { FormulaConfigModal } from "./FormulaConfigModal";
import { COOKING_CHOICES } from "../utils/page-helpers";

export function FormulaComposerModal(props: any) {
  const {
    dishes,
    formulaToConfig,
    configModalOpen,
    formulaModalOpen,
    formulaModalDish,
    closeFormulaModal,
    formulaUi,
    getFormulaDisplayName,
    getFormulaPackPrice,
    formulaCategories,
    formulaStepGroups,
    getCategoryLabel,
    formulaNoDishesMessageByCategory,
    formulaOptionsByCategory,
    formulaModalSelections,
    resolveFormulaDishRecord,
    dishById,
    getFormulaDishConfig,
    getFormulaSelectionDetails,
    formulaDefaultOptionsByDishId,
    hasFormulaConfigOptionsForDish,
    formulaModalItemDetailsOpen,
    setFormulaModalItemDetailsOpen,
    openFormulaItemOptionsModal,
    getFormulaCompositionDishName,
    getDishCleanDescription,
    getDishPrice,
    formulaItemDetailsLabel,
    formulaOptionsLabel,
    parsePriceNumber,
    formulaOptionLockedLabel,
    sideIdByAlias,
    normalizeLookupText,
    setFormulaModalError,
    setFormulaModalSelectionDetails,
    formulaModalError,
    formulaAddDisabled,
    handleAddFormulaLine,
  } = props;

  const safeHandleAddFormulaLine = () => {
    if (typeof handleAddFormulaLine === "function") {
      void handleAddFormulaLine();
    } else {
      console.error("Ajout formule impossible: handleAddFormulaLine indisponible.");
    }
  };

  return (
    <FormulaConfigModal allDishes={dishes} selectedFormula={formulaToConfig} isOpen={configModalOpen && formulaModalOpen && Boolean(formulaModalDish)}>
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white border-2 border-black rounded-lg flex flex-col max-h-[90vh]">
          <div className="relative p-4 border-b-2 border-black">
            <button
              type="button"
              onClick={closeFormulaModal}
              className="absolute top-3 right-3 h-9 w-9 border-2 border-black bg-white font-black"
              aria-label="Fermer"
            >
              <X className="h-4 w-4 mx-auto" />
            </button>
            <div className="text-center">
              <div className="text-lg font-black">{formulaUi.title}</div>
              <div className="text-sm text-gray-600">{formulaUi.subtitle}</div>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-24 pt-4">
            <h2 className="text-xl font-black mb-1">{getFormulaDisplayName(formulaModalDish!)}</h2>
            <div className="text-base font-black inline-flex items-center gap-1 mb-4">
              {Number(getFormulaPackPrice(formulaModalDish!) || 0).toFixed(2)}
              <Euro className="h-4 w-4" />
            </div>
            {formulaCategories.length === 0 ? (
              <div className="text-sm text-gray-600">{formulaUi.subtitle}</div>
            ) : (
              <div className="flex flex-col gap-4">
                {formulaCategories.map((category: any) => {
                  const categoryId = String(category.id || "").trim();
                  const formulaStepForCategory = formulaStepGroups.find((g: any) => g.key === categoryId);
                  const options = formulaOptionsByCategory.get(categoryId) || [];
                  const selectedId = formulaModalSelections[categoryId] || "";
                  const selectedDishForCategory = selectedId
                    ? resolveFormulaDishRecord(dishById.get(String(selectedId || "").trim()))
                    : null;
                  const formulaDishConfig = selectedDishForCategory
                    ? getFormulaDishConfig(selectedDishForCategory)
                    : null;
                  const categoryDetails = getFormulaSelectionDetails(categoryId);
                  const allowMultiOptionSelection = Boolean(
                    (selectedDishForCategory as unknown as { allow_multi_select?: unknown })?.allow_multi_select
                  );
                  const selectedDishIdForDefaults = selectedDishForCategory
                    ? String(selectedDishForCategory.id || "").trim()
                    : "";
                  const formulaOptionsPanelId = `formula-options-${categoryId}`;
                  const rawDefaultOptionIdsForSelectedDish = selectedDishIdForDefaults
                    ? formulaDefaultOptionsByDishId.get(selectedDishIdForDefaults) || []
                    : [];
                  const availableOptionIdSet = new Set(
                    (formulaDishConfig?.productOptions || [])
                      .map((option: any) => String(option.id || "").trim())
                      .filter(Boolean)
                  );
                  const defaultOptionIdsForSelectedDish = rawDefaultOptionIdsForSelectedDish.filter((id: string) =>
                    availableOptionIdSet.has(String(id || "").trim())
                  );
                  return (
                    <div key={`formula-category-${categoryId}`} className="border-2 rounded-lg p-3 border-black">
                      <div className="font-black text-base mb-2">
                        {String(
                          formulaStepForCategory?.title ||
                            getCategoryLabel(category) ||
                            `Etape ${formulaStepForCategory?.step || ""}`
                        ).trim()}
                      </div>
                      {options.length === 0 ? (
                        <div className="text-sm text-gray-500">
                          {formulaNoDishesMessageByCategory.get(categoryId) || formulaUi.noDishes}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {options.map((optionDish: any) => {
                            const optionId = String(optionDish.id || "").trim();
                            if (!optionId) return null;
                            const isSelected = selectedId === optionId;
                            const optionDishResolved = resolveFormulaDishRecord(optionDish) || optionDish;
                            const optionConfig = getFormulaDishConfig(optionDishResolved);
                            const hasFormulaConfigOptions = hasFormulaConfigOptionsForDish(categoryId, optionId);
                            const isDetailsOpen = Boolean(formulaModalItemDetailsOpen[optionId]);
                            const optionDescription = getDishCleanDescription(optionDishResolved);
                            const canEditWithModal =
                              optionConfig.productOptions.length > 0 ||
                              optionConfig.hasRequiredSides ||
                              optionConfig.askCooking ||
                              optionConfig.extras.length > 0 ||
                              hasFormulaConfigOptions;
                            return (
                              <div key={`formula-option-${categoryId}-${optionId}`} className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                  <label
                                    className={`flex-1 cursor-pointer text-left px-3 py-2 rounded border-2 font-black ${
                                      isSelected ? "bg-black text-white border-black" : "bg-white text-black border-black"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        name={`formula-step-radio-${categoryId}`}
                                        checked={isSelected}
                                        onChange={() => {
                                          setFormulaModalItemDetailsOpen((prev: any) => ({
                                            ...prev,
                                            [optionId]: true,
                                          }));
                                          void openFormulaItemOptionsModal(categoryId, optionDishResolved, true);
                                        }}
                                      />
                                      {optionDishResolved.image_url ? (
                                        <img
                                          src={optionDishResolved.image_url}
                                          alt={getFormulaCompositionDishName(optionDishResolved)}
                                          className="h-9 w-9 rounded object-cover border border-black/20"
                                          onError={(event) => {
                                            event.currentTarget.style.display = "none";
                                          }}
                                        />
                                      ) : null}
                                      <span>{getFormulaCompositionDishName(optionDishResolved)}</span>
                                    </div>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormulaModalItemDetailsOpen((prev: any) => ({
                                        ...prev,
                                        [optionId]: !prev[optionId],
                                      }));
                                      if (isSelected && canEditWithModal) {
                                        void openFormulaItemOptionsModal(categoryId, optionDishResolved, false);
                                      }
                                    }}
                                    className="px-3 py-2 rounded border-2 border-black bg-white text-xs font-black text-black whitespace-nowrap"
                                  >
                                    {formulaItemDetailsLabel}
                                  </button>
                                </div>
                                {isDetailsOpen ? (
                                  <div className="text-sm text-gray-700 rounded border border-black/10 bg-white px-3 py-2 space-y-2">
                                    <div>{optionDescription || "Aucune description."}</div>
                                    <div className="text-xs text-black/80">
                                      Categorie: {getCategoryLabel(category)} | Prix carte: {getDishPrice(optionDishResolved).toFixed(2)}{"€"}
                                    </div>
                                    <div className="text-xs text-black/80">
                                      Options: {optionConfig.productOptions.length} | Accompagnements: {optionConfig.sideOptions.length} | Cuisson: {optionConfig.askCooking ? "Oui" : "Non"}
                                    </div>
                                    {isSelected ? (
                                      <div className="text-xs text-black/80">
                                        Selection actuelle:
                                        {" "}
                                        {[
                                          categoryDetails.selectedProductOptionIds.length > 0
                                            ? `options ${optionConfig.productOptions
                                                .filter((option: any) =>
                                                  categoryDetails.selectedProductOptionIds.includes(
                                                    String(option.id || "").trim()
                                                  )
                                                )
                                                .map((option: any) => String(option.name || "").trim())
                                                .filter(Boolean)
                                                .join(", ")}`
                                            : "",
                                          categoryDetails.selectedSides.length > 0
                                            ? `accompagnements ${categoryDetails.selectedSides.join(", ")}`
                                            : "",
                                          categoryDetails.selectedExtras.length > 0
                                            ? `supplements ${categoryDetails.selectedExtras
                                                .map((extra: any) => String(extra.name || "").trim())
                                                .filter(Boolean)
                                                .join(", ")}`
                                            : "",
                                          String(categoryDetails.selectedCooking || "").trim()
                                            ? `cuisson ${String(categoryDetails.selectedCooking || "").trim()}`
                                            : "",
                                        ]
                                          .filter(Boolean)
                                          .join(" | ") || "Aucune option choisie."}
                                      </div>
                                    ) : null}
                                    {isSelected && canEditWithModal ? (
                                      <button
                                        type="button"
                                        onClick={() => void openFormulaItemOptionsModal(categoryId, optionDishResolved, false)}
                                        className="h-9 px-3 border-2 border-black bg-black text-white text-xs font-black"
                                      >
                                        Modifier les options
                                      </button>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {selectedDishForCategory && formulaDishConfig ? (
                        <div id={formulaOptionsPanelId} className="mt-3 space-y-3 border-t border-black/20 pt-3">
                          {formulaDishConfig.productOptions.length > 0 ? (
                            <div>
                              <div className="text-xs font-black uppercase tracking-wide mb-2">
                                {formulaOptionsLabel}
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                {formulaDishConfig.productOptions.map((option: any) => {
                                  const optionId = String(option.id || "").trim();
                                  if (!optionId) return null;
                                  const optionPrice = parsePriceNumber(option.price);
                                  const isPaidOption = optionPrice > 0;
                                  const isDefaultOption = defaultOptionIdsForSelectedDish.includes(optionId);
                                  const isLocked = isPaidOption && !isDefaultOption;
                                  const selected = categoryDetails.selectedProductOptionIds.includes(optionId);
                                  return (
                                    <label
                                      key={`formula-option-detail-${categoryId}-${optionId}`}
                                      className={`flex items-center gap-2 text-sm font-bold ${
                                        isLocked ? "text-gray-400" : "text-black"
                                      }`}
                                    >
                                      <input
                                        type={allowMultiOptionSelection ? "checkbox" : "radio"}
                                        name={`formula-product-option-${categoryId}`}
                                        checked={selected}
                                        disabled={isLocked}
                                        onChange={(event) => {
                                          if (isLocked) return;
                                          setFormulaModalError("");
                                          setFormulaModalSelectionDetails((prev: any) => {
                                            const current = prev[categoryId] || {
                                              selectedSideIds: [],
                                              selectedSides: [],
                                              selectedCooking: "",
                                              selectedProductOptionIds: [],
                                              selectedExtras: [],
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
                                        {String(option.name || "").trim()}
                                        {optionPrice > 0 ? ` (+${optionPrice.toFixed(2)}€)` : ""}
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
                                Accompagnements ({Math.min(formulaDishConfig.maxSides, categoryDetails.selectedSides.length)}/
                                {formulaDishConfig.maxSides})
                              </div>
                              {formulaDishConfig.sideOptions.length === 0 ? (
                                <div className="text-xs font-bold text-red-600">Aucun accompagnement configurÃ©.</div>
                              ) : (
                                <div className="grid grid-cols-1 gap-2">
                                  {formulaDishConfig.sideOptions.map((sideLabel: string) => {
                                    const sideId = sideIdByAlias.get(normalizeLookupText(sideLabel)) || sideLabel;
                                    const checked = categoryDetails.selectedSideIds.includes(sideId);
                                    return (
                                      <label
                                        key={`formula-side-${categoryId}-${sideId}`}
                                        className="flex items-center gap-2 text-sm font-bold"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(event) => {
                                            setFormulaModalError("");
                                            setFormulaModalSelectionDetails((prev: any) => {
                                              const current = prev[categoryId] || {
                                                selectedSideIds: [],
                                                selectedSides: [],
                                                selectedCooking: "",
                                                selectedProductOptionIds: [],
                                                selectedExtras: [],
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
                          {formulaDishConfig.extras.length > 0 ? (
                            <div>
                              <div className="text-xs font-black uppercase tracking-wide mb-2">Supplements</div>
                              <div className="grid grid-cols-1 gap-2">
                                {formulaDishConfig.extras.map((extra: any) => {
                                  const extraKey = `${extra.name}:${parsePriceNumber(extra.price).toFixed(2)}`;
                                  const checked = categoryDetails.selectedExtras.some(
                                    (value: any) => `${value.name}:${parsePriceNumber(value.price).toFixed(2)}` === extraKey
                                  );
                                  return (
                                    <label
                                      key={`formula-extra-${categoryId}-${extraKey}`}
                                      className="flex items-center gap-2 text-sm font-bold"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(event) => {
                                          setFormulaModalError("");
                                          setFormulaModalSelectionDetails((prev: any) => {
                                            const current = prev[categoryId] || {
                                              selectedSideIds: [],
                                              selectedSides: [],
                                              selectedCooking: "",
                                              selectedProductOptionIds: [],
                                              selectedExtras: [],
                                            };
                                            const nextExtras = event.target.checked
                                              ? [...current.selectedExtras, extra]
                                              : current.selectedExtras.filter(
                                                  (value: any) =>
                                                    `${value.name}:${parsePriceNumber(value.price).toFixed(2)}` !== extraKey
                                                );
                                            return {
                                              ...prev,
                                              [categoryId]: {
                                                ...current,
                                                selectedExtras: nextExtras,
                                              },
                                            };
                                          });
                                        }}
                                      />
                                      <span>
                                        {extra.name}
                                        {parsePriceNumber(extra.price) > 0
                                          ? ` (+${parsePriceNumber(extra.price).toFixed(2)}€)`
                                          : ""}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                          {formulaDishConfig.askCooking ? (
                            <div>
                              <div className="text-xs font-black uppercase tracking-wide mb-2">Cuisson</div>
                              <div className="grid grid-cols-1 gap-2">
                                {COOKING_CHOICES.map((cookingLabel) => (
                                  <label
                                    key={`formula-cooking-${categoryId}-${cookingLabel}`}
                                    className="flex items-center gap-2 text-sm font-bold"
                                  >
                                    <input
                                      type="radio"
                                      name={`formula-cooking-${categoryId}`}
                                      checked={categoryDetails.selectedCooking === cookingLabel}
                                      onChange={() => {
                                        setFormulaModalError("");
                                        setFormulaModalSelectionDetails((prev: any) => {
                                          const current = prev[categoryId] || {
                                            selectedSideIds: [],
                                            selectedSides: [],
                                            selectedCooking: "",
                                            selectedProductOptionIds: [],
                                            selectedExtras: [],
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
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
            {formulaModalError ? <div className="mt-4 text-sm text-red-600 font-bold">{formulaModalError}</div> : null}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t-2 border-black bg-white">
            <button
              type="button"
              disabled={formulaAddDisabled}
              onClick={safeHandleAddFormulaLine}
              className="w-full h-12 bg-black text-white font-black border-2 border-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ajouter la formule
            </button>
          </div>
        </div>
      </div>
    </FormulaConfigModal>
  );
}
