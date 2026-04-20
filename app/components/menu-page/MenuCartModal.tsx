"use client";

import type React from "react";
import { CheckCircle2, Euro, XCircle } from "lucide-react";
import type { CartItem } from "../../lib/menu-page/runtime";

type MenuCartModalProps = {
  show: boolean;
  isInteractionDisabled: boolean;
  closeLabel: string;
  cartLabel: string;
  emptyCartLabel: string;
  totalLabel: string;
  orderLabel: string;
  orderSuccess: boolean;
  orderSuccessLabel: string;
  formulaLabel: string;
  detailsLabel: string;
  detailsNoneLabel: string;
  cart: CartItem[];
  lang: string;
  tableNumber: string;
  isSubmittingOrder: boolean;
  hasAlcoholInCart: boolean;
  alcoholWarningText: string;
  parsePriceNumber: (value: unknown) => number;
  isFormulaCartItem: (item: CartItem) => boolean;
  getCartItemUnitPrice: (item: CartItem) => number;
  getDishName: (dish: CartItem["dish"], lang: string) => string;
  getDescription: (dish: CartItem["dish"], lang: string) => string;
  buildInstructionText: (...args: unknown[]) => string;
  uiText: unknown;
  removeFromCart: (index: number) => void;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onClose: () => void;
  onSubmitOrder: () => void;
};

export function MenuCartModal({
  show,
  isInteractionDisabled,
  closeLabel,
  cartLabel,
  emptyCartLabel,
  totalLabel,
  orderLabel,
  orderSuccess,
  orderSuccessLabel,
  formulaLabel,
  detailsLabel,
  detailsNoneLabel,
  cart,
  lang,
  tableNumber,
  isSubmittingOrder,
  hasAlcoholInCart,
  alcoholWarningText,
  parsePriceNumber,
  isFormulaCartItem,
  getCartItemUnitPrice,
  getDishName,
  getDescription,
  buildInstructionText,
  uiText,
  removeFromCart,
  setCart,
  onClose,
  onSubmitOrder,
}: MenuCartModalProps) {
  if (!show || isInteractionDisabled) return null;

  const totalAmount = cart
    .reduce((sum, item) => {
      const extrasPrice = (item.selectedExtras || []).reduce((acc, extra) => acc + parsePriceNumber(extra.price), 0);
      const payableExtrasPrice = isFormulaCartItem(item) ? 0 : extrasPrice;
      return sum + (getCartItemUnitPrice(item) + payableExtrasPrice) * item.quantity;
    }, 0)
    .toFixed(2);

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      <div className="w-full h-[100dvh] min-h-[100dvh] bg-white flex flex-col">
        <div className="p-4 border-b-4 border-black relative shrink-0">
          <button
            type="button"
            aria-label={closeLabel}
            title={closeLabel}
            className="absolute top-4 right-4 w-10 h-10 bg-white text-black rounded-full font-bold flex items-center justify-center border-4 border-black"
            onClick={onClose}
          >
            <XCircle size={20} className="text-red-500" />
          </button>
          <h2 className="text-2xl font-black text-black text-center">{cartLabel}</h2>
        </div>
        <div className="flex-1 min-h-0 px-4 py-4 flex flex-col">
          {orderSuccess ? (
            <div className="flex-1 flex items-center justify-center text-center">
              <div className="bg-white border-4 border-black rounded-2xl px-6 py-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-black max-w-xs w-full">
                <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-green-200 border-4 border-black flex items-center justify-center text-2xl">
                  <CheckCircle2 size={24} className="text-green-700" />
                </div>
                <div className="text-lg font-black">{orderSuccessLabel}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar" style={{ WebkitOverflowScrolling: "touch" }}>
                {cart.length === 0 ? (
                  <div className="text-black text-center py-4">{emptyCartLabel}</div>
                ) : (
                  <div className="flex flex-col gap-4 mb-4">
                    {cart.map((item, idx) => {
                      const instructions = buildInstructionText(
                        lang,
                        item.selectedSides || [],
                        item.selectedExtras,
                        item.selectedProductOptions,
                        item.selectedProductOption,
                        item.selectedCooking,
                        item.specialRequest,
                        uiText
                      );
                      const extrasPrice = (item.selectedExtras || []).reduce(
                        (sum, extra) => sum + parsePriceNumber(extra.price),
                        0
                      );
                      const payableExtrasPrice = isFormulaCartItem(item) ? 0 : extrasPrice;
                      const itemUnitPrice = getCartItemUnitPrice(item);

                      return (
                        <div key={idx} className="bg-white border-2 border-black rounded-xl p-4 flex flex-col text-black">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-bold">{getDishName(item.dish, lang)}</h3>
                            <button onClick={() => removeFromCart(idx)} className="text-red-500 hover:text-red-700 transition-colors">
                              <XCircle size={18} className="text-red-500" />
                            </button>
                          </div>
                          <p className="text-sm mb-2">{getDescription(item.dish, lang)}</p>
                          {item.formulaSelections && item.formulaSelections.length > 0 ? (
                            <div className="text-sm text-black/80 mb-2">
                              <div className="font-bold">{formulaLabel}</div>
                              <div className="mt-1 space-y-1">
                                {item.formulaSelections.map((selection, selectionIndex) => (
                                  <div key={`${selection.categoryId}-${selection.dishId}-${selectionIndex}`}>
                                    {selection.categoryLabel ? `${selection.categoryLabel} : ${selection.dishName}` : selection.dishName}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          <p className="text-sm font-bold text-black">
                            {instructions || `${detailsLabel}: ${detailsNoneLabel}`}
                          </p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xl font-black inline-flex items-center gap-1">
                              {(itemUnitPrice + payableExtrasPrice).toFixed(2)}
                              <Euro size={16} />
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  if (item.quantity > 1) {
                                    setCart((prev) => prev.map((c, i) => (i === idx ? { ...c, quantity: c.quantity - 1 } : c)));
                                  } else {
                                    removeFromCart(idx);
                                  }
                                }}
                                className="px-3 py-1 border-2 border-black rounded bg-white text-black font-black"
                              >
                                -
                              </button>
                              <span className="font-black text-lg text-black">{item.quantity}</span>
                              <button
                                onClick={() => setCart((prev) => prev.map((c, i) => (i === idx ? { ...c, quantity: c.quantity + 1 } : c)))}
                                className="px-3 py-1 border-2 border-black rounded bg-white text-black font-black"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="mt-auto sticky bottom-0 bg-white pt-4 pb-2 shadow-[0_-10px_20px_rgba(255,255,255,0.8)]">
                <div className="flex justify-between font-bold text-black mb-3 px-4">
                  <span>{totalLabel}:</span>
                  <span>
                    {totalAmount} <Euro size={16} className="inline-block align-text-bottom" />
                  </span>
                </div>
                {hasAlcoholInCart ? <div className="px-4 pb-2 text-[11px] font-semibold text-black/75">{alcoholWarningText}</div> : null}
                <div className="px-4 pb-2">
                  <button
                    className="w-full py-3 bg-black text-white rounded-xl font-black border-4 border-black disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={onSubmitOrder}
                    disabled={!tableNumber || isSubmittingOrder}
                  >
                    {isSubmittingOrder ? "Envoi..." : orderLabel}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
