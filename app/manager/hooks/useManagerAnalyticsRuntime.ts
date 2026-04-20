import { useEffect, useMemo, useState } from "react";
import { useManagerAnalyticsData } from "./useManagerAnalyticsData";

export function useManagerAnalyticsRuntime(deps: Record<string, any>) {
  const {
    orders,
    dishes,
    analyticsRange,
    categories,
    totalTables,
    DEFAULT_TOTAL_TABLES,
    normalizeTotalTables,
    analyticsText,
    managerUiLang,
    parseObjectRecord,
    restaurant,
    parseTimeToMinutes,
    reportExportedRange,
    isPurgingHistory,
    setReportExportedRange,
  } = deps;

  const categoryById = useMemo(
    () => new Map(categories.map((category: Record<string, unknown>) => [String(category.id), category])),
    [categories]
  );
  const configuredTableNumbers = useMemo(
    () => Array.from({ length: normalizeTotalTables(totalTables, DEFAULT_TOTAL_TABLES) }, (_, index) => index + 1),
    [totalTables]
  );

  const { analyticsData } = useManagerAnalyticsData({
    orders,
    dishes,
    analyticsRange,
    categoryById,
    analyticsText,
    managerUiLang,
    configuredTableNumbers,
    parseObjectRecord,
    restaurant,
    parseTimeToMinutes,
  });

  const [analyticsPersistentData, setAnalyticsPersistentData] = useState(() => analyticsData);

  useEffect(() => {
    setAnalyticsPersistentData(analyticsData);
  }, [analyticsData]);

  const displayedAnalytics = analyticsPersistentData;
  const monthlyCloseEnabled = analyticsRange === "30d" && reportExportedRange === "30d" && !isPurgingHistory;

  useEffect(() => {
    setReportExportedRange(null);
  }, [analyticsRange]);

  return { displayedAnalytics, monthlyCloseEnabled };
}
