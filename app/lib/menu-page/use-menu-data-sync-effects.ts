"use client";

import { useCallback, useEffect, useRef } from "react";
import { fetchPublicRestaurantConfig, parseDisplaySettingsFromRow } from "./runtime";

type UseMenuDataSyncEffectsArgs = {
  scopedRestaurantId: string;
  supabase: any;
  fetchData: () => Promise<void> | void;
  setConsultationModeClient: (value: boolean) => void;
  applyRealtimeDisplaySettingsRow: (row: unknown) => void;
};

export function useMenuDataSyncEffects({
  scopedRestaurantId,
  supabase,
  fetchData,
  setConsultationModeClient,
  applyRealtimeDisplaySettingsRow,
}: UseMenuDataSyncEffectsArgs) {
  const applyRealtimeDisplaySettingsRowRef = useRef(applyRealtimeDisplaySettingsRow);

  useEffect(() => {
    applyRealtimeDisplaySettingsRowRef.current = applyRealtimeDisplaySettingsRow;
  }, [applyRealtimeDisplaySettingsRow]);

  const fetchConsultationModeState = useCallback(async () => {
    const applyRow = (row: unknown) => {
      if (!row || typeof row !== "object") return false;
      const parsed = parseDisplaySettingsFromRow(row as any);
      setConsultationModeClient(parsed.consultationMode);
      return true;
    };

    const publicRestaurantRow = await fetchPublicRestaurantConfig(scopedRestaurantId);
    if (publicRestaurantRow && applyRow(publicRestaurantRow)) return;

    const restaurantsResult = scopedRestaurantId
      ? await supabase.from("restaurants").select("*").eq("id", scopedRestaurantId).limit(1)
      : await supabase.from("restaurants").select("*").limit(1);
    if (!restaurantsResult.error && Array.isArray(restaurantsResult.data) && applyRow(restaurantsResult.data[0])) return;
  }, [scopedRestaurantId, setConsultationModeClient, supabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, scopedRestaurantId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchConsultationModeState();
    }, 10000);
    return () => window.clearInterval(intervalId);
  }, [fetchConsultationModeState]);

  useEffect(() => {
    const refresh = () => {
      void fetchData();
    };

    const channel = supabase
      .channel("client-dishes")
      .on("postgres_changes", { event: "*", schema: "public", table: "dishes" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "subcategories" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "sides_library" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "table_assignments" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurants" }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, scopedRestaurantId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("client-display-settings")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "restaurants" }, (payload: any) => {
        applyRealtimeDisplaySettingsRowRef.current(payload.new);
      })
      .subscribe((status: unknown) => {
        console.log("Realtime client display settings:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scopedRestaurantId, supabase]);
}
