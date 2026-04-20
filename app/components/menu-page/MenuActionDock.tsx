"use client";

import { PhoneCall, ShoppingCart } from "lucide-react";

type MenuActionDockProps = {
  isVitrineMode: boolean;
  hideCompactFloatingActions: boolean;
  isStickyActionsCompact: boolean;
  darkMode: boolean;
  isServerCallThrottled: boolean;
  serverCallThrottleLabel: string;
  serverCallSecondsLeft: number;
  callServerLabel: string;
  cartLabel: string;
  cartQuantity: number;
  cartBump: boolean;
  isInteractionDisabled: boolean;
  hasCartItems: boolean;
  onOpenCallModal: () => void;
  onOpenCart: () => void;
};

export function MenuActionDock({
  isVitrineMode,
  hideCompactFloatingActions,
  isStickyActionsCompact,
  darkMode,
  isServerCallThrottled,
  serverCallThrottleLabel,
  serverCallSecondsLeft,
  callServerLabel,
  cartLabel,
  cartQuantity,
  cartBump,
  isInteractionDisabled,
  hasCartItems,
  onOpenCallModal,
  onOpenCart,
}: MenuActionDockProps) {
  return (
    <>
      <div
        className={`menu-client-action-dock ${
          isVitrineMode || hideCompactFloatingActions
            ? "hidden"
            : isStickyActionsCompact
              ? "fixed top-2 left-1/2 -translate-x-1/2 w-auto max-w-max z-[80] rounded-full border-2 shadow-lg backdrop-blur-md justify-center pointer-events-none"
              : "sticky top-0 left-0 w-full z-20 menu-surface-shell border-b-4"
        } px-3 py-2 flex gap-2 ${
          darkMode
            ? isStickyActionsCompact
              ? "bg-black/60 border-[#d99a2b]"
              : "bg-black/95 border-[#d99a2b]"
            : isStickyActionsCompact
              ? "bg-white/70 border-black"
              : "bg-transparent border-black"
        }`}
        style={
          isStickyActionsCompact
            ? {
                zIndex: 80,
                backgroundColor: darkMode ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.45)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
              }
            : !darkMode
              ? { backgroundColor: "transparent", zIndex: 20 }
              : { zIndex: 20 }
        }
      >
        {!isVitrineMode ? (
          <button
            className={`${isStickyActionsCompact ? "pointer-events-auto w-12 h-12 border-4 rounded-full flex items-center justify-center p-0 shrink-0" : "flex-1 border-4 rounded-xl px-4 py-2"} font-black disabled:opacity-100 disabled:cursor-not-allowed`}
            style={{
              backgroundColor: isServerCallThrottled ? (darkMode ? "#111827" : "#D1D5DB") : darkMode ? "#000000" : "#FFFFFF",
              color: isServerCallThrottled ? (darkMode ? "#9CA3AF" : "#4B5563") : darkMode ? "#F5F5F5" : "#111111",
              borderColor: isServerCallThrottled ? (darkMode ? "#4B5563" : "#9CA3AF") : darkMode ? "#d99a2b" : "#000000",
            }}
            onClick={onOpenCallModal}
            disabled={isServerCallThrottled}
            aria-label={isServerCallThrottled ? serverCallThrottleLabel : callServerLabel}
            title={isServerCallThrottled ? serverCallThrottleLabel : callServerLabel}
          >
            {isStickyActionsCompact ? (
              isServerCallThrottled ? (
                <span className="text-[10px] leading-none text-center font-black px-1">{Math.max(1, serverCallSecondsLeft)}s</span>
              ) : (
                <PhoneCall className="h-5 w-5" />
              )
            ) : isServerCallThrottled ? (
              serverCallThrottleLabel
            ) : (
              callServerLabel
            )}
          </button>
        ) : null}
        {!isInteractionDisabled ? (
          <button
            className={`${isStickyActionsCompact ? "pointer-events-auto w-12 h-12 border-4 rounded-full p-0 flex items-center justify-center shrink-0" : "flex-1 border-4 rounded-xl px-4 py-2"} font-black disabled:opacity-50 ${
              cartBump ? "cart-bounce" : ""
            }`}
            style={{
              backgroundColor: darkMode ? "#000000" : "#FFFFFF",
              color: darkMode ? "#F5F5F5" : "#111111",
              borderColor: darkMode ? "#d99a2b" : "#000000",
            }}
            onClick={onOpenCart}
            disabled={!hasCartItems}
            aria-label={cartLabel}
            title={cartLabel}
          >
            {isStickyActionsCompact ? (
              <span className="relative inline-flex items-center justify-center">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-black text-white text-[10px] leading-5 border border-white text-center">
                  {cartQuantity}
                </span>
              </span>
            ) : (
              `${cartLabel} (${cartQuantity})`
            )}
          </button>
        ) : null}
      </div>
      {isStickyActionsCompact && !hideCompactFloatingActions ? <div aria-hidden="true" className="h-16" /> : null}
    </>
  );
}
