"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import { getCookingLabelFr, normalizeCookingKey } from "../lib/ui-translations";
import { BellRing } from "lucide-react";

type Item = {
  id: string | number;
  dish_id: string | number;
  dish: { id: string | number; name_fr: string; name: string };
  name: string;
  name_fr?: string;
  label?: string;
  product_name?: string;
  quantity: number;
  categorie: string;
  category: string;
  instructions: string;
  cooking?: string | null;
  cuisson?: string | null;
  side?: unknown;
  accompagnement?: unknown;
  accompagnements?: unknown;
  side_dish?: unknown;
  sideDish?: unknown;
  selected_options?: unknown;
  options?: unknown;
  selected_side_ids: Array<string | number>;
  selected_extra_ids: Array<string | number>;
  selected_extras: Array<{ id: string; label_fr: string; name: string; name_fr: string; price: number }>;
  selected_cooking_key: string | null;
  selected_cooking_label_fr: string | null;
  selected_cooking_label?: string | null;
  selected_cooking_label_pt?: string | null;
  selected_cooking: string | null;
  selected_side_label_fr?: string | null;
  selected_side_label?: string | null;
  selected_side_label_pt?: string | null;
  special_request: string | null;
  selectedSides: Array<string | number>;
  selectedExtras: Array<{ name: string; name_fr: string; price: number }>;
};

type Order = {
  id: string;
  table_number: string;
  items: any;
  order_items?: any[] | null;
  status: string;
  created_at: string;
  covers?: number | null;
  guest_count?: number | null;
  customer_count?: number | null;
  restaurant_id?: string | number | null;
};

const I18N_TOKEN = "__I18N__:";
const SETTINGS_ROW_ID = "c9012859-d0af-469d-8dbb-af9dee733aaa";

