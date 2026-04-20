import { supabase } from "../../lib/supabase";

export function useManagerFormulaEditor(deps: Record<string, any>) {
  const {
    setExcludedMainOptionsTouched,
    setSelectedMainDishOptions,
    setMainOptionsSaveStatus,
    editingDish,
    scopedRestaurantId,
    selectedMainDishOptions,
    preparedDishesSorted,
    dishes,
    setFormulaMainOptionsFormulaId,
    formData,
    setFormulaVisibilitySaveStatus,
    toBoolean,
    setFormData,
    setFormulaLinkDisplayByFormulaId,
    createLocalId,
    normalizeLanguageKey,
    setFormulaSupplementsSaveStatus,
    setLoadedDishExtras,
    setExtrasTouched,
    FORMULA_PARENT_STEP_KEY,
    selectedFormulaDishes,
    dishSteps,
    normalizeFormulaStepEntries,
    buildFormulaStepsFromDishStepMap,
    buildDishStepMapFromFormulaSteps,
    setMainDishStep,
    setDishSteps,
    mainDishStep,
    FORMULA_DIRECT_SEND_SEQUENCE,
  } = deps;
const readFormulaDefaultOptionIdsMap = (source: { formula_default_option_ids?: unknown }) => {
  if (!source || typeof source !== "object") return {} as Record<string, string[]>;
  const raw = source.formula_default_option_ids;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {} as Record<string, string[]>;
  return raw as Record<string, string[]>;
};

function handleToggleExcludedMainOption(optionId: string) {
  const normalizedOptionId = String(optionId || "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
  if (!normalizedOptionId) return;
  setExcludedMainOptionsTouched(true);
  setSelectedMainDishOptions((prev: any) => {
    const current = Array.isArray(prev)
      ? prev
          .map((value: any) =>
            String(value || "")
              .trim()
              .replace(/^["']+|["']+$/g, "")
              .trim()
          )
          .filter(Boolean)
      : [];
    const exists = current.includes(normalizedOptionId);
    const next = exists ? current.filter((id: any) => id !== normalizedOptionId) : [...current, normalizedOptionId];
    return Array.from(new Set(next));
  });
  setMainOptionsSaveStatus("idle");
}

async function handleSaveExcludedMainOptions() {
  const normalizeOptionKey = (value: unknown) =>
    String(value || "")
      .trim()
      .replace(/^["']+|["']+$/g, "")
      .trim();
  const dishId = String(editingDish?.id || "").trim();
  if (!dishId || !scopedRestaurantId) {
    alert("Enregistre d'abord le plat pour pouvoir sauvegarder les options exclues.");
    return;
  }
  const requestedExcludedOptionIds = Array.from(
    new Set(
      (Array.isArray(selectedMainDishOptions) ? selectedMainDishOptions : [])
        .map((value: any) => normalizeOptionKey(value))
        .filter(Boolean)
    )
  );
  const parentDish =
    preparedDishesSorted.find((row: any) => String(row.id || "").trim() === dishId) ||
    dishes.find((row: any) => String(row.id || "").trim() === dishId) ||
    null;
  const validOptionIds = Array.isArray((parentDish as { product_options?: unknown } | null)?.product_options)
    ? ((parentDish as { product_options?: any[] }).product_options || [])
        .map((option: any) => normalizeOptionKey(option?.id))
        .filter(Boolean)
    : [];
  const validOptionIdSetLower = new Set(validOptionIds.map((id: any) => id.toLowerCase()));
  const normalizedExcludedOptionIds =
    validOptionIdSetLower.size > 0
      ? requestedExcludedOptionIds.filter((id: any) => validOptionIdSetLower.has(id.toLowerCase()))
      : requestedExcludedOptionIds;
  setMainOptionsSaveStatus("saving");
  const payload = {
    excluded_main_options: normalizedExcludedOptionIds,
  };
  const updateResult = await supabase
    .from("restaurant_formulas")
    .update(payload as never)
    .eq("dish_id", dishId)
    .eq("restaurant_id", scopedRestaurantId)
    .select("id")
    .maybeSingle();
  if (updateResult.error) {
    setMainOptionsSaveStatus("idle");
    alert(`Erreur SQL : ${updateResult.error.message}`);
    return;
  }
  const formulaRowId = String((updateResult.data as Record<string, unknown> | null)?.id || "").trim();
  if (!formulaRowId) {
    setMainOptionsSaveStatus("idle");
    alert("Aucune formule trouvée pour ce plat. Sauvegarde d'abord la formule principale.");
    return;
  }
  if (formulaRowId) setFormulaMainOptionsFormulaId(formulaRowId);
  setSelectedMainDishOptions(normalizedExcludedOptionIds);
  setExcludedMainOptionsTouched(false);
  setMainOptionsSaveStatus("success");
  window.setTimeout(() => setMainOptionsSaveStatus("idle"), 1400);
  alert("Exclusions d'options sauvegardées avec succès !");
}

async function handleSaveFormulaVisibility() {
  const dishId = String(editingDish?.id || "").trim();
  if (!dishId || !scopedRestaurantId) {
    alert("Enregistre d'abord la formule principale avant de modifier son statut.");
    return;
  }
  const nextVisible = Boolean(formData.is_formula_active);
  setFormulaVisibilitySaveStatus("saving");
  const updateResult = await supabase
    .from("restaurant_formulas")
    .update({ formula_visible: nextVisible } as never)
    .eq("dish_id", dishId)
    .eq("restaurant_id", scopedRestaurantId)
    .select("id,formula_visible")
    .maybeSingle();
  if (updateResult.error) {
    setFormulaVisibilitySaveStatus("idle");
    alert(`Erreur SQL : ${updateResult.error.message}`);
    return;
  }
  if (!updateResult.data) {
    setFormulaVisibilitySaveStatus("idle");
    alert("Aucune formule trouvée pour ce plat. Sauvegarde d'abord la formule principale.");
    return;
  }
  const savedVisible = toBoolean((updateResult.data as Record<string, unknown>).formula_visible, true);
  setFormData((prev: any) => ({
    ...prev,
    is_formula_active: savedVisible,
  }));
  setFormulaLinkDisplayByFormulaId((prev: any) => {
    const next = new Map(prev);
    const current = next.get(dishId);
    if (current) {
      next.set(dishId, { ...current, formula_visible: savedVisible });
    }
    return next;
  });
  setFormulaVisibilitySaveStatus("success");
  window.setTimeout(() => setFormulaVisibilitySaveStatus("idle"), 1400);
  alert("Statut formule sauvegardé.");
}

async function handleSaveFormulaSupplements() {
  const dishId = String(editingDish?.id || "").trim();
  if (!dishId || !scopedRestaurantId) {
    alert("Enregistre d'abord la formule principale avant de modifier ses suppléments.");
    return;
  }
  const normalizedSupplements = (Array.isArray(formData.extras_list) ? formData.extras_list : [])
    .map((extra: any) => {
      const namesBase =
        extra.names_i18n && typeof extra.names_i18n === "object"
          ? (extra.names_i18n as Record<string, string>)
          : {};
      const nameFr = String(extra.name_fr || namesBase.fr || "").trim();
      if (!nameFr) return null;
      const names = Object.fromEntries(
        Object.entries({
          ...namesBase,
          fr: nameFr,
          en: String(extra.name_en || namesBase.en || "").trim(),
          es: String(extra.name_es || namesBase.es || "").trim(),
          de: String(extra.name_de || namesBase.de || "").trim(),
        })
          .map(([code, value]) => [normalizeLanguageKey(code), String(value || "").trim()])
          .filter(([code, value]) => Boolean(code) && Boolean(value))
      ) as Record<string, string>;
      return {
        id: String(extra.id || createLocalId()),
        name_fr: nameFr,
        name_en: String(extra.name_en || names.en || "").trim(),
        name_es: String(extra.name_es || names.es || "").trim(),
        name_de: String(extra.name_de || names.de || "").trim(),
        names_i18n: names,
        price: Number.isFinite(Number(extra.price)) ? Number(Number(extra.price).toFixed(2)) : 0,
      } as any;
    })
    .filter(Boolean) as any[];
  console.log("[manager.formula.save] supplements payload before Supabase", {
    dishId,
    supplementsCount: normalizedSupplements.length,
    supplements: normalizedSupplements,
  });
  setFormulaSupplementsSaveStatus("saving");
  const updateResult = await supabase
    .from("restaurant_formulas")
    .update({ formula_supplements: normalizedSupplements } as never)
    .eq("dish_id", dishId)
    .eq("restaurant_id", scopedRestaurantId)
    .select("id,formula_supplements")
    .maybeSingle();
  if (updateResult.error) {
    setFormulaSupplementsSaveStatus("idle");
    alert(`Erreur SQL : ${updateResult.error.message}`);
    return;
  }
  if (!updateResult.data) {
    setFormulaSupplementsSaveStatus("idle");
    alert("Aucune formule trouvée pour ce plat. Sauvegarde d'abord la formule principale.");
    return;
  }
  setLoadedDishExtras(normalizedSupplements);
  setFormData((prev: any) => ({
    ...prev,
    extras_list: normalizedSupplements,
    has_extras: normalizedSupplements.length > 0,
  }));
  setFormulaLinkDisplayByFormulaId((prev: any) => {
    const next = new Map(prev);
    const current = next.get(dishId);
    if (current) {
      next.set(dishId, { ...current, formula_supplements: normalizedSupplements });
    }
    return next;
  });
  setExtrasTouched(false);
  setFormulaSupplementsSaveStatus("success");
  window.setTimeout(() => setFormulaSupplementsSaveStatus("idle"), 1400);
  alert("Suppléments formule sauvegardés.");
}

const handleFormulaDefaultOptionToggle = (params: {
  dishId: string;
  optionId: string;
  checked: boolean;
  allowMulti: boolean;
}) => {
  const normalizedDishId = String(params.dishId || "").trim();
  const normalizedOptionId = String(params.optionId || "").trim();
  if (!normalizedDishId || !normalizedOptionId) return;

  setFormData((prev: any) => {
    const formulaParentKey = String(editingDish?.id || "").trim() || FORMULA_PARENT_STEP_KEY;
    const currentMap = readFormulaDefaultOptionIdsMap(prev);
    const sanitizedCurrentMap = Object.fromEntries(
      Object.entries(currentMap).filter(([dishId]) => {
        const normalizedDishId = String(dishId || "").trim();
        if (!normalizedDishId) return false;
        if (normalizedDishId === FORMULA_PARENT_STEP_KEY) return false;
        if (normalizedDishId === formulaParentKey) return false;
        return true;
      })
    ) as Record<string, string[]>;
    const baseConfig =
      prev.formula_config &&
      typeof prev.formula_config === "object" &&
      !Array.isArray(prev.formula_config)
        ? (prev.formula_config as Record<string, unknown>)
        : {};
    const buildStepsDetails = (defaultsMap: Record<string, string[]>) =>
      Object.fromEntries(
        selectedFormulaDishes
          .map((dishId: any) => String(dishId || "").trim())
          .filter(Boolean)
          .map((dishId: any) => [
            dishId,
            {
              step: Math.max(1, Math.trunc(Number(dishSteps[dishId] || 1))),
              option_ids: Array.isArray(defaultsMap[dishId]) ? defaultsMap[dishId] : [],
            },
          ])
      ) as Record<string, { step: number; option_ids: string[] }>;
    if (normalizedDishId === formulaParentKey) return prev;
    const current = Array.isArray(sanitizedCurrentMap[normalizedDishId]) ? sanitizedCurrentMap[normalizedDishId] : [];
    const nextIds = params.allowMulti
      ? params.checked
        ? [...current, normalizedOptionId]
        : current.filter((id: any) => String(id || "").trim() !== normalizedOptionId)
      : params.checked
        ? [normalizedOptionId]
        : [];
    const nextDefaults = {
      ...sanitizedCurrentMap,
      [normalizedDishId]: Array.from(new Set(nextIds.map((id: any) => String(id || "").trim()).filter(Boolean))),
    };
    return {
      ...prev,
      formula_default_option_ids: nextDefaults,
      formula_config: {
        ...baseConfig,
        options: nextDefaults,
        default_option_ids: nextDefaults,
        steps_details: buildStepsDetails(nextDefaults),
      },
    };
  });
};

const DIRECT_SEND_STEP = Number(FORMULA_DIRECT_SEND_SEQUENCE || 4);
const clampFormulaStep = (value: unknown, max = 99) => Math.max(1, Math.min(max, Math.trunc(Number(value) || 1)));
const readSelectedFormulaDishIds = (fallback?: unknown) =>
  Array.from(
    new Set(
      (Array.isArray(selectedFormulaDishes) && selectedFormulaDishes.length > 0 ? selectedFormulaDishes : Array.isArray(fallback) ? fallback : [])
        .map((dishId: any) => String(dishId || "").trim())
        .filter(Boolean)
    )
  );
const readFormulaStepEntriesFromState = (
  config: Record<string, unknown>,
  selectedDishIds: string[],
  fallbackStepMap: Record<string, number>
): any[] => {
  const normalizedSelected = Array.from(
    new Set(selectedDishIds.map((dishId: any) => String(dishId || "").trim()).filter(Boolean))
  );
  const parsed = normalizeFormulaStepEntries(config?.steps);
  const sanitizedParsed = parsed.map((step: any, index: number) => ({
    title: String(step.title || "").trim() || `Étape ${index + 1}`,
    options: Array.from(
      new Set(
        (Array.isArray(step.options) ? step.options : [])
          .map((dishId: any) => String(dishId || "").trim())
          .filter((dishId: any) => normalizedSelected.includes(dishId))
      )
    ),
    auto_notify: false,
    destination: (step.destination === "bar" ? "bar" : "cuisine") as "bar" | "cuisine",
  }));
  const withFallback =
    sanitizedParsed.length > 0
      ? sanitizedParsed
      : buildFormulaStepsFromDishStepMap(fallbackStepMap, normalizedSelected);
  if (withFallback.length === 0) {
    return [{ title: "Étape 1", options: [], auto_notify: false, destination: "cuisine" as const }];
  }
  const assigned = new Set(withFallback.flatMap((step: any) => step.options));
  normalizedSelected.forEach((dishId: any) => {
    if (!assigned.has(dishId)) {
      withFallback[0].options = Array.from(new Set([...(withFallback[0].options || []), dishId]));
    }
  });
  return withFallback.map((step: any, index: number) => ({
    title: String(step.title || "").trim() || `Étape ${index + 1}`,
    options: Array.from(
      new Set((step.options || []).map((dishId: any) => String(dishId || "").trim()).filter(Boolean))
    ),
    auto_notify: false,
    destination: (step.destination === "bar" ? "bar" : "cuisine") as "bar" | "cuisine",
  }));
};
const buildFormulaSequenceByDish = (
  previousSequence: Record<string, number>,
  stepMap: Record<string, number>,
  formulaParentKey: string,
  nextMainStep: number
) => {
  const nextSequence = { ...(previousSequence || {}) } as Record<string, number>;
  Object.keys(nextSequence).forEach((dishId: any) => {
    if (!stepMap[dishId] && dishId !== formulaParentKey) {
      delete nextSequence[dishId];
    }
  });
  Object.entries(stepMap).forEach(([dishId, step]) => {
    nextSequence[dishId] = clampFormulaStep(step);
  });
  nextSequence[formulaParentKey] = clampFormulaStep(nextMainStep);
  return nextSequence;
};

const updateStep = (dishIdRaw: unknown, stepRaw: unknown) => {
  const normalizedDishId = String(dishIdRaw || "").trim();
  if (!normalizedDishId) return;
  const formulaParentKey = String(editingDish?.id || "").trim() || FORMULA_PARENT_STEP_KEY;
  const requestedStep = Math.max(1, Math.trunc(Number(stepRaw) || 1));
  setFormData((prev: any) => {
    const baseConfig =
      prev.formula_config && typeof prev.formula_config === "object" && !Array.isArray(prev.formula_config)
        ? (prev.formula_config as Record<string, unknown>)
        : {};
    const selectedDishIds = readSelectedFormulaDishIds(prev.formula_dish_ids);
    const fallbackStepMap =
      prev.formula_sequence_by_dish && typeof prev.formula_sequence_by_dish === "object"
        ? (prev.formula_sequence_by_dish as Record<string, number>)
        : {};
    const currentSteps = readFormulaStepEntriesFromState(baseConfig, selectedDishIds, fallbackStepMap);
    const currentSequence =
      prev.formula_sequence_by_dish && typeof prev.formula_sequence_by_dish === "object"
        ? (prev.formula_sequence_by_dish as Record<string, number>)
        : {};
    const stepsForUpdate = currentSteps.map((step: any) => ({ ...step, options: [...(step.options || [])] }));
    while (stepsForUpdate.length < requestedStep) {
      stepsForUpdate.push({ title: `Étape ${stepsForUpdate.length + 1}`, options: [], auto_notify: false, destination: "cuisine" as const });
    }
    if (normalizedDishId !== formulaParentKey && normalizedDishId !== FORMULA_PARENT_STEP_KEY) {
      stepsForUpdate.forEach((step: any) => {
        step.options = (step.options || []).filter((dishId: any) => String(dishId || "").trim() !== normalizedDishId);
      });
      const targetIndex = Math.max(0, Math.min(stepsForUpdate.length - 1, requestedStep - 1));
      stepsForUpdate[targetIndex].options = Array.from(
        new Set([...(stepsForUpdate[targetIndex].options || []), normalizedDishId])
      );
    }
    const stepMap = buildDishStepMapFromFormulaSteps(stepsForUpdate);
    const resolvedMainDishStep =
      normalizedDishId === formulaParentKey || normalizedDishId === FORMULA_PARENT_STEP_KEY
        ? clampFormulaStep(requestedStep, Math.max(stepsForUpdate.length, 1))
        : clampFormulaStep(currentSequence[formulaParentKey] || mainDishStep || 1, Math.max(stepsForUpdate.length, 1));
    const nextSequence = buildFormulaSequenceByDish(currentSequence, stepMap, formulaParentKey, resolvedMainDishStep);
    setMainDishStep(resolvedMainDishStep);
    setDishSteps(stepMap);
    return {
      ...prev,
      formula_sequence_by_dish: nextSequence,
      formula_config: {
        ...baseConfig,
        selected_dishes: selectedDishIds,
        steps: stepsForUpdate,
        steps_by_dish: stepMap,
        main_dish_step: resolvedMainDishStep,
        step_count: Math.max(1, stepsForUpdate.length),
      },
    };
  });
};

const addStep = () => {
  const formulaParentKey = String(editingDish?.id || "").trim() || FORMULA_PARENT_STEP_KEY;
  setFormData((prev: any) => {
    const baseConfig =
      prev.formula_config && typeof prev.formula_config === "object" && !Array.isArray(prev.formula_config)
        ? (prev.formula_config as Record<string, unknown>)
        : {};
    const selectedDishIds = readSelectedFormulaDishIds(prev.formula_dish_ids);
    const fallbackStepMap =
      prev.formula_sequence_by_dish && typeof prev.formula_sequence_by_dish === "object"
        ? (prev.formula_sequence_by_dish as Record<string, number>)
        : {};
    const currentSteps = readFormulaStepEntriesFromState(baseConfig, selectedDishIds, fallbackStepMap);
    const nextSteps = [...currentSteps, { title: "", options: [], auto_notify: false, destination: "cuisine" as const }];
    const currentSequence =
      prev.formula_sequence_by_dish && typeof prev.formula_sequence_by_dish === "object"
        ? (prev.formula_sequence_by_dish as Record<string, number>)
        : {};
    const stepMap = buildDishStepMapFromFormulaSteps(nextSteps);
    const nextMainStep =
      currentSequence[formulaParentKey] === DIRECT_SEND_STEP
        ? DIRECT_SEND_STEP
        : clampFormulaStep(currentSequence[formulaParentKey] || mainDishStep || 1, Math.max(nextSteps.length, 1));
    const nextSequence = buildFormulaSequenceByDish(currentSequence, stepMap, formulaParentKey, nextMainStep);
    setMainDishStep(nextMainStep);
    setDishSteps(stepMap);
    return {
      ...prev,
      formula_sequence_by_dish: nextSequence,
      formula_config: {
        ...baseConfig,
        selected_dishes: selectedDishIds,
        steps: nextSteps,
        steps_by_dish: stepMap,
        main_dish_step: nextMainStep,
        step_count: Math.max(1, nextSteps.length),
      },
    };
  });
};

const removeStep = (stepIndexRaw?: unknown) => {
  const formulaParentKey = String(editingDish?.id || "").trim() || FORMULA_PARENT_STEP_KEY;
  setFormData((prev: any) => {
    const baseConfig =
      prev.formula_config && typeof prev.formula_config === "object" && !Array.isArray(prev.formula_config)
        ? (prev.formula_config as Record<string, unknown>)
        : {};
    const selectedDishIds = readSelectedFormulaDishIds(prev.formula_dish_ids);
    const fallbackStepMap =
      prev.formula_sequence_by_dish && typeof prev.formula_sequence_by_dish === "object"
        ? (prev.formula_sequence_by_dish as Record<string, number>)
        : {};
    const currentSteps = readFormulaStepEntriesFromState(baseConfig, selectedDishIds, fallbackStepMap);
    if (currentSteps.length <= 1) {
      const preserved = [{ ...currentSteps[0], options: [...(currentSteps[0]?.options || [])] }];
      const stepMap = buildDishStepMapFromFormulaSteps(preserved);
      const currentSequenceSafe =
        prev.formula_sequence_by_dish && typeof prev.formula_sequence_by_dish === "object"
          ? (prev.formula_sequence_by_dish as Record<string, number>)
          : {};
      const nextMainStep =
        currentSequenceSafe[formulaParentKey] === DIRECT_SEND_STEP
          ? DIRECT_SEND_STEP
          : 1;
      const nextSequence = buildFormulaSequenceByDish(currentSequenceSafe, stepMap, formulaParentKey, nextMainStep);
      setMainDishStep(nextMainStep);
      setDishSteps(stepMap);
      return {
        ...prev,
        formula_sequence_by_dish: nextSequence,
        formula_config: {
          ...baseConfig,
          selected_dishes: selectedDishIds,
          steps: preserved,
          steps_by_dish: stepMap,
          main_dish_step: nextMainStep,
          step_count: 1,
        },
      };
    }
    const currentSequence =
      prev.formula_sequence_by_dish && typeof prev.formula_sequence_by_dish === "object"
        ? (prev.formula_sequence_by_dish as Record<string, number>)
        : {};
    const requestedIndex = Number(stepIndexRaw);
    const removeIndex =
      Number.isFinite(requestedIndex) && requestedIndex >= 0
        ? Math.min(currentSteps.length - 1, Math.trunc(requestedIndex))
        : currentSteps.length - 1;
    const removedStep = currentSteps[removeIndex];
    const nextSteps = currentSteps
      .filter((_: any, index: number) => index !== removeIndex)
      .map((step: any, index: number) => ({
        title: String(step.title || "").trim() || `Étape ${index + 1}`,
        options: Array.from(new Set((step.options || []).map((dishId: any) => String(dishId || "").trim()).filter(Boolean))),
        auto_notify: false,
        destination: (step.destination === "bar" ? "bar" : "cuisine") as "bar" | "cuisine",
      }));
    if (removedStep && Array.isArray(removedStep.options) && removedStep.options.length > 0) {
      const fallbackIndex = Math.max(0, removeIndex - 1);
      const target = nextSteps[fallbackIndex] || nextSteps[0];
      target.options = Array.from(
        new Set([...(target.options || []), ...removedStep.options.map((dishId: any) => String(dishId || "").trim()).filter(Boolean)])
      );
    }
    const stepMap = buildDishStepMapFromFormulaSteps(nextSteps);
    const currentMainStep = currentSequence[formulaParentKey] === DIRECT_SEND_STEP
      ? DIRECT_SEND_STEP
      : clampFormulaStep(currentSequence[formulaParentKey] || mainDishStep || 1, Math.max(currentSteps.length, 1));
    const nextMainStep =
      currentMainStep === DIRECT_SEND_STEP
        ? DIRECT_SEND_STEP
        : clampFormulaStep(currentMainStep, Math.max(nextSteps.length, 1));
    const nextSequence = buildFormulaSequenceByDish(currentSequence, stepMap, formulaParentKey, nextMainStep);
    setMainDishStep(nextMainStep);
    setDishSteps(stepMap);
    return {
      ...prev,
      formula_sequence_by_dish: nextSequence,
      formula_config: {
        ...baseConfig,
        selected_dishes: selectedDishIds,
        steps: nextSteps,
        steps_by_dish: stepMap,
        main_dish_step: nextMainStep,
        step_count: Math.max(1, nextSteps.length),
      },
    };
  });
};


  return {
    readFormulaDefaultOptionIdsMap,
    handleToggleExcludedMainOption,
    handleSaveExcludedMainOptions,
    handleSaveFormulaVisibility,
    handleSaveFormulaSupplements,
    handleFormulaDefaultOptionToggle,
    updateStep,
    addStep,
    removeStep,
  };
}
