// @ts-nocheck
export function useManagerRestaurantFetch(deps: Record<string, any>) {
  const {
    scopedRestaurantId,
    supabase,
    setIsRestaurantLoading,
    setIsSuperAdminSession,
    setManagerAccessError,
    setRestaurant,
    toLoggableSupabaseError,
    normalizeRestaurantId,
    impersonateMode,
    parseObjectRecord,
    normalizeDensityStyle,
    normalizeManagerFontFamily,
    normalizeBackgroundOpacity,
    normalizeCardStyle,
    normalizeHexColor,
    normalizeOpacityPercent,
    toBoolean,
    setManagerOtpEnabled,
    setManagerOtpError,
    setForceFirstLoginPasswordChange,
    parseCategoryConfig,
    parseAutoPrintSetting,
    setAutoPrintKitchen,
    setSearchBarEnabled,
    loadDisplaySettingsFromDb,
    setSubCategories,
    setCookingTranslations,
    parseCookingTranslations,
    parseAllergenLibrary,
    setAllergenLibrary,
    createDefaultAllergenLibrary,
    hasRestaurantLanguagesTableRef,
    hasMissingColumnError,
    isMissingTableError,
    setActiveLanguageCodes,
    setLanguageLabels,
    normalizeLanguageKey,
    DEFAULT_LANGUAGE_LABELS,
    setRestaurantForm,
    normalizeWelcomePopupType,
    resolveSupabasePublicUrl,
    RESTAURANT_BANNERS_BUCKET,
    normalizeMenuLayout,
    parseCardLayoutToken,
  } = deps;
  const fetchRestaurant = async () => {
    setIsRestaurantLoading(true);
    setIsSuperAdminSession(false);
    try {
      if (!scopedRestaurantId) {
        setManagerAccessError("Restaurant ID absent dans l'URL.");
        setRestaurant(null);
        return;
      }

      const authUserResponse = await supabase.auth.getUser();
      const authUserId = String(authUserResponse.data.user?.id || "").trim();
      if (!authUserId) {
        setManagerAccessError("Utilisateur non connect?. Veuillez vous reconnecter.");
        setRestaurant(null);
        return;
      }

      const sessionResult = await supabase.auth.getSession();
      const accessToken = String(sessionResult.data.session?.access_token || "").trim();
      let isSuperAdminSession = false;
      if (accessToken) {
        const contextResponse = await fetch("/api/auth/access-context", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (contextResponse.ok) {
          const contextPayload = (await contextResponse.json().catch(() => ({}))) as { isSuperAdmin?: boolean };
          isSuperAdminSession = Boolean(contextPayload.isSuperAdmin);
        }
      }
      setIsSuperAdminSession(isSuperAdminSession);

      let resolvedAccessMessage = "";
      let resolvedRestaurantId = scopedRestaurantId;
      let row: Record<string, unknown> | null = null;
      if (isSuperAdminSession) {
        const superAdminRestaurantResponse = await fetch(
          `/api/public/restaurant-config?restaurant_id=${encodeURIComponent(scopedRestaurantId)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );
        if (superAdminRestaurantResponse.ok) {
          const payload = (await superAdminRestaurantResponse.json().catch(() => ({}))) as {
            restaurant?: Record<string, unknown>;
          };
          if (payload.restaurant && typeof payload.restaurant === "object") {
            row = payload.restaurant;
          }
        }
        if (!row) {
          setManagerAccessError("Restaurant introuvable pour cet ID.");
          setRestaurant(null);
          return;
        }
      } else {
        const byScopedId = await supabase
          .from("restaurants")
          .select("*")
          .eq("id", scopedRestaurantId)
          .eq("owner_id", authUserId)
          .maybeSingle();

        if (byScopedId.error) {
          console.warn("Manager: erreur de lecture restaurant scoped:", toLoggableSupabaseError(byScopedId.error));
        }

        row = byScopedId.data as any | null;
        if (!row) {
          const byOwner = await supabase
            .from("restaurants")
            .select("*")
            .eq("owner_id", authUserId)
            .limit(1)
            .maybeSingle();

          if (byOwner.error || !byOwner.data) {
            setManagerAccessError(
              `Accès refusé (RLS). Vérifiez que restaurants.owner_id = ${authUserId} pour l'id ${scopedRestaurantId}.`
            );
            setRestaurant(null);
            return;
          }

          row = byOwner.data as any;
          if (!row) {
            setManagerAccessError(
              `Accès refusé (RLS). Vérifiez que restaurants.owner_id = ${authUserId} pour l'id ${scopedRestaurantId}.`
            );
            setRestaurant(null);
            return;
          }
          resolvedRestaurantId = normalizeRestaurantId(row.id);
          if (resolvedRestaurantId && resolvedRestaurantId !== scopedRestaurantId) {
            resolvedAccessMessage = `Aucune configuration trouvée pour l'id ${scopedRestaurantId}. Configuration du restaurant ${resolvedRestaurantId} chargée via owner_id.`;
          }
        }
      }

      const rowOwnerId = String(row.owner_id || "").trim();
      if (!isSuperAdminSession && rowOwnerId && rowOwnerId !== authUserId) {
        setManagerAccessError(
          `Accès refusé: owner_id (${rowOwnerId}) différent de l'utilisateur connect? (${authUserId}).`
        );
        setRestaurant(null);
        return;
      }
      if (resolvedAccessMessage) {
        setManagerAccessError(resolvedAccessMessage);
      } else if (isSuperAdminSession && impersonateMode) {
        setManagerAccessError("Mode super-admin impersonnalisé actif.");
      } else {
        setManagerAccessError("");
      }

      const tableConfig = parseObjectRecord((row as any).table_config);
      const settingsConfig = parseObjectRecord((row as any).settings);
      const resolvedDensityStyle = normalizeDensityStyle(
        (row as any).card_density ??
          (row as any).density_style ??
          tableConfig.card_density ??
          tableConfig.density_style ??
          "spacious"
      );
      const resolvedFontFamily = normalizeManagerFontFamily(
        (row as any).font_family ?? tableConfig.font_family
      );
      const resolvedBgOpacity = normalizeBackgroundOpacity(
        (row as any).bg_opacity ?? tableConfig.bg_opacity,
        1
      );
      const resolvedCardStyle = normalizeCardStyle(
        (row as any).card_style ?? tableConfig.card_style
      );
      const hydratedRestaurant = {
        ...row,
        name: String(row.name ?? "").trim(),
        otp_enabled: toBoolean((row as any).otp_enabled, false),
        logo_url: String(row.logo_url || "").trim(),
        background_url:
          String(row.background_url || "").trim() ||
          String(row.background_image_url || "").trim() ||
          String(row.bg_image_url || "").trim(),
        text_color: normalizeHexColor(
          row.text_color ?? parseObjectRecord((row as any).table_config).text_color,
          "#111111"
        ),
        card_bg_color: normalizeHexColor(row.card_bg_color, "#FFFFFF"),
        card_bg_opacity: normalizeOpacityPercent(
          row.card_bg_opacity ?? parseObjectRecord((row as any).table_config).card_bg_opacity,
          toBoolean(
            row.card_transparent ??
              parseObjectRecord((row as any).table_config).card_transparent ??
              parseObjectRecord((row as any).table_config).cards_transparent,
            false
          )
            ? 0
            : 100
        ),
        card_text_color: normalizeHexColor(
          row.card_text_color ?? parseObjectRecord((row as any).table_config).card_text_color,
          "#111111"
        ),
        card_transparent: toBoolean(
          row.card_transparent ??
            parseObjectRecord((row as any).table_config).card_transparent ??
            parseObjectRecord((row as any).table_config).cards_transparent,
          false
        ),
        font_family: resolvedFontFamily,
        menu_layout: normalizeMenuLayout((row as any).menu_layout),
        card_layout:
          parseCardLayoutToken((row as any).card_layout) ??
          parseCardLayoutToken((row as any).card_style) ??
          "default",
        card_style: resolvedCardStyle,
        card_density: resolvedDensityStyle,
        density_style: resolvedDensityStyle,
        bg_opacity: resolvedBgOpacity,
      };
      setRestaurant(hydratedRestaurant as Restaurant);
      setManagerOtpEnabled(toBoolean((row as any).otp_enabled, false));
      setManagerOtpError("");
      setForceFirstLoginPasswordChange(toBoolean((row as any).first_login, false));
      const socialLinks = parseObjectRecord(tableConfig.social_links);
      const customTagsRaw = Array.isArray(row.custom_tags) ? row.custom_tags : [];
      const parsed = parseCategoryConfig(customTagsRaw) as {
        categories: string[] | null;
        subCategories: Record<string, string[]> | null;
        rest: string[];
      };
        const directAutoPrint = (row as any).auto_print_kitchen ?? (row as any).auto_print;
        const nestedAutoPrint = (tableConfig as any).auto_print_kitchen ?? tableConfig.auto_print;
        setAutoPrintKitchen(Boolean(directAutoPrint ?? nestedAutoPrint ?? parseAutoPrintSetting(customTagsRaw)));
      const tableMarketing = parseObjectRecord(tableConfig.marketing);
      const tableMarketingOptions = parseObjectRecord(tableConfig.marketing_options);
      setSearchBarEnabled(
        toBoolean(
          tableConfig.search_enabled ??
            tableMarketing.search_enabled ??
            tableMarketingOptions.search_enabled,
          false
        )
      );
      await loadDisplaySettingsFromDb(String(row.id || "").trim() || resolvedRestaurantId || scopedRestaurantId);
      if (parsed.subCategories && typeof parsed.subCategories === "object") {
        setSubCategories(parsed.subCategories);
      }
      setCookingTranslations(parseCookingTranslations(tableConfig.cooking_translations));
      {
        const savedAllergenLibrary = parseAllergenLibrary(tableConfig.allergen_library);
        setAllergenLibrary(savedAllergenLibrary.length > 0 ? savedAllergenLibrary : createDefaultAllergenLibrary());
      }
      try {
        if (hasRestaurantLanguagesTableRef.current) {
          const restaurantId = String(row.id || scopedRestaurantId).trim();
          const langTablePrimary = await supabase
            .from("restaurant_languages")
            .select("code,label,is_active,sort_order")
            .eq("restaurant_id", restaurantId);
          const langTableFallback =
            langTablePrimary.error && hasMissingColumnError(langTablePrimary.error)
              ? await supabase
                  .from("restaurant_languages")
                  .select("language_code,language_name,is_active,sort_order")
                  .eq("restaurant_id", restaurantId)
              : null;
          const langTable: { data: unknown[] | null; error: unknown } = langTableFallback
            ? { data: (langTableFallback.data as unknown[] | null) ?? null, error: langTableFallback.error }
            : { data: (langTablePrimary.data as unknown[] | null) ?? null, error: langTablePrimary.error };
          if (langTable.error) {
            if (isMissingTableError(langTable.error)) {
              hasRestaurantLanguagesTableRef.current = false;
            }
          } else if (Array.isArray(langTable.data)) {
            const options = langTable.data
              .map((entry) => {
                const rowData = entry as Record<string, unknown>;
                const code = normalizeLanguageKey(
                  String(rowData.code || rowData.language_code || "").trim()
                );
                if (!code) return null;
                const label = String(
                  rowData.label || rowData.language_name || DEFAULT_LANGUAGE_LABELS[code] || code.toUpperCase()
                ).trim();
                return {
                  code,
                  label: label || code.toUpperCase(),
                };
              })
              .filter(Boolean) as Array<{ code: string; label: string }>;
            if (options.length > 0) {
              const normalizedCodes = Array.from(
                new Set(
                  options
                    .map((entry) => normalizeLanguageKey(entry.code))
                    .filter(Boolean)
                )
              );
              if (!normalizedCodes.includes("fr")) normalizedCodes.unshift("fr");
              setActiveLanguageCodes(normalizedCodes);
              setLanguageLabels(
                Object.fromEntries(
                  normalizedCodes.map((code) => {
                    const rowOption = options.find((entry) => normalizeLanguageKey(entry.code) === code);
                    return [code, String(rowOption?.label || DEFAULT_LANGUAGE_LABELS[code] || code.toUpperCase()).trim()];
                  })
                )
              );
            }
          }
        }
      } catch {
        // ignore, fall back to row/table_config values
      }

      setRestaurantForm({
        ...row,
        name: String(row.name ?? "").trim(),
        restaurant_name: String(
          tableConfig.restaurant_name ??
            settingsConfig.restaurant_name ??
            row.name ??
            ""
        ).trim(),
        show_restaurant_name_on_client: toBoolean(
          tableConfig.show_restaurant_name_on_client ??
            settingsConfig.show_restaurant_name_on_client,
          true
        ),
        custom_legal_notice: String(
          (row as any).custom_legal_notice ??
            tableConfig.custom_legal_notice ??
            settingsConfig.custom_legal_notice ??
            ""
        ).trim(),
        address: String((row as any).address || (row as any).adresse || "").trim(),
        logo_url: String(row.logo_url || "").trim(),
        banner_image_url: String(row.banner_image_url || row.banner_url || "").trim(),
        banner_url: String(row.banner_url || "").trim(),
        background_url:
          String(row.background_url || "").trim() ||
          String(row.background_image_url || "").trim() ||
          String(row.bg_image_url || "").trim() ||
          "",
        background_image_url:
          String(row.background_image_url || "").trim() ||
          String(row.background_url || "").trim() ||
          String(row.bg_image_url || "").trim() ||
          "",
        welcome_popup_enabled: toBoolean((row as any).welcome_popup_enabled, false),
        welcome_popup_type: normalizeWelcomePopupType((row as any).welcome_popup_type),
        welcome_popup_content_text: String((row as any).welcome_popup_content_text || "").trim(),
        welcome_popup_image_url: resolveSupabasePublicUrl((row as any).welcome_popup_image_url, RESTAURANT_BANNERS_BUCKET),
        google_review_url: String(row.google_review_url || "").trim(),
        instagram_url: String(row.instagram_url || socialLinks.instagram || "").trim(),
        snapchat_url: String(row.snapchat_url || socialLinks.snapchat || "").trim(),
        facebook_url: String(row.facebook_url || socialLinks.facebook || "").trim(),
        x_url: String(row.x_url || socialLinks.x || "").trim(),
        website_url: String(row.website_url || socialLinks.website || "").trim(),
        show_social_on_receipt: toBoolean(
          row.show_social_on_receipt ?? tableConfig.show_social_on_digital_receipt,
          false
        ),
        primary_color: normalizeHexColor(row.primary_color, "#FFFFFF"),
        text_color: normalizeHexColor(
          row.text_color ?? tableConfig.text_color ?? tableConfig.global_text_color,
          "#111111"
        ),
        card_bg_color: normalizeHexColor(row.card_bg_color, "#FFFFFF"),
        card_bg_opacity: normalizeOpacityPercent(
          row.card_bg_opacity ?? tableConfig.card_bg_opacity,
          toBoolean(row.card_transparent ?? tableConfig.card_transparent ?? tableConfig.cards_transparent, false) ? 0 : 100
        ),
        card_text_color: normalizeHexColor(row.card_text_color ?? tableConfig.card_text_color, "#111111"),
        card_transparent: toBoolean(row.card_transparent ?? tableConfig.card_transparent ?? tableConfig.cards_transparent, false),
        quick_add_to_cart_enabled: toBoolean(
          tableConfig.quick_add_to_cart_enabled ?? tableConfig.quick_add_enabled,
          false
        ),
        font_family: resolvedFontFamily,
        card_density: resolvedDensityStyle,
        density_style: resolvedDensityStyle,
        bg_opacity: resolvedBgOpacity,
        menu_layout: normalizeMenuLayout(tableConfig.menu_layout ?? hydratedRestaurant.menu_layout),
        card_layout:
          parseCardLayoutToken(tableConfig.card_layout) ??
          parseCardLayoutToken(hydratedRestaurant.card_layout) ??
          parseCardLayoutToken(hydratedRestaurant.card_style) ??
          "default",
        card_style: resolvedCardStyle,
        category_drawer_enabled: toBoolean(
          tableConfig.category_drawer_enabled ?? tableConfig.show_category_drawer,
          false
        ),
        keep_suggestions_on_top: toBoolean(
          tableConfig.keep_suggestions_on_top ?? tableConfig.pin_suggestions,
          false
        ),
        service_lunch_start: String(tableConfig.service_lunch_start || tableConfig.lunch_start || "").trim(),
        service_lunch_end: String(tableConfig.service_lunch_end || tableConfig.lunch_end || "").trim(),
        service_dinner_start: String(tableConfig.service_dinner_start || tableConfig.dinner_start || "").trim(),
        service_dinner_end: String(tableConfig.service_dinner_end || tableConfig.dinner_end || "").trim(),
        smtp_user: String(row.smtp_user || ""),
        smtp_password: "",
        email_subject: String(row.email_subject || "Votre ticket de caisse - [Nom du Resto]"),
        email_body_header: String(row.email_body_header || "Merci de votre visite ! Voici votre ticket :"),
        email_footer: String(row.email_footer || "? bientôt !"),
      });
    } catch (error) {
      console.error("Manager: chargement configuration restaurant impossible:", error);
      setRestaurant(null);
      setManagerAccessError("Impossible de charger la configuration du restaurant.");
    } finally {
      setIsRestaurantLoading(false);
    }
  };
  return { fetchRestaurant };
}

