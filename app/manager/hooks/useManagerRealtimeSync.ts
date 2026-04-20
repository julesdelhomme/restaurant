// @ts-nocheck
import { useEffect } from "react";

export function useManagerRealtimeSync(deps: Record<string, any>) {
  const {
    scopedRestaurantId,
    fetchRestaurant,
    fetchCategories,
    fetchDishes,
    fetchOrders,
    fetchReviews,
    fetchTableAssignments,
    fetchCriticalStock,
    fetchSubCategories,
    fetchSidesLibrary,
    fetchAllergenLibrary,
    dishesRefetchLockTimerRef,
    isSavingRef,
    supabase,
  } = deps;

  useEffect(() => {
    fetchRestaurant();
    fetchCategories();
    fetchDishes();
    fetchOrders();
    fetchReviews();
    fetchTableAssignments();
    fetchCriticalStock();
    fetchSubCategories();
    fetchSidesLibrary();
    fetchAllergenLibrary();
  }, [scopedRestaurantId, fetchTableAssignments]);

  useEffect(() => {
    return () => {
      if (dishesRefetchLockTimerRef.current != null) {
        window.clearTimeout(dishesRefetchLockTimerRef.current);
        dishesRefetchLockTimerRef.current = null;
      }
      isSavingRef.current = false;
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("manager-stock")
      .on("postgres_changes", { event: "*", schema: "public", table: "dishes" }, () => {
        if (isSavingRef.current) return;
        fetchDishes();
        fetchCriticalStock();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => {
        fetchCategories();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "subcategories" }, () => {
        fetchSubCategories();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "table_assignments" }, () => {
        fetchTableAssignments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scopedRestaurantId, fetchTableAssignments]);
}
