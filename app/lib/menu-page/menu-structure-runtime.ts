export function getCategoryLabelRuntime(category: any, lang: string, getNameTranslation: (value: any, lang: string) => string) {
  return getNameTranslation(category as any, lang) || category.name_fr;
}

export function buildSortedCategories(categories: any[]) {
  return [...categories].sort((a, b) => {
    const aOrder = Number.isFinite(Number(a.sort_order)) ? Number(a.sort_order) : 0;
    const bOrder = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 0;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return String(a.name_fr || "").localeCompare(String(b.name_fr || ""));
  });
}

export function buildFormulaMenuDishes(params: any) {
  const { formulaInfoById, dishes, parsePriceNumber, sanitizeMediaUrl, getDishName, lang, FORMULAS_CATEGORY_ID } = params;
  const list: any[] = [];

  formulaInfoById.forEach((info: any, formulaId: string) => {
    const baseDish =
      (info?.dishId && dishes.find((dish: any) => String(dish.id || "").trim() === String(info.dishId))) ||
      dishes.find((dish: any) => String(dish.id || "").trim() === String(formulaId)) ||
      null;
    const price = parsePriceNumber(info?.price ?? (baseDish as any)?.price);
    const imageUrl = sanitizeMediaUrl(info?.imageUrl ?? (baseDish as any)?.image_url, "dishes-images-");
    const name = info?.name || (baseDish ? getDishName(baseDish, lang) : `Formule ${String(formulaId).slice(-4)}`);
    const display = {
      ...(baseDish || {
        id: formulaId,
        name,
        name_fr: name,
        price,
        category_id: FORMULAS_CATEGORY_ID,
      }),
      name_fr: (baseDish as any)?.name_fr ?? name,
      name: (baseDish as any)?.name ?? name,
      price,
      category_id: FORMULAS_CATEGORY_ID,
      image_url: imageUrl || (baseDish as any)?.image_url,
      is_formula: true,
      formula_id: formulaId,
      formula_category_ids: info?.formula_category_ids ?? (baseDish as any)?.formula_category_ids ?? undefined,
    };
    list.push(display);
  });
  return list;
}

export function getHasFormulaDishes(dishes: any[], formulaMenuDishes: any[], toBooleanFlag: (value: unknown) => boolean) {
  return dishes.some((dish) => toBooleanFlag((dish as any).is_formula ?? dish.is_formula)) || formulaMenuDishes.length > 0;
}

export function buildMenuCategories(params: any) {
  const { sortedCategories, hasFormulaDishes, FORMULAS_CATEGORY_ID, formulaCategoryLabel } = params;
  if (!hasFormulaDishes) return sortedCategories;
  const virtualFormulaCategory = {
    id: FORMULAS_CATEGORY_ID,
    name_fr: formulaCategoryLabel,
    sort_order: Number.MAX_SAFE_INTEGER,
    destination: "cuisine",
  };
  return [...sortedCategories, virtualFormulaCategory];
}

export function buildCategoryList(params: any) {
  const { uiText, menuCategories, FORMULAS_CATEGORY_ID, formulaCategoryLabel, getCategoryLabel } = params;
  const allLabel = uiText.categories[0];
  return [
    allLabel,
    ...menuCategories.map((category: any) =>
      String(category.id || "") === FORMULAS_CATEGORY_ID ? formulaCategoryLabel : getCategoryLabel(category)
    ),
  ];
}

export function buildCategorySortMap(sortedCategories: any[]) {
  const map = new Map<string | number, number>();
  sortedCategories.forEach((category, index) => {
    const raw = Number(category.sort_order);
    const order = Number.isFinite(raw) ? raw : index;
    map.set(category.id, order);
  });
  return map;
}

export function buildAvailabilitySnapshot(serviceHours: any) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const todayKey = dayKeys[now.getDay()] || "sun";
  return { nowMinutes, todayKey };
}

export function isDishAvailableNowRuntime(params: any) {
  const { dish, availabilitySnapshot, parseAvailableDays, parseTimeToMinutes, isWithinTimeWindow, serviceHours } = params;
  const availableDays = parseAvailableDays(dish.available_days);
  const hasDayRestriction = availableDays.length > 0;
  if (hasDayRestriction && !availableDays.includes(availabilitySnapshot.todayKey)) return false;

  const dishStart = parseTimeToMinutes(dish.start_time);
  const dishEnd = parseTimeToMinutes(dish.end_time);
  const hasTimeRestriction = dishStart != null || dishEnd != null;
  if (hasTimeRestriction && !isWithinTimeWindow(availabilitySnapshot.nowMinutes, dishStart, dishEnd)) return false;

  const windows = [
    {
      start: parseTimeToMinutes(serviceHours.lunch_start),
      end: parseTimeToMinutes(serviceHours.lunch_end),
    },
    {
      start: parseTimeToMinutes(serviceHours.dinner_start),
      end: parseTimeToMinutes(serviceHours.dinner_end),
    },
  ].filter((range) => range.start != null || range.end != null);

  const isWithinServiceWindow =
    windows.length === 0 ||
    windows.some((range) => isWithinTimeWindow(availabilitySnapshot.nowMinutes, range.start ?? null, range.end ?? null));
  const hasDishRestriction = hasDayRestriction || hasTimeRestriction;
  if (!hasDishRestriction) return true;
  if (!isWithinServiceWindow) return false;
  return true;
}

