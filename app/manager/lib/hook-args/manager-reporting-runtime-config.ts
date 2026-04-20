import { formatEuro } from "../manager-formatters";
import { parseTimeToMinutes } from "../manager-schedule-utils";
import { normalizeText } from "../../managerRuntimeShared";
import {
  getDishDisplayDescription,
  parseExtrasFromUnknown,
  parseOptionsFromDescription,
} from "../runtime-data-utils";
import {
  DEFAULT_TOTAL_TABLES,
  DISH_IMAGES_BUCKET,
  RESTAURANT_BANNERS_BUCKET,
  RESTAURANT_LOGOS_BUCKET,
  isHexColorDark,
  normalizeBackgroundOpacity,
  normalizeHexColor,
  normalizeManagerFontFamily,
  normalizeTotalTables,
  parseObjectRecord,
  resolveSupabasePublicUrl,
} from "../runtime-core-utils";

type BuildManagerReportingRuntimeConfigInput = {
  scopedRestaurantId: string;
  fetchOrders: () => Promise<void> | void;
  managerCoreState: any;
  managerDishCollections: any;
  managerReviewInsights: any;
  managerUiLabels: any;
  managerStatsLabels: any;
};

export function buildManagerReportingRuntimeConfig({
  scopedRestaurantId,
  fetchOrders,
  managerCoreState,
  managerDishCollections,
  managerReviewInsights,
  managerUiLabels,
  managerStatsLabels,
}: BuildManagerReportingRuntimeConfigInput) {
  const { state, setters } = managerCoreState;

  return {
    runtime: {
      scopedRestaurantId,
      fetchOrders,
    },
    state: {
      orders: state.orders,
      dishes: state.dishes,
      analyticsRange: state.analyticsRange,
      categories: state.categories,
      totalTables: state.totalTables,
      reportExportedRange: state.reportExportedRange,
      isPurgingHistory: state.isPurgingHistory,
      restaurant: state.restaurant,
      restaurantForm: state.restaurantForm,
      preparedDishesSorted: managerDishCollections.preparedDishesSorted,
      sidesLibrary: state.sidesLibrary,
      reviews: state.reviews,
    },
    setters: {
      setReportExportedRange: setters.setReportExportedRange,
      setIsPurgingHistory: setters.setIsPurgingHistory,
    },
    helpers: {
      normalizeTotalTables,
      parseObjectRecord,
      parseTimeToMinutes,
      parseOptionsFromDescription,
      parseExtrasFromUnknown,
      normalizeText,
      formatEuro,
      getDishDisplayDescription,
      resolveSupabasePublicUrl,
      normalizeHexColor,
      normalizeBackgroundOpacity,
      isHexColorDark,
      normalizeManagerFontFamily,
    },
    constants: {
      DEFAULT_TOTAL_TABLES,
      DISH_IMAGES_BUCKET,
      RESTAURANT_LOGOS_BUCKET,
      RESTAURANT_BANNERS_BUCKET,
    },
    insights: {
      dishNameById: managerReviewInsights.dishNameById,
      reviewAverage: managerReviewInsights.reviewAverage,
      topReviewedDish: managerReviewInsights.topReviewedDish,
      reviewCriteriaAverages: managerReviewInsights.reviewCriteriaAverages,
      weeklyAiSummary: managerReviewInsights.weeklyAiSummary,
    },
    labels: {
      analyticsText: managerUiLabels.analyticsText,
      managerUiLang: managerUiLabels.managerUiLang,
      avgOccupationRateLabel: managerStatsLabels.avgOccupationRateLabel,
    },
  };
}
