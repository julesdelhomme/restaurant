import { COOKING_CHOICES } from "../utils/page-helpers";
import type { DishItem, ExtraChoice, ProductOptionChoice } from "../types";

type OptionSelectionModalProps = {
  open: boolean;
  dish: DishItem | null;
  qty: number;
  sideChoices: string[];
  selectedSides: string[];
  productOptions: ProductOptionChoice[];
  selectedProductOptionId: string;
  extraChoices: ExtraChoice[];
  selectedExtras: ExtraChoice[];
  cooking: string;
  kitchenComment: string;
  getDishName: (dish: DishItem) => string;
  getDishPrice: (dish: DishItem) => number;
  parsePriceNumber: (value: unknown) => number;
  isProductOptionSelectionRequired: (dish: DishItem, options: ProductOptionChoice[]) => boolean;
  isSideSelectionRequired: (dish: DishItem, sideChoices: string[]) => boolean;
  dishNeedsCooking: (dish: DishItem) => boolean;
  setModalOpen: (value: boolean) => void;
  setQty: (updater: (prev: number) => number) => void;
  setSelectedProductOptionId: (value: string) => void;
  setSelectedSides: (value: string[]) => void;
  setSelectedExtras: (updater: (prev: ExtraChoice[]) => ExtraChoice[]) => void;
  setCooking: (value: string | ((prev: string) => string)) => void;
  setKitchenComment: (value: string) => void;
  onSubmit: () => void;
};

