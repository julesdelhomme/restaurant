// @ts-nocheck
import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type ManagerAppearanceCookingPanelProps = {
  [key: string]: any;
};

export default function ManagerAppearanceCookingPanel(props: ManagerAppearanceCookingPanelProps) {
  const {
    COOKING_TRANSLATION_ORDER,
    DEFAULT_COOKING_TRANSLATIONS,
    DEFAULT_LANGUAGE_LABELS,
    activeLanguageCodes,
    activeManagerTab,
    cookingTranslations,
    languageLabels,
    openManagerPanels,
    setCookingTranslations,
    toggleManagerPanel,
  } = props;

  return (
<>
            <div className={`md:col-span-2 border border-gray-200 rounded p-3 bg-gray-50 ${activeManagerTab === "menu" || activeManagerTab === "configuration" ? "" : "hidden"}`}>
              <button
                type="button"
                onClick={() => toggleManagerPanel("cooking")}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <div className="font-bold">Traductions des Cuissons</div>
                {openManagerPanels.cooking ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <div
                className={`grid transition-all duration-300 ease-out ${
                  openManagerPanels.cooking ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-gray-200 rounded bg-white">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-black">{"Français"}</th>
                      {activeLanguageCodes
                        .filter((code) => code !== "fr")
                        .map((code) => (
                          <th key={`cook-head-${code}`} className="px-3 py-2 text-left font-black">
                            {languageLabels[code] || DEFAULT_LANGUAGE_LABELS[code] || code.toUpperCase()}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COOKING_TRANSLATION_ORDER.map((cookingKey) => (
                      <tr key={cookingKey} className="border-t border-gray-200">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={cookingTranslations[cookingKey]?.fr || DEFAULT_COOKING_TRANSLATIONS[cookingKey].fr}
                            onChange={(e) =>
                              setCookingTranslations((prev) => ({
                                ...prev,
                                [cookingKey]: { ...(prev[cookingKey] || {}), fr: e.target.value },
                              }))
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        {activeLanguageCodes
                          .filter((code) => code !== "fr")
                          .map((code) => (
                            <td key={`cook-cell-${cookingKey}-${code}`} className="px-3 py-2">
                              <input
                                type="text"
                                value={cookingTranslations[cookingKey]?.[code] || DEFAULT_COOKING_TRANSLATIONS[cookingKey][code] || ""}
                                onChange={(e) =>
                                  setCookingTranslations((prev) => ({
                                    ...prev,
                                    [cookingKey]: { ...(prev[cookingKey] || {}), [code]: e.target.value },
                                  }))
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                {"Traductions manuelles des niveaux de cuisson. Vous pouvez modifier toutes les langues actives ici."}
              </p>
                </div>
              </div>
            </div>

</>
  );
}
