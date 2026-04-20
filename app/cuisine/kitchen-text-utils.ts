export const normalizeEntityId = (value: unknown) => String(value ?? "").trim();

export const repairUtf8Text = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const normalized = raw.normalize("NFC");
  const replacements: Array<[RegExp, string]> = [
    [/Acompanhamentos/gi, "Accompagnements"],
    [/Acompanhamento/gi, "Accompagnement"],
    [/Acompanhamentos/gi, "Accompagnements"],
    [/Acompañamientos/gi, "Accompagnements"],
    [/Acompañamiento/gi, "Accompagnement"],
    [/Suplementos/gi, "Suppléments"],
    [/Suplemento/gi, "Supplément"],
    [/Precisions/gi, "Précisions"],
    [/Precisions/gi, "Précisions"],
  ];
  return replacements.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), normalized);
};

export const normalizeLookupText = (value: unknown) =>
  repairUtf8Text(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const isUuidLike = (value: unknown) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());

export const buildStableExtraId = (dishId: unknown, name: unknown, price: unknown, index = 0) => {
  const dishKey = normalizeEntityId(dishId);
  const nameKey = normalizeLookupText(name || "");
  const amount = Number(price || 0);
  const safeAmount = Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
  return `extra:${dishKey}:${nameKey || "option"}:${safeAmount}:${index}`;
};

export const parseI18nToken = (value: unknown, tokenPrefix: string) => {
  const raw = String(value || "").trim();
  if (!raw.startsWith(tokenPrefix)) return {} as Record<string, string>;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw.replace(tokenPrefix, "")));
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

export const parseJsonRecord = (value: unknown): Record<string, unknown> | null => {
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

export const getFrenchTranslationValue = (translations: unknown) => {
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

export const keepStaffFrenchLabel = (value: unknown) => {
  const raw = repairUtf8Text(value);
  if (!raw) return "";
  const firstSegment = raw.split(/\s\/\s/).map((part) => part.trim()).filter(Boolean)[0] || raw;
  return firstSegment.replace(/\s{2,}/g, " ").trim();
};

export const sanitizeKitchenText = (value: unknown) => {
  const raw = repairUtf8Text(value);
  if (!raw) return "";
  return raw
    .replace(/\(\+\s*[\d.,]+\s*(?:€|€)\)/gi, "")
    .replace(/\+\s*[\d.,]+\s*(?:€|€)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

export const translateClientTextToFrench = (value: unknown) => {
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
    if (/^(accompagnements|beilage(:n)|sides|acompa(:n|ñ)amientos)\s*:/i.test(trimmed)) {
      return trimmed.replace(/^[^:]+:\s*/i, "Accompagnements: ");
    }
    if (/^(cuisson|cooking|garstufe|cocci[oó]n)\s*:/i.test(trimmed)) {
      return trimmed.replace(/^[^:]+:\s*/i, "Cuisson: ");
    }
    if (/^(supplements?|extras?|suplementos?)\s*:/i.test(trimmed)) {
      return trimmed.replace(/^[^:]+:\s*/i, "Suppléments: ");
    }
    if (/^(demande|special request|request|petici[oó]n especial|besonderer wunsch)\s*:/i.test(trimmed)) {
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
