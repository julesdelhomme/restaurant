// @ts-nocheck
import React from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";

type ManagerAppearanceLanguagesPanelProps = {
  [key: string]: any;
};

export default function ManagerAppearanceLanguagesPanel(props: ManagerAppearanceLanguagesPanelProps) {
  const {
    PREDEFINED_LANGUAGE_OPTIONS = [],
    DEFAULT_LANGUAGE_LABELS = {},
    activeLanguageCodes = [],
    activeManagerTab,
    languageLabels = {},
    languagePresetToAdd = "",
    normalizeLanguageKey = (v: string) => String(v || "").trim().toLowerCase(),
    openManagerPanels = {},
    setActiveLanguageCodes = () => undefined,
    setDishExtraDraft = () => undefined,
    setFormData = () => undefined,
    setLanguageLabels = () => undefined,
    setLanguagePresetToAdd = () => undefined,
    setNewSideI18n = () => undefined,
    setSideFormI18n = () => undefined,
    toggleManagerPanel = () => undefined,
  } = props;

  return (
    <>
      <div
        className={`md:col-span-2 border border-gray-200 rounded p-3 bg-gray-50 ${
          activeManagerTab === "appearance" || activeManagerTab === "configuration" ? "" : "hidden"
        }`}
      >
        <button
          type="button"
          onClick={() => toggleManagerPanel("languages")}
          className="w-full flex items-center justify-between gap-3 text-left"
        >
          <div className="font-bold">Gestion des Langues (client + champs manager)</div>
          {openManagerPanels.languages ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div
          className={`grid transition-all duration-300 ease-out ${
            openManagerPanels.languages ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 mb-3">
              <select
                value={languagePresetToAdd}
                onChange={(e) => setLanguagePresetToAdd(e.target.value)}
                className="px-3 py-2 bg-white text-black border border-gray-300 rounded"
              >
                {PREDEFINED_LANGUAGE_OPTIONS.map((langOption) => (
                  <option key={langOption.code} value={langOption.code}>
                    {langOption.label} ({langOption.code.toUpperCase()})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const selected = PREDEFINED_LANGUAGE_OPTIONS.find((entry) => entry.code === languagePresetToAdd);
                  const label = String(selected?.label || "").trim();
                  const code = normalizeLanguageKey(String(selected?.code || ""));
                  if (!label || !code) return;
                  if (activeLanguageCodes.includes(code)) return;
                  setActiveLanguageCodes((prev) => [...prev, code]);
                  setLanguageLabels((prev) => ({ ...prev, [code]: label }));
                }}
                className="px-4 py-2 border-2 border-black font-black"
              >
                Ajouter langue
              </button>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              La base enregistre déjà chaque langue sous la forme <code>code::label</code> (abréviation + nom complet).
            </p>
            <div className="space-y-2">
              {activeLanguageCodes.map((code) => {
                const label = languageLabels[code] || DEFAULT_LANGUAGE_LABELS[code] || code.toUpperCase();
                return (
                  <div
                    key={code}
                    className="grid grid-cols-1 md:grid-cols-[1fr_160px_auto] gap-2 items-center border border-gray-200 rounded p-2 bg-white"
                  >
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Nom complet</label>
                      <input
                        type="text"
                        value={label}
                        onChange={(e) =>
                          setLanguageLabels((prev) => ({
                            ...prev,
                            [code]: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Abréviation</label>
                      <input
                        type="text"
                        value={code.toUpperCase()}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-700"
                      />
                    </div>
                    <div className="flex justify-end">
                      {code !== "fr" && (
                        <button
                          type="button"
                          onClick={() => {
                            const confirmDelete = window.confirm(
                              "Êtes-vous sûr ? Cela supprimera toutes les traductions associées à cette langue."
                            );
                            if (!confirmDelete) return;
                            setActiveLanguageCodes((prev) => prev.filter((item) => item !== code));
                            setLanguageLabels((prev) => {
                              const next = { ...prev };
                              delete next[code];
                              return next;
                            });
                            setNewSideI18n((prev) => {
                              const next = { ...prev };
                              delete next[code];
                              return next;
                            });
                            setSideFormI18n((prev) => {
                              const next = { ...prev };
                              delete next[code];
                              return next;
                            });
                            setDishExtraDraft((prev) => {
                              const nextNames = { ...(prev.names_i18n || {}) };
                              delete nextNames[code];
                              return { ...prev, names_i18n: nextNames };
                            });
                            setFormData((prev) => {
                              const nextNameI18n = { ...prev.name_i18n };
                              const nextDescriptionI18n = { ...prev.description_i18n };
                              delete nextNameI18n[code];
                              delete nextDescriptionI18n[code];
                              const nextExtras = prev.extras_list.map((extra) => {
                                const nextNames = { ...(extra.names_i18n || {}) };
                                delete nextNames[code];
                                return { ...extra, names_i18n: nextNames };
                              });
                              return {
                                ...prev,
                                name_i18n: nextNameI18n,
                                description_i18n: nextDescriptionI18n,
                                extras_list: nextExtras,
                              };
                            });
                          }}
                          className="text-red-600 font-black p-2"
                          title={`Retirer ${label}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
