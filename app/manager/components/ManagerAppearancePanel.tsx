// @ts-nocheck
import React, { useState } from "react";
import { ChevronDown, ChevronRight, Printer, X } from "lucide-react";
import ManagerAppearanceFontPanel from "./ManagerAppearanceFontPanel";
import ManagerAppearanceLanguagesPanel from "./ManagerAppearanceLanguagesPanel";
import ManagerAppearanceCookingPanel from "./ManagerAppearanceCookingPanel";
import ManagerAppearanceAllergensPanel from "./ManagerAppearanceAllergensPanel";

type ManagerAppearancePanelProps = {
  [key: string]: any;
};

export default function ManagerAppearancePanel(props: ManagerAppearancePanelProps) {
  const {
    COOKING_TRANSLATION_ORDER,
    DEFAULT_COOKING_TRANSLATIONS,
    DEFAULT_LANGUAGE_LABELS,
    MAX_TOTAL_TABLES,
    MENU_FONT_OPTIONS,
    PREDEFINED_LANGUAGE_OPTIONS,
    activeLanguageCodes,
    activeManagerTab,
    allergenLibrary,
    autoPrintKitchen,
    bannerColorLabel,
    bannerImageLabel,
    consultationModeEnabled,
    cookingTranslations,
    createLocalId,
    dishCardsColorLabel,
    dishCardsOpacityLabel,
    dishCardsTextColorLabel,
    globalTextColorLabel,
    handleDeleteAllergen,
    handleSaveRestaurant,
    heroBadgeType,
    heroEnabled,
    isUploadingRestaurantBackground,
    isUploadingRestaurantBanner,
    isUploadingRestaurantLogo,
    isUploadingRestaurantWelcome,
    languageLabels,
    languagePresetToAdd,
    newAllergenFr,
    normalizeCardStyle,
    normalizeLanguageKey,
    normalizeManagerFontFamily,
    normalizeOpacityPercent,
    normalizeText,
    normalizeTotalTables,
    normalizeWelcomePopupType,
    openManagerPanels,
    restaurantForm,
    searchBarEnabled,
    setActiveLanguageCodes,
    setAllergenLibrary,
    setAutoPrintKitchen,
    setConsultationModeEnabled,
    setCookingTranslations,
    setDishExtraDraft,
    setFormData,
    setHeroBadgeType,
    setHeroEnabled,
    setLanguageLabels,
    setLanguagePresetToAdd,
    setNewAllergenFr,
    setNewSideI18n,
    setRestaurantForm,
    setSearchBarEnabled,
    setShowCaloriesClient,
    setSideFormI18n,
    setTotalTables,
    showCaloriesClient,
    restaurantSaveStatus,
    toggleManagerPanel,
    totalTables,
    uploadRestaurantAsset,
  } = props;
  const [isLegalSectionOpen, setIsLegalSectionOpen] = useState(false);

  return (
          <div className={`bg-white rounded-xl shadow-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 ${activeManagerTab === "menu" || activeManagerTab === "appearance" ? "" : "hidden"}`}>
            <div className={activeManagerTab === "appearance" ? "md:col-span-2 border-b border-gray-200 pb-2" : "hidden"}>
              <h3 className="text-base font-black text-black">?? Design et style</h3>
              <p className="text-xs font-semibold text-gray-600 mt-1">Couleurs, polices, densité/cartes et identité visuelle.</p>
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
              <label className="block mb-1 font-bold">Nom affiché sur la page client</label>
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
                  <div className="text-sm font-black text-black">Règlement Intérieur & Mentions Légales</div>
                  <p className="mt-1 text-xs text-gray-600 font-semibold">
                    Ce bloc vous permet d&apos;ajouter les règles internes de votre établissement affichées au client.
                  </p>
                </div>
                <span className="ml-3 text-xs font-black text-gray-700">
                  {isLegalSectionOpen ? "Masquer" : "Afficher"}
                </span>
              </button>

              {isLegalSectionOpen ? (
                <>
                  <div className="mt-3">
                    <label className="block mb-1 text-sm font-bold text-black">Règlement de l&apos;établissement (modifiable)</label>
                    <textarea
                      value={String((restaurantForm as any).custom_legal_notice || "")}
                      onChange={(e) =>
                        setRestaurantForm({
                          ...restaurantForm,
                          custom_legal_notice: e.target.value,
                        })
                      }
                      rows={5}
                      placeholder="Ex: Les animaux ne sont pas autorisés en salle. Merci de respecter le calme après 22h."
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded font-semibold"
                    />
                  </div>

                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="text-xs font-black uppercase tracking-[0.12em] text-gray-600">Mentions légales Elemdho (lecture seule)</div>
                    <p className="mt-2 text-xs leading-relaxed text-gray-700">
                      L&apos;application Elemdho est éditée par Jules Delhomme, domicilié au 18 rue des primevères, 67600 Muttersholtz.
                      Contact : support@elemdho.fr.
                      <br />
                      Hébergement : La partie interface est hébergée par Vercel Inc. (San Francisco, USA) et la base de données par Supabase Inc. (San Francisco, USA).
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
                      {restaurantSaveStatus === "saving"
                        ? "Enregistrement..."
                        : "Enregistrer les modifications"}
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
                    alt="Aperçu logo"
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
              <p className="mb-1 text-xs text-gray-600">Bannière : 1200x400px conseillé</p>
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
              {isUploadingRestaurantBanner ? <p className="mt-1 text-xs text-gray-600">Upload de la bannière...</p> : null}
            </div>
            <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
              {String((restaurantForm as any).banner_image_url || "").trim() ? (
                <div className="mt-2">
                  <img
                    src={String((restaurantForm as any).banner_image_url || "")}
                    alt="Aperçu bannière"
                    className="h-20 w-full object-cover border border-gray-200 bg-white rounded"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                  <span className="mt-1 block text-xs text-gray-600 break-all">
                    {String((restaurantForm as any).banner_image_url || "")}
                  </span>
                </div>
              ) : (
                <div className="h-full flex items-end">
                  <p className="text-xs text-gray-500">Aucune bannière uploadée.</p>
                </div>
              )}
            </div>
            <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
              <label className="block mb-1 font-bold">Image de fond (upload)</label>
              <p className="mb-1 text-xs text-gray-600">Format Portrait conseillé (ex: 1080x1920px) pour remplir tout l&apos;écran du téléphone.</p>
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
                    alt="Aperçu fond"
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
                  <div className="text-sm font-black text-black">Message de Bienvenue</div>
                  <p className="text-xs font-semibold text-gray-600 mt-0.5">
                    Affiche un popup d&apos;onboarding à l&apos;arrivée du client.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean((restaurantForm as any).welcome_popup_enabled)}
                    onChange={(e) =>
                      setRestaurantForm({ ...restaurantForm, welcome_popup_enabled: e.target.checked })
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
                    placeholder="Bienvenue chez nous. Découvrez notre carte et nos suggestions du moment."
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded font-semibold"
                  />
                </div>
              ) : (
                <div className="mt-3">
                  <label className="block mb-1 text-sm font-bold text-black">Image du popup (upload)</label>
                  <p className="mb-1 text-xs text-gray-600">Format conseillé: 1080x1920 ou 4:5. Stockage bucket: banners.</p>
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
                        alt="Aperçu popup bienvenue"
                        className="h-32 w-full object-contain border border-gray-200 bg-white rounded"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                      <span className="mt-1 block text-xs text-gray-600 break-all">
                        {String((restaurantForm as any).welcome_popup_image_url || "")}
                      </span>
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
                    card_bg_opacity: e.target.checked
                      ? 0
                      : Math.max(Number((restaurantForm as any).card_bg_opacity ?? 0), 100),
                  })
                }
              />
              Fond transparent
            </label>
            <div className={activeManagerTab === "appearance" ? "md:col-span-2 border-t border-gray-200 pt-2" : "hidden"}>
              <h3 className="text-base font-black text-black">?? Configuration de commande</h3>
              <p className="text-xs font-semibold text-gray-600 mt-1">Mode serveur, suggestions, menu latéral et affichage kcal.</p>
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
                  <span className="block">Activer l&apos;ajout rapide au panier</span>
                  <span className="mt-0.5 block text-xs font-semibold text-gray-600">
                    Permet aux clients d&apos;ajouter un article directement depuis la liste des plats sans ouvrir la fiche détaillée.
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
                    <span className="mt-0.5 block text-xs font-semibold text-gray-600">
                      Si désactivé, les calories sont masquées sur la carte client.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm font-bold text-black">
                  <input
                    type="checkbox"
                    checked={Boolean((restaurantForm as any).category_drawer_enabled)}
                    onChange={(e) =>
                      setRestaurantForm({ ...restaurantForm, category_drawer_enabled: e.target.checked })
                    }
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block">Activer le menu latéral des catégories (mobile)</span>
                    <span className="mt-0.5 block text-xs font-semibold text-gray-600">
                      Affiche un tiroir pour naviguer rapidement entre les catégories sur téléphone.
                    </span>
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
                    <span className="mt-0.5 block text-xs font-semibold text-gray-600">
                      Désactive l&apos;ajout au panier et le tunnel de commande côté client.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm font-bold text-black">
                  <input
                    type="checkbox"
                    checked={Boolean((restaurantForm as any).keep_suggestions_on_top)}
                    onChange={(e) =>
                      setRestaurantForm({ ...restaurantForm, keep_suggestions_on_top: e.target.checked })
                    }
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block">Garder les suggestions en haut</span>
                    <span className="mt-0.5 block text-xs font-semibold text-gray-600">
                      Les suggestions restent visibles en haut même lorsqu&apos;une catégorie est sélectionnée.
                    </span>
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
                    <span className="mt-0.5 block text-xs font-semibold text-gray-600">
                      Affiche une loupe fixe et une recherche instantanée côté client.
                    </span>
                  </span>
                </label>
              </div>
            </div>
            <div className={`${activeManagerTab === "appearance" ? "md:col-span-2 border border-gray-200 rounded bg-white p-3" : "hidden"}`}>
              <div className="text-sm font-black text-black mb-2">?? Horaires de service</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-black uppercase">Midi</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={String((restaurantForm as any).service_lunch_start || "")}
                      onChange={(e) =>
                        setRestaurantForm({ ...restaurantForm, service_lunch_start: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded"
                    />
                    <span className="text-xs font-black text-gray-600">?</span>
                    <input
                      type="time"
                      value={String((restaurantForm as any).service_lunch_end || "")}
                      onChange={(e) =>
                        setRestaurantForm({ ...restaurantForm, service_lunch_end: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded"
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-1 text-xs font-black uppercase">Soir</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={String((restaurantForm as any).service_dinner_start || "")}
                      onChange={(e) =>
                        setRestaurantForm({ ...restaurantForm, service_dinner_start: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded"
                    />
                    <span className="text-xs font-black text-gray-600">?</span>
                    <input
                      type="time"
                      value={String((restaurantForm as any).service_dinner_end || "")}
                      onChange={(e) =>
                        setRestaurantForm({ ...restaurantForm, service_dinner_end: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-600 font-semibold">
                Ces horaires pilotent l&apos;affichage global des plats si une disponibilité spécifique n&apos;est pas définie.
              </p>
            </div>
            <ManagerAppearanceFontPanel {...props} />
            <div className="hidden">
              <label className="block mb-1 font-bold">Disposition des cartes (menu client)</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRestaurantForm((prev) => ({ ...prev, menu_layout: "classic_grid" }))}
                  className={`px-3 py-2 border-2 font-black rounded ${String((restaurantForm as any).menu_layout || "classic_grid") === "classic_grid" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"}`}
                >
                  Classique (image en haut)
                </button>
                <button
                  type="button"
                  onClick={() => setRestaurantForm((prev) => ({ ...prev, menu_layout: "modern_list" }))}
                  className={`px-3 py-2 border-2 font-black rounded ${String((restaurantForm as any).menu_layout || "classic_grid") === "modern_list" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"}`}
                >
                  Compact (image ? gauche)
                </button>
              </div>
            </div>
            <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
              <label className="block mb-1 font-bold">Style des cartes (coins)</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRestaurantForm((prev) => ({ ...prev, card_style: "rounded" }))}
                  className={`px-3 py-2 border-2 font-black rounded ${normalizeCardStyle((restaurantForm as any).card_style) === "rounded" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"}`}
                >
                  Moderne / Arrondi
                </button>
                <button
                  type="button"
                  onClick={() => setRestaurantForm((prev) => ({ ...prev, card_style: "sharp" }))}
                  className={`px-3 py-2 border-2 font-black rounded ${normalizeCardStyle((restaurantForm as any).card_style) === "sharp" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"}`}
                >
                  Élégant / Pointu
                </button>
              </div>
            </div>
            <div id="manager-google-review-config" className={activeManagerTab === "appearance" ? "" : "hidden"}>
              <label className="block mb-1 font-bold">Lien Google Review</label>
              <input
                type="url"
                value={String((restaurantForm as any).google_review_url || "")}
                onChange={(e) => setRestaurantForm({ ...restaurantForm, google_review_url: e.target.value })}
                placeholder="https://g.page/r/.../review"
                className="w-full px-3 py-2 bg-white text-black border border-gray-300"
              />
              <p className="mt-1 text-xs text-gray-600">
                Utilisé pour le bouton Google affiché aux clients après un avis de 4 ou 5 étoiles.
              </p>
            </div>
            <div id="manager-email-config" className={activeManagerTab === "appearance" ? "md:col-span-2 border border-gray-200 rounded bg-white p-3" : "hidden"}>
              <div className="mb-3">
                <div>
                  <div className="font-black">?? Paramètres d&apos;affichage</div>
                  <p className="text-sm text-gray-600 mt-1">
                    Utilisez un mot de passe d&apos;application Gmail pour sécuriser l&apos;envoi des tickets de caisse.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block mb-1 font-bold">Adresse du restaurant</label>
                  <input
                    type="text"
                    value={String(restaurantForm.address || "")}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
                    placeholder="Ex: 12 Rue de la Paix, 75002 Paris"
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                  <p className="mt-1 text-xs text-gray-600">
                    Cette adresse est injectée automatiquement sur les tickets (impression et e-mail), sous le nom du restaurant.
                  </p>
                </div>
                <div>
                  <label className="block mb-1 font-bold">Gmail SMTP (adresse)</label>
                  <input
                    type="email"
                    value={restaurantForm.smtp_user}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, smtp_user: e.target.value })}
                    placeholder="ex: restaurant@gmail.com"
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold">Mot de passe d&apos;application Gmail (16 caractères)</label>
                  <input
                    type="password"
                    value={restaurantForm.smtp_password}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, smtp_password: e.target.value })}
                    placeholder="Laisser vide pour conserver l&apos;existant"
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold">Objet de l&apos;e-mail</label>
                  <input
                    type="text"
                    value={restaurantForm.email_subject}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, email_subject: e.target.value })}
                    placeholder="Votre ticket de caisse - [Nom du Resto]"
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold">Message (début de l&apos;e-mail)</label>
                  <textarea
                    value={restaurantForm.email_body_header}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, email_body_header: e.target.value })}
                    placeholder="Merci de votre visite ! Voici votre ticket :"
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                    rows={2}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-1 font-bold">Message / pied de page</label>
                  <textarea
                    value={restaurantForm.email_footer}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, email_footer: e.target.value })}
                    placeholder="À bientôt !"
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                    rows={3}
                  />
                </div>
                <details className="md:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <summary className="cursor-pointer font-black text-blue-950">
                    Comment configurer votre envoi de mail ?
                  </summary>
                  <div className="mt-3 space-y-2 text-sm text-blue-950">
                    <p><strong>Étape 1 :</strong> Créez une adresse Gmail dédiée ? votre restaurant.</p>
                    <p><strong>Étape 2 :</strong> Activez la &apos;Validation en deux Étapes&apos; dans les paramètres de sécurité Google.</p>
                    <p><strong>Étape 3 :</strong> Recherchez &apos;Mots de passe d&apos;application&apos; dans votre compte Google.</p>
                    <p><strong>Étape 4 :</strong> Générez un code pour &apos;Application de messagerie&apos;. Copiez ce code de 16 caractères.</p>
                    <p><strong>Étape 5 :</strong> Collez ce code dans le champ &apos;Mot de passe SMTP&apos; de votre interface Elemdho.</p>
                    <p className="pt-1 text-blue-900">
                      <strong>Note :</strong> Cela permet ? l&apos;application d&apos;envoyer les codes de sécurité à vos clients en toute sécurité.
                    </p>
                  </div>
                </details>
                <div id="manager-social-config" className="md:col-span-2 font-black">Réseaux Sociaux</div>
                <div>
                  <label className="block mb-1 font-bold">Instagram</label>
                  <input
                    type="url"
                    value={String((restaurantForm as any).instagram_url || "")}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, instagram_url: e.target.value })}
                    placeholder="https://instagram.com/..."
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold">Snapchat</label>
                  <input
                    type="url"
                    value={String((restaurantForm as any).snapchat_url || "")}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, snapchat_url: e.target.value })}
                    placeholder="https://snapchat.com/add/..."
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold">Facebook</label>
                  <input
                    type="url"
                    value={String((restaurantForm as any).facebook_url || "")}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, facebook_url: e.target.value })}
                    placeholder="https://facebook.com/..."
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold">X</label>
                  <input
                    type="url"
                    value={String((restaurantForm as any).x_url || "")}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, x_url: e.target.value })}
                    placeholder="https://x.com/..."
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-1 font-bold">Site Web</label>
                  <input
                    type="url"
                    value={String((restaurantForm as any).website_url || "")}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, website_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-black">
                    <input
                      type="checkbox"
                      checked={Boolean((restaurantForm as any).show_social_on_receipt)}
                      onChange={(e) =>
                        setRestaurantForm({ ...restaurantForm, show_social_on_receipt: e.target.checked })
                      }
                    />
                    Afficher les réseaux sociaux sur le reçu digital
                  </label>
                </div>
                </div>
            </div>
            <div className={activeManagerTab === "appearance" ? "md:col-span-2" : "hidden"}>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-bold">
                        <Printer className={`h-4 w-4 ${autoPrintKitchen ? "text-green-600" : "text-gray-500"}`} />
                        <span>Impression Automatique Cuisine</span>
                      </div>
                      <p className={`text-sm mt-1 ${autoPrintKitchen ? "text-green-700" : "text-gray-600"}`}>
                        {autoPrintKitchen
                          ? "Activée (Les tickets s'impriment dès qu'une commande arrive)"
                          : "Désactivée (Affichage sur écran uniquement)"}
                      </p>
                  </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={autoPrintKitchen}
                      onClick={() => setAutoPrintKitchen((prev) => !prev)}
                      className={`relative inline-flex h-8 w-16 items-center rounded-full border-2 transition ${autoPrintKitchen ? "border-green-700 bg-green-500" : "border-gray-400 bg-gray-300"}`}
                    >
                      <span className="sr-only">Impression Automatique Cuisine</span>
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${autoPrintKitchen ? "translate-x-8" : "translate-x-1"}`}
                      />
                    </button>
                </div>
              </div>
            </div>
            <div className={activeManagerTab === "appearance" ? "md:col-span-2" : "hidden"}>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <label className="block text-sm font-bold mb-1">Nombre total de tables</label>
                <input
                  type="number"
                  min={1}
                  max={MAX_TOTAL_TABLES}
                  value={totalTables}
                  onChange={(e) => setTotalTables(normalizeTotalTables(e.target.value, totalTables))}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 bg-white text-black rounded"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Utilisé pour les tables fixes du restaurant et les assignations staff (1 à N).
                </p>
              </div>
            </div>
            <div className="hidden">
              <label className="flex items-center gap-3 font-bold">
                <input
                  type="checkbox"
                  checked={showCaloriesClient}
                  onChange={(e) => setShowCaloriesClient(e.target.checked)}
                />
                Afficher les Calories (menu client)
              </label>
            </div>
            <div className="hidden">
              <div className="font-bold mb-2">Options de Vente</div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 font-bold">
                  <input
                    type="checkbox"
                    checked={heroEnabled}
                    onChange={(e) => setHeroEnabled(e.target.checked)}
                  />
                  Activer la Mise en Avant (Hero Section)
                </label>
                <p className="text-sm text-gray-600">
                  Active ou désactive l&apos;affichage du bandeau des suggestions en haut du menu.
                </p>
                <label className="flex items-center gap-3 font-bold">
                  <input
                    type="checkbox"
                    checked={consultationModeEnabled}
                    onChange={(e) => setConsultationModeEnabled(e.target.checked)}
                  />
                  Désactiver la commande client (Mode Consultation)
                </label>
                <p className="text-sm text-gray-600">
                  Si activé, le panier et le bouton Commander sont masqués côté client.
                </p>
                <div className="mt-1">
                  <div className="text-sm font-bold mb-1">Badge de mise en avant</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setHeroBadgeType("chef")}
                      className={`px-3 py-1 border-2 font-bold rounded ${
                        heroBadgeType === "chef"
                          ? "bg-amber-100 border-amber-500 text-amber-900"
                          : "bg-white border-gray-300 text-black"
                      }`}
                    >
                      Suggestion du Chef
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroBadgeType("daily")}
                      className={`px-3 py-1 border-2 font-bold rounded ${
                        heroBadgeType === "daily"
                          ? "bg-green-100 border-green-600 text-green-900"
                          : "bg-white border-gray-300 text-black"
                      }`}
                    >
                      Plat du Jour
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <ManagerAppearanceLanguagesPanel {...props} />
            <ManagerAppearanceCookingPanel {...props} />
            <ManagerAppearanceAllergensPanel {...props} />
          </div>
  );
}



