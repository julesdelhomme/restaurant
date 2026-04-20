import { useRef, useState } from "react";
import { DEFAULT_MANAGER_RESTAURANT_FORM } from "../lib/manager-initial-state";
import {
  DEFAULT_TOTAL_TABLES,
  createDefaultAllergenLibrary,
  parseCookingTranslations,
} from "../lib/runtime-core-utils";
import type {
  AllergenLibraryRow,
  CategoryItem,
  CookingTranslationKey,
  Dish,
  ExtrasItem,
  Order,
  Restaurant,
  ReviewRow,
  SideLibraryItem,
  Stats,
  SubCategoryItem,
  TableAssignment,
} from "../types";

export function useManagerCoreState() {
  const hasAllergenLibraryTableRef = useRef(true);
  const hasRestaurantLanguagesTableRef = useRef(true);
  const dishesRefetchLockUntilRef = useRef(0);
  const lastSaveTimeRef = useRef(0);
  const isSavingRef = useRef(false);
  const dishesRefetchLockTimerRef = useRef<number | null>(null);

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [migrating, setMigrating] = useState(false);
  const [formulaLinksByFormulaId, setFormulaLinksByFormulaId] = useState<Map<string, string[]>>(new Map());
  const [formulaLinksByDishId, setFormulaLinksByDishId] = useState<Map<string, string[]>>(new Map());
  const [formulaLinkDefaultOptionsByFormulaId, setFormulaLinkDefaultOptionsByFormulaId] = useState<
    Map<string, Map<string, string[]>>
  >(new Map());
  const [formulaMainDishOptionsByFormulaId, setFormulaMainDishOptionsByFormulaId] = useState<Map<string, string[]>>(
    new Map()
  );
  const [formulaLinkSequenceByFormulaId, setFormulaLinkSequenceByFormulaId] = useState<
    Map<string, Map<string, number>>
  >(new Map());
  const [formulaLinkDisplayByFormulaId, setFormulaLinkDisplayByFormulaId] = useState<
    Map<
      string,
      {
        name: string;
        imageUrl: string;
        price?: number | null;
        description?: string | null;
        calories?: number | null;
        allergens?: string[] | null;
        formula_visible?: boolean;
        formula_supplements?: ExtrasItem[];
      }
    >
  >(new Map());
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    totalTips: 0,
    todayRevenue: 0,
    todayTips: 0,
    weekRevenue: 0,
    weekTips: 0,
    todayOrdersCount: 0,
    averageBasket: 0,
    topDishes: [],
    weekByDay: [],
  });
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [subCategories, setSubCategories] = useState<Record<string, string[]>>({});
  const [autoPrintKitchen, setAutoPrintKitchen] = useState(true);
  const [showCaloriesClient, setShowCaloriesClient] = useState(true);
  const [heroEnabled, setHeroEnabled] = useState(true);
  const [heroBadgeType, setHeroBadgeType] = useState<"chef" | "daily">("chef");
  const [consultationModeEnabled, setConsultationModeEnabled] = useState(false);
  const [searchBarEnabled, setSearchBarEnabled] = useState(false);
  const [totalTables, setTotalTables] = useState(DEFAULT_TOTAL_TABLES);
  const [activeLanguageCodes, setActiveLanguageCodes] = useState<string[]>(["fr", "en"]);
  const [languageLabels, setLanguageLabels] = useState<Record<string, string>>({ fr: "Français", en: "English" });
  const [cookingTranslations, setCookingTranslations] = useState<Record<CookingTranslationKey, Record<string, string>>>(
    parseCookingTranslations(null)
  );
  const [allergenLibrary, setAllergenLibrary] = useState<AllergenLibraryRow[]>(createDefaultAllergenLibrary());
  const [newAllergenFr, setNewAllergenFr] = useState("");
  const [languageInput, setLanguageInput] = useState("");
  const [languageCodeInput, setLanguageCodeInput] = useState("");
  const [languagePresetToAdd, setLanguagePresetToAdd] = useState<string>("pt");
  const [criticalStock, setCriticalStock] = useState<Dish[]>([]);
  const [subCategoryRows, setSubCategoryRows] = useState<SubCategoryItem[]>([]);
  const [sidesLibrary, setSidesLibrary] = useState<SideLibraryItem[]>([]);
  const [tableAssignments, setTableAssignments] = useState<TableAssignment[]>([]);
  const [analyticsTab, setAnalyticsTab] = useState<"live" | "product" | "trends" | "ops">("live");
  const [analyticsRange, setAnalyticsRange] = useState<"today" | "7d" | "30d">("today");
  const [activeManagerTab, setActiveManagerTab] = useState<
    "menu" | "stats" | "staff" | "appearance" | "configuration" | "card_designer" | "security"
  >("menu");
  const [reportExportedRange, setReportExportedRange] = useState<"today" | "7d" | "30d" | null>(null);
  const [isPurgingHistory, setIsPurgingHistory] = useState(false);
  const [managerUserEmail, setManagerUserEmail] = useState("");
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordUpdateLoading, setPasswordUpdateLoading] = useState(false);
  const [passwordUpdateMessage, setPasswordUpdateMessage] = useState("");
  const [passwordUpdateError, setPasswordUpdateError] = useState("");
  const [managerOtpEnabled, setManagerOtpEnabled] = useState(false);
  const [managerOtpLoading, setManagerOtpLoading] = useState(false);
  const [managerOtpMessage, setManagerOtpMessage] = useState("");
  const [managerOtpError, setManagerOtpError] = useState("");
  const [forceFirstLoginPasswordChange, setForceFirstLoginPasswordChange] = useState(false);
  const [isRestaurantLoading, setIsRestaurantLoading] = useState(true);
  const [isSuperAdminSession, setIsSuperAdminSession] = useState(false);
  const [managerAccessError, setManagerAccessError] = useState("");
  const [globalManagerNotification, setGlobalManagerNotification] = useState<{ id: string; message: string } | null>(
    null
  );
  const [restaurantForm, setRestaurantForm] = useState(() => ({ ...DEFAULT_MANAGER_RESTAURANT_FORM }));

  return {
    refs: {
      hasAllergenLibraryTableRef,
      hasRestaurantLanguagesTableRef,
      dishesRefetchLockUntilRef,
      lastSaveTimeRef,
      isSavingRef,
      dishesRefetchLockTimerRef,
    },
    state: {
      dishes,
      migrating,
      formulaLinksByFormulaId,
      formulaLinksByDishId,
      formulaLinkDefaultOptionsByFormulaId,
      formulaMainDishOptionsByFormulaId,
      formulaLinkSequenceByFormulaId,
      formulaLinkDisplayByFormulaId,
      orders,
      reviews,
      stats,
      restaurant,
      categories,
      subCategories,
      autoPrintKitchen,
      showCaloriesClient,
      heroEnabled,
      heroBadgeType,
      consultationModeEnabled,
      searchBarEnabled,
      totalTables,
      activeLanguageCodes,
      languageLabels,
      cookingTranslations,
      allergenLibrary,
      newAllergenFr,
      languageInput,
      languageCodeInput,
      languagePresetToAdd,
      criticalStock,
      subCategoryRows,
      sidesLibrary,
      tableAssignments,
      analyticsTab,
      analyticsRange,
      activeManagerTab,
      reportExportedRange,
      isPurgingHistory,
      managerUserEmail,
      passwordForm,
      passwordUpdateLoading,
      passwordUpdateMessage,
      passwordUpdateError,
      managerOtpEnabled,
      managerOtpLoading,
      managerOtpMessage,
      managerOtpError,
      forceFirstLoginPasswordChange,
      isRestaurantLoading,
      isSuperAdminSession,
      managerAccessError,
      globalManagerNotification,
      restaurantForm,
    },
    setters: {
      setDishes,
      setMigrating,
      setFormulaLinksByFormulaId,
      setFormulaLinksByDishId,
      setFormulaLinkDefaultOptionsByFormulaId,
      setFormulaMainDishOptionsByFormulaId,
      setFormulaLinkSequenceByFormulaId,
      setFormulaLinkDisplayByFormulaId,
      setOrders,
      setReviews,
      setStats,
      setRestaurant,
      setCategories,
      setSubCategories,
      setAutoPrintKitchen,
      setShowCaloriesClient,
      setHeroEnabled,
      setHeroBadgeType,
      setConsultationModeEnabled,
      setSearchBarEnabled,
      setTotalTables,
      setActiveLanguageCodes,
      setLanguageLabels,
      setCookingTranslations,
      setAllergenLibrary,
      setNewAllergenFr,
      setLanguageInput,
      setLanguageCodeInput,
      setLanguagePresetToAdd,
      setCriticalStock,
      setSubCategoryRows,
      setSidesLibrary,
      setTableAssignments,
      setAnalyticsTab,
      setAnalyticsRange,
      setActiveManagerTab,
      setReportExportedRange,
      setIsPurgingHistory,
      setManagerUserEmail,
      setPasswordForm,
      setPasswordUpdateLoading,
      setPasswordUpdateMessage,
      setPasswordUpdateError,
      setManagerOtpEnabled,
      setManagerOtpLoading,
      setManagerOtpMessage,
      setManagerOtpError,
      setForceFirstLoginPasswordChange,
      setIsRestaurantLoading,
      setIsSuperAdminSession,
      setManagerAccessError,
      setGlobalManagerNotification,
      setRestaurantForm,
    },
  };
}
