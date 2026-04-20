import { getCookingLabelFr, normalizeCookingKey } from "../lib/ui-translations";
import type { Item } from "./types";

type CreateKitchenOptionHelpersArgs = {
  extraNamesFrByDishAndId: Record<string, string>;
  normalizeEntityId: (value: unknown) => string;
  normalizeLookupText: (value: unknown) => string;
  keepStaffFrenchLabel: (value: unknown) => string;
  translateClientTextToFrench: (value: unknown) => string;
  isUuidLike: (value: unknown) => boolean;
  isFormulaItem: (item: Item) => boolean;
  resolveFormulaSequenceForItem: (item: Item) => number | null;
  resolveFrenchSideName: (value: unknown) => string;
};

export const createKitchenOptionHelpers = ({
  extraNamesFrByDishAndId,
  normalizeEntityId,
  normalizeLookupText,
  keepStaffFrenchLabel,
  translateClientTextToFrench,
  isUuidLike,
  isFormulaItem,
  resolveFormulaSequenceForItem,
  resolveFrenchSideName,
}: CreateKitchenOptionHelpersArgs) => {
  const parseUnknownJson = (value: unknown): unknown => {
    if (typeof value !== "string") return value;
    const raw = value.trim();
    if (!raw) return value;
    try {
      return JSON.parse(raw);
    } catch {
      return value;
    }
  };

  const toCollection = (value: unknown): unknown[] => {
    const parsed = parseUnknownJson(value);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") return [parsed];
    return [];
  };

  const getKitchenNotes = (item: Item) => {
    const notes: string[] = [];
    const dedupeList = (values: string[]) => {
      const seen = new Set<string>();
      const output: string[] = [];
      values.forEach((value) => {
        const cleaned = keepStaffFrenchLabel(value).replace(/\s{2,}/g, " ");
        if (!cleaned) return;
        const collapsed = cleaned
          .split(/\s+/)
          .filter(Boolean)
          .filter((part, index, arr) => {
            if (index === 0) return true;
            const prev = arr[index - 1]
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "");
            const current = part
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "");
            return current !== prev;
          })
          .join(" ")
          .trim();
        if (!collapsed) return;
        const key = normalizeLookupText(collapsed);
        if (!key || seen.has(key)) return;
        seen.add(key);
        output.push(collapsed);
      });
      return output;
    };
    const toRawChoiceList = (value: unknown): string[] => {
      if (value == null) return [];
      if (Array.isArray(value)) return value.flatMap((entry) => toRawChoiceList(entry));
      if (typeof value === "string" || typeof value === "number") {
        const text = keepStaffFrenchLabel(translateClientTextToFrench(value));
        return text ? [text] : [];
      }
      if (typeof value === "object") {
        const rec = value as Record<string, unknown>;
        const explicitFormulaChoiceValues = [
          ...(Array.isArray(rec.selected_option_names) ? rec.selected_option_names : []),
          ...(Array.isArray(rec.selectedOptionNames) ? rec.selectedOptionNames : []),
          ...(Array.isArray(rec.selected_sides) ? rec.selected_sides : []),
          ...(Array.isArray(rec.selectedSides) ? rec.selectedSides : []),
          rec.selected_cooking_label_fr,
          rec.selected_cooking_label,
          rec.selected_cooking,
          rec.selectedCooking,
        ]
          .map((entry) => keepStaffFrenchLabel(translateClientTextToFrench(entry)))
          .filter(Boolean);
        if (explicitFormulaChoiceValues.length > 0) return explicitFormulaChoiceValues;
        const direct = [rec.label_fr, rec.name_fr, rec.value_fr, rec.text, rec.title]
          .map((entry) => keepStaffFrenchLabel(entry))
          .filter(Boolean);
        if (direct.length > 0) return direct;
        return [rec.label, rec.name, rec.value, rec.choice, rec.selected]
          .map((entry) => keepStaffFrenchLabel(translateClientTextToFrench(entry)))
          .filter(Boolean);
      }
      return [];
    };
    const stripPrefixedValue = (entry: string, type: "side" | "cooking" | "option") => {
      const text = String(entry || "").trim();
      if (!text) return "";
      if (type === "side" && /^(accompagnements|beilage(:n)?|sides|acompa(:n|ñ)amientos)\s*:/i.test(text)) {
        return text.replace(/^[^:]+:\s*/i, "").trim();
      }
      if (type === "cooking" && /^(cuisson|cooking|garstufe|cocci[oó]n)\s*:/i.test(text)) {
        return text.replace(/^[^:]+:\s*/i, "").trim();
      }
      if (type === "option" && /^(option|options|variante|variantes|variant|variants|format|formats)\s*:/i.test(text)) {
        return text.replace(/^[^:]+:\s*/i, "").trim();
      }
      return text;
    };
    const formulaSequenceForNotes = isFormulaItem(item) ? resolveFormulaSequenceForItem(item) : null;
    const extractOptionValuesByKind = (value: unknown, kinds: Array<"side" | "cooking" | "option">) => {
      const result: Record<"side" | "cooking" | "option", string[]> = { side: [], cooking: [], option: [] };
      const parsedValue = parseUnknownJson(value);
      const entries = Array.isArray(parsedValue)
        ? parsedValue
        : parsedValue && typeof parsedValue === "object"
          ? Object.values(parsedValue as Record<string, unknown>)
          : [];
      entries.forEach((entry) => {
        if (entry == null) return;
        if (typeof entry === "string" || typeof entry === "number") {
          const rawText = String(entry || "").trim();
          if (!rawText) return;
          if (kinds.includes("side") && /^(accompagnements|beilage(:n)?|sides|acompa(:n|ñ)amientos)\s*:/i.test(rawText)) {
            result.side.push(stripPrefixedValue(rawText, "side"));
            return;
          }
          if (kinds.includes("cooking") && /^(cuisson|cooking|garstufe|cocci[oó]n)\s*:/i.test(rawText)) {
            result.cooking.push(stripPrefixedValue(rawText, "cooking"));
            return;
          }
          if (kinds.includes("option") && /^(option|options|variante|variantes|variant|variants|format|formats)\s*:/i.test(rawText)) {
            result.option.push(stripPrefixedValue(rawText, "option"));
          }
          return;
        }
        const rec = entry as Record<string, unknown>;
        const source = normalizeLookupText(rec.source || "");
        const kind = normalizeLookupText(rec.kind || rec.type || rec.key || rec.group || rec.category || "");
        const isFormulaEntry = source === "formula" || kind.includes("formula");
        if (
          Number.isFinite(formulaSequenceForNotes) &&
          Number(formulaSequenceForNotes) > 0 &&
          isFormulaEntry
        ) {
          const rawEntrySequence = Number(rec.sequence ?? rec.service_step_sequence ?? rec.step);
          if (Number.isFinite(rawEntrySequence) && rawEntrySequence > 0) {
            const normalizedEntrySequence = Math.max(1, Math.trunc(rawEntrySequence));
            const normalizedFormulaSequence = Math.max(1, Math.trunc(Number(formulaSequenceForNotes)));
            if (normalizedEntrySequence !== normalizedFormulaSequence) return;
          }
        }
        if (isFormulaEntry) {
          if (kinds.includes("side")) {
            result.side.push(
              ...toRawChoiceList(rec.selected_sides ?? rec.selectedSides ?? rec.selected_side_label_fr).map((v) =>
                stripPrefixedValue(v, "side")
              )
            );
          }
          if (kinds.includes("cooking")) {
            result.cooking.push(
              ...toRawChoiceList(
                rec.selected_cooking_label_fr ??
                  rec.selected_cooking_label ??
                  rec.selected_cooking ??
                  rec.selectedCooking
              ).map((v) => stripPrefixedValue(v, "cooking"))
            );
          }
          if (kinds.includes("option")) {
            result.option.push(
              ...toRawChoiceList(
                rec.selected_option_names ??
                  rec.selectedOptionNames ??
                  rec.selected_option_name ??
                  rec.selectedOptionName ??
                  rec.selected_option_label_fr
              ).map((v) => stripPrefixedValue(v, "option"))
            );
          }
        }
        const rawValues = toRawChoiceList(rec.values ?? rec.value ?? rec.selected ?? rec.selection ?? rec.choice ?? rec.option ?? rec);
        if (kinds.includes("side") && /(side|accompagnement|beilage|acomp)/.test(kind)) {
          result.side.push(...rawValues.map((v) => stripPrefixedValue(v, "side")));
          return;
        }
        if (kinds.includes("cooking") && /(cooking|cuisson|garstufe|cocc)/.test(kind)) {
          result.cooking.push(...rawValues.map((v) => stripPrefixedValue(v, "cooking")));
          return;
        }
        if (kinds.includes("option") && /(option|variant|variante|format|taille)/.test(kind)) {
          result.option.push(...rawValues.map((v) => stripPrefixedValue(v, "option")));
        }
      });
      return result;
    };
    const itemRecord = item as unknown as Record<string, unknown>;
    const dishId = normalizeEntityId(item.dish_id) || normalizeEntityId(item.id) || normalizeEntityId(item?.dish?.id);

    const selectedSidesByIds = dedupeList(
      (Array.isArray(item.selected_side_ids) ? item.selected_side_ids : Array.isArray(item.selectedSides) ? item.selectedSides : [])
        .map((side) => resolveFrenchSideName(side))
        .filter(Boolean) as string[]
    );
    const optionValues = extractOptionValuesByKind(itemRecord.selected_options ?? itemRecord.selectedOptions ?? itemRecord.options, [
      "side",
      "cooking",
      "option",
    ]);
    const formulaDetailsValues = extractOptionValuesByKind(itemRecord.formula_details ?? itemRecord.formulaDetails, [
      "side",
      "cooking",
      "option",
    ]);
    const directSideValues = dedupeList(
      [
        keepStaffFrenchLabel(itemRecord.accompagnement_fr || ""),
        keepStaffFrenchLabel(itemRecord.selected_side_label_fr || ""),
        ...toRawChoiceList(itemRecord.side),
        ...toRawChoiceList(itemRecord.accompaniment),
        ...toRawChoiceList(itemRecord.accompagnement),
        ...toRawChoiceList(itemRecord.accompaniments),
        ...toRawChoiceList(itemRecord.accompagnements),
        ...toRawChoiceList(itemRecord.side_dish),
        ...toRawChoiceList(itemRecord.sideDish),
        ...optionValues.side,
        ...formulaDetailsValues.side,
      ].map((entry) => stripPrefixedValue(entry, "side"))
    );
    const selectedSides = dedupeList([...selectedSidesByIds, ...directSideValues]);
    if (selectedSides.length > 0) notes.push(`Accompagnements: ${selectedSides.join(", ")}`);

    const selectedOptions = dedupeList(
      [
        ...toRawChoiceList(itemRecord.selected_option),
        ...optionValues.option,
        ...formulaDetailsValues.option,
        keepStaffFrenchLabel(translateClientTextToFrench(itemRecord.selected_option_name || "")),
      ].map((entry) => stripPrefixedValue(entry, "option"))
    );
    if (selectedOptions.length > 0) notes.push(`Option: ${selectedOptions.join(", ")}`);

    const selectedExtraIds = Array.isArray(item.selected_extra_ids) ? item.selected_extra_ids : [];
    const selectedExtrasById = dedupeList(
      selectedExtraIds
        .map((extraId) => keepStaffFrenchLabel(extraNamesFrByDishAndId[`${dishId}::${String(extraId || "").trim()}`] || ""))
        .filter(Boolean)
    );
    if (selectedExtrasById.length > 0) {
      notes.push(`Suppléments: ${selectedExtrasById.join(", ")}`);
    } else {
      const selectedExtrasSnapshot = dedupeList(
        (Array.isArray(item.selected_extras) ? item.selected_extras : [])
          .map((extra) => keepStaffFrenchLabel(translateClientTextToFrench(extra.label_fr || extra.name_fr || extra.name)))
          .filter(Boolean) as string[]
      );
      if (selectedExtrasSnapshot.length > 0) {
        notes.push(`Suppléments: ${selectedExtrasSnapshot.join(", ")}`);
      } else {
        const selectedExtras = dedupeList(
          Array.isArray(item.selectedExtras)
            ? item.selectedExtras
                .map((extra) => keepStaffFrenchLabel(translateClientTextToFrench(extra.name_fr || extra.name)))
                .filter(Boolean) as string[]
            : []
        );
        if (selectedExtras.length > 0) notes.push(`Suppléments: ${selectedExtras.join(", ")}`);
      }
    }

    const directCookingValue =
      dedupeList(
        [
          keepStaffFrenchLabel(itemRecord.cooking || ""),
          keepStaffFrenchLabel(itemRecord.cuisson || ""),
          keepStaffFrenchLabel(itemRecord.cooking_level || ""),
          keepStaffFrenchLabel(itemRecord.cuisson_label || ""),
          keepStaffFrenchLabel(itemRecord.selected_cooking_label || ""),
          keepStaffFrenchLabel(itemRecord.selected_cooking_label_fr || ""),
          ...optionValues.cooking,
          ...formulaDetailsValues.cooking,
        ].map((entry) => stripPrefixedValue(entry, "cooking"))
      )[0] || "";
    const cookingLabelFr =
      keepStaffFrenchLabel(item.selected_cooking_label_fr || "") || keepStaffFrenchLabel((itemRecord.selected_cooking_label as string) || "");
    if (cookingLabelFr) {
      notes.push(`Cuisson: ${cookingLabelFr}`);
    } else {
      const cookingKey = normalizeCookingKey(item.selected_cooking_key || item.selected_cooking || "");
      if (cookingKey) {
        notes.push(`Cuisson: ${getCookingLabelFr(cookingKey)}`);
      } else if (directCookingValue) {
        notes.push(`Cuisson: ${directCookingValue}`);
      }
    }

    const detailValues: string[] = [];
    const specialRequest = String(item.special_request || "").trim();
    if (specialRequest) {
      detailValues.push(keepStaffFrenchLabel(translateClientTextToFrench(specialRequest)));
    }
    const instructions = String(item.instructions || "")
      .split("|")
      .map((segment) => String(segment || "").trim())
      .filter(Boolean)
      .map((segment) => {
        if (/^(accompagnements|beilage(:n)|sides|acompa(:n|ñ)amientos)\s*:/i.test(segment)) return "";
        if (/^(supplements?|extras?|suplementos?)\s*:/i.test(segment)) return "";
        if (/^(cuisson|cooking|garstufe|cocci[oó]n)\s*:/i.test(segment)) return "";
        if (/^(option|options|variante|variantes|variant|variants|format|formats)\s*:/i.test(segment)) return "";
        const normalized = translateClientTextToFrench(segment);
        if (!normalized || isUuidLike(normalized)) return "";
        return keepStaffFrenchLabel(normalized);
      })
      .filter(Boolean)
      .join(" | ");
    if (instructions) detailValues.push(instructions);
    const dedupedDetailValues = dedupeList(
      detailValues.map((value) =>
        String(value || "")
          .replace(/^details?\s*:\s*/i, "")
          .replace(/^precisions?\s*:\s*/i, "")
          .replace(/^commentaire cuisine\s*:\s*/i, "")
          .trim()
      )
    );
    if (dedupedDetailValues.length > 0) {
      notes.push(`Précisions: ${dedupedDetailValues.join(" | ")}`);
    }
    return keepStaffFrenchLabel(notes.join(" | "));
  };

  const getInlineCookingLevel = (item: Item) => {
    const itemRecord = item as unknown as Record<string, unknown>;
    const direct =
      String(item.selected_cooking_label_fr || "").trim() ||
      String((itemRecord.selected_cooking_label as string) || "").trim() ||
      String(item.cooking || "").trim() ||
      String(item.cuisson || "").trim();
    if (direct) return direct;
    const cookingKey = normalizeCookingKey(item.selected_cooking_key || item.selected_cooking || "");
    return cookingKey ? getCookingLabelFr(cookingKey) : "";
  };

  const getKitchenFinalDetails = (item: Item) => {
    const normalizeKey = (value: string) =>
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    const uniqueValues = (values: string[]) => {
      const seen = new Set<string>();
      return values
        .map((value) =>
          String(value || "")
            .replace(/^[-•]\s*/, "")
            .replace(/\s{2,}/g, " ")
            .trim()
        )
        .filter(Boolean)
        .filter((value) => {
          const key = normalizeKey(value);
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    };
    const stripPrefix = (value: string) =>
      String(value || "")
        .replace(/^details?\s*:\s*/i, "")
        .replace(/^notes?\s*:\s*/i, "")
        .trim();
    const extractTokens = (value: string) =>
      keepStaffFrenchLabel(value || "")
        .split(",")
        .map((token) => keepStaffFrenchLabel(token))
        .filter(Boolean);

    const cooking: string[] = [];
    const accompaniments: string[] = [];
    const supplements: string[] = [];
    const options: string[] = [];
    const remarks: string[] = [];

    String(getKitchenNotes(item) || "")
      .split("|")
      .map((entry) => stripPrefix(entry))
      .filter(Boolean)
      .forEach((entry) => {
        if (/^formule\s*:/i.test(entry)) return;
        if (/^(cuisson|cooking|cui)\s*:/i.test(entry)) {
          cooking.push(...extractTokens(entry.replace(/^(cuisson|cooking|cui)\s*:\s*/i, "").trim()));
          return;
        }
        if (/^(accompagnement|accompagnements|side|sides|acc)\s*:/i.test(entry)) {
          accompaniments.push(...extractTokens(entry.replace(/^(accompagnement|accompagnements|side|sides|acc)\s*:\s*/i, "").trim()));
          return;
        }
        if (/^(suppl[eé]ments?|supplements?|extras?|sup)\s*:/i.test(entry)) {
          supplements.push(...extractTokens(entry.replace(/^(suppl[eé]ments?|supplements?|extras?|sup)\s*:\s*/i, "").trim()));
          return;
        }
        if (/^(option|options|op)\s*:/i.test(entry)) {
          options.push(...extractTokens(entry.replace(/^(option|options|op)\s*:\s*/i, "").trim()));
          return;
        }
        if (/^(pr[eé]cisions?|commentaire cuisine|remarque|remarks?|rq)\s*:/i.test(entry)) {
          remarks.push(...extractTokens(entry.replace(/^(pr[eé]cisions?|commentaire cuisine|remarque|remarks?|rq)\s*:\s*/i, "").trim()));
          return;
        }
        remarks.push(...extractTokens(entry));
      });

    const cookingValues = uniqueValues(cooking);
    const accompanimentValues = uniqueValues(accompaniments);
    const supplementValues = uniqueValues(supplements);
    const optionValues = uniqueValues(options);
    const remarkValues = uniqueValues(remarks).filter((remark) => {
      const remarkKey = normalizeKey(remark);
      const alreadyInOtherSection = [...cookingValues, ...accompanimentValues, ...supplementValues, ...optionValues].some(
        (value) => normalizeKey(value) === remarkKey
      );
      return !alreadyInOtherSection;
    });

    const parts: string[] = [];
    if (cookingValues.length > 0) parts.push(`CUI : ${cookingValues.join(", ")}`);
    if (accompanimentValues.length > 0) parts.push(`ACC : ${accompanimentValues.join(", ")}`);
    if (supplementValues.length > 0) parts.push(`SUP : ${supplementValues.join(", ")}`);
    if (optionValues.length > 0) parts.push(`OP : ${optionValues.join(", ")}`);
    if (remarkValues.length > 0) parts.push(`RQ : ${remarkValues.join(", ")}`);
    return parts.join(", ");
  };

  const getKitchenSelectedOptionLines = (item: Item) => {
    try {
      if (isFormulaItem(item)) {
        console.log("🔥 STRUCTURE FORMULE:", JSON.stringify(item, null, 2));
      }
      const normalizeKey = (value: string) =>
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    const uniqueLines = (values: string[]) => {
      const seen = new Set<string>();
      return values
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .filter((value) => {
          const key = normalizeKey(value);
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    };
    const toTextList = (value: unknown): string[] => {
      if (value == null) return [];
      if (Array.isArray(value)) return value.flatMap((entry) => toTextList(entry));
      if (typeof value === "string" || typeof value === "number") {
        const text = keepStaffFrenchLabel(translateClientTextToFrench(value));
        return text ? [text] : [];
      }
      if (typeof value === "object") {
        const record = value as Record<string, unknown>;
        const nestedPayloadValues = [
          record.option_payload,
          record.optionPayload,
          record.payload,
          record.metadata,
          record.meta,
        ].flatMap((entry) => toTextList(entry));
        if (nestedPayloadValues.length > 0) return nestedPayloadValues;
        const nested = record.values ?? record.value ?? record.selected ?? record.selection ?? record.choice ?? record.option;
        const nestedValues = toTextList(nested);
        if (nestedValues.length > 0) return nestedValues;
        return [
          record.option_name,
          record.optionName,
          record.option_label,
          record.optionLabel,
          record.label_fr,
          record.name_fr,
          record.label,
          record.name,
          record.text,
          record.title,
        ]
          .map((entry) => keepStaffFrenchLabel(translateClientTextToFrench(entry)))
          .filter(Boolean);
      }
      return [];
    };
    const toPrefixedLine = (entry: unknown) => {
      if (entry == null) return "";
      if (typeof entry === "string" || typeof entry === "number") {
        const direct = keepStaffFrenchLabel(translateClientTextToFrench(entry));
        if (!direct) return "";
        if (/^(cui|acc|sup|op|rq)\s*:/i.test(direct)) return direct;
        if (/^(cuisson|cooking)\s*:/i.test(direct)) return `CUI : ${direct.replace(/^[^:]+:\s*/i, "").trim()}`;
        if (/^(accompagnement|accompagnements|side|sides)\s*:/i.test(direct)) return `ACC : ${direct.replace(/^[^:]+:\s*/i, "").trim()}`;
        if (/^(suppl[eé]ment|suppl[eé]ments|extra|extras)\s*:/i.test(direct)) return `SUP : ${direct.replace(/^[^:]+:\s*/i, "").trim()}`;
        if (/^(option|options)\s*:/i.test(direct)) return `OP : ${direct.replace(/^[^:]+:\s*/i, "").trim()}`;
        return `OP : ${direct}`;
      }
      if (typeof entry !== "object") return "";
      const record = entry as Record<string, unknown>;
      const kind = normalizeLookupText(record.kind ?? record.type ?? record.key ?? record.group ?? record.category ?? "");
      const source = normalizeLookupText(record.source ?? "");
      const values = toTextList(record);
      const directCookingValues = [
        ...toTextList(record.cuisson),
        ...toTextList(record.cooking),
        ...toTextList(record.selected_cooking_label_fr),
        ...toTextList(record.selected_cooking_label),
        ...toTextList(record.selected_cooking),
        ...toTextList(record.selectedCooking),
      ];
      const directSideValues = [
        ...toTextList(record.accompagnement),
        ...toTextList(record.accompagnements),
        ...toTextList(record.side),
        ...toTextList(record.sides),
        ...toTextList(record.selected_side_label_fr),
        ...toTextList(record.selected_sides),
        ...toTextList(record.selectedSides),
      ];
      const directOptionValues = [
        ...toTextList(record.option),
        ...toTextList(record.options),
        ...toTextList(record.selected_option_name),
        ...toTextList(record.selectedOptionName),
        ...toTextList(record.selected_option_names),
        ...toTextList(record.selectedOptionNames),
      ];
      const formulaValues = [
        ...toTextList(record.selected_option_names),
        ...toTextList(record.selectedOptionNames),
        ...toTextList(record.selected_option_name),
        ...toTextList(record.selectedOptionName),
      ];
      const formulaSides = [
        ...toTextList(record.selected_sides),
        ...toTextList(record.selectedSides),
        ...toTextList(record.selected_side_label_fr),
      ];
      const formulaCooking = [
        ...toTextList(record.selected_cooking_label_fr),
        ...toTextList(record.selected_cooking_label),
        ...toTextList(record.selected_cooking),
        ...toTextList(record.selectedCooking),
      ];
      const rootOptionLines: string[] = [];
      if (directCookingValues.length > 0) rootOptionLines.push(`CUI : ${directCookingValues.join(", ")}`);
      if (directSideValues.length > 0) rootOptionLines.push(`ACC : ${directSideValues.join(", ")}`);
      if (directOptionValues.length > 0) rootOptionLines.push(`OP : ${directOptionValues.join(", ")}`);
      if (rootOptionLines.length > 0) return rootOptionLines.join(", ");
      if (values.length === 0) return "";
      if (source === "formula" || kind.includes("formula")) {
        const formulaLines: string[] = [];
        if (formulaCooking.length > 0) formulaLines.push(`CUI : ${formulaCooking.join(", ")}`);
        if (formulaSides.length > 0) formulaLines.push(`ACC : ${formulaSides.join(", ")}`);
        if (formulaValues.length > 0) formulaLines.push(`OP : ${formulaValues.join(", ")}`);
        if (formulaLines.length > 0) return formulaLines.join(", ");
      }
      if (/(side|accompagnement|beilage|acomp)/.test(kind)) return `ACC : ${values.join(", ")}`;
      if (/(cooking|cuisson|garstufe|cocc)/.test(kind)) return `CUI : ${values.join(", ")}`;
      if (/(extra|supplement|suplemento)/.test(kind)) return `SUP : ${values.join(", ")}`;
      return `OP : ${values.join(", ")}`;
    };

    const itemRecord = item as unknown as Record<string, unknown>;
    const itemMetadata =
      itemRecord.metadata && typeof itemRecord.metadata === "object"
        ? (itemRecord.metadata as Record<string, unknown>)
        : null;
    const mainOptions =
      itemRecord.selected_options ||
      (itemRecord.dish && typeof itemRecord.dish === "object"
        ? (itemRecord.dish as Record<string, unknown>).options
        : null) ||
      itemRecord.order_item_options ||
      null;
    const safeFallbackOptionsSource = mainOptions ?? itemMetadata?.options ?? null;
    const formulaSequenceForLines = isFormulaItem(item) ? resolveFormulaSequenceForItem(item) : null;
    const selectionGroups = [
      itemRecord.selections,
      itemRecord.selection,
      itemRecord.formula_selections,
      itemRecord.formulaSelections,
      itemRecord.choices,
      itemRecord.choice,
      itemRecord.formula_details,
      itemRecord.formulaDetails,
    ];
    const selectionOptionEntries = selectionGroups.flatMap((group) => {
      const entries = toCollection(group);
      return entries.flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const rec = entry as Record<string, unknown>;
        return [
          ...toCollection(rec.options),
          ...toCollection(rec.selected_options),
          ...toCollection(rec.selectedOptions),
          ...toCollection(rec.choices),
        ];
      });
    });
    const selectedOptionsSafeList = Array.isArray(safeFallbackOptionsSource)
      ? safeFallbackOptionsSource
      : safeFallbackOptionsSource != null
        ? [safeFallbackOptionsSource]
        : [];
    const allOptions = [...toCollection(itemRecord.options), ...selectedOptionsSafeList, ...selectionOptionEntries];
    const compactLinesFromFinalDetails = String(getKitchenFinalDetails(item) || "")
      .split(",")
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    const rawEntries = [
      ...selectedOptionsSafeList,
      ...toCollection(itemRecord.selectedOptions),
      ...toCollection(itemRecord.formula_details),
      ...toCollection(itemRecord.formulaDetails),
      ...toCollection(itemRecord.metadata),
      ...toCollection(itemRecord.meta),
      ...allOptions,
      ...toCollection(itemRecord.choices),
      ...toCollection(itemRecord.selected_choices),
      ...(itemRecord.metadata && typeof itemRecord.metadata === "object" ? [itemRecord.metadata] : []),
      ...(itemRecord.meta && typeof itemRecord.meta === "object" ? [itemRecord.meta] : []),
    ];
    const rootMainOptionLines = toCollection(itemRecord.order_item_options).flatMap((entry) => {
      const line = toPrefixedLine(entry);
      return line ? [line] : [];
    });

    const rawLines = [
      ...compactLinesFromFinalDetails,
      ...rootMainOptionLines,
      ...rawEntries.map((entry) => toPrefixedLine(entry)).filter(Boolean),
    ];
    const optionName = keepStaffFrenchLabel(translateClientTextToFrench(itemRecord.selected_option_name || ""));
    if (optionName) rawLines.push(`OP : ${optionName}`);

    const collectFormulaSubItemOptions = (value: unknown): string[] => {
      if (value == null) return [];
      const parsedValue = parseUnknownJson(value);
      if (Array.isArray(parsedValue)) return parsedValue.flatMap((entry) => collectFormulaSubItemOptions(entry));
      if (typeof parsedValue !== "object" || parsedValue == null) return [];
      const record = parsedValue as Record<string, unknown>;
      const compactOwnDetails = String(getKitchenFinalDetails(record as unknown as Item) || "")
        .split(",")
        .map((entry) => String(entry || "").trim())
        .filter(Boolean);
      const formulaOptionObject = record.options && typeof record.options === "object" ? (record.options as Record<string, unknown>) : null;
      const optionObjectLines: string[] = [];
      const cookingFromObject = [
        ...toTextList(formulaOptionObject?.cuisson),
        ...toTextList(formulaOptionObject?.cooking),
      ];
      if (cookingFromObject.length > 0) optionObjectLines.push(`CUI : ${cookingFromObject.join(", ")}`);
      const sidesFromObject = [
        ...toTextList(formulaOptionObject?.accompagnement),
        ...toTextList(formulaOptionObject?.accompagnements),
        ...toTextList(formulaOptionObject?.side),
        ...toTextList(formulaOptionObject?.sides),
      ];
      if (sidesFromObject.length > 0) optionObjectLines.push(`ACC : ${sidesFromObject.join(", ")}`);
      const extrasFromObject = [
        ...toTextList(formulaOptionObject?.supplement),
        ...toTextList(formulaOptionObject?.supplements),
        ...toTextList(formulaOptionObject?.extra),
        ...toTextList(formulaOptionObject?.extras),
      ];
      if (extrasFromObject.length > 0) optionObjectLines.push(`SUP : ${extrasFromObject.join(", ")}`);
      const variantsFromObject = [
        ...toTextList(formulaOptionObject?.option),
        ...toTextList(formulaOptionObject?.options),
        ...toTextList(formulaOptionObject?.variante),
        ...toTextList(formulaOptionObject?.variantes),
      ];
      if (variantsFromObject.length > 0) optionObjectLines.push(`OP : ${variantsFromObject.join(", ")}`);
      const nestedSelections = [
        record.selection,
        record.selections,
        record.formula_selections,
        record.formulaSelections,
        record.choices,
        record.choice,
        record.selected_choices,
        record.selectedChoices,
        record.steps,
        record.lines,
        record.metadata,
        record.meta,
        record.items,
        record.formula_items,
        record.formulaItems,
      ];
      const nestedOptions = [
        record.selected_options,
        record.selectedOptions,
        record.options,
        record.option,
        record.selected_option_name,
        record.selectedOptionName,
      ];
      const ownOptionLines = nestedOptions.flatMap((entry) => toTextList(entry)).map((entry) => `OP : ${entry}`);
      return [
        ...compactOwnDetails,
        ...optionObjectLines,
        ...ownOptionLines,
        ...nestedSelections.flatMap((entry) => collectFormulaSubItemOptions(entry)),
      ];
    };
    const formulaSubItemOptionLines = collectFormulaSubItemOptions([
      itemRecord.formula_data,
      itemRecord.formulaData,
      itemRecord.formula_details,
      itemRecord.formulaDetails,
      itemRecord.formula,
      itemRecord.selections,
      itemRecord.selection,
      itemRecord.formula_selections,
      itemRecord.formulaSelections,
      itemRecord.metadata,
      itemRecord.meta,
      itemRecord.formula_items,
      itemRecord.formulaItems,
    ]);
    if (formulaSubItemOptionLines.length > 0) {
      false && console.log("TRACE:", {
        context: "kitchen.getKitchenSelectedOptionLines.formulaSubItems",
        dishId: String(itemRecord.dish_id ?? item.id ?? "").trim() || null,
        orderItemId: String(itemRecord.order_item_id ?? itemRecord.orderItemId ?? "").trim() || null,
        formulaSequenceForLines,
        formulaSubItemOptionLines,
      });
    }
    rawLines.push(...formulaSubItemOptionLines);
    const finalLines = uniqueLines(rawLines).filter((line) => {
      const normalized = normalizeKey(line).replace(/\s+/g, " ");
      if (!normalized) return false;
      if (normalized === "op : aucune option") return false;
      if (normalized.endsWith(":") || normalized.endsWith(": none")) return false;
      return true;
    });
    return finalLines;
    } catch (error) {
      false && console.warn("TRACE:", {
        context: "kitchen.getKitchenSelectedOptionLines.error",
        orderItemId: String((item as unknown as Record<string, unknown>).order_item_id || "").trim() || null,
        message: String((error as { message?: string } | null)?.message || error || ""),
      });
      return [];
    }
  };

  return { getKitchenNotes, getInlineCookingLevel, getKitchenFinalDetails, getKitchenSelectedOptionLines };
};
