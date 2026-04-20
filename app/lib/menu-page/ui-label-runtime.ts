export function buildMergedUiDictionaryRuntime(params: any) {
  const { UI_TRANSLATIONS, normalizedLang, uiLang, uiTranslationsByLang } = params;
  const master = UI_TRANSLATIONS[normalizedLang] || UI_TRANSLATIONS[uiLang] || {};
  return {
    ...(uiTranslationsByLang.fr || {}),
    ...(uiTranslationsByLang[uiLang] || {}),
    ...(uiTranslationsByLang[normalizedLang] || {}),
    ...master,
  };
}

export function buildFormulaUiRuntime(params: any) {
  const { mergedUiDictionary, UI_TRANSLATIONS, normalizedLang, uiLang } = params;
  const get = (key: string, fallbackValue: string) =>
    String(
      mergedUiDictionary[key] ||
        (UI_TRANSLATIONS[normalizedLang] as Record<string, string> | undefined)?.[key] ||
        (UI_TRANSLATIONS[uiLang] as Record<string, string> | undefined)?.[key] ||
        fallbackValue
    ).trim();
  return {
    title: get("formula_title", "Composer votre formule"),
    subtitle: get("formula_subtitle", "Choisissez vos plats"),
    missing: get("formula_missing", "Veuillez choisir un plat pour chaque categorie."),
    missingOptions: get(
      "formula_missing_options",
      "Veuillez completer les options obligatoires des plats selectionnes."
    ),
    label: get("formula_label", "Formule"),
    choose: get("formula_choose", "Choisir"),
  };
}

export function buildMenuLabelsRuntime(params: any) {
  const {
    mergedUiDictionary,
    UI_TRANSLATIONS,
    normalizedLang,
    uiLang,
    UI_TEXT_CLEAN,
    FORMULA_BADGE_TRANSLATIONS,
    VIEW_FORMULA_TRANSLATIONS,
    PROMO_BADGE_TRANSLATIONS,
  } = params;

  const formulaCategoryLabel =
    String(
      mergedUiDictionary["categories.formulas"] ||
        mergedUiDictionary["labels.formulas"] ||
        mergedUiDictionary.formulas ||
        UI_TRANSLATIONS[normalizedLang]?.["categories.formulas"] ||
        UI_TRANSLATIONS[normalizedLang]?.["labels.formulas"] ||
        UI_TRANSLATIONS[normalizedLang]?.formulas ||
        UI_TRANSLATIONS[uiLang]?.["categories.formulas"] ||
        UI_TRANSLATIONS[uiLang]?.["labels.formulas"] ||
        UI_TRANSLATIONS[uiLang]?.formulas ||
        UI_TEXT_CLEAN[uiLang].labels.formulas
    ).trim() || UI_TEXT_CLEAN[uiLang].labels.formulas;

  const availableInFormulaLabel =
    String(
      mergedUiDictionary["labels.available_in_formula"] ||
        mergedUiDictionary.available_in_formula ||
        UI_TRANSLATIONS[normalizedLang]?.["labels.available_in_formula"] ||
        UI_TRANSLATIONS[normalizedLang]?.available_in_formula ||
        UI_TRANSLATIONS[uiLang]?.["labels.available_in_formula"] ||
        UI_TRANSLATIONS[uiLang]?.available_in_formula ||
        FORMULA_BADGE_TRANSLATIONS[normalizedLang] ||
        FORMULA_BADGE_TRANSLATIONS[uiLang] ||
        UI_TEXT_CLEAN[uiLang].labels.available_in_formula
    ).trim() || UI_TEXT_CLEAN[uiLang].labels.available_in_formula;

  const viewFormulaLabel =
    String(
      mergedUiDictionary["labels.view_formula"] ||
        mergedUiDictionary.view_formula ||
        UI_TRANSLATIONS[normalizedLang]?.["labels.view_formula"] ||
        UI_TRANSLATIONS[normalizedLang]?.view_formula ||
        UI_TRANSLATIONS[uiLang]?.["labels.view_formula"] ||
        UI_TRANSLATIONS[uiLang]?.view_formula ||
        VIEW_FORMULA_TRANSLATIONS[normalizedLang] ||
        VIEW_FORMULA_TRANSLATIONS[uiLang] ||
        UI_TEXT_CLEAN[uiLang].labels.view_formula
    ).trim() || UI_TEXT_CLEAN[uiLang].labels.view_formula;

  const pick = (key: string, fallback: string) =>
    String(mergedUiDictionary[key] || UI_TRANSLATIONS[normalizedLang]?.[key] || UI_TRANSLATIONS[uiLang]?.[key] || fallback);

  const dishBadgeLabels = {
    vegetarian: pick("badge_vegetarian", "Vegetarien"),
    spicy: pick("badge_spicy", "Pimente"),
    isNew: pick("badge_new", "Nouveau"),
    glutenFree: pick("badge_gluten_free", "Sans gluten"),
  };

  const promoBadgeLabel = String(
    mergedUiDictionary.badge_promo ||
      UI_TRANSLATIONS[normalizedLang]?.badge_promo ||
      UI_TRANSLATIONS[uiLang]?.badge_promo ||
      PROMO_BADGE_TRANSLATIONS[normalizedLang] ||
      PROMO_BADGE_TRANSLATIONS[uiLang] ||
      "PROMO"
  );
  const chefSuggestionBadgeLabel = String(
    mergedUiDictionary.badge_suggestion_chef ||
      UI_TRANSLATIONS[normalizedLang]?.badge_suggestion_chef ||
      UI_TRANSLATIONS[uiLang]?.badge_suggestion_chef ||
      "SUGGESTION DU CHEF"
  );
  const footerThankYouLabel = String(
    mergedUiDictionary.footer_thank_you ||
      UI_TRANSLATIONS[normalizedLang]?.footer_thank_you ||
      UI_TRANSLATIONS[uiLang]?.footer_thank_you ||
      "Merci de votre visite"
  );
  const footerFollowUsLabel = String(
    mergedUiDictionary.footer_follow_us ||
      UI_TRANSLATIONS[normalizedLang]?.footer_follow_us ||
      UI_TRANSLATIONS[uiLang]?.footer_follow_us ||
      "Suivez-nous sur nos reseaux"
  );
  const footerPhotoShareLabel = String(
    mergedUiDictionary.footer_photo_share_cta ||
      UI_TRANSLATIONS[normalizedLang]?.footer_photo_share_cta ||
      UI_TRANSLATIONS[uiLang]?.footer_photo_share_cta ||
      "Partagez vos plats et mentionnez-nous."
  );
  const footerLegalLabel = String(
    mergedUiDictionary.footer_legal ||
      UI_TRANSLATIONS[normalizedLang]?.footer_legal ||
      UI_TRANSLATIONS[uiLang]?.footer_legal ||
      "Mentions Legales"
  );
  const footerRulesLabel = String(
    mergedUiDictionary.footer_rules ||
      UI_TRANSLATIONS[normalizedLang]?.footer_rules ||
      UI_TRANSLATIONS[uiLang]?.footer_rules ||
      "Reglement Interieur"
  );

  return {
    formulaCategoryLabel,
    availableInFormulaLabel,
    viewFormulaLabel,
    dishBadgeLabels,
    promoBadgeLabel,
    chefSuggestionBadgeLabel,
    footerThankYouLabel,
    footerFollowUsLabel,
    footerPhotoShareLabel,
    footerLegalLabel,
    footerRulesLabel,
  };
}
