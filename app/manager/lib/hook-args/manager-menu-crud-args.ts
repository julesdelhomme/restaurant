export function buildManagerMenuCrudArgs(params: any) {
  const { managerEditorUiState, runtime, state, setters, helpers } = params;
  return {
    ...managerEditorUiState,
    scopedRestaurantId: runtime.scopedRestaurantId,
    activeLanguageCodes: state.activeLanguageCodes,
    buildI18nToken: helpers.buildI18nToken,
    fetchSubCategories: runtime.fetchSubCategories,
    normalizeCategoryDestination: helpers.normalizeCategoryDestination,
    normalizeSortOrder: helpers.normalizeSortOrder,
    fetchCategories: runtime.fetchCategories,
    setCategories: setters.setCategories,
    setSubCategoryRows: setters.setSubCategoryRows,
    fetchSidesLibrary: runtime.fetchSidesLibrary,
    parseI18nToken: helpers.parseI18nToken,
    getExtraKey: helpers.getExtraKey,
    createLocalId: helpers.createLocalId,
    normalizeLanguageKey: helpers.normalizeLanguageKey,
    normalizeText: helpers.normalizeText,
  };
}