export function isDishVisibleInMenuRuntime(dish: any, toBooleanFlag: (value: unknown) => boolean) {
  const dishRecord = dish as any;
  const onlyInFormula = toBooleanFlag(dishRecord.only_in_formula ?? dish.only_in_formula);
  return !onlyInFormula;
}

export function getSideLabelRuntime(params: any) {
  const { side, lang, uiLang, getNameTranslation, parseI18nToken } = params;
  const fromTranslations = getNameTranslation(side as any, lang);
  if (fromTranslations) return fromTranslations;
  const raw = String(side.name_en || "");
  if (raw.startsWith("__I18N__:")) {
    try {
      const parsed = JSON.parse(decodeURIComponent(raw.replace("__I18N__:", ""))) as any;
      const dynamic = parsed?.[lang];
      if (typeof dynamic === "string" && dynamic.trim()) return dynamic.trim();
      const dynamicUi = parsed?.[uiLang];
      if (typeof dynamicUi === "string" && dynamicUi.trim()) return dynamicUi.trim();
    } catch {
      // ignore malformed token
    }
  }
  if (lang === "en" && side.name_en) return side.name_en;
  if (lang === "es" && side.name_es) return side.name_es;
  if (lang === "de" && side.name_de) return side.name_de;
  return side.name_fr;
}

export function getSubCategoryLabelRuntime(subCategory: any, lang: string, getNameTranslation: (value: any, lang: string) => string) {
  return getNameTranslation(subCategory as any, lang) || subCategory.name_fr;
}

export function buildSideNameFrById(sidesLibrary: any[]) {
  const map = new Map<string, string>();
  sidesLibrary.forEach((side) => {
    const id = String(side.id || "").trim();
    if (!id) return;
    const label = String(side.name_fr || "").trim();
    if (!label) return;
    map.set(id, label);
  });
  return map;
}

export function buildSideIdByAlias(params: any) {
  const { sidesLibrary, parseI18nToken, normalizeLookupText } = params;
  const map = new Map<string, string>();
  sidesLibrary.forEach((side: any) => {
    const id = String(side.id || "").trim();
    if (!id) return;
    const aliasValues = new Set<string>();
    [side.name_fr, side.name_en, side.name_es, side.name_de].forEach((value) => {
      const text = String(value || "").trim();
      if (!text) return;
      aliasValues.add(text);
      const tokenValues = parseI18nToken(text);
      Object.values(tokenValues).forEach((tokenValue) => {
        const tokenText = String(tokenValue || "").trim();
        if (tokenText) aliasValues.add(tokenText);
      });
    });
    aliasValues.forEach((alias) => {
      const normalized = normalizeLookupText(alias);
      if (!normalized) return;
      map.set(normalized, id);
    });
  });
  return map;
}

export function getFormulaSelectionDetailsRuntime(formulaSelectionDetails: Record<string, any>, categoryId: string, emptyValue: any) {
  const details = formulaSelectionDetails[categoryId];
  return details || emptyValue;
}

export function getFormulaDishConfigRuntime(params: any) {
  const {
    dish,
    parseOptionsFromDescription,
    dedupeDisplayValues,
    sidesLibrary,
    getSideLabel,
    isProductOptionVisible,
    toBooleanFlag,
  } = params;
  const parsed = parseOptionsFromDescription(String(dish.description || ""));
  const selectedSideIdsRaw = Array.isArray(dish.selected_sides) ? dish.selected_sides : parsed.sideIds || [];
  const sideOptions = dedupeDisplayValues(
    selectedSideIdsRaw
      .map((id: string) => sidesLibrary.find((side: any) => String(side.id) === String(id)))
      .filter(Boolean)
      .map((side: any) => getSideLabel(side))
  );
  const hasRequiredSides = Boolean(dish.has_sides) || sideOptions.length > 0;
  const maxRaw = Number(dish.max_options);
  const maxSides = Number.isFinite(maxRaw) && maxRaw > 0 ? Math.max(1, Math.trunc(maxRaw)) : 1;
  const askCooking = Boolean(dish.ask_cooking || parsed.askCooking);
  const dishRecord = dish as any;
  const productOptions = Array.isArray(dishRecord.product_options)
    ? (dishRecord.product_options as any[]).filter(Boolean).filter((option) => isProductOptionVisible(option, toBooleanFlag))
    : [];
  return { sideOptions, hasRequiredSides, maxSides, askCooking, productOptions };
}
