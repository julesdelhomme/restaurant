import { useMemo } from "react";

export function useManagerDishCollections(deps: Record<string, any>) {
  const { dishes, categories, editingDish, getDishDisplayDescription, parseOptionsFromDescription } = deps;

  const preparedDishes = useMemo(() => {
    return dishes.map((dish: any) => ({
      ...dish,
      description_display: getDishDisplayDescription(dish),
      ask_cooking: dish.ask_cooking ?? parseOptionsFromDescription(String(dish.description || "")).askCooking,
    }));
  }, [dishes, getDishDisplayDescription, parseOptionsFromDescription]);

  const getCategoryLabel = (category: any) => {
    return category.name_fr || `Categorie ${category.id}`;
  };

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a: any, b: any) => {
      const aOrder = Number.isFinite(Number(a.sort_order)) ? Number(a.sort_order) : 0;
      const bOrder = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return String(a.name_fr || "").localeCompare(String(b.name_fr || ""));
    });
  }, [categories]);

  const preparedDishesSorted = useMemo(() => {
    const categoryOrder = new Map(
      sortedCategories.map((category: any, index: number) => [
        String(category.id),
        Number.isFinite(Number(category.sort_order)) ? Number(category.sort_order) : index,
      ])
    );
    return [...preparedDishes].sort((a: any, b: any) => {
      const aCategory = categoryOrder.get(String(a.category_id)) ?? 0;
      const bCategory = categoryOrder.get(String(b.category_id)) ?? 0;
      if (aCategory !== bCategory) return aCategory - bCategory;
      return String(a.name_fr || a.name || "").localeCompare(String(b.name_fr || b.name || ""));
    });
  }, [preparedDishes, sortedCategories]);

  const preparedDishesGroupedByCategory = useMemo(() => {
    const groups = new Map<string, { categoryLabel: string; dishes: any[] }>();
    preparedDishesSorted.forEach((dish: any) => {
      const categoryId = String(dish.category_id || "").trim() || "__no_category__";
      const category = categories.find((row: any) => String(row.id || "").trim() === categoryId);
      const categoryLabel = category ? getCategoryLabel(category) : String(dish.categorie || "Sans categorie");
      const existing = groups.get(categoryId);
      if (existing) {
        existing.dishes.push(dish);
        return;
      }
      groups.set(categoryId, { categoryLabel, dishes: [dish] });
    });
    return Array.from(groups.entries()).map(([categoryId, value]) => ({
      categoryId,
      categoryLabel: value.categoryLabel,
      dishes: value.dishes,
    }));
  }, [preparedDishesSorted, categories]);

  const formulaSelectableDishGroups = useMemo(() => {
    const currentDishId = String(editingDish?.id || "").trim();
    const groups = new Map<string, { categoryLabel: string; dishes: any[] }>();
    preparedDishesSorted.forEach((dishRow: any) => {
      const dishId = String(dishRow.id || "").trim();
      if (!dishId) return;
      if (currentDishId && dishId === currentDishId) return;
      const categoryId = String(dishRow.category_id || "").trim() || "__no_category__";
      const category = categories.find((row: any) => String(row.id || "").trim() === categoryId);
      const categoryLabel = category ? getCategoryLabel(category) : "Sans categorie";
      const existing = groups.get(categoryId);
      if (existing) {
        existing.dishes.push(dishRow);
        return;
      }
      groups.set(categoryId, { categoryLabel, dishes: [dishRow] });
    });
    return Array.from(groups.entries()).map(([categoryId, value]) => ({
      categoryId,
      categoryLabel: value.categoryLabel,
      dishes: value.dishes,
    }));
  }, [preparedDishesSorted, editingDish?.id, categories]);

  return {
    getCategoryLabel,
    sortedCategories,
    preparedDishesSorted,
    preparedDishesGroupedByCategory,
    formulaSelectableDishGroups,
  };
}
