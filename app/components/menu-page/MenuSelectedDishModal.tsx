"use client";

import { Euro, XCircle } from "lucide-react";
import {
  DishCookingSection,
  DishExtrasSection,
  DishProductOptionsSection,
  DishSidesSection,
} from "./MenuDishOptionSections";

export function MenuSelectedDishModal(props: any) {
  const {
    selectedDish,
    darkMode,
    uiText,
    setSelectedDish,
    setModalProductOptions,
    setSelectedProductOptionIds,
    setRecommendationSourceDishId,
    getDishName,
    lang,
    hideBrokenImage,
    selectedDishLinkedFormulas,
    getDescription,
    dishContainsAlcohol,
    getAlcoholWarningText,
    normalizedLang,
    selectedFormulaButtonDish,
    availableInFormulaLabel,
    isInteractionDisabled,
    openFormulaModal,
    viewFormulaLabel,
    getFormulaPackPrice,
    getHungerLevel,
    showCaloriesClient,
    getCaloriesLabel,
    kcalLabel,
    getVisibleDishAllergenLabels,
    consultationModeBannerText,
    modalSidesOptions,
    getSideMaxOptions,
    isIceCreamDish,
    tt,
    selectedSides,
    setSelectedSides,
    modalProductOptions,
    selectedProductOptionIds,
    setSelectedProductOptionIds: setSelectedProductOptionIdsInner,
    parseAddonPrice,
    getProductOptionLabel,
    optionVariantsLabel,
    modalExtrasOptions,
    parsePriceNumber,
    selectedExtras,
    setSelectedExtras,
    getExtraLabel,
    modalAskCooking,
    selectedCooking,
    setSelectedCooking,
    dishModalQuantity,
    setDishModalQuantity,
    isRtl,
    specialRequest,
    setSpecialRequest,
    itemTotalLabel,
    modalTotalPrice,
    sideError,
    modalInstructionPreview,
    sideIdByAlias,
    normalizeLookupText,
    modalSelectedProductOptions,
    modalSelectedProductOption,
    recommendationSourceDishId,
    addToCart,
    setSideError,
  } = props;

  if (!selectedDish) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[130] flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className={`${darkMode ? "bg-black border-[#d99a2b] text-[#F5F5F5]" : "bg-white border-black"} border-4 rounded-t-2xl sm:rounded-xl w-full max-w-md h-[100dvh] sm:h-auto sm:max-h-[92vh] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative flex flex-col overflow-hidden`}>
        <button
          type="button"
          aria-label={uiText.close}
          title={uiText.close}
          onClick={() => {
            setSelectedDish(null);
            setModalProductOptions([]);
            setSelectedProductOptionIds([]);
            setRecommendationSourceDishId("");
          }}
          className={`absolute top-3 right-3 w-10 h-10 rounded-full font-bold flex items-center justify-center border-4 ${
            darkMode ? "bg-black text-[#F5F5F5] border-[#d99a2b]" : "bg-white text-black border-black"
          }`}
        >
          <XCircle size={18} className={darkMode ? "text-red-300" : "text-red-500"} />
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-14 sm:px-6 sm:pb-6">
          {selectedDish.image_url ? (
            <img
              src={selectedDish.image_url}
              alt={getDishName(selectedDish, lang)}
              className="w-full aspect-[4/3] object-cover rounded-xl mb-4"
              onError={hideBrokenImage}
            />
          ) : null}
          <h2 className="text-2xl font-black text-black mb-2">{getDishName(selectedDish, lang)}</h2>
          {(() => {
            const selectedFormulaDisplay = selectedDishLinkedFormulas[0] || null;
            const displayDish = selectedFormulaDisplay
              ? {
                  ...selectedDish,
                  description: (selectedFormulaDisplay as any).description || selectedDish.description,
                  description_fr: (selectedFormulaDisplay as any).description || selectedDish.description_fr,
                }
              : selectedDish;
            return <p className="text-black mb-2">{getDescription(displayDish, lang)}</p>;
          })()}
          {dishContainsAlcohol(selectedDish) ? (
            <p className="text-[11px] font-semibold text-black/75 mb-2">{getAlcoholWarningText(normalizedLang)}</p>
          ) : null}
          {selectedFormulaButtonDish ? (
            <div className="mb-3 rounded-lg border-2 border-black bg-amber-50 p-3">
              <div className="text-sm font-black text-black mb-1">{availableInFormulaLabel}</div>
              {selectedFormulaButtonDish && !isInteractionDisabled ? (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedFormulaButtonDish === selectedDish) {
                      openFormulaModal(selectedFormulaButtonDish, null);
                      return;
                    }
                    openFormulaModal(selectedFormulaButtonDish, selectedDish);
                  }}
                  className="w-full mb-2 px-3 py-3 rounded-lg border-2 border-black bg-black text-white font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  {viewFormulaLabel} ({getFormulaPackPrice(selectedFormulaButtonDish).toFixed(2)} &euro;)
                </button>
              ) : null}
            </div>
          ) : null}
          {(() => {
            const selectedFormulaDisplay = selectedDishLinkedFormulas[0] || null;
            const displayDish = selectedFormulaDisplay
              ? {
                  ...selectedDish,
                  calories: (selectedFormulaDisplay as any).calories || selectedDish.calories,
                  calories_min: (selectedFormulaDisplay as any).calories_min || selectedDish.calories_min,
                }
              : selectedDish;
            return (
              (getHungerLevel(displayDish, lang) || (showCaloriesClient && getCaloriesLabel(displayDish, kcalLabel))) && (
                <div className="flex flex-wrap gap-3 text-xs font-bold text-black mb-3">
                  {getHungerLevel(displayDish, lang) ? (
                    <span className="inline-flex items-center gap-1 bg-gray-100 border border-gray-300 rounded-full px-2 py-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                      {getHungerLevel(displayDish, lang)}
                    </span>
                  ) : null}
                  {showCaloriesClient && getCaloriesLabel(displayDish, kcalLabel) ? (
                    <span className="inline-flex items-center gap-1 bg-gray-100 border border-gray-300 rounded-full px-2 py-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
                      {getCaloriesLabel(displayDish, kcalLabel)}
                    </span>
                  ) : null}
                </div>
              )
            );
          })()}
          {getVisibleDishAllergenLabels(selectedDish).length > 0 ? (
            <div className="mb-3">
              <label className="font-bold text-black mb-1 block">{uiText.allergensLabel} :</label>
              <div className="flex flex-wrap gap-2">
                {getVisibleDishAllergenLabels(selectedDish).map((value: string, index: number) => (
                  <span
                    key={`${value}-${index}`}
                    className={`px-2 py-1 rounded font-bold text-xs border-2 ${
                      darkMode ? "bg-transparent border-yellow-400 text-yellow-300" : "bg-yellow-200 border-black text-black"
                    }`}
                  >
                    {value}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {isInteractionDisabled ? (
            <div className="mb-3 rounded-lg border-2 border-black bg-gray-100 px-3 py-2 text-sm font-bold text-black">
              {consultationModeBannerText}
            </div>
          ) : null}

          <DishSidesSection
            selectedDish={selectedDish}
            modalSidesOptions={modalSidesOptions}
            uiText={uiText}
            getSideMaxOptions={getSideMaxOptions}
            isIceCreamDish={isIceCreamDish}
            tt={tt}
            selectedSides={selectedSides}
            setSelectedSides={setSelectedSides}
          />
          <DishProductOptionsSection
            modalProductOptions={modalProductOptions}
            selectedDish={selectedDish}
            selectedProductOptionIds={selectedProductOptionIds}
            setSelectedProductOptionIds={setSelectedProductOptionIdsInner}
            parseAddonPrice={parseAddonPrice}
            getProductOptionLabel={getProductOptionLabel}
            lang={lang}
            optionVariantsLabel={optionVariantsLabel}
          />
          <DishExtrasSection
            modalExtrasOptions={modalExtrasOptions}
            uiText={uiText}
            parsePriceNumber={parsePriceNumber}
            selectedExtras={selectedExtras}
            setSelectedExtras={setSelectedExtras}
            getExtraLabel={getExtraLabel}
            lang={lang}
          />
          <DishCookingSection
            modalAskCooking={modalAskCooking}
            uiText={uiText}
            selectedCooking={selectedCooking}
            setSelectedCooking={setSelectedCooking}
          />

          {!isInteractionDisabled ? (
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-black">{uiText.quantity}:</span>
              <button onClick={() => setDishModalQuantity((q: number) => Math.max(1, q - 1))} className="px-3 py-1 border-2 border-black rounded bg-white text-black font-black">-</button>
              <span className="font-black text-lg text-black">{dishModalQuantity}</span>
              <button onClick={() => setDishModalQuantity((q: number) => q + 1)} className="px-3 py-1 border-2 border-black rounded bg-white text-black font-black">+</button>
            </div>
          ) : null}

          {!isInteractionDisabled ? (
            <>
              <div className="mb-3">
                <label className="font-bold text-black mb-1 block">{uiText.specialRequestLabel} :</label>
                <textarea
                  value={specialRequest}
                  onChange={(event) => setSpecialRequest(event.target.value)}
                  dir={isRtl ? "rtl" : "ltr"}
                  className={`w-full px-3 py-2 bg-white text-black border border-gray-300 ${isRtl ? "text-right" : "text-left"}`}
                  style={{ textAlign: isRtl ? "right" : "left" }}
                  rows={2}
                  placeholder={uiText.specialRequestPlaceholder}
                />
              </div>
              <div className="text-sm font-bold text-black mb-2">{itemTotalLabel}: {modalTotalPrice.toFixed(2)}&euro;</div>
              {sideError ? <div className="text-sm font-bold text-red-600 mb-2">{sideError}</div> : null}
              {modalInstructionPreview ? <div className="text-sm font-bold text-black mb-2">{modalInstructionPreview}</div> : null}
            </>
          ) : null}
        </div>
        {!isInteractionDisabled ? (
          <div className={`shrink-0 border-t-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] ${darkMode ? "border-[#d99a2b] bg-black" : "border-black bg-white"}`}>
            <button
              disabled={(((!!selectedDish?.has_sides) || modalSidesOptions.length > 0) && selectedSides.length === 0) || (modalAskCooking && !selectedCooking)}
              className={`w-full py-3 rounded-xl font-black border-4 disabled:opacity-50 disabled:cursor-not-allowed ${
                darkMode ? "bg-[#d99a2b] text-black border-[#d99a2b]" : "bg-black text-white border-black"
              }`}
              onClick={() => {
                if ((selectedDish.has_sides || modalSidesOptions.length > 0) && selectedSides.length === 0) {
                  setSideError(tt("side_required_error"));
                  return;
                }
                if (modalAskCooking && !selectedCooking) {
                  setSideError(tt("cooking_required_error"));
                  return;
                }

                addToCart({
                  dish: selectedDish,
                  quantity: dishModalQuantity,
                  selectedSides,
                  selectedSideIds: selectedSides.map((sideLabel: string) => sideIdByAlias.get(normalizeLookupText(sideLabel)) || "").filter(Boolean),
                  selectedExtras,
                  selectedProductOptions: modalSelectedProductOptions,
                  selectedProductOption: modalSelectedProductOption,
                  selectedCooking,
                  specialRequest,
                  fromRecommendation: String(selectedDish.id || "") === recommendationSourceDishId,
                });
                setSelectedDish(null);
                setModalProductOptions([]);
                setSelectedProductOptionIds([]);
                setRecommendationSourceDishId("");
                setSideError("");
              }}
            >
              {uiText.addToCart} ({modalTotalPrice.toFixed(2)}&euro;)
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
