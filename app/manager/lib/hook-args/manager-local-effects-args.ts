export function buildManagerLocalEffectsArgs(params: any) {
  const { managerEditorUiState, core, setters, helpers, fetchSubCategories } = params;
  return {
    ...managerEditorUiState,
    subCategories: core.subCategories,
    setSubCategories: setters.setSubCategories,
    orders: core.orders,
    dishes: core.dishes,
    calculateStats: helpers.calculateStats,
    forceFirstLoginPasswordChange: core.forceFirstLoginPasswordChange,
    restaurant: core.restaurant,
    setForceFirstLoginPasswordChange: setters.setForceFirstLoginPasswordChange,
    toBoolean: helpers.toBoolean,
    categories: core.categories,
    fetchSubCategories,
  };
}
