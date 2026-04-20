import { supabase } from "../../lib/supabase";
import { migrateTranslationsToJsonb } from "../../lib/migrate-translations";

export function useManagerAdminActions(deps: Record<string, any>) {
  const {
    allergenLibrary,
    setAllergenLibrary,
    restaurant,
    parseObjectRecord,
    createLocalId,
    normalizeLanguageKey,
    setRestaurant,
    setRestaurantSaveStatus,
    activeLanguageCodes,
    restaurantForm,
    normalizeHexColor,
    toBoolean,
    normalizeOpacityPercent,
    normalizeTimeInput,
    normalizeWelcomePopupType,
    normalizeDensityStyle,
    normalizeBackgroundOpacity,
    normalizeManagerFontFamily,
    normalizeMenuLayout,
    normalizeCardLayout,
    normalizeCardStyle,
    MENU_FONT_OPTIONS,
    cookingTranslations,
    COOKING_TRANSLATION_ORDER,
    DEFAULT_COOKING_TRANSLATIONS,
    DEFAULT_LANGUAGE_LABELS,
    searchBarEnabled,
    autoPrintKitchen,
    consultationModeEnabled,
    persistDisplaySettings,
    showCaloriesClient,
    languageLabels,
    heroEnabled,
    heroBadgeType,
    totalTables,
    hasRestaurantLanguagesTableRef,
    isMissingTableError,
    hasMissingColumnError,
    writeLocalClientOrderingDisabled,
    fetchRestaurant,
    fetchCategories,
    fetchSubCategories,
    fetchSidesLibrary,
    fetchDishes,
    fetchAllergenLibrary,
    isSuperAdminSession,
    impersonateMode,
    extractMissingColumnName,
    setFormulaImagePreviewUrl,
    setIsUploadingFormulaImage,
    sanitizeFileName,
    DISH_IMAGES_BUCKET,
    setFormData,
    setFormulaImage,
    setPasswordUpdateError,
    setPasswordUpdateMessage,
    passwordForm,
    setPasswordUpdateLoading,
    managerUserEmail,
    setPasswordForm,
    setForceFirstLoginPasswordChange,
    setManagerOtpError,
    setManagerOtpMessage,
    scopedRestaurantId,
    setManagerOtpLoading,
    setManagerOtpEnabled,
    router,
    setMigrating,
  } = deps;
const handleDeleteAllergen = async (rowId: string) => {
  const nextLibrary = allergenLibrary.filter((item: any) => item.id !== rowId);
  setAllergenLibrary(nextLibrary);
  if (!restaurant?.id) return;
  try {
    const currentTableConfig = parseObjectRecord((restaurant as any)?.table_config);
    const nextTableConfig = {
      ...currentTableConfig,
      allergen_library: nextLibrary
        .map((row: any) => ({
          id: String(row.id || createLocalId()),
          name_fr: String(row.name_fr || "").trim(),
          names_i18n: Object.fromEntries(
            Object.entries(row.names_i18n || {})
              .map(([lang, label]) => [normalizeLanguageKey(lang), String(label || "").trim()])
              .filter(([lang, label]) => Boolean(lang) && Boolean(label))
          ),
        }))
        .filter((row: any) => row.name_fr),
    };
    const { error } = await supabase
      .from("restaurants")
      .update({ table_config: nextTableConfig } as never)
      .eq("id", restaurant.id);
    if (error) {
      setAllergenLibrary(allergenLibrary);
      alert(`Erreur suppression allergène: ${error.message}`);
      return;
    }
    setRestaurant((prev: any) =>
      prev ? ({ ...(prev as any), table_config: nextTableConfig } as any) : prev
    );
    alert("Allergène supprimé.");
  } catch (error: any) {
    setAllergenLibrary(allergenLibrary);
    alert(`Erreur suppression allergène: ${String(error?.message || "Erreur inconnue")}`);
  }
};


const handleSaveRestaurant = async () => {
  if (!restaurant?.id) return;
  setRestaurantSaveStatus("saving");
  let restaurantSaveCompleted = false;
  try {
    const enabledLangs: string[] = Array.from(
      new Set(
        activeLanguageCodes.map((code: string) => normalizeLanguageKey(String(code || ""))).filter(Boolean)
      )
    );
    if (!enabledLangs.includes("fr")) enabledLangs.unshift("fr");
    const safeName = String(restaurantForm.name ?? "").trim();
    const safeLogo =
      String(restaurantForm.logo_url || "").trim() ||
      String((restaurant as any)?.logo_url || "").trim();
    const safeBannerImage = String(
      (restaurantForm as any).banner_image_url || (restaurantForm as any).banner_url || ""
    ).trim();
    const safeBackground =
      String((restaurantForm as any).background_url || (restaurantForm as any).background_image_url || "").trim() ||
      String((restaurant as any)?.background_url || "").trim() ||
      String((restaurant as any)?.background_image_url || "").trim() ||
      String((restaurant as any)?.bg_image_url || "").trim();
    const safePrimaryColor =
      String(restaurantForm.primary_color || "").trim() ||
      String((restaurant as any)?.primary_color || "").trim() ||
      "#FFFFFF";
    const safeTextColor = normalizeHexColor(
      (restaurantForm as any).text_color,
      normalizeHexColor(
        (restaurant as any)?.text_color ??
          parseObjectRecord((restaurant as any)?.table_config).text_color ??
          parseObjectRecord((restaurant as any)?.table_config).global_text_color,
        "#111111"
      )
    );
    const safeCardBgColor = normalizeHexColor(
      (restaurantForm as any).card_bg_color,
      normalizeHexColor((restaurant as any)?.card_bg_color, "#FFFFFF")
    );
    const safeCardTransparent = toBoolean(
      (restaurantForm as any).card_transparent,
      toBoolean(
        (restaurant as any)?.card_transparent ??
          parseObjectRecord((restaurant as any)?.table_config).card_transparent ??
          parseObjectRecord((restaurant as any)?.table_config).cards_transparent,
        false
      )
    );
    const safeCardBgOpacity = normalizeOpacityPercent(
      (restaurantForm as any).card_bg_opacity,
      safeCardTransparent ? 0 : 100
    );
    const safeCardTextColor = normalizeHexColor(
      (restaurantForm as any).card_text_color,
      normalizeHexColor(
        (restaurant as any)?.card_text_color ??
          parseObjectRecord((restaurant as any)?.table_config).card_text_color,
        "#111111"
      )
    );
    const safeQuickAddToCartEnabled = toBoolean(
      (restaurantForm as any).quick_add_to_cart_enabled,
      toBoolean(parseObjectRecord((restaurant as any)?.table_config).quick_add_to_cart_enabled, false)
    );
    const safeCategoryDrawerEnabled = toBoolean(
      (restaurantForm as any).category_drawer_enabled,
      toBoolean(
        parseObjectRecord((restaurant as any)?.table_config).category_drawer_enabled ??
          parseObjectRecord((restaurant as any)?.table_config).show_category_drawer,
        false
      )
    );
    const safeKeepSuggestionsOnTop = toBoolean(
      (restaurantForm as any).keep_suggestions_on_top,
      toBoolean(
        parseObjectRecord((restaurant as any)?.table_config).keep_suggestions_on_top ??
          parseObjectRecord((restaurant as any)?.table_config).pin_suggestions,
        false
      )
    );
    const safeServiceLunchStart = normalizeTimeInput(
      (restaurantForm as any).service_lunch_start
    );
    const safeServiceLunchEnd = normalizeTimeInput((restaurantForm as any).service_lunch_end);
    const safeServiceDinnerStart = normalizeTimeInput(
      (restaurantForm as any).service_dinner_start
    );
    const safeServiceDinnerEnd = normalizeTimeInput(
      (restaurantForm as any).service_dinner_end
    );
    const safeGoogleReviewUrl = String((restaurantForm as any).google_review_url || "").trim();
    const safeRestaurantDisplayName = String(
      (restaurantForm as any).restaurant_name || restaurantForm.name || ""
    ).trim();
    const safeShowRestaurantNameOnClient = toBoolean(
      (restaurantForm as any).show_restaurant_name_on_client,
      toBoolean(parseObjectRecord((restaurant as any)?.table_config).show_restaurant_name_on_client, true)
    );
    const safeRestaurantAddress = String((restaurantForm as any).address || (restaurantForm as any).adresse || "").trim();
    const safeCustomLegalNotice = String((restaurantForm as any).custom_legal_notice || "").trim();
    const safeInstagramUrl = String((restaurantForm as any).instagram_url || "").trim();
    const safeSnapchatUrl = String((restaurantForm as any).snapchat_url || "").trim();
    const safeFacebookUrl = String((restaurantForm as any).facebook_url || "").trim();
    const safeXUrl = String((restaurantForm as any).x_url || "").trim();
    const safeWebsiteUrl = String((restaurantForm as any).website_url || "").trim();
    const safeWelcomePopupEnabled = toBoolean((restaurantForm as any).welcome_popup_enabled, false);
    const safeWelcomePopupType = normalizeWelcomePopupType((restaurantForm as any).welcome_popup_type);
    const safeWelcomePopupContentText = String((restaurantForm as any).welcome_popup_content_text || "").trim();
    const safeWelcomePopupImageUrl = String((restaurantForm as any).welcome_popup_image_url || "").trim();
    const safeShowSocialOnReceipt = toBoolean(
      (restaurantForm as any).show_social_on_receipt,
      toBoolean(parseObjectRecord((restaurant as any)?.table_config).show_social_on_digital_receipt, false)
    );
    const safeDensityStyle = normalizeDensityStyle(
      (restaurantForm as any).card_density ??
        (restaurantForm as any).density_style ??
        (restaurant as any)?.card_density ??
        parseObjectRecord((restaurant as any)?.table_config).density_style ??
        parseObjectRecord((restaurant as any)?.table_config).card_density ??
        "spacious"
    );
    const safeBgOpacity = normalizeBackgroundOpacity(
      (restaurantForm as any).bg_opacity ??
        (restaurant as any)?.bg_opacity ??
        parseObjectRecord((restaurant as any)?.table_config).bg_opacity,
      1
    );
    const safeFontFamily = normalizeManagerFontFamily(restaurantForm.font_family);
    const safeMenuLayout = normalizeMenuLayout((restaurantForm as any).menu_layout);
    const safeCardLayout = normalizeCardLayout((restaurantForm as any).card_layout);
    const safeCardStyle = normalizeCardStyle((restaurantForm as any).card_style);
    const currentTableConfig = parseObjectRecord((restaurant as any)?.table_config);
    const safeCardRadiusRaw =
      (restaurantForm as any).card_radius ??
      (restaurant as any)?.card_radius ??
      currentTableConfig.card_radius;
    const safeCardRadiusNumber = Number(safeCardRadiusRaw);
    const safeCardRadius =
      Number.isFinite(safeCardRadiusNumber) && safeCardRadiusNumber >= 0
        ? Math.round(safeCardRadiusNumber)
        : null;
    const safeCardShadow = String(
      (restaurantForm as any).card_shadow ??
      (restaurant as any)?.card_shadow ??
      currentTableConfig.card_shadow ??
      ""
    ).trim();
    const safeCardBorder = String(
      (restaurantForm as any).card_border ??
      (restaurant as any)?.card_border ??
      currentTableConfig.card_border ??
      ""
    ).trim();
    const currentCardLayoutObject = parseObjectRecord((restaurant as any)?.card_layout);
    const currentTableCardLayoutObject = parseObjectRecord(currentTableConfig.card_layout);
    const hasAdvancedCardDesignerLayoutInRestaurant =
      Object.keys(currentCardLayoutObject).length > 0 &&
      (Object.prototype.hasOwnProperty.call(currentCardLayoutObject, "elements") ||
        Object.prototype.hasOwnProperty.call(currentCardLayoutObject, "decorations"));
    const hasAdvancedCardDesignerLayoutInTableConfig =
      Object.keys(currentTableCardLayoutObject).length > 0 &&
      (Object.prototype.hasOwnProperty.call(currentTableCardLayoutObject, "elements") ||
        Object.prototype.hasOwnProperty.call(currentTableCardLayoutObject, "decorations"));
    const hasAdvancedCardDesignerLayout =
      hasAdvancedCardDesignerLayoutInRestaurant || hasAdvancedCardDesignerLayoutInTableConfig;
    const effectiveCardDesignerLayoutObject = hasAdvancedCardDesignerLayoutInRestaurant
      ? currentCardLayoutObject
      : currentTableCardLayoutObject;
    const layoutObj: Record<string, unknown> = hasAdvancedCardDesignerLayout
      ? { ...effectiveCardDesignerLayoutObject }
      : { layoutToken: safeCardLayout };
    layoutObj.layoutToken = safeCardLayout;
    layoutObj.layout_token = safeCardLayout;
    console.log(`JSON INTERNE SYNCHRONISÉ : ${safeCardLayout === "default" ? "standard" : safeCardLayout}`);
    const finalCardLayout = JSON.stringify(layoutObj);
    const cardLayoutPayloadForRestaurant = hasAdvancedCardDesignerLayout
      ? finalCardLayout
      : safeCardLayout;
    const cardLayoutPayloadForTableConfig = hasAdvancedCardDesignerLayout
      ? finalCardLayout
      : safeCardLayout;
    console.log("[manager.save] style validation", {
      font_family: safeFontFamily,
      font_family_is_string: typeof safeFontFamily === "string",
      font_family_is_known_option: (MENU_FONT_OPTIONS as readonly string[]).includes(safeFontFamily),
      card_density: safeDensityStyle,
      card_density_is_string: typeof safeDensityStyle === "string",
      card_density_is_known_option: ["compact", "spacious"].includes(safeDensityStyle),
      card_style: safeCardStyle,
      card_style_is_string: typeof safeCardStyle === "string",
      card_style_is_known_option: ["rounded", "sharp"].includes(safeCardStyle),
    });
    const safeSmtpUser = String(restaurantForm.smtp_user || "").trim();
    const safeSmtpPassword = String(restaurantForm.smtp_password || "").trim();
    const safeEmailSubject = String(restaurantForm.email_subject || "").trim() || "Votre ticket de caisse - [Nom du Resto]";
    const safeEmailBodyHeader =
      String(restaurantForm.email_body_header || "").trim() || "Merci de votre visite ! Voici votre ticket :";
    const safeEmailFooter = String(restaurantForm.email_footer || "").trim() || "À bientôt !";
    const nextCookingTranslations = Object.fromEntries(
      COOKING_TRANSLATION_ORDER.map((key: any) => {
        const row = cookingTranslations[key] || {};
        const cleaned = Object.fromEntries(
          Object.entries(row)
            .map(([lang, label]) => [normalizeLanguageKey(lang), String(label || "").trim()])
            .filter(([lang, label]) => Boolean(lang) && Boolean(label))
        );
        return [key, { ...DEFAULT_COOKING_TRANSLATIONS[key], ...cleaned }];
      })
    );
    const nextTableConfig = {
      ...currentTableConfig,
      restaurant_name: safeRestaurantDisplayName || safeName,
      show_restaurant_name_on_client: safeShowRestaurantNameOnClient,
      custom_legal_notice: safeCustomLegalNotice || null,
      font_family: safeFontFamily,
      menu_layout: safeMenuLayout,
      card_layout: cardLayoutPayloadForTableConfig,
      card_designer: hasAdvancedCardDesignerLayout
        ? layoutObj
        : currentTableConfig.card_designer,
      card_style: safeCardStyle,
      card_radius: safeCardRadius,
      card_shadow: safeCardShadow || null,
      card_border: safeCardBorder || null,
      card_density: safeDensityStyle,
      density_style: safeDensityStyle,
      bg_opacity: safeBgOpacity,
      card_transparent: safeCardTransparent,
      card_bg_opacity: safeCardBgOpacity,
      text_color: safeTextColor,
      global_text_color: safeTextColor,
      card_text_color: safeCardTextColor,
      quick_add_to_cart_enabled: safeQuickAddToCartEnabled,
      category_drawer_enabled: safeCategoryDrawerEnabled,
      keep_suggestions_on_top: safeKeepSuggestionsOnTop,
      search_enabled: searchBarEnabled,
      service_lunch_start: safeServiceLunchStart || null,
      service_lunch_end: safeServiceLunchEnd || null,
      service_dinner_start: safeServiceDinnerStart || null,
      service_dinner_end: safeServiceDinnerEnd || null,
      social_links: {
        instagram: safeInstagramUrl || null,
        snapchat: safeSnapchatUrl || null,
        facebook: safeFacebookUrl || null,
        x: safeXUrl || null,
        website: safeWebsiteUrl || null,
      },
      show_social_on_digital_receipt: safeShowSocialOnReceipt,
      auto_print_kitchen: autoPrintKitchen,
      auto_print: autoPrintKitchen,
      cooking_translations: nextCookingTranslations,
      allergen_library: allergenLibrary
        .map((row: any) => ({
          id: String(row.id || createLocalId()),
          name_fr: String(row.name_fr || "").trim(),
          names_i18n: Object.fromEntries(
            Object.entries(row.names_i18n || {})
              .map(([lang, label]) => [normalizeLanguageKey(lang), String(label || "").trim()])
              .filter(([lang, label]) => Boolean(lang) && Boolean(label))
          ),
        }))
        .filter((row: any) => row.name_fr),
    };
    const restaurantPayloadBase: Record<string, unknown> = {
      name: safeName,
      address: safeRestaurantAddress || null,
      custom_legal_notice: safeCustomLegalNotice || null,
      google_review_url: safeGoogleReviewUrl || null,
      primary_color: safePrimaryColor,
      text_color: safeTextColor,
      card_bg_color: safeCardBgColor,
      font_family: safeFontFamily,
      is_order_disabled: consultationModeEnabled,
      auto_print_kitchen: autoPrintKitchen,
      table_config: nextTableConfig,
      menu_layout: safeMenuLayout,
      card_layout: cardLayoutPayloadForRestaurant,
      card_style: safeCardStyle,
      card_radius: safeCardRadius,
      card_shadow: safeCardShadow || null,
      card_border: safeCardBorder || null,
      card_density: safeDensityStyle,
      bg_opacity: safeBgOpacity,
      smtp_user: safeSmtpUser || null,
      email_subject: safeEmailSubject,
      email_body_header: safeEmailBodyHeader,
      email_footer: safeEmailFooter,
      welcome_popup_enabled: safeWelcomePopupEnabled,
      welcome_popup_type: safeWelcomePopupType,
      welcome_popup_content_text: safeWelcomePopupContentText || null,
      welcome_popup_image_url: safeWelcomePopupImageUrl || null,
    };
    console.log("[manager.save] style payload", {
      font_family: restaurantPayloadBase.font_family,
      card_style: restaurantPayloadBase.card_style,
      card_density: restaurantPayloadBase.card_density,
    });
    console.log("[manager.save] style payload types", {
      font_family: typeof restaurantPayloadBase.font_family,
      card_style: typeof restaurantPayloadBase.card_style,
      card_density: typeof restaurantPayloadBase.card_density,
    });
    (["font_family", "card_style", "card_density"] as const).forEach((key: any) => {
      if (!Object.prototype.hasOwnProperty.call(restaurantPayloadBase, key)) {
        console.error(`[manager.save] Cl? de style absente du payload: ${key}`);
      }
    });
    if (safeSmtpPassword) {
      restaurantPayloadBase.smtp_password = safeSmtpPassword;
    }

    const brandingPayloadAttempts: Array<Record<string, unknown>> = [
      {
        logo_url: safeLogo,
        banner_image_url: safeBannerImage || null,
        background_url: safeBackground,
        primary_color: safePrimaryColor,
      },
      {
        logo_url: safeLogo,
        banner_url: safeBannerImage || null,
        background_image_url: safeBackground,
        primary_color: safePrimaryColor,
      },
      {
        logo_url: safeLogo,
        banner_image_url: safeBannerImage || null,
        background_image_url: safeBackground,
        primary_color: safePrimaryColor,
      },
      {
        logo_url: safeLogo,
        banner_url: safeBannerImage || null,
        background_url: safeBackground,
        primary_color: safePrimaryColor,
      },
    ];
    const restaurantPayloadVariants: Array<Record<string, unknown>> = [
      restaurantPayloadBase,
      Object.fromEntries(Object.entries(restaurantPayloadBase).filter(([key]) => key !== "address")),
      Object.fromEntries(Object.entries(restaurantPayloadBase).filter(([key]) => key !== "text_color")),
      Object.fromEntries(Object.entries(restaurantPayloadBase).filter(([key]) => key !== "bg_opacity")),
      Object.fromEntries(
        Object.entries(restaurantPayloadBase).filter(([key]) => key !== "text_color" && key !== "bg_opacity")
      ),
    ];
    let saveErrorMessage = "";
    let saved = false;
    let confirmedRestaurantRow: Record<string, unknown> | null = null;
    let superAdminAccessToken = "";
    if (isSuperAdminSession && impersonateMode) {
      const sessionResult = await supabase.auth.getSession();
      superAdminAccessToken = String(sessionResult.data.session?.access_token || "").trim();
      if (!superAdminAccessToken) {
        alert("Session super-admin invalide. Veuillez vous reconnecter.");
        return;
      }
    }
    for (const payloadBase of restaurantPayloadVariants) {
      for (const brandingPayload of brandingPayloadAttempts) {
        const payload = { ...payloadBase, ...brandingPayload };
        const restaurantData = payload;
        false && console.log("TRACE PAYLOAD:", restaurantData);
        console.log("Données envoyées :", payload);
        let updateError: { code?: string; message?: string } | null = null;
        if (isSuperAdminSession && impersonateMode) {
          const updateResponse = await fetch("/api/super-admin/restaurants", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${superAdminAccessToken}`,
            },
            body: JSON.stringify({
              restaurantId: String(restaurant.id || "").trim(),
              restaurantPayload: payload,
            }),
          });
          const updatePayload = (await updateResponse.json().catch(() => ({}))) as {
            error?: string;
            restaurant?: Record<string, unknown>;
          };
          if (!updateResponse.ok) {
            updateError = {
              message: String(updatePayload.error || "Erreur mise à jour super-admin."),
            };
          } else if (updatePayload.restaurant && typeof updatePayload.restaurant === "object") {
            confirmedRestaurantRow = updatePayload.restaurant;
          }
        } else {
          const updateResult = await supabase
            .from("restaurants")
            .update(payload as never)
            .eq("id", restaurant.id)
            .select("*")
            .maybeSingle();
          updateError = updateResult.error as { code?: string; message?: string } | null;
          if (!updateError && updateResult.data && typeof updateResult.data === "object") {
            confirmedRestaurantRow = updateResult.data as any;
          }
        }

        if (!updateError) {
          saved = true;
          break;
        }

        const errorCode = String(updateError.code || "");
        const missingColumn = extractMissingColumnName(updateError.message);
        if (missingColumn) {
          console.error(`[manager.save] Colonne manquante détectée: ${missingColumn}`, {
            code: updateError.code,
            message: updateError.message,
            payloadKeys: Object.keys(payload),
          });
          saveErrorMessage = `Colonne manquante dans restaurants: ${missingColumn}.`;
          if (errorCode === "42703") {
            continue;
          }
        }
        if (errorCode === "42703") {
          console.error("[manager.save] Colonne manquante (42703)", {
            message: updateError.message,
            payloadKeys: Object.keys(payload),
          });
          saveErrorMessage = updateError.message || "Colonne manquante dans restaurants.";
          continue;
        }
        saveErrorMessage = updateError.message || "Erreur inconnue";
        console.error("[manager.save] Erreur update restaurants", {
          code: updateError.code,
          message: updateError.message,
          payloadKeys: Object.keys(payload),
        });
        break;
      }
      if (saved) break;
    }
    if (!saved) {
      const sqlHint =
        "Colonnes manquantes possibles: logo_url, banner_url, background_image_url, primary_color, text_color, card_style, card_density, font_family, bg_opacity.";
      alert(`Erreur sauvegarde restaurant: ${saveErrorMessage || sqlHint}`);
      return;
    }

    const emailPayload: Record<string, unknown> = {
      smtp_user: safeSmtpUser || null,
      email_subject: safeEmailSubject,
      email_body_header: safeEmailBodyHeader,
      email_footer: safeEmailFooter,
    };
    if (safeSmtpPassword) {
      emailPayload.smtp_password = safeSmtpPassword;
    }

    if (isSuperAdminSession && impersonateMode) {
      const emailUpdateResponse = await fetch("/api/super-admin/restaurants", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminAccessToken}`,
        },
        body: JSON.stringify({
          restaurantId: String(restaurant.id || "").trim(),
          restaurantPayload: emailPayload,
        }),
      });
      const emailUpdatePayload = (await emailUpdateResponse.json().catch(() => ({}))) as {
        error?: string;
        restaurant?: Record<string, unknown>;
      };
      if (!emailUpdateResponse.ok) {
        alert(String(emailUpdatePayload.error || "Impossible de sauvegarder la configuration email."));
        return;
      }
      if (emailUpdatePayload.restaurant && typeof emailUpdatePayload.restaurant === "object") {
        confirmedRestaurantRow = emailUpdatePayload.restaurant;
      }
    } else {
      const emailUpdateResult = await supabase
        .from("restaurants")
        .update(emailPayload as never)
        .eq("id", restaurant.id)
        .select("*")
        .maybeSingle();
      if (emailUpdateResult.error) {
        console.error("[manager.save] Erreur update email restaurants", emailUpdateResult.error);
        alert(emailUpdateResult.error.message || "Impossible de sauvegarder la configuration email.");
        return;
      }
      if (emailUpdateResult.data && typeof emailUpdateResult.data === "object") {
        confirmedRestaurantRow = emailUpdateResult.data as any;
      }
    }

    const persistedErrorMessage = await persistDisplaySettings(
      showCaloriesClient,
      enabledLangs,
      languageLabels,
      {
        heroEnabled,
        heroBadgeType,
        consultationMode: consultationModeEnabled,
        searchEnabled: searchBarEnabled,
      },
      totalTables,
      nextTableConfig,
      restaurant.id
    );
    if (persistedErrorMessage) {
      alert(persistedErrorMessage);
      return;
    }
    try {
      if (hasRestaurantLanguagesTableRef.current) {
        const langRows = Array.from(new Set(enabledLangs))
          .map((code, index) => ({
            restaurant_id: restaurant.id,
            code,
            label: String(languageLabels[code] || DEFAULT_LANGUAGE_LABELS[code] || code.toUpperCase()).trim(),
            is_active: true,
            sort_order: index,
          }))
          .filter((row: any) => row.code && row.label);
        const deleteResult = await supabase.from("restaurant_languages").delete().eq("restaurant_id", restaurant.id);
        if (deleteResult.error) {
          if (isMissingTableError(deleteResult.error)) {
            hasRestaurantLanguagesTableRef.current = false;
          } else if (!["42P01", "42703"].includes(String((deleteResult.error as { code?: string })?.code || ""))) {
            console.warn("Suppression restaurant_languages échouée:", deleteResult.error);
          }
        }
        if (langRows.length > 0 && hasRestaurantLanguagesTableRef.current) {
          let insertResult = await supabase.from("restaurant_languages").insert(langRows as never);
          if (insertResult.error && hasMissingColumnError(insertResult.error)) {
            const fallbackRows = langRows.map((row: any) => ({
              restaurant_id: row.restaurant_id,
              language_code: row.code,
              language_name: row.label,
              is_active: row.is_active,
              sort_order: row.sort_order,
            }));
            insertResult = await supabase.from("restaurant_languages").insert(fallbackRows as never);
          }
          if (insertResult.error) {
            if (isMissingTableError(insertResult.error)) {
              hasRestaurantLanguagesTableRef.current = false;
            } else if (
              !["42P01", "42703"].includes(String((insertResult.error as { code?: string })?.code || ""))
            ) {
              console.warn("Insertion restaurant_languages échouée:", insertResult.error);
            }
          }
        }
      }
    } catch (langTableError) {
      console.warn("Sync restaurant_languages ignor?:", langTableError);
    }
    writeLocalClientOrderingDisabled(consultationModeEnabled);
    if (!confirmedRestaurantRow) {
      const rowResult = await supabase.from("restaurants").select("*").eq("id", restaurant.id).maybeSingle();
      if (!rowResult.error && rowResult.data && typeof rowResult.data === "object") {
        confirmedRestaurantRow = rowResult.data as any;
      }
    }
    if (confirmedRestaurantRow) {
      console.log("[manager.save] styles confirmés en base", {
        font_family: confirmedRestaurantRow.font_family,
        card_density: confirmedRestaurantRow.card_density,
        card_style: confirmedRestaurantRow.card_style,
      });
    } else {
      console.warn("[manager.save] impossible de confirmer la ligne mise à jour immédiatement; rechargement forcé.");
    }
    await fetchRestaurant();

    // Refresh related entities after restaurant settings are reloaded from DB.
    await Promise.all([fetchCategories(), fetchSubCategories(), fetchSidesLibrary(), fetchDishes(), fetchAllergenLibrary()]);
    setRestaurantSaveStatus("success");
    restaurantSaveCompleted = true;
    window.setTimeout(() => setRestaurantSaveStatus("idle"), 1400);
  } catch (error: any) {
    console.error("Unexpected restaurant save error:", error);
    alert("Erreur: " + (error?.message || "Erreur inconnue"));
  } finally {
    if (!restaurantSaveCompleted) {
      setRestaurantSaveStatus("idle");
    }
  }
};


const handleFormulaImageUpload = async (file: File) => {
  const localPreview = URL.createObjectURL(file);
  setFormulaImagePreviewUrl(localPreview);
  setIsUploadingFormulaImage(true);

  try {
    const now = Date.now();
    const rawName = sanitizeFileName(file.name || `formula-${now}.jpg`);
    const filePath = `formulas/${now}-${rawName}`;

    const { error: uploadError } = await supabase.storage
      .from(DISH_IMAGES_BUCKET)
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      alert("Erreur upload image: " + uploadError.message);
      return;
    }

    const { data: publicData } = supabase.storage.from(DISH_IMAGES_BUCKET).getPublicUrl(filePath);
    const publicUrl = publicData?.publicUrl || "";
    if (!publicUrl) {
      alert("Impossible de récupérer l'URL publique de l'image.");
      return;
    }

    setFormData((prev: any) => ({ ...prev, formula_image_url: publicUrl }));
    setFormulaImage(publicUrl);
    setFormulaImagePreviewUrl(publicUrl);
  } finally {
    setIsUploadingFormulaImage(false);
  }
};


