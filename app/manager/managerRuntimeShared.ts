export const FINANCE_I18N = {
  fr: {
    section: "Analyses Financières",
    revenue: "Chiffre d'affaires du jour",
    averageBasket: "Panier moyen",
    topProducts: "Top 5 produits",
    paidOrders: "Commandes payées",
    sold: "ventes",
    noData: "Aucune vente payée pour le moment.",
  },
  es: {
    section: "Analisis Financieros",
    revenue: "Facturacion del dia",
    averageBasket: "Ticket medio",
    topProducts: "Top 5 productos",
    paidOrders: "Pedidos pagados",
    sold: "ventas",
    noData: "Aun no hay ventas pagadas.",
  },
  de: {
    section: "Finanzanalyse",
    revenue: "Tagesumsatz",
    averageBasket: "Durchschnittskorb",
    topProducts: "Top 5 Produkte",
    paidOrders: "Bezahlte Bestellungen",
    sold: "Verkaeufe",
    noData: "Noch keine bezahlten Verkaeufe.",
  },
} as const;

export const ANALYTICS_I18N = {
  fr: {
    title: "Analyses Financières",
    liveTab: "Live Performance",
    productTab: "Product Analysis",
    trendsTab: "Time & Trends",
    opsTab: "Staff & Tables",
    today: "Aujourd'hui",
    last7Days: "7 jours",
    last30Days: "30 jours",
    realRevenue: "CA réel",
    tipsTotal: "Pourboires totaux",
    potentialRevenue: "CA potentiel",
    averageBasket: "Panier moyen",
    tableState: "État des tables",
    freeTables: "Tables libres",
    occupiedTables: "Tables occupées",
    waitingPayment: "Attente encaissement",
    top5: "Top 5 produits",
    flop5: "Flop 5 produits",
    productMix: "Mix Produit",
    starters: "Entrées",
    mains: "Plats",
    desserts: "Desserts",
    drinks: "Boissons",
    upsellRate: "Taux de dessert",
    recommendationConversion: "Ventes via Recommandation",
    recommendationItems: "Articles vendus via recommandation",
    featuredSales: "Ventes plats mis en avant",
    topRevenue: "Top 5 CA produits",
    salesByHour: "Ventes par heure",
    salesByDay: "CA par jour",
    salesByWeek: "CA par semaine",
    comparison: "Comparaison période précédente",
    tablePerformance: "Performance par table",
    assignments: "Assignations serveur",
    noData: "Aucune donnée disponible.",
    noAssignments: "Aucune assignation de table.",
    sold: "ventes",
    revenue: "CA",
    vsPrevious: "vs période précédente",
  },
  es: {
    title: "Analisis Financieros",
    liveTab: "Live Performance",
    productTab: "Product Analysis",
    trendsTab: "Time & Trends",
    opsTab: "Staff & Tables",
    today: "Hoy",
    last7Days: "7 dias",
    last30Days: "30 dias",
    realRevenue: "Facturacion real",
    tipsTotal: "Propinas totales",
    potentialRevenue: "Facturacion potencial",
    averageBasket: "Ticket medio",
    tableState: "Estado de mesas",
    freeTables: "Mesas libres",
    occupiedTables: "Mesas ocupadas",
    waitingPayment: "Pendiente cobro",
    top5: "Top 5 productos",
    flop5: "Flop 5 productos",
    productMix: "Mix de producto",
    starters: "Entrantes",
    mains: "Platos",
    desserts: "Postres",
    drinks: "Bebidas",
    upsellRate: "Tasa de postre",
    recommendationConversion: "Ventas via recomendacion",
    recommendationItems: "Articulos via recomendacion",
    featuredSales: "Ventas platos destacados",
    topRevenue: "Top 5 facturacion productos",
    salesByHour: "Ventas por hora",
    salesByDay: "Facturacion por dia",
    salesByWeek: "Facturacion por semana",
    comparison: "Comparacion periodo anterior",
    tablePerformance: "Rendimiento por mesa",
    assignments: "Asignaciones de camareros",
    noData: "No hay datos disponibles.",
    noAssignments: "No hay asignaciones de mesa.",
    sold: "ventas",
    revenue: "Facturacion",
    vsPrevious: "vs periodo anterior",
  },
  de: {
    title: "Finanzanalyse",
    liveTab: "Live Performance",
    productTab: "Product Analysis",
    trendsTab: "Time & Trends",
    opsTab: "Staff & Tables",
    today: "Heute",
    last7Days: "7 Tage",
    last30Days: "30 Tage",
    realRevenue: "Realer Umsatz",
    tipsTotal: "Trinkgelder gesamt",
    potentialRevenue: "Potenzial Umsatz",
    averageBasket: "Durchschnittsbon",
    tableState: "Tischstatus",
    freeTables: "Freie Tische",
    occupiedTables: "Belegte Tische",
    waitingPayment: "Warten auf Zahlung",
    top5: "Top 5 Produkte",
    flop5: "Flop 5 Produkte",
    productMix: "Produktmix",
    starters: "Vorspeisen",
    mains: "Hauptgerichte",
    desserts: "Desserts",
    drinks: "Getraenke",
    upsellRate: "Dessert-Rate",
    recommendationConversion: "Verkaeufe ueber Empfehlung",
    recommendationItems: "Artikel ueber Empfehlung",
    featuredSales: "Verkaeufe hervorgehobener Gerichte",
    topRevenue: "Top 5 Umsatz Produkte",
    salesByHour: "Umsatz pro Stunde",
    salesByDay: "Umsatz pro Tag",
    salesByWeek: "Umsatz pro Woche",
    comparison: "Vergleich zur Vorperiode",
    tablePerformance: "Umsatz pro Tisch",
    assignments: "Service-Zuordnungen",
    noData: "Keine Daten verfuegbar.",
    noAssignments: "Keine Tisch-Zuordnungen.",
    sold: "Verkaeufe",
    revenue: "Umsatz",
    vsPrevious: "vs Vorperiode",
  },
} as const;

