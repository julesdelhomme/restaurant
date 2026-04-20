// @ts-nocheck

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function uniqBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const next: T[] = [];
  items.forEach((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return;
    seen.add(key);
    next.push(item);
  });
  return next;
}

export function extractFormulaProductOptionsForManager(
  dish: Record<string, unknown>,
  deps: {
    createLocalId: () => string;
    normalizeLanguageKey: (lang: string) => string;
    parseObjectRecord: (value: unknown) => Record<string, unknown>;
    parseI18nToken: (value: string) => Record<string, string>;
  }
) {
  const { createLocalId, normalizeLanguageKey, parseObjectRecord, parseI18nToken } = deps;
  const formulaConfigRaw = dish.formula_config;
  const formulaConfig =
    typeof formulaConfigRaw === "string"
      ? parseObjectRecord(formulaConfigRaw)
      : toRecord(formulaConfigRaw) || {};

  const sources: unknown[] = [
    dish.options,
    dish.selected_options,
    dish.selectedOptions,
    dish.product_options,
    formulaConfig.options,
    formulaConfig.selected_options,
    formulaConfig.selectedOptions,
    formulaConfig.choices,
    formulaConfig.selection,
    formulaConfig.selections,
  ];

  const steps = toArray(formulaConfig.steps);
  steps.forEach((step) => {
    const stepRecord = toRecord(step);
    if (!stepRecord) return;
    sources.push(
      stepRecord.options,
      stepRecord.selected_options,
      stepRecord.selectedOptions,
      stepRecord.choices,
      stepRecord.selection,
      stepRecord.selections
    );
    toArray(stepRecord.selections).forEach((selection) => {
      const selectionRecord = toRecord(selection);
      if (!selectionRecord) return;
      sources.push(
        selectionRecord.options,
        selectionRecord.selected_options,
        selectionRecord.selectedOptions,
        selectionRecord.choices
      );
    });
  });

  const flatten = (value: unknown): unknown[] => {
    if (Array.isArray(value)) return value.flatMap((entry) => flatten(entry));
    if (!value || typeof value !== "object") return [value];
    const record = value as Record<string, unknown>;
    const nested = [
      record.values,
      record.value,
      record.options,
      record.selected_options,
      record.selectedOptions,
      record.choices,
      record.selection,
      record.selections,
    ];
    const nestedArray = nested.flatMap((entry) => flatten(entry));
    return [value, ...nestedArray];
  };

  const rawCandidates = sources.flatMap((source) => flatten(source));
  const mapped = rawCandidates
    .map((entry) => {
      const record = toRecord(entry);
      if (!record) return null;
      const namesI18n = {
        ...parseObjectRecord(record.names_i18n),
        ...parseI18nToken(String(record.name_en || "")),
      };
      const name =
        String(record.name_fr || namesI18n.fr || record.name || record.label_fr || record.label || "").trim();
      if (!name) return null;
      const priceRaw = record.price_override ?? record.price ?? null;
      const parsedPrice =
        priceRaw == null || String(priceRaw).trim() === ""
          ? null
          : Number.parseFloat(String(priceRaw).replace(",", "."));
      return {
        id: String(record.id || createLocalId()),
        name,
        name_fr: name,
        name_en: String(record.name_en || namesI18n.en || "").trim() || null,
        name_es: String(record.name_es || namesI18n.es || "").trim() || null,
        name_de: String(record.name_de || namesI18n.de || "").trim() || null,
        names_i18n: {
          fr: name,
          ...Object.fromEntries(
            Object.entries(namesI18n)
              .map(([lang, value]) => [normalizeLanguageKey(lang), String(value || "").trim()])
              .filter(([lang, value]) => Boolean(lang) && Boolean(value))
          ),
        },
        price_override: Number.isFinite(parsedPrice as number) ? Number(parsedPrice) : null,
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  return uniqBy(mapped, (option) => {
    const id = String(option.id || "").trim();
    const name = String(option.name_fr || option.name || "").trim().toLowerCase();
    return `${id}::${name}`;
  });
}

export function mergeProductOptions(
  tableOptions: Array<Record<string, unknown>>,
  formulaFallbackOptions: Array<Record<string, unknown>>
) {
  const combined = [...(Array.isArray(tableOptions) ? tableOptions : []), ...(Array.isArray(formulaFallbackOptions) ? formulaFallbackOptions : [])];
  return uniqBy(combined, (option) => {
    const id = String(option.id || "").trim();
    const name = String(option.name_fr || option.name || "").trim().toLowerCase();
    return `${id}::${name}`;
  });
}
