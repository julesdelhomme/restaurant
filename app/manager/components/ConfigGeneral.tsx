// @ts-nocheck
import React from "react";
import { Printer } from "lucide-react";
import ManagerAppearanceLanguagesPanel from "./ManagerAppearanceLanguagesPanel";
import ManagerAppearanceCookingPanel from "./ManagerAppearanceCookingPanel";
import ManagerAppearanceAllergensPanel from "./ManagerAppearanceAllergensPanel";

type ConfigGeneralProps = {
  [key: string]: any;
};

export default function ConfigGeneral(props: ConfigGeneralProps) {
  const {
    RestaurantQrCard,
    activeManagerTab,
    autoPrintKitchen,
    currentRestaurantPublicUrl,
    currentRestaurantQrId,
    currentRestaurantVitrineUrl,
    restaurant,
    restaurantForm = {},
    setAutoPrintKitchen = () => undefined,
    setRestaurantForm = () => undefined,
  } = props;

  if (activeManagerTab !== "configuration") return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2 border border-gray-200 rounded bg-white p-3">
        <div className="text-sm font-black text-black mb-2">Horaires de service</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block mb-1 text-xs font-black uppercase">Midi</label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={String((restaurantForm as any).service_lunch_start || "")}
                onChange={(e) => setRestaurantForm({ ...restaurantForm, service_lunch_start: e.target.value })}
                className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded"
              />
              <span className="text-xs font-black text-gray-600">a</span>
              <input
                type="time"
                value={String((restaurantForm as any).service_lunch_end || "")}
                onChange={(e) => setRestaurantForm({ ...restaurantForm, service_lunch_end: e.target.value })}
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
                onChange={(e) => setRestaurantForm({ ...restaurantForm, service_dinner_start: e.target.value })}
                className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded"
              />
              <span className="text-xs font-black text-gray-600">a</span>
              <input
                type="time"
                value={String((restaurantForm as any).service_dinner_end || "")}
                onChange={(e) => setRestaurantForm({ ...restaurantForm, service_dinner_end: e.target.value })}
                className="w-full px-3 py-2 bg-white text-black border border-gray-300 rounded"
              />
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-600 font-semibold">Ces horaires pilotent l'affichage global des plats.</p>
      </div>

      <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-bold">
              <Printer className={`h-4 w-4 ${autoPrintKitchen ? "text-green-600" : "text-gray-500"}`} />
              <span>Impression automatique cuisine</span>
            </div>
            <p className={`text-sm mt-1 ${autoPrintKitchen ? "text-green-700" : "text-gray-600"}`}>
              {autoPrintKitchen
                ? "Activee (les tickets s'impriment des qu'une commande arrive)"
                : "Desactivee (affichage sur ecran uniquement)"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoPrintKitchen}
            onClick={() => setAutoPrintKitchen((prev) => !prev)}
            className={`relative inline-flex h-8 w-16 items-center rounded-full border-2 transition ${
              autoPrintKitchen ? "border-green-700 bg-green-500" : "border-gray-400 bg-gray-300"
            }`}
          >
            <span className="sr-only">Impression automatique cuisine</span>
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
                autoPrintKitchen ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-300 bg-white p-3">
        <div className="text-sm font-black mb-2">QR Code Tables</div>
        <RestaurantQrCard
          restaurantId={currentRestaurantQrId}
          restaurantName={String(restaurantForm.name || restaurant?.name || "Restaurant").trim()}
          logoUrl={String(restaurantForm.logo_url || restaurant?.logo_url || "").trim()}
          primaryColor={String(restaurantForm.primary_color || restaurant?.primary_color || "#111111").trim()}
          title="QR Code Tables"
        />
        {currentRestaurantPublicUrl ? (
          <a
            href={currentRestaurantPublicUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center rounded border border-gray-300 px-3 py-1 text-xs font-black text-black hover:bg-gray-100"
          >
            Voir ma carte
          </a>
        ) : null}
      </div>

      <div className="rounded-xl border border-gray-300 bg-white p-3">
        <div className="text-sm font-black mb-2">QR Code Vitrine</div>
        <RestaurantQrCard
          restaurantId={currentRestaurantQrId}
          restaurantName={String(restaurantForm.name || restaurant?.name || "Restaurant").trim()}
          logoUrl={String(restaurantForm.logo_url || restaurant?.logo_url || "").trim()}
          primaryColor={String(restaurantForm.primary_color || restaurant?.primary_color || "#111111").trim()}
          mode="vitrine"
          title="QR Code Vitrine"
        />
        {currentRestaurantVitrineUrl ? (
          <a
            href={currentRestaurantVitrineUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center rounded border border-gray-300 px-3 py-1 text-xs font-black text-black hover:bg-gray-100"
          >
            Lien vitrine
          </a>
        ) : null}
      </div>

      <ManagerAppearanceLanguagesPanel {...props} />
      <ManagerAppearanceCookingPanel {...props} />
      <ManagerAppearanceAllergensPanel {...props} />
    </div>
  );
}
