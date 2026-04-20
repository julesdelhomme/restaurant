import { useState, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createEmptyHungerLevels } from "../managerRuntimeShared";
import { createDefaultAllergenLibrary } from "../lib/runtime-core-utils";

export function useManagerData() {
  const params = useParams<{ id?: string; restaurant_id?: string }>();
  const searchParams = useSearchParams();

  // --- ID RESTAURANT ---
  const scopedRestaurantId = useMemo(() => {
    const id = params?.id || params?.restaurant_id || searchParams?.get("restaurant_id") || "";
    return String(id).trim().toLowerCase().replace(/^["'{\s]+|["'}\s]+$/g, "");
  }, [params, searchParams]);

  // --- DATA STATES ---
  const [editingDish, setEditingDish] = useState<any>(null);
  const [dishes, setDishes] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [restaurantReviews, setRestaurantReviews] = useState<any[]>([]);
  const [dishReviews, setDishReviews] = useState<any[]>([]);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategoryRows, setSubCategories] = useState<any[]>([]);
  const [sides, setSides] = useState<any[]>([]);
  const [allergenLibrary, setAllergenLibrary] = useState<any[]>(createDefaultAllergenLibrary());
  const [tableAssignments, setTableAssignments] = useState<any[]>([]);

  // --- UI STATES ---
  const [activeManagerTab, setActiveManagerTab] = useState("menu");
  const [showDishModal, setShowDishModal] = useState(false);
  const [activeDishModalTab, setActiveDishModalTab] = useState("general");
  const [isRestaurantLoading, setIsRestaurantLoading] = useState(true);
  const [managerAccessError, setManagerAccessError] = useState("");
  const [globalManagerNotification, setGlobalManagerNotification] = useState<any>(null);
  const [managerUserEmail, setManagerUserEmail] = useState("");
  const [forceFirstLoginPasswordChange, setForceFirstLoginPasswordChange] = useState(false);
  const [vitrineViewsCount, setVitrineViewsCount] = useState(0);

  // ðŸš¨ LA FIX POUR TON ERREUR : Initialisation de openManagerPanels
  const [openManagerPanels, setOpenManagerPanels] = useState<Record<string, boolean>>({
    font: false,
    languages: false,
    allergens: false,
    cooking: false
  });

  // --- FORM STATES (AIRBAGS) ---
  const [restaurantForm, setRestaurantForm] = useState<any>({ 
    name: "", logo_url: "", enabled_languages: ["fr"], smtp_password: "", smtp_user: "" 
  });
  const [formData, setFormData] = useState<any>({
    name_fr: "", price: "", is_active: true, hunger_levels: createEmptyHungerLevels(), is_formula: false
  });
  const [categoryForm, setCategoryForm] = useState<any>({ name_fr: "", destination: "cuisine", sort_order: "1" });
  const [passwordForm, setPasswordForm] = useState<any>({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [newSubCategory, setNewSubCategory] = useState<any>({ category_id: "", name_fr: "" });
  const [newSubCategoryI18n, setNewSubCategoryI18n] = useState<any>({});
  const [editingSubCategoryId, setEditingSubCategoryId] = useState<any>(null);
  const [newSide, setNewSide] = useState<any>({ name_fr: "" });
  const [sideForm, setSideForm] = useState<any>({ name_fr: "" });
  const [productOptionDraft, setProductOptionDraft] = useState<any>({ name: "", price_override: "", names_i18n: {} });
  const [dishExtraDraft, setDishExtraDraft] = useState<any>({ name_fr: "", price: "", names_i18n: {} });

  // --- CALCULS ANALYTICS ---
  const analyticsText = useMemo(() => ({
    title: "Statistiques d'activité", today: "Aujourd'hui", last7Days: "7 jours", last30Days: "30 jours",
    realRevenue: "CA", tipsTotal: "Tips", averageBasket: "Panier", noData: "Vide",
    liveTab: "Direct", productTab: "Produits", trendsTab: "Tendances", opsTab: "Opérations"
  }), []);

  const sortedCategories = useMemo(() => [...(categories || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)), [categories]);

  const preparedDishesGroupedByCategory = useMemo(() => sortedCategories.map((cat) => ({
    categoryId: cat.id,
    categoryLabel: cat.name_fr || cat.name || "Sans titre",
    dishes: (dishes || []).filter((d) => String(d.category_id) === String(cat.id)),
  })), [dishes, sortedCategories]);

  return {
    editingDish, setEditingDish, scopedRestaurantId, dishes, setDishes, orders, setOrders, 
    reviews, setReviews, restaurantReviews, setRestaurantReviews, dishReviews, setDishReviews,
    restaurant, setRestaurant, categories, setCategories, subCategoryRows, setSubCategories,
    sides, setSides, sidesLibrary: sides, setSidesLibrary: setSides,
    allergenLibrary, setAllergenLibrary, tableAssignments, setTableAssignments,
    activeManagerTab, setActiveManagerTab, showDishModal, setShowDishModal,
    activeDishModalTab, setActiveDishModalTab, isRestaurantLoading, setIsRestaurantLoading,
    managerAccessError, setManagerAccessError, globalManagerNotification, setGlobalManagerNotification,
    managerUserEmail, setManagerUserEmail, forceFirstLoginPasswordChange, setForceFirstLoginPasswordChange,
    vitrineViewsCount, setVitrineViewsCount,
    // ðŸš¨ EXPORTS CRUCIAUX ICI
    openManagerPanels, setOpenManagerPanels,
    restaurantForm, setRestaurantForm, formData, setFormData, categoryForm, setCategoryForm,
    passwordForm, setPasswordForm,
    newSubCategory, setNewSubCategory, newSubCategoryI18n, setNewSubCategoryI18n, editingSubCategoryId, setEditingSubCategoryId,
    newSide, setNewSide, sideForm, setSideForm, productOptionDraft, setProductOptionDraft, dishExtraDraft, setDishExtraDraft,
    analyticsText, sortedCategories, preparedDishesGroupedByCategory,
    activeLanguageCodes: restaurantForm?.enabled_languages || ["fr"],
    languageLabels: restaurantForm?.language_labels || { fr: "Français" },
    getCategoryLabel: (cat: any) => cat?.name_fr || cat?.name || "Catégorie",
    PREDEFINED_LANGUAGE_OPTIONS: [{ code: "fr", label: "Français" }, { code: "en", label: "Anglais" }],
    MENU_FONT_OPTIONS: ["Montserrat", "Roboto", "Poppins"],
    refs: { hasAllergenLibraryTableRef: useRef(true), dishesRefetchLockUntilRef: useRef(0), lastSaveTimeRef: useRef(0), isSavingRef: useRef(false) }
  };
}