const handleUpdateManagerPassword = async () => {
  setPasswordUpdateError("");
  setPasswordUpdateMessage("");
  const oldPassword = String(passwordForm.oldPassword || "");
  const newPassword = String(passwordForm.newPassword || "");
  const confirmPassword = String(passwordForm.confirmPassword || "");
  if (!oldPassword || !newPassword || !confirmPassword) {
    setPasswordUpdateError("Saisissez l'ancien mot de passe, puis le nouveau mot de passe et sa confirmation.");
    return;
  }
  if (newPassword.length < 8) {
    setPasswordUpdateError("Le mot de passe doit contenir au moins 8 caractères.");
    return;
  }
  if (newPassword !== confirmPassword) {
    setPasswordUpdateError("Les deux mots de passe ne correspondent pas.");
    return;
  }

  setPasswordUpdateLoading(true);
  if (!managerUserEmail) {
    setPasswordUpdateLoading(false);
    setPasswordUpdateError("Impossible de vérifier le compte connecté pour confirmer l'ancien mot de passe.");
    return;
  }

  const verifyPasswordResult = await supabase.auth.signInWithPassword({
    email: managerUserEmail,
    password: oldPassword,
  });
  if (verifyPasswordResult.error) {
    setPasswordUpdateLoading(false);
    setPasswordUpdateError("Ancien mot de passe incorrect.");
    return;
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    setPasswordUpdateLoading(false);
    setPasswordUpdateError(error.message || "Impossible de modifier le mot de passe.");
    return;
  }

  if (restaurant?.id) {
    const firstLoginUpdate = await supabase
      .from("restaurants")
      .update({ first_login: false } as never)
      .eq("id", restaurant.id);
    if (firstLoginUpdate.error) {
      setPasswordUpdateLoading(false);
      setPasswordUpdateError(firstLoginUpdate.error.message || "Mot de passe modifié, mais impossible de finaliser l'état first_login.");
      return;
    }
  }

  setPasswordUpdateLoading(false);
  setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
  setPasswordUpdateMessage("Mot de passe mis à jour.");
  setForceFirstLoginPasswordChange(false);
  setRestaurant((prev: any) =>
    prev
      ? ({
          ...(prev as any),
          first_login: false,
        } as any)
      : prev
  );
};


