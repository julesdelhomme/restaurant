"use client";

import { useEffect, useMemo } from "react";
import { DEFAULT_SUGGESTION_LEADS } from "./config";
import { FORMULAS_CATEGORY_ID } from "./static";
import type { Dish, SubCategoryItem } from "./runtime";

type UseMenuDishCollectionsArgs = {
  selectedCategory: number;
  selectedCategoryId: string | number | null;
  selectedSubCategory: string;
  setSelectedSubCategory: (value: string) => void;
  didInitCategoryScrollRef: { current: boolean };
  dishes: Dish[];
  formulaMenuDishes: Dish[];
  keepSuggestionsOnTop: boolean;
  isDishVisibleInMenu: (dish: Dish) => boolean;
  isDishAvailableNow: (dish: Dish) => boolean;
  categorySortMap: Map<string | number, number>;
  availableSubCategoriesBase: SubCategoryItem[];
  subCategoryRows: SubCategoryItem[];
  getSubCategoryLabel: (subCategory: SubCategoryItem) => string;
  chefSuggestionBadgeLabel: string;
  uiText: any;
  heroBadgeTypeClient: "chef" | "daily";
  heroEnabledClient: boolean;
  normalizeLanguageKey: (value: string) => string;
  toUiLang: (value: string) => string;
  lang: string;
  suggestionLeadByLang: Record<string, string>;
  normalizeLookupText: (value: unknown) => string;
  getDishName: (dish: Dish, lang: string) => string;
  salesAdviceDishId: string;
};

