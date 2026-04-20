type KitchenCatalogLoadArgs = {
  supabase: any;
  scopeId: string;
  resolveDishNameFrFromRow: (row: Record<string, unknown>) => string;
  keepStaffFrenchLabel: (value: unknown) => string;
  normalizeEntityId: (value: unknown) => string;
  buildStableExtraId: (dishId: unknown, name: unknown, price: unknown, index?: number) => string;
  normalizeLookupText: (value: unknown) => string;
  parseI18nToken: (value: unknown, tokenPrefix: string) => Record<string, string>;
  i18nToken: string;
};

export type KitchenCatalogLoadResult = {
  categoryDestinationById: Record<string, "cuisine" | "bar">;
  categoryNameById: Record<string, string>;
  categorySortOrderById: Record<string, number>;
  dishNamesFrById: Record<string, string>;
  dishCategoryIdByDishId: Record<string, string>;
  extraNamesFrByDishAndId: Record<string, string>;
  sideNamesFrById: Record<string, string>;
  sideNamesFrByAlias: Record<string, string>;
};

export const loadKitchenCatalogNames = async ({
  supabase,
  scopeId,
  resolveDishNameFrFromRow,
  keepStaffFrenchLabel,
  normalizeEntityId,
  buildStableExtraId,
  normalizeLookupText,
  parseI18nToken,
  i18nToken,
}: KitchenCatalogLoadArgs): Promise<KitchenCatalogLoadResult> => {
  const dishesBaseQuery = supabase
    .from("dishes")
    .select("id,name,name_fr,translations,price,category_id,extras,sides,description")
    .order("id", { ascending: true });
  const sidesBaseQuery = supabase.from("sides_library").select("id,name_fr,name_en,name_es,name_de").order("id", { ascending: true });
  const categoriesBaseQuery = supabase
    .from("categories")
    .select("id,destination,name_fr,name,sort_order")
    .order("id", { ascending: true });

  const [primaryDishesQuery, primarySidesQuery, primaryCategoriesQuery] = await Promise.all([
    scopeId ? dishesBaseQuery.eq("restaurant_id", scopeId) : dishesBaseQuery,
    scopeId ? sidesBaseQuery.eq("restaurant_id", scopeId) : sidesBaseQuery,
    scopeId ? categoriesBaseQuery.eq("restaurant_id", scopeId) : categoriesBaseQuery,
  ]);

  let dishesData = (primaryDishesQuery.data || []) as Array<Record<string, unknown>>;
  let dishesError = primaryDishesQuery.error;
  if (dishesError) {
    const missingColumn = String((dishesError as { code?: string }).code || "") === "42703";
    if (scopeId && missingColumn) {
      const retryWithoutScope = await dishesBaseQuery;
      if (!retryWithoutScope.error) {
        dishesData = (retryWithoutScope.data || []) as Array<Record<string, unknown>>;
        dishesError = null;
      }
    }
    const fallbackDishesQuery = await supabase
      .from("dishes")
      .select("id,name,name_fr,translations,price,category_id,extras,sides,description")
      .order("id", { ascending: true });
    if (!fallbackDishesQuery.error) {
      dishesData = (fallbackDishesQuery.data || []) as Array<Record<string, unknown>>;
      dishesError = null;
    }
  }

  let sidesData = (primarySidesQuery.data || []) as Array<Record<string, unknown>>;
  let sidesError = primarySidesQuery.error;
  if (sidesError) {
    const missingColumn = String((sidesError as { code?: string }).code || "") === "42703";
    if (scopeId && missingColumn) {
      const retryWithoutScope = await sidesBaseQuery;
      if (!retryWithoutScope.error) {
        sidesData = (retryWithoutScope.data || []) as Array<Record<string, unknown>>;
        sidesError = null;
      }
    }
    const fallbackSidesQuery = await supabase
      .from("sides_library")
      .select("id,name_fr")
      .order("id", { ascending: true });
    if (!fallbackSidesQuery.error) {
      sidesData = (fallbackSidesQuery.data || []) as Array<Record<string, unknown>>;
      sidesError = null;
    }
  }

  let categoriesData = (primaryCategoriesQuery.data || []) as Array<Record<string, unknown>>;
  let categoriesError = primaryCategoriesQuery.error;
  if (categoriesError) {
    const fallbackCategoriesQuery = await supabase
      .from("categories")
      .select("id,destination,name_fr,name")
      .order("id", { ascending: true });
    if (!fallbackCategoriesQuery.error) {
      categoriesData = (fallbackCategoriesQuery.data || []) as Array<Record<string, unknown>>;
      categoriesError = null;
    }
  }

  const categoryDestinationById: Record<string, "cuisine" | "bar"> = {};
  const categoryNameById: Record<string, string> = {};
  const categorySortOrderById: Record<string, number> = {};
  if (!categoriesError) {
    categoriesData.forEach((row) => {
      const key = normalizeEntityId(row.id);
      if (!key) return;
      categoryDestinationById[key] = String(row.destination || "").trim().toLowerCase() === "bar" ? "bar" : "cuisine";
      categoryNameById[key] = String(row.name_fr || row.name || "").trim();
      const sortOrder = Number(row.sort_order);
      if (Number.isFinite(sortOrder)) categorySortOrderById[key] = Math.trunc(sortOrder);
    });
  }

  const dishNamesFrById: Record<string, string> = {};
  const dishCategoryIdByDishId: Record<string, string> = {};
  const extraNamesFrByDishAndId: Record<string, string> = {};
  if (!dishesError) {
    dishesData.forEach((row) => {
      const source = row as {
        id: unknown;
        name_fr: unknown;
        name: unknown;
        extras: unknown;
        description: unknown;
        translations: unknown;
        category_id: unknown;
      };
      const key = normalizeEntityId(source.id);
      if (!key) return;
      const categoryId = normalizeEntityId(source.category_id);
      if (categoryId) dishCategoryIdByDishId[key] = categoryId;
      dishNamesFrById[key] = resolveDishNameFrFromRow(source as Record<string, unknown>);

      const descriptionSource = String(source.description || "").trim();
      const extrasFromDescription = (() => {
        const matches = descriptionSource.match(/__EXTRAS_JSON__:\s*([^\n]+)/i);
        if (!matches?.[1]) return [] as Array<{ id: string; name: string; price: number }>;
        try {
          const parsed = JSON.parse(decodeURIComponent(matches[1].trim()));
          if (!Array.isArray(parsed)) return [] as Array<{ id: string; name: string; price: number }>;
          return parsed
            .map((entry, index) => {
              if (!entry || typeof entry !== "object") return null;
              const rowEntry = entry as Record<string, unknown>;
              const name = keepStaffFrenchLabel(rowEntry.name_fr || rowEntry.name || "");
              if (!name) return null;
              const id = String(rowEntry.id || "").trim() || buildStableExtraId(key, name, rowEntry.price, index);
              const amount = Number(rowEntry.price || 0);
              return { id, name, price: Number.isFinite(amount) ? amount : 0 };
            })
            .filter(Boolean) as Array<{ id: string; name: string; price: number }>;
        } catch {
          return [] as Array<{ id: string; name: string; price: number }>;
        }
      })();

      const extrasFromRaw = Array.isArray(source.extras)
        ? source.extras
        : typeof source.extras === "string"
          ? (() => {
              try {
                const parsed = JSON.parse(source.extras);
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            })()
          : [];

      const normalizedExtras = extrasFromRaw
        .map((entry, index) => {
          if (typeof entry === "string") {
            const cleaned = entry.trim();
            if (!cleaned) return null;
            const [namePart, pricePart] = cleaned.split("=").map((part) => part.trim());
            const amount = Number((pricePart || "0").replace(",", "."));
            return {
              id: buildStableExtraId(key, keepStaffFrenchLabel(namePart || cleaned), amount, index),
              name: keepStaffFrenchLabel(namePart || cleaned),
            };
          }
          if (!entry || typeof entry !== "object") return null;
          const rowEntry = entry as Record<string, unknown>;
          const name = keepStaffFrenchLabel(rowEntry.name_fr || rowEntry.name || "");
          if (!name) return null;
          const amount = Number(rowEntry.price || 0);
          return {
            id: String(rowEntry.id || "").trim() || buildStableExtraId(key, name, amount, index),
            name,
          };
        })
        .filter(Boolean) as Array<{ id: string; name: string }>;

      const mergedExtras = [...extrasFromDescription, ...normalizedExtras];
      mergedExtras.forEach((extra) => {
        const extraId = String(extra.id || "").trim();
        const extraLabel = keepStaffFrenchLabel(extra.name || "");
        if (!extraId || !extraLabel) return;
        extraNamesFrByDishAndId[`${key}::${extraId}`] = extraLabel;
      });
    });
  }

  const sideNamesFrById: Record<string, string> = {};
  const sideNamesFrByAlias: Record<string, string> = {};
  if (!sidesError) {
    sidesData.forEach((row) => {
      const source = row as {
        id: unknown;
        name_fr: unknown;
        name_en: unknown;
        name_es: unknown;
        name_de: unknown;
      };
      const key = normalizeEntityId(source.id);
      if (!key) return;
      const frLabel = String(source.name_fr || "").trim();
      sideNamesFrById[key] = frLabel;
      if (!frLabel) return;
      [source.name_fr, source.name_en, source.name_es, source.name_de].forEach((nameValue) => {
        const label = String(nameValue || "").trim();
        if (!label) return;
        const aliasKey = normalizeLookupText(label);
        if (aliasKey) sideNamesFrByAlias[aliasKey] = frLabel;
        const tokenValues = parseI18nToken(label, i18nToken);
        Object.values(tokenValues).forEach((tokenLabel) => {
          const tokenAliasKey = normalizeLookupText(tokenLabel);
          if (tokenAliasKey) sideNamesFrByAlias[tokenAliasKey] = frLabel;
        });
      });
    });
  }

  return {
    categoryDestinationById,
    categoryNameById,
    categorySortOrderById,
    dishNamesFrById,
    dishCategoryIdByDishId,
    extraNamesFrByDishAndId,
    sideNamesFrById,
    sideNamesFrByAlias,
  };
};
