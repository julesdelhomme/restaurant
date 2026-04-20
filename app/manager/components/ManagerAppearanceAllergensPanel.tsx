// @ts-nocheck
import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type ManagerAppearanceAllergensPanelProps = {
  [key: string]: any;
};

export default function ManagerAppearanceAllergensPanel(props: ManagerAppearanceAllergensPanelProps) {
  const {
    DEFAULT_LANGUAGE_LABELS,
    activeLanguageCodes,
    activeManagerTab,
    allergenLibrary,
    createLocalId,
    handleDeleteAllergen,
    languageLabels,
    newAllergenFr,
    normalizeText,
    openManagerPanels,
    setAllergenLibrary,
    setNewAllergenFr,
    toggleManagerPanel,
  } = props;

  return (
<>
            <div className={`md:col-span-2 border border-gray-200 rounded p-3 bg-gray-50 ${activeManagerTab === "menu" || activeManagerTab === "configuration" ? "" : "hidden"}`}>
              <button
                type="button"
                onClick={() => toggleManagerPanel("allergens")}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <div className="font-bold">Bibliothèque des Allergènes</div>
                {openManagerPanels.allergens ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <div
                className={`grid transition-all duration-300 ease-out ${
                  openManagerPanels.allergens ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="font-bold">{"Bibliothèque des Allergènes"}</div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newAllergenFr}
                    onChange={(e) => setNewAllergenFr(e.target.value)}
                    placeholder={"Ajouter un allergène (FR)"}
                    className="px-3 py-2 bg-white text-black border border-gray-300 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const nameFr = String(newAllergenFr || "").trim();
                      if (!nameFr) return;
                      if (allergenLibrary.some((row) => normalizeText(row.name_fr) === normalizeText(nameFr))) {
                        return;
                      }
                      setAllergenLibrary((prev) => [
                        ...prev,
                        { id: createLocalId(), name_fr: nameFr, names_i18n: { fr: nameFr } },
                      ]);
                      setNewAllergenFr("");
                    }}
                    className="px-3 py-2 border-2 border-black font-black rounded"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-gray-200 rounded bg-white">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-black">Français</th>
                      {activeLanguageCodes
                        .filter((code) => code !== "fr")
                        .map((code) => (
                          <th key={`allergen-head-${code}`} className="px-3 py-2 text-left font-black">
                            {languageLabels[code] || DEFAULT_LANGUAGE_LABELS[code] || code.toUpperCase()}
                          </th>
                        ))}
                      <th className="px-3 py-2 text-left font-black">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allergenLibrary.map((row, rowIndex) => (
                      <tr key={row.id} className="border-t border-gray-200">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.name_fr}
                            onChange={(e) =>
                              setAllergenLibrary((prev) =>
                                prev.map((item, index) =>
                                  index === rowIndex
                                    ? {
                                        ...item,
                                        name_fr: e.target.value,
                                        names_i18n: { ...(item.names_i18n || {}), fr: e.target.value },
                                      }
                                    : item
                                )
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        {activeLanguageCodes
                          .filter((code) => code !== "fr")
                          .map((code) => (
                            <td key={`allergen-cell-${row.id}-${code}`} className="px-3 py-2">
                              <input
                                type="text"
                                value={row.names_i18n?.[code] || ""}
                                onChange={(e) =>
                                  setAllergenLibrary((prev) =>
                                    prev.map((item, index) =>
                                      index === rowIndex
                                        ? {
                                            ...item,
                                            names_i18n: { ...(item.names_i18n || {}), [code]: e.target.value },
                                          }
                                        : item
                                    )
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                          ))}
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => void handleDeleteAllergen(String(row.id))}
                            className="px-2 py-1 border border-red-300 text-red-700 rounded font-bold"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                {"La carte client utilise cette bibliothèque pour afficher les allergènes dans la langue active, avec repli en français."}
              </p>
                </div>
              </div>
            </div>
</>
  );
}
