// @ts-nocheck
import { useEffect } from "react";

export function useManagerLocalEffects(deps: Record<string, any>) {
  const {
    subCategories,
    setSubCategories,
    orders,
    dishes,
    calculateStats,
    showDishModal,
    forceFirstLoginPasswordChange,
    restaurant,
    setForceFirstLoginPasswordChange,
    toBoolean,
    categories,
    formData,
    setFormData,
    fetchSubCategories,
  } = deps;

  useEffect(() => {
    try {
      const raw = localStorage.getItem("menuqr_subcategories");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setSubCategories(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("menuqr_subcategories", JSON.stringify(subCategories));
    } catch {
      // ignore
    }
  }, [subCategories]);

  useEffect(() => {
    if (orders.length > 0 || dishes.length > 0) calculateStats(orders);
  }, [orders, dishes]);

  useEffect(() => {
    if (showDishModal || forceFirstLoginPasswordChange) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    return undefined;
  }, [showDishModal, forceFirstLoginPasswordChange]);

  useEffect(() => {
    if (!restaurant) return;
    setForceFirstLoginPasswordChange(toBoolean((restaurant as any).first_login, false));
  }, [restaurant]);

  useEffect(() => {
    if (categories.length > 0) {
      if (!formData.category_id) {
        setFormData((prev) => ({ ...prev, category_id: String(categories[0].id) }));
      }
      fetchSubCategories();
    }
  }, [categories]);
}
