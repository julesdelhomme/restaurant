import { supabase } from "../../lib/supabase";

export function useManagerCategories(dataStore: any, fetchers: any = {}) {
  const { scopedRestaurantId } = dataStore;

  const handleSaveCategory = async (categoryForm: any, editingId: string | null) => {
    if (!String(categoryForm?.name_fr || "").trim()) {
      alert("Le nom de la categorie est obligatoire.");
      return;
    }

    const payload = {
      restaurant_id: scopedRestaurantId,
      name_fr: String(categoryForm.name_fr || "").trim(),
      destination: categoryForm.destination || "cuisine",
      sort_order: Number.parseInt(String(categoryForm.sort_order || "0"), 10) || 0,
    };

    const { error } = await supabase
      .from("categories")
      .upsert(editingId ? { id: editingId, ...payload } : payload)
      .select();

    if (error) {
      alert("Erreur de sauvegarde categorie : " + error.message);
      return;
    }

    alert("Categorie sauvegardee !");
    if (fetchers?.fetchCategories) await fetchers.fetchCategories();
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!categoryId) return;
    if (!confirm("Voulez-vous vraiment supprimer cette categorie ? Cela supprimera ou masquera les plats associes.")) {
      return;
    }

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      alert("Erreur lors de la suppression : " + error.message);
      return;
    }

    if (fetchers?.fetchCategories) await fetchers.fetchCategories();
  };

  return { handleSaveCategory, handleDeleteCategory };
}
