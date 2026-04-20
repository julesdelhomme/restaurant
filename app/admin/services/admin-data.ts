import type { DishItem } from "../types";

export async function runFetchActiveDishesService(params: {
  restaurantScope: string | number | null;
  dishes: DishItem[];
  readBooleanFlag: (value: unknown, defaultValue?: boolean) => boolean;
  setActiveDishNames: (value: Set<string>) => void;
}): Promise<void> {
  const { restaurantScope, dishes, readBooleanFlag, setActiveDishNames } = params;
  const currentRestaurantId = String(restaurantScope ?? "").trim();
  console.log("ID utilise:", currentRestaurantId, "[admin.fetchActiveDishes]");
  if (!currentRestaurantId) {
    setActiveDishNames(new Set());
    return;
  }
  const names = new Set<string>(
    dishes
      .filter((dish) => {
        const record = dish as unknown as { restaurant_id?: unknown; active?: unknown };
        const scopedId = String(record.restaurant_id || "").trim();
        if (scopedId && scopedId !== currentRestaurantId) return false;
        if (record.active == null) return true;
        return readBooleanFlag(record.active, true);
      })
      .map((dish) => String((dish as { name?: unknown })?.name || "").trim().toLowerCase())
      .filter(Boolean)
  );
  setActiveDishNames(names);
}

export async function runFetchRestaurantSettingsService(params: {
  supabase: any;
  scopedRestaurantId: string;
  resolveClientOrderingDisabled: (settings: Record<string, unknown>) => boolean;
  resolveTotalTables: (settings: unknown) => number | null;
  applyDisableClientOrdering: (enabled: boolean) => void;
  setSettings: (value: Record<string, unknown> | null) => void;
  setTotalTables: (value: number) => void;
  setRestaurantId: (value: string | null) => void;
  setRestaurantSettingsError: (value: string) => void;
}): Promise<void> {
  const {
    supabase,
    scopedRestaurantId,
    resolveClientOrderingDisabled,
    resolveTotalTables,
    applyDisableClientOrdering,
    setSettings,
    setTotalTables,
    setRestaurantId,
    setRestaurantSettingsError,
  } = params;
  try {
    const targetRestaurantId = String(scopedRestaurantId || "").trim();
    console.log("ID utilise:", targetRestaurantId, "[admin.fetchRestaurantSettings]");
    if (!targetRestaurantId) {
      setSettings(null);
      setTotalTables(0);
      setRestaurantId(null);
      setRestaurantSettingsError("ID restaurant manquant dans l'URL.");
      return;
    }
    const restaurantByIdQuery = await supabase.from("restaurants").select("*").eq("id", targetRestaurantId).maybeSingle();
    const restaurantRow = (!restaurantByIdQuery.error && restaurantByIdQuery.data
      ? (restaurantByIdQuery.data as Record<string, unknown>)
      : null) as Record<string, unknown> | null;

    if (restaurantRow) {
      const showOrderTab = resolveClientOrderingDisabled(restaurantRow);
      const nextSettings = { ...restaurantRow };
      setSettings(nextSettings);
      setTotalTables(resolveTotalTables(restaurantRow) || 0);
      setRestaurantId(String((restaurantRow.id as string | number | undefined) || targetRestaurantId));
      setRestaurantSettingsError("");
      applyDisableClientOrdering(showOrderTab);
      console.log("RESTAURANT SETTINGS RECUPERES :", nextSettings);
    } else {
      const message =
        (restaurantByIdQuery.error as { message?: string } | null)?.message ||
        "Configuration restaurants introuvable pour cet ID.";
      console.error("Erreur fetch restaurants (admin):", message);
      setSettings(null);
      setTotalTables(0);
      setRestaurantId(targetRestaurantId || null);
      setRestaurantSettingsError(message);
    }
  } catch (error) {
    false && console.error("TRACE_SQL_TOTAL:", error);
    const message = "Impossible de contacter restaurants.";
    console.error("fetchRestaurantSettings restaurants echoue:", message);
    setSettings(null);
    setTotalTables(0);
    setRestaurantId(null);
    setRestaurantSettingsError(message);
  }
}
