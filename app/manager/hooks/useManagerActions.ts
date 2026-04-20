import { supabase } from "../../lib/supabase";

export function useManagerActions(dataStore: any, fetchers: any = {}) {
  const {
    scopedRestaurantId,
    setEditingDish,
    setFormData,
    setShowDishModal,
    setActiveDishModalTab,
  } = dataStore;

  const resetForm = () => {
    const categories = Array.isArray(dataStore.categories) ? dataStore.categories : [];
    setEditingDish(null);
    setFormData({
      name_fr: "",
      price: "",
      is_active: true,
      is_formula: false,
      category_id: categories[0]?.id ? String(categories[0].id) : "",
      extras_list: [],
      product_options: [],
      formula_config: null,
      excluded_main_options: [],
    });
  };

  const handleAddDish = () => {
    resetForm();
    setActiveDishModalTab?.("general");
    setShowDishModal?.(true);
  };

  const handleEditDish = async (dish: any) => {
    if (!dish) return;

    resetForm();
    setEditingDish?.(dish);

    let formulaConfig = dish.formula_config || null;
    let selectedMainOptions: string[] = [];

    if (dish.is_formula && scopedRestaurantId) {
      const { data } = await supabase
        .from("restaurant_formulas")
        .select("formula_config, excluded_main_options")
        .eq("dish_id", dish.id)
        .eq("restaurant_id", scopedRestaurantId)
        .maybeSingle();

      if (data) {
        formulaConfig = data.formula_config || formulaConfig;
        selectedMainOptions = data.excluded_main_options || [];
      }
    }

    setFormData?.({
      ...dish,
      name_fr: dish.name_fr || dish.name || "",
      price: dish.price?.toString() || "",
      is_formula: Boolean(dish.is_formula),
      formula_config: formulaConfig,
      excluded_main_options: selectedMainOptions,
    });

    setActiveDishModalTab?.("general");
    setShowDishModal?.(true);
  };

  const handleSave = async () => {
    const name = String(dataStore.formData?.name_fr || "").trim();
    const price = Number.parseFloat(String(dataStore.formData?.price || ""));

    if (!name || !Number.isFinite(price)) {
      alert("Le nom et le prix sont obligatoires !");
      return;
    }

    const payload = {
      restaurant_id: scopedRestaurantId,
      name,
      name_fr: name,
      price,
      category_id: dataStore.formData?.category_id || null,
      is_formula: Boolean(dataStore.formData?.is_formula),
      active: dataStore.formData?.is_active !== false,
    };

    const dishId = dataStore.editingDish?.id;

    const { data: savedDish, error } = await supabase
      .from("dishes")
      .upsert(dishId ? { id: dishId, ...payload } : payload)
      .select()
      .single();

    if (error) {
      alert("Erreur de sauvegarde: " + error.message);
      return;
    }

    if (dataStore.formData?.is_formula && savedDish?.id) {
      const formulaPayload = {
        dish_id: savedDish.id,
        restaurant_id: scopedRestaurantId,
        formula_config: dataStore.formData?.formula_config,
        excluded_main_options: dataStore.formData?.excluded_main_options || [],
      };

      const { error: formulaError } = await supabase
        .from("restaurant_formulas")
        .upsert(formulaPayload, { onConflict: "dish_id" });

      if (formulaError) {
        console.error("Erreur save formule:", formulaError);
      }
    }

    setShowDishModal?.(false);
    if (fetchers?.fetchDishes) await fetchers.fetchDishes();
    alert("Plat sauvegarde avec succes !");
  };

  const handleDeleteDish = async (dish: any) => {
    const dishId = dish?.id;
    const dishName = String(dish?.name_fr || dish?.name || "ce plat");

    if (!dishId) return;
    if (!confirm(`Supprimer le plat ${dishName} ?`)) return;

    await supabase.from("dishes").delete().eq("id", dishId);
    if (fetchers?.fetchDishes) await fetchers.fetchDishes();
  };

  return { resetForm, handleAddDish, handleEditDish, handleSave, handleDeleteDish };
}
