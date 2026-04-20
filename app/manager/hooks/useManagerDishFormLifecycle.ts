// @ts-nocheck
export function useManagerDishFormLifecycle(deps: Record<string, any>) {
  const {
    setDishSaveStatus,
    setMainOptionsSaveStatus,
    setFormulaVisibilitySaveStatus,
    setFormulaSupplementsSaveStatus,
    setSelectedMainDishOptions,
    setExcludedMainOptionsTouched,
    setIsRadarLoaded,
    setSelectedFormulaDishes,
    setDishSteps,
    setMainDishStep,
    setFormData,
    categories,
    createEmptyHungerLevels,
    setImagePreviewUrl,
    setFormulaImagePreviewUrl,
    setFormulaDescription,
    setFormulaImage,
    setFormulaKcal,
    setFormulaAllergens,
    setEditingDish,
    setDishExtraDraft,
    setEditingExtraId,
    setEditingExtraOriginKey,
    setLoadedDishExtras,
    setExtrasTouched,
    setProductOptionDraft,
    setEditingProductOptionId,
    setAllergenFormI18n,
    setFormulaMainOptionsFormulaId,
    setSelectedDishLanguageCode,
    setSelectedOptionLanguageCode,
    setSelectedExtraLanguageCode,
    setSelectedFormulaLanguageCode,
    setActiveDishModalTab,
    setOpenDishLanguagePanels,
    setShowDishModal,
  } = deps;

  const resetForm = () => {
    setDishSaveStatus("idle");
    setMainOptionsSaveStatus("idle");
    setFormulaVisibilitySaveStatus("idle");
    setFormulaSupplementsSaveStatus("idle");
    setSelectedMainDishOptions([]);
    setExcludedMainOptionsTouched(false);
    setIsRadarLoaded(false);
    setSelectedFormulaDishes([]);
    setDishSteps({});
    setMainDishStep(1);
    setFormData({
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
      formula_description: "",
      formula_allergens: [],
      available_days: [],
      start_time: "",
      end_time: "",
      category_id: categories[0] ? String(categories[0].id) : "",
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
      formula_calories: "",
      formula_description_i18n: {},
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
    setImagePreviewUrl("");
    setFormulaImagePreviewUrl("");
    setFormulaDescription("");
    setFormulaImage("");
    setFormulaKcal("");
    setFormulaAllergens([]);
    setEditingDish(null);
    setDishExtraDraft({ name_fr: "", name_en: "", name_es: "", name_de: "", names_i18n: {}, price: "" });
    setEditingExtraId(null);
    setEditingExtraOriginKey(null);
    setLoadedDishExtras([]);
    setExtrasTouched(false);
    setProductOptionDraft({ name: "", price_override: "", names_i18n: {} });
    setEditingProductOptionId(null);
    setAllergenFormI18n({});
    setFormulaMainOptionsFormulaId("");
    setSelectedDishLanguageCode("fr");
    setSelectedOptionLanguageCode("fr");
    setSelectedExtraLanguageCode("fr");
    setSelectedFormulaLanguageCode("fr");
  };

  const handleAddDish = () => {
    resetForm();
    setDishSaveStatus("idle");
    setActiveDishModalTab("general");
    setOpenDishLanguagePanels({ fr: true });
    setShowDishModal(true);
  };

  return { resetForm, handleAddDish };
}
