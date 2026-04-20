// @ts-nocheck
import React from "react";

type ManagerCategorySideModalsProps = {
  [key: string]: any;
};

export default function ManagerCategorySideModals(props: ManagerCategorySideModalsProps) {
  const {
    activeLanguageCodes,
    categoryForm,
    categoryFormI18n,
    categorySaveStatus,
    editingCategoryId,
    handleCreateCategory,
    handleSaveSide,
    normalizeCategoryDestination,
    setCategoryForm,
    setCategoryFormI18n,
    setCategorySaveStatus,
    setEditingCategoryId,
    setEditingSideId,
    setShowCategoryModal,
    setShowSideModal,
    setSideForm,
    setSideFormI18n,
    setSideSaveStatus,
    showCategoryModal,
    showSideModal,
    sideForm,
    sideFormI18n,
    sideSaveStatus,
  } = props;

  return (
<>
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-950 text-slate-900 dark:text-white border-2 border-black w-full max-w-lg p-6">
            <h3 className="text-2xl font-black mb-4">
              {editingCategoryId ? "Modifier la catégorie" : "Ajouter une catégorie"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={categoryForm.name_fr}
                onChange={(e) => setCategoryForm({ ...categoryForm, name_fr: e.target.value })}
                placeholder="Nom FR"
                className="w-full px-3 py-2 bg-white text-black border border-gray-300"
              />
              <select
                value={categoryForm.destination}
                onChange={(e) => setCategoryForm({ ...categoryForm, destination: normalizeCategoryDestination(e.target.value) })}
                className="w-full px-3 py-2 bg-white text-black border border-gray-300"
              >
                <option value="cuisine">Envoyer vers : Cuisine</option>
                <option value="bar">Envoyer vers : Bar/Caisse</option>
              </select>
                <div>
                  <label className="block mb-1 font-bold">Ordre (chiffre)</label>
                  <input
                    type="number"
                    min="0"
                    value={categoryForm.sort_order}
                    onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: e.target.value })}
                    placeholder="Ordre (ex: Entrée=1, Plat=2)"
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                </div>
              {activeLanguageCodes
                .filter((code) => code !== "fr")
                .map((code) => (
                  <input
                    key={`category-edit-${code}`}
                    type="text"
                    value={categoryFormI18n[code] || ""}
                    onChange={(e) => setCategoryFormI18n((prev) => ({ ...prev, [code]: e.target.value }))}
                    placeholder={`Nom ${code.toUpperCase()}`}
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={handleCreateCategory}
                disabled={categorySaveStatus === "saving"}
                className={`px-5 py-2 font-black border-2 border-black disabled:opacity-60 ${
                  categorySaveStatus === "success" ? "bg-green-600 text-white" : "bg-black text-white"
                }`}
              >
                {categorySaveStatus === "saving"
                  ? "Enregistrement..."
                  : categorySaveStatus === "success"
                    ? "Enregistré avec succès !"
                    : editingCategoryId
                      ? "Modifier"
                      : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategoryId(null);
                  setCategoryForm({ name_fr: "", name_en: "", name_es: "", name_de: "", destination: "cuisine", sort_order: "1" });
                  setCategoryFormI18n({});
                  setCategorySaveStatus("idle");
                }}
                className="px-5 py-2 font-black border-2 border-black"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showSideModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-950 text-slate-900 dark:text-white border-2 border-black w-full max-w-lg p-6">
            <h3 className="text-2xl font-black mb-4">Modifier accompagnement</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={sideForm.name_fr}
                onChange={(e) => setSideForm({ ...sideForm, name_fr: e.target.value })}
                placeholder="Nom FR"
                className="w-full px-3 py-2 bg-white text-black border border-gray-300"
              />
              {activeLanguageCodes
                .filter((code) => code !== "fr")
                .map((code) => (
                  <input
                    key={`side-edit-${code}`}
                    type="text"
                    value={sideFormI18n[code] || ""}
                    onChange={(e) => setSideFormI18n((prev) => ({ ...prev, [code]: e.target.value }))}
                    placeholder={`Nom ${code.toUpperCase()}`}
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={handleSaveSide}
                disabled={sideSaveStatus === "saving"}
                className={`px-5 py-2 font-black border-2 border-black disabled:opacity-60 ${
                  sideSaveStatus === "success" ? "bg-green-600 text-white" : "bg-black text-white"
                }`}
              >
                {sideSaveStatus === "saving"
                  ? "Enregistrement..."
                  : sideSaveStatus === "success"
                    ? "Enregistré avec succès !"
                    : "Sauvegarder"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSideModal(false);
                  setEditingSideId(null);
                  setSideForm({ name_fr: "", name_en: "", name_es: "", name_de: "" });
                  setSideFormI18n({});
                  setSideSaveStatus("idle");
                }}
                className="px-5 py-2 font-black border-2 border-black"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
</>
  );
}
