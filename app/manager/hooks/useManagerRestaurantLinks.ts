import { useMemo, useRef } from "react";
import { buildRestaurantPublicUrl, buildRestaurantVitrineUrl } from "../../../lib/restaurant-url";

export function useManagerRestaurantLinks(deps: Record<string, any>) {
  const { restaurantForm, restaurant, scopedRestaurantId } = deps;

  const vitrineViewsCount = Number((restaurantForm as any).views_vitrine ?? (restaurant as any | null)?.views_vitrine ?? 0);
  const currentRestaurantQrId = String(restaurant?.id || scopedRestaurantId || "").trim();
  const currentRestaurantPublicUrl = currentRestaurantQrId ? buildRestaurantPublicUrl(currentRestaurantQrId) : "";
  const currentRestaurantVitrineUrl = currentRestaurantQrId ? buildRestaurantVitrineUrl(currentRestaurantQrId) : "";
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);

  return {
    vitrineViewsCount,
    currentRestaurantQrId,
    currentRestaurantPublicUrl,
    currentRestaurantVitrineUrl,
    printFrameRef,
  };
}
