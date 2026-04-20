// @ts-nocheck
import { useState } from "react";

export function useManagerEditorUiState(deps: Record<string, any>) {
  const { createEmptyHungerLevels } = deps;

  const [openManagerPanels, setOpenManagerPanels] = useState({
    font: true,
    languages: false,
    cooking: false,
    allergens: false,
  });
  const [newSubCategory, setNewSubCategory] = useState({
    category_id: "",
    name_fr: "",
    name_en: "",
    name_es: "",
    name_de: "",
  });
  const toggleManagerPanel = (key: "font" | "languages" | "cooking" | "allergens") => {
    setOpenManagerPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const [openDishLanguagePanels, setOpenDishLanguagePanels] = useState<Record<string, boolean>>({ fr: true });
  const [selectedDishLanguageCode, setSelectedDishLanguageCode] = useState<string>("fr");
  const [selectedOptionLanguageCode, setSelectedOptionLanguageCode] = useState<string>("fr");
  const [selectedExtraLanguageCode, setSelectedExtraLanguageCode] = useState<string>("fr");
  const [selectedFormulaLanguageCode, setSelectedFormulaLanguageCode] = useState<string>("fr");
  const toggleDishLanguagePanel = (code: string) => {
    setOpenDishLanguagePanels((prev) => ({ ...prev, [code]: !prev[code] }));
  };
  const [newSubCategoryI18n, setNewSubCategoryI18n] = useState<Record<string, string>>({});
  const [editingSubCategoryId, setEditingSubCategoryId] = useState<string | number | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | number | null>(null);
  const [newSide, setNewSide] = useState({
    name_fr: "",
    name_en: "",
    name_es: "",
    name_de: "",
  });
  const [newSideI18n, setNewSideI18n] = useState<Record<string, string>>({});
  const [editingSideId, setEditingSideId] = useState<number | null>(null);
  const [showSideModal, setShowSideModal] = useState(false);
  const [sideForm, setSideForm] = useState({
    name_fr: "",
    name_en: "",
    name_es: "",
    name_de: "",
  });

  const [sideFormI18n, setSideFormI18n] = useState<Record<string, string>>({});
  const [dishExtraDraft, setDishExtraDraft] = useState<DishExtraDraftForm>({
    name_fr: "",
    name_en: "",
    name_es: "",
    name_de: "",
    names_i18n: {},
    price: "",
  });
  const [editingExtraId, setEditingExtraId] = useState<string | null>(null);
  const [editingExtraOriginKey, setEditingExtraOriginKey] = useState<string | null>(null);
  const [loadedDishExtras, setLoadedDishExtras] = useState<ExtrasItem[]>([]);
  const [extrasTouched, setExtrasTouched] = useState(false);
  const [productOptionDraft, setProductOptionDraft] = useState<{
    name: string;
    price_override: string;
    names_i18n: Record<string, string>;
  }>({
    name: "",
    price_override: "",
    names_i18n: {},
  });
  const [editingProductOptionId, setEditingProductOptionId] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name_fr: "",
    name_en: "",
    name_es: "",
    name_de: "",
    destination: "cuisine",
    sort_order: "1",
  });
  const [categoryFormI18n, setCategoryFormI18n] = useState<Record<string, string>>({});

  const [showDishModal, setShowDishModal] = useState(false);
  const [activeDishModalTab, setActiveDishModalTab] = useState<"general" | "options" | "formula">("general");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dishToDelete, setDishToDelete] = useState<Dish | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [dishSaveStatus, setDishSaveStatus] = useState<"idle" | "saving" | "success">("idle");
  const [selectedMainDishOptions, setSelectedMainDishOptions] = useState<string[]>([]);
  const [excludedMainOptionsTouched, setExcludedMainOptionsTouched] = useState(false);
  const [isRadarLoaded, setIsRadarLoaded] = useState(false);
  const [formulaMainOptionsFormulaId, setFormulaMainOptionsFormulaId] = useState<string>("");
  const [mainOptionsSaveStatus, setMainOptionsSaveStatus] = useState<"idle" | "saving" | "success">("idle");
  const [formulaVisibilitySaveStatus, setFormulaVisibilitySaveStatus] = useState<"idle" | "saving" | "success">("idle");
  const [formulaSupplementsSaveStatus, setFormulaSupplementsSaveStatus] = useState<"idle" | "saving" | "success">("idle");
  const [selectedFormulaDishes, setSelectedFormulaDishes] = useState<string[]>([]);
  const [dishSteps, setDishSteps] = useState<Record<string, number>>({});
  const [mainDishStep, setMainDishStep] = useState<number>(1);
  const [categorySaveStatus, setCategorySaveStatus] = useState<"idle" | "saving" | "success">("idle");
  const [sideSaveStatus, setSideSaveStatus] = useState<"idle" | "saving" | "success">("idle");
  const [restaurantSaveStatus, setRestaurantSaveStatus] = useState<"idle" | "saving" | "success">("idle");
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formulaImagePreviewUrl, setFormulaImagePreviewUrl] = useState("");
  const [isUploadingFormulaImage, setIsUploadingFormulaImage] = useState(false);
  const [formulaDescription, setFormulaDescription] = useState("");
  const [formulaImage, setFormulaImage] = useState("");
  const [formulaKcal, setFormulaKcal] = useState("");
  const [formulaAllergens, setFormulaAllergens] = useState<string[]>([]);

  const [formData, setFormData] = useState<DishForm>({
    name_fr: "",
    name_en: "",
    name_es: "",
    name_de: "",
    name_i18n: {},
    description_fr: "",
    description_en: "",
    description_es: "",
    description_de: "",
    description_i18n: {},
    price: "",
    formula_price: "",
    available_days: [],
    start_time: "",
    end_time: "",
    category_id: "",
    subcategory_id: "",
    hunger_level: "",
    hunger_levels: createEmptyHungerLevels(),
    image_url: "",
    calories: "",
    allergens: "",
  has_sides: false,
  has_extras: false,
  allow_multi_select: false,
  ask_cooking: false,
  is_vegetarian_badge: false,
    is_spicy_badge: false,
    is_new_badge: false,
    is_gluten_free_badge: false,
    is_chef_suggestion: false,
    is_daily_special: false,
    is_promo: false,
    is_alcohol: false,
    promo_price: "",
    is_suggestion: false,
    is_active: true,
    is_formula: false,
    is_formula_active: true,
    formula_category_ids: [],
    formula_dish_ids: [],
    formula_default_option_ids: {},
    formula_config: null,
    formula_sequence_by_dish: {},
  formula_name: "",
  formula_name_i18n: {},
  formula_image_url: "",
  formula_description: "",
  formula_description_i18n: {},
  formula_calories: "",
  formula_allergens: [],
  only_in_formula: false,
  linked_formula_ids: [],
    max_options: "1",
    selected_side_ids: [],
    extras_list: [],
    product_options: [],
    sales_tip: "",
    sales_tip_i18n: {},
    sales_tip_dish_id: "",
  });
  const [allergenFormI18n, setAllergenFormI18n] = useState<Record<string, Record<string, string>>>({});
  const [isUploadingRestaurantLogo, setIsUploadingRestaurantLogo] = useState(false);
  const [isUploadingRestaurantBanner, setIsUploadingRestaurantBanner] = useState(false);
  const [isUploadingRestaurantBackground, setIsUploadingRestaurantBackground] = useState(false);
  const [isUploadingRestaurantWelcome, setIsUploadingRestaurantWelcome] = useState(false);
  return {
    openManagerPanels,
    newSubCategory,
    openDishLanguagePanels,
    selectedDishLanguageCode,
    selectedOptionLanguageCode,
    selectedExtraLanguageCode,
    selectedFormulaLanguageCode,
    newSubCategoryI18n,
    editingSubCategoryId,
    editingCategoryId,
    newSide,
    newSideI18n,
    editingSideId,
    showSideModal,
    sideForm,
    sideFormI18n,
    dishExtraDraft,
    editingExtraId,
    editingExtraOriginKey,
    loadedDishExtras,
    extrasTouched,
    productOptionDraft,
    editingProductOptionId,
    showCategoryModal,
    categoryForm,
    categoryFormI18n,
    showDishModal,
    activeDishModalTab,
    showDeleteModal,
    dishToDelete,
    editingDish,
    dishSaveStatus,
    selectedMainDishOptions,
    excludedMainOptionsTouched,
    isRadarLoaded,
    formulaMainOptionsFormulaId,
    mainOptionsSaveStatus,
    formulaVisibilitySaveStatus,
    formulaSupplementsSaveStatus,
    selectedFormulaDishes,
    dishSteps,
    mainDishStep,
    categorySaveStatus,
    sideSaveStatus,
    restaurantSaveStatus,
    imagePreviewUrl,
    isUploadingImage,
    formulaImagePreviewUrl,
    isUploadingFormulaImage,
    formulaDescription,
    formulaImage,
    formulaKcal,
    formulaAllergens,
    formData,
    allergenFormI18n,
    isUploadingRestaurantLogo,
    isUploadingRestaurantBanner,
    isUploadingRestaurantBackground,
    isUploadingRestaurantWelcome,
    setOpenManagerPanels,
    setNewSubCategory,
    setOpenDishLanguagePanels,
    setSelectedDishLanguageCode,
    setSelectedOptionLanguageCode,
    setSelectedExtraLanguageCode,
    setSelectedFormulaLanguageCode,
    setNewSubCategoryI18n,
    setEditingSubCategoryId,
    setEditingCategoryId,
    setNewSide,
    setNewSideI18n,
    setEditingSideId,
    setShowSideModal,
    setSideForm,
    setSideFormI18n,
    setDishExtraDraft,
    setEditingExtraId,
    setEditingExtraOriginKey,
    setLoadedDishExtras,
    setExtrasTouched,
    setProductOptionDraft,
    setEditingProductOptionId,
    setShowCategoryModal,
    setCategoryForm,
    setCategoryFormI18n,
    setShowDishModal,
    setActiveDishModalTab,
    setShowDeleteModal,
    setDishToDelete,
    setEditingDish,
    setDishSaveStatus,
    setSelectedMainDishOptions,
    setExcludedMainOptionsTouched,
    setIsRadarLoaded,
    setFormulaMainOptionsFormulaId,
    setMainOptionsSaveStatus,
    setFormulaVisibilitySaveStatus,
    setFormulaSupplementsSaveStatus,
    setSelectedFormulaDishes,
    setDishSteps,
    setMainDishStep,
    setCategorySaveStatus,
    setSideSaveStatus,
    setRestaurantSaveStatus,
    setImagePreviewUrl,
    setIsUploadingImage,
    setFormulaImagePreviewUrl,
    setIsUploadingFormulaImage,
    setFormulaDescription,
    setFormulaImage,
    setFormulaKcal,
    setFormulaAllergens,
    setFormData,
    setAllergenFormI18n,
    setIsUploadingRestaurantLogo,
    setIsUploadingRestaurantBanner,
    setIsUploadingRestaurantBackground,
    setIsUploadingRestaurantWelcome,
    toggleManagerPanel,
    toggleDishLanguagePanel
  };
}