export default function KitchenPage() {
  const params = useParams<{ id?: string; restaurant_id?: string }>();
  const searchParams = useSearchParams();
  const decodeAndTrim = (value: unknown) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      return decodeURIComponent(raw).trim();
    } catch {
      return raw;
    }
  };
  const scopedRestaurantIdFromPath = decodeAndTrim(params?.restaurant_id || params?.id || "");
  const scopedRestaurantIdFromQuery = decodeAndTrim(searchParams.get("restaurant_id") || "");
  const scopedRestaurantIdFromLocation =
    typeof window !== "undefined" ? decodeAndTrim(window.location.pathname.split("/").filter(Boolean)[0] || "") : "";
  const resolvedRestaurantId = String(
    scopedRestaurantIdFromPath || scopedRestaurantIdFromQuery || scopedRestaurantIdFromLocation || SETTINGS_ROW_ID || ""
  ).trim();
  const [orders, setOrders] = useState<Order[]>([]);
  const [dishNamesFrById, setDishNamesFrById] = useState<Record<string, string>>({});
  const [sideNamesFrById, setSideNamesFrById] = useState<Record<string, string>>({});
  const [sideNamesFrByAlias, setSideNamesFrByAlias] = useState<Record<string, string>>({});
  const [extraNamesFrByDishAndId, setExtraNamesFrByDishAndId] = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [refreshMs, setRefreshMs] = useState(3000);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [lastPrintedId, setLastPrintedId] = useState<string | null>(null);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
  const [callsTableName, setCallsTableName] = useState<"calls">("calls");
  const knownPendingIdsRef = useRef<Record<string, boolean>>({});
  const hasInitializedPendingSnapshotRef = useRef(false);

  const logSqlError = (context: string, error: unknown) => {
    const err = (error || {}) as { code: string; message: string; details: string; hint: string };
    console.error("VRAI MESSAGE SQL:", err.message || null, "DETAILS:", err.details || null, "HINT:", err.hint || null);
    console.error("SQL CONTEXT:", context, "CODE:", err.code || null);
  };

  const getCategory = (item: any) => {
    return String(item.category || item.categorie || item?.["catégorie"] || item?.["catÃ©gorie"] || "")
      .toLowerCase()
      .trim();
  };

  const isDrink = (item: any) => {
    if (item.is_drink === true) return true;
    const cat = getCategory(item);
    return (
      cat === "boisson" ||
      cat === "boissons" ||
      cat === "bar" ||
      cat === "drink" ||
      cat === "drinks" ||
      cat === "beverage" ||
      cat === "beverages"
    );
  };

  const parseItems = (items: any): Item[] => {
    if (Array.isArray(items)) return items;
    if (typeof items === "string") {
      try {
        return JSON.parse(items);
      } catch {
        return [];
      }
    }
    return [];
  };

  const parseOrderItemsRelation = (order: Order): Item[] => {
    const rows = Array.isArray(order.order_items) ? order.order_items : [];
    if (rows.length === 0) return [];
    return rows.map((row: any) => {
      const dishRow =
        row?.dishes && typeof row.dishes === "object"
          ? row.dishes
          : row?.dish && typeof row.dish === "object"
            ? row.dish
            : null;
      return {
        ...(row || {}),
        id: row?.id ?? row?.dish_id ?? dishRow?.id ?? "",
        dish_id: row?.dish_id ?? dishRow?.id ?? "",
        dish: dishRow || undefined,
        name: String(row?.name || row?.product_name || dishRow?.name_fr || dishRow?.name || "").trim(),
        name_fr: String(row?.name_fr || dishRow?.name_fr || dishRow?.name || "").trim(),
        quantity: Number(row?.quantity || 1),
        categorie: String(row?.categorie || row?.category || dishRow?.categorie || dishRow?.category || "").trim(),
        category: String(row?.category || row?.categorie || dishRow?.category || dishRow?.categorie || "").trim(),
        instructions: String(row?.instructions || row?.notes || "").trim(),
      } as Item;
    });
  };

  const getOrderItems = (order: Order): Item[] => {
    const relationalItems = parseOrderItemsRelation(order);
    if (relationalItems.length > 0) return relationalItems;
    return parseItems(order.items);
  };

  const normalizeEntityId = (value: unknown) => String(value ?? "").trim();
  const repairUtf8Text = (value: unknown) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";

    let repaired = raw;
    if (/[ÃÂâ€]/.test(raw)) {
      try {
        const bytes = Uint8Array.from([...raw].map((char) => char.charCodeAt(0) & 0xff));
        const decoded = new TextDecoder("utf-8").decode(bytes).trim();
        const mojibakeScore = (input: string) => (input.match(/[ÃÂâ€]/g) || []).length;
        if (decoded && !decoded.includes("�") && mojibakeScore(decoded) < mojibakeScore(raw)) {
          repaired = decoded;
        }
      } catch {
        repaired = raw;
      }
    }

    return repaired.normalize("NFC");
  };
  const normalizeLookupText = (value: unknown) =>
    repairUtf8Text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const isUuidLike = (value: unknown) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(value || "").trim()
    );
  const isMissingRelationError = (error: unknown) =>
    String((error as { code: string } | null)?.code || "").trim() === "42P01";
  const buildStableExtraId = (dishId: unknown, name: unknown, price: unknown, index = 0) => {
    const dishKey = normalizeEntityId(dishId);
    const nameKey = normalizeLookupText(name || "");
    const amount = Number(price || 0);
    const safeAmount = Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
    return `extra:${dishKey}:${nameKey || "option"}:${safeAmount}:${index}`;
  };
  const parseI18nToken = (value: unknown) => {
    const raw = String(value || "").trim();
    if (!raw.startsWith(I18N_TOKEN)) return {} as Record<string, string>;
    try {
      const parsed = JSON.parse(decodeURIComponent(raw.replace(I18N_TOKEN, "")));
      if (!parsed || typeof parsed !== "object") return {} as Record<string, string>;
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [
          String(k || "").toLowerCase(),
          String(v || "").trim(),
        ])
      );
    } catch {
      return {} as Record<string, string>;
    }
  };

  const parseJsonRecord = (value: unknown): Record<string, unknown> | null => {
    if (!value) return null;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
      } catch {
        return null;
      }
    }
    if (typeof value === "object") return value as Record<string, unknown>;
    return null;
  };

  const getFrenchTranslationValue = (translations: unknown) => {
    const parsed = parseJsonRecord(translations);
    if (!parsed) return "";
    const direct = repairUtf8Text(parsed.fr || parsed["fr-FR"] || parsed["fr_fr"] || "");
    if (direct) return direct;

    const nameNode = parseJsonRecord(parsed.name);
    if (nameNode) {
      const fromNameNode = repairUtf8Text(nameNode.fr || nameNode["fr-FR"] || nameNode["fr_fr"] || "");
      if (fromNameNode) return fromNameNode;
    }

    const frNode = parseJsonRecord(parsed.fr);
    if (frNode) {
      const fromFrNode = repairUtf8Text(frNode.name || frNode.label || frNode.title || "");
      if (fromFrNode) return fromFrNode;
    }
    return "";
  };

  const resolveDishNameFrFromRow = (row: Record<string, unknown>) =>
    repairUtf8Text(getFrenchTranslationValue(row.translations)) ||
    repairUtf8Text(row.name_fr || row.name || "");

  const resolveKitchenDishName = (item: Item) => {
    const itemAsRecord = item as Record<string, unknown>;
    const nestedDish =
      itemAsRecord.dish && typeof itemAsRecord.dish === "object"
        ? (itemAsRecord.dish as Record<string, unknown>)
        : null;
    const candidateId =
      normalizeEntityId(item.id) ||
      normalizeEntityId(item.dish_id) ||
      normalizeEntityId(nestedDish?.id);
    const fromCatalog = candidateId ? repairUtf8Text(dishNamesFrById[candidateId] || "") : "";
    if (fromCatalog) return fromCatalog;
    const nestedTranslationsName = repairUtf8Text(getFrenchTranslationValue(nestedDish?.translations));
    if (nestedTranslationsName) return nestedTranslationsName;
    const fallbackCandidates = [
      repairUtf8Text(nestedDish?.name_fr || ""),
      repairUtf8Text(nestedDish?.name || ""),
      repairUtf8Text((item as Record<string, unknown>).name_fr || ""),
      repairUtf8Text(item.name || ""),
    ];
    for (const candidate of fallbackCandidates) {
      if (candidate && !isUuidLike(candidate)) return candidate;
    }
    return "Plat inconnu";
  };

  const resolveFrenchSideName = (value: unknown) => {
    const candidate = normalizeEntityId(value);
    if (!candidate) return "";
    const fromCatalog = repairUtf8Text(sideNamesFrById[candidate] || "");
    if (fromCatalog) return fromCatalog;
    const alias = normalizeLookupText(candidate);
    const fromAlias = repairUtf8Text(sideNamesFrByAlias[alias] || "");
    if (fromAlias) return fromAlias;
    if (isUuidLike(candidate)) return "";
    const translated = translateClientTextToFrench(candidate);
    return isUuidLike(translated) ? "" : repairUtf8Text(translated);
  };

  const sanitizeKitchenText = (value: unknown) => {
    const raw = repairUtf8Text(value);
    if (!raw) return "";
    return raw
      .replace(/\(\+\s*[\d.,]+\s*(?:€|â‚¬)\)/gi, "")
      .replace(/\+\s*[\d.,]+\s*(?:€|â‚¬)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  const translateClientTextToFrench = (value: unknown) => {
    let text = sanitizeKitchenText(value);
    if (!text) return "";

    const directReplacements: Array<[RegExp, string]> = [
      [/\bkeine pilze\b/gi, "pas de champignons"],
      [/\bohne pilze\b/gi, "sans champignons"],
      [/\bno mushrooms\b/gi, "pas de champignons"],
      [/\bsin champinones\b/gi, "sans champignons"],
      [/\bsin setas\b/gi, "sans champignons"],
      [/\bno onions\b/gi, "sans oignons"],
      [/\bohne zwiebeln\b/gi, "sans oignons"],
      [/\bsin cebolla\b/gi, "sans oignons"],
      [/\bplease\b/gi, "svp"],
      [/\bbitte\b/gi, "svp"],
      [/\bpor favor\b/gi, "svp"],
      [/\bwell done\b/gi, "bien cuit"],
      [/\bmedium\b/gi, "a point"],
      [/\brare\b/gi, "saignant"],
      [/\bblutig\b/gi, "saignant"],
      [/\bdurchgebraten\b/gi, "bien cuit"],
    ];
    directReplacements.forEach(([pattern, replacement]) => {
      text = text.replace(pattern, replacement);
    });

    const normalizeSegmentPrefix = (segment: string) => {
      const trimmed = segment.trim();
      if (!trimmed) return "";
      if (/^(accompagnements|beilage(:n)|sides|acompa(:n|Ã±)amientos)\s*:/i.test(trimmed)) {
        return trimmed.replace(/^[^:]+:\s*/i, "Accompagnements: ");
      }
      if (/^(cuisson|cooking|garstufe|cocci[oÃ³]n)\s*:/i.test(trimmed)) {
        return trimmed.replace(/^[^:]+:\s*/i, "Cuisson: ");
      }
      if (/^(supplements?|extras?|suplementos?)\s*:/i.test(trimmed)) {
        return trimmed.replace(/^[^:]+:\s*/i, "Suppléments: ");
      }
      if (/^(demande|special request|request|petici[oÃ³]n especial|besonderer wunsch)\s*:/i.test(trimmed)) {
        return trimmed.replace(/^[^:]+:\s*/i, "Précisions: ");
      }
      return trimmed;
    };

    return repairUtf8Text(
      text
      .split("|")
      .map((segment) => normalizeSegmentPrefix(segment))
      .filter(Boolean)
      .join(" | ")
    );
  };

  const getKitchenNotes = (item: Item) => {
    const notes: string[] = [];
    const dedupeList = (values: string[]) => {
      const seen = new Set<string>();
      const output: string[] = [];
      values.forEach((value) => {
        const cleaned = String(value || "").trim().replace(/\s{2,}/g, " ");
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
        const text = String(value || "").trim();
        return text ? [text] : [];
      }
      if (typeof value === "object") {
        const rec = value as Record<string, unknown>;
        const direct = [
          rec.label_fr,
          rec.label,
          rec.name_fr,
          rec.name,
          rec.value_fr,
          rec.value,
          rec.choice,
          rec.selected,
          rec.text,
          rec.title,
        ]
          .map((entry) => String(entry || "").trim())
          .filter(Boolean);
        if (direct.length > 0) return direct;
      }
      return [];
    };
    const stripPrefixedValue = (entry: string, type: "side" | "cooking") => {
      const text = String(entry || "").trim();
      if (!text) return "";
      if (type === "side") {
        if (/^(accompagnements|beilage(:n)?|sides|acompa(:n|Ã±)amientos)\s*:/i.test(text)) {
          return text.replace(/^[^:]+:\s*/i, "").trim();
        }
      }
      if (type === "cooking") {
        if (/^(cuisson|cooking|garstufe|cocci[oÃ³]n)\s*:/i.test(text)) {
          return text.replace(/^[^:]+:\s*/i, "").trim();
        }
      }
      return text;
    };
    const extractOptionValuesByKind = (value: unknown, kinds: Array<"side" | "cooking">) => {
      const result: Record<"side" | "cooking", string[]> = { side: [], cooking: [] };
      const entries = Array.isArray(value)
        ? value
        : value && typeof value === "object"
          ? Object.values(value as Record<string, unknown>)
          : [];
      entries.forEach((entry) => {
        if (entry == null) return;
        if (typeof entry === "string" || typeof entry === "number") {
          const rawText = String(entry || "").trim();
          if (!rawText) return;
          if (kinds.includes("side") && /^(accompagnements|beilage(:n)?|sides|acompa(:n|Ã±)amientos)\s*:/i.test(rawText)) {
            result.side.push(stripPrefixedValue(rawText, "side"));
            return;
          }
          if (kinds.includes("cooking") && /^(cuisson|cooking|garstufe|cocci[oÃ³]n)\s*:/i.test(rawText)) {
            result.cooking.push(stripPrefixedValue(rawText, "cooking"));
          }
          return;
        }

        const rec = entry as Record<string, unknown>;
        const kind = normalizeLookupText(rec.kind || rec.type || rec.key || rec.group || rec.category || "");
        const rawValues = toRawChoiceList(
          rec.values ?? rec.value ?? rec.selected ?? rec.selection ?? rec.choice ?? rec.option ?? rec
        );
        if (kinds.includes("side") && /(side|accompagnement|beilage|acomp)/.test(kind)) {
          result.side.push(...rawValues.map((v) => stripPrefixedValue(v, "side")));
          return;
        }
        if (kinds.includes("cooking") && /(cooking|cuisson|garstufe|cocc)/.test(kind)) {
          result.cooking.push(...rawValues.map((v) => stripPrefixedValue(v, "cooking")));
        }
      });
      return result;
    };
    const itemRecord = item as unknown as Record<string, unknown>;

    const dishId =
      normalizeEntityId(item.dish_id) ||
      normalizeEntityId(item.id) ||
      normalizeEntityId(item?.dish?.id);

    const selectedSidesByIds = dedupeList(
      (Array.isArray(item.selected_side_ids)
        ? item.selected_side_ids
        : Array.isArray(item.selectedSides)
          ? item.selectedSides
          : []
      )
        .map((side) => resolveFrenchSideName(side))
        .filter(Boolean) as string[]
    );
    const optionValues = extractOptionValuesByKind(itemRecord.selected_options ?? itemRecord.options, ["side", "cooking"]);
    const directSideValues = dedupeList(
      [
        String(itemRecord.selected_side_label_fr || "").trim(),
        String(itemRecord.selected_side_label_pt || "").trim(),
        String(itemRecord.selected_side_label || "").trim(),
        ...toRawChoiceList(itemRecord.side),
        ...toRawChoiceList(itemRecord.accompaniment),
        ...toRawChoiceList(itemRecord.accompagnement),
        ...toRawChoiceList(itemRecord.accompaniments),
        ...toRawChoiceList(itemRecord.accompagnements),
        ...toRawChoiceList(itemRecord.side_dish),
        ...toRawChoiceList(itemRecord.sideDish),
        ...optionValues.side,
      ].map((entry) => stripPrefixedValue(entry, "side"))
    );
    const selectedSides = dedupeList([...selectedSidesByIds, ...directSideValues]);
    if (selectedSides.length > 0) notes.push(`Accompagnements: ${selectedSides.join(", ")}`);

    const selectedExtraIds = Array.isArray(item.selected_extra_ids) ? item.selected_extra_ids : [];
    const selectedExtrasById = dedupeList(
      selectedExtraIds
        .map((extraId) => String(extraNamesFrByDishAndId[`${dishId}::${String(extraId || "").trim()}`] || "").trim())
        .filter(Boolean)
    );
    if (selectedExtrasById.length > 0) {
      notes.push(`Suppléments: ${selectedExtrasById.join(", ")}`);
    } else {
      const selectedExtrasSnapshot = dedupeList(
        (Array.isArray(item.selected_extras) ? item.selected_extras : [])
          .map((extra) => translateClientTextToFrench(extra.label_fr || extra.name_fr || extra.name))
          .filter(Boolean) as string[]
      );
      if (selectedExtrasSnapshot.length > 0) {
        notes.push(`Suppléments: ${selectedExtrasSnapshot.join(", ")}`);
      } else {
        const selectedExtras = dedupeList(
          Array.isArray(item.selectedExtras)
            ? item.selectedExtras
                .map((extra) => translateClientTextToFrench(extra.name || extra.name_fr))
                .filter(Boolean) as string[]
            : []
        );
        if (selectedExtras.length > 0) notes.push(`Suppléments: ${selectedExtras.join(", ")}`);
      }
    }

    const directCookingValue = dedupeList(
      [
        String(itemRecord.cooking || "").trim(),
        String(itemRecord.cuisson || "").trim(),
        String(itemRecord.cooking_level || "").trim(),
        String(itemRecord.cuisson_label || "").trim(),
        String(itemRecord.selected_cooking_label || "").trim(),
        String(itemRecord.selected_cooking_label_fr || "").trim(),
        String(itemRecord.selected_cooking_label_pt || "").trim(),
        ...optionValues.cooking,
      ].map((entry) => stripPrefixedValue(entry, "cooking"))
    )[0] || "";
    const cookingLabelFr =
      String(item.selected_cooking_label_fr || "").trim() ||
      String((itemRecord.selected_cooking_label_pt as string) || "").trim() ||
      String((itemRecord.selected_cooking_label as string) || "").trim();
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

    const specialRequest = String(item.special_request || "").trim();
    if (specialRequest) {
      notes.push(`Précisions: ${translateClientTextToFrench(specialRequest)}`);
    }

    const instructions = String(item.instructions || "")
      .split("|")
      .map((segment) => String(segment || "").trim())
      .filter(Boolean)
      .map((segment) => {
        if (/^(accompagnements|beilage(:n)|sides|acompa(:n|Ã±)amientos)\s*:/i.test(segment)) return "";
        if (/^(supplements?|extras?|suplementos?)\s*:/i.test(segment)) return "";
        if (/^(cuisson|cooking|garstufe|cocci[oÃ³]n)\s*:/i.test(segment)) return "";
        const normalized = translateClientTextToFrench(segment);
        if (!normalized || isUuidLike(normalized)) return "";
        return normalized;
      })
      .filter(Boolean)
      .join(" | ");
    if (instructions) notes.push(instructions);

    return repairUtf8Text(notes.join(" | "));
  };

  const getInlineCookingLevel = (item: Item) => {
    const itemRecord = item as unknown as Record<string, unknown>;
    const direct =
      String(item.selected_cooking_label_fr || "").trim() ||
      String((itemRecord.selected_cooking_label_pt as string) || "").trim() ||
      String((itemRecord.selected_cooking_label as string) || "").trim() ||
      String(item.cooking || "").trim() ||
      String(item.cuisson || "").trim();
    if (direct) return direct;
    const cookingKey = normalizeCookingKey(item.selected_cooking_key || item.selected_cooking || "");
    return cookingKey ? getCookingLabelFr(cookingKey) : "";
  };

  const fetchCatalogNames = async () => {
    const scopeId = String(resolvedRestaurantId || "").trim();
    const dishesBaseQuery = supabase
      .from("dishes")
      .select("id,name,price,category_id,extras,sides,description")
      .order("id", { ascending: true });
    const sidesBaseQuery = supabase.from("sides_library").select("id,name_fr,name_en,name_es,name_de").order("id", { ascending: true });

    const [primaryDishesQuery, primarySidesQuery] = await Promise.all([
      scopeId ? dishesBaseQuery.eq("restaurant_id", scopeId) : dishesBaseQuery,
      scopeId ? sidesBaseQuery.eq("restaurant_id", scopeId) : sidesBaseQuery,
    ]);
    let dishesData = ((primaryDishesQuery.data || []) as Array<Record<string, unknown>>);
    let dishesError = primaryDishesQuery.error;
    if (dishesError) {
      const missingColumn = String((dishesError as { code?: string }).code || "") === "42703";
      if (scopeId && missingColumn) {
        const retryWithoutScope = await dishesBaseQuery;
        if (!retryWithoutScope.error) {
          dishesData = ((retryWithoutScope.data || []) as Array<Record<string, unknown>>);
          dishesError = null;
        }
      }
      const fallbackDishesQuery = await supabase
        .from("dishes")
        .select("id,name,price,category_id,extras,sides,description")
        .order("id", { ascending: true });
      if (!fallbackDishesQuery.error) {
        dishesData = ((fallbackDishesQuery.data || []) as Array<Record<string, unknown>>);
        dishesError = null;
      }
    }
    let sidesData = ((primarySidesQuery.data || []) as Array<Record<string, unknown>>);
    let sidesError = primarySidesQuery.error;
    if (sidesError) {
      const missingColumn = String((sidesError as { code?: string }).code || "") === "42703";
      if (scopeId && missingColumn) {
        const retryWithoutScope = await sidesBaseQuery;
        if (!retryWithoutScope.error) {
          sidesData = ((retryWithoutScope.data || []) as Array<Record<string, unknown>>);
          sidesError = null;
        }
      }
      const fallbackSidesQuery = await supabase
        .from("sides_library")
        .select("id,name_fr")
        .order("id", { ascending: true });
      if (!fallbackSidesQuery.error) {
        sidesData = ((fallbackSidesQuery.data || []) as Array<Record<string, unknown>>);
        sidesError = null;
      }
    }

    if (!dishesError) {
      const byId: Record<string, string> = {};
      const extrasByDishAndId: Record<string, string> = {};
      dishesData.forEach((row) => {
        const source = row as {
          id: unknown;
          name_fr: unknown;
          name: unknown;
          extras: unknown;
          description: unknown;
          translations: unknown;
        };
        const key = normalizeEntityId(source.id);
        if (!key) return;
        byId[key] = resolveDishNameFrFromRow(source as Record<string, unknown>);

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
                const name = String(rowEntry.name_fr || rowEntry.name || "").trim();
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
        const extrasFromRaw =
          Array.isArray(source.extras)
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
                id: buildStableExtraId(key, namePart || cleaned, amount, index),
                name: namePart || cleaned,
              };
            }
            if (!entry || typeof entry !== "object") return null;
            const rowEntry = entry as Record<string, unknown>;
            const name = String(rowEntry.name_fr || rowEntry.name || "").trim();
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
          const extraLabel = String(extra.name || "").trim();
          if (!extraId || !extraLabel) return;
          extrasByDishAndId[`${key}::${extraId}`] = extraLabel;
        });
      });
      setDishNamesFrById(byId);
      setExtraNamesFrByDishAndId(extrasByDishAndId);
    } else {
      setDishNamesFrById({});
      setExtraNamesFrByDishAndId({});
    }

    if (!sidesError) {
      const byId: Record<string, string> = {};
      const byAlias: Record<string, string> = {};
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
        byId[key] = frLabel;
        if (!frLabel) return;
        [source.name_fr, source.name_en, source.name_es, source.name_de].forEach((nameValue) => {
          const label = String(nameValue || "").trim();
          if (!label) return;
          const aliasKey = normalizeLookupText(label);
          if (aliasKey) byAlias[aliasKey] = frLabel;
          const tokenValues = parseI18nToken(label);
          Object.values(tokenValues).forEach((tokenLabel) => {
            const tokenAliasKey = normalizeLookupText(tokenLabel);
            if (tokenAliasKey) byAlias[tokenAliasKey] = frLabel;
          });
        });
      });
      setSideNamesFrById(byId);
      setSideNamesFrByAlias(byAlias);
    }
  };

  const printableCuisineItems = (order: Order) =>
    getOrderItems(order).filter((item: any) => !isDrink(item));

  const isRateLimitError = (error: any) => {
    const code = String(error.code || error.status || "").toLowerCase();
    const message = String(error.message || "").toLowerCase();
    return code === "429" || message.includes("too many requests") || message.includes("rate limit");
  };

  const hydrateDishNamesFromOrders = async (ordersToHydrate: Order[]) => {
    const ids = Array.from(
      new Set(
        ordersToHydrate
          .flatMap((order) => getOrderItems(order))
          .map((item) => normalizeEntityId(item.dish_id || item.id || item.dish.id))
          .filter(Boolean)
      )
    );
    if (ids.length === 0) return;

    const lookup = await supabase.from("dishes").select("id,name,name_fr,translations").in("id", ids);
    if (lookup.error) {
      console.warn("Lookup dishes cuisine échoué:", lookup.error);
      return;
    }

    const byId: Record<string, string> = {};
    (lookup.data || []).forEach((row) => {
      const source = row as { id: unknown; name_fr: unknown; name: unknown; translations: unknown };
      const key = normalizeEntityId(source.id);
      const label = resolveDishNameFrFromRow(source as Record<string, unknown>);
      if (!key || !label) return;
      byId[key] = label;
    });

    if (Object.keys(byId).length > 0) {
      setDishNamesFrById((prev) => ({ ...prev, ...byId }));
    }
  };

  const resolveCallsTable = async () => {
    const primary = await supabase.from("calls").select("id").limit(1);
    if (!primary.error) {
      if (callsTableName !== "calls") setCallsTableName("calls");
      return "calls" as const;
    }
    logSqlError("kitchen.resolveCallsTable.primary", primary.error);
    return "calls" as const;
  };

  const fetchKitchenSettings = async () => {
    const restaurantId = String(resolvedRestaurantId || "").trim();
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", restaurantId)
      .maybeSingle();
    if (error || !data) return;
    const row = data as Record<string, unknown>;
    const tableConfig =
      typeof row.table_config === "string"
        ? (() => {
            try {
              return JSON.parse(String(row.table_config || "{}")) as Record<string, unknown>;
            } catch {
              return {} as Record<string, unknown>;
            }
          })()
        : (row.table_config as Record<string, unknown> | null) || {};
    const direct = row.auto_print;
    const nested = tableConfig.auto_print;
    const hasDirectAutoPrintValue = direct !== null && direct !== undefined && String(direct).trim() !== "";
    const nextAutoPrint = hasDirectAutoPrintValue
      ? direct === true || direct === "true"
      : nested === true || nested === "true";
    console.log("Auto-print activé ?", row.auto_print ?? null, "=>", nextAutoPrint);
    setAutoPrintEnabled(nextAutoPrint);
  };

  const fetchOrders = async (allowAutoPrint = false) => {
    let shouldTriggerAutoPrint = false;
    try {
      const restaurantId = String(resolvedRestaurantId || "").trim();
      if (!restaurantId) {
        setOrders([]);
        return false;
      }
      const sinceIso = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      let ordersResult = await supabase
        .from("orders")
        .select("*, order_items!inner(*, dishes(*))")
        .eq("restaurant_id", restaurantId)
        .gt("created_at", sinceIso)
        .order("created_at", { ascending: true });
      if (ordersResult.error) {
        ordersResult = await supabase
          .from("orders")
          .select("*, order_items(*, dishes(*))")
          .eq("restaurant_id", restaurantId)
          .gt("created_at", sinceIso)
          .order("created_at", { ascending: true });
      }
      if (ordersResult.error) {
        ordersResult = await supabase
          .from("orders")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .gt("created_at", sinceIso)
          .order("created_at", { ascending: true });
      }
      const { data, error } = ordersResult;

      if (error) {
        logSqlError("kitchen.fetchOrders.primary", error);
        if (isRateLimitError(error)) setRefreshMs((prev) => (prev === 5000 ? prev : 5000));
        return;
      }

      const allowedStatuses = new Set([
        "pending",
        "preparing",
        "to_prepare",
        "to_prepare_kitchen",
        "en_preparation",
        "en_attente",
        "ready",
      ]);

      const kitchenOrders = (data || []).filter((order: any) => {
        const normalizedStatus = String(order.status || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();
        if (!allowedStatuses.has(normalizedStatus)) return false;
        const items = getOrderItems(order as Order);
        return items.some((item: any) => !isDrink(item));
      });

      const normalizeCoversValue = (value: unknown) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return null;
        const whole = Math.trunc(n);
        return whole > 0 ? whole : null;
      };
      const readOrderCovers = (order: any) =>
        normalizeCoversValue(order?.covers) ??
        normalizeCoversValue(order?.guest_count) ??
        normalizeCoversValue(order?.customer_count);

      const missingCoverTables = Array.from(
        new Set(
          kitchenOrders
            .filter((order: any) => !readOrderCovers(order))
            .map((order: any) => String(order.table_number || "").trim())
            .filter(Boolean)
        )
      );
      let coversByTable = new Map<string, number>();
      if (missingCoverTables.length > 0) {
        const { data: tableRows } = await supabase
          .from("table_assignments")
          .select("*")
          .in("table_number", missingCoverTables);
        coversByTable = new Map<string, number>();
        (tableRows || []).forEach((row: any) => {
          const key = String(row?.table_number || "").trim();
          const covers =
            normalizeCoversValue(row?.covers) ??
            normalizeCoversValue(row?.guest_count) ??
            normalizeCoversValue(row?.customer_count);
          if (key && covers) coversByTable.set(key, covers);
        });
      }
      const kitchenOrdersWithCovers = kitchenOrders.map((order: any) => {
        if (readOrderCovers(order)) return order;
        const fallback = coversByTable.get(String(order?.table_number || "").trim());
        if (!fallback) return order;
        return { ...order, covers: fallback, guest_count: fallback, customer_count: fallback };
      });

      await hydrateDishNamesFromOrders(kitchenOrdersWithCovers);

      const pendingRows = kitchenOrdersWithCovers.filter((o: any) => String(o.status || "") === "pending");
      const pendingMap: Record<string, boolean> = {};
      pendingRows.forEach((o: any) => {
        pendingMap[String(o.id)] = true;
      });
      const newPending = pendingRows.find((o: any) => !knownPendingIdsRef.current[String(o.id)]);
      if (autoPrintEnabled && allowAutoPrint && hasInitializedPendingSnapshotRef.current && newPending) {
        setPrintOrder(newPending);
        shouldTriggerAutoPrint = true;
      }
      knownPendingIdsRef.current = pendingMap;
      hasInitializedPendingSnapshotRef.current = true;
      setOrders(kitchenOrdersWithCovers);
      return shouldTriggerAutoPrint;
    } catch (error) {
      logSqlError("kitchen.fetchOrders.unexpected", error);
      if (isRateLimitError(error)) setRefreshMs((prev) => (prev === 5000 ? prev : 5000));
      return false;
    }
  };

  const handleAutoPrint = () => {
    // On laisse 1 seconde pour que le ticket soit généré dans le DOM
    setTimeout(() => {
      window.print();
    }, 1000);
  };

  useEffect(() => {
    void (async () => {
      await resolveCallsTable();
      await fetchKitchenSettings();
      await fetchOrders();
      await fetchCatalogNames();
    })();

    const channel = supabase
      .channel("kitchen-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        async (payload) => {
          await fetchOrders(payload?.eventType === "INSERT");
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurants" }, () => void fetchKitchenSettings())
      .on("postgres_changes", { event: "*", schema: "public", table: "dishes" }, () => void fetchCatalogNames())
      .on("postgres_changes", { event: "*", schema: "public", table: "sides_library" }, () => void fetchCatalogNames())
      .subscribe();

    const poll = window.setInterval(() => {
      void fetchOrders();
    }, refreshMs);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(poll);
    };
  }, [refreshMs, autoPrintEnabled, resolvedRestaurantId]);

  useEffect(() => {
    setIsMounted(true);
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    if (!printOrder || !autoPrintEnabled) return;
    const nextOrderId = String(printOrder.id || "").trim();
    if (!nextOrderId || nextOrderId === lastPrintedId) return;
    console.log("Nouvelle commande reçue, tentative d'impression...");
    setLastPrintedId(nextOrderId);
    handleAutoPrint();
  }, [printOrder, autoPrintEnabled, lastPrintedId]);

  const handleReady = async (orderId: string | number) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    let updateResult = await supabase.from("orders").update({ status: "ready" }).eq("id", orderId);
    if (updateResult.error) {
      const fallback = await supabase.from("orders").update({ status: "pret" }).eq("id", orderId);
      updateResult = fallback;
    }

    if (updateResult.error) {
      console.error("Erreur update:", updateResult.error);
      fetchOrders();
    }
  };

  const handleRemindServer = async () => {
    const targetRestaurantId = String(resolvedRestaurantId || "").trim();
    if (!targetRestaurantId) {
      alert("Restaurant introuvable, rappel impossible.");
      return;
    }

    const notificationPayload = {
      type: "CUISINE",
      message: "La cuisine appelle les serveurs",
      table_number: "CUISINE",
      status: "pending",
      restaurant_id: targetRestaurantId,
    };
    const notifInsert = await supabase.from("notifications").insert([notificationPayload]);
    if (notifInsert.error) {
      logSqlError("kitchen.handleRemindServer.notifications", notifInsert.error);
      alert("Impossible d'envoyer le rappel serveur.");
      return;
    }

    alert("Alerte envoyée aux serveurs.");
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const isReadyStatus = (status: unknown) => {
    const normalized = String(status || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    return normalized === "ready" || normalized === "pret";
  };
  const priorityOrders = orders.filter((order) => !isReadyStatus(order.status));
  const readyHistoryOrders = orders.filter((order) => isReadyStatus(order.status));
  const handleManualPrint = () => {
    const targetOrder = priorityOrders[0] || readyHistoryOrders[0] || orders[0] || null;
    if (!targetOrder) return;
    setPrintOrder(targetOrder);
    handleAutoPrint();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-black">
      <div className="mb-6 bg-white p-4 shadow rounded-lg">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold uppercase">
            CUISINE - <span suppressHydrationWarning>{isMounted ? currentTime.toLocaleTimeString("fr-FR") : "--:--:--"}</span>
          </h1>
          <div className="flex items-center gap-2">
            {autoPrintEnabled ? (
              <span className="rounded border-2 border-black bg-green-100 px-3 py-2 text-xs font-black text-green-900">
                Impression auto...
              </span>
            ) : (
              <button
                onClick={handleManualPrint}
                disabled={orders.length === 0}
                className="rounded border-2 border-black bg-white px-4 py-2 text-sm font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-gray-100 disabled:opacity-50 disabled:shadow-none"
              >
                IMPRIMER
              </button>
            )}
            <button
              onClick={() => handleRemindServer()}
              className="rounded border-2 border-black bg-orange-600 px-4 py-2 text-sm font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-orange-700"
            >
              <span className="inline-flex items-center gap-2">
                <BellRing className="h-4 w-4" />
                APPELER SERVEUR
              </span>
            </button>
          </div>
        </div>
      </div>

      {orders.length === 0 && <p className="text-gray-500 italic">Aucune commande en attente pour la cuisine.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {priorityOrders.map((order) => {
          const isReady = isReadyStatus(order.status);
          const items = getOrderItems(order as Order);
          const kitchenItems = items.filter((item: any) => !isDrink(item));

          if (kitchenItems.length === 0) return null;

          return (
            <div
              key={order.id}
              className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-2">
                  <h2 className="text-3xl font-black">
                    T-{order.table_number}
                    {Number(order.covers || order.guest_count || order.customer_count) > 0
                      ? ` | 👥 ${Number(order.covers || order.guest_count || order.customer_count)}`
                      : ""}
                  </h2>
                  <span className="text-xs font-mono text-gray-500">#{String(order.id).slice(0, 4)}</span>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600">Arrivée: {formatTime(order.created_at)}</p>
                </div>

                <div className="space-y-2 mb-4">
                  {kitchenItems.map((item: any, idx: number) => {
                    const kitchenDetails = getKitchenNotes(item);
                    const cookingInline = getInlineCookingLevel(item as Item);
                    return (
                      <div key={`${String(order.id)}-${idx}-${String(item.dish_id || item.id || "")}`} className="bg-gray-100 p-2">
                        <div className="font-bold text-lg">
                          <span className="bg-black text-white px-2 mr-2 rounded">{item.quantity}x</span>
                          <span translate="no" className="notranslate">
                            {resolveKitchenDishName(item)}
                          </span>
                          {cookingInline ? (
                            <span className="ml-2 italic font-black text-red-700 notranslate" translate="no">
                              ({cookingInline})
                            </span>
                          ) : null}
                        </div>
                        {kitchenDetails ? (
                          <div
                            className="mt-1 text-xs italic text-red-600 leading-tight"
                            translate="no"
                          >
                            <span className="notranslate">{kitchenDetails}</span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-300">
                <div className="space-y-2">
                  <button
                    onClick={() => handleReady(order.id)}
                    disabled={isReady}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 text-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isReady ? "DÉJÀ PRÊT" : "PLAT PRÊT"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {readyHistoryOrders.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-black uppercase text-gray-700">Historique plats prêts</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {readyHistoryOrders.map((order) => {
              const items = getOrderItems(order as Order);
              const kitchenItems = items.filter((item: any) => !isDrink(item));
              if (kitchenItems.length === 0) return null;
              return (
                <div key={`ready-${order.id}`} className="rounded border border-gray-300 bg-gray-50 p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-sm font-black">
                      T-{order.table_number}
                      {Number(order.covers || order.guest_count || order.customer_count) > 0
                        ? ` | 👥 ${Number(order.covers || order.guest_count || order.customer_count)}`
                        : ""}
                    </div>
                    <span className="rounded bg-green-600 px-2 py-0.5 text-[10px] font-bold text-white">PRÊT</span>
                  </div>
                  <div className="space-y-1">
                    {kitchenItems.map((item: any, idx: number) => {
                      const kitchenDetails = getKitchenNotes(item);
                      const cookingInline = getInlineCookingLevel(item as Item);
                      return (
                        <div key={`${String(order.id)}-ready-${idx}-${String(item.dish_id || item.id || "")}`} className="text-xs text-black">
                          <div className="font-semibold">
                            {item.quantity}x{" "}
                            <span translate="no" className="notranslate">
                              {resolveKitchenDishName(item)}
                            </span>
                            {cookingInline ? (
                              <span className="ml-1 italic font-bold text-red-700 notranslate" translate="no">
                                ({cookingInline})
                              </span>
                            ) : null}
                          </div>
                          {kitchenDetails ? (
                            <div className="text-[11px] italic text-gray-700" translate="no">
                              <span className="notranslate">{kitchenDetails}</span>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
      {printOrder ? (
        <>
          <div id="ticket-print" className="hidden print:block p-4 text-black">
            <div className="text-xl font-bold">
              CUISINE - T-{printOrder.table_number}
              {Number(printOrder.covers || printOrder.guest_count || printOrder.customer_count) > 0
                ? ` | 👥 ${Number(printOrder.covers || printOrder.guest_count || printOrder.customer_count)}`
                : ""}
            </div>
            <div className="text-sm mb-2">{new Date(printOrder.created_at).toLocaleTimeString("fr-FR")}</div>
            <div className="border-t border-b border-dashed border-black py-2">
              {printableCuisineItems(printOrder).map((item: any, idx: number) => {
                const kitchenDetails = getKitchenNotes(item);
                const cookingInline = getInlineCookingLevel(item as Item);
                return (
                  <div key={`print-${String(printOrder.id)}-${idx}-${String(item.dish_id || item.id || "")}`}>
                    {item.quantity}x{" "}
                    <span translate="no" className="notranslate">
                      {resolveKitchenDishName(item)}
                    </span>
                    {cookingInline ? <span translate="no" className="notranslate"> ({cookingInline})</span> : null}
                    {kitchenDetails ? (
                      <div translate="no" className="notranslate italic text-xs">
                        Détails: {kitchenDetails}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #ticket-print, #ticket-print * { visibility: visible !important; }
              #ticket-print {
                position: fixed;
                top: 0;
                left: 0;
                width: 80mm;
                font-family: "Courier New", Courier, monospace;
              }
            }
          `}</style>
        </>
      ) : null}
    </div>
  );
}