export function useMenuDishCollections({
  selectedCategory,
  selectedCategoryId,
  selectedSubCategory,
  setSelectedSubCategory,
  didInitCategoryScrollRef,
  dishes,
  formulaMenuDishes,
  keepSuggestionsOnTop,
  isDishVisibleInMenu,
  isDishAvailableNow,
  categorySortMap,
  availableSubCategoriesBase,
  subCategoryRows,
  getSubCategoryLabel,
  chefSuggestionBadgeLabel,
  uiText,
  heroBadgeTypeClient,
  heroEnabledClient,
  normalizeLanguageKey,
  toUiLang,
  lang,
  suggestionLeadByLang,
  normalizeLookupText,
  getDishName,
  salesAdviceDishId,
}: UseMenuDishCollectionsArgs) {
  const availableSubCategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    if (String(selectedCategoryId) === FORMULAS_CATEGORY_ID) return [];
    return availableSubCategoriesBase.filter((sub) => String(sub.category_id) === String(selectedCategoryId));
  }, [availableSubCategoriesBase, selectedCategoryId]);

  useEffect(() => {
    if (selectedCategory === 0) {
      setSelectedSubCategory("");
      return;
    }
    if (selectedSubCategory && !availableSubCategories.some((sub) => String(sub.id) === selectedSubCategory)) {
      setSelectedSubCategory("");
    }
  }, [selectedCategory, availableSubCategories, selectedSubCategory, setSelectedSubCategory]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!didInitCategoryScrollRef.current) {
      didInitCategoryScrollRef.current = true;
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [didInitCategoryScrollRef, selectedCategory]);

  const suggestionPinnedDishes = useMemo(() => {
    if (!keepSuggestionsOnTop) return [];
    const suggestionList = (dishes || []).filter((dish) => {
      if (dish.is_available === false) return false;
      if (!isDishVisibleInMenu(dish)) return false;
      if (!isDishAvailableNow(dish)) return false;
      return dish.is_suggestion || dish.is_chef_suggestion || dish.is_featured;
    });
    return suggestionList.sort((a, b) => {
      return String(a.name_fr || a.name || "").localeCompare(String(b.name_fr || b.name || ""));
    });
  }, [dishes, keepSuggestionsOnTop, isDishAvailableNow, isDishVisibleInMenu]);

  const filteredDishes = useMemo(() => {
    if (String(selectedCategoryId) === FORMULAS_CATEGORY_ID) {
      return formulaMenuDishes;
    }
    const list = (dishes || []).filter((dish) => {
      if (dish.is_available === false) return false;
      if (!isDishVisibleInMenu(dish)) return false;
      if (!isDishAvailableNow(dish)) return false;
      if (!selectedCategoryId) return true;
      return String(dish.category_id) === String(selectedCategoryId);
    });
    const filteredBySub =
      !selectedSubCategory || !selectedCategoryId || String(selectedCategoryId) === FORMULAS_CATEGORY_ID
        ? list
        : list.filter((dish) => String(dish.subcategory_id) === String(selectedSubCategory));
    const filteredVisible =
      selectedCategoryId && String(selectedCategoryId) !== FORMULAS_CATEGORY_ID
        ? filteredBySub.filter((dish) => !dish.only_in_formula)
        : filteredBySub;
    const sortByName = (a: Dish, b: Dish) =>
      String(a.name_fr || a.name || "").localeCompare(String(b.name_fr || b.name || ""));
    const sortByCategoryAndName = (a: Dish, b: Dish) => {
      const aCat = categorySortMap.get(String(a.category_id ?? "")) ?? 0;
      const bCat = categorySortMap.get(String(b.category_id ?? "")) ?? 0;
      if (aCat !== bCat) return aCat - bCat;
      return sortByName(a, b);
    };
    const sorted = [...filteredVisible].sort(selectedCategoryId ? sortByName : sortByCategoryAndName);
    if (keepSuggestionsOnTop) {
      return sorted;
    }
    return sorted;
  }, [
    dishes,
    selectedCategoryId,
    selectedSubCategory,
    categorySortMap,
    keepSuggestionsOnTop,
    formulaMenuDishes,
    isDishAvailableNow,
    isDishVisibleInMenu,
  ]);

  const groupedDishes = useMemo(() => {
    if (!selectedCategoryId) {
      const baseGroups = [{ title: "", items: filteredDishes }];
      if (keepSuggestionsOnTop && suggestionPinnedDishes.length > 0) {
        return [{ title: chefSuggestionBadgeLabel, items: suggestionPinnedDishes }, ...baseGroups];
      }
      return baseGroups;
    }
    if (String(selectedCategoryId) === FORMULAS_CATEGORY_ID) {
      return [{ title: "", items: filteredDishes }];
    }
    const groups: Record<string, Dish[]> = {};
    filteredDishes.forEach((dish) => {
      const key = String(dish.subcategory_id || "0");
      if (!groups[key]) groups[key] = [];
      groups[key].push(dish);
    });
    const ordered: Array<{ title: string; items: Dish[] }> = [];
    if (keepSuggestionsOnTop && suggestionPinnedDishes.length > 0) {
      ordered.push({ title: chefSuggestionBadgeLabel, items: suggestionPinnedDishes });
    }
    availableSubCategories.forEach((sub) => {
      const key = String(sub.id);
      if (groups[key] && groups[key].length > 0) {
        ordered.push({ title: getSubCategoryLabel(sub), items: groups[key] });
        delete groups[key];
      }
    });
    Object.entries(groups).forEach(([subId, items]) => {
      const sub = subCategoryRows.find((row) => String(row.id) === String(subId));
      ordered.push({ title: sub ? getSubCategoryLabel(sub) : uiText.labels.others, items });
    });
    return ordered;
  }, [
    filteredDishes,
    selectedCategoryId,
    availableSubCategories,
    subCategoryRows,
    keepSuggestionsOnTop,
    suggestionPinnedDishes,
    chefSuggestionBadgeLabel,
    getSubCategoryLabel,
    uiText.labels.others,
  ]);

  const featuredHighlights = useMemo(() => {
    const visibleDishes = dishes.filter(
      (dish) => dish.is_available !== false && isDishVisibleInMenu(dish) && isDishAvailableNow(dish)
    );
    const isChefSuggestion = (dish: Dish) => dish.is_chef_suggestion === true || dish.is_featured === true;
    const isDailySpecial = (dish: Dish) => dish.is_daily_special === true || dish.is_special === true;

    const dailyDish = visibleDishes.find((dish) => isDailySpecial(dish)) || null;
    const chefDish = visibleDishes.find((dish) => isChefSuggestion(dish)) || null;
    const preferredOrder: Array<"daily" | "chef"> =
      heroBadgeTypeClient === "daily" ? ["daily", "chef"] : ["chef", "daily"];

    if (!dailyDish && !chefDish) return [] as Array<{ key: string; dish: Dish; types: Array<"daily" | "chef"> }>;
    if (dailyDish && chefDish && String(dailyDish.id) === String(chefDish.id)) {
      return [
        {
          key: `combined-${String(dailyDish.id)}`,
          dish: dailyDish,
          types: preferredOrder,
        },
      ];
    }

    const highlights: Array<{ key: string; dish: Dish; types: Array<"daily" | "chef"> }> = [];
    preferredOrder.forEach((type) => {
      if (type === "daily" && dailyDish) highlights.push({ key: `daily-${String(dailyDish.id)}`, dish: dailyDish, types: ["daily"] });
      if (type === "chef" && chefDish) highlights.push({ key: `chef-${String(chefDish.id)}`, dish: chefDish, types: ["chef"] });
    });
    return highlights;
  }, [dishes, heroBadgeTypeClient, isDishAvailableNow, isDishVisibleInMenu]);

  const shouldShowHeroSection =
    heroEnabledClient && featuredHighlights.length > 0 && (keepSuggestionsOnTop || !selectedCategoryId);

  const getFeaturedLabel = (type: "daily" | "chef") => {
    return type === "daily" ? uiText.labels.featured_daily : uiText.labels.featured_chef;
  };

  const linkedSalesAdviceDish = useMemo(() => {
    if (!salesAdviceDishId) return null;
    return dishes.find((dish) => String(dish.id) === String(salesAdviceDishId)) || null;
  }, [dishes, salesAdviceDishId]);

  const getSuggestionLeadMessage = (langCode: string) => {
    const normalizedLang = normalizeLanguageKey(langCode);
    const fallbackLang = toUiLang(langCode);
    const configured =
      String(suggestionLeadByLang[normalizedLang] || "").trim() ||
      String(suggestionLeadByLang[fallbackLang] || "").trim() ||
      String(suggestionLeadByLang.fr || "").trim();
    if (configured) return configured;
    return (
      DEFAULT_SUGGESTION_LEADS[normalizedLang] ||
      DEFAULT_SUGGESTION_LEADS[fallbackLang] ||
      DEFAULT_SUGGESTION_LEADS.fr
    );
  };

  const getSalesAdvice = (dish: Dish) => {
    const dishRecord = dish as unknown as any;
    const raw = dishRecord.dietary_tag;
    const parsed =
      typeof raw === "string"
        ? (() => {
            try {
              return JSON.parse(raw) as unknown as any;
            } catch {
              return {};
            }
          })()
        : (raw as unknown as any | null) || {};
    const explicitMessage = String(dish.suggestion_message || "").trim();
    const normalizedLang = normalizeLanguageKey(lang);
    const suggestionColumnCandidates = [
      `suggestion_${normalizedLang}`,
      `suggestion_${toUiLang(lang)}`,
      normalizedLang === "ja" ? "suggestion_jp" : "",
      normalizedLang === "zh" ? "suggestion_cn" : "",
      normalizedLang === "ko" ? "suggestion_kr" : "",
      normalizedLang === "el" ? "suggestion_gr" : "",
      `suggestion_message_${normalizedLang}`,
      `suggestion_message_${toUiLang(lang)}`,
      normalizedLang === "ja" ? "suggestion_message_jp" : "",
      normalizedLang === "zh" ? "suggestion_message_cn" : "",
      normalizedLang === "ko" ? "suggestion_message_kr" : "",
      normalizedLang === "el" ? "suggestion_message_gr" : "",
    ].filter(Boolean);
    const directSuggestionByColumns =
      suggestionColumnCandidates.map((key) => String(dishRecord[key] || "").trim()).find(Boolean) || "";
    const frenchSuggestion =
      String(dishRecord.suggestion_fr || "").trim() || String(dishRecord.suggestion_message_fr || "").trim();
    const explicitByColumn =
      (normalizedLang === "fr" ? frenchSuggestion : "") ||
      directSuggestionByColumns ||
      String(
        (lang === "en"
          ? dishRecord.suggestion_message_en
          : lang === "es"
            ? dishRecord.suggestion_message_es
            : lang === "de"
              ? dishRecord.suggestion_message_de
              : dishRecord.suggestion_message_fr) || ""
      ).trim() ||
      String(dishRecord.suggestion_message_fr || "").trim() ||
      explicitMessage;
    const tipI18nRaw =
      parsed.sales_tip_i18n && typeof parsed.sales_tip_i18n === "object"
        ? (parsed.sales_tip_i18n as unknown as any)
        : {};
    const tipI18n = Object.fromEntries(
      Object.entries(tipI18nRaw).map(([code, value]) => [normalizeLanguageKey(code), String(value || "").trim()])
    ) as Record<string, string>;
    const currentLang = normalizedLang;
    const fallbackUiLang = toUiLang(lang);
    const explicitLocalizedMessage =
      String(tipI18n[currentLang] || "").trim() ||
      String(tipI18n[fallbackUiLang] || "").trim() ||
      String(tipI18n.fr || "").trim() ||
      String(tipI18n.en || "").trim() ||
      explicitByColumn;
    const linkedDishId =
      typeof parsed.sales_tip_dish_id === "string"
        ? parsed.sales_tip_dish_id.trim()
        : typeof parsed.sales_tip_dish_id === "number"
          ? String(parsed.sales_tip_dish_id)
          : "";
    if (!linkedDishId && !explicitLocalizedMessage) return { message: "", linkedDishId: "" };
    const linkedDish = dishes.find((candidate) => String(candidate.id) === linkedDishId) || null;
    const linkedDishName = linkedDish ? getDishName(linkedDish, lang) : "";
    const leadMessage = explicitLocalizedMessage || getSuggestionLeadMessage(lang);
    const normalizedLead = normalizeLookupText(leadMessage);
    const normalizedLinkedDishName = normalizeLookupText(linkedDishName);
    const messageWithLinkedDish =
      linkedDishName && !normalizedLead.includes(normalizedLinkedDishName)
        ? `${leadMessage}: ${linkedDishName}`
        : leadMessage;
    return { message: messageWithLinkedDish, linkedDishId };
  };

  return {
    availableSubCategories,
    suggestionPinnedDishes,
    filteredDishes,
    groupedDishes,
    featuredHighlights,
    shouldShowHeroSection,
    getFeaturedLabel,
    linkedSalesAdviceDish,
    getSuggestionLeadMessage,
    getSalesAdvice,
  };
}
