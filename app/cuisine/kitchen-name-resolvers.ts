import type { Item } from "./types";

type CreateKitchenNameResolversArgs = {
  getFrenchTranslationValue: (translations: unknown) => string;
  keepStaffFrenchLabel: (value: unknown) => string;
  isUuidLike: (value: unknown) => boolean;
  normalizeEntityId: (value: unknown) => string;
  resolveFormulaEntryForCurrentSequence: (item: Item) => Record<string, unknown> | null;
  dishNamesFrById: Record<string, string>;
  sideNamesFrById: Record<string, string>;
  sideNamesFrByAlias: Record<string, string>;
  normalizeLookupText: (value: unknown) => string;
  translateClientTextToFrench: (value: unknown) => string;
};

export const createKitchenNameResolvers = ({
  getFrenchTranslationValue,
  keepStaffFrenchLabel,
  isUuidLike,
  normalizeEntityId,
  resolveFormulaEntryForCurrentSequence,
  dishNamesFrById,
  sideNamesFrById,
  sideNamesFrByAlias,
  normalizeLookupText,
  translateClientTextToFrench,
}: CreateKitchenNameResolversArgs) => {
  const toDishLabel = (value: unknown): string => {
    if (value == null) return "";
    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      const nestedCandidates: unknown[] = [
        record.fr,
        record["fr-FR"],
        record.name_fr,
        record.name,
        record.label_fr,
        record.label,
        record.title,
        record.value,
      ];
      for (const candidate of nestedCandidates) {
        const normalized = toDishLabel(candidate);
        if (normalized) return normalized;
      }
      return "";
    }
    const normalized = keepStaffFrenchLabel(value);
    if (!normalized || normalized === "[object Object]") return "";
    return normalized;
  };

  const resolveDishNameFrFromRow = (row: Record<string, unknown>) =>
    toDishLabel(getFrenchTranslationValue(row.translations)) || toDishLabel(row.name_fr || row.name || "");

  const resolveKitchenDishName = (item: Item) => {
    const itemAsRecord = item as Record<string, unknown>;
    const nestedDish =
      itemAsRecord.dish && typeof itemAsRecord.dish === "object"
        ? (itemAsRecord.dish as Record<string, unknown>)
        : null;
    const displayName =
      toDishLabel((item as Record<string, unknown>).name_fr || "") ||
      toDishLabel(nestedDish?.name_fr || "") ||
      toDishLabel(nestedDish?.name || "") ||
      toDishLabel(item.name || "");
    if (displayName && !isUuidLike(displayName)) return displayName;
    const currentFormulaEntry = resolveFormulaEntryForCurrentSequence(item);
    if (currentFormulaEntry) {
      const fromFormulaEntry = toDishLabel(
        currentFormulaEntry.dish_name_fr ??
          currentFormulaEntry.dish_name ??
          currentFormulaEntry.dishName ??
          currentFormulaEntry.value ??
          currentFormulaEntry.label_fr ??
          ""
      );
      if (fromFormulaEntry && !isUuidLike(fromFormulaEntry)) return fromFormulaEntry;
    }
    const candidateId =
      normalizeEntityId(item.dish_id) ||
      normalizeEntityId(item.id) ||
      normalizeEntityId(nestedDish?.id);
    const fromCatalog = candidateId ? toDishLabel(dishNamesFrById[candidateId] || "") : "";
    if (fromCatalog) return fromCatalog;
    const nestedTranslationsName = toDishLabel(getFrenchTranslationValue(nestedDish?.translations));
    if (nestedTranslationsName) return nestedTranslationsName;
    const fallbackCandidates = [
      toDishLabel((item as Record<string, unknown>).dish_name_fr || ""),
      toDishLabel((item as Record<string, unknown>).dish_name || ""),
      toDishLabel((item as Record<string, unknown>).product_name || ""),
      toDishLabel(nestedDish?.name_fr || ""),
      toDishLabel((item as Record<string, unknown>).name_fr || ""),
      toDishLabel(nestedDish?.name || ""),
      toDishLabel(item.name || ""),
    ];
    for (const candidate of fallbackCandidates) {
      if (candidate && !isUuidLike(candidate)) return candidate;
    }
    false && console.log("TRACE:", {
      context: "kitchen.resolveKitchenDishName.fallbackUnknown",
      orderItemId: String(itemAsRecord.order_item_id ?? itemAsRecord.orderItemId ?? "").trim() || null,
      dishId: String(itemAsRecord.dish_id ?? item.id ?? "").trim() || null,
      candidateId: candidateId || null,
      itemSnapshot: {
        name: String(item.name || "").trim() || null,
        name_fr: String(item.name_fr || "").trim() || null,
        product_name: String(itemAsRecord.product_name ?? "").trim() || null,
      },
    });
    return "Plat inconnu";
  };

  const resolveFrenchSideName = (value: unknown) => {
    const candidate = normalizeEntityId(value);
    if (!candidate) return "";
    const fromCatalog = keepStaffFrenchLabel(sideNamesFrById[candidate] || "");
    if (fromCatalog) return fromCatalog;
    const alias = normalizeLookupText(candidate);
    const fromAlias = keepStaffFrenchLabel(sideNamesFrByAlias[alias] || "");
    if (fromAlias) return fromAlias;
    if (isUuidLike(candidate)) return "";
    const translated = translateClientTextToFrench(candidate);
    return isUuidLike(translated) ? "" : keepStaffFrenchLabel(translated);
  };

  return { resolveDishNameFrFromRow, resolveKitchenDishName, resolveFrenchSideName };
};
