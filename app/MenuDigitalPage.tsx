"use client";
import React, { useCallback, useEffect, useMemo } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import RestaurantOffline from "./components/RestaurantOffline";
import LegalWelcomeModal from "./components/LegalWelcomeModal";
import { MenuFontBootstrap } from "./components/menu-page/MenuFontBootstrap";
import { MenuCategoryDrawerButton } from "./components/menu-page/MenuCategoryDrawerButton";
import { MenuCategoryTabsBar } from "./components/menu-page/MenuCategoryTabsBar";
import { MenuCategoryDrawer } from "./components/menu-page/MenuCategoryDrawer";
import { MenuSubCategoryTabs } from "./components/menu-page/MenuSubCategoryTabs";
import { MenuVisualStyles } from "./components/menu-page/MenuVisualStyles";
import { MenuBackgroundLayer } from "./components/menu-page/MenuBackgroundLayer";
import { MenuBannerHeader, type MenuLanguageOption } from "./components/menu-page/MenuBannerHeader";
import { MenuAccessPanel } from "./components/menu-page/MenuAccessPanel";
import { MenuActionDock } from "./components/menu-page/MenuActionDock";
import { MenuSmartCallModal } from "./components/menu-page/MenuSmartCallModal";
import { MenuSalesAdviceModal } from "./components/menu-page/MenuSalesAdviceModal";
import { MenuSocialFooter } from "./components/menu-page/MenuSocialFooter";
import { MenuCartModal } from "./components/menu-page/MenuCartModal";
import { MenuLegalFooter } from "./components/menu-page/MenuLegalFooter";
import { MenuStatusToasts } from "./components/menu-page/MenuStatusToasts";
import { MenuDishGridSection } from "./components/menu-page/MenuDishGridSection";
import { MenuFeaturedHighlightsSection } from "./components/menu-page/MenuFeaturedHighlightsSection";
import { MenuFormulaModal } from "./components/menu-page/MenuFormulaModal";
import { MenuSelectedDishModal } from "./components/menu-page/MenuSelectedDishModal";
import { getCookingLabelFr, normalizeCookingKey, translateAllergenFallback, translateHungerLevelFallback, translateSpicyLevelFallback } from "./lib/ui-translations";
import { SMART_CALL_I18N_EXTENDED } from "./lib/languagesConfig";
import { legalTranslations } from "./constants/legalTranslations";
import { MENU_PAGE_UI_TEXT } from "./lib/menu-page/ui-text";
import { ALLERGEN_MAP, DEFAULT_LANGUAGE_FLAGS, DEFAULT_LANGUAGE_LABELS, DEFAULT_RESTAURANT_NAME, DEFAULT_SUGGESTION_LEADS, PRICE_FORMATTER_EUR, SETTINGS_ROW_ID, formatPriceTwoDecimals, parseAddonPrice, parsePriceNumber, parseVariantPrice } from "./lib/menu-page/config";
import { CATEGORY_KEYS, FORMULA_BADGE_TRANSLATIONS, FORMULAS_CATEGORY_ID, LAST_SERVER_CALL_STORAGE_KEY, PROMO_BADGE_TRANSLATIONS, SERVER_CALL_THROTTLE_MS, SMART_CALL_OPTION_META, VIEW_FORMULA_TRANSLATIONS, getServerCallCooldownText, type SmartCallOptionKey } from "./lib/menu-page/static";
import { normalizeFormulaOrderItemsForPayload, resolveInitialCurrentStepFromOrderItems } from "./lib/menu-page/formula-order-runtime";
import { getCategoryDestinationFromMap, isDessertCategoryFromMap, isDrinkCategoryFromMap, isMainDishFromCategory } from "./lib/menu-page/category-runtime";
import { isProductOptionVisible, parseOptionIdSet } from "./lib/menu-page/formula-runtime";
import { getSideMaxOptions, isIceCreamDish as isIceCreamDishFromMap, resolveCardLayout, resolveCardVisualStyle, resolveDensityStyle, resolveMenuFontFamily, resolveMenuLayout, resolveRestaurantCardDesignerLayout } from "./lib/menu-page/display-runtime";
import { useMenuFontEffects } from "./lib/menu-page/use-menu-font-effects";
import { useMenuDishSelectionActions } from "./lib/menu-page/use-menu-dish-selection-actions";
import { useMenuFetchData } from "./lib/menu-page/use-menu-fetch-data";
import { useMenuDataSyncEffects } from "./lib/menu-page/use-menu-data-sync-effects";
import { useMenuUiEffects } from "./lib/menu-page/use-menu-ui-effects";
import { useMenuFormulaDerived } from "./lib/menu-page/use-menu-formula-derived";
import { useMenuDishCollections } from "./lib/menu-page/use-menu-dish-collections";
import { useMenuCartActions } from "./lib/menu-page/use-menu-cart-actions";
import { useMenuServerCall } from "./lib/menu-page/use-menu-server-call";
import { useMenuSubmitOrder } from "./lib/menu-page/use-menu-submit-order";
import { useMenuPageState } from "./lib/menu-page/use-menu-page-state";
import { resolveMenuRouteContext } from "./lib/menu-page/route-runtime";
import { buildSocialFooterEntries } from "./lib/menu-page/social-runtime";
import { createMenuPricingRuntime } from "./lib/menu-page/pricing-runtime";
import { getCategoryLabelRuntime, buildSortedCategories, buildFormulaMenuDishes, getHasFormulaDishes, buildMenuCategories, buildCategoryList, buildCategorySortMap, buildAvailabilitySnapshot, isDishAvailableNowRuntime, isDishVisibleInMenuRuntime, getSideLabelRuntime, getSubCategoryLabelRuntime, buildSideNameFrById, buildSideIdByAlias, getFormulaSelectionDetailsRuntime, getFormulaDishConfigRuntime } from "./lib/menu-page/menu-structure-runtime";
import { buildMergedUiDictionaryRuntime, buildFormulaUiRuntime, buildMenuLabelsRuntime } from "./lib/menu-page/ui-label-runtime";
import { MASTER_UI_DICTIONARY } from "../constants/translations";
import { normalizeCategory, normalizeText, DAY_KEY_ALIASES, normalizeDayKey, parseAvailableDays, parseTimeToMinutes, toBooleanFlag, CardDesignerLayout, resolveDesignerShadowPreset, ALCOHOL_WARNING_I18N, getAlcoholWarningText, dishContainsAlcohol, isWithinTimeWindow, fixDisplayText, deepFixDisplayText, UI_TEXT_CLEAN, normalizeHexColor, sanitizeMediaUrl, normalizeBackgroundOpacity, normalizeOpacityPercent, getHexContrastTextColor, withAlpha, alphaHexFromPercent, t, UiDictionary, UiTranslationsByLang, RTL_LANGUAGE_CODES, parseUiTranslations, buildRuntimeUiText, Dish, ProductOptionItem, SuggestionRule, Restaurant, normalizeLanguageKey, parseEnabledLanguageEntries, getLanguageFlag, parseJsonObject, toSafeString, getNameTranslation, normalizePinValue, normalizeTableNumberKey, normalizeLookupText, parseI18nToken, buildStableExtraId, translateCookingToFrench, parseShowCalories, toLoggableSupabaseError, isMissingColumnError, parseDisplaySettingsFromRow, parseDisplaySettingsFromSettingsJson, parseMarketingOptions, toUiLang, ExtrasItem, SideLibraryItem, CategoryItem, SubCategoryItem, ParsedOptions, CartItem, FormulaSelectionDetails, FormulaDishLink, parseOptionsFromDescription, parseExtrasFromUnknown, parseDishOptionsRowsToExtras, mergeExtrasUnique, getDishExtras, getDishName, getDescription, getExtraLabel, getAllergens, getLocalizedAllergens, translateAllergen, normalizeAllergenKey, buildAllergenLibraryLookup, getSpicyBadgeLabel, getDishStyleBadgeFlags, getHungerLevel, getCaloriesLabel, collapseDuplicateWords, dedupeDisplayValues, getProductOptionLabel, getSelectedProductOptionsList, buildInstructionText } from "./lib/menu-page/runtime";
const UI_TRANSLATIONS = MASTER_UI_DICTIONARY;
const SMART_CALL_UI = SMART_CALL_I18N_EXTENDED;
const UI_TEXT = MENU_PAGE_UI_TEXT;
export default function MenuDigital() {
  const router = useRouter();
  const params = useParams<{ id?: string; restaurant_id?: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { scopedRestaurantId, pathSegments, isVitrineMode } = resolveMenuRouteContext({
    paramRestaurantId: params?.restaurant_id,
    paramId: params?.id,
    pathname,
    queryRestaurantId: searchParams.get("restaurant_id"),
    modeQuery: searchParams.get("mode"),
    locationPathname: typeof window !== "undefined" ? window.location.pathname : "",
  });
  useEffect(() => {
    if (scopedRestaurantId) return;
    if (pathSegments.length > 0) return;
    router.replace("/admin");
  }, [scopedRestaurantId, pathSegments.length, router]);
  const { lang, setLang, dishes, setDishes, restaurant, setRestaurant, selectedCategory, setSelectedCategory, cart, setCart, showLangMenu, setShowLangMenu, selectedDish, setSelectedDish, formulaDish, setFormulaDish, formulaSourceDish, setFormulaSourceDish, formulaLinksByFormulaId, setFormulaLinksByFormulaId, formulaLinksByDishId, setFormulaLinksByDishId, formulaInfoById, setFormulaInfoById, formulaSelections, setFormulaSelections, formulaSelectionDetails, setFormulaSelectionDetails, formulaMainDetails, setFormulaMainDetails, formulaSelectionError, setFormulaSelectionError, formulaItemDetailsOpen, setFormulaItemDetailsOpen, formulaActiveCategoryId, setFormulaActiveCategoryId, dishModalQuantity, setDishModalQuantity, serverCallMsg, setServerCallMsg, showCallModal, setShowCallModal, isSendingCall, setIsSendingCall, serverCallCooldownUntil, setServerCallCooldownUntil, serverCallSecondsLeft, setServerCallSecondsLeft, loading, setLoading, isRestaurantOffline, setIsRestaurantOffline, offlineRestaurantName, setOfflineRestaurantName, specialRequest, setSpecialRequest, selectedSides, setSelectedSides, selectedCooking, setSelectedCooking, selectedExtras, setSelectedExtras, modalProductOptions, setModalProductOptions, selectedProductOptionIds, setSelectedProductOptionIds, modalSidesOptions, setModalSidesOptions, modalExtrasOptions, setModalExtrasOptions, modalAskCooking, setModalAskCooking, isCartOpen, setIsCartOpen, tableNumber, setTableNumber, orderValidationCodeInput, setOrderValidationCodeInput, setOrderValidationCode, tablePinCodesByNumber, setTablePinCodesByNumber, toastMessage, setToastMessage, orderSuccess, setOrderSuccess, isSubmittingOrder, setIsSubmittingOrder, legalFooterModal, setLegalFooterModal, cartBump, setCartBump, isStickyActionsCompact, setIsStickyActionsCompact, actionDockSentinelRef, categoryTabsRef, categoryTabsScrollRef, didInitCategoryScrollRef, isCategoryTabsOutOfView, setIsCategoryTabsOutOfView, showCategoryScrollHint, setShowCategoryScrollHint, isCategoryScrollAtEnd, setIsCategoryScrollAtEnd, vitrineViewTrackedRef, toastTimeoutRef, sideError, setSideError, categories, setCategories, categoryDrawerEnabled, setCategoryDrawerEnabled, keepSuggestionsOnTop, setKeepSuggestionsOnTop, isCategoryDrawerOpen, setIsCategoryDrawerOpen, serviceHours, setServiceHours, subCategoryRows, setSubCategoryRows, sidesLibrary, setSidesLibrary, selectedSubCategory, setSelectedSubCategory, showCaloriesClient, setShowCaloriesClient, consultationModeClient, setConsultationModeClient, heroEnabledClient, setHeroEnabledClient, heroBadgeTypeClient, setHeroBadgeTypeClient, enabledLanguagesClient, setEnabledLanguagesClient, enabledLanguageLabels, setEnabledLanguageLabels, showSalesAdviceModal, setShowSalesAdviceModal, salesAdviceMessage, setSalesAdviceMessage, salesAdviceDishId, setSalesAdviceDishId, recommendationSourceDishId, setRecommendationSourceDishId, suggestionLeadByLang, setSuggestionLeadByLang, uiTranslationsByLang, setUiTranslationsByLang, darkMode, setDarkMode, timeTick, setTimeTick, headerLogoLoadError, setHeaderLogoLoadError, headerLogoCacheBuster, setHeaderLogoCacheBuster } = useMenuPageState();
  const hideBrokenImage = (event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.style.display = "none";
  };
  const uiLang = toUiLang(lang);
  const normalizedLang = normalizeLanguageKey(lang);
  const isRtl = RTL_LANGUAGE_CODES.has(normalizedLang);
  const serverCallThrottleLabel = getServerCallCooldownText(serverCallSecondsLeft);
  const triggerHaptic = (pattern: number | number[]) => {
    try {
      if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
      navigator.vibrate(pattern);
    } catch {
      // noop on unsupported browsers/devices
    }
  };
  const mergedUiDictionary = useMemo(() => buildMergedUiDictionaryRuntime({ UI_TRANSLATIONS, normalizedLang, uiLang, uiTranslationsByLang }) as UiDictionary, [normalizedLang, uiLang, uiTranslationsByLang]);
  const formulaUi = useMemo(() => buildFormulaUiRuntime({ mergedUiDictionary, UI_TRANSLATIONS, normalizedLang, uiLang }), [mergedUiDictionary, normalizedLang, uiLang]);
  const { formulaCategoryLabel, availableInFormulaLabel, viewFormulaLabel, dishBadgeLabels, promoBadgeLabel, chefSuggestionBadgeLabel, footerThankYouLabel, footerFollowUsLabel, footerPhotoShareLabel, footerLegalLabel, footerRulesLabel } = useMemo(() => buildMenuLabelsRuntime({ mergedUiDictionary, UI_TRANSLATIONS, normalizedLang, uiLang, UI_TEXT_CLEAN, FORMULA_BADGE_TRANSLATIONS, VIEW_FORMULA_TRANSLATIONS, PROMO_BADGE_TRANSLATIONS }), [mergedUiDictionary, normalizedLang, uiLang]);
  const legalTranslationsByLang = useMemo(() => legalTranslations[normalizedLang] || legalTranslations[uiLang] || legalTranslations.fr, [normalizedLang, uiLang]);
  const legalFooterModalTitle = legalFooterModal === "legal" ? footerLegalLabel : footerRulesLabel;
  const legalFooterModalBody = legalFooterModal === "legal" ? String(legalTranslationsByLang.legalText || legalTranslations.fr.legalText).trim() : String(restaurant?.custom_legal_notice || "Aucun rÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨glement spÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©cifique pour cet ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©tablissement.").trim();
  const getDishStyleBadges = (dish: Dish) => {
    const flags = getDishStyleBadgeFlags(dish);
    const badges: Array<{ key: string; label: string; dotClass: string }> = [];
    if (flags.vegetarian) badges.push({ key: "vegetarian", label: dishBadgeLabels.vegetarian, dotClass: "bg-green-500" });
    if (flags.spicy) badges.push({ key: "spicy", label: dishBadgeLabels.spicy, dotClass: "bg-red-500" });
    if (flags.isNew) badges.push({ key: "new", label: dishBadgeLabels.isNew, dotClass: "bg-blue-500" });
    if (flags.glutenFree) badges.push({ key: "gluten_free", label: dishBadgeLabels.glutenFree, dotClass: "bg-amber-500" });
    return badges;
  };
  const uiText = useMemo(() => buildRuntimeUiText(UI_TEXT_CLEAN[uiLang], mergedUiDictionary), [uiLang, mergedUiDictionary]);
  const hasAlcoholInCart = useMemo(() => Array.isArray(cart) && cart.some((item) => dishContainsAlcohol((item as any)?.dish)), [cart]);
  const kcalLabel = String((uiText as unknown as any).kcal || "kcal").trim() || "kcal";
  const isOrderingDisabledClient = consultationModeClient || parseShowCalories((restaurant as unknown as any | null)?.is_order_disabled, false);
  const isInteractionDisabled = isOrderingDisabledClient || isVitrineMode;
  const allergenLibraryLookup = useMemo(() => { const tableConfig = parseJsonObject(restaurant?.table_config); return buildAllergenLibraryLookup(tableConfig.allergen_library); }, [restaurant]);
  const tt = (key: keyof (typeof UI_TEXT)["fr"]["labels"]) => {
    if (key === "featured_chef" || key === "sales_advice_title") {
      return String((uiText as unknown as any).chefSuggestion || mergedUiDictionary.chefSuggestion || UI_TRANSLATIONS[normalizedLang]?.chefSuggestion || UI_TRANSLATIONS[uiLang]?.chefSuggestion).trim() || "Suggestion du chef";
    }
    return uiText.labels[key] || t(lang, key);
  };
  const optionVariantsLabel = String((uiText as unknown as any).optionsAndVariants || "").trim() || "Options / Variantes";
  const itemTotalLabel = String((uiText as unknown as any).itemTotal || "").trim() || "Total article";
  const itemDetailsLabel = tt("item_details");
  const formulaOptionLockedLabel = tt("formula_option_locked");
  const { getPromoStateForDish, getPromoPriceForDish, getDishBasePrice, getFormulaPackPrice, getDishVariantReplacementPrice, getDishUnitPrice, isFormulaCartItem, getCartItemUnitPrice, getDishSuggestionBadge } = createMenuPricingRuntime({
    parsePriceNumber,
    parseVariantPrice,
    toBooleanFlag,
    getSelectedProductOptionsList,
    dishes,
  });
  const modalSelectedProductOptions = useMemo(() => { if (!modalProductOptions.length || selectedProductOptionIds.length === 0) return [] as ProductOptionItem[]; const selectedIdSet = new Set(selectedProductOptionIds.map((value) => String(value || ""))); return modalProductOptions.filter((option) => selectedIdSet.has(String(option.id || ""))); }, [modalProductOptions, selectedProductOptionIds]);
  const modalSelectedProductOption = modalSelectedProductOptions[0] || null;
  const modalUnitPrice = selectedDish ? getDishUnitPrice(selectedDish, modalSelectedProductOptions, modalSelectedProductOption) : 0;
  const modalTotalPrice = modalUnitPrice * Math.max(1, dishModalQuantity) + (selectedExtras || []).reduce((sum, extra) => sum + parsePriceNumber(extra.price), 0) * Math.max(1, dishModalQuantity);
  const clickDetailsLabel = String(mergedUiDictionary.click_details || UI_TRANSLATIONS[normalizedLang]?.click_details || UI_TRANSLATIONS[uiLang]?.click_details || "").trim() || "Cliquez pour voir les dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©tails";
  const viewDetailsLabel = String(mergedUiDictionary.view_details || UI_TRANSLATIONS[normalizedLang]?.view_details || UI_TRANSLATIONS[uiLang]?.view_details || "").trim() || "Voir dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©tails";
  const consultationModeBannerText = String((uiText as unknown as any).consultation_mode_banner || "La commande se fait auprÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨s de votre serveur. Utilisez ce menu pour dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©couvrir nos plats !").trim() || "La commande se fait auprÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨s de votre serveur. Utilisez ce menu pour dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©couvrir nos plats !";
  const restaurantTableConfig = parseJsonObject(restaurant?.table_config);
  const restaurantRecord = restaurant as any | null;
  const restaurantSettingsConfig = parseJsonObject(restaurantRecord?.settings);
  const quickAddToCartEnabled = !isInteractionDisabled && parseShowCalories(restaurantTableConfig.quick_add_to_cart_enabled ?? restaurantTableConfig.quick_add_enabled, false);
  const cardTransparentEnabled = darkMode ? false : parseShowCalories(restaurantRecord?.card_transparent ?? restaurantRecord?.cards_transparent ?? restaurantTableConfig.card_transparent ?? restaurantTableConfig.cards_transparent, false);
  const bannerBgColor = darkMode ? "#000000" : normalizeHexColor(restaurant?.primary_color, "#FFFFFF");
  const bannerTextColor = getHexContrastTextColor(bannerBgColor);
  const bannerImageUrl = sanitizeMediaUrl(restaurantRecord?.banner_image_url || restaurantRecord?.banner_url || restaurantTableConfig.banner_image_url || restaurantTableConfig.banner_url || "");
  const hasBannerImage = bannerImageUrl.length > 0;
  const showBannerImage = !darkMode && hasBannerImage;
  const bannerContentTextColor = showBannerImage ? "#FFFFFF" : bannerTextColor;
  const showNameOnClient = toBooleanFlag(restaurantRecord?.show_restaurant_name_on_client ?? restaurantRecord?.show_name_on_client_page ?? restaurantSettingsConfig.show_restaurant_name_on_client ?? restaurantSettingsConfig.show_name_on_client_page ?? restaurantTableConfig.show_restaurant_name_on_client ?? restaurantTableConfig.show_name_on_client_page);
  const restaurantDisplayName = showNameOnClient ? String(restaurantTableConfig.restaurant_name ?? restaurantSettingsConfig.restaurant_name ?? restaurantRecord?.restaurant_name ?? restaurant?.name ?? "").trim() : "";
  const welcomePopupEnabled = toBooleanFlag(restaurantRecord?.welcome_popup_enabled ?? restaurantRecord?.show_welcome_popup ?? restaurantSettingsConfig.welcome_popup_enabled ?? restaurantSettingsConfig.show_welcome_popup ?? restaurantTableConfig.welcome_popup_enabled ?? restaurantTableConfig.show_welcome_popup);
  const welcomePopupType = String(restaurantRecord?.welcome_popup_type ?? restaurantSettingsConfig.welcome_popup_type ?? restaurantTableConfig.welcome_popup_type ?? "text")
    .trim()
    .toLowerCase();
  const welcomePopupText = String(restaurantRecord?.welcome_popup_content_text ?? restaurantRecord?.welcome_popup_text ?? restaurantSettingsConfig.welcome_popup_content_text ?? restaurantSettingsConfig.welcome_popup_text ?? restaurantTableConfig.welcome_popup_content_text ?? restaurantTableConfig.welcome_popup_text ?? "").trim();
  const welcomePopupImageUrl = sanitizeMediaUrl(restaurantRecord?.welcome_popup_image_url || restaurantSettingsConfig.welcome_popup_image_url || restaurantTableConfig.welcome_popup_image_url || "");
  const clientCardSettings = useMemo(() => ({ cardRadius: Number(restaurantRecord?.card_radius ?? restaurantSettingsConfig.card_radius ?? restaurantTableConfig.card_radius), cardShadow: String(restaurantRecord?.card_shadow ?? restaurantSettingsConfig.card_shadow ?? restaurantTableConfig.card_shadow ?? "").trim(), cardBorder: String(restaurantRecord?.card_border ?? restaurantSettingsConfig.card_border ?? restaurantTableConfig.card_border ?? "").trim(), cardBgColor: normalizeHexColor(restaurantRecord?.card_bg_color ?? restaurantSettingsConfig.card_bg_color ?? restaurantTableConfig.card_bg_color, darkMode ? "#000000" : "#FFFFFF"), primaryColor: normalizeHexColor(restaurantRecord?.primary_color ?? restaurantSettingsConfig.primary_color ?? restaurantTableConfig.primary_color, normalizeHexColor(restaurant?.primary_color, "#FFFFFF")) }), [restaurantRecord, restaurantSettingsConfig, restaurantTableConfig, darkMode, restaurant]);
  const headerLogoUrl = sanitizeMediaUrl(restaurant?.logo_url);
  const headerLogoSrc = headerLogoUrl ? `${headerLogoUrl}${headerLogoUrl.includes("?") ? "&" : "?"}t=${headerLogoCacheBuster}` : "";
  const hasHeaderLogo = headerLogoUrl.length > 0;
  const showHeaderLogo = hasHeaderLogo && !headerLogoLoadError;
  const cardBgColor = darkMode ? "#000000" : normalizeHexColor(restaurant?.card_bg_color, "#FFFFFF");
  const cardBgOpacityPercent = darkMode ? 100 : normalizeOpacityPercent(restaurantRecord?.card_bg_opacity ?? restaurantTableConfig.card_bg_opacity, cardTransparentEnabled ? 0 : 100);
  const cardBgOpacityAlpha = darkMode ? "FF" : alphaHexFromPercent(cardBgOpacityPercent, cardTransparentEnabled ? 0 : 100);
  const cardSurfaceBg = darkMode ? "#000000" : withAlpha(cardBgColor, cardBgOpacityAlpha);
  const cardImagePanelBg = darkMode ? "#000000" : withAlpha(cardBgColor, cardBgOpacityAlpha);
  const cardTextColorValue = darkMode ? getHexContrastTextColor(cardBgColor) : normalizeHexColor(restaurantRecord?.card_text_color ?? restaurantTableConfig.card_text_color, "#111111");
  const cardTextIsLight = darkMode && cardTextColorValue === "#FFFFFF";
  const globalTextColorValue = darkMode ? "#F5F5F5" : normalizeHexColor((restaurant as any | null)?.text_color ?? restaurantTableConfig.text_color ?? restaurantTableConfig.global_text_color, getHexContrastTextColor(bannerBgColor));
  const backgroundImageUrl = sanitizeMediaUrl(restaurantRecord?.background_url || restaurantRecord?.background_image_url || restaurantTableConfig.background_url || restaurantTableConfig.background_image_url || restaurantTableConfig.bg_image_url || "");
  const backgroundOpacity = darkMode ? 1 : normalizeBackgroundOpacity((restaurant as any | null)?.bg_opacity ?? restaurantTableConfig.bg_opacity, 1);
  const restaurantSocialLinks = parseJsonObject(restaurantTableConfig.social_links);
  const instagramUrl = String(restaurantSocialLinks.instagram || restaurantRecord?.instagram_url || "").trim();
  const facebookUrl = String(restaurantSocialLinks.facebook || restaurantRecord?.facebook_url || "").trim();
  const xUrl = String(restaurantSocialLinks.x || restaurantSocialLinks.twitter || restaurantRecord?.x_url || "").trim();
  const snapchatUrl = String(restaurantSocialLinks.snapchat || restaurantRecord?.snapchat_url || "").trim();
  const websiteUrl = String(restaurantSocialLinks.website || restaurantSocialLinks.site || restaurantRecord?.website_url || "").trim();
  const socialFooterEntries = buildSocialFooterEntries({
    instagramUrl,
    facebookUrl,
    xUrl,
    snapchatUrl,
    websiteUrl,
  });
  const hideCompactFloatingActions = isStickyActionsCompact && (isCartOpen || !!selectedDish || !!formulaDish || isVitrineMode);
  const showCategoryDrawerButton = categoryDrawerEnabled && isCategoryTabsOutOfView && !isCategoryDrawerOpen && !hideCompactFloatingActions;
  const applyRealtimeDisplaySettingsRow = (rawRow: unknown) => {
    if (!rawRow || typeof rawRow !== "object") return;
    const row = rawRow as any;
    if (scopedRestaurantId) {
      const rowId = String(row.id || "").trim();
      if (!rowId || rowId !== scopedRestaurantId) return;
    }
    const parsed = parseDisplaySettingsFromRow(row);
    setShowCaloriesClient(parsed.showCalories);
    setEnabledLanguagesClient(parsed.enabledLanguages);
    setEnabledLanguageLabels(parsed.languageLabels);
    setHeroEnabledClient(parsed.heroEnabled);
    setHeroBadgeTypeClient(parsed.heroBadgeType === "daily" ? "daily" : "chef");
    setConsultationModeClient(parsed.consultationMode);
    setOrderValidationCode(parsed.orderValidationCode || "1234");
    setSuggestionLeadByLang(parsed.suggestionMessagesI18n || {});
    setUiTranslationsByLang(parsed.uiTranslations || {});
    const config = parseJsonObject(row.table_config || row.settings);
    const rawDrawerEnabled = config.category_drawer_enabled ?? config.show_category_drawer ?? (row as any).category_drawer_enabled ?? (row as any).show_category_drawer;
    const rawKeepSuggestions = config.keep_suggestions_on_top ?? config.pin_suggestions ?? (row as any).keep_suggestions_on_top ?? (row as any).pin_suggestions;
    setCategoryDrawerEnabled(Boolean(rawDrawerEnabled));
    setKeepSuggestionsOnTop(Boolean(rawKeepSuggestions));
    setServiceHours({
      lunch_start: String(config.service_lunch_start || config.lunch_start || "").trim(),
      lunch_end: String(config.service_lunch_end || config.lunch_end || "").trim(),
      dinner_start: String(config.service_dinner_start || config.dinner_start || "").trim(),
      dinner_end: String(config.service_dinner_end || config.dinner_end || "").trim(),
    });
    if (Object.prototype.hasOwnProperty.call(row, "is_active")) {
      const isActive = typeof row.is_active === "boolean" ? row.is_active : true;
      setIsRestaurantOffline(!isActive);
      setOfflineRestaurantName(String(row.name || "").trim());
    }
    if (Object.prototype.hasOwnProperty.call(row, "font_family") || Object.prototype.hasOwnProperty.call(row, "name") || Object.prototype.hasOwnProperty.call(row, "logo_url") || Object.prototype.hasOwnProperty.call(row, "banner_image_url") || Object.prototype.hasOwnProperty.call(row, "banner_url") || Object.prototype.hasOwnProperty.call(row, "background_url") || Object.prototype.hasOwnProperty.call(row, "background_image_url") || Object.prototype.hasOwnProperty.call(row, "primary_color") || Object.prototype.hasOwnProperty.call(row, "text_color") || Object.prototype.hasOwnProperty.call(row, "card_bg_color") || Object.prototype.hasOwnProperty.call(row, "card_bg_opacity") || Object.prototype.hasOwnProperty.call(row, "card_text_color") || Object.prototype.hasOwnProperty.call(row, "card_transparent")) {
      setRestaurant(
        (prev: Restaurant | null) =>
          ({
            ...(prev || ({} as Restaurant)),
            ...(row as Partial<Restaurant>),
            font_family: String((row as any).font_family || (prev as any)?.font_family || "").trim() || null,
          }) as Restaurant,
      );
    }
  };
  useEffect(() => {
    setHeaderLogoLoadError(false);
    setHeaderLogoCacheBuster(Date.now());
  }, [headerLogoUrl]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateStickyState = () => {
      const top = actionDockSentinelRef.current?.getBoundingClientRect().top;
      setIsStickyActionsCompact(typeof top === "number" && top <= 0);
    };
    updateStickyState();
    window.addEventListener("scroll", updateStickyState, { passive: true });
    window.addEventListener("resize", updateStickyState);
    return () => {
      window.removeEventListener("scroll", updateStickyState);
      window.removeEventListener("resize", updateStickyState);
    };
  }, []);
  const getAllergenLabel = (allergen: string) => {
    const normalizedCode = String(allergen || "")
      .trim()
      .toUpperCase();
    if (ALLERGEN_MAP[normalizedCode]) return ALLERGEN_MAP[normalizedCode];
    const rawToken = String(allergen || "").trim();
    const isUuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawToken);
    const isGeneratedIdLike = /^[0-9]{10,}-[a-z0-9]+$/i.test(rawToken);
    const key = normalizeAllergenKey(allergen);
    const row = allergenLibraryLookup[key];
    if (row) {
      const requested = normalizeLanguageKey(lang);
      const uiCode = toUiLang(lang);
      const localized = String(row[requested] || row[uiCode] || row.fr || allergen).trim();
      if (localized) return localized;
    }
    if (isUuidLike || isGeneratedIdLike) return "";
    return translateAllergen(allergen, lang);
  };
  const getVisibleDishAllergenLabels = (dish: Dish) => {
    const baseAllergens = getAllergens(dish);
    const hasLibrary = Object.keys(allergenLibraryLookup).length > 0;
    if (hasLibrary) {
      const filteredBase = baseAllergens.filter((allergen) => {
        const key = normalizeAllergenKey(allergen);
        return Boolean(allergenLibraryLookup[key]);
      });
      if (baseAllergens.length > 0) {
        return filteredBase.map((allergen) => getAllergenLabel(allergen)).filter(Boolean);
      }
    }
    return getLocalizedAllergens(dish, lang)
      .map((allergen) => getAllergenLabel(allergen))
      .filter(Boolean);
  };
  const currentLanguageFlag = getLanguageFlag(lang);
  const languageOptions = useMemo<MenuLanguageOption[]>(() => {
    return enabledLanguagesClient.map((code) => ({
      code,
      name: enabledLanguageLabels[code] || DEFAULT_LANGUAGE_LABELS[code] || code.toUpperCase(),
      flag: getLanguageFlag(code),
    }));
  }, [enabledLanguagesClient, enabledLanguageLabels]);
  const smartCallUi = SMART_CALL_UI[normalizedLang] || SMART_CALL_UI[uiLang] || SMART_CALL_UI.fr;
  useMenuUiEffects({ categoryTabsRef, setIsCategoryTabsOutOfView, setDarkMode, darkMode, setTimeTick, isCartOpen, formulaDish, legalFooterModal, isInteractionDisabled, setIsCartOpen, setOrderSuccess, setFormulaDish, setFormulaSourceDish, setFormulaSelections, setFormulaSelectionDetails, setFormulaSelectionError, setFormulaItemDetailsOpen, categoryDrawerEnabled, setIsCategoryDrawerOpen, isVitrineMode, restaurant, scopedRestaurantId, vitrineViewTrackedRef, enabledLanguagesClient, lang, setLang, tableNumber, setOrderValidationCodeInput });
  const { fetchData } = useMenuFetchData({ supabase, scopedRestaurantId, setLoading, setIsRestaurantOffline, setOfflineRestaurantName, setSuggestionLeadByLang, setServiceHours, setTablePinCodesByNumber, setRestaurant, setDishes, setCategories, setSubCategoryRows, setSidesLibrary, setFormulaLinksByFormulaId, setFormulaLinksByDishId, setFormulaInfoById, setShowCaloriesClient, setEnabledLanguagesClient, setEnabledLanguageLabels, setHeroEnabledClient, setHeroBadgeTypeClient, setConsultationModeClient, setOrderValidationCode, setUiTranslationsByLang, setCategoryDrawerEnabled, setKeepSuggestionsOnTop });
  useMenuDataSyncEffects({ scopedRestaurantId, supabase, fetchData, setConsultationModeClient, applyRealtimeDisplaySettingsRow });
  const getCategoryLabel = (category: CategoryItem) => getCategoryLabelRuntime(category, lang, getNameTranslation as unknown as (value: any, lang: string) => string);
  const sortedCategories = useMemo(() => buildSortedCategories(categories), [categories]);
  const formulaMenuDishes = useMemo(() => buildFormulaMenuDishes({ formulaInfoById, dishes, parsePriceNumber, sanitizeMediaUrl, getDishName, lang, FORMULAS_CATEGORY_ID }) as Dish[], [formulaInfoById, dishes, parsePriceNumber, sanitizeMediaUrl, getDishName, lang]);
  const hasFormulaDishes = useMemo(() => getHasFormulaDishes(dishes, formulaMenuDishes, toBooleanFlag), [dishes, formulaMenuDishes, toBooleanFlag]);
  const menuCategories = useMemo(() => buildMenuCategories({ sortedCategories, hasFormulaDishes, FORMULAS_CATEGORY_ID, formulaCategoryLabel }) as CategoryItem[], [sortedCategories, hasFormulaDishes, formulaCategoryLabel]);
  const categoryList = useMemo(() => buildCategoryList({ uiText, menuCategories, FORMULAS_CATEGORY_ID, formulaCategoryLabel, getCategoryLabel }), [uiText, menuCategories, formulaCategoryLabel, getCategoryLabel]);
  const categorySortMap = useMemo(() => buildCategorySortMap(sortedCategories), [sortedCategories]);
  const availabilitySnapshot = useMemo(() => buildAvailabilitySnapshot(serviceHours), [serviceHours, timeTick]);
  const isDishAvailableNow = (dish: Dish) => isDishAvailableNowRuntime({ dish, availabilitySnapshot, parseAvailableDays, parseTimeToMinutes, isWithinTimeWindow, serviceHours });
  const isDishVisibleInMenu = (dish: Dish) => isDishVisibleInMenuRuntime(dish, toBooleanFlag);
  const getSideLabel = (side: SideLibraryItem) => getSideLabelRuntime({ side, lang, uiLang, getNameTranslation: getNameTranslation as unknown as (value: any, lang: string) => string, parseI18nToken });
  const getSubCategoryLabel = (subCategory: SubCategoryItem) => getSubCategoryLabelRuntime(subCategory, lang, getNameTranslation as unknown as (value: any, lang: string) => string);
  const sideNameFrById = useMemo(() => buildSideNameFrById(sidesLibrary), [sidesLibrary]);
  const sideIdByAlias = useMemo(() => buildSideIdByAlias({ sidesLibrary, parseI18nToken, normalizeLookupText }), [sidesLibrary, parseI18nToken, normalizeLookupText]);
  const emptyFormulaSelectionDetails: FormulaSelectionDetails = {
    selectedSideIds: [],
    selectedSides: [],
    selectedCooking: "",
    selectedProductOptionIds: [],
  };
  const getFormulaSelectionDetails = (categoryId: string) => getFormulaSelectionDetailsRuntime(formulaSelectionDetails as Record<string, any>, categoryId, emptyFormulaSelectionDetails);
  const getFormulaDishConfig = (dish: Dish) => getFormulaDishConfigRuntime({ dish, parseOptionsFromDescription, dedupeDisplayValues, sidesLibrary, getSideLabel, isProductOptionVisible, toBooleanFlag });
  const { selectedCategoryId, categoryById, dishById, linkedFormulasByDishId, formulaDefaultOptionsByDishId, getSelectableFormulaProductOptionsForDish, formulaDisplayById, getFormulaDisplayName, normalizedFormulaCategoryIds, formulaCategories, formulaOptionsByCategory, formulaSequenceByDishId, formulaStepEntries, mainFormulaStep, selectedMainFormulaDish, mainFormulaStepLabel, formulaMainConfig, formulaDisplayName, mainFormulaFilteredOptions, selectedDishLinkedFormulas, isSelectedFormulaDish, selectedFormulaButtonDish, formulaAddDisabled } = useMenuFormulaDerived({
    selectedCategory,
    setSelectedCategory,
    categoryListLength: categoryList.length,
    menuCategories,
    sortedCategories,
    dishes,
    formulaDish,
    formulaSourceDish,
    selectedDish,
    formulaLinksByDishId,
    formulaLinksByFormulaId,
    formulaInfoById,
    formulaSelections,
    formulaSelectionDetails,
    formulaMainDetails,
    emptyFormulaSelectionDetails,
    setFormulaMainDetails,
    setFormulaActiveCategoryId,
    setFormulaSelections,
    setFormulaSelectionDetails,
    toBooleanFlag,
    getDishBasePrice,
    normalizeLookupText,
    getCategoryLabel,
    parseJsonObject,
    getDishName,
    lang,
    isDishAvailableNow,
    getFormulaDishConfig,
  });
  const getCategoryDestination = useCallback((categoryId?: string | number | null) => getCategoryDestinationFromMap(categoryById, normalizeCategory, categoryId), [categoryById]);
  const isDrinkCategory = useCallback((categoryId?: string | number | null) => isDrinkCategoryFromMap(categoryById, normalizeCategory, categoryId), [categoryById]);
  const isDessertCategory = useCallback((categoryId?: string | number | null) => isDessertCategoryFromMap(categoryById, normalizeCategory, categoryId), [categoryById]);
  const isMainDish = useCallback((dish: Dish) => isMainDishFromCategory(dish, isDrinkCategory, isDessertCategory), [isDrinkCategory, isDessertCategory]);
  const isIceCreamDish = useCallback((dish?: Dish | null) => isIceCreamDishFromMap(dish, categoryById, normalizeCategory), [categoryById]);
  const { availableSubCategories, suggestionPinnedDishes, filteredDishes, groupedDishes, featuredHighlights, shouldShowHeroSection, getFeaturedLabel, linkedSalesAdviceDish, getSuggestionLeadMessage, getSalesAdvice } = useMenuDishCollections({ selectedCategory, selectedCategoryId, selectedSubCategory, setSelectedSubCategory, didInitCategoryScrollRef, dishes, formulaMenuDishes, keepSuggestionsOnTop, isDishVisibleInMenu, isDishAvailableNow, categorySortMap, availableSubCategoriesBase: subCategoryRows, subCategoryRows, getSubCategoryLabel, chefSuggestionBadgeLabel, uiText, heroBadgeTypeClient, heroEnabledClient, normalizeLanguageKey, toUiLang, lang, suggestionLeadByLang, normalizeLookupText, getDishName, salesAdviceDishId });
  const { tableValidationPromptMessage, typedValidationCode, isValidationCodeValid, isServerCallThrottled, handleSubmitSmartCall } = useMenuServerCall({ tt, tableNumber, orderValidationCodeInput, tablePinCodesByNumber, normalizeTableNumberKey, normalizePinValue, serverCallSecondsLeft, serverCallCooldownUntil, setServerCallCooldownUntil, setServerCallSecondsLeft, setServerCallMsg, serverCallThrottleLabel, isVitrineMode, setIsSendingCall, smartCallUi, normalizedLang, SMART_CALL_UI, restaurant, SETTINGS_ROW_ID, supabase, toLoggableSupabaseError, setShowCallModal, triggerHaptic });
  const { addToCart, removeFromCart } = useMenuCartActions({ isInteractionDisabled, tableNumber, typedValidationCode, isValidationCodeValid, tt, tableValidationPromptMessage, toBooleanFlag, dishes, getFormulaDisplayName, setCart, setOrderSuccess, setCartBump, toastTimeoutRef, triggerHaptic, setToastMessage, getSalesAdvice, setSalesAdviceMessage, setSalesAdviceDishId, setShowSalesAdviceModal, getSelectedProductOptionsList });
  const { handleSubmitOrder } = useMenuSubmitOrder({ cart, isInteractionDisabled, isSubmittingOrder, setIsSubmittingOrder, tableNumber, typedValidationCode, isValidationCodeValid, tableValidationPromptMessage, tt, dishById, sideIdByAlias, sidesLibrary, lang, getSelectedProductOptionsList, isFormulaCartItem, getCartItemUnitPrice, isDrinkCategory, normalizeLookupText, dedupeDisplayValues, buildStableExtraId, normalizeCookingKey, getCookingLabelFr, parsePriceNumber, parseAddonPrice, getProductOptionLabel, getCategoryDestination, normalizeFormulaOrderItemsForPayload, isDessertCategory, categoryById, resolveInitialCurrentStepFromOrderItems, restaurant, SETTINGS_ROW_ID, triggerHaptic, setCart, setOrderSuccess, toLoggableSupabaseError });
  const { openFormulaModal, handleSelectDish, dishNeedsQuickAddModal, handleQuickAddFromList, modalInstructionPreview } = useMenuDishSelectionActions({ dishes, sidesLibrary, selectedCategoryId, FORMULAS_CATEGORY_ID, lang, selectedSides, selectedExtras, modalSelectedProductOptions, modalSelectedProductOption, selectedCooking, specialRequest, uiText, emptyFormulaSelectionDetails, toBooleanFlag, getSideLabel, buildInstructionText, addToCart, setFormulaDish, setFormulaSourceDish, setFormulaSelections, setFormulaSelectionDetails, setFormulaMainDetails, setFormulaSelectionError, setFormulaItemDetailsOpen, setFormulaActiveCategoryId, setSelectedDish, setModalProductOptions, setSelectedProductOptionIds, setRecommendationSourceDishId, setDishModalQuantity, setSpecialRequest, setSelectedSides, setSelectedCooking, setSelectedExtras, setModalSidesOptions, setModalExtrasOptions, setModalAskCooking, setSideError });
  const menuFontFamily = useMemo(() => resolveMenuFontFamily(restaurant), [restaurant]);
  const menuLayout = useMemo<"classic_grid" | "modern_list">(() => resolveMenuLayout(restaurant), [restaurant]);
  const cardLayout = useMemo<"default" | "overlay" | "bicolor">(() => resolveCardLayout(restaurant), [restaurant]);
  const restaurantCardDesignerLayout = useMemo<CardDesignerLayout | null>(() => resolveRestaurantCardDesignerLayout(restaurant), [restaurant]);
  const cardVisualStyle = useMemo<"rounded" | "sharp">(() => resolveCardVisualStyle(restaurant), [restaurant]);
  const densityStyle = useMemo<"compact" | "spacious">(() => resolveDensityStyle(restaurant), [restaurant]);
  const dishCardRadiusClass = cardVisualStyle === "sharp" ? "rounded-none" : "rounded-xl";
  const dishMediaRadiusClass = cardVisualStyle === "sharp" ? "rounded-none" : "rounded-lg";
  useEffect(() => {
    if (!restaurant) return;
    const row = restaurant as any;
    console.log("Style actuel:", {
      card_style: row.card_style ?? null,
      card_layout: row.card_layout ?? null,
      resolved: cardLayout,
    });
  }, [restaurant, cardLayout]);
  useEffect(() => {
    const el = categoryTabsScrollRef.current;
    if (!el) return;
    const updateHints = () => {
      const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
      const hasOverflow = maxScrollLeft > 8;
      setShowCategoryScrollHint(hasOverflow);
      setIsCategoryScrollAtEnd(!hasOverflow || el.scrollLeft >= maxScrollLeft - 8);
    };
    updateHints();
    el.addEventListener("scroll", updateHints, { passive: true });
    window.addEventListener("resize", updateHints);
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateHints);
      resizeObserver.observe(el);
    }
    return () => {
      el.removeEventListener("scroll", updateHints);
      window.removeEventListener("resize", updateHints);
      resizeObserver?.disconnect();
    };
  }, [categoryList.length]);
  useMenuFontEffects(menuFontFamily);  const menuDishGridSectionProps: any = { restaurant, scopedRestaurantId, restaurantCardDesignerLayout, cardLayout, darkMode, loading, tt, filteredDishes, uiText, groupedDishes, selectedCategory, getPromoPriceForDish, toBooleanFlag, linkedFormulasByDishId, selectedCategoryId, FORMULAS_CATEGORY_ID, formulaDisplayById, getDishName, lang, getFormulaPackPrice, getDishBasePrice, parseJsonObject, normalizeHexColor, cardTextColorValue, resolveDesignerShadowPreset, clientCardSettings, cardSurfaceBg, getPromoStateForDish, getDescription, showCaloriesClient, getCaloriesLabel, kcalLabel, getHungerLevel, promoBadgeLabel, getDishSuggestionBadge, chefSuggestionBadgeLabel, getDishStyleBadges, availableInFormulaLabel, viewDetailsLabel, viewFormulaLabel, handleSelectDish, quickAddToCartEnabled, isInteractionDisabled, handleQuickAddFromList, cardTextIsLight, cardVisualStyle, dishCardRadiusClass, menuLayout, hideBrokenImage, dishMediaRadiusClass, getVisibleDishAllergenLabels, getSpicyBadgeLabel, bannerBgColor, bannerContentTextColor, openFormulaModal };
  const menuFormulaModalProps: any = { formulaDish, uiText, formulaUi, formulaAddDisabled, setFormulaDish, setFormulaSourceDish, setFormulaSelections, setFormulaSelectionDetails, setFormulaMainDetails, emptyFormulaSelectionDetails, setFormulaSelectionError, setFormulaItemDetailsOpen, formulaSelectionError, normalizedFormulaCategoryIds, formulaOptionsByCategory, formulaSelections, getFormulaDishConfig, formulaMainDetails, dishById, getFormulaSelectionDetails, getSelectableFormulaProductOptionsForDish, categoryById, getProductOptionLabel, parseAddonPrice, formulaSequenceByDishId, getCategoryLabel, getDishName, lang, addToCart, getFormulaDisplayName, getFormulaPackPrice, mainFormulaStepLabel, formulaDisplayName, formulaInfoById, formulaStepEntries, sanitizeMediaUrl, getAllergenLabel, formulaMainConfig, selectedMainFormulaDish, mainFormulaStep, mainFormulaFilteredOptions, buildInstructionText, hideBrokenImage, parseOptionIdSet, parsePriceNumber, tt, sideIdByAlias, normalizeLookupText, formulaCategories, formulaDefaultOptionsByDishId, setFormulaActiveCategoryId, formulaItemDetailsOpen, getDescription, itemDetailsLabel, optionVariantsLabel, formulaOptionLockedLabel };
  const menuSelectedDishModalProps: any = { selectedDish, darkMode, uiText, setSelectedDish, setModalProductOptions, setSelectedProductOptionIds, setRecommendationSourceDishId, getDishName, lang, hideBrokenImage, selectedDishLinkedFormulas, getDescription, dishContainsAlcohol, getAlcoholWarningText, normalizedLang, selectedFormulaButtonDish, availableInFormulaLabel, isInteractionDisabled, openFormulaModal, viewFormulaLabel, getFormulaPackPrice, getHungerLevel, showCaloriesClient, getCaloriesLabel, kcalLabel, getVisibleDishAllergenLabels, consultationModeBannerText, modalSidesOptions, getSideMaxOptions, isIceCreamDish, tt, selectedSides, setSelectedSides, modalProductOptions, selectedProductOptionIds, parseAddonPrice, getProductOptionLabel, optionVariantsLabel, modalExtrasOptions, parsePriceNumber, selectedExtras, setSelectedExtras, getExtraLabel, modalAskCooking, selectedCooking, setSelectedCooking, dishModalQuantity, setDishModalQuantity, isRtl, specialRequest, setSpecialRequest, itemTotalLabel, modalTotalPrice, sideError, modalInstructionPreview, sideIdByAlias, normalizeLookupText, modalSelectedProductOptions, modalSelectedProductOption, recommendationSourceDishId, addToCart, setSideError };
  const menuFeaturedHighlightsProps: any = { shouldShowHeroSection, featuredHighlights, linkedFormulasByDishId, toBooleanFlag, cardLayout, cardSurfaceBg, darkMode, consultationModeClient, handleSelectDish, cardTextColorValue, getFeaturedLabel, cardImagePanelBg, hideBrokenImage, getDishName, lang, getPromoPriceForDish, promoBadgeLabel, getDishStyleBadges, getDescription, getHungerLevel, showCaloriesClient, getCaloriesLabel, kcalLabel, getDishBasePrice, isInteractionDisabled, openFormulaModal, viewFormulaLabel, getFormulaPackPrice, quickAddToCartEnabled, handleQuickAddFromList, bannerBgColor, bannerContentTextColor, uiText, clickDetailsLabel };
  const menuCategoryTabsBarProps: any = { categoryTabsRef, darkMode, categoryTabsScrollRef, categoryList, setSelectedCategory, setSelectedSubCategory, selectedCategory, bannerBgColor, bannerContentTextColor, showCategoryScrollHint, isCategoryScrollAtEnd };
  const menuCategoryDrawerProps: any = { categoryDrawerEnabled, isCategoryDrawerOpen, setIsCategoryDrawerOpen, uiText, categoryList, selectedCategory, setSelectedCategory, setSelectedSubCategory };
  const menuSubCategoryTabsProps: any = { selectedCategory, availableSubCategories, darkMode, selectedSubCategory, setSelectedSubCategory, bannerBgColor, bannerContentTextColor, uiText, getSubCategoryLabel };
  const handleSalesAdviceViewItem = () => { if (!linkedSalesAdviceDish) return; setShowSalesAdviceModal(false); setSalesAdviceMessage(""); setSalesAdviceDishId(""); setRecommendationSourceDishId(String(linkedSalesAdviceDish.id || "")); setSelectedDish(null); requestAnimationFrame(() => { handleSelectDish(linkedSalesAdviceDish); }); };
  const handleCloseSalesAdviceModal = () => { setShowSalesAdviceModal(false); setSalesAdviceMessage(""); setSalesAdviceDishId(""); };
  const menuBannerHeaderProps: any = { darkMode, bannerBackgroundColor: withAlpha(bannerBgColor, "F2"), bannerContentTextColor, showBannerImage, bannerImageUrl, showHeaderLogo, headerLogoSrc, showNameOnClient, restaurantDisplayName, currentLanguageFlag, showLangMenu, languageOptions, onLogoError: () => setHeaderLogoLoadError(true), onToggleDarkMode: () => setDarkMode((prev: boolean) => !prev), onToggleLanguageMenu: () => setShowLangMenu((prev: boolean) => !prev), onSelectLanguage: (code: string) => { triggerHaptic(6); setLang(code); setShowLangMenu(false); } };
  const menuAccessPanelProps: any = { isVitrineMode, darkMode, cardTransparentEnabled, yourTableLabel: uiText.yourTable, validationCodeLabel: tt("validation_code_label"), validationCodePlaceholder: tt("validation_code_placeholder"), validationCodeInvalidLabel: tt("validation_code_invalid"), tableNumber, orderValidationCodeInput, typedValidationCode, isValidationCodeValid, onTableNumberChange: setTableNumber, onOrderValidationCodeInputChange: setOrderValidationCodeInput };
  const menuActionDockProps: any = { isVitrineMode, hideCompactFloatingActions, isStickyActionsCompact, darkMode, isServerCallThrottled, serverCallThrottleLabel, serverCallSecondsLeft, callServerLabel: uiText.callServer, cartLabel: uiText.cart, cartQuantity: cart.reduce((sum, item) => sum + item.quantity, 0), cartBump, isInteractionDisabled, hasCartItems: cart.length > 0, onOpenCallModal: () => { if (!isServerCallThrottled) setShowCallModal(true); }, onOpenCart: () => setIsCartOpen(true) };
  const menuSmartCallModalProps: any = { show: showCallModal, isSendingCall, isServerCallThrottled, title: smartCallUi.title, subtitle: smartCallUi.subtitle, sendingLabel: smartCallUi.sending, cancelLabel: smartCallUi.cancel, options: SMART_CALL_OPTION_META, optionLabels: smartCallUi.options, onClose: () => setShowCallModal(false), onSelectOption: (key: string) => void handleSubmitSmartCall(key as SmartCallOptionKey) };
  const menuSalesAdviceModalProps: any = { show: showSalesAdviceModal, title: tt("sales_advice_title"), message: salesAdviceMessage, viewItemLabel: tt("sales_advice_view_item"), showViewItemButton: Boolean(linkedSalesAdviceDish), bannerBgColor, bannerContentTextColor, onViewItem: handleSalesAdviceViewItem, onClose: handleCloseSalesAdviceModal };
  const menuCartModalProps: any = { show: isCartOpen, isInteractionDisabled, closeLabel: uiText.close, cartLabel: uiText.cart, emptyCartLabel: uiText.emptyCart, totalLabel: uiText.total, orderLabel: uiText.order, orderSuccess, orderSuccessLabel: tt("order_success"), formulaLabel: formulaUi.label, detailsLabel: tt("details_label"), detailsNoneLabel: tt("details_none"), cart, lang, tableNumber, isSubmittingOrder, hasAlcoholInCart, alcoholWarningText: getAlcoholWarningText(normalizedLang), parsePriceNumber, isFormulaCartItem, getCartItemUnitPrice, getDishName, getDescription, buildInstructionText: (...args: any[]) => buildInstructionText(...(args as Parameters<typeof buildInstructionText>)), uiText, removeFromCart, setCart, onClose: () => { setIsCartOpen(false); setOrderSuccess(false); }, onSubmitOrder: handleSubmitOrder };
  const menuSocialFooterProps: any = { entries: socialFooterEntries, darkMode, thankYouLabel: footerThankYouLabel, followUsLabel: footerFollowUsLabel, photoShareLabel: footerPhotoShareLabel, onImageError: hideBrokenImage };
  const menuLegalFooterProps: any = { darkMode, footerLegalLabel, footerRulesLabel, legalFooterModal, legalFooterModalTitle, legalFooterModalBody, onOpenLegal: () => setLegalFooterModal("legal"), onOpenRules: () => setLegalFooterModal("rules"), onCloseModal: () => setLegalFooterModal(null) };
  if (isRestaurantOffline) {
    return <RestaurantOffline restaurantName={offlineRestaurantName || String(restaurant?.name || "").trim()} />;
  }
  return (
    <>
      <MenuFontBootstrap menuFontFamily={menuFontFamily} />
      <div
        key={menuFontFamily}
        dir={isRtl ? "rtl" : "ltr"}
        className={`menu-client-public menu-client-font relative isolate min-h-screen h-full w-screen max-w-none overflow-x-hidden ${darkMode ? "menu-client-dark" : ""} ${!darkMode ? "menu-client-transparent-shell" : ""} ${cardVisualStyle === "sharp" ? "menu-sharp-mode" : ""} ${densityStyle === "compact" ? "menu-density-compact" : "menu-density-spacious"}`}
        style={{
          width: "100vw",
          maxWidth: "100vw",
          fontFamily: `'${menuFontFamily}', sans-serif`,
          color: globalTextColorValue,
          ["--menu-text-color" as string]: globalTextColorValue,
        }}
      >
        <LegalWelcomeModal lang={normalizedLang} restaurantName={String(restaurantDisplayName || restaurant?.name || "").trim()} customLegalNotice={String(restaurant?.custom_legal_notice || "").trim()} splashEnabled={welcomePopupEnabled} splashType={welcomePopupType} splashText={welcomePopupText} splashImageUrl={welcomePopupImageUrl} />
        <MenuCategoryDrawerButton show={showCategoryDrawerButton} darkMode={darkMode} label={uiText.categoriesTitle} onOpen={() => setIsCategoryDrawerOpen(true)} />
        <MenuVisualStyles darkMode={darkMode} />
        <MenuBackgroundLayer darkMode={darkMode} backgroundImageUrl={backgroundImageUrl} backgroundOpacity={backgroundOpacity} bannerBgColor={bannerBgColor} />
        <MenuBannerHeader {...menuBannerHeaderProps} />
        <MenuAccessPanel {...menuAccessPanelProps} />
        <div ref={actionDockSentinelRef} aria-hidden="true" className="h-px -mt-px" />
        <MenuActionDock {...menuActionDockProps} />
        <MenuSmartCallModal {...menuSmartCallModalProps} />
        <MenuSalesAdviceModal {...menuSalesAdviceModalProps} />
        <MenuFeaturedHighlightsSection {...menuFeaturedHighlightsProps} />
        <MenuCategoryTabsBar {...menuCategoryTabsBarProps} />
        <MenuCategoryDrawer {...menuCategoryDrawerProps} />
        <MenuSubCategoryTabs {...menuSubCategoryTabsProps} />
        <MenuDishGridSection {...menuDishGridSectionProps} />
        <MenuFormulaModal {...menuFormulaModalProps} />
        <MenuSelectedDishModal {...menuSelectedDishModalProps} />
        <MenuStatusToasts serverCallMsg={serverCallMsg} toastMessage={toastMessage} />
        <MenuCartModal {...menuCartModalProps} />
        <MenuSocialFooter {...menuSocialFooterProps} />
        <MenuLegalFooter {...menuLegalFooterProps} />
      </div>
    </>
  );
}



