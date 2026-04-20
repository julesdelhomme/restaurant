// @ts-nocheck
import React, { useState } from "react";
import ManagerAppearanceFontPanel from "./ManagerAppearanceFontPanel";

type AppearanceUIProps = {
  [key: string]: any;
};

export default function AppearanceUI(props: AppearanceUIProps) {
  const {
    MENU_FONT_OPTIONS = [],
    activeManagerTab = "menu",
    bannerColorLabel = "Couleur principale",
    bannerImageLabel = "Banniere",
    consultationModeEnabled = false,
    dishCardsColorLabel = "Fond carte",
    dishCardsOpacityLabel = "Opacite carte",
    dishCardsTextColorLabel = "Texte carte",
    globalTextColorLabel = "Couleur texte",
    handleSaveRestaurant = () => undefined,
    isUploadingRestaurantBackground = false,
    isUploadingRestaurantBanner = false,
    isUploadingRestaurantLogo = false,
    isUploadingRestaurantWelcome = false,
    normalizeCardStyle = (value: any) => String(value || "rounded"),
    normalizeManagerFontFamily = (value: any) => String(value || "Montserrat"),
    normalizeOpacityPercent = (value: any) => Number(value || 0),
    normalizeWelcomePopupType = (value: any) => String(value || "none"),
    openManagerPanels = { font: false, languages: false, allergens: false, cooking: false },
    restaurantForm = { name: "", font_family: "Montserrat", primary_color: "#111111" },
    restaurantSaveStatus = "idle",
    searchBarEnabled = false,
    setConsultationModeEnabled = () => undefined,
    setRestaurantForm = () => undefined,
    setSearchBarEnabled = () => undefined,
    setShowCaloriesClient = () => undefined,
    showCaloriesClient = false,
    toggleManagerPanel = () => undefined,
    uploadRestaurantAsset = async () => undefined,
  } = props;

  const [isLegalSectionOpen, setIsLegalSectionOpen] = useState(false);

  return (
    <div className={`bg-white rounded-xl shadow-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 ${activeManagerTab === "appearance" ? "" : "hidden"}`}>
      <div className={activeManagerTab === "appearance" ? "md:col-span-2 border-b border-gray-200 pb-2" : "hidden"}>
        <h3 className="text-base font-black text-black">Design et style</h3>
        <p className="text-xs font-semibold text-gray-600 mt-1">Couleurs, polices, densite/cartes et identite visuelle.</p>
      </div>

      <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
        <label className="block mb-1 font-bold">Nom du restaurant</label>
        <input
          type="text"
          value={restaurantForm.name}
          onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
          className="w-full px-3 py-2 bg-white text-black border border-gray-300"
        />
      </div>

      <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
        <label className="block mb-1 font-bold">Nom affiche sur la page client</label>
        <input
          type="text"
          value={String((restaurantForm as any).restaurant_name || "")}
          onChange={(e) =>
            setRestaurantForm({
              ...restaurantForm,
              restaurant_name: e.target.value,
            })
          }
          placeholder="Ex: Elemdho Paris"
          className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded"
        />
        <label className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-black">
          <input
            type="checkbox"
            checked={Boolean((restaurantForm as any).show_restaurant_name_on_client)}
            onChange={(e) =>
              setRestaurantForm({
                ...restaurantForm,
                show_restaurant_name_on_client: e.target.checked,
              })
            }
          />
          Afficher le nom sur la page client
        </label>
      </div>

      <div className={activeManagerTab === "appearance" ? "md:col-span-2 border border-gray-200 rounded bg-white p-3" : "hidden"}>
        <button
          type="button"
          onClick={() => setIsLegalSectionOpen((prev) => !prev)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <div className="text-sm font-black text-black">Reglement Interieur & Mentions Legales</div>
            <p className="mt-1 text-xs text-gray-600 font-semibold">
              Ce bloc vous permet d'ajouter les regles internes de votre etablissement affichees au client.
            </p>
          </div>
          <span className="ml-3 text-xs font-black text-gray-700">{isLegalSectionOpen ? "Masquer" : "Afficher"}</span>
        </button>

        {isLegalSectionOpen ? (
          <>
            <div className="mt-3">
              <label className="block mb-1 text-sm font-bold text-black">Reglement de l'etablissement (modifiable)</label>
              <textarea
                value={String((restaurantForm as any).custom_legal_notice || "")}
                onChange={(e) =>
                  setRestaurantForm({
                    ...restaurantForm,
                    custom_legal_notice: e.target.value,
                  })
                }
                rows={5}
                placeholder="Ex: Les animaux ne sont pas autorises en salle. Merci de respecter le calme apres 22h."
                className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded font-semibold"
              />
            </div>

            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-black uppercase tracking-[0.12em] text-gray-600">Mentions legales Elemdho (lecture seule)</div>
              <p className="mt-2 text-xs leading-relaxed text-gray-700">
                L'application Elemdho est editee par Jules Delhomme, domicilie au 18 rue des primeveres, 67600 Muttersholtz.
                Contact : support@elemdho.fr.
                <br />
                Hebergement : La partie interface est hebergee par Vercel Inc. (San Francisco, USA) et la base de donnees
                par Supabase Inc. (San Francisco, USA).
              </p>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => void handleSaveRestaurant?.()}
                disabled={restaurantSaveStatus === "saving"}
                className={`px-4 py-2 rounded-lg border-2 border-black font-black text-sm ${
                  restaurantSaveStatus === "success" ? "bg-green-600 text-white" : "bg-black text-white"
                } disabled:opacity-60`}
              >
                {restaurantSaveStatus === "saving" ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
            </div>
          </>
        ) : null}
      </div>

      <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
        <label className="block mb-1 font-bold">Logo (upload)</label>
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const inputEl = e.target as HTMLInputElement | null;
            const file = e.target.files?.[0];
            if (!file) return;
            await uploadRestaurantAsset("logo", file);
            if (inputEl) inputEl.value = "";
          }}
          className="w-full px-3 py-2 bg-white text-black border border-gray-300"
          disabled={isUploadingRestaurantLogo}
        />
        {restaurantForm.logo_url ? (
          <div className="mt-2 flex items-center gap-3">
            <img
              src={restaurantForm.logo_url}
              alt="Apercu logo"
              className="h-12 w-12 object-contain border border-gray-200 bg-white"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <span className="text-xs text-gray-600 break-all">{restaurantForm.logo_url}</span>
          </div>
        ) : null}
        {isUploadingRestaurantLogo ? <p className="mt-1 text-xs text-gray-600">Upload du logo...</p> : null}
      </div>

      <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
        <label className="block mb-1 font-bold">{bannerImageLabel}</label>
        <p className="mb-1 text-xs text-gray-600">Banniere : 1200x400px conseille</p>
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const inputEl = e.target as HTMLInputElement | null;
            const file = e.target.files?.[0];
            if (!file) return;
            await uploadRestaurantAsset("banner", file);
            if (inputEl) inputEl.value = "";
          }}
          className="w-full px-3 py-2 bg-white text-black border border-gray-300"
          disabled={isUploadingRestaurantBanner}
        />
        {isUploadingRestaurantBanner ? <p className="mt-1 text-xs text-gray-600">Upload de la banniere...</p> : null}
      </div>

      <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
        {String((restaurantForm as any).banner_image_url || "").trim() ? (
          <div className="mt-2">
            <img
              src={String((restaurantForm as any).banner_image_url || "")}
              alt="Apercu banniere"
              className="h-20 w-full object-cover border border-gray-200 bg-white rounded"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <span className="mt-1 block text-xs text-gray-600 break-all">{String((restaurantForm as any).banner_image_url || "")}</span>
          </div>
        ) : (
          <div className="h-full flex items-end">
            <p className="text-xs text-gray-500">Aucune banniere uploadee.</p>
          </div>
        )}
      </div>

      <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
        <label className="block mb-1 font-bold">Image de fond (upload)</label>
        <p className="mb-1 text-xs text-gray-600">Format portrait conseille (ex: 1080x1920px).</p>
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const inputEl = e.target as HTMLInputElement | null;
            const file = e.target.files?.[0];
            if (!file) return;
            await uploadRestaurantAsset("background", file);
            if (inputEl) inputEl.value = "";
          }}
          className="w-full px-3 py-2 bg-white text-black border border-gray-300"
          disabled={isUploadingRestaurantBackground}
        />
        {restaurantForm.background_url ? (
          <div className="mt-2">
            <img
              src={restaurantForm.background_url}
              alt="Apercu fond"
              className="h-20 w-full object-cover border border-gray-200 bg-white rounded"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <span className="mt-1 block text-xs text-gray-600 break-all">{restaurantForm.background_url}</span>
          </div>
        ) : null}
        {isUploadingRestaurantBackground ? <p className="mt-1 text-xs text-gray-600">Upload du fond...</p> : null}
      </div>

      <div className={activeManagerTab === "appearance" ? "md:col-span-2 border border-gray-200 rounded bg-white p-3" : "hidden"}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-black">Message de bienvenue</div>
            <p className="text-xs font-semibold text-gray-600 mt-0.5">Affiche un popup d'onboarding a l'arrivee du client.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean((restaurantForm as any).welcome_popup_enabled)}
              onChange={(e) =>
                setRestaurantForm({
                  ...restaurantForm,
                  welcome_popup_enabled: e.target.checked,
                })
              }
              className="sr-only peer"
            />
            <span className="h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-black" />
            <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </label>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block mb-1 text-sm font-bold text-black">Type de popup</label>
            <select
              value={normalizeWelcomePopupType((restaurantForm as any).welcome_popup_type)}
              onChange={(e) =>
                setRestaurantForm({
                  ...restaurantForm,
                  welcome_popup_type: normalizeWelcomePopupType(e.target.value),
                })
              }
              className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded font-semibold"
            >
              <option value="text">Texte</option>
              <option value="image">Image</option>
            </select>
          </div>
        </div>

        {normalizeWelcomePopupType((restaurantForm as any).welcome_popup_type) === "text" ? (
          <div className="mt-3">
            <label className="block mb-1 text-sm font-bold text-black">Contenu texte</label>
            <textarea
              value={String((restaurantForm as any).welcome_popup_content_text || "")}
              onChange={(e) =>
                setRestaurantForm({
                  ...restaurantForm,
                  welcome_popup_content_text: e.target.value,
                })
              }
              rows={4}
              placeholder="Bienvenue chez nous. Decouvrez notre carte et nos suggestions du moment."
              className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded font-semibold"
            />
          </div>
        ) : (
          <div className="mt-3">
            <label className="block mb-1 text-sm font-bold text-black">Image du popup (upload)</label>
            <p className="mb-1 text-xs text-gray-600">Format conseille: 1080x1920 ou 4:5.</p>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const inputEl = e.target as HTMLInputElement | null;
                const file = e.target.files?.[0];
                if (!file) return;
                await uploadRestaurantAsset("welcome", file);
                if (inputEl) inputEl.value = "";
              }}
              className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded"
              disabled={isUploadingRestaurantWelcome}
            />
            {String((restaurantForm as any).welcome_popup_image_url || "").trim() ? (
              <div className="mt-2">
                <img
                  src={String((restaurantForm as any).welcome_popup_image_url || "")}
                  alt="Apercu popup bienvenue"
                  className="h-32 w-full object-contain border border-gray-200 bg-white rounded"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
                <span className="mt-1 block text-xs text-gray-600 break-all">{String((restaurantForm as any).welcome_popup_image_url || "")}</span>
              </div>
            ) : null}
            {isUploadingRestaurantWelcome ? <p className="mt-1 text-xs text-gray-600">Upload du popup...</p> : null}
          </div>
        )}
      </div>

      <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
        <label className="block mb-1 font-bold">{bannerColorLabel}</label>
        <input
          type="color"
          value={restaurantForm.primary_color}
          onChange={(e) => setRestaurantForm({ ...restaurantForm, primary_color: e.target.value })}
          className="w-full h-10 bg-white text-black border border-gray-300"
        />
      </div>

      <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
        <label className="block mb-1 font-bold">{globalTextColorLabel}</label>
        <input
          type="color"
          value={String((restaurantForm as any).text_color || "#111111")}
          onChange={(e) => setRestaurantForm({ ...restaurantForm, text_color: e.target.value })}
          className="w-full h-10 bg-white text-black border border-gray-300"
        />
      </div>

      <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
        <label className="block mb-1 font-bold">{dishCardsColorLabel}</label>
        <input
          type="color"
          value={String((restaurantForm as any).card_bg_color || "#FFFFFF")}
          onChange={(e) => setRestaurantForm({ ...restaurantForm, card_bg_color: e.target.value })}
          className="w-full h-10 bg-white text-black border border-gray-300"
        />
      </div>

      <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
        <label className="block mb-1 font-bold">{dishCardsOpacityLabel}</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Number((restaurantForm as any).card_bg_opacity ?? 100)}
            onChange={(e) =>
              setRestaurantForm({
                ...restaurantForm,
                card_bg_opacity: normalizeOpacityPercent(e.target.value, 100),
              })
            }
            className="flex-1"
          />
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={Number((restaurantForm as any).card_bg_opacity ?? 100)}
            onChange={(e) =>
              setRestaurantForm({
                ...restaurantForm,
                card_bg_opacity: normalizeOpacityPercent(e.target.value, 100),
              })
            }
            className="w-20 px-2 py-2 bg-white text-black border border-gray-300 rounded font-bold"
          />
          <span className="text-sm font-bold">%</span>
        </div>
      </div>

      <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
        <label className="block mb-1 font-bold">{dishCardsTextColorLabel}</label>
        <input
          type="color"
          value={String((restaurantForm as any).card_text_color || "#111111")}
          onChange={(e) => setRestaurantForm({ ...restaurantForm, card_text_color: e.target.value })}
          className="w-full h-10 bg-white text-black border border-gray-300"
        />
      </div>

      <label className={`flex items-center gap-2 text-sm font-bold text-black ${activeManagerTab === "appearance" ? "" : "hidden"}`}>
        <input
          type="checkbox"
          checked={Boolean((restaurantForm as any).card_transparent)}
          onChange={(e) =>
            setRestaurantForm({
              ...restaurantForm,
              card_transparent: e.target.checked,
              card_bg_opacity: e.target.checked ? 0 : Math.max(Number((restaurantForm as any).card_bg_opacity ?? 0), 100),
            })
          }
        />
        Fond transparent
      </label>

      <div className={activeManagerTab === "appearance" ? "md:col-span-2 border-t border-gray-200 pt-2" : "hidden"}>
        <h3 className="text-base font-black text-black">Configuration de commande</h3>
        <p className="text-xs font-semibold text-gray-600 mt-1">Toggles visuels et ergonomie cote client.</p>
      </div>

      <div className={`${activeManagerTab === "appearance" ? "border border-gray-200 rounded bg-white" : "hidden"}`}>
        <label className="flex items-start gap-2 text-sm font-bold text-black">
          <input
            type="checkbox"
            checked={Boolean((restaurantForm as any).quick_add_to_cart_enabled)}
            onChange={(e) =>
              setRestaurantForm({
                ...restaurantForm,
                quick_add_to_cart_enabled: e.target.checked,
              })
            }
            className="mt-0.5"
          />
          <span>
            <span className="block">Activer l'ajout rapide au panier</span>
            <span className="mt-0.5 block text-xs font-semibold text-gray-600">
              Permet aux clients d'ajouter un article directement depuis la liste des plats.
            </span>
          </span>
        </label>
      </div>

      <div className={`${activeManagerTab === "appearance" ? "md:col-span-2 border border-gray-200 rounded bg-white p-3" : "hidden"}`}>
        <div className="text-sm font-black text-black mb-2">Commande client</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-start gap-2 text-sm font-bold text-black">
            <input
              type="checkbox"
              checked={showCaloriesClient}
              onChange={(e) => setShowCaloriesClient(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="block">Afficher les kilocalories (kcal)</span>
              <span className="mt-0.5 block text-xs font-semibold text-gray-600">Si desactive, les calories sont masquees.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm font-bold text-black">
            <input
              type="checkbox"
              checked={Boolean((restaurantForm as any).category_drawer_enabled)}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, category_drawer_enabled: e.target.checked })}
              className="mt-0.5"
            />
            <span>
              <span className="block">Activer le menu lateral des categories (mobile)</span>
              <span className="mt-0.5 block text-xs font-semibold text-gray-600">Affiche un tiroir de navigation sur telephone.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm font-bold text-black">
            <input
              type="checkbox"
              checked={consultationModeEnabled}
              onChange={(e) => setConsultationModeEnabled(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="block">Mode commande serveur</span>
              <span className="mt-0.5 block text-xs font-semibold text-gray-600">Desactive l'ajout au panier cote client.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm font-bold text-black">
            <input
              type="checkbox"
              checked={Boolean((restaurantForm as any).keep_suggestions_on_top)}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, keep_suggestions_on_top: e.target.checked })}
              className="mt-0.5"
            />
            <span>
              <span className="block">Garder les suggestions en haut</span>
              <span className="mt-0.5 block text-xs font-semibold text-gray-600">Les suggestions restent visibles en haut de la liste.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm font-bold text-black">
            <input
              type="checkbox"
              checked={searchBarEnabled}
              onChange={(e) => setSearchBarEnabled(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="block">Activer la barre de recherche</span>
              <span className="mt-0.5 block text-xs font-semibold text-gray-600">Affiche une recherche instantanee cote client.</span>
            </span>
          </label>
        </div>
      </div>

      <ManagerAppearanceFontPanel
        MENU_FONT_OPTIONS={MENU_FONT_OPTIONS}
        activeManagerTab={activeManagerTab}
        normalizeManagerFontFamily={normalizeManagerFontFamily}
        openManagerPanels={openManagerPanels}
        restaurantForm={restaurantForm}
        setRestaurantForm={setRestaurantForm}
        toggleManagerPanel={toggleManagerPanel}
      />

      <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
        <label className="block mb-1 font-bold">Style des cartes (coins)</label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRestaurantForm((prev) => ({ ...prev, card_style: "rounded" }))}
            className={`px-3 py-2 border-2 font-black rounded ${
              normalizeCardStyle((restaurantForm as any).card_style) === "rounded" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"
            }`}
          >
            Moderne / Arrondi
          </button>
          <button
            type="button"
            onClick={() => setRestaurantForm((prev) => ({ ...prev, card_style: "sharp" }))}
            className={`px-3 py-2 border-2 font-black rounded ${
              normalizeCardStyle((restaurantForm as any).card_style) === "sharp" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"
            }`}
          >
            Elegant / Pointu
          </button>
        </div>
      </div>
    </div>
  );
}
