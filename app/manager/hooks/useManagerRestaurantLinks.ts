import { useRef } from "react";
import { buildRestaurantPublicUrl, buildRestaurantVitrineUrl } from "../../../lib/restaurant-url";

export function useManagerRestaurantLinks(deps: Record<string, any>) {
  const { restaurantForm, restaurant, scopedRestaurantId } = deps;

  const vitrineViewsCount = Number((restaurantForm as any).views_vitrine ?? (restaurant as any | null)?.views_vitrine ?? 0);
  const currentRestaurantQrId = String(restaurant?.id || scopedRestaurantId || "").trim();
  const currentRestaurantName = String(
    (restaurantForm as any).name ||
      (restaurantForm as any).restaurant_name ||
      (restaurant as any | null)?.name ||
      (restaurant as any | null)?.restaurant_name ||
      ""
  ).trim();
  const currentRestaurantPublicUrl = currentRestaurantQrId
    ? buildRestaurantPublicUrl(currentRestaurantQrId, currentRestaurantName)
    : "";
  const currentRestaurantVitrineUrl = currentRestaurantQrId
    ? buildRestaurantVitrineUrl(currentRestaurantQrId, currentRestaurantName)
    : "";
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);

  return {
    vitrineViewsCount,
    currentRestaurantQrId,
    currentRestaurantPublicUrl,
    currentRestaurantVitrineUrl,
    printFrameRef,
  };
}
