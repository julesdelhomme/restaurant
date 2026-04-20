import { useManagerAnalyticsRuntime } from "./useManagerAnalyticsRuntime";
import { useManagerRestaurantLinks } from "./useManagerRestaurantLinks";
import { useManagerPrintActions } from "./useManagerPrintActions";
import { useManagerPdfReports } from "./useManagerPdfReports";

export function useManagerReportingRuntime(params: any) {
  const { runtime, state, setters, helpers, constants, insights, labels } = params;

  const managerAnalyticsRuntime = useManagerAnalyticsRuntime({
    orders: state.orders,
    dishes: state.dishes,
    analyticsRange: state.analyticsRange,
    categories: state.categories,
    totalTables: state.totalTables,
    DEFAULT_TOTAL_TABLES: constants.DEFAULT_TOTAL_TABLES,
    normalizeTotalTables: helpers.normalizeTotalTables,
    analyticsText: labels.analyticsText,
    managerUiLang: labels.managerUiLang,
    parseObjectRecord: helpers.parseObjectRecord,
    restaurant: state.restaurant,
    parseTimeToMinutes: helpers.parseTimeToMinutes,
    reportExportedRange: state.reportExportedRange,
    isPurgingHistory: state.isPurgingHistory,
    setReportExportedRange: setters.setReportExportedRange,
  });

  const managerRestaurantLinks = useManagerRestaurantLinks({
    restaurantForm: state.restaurantForm,
    restaurant: state.restaurant,
    scopedRestaurantId: runtime.scopedRestaurantId,
  });

  const managerPrintActions = useManagerPrintActions({
    analyticsRange: state.analyticsRange,
    reportExportedRange: state.reportExportedRange,
    setIsPurgingHistory: setters.setIsPurgingHistory,
    setReportExportedRange: setters.setReportExportedRange,
    fetchOrders: runtime.fetchOrders,
    preparedDishesSorted: state.preparedDishesSorted,
    categories: state.categories,
    sidesLibrary: state.sidesLibrary,
    managerUiLang: labels.managerUiLang,
    parseOptionsFromDescription: helpers.parseOptionsFromDescription,
    parseExtrasFromUnknown: helpers.parseExtrasFromUnknown,
    normalizeText: helpers.normalizeText,
    formatEuro: helpers.formatEuro,
    getDishDisplayDescription: helpers.getDishDisplayDescription,
    resolveSupabasePublicUrl: helpers.resolveSupabasePublicUrl,
    DISH_IMAGES_BUCKET: constants.DISH_IMAGES_BUCKET,
    restaurantForm: state.restaurantForm,
    restaurant: state.restaurant,
    RESTAURANT_LOGOS_BUCKET: constants.RESTAURANT_LOGOS_BUCKET,
    RESTAURANT_BANNERS_BUCKET: constants.RESTAURANT_BANNERS_BUCKET,
    normalizeHexColor: helpers.normalizeHexColor,
    normalizeBackgroundOpacity: helpers.normalizeBackgroundOpacity,
    parseObjectRecord: helpers.parseObjectRecord,
    isHexColorDark: helpers.isHexColorDark,
    normalizeManagerFontFamily: helpers.normalizeManagerFontFamily,
  });

  const managerPdfReports = useManagerPdfReports({
    analyticsRange: state.analyticsRange,
    setReportExportedRange: setters.setReportExportedRange,
    displayedAnalytics: managerAnalyticsRuntime.displayedAnalytics,
    analyticsText: labels.analyticsText,
    avgOccupationRateLabel: labels.avgOccupationRateLabel,
    formatEuro: helpers.formatEuro,
    reviews: state.reviews,
    dishNameById: insights.dishNameById,
    reviewAverage: insights.reviewAverage,
    topReviewedDish: insights.topReviewedDish,
    reviewCriteriaAverages: insights.reviewCriteriaAverages,
    weeklyAiSummary: insights.weeklyAiSummary,
    managerUiLang: labels.managerUiLang,
    restaurantForm: state.restaurantForm,
    restaurant: state.restaurant,
    preparedDishesSorted: state.preparedDishesSorted,
    categories: state.categories,
    resolveSupabasePublicUrl: helpers.resolveSupabasePublicUrl,
    RESTAURANT_LOGOS_BUCKET: constants.RESTAURANT_LOGOS_BUCKET,
    parseOptionsFromDescription: helpers.parseOptionsFromDescription,
    parseExtrasFromUnknown: helpers.parseExtrasFromUnknown,
    normalizeText: helpers.normalizeText,
    getDishDisplayDescription: helpers.getDishDisplayDescription,
    DISH_IMAGES_BUCKET: constants.DISH_IMAGES_BUCKET,
    sidesLibrary: state.sidesLibrary,
    scopedRestaurantId: runtime.scopedRestaurantId,
  });

  return {
    managerAnalyticsRuntime,
    managerRestaurantLinks,
    managerPrintActions,
    managerPdfReports,
  };
}
