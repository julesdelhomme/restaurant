"use client";

import { useEffect } from "react";

type UseMenuUiEffectsArgs = {
  categoryTabsRef: { current: HTMLElement | null };
  setIsCategoryTabsOutOfView: (value: boolean) => void;
  setDarkMode: (value: boolean) => void;
  darkMode: boolean;
  setTimeTick: (updater: (prev: number) => number) => void;
  isCartOpen: boolean;
  formulaDish: unknown;
  legalFooterModal: unknown;
  isInteractionDisabled: boolean;
  setIsCartOpen: (value: boolean) => void;
  setOrderSuccess: (value: boolean) => void;
  setFormulaDish: (value: any) => void;
  setFormulaSourceDish: (value: any) => void;
  setFormulaSelections: (value: Record<string, string>) => void;
  setFormulaSelectionDetails: (value: Record<string, any>) => void;
  setFormulaSelectionError: (value: string) => void;
  setFormulaItemDetailsOpen: (value: Record<string, boolean>) => void;
  categoryDrawerEnabled: boolean;
  setIsCategoryDrawerOpen: (value: boolean) => void;
  isVitrineMode: boolean;
  restaurant: unknown;
  scopedRestaurantId: string;
  vitrineViewTrackedRef: { current: Record<string, boolean> };
  enabledLanguagesClient: string[];
  lang: string;
  setLang: (value: string) => void;
  tableNumber: string;
  setOrderValidationCodeInput: (value: string) => void;
};

export function useMenuUiEffects({
  categoryTabsRef,
  setIsCategoryTabsOutOfView,
  setDarkMode,
  darkMode,
  setTimeTick,
  isCartOpen,
  formulaDish,
  legalFooterModal,
  isInteractionDisabled,
  setIsCartOpen,
  setOrderSuccess,
  setFormulaDish,
  setFormulaSourceDish,
  setFormulaSelections,
  setFormulaSelectionDetails,
  setFormulaSelectionError,
  setFormulaItemDetailsOpen,
  categoryDrawerEnabled,
  setIsCategoryDrawerOpen,
  isVitrineMode,
  restaurant,
  scopedRestaurantId,
  vitrineViewTrackedRef,
  enabledLanguagesClient,
  lang,
  setLang,
  tableNumber,
  setOrderValidationCodeInput,
}: UseMenuUiEffectsArgs) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateCategoryTabsVisibility = () => {
      const rect = categoryTabsRef.current?.getBoundingClientRect();
      if (!rect) {
        setIsCategoryTabsOutOfView(false);
        return;
      }
      setIsCategoryTabsOutOfView(rect.bottom <= 0);
    };
    updateCategoryTabsVisibility();
    window.addEventListener("scroll", updateCategoryTabsVisibility, { passive: true });
    window.addEventListener("resize", updateCategoryTabsVisibility);
    return () => {
      window.removeEventListener("scroll", updateCategoryTabsVisibility);
      window.removeEventListener("resize", updateCategoryTabsVisibility);
    };
  }, [categoryTabsRef, setIsCategoryTabsOutOfView]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("menuqr-client-theme");
    if (stored === "dark" || stored === "light") {
      setDarkMode(stored === "dark");
      return;
    }
    setDarkMode(false);
  }, [setDarkMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("menuqr-client-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeTick((prev) => prev + 1);
    }, 60000);
    return () => window.clearInterval(timer);
  }, [setTimeTick]);

  useEffect(() => {
    if (isCartOpen || formulaDish || legalFooterModal) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
    return undefined;
  }, [isCartOpen, formulaDish, legalFooterModal]);

  useEffect(() => {
    if (isInteractionDisabled && isCartOpen) {
      setIsCartOpen(false);
      setOrderSuccess(false);
    }
    if (isInteractionDisabled && formulaDish) {
      setFormulaDish(null);
      setFormulaSourceDish(null);
      setFormulaSelections({});
      setFormulaSelectionDetails({});
      setFormulaSelectionError("");
      setFormulaItemDetailsOpen({});
    }
  }, [
    formulaDish,
    isCartOpen,
    isInteractionDisabled,
    setFormulaDish,
    setFormulaItemDetailsOpen,
    setFormulaSelectionDetails,
    setFormulaSelectionError,
    setFormulaSelections,
    setFormulaSourceDish,
    setIsCartOpen,
    setOrderSuccess,
  ]);

  useEffect(() => {
    if (!categoryDrawerEnabled) {
      setIsCategoryDrawerOpen(false);
    }
  }, [categoryDrawerEnabled, setIsCategoryDrawerOpen]);

  useEffect(() => {
    if (!isVitrineMode) return;
    const targetRestaurantId = String((restaurant as any | null)?.id || scopedRestaurantId || "").trim();
    if (!targetRestaurantId) return;
    if (vitrineViewTrackedRef.current[targetRestaurantId]) return;
    vitrineViewTrackedRef.current[targetRestaurantId] = true;
    void fetch("/api/public/vitrine-view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ restaurant_id: targetRestaurantId }),
      cache: "no-store",
    }).catch(() => null);
  }, [isVitrineMode, restaurant, scopedRestaurantId, vitrineViewTrackedRef]);

  useEffect(() => {
    if (!enabledLanguagesClient.includes(lang)) {
      setLang("fr");
    }
  }, [enabledLanguagesClient, lang, setLang]);

  useEffect(() => {
    setOrderValidationCodeInput("");
  }, [tableNumber, setOrderValidationCodeInput]);
}