const handleToggleManagerOtp = async (nextValue: boolean) => {
  setManagerOtpError("");
  setManagerOtpMessage("");

  const restaurantId = String(restaurant?.id || scopedRestaurantId || "").trim();
  if (!restaurantId) {
    setManagerOtpError("Impossible d'identifier le restaurant pour mettre a jour la double securite.");
    return;
  }

  setManagerOtpLoading(true);
  const updateResult = await supabase
    .from("restaurants")
    .update({ otp_enabled: nextValue } as never)
    .eq("id", restaurantId);

  setManagerOtpLoading(false);
  if (updateResult.error) {
    if (hasMissingColumnError(updateResult.error, "otp_enabled")) {
      setManagerOtpError("La colonne restaurants.otp_enabled est absente. Executez le SQL add_restaurants_otp_enabled.sql.");
      return;
    }
    setManagerOtpError(updateResult.error.message || "Impossible de mettre a jour la double securite.");
    return;
  }

  setManagerOtpEnabled(nextValue);
  setManagerOtpMessage(nextValue ? "Double securite activee." : "Double securite desactivee.");
  setRestaurant((prev: any) =>
    prev
      ? ({
          ...(prev as any),
          otp_enabled: nextValue,
        } as any)
      : prev
  );
};


const handleManagerSignOut = async () => {
  await supabase.auth.signOut();
  router.replace("/login");
};


const handleMigrate = async () => {
  setMigrating(true);
  try {
    await migrateTranslationsToJsonb();
    alert("Migration des traductions terminée !");
  } catch (e) {
    console.error(e);
    alert("Erreur lors de la migration: " + String(e));
  }
  setMigrating(false);
};

  return {
    handleDeleteAllergen,
    handleSaveRestaurant,
    handleFormulaImageUpload,
    handleUpdateManagerPassword,
    handleToggleManagerOtp,
    handleManagerSignOut,
    handleMigrate,
  };
}
