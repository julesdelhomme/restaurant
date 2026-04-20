import { useMemo } from "react";

type InventoryDishLike = {
  name?: string;
  category?: string;
  categorie?: string;
  [key: string]: unknown;
};

function decodeAndTrim(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw;
  }
}

export function useScopedRestaurantId(params: { id?: string; restaurant_id?: string }, searchParams: URLSearchParams) {
  const scopedRestaurantIdFromPath = decodeAndTrim(params?.restaurant_id || params?.id || "");
  const scopedRestaurantIdFromQuery = decodeAndTrim(searchParams.get("restaurant_id") || "");
  const scopedRestaurantIdFromLocation =
    typeof window !== "undefined" ? decodeAndTrim(window.location.pathname.split("/").filter(Boolean)[0] || "") : "";
  return String(scopedRestaurantIdFromPath || scopedRestaurantIdFromQuery || scopedRestaurantIdFromLocation || "").trim();
}

export function useInventoryByCategory(inventory: InventoryDishLike[]) {
  return useMemo(() => {
    const groups: Record<string, InventoryDishLike[]> = {};
    inventory.forEach((item) => {
      const label = String((item as any).categories?.name_fr || item.category || item.categorie || "Sans catégorie").trim() || "Sans catégorie";
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });
    return Object.entries(groups)
      .map(([label, items]) => [label, [...items].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))] as const)
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [inventory]);
}
