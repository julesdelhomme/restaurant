"use client";

import { useRef, useState } from "react";

export function useMenuPageState() {
  const [lang, setLang] = useState<string>("fr");
  const [dishes, setDishes] = useState<any[]>([]);
  const [restaurant, setRestaurant] = useState<any | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [cart, setCart] = useState<any[]>([]);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [selectedDish, setSelectedDish] = useState<any | null>(null);
  const [formulaDish, setFormulaDish] = useState<any | null>(null);
  const [formulaSourceDish, setFormulaSourceDish] = useState<any | null>(null);
  const [formulaLinksByFormulaId, setFormulaLinksByFormulaId] = useState<Map<string, any[]>>(new Map());
  const [formulaLinksByDishId, setFormulaLinksByDishId] = useState<Map<string, any[]>>(new Map());
  const [formulaInfoById, setFormulaInfoById] = useState<Map<string, any>>(new Map());
  const [formulaSelections, setFormulaSelections] = useState<Record<string, string>>({});
  const [formulaSelectionDetails, setFormulaSelectionDetails] = useState<Record<string, any>>({});
  const [formulaMainDetails, setFormulaMainDetails] = useState<any>({
    selectedSideIds: [],
    selectedSides: [],
    selectedCooking: "",
    selectedProductOptionIds: [],
  });
  const [formulaSelectionError, setFormulaSelectionError] = useState("");
  const [formulaItemDetailsOpen, setFormulaItemDetailsOpen] = useState<Record<string, boolean>>({});
  const [formulaActiveCategoryId, setFormulaActiveCategoryId] = useState("");
  const [dishModalQuantity, setDishModalQuantity] = useState(1);
  const [serverCallMsg, setServerCallMsg] = useState("");
  const [showCallModal, setShowCallModal] = useState(false);
  const [isSendingCall, setIsSendingCall] = useState(false);
  const [serverCallCooldownUntil, setServerCallCooldownUntil] = useState(0);
  const [serverCallSecondsLeft, setServerCallSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRestaurantOffline, setIsRestaurantOffline] = useState(false);
  const [offlineRestaurantName, setOfflineRestaurantName] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");
  const [selectedSides, setSelectedSides] = useState<string[]>([]);
  const [selectedCooking, setSelectedCooking] = useState("");
  const [selectedExtras, setSelectedExtras] = useState<any[]>([]);
  const [modalProductOptions, setModalProductOptions] = useState<any[]>([]);
  const [selectedProductOptionIds, setSelectedProductOptionIds] = useState<string[]>([]);
  const [modalSidesOptions, setModalSidesOptions] = useState<string[]>([]);
  const [modalExtrasOptions, setModalExtrasOptions] = useState<any[]>([]);
  const [modalAskCooking, setModalAskCooking] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [orderValidationCodeInput, setOrderValidationCodeInput] = useState("");
  const [, setOrderValidationCode] = useState("1234");
  const [tablePinCodesByNumber, setTablePinCodesByNumber] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [legalFooterModal, setLegalFooterModal] = useState<null | "legal" | "rules">(null);
  const [cartBump, setCartBump] = useState(false);
  const [isStickyActionsCompact, setIsStickyActionsCompact] = useState(false);
  const actionDockSentinelRef = useRef<HTMLDivElement | null>(null);
  const categoryTabsRef = useRef<HTMLDivElement | null>(null);
  const categoryTabsScrollRef = useRef<HTMLDivElement | null>(null);
  const didInitCategoryScrollRef = useRef(false);
  const [isCategoryTabsOutOfView, setIsCategoryTabsOutOfView] = useState(false);
  const [showCategoryScrollHint, setShowCategoryScrollHint] = useState(false);
  const [isCategoryScrollAtEnd, setIsCategoryScrollAtEnd] = useState(false);
  const vitrineViewTrackedRef = useRef<Record<string, boolean>>({});
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sideError, setSideError] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryDrawerEnabled, setCategoryDrawerEnabled] = useState(false);
  const [keepSuggestionsOnTop, setKeepSuggestionsOnTop] = useState(false);
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const [serviceHours, setServiceHours] = useState({ lunch_start: "", lunch_end: "", dinner_start: "", dinner_end: "" });
  const [subCategoryRows, setSubCategoryRows] = useState<any[]>([]);
  const [sidesLibrary, setSidesLibrary] = useState<any[]>([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [showCaloriesClient, setShowCaloriesClient] = useState(true);
  const [consultationModeClient, setConsultationModeClient] = useState(false);
  const [heroEnabledClient, setHeroEnabledClient] = useState(true);
  const [heroBadgeTypeClient, setHeroBadgeTypeClient] = useState<"chef" | "daily">("chef");
  const [enabledLanguagesClient, setEnabledLanguagesClient] = useState<string[]>(["fr", "en"]);
  const [enabledLanguageLabels, setEnabledLanguageLabels] = useState<Record<string, string>>({ fr: "Français", en: "English" });
  const [showSalesAdviceModal, setShowSalesAdviceModal] = useState(false);
  const [salesAdviceMessage, setSalesAdviceMessage] = useState("");
  const [salesAdviceDishId, setSalesAdviceDishId] = useState<string>("");
  const [recommendationSourceDishId, setRecommendationSourceDishId] = useState<string>("");
  const [suggestionLeadByLang, setSuggestionLeadByLang] = useState<Record<string, string>>({});
  const [uiTranslationsByLang, setUiTranslationsByLang] = useState<any>({});
  const [darkMode, setDarkMode] = useState(false);
  const [timeTick, setTimeTick] = useState(0);
  const [headerLogoLoadError, setHeaderLogoLoadError] = useState(false);
  const [headerLogoCacheBuster, setHeaderLogoCacheBuster] = useState<number>(Date.now());

  return {
    lang, setLang, dishes, setDishes, restaurant, setRestaurant, selectedCategory, setSelectedCategory, cart, setCart, showLangMenu, setShowLangMenu, selectedDish, setSelectedDish, formulaDish, setFormulaDish, formulaSourceDish, setFormulaSourceDish, formulaLinksByFormulaId, setFormulaLinksByFormulaId, formulaLinksByDishId, setFormulaLinksByDishId, formulaInfoById, setFormulaInfoById, formulaSelections, setFormulaSelections, formulaSelectionDetails, setFormulaSelectionDetails, formulaMainDetails, setFormulaMainDetails, formulaSelectionError, setFormulaSelectionError, formulaItemDetailsOpen, setFormulaItemDetailsOpen, formulaActiveCategoryId, setFormulaActiveCategoryId, dishModalQuantity, setDishModalQuantity, serverCallMsg, setServerCallMsg, showCallModal, setShowCallModal, isSendingCall, setIsSendingCall, serverCallCooldownUntil, setServerCallCooldownUntil, serverCallSecondsLeft, setServerCallSecondsLeft, loading, setLoading, isRestaurantOffline, setIsRestaurantOffline, offlineRestaurantName, setOfflineRestaurantName, specialRequest, setSpecialRequest, selectedSides, setSelectedSides, selectedCooking, setSelectedCooking, selectedExtras, setSelectedExtras, modalProductOptions, setModalProductOptions, selectedProductOptionIds, setSelectedProductOptionIds, modalSidesOptions, setModalSidesOptions, modalExtrasOptions, setModalExtrasOptions, modalAskCooking, setModalAskCooking, isCartOpen, setIsCartOpen, tableNumber, setTableNumber, orderValidationCodeInput, setOrderValidationCodeInput, setOrderValidationCode, tablePinCodesByNumber, setTablePinCodesByNumber, toastMessage, setToastMessage, orderSuccess, setOrderSuccess, isSubmittingOrder, setIsSubmittingOrder, legalFooterModal, setLegalFooterModal, cartBump, setCartBump, isStickyActionsCompact, setIsStickyActionsCompact, actionDockSentinelRef, categoryTabsRef, categoryTabsScrollRef, didInitCategoryScrollRef, isCategoryTabsOutOfView, setIsCategoryTabsOutOfView, showCategoryScrollHint, setShowCategoryScrollHint, isCategoryScrollAtEnd, setIsCategoryScrollAtEnd, vitrineViewTrackedRef, toastTimeoutRef, sideError, setSideError, categories, setCategories, categoryDrawerEnabled, setCategoryDrawerEnabled, keepSuggestionsOnTop, setKeepSuggestionsOnTop, isCategoryDrawerOpen, setIsCategoryDrawerOpen, serviceHours, setServiceHours, subCategoryRows, setSubCategoryRows, sidesLibrary, setSidesLibrary, selectedSubCategory, setSelectedSubCategory, showCaloriesClient, setShowCaloriesClient, consultationModeClient, setConsultationModeClient, heroEnabledClient, setHeroEnabledClient, heroBadgeTypeClient, setHeroBadgeTypeClient, enabledLanguagesClient, setEnabledLanguagesClient, enabledLanguageLabels, setEnabledLanguageLabels, showSalesAdviceModal, setShowSalesAdviceModal, salesAdviceMessage, setSalesAdviceMessage, salesAdviceDishId, setSalesAdviceDishId, recommendationSourceDishId, setRecommendationSourceDishId, suggestionLeadByLang, setSuggestionLeadByLang, uiTranslationsByLang, setUiTranslationsByLang, darkMode, setDarkMode, timeTick, setTimeTick, headerLogoLoadError, setHeaderLogoLoadError, headerLogoCacheBuster, setHeaderLogoCacheBuster,
  };
}
