import { useMemo } from "react";
import type { CategoryItem, DishItem, SideLibraryItem, TableAssignment } from "../types";
import { isActiveTableSession, readCoversFromRow } from "../utils/admin-core-helpers";

export function useAdminLookups(params: {
  activeTables: TableAssignment[];
  settings: Record<string, unknown> | null;
  totalTables: number;
  resolveTotalTables: (settings: unknown) => number | null;
  categories: CategoryItem[];
  dishes: DishItem[];
  sidesLibrary: SideLibraryItem[];
  normalizeCategoryKey: (value: string) => string;
  parseJsonObject: (value: unknown) => Record<string, unknown> | null;
  normalizeLookupText: (raw: unknown) => string;
}) {
  const {
    activeTables,
    settings,
    totalTables,
    resolveTotalTables,
    categories,
    dishes,
    sidesLibrary,
    normalizeCategoryKey,
    parseJsonObject,
    normalizeLookupText,
  } = params;

  const tableCoversByNumber = useMemo(() => {
    const map = new Map<number, number>();
    activeTables.forEach((row) => {
      const tableNum = Number(row.table_number);
      const covers = readCoversFromRow(row as unknown as Record<string, unknown>);
      if (Number.isFinite(tableNum) && tableNum > 0 && covers) map.set(tableNum, covers);
    });
    return map;
  }, [activeTables]);

  const activeTableByNumber = useMemo(() => {
    const map = new Map<number, TableAssignment>();
    activeTables.forEach((row) => {
      const tableNumber = Number(row.table_number);
      if (!Number.isFinite(tableNumber)) return;
      map.set(tableNumber, row);
    });
    return map;
  }, [activeTables]);

  const configuredTotalTables = useMemo(() => {
    const fromSettings = resolveTotalTables((settings as { table_count?: unknown } | null)?.table_count ?? settings);
    if (fromSettings != null) return fromSettings;
    return totalTables > 0 ? totalTables : 0;
  }, [settings, totalTables, resolveTotalTables]);

  const tableSlots = useMemo(
    () =>
      Array.from({ length: configuredTotalTables }, (_, index) => index + 1).map((tableNumber) => {
        const row = activeTableByNumber.get(tableNumber);
        return {
          tableNumber,
          isOccupied: isActiveTableSession(row),
          row: row || null,
        };
      }),
    [activeTableByNumber, configuredTotalTables]
  );

  const categoryById = useMemo(() => {
    const map = new Map<string, CategoryItem>();
    categories.forEach((category) => map.set(String(category.id || "").trim(), category));
    return map;
  }, [categories]);

  const categoryByNormalizedLabel = useMemo(() => {
    const map = new Map<string, CategoryItem>();
    categories.forEach((category) => {
      const key = normalizeCategoryKey(
        String(category.name_fr || category.name || category.label || category.category || "").trim()
      );
      if (key && !map.has(key)) map.set(key, category);
    });
    return map;
  }, [categories, normalizeCategoryKey]);

  const dishById = useMemo(() => {
    const map = new Map<string, DishItem>();
    dishes.forEach((dish) => {
      const key = String(dish.id || "").trim();
      if (key) map.set(key, dish);
    });
    return map;
  }, [dishes]);

  const sideIdByAlias = useMemo(() => {
    const map = new Map<string, string>();
    sidesLibrary.forEach((side) => {
      const row = side as unknown as Record<string, unknown>;
      const sideId = String(side.id || "").trim();
      if (!sideId) return;
      const candidateLabels = [row.name_fr, row.name_en, row.name_es, row.name_de, row.name, row.label]
        .map((value) => String(value || "").trim())
        .filter(Boolean);
      const translationsNode = parseJsonObject(row.translations);
      if (translationsNode) {
        Object.values(translationsNode).forEach((value) => {
          const label = String(value || "").trim();
          if (label) candidateLabels.push(label);
        });
      }
      candidateLabels.forEach((label) => {
        const key = normalizeLookupText(label);
        if (!key) return;
        if (!map.has(key)) map.set(key, sideId);
      });
    });
    return map;
  }, [sidesLibrary, parseJsonObject, normalizeLookupText]);

  const sideLabelById = useMemo(() => {
    const map = new Map<string, string>();
    sidesLibrary.forEach((side) => {
      const label =
        String(side.name_fr || "").trim() ||
        String(side.name_en || "").trim() ||
        String(side.name_es || "").trim() ||
        String(side.name_de || "").trim() ||
        String(side.id || "").trim();
      const key = String(side.id || "").trim();
      if (key && label) map.set(key, label);
    });
    return map;
  }, [sidesLibrary]);

  return {
    tableCoversByNumber,
    activeTableByNumber,
    configuredTotalTables,
    tableSlots,
    categoryById,
    categoryByNormalizedLabel,
    dishById,
    sideIdByAlias,
    sideLabelById,
  };
}
