// @ts-nocheck
import React from "react";

type ConfigSocialsProps = {
  [key: string]: any;
};

export default function ConfigSocials(props: ConfigSocialsProps) {
  const { activeManagerTab, restaurantForm, setRestaurantForm } = props;

  return (
    <div className={activeManagerTab === "configuration" ? "border border-gray-200 rounded bg-white p-3" : "hidden"}>
      <div id="manager-google-review-config" className="mb-4">
        <label className="block mb-1 font-bold">Lien Google Review</label>
        <input
          type="url"
          value={String((restaurantForm as any).google_review_url || "")}
          onChange={(e) => setRestaurantForm({ ...restaurantForm, google_review_url: e.target.value })}
          placeholder="https://g.page/r/.../review"
          className="w-full px-3 py-2 bg-white text-black border border-gray-300"
        />
        <p className="mt-1 text-xs text-gray-600">Utilise pour le bouton Google affiche aux clients apres un avis 4 ou 5 etoiles.</p>
      </div>

      <div id="manager-social-config" className="font-black mb-3">Reseaux Sociaux</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              onChange={(e) => setRestaurantForm({ ...restaurantForm, show_social_on_receipt: e.target.checked })}
            />
            Afficher les reseaux sociaux sur le recu digital
          </label>
        </div>
      </div>
    </div>
  );
}
