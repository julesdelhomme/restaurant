// @ts-nocheck
import React, { Fragment } from "react";
import { ChevronDown, ChevronUp, Pencil, Star, Trash2 } from "lucide-react";
import SupportFooter from "./SupportFooter";

type ManagerMenuPanelProps = {
  [key: string]: any;
};

export default function ManagerMenuPanel(props: ManagerMenuPanelProps) {
  const {
    ManagerStatsPanel = () => null,
    activeLanguageCodes = [],
    activeManagerTab = "menu",
    categories = [],
    dishes = [],
    editingSubCategoryId = null,
    formatEuro = (value: number) => `${Number(value || 0).toFixed(2)} EUR`,
    getCategoryLabel = (cat: any) => cat?.name_fr || cat?.name || "Categorie",
    handleAddDish = () => undefined,
    handleCreateSide = () => undefined,
    handleCreateSubCategory = () => undefined,
    handleDeleteCategory = () => undefined,
    handleDeleteDish = () => undefined,
    handleDeleteSide = () => undefined,
    handleDeleteSubCategory = () => undefined,
    handleEditDish = () => undefined,
    handleEditSide = () => undefined,
    handleGeneratePrintableMenu = () => undefined,
    handleToggleDishHighlight = () => undefined,
    handleUpdateCategoryDestination = () => undefined,
    handleUpdateCategorySortOrder = () => undefined,
    managerStatsPanelProps = {},
    newSide = { name_fr: "" },
    newSideI18n = {},
    newSubCategory = { category_id: "", name_fr: "", name_en: "", name_es: "", name_de: "" },
    newSubCategoryI18n = {},
    normalizeCategoryDestination = (value: any) => String(value || "cuisine"),
    normalizeSortOrder = (value: any) => Number(value || 0),
    parseI18nToken = () => ({}),
    preparedDishesGroupedByCategory = [],
    router = { push: () => undefined },
    scopedRestaurantId = "",
    setCategoryForm = () => undefined,
    setCategoryFormI18n = () => undefined,
    setCategorySaveStatus = () => undefined,
    setEditingCategoryId = () => undefined,
    setEditingSubCategoryId = () => undefined,
    setNewSide = () => undefined,
    setNewSideI18n = () => undefined,
    setNewSubCategory = () => undefined,
    setNewSubCategoryI18n = () => undefined,
    setShowCategoryModal = () => undefined,
    sideSaveStatus = "idle",
    sides = [],
    sortedCategories = [],
    subCategoryRows = [],
    toBoolean = (value: any, fallback = false) =>
      value == null ? fallback : value === true || String(value).toLowerCase() === "true",
  } = props;

  return (
<>
          {(activeManagerTab === "menu" || activeManagerTab === "stats") && (
          <>
          <div className={`${activeManagerTab === "menu" ? "bg-white rounded-xl shadow-xl border border-gray-200 p-4" : "hidden"}`}>
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <SupportFooter />
            </div>
            <h2 className="text-lg font-black mb-2">Catégories</h2>
              {categories.length === 0 ? (
                <div className="text-sm font-bold text-red-600 mb-3">Aucune catégorie créée</div>
              ) : (
                <div className="flex flex-wrap gap-2 mb-3">
                  {sortedCategories.map((cat) => (
                    <span
                      key={cat.id}
                      className="px-3 py-1 rounded-full border border-gray-300 font-bold text-sm flex items-center gap-2"
                    >
                      {getCategoryLabel(cat)}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                            onClick={() =>
                              void handleUpdateCategorySortOrder(
                                cat.id,
                                (normalizeSortOrder(cat.sort_order) ?? 0) - 1
                              )
                            }
                          className="px-2 py-0.5 border border-gray-300 rounded bg-white text-xs"
                          title="Monter"
                        >
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={Number.isFinite(Number(cat.sort_order)) ? String(Number(cat.sort_order)) : "0"}
                            onChange={(e) =>
                              void handleUpdateCategorySortOrder(
                                cat.id,
                                normalizeSortOrder(e.target.value) ?? 0
                              )
                            }
                          className="w-14 px-1 py-0.5 border border-gray-300 rounded bg-white text-xs"
                          title="Ordre d'affichage"
                        />
                        <button
                          type="button"
                            onClick={() =>
                              void handleUpdateCategorySortOrder(
                                cat.id,
                                (normalizeSortOrder(cat.sort_order) ?? 0) + 1
                              )
                            }
                          className="px-2 py-0.5 border border-gray-300 rounded bg-white text-xs"
                          title="Descendre"
                        >
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <select
                        value={normalizeCategoryDestination(cat.destination)}
                        onChange={(e) => {
                          e.stopPropagation();
                          void handleUpdateCategoryDestination(cat.id, normalizeCategoryDestination(e.target.value));
                        }}
                        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-bold"
                        title="Envoyer vers"
                      >
                        <option value="cuisine">Cuisine</option>
                        <option value="bar">Bar/Caisse</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const categoryToken = parseI18nToken(cat.name_en || "");
                          setEditingCategoryId(cat.id);
                          setCategoryForm({
                            name_fr: cat.name_fr || "",
                            name_en: cat.name_en || "",
                            name_es: cat.name_es || "",
                            name_de: cat.name_de || "",
                            destination: normalizeCategoryDestination(cat.destination),
                            sort_order: Number.isFinite(Number(cat.sort_order)) ? String(Number(cat.sort_order)) : "1",
                          });
                          setCategoryFormI18n({
                            ...categoryToken,
                            en: categoryToken.en || cat.name_en || "",
                            es: categoryToken.es || cat.name_es || "",
                            de: categoryToken.de || cat.name_de || "",
                          });
                          setCategorySaveStatus("idle");
                          setShowCategoryModal(true);
                        }}
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            <button
              type="button"
              onClick={() => {
                setEditingCategoryId(null);
                setCategoryForm({ name_fr: "", name_en: "", name_es: "", name_de: "", destination: "cuisine", sort_order: "1" });
                setCategoryFormI18n({});
                setCategorySaveStatus("idle");
                setShowCategoryModal(true);
              }}
              className="px-4 py-2 border-2 border-black font-black"
            >
              Ajouter une catégorie
            </button>
            <div className="mt-4">
              <h3 className="font-black mb-2">Sous-Catégories multilingues</h3>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-3">
                <select
                  value={newSubCategory.category_id}
                  onChange={(e) => setNewSubCategory({ ...newSubCategory, category_id: e.target.value })}
                  className="px-3 py-2 bg-white text-black border border-gray-300"
                >
                  <option value="">catégorie</option>
                  {sortedCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {getCategoryLabel(cat)}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newSubCategory.name_fr}
                  onChange={(e) => setNewSubCategory({ ...newSubCategory, name_fr: e.target.value })}
                  placeholder="Nom FR"
                  className="px-3 py-2 bg-white text-black border border-gray-300"
                />
                {activeLanguageCodes
                  .filter((code) => code !== "fr")
                  .map((code) => (
                    <input
                      key={`new-subcat-${code}`}
                      type="text"
                      value={newSubCategoryI18n[code] || ""}
                      onChange={(e) => setNewSubCategoryI18n((prev) => ({ ...prev, [code]: e.target.value }))}
                      placeholder={`Nom ${code.toUpperCase()}`}
                      className="px-3 py-2 bg-white text-black border border-gray-300"
                    />
                  ))}
              </div>
              <button
                type="button"
                onClick={handleCreateSubCategory}
                className="px-4 py-2 border-2 border-black font-black"
              >
                {editingSubCategoryId ? "Modifier sous-catégorie" : "Ajouter sous-catégorie"}
              </button>
              <div className="mt-3 flex flex-col gap-2">
                {subCategoryRows.map((row) => (
                  <div key={row.id} className="border border-gray-200 rounded p-2 flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-black mr-2">
                        {getCategoryLabel(
                          categories.find((cat) => String(cat.id) === String(row.category_id)) || {
                            id: row.category_id,
                            name_fr: `catégorie ${row.category_id}`,
                          }
                        )}
                      </span>
                      <span>{row.name_fr}</span>
                      <span className="text-gray-500">
                        {" | "}
                        {activeLanguageCodes
                          .filter((code) => code !== "fr")
                          .map((code) => {
                            const token = parseI18nToken(row.name_en || "");
                            const value =
                              token[code] ||
                              (code === "en" ? row.name_en : code === "es" ? row.name_es : code === "de" ? row.name_de : "") ||
                              "-";
                            return `${code.toUpperCase()}: ${value}`;
                          })
                          .join(" | ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const token = parseI18nToken(row.name_en || "");
                          setEditingSubCategoryId(row.id);
                          setNewSubCategory({
                            category_id: String(row.category_id),
                            name_fr: row.name_fr,
                            name_en: row.name_en || "",
                            name_es: row.name_es || "",
                            name_de: row.name_de || "",
                          });
                          setNewSubCategoryI18n({
                            ...token,
                            en: token.en || row.name_en || "",
                            es: token.es || row.name_es || "",
                            de: token.de || row.name_de || "",
                          });
                        }}
                        className="px-3 py-1 border border-black font-bold"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubCategory(row.id)}
                        className="px-3 py-1 border border-black font-bold text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={`${activeManagerTab === "menu" ? "bg-white rounded-xl shadow-xl border border-gray-200 p-4 mt-4" : "hidden"}`}>
            <h2 className="text-lg font-black mb-2">Bibliothèque d&apos;accompagnements</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
              <input
                type="text"
                value={newSide.name_fr}
                onChange={(e) => setNewSide({ ...newSide, name_fr: e.target.value })}
                placeholder="Nom FR"
                className="px-3 py-2 bg-white text-black border border-gray-300"
              />
              {activeLanguageCodes
                .filter((code) => code !== "fr")
                .map((code) => (
                  <input
                    key={`new-side-${code}`}
                    type="text"
                    value={newSideI18n[code] || ""}
                    onChange={(e) => setNewSideI18n((prev) => ({ ...prev, [code]: e.target.value }))}
                    placeholder={`Nom ${code.toUpperCase()}`}
                    className="px-3 py-2 bg-white text-black border border-gray-300"
                  />
                ))}
            </div>
            <button
              type="button"
              onClick={handleCreateSide}
              disabled={sideSaveStatus === "saving"}
              className={`px-4 py-2 border-2 border-black font-black disabled:opacity-60 ${
                sideSaveStatus === "success" ? "bg-green-600 text-white" : ""
              }`}
            >
              {sideSaveStatus === "saving"
                ? "Enregistrement..."
                : sideSaveStatus === "success"
                  ? "Enregistré avec succès !"
                  : "Ajouter accompagnement"}
            </button>
            <div className="mt-4">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 bg-gray-100 text-sm font-black px-3 py-2">
                  <div className="col-span-3">FR</div>
                  <div className="col-span-7">Traductions actives</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                {sides.map((s) => (
                  <div
                    key={s.id}
                    className="grid grid-cols-12 items-center px-3 py-2 border-t border-gray-200 text-sm"
                  >
                    <div className="col-span-3 font-bold">{s.name_fr}</div>
                    <div className="col-span-7 text-gray-700">
                      {activeLanguageCodes
                        .filter((code) => code !== "fr")
                        .map((code) => {
                          const sideI18n = parseI18nToken(s.name_en || "");
                          const value =
                            sideI18n[code] ||
                            (code === "en" ? s.name_en : code === "es" ? s.name_es : code === "de" ? s.name_de : "") ||
                            "-";
                          return `${code.toUpperCase()}: ${value}`;
                        })
                        .join(" | ")}
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditSide(s)}
                        className="px-2 py-1 border border-black rounded"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSide(s.id)}
                        className="px-2 py-1 border border-black rounded text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
                {sides.length === 0 && (
                  <div className="px-3 py-3 text-sm text-gray-600">Aucun accompagnement.</div>
                )}
              </div>
            </div>
          </div>
          <ManagerStatsPanel {...managerStatsPanelProps} />
          </>
          )}

        <section className={activeManagerTab === "menu" ? "mb-10" : "hidden"}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-black">Ma Carte</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAddDish}
                className="bg-black text-white px-4 py-2 font-black rounded-xl"
              >
                Ajouter un plat
              </button>
              <button
                type="button"
                onClick={handleGeneratePrintableMenu}
                className="px-4 py-2 border-2 border-black font-black rounded-xl bg-white"
              >
                Générer ma carte papier (PDF)
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full table-fixed text-left">
              <thead className="bg-gray-100">
                <tr className="text-sm font-bold text-black">
                  <th className="p-3 w-[30%]">Plat</th>
                  <th className="p-3 w-[14%]">catégorie</th>
                  <th className="p-3 w-[10%]">Prix</th>
                  <th className="p-3 w-[20%]">Badges</th>
                  <th className="p-3 w-[14%]">Options</th>
                  <th className="p-3 w-[12rem] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {preparedDishesGroupedByCategory.map((group) => (
                  <Fragment key={`menu-category-group-${group.categoryId}`}>
                    <tr className="border-t-2 border-black bg-gray-50">
                      <td colSpan={6} className="p-3 font-black uppercase tracking-wide">
                        {group.categoryLabel}
                      </td>
                    </tr>
                    {(Array.isArray(group?.dishes) ? group.dishes : []).map((dish) => (
                      <tr key={dish.id} className="border-t border-gray-200 hover:bg-gray-100">
                        <td className="p-3 align-top">
                          <div className="font-black flex items-center gap-2">
                            <span
                              className={`inline-block w-3 h-3 rounded-full ${
                                dish.active === false ? "bg-red-500" : "bg-green-500"
                              }`}
                            />
                            {dish.name}
                          </div>
                          <div className="mt-1 max-w-full break-words text-sm leading-5 text-gray-700">
                            {(dish as Dish & { description_display?: string }).description_display || ""}
                          </div>
                        </td>
                        <td className="p-3 align-top text-sm break-words">
                          {group.categoryLabel}
                        </td>
                        <td className="p-3 align-top font-bold whitespace-nowrap">{formatEuro(Number(dish.price || 0))}</td>
                        <td className="p-3 align-top">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleDishHighlight(
                                  dish,
                                  "is_daily_special",
                                  !toBoolean(
                                    (dish as unknown as any).is_daily_special ?? dish.is_special,
                                    false
                                  )
                                )
                              }
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border font-black text-xs ${
                                toBoolean((dish as unknown as any).is_daily_special ?? dish.is_special, false)
                                  ? "bg-green-100 border-green-600 text-green-900"
                                  : "bg-white border-gray-300 text-gray-700"
                              }`}
                              title="Plat du Jour"
                            >
                              <Star
                                className={`h-4 w-4 ${
                                  toBoolean((dish as unknown as any).is_daily_special ?? dish.is_special, false)
                                    ? "fill-current"
                                    : ""
                                }`}
                                aria-hidden="true"
                              />
                              <span>Jour</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleDishHighlight(
                                  dish,
                                  "suggestion_chef",
                                  !toBoolean(
                                    (dish as unknown as any).is_suggestion ??
                                      (dish as unknown as any).is_chef_suggestion ??
                                      dish.is_featured,
                                    false
                                  )
                                )
                              }
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border font-black text-xs ${
                                toBoolean(
                                  (dish as unknown as any).is_suggestion ??
                                    (dish as unknown as any).is_chef_suggestion ??
                                    dish.is_featured,
                                  false
                                )
                                  ? "bg-amber-100 border-amber-500 text-amber-900"
                                  : "bg-white border-gray-300 text-gray-700"
                              }`}
                              title="Suggestion du Chef"
                            >
                              <Star
                                className={`h-4 w-4 ${
                                  toBoolean(
                                    (dish as unknown as any).is_suggestion ??
                                      (dish as unknown as any).is_chef_suggestion ??
                                      dish.is_featured,
                                    false
                                  )
                                    ? "fill-current"
                                    : ""
                                }`}
                                aria-hidden="true"
                              />
                              <span>Suggestion du Chef</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleDishHighlight(
                                  dish,
                                  "is_promo",
                                  !toBoolean((dish as unknown as any).is_promo, false)
                                )
                              }
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border font-black text-xs ${
                                toBoolean((dish as unknown as any).is_promo, false)
                                  ? "bg-red-100 border-red-600 text-red-900"
                                  : "bg-white border-gray-300 text-gray-700"
                              }`}
                              title="Badge PROMO"
                            >
                              <span>PROMO</span>
                            </button>
                          </div>
                        </td>
                        <td className="p-3 align-top text-sm break-words">
                          Accompagnements: {dish.has_sides ? "Oui" : "Non"} | Suppléments: {dish.has_extras ? "Oui" : "Non"} | Variantes: {Array.isArray((dish as Dish).product_options) ? (dish as Dish).product_options?.length || 0 : 0} | Cuisson: {dish.ask_cooking ? "Oui" : "Non"}
                        </td>
                        <td className="p-3 align-top text-right">
                          <div className="flex justify-end gap-2 whitespace-nowrap">
                            <button
                              onClick={() => {
                                const rawDish = dishes.find((row) => String(row.id) === String(dish.id));
                                handleEditDish(rawDish || dish);
                              }}
                              className="px-3 py-1 rounded-lg bg-black text-white font-bold shadow-sm"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => {
                                const rawDish = dishes.find((row) => String(row.id) === String(dish.id));
                                handleDeleteDish(rawDish || dish);
                              }}
                              className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold shadow-sm"
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
</>
  );
}

