import { supabase } from "../../lib/supabase";
import type { Dish, Restaurant } from "../types";

export type DishBadgeAtomicField = "is_new_badge" | "is_spicy_badge" | "is_vegetarian_badge" | "is_promo";

export function useManagerDishAssetsAndBadges({
  scopedRestaurantId,
  restaurant,
  restaurantForm,
  setRestaurantForm,
  setRestaurant,
  setIsUploadingRestaurantLogo,
  setIsUploadingRestaurantBanner,
  setIsUploadingRestaurantBackground,
  setIsUploadingRestaurantWelcome,
  setImagePreviewUrl,
  setIsUploadingImage,
  DISH_IMAGES_BUCKET,
  RESTAURANT_LOGOS_BUCKET,
  RESTAURANT_BANNERS_BUCKET,
  supabaseUrl,
  supabaseKey,
  setFormData,
  setDishToDelete,
  setShowDeleteModal,
  hasMissingColumnError,
  toLoggableSupabaseError,
  setDishes,
  setEditingDish,
  editingDish,
  formData,
  fetchDishes,
  dishToDelete,
}: Record<string, any>) {
  const sanitizeFileName = (value: string) => {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .toLowerCase();
  };

  const handleDishImageUpload = async (file: File) => {
    const localPreview = URL.createObjectURL(file);
    setImagePreviewUrl(localPreview);
    setIsUploadingImage(true);

    try {
      const now = Date.now();
      const rawName = sanitizeFileName(file.name || `dish-${now}.jpg`);
      const filePath = `dishes/${now}-${rawName}`;

      const { error: uploadError } = await supabase.storage
        .from(DISH_IMAGES_BUCKET)
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        alert("Erreur upload image: " + uploadError.message);
        return;
      }

      const { data: publicData } = supabase.storage.from(DISH_IMAGES_BUCKET).getPublicUrl(filePath);

      const publicUrl = publicData?.publicUrl || "";
      if (!publicUrl) {
        alert("Impossible de recuperer l'URL publique de l'image.");
        return;
      }

      setFormData((prev: any) => ({ ...prev, image_url: publicUrl }));
      setImagePreviewUrl(publicUrl);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const extractStoragePathFromPublicUrl = (publicUrl: string, bucket: string) => {
    const url = String(publicUrl || "").trim();
    if (!url) return null;
    try {
      const parsed = new URL(url);
      const marker = `/storage/v1/object/public/${bucket}/`;
      const index = parsed.pathname.indexOf(marker);
      if (index < 0) return null;
      const path = parsed.pathname.slice(index + marker.length);
      return decodeURIComponent(path || "");
    } catch {
      return null;
    }
  };

  const uploadRestaurantAsset = async (kind: "logo" | "banner" | "background" | "welcome", file: File) => {
    if (!restaurant?.id) {
      alert("Restaurant introuvable.");
      return;
    }
    const bucket = kind === "logo" ? RESTAURANT_LOGOS_BUCKET : RESTAURANT_BANNERS_BUCKET;
    const setLoading =
      kind === "logo"
        ? setIsUploadingRestaurantLogo
        : kind === "banner"
          ? setIsUploadingRestaurantBanner
          : kind === "background"
            ? setIsUploadingRestaurantBackground
            : setIsUploadingRestaurantWelcome;
    const previousUrl =
      kind === "logo"
        ? String(restaurantForm.logo_url || "")
        : kind === "banner"
          ? String((restaurantForm as any).banner_image_url || (restaurantForm as any).banner_url || "")
          : kind === "background"
            ? String((restaurantForm as any).background_url || (restaurantForm as any).background_image_url || "")
            : String((restaurantForm as any).welcome_popup_image_url || "");

    setLoading(true);
    try {
      const restaurantId = String(restaurant.id).trim();
      const extension = sanitizeFileName(file.name || "").split(".").pop() || "png";
      const timestamp = Date.now();
      const filePath =
        kind === "logo"
          ? `logo_${restaurantId}.png`
          : kind === "welcome"
            ? `restaurants/${restaurantId}/welcome_popup_${restaurantId}_${timestamp}.${extension}`
            : `restaurants/${restaurantId}/${kind}_${restaurantId}_${timestamp}.${extension}`;

      const oldPath = kind === "logo" ? null : extractStoragePathFromPublicUrl(previousUrl, bucket);
      if (oldPath) {
        const { error: removeOldError } = await supabase.storage.from(bucket).remove([oldPath]);
        if (removeOldError) {
          console.warn(`Suppression ancien asset ${kind} ignoree:`, removeOldError.message);
        }
      }

      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true });
      if (uploadError) {
        console.error(`[manager.uploadRestaurantAsset] upload failed (${kind})`, {
          kind,
          bucket,
          filePath,
          message: uploadError.message,
          details: (uploadError as { details?: unknown })?.details,
          hint: (uploadError as { hint?: unknown })?.hint,
          code: (uploadError as { code?: unknown })?.code,
          fullError: uploadError,
        });
        alert(
          `Erreur upload ${
            kind === "logo"
              ? "logo"
              : kind === "banner"
                ? "banniere"
                : kind === "background"
                  ? "fond"
                  : "message de bienvenue"
          }: ${uploadError.message}`
        );
        return;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      const computedPublicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
      const publicUrl = String(data?.publicUrl || computedPublicUrl).trim() || computedPublicUrl;
      if (!publicUrl) {
        console.error(`[manager.uploadRestaurantAsset] missing public URL (${kind})`, {
          kind,
          bucket,
          filePath,
          data,
        });
        alert("Impossible de recuperer l'URL publique.");
        return;
      }

      setRestaurantForm((prev: any) => ({
        ...prev,
        ...(kind === "logo"
          ? { logo_url: publicUrl }
          : kind === "banner"
            ? { banner_image_url: publicUrl, banner_url: publicUrl }
            : kind === "background"
              ? { background_url: publicUrl, background_image_url: publicUrl }
              : { welcome_popup_image_url: publicUrl }),
      }));

      if (kind === "logo") {
        const updateLogoResult = await supabase.from("restaurants").update({ logo_url: publicUrl } as never).eq("id", restaurantId);
        if (updateLogoResult.error) {
          console.warn("Erreur mise a jour restaurants.logo_url:", updateLogoResult.error.message);
        } else {
          setRestaurant((prev: any) => (prev ? ({ ...(prev as Record<string, unknown>), logo_url: publicUrl } as Restaurant) : prev));
        }
      }
    } catch (error) {
      console.error(`[manager.uploadRestaurantAsset] unexpected error (${kind})`, {
        kind,
        bucket,
        fileName: file?.name,
        fullError: error,
      });
      const message = error instanceof Error ? error.message : String(error || "Erreur inconnue");
      alert(`Erreur upload ${kind === "logo" ? "logo" : kind}: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDish = (dish: Dish) => {
    setDishToDelete(dish);
    setShowDeleteModal(true);
  };

  const updateDishBadgeColumnAtomic = async (
    dishIdRaw: unknown,
    field: DishBadgeAtomicField,
    nextValue: boolean,
    options?: { promoPrice?: number | null }
  ) => {
    const dishId = String(dishIdRaw || "").trim();
    if (!dishId || !scopedRestaurantId) return false;

    const primaryColumn =
      field === "is_new_badge"
        ? "dish_is_new"
        : field === "is_spicy_badge"
          ? "dish_is_spicy"
          : field === "is_vegetarian_badge"
            ? "dish_is_vegetarian"
            : "dish_on_promo";
    const primaryPayload: Record<string, unknown> = { [primaryColumn]: nextValue };
    const fallbackPayload: Record<string, unknown> =
      field === "is_new_badge"
        ? { is_new: nextValue }
        : field === "is_spicy_badge"
          ? { is_spicy: nextValue }
          : field === "is_vegetarian_badge"
            ? { is_vegetarian: nextValue }
            : { is_promo: nextValue };

    if (field === "is_promo") {
      const promoPrice = options?.promoPrice ?? null;
      primaryPayload.promo_price = nextValue ? promoPrice : null;
      fallbackPayload.promo_price = nextValue ? promoPrice : null;
    }

    let { error } = await supabase.from("dishes").update(primaryPayload as never).eq("id", dishId).eq("restaurant_id", scopedRestaurantId);
    if (error && hasMissingColumnError(error, primaryColumn)) {
      const fallback = await supabase.from("dishes").update(fallbackPayload as never).eq("id", dishId).eq("restaurant_id", scopedRestaurantId);
      error = fallback.error;
    }
    if (error) {
      console.error("Atomic badge update failed:", toLoggableSupabaseError(error));
      alert((error as { message?: string })?.message || "Erreur lors de la sauvegarde du badge.");
      return false;
    }

    setDishes((prev: any[]) =>
      prev.map((row: any) => {
        if (String(row.id || "").trim() !== dishId) return row;
        const nextRow: Record<string, unknown> = { ...(row as unknown as Record<string, unknown>) };
        if (field === "is_new_badge") {
          nextRow.dish_is_new = nextValue;
        } else if (field === "is_spicy_badge") {
          nextRow.dish_is_spicy = nextValue;
          nextRow.is_spicy = nextValue;
        } else if (field === "is_vegetarian_badge") {
          nextRow.dish_is_vegetarian = nextValue;
          nextRow.is_vegetarian = nextValue;
        } else {
          nextRow.dish_on_promo = nextValue;
          nextRow.is_promo = nextValue;
          nextRow.promo_price = nextValue ? options?.promoPrice ?? row.promo_price ?? null : null;
        }
        return nextRow as unknown as Dish;
      })
    );

    setEditingDish((prev: any) => {
      if (!prev || String(prev.id || "").trim() !== dishId) return prev;
      const nextRow: Record<string, unknown> = { ...(prev as unknown as Record<string, unknown>) };
      if (field === "is_new_badge") {
        nextRow.dish_is_new = nextValue;
      } else if (field === "is_spicy_badge") {
        nextRow.dish_is_spicy = nextValue;
        nextRow.is_spicy = nextValue;
      } else if (field === "is_vegetarian_badge") {
        nextRow.dish_is_vegetarian = nextValue;
        nextRow.is_vegetarian = nextValue;
      } else {
        nextRow.dish_on_promo = nextValue;
        nextRow.is_promo = nextValue;
        nextRow.promo_price = nextValue ? options?.promoPrice ?? (prev as any).promo_price ?? null : null;
      }
      return nextRow as unknown as Dish;
    });
    return true;
  };

  const handleBadgeSwitchChange = async (field: DishBadgeAtomicField, nextValue: boolean) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: nextValue,
      ...(field === "is_promo" && !nextValue ? { promo_price: "" } : {}),
    }));

    const editingDishId = String(editingDish?.id || "").trim();
    if (!editingDishId) return;

    const parsedPromoPrice =
      field === "is_promo" && nextValue
        ? (() => {
            const raw = String(formData.promo_price || "").trim();
            if (!raw) return null;
            const parsed = Number.parseFloat(raw.replace(",", "."));
            return Number.isFinite(parsed) ? parsed : null;
          })()
        : null;

    const saved = await updateDishBadgeColumnAtomic(editingDishId, field, nextValue, {
      promoPrice: parsedPromoPrice,
    });
    if (!saved) {
      setFormData((prev: any) => ({
        ...prev,
        [field]: !nextValue,
      }));
    }
  };

  const handleToggleDishHighlight = async (
    dish: Dish,
    field: "suggestion_chef" | "is_chef_suggestion" | "is_daily_special" | "is_suggestion" | "is_promo",
    nextValue: boolean
  ) => {
    if (!dish.id || !scopedRestaurantId) return;
    if (field === "is_promo") {
      const saved = await updateDishBadgeColumnAtomic(dish.id, "is_promo", nextValue, {
        promoPrice: nextValue ? dish.promo_price ?? null : null,
      });
      if (saved) await fetchDishes();
      return;
    }

    const payload =
      field === "suggestion_chef"
        ? { is_suggestion: nextValue, is_chef_suggestion: nextValue, is_featured: nextValue }
        : field === "is_chef_suggestion"
          ? { is_chef_suggestion: nextValue, is_featured: nextValue }
          : field === "is_daily_special"
            ? { is_daily_special: nextValue, is_special: nextValue }
            : field === "is_suggestion"
              ? { is_suggestion: nextValue }
              : {};

    try {
      let { error } = await supabase.from("dishes").update(payload as never).eq("id", dish.id).eq("restaurant_id", scopedRestaurantId);
      if (error && String((error as { code?: string })?.code || "") === "42703") {
        const fallback = await supabase.from("dishes").update(payload as never).eq("id", dish.id).eq("restaurant_id", scopedRestaurantId);
        error = fallback.error;
      }
      if (error) {
        console.error("Unable to update dish highlight:", toLoggableSupabaseError(error));
        alert((error as { message?: string })?.message || "Erreur lors de la mise a jour des mises en avant.");
        return;
      }
      setDishes((prev: any[]) =>
        prev.map((row: any) => {
          if (row.id !== dish.id) return row;
          if (field === "suggestion_chef") {
            return {
              ...row,
              is_suggestion: nextValue,
              is_chef_suggestion: nextValue,
              is_featured: nextValue,
            };
          }
          if (field === "is_chef_suggestion") {
            return {
              ...row,
              is_chef_suggestion: nextValue,
              is_featured: nextValue,
            };
          }
          if (field === "is_daily_special") {
            return {
              ...row,
              is_daily_special: nextValue,
              is_special: nextValue,
            };
          }
          if (field === "is_suggestion") {
            return {
              ...row,
              is_suggestion: nextValue,
            };
          }
          return {
            ...row,
            is_promo: nextValue,
            promo_price: nextValue ? row.promo_price : null,
          };
        })
      );
      await fetchDishes();
    } catch (error: any) {
      console.error("Unexpected dish highlight toggle error:", error);
      alert(error?.message || "Erreur lors de la mise a jour des mises en avant.");
    }
  };

  const confirmDeleteDish = async () => {
    if (!dishToDelete?.id || !scopedRestaurantId) return;
    if (!confirm("Supprimer ce plat ?")) return;

    try {
      let response = await fetch(
        `${supabaseUrl}/rest/v1/dishes?id=eq.${dishToDelete.id}&restaurant_id=eq.${encodeURIComponent(scopedRestaurantId)}`,
        {
          method: "DELETE",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );
      if (!response.ok) {
        const firstError = await response.clone().json().catch(() => ({}));
        if (String((firstError as { code?: string })?.code || "") === "42703") {
          response = await fetch(
            `${supabaseUrl}/rest/v1/dishes?id=eq.${dishToDelete.id}&restaurant_id=eq.${encodeURIComponent(scopedRestaurantId)}`,
            {
              method: "DELETE",
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
            }
          );
        }
      }
      if (!response.ok) {
        const errorData = await response.json();
        alert(`Erreur lors de la suppression: ${errorData.message || errorData.error || "Erreur inconnue"}`);
        return;
      }
      alert("Plat supprime");
      await fetchDishes();
      setShowDeleteModal(false);
      setDishToDelete(null);
    } catch (error: any) {
      alert("Erreur: " + (error?.message || "Erreur inconnue"));
    }
  };

  return {
    sanitizeFileName,
    handleDishImageUpload,
    uploadRestaurantAsset,
    handleDeleteDish,
    updateDishBadgeColumnAtomic,
    handleBadgeSwitchChange,
    handleToggleDishHighlight,
    confirmDeleteDish,
  };
}

