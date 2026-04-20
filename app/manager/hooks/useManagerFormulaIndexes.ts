import { useMemo } from "react";

export function useManagerFormulaIndexes(deps: Record<string, any>) {
  const { dishes, formulaLinksByFormulaId } = deps;

  const formulaConfiguredIds = useMemo(() => {
    const ids = new Set<string>();
    formulaLinksByFormulaId.forEach((_: unknown, formulaId: unknown) => {
      const normalized = String(formulaId || "").trim();
      if (normalized) ids.add(normalized);
    });
    return ids;
  }, [formulaLinksByFormulaId]);

  const formulaDishes = useMemo(
    () =>
      dishes.filter((dish: Record<string, unknown>) => {
        const dishId = String(dish.id || "").trim();
        return Boolean(dishId) && formulaConfiguredIds.has(dishId);
      }),
    [dishes, formulaConfiguredIds]
  );

  const dishesById = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    dishes.forEach((dish: Record<string, unknown>) => {
      const key = String(dish.id || "").trim();
      if (!key) return;
      map.set(key, dish);
    });
    return map;
  }, [dishes]);

  return { formulaConfiguredIds, formulaDishes, dishesById };
}
