// @ts-nocheck
import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type ManagerAppearanceFontPanelProps = {
  [key: string]: any;
};

export default function ManagerAppearanceFontPanel(props: ManagerAppearanceFontPanelProps) {
  const {
    MENU_FONT_OPTIONS = [],
    activeManagerTab = "menu",
    normalizeManagerFontFamily = (value: any) => String(value || "Montserrat"),
    openManagerPanels = { font: false, languages: false, allergens: false, cooking: false },
    restaurantForm = { font_family: "Montserrat" },
    setRestaurantForm = () => undefined,
    toggleManagerPanel = () => undefined,
  } = props;

  return (
<>
            <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
              <button
                type="button"
                onClick={() => toggleManagerPanel("font")}
                className="w-full flex items-center justify-between px-3 py-2 text-left font-black"
              >
                <span>Police du menu</span>
                {openManagerPanels.font ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${openManagerPanels.font ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}
              >
                <div className="px-3 pb-3">
                  <style
                    dangerouslySetInnerHTML={{
                      __html: `
                        .manager-font-preview-live {
                          font-family: ${JSON.stringify(normalizeManagerFontFamily(restaurantForm.font_family))}, sans-serif !important;
                        }
                        ${MENU_FONT_OPTIONS.map(
                          (fontName) =>
                            `.manager-font-select option[data-font-option="${fontName.replace(/"/g, '"')}"] { font-family: ${JSON.stringify(fontName)}, sans-serif !important; }`
                        ).join("\n")}
                      `,
                    }}
                  />
                  <select
                    value={restaurantForm.font_family}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, font_family: e.target.value })}
                    className="manager-font-select w-full px-3 py-2 bg-white text-black border border-gray-300 rounded"
                    style={{ fontFamily: normalizeManagerFontFamily(restaurantForm.font_family) }}
                  >
                    {MENU_FONT_OPTIONS.map((fontName) => (
                      <option key={fontName} value={fontName} data-font-option={fontName} style={{ fontFamily: fontName }}>
                        {fontName}
                      </option>
                    ))}
                  </select>
                  <p
                    className="manager-font-preview-live mt-2 text-sm text-gray-700 border border-gray-200 rounded px-3 py-2 bg-gray-50"
                    style={{ fontFamily: normalizeManagerFontFamily(restaurantForm.font_family) }}
                  >
                    Aper&ccedil;u du texte : La carte de mon restaurant
                  </p>
                </div>
              </div>
            </div>
</>
  );
}
