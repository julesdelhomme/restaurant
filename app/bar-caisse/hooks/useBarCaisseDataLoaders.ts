import { useEffect } from "react";

import { loadInventoryData, loadOrdersData, loadRestaurantSettings, loadServiceNotifications } from "../services/bar-caisse-data";

type UseBarCaisseDataLoadersParams = {
  supabase: any;
  scopedRestaurantId: string;
  settingsRowId: string;
  restaurantId: string | number | null;
  setRestaurantId: (value: string | number | null) => void;
  setRestaurantName: (value: string) => void;
  setRestaurantLogoUrl: (value: string) => void;
  setRestaurantAddress: (value: string) => void;
  setRestaurantSocialLinks: (value: any) => void;
  setShowSocialOnReceipt: (value: boolean) => void;
  setGmailUser: (value: string) => void;
  setGmailAppPassword: (value: string) => void;
  setDishCategoryIdByDishId: (value: Record<string, string>) => void;
  setCategoryDestinationById: (value: Record<string, "cuisine" | "bar">) => void;
  setOrders: (value: any[]) => void;
  setServiceNotifications: (value: any[]) => void;
  setInventory: (value: any[]) => void;
};

export function useBarCaisseDataLoaders(params: UseBarCaisseDataLoadersParams) {
  const {
    supabase,
    scopedRestaurantId,
    settingsRowId,
    restaurantId,
    setRestaurantId,
    setRestaurantName,
    setRestaurantLogoUrl,
    setRestaurantAddress,
    setRestaurantSocialLinks,
    setShowSocialOnReceipt,
    setGmailUser,
    setGmailAppPassword,
    setDishCategoryIdByDishId,
    setCategoryDestinationById,
    setOrders,
    setServiceNotifications,
    setInventory,
  } = params;

  const fetchRestaurantSettings = async () => {
    const settings = await loadRestaurantSettings({
      supabase,
      scopedRestaurantId,
      settingsRowId,
    });
    if (!settings.found) {
      setRestaurantId(settings.restaurantId);
      return;
    }
    setRestaurantId(settings.restaurantId);
    setRestaurantName(settings.restaurantName);
    setRestaurantLogoUrl(settings.restaurantLogoUrl);
    setRestaurantAddress(settings.restaurantAddress);
    setRestaurantSocialLinks(settings.restaurantSocialLinks);
    setShowSocialOnReceipt(settings.showSocialOnReceipt);
    setGmailUser(settings.gmailUser);
    setGmailAppPassword(settings.gmailAppPassword);
  };

  const fetchOrders = async (restaurantScope: string | number | null = restaurantId) => {
    const result = await loadOrdersData({
      supabase,
      restaurantScope,
      scopedRestaurantId,
    });
    if (result.error) {
      console.error("Erreur fetchOrders:", result.error);
      return;
    }
    setDishCategoryIdByDishId(result.dishCategoryIdByDishId);
    setCategoryDestinationById(result.categoryDestinationById);
    setOrders(result.hydratedOrders);
  };

  const fetchServiceNotifications = async (restaurantScope: string | number | null = restaurantId) => {
    const result = await loadServiceNotifications({
      supabase,
      restaurantScope,
      scopedRestaurantId,
    });
    if (result.error) {
      const message = String((result.error as { message?: string })?.message || "").toLowerCase();
      if (!message.includes("does not exist")) {
        console.warn("Notifications indisponibles:", result.error);
      }
      setServiceNotifications([]);
      return;
    }
    setServiceNotifications(result.pending);
  };

  const fetchInventory = async () => {
    const result = await loadInventoryData({
      supabase,
      restaurantId,
      scopedRestaurantId,
    });
    if (result.error) {
      console.error("Erreur fetchInventory:", result.error);
      alert("Erreur base de donnees: " + result.error.message);
      return;
    }
    setInventory(result.data);
  };

  useEffect(() => {
    void fetchRestaurantSettings();
  }, [scopedRestaurantId]);

  useEffect(() => {
    if (!restaurantId && !scopedRestaurantId) return;
    void fetchInventory();
  }, [restaurantId, scopedRestaurantId]);

  return {
    fetchRestaurantSettings,
    fetchOrders,
    fetchServiceNotifications,
    fetchInventory,
  };
}
