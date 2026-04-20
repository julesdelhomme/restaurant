// @ts-nocheck
import React, { useEffect } from "react";
import { ChevronDown, ChevronRight, CircleHelp, Pencil, Trash2 } from "lucide-react";

type ProductOptionItem = any;

type DishEditorModalProps = {
  [key: string]: any;
  showDishModal: boolean;
};

export default function DishEditorModal(props: DishEditorModalProps) {
  const {
    showDishModal,
    setShowDishModal = () => undefined,
    editingDish,
    activeManagerTab = "menu",
    t,
    translations = {},
    activeDishModalTab = "general",
    setActiveDishModalTab = () => undefined,
    formData: rawFormData,
    setFormData = () => undefined,
    activeLanguageCodes = [],
    openDishLanguagePanels = {},
    allergenLibrary = [],
    imagePreviewUrl,
    isUploadingImage,
    handleDishImageUpload = async () => undefined,
    getDefaultSuggestionLead = () => "",
    toggleDishLanguagePanel = () => undefined,
    sortedCategories = [],
    categories = [],
    subCategoryRows = [],
    getCategoryLabel = (category: Record<string, unknown>) =>
      String(
        category?.name_fr ??
          category?.name ??
          category?.label ??
          category?.title ??
          category?.id ??
          ""
      ).trim(),
    DISH_AVAILABLE_DAY_OPTIONS,
    HUNGER_LEVELS = [],
    STANDARD_FORMULA_ALLERGENS = [],
    ALLERGEN_OPTIONS = [],
    selectedDishLanguageCode,
    setSelectedDishLanguageCode = () => undefined,
    normalizeLanguageKey = (value: string) => value,
    languageLabels,
    DEFAULT_LANGUAGE_LABELS,
    selectedOptionLanguageCode,
    setSelectedOptionLanguageCode = () => undefined,
    productOptionDraft = { name: "", price_override: "", names_i18n: {} },
    setProductOptionDraft = () => undefined,
    editingProductOptionId,
    setEditingProductOptionId = () => undefined,
    handleAddProductOptionToDish = () => undefined,
    handleEditProductOptionInDish = () => undefined,
    handleRemoveProductOptionFromDish = () => undefined,
    selectedExtraLanguageCode,
    setSelectedExtraLanguageCode = () => undefined,
    dishExtraDraft = { name_fr: "", name_en: "", name_es: "", name_de: "", names_i18n: {}, price: "" },
    setDishExtraDraft = () => undefined,
    editingExtraId,
    setEditingExtraId = () => undefined,
    setEditingExtraOriginKey = () => undefined,
    handleAddExtraToDish = () => undefined,
    handleEditExtraInDish = () => undefined,
    handleRemoveExtraFromDish = () => undefined,
    formulaSupplementsSaveStatus,
    handleSaveFormulaSupplements,
    formulaDescription,
    setFormulaDescription = () => undefined,
    formulaImage,
    setFormulaImage = () => undefined,
    isUploadingFormulaImage,
    formulaImagePreviewUrl,
    handleFormulaImageUpload = async () => undefined,
    selectedFormulaLanguageCode,
    setSelectedFormulaLanguageCode = () => undefined,
    formulaKcal,
    setFormulaKcal = () => undefined,
    formulaAllergens,
    setFormulaAllergens = () => undefined,
    formulaVisibilitySaveStatus,
    setFormulaVisibilitySaveStatus = () => undefined,
    handleSaveFormulaVisibility = () => undefined,
    formulaSelectableDishGroups,
    selectedFormulaDishes,
    setSelectedFormulaDishes = () => undefined,
    readFormulaDefaultOptionIdsMap,
    dishSteps,
    setDishSteps = () => undefined,
    FORMULA_PARENT_STEP_KEY = "__formula_parent__",
    mainDishStep,
    setMainDishStep = () => undefined,
    updateStep,
    preparedDishesSorted,
    getLanguageColumnKeys,
    handleFormulaDefaultOptionToggle,
    selectedMainDishOptions,
    handleToggleExcludedMainOption = () => undefined,
    handleSaveExcludedMainOptions = () => undefined,
    mainOptionsSaveStatus,
    isRadarLoaded,
    formulaDishes = [],
    dishes = [],
    sidesLibrary = [],
    sides,
    parseI18nToken = () => ({}),
    toBoolean = (value, fallback = false) => (value == null ? fallback : value === true || String(value).toLowerCase() === "true"),
    normalizeText,
    formatEuro = (value: number) => Number(value || 0).toFixed(2),
    handleSave = () => undefined,
    dishSaveStatus,
    resetForm = () => undefined,
  } = props;

  const formData = {
    ...((rawFormData && typeof rawFormData === "object" ? rawFormData : {}) as Record<string, any>),
    is_formula: Boolean(rawFormData?.is_formula),
    formula_category_ids: Array.isArray(rawFormData?.formula_category_ids) ? rawFormData.formula_category_ids : [],
    formula_dish_ids: Array.isArray(rawFormData?.formula_dish_ids) ? rawFormData.formula_dish_ids : [],
    formula_default_option_ids:
      rawFormData?.formula_default_option_ids &&
      typeof rawFormData.formula_default_option_ids === "object" &&
      !Array.isArray(rawFormData.formula_default_option_ids)
        ? rawFormData.formula_default_option_ids
        : {},
    formula_sequence_by_dish:
      rawFormData?.formula_sequence_by_dish &&
      typeof rawFormData.formula_sequence_by_dish === "object" &&
      !Array.isArray(rawFormData.formula_sequence_by_dish)
        ? rawFormData.formula_sequence_by_dish
        : {},
    selected_side_ids: Array.isArray(rawFormData?.selected_side_ids) ? rawFormData.selected_side_ids : [],
    product_options: Array.isArray(rawFormData?.product_options) ? rawFormData.product_options : [],
    extras_list: Array.isArray(rawFormData?.extras_list) ? rawFormData.extras_list : [],
  };

  const translateLabel = (key: string, fallback: string) => {
    if (typeof t === "function") {
      const value = t(key);
      if (typeof value === "string" && value.trim()) return value;
    }
    if (translations && typeof translations === "object") {
      const value = (translations as Record<string, unknown>)[key];
      if (typeof value === "string" && value.trim()) return value;
    }
    return fallback;
  };

  const resolvedDishLanguageCode = normalizeLanguageKey(String(selectedDishLanguageCode || "fr"));
  const resolvedFormulaLanguageCode = normalizeLanguageKey(String(selectedFormulaLanguageCode || "fr"));
  const dishTranslationPanelOpen = Boolean(openDishLanguagePanels?.dish_fields);
  const formulaTranslationPanelOpen = Boolean(openDishLanguagePanels?.formula_fields);
  const availableSubCategories = subCategoryRows.filter(
    (row) => String(row.category_id || "") === String(formData.category_id || "")
  );
  const selectedAllergenIds = String(formData.allergens || "")
    .split(",")
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const formulaSelectedAllergenIds = Array.isArray(formulaAllergens)
    ? formulaAllergens.map((value) => String(value || "").trim()).filter(Boolean)
    : [];
  const normalizeHungerValue = (value: unknown) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const normalized = raw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
    if (normalized === "petite faim" || normalized === "small hunger") return "Petite faim";
    if (normalized === "moyenne faim" || normalized === "medium hunger") return "Moyenne faim";
    if (
      normalized === "grande faim" ||
      normalized === "grosse faim" ||
      normalized === "big hunger" ||
      normalized === "large hunger" ||
      normalized === "hearty"
    ) {
      return "Grande faim";
    }
    return raw;
  };
  const normalizeHungerKey = (value: unknown): "small" | "medium" | "large" | "" => {
    const normalized = normalizeHungerValue(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
    if (normalized === "petite faim") return "small";
    if (normalized === "moyenne faim") return "medium";
    if (normalized === "grande faim") return "large";
    return "";
  };
  const normalizeHungerLevelsPayload = (raw: unknown) => {
    const normalized = { small: false, medium: false, large: false };
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const node = raw as Record<string, unknown>;
      normalized.small = Boolean(node.small ?? node.petite ?? node.petite_faim ?? node.petiteFaim);
      normalized.medium = Boolean(node.medium ?? node.moyenne ?? node.moyenne_faim ?? node.moyenneFaim);
      normalized.large = Boolean(node.large ?? node.big ?? node.grande ?? node.grosse ?? node.grande_faim ?? node.grosse_faim);
      return normalized;
    }
    if (typeof raw === "string" && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        return normalizeHungerLevelsPayload(parsed);
      } catch {
        const key = normalizeHungerKey(raw);
        if (key) normalized[key] = true;
      }
    }
    return normalized;
  };
  const hungerOptions = Array.from(
    new Set(
      (Array.isArray(HUNGER_LEVELS) && HUNGER_LEVELS.length > 0
        ? HUNGER_LEVELS
        : ["Petite faim", "Moyenne faim", "Grande faim"]
      )
        .map((value) => normalizeHungerValue(value))
        .filter(Boolean)
    )
  );
  const hungerLevelsState = (() => {
    const base = normalizeHungerLevelsPayload(formData.hunger_levels);
    if (!base.small && !base.medium && !base.large && formData.hunger_level) {
      const fallbackKey = normalizeHungerKey(formData.hunger_level);
      if (fallbackKey) base[fallbackKey] = true;
    }
    return base;
  })();
  const hungerLabelByKey = {
    small: "Petite faim",
    medium: "Moyenne faim",
    large: "Grande faim",
  } as const;
  const normalizeFormulaStepEntries = (raw: unknown) => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((entry, index) => {
        const row =
          entry && typeof entry === "object" && !Array.isArray(entry)
            ? (entry as Record<string, unknown>)
            : {};
        const title = String(row.title ?? "").trim();
        const optionsRaw = Array.isArray(row.options)
          ? row.options
          : Array.isArray(row.dish_ids)
            ? row.dish_ids
            : [];
        const rawDestination = String(row.destination ?? row.notify_target ?? row.target ?? "").trim().toLowerCase();
        const destination = rawDestination === "bar" ? "bar" : "cuisine";
        const options = Array.from(new Set(optionsRaw.map((value) => String(value || "").trim()).filter(Boolean)));
        return {
          title: title || `Étape ${index + 1}`,
          options,
          auto_notify: false,
          destination,
        };
      })
      .filter((step) => step.options.length > 0 || Boolean(step.title));
  };
  const buildStepMapFromEntries = (
    entries: Array<{ title: string; options: string[]; auto_notify?: boolean; destination?: string }>
  ) => {
    const map: Record<string, number> = {};
    entries.forEach((entry, index) => {
      entry.options.forEach((dishId) => {
        const normalizedDishId = String(dishId || "").trim();
        if (!normalizedDishId) return;
        map[normalizedDishId] = index + 1;
      });
    });
    return map;
  };
  const readCurrentFormulaSteps = (source: Record<string, any>) => {
    const selectedDishIds = Array.from(
      new Set((Array.isArray(source?.formula_dish_ids) ? source.formula_dish_ids : []).map((dishId) => String(dishId || "").trim()).filter(Boolean))
    );
    const baseConfig =
      source?.formula_config && typeof source.formula_config === "object" && !Array.isArray(source.formula_config)
        ? (source.formula_config as Record<string, unknown>)
        : {};
    const fromConfig = normalizeFormulaStepEntries(baseConfig.steps);
    const resolved = fromConfig.length > 0 ? fromConfig : [{ title: "Étape 1", options: [...selectedDishIds], auto_notify: false, destination: "cuisine" }];
    const assigned = new Set(resolved.flatMap((step) => step.options));
    selectedDishIds.forEach((dishId) => {
      if (!assigned.has(dishId)) {
        resolved[0].options = Array.from(new Set([...(resolved[0].options || []), dishId]));
      }
    });
    return resolved.map((step, index) => ({
      title: String(step.title || "").trim() || `Étape ${index + 1}`,
      options: Array.from(new Set((step.options || []).map((dishId) => String(dishId || "").trim()).filter(Boolean))),
      auto_notify: false,
      destination: step.destination === "bar" ? "bar" : "cuisine",
    }));
  };
  const setFormulaSteps = (
    updater: (
      current: Array<{ title: string; options: string[]; auto_notify: boolean; destination: "cuisine" | "bar" }>
    ) => Array<{ title: string; options: string[]; auto_notify?: boolean; destination?: "cuisine" | "bar" }>
  ) => {
    const formulaParentKey = String(editingDish?.id || "").trim() || FORMULA_PARENT_STEP_KEY;
    setFormData((prev) => {
      const steps = readCurrentFormulaSteps(prev);
      const nextRaw = updater(steps);
      const nextSteps = (Array.isArray(nextRaw) ? nextRaw : [])
        .map((step, index) => ({
          title: String(step?.title || "").trim() || `Étape ${index + 1}`,
          options: Array.from(new Set((Array.isArray(step?.options) ? step.options : []).map((dishId) => String(dishId || "").trim()).filter(Boolean))),
          auto_notify: false,
          destination: (step as any)?.destination === "bar" ? "bar" : "cuisine",
        }))
        .filter((step) => step.options.length > 0 || Boolean(step.title));
      const ensuredSteps = nextSteps.length > 0 ? nextSteps : [{ title: "Étape 1", options: [], auto_notify: false, destination: "cuisine" as const }];
      const stepMap = buildStepMapFromEntries(ensuredSteps);
      const baseConfig =
        prev?.formula_config && typeof prev.formula_config === "object" && !Array.isArray(prev.formula_config)
          ? (prev.formula_config as Record<string, unknown>)
          : {};
      const currentMainStepRaw = Number(
        (baseConfig as Record<string, unknown>)?.main_dish_step ??
          prev?.formula_sequence_by_dish?.[formulaParentKey] ??
          mainDishStep ??
          1
      );
      const currentMainStep = Number.isFinite(currentMainStepRaw) && currentMainStepRaw > 0 ? Math.trunc(currentMainStepRaw) : 1;
      const cappedMainStep = Math.max(1, Math.min(ensuredSteps.length, currentMainStep));
      return {
        ...prev,
        formula_sequence_by_dish: {
          ...(prev?.formula_sequence_by_dish || {}),
          ...stepMap,
          [formulaParentKey]: cappedMainStep,
        },
        formula_config: {
          ...baseConfig,
          steps: ensuredSteps,
          steps_by_dish: stepMap,
          selected_dishes: Array.from(
            new Set((Array.isArray(prev?.formula_dish_ids) ? prev.formula_dish_ids : []).map((dishId) => String(dishId || "").trim()).filter(Boolean))
          ),
          step_count: Math.max(1, ensuredSteps.length),
          main_dish_step: cappedMainStep,
        },
      };
    });
  };
  const resolvedDishModalTab = activeDishModalTab === "formula" && !formData.is_formula ? "general" : activeDishModalTab;
  const formulaParentKey = String(editingDish?.id || "").trim() || FORMULA_PARENT_STEP_KEY;
  const formulaMainStepRaw = Number(
    ((formData.formula_config as Record<string, unknown> | null)?.main_dish_step as number | undefined) ??
      formData.formula_sequence_by_dish?.[formulaParentKey] ??
      mainDishStep ??
      1
  );
  const formulaMainStep = Number.isFinite(formulaMainStepRaw) && formulaMainStepRaw > 0
    ? Math.max(1, Math.trunc(formulaMainStepRaw))
    : 1;
  const formulaStepEntries = (() => {
    const fromConfig = normalizeFormulaStepEntries(
      formData.formula_config && typeof formData.formula_config === "object" ? formData.formula_config.steps : null
    );
    if (fromConfig.length > 0) return fromConfig;
    const fallbackLength = Math.max(1, Math.min(formulaMainStep, 12));
    return Array.from({ length: fallbackLength }, (_, index) => ({
      title: `Étape ${index + 1}`,
      options: [] as string[],
      auto_notify: false,
      destination: "cuisine" as const,
    }));
  })();
  const maxAssignedStepFromSequence = Math.max(
    1,
    ...Object.entries(formData.formula_sequence_by_dish || {})
      .filter(([dishId]) => String(dishId || "").trim() !== formulaParentKey)
      .map(([, step]) => Math.max(1, Math.trunc(Number(step) || 1)))
  );
  const formulaStepCountForUi = Math.max(3, formulaStepEntries.length, maxAssignedStepFromSequence);
  const formulaStepEntriesForUi = Array.from({ length: formulaStepCountForUi }, (_, index) => {
    const existing = formulaStepEntries[index];
    return {
      title: String(existing?.title || "").trim() || `Étape ${index + 1}`,
      options: Array.isArray(existing?.options)
        ? existing.options.map((value) => String(value || "").trim()).filter(Boolean)
        : [],
      auto_notify: false,
      destination: existing?.destination === "bar" ? "bar" : "cuisine",
    };
  });
  const selectedFormulaDishRows = (Array.isArray(formData.formula_dish_ids) ? formData.formula_dish_ids : [])
    .map((dishIdRaw) => String(dishIdRaw || "").trim())
    .filter(Boolean)
    .map((dishId) => {
      const dish = dishes.find((row) => String(row.id || "").trim() === dishId);
      return {
        id: dishId,
        name: String(dish?.name_fr || dish?.name || `Plat #${dishId}`),
      };
    });
  const formulaParentDishLabel = String(editingDish?.name_fr || editingDish?.name || `Plat principal`).trim();
  const selectedFormulaRowsWithParent = [
    { id: formulaParentKey, name: formulaParentDishLabel || "Plat principal", isParent: true },
    ...selectedFormulaDishRows.map((row) => ({ ...row, isParent: false })),
  ];

  useEffect(() => {
    if (!showDishModal) return;
    setSelectedFormulaDishes(
      Array.isArray(formData.formula_dish_ids)
        ? formData.formula_dish_ids.map((id) => String(id || "").trim()).filter(Boolean)
        : []
    );
  }, [formData.formula_dish_ids, setSelectedFormulaDishes, showDishModal]);

  useEffect(() => {
    if (!showDishModal) return;
    const nextSteps = Object.fromEntries(
      (Array.isArray(formData.formula_dish_ids) ? formData.formula_dish_ids : [])
        .map((dishId) => String(dishId || "").trim())
        .filter(Boolean)
        .map((dishId) => {
          const raw = Number(formData.formula_sequence_by_dish?.[dishId]);
          const step = Number.isFinite(raw) && raw > 0 ? Math.max(1, Math.trunc(raw)) : 1;
          return [dishId, step];
        })
    );
    setDishSteps(nextSteps);
  }, [formData.formula_dish_ids, formData.formula_sequence_by_dish, setDishSteps, showDishModal]);

  useEffect(() => {
    if (!showDishModal) return;
    const formulaParentKey = String(editingDish?.id || "").trim() || FORMULA_PARENT_STEP_KEY;
    const raw = Number(formData.formula_sequence_by_dish?.[formulaParentKey]);
    const nextMainStep = Number.isFinite(raw) && raw > 0 ? Math.max(1, Math.trunc(raw)) : 1;
    setMainDishStep(nextMainStep);
  }, [editingDish?.id, formData.formula_sequence_by_dish, FORMULA_PARENT_STEP_KEY, setMainDishStep, showDishModal]);

  useEffect(() => {
    if (!showDishModal) return;
    if (activeDishModalTab === "formula" && !formData.is_formula) {
      setActiveDishModalTab("general");
    }
  }, [activeDishModalTab, formData.is_formula, setActiveDishModalTab, showDishModal]);

  return (
<>
      {showDishModal && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border-2 border-black w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 pb-2">
            <h3 className="text-2xl font-black mb-4">
              {editingDish ? "Modifier un plat" : "Ajouter un plat"}
            </h3>
            </div>
            <div className="px-6 pb-3">
              <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveDishModalTab("general")}
                  className={`px-3 py-2 text-sm font-black border-2 border-black ${
                    resolvedDishModalTab === "general" ? "bg-black text-white" : "bg-white text-black"
                  }`}
                >
                  {translateLabel("manager.dish_editor.tabs.general", "Général")}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDishModalTab("options")}
                  className={`px-3 py-2 text-sm font-black border-2 border-black ${
                    resolvedDishModalTab === "options" ? "bg-black text-white" : "bg-white text-black"
                  }`}
                >
                  {translateLabel("manager.dish_editor.tabs.options", "Options & Variantes")}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDishModalTab("availability")}
                  className={`px-3 py-2 text-sm font-black border-2 border-black ${
                    resolvedDishModalTab === "availability" ? "bg-black text-white" : "bg-white text-black"
                  }`}
                >
                  Disponibilité
                </button>
                {formData.is_formula ? (
                  <button
                    type="button"
                    onClick={() => setActiveDishModalTab("formula")}
                    className={`px-3 py-2 text-sm font-black border-2 border-black ${
                      resolvedDishModalTab === "formula" ? "bg-black text-white" : "bg-white text-black"
                    }`}
                  >
                    {translateLabel("manager.dish_editor.tabs.formula", "Formule")}
                  </button>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 border border-gray-200 rounded bg-gray-50 px-3 py-2">
                <label className="flex items-center gap-2 text-sm font-bold text-black">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.is_formula)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_formula: e.target.checked,
                        formula_category_ids: e.target.checked ? formData.formula_category_ids : [],
                        formula_dish_ids: e.target.checked ? formData.formula_dish_ids : [],
                        formula_default_option_ids: e.target.checked ? formData.formula_default_option_ids : {},
                        formula_sequence_by_dish: e.target.checked ? formData.formula_sequence_by_dish : {},
                        formula_name: e.target.checked ? formData.formula_name : "",
                        formula_image_url: e.target.checked ? formData.formula_image_url : "",
                      })
                    }
                  />
                  Est une formule
                </label>
                {formData.is_formula ? (
                  <span className="text-xs font-semibold text-gray-600">
                    L&apos;onglet Formule est activé.
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-gray-600">
                    Activez cette option pour afficher l&apos;onglet Formule.
                  </span>
                )}
              </div>
            </div>
            <div className="px-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resolvedDishModalTab === "general" ? (
                <>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="font-bold">Nom français</label>
                      <button
                        type="button"
                        onClick={() => toggleDishLanguagePanel("dish_fields")}
                        className="px-2 py-0.5 text-xs font-black border border-black"
                        title="Traductions du nom/description/message"
                      >
                        ðŸŒ
                      </button>
                    </div>
                    <input
                      type="text"
                      value={formData.name_fr}
                      onChange={(e) => setFormData({ ...formData, name_fr: e.target.value })}
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 font-bold">Prix (&euro;)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block mb-1 font-bold">Description française</label>
                    <textarea
                      value={formData.description_fr}
                      onChange={(e) => setFormData({ ...formData, description_fr: e.target.value })}
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                      rows={3}
                    />
                  </div>
                  {dishTranslationPanelOpen ? (
                    <div className="md:col-span-2 border border-gray-200 rounded bg-gray-50 p-3">
                      <div className="mb-2 text-xs font-black uppercase tracking-wide text-gray-700">Traductions</div>
                      <div className="mb-3 flex flex-wrap gap-2">
                        {activeLanguageCodes.map((code) => {
                          const normalized = normalizeLanguageKey(code);
                          return (
                            <button
                              key={`dish-lang-${normalized}`}
                              type="button"
                              onClick={() => setSelectedDishLanguageCode(normalized)}
                              className={`px-2 py-1 text-xs font-black border ${
                                resolvedDishLanguageCode === normalized ? "border-black bg-black text-white" : "border-gray-300 bg-white text-black"
                              }`}
                            >
                              {String(languageLabels?.[normalized] || DEFAULT_LANGUAGE_LABELS?.[normalized] || normalized.toUpperCase())}
                            </button>
                          );
                        })}
                      </div>
                      {resolvedDishLanguageCode !== "fr" ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block mb-1 text-xs font-bold">Nom ({resolvedDishLanguageCode.toUpperCase()})</label>
                            <input
                              type="text"
                              value={formData.name_i18n?.[resolvedDishLanguageCode] || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setFormData((prev) => ({
                                  ...prev,
                                  name_i18n: {
                                    ...(prev.name_i18n || {}),
                                    [resolvedDishLanguageCode]: value,
                                  },
                                  ...(resolvedDishLanguageCode === "en" ? { name_en: value } : {}),
                                  ...(resolvedDishLanguageCode === "es" ? { name_es: value } : {}),
                                  ...(resolvedDishLanguageCode === "de" ? { name_de: value } : {}),
                                }));
                              }}
                              className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                            />
                          </div>
                          <div>
                            <label className="block mb-1 text-xs font-bold">Description ({resolvedDishLanguageCode.toUpperCase()})</label>
                            <textarea
                              value={formData.description_i18n?.[resolvedDishLanguageCode] || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setFormData((prev) => ({
                                  ...prev,
                                  description_i18n: {
                                    ...(prev.description_i18n || {}),
                                    [resolvedDishLanguageCode]: value,
                                  },
                                  ...(resolvedDishLanguageCode === "en" ? { description_en: value } : {}),
                                  ...(resolvedDishLanguageCode === "es" ? { description_es: value } : {}),
                                  ...(resolvedDishLanguageCode === "de" ? { description_de: value } : {}),
                                }));
                              }}
                              className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="block mb-1 text-xs font-bold">
                              Message cross-selling ({resolvedDishLanguageCode.toUpperCase()})
                            </label>
                            <input
                              type="text"
                              value={formData.sales_tip_i18n?.[resolvedDishLanguageCode] || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setFormData((prev) => ({
                                  ...prev,
                                  sales_tip_i18n: {
                                    ...(prev.sales_tip_i18n || {}),
                                    [resolvedDishLanguageCode]: value,
                                  },
                                }));
                              }}
                              className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                              placeholder={getDefaultSuggestionLead(resolvedDishLanguageCode)}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-600">Sélectionnez une langue hors FR pour modifier les traductions.</div>
                      )}
                    </div>
                  ) : null}

                  <div>
                    <label className="block mb-1 font-bold">Catégorie</label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value, subcategory_id: "" })}
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                    >
                      <option value="">--</option>
                      {sortedCategories.map((cat) => (
                        <option key={cat.id} value={String(cat.id)}>
                          {getCategoryLabel(cat)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-bold">Sous-catégorie</label>
                    <select
                      value={String(formData.subcategory_id || "")}
                      onChange={(e) => setFormData({ ...formData, subcategory_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                    >
                      <option value="">--</option>
                      {availableSubCategories.map((sub) => (
                        <option key={`subcat-${sub.id}`} value={String(sub.id)}>
                          {String(sub.name_fr || sub.name || `Sous-catégorie ${sub.id}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block mb-1 font-bold">Niveaux de faim</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border border-gray-200 rounded p-2 bg-white">
                      {hungerOptions.map((level) => {
                        const levelKey = normalizeHungerKey(level);
                        if (!levelKey) return null;
                        const checked = Boolean((hungerLevelsState as Record<string, boolean>)[levelKey]);
                        return (
                          <label key={`hunger-${level}`} className="flex items-center gap-2 text-sm font-bold text-gray-900">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                const nextState = normalizeHungerLevelsPayload({
                                  ...hungerLevelsState,
                                  [levelKey]: event.target.checked,
                                });
                                const legacyLabel =
                                  nextState.large
                                    ? hungerLabelByKey.large
                                    : nextState.medium
                                      ? hungerLabelByKey.medium
                                      : nextState.small
                                        ? hungerLabelByKey.small
                                        : "";
                                setFormData({
                                  ...formData,
                                  hunger_level: legacyLabel,
                                  hunger_levels: nextState,
                                });
                              }}
                            />
                            <span>{level}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 font-bold">Kcal</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={String(formData.calories || "")}
                      onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                      placeholder="Ex: 520"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block mb-1 font-bold">Allergènes</label>
                    <div className="mb-2 text-xs text-gray-600">Sélection multiple, sauvegardée dans `allergens`.</div>
                    <div className="max-h-32 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2 border border-gray-200 rounded p-2 bg-white">
                      {allergenLibrary.map((allergen) => {
                        const allergenId = String(allergen.id || "").trim();
                        const checked = selectedAllergenIds.includes(allergenId);
                        return (
                          <label key={`allergen-${allergenId}`} className="flex items-center gap-2 text-sm font-bold">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? Array.from(new Set([...selectedAllergenIds, allergenId]))
                                  : selectedAllergenIds.filter((id) => id !== allergenId);
                                setFormData({ ...formData, allergens: next.join(", ") });
                              }}
                            />
                            <span>{String(allergen.name_fr || allergen.label_fr || allergenId)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block mb-1 font-bold">Ce plat irait bien avec...</label>
                    <input
                      type="text"
                      value={String(formData.sales_tip || "")}
                      onChange={(e) => setFormData({ ...formData, sales_tip: e.target.value })}
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                      placeholder={getDefaultSuggestionLead("fr")}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block mb-1 font-bold">Plat suggéré (optionnel)</label>
                    <select
                      value={String(formData.sales_tip_dish_id || "")}
                      onChange={(e) => setFormData({ ...formData, sales_tip_dish_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                    >
                      <option value="">Aucun lien</option>
                      {dishes
                        .filter((dish) => String(dish.id || "") !== String(editingDish?.id || ""))
                        .map((dish) => (
                          <option key={`tip-link-${dish.id}`} value={String(dish.id || "")}>
                            {String(dish.name_fr || dish.name || `Plat #${dish.id}`)}{" "}
                            {Number.isFinite(Number(dish.price)) ? `- ${formatEuro(Number(dish.price))}â‚¬` : ""}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block mb-1 font-bold">Image du plat</label>
                    <p className="mb-2 text-xs text-gray-600">
                      Format recommandé : 4:3 ou 1:1 (Carré). Taille conseillée : 800x600px.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        await handleDishImageUpload(file);
                      }}
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                    />
                    {isUploadingImage ? (
                      <div className="text-sm font-bold text-black mt-2">Upload en cours...</div>
                    ) : null}
                    {(imagePreviewUrl || formData.image_url) ? (
                      <img
                        src={imagePreviewUrl || formData.image_url}
                        alt="Prévisualisation"
                        className="mt-2 h-24 w-32 object-cover border border-gray-300 rounded"
                        style={{ aspectRatio: "4 / 3" }}
                      />
                    ) : null}
                  </div>

                  <div className="md:col-span-2 border border-gray-200 rounded p-3 bg-white">
                    <label className="block mb-2 font-bold">Badges du plat</label>
                    <div className="flex flex-wrap gap-6">
                      <label className="flex items-center gap-2 text-black font-bold">
                        <input
                          type="checkbox"
                          checked={formData.is_promo}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              is_promo: e.target.checked,
                              promo_price: e.target.checked
                                ? String(formData.promo_price || "").trim() || String(formData.price || "")
                                : "",
                            })
                          }
                        />
                        Badge PROMO
                      </label>
                      {formData.is_promo ? (
                        <div className="min-w-[220px]">
                          <label className="block mb-1 text-xs font-bold">Prix promotionnel (&euro;)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={String(formData.promo_price || "")}
                            onChange={(e) => setFormData({ ...formData, promo_price: e.target.value })}
                            className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                          />
                        </div>
                      ) : null}

                      <label className="flex items-center gap-2 text-black font-bold">
                        <input
                          type="checkbox"
                          checked={formData.is_vegetarian_badge}
                          onChange={(e) => setFormData({ ...formData, is_vegetarian_badge: e.target.checked })}
                        />
                        Végétarien
                      </label>

                      <label className="flex items-center gap-2 text-black font-bold">
                        <input
                          type="checkbox"
                          checked={formData.is_new_badge}
                          onChange={(e) => setFormData({ ...formData, is_new_badge: e.target.checked })}
                        />
                        Nouveau
                      </label>

                      <label className="flex items-center gap-2 text-black font-bold">
                        <input
                          type="checkbox"
                          checked={formData.is_spicy_badge}
                          onChange={(e) => setFormData({ ...formData, is_spicy_badge: e.target.checked })}
                        />
                        Pimenté
                      </label>

                      <label className="flex items-center gap-2 text-black font-bold">
                        <input
                          type="checkbox"
                          checked={Boolean(formData.is_alcohol)}
                          onChange={(e) => setFormData({ ...formData, is_alcohol: e.target.checked })}
                        />
                        Contient de l&apos;alcool
                      </label>
                    </div>
                  </div>
                </>
              ) : null}

              {resolvedDishModalTab === "availability" ? (
                <div className="md:col-span-2 rounded border border-zinc-200 bg-white dark:bg-zinc-800 p-4">
                  <div className="mb-3 text-base font-black text-zinc-900 dark:text-zinc-100">Disponibilité</div>
                  <div className="mb-4">
                    <label className="block mb-2 font-bold text-zinc-900 dark:text-zinc-100">Jours de la semaine</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(Array.isArray(DISH_AVAILABLE_DAY_OPTIONS) && DISH_AVAILABLE_DAY_OPTIONS.length > 0
                        ? DISH_AVAILABLE_DAY_OPTIONS
                        : [
                            { key: "mon", label: "Lundi" },
                            { key: "tue", label: "Mardi" },
                            { key: "wed", label: "Mercredi" },
                            { key: "thu", label: "Jeudi" },
                            { key: "fri", label: "Vendredi" },
                            { key: "sat", label: "Samedi" },
                            { key: "sun", label: "Dimanche" },
                          ]
                      ).map((day) => {
                        const dayKey = String(day?.key || "").trim();
                        if (!dayKey) return null;
                        const dayLabel = String(day?.label || dayKey).trim();
                        const selectedDays = Array.isArray(formData.available_days) ? formData.available_days : [];
                        const checked = selectedDays.includes(dayKey);
                        return (
                          <label
                            key={`dish-availability-day-${dayKey}`}
                            className="flex items-center gap-2 rounded border border-zinc-200 dark:border-zinc-700 px-2 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-semibold"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                const currentDays = Array.isArray(formData.available_days) ? formData.available_days : [];
                                const nextDays = event.target.checked
                                  ? Array.from(new Set([...currentDays, dayKey]))
                                  : currentDays.filter((value: string) => String(value || "").trim() !== dayKey);
                                setFormData({ ...formData, available_days: nextDays });
                              }}
                            />
                            <span>{dayLabel}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1 font-bold text-zinc-900 dark:text-zinc-100">Heure de début</label>
                      <input
                        type="time"
                        value={String(formData.start_time || "")}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-bold text-zinc-900 dark:text-zinc-100">Heure de fin</label>
                      <input
                        type="time"
                        value={String(formData.end_time || "")}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {formData.is_formula && resolvedDishModalTab === "formula" ? (
                <div className="md:col-span-2 border border-gray-200 rounded p-3 bg-white">
                  <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1 font-bold">Prix formule / pack (&euro;)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.formula_price}
                        onChange={(e) => setFormData({ ...formData, formula_price: e.target.value })}
                        className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                        placeholder="Prix appliqué quand le client prend la formule"
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 text-black font-bold">
                        <input
                          type="checkbox"
                          checked={Boolean(formData.only_in_formula)}
                          onChange={(e) => setFormData({ ...formData, only_in_formula: e.target.checked })}
                        />
                        Uniquement en formule
                      </label>
                    </div>
                  </div>
                  <div className="mb-4 border border-gray-200 rounded p-3 bg-gray-50">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-black">Contenu de la formule</div>
                      <button
                        type="button"
                        onClick={() => toggleDishLanguagePanel("formula_fields")}
                        className="px-2 py-0.5 text-xs font-black border border-black"
                        title="Traductions formule"
                      >
                        ðŸŒ
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1 text-sm font-bold">Nom formule</label>
                        <input
                          type="text"
                          value={String(formData.formula_name || "")}
                          onChange={(e) => setFormData({ ...formData, formula_name: e.target.value })}
                          className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-sm font-bold">Calories formule (kcal)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={String(formulaKcal || formData.formula_calories || "")}
                          onChange={(e) => {
                            setFormulaKcal(e.target.value);
                            setFormData({ ...formData, formula_calories: e.target.value });
                          }}
                          className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block mb-1 text-sm font-bold">Description formule</label>
                        <textarea
                          value={String(formulaDescription || formData.formula_description || "")}
                          onChange={(e) => {
                            setFormulaDescription(e.target.value);
                            setFormData({ ...formData, formula_description: e.target.value });
                          }}
                          className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                          rows={2}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block mb-1 text-sm font-bold">Image de la formule</label>
                        {(formulaImagePreviewUrl || formulaImage || formData.formula_image_url) ? (
                          <div className="mb-2">
                            <div className="mb-1 text-xs font-bold text-gray-700">Image actuelle</div>
                            <img
                              src={String(formulaImagePreviewUrl || formulaImage || formData.formula_image_url || "")}
                              alt="Prévisualisation formule"
                              className="h-24 w-32 object-cover border border-gray-300 rounded"
                            />
                          </div>
                        ) : null}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            await handleFormulaImageUpload(file);
                          }}
                          className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                        />
                        {isUploadingFormulaImage ? (
                          <div className="mt-2 text-xs font-bold text-black">Upload image formule en cours...</div>
                        ) : null}
                      </div>
                      <div className="md:col-span-2">
                        <label className="block mb-1 text-sm font-bold">Allergènes formule</label>
                        <div className="max-h-28 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2 border border-gray-200 rounded p-2 bg-white">
                          {allergenLibrary.map((allergen) => {
                            const allergenId = String(allergen.id || "").trim();
                            const checked = formulaSelectedAllergenIds.includes(allergenId);
                            return (
                              <label key={`formula-allergen-${allergenId}`} className="flex items-center gap-2 text-xs font-bold">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const next = e.target.checked
                                      ? Array.from(new Set([...formulaSelectedAllergenIds, allergenId]))
                                      : formulaSelectedAllergenIds.filter((id) => id !== allergenId);
                                    setFormulaAllergens(next);
                                    setFormData({ ...formData, formula_allergens: next });
                                  }}
                                />
                                <span>{String(allergen.name_fr || allergen.label_fr || allergenId)}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    {formulaTranslationPanelOpen ? (
                      <div className="mt-3 border-t border-gray-200 pt-3">
                        <div className="mb-2 flex flex-wrap gap-2">
                          {activeLanguageCodes.map((code) => {
                            const normalized = normalizeLanguageKey(code);
                            return (
                              <button
                                key={`formula-lang-${normalized}`}
                                type="button"
                                onClick={() => setSelectedFormulaLanguageCode(normalized)}
                                className={`px-2 py-1 text-xs font-black border ${
                                  resolvedFormulaLanguageCode === normalized ? "border-black bg-black text-white" : "border-gray-300 bg-white text-black"
                                }`}
                              >
                                {String(languageLabels?.[normalized] || DEFAULT_LANGUAGE_LABELS?.[normalized] || normalized.toUpperCase())}
                              </button>
                            );
                          })}
                        </div>
                        {resolvedFormulaLanguageCode !== "fr" ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block mb-1 text-xs font-bold">Nom formule ({resolvedFormulaLanguageCode.toUpperCase()})</label>
                              <input
                                type="text"
                                value={formData.formula_name_i18n?.[resolvedFormulaLanguageCode] || ""}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    formula_name_i18n: {
                                      ...(prev.formula_name_i18n || {}),
                                      [resolvedFormulaLanguageCode]: e.target.value,
                                    },
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                              />
                            </div>
                            <div>
                              <label className="block mb-1 text-xs font-bold">Description formule ({resolvedFormulaLanguageCode.toUpperCase()})</label>
                              <textarea
                                value={formData.formula_description_i18n?.[resolvedFormulaLanguageCode] || ""}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    formula_description_i18n: {
                                      ...(prev.formula_description_i18n || {}),
                                      [resolvedFormulaLanguageCode]: e.target.value,
                                    },
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                                rows={2}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-600">Sélectionnez une langue hors FR pour modifier les traductions formule.</div>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <label className="block mb-2 font-bold">Catégories incluses dans la formule</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                    {categories.length === 0 ? (
                      <div className="text-sm text-gray-600">Aucune catégorie disponible.</div>
                    ) : (
                      sortedCategories.map((category) => {
                        const categoryId = String(category.id || "").trim();
                        const checked = formData.formula_category_ids.some((value) => String(value || "").trim() === categoryId);
                        return (
                          <label key={`formula-category-${categoryId}`} className="flex items-center gap-2 text-sm font-bold text-black">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                const isChecked = event.target.checked;
                                setFormData((prev) => {
                                  const nextCategoryIds = isChecked
                                    ? [...prev.formula_category_ids, categoryId]
                                    : prev.formula_category_ids.filter((value) => String(value || "").trim() !== categoryId);
                                  return {
                                    ...prev,
                                    formula_category_ids: Array.from(
                                      new Set(nextCategoryIds.map((value) => String(value || "").trim()).filter(Boolean))
                                    ),
                                  };
                                });
                              }}
                            />
                            <span>{getCategoryLabel(category)}</span>
                          </label>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-4 border-t border-gray-200 pt-3 space-y-3">
                    <div className="rounded border border-gray-200 bg-gray-50 p-2">
                      <label className="block mb-2 font-bold text-sm">Destination par étape</label>
                      <div className="space-y-2">
                        {formulaStepEntriesForUi.map((step, index) => (
                          <div key={`formula-step-routing-${index}`} className="flex flex-wrap items-center gap-2 rounded border border-gray-300 bg-white px-2 py-2">
                            <span className="text-xs font-black text-gray-800">Étape {index + 1}</span>
                            <select
                              value={step.destination === "bar" ? "bar" : "cuisine"}
                              onChange={(event) => {
                                const nextDestination = event.target.value === "bar" ? "bar" : "cuisine";
                                setFormulaSteps((current) => {
                                  const copy = [...current];
                                  while (copy.length < formulaStepCountForUi) {
                                    copy.push({
                                      title: `Étape ${copy.length + 1}`,
                                      options: [],
                                      auto_notify: false,
                                      destination: "cuisine",
                                    });
                                  }
                                  const currentStep = copy[index] || { title: `Étape ${index + 1}`, options: [], auto_notify: false, destination: "cuisine" };
                                  copy[index] = {
                                    ...currentStep,
                                    destination: nextDestination,
                                    options: Array.isArray(currentStep.options) ? currentStep.options : [],
                                    auto_notify: false,
                                  };
                                  return copy;
                                });
                              }}
                              className="h-8 rounded border border-gray-300 px-2 text-xs font-bold"
                            >
                              <option value="cuisine">Cuisine</option>
                              <option value="bar">Bar/Caisse</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded border border-gray-200 bg-white p-2">
                      <label className="block mb-2 font-bold text-sm">Affectation des plats par étape</label>
                      {selectedFormulaRowsWithParent.length === 0 ? (
                        <div className="text-xs text-gray-500">Sélectionnez des plats ci-dessous pour les affecter à une étape.</div>
                      ) : (
                        <div className="space-y-2">
                          {selectedFormulaRowsWithParent.map((dishRow) => {
                            const currentStep = (() => {
                              if (dishRow.isParent) return formulaMainStep;
                              const fromMap = Number(formData.formula_sequence_by_dish?.[dishRow.id]);
                              if (Number.isFinite(fromMap) && fromMap > 0) return Math.max(1, Math.trunc(fromMap));
                              const foundIndex = formulaStepEntriesForUi.findIndex((step) =>
                                Array.isArray(step.options)
                                  ? step.options.some((value) => String(value || "").trim() === dishRow.id)
                                  : false
                              );
                              return foundIndex >= 0 ? foundIndex + 1 : 1;
                            })();
                            return (
                              <div key={`formula-step-assignment-${dishRow.id}`} className="flex items-center justify-between gap-2 rounded border border-gray-200 px-2 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-gray-900">{dishRow.name}</span>
                                  {dishRow.isParent ? <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-black text-white">Principal</span> : null}
                                </div>
                                <select
                                  value={currentStep}
                                  onChange={(event) => {
                                    const nextStep = Math.max(1, Math.trunc(Number(event.target.value) || 1));
                                    if (typeof updateStep === "function") {
                                      updateStep(dishRow.id, nextStep);
                                      return;
                                    }
                                    if (dishRow.isParent) {
                                      setFormData((prev) => ({
                                        ...prev,
                                        formula_sequence_by_dish: {
                                          ...prev.formula_sequence_by_dish,
                                          [formulaParentKey]: nextStep,
                                        },
                                        formula_config: {
                                          ...(prev.formula_config && typeof prev.formula_config === "object" && !Array.isArray(prev.formula_config)
                                            ? (prev.formula_config as Record<string, unknown>)
                                            : {}),
                                          main_dish_step: nextStep,
                                        },
                                      }));
                                      return;
                                    }
                                    setFormulaSteps((current) => {
                                      const copy = current.map((entry) => ({ ...entry, options: [...(entry.options || [])] }));
                                      while (copy.length < formulaStepCountForUi) {
                                        copy.push({
                                          title: `Étape ${copy.length + 1}`,
                                          options: [],
                                          auto_notify: false,
                                          destination: "cuisine",
                                        });
                                      }
                                      copy.forEach((entry) => {
                                        entry.options = (entry.options || []).filter((value) => String(value || "").trim() !== dishRow.id);
                                      });
                                      const targetIndex = Math.max(0, Math.min(copy.length - 1, nextStep - 1));
                                      copy[targetIndex].options = Array.from(new Set([...(copy[targetIndex].options || []), dishRow.id]));
                                      return copy;
                                    });
                                  }}
                                  className="h-8 min-w-[120px] rounded border border-gray-300 px-2 text-xs font-bold"
                                >
                                  {formulaStepEntriesForUi.map((_, index) => (
                                    <option key={`formula-step-choice-${dishRow.id}-${index + 1}`} value={index + 1}>
                                      Étape {index + 1}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 border-t border-gray-200 pt-3">
                    <label className="block mb-2 font-bold">Options exclues du plat maître</label>
                    <p className="text-xs text-gray-600 mb-2">
                      Sauvegarde atomique: cette action met à jour uniquement `excluded_main_options`.
                    </p>
                    {(() => {
                      const parentDishOptions = Array.isArray(formData.product_options)
                        ? (formData.product_options as ProductOptionItem[])
                        : [];
                      if (parentDishOptions.length === 0) {
                        return <div className="text-xs text-gray-500">Aucune option disponible sur le plat maître.</div>;
                      }
                      return (
                        <div className="border border-gray-200 rounded p-2 bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {parentDishOptions.map((option, index) => {
                              const optionId = String(option.id || `option-${index}`);
                              const label = String(option.name_fr || option.name || `Option ${index + 1}`).trim();
                              const checked = Array.isArray(selectedMainDishOptions)
                                ? selectedMainDishOptions.some((value) => String(value || "") === optionId)
                                : false;
                              return (
                                <label key={`excluded-main-option-${optionId}`} className="flex items-center gap-2 text-xs font-bold text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => handleToggleExcludedMainOption(optionId)}
                                  />
                                  <span>{label}</span>
                                </label>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={handleSaveExcludedMainOptions}
                            className="mt-3 px-3 py-2 border-2 border-black text-xs font-black bg-white"
                          >
                            {mainOptionsSaveStatus === "saving"
                              ? "Sauvegarde..."
                              : mainOptionsSaveStatus === "success"
                                ? "Exclusions sauvegardées"
                                : "Sauvegarder exclusions"}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="mt-4 border-t border-gray-200 pt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSaveFormulaVisibility}
                      className="px-3 py-2 border-2 border-black text-xs font-black bg-white"
                    >
                      {formulaVisibilitySaveStatus === "saving"
                        ? "Sauvegarde visibilité..."
                        : formulaVisibilitySaveStatus === "success"
                          ? "Visibilité sauvegardée"
                          : "Sauvegarder visibilité formule"}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveFormulaSupplements}
                      className="px-3 py-2 border-2 border-black text-xs font-black bg-white"
                    >
                      {formulaSupplementsSaveStatus === "saving"
                        ? "Sauvegarde suppléments..."
                        : formulaSupplementsSaveStatus === "success"
                          ? "Suppléments sauvegardés"
                          : "Sauvegarder suppléments formule"}
                    </button>
                  </div>
                  <div className="mt-4 border-t border-gray-200 pt-3">
                    <label className="block mb-2 font-bold">Plats autorisés par catégorie</label>
                    <p className="text-xs text-gray-600 mb-2">
                      Si aucun plat n&apos;est coché pour une catégorie, tous les plats de cette catégorie seront proposés.
                    </p>
                    {formData.formula_category_ids.length === 0 ? (
                      <div className="text-sm text-gray-600">Sélectionnez d&apos;abord les catégories.</div>
                    ) : (
                      formData.formula_category_ids.map((categoryId) => {
                        const category = categories.find((row) => String(row.id) === String(categoryId));
                        const options = dishes.filter((dish) => {
                          if (String(dish.category_id) !== String(categoryId)) return false;
                          if (String(dish.id || "").trim() === String(editingDish?.id || "").trim()) return false;
                          return !toBoolean((dish as any).is_formula ?? dish.is_formula, false);
                        });
                        return (
                          <div key={`formula-dishes-${categoryId}`} className="border border-gray-200 rounded p-2 mb-3">
                            <div className="text-sm font-black mb-2">{category ? getCategoryLabel(category) : `Catégorie ${categoryId}`}</div>
                            {options.length === 0 ? (
                              <div className="text-xs text-gray-500">Aucun plat disponible.</div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                                {options.map((dish) => {
                                  const dishId = String(dish.id || "").trim();
                                  const checked = formData.formula_dish_ids.some((id) => String(id) === dishId);
                                  const dishOptions = Array.isArray((dish as any).product_options)
                                    ? ((dish as any).product_options as ProductOptionItem[])
                                    : [];
                                  const allowMulti = Boolean((dish as any).allow_multi_select);
                                  const selectedDefaultOptionIds = formData.formula_default_option_ids[dishId] || [];
                                  const rawSequence = Number(formData.formula_sequence_by_dish?.[dishId]);
                                  const resolvedSequence =
                                    Number.isFinite(rawSequence) && rawSequence > 0
                                      ? Math.max(1, Math.trunc(rawSequence))
                                      : 1;
                                  return (
                                    <div key={`formula-dish-${categoryId}-${dishId}`} className="flex flex-col gap-1 rounded hover:bg-gray-50 px-2 py-1">
                                      <label className="flex items-center gap-2 text-black font-bold">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(e) => {
                                            if (!dishId) return;
                                            const isChecked = e.target.checked;
                                            setFormData((prev) => {
                                              const next = isChecked
                                                ? [...prev.formula_dish_ids, dishId]
                                                : prev.formula_dish_ids.filter((id) => String(id) !== dishId);
                                              const nextDefaults = { ...prev.formula_default_option_ids };
                                              if (!isChecked) {
                                                delete nextDefaults[dishId];
                                              }
                                              const baseConfig =
                                                prev.formula_config &&
                                                typeof prev.formula_config === "object" &&
                                                !Array.isArray(prev.formula_config)
                                                  ? (prev.formula_config as Record<string, unknown>)
                                                  : {};
                                              const currentSteps = readCurrentFormulaSteps(prev);
                                              const nextSteps = isChecked
                                                ? (() => {
                                                    const copy = currentSteps.map((step) => ({ ...step, options: [...(step.options || [])] }));
                                                    if (copy.length === 0) {
                                                      copy.push({ title: "Étape 1", options: [], auto_notify: false, destination: "cuisine" });
                                                    }
                                                    copy[0].options = Array.from(new Set([...(copy[0].options || []), dishId]));
                                                    return copy;
                                                  })()
                                                : currentSteps.map((step) => ({
                                                    ...step,
                                                    options: (step.options || []).filter((value) => String(value || "").trim() !== dishId),
                                                  }));
                                              const stepMap = buildStepMapFromEntries(nextSteps);
                                              const formulaParentKeyLocal = String(editingDish?.id || "").trim() || FORMULA_PARENT_STEP_KEY;
                                              return {
                                                ...prev,
                                                formula_dish_ids: next,
                                                formula_sequence_by_dish: {
                                                  ...(prev.formula_sequence_by_dish || {}),
                                                  ...stepMap,
                                                  ...(isChecked
                                                    ? { [dishId]: resolvedSequence }
                                                    : (() => {
                                                        const copy = { ...(prev.formula_sequence_by_dish || {}) } as Record<string, number>;
                                                        delete copy[dishId];
                                                        return copy;
                                                      })()),
                                                  [formulaParentKeyLocal]:
                                                    Number(prev.formula_sequence_by_dish?.[formulaParentKeyLocal]) || 1,
                                                },
                                                formula_default_option_ids: nextDefaults,
                                                formula_config: {
                                                  ...baseConfig,
                                                  steps: nextSteps,
                                                  steps_by_dish: stepMap,
                                                  selected_dishes: next.map((value) => String(value || "").trim()).filter(Boolean),
                                                  step_count: Math.max(1, nextSteps.length),
                                                },
                                              };
                                            });
                                          }}
                                        />
                                        {dish.name_fr || dish.name || `Plat #${dish.id}`}
                                      </label>
                                      {checked && dishOptions.length > 0 ? (
                                        <div className="ml-6 border-l border-gray-200 pl-3">
                                          <div className="text-xs font-bold text-gray-700 mb-1">
                                            Option incluse par défaut
                                          </div>
                                          <div className="flex flex-col gap-2">
                                            {dishOptions.map((option, optionIndex) => {
                                              const optionId = String(option.id || `option-${optionIndex}`);
                                              const optionLabel = String(option.name_fr || option.name || "").trim();
                                              const checkedOption = selectedDefaultOptionIds.includes(optionId);
                                              return (
                                                <label key={`formula-default-option-${dishId}-${optionId}`} className="flex items-center gap-2 text-xs font-bold text-gray-700">
                                                  <input
                                                    type={allowMulti ? "checkbox" : "radio"}
                                                    name={allowMulti ? undefined : `formula-default-${dishId}`}
                                                    checked={checkedOption}
                                                    onChange={(event) => {
                                                      if (typeof handleFormulaDefaultOptionToggle === "function") {
                                                        handleFormulaDefaultOptionToggle({
                                                          dishId,
                                                          optionId,
                                                          checked: event.target.checked,
                                                          allowMulti,
                                                        });
                                                        return;
                                                      }
                                                      const current = formData.formula_default_option_ids[dishId] || [];
                                                      let nextIds = current;
                                                      if (allowMulti) {
                                                        nextIds = event.target.checked
                                                          ? [...current, optionId]
                                                          : current.filter((id) => id !== optionId);
                                                      } else {
                                                        nextIds = event.target.checked ? [optionId] : [];
                                                      }
                                                      setFormData({
                                                        ...formData,
                                                        formula_default_option_ids: {
                                                          ...formData.formula_default_option_ids,
                                                          [dishId]: Array.from(new Set(nextIds)),
                                                        },
                                                      });
                                                    }}
                                                  />
                                                  <span>{optionLabel || `Option #${optionId}`}</span>
                                                </label>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}

              {resolvedDishModalTab === "options" ? (<>
              <div className="md:col-span-2 border border-gray-200 rounded p-3 bg-white">
                <label className="block mb-2 font-bold">Réglages options client</label>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-black font-bold">
                    <input
                      type="checkbox"
                      checked={formData.has_sides}
                      onChange={(e) => setFormData({ ...formData, has_sides: e.target.checked })}
                    />
                    Proposer accompagnements
                  </label>
                  <label className="flex items-center gap-2 text-black font-bold">
                    <input
                      type="checkbox"
                      checked={formData.ask_cooking}
                      onChange={(e) => setFormData({ ...formData, ask_cooking: e.target.checked })}
                    />
                    Demander la cuisson
                  </label>
                  <div className="flex items-center gap-2 text-black font-bold">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.allow_multi_select}
                        onChange={(e) => setFormData({ ...formData, allow_multi_select: e.target.checked })}
                      />
                      Autoriser la sélection multiple
                    </label>
                    <span
                      className="inline-flex h-4 w-4 shrink-0 items-center justify-center self-center text-gray-500 cursor-help"
                      title="Si coché, le client peut sélectionner plusieurs options/suppléments."
                      aria-label="Aide sélection multiple"
                    >
                      <CircleHelp className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block mb-1 font-bold">Accompagnements disponibles</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto border border-gray-200 rounded p-2 bg-white">
                  {sidesLibrary.map((side) => (
                    <label key={side.id} className="flex items-center gap-2 text-black font-bold px-2 py-1 rounded hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.selected_side_ids.some(
                          (id) => String(id) === String(side.id)
                        )}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selected_side_ids: [...formData.selected_side_ids, side.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selected_side_ids: formData.selected_side_ids.filter(
                                (id) => String(id) !== String(side.id)
                              ),
                            });
                          }
                        }}
                      />
                      {side.name_fr}
                    </label>
                  ))}
                </div>
              </div>


              
              <div className="md:col-span-2 border border-gray-200 rounded p-3 bg-white">
                <label className="block mb-2 font-bold">Options / Variantes</label>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                  <div className="md:col-span-2">
                    <label className="block mb-1 text-sm font-bold">Nom FR</label>
                    <input
                      type="text"
                      value={productOptionDraft.name}
                      onChange={(e) => setProductOptionDraft((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                      placeholder="Ex: Verre, Bouteille, Grand format..."
                    />
                  </div>
                  {activeLanguageCodes
                    .filter((code) => code !== "fr")
                    .map((code) => (
                      <div key={`product-option-name-${code}`}>
                        <label className="block mb-1 text-sm font-bold">Nom {code.toUpperCase()}</label>
                        <input
                          type="text"
                          value={productOptionDraft.names_i18n?.[code] || productOptionDraft.names_i18n?.[normalizeLanguageKey(code)] || ""}
                          onChange={(e) =>
                            setProductOptionDraft((prev) => ({
                              ...prev,
                              names_i18n: { ...(prev.names_i18n || {}), [normalizeLanguageKey(code)]: e.target.value },
                            }))
                          }
                          className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                          placeholder={`Nom ${code.toUpperCase()}`}
                        />
                      </div>
                    ))}
                  <div className="md:col-span-2">
                    <label className="block mb-1 text-sm font-bold">Prix de la variante (remplace le prix de base)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={productOptionDraft.price_override}
                      onChange={(e) => setProductOptionDraft((prev) => ({ ...prev, price_override: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                      placeholder="Optionnel (ex: 9.90)"
                    />
                  </div>
                  <div className="md:col-span-6">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddProductOptionToDish}
                        className="px-4 py-2 border-2 border-black font-black"
                      >
                        {editingProductOptionId ? "Valider la modification" : "Ajouter la variante"}
                      </button>
                      {editingProductOptionId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProductOptionId(null);
                            setProductOptionDraft({ name: "", price_override: "", names_i18n: {} });
                          }}
                          className="px-4 py-2 border border-gray-400 font-bold"
                        >
                          Annuler édition
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 border border-gray-200 rounded">
                  {(formData.product_options || []).map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 border-b border-gray-200 last:border-b-0"
                    >
                      <div className="text-sm">
                        <span className="font-bold">{option.name_fr || option.name}</span>
                        {Number(option.price_override || 0) > 0 ? (
                          <span className="font-bold"> ({Number(option.price_override || 0).toFixed(2)} {"â‚¬"})</span>
                        ) : null}
                        <span className="text-gray-600">
                          {" | "}
                          {activeLanguageCodes
                            .filter((code) => code !== "fr")
                            .map((code) => {
                              const normalizedCode = normalizeLanguageKey(code);
                              const fallbackToken = parseI18nToken(String(option.name_en || ""));
                              const value =
                                option.names_i18n?.[normalizedCode] ||
                                fallbackToken[normalizedCode] ||
                                (normalizedCode === "en"
                                  ? option.name_en
                                  : normalizedCode === "es"
                                    ? option.name_es
                                    : normalizedCode === "de"
                                      ? option.name_de
                                      : "") ||
                                "-";
                              return `${code.toUpperCase()}: ${value}`;
                            })
                            .join(" | ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditProductOptionInDish(option)}
                          className="text-black font-black border border-black rounded w-7 h-7 leading-5"
                          title="Modifier"
                          aria-label={`Modifier la variante ${option.name}`}
                        >
                          <Pencil className="mx-auto h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveProductOptionFromDish(option.id)}
                          className="text-red-600 font-black border border-red-600 rounded w-7 h-7 leading-5"
                          title="Supprimer"
                          aria-label={`Supprimer la variante ${option.name}`}
                        >
                          <Trash2 className="mx-auto h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(formData.product_options || []).length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-600">Aucune variante ajoutée.</div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 border border-gray-200 rounded p-3 bg-white">
                <label className="block mb-2 font-bold">Suppléments</label>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                  <div className="md:col-span-2">
                    <label className="block mb-1 text-sm font-bold">Nom FR</label>
                    <input
                      type="text"
                      value={dishExtraDraft.name_fr}
                      onChange={(e) => setDishExtraDraft((prev) => ({ ...prev, name_fr: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                      placeholder="Ex: fromage"
                    />
                  </div>
                  {activeLanguageCodes
                    .filter((code) => code !== "fr")
                    .map((code) => (
                      <div key={`extra-name-${code}`}>
                        <label className="block mb-1 text-sm font-bold">Nom {code.toUpperCase()}</label>
                        <input
                          type="text"
                          value={
                            dishExtraDraft.names_i18n?.[code] ||
                            (code === "en" ? dishExtraDraft.name_en : code === "es" ? dishExtraDraft.name_es : code === "de" ? dishExtraDraft.name_de : "")
                          }
                          onChange={(e) =>
                            setDishExtraDraft((prev) => ({
                              ...prev,
                              ...(code === "en" ? { name_en: e.target.value } : {}),
                              ...(code === "es" ? { name_es: e.target.value } : {}),
                              ...(code === "de" ? { name_de: e.target.value } : {}),
                              names_i18n: { ...(prev.names_i18n || {}), [code]: e.target.value },
                            }))
                          }
                          className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                        />
                      </div>
                    ))}
                  <div>
                    <label className="block mb-1 text-sm font-bold">Prix (&euro;)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={dishExtraDraft.price}
                      onChange={(e) => setDishExtraDraft((prev) => ({ ...prev, price: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                    />
                  </div>
                  <div className="md:col-span-6">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddExtraToDish}
                        className="px-4 py-2 border-2 border-black font-black"
                      >
                        {editingExtraId ? "Valider la modification" : "Ajouter au plat"}
                      </button>
                      {editingExtraId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExtraId(null);
                            setEditingExtraOriginKey(null);
                            setDishExtraDraft({ name_fr: "", name_en: "", name_es: "", name_de: "", names_i18n: {}, price: "" });
                          }}
                          className="px-4 py-2 border border-gray-400 font-bold"
                        >
                          Annuler édition
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 border border-gray-200 rounded">
                  {formData.extras_list.map((extra) => (
                    <div
                      key={extra.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 border-b border-gray-200 last:border-b-0"
                    >
                      <div className="text-sm">
                        <span className="font-bold">{extra.name_fr}</span>
                        {activeLanguageCodes
                          .filter((code) => code !== "fr")
                          .map((code) => (
                            <span key={`extra-preview-${extra.id}-${code}`} className="text-gray-600">
                              {" "} | {code.toUpperCase()}: {extra.names_i18n?.[code] || (code === "en" ? extra.name_en : code === "es" ? extra.name_es : code === "de" ? extra.name_de : "") || "-"}
                            </span>
                          ))}
                        {Number(extra.price || 0) > 0 ? (
                          <span className="font-bold"> (+{formatEuro(Number(extra.price || 0))})</span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditExtraInDish(extra)}
                          className="text-black font-black border border-black rounded w-7 h-7 leading-5"
                          title="Modifier"
                          aria-label={`Modifier le supplément ${extra.name_fr}`}
                        >
                          <Pencil className="mx-auto h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveExtraFromDish(extra.id)}
                          className="text-red-600 font-black border border-red-600 rounded w-7 h-7 leading-5"
                          title="Supprimer"
                          aria-label={`Supprimer le supplément ${extra.name_fr}`}
                        >
                          <Trash2 className="mx-auto h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {formData.extras_list.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-600">Aucun supplément ajouté.</div>
                  )}
                </div>
              </div>
              </>
              ) : null}

            </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t-2 border-black px-6 py-4 flex gap-3">
              <button
                onClick={handleSave}
                disabled={dishSaveStatus === "saving"}
                className={`px-5 py-2 font-black border-2 border-black disabled:opacity-60 ${
                  dishSaveStatus === "success" ? "bg-green-600 text-white" : "bg-black text-white"
                }`}
              >
                {dishSaveStatus === "saving"
                  ? "Enregistrement..."
                  : dishSaveStatus === "success"
                    ? "Enregistré"
                    : editingDish
                      ? "Modifier"
                      : "Créer"}
              </button>
              <button
                onClick={() => {
                  setShowDishModal(false);
                  resetForm();
                }}
                className="px-5 py-2 font-black border-2 border-black"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
</>
  );
}