export type HungerLevelsConfig = {
  small: boolean;
  medium: boolean;
  large: boolean;
};

export function createLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function normalizeHungerLevel(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const normalized = normalizeText(raw);
  if (normalized === "petite faim" || normalized === "small hunger") return "Petite faim";
  if (normalized === "moyenne faim" || normalized === "medium hunger") return "Moyenne faim";
  if (
    normalized === "grande faim" ||
    normalized === "grosse faim" ||
    normalized === "big hunger" ||
    normalized === "large hunger" ||
    normalized === "hearty"
  ) {
    return "Grande faim";
  }
  return raw;
}

export function createEmptyHungerLevels(): HungerLevelsConfig {
  return { small: false, medium: false, large: false };
}

export function parseHungerLevels(value: unknown): HungerLevelsConfig {
  const empty = createEmptyHungerLevels();
  const applyToken = (tokenRaw: unknown) => {
    const token = normalizeText(String(tokenRaw || "").trim());
    if (!token) return;
    if (["small", "petite", "petite faim", "small hunger", "little hunger"].includes(token)) empty.small = true;
    if (["medium", "moyenne", "moyenne faim", "medium hunger"].includes(token)) empty.medium = true;
    if (["large", "big", "grande", "grosse", "grande faim", "grosse faim", "big hunger", "large hunger", "hearty"].includes(token)) {
      empty.large = true;
    }
  };

  const source =
    typeof value === "string"
      ? (() => {
          const trimmed = value.trim();
          if (!trimmed) return null;
          try {
            return JSON.parse(trimmed);
          } catch {
            return trimmed.split(",");
          }
        })()
      : value;

  if (Array.isArray(source)) {
    source.forEach((entry) => applyToken(entry));
    return empty;
  }

  if (source && typeof source === "object") {
    const node = source as Record<string, unknown>;
    const check = (keys: string[]) =>
      keys.some((key) => {
        if (!Object.prototype.hasOwnProperty.call(node, key)) return false;
        return Boolean(node[key]);
      });
    empty.small = check(["small", "petite", "petite_faim", "petiteFaim", "small_hunger", "smallHunger"]);
    empty.medium = check(["medium", "moyenne", "moyenne_faim", "moyenneFaim", "medium_hunger", "mediumHunger"]);
    empty.large = check(["large", "big", "grande", "grosse", "grande_faim", "grosse_faim", "large_hunger", "big_hunger", "bigHunger"]);
    return empty;
  }

  applyToken(value);
  return empty;
}

export function hasAnyHungerLevel(levels: HungerLevelsConfig) {
  return Boolean(levels.small || levels.medium || levels.large);
}

export function resolveLegacyHungerLevelLabel(levels: HungerLevelsConfig) {
  if (levels.large) return "Grande faim";
  if (levels.medium) return "Moyenne faim";
  if (levels.small) return "Petite faim";
  return "";
}

export function getExtraKey(nameFr: string, price: number) {
  return `${normalizeText(nameFr || "")}__${Number(price || 0).toFixed(2)}`;
}

const I18N_TOKEN = "__I18N__:";

export const DEFAULT_LANGUAGE_LABELS: Record<string, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  de: "Deutsch",
};

