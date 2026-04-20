// @ts-nocheck
import { useCallback } from "react";

export function useManagerTableAssignments(deps: Record<string, any>) {
  const { scopedRestaurantId, supabase, setTableAssignments } = deps;

  const fetchTableAssignments = useCallback(async () => {
    if (!scopedRestaurantId) {
      setTableAssignments([]);
      return;
    }

    console.log("ID utilisé:", scopedRestaurantId, "[manager.fetchTableAssignments]");

    let primaryQuery = await supabase
      .from("table_assignments")
      .select("table_number,pin_code")
      .eq("restaurant_id", scopedRestaurantId)
      .order("table_number", { ascending: true });

    if (primaryQuery.error && String((primaryQuery.error as { code?: string })?.code || "") === "42703") {
      primaryQuery = await supabase
        .from("table_assignments")
        .select("table_number,pin_code")
        .eq("restaurant_id", scopedRestaurantId)
        .order("table_number", { ascending: true });
    }

    if (!primaryQuery.error) {
      setTableAssignments((primaryQuery.data || []) as TableAssignment[]);
      return;
    }

    let fallbackQuery = await supabase
      .from("table_assignments")
      .select("table_number,pin")
      .eq("restaurant_id", scopedRestaurantId)
      .order("table_number", { ascending: true });

    if (fallbackQuery.error && String((fallbackQuery.error as { code?: string })?.code || "") === "42703") {
      fallbackQuery = await supabase
        .from("table_assignments")
        .select("table_number,pin")
        .eq("restaurant_id", scopedRestaurantId)
        .order("table_number", { ascending: true });
    }

    if (fallbackQuery.error) {
      console.error("Erreur fetch table_assignments (scope restaurant):", primaryQuery.error, fallbackQuery.error);
      setTableAssignments([]);
      return;
    }

    const normalized = ((fallbackQuery.data || []) as Array<Record<string, unknown>>).map((row) => ({
      table_number: row.table_number as string | number | null,
      pin_code: row.pin as string | null,
    }));
    setTableAssignments(normalized as TableAssignment[]);
  }, [scopedRestaurantId]);

  return { fetchTableAssignments };
}
