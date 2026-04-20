// @ts-nocheck
import React from "react";

type ManagerDashboardSectionProps = {
  [key: string]: any;
};

export default function ManagerDashboardSection(props: ManagerDashboardSectionProps) {
  const {
    AppearanceUI = () => null,
    CardDesigner = () => null,
    ConfigGeneral = () => null,
    ConfigMail = () => null,
    ConfigSocials = () => null,
    RestaurantQrCard = () => null,
    StaffAndRooms = () => null,
    activeManagerTab = "menu",
    cardDesignerProps = {},
    currentRestaurantPublicUrl = "",
    currentRestaurantQrId = "",
    currentRestaurantVitrineUrl = "",
    dishNameById = new Map(),
    dishReviews = [],
    handlePrintWeeklyReviewsReportPdf = () => undefined,
    handleSaveRestaurant = () => undefined,
    handleToggleManagerOtp = () => undefined,
    handleUpdateManagerPassword = () => undefined,
    managerAppearancePanelProps = {},
    managerStaffAndRoomsProps = {},
    managerOtpEnabled = false,
    managerOtpError = "",
    managerOtpLoading = false,
    managerOtpMessage = "",
    managerUserEmail = "",
    passwordForm = { oldPassword: "", newPassword: "", confirmPassword: "" },
    passwordUpdateError = "",
    passwordUpdateLoading = false,
    passwordUpdateMessage = "",
    renderReviewStars = () => null,
    restaurant = null,
    restaurantForm = { name: "", logo_url: "", primary_color: "#111111" },
    restaurantReviews = [],
    restaurantSaveStatus = "idle",
    reviewAverage = 0,
    reviews = [],
    setPasswordForm = () => undefined,
    topReviewedDish = null,
    vitrineViewsCount = 0,
    weeklyAiSummary = { strengths: [], watchouts: [] },
  } = props;

  if (activeManagerTab === "card_designer") {
    return (
      <section className="h-full overflow-hidden bg-white dark:bg-zinc-950 text-slate-900 dark:text-white">
        <CardDesigner {...cardDesignerProps} />
      </section>
    );
  }

  return (
<>
        <section className={activeManagerTab === "staff" ? "mb-10" : "hidden"}>
          <h2 className="text-xl font-black mb-3">Staff & Salles</h2>
          <StaffAndRooms {...managerStaffAndRoomsProps} />
          <button
            onClick={handleSaveRestaurant}
            disabled={restaurantSaveStatus === "saving"}
            className={`mt-4 px-4 py-2 font-black border-2 border-black disabled:opacity-60 ${
              restaurantSaveStatus === "success" ? "bg-green-600 text-white" : "bg-black text-white"
            }`}
          >
            {restaurantSaveStatus === "saving"
              ? "Enregistrement..."
              : restaurantSaveStatus === "success"
                ? "Enregistre avec succes !"
                : "Sauvegarder"}
          </button>
        </section>
        <section className={activeManagerTab === "staff" || activeManagerTab === "menu" ? "hidden" : "mb-10"}>
          <h2 className="text-xl font-black mb-3">
            {activeManagerTab === "stats"
              ? "Statistiques"
              : activeManagerTab === "appearance"
                ? "Apparence & Style"
                : activeManagerTab === "configuration"
                  ? "Configuration"
                : activeManagerTab === "security"
                  ? "Parametres du compte"
                  : "Ma Carte"}
          </h2>
          <AppearanceUI {...managerAppearancePanelProps} />
          <div className={activeManagerTab === "configuration" ? "grid grid-cols-1 gap-4" : "hidden"}>
            <ConfigMail {...managerAppearancePanelProps} />
            <ConfigSocials {...managerAppearancePanelProps} />
            <ConfigGeneral
              {...managerAppearancePanelProps}
              RestaurantQrCard={RestaurantQrCard}
              currentRestaurantPublicUrl={currentRestaurantPublicUrl}
              currentRestaurantQrId={currentRestaurantQrId}
              currentRestaurantVitrineUrl={currentRestaurantVitrineUrl}
              restaurant={restaurant}
              restaurantForm={restaurantForm}
            />
          </div>
          <div className={`mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 ${activeManagerTab === "stats" ? "" : "hidden"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-lg font-black">Avis & Satisfaction</h3>
                <p className="text-sm text-gray-600">Note moyenne, top plat et derniers commentaires reçus depuis la page feedback.</p>
                <p className="mt-1 text-xs text-gray-500">
                  Les avis sont conservés 7 jours pour garantir une analyse fraîche de votre service.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handlePrintWeeklyReviewsReportPdf()}
                  className="px-3 py-2 border-2 border-black bg-blue-100 font-black rounded"
                >
                  Imprimer le rapport hebdomadaire
                </button>
              </div>
            </div>
            <div className="mb-4 rounded-lg border-2 border-black bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-black text-base">Résumé de l&apos;IA</h4>
                <span className="text-xs font-bold text-gray-500 uppercase">7 derniers jours</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div className="rounded border border-green-200 bg-green-50 p-3">
                  <div className="text-sm font-black text-green-800">Points forts</div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-green-900 space-y-1">
                    {weeklyAiSummary.strengths.map((item, index) => (
                      <li key={`ai-strength-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded border border-amber-200 bg-amber-50 p-3">
                  <div className="text-sm font-black text-amber-900">À surveiller</div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-amber-900 space-y-1">
                    {weeklyAiSummary.watchouts.map((item, index) => (
                      <li key={`ai-watch-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-white border border-gray-200 rounded p-3">
                <div className="text-xs font-bold text-gray-500 uppercase">Note moyenne</div>
                <div className="text-2xl font-black mt-1">{reviewAverage > 0 ? `${reviewAverage}/5` : "-"}</div>
              </div>
              <div className="bg-white border border-gray-200 rounded p-3">
                <div className="text-xs font-bold text-gray-500 uppercase">Nombre total d&apos;avis</div>
                <div className="text-2xl font-black mt-1">{reviews.length}</div>
              </div>
              <div className="bg-white border border-gray-200 rounded p-3">
                <div className="text-xs font-bold text-gray-500 uppercase">Top plat</div>
                <div className="text-sm font-black mt-1">{topReviewedDish ? topReviewedDish.name : "Aucun"}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {topReviewedDish ? `${topReviewedDish.avg}/5 (${topReviewedDish.count} avis)` : ""}
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded p-3">
                <div className="text-xs font-bold text-gray-500 uppercase">Dernier avis</div>
                <div className="text-sm font-bold mt-2">
                  {reviews[0]?.created_at ? new Date(reviews[0].created_at).toLocaleString("fr-FR") : "Aucun"}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-black">Avis Restaurant</h4>
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {restaurantReviews.length === 0 ? (
                    <div className="text-sm text-gray-600 bg-white border border-gray-200 rounded p-3">
                      Aucun avis restaurant pour le moment.
                    </div>
                  ) : (
                    restaurantReviews.map((review) => {
                      const rating = Number(review.rating || 0);
                      return (
                        <div key={String(review.id)} className="bg-white border border-gray-200 rounded p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-black">Restaurant</div>
                            <div className="flex items-center gap-2">
                              {renderReviewStars(rating)}
                              <div className="text-sm font-bold">{rating > 0 ? `${rating}/5` : "-"}</div>
                            </div>
                          </div>
                          {review.comment ? (
                            <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{review.comment}</p>
                          ) : null}
                          <div className="mt-2 text-xs text-gray-500">
                            {review.created_at ? new Date(review.created_at).toLocaleString("fr-FR") : "-"}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-black">Avis sur les Plats</h4>
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {dishReviews.length === 0 ? (
                    <div className="text-sm text-gray-600 bg-white border border-gray-200 rounded p-3">
                      Aucun avis plat pour le moment.
                    </div>
                  ) : (
                    dishReviews.map((review) => {
                      const rating = Number(review.rating || 0);
                      const dishName =
                        String(review.dish?.name_fr || review.dish?.name || "").trim() ||
                        (review.dish_id ? dishNameById.get(String(review.dish_id)) : "") ||
                        "Plat";
                      const dishImage = String(review.dish?.image_url || "").trim();
                      return (
                        <div key={String(review.id)} className="bg-white border border-gray-200 rounded p-3">
                          <div className="flex items-start gap-3">
                            <div className="h-14 w-14 rounded border border-gray-200 bg-gray-100 overflow-hidden shrink-0">
                              {dishImage ? (
                                <img src={dishImage} alt={dishName} className="h-full w-full object-cover" />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="font-black truncate">{dishName}</div>
                                <div className="flex items-center gap-2">
                                  {renderReviewStars(rating)}
                                  <div className="text-sm font-bold">{rating > 0 ? `${rating}/5` : "-"}</div>
                                </div>
                              </div>
                              {review.comment ? (
                                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{review.comment}</p>
                              ) : null}
                              <div className="mt-2 text-xs text-gray-500">
                                {review.created_at ? new Date(review.created_at).toLocaleString("fr-FR") : "-"}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleSaveRestaurant}
            disabled={restaurantSaveStatus === "saving"}
            className={`mt-4 px-4 py-2 font-black border-2 border-black disabled:opacity-60 ${
              restaurantSaveStatus === "success" ? "bg-green-600 text-white" : "bg-black text-white"
            } ${activeManagerTab === "appearance" || activeManagerTab === "configuration" ? "" : "hidden"}`}
          >
            {restaurantSaveStatus === "saving"
              ? "Enregistrement..."
              : restaurantSaveStatus === "success"
                ? "Enregistré avec succès !"
                : "Sauvegarder"}
          </button>
          <div className={`${activeManagerTab === "security" ? "grid grid-cols-1 xl:grid-cols-3 gap-4" : "hidden"}`}>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Profil</div>
              <h3 className="mt-2 text-lg font-black">Compte manager</h3>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="text-xs font-bold uppercase text-gray-500">Restaurant</div>
                  <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 font-bold">
                    {String(restaurant?.name || restaurantForm.name || "Restaurant").trim() || "Restaurant"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-gray-500">Email</div>
                  <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 font-bold break-all">
                    {managerUserEmail || "Compte connecte via Supabase Auth"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Securite</div>
              <h3 className="mt-2 text-lg font-black">Double authentification</h3>
              <p className="mt-2 text-sm text-gray-600">
                Activez la verification par code email pour exiger un OTP a chaque connexion manager.
              </p>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div>
                  <div className="font-black">Activer la double securite</div>
                  <div className="mt-1 text-sm text-gray-600">
                    {managerOtpEnabled ? "Un code OTP sera demande a la connexion." : "Connexion directe apres le mot de passe."}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={managerOtpEnabled}
                  disabled={managerOtpLoading}
                  onClick={() => void handleToggleManagerOtp(!managerOtpEnabled)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full border-2 transition ${
                    managerOtpEnabled ? "bg-blue-600 border-blue-700" : "bg-gray-300 border-gray-400"
                  } ${managerOtpLoading ? "opacity-60" : ""}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      managerOtpEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              {managerOtpError ? <p className="mt-3 text-sm font-bold text-red-600">{managerOtpError}</p> : null}
              {managerOtpMessage ? <p className="mt-3 text-sm font-bold text-green-700">{managerOtpMessage}</p> : null}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Mot de passe</div>
              <h3 className="mt-2 text-lg font-black">Modifier mon mot de passe</h3>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <div>
                  <label className="block mb-1 font-bold">Ancien mot de passe</label>
                  <input
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        oldPassword: e.target.value,
                      }))
                    }
                    placeholder="Mot de passe actuel"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-black"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder="Minimum 8 caracteres"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-black"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold">Confirmation</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="Ressaisir le mot de passe"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-black"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleUpdateManagerPassword()}
                  disabled={passwordUpdateLoading}
                  className="rounded-xl border-2 border-black bg-black px-4 py-2 font-black text-white disabled:opacity-60"
                >
                  {passwordUpdateLoading ? "Mise a jour..." : "Changer le mot de passe"}
                </button>
                {passwordUpdateError ? <span className="text-sm font-bold text-red-600">{passwordUpdateError}</span> : null}
                {passwordUpdateMessage ? <span className="text-sm font-bold text-green-700">{passwordUpdateMessage}</span> : null}
              </div>
            </div>
          </div>
        </section>
</>
  );
}
