import { useCallback, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export function useManagerFetch(dataStore: any) {
  const {
    scopedRestaurantId,
    setCategories,
    setSubCategories,
    setSidesLibrary,
    setDishes,
    setOrders,
    setRestaurant,
    setRestaurantForm,
    setIsRestaurantLoading,
  } = dataStore;

  const fetchRestaurant = useCallback(async () => {
    if (!scopedRestaurantId) return null;

    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", scopedRestaurantId)
      .maybeSingle();

    if (!error && data) {
      setRestaurant?.(data);
      setRestaurantForm?.((prev: any) => ({
        ...(prev || {}),
        ...data,
        name: String(data.name || prev?.name || ""),
      }));
      return data;
    }

    return null;
  }, [scopedRestaurantId, setRestaurant, setRestaurantForm]);

  const fetchDishes = useCallback(async () => {
    if (!scopedRestaurantId) return [];

    const { data, error } = await supabase
      .from("dishes")
      .select("*")
      .eq("restaurant_id", scopedRestaurantId)
      .order("id", { ascending: true });

    if (!error) {
      const next = data || [];
      setDishes?.(next);
      return next;
    }

    return [];
  }, [scopedRestaurantId, setDishes]);

  const fetchOrders = useCallback(async () => {
    if (!scopedRestaurantId) return [];

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", scopedRestaurantId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!error) {
      const next = data || [];
      setOrders?.(next);
      return next;
    }

    return [];
  }, [scopedRestaurantId, setOrders]);

  const fetchCategories = useCallback(async () => {
    if (!scopedRestaurantId) return [];

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", scopedRestaurantId)
      .order("sort_order", { ascending: true });

    if (!error) {
      const next = data || [];
      setCategories?.(next);
      return next;
    }

    return [];
  }, [scopedRestaurantId, setCategories]);

  const fetchSubCategories = useCallback(async () => {
    if (!scopedRestaurantId) return [];

    const { data, error } = await supabase
      .from("subcategories")
      .select("*")
      .eq("restaurant_id", scopedRestaurantId)
      .order("category_id", { ascending: true });

    if (!error) {
      const next = data || [];
      setSubCategories?.(next);
      return next;
    }

    return [];
  }, [scopedRestaurantId, setSubCategories]);

  const fetchSidesLibrary = useCallback(async () => {
    if (!scopedRestaurantId) return [];

    const { data, error } = await supabase
      .from("sides_library")
      .select("*")
      .eq("restaurant_id", scopedRestaurantId)
      .order("id", { ascending: true });

    if (!error) {
      const next = data || [];
      setSidesLibrary?.(next);
      return next;
    }

    return [];
  }, [scopedRestaurantId, setSidesLibrary]);

  useEffect(() => {
    if (!scopedRestaurantId) return;

    let mounted = true;
    setIsRestaurantLoading?.(true);

    Promise.all([
      fetchRestaurant(),
      fetchDishes(),
      fetchOrders(),
      fetchCategories(),
      fetchSubCategories(),
      fetchSidesLibrary(),
    ]).finally(() => {
      if (mounted) setIsRestaurantLoading?.(false);
    });

    return () => {
      mounted = false;
    };
  }, [
    scopedRestaurantId,
    fetchRestaurant,
    fetchDishes,
    fetchOrders,
    fetchCategories,
    fetchSubCategories,
    fetchSidesLibrary,
    setIsRestaurantLoading,
  ]);

  return {
    fetchRestaurant,
    fetchDishes,
    fetchOrders,
    fetchCategories,
    fetchSubCategories,
    fetchSidesLibrary,
  };
}