export function OptionSelectionModal({
  open,
  dish,
  qty,
  sideChoices,
  selectedSides,
  productOptions,
  selectedProductOptionId,
  extraChoices,
  selectedExtras,
  cooking,
  kitchenComment,
  getDishName,
  getDishPrice,
  parsePriceNumber,
  isProductOptionSelectionRequired,
  isSideSelectionRequired,
  dishNeedsCooking,
  setModalOpen,
  setQty,
  setSelectedProductOptionId,
  setSelectedSides,
  setSelectedExtras,
  setCooking,
  setKitchenComment,
  onSubmit,
}: OptionSelectionModalProps) {
  if (!open || !dish) return null;

  const safeProductOptions = Array.isArray(productOptions) ? productOptions : [];
  const safeSideChoices = Array.isArray(sideChoices) ? sideChoices : [];
  const safeSelectedSides = Array.isArray(selectedSides) ? selectedSides : [];
  const safeExtraChoices = Array.isArray(extraChoices) ? extraChoices : [];
  const safeSelectedExtras = Array.isArray(selectedExtras) ? selectedExtras : [];
  const dishRecord = dish as unknown as Record<string, unknown>;
  const candidateDishOptionLists = [
    dishRecord.options,
    dishRecord.product_options,
    dishRecord.productOptions,
    dishRecord.dish_options,
    dishRecord.variants,
  ];
  const fallbackDishOptions: ProductOptionChoice[] = candidateDishOptionLists
    .flatMap((candidate) => (Array.isArray(candidate) ? candidate : []))
    .map((entry, index) => {
      if (typeof entry === "string") {
        const label = entry.trim();
        if (!label) return null;
        return {
          id: `dish-option-${index}-${label}`.toLowerCase().replace(/\s+/g, "-"),
          name: label,
          price: 0,
          required: false,
        } as ProductOptionChoice;
      }
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const label = String(row.name || row.name_fr || row.label || row.value || "").trim();
      if (!label) return null;
      return {
        id: String(row.id || row.value || `dish-option-${index}`).trim() || `dish-option-${index}`,
        name: label,
        price: parsePriceNumber(row.price ?? 0),
        required: Boolean(row.required),
      } as ProductOptionChoice;
    })
    .filter((entry): entry is ProductOptionChoice => Boolean(entry));
  const mergedProductOptions = [...safeProductOptions, ...fallbackDishOptions];
  const resolvedProductOptions = mergedProductOptions.filter((option, index, array) => {
    const optionId = String(option?.id || "").trim();
    if (!optionId) return false;
    return array.findIndex((candidate) => String(candidate?.id || "").trim() === optionId) === index;
  });

  const safeSetModalOpen = (value: boolean) => {
    if (typeof setModalOpen === "function") setModalOpen(value);
  };
  const safeSetQty = (updater: (prev: number) => number) => {
    if (typeof setQty === "function") setQty(updater);
  };
  const safeSetSelectedProductOptionId = (value: string) => {
    if (typeof setSelectedProductOptionId === "function") setSelectedProductOptionId(value);
  };
  const safeSetSelectedSides = (value: string[]) => {
    if (typeof setSelectedSides === "function") setSelectedSides(value);
  };
  const safeSetSelectedExtras = (updater: (prev: ExtraChoice[]) => ExtraChoice[]) => {
    if (typeof setSelectedExtras === "function") setSelectedExtras(updater);
  };
  const safeSetCooking = (value: string | ((prev: string) => string)) => {
    if (typeof setCooking === "function") setCooking(value);
  };
  const safeSetKitchenComment = (value: string) => {
    if (typeof setKitchenComment === "function") setKitchenComment(value);
  };
  const safeOnSubmit = () => {
    if (typeof onSubmit === "function") onSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg border-2 border-black bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-black">Options - {getDishName(dish)}</h3>
          <button type="button" onClick={() => safeSetModalOpen(false)} className="h-9 w-9 border-2 border-black font-black">&times;</button>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <span className="font-black">Quantit&#233;</span>
          <button type="button" onClick={() => safeSetQty((prev) => Math.max(1, prev - 1))} className="h-9 w-9 border-2 border-black font-black">-</button>
          <span className="min-w-8 text-center text-lg font-black">{qty}</span>
          <button type="button" onClick={() => safeSetQty((prev) => prev + 1)} className="h-9 w-9 border-2 border-black font-black">+</button>
        </div>

        <div className="mb-3 text-sm font-bold">
          {(() => {
            const basePrice = getDishPrice(dish);
            const selectedOption =
              resolvedProductOptions.find((option) => String(option?.id || "") === String(selectedProductOptionId)) || null;
            const optionPrice = parsePriceNumber(selectedOption?.price ?? 0);
            const extrasPrice = safeSelectedExtras.reduce((sum, extra) => sum + parsePriceNumber(extra.price), 0);
            const unitTotal = basePrice + optionPrice + extrasPrice;
            const lineTotal = unitTotal * qty;
            if (optionPrice > 0 || extrasPrice > 0) {
              return `Prix: ${basePrice.toFixed(2)}\u20AC + option ${optionPrice.toFixed(2)}\u20AC + suppl\u00E9ments ${extrasPrice.toFixed(2)}\u20AC = ${unitTotal.toFixed(2)}\u20AC (x${qty} = ${lineTotal.toFixed(2)}\u20AC)`;
            }
            return `Prix: ${unitTotal.toFixed(2)}\u20AC (x${qty} = ${lineTotal.toFixed(2)}\u20AC)`;
          })()}
        </div>

        {resolvedProductOptions.length > 0 ? (
          <div className="mb-3">
            {(() => {
              const optionRequired = isProductOptionSelectionRequired(dish, resolvedProductOptions);
              return (
                <>
                  <div className="mb-1 font-black">
                    Options / Variantes (prix 0){" "}
                    {optionRequired ? <span className="text-xs text-red-700">(Obligatoire)</span> : <span className="text-xs text-gray-500">(Facultatif)</span>}
                  </div>
                  <div className="space-y-1">
                    {!optionRequired ? (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="modal-product-option"
                          checked={!selectedProductOptionId}
                          onChange={() => safeSetSelectedProductOptionId("")}
                        />
                        <span>Aucune option</span>
                      </label>
                    ) : null}
                    {resolvedProductOptions.map((option) => {
                      const checked = String(selectedProductOptionId) === String(option.id);
                      const optionPrice = parsePriceNumber(option.price);
                      return (
                        <label key={option.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="modal-product-option"
                            checked={checked}
                            onChange={() => safeSetSelectedProductOptionId(String(option.id))}
                          />
                          <span>
                            {option.name}
                            {optionPrice > 0 ? ` (+${optionPrice.toFixed(2)}\u20AC)` : ""}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        ) : null}

        {safeSideChoices.length > 0 ? (
          <div className="mb-3">
            {(() => {
              const sideRequired = isSideSelectionRequired(dish, safeSideChoices);
              const selectedSide = safeSelectedSides[0] || "";
              return (
                <>
                  <div className="mb-1 font-black">
                    Accompagnements{" "}
                    {sideRequired ? (
                      <span className="text-xs text-red-700">(Obligatoire)</span>
                    ) : (
                      <span className="text-xs text-gray-500">(Facultatif)</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {!sideRequired ? (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="modal-side-option"
                          checked={!selectedSide}
                          onChange={() => safeSetSelectedSides([])}
                        />
                        <span>Aucun accompagnement</span>
                      </label>
                    ) : null}
                    {safeSideChoices.map((side) => {
                      const checked = selectedSide === side;
                      return (
                        <label key={side} className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="modal-side-option"
                            checked={checked}
                            onChange={() => safeSetSelectedSides([side])}
                          />
                          <span>{side}</span>
                        </label>
                      );
                    })}
                  </div>
                  {!sideRequired ? (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => safeSetSelectedSides([])}
                        className="border-2 border-black bg-gray-100 px-3 py-2 text-sm font-bold text-black"
                      >R&#233;initialiser</button>
                    </div>
                  ) : null}
                </>
              );
            })()}
          </div>
        ) : null}

        {safeExtraChoices.length > 0 ? (
          <div className="mb-3">
            <div className="mb-1 font-black">Supplements (options payantes incluses)</div>
            <div className="space-y-1">
              {safeExtraChoices.map((extra) => {
                const key = `${extra.name}-${extra.price}`;
                const checked = safeSelectedExtras.some((value) => `${value.name}-${value.price}` === key);
                return (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        if (event.target.checked) {
                          safeSetSelectedExtras((prev) => [...(Array.isArray(prev) ? prev : []), extra]);
                        } else {
                          safeSetSelectedExtras((prev) =>
                            (Array.isArray(prev) ? prev : []).filter((value) => `${value.name}-${value.price}` !== key)
                          );
                        }
                      }}
                    />
                    <span>
                      {extra.name}
                      {parsePriceNumber(extra.price) > 0 ? ` (+${parsePriceNumber(extra.price).toFixed(2)}\u20AC)` : ""}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mb-3">
          {dishNeedsCooking(dish) ? (
            <>
              <label className="mb-1 block font-black">Cuisson</label>
              <div className="mb-2 grid grid-cols-2 gap-2">
                {COOKING_CHOICES.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => safeSetCooking((prev) => (prev === choice ? "" : choice))}
                    className={`border-2 border-black px-2 py-2 text-sm font-bold ${
                      cooking === choice ? "bg-black text-white" : "bg-white text-black"
                    }`}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <label className="mb-1 block font-black">Commentaire cuisine</label>
          <textarea
            value={kitchenComment}
            onChange={(event) => safeSetKitchenComment(event.target.value)}
            placeholder="Ex: sans oignons"
            className="w-full border-2 border-black px-3 py-2"
            rows={3}
          />
        </div>

        <button type="button" onClick={safeOnSubmit} className="h-12 w-full border-2 border-black bg-black font-black text-white">
          Ajouter avec options
        </button>
      </div>
    </div>
  );
}

