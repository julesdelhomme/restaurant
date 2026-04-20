// app/manager/hooks/useManagerSettings.ts
import { useState } from "react";
import { supabase } from "../../lib/supabase";

export function useManagerSettings(dataStore: any) {
  const { restaurant, scopedRestaurantId, restaurantForm, setRestaurantForm } = dataStore;
  const [isUploading, setIsUploading] = useState(false);

  const handleSaveRestaurant = async () => {
    const restaurantId = restaurant?.id || scopedRestaurantId;
    if (!restaurantId) return;
    
    // On prépare ce qu'on envoie à la BDD
    const payload = {
      name: restaurantForm.name,
      logo_url: restaurantForm.logo_url,
      primary_color: restaurantForm.primary_color,
      card_bg_color: restaurantForm.card_bg_color,
      text_color: restaurantForm.text_color,
      // Ajoute ici les autres champs de restaurantForm si besoin
    };

    const { error } = await supabase
      .from("restaurants")
      .update(payload)
      .eq("id", restaurantId);

    if (error) {
      alert("Erreur de sauvegarde : " + error.message);
    } else {
      alert("Paramètres du restaurant sauvegardés avec succès !");
    }
  };

  const uploadRestaurantAsset = async (kind: string, file: File) => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop() || "png";
      const fileName = `${kind}_${scopedRestaurantId}_${Date.now()}.${fileExt}`;
      const bucket = kind === "logo" ? "restaurant-logos" : "restaurant-banners";

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
      
      if (data?.publicUrl) {
        const updateKey = kind === "logo" ? "logo_url" : "background_url";
        setRestaurantForm((prev: any) => ({ ...prev, [updateKey]: data.publicUrl }));
        alert("Image uploadée avec succès ! Pensez à sauvegarder en bas de page.");
      }
    } catch (err: any) {
      alert("Erreur d'upload : " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return { handleSaveRestaurant, uploadRestaurantAsset, isUploading };
}
