import { useCallback, useMemo } from "react";
import type { Restaurant } from "../types";

export function useManagerCardDesigner(deps: Record<string, any>) {
  const {
    parseObjectRecord,
    restaurant,
    isSavingRef,
    lastSaveTimeRef,
    dishesRefetchLockUntilRef,
    scopedRestaurantId,
    dishesRefetchLockTimerRef,
    setDishes,
    setRestaurant,
    setRestaurantForm,
    dishes,
  } = deps;

  const cardDesignerInitialConfig = useMemo(() => {
    const directCardLayout = parseObjectRecord((restaurant as any)?.card_layout);
    if (Object.keys(directCardLayout).length > 0) return directCardLayout;
    const settingsConfig = parseObjectRecord((restaurant as any)?.settings);
    const tableConfig = parseObjectRecord((restaurant as any)?.table_config);
    const fromSettings = parseObjectRecord(settingsConfig.card_designer);
    if (Object.keys(fromSettings).length > 0) return fromSettings;
    return parseObjectRecord(tableConfig.card_designer);
  }, [restaurant, parseObjectRecord]);

  const handleCardDesignerSaved = useCallback((nextConfig: Record<string, unknown>, meta?: { scope?: string; dishId?: string }) => {
    const lockMs = 5000;
    const lockUntil = Date.now() + lockMs;
    isSavingRef.current = true;
    lastSaveTimeRef.current = Date.now();
    dishesRefetchLockUntilRef.current = lockUntil;
    if (scopedRestaurantId) {
      try {
        window.localStorage.setItem(`menuqr:card-layout-save-lock:${scopedRestaurantId}`, String(lockUntil));
      } catch {
        // ignore storage write errors
      }
    }
    if (dishesRefetchLockTimerRef.current != null) {
      window.clearTimeout(dishesRefetchLockTimerRef.current);
      dishesRefetchLockTimerRef.current = null;
    }
    dishesRefetchLockTimerRef.current = window.setTimeout(() => {
      dishesRefetchLockUntilRef.current = 0;
      isSavingRef.current = false;
    }, lockMs + 120);

    const scope = String(meta?.scope || "global").trim().toLowerCase();
    if (scope === "dish") {
      const targetDishId = String(meta?.dishId || "").trim();
      if (!targetDishId) return;
      setDishes((prev: any[]) =>
        prev.map((dish: any) =>
          String(dish.id || "").trim() === targetDishId
            ? { ...dish, custom_card_layout: nextConfig }
            : dish
        )
      );
      return;
    }

    setRestaurant((prev: any) => {
      if (!prev) return prev;
      const prevRecord = prev as Record<string, unknown>;
      return {
        ...prevRecord,
        card_layout: nextConfig,
      } as Restaurant;
    });
    setRestaurantForm((prev: any) => ({
      ...prev,
      card_layout:
        String((nextConfig as Record<string, unknown>)?.layoutToken || (nextConfig as Record<string, unknown>)?.layout_token || "default")
          .trim()
          .toLowerCase() || "default",
    }));
  }, [
    scopedRestaurantId,
    isSavingRef,
    lastSaveTimeRef,
    dishesRefetchLockUntilRef,
    dishesRefetchLockTimerRef,
    setDishes,
    setRestaurant,
    setRestaurantForm,
  ]);

  const cardDesignerProps = {
    restaurantId: String(scopedRestaurantId || (restaurant as any)?.id || "").trim(),
    initialConfig: cardDesignerInitialConfig,
    dishes,
    onSaved: handleCardDesignerSaved,
  };

  return { cardDesignerProps };
}
