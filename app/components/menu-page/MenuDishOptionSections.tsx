"use client";

import { Euro } from "lucide-react";

export function DishSidesSection(props: any) {
  const {
    selectedDish,
    modalSidesOptions,
    uiText,
    getSideMaxOptions,
    isIceCreamDish,
    tt,
    selectedSides,
    setSelectedSides,
  } = props;

  if (!(selectedDish?.has_sides || modalSidesOptions.length > 0)) return null;

  return (
    <div className="mb-3">
      <span className="font-bold text-black">{uiText.sidesLabel} :</span>
      {getSideMaxOptions(selectedDish) > 1 ? (
        <div className="text-sm text-black/70 mt-1">
          {(isIceCreamDish(selectedDish) ? tt("select_sides_up_to_icecream") : tt("select_sides_up_to")).replace(
            "{max}",
            String(getSideMaxOptions(selectedDish))
          )}
        </div>
      ) : null}
      {modalSidesOptions.length > 0 ? (
        <div className="flex flex-col gap-2 mt-2">
          {modalSidesOptions.map((side: string) => {
            const maxOptions = getSideMaxOptions(selectedDish);
            const checked = selectedSides.includes(side);
            const limitReached = selectedSides.length >= maxOptions && !checked;
            if (maxOptions === 1) {
              return (
                <label key={side} className="flex items-center gap-2 text-black font-bold">
                  <input type="radio" name="side" checked={checked} onChange={() => setSelectedSides([side])} />
                  {side}
                </label>
              );
            }
            return (
              <label key={side} className={`flex items-center gap-2 font-bold ${limitReached ? "text-gray-400" : "text-black"}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={limitReached}
                  onChange={(event) => {
                    const max = Math.max(1, Number(selectedDish.max_options || 1));
                    if (event.target.checked) {
                      if (selectedSides.length >= max) {
                        alert(tt("max_options_error").replace("{max}", String(max)));
                        return;
                      }
                      setSelectedSides((prev: string[]) => [...prev, side]);
                    } else {
                      setSelectedSides((prev: string[]) => prev.filter((value) => value !== side));
                    }
                  }}
                />
                {side}
              </label>
            );
          })}
        </div>
      ) : (
        <div className="mt-2 text-sm font-bold text-red-600">{tt("no_side_configured")}</div>
      )}
    </div>
  );
}

export function DishProductOptionsSection(props: any) {
  const { modalProductOptions, selectedDish, selectedProductOptionIds, setSelectedProductOptionIds, parseAddonPrice, getProductOptionLabel, lang, optionVariantsLabel } = props;

  if (!modalProductOptions.length) return null;

  return (
    <div className="mb-3">
      <label className="font-bold text-black mb-1 block">{optionVariantsLabel} :</label>
      <div className="flex flex-col gap-2">
        {modalProductOptions.map((option: any, optionIndex: number) => {
          const optionId = String(option.id || `option-${optionIndex}`);
          const allowMultiSelect = Boolean(selectedDish?.allow_multi_select);
          const checked = selectedProductOptionIds.includes(optionId);
          const optionPrice = parseAddonPrice(option.price_override);
          const optionLabel = getProductOptionLabel(option, lang);
          return (
            <label key={optionId} className="flex items-center gap-2 text-black font-bold">
              <input
                type={allowMultiSelect ? "checkbox" : "radio"}
                name={allowMultiSelect ? undefined : "product-option"}
                checked={checked}
                onChange={(event) => {
                  if (allowMultiSelect) {
                    setSelectedProductOptionIds((prev: string[]) =>
                      event.target.checked ? [...prev, optionId] : prev.filter((id) => id !== optionId)
                    );
                    return;
                  }
                  setSelectedProductOptionIds(event.target.checked ? [optionId] : []);
                }}
              />
              <span>
                {optionLabel}
                {optionPrice > 0 ? ` (${optionPrice.toFixed(2)} €)` : null}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function DishExtrasSection(props: any) {
  const { modalExtrasOptions, uiText, parsePriceNumber, selectedExtras, setSelectedExtras, getExtraLabel, lang } = props;

  if (!modalExtrasOptions.length) return null;

  return (
    <div className="mb-3">
      <label className="font-bold text-black mb-1 block">{uiText.extrasLabel} :</label>
      <div className="flex flex-col gap-2">
        {modalExtrasOptions.map((extra: any) => {
          const extraKey = `${extra.name_fr}-${parsePriceNumber(extra.price)}`;
          const extraPriceAmount = parsePriceNumber(extra.price);
          const checked = selectedExtras.some((entry: any) => `${entry.name_fr}-${parsePriceNumber(entry.price)}` === extraKey);
          return (
            <label key={extraKey} className="flex items-center gap-2 text-black font-bold">
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => {
                  if (event.target.checked) {
                    setSelectedExtras([...selectedExtras, extra]);
                  } else {
                    setSelectedExtras(
                      selectedExtras.filter((entry: any) => `${entry.name_fr}-${parsePriceNumber(entry.price)}` !== extraKey)
                    );
                  }
                }}
              />
              {uiText.extraLabel}: {getExtraLabel(extra, lang)}
              {extraPriceAmount > 0 ? (
                <>
                  {" "}
                  (+{extraPriceAmount.toFixed(2)} <Euro size={14} className="inline-block" />)
                </>
              ) : null}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function DishCookingSection(props: any) {
  const { modalAskCooking, uiText, selectedCooking, setSelectedCooking } = props;

  if (!modalAskCooking) return null;

  return (
    <div className="mb-3">
      <label className="font-bold text-black mb-1 block">{uiText.cookingLabel} :</label>
      <div className="flex flex-col gap-2">
        {[uiText.cooking.blue, uiText.cooking.rare, uiText.cooking.medium, uiText.cooking.wellDone].map((cooking: string) => (
          <label key={cooking} className="flex items-center gap-2 text-black font-bold">
            <input type="radio" name="cooking" checked={selectedCooking === cooking} onChange={() => setSelectedCooking(cooking)} />
            {cooking}
          </label>
        ))}
      </div>
    </div>
  );
}