export const DEFAULT_SUGGESTION_LEADS: Record<string, string> = {
  fr: "Ce plat se marie tres bien avec",
  en: "This dish pairs perfectly with",
  es: "Este plato combina perfectamente con",
  de: "Dieses Gericht passt perfekt zu",
  it: "Questo piatto si abbina molto bene con",
  pt: "Este prato combina muito bem com",
  ja: "Kono ryori to aisho ga yoi no wa",
  nl: "Dit gerecht past heel goed bij",
  pl: "To danie swietnie komponuje sie z",
  ro: "Acest preparat se potriveste foarte bine cu",
  el: "Auto to piato tairiazei poly kala me",
  zh: "Zhe dao cai hen shihe dapei",
  ko: "I yorineun daeumgwa aju jal eoullimnida",
  ru: "Eto bliudo otlichno sochetaetsia s",
  ar: "Hatha al tabaq yansajim jayyidan ma",
};

export function parseI18nToken(value?: string | null): Record<string, string> {
  const raw = String(value || "").trim();
  if (!raw.startsWith(I18N_TOKEN)) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(raw.replace(I18N_TOKEN, "")));
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [
        String(k || "").toLowerCase(),
        String(v ?? ""),
      ])
    );
  } catch {
    return {};
  }
}

export function parseJsonObject(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

export function buildI18nToken(values: Record<string, string>) {
  return `${I18N_TOKEN}${encodeURIComponent(JSON.stringify(values))}`;
}

export function normalizeLanguageKey(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

export function getLanguageColumnKeys(prefix: string, languageCode: string) {
  const normalized = normalizeLanguageKey(languageCode);
  if (!normalized) return [] as string[];
  const keys = [`${prefix}_${normalized}`];
  const aliases: Record<string, string[]> = {
    ja: ["jp"],
    jp: ["ja"],
    zh: ["cn"],
    cn: ["zh"],
    ko: ["kr"],
    kr: ["ko"],
    el: ["gr"],
    gr: ["el"],
  };
  (aliases[normalized] || []).forEach((alias) => keys.push(`${prefix}_${alias}`));
  return Array.from(new Set(keys));
}

export function formatLanguageLabel(raw: string, fallbackKey: string) {
  const trimmed = String(raw || "").trim();
  if (trimmed) return trimmed;
  if (DEFAULT_LANGUAGE_LABELS[fallbackKey]) return DEFAULT_LANGUAGE_LABELS[fallbackKey];
  return fallbackKey.toUpperCase();
}

export function getDefaultSuggestionLead(languageCode: string) {
  const normalized = normalizeLanguageKey(languageCode);
  return DEFAULT_SUGGESTION_LEADS[normalized] || DEFAULT_SUGGESTION_LEADS.fr;
}

export function parseEnabledLanguageEntries(raw: unknown) {
  let values: string[] = [];
  if (Array.isArray(raw)) {
    values = raw.map((v) => String(v || "").trim()).filter(Boolean);
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          values = parsed.map((v) => String(v || "").trim()).filter(Boolean);
        } else {
          values = trimmed.split(",").map((v) => v.trim()).filter(Boolean);
        }
      } catch {
        values = trimmed.split(",").map((v) => v.trim()).filter(Boolean);
      }
    }
  }

  const labels: Record<string, string> = { ...DEFAULT_LANGUAGE_LABELS };
  const orderedCodes: string[] = [];
  const withFr = values.length > 0 ? values : ["fr", "en"];
  withFr.forEach((entryRaw) => {
    const entry = String(entryRaw || "").trim();
    if (!entry) return;
    const sepIndex = entry.indexOf("::");
    const rawCode = sepIndex >= 0 ? entry.slice(0, sepIndex).trim() : entry;
    const rawLabel = sepIndex >= 0 ? entry.slice(sepIndex + 2).trim() : entry;
    const key = normalizeLanguageKey(rawCode) || normalizeLanguageKey(rawLabel);
    if (!key) return;
    if (!orderedCodes.includes(key)) orderedCodes.push(key);
    labels[key] = formatLanguageLabel(rawLabel, key);
  });

  if (!orderedCodes.includes("fr")) orderedCodes.unshift("fr");
  if (!labels.fr) labels.fr = "Français";
  if (orderedCodes.length === 2 && orderedCodes.includes("fr") && orderedCodes.includes("en")) {
    if (!orderedCodes.includes("es")) orderedCodes.push("es");
    if (!orderedCodes.includes("de")) orderedCodes.push("de");
    if (!labels.es) labels.es = "Español";
    if (!labels.de) labels.de = "Deutsch";
  }

  return { codes: orderedCodes, labels };
}

export function serializeEnabledLanguageEntries(codes: string[], labels: Record<string, string>) {
  const unique = Array.from(new Set(["fr", ...codes]));
  return unique.map((code) => `${code}::${formatLanguageLabel(labels[code], code)}`);
}
