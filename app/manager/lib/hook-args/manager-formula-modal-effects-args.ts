export function buildManagerFormulaModalEffectsArgs(params: any) {
  const { managerEditorUiState, runtime, core, helpers } = params;
  return {
    ...managerEditorUiState,
    activeLanguageCodes: runtime.activeLanguageCodes,
    dishes: core.dishes,
    allergenLibrary: core.allergenLibrary,
    scopedRestaurantId: runtime.scopedRestaurantId,
    supabase: runtime.supabase,
    normalizeText: helpers.normalizeText,
    hasMissingColumnError: helpers.hasMissingColumnError,
    parseJsonObject: helpers.parseJsonObject,
    parseObjectRecord: helpers.parseObjectRecord,
    normalizeFormulaStepEntries: helpers.normalizeFormulaStepEntries,
    buildDishStepMapFromFormulaSteps: helpers.buildDishStepMapFromFormulaSteps,
    normalizeOptionIds: helpers.normalizeOptionIds,
    parseExtrasFromUnknown: helpers.parseExtrasFromUnknown,
    toBoolean: helpers.toBoolean,
    buildFormulaStepsFromDishStepMap: helpers.buildFormulaStepsFromDishStepMap,
    normalizeLanguageKey: helpers.normalizeLanguageKey,
  };
}
