import { supabase } from "../../lib/supabase";

export function useManagerMenuCrud(deps: Record<string, any>) {
  const {
    scopedRestaurantId,
    newSubCategory,
    newSubCategoryI18n,
    activeLanguageCodes,
    buildI18nToken,
    editingSubCategoryId,
    setNewSubCategory,
    setNewSubCategoryI18n,
    setEditingSubCategoryId,
    fetchSubCategories,
    categoryForm,
    setCategorySaveStatus,
    categoryFormI18n,
    editingCategoryId,
    normalizeCategoryDestination,
    normalizeSortOrder,
    fetchCategories,
    setCategoryForm,
    setCategoryFormI18n,
    setShowCategoryModal,
    setEditingCategoryId,
    setCategories,
    setSubCategoryRows,
    newSide,
    setNewSide,
    newSideI18n,
    setNewSideI18n,
    fetchSidesLibrary,
    setSideSaveStatus,
    parseI18nToken,
    setEditingSideId,
    setSideForm,
    setSideFormI18n,
    setShowSideModal,
    sideForm,
    sideFormI18n,
    editingSideId,
    dishExtraDraft,
    setDishExtraDraft,
    setFormData,
    editingExtraId,
    setEditingExtraId,
    editingExtraOriginKey,
    setEditingExtraOriginKey,
    getExtraKey,
    createLocalId,
    setExtrasTouched,
    setFormulaSupplementsSaveStatus,
    productOptionDraft,
    setProductOptionDraft,
    normalizeLanguageKey,
    normalizeText,
    editingProductOptionId,
    setEditingProductOptionId,
  } = deps;

  const handleCreateSubCategory = async () => {
    if (!scopedRestaurantId) {
      alert("Restaurant non defini dans l'URL.");
      return;
    }

    const selectedCategoryId = String(newSubCategory.category_id || "").trim();
    const nameFr = String(newSubCategory.name_fr || "").trim();
    const subCategoryI18n = Object.fromEntries(
      activeLanguageCodes
        .filter((code: string) => code !== "fr")
        .map((code: string) => [code, String(newSubCategoryI18n[code] || "").trim()])
    ) as Record<string, string>;
    const payload = {
      category_id: selectedCategoryId,
      restaurant_id: scopedRestaurantId,
      name_fr: nameFr,
      name_en: buildI18nToken(subCategoryI18n),
      name_es: (subCategoryI18n.es || "").trim() || null,
      name_de: (subCategoryI18n.de || "").trim() || null,
    };

    if (!selectedCategoryId || !nameFr) {
      alert("Categorie et nom FR obligatoires");
      return;
    }

    let error: { message?: string; code?: string } | null = null;
    if (editingSubCategoryId) {
      const updateResult = await supabase
        .from("subcategories")
        .update(payload)
        .eq("id", editingSubCategoryId)
        .eq("restaurant_id", scopedRestaurantId);
      error = updateResult.error as { message?: string; code?: string } | null;
      if (error && String(error.code || "") === "42703") {
        const legacyUpdate = await supabase
          .from("subcategories")
          .update(payload)
          .eq("id", editingSubCategoryId)
          .eq("restaurant_id", scopedRestaurantId);
        error = legacyUpdate.error as { message?: string; code?: string } | null;
      }
    } else {
      const insertResult = await supabase.from("subcategories").insert([payload]);
      error = insertResult.error as { message?: string; code?: string } | null;
      if (error && String(error.code || "") === "42703") {
        const legacyPayload = {
          category_id: selectedCategoryId,
          restaurant_id: scopedRestaurantId,
          name_fr: nameFr,
          name_en: buildI18nToken(subCategoryI18n),
          name_es: (subCategoryI18n.es || "").trim() || null,
          name_de: (subCategoryI18n.de || "").trim() || null,
        };
        const legacyInsert = await supabase.from("subcategories").insert([legacyPayload]);
        error = legacyInsert.error as { message?: string; code?: string } | null;
      }
    }
    if (error) {
      alert(error.message);
      return;
    }
    setNewSubCategory({ category_id: "", name_fr: "", name_en: "", name_es: "", name_de: "" });
    setNewSubCategoryI18n({});
    setEditingSubCategoryId(null);
    fetchSubCategories();
  };

  const handleCreateCategory = async () => {
    if (!scopedRestaurantId) {
      alert("Restaurant non defini dans l'URL.");
      return;
    }

    if (!categoryForm.name_fr.trim()) {
      alert("Nom FR obligatoire");
      return;
    }
    setCategorySaveStatus("saving");
    const categoryI18n = Object.fromEntries(
      activeLanguageCodes
        .filter((code: string) => code !== "fr")
        .map((code: string) => [code, String(categoryFormI18n[code] || "").trim()])
    ) as Record<string, string>;
    const payload = {
      restaurant_id: scopedRestaurantId,
      name_fr: categoryForm.name_fr.trim(),
      name_en: buildI18nToken(categoryI18n),
      name_es: (categoryI18n.es || "").trim() || null,
      name_de: (categoryI18n.de || "").trim() || null,
      destination: normalizeCategoryDestination(categoryForm.destination),
      sort_order: normalizeSortOrder(categoryForm.sort_order),
    };
    let error: { message?: string; code?: string } | null = null;
    if (editingCategoryId) {
      const updateResult = await supabase
        .from("categories")
        .update(payload)
        .eq("id", editingCategoryId)
        .eq("restaurant_id", scopedRestaurantId);
      error = updateResult.error as { message?: string; code?: string } | null;
      if (error && String(error.code || "") === "42703") {
        const legacyUpdate = await supabase
          .from("categories")
          .update(payload)
          .eq("id", editingCategoryId)
          .eq("restaurant_id", scopedRestaurantId);
        error = legacyUpdate.error as { message?: string; code?: string } | null;
      }
    } else {
      const insertResult = await supabase.from("categories").insert([payload]);
      error = insertResult.error as { message?: string; code?: string } | null;
      if (error && String(error.code || "") === "42703") {
        const legacyPayload = {
          restaurant_id: scopedRestaurantId,
          name_fr: categoryForm.name_fr.trim(),
          name_en: buildI18nToken(categoryI18n),
          name_es: (categoryI18n.es || "").trim() || null,
          name_de: (categoryI18n.de || "").trim() || null,
          destination: normalizeCategoryDestination(categoryForm.destination),
          sort_order: normalizeSortOrder(categoryForm.sort_order),
        };
        const legacyInsert = await supabase.from("categories").insert([legacyPayload]);
        error = legacyInsert.error as { message?: string; code?: string } | null;
      }
    }
    if (error) {
      alert(error.message);
      setCategorySaveStatus("idle");
      return;
    }
    await fetchCategories();
    setCategorySaveStatus("success");
    window.setTimeout(() => {
      setCategoryForm({ name_fr: "", name_en: "", name_es: "", name_de: "", destination: "cuisine", sort_order: "1" });
      setCategoryFormI18n({});
      setEditingCategoryId(null);
      setShowCategoryModal(false);
      setCategorySaveStatus("idle");
    }, 900);
  };

  const handleDeleteCategory = async (id: string | number) => {
    if (!scopedRestaurantId) return;

    let { error } = await supabase.from("categories").delete().eq("id", id).eq("restaurant_id", scopedRestaurantId);
    if (error && String((error as { code?: string })?.code || "") === "42703") {
      const legacyDelete = await supabase.from("categories").delete().eq("id", id).eq("restaurant_id", scopedRestaurantId);
      error = legacyDelete.error;
    }
    if (error) {
      alert(error.message);
      return;
    }
    setCategories((prev: any[]) => prev.filter((category) => category.id !== id));
    setSubCategoryRows((prev: any[]) => prev.filter((sub) => String(sub.category_id) !== String(id)));
    fetchSubCategories();
  };

  const handleUpdateCategoryDestination = async (id: string | number, destination: "cuisine" | "bar") => {
    if (!scopedRestaurantId) return;

    const updateResult = await supabase
      .from("categories")
      .update({ destination })
      .eq("id", id)
      .eq("restaurant_id", scopedRestaurantId);
    let error = updateResult.error;

    if (error && String((error as { code?: string })?.code || "") === "42703") {
      const legacyUpdate = await supabase
        .from("categories")
        .update({ destination })
        .eq("id", id)
        .eq("restaurant_id", scopedRestaurantId);
      error = legacyUpdate.error;
    }

    if (error) {
      alert(error.message);
      return;
    }

    setCategories((prev: any[]) =>
      prev.map((category) =>
        String(category.id) === String(id) ? { ...category, destination } : category
      )
    );
  };

  const handleUpdateCategorySortOrder = async (id: string | number, sortOrder: number) => {
    if (!scopedRestaurantId) return;

    const updateResult = await supabase
      .from("categories")
      .update({ sort_order: sortOrder })
      .eq("id", id)
      .eq("restaurant_id", scopedRestaurantId);
    let error = updateResult.error;

    if (error && String((error as { code?: string })?.code || "") === "42703") {
      const legacyUpdate = await supabase
        .from("categories")
        .update({ sort_order: sortOrder })
        .eq("id", id)
        .eq("restaurant_id", scopedRestaurantId);
      error = legacyUpdate.error;
    }

    if (error) {
      alert(error.message);
      return;
    }

    setCategories((prev: any[]) =>
      prev.map((category) =>
        String(category.id) === String(id) ? { ...category, sort_order: sortOrder } : category
      )
    );
  };

  const handleDeleteSubCategory = async (id: string | number) => {
    if (!scopedRestaurantId) return;

    let { error } = await supabase
      .from("subcategories")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", scopedRestaurantId);
    if (error && String((error as { code?: string })?.code || "") === "42703") {
      const legacyDelete = await supabase
        .from("subcategories")
        .delete()
        .eq("id", id)
        .eq("restaurant_id", scopedRestaurantId);
      error = legacyDelete.error;
    }
    if (error) {
      alert(error.message);
      return;
    }
    fetchSubCategories();
  };

  const handleCreateSide = async () => {
    if (!scopedRestaurantId) {
      alert("Restaurant non defini dans l'URL.");
      return;
    }

    if (!newSide.name_fr.trim()) {
      alert("Nom FR obligatoire");
      return;
    }
    setSideSaveStatus("saving");
    const i18n = Object.fromEntries(
      activeLanguageCodes
        .filter((code: string) => code !== "fr")
        .map((code: string) => [code, String(newSideI18n[code] || "").trim()])
    ) as Record<string, string>;
    const payload = {
      restaurant_id: scopedRestaurantId,
      name_fr: newSide.name_fr.trim(),
      name_en: buildI18nToken(i18n),
      name_es: (i18n.es || "").trim() || null,
      name_de: (i18n.de || "").trim() || null,
    };
    let { error } = await supabase.from("sides_library").insert([payload]);
    if (error && String((error as { code?: string })?.code || "") === "42703") {
      const legacyPayload = {
        restaurant_id: scopedRestaurantId,
        name_fr: newSide.name_fr.trim(),
        name_en: buildI18nToken(i18n),
        name_es: (i18n.es || "").trim() || null,
        name_de: (i18n.de || "").trim() || null,
      };
      const legacyInsert = await supabase.from("sides_library").insert([legacyPayload]);
      error = legacyInsert.error;
    }
    if (error) {
      alert(error.message);
      setSideSaveStatus("idle");
      return;
    }
    setNewSide({ name_fr: "", name_en: "", name_es: "", name_de: "" });
    setNewSideI18n({});
    await fetchSidesLibrary();
    setSideSaveStatus("success");
    window.setTimeout(() => setSideSaveStatus("idle"), 900);
  };

  const handleEditSide = (side: any) => {
    setSideSaveStatus("idle");
    const i18n = {
      ...parseI18nToken(side.name_en || ""),
      en: parseI18nToken(side.name_en || "").en || side.name_en || "",
      es: parseI18nToken(side.name_en || "").es || side.name_es || "",
      de: parseI18nToken(side.name_en || "").de || side.name_de || "",
    };
    setEditingSideId(side.id);
    setSideForm({
      name_fr: side.name_fr || "",
      name_en: side.name_en || "",
      name_es: side.name_es || "",
      name_de: side.name_de || "",
    });
    setSideFormI18n(i18n);
    setShowSideModal(true);
  };

  const handleSaveSide = async () => {
    if (!editingSideId || !scopedRestaurantId) return;
    if (!sideForm.name_fr.trim()) {
      alert("Nom FR obligatoire");
      return;
    }
    setSideSaveStatus("saving");
    const i18n = Object.fromEntries(
      activeLanguageCodes
        .filter((code: string) => code !== "fr")
        .map((code: string) => [code, String(sideFormI18n[code] || "").trim()])
    ) as Record<string, string>;
    const payload = {
      name_fr: sideForm.name_fr.trim(),
      name_en: buildI18nToken(i18n),
      name_es: (i18n.es || "").trim() || null,
      name_de: (i18n.de || "").trim() || null,
    };
    let { error } = await supabase
      .from("sides_library")
      .update(payload)
      .eq("id", editingSideId)
      .eq("restaurant_id", scopedRestaurantId);
    if (error && String((error as { code?: string })?.code || "") === "42703") {
      const legacyUpdate = await supabase
        .from("sides_library")
        .update(payload)
        .eq("id", editingSideId)
        .eq("restaurant_id", scopedRestaurantId);
      error = legacyUpdate.error;
    }
    if (error) {
      alert(error.message);
      setSideSaveStatus("idle");
      return;
    }
    await fetchSidesLibrary();
    setSideSaveStatus("success");
    window.setTimeout(() => {
      setShowSideModal(false);
      setEditingSideId(null);
      setSideForm({ name_fr: "", name_en: "", name_es: "", name_de: "" });
      setSideFormI18n({});
      setSideSaveStatus("idle");
    }, 900);
  };

  const handleDeleteSide = async (id: number) => {
    if (!scopedRestaurantId) return;

    let { error } = await supabase.from("sides_library").delete().eq("id", id).eq("restaurant_id", scopedRestaurantId);
    if (error && String((error as { code?: string })?.code || "") === "42703") {
      const legacyDelete = await supabase.from("sides_library").delete().eq("id", id).eq("restaurant_id", scopedRestaurantId);
      error = legacyDelete.error;
    }
    if (error) {
      alert(error.message);
      return;
    }
    fetchSidesLibrary();
  };

  const handleAddExtraToDish = () => {
    const nameFr = dishExtraDraft.name_fr.trim();
    const nameEn = dishExtraDraft.name_en.trim();
    const nameEs = dishExtraDraft.name_es.trim();
    const nameDe = dishExtraDraft.name_de.trim();
    const dynamicNames = Object.fromEntries(
      activeLanguageCodes.map((code: string) => {
        if (code === "fr") return [code, nameFr];
        const fromDraft = dishExtraDraft.names_i18n?.[code];
        if (typeof fromDraft === "string") return [code, fromDraft.trim()];
        if (code === "en") return [code, nameEn];
        if (code === "es") return [code, nameEs];
        if (code === "de") return [code, nameDe];
        return [code, ""];
      })
    ) as Record<string, string>;
    if (!nameFr) {
      alert("Nom FR obligatoire");
      return;
    }
    const parsedPrice = Number(dishExtraDraft.price.replace(",", "."));
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      alert("Prix invalide");
      return;
    }
    const normalizedPrice = Number(parsedPrice.toFixed(2));

    setFormData((prev: any) => {
      const nextExtras = [...prev.extras_list];
      let targetIndex = -1;

      if (editingExtraId) {
        targetIndex = nextExtras.findIndex((extra) => String(extra.id || "") === String(editingExtraId));
      }
      if (targetIndex < 0 && editingExtraOriginKey) {
        targetIndex = nextExtras.findIndex(
          (extra) => getExtraKey(extra.name_fr || "", Number(extra.price || 0)) === editingExtraOriginKey
        );
      }

      if (targetIndex >= 0) {
        const current = nextExtras[targetIndex];
        const ensuredId = String(current.id || editingExtraId || createLocalId());
        if (!ensuredId) {
          console.error("Supplement update failed: missing supplement id", {
            editingExtraId,
            editingExtraOriginKey,
            current,
          });
          alert("Impossible d'enregistrer ce supplement. ID manquant.");
          return prev;
        }
        nextExtras[targetIndex] = {
          ...current,
          id: ensuredId,
          name_fr: nameFr,
          name_en: nameEn,
          name_es: nameEs,
          name_de: nameDe,
          names_i18n: dynamicNames,
          price: normalizedPrice,
        };
      } else {
        const existingIndex = nextExtras.findIndex(
          (extra) =>
            getExtraKey(extra.name_fr || "", Number(extra.price || 0)) === getExtraKey(nameFr, normalizedPrice)
        );
        if (existingIndex >= 0) {
          const current = nextExtras[existingIndex];
          nextExtras[existingIndex] = {
            ...current,
            id: String(current.id || createLocalId()),
            name_fr: nameFr,
            name_en: nameEn,
            name_es: nameEs,
            name_de: nameDe,
            names_i18n: dynamicNames,
            price: normalizedPrice,
          };
        } else {
          nextExtras.push({
            id: createLocalId(),
            name_fr: nameFr,
            name_en: nameEn,
            name_es: nameEs,
            name_de: nameDe,
            names_i18n: dynamicNames,
            price: normalizedPrice,
          });
        }
      }

      return {
        ...prev,
        has_extras: nextExtras.length > 0,
        extras_list: nextExtras,
      };
    });
    setExtrasTouched(true);
    setFormulaSupplementsSaveStatus("idle");
    setEditingExtraId(null);
    setEditingExtraOriginKey(null);
    setDishExtraDraft({ name_fr: "", name_en: "", name_es: "", name_de: "", names_i18n: {}, price: "" });
  };

  const handleEditExtraInDish = (extra: any) => {
    setEditingExtraId(extra.id || null);
    setEditingExtraOriginKey(getExtraKey(extra.name_fr || "", Number(extra.price || 0)));
    setDishExtraDraft({
      name_fr: extra.name_fr || "",
      name_en: extra.name_en || "",
      name_es: extra.name_es || "",
      name_de: extra.name_de || "",
      names_i18n: {
        ...(extra.names_i18n || {}),
        en: extra.names_i18n?.en ?? extra.name_en ?? "",
        es: extra.names_i18n?.es ?? extra.name_es ?? "",
        de: extra.names_i18n?.de ?? extra.name_de ?? "",
      },
      price: Number(extra.price || 0).toFixed(2),
    });
  };

  const handleRemoveExtraFromDish = (extraId: string) => {
    setFormData((prev: any) => {
      const nextExtras = prev.extras_list.filter((extra: any) => extra.id !== extraId);
      return {
        ...prev,
        has_extras: nextExtras.length > 0,
        extras_list: nextExtras,
      };
    });
    if (editingExtraId === extraId) {
      setEditingExtraId(null);
      setEditingExtraOriginKey(null);
      setDishExtraDraft({ name_fr: "", name_en: "", name_es: "", name_de: "", names_i18n: {}, price: "" });
    }
    setExtrasTouched(true);
    setFormulaSupplementsSaveStatus("idle");
  };

  const handleAddProductOptionToDish = () => {
    const nameFr = String(productOptionDraft.name || "").trim();
    if (!nameFr) {
      alert("Nom de variante obligatoire");
      return;
    }
    const rawPrice = String(productOptionDraft.price_override || "").trim();
    const parsedPrice = rawPrice === "" ? null : Number.parseFloat(rawPrice.replace(",", "."));
    if (parsedPrice != null && (!Number.isFinite(parsedPrice as number) || Number(parsedPrice) < 0)) {
      alert("Prix de variante invalide (laisser vide ou >= 0).");
      return;
    }
    const optionNamesI18n = Object.fromEntries(
      activeLanguageCodes
        .map((code: string) => {
          const normalizedCode = normalizeLanguageKey(code);
          if (normalizedCode === "fr") return ["fr", nameFr];
          const rawValue =
            productOptionDraft.names_i18n?.[normalizedCode] ??
            productOptionDraft.names_i18n?.[code] ??
            "";
          return [normalizedCode, String(rawValue || "").trim()];
        })
        .filter((entry: [string, string]) => Boolean(entry[0]))
    ) as Record<string, string>;
    setFormData((prev: any) => {
      const nextOptions = [...(prev.product_options || [])];
      const normalizedName = normalizeText(nameFr);
      const duplicateIndex = nextOptions.findIndex(
        (option: any) =>
          normalizeText(option.name_fr || option.name || "") === normalizedName &&
          String(option.id || "") !== String(editingProductOptionId || "")
      );
      if (duplicateIndex >= 0) {
        alert("Cette variante existe deja pour ce plat.");
        return prev;
      }

      const nextValue = {
        id: editingProductOptionId || createLocalId(),
        name: nameFr,
        name_fr: nameFr,
        name_en: optionNamesI18n.en || null,
        name_es: optionNamesI18n.es || null,
        name_de: optionNamesI18n.de || null,
        names_i18n: {
          fr: nameFr,
          ...Object.fromEntries(
            Object.entries(optionNamesI18n).filter(([, value]) => Boolean(String(value || "").trim()))
          ),
        },
        price_override: parsedPrice == null ? null : Number(parsedPrice.toFixed(2)),
      };
      if (editingProductOptionId) {
        const targetIndex = nextOptions.findIndex((option: any) => String(option.id || "") === String(editingProductOptionId));
        if (targetIndex >= 0) {
          nextOptions[targetIndex] = nextValue;
        } else {
          nextOptions.push(nextValue);
        }
      } else {
        nextOptions.push(nextValue);
      }
      return {
        ...prev,
        product_options: nextOptions,
      };
    });
    setEditingProductOptionId(null);
    setProductOptionDraft({ name: "", price_override: "", names_i18n: {} });
  };

  const handleEditProductOptionInDish = (option: any) => {
    const encodedNames = parseI18nToken(String(option.name_en || ""));
    const draftNamesBase: Record<string, string> = {
      ...(option.names_i18n || {}),
      ...encodedNames,
      en: String(option.name_en || option.names_i18n?.en || encodedNames.en || "").trim(),
      es: String(option.name_es || option.names_i18n?.es || encodedNames.es || "").trim(),
      de: String(option.name_de || option.names_i18n?.de || encodedNames.de || "").trim(),
    };
    const draftNames = {
      ...draftNamesBase,
      ...Object.fromEntries(
        activeLanguageCodes
          .filter((code: string) => code !== "fr")
          .map((code: string) => {
            const normalizedCode = normalizeLanguageKey(code);
            const rawValue =
              draftNamesBase[normalizedCode] ??
              draftNamesBase[code] ??
              option.names_i18n?.[normalizedCode] ??
              option.names_i18n?.[code] ??
              "";
            return [normalizedCode, String(rawValue || "").trim()];
          })
      ),
    };
    setEditingProductOptionId(String(option.id || ""));
    setProductOptionDraft({
      name: String(option.name_fr || option.name || ""),
      price_override: option.price_override == null ? "" : Number(option.price_override).toFixed(2),
      names_i18n: draftNames,
    });
  };

  const handleRemoveProductOptionFromDish = (optionId: string) => {
    setFormData((prev: any) => ({
      ...prev,
      product_options: (prev.product_options || []).filter((option: any) => String(option.id || "") !== String(optionId)),
    }));
    if (String(editingProductOptionId || "") === String(optionId)) {
      setEditingProductOptionId(null);
      setProductOptionDraft({ name: "", price_override: "", names_i18n: {} });
    }
  };

  return {
    handleCreateSubCategory,
    handleCreateCategory,
    handleDeleteCategory,
    handleUpdateCategoryDestination,
    handleUpdateCategorySortOrder,
    handleDeleteSubCategory,
    handleCreateSide,
    handleEditSide,
    handleSaveSide,
    handleDeleteSide,
    handleAddExtraToDish,
    handleEditExtraInDish,
    handleRemoveExtraFromDish,
    handleAddProductOptionToDish,
    handleEditProductOptionInDish,
    handleRemoveProductOptionFromDish,
  };
}
