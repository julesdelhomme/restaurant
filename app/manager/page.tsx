// -*- coding: utf-8 -*-
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { ChevronDown, ChevronRight, CircleHelp, Pencil, Printer, Star, Trash2, X } from "lucide-react";
import { DEFAULT_ALLERGEN_TRANSLATIONS_EXTENDED, PREDEFINED_LANGUAGE_OPTIONS_EXTENDED } from "../lib/languagesConfig";
import RestaurantQrCard from "../components/RestaurantQrCard";
import DashboardOtpGate from "../components/DashboardOtpGate";
import { buildRestaurantPublicUrl, buildRestaurantVitrineUrl } from "@/lib/restaurant-url";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const supabaseUrl = "https://ezzetspsjqgylsqkukdp.supabase.co";
const supabaseKey = "sb_publishable_ckJLAlKTmQN1KJw4m2Bk9A_k2Aij-Xd";
const DEFAULT_RESTAURANT_NAME = "Mon Restaurant";
const RESTAURANT_LOGOS_BUCKET = "logos";
const RESTAURANT_BANNERS_BUCKET = "banners";
const DISH_IMAGES_BUCKET = "dishes-images-";
const DEFAULT_TOTAL_TABLES = 10;
const MAX_TOTAL_TABLES = 200;
const CLIENT_ORDERING_DISABLED_KEY = "menuqr_disable_client_ordering_tmp";
const SUPABASE_STORAGE_PUBLIC_MARKER = "storage/v1/object/public/";
type ManagerReportArchiveFolderKey = "financial" | "stats" | "reviews";

const repairMojibakeUiText = (input: string) => {
  return String(input || "");
};

function readPositiveInteger(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const whole = Math.trunc(parsed);
  return whole > 0 ? whole : null;
}

function findTotalTablesValue(raw: unknown, depth = 0): number | null {
  if (depth > 3) return null;
  if (raw == null) return null;
  const direct = readPositiveInteger(raw);
  if (direct != null) return direct;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return findTotalTablesValue(parsed, depth + 1);
    } catch {
      return null;
    }
  }

  if (typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const directFromRow = readPositiveInteger(source.table_count);
  if (directFromRow != null) return directFromRow;
  return (
    findTotalTablesValue(source.table_config, depth + 1) ??
    findTotalTablesValue(source.marketing_options, depth + 1) ??
    findTotalTablesValue(source.settings, depth + 1)
  );
}

function normalizeTotalTables(value: unknown, fallback = DEFAULT_TOTAL_TABLES) {
  const resolved = findTotalTablesValue(value) ?? fallback;
  return Math.min(MAX_TOTAL_TABLES, Math.max(1, resolved));
}

const HUNGER_LEVELS = ["Petite faim", "Moyenne faim", "Grosse faim"];
const DEFAULT_LANGUAGE_LABELS: Record<string, string> = {
  fr: "Fran\u00e7ais",
  en: "English",
  es: "Espa\u00f1ol",
  de: "Deutsch",
};
const DEFAULT_SUGGESTION_LEADS: Record<string, string> = {
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
const ALLERGEN_OPTIONS = ["Gluten", "Lactose", "Arachides", "\u0152ufs", "Lait", "Poisson", "Fruits de mer", "Soja", "S\u00e9same", "Moutarde", "C\u00e9leri"];
const DEFAULT_ALLERGEN_TRANSLATIONS = DEFAULT_ALLERGEN_TRANSLATIONS_EXTENDED;
const PREDEFINED_LANGUAGE_OPTIONS = PREDEFINED_LANGUAGE_OPTIONS_EXTENDED;
const MENU_FONT_OPTIONS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Poppins",
  "Nunito",
  "Work Sans",
  "Source Sans 3",
  "Manrope",
  "Noto Sans",
  "Mulish",
  "Montserrat",
  "Raleway",
  "Ubuntu",
  "Merriweather",
  "Lora",
  "PT Serif",
  "Libre Baskerville",
  "Playfair Display",
  "Cormorant Garamond",
  "Bitter",
  "Fira Sans",
  "Rubik",
  "Oswald",
  "Bebas Neue",
  "Quicksand",
  "Barlow",
  "Cabin",
  "Dancing Script",
  "Pacifico",
  "Satisfy",
  "Amatic SC",
] as const;

type CookingTranslationKey = "rare" | "medium_rare" | "medium" | "well_done";
type AllergenLibraryRow = {
  id: string;
  name_fr: string;
  names_i18n: Record<string, string>;
};

const COOKING_TRANSLATION_ORDER: CookingTranslationKey[] = ["rare", "medium_rare", "medium", "well_done"];

const DEFAULT_COOKING_TRANSLATIONS: Record<CookingTranslationKey, Record<string, string>> = {
  rare: { fr: "Bleu", en: "Blue", es: "Poco hecho", de: "Sehr blutig", pt: "Mal passado" },
  medium_rare: { fr: "Saignant", en: "Rare", es: "Poco cocido", de: "Blutig", pt: "Sangrando" },
  medium: { fr: "\u00c0 point", en: "Medium", es: "En su punto", de: "Medium", pt: "Ao ponto" },
  well_done: { fr: "Bien cuit", en: "Well done", es: "Bien cocido", de: "Durchgebraten", pt: "Bem passado" },
};

function parseObjectRecord(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function normalizeManagerFontFamily(raw: unknown) {
  const value = String(raw || "").trim();
  return (MENU_FONT_OPTIONS as readonly string[]).includes(value) ? value : "Montserrat";
}

function normalizeDensityStyle(raw: unknown): "compact" | "spacious" {
  const value = String(raw || "").trim().toLowerCase();
  if (["compact", "compacte", "dense"].includes(value)) return "compact";
  return "spacious";
}

function normalizeMenuLayout(raw: unknown): "classic_grid" | "modern_list" {
  const value = String(raw || "").trim().toLowerCase();
  return value === "modern_list" || value === "horizontal" ? "modern_list" : "classic_grid";
}

function parseCardLayoutToken(raw: unknown): "default" | "overlay" | "bicolor" | null {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "overlay" || value === "grid_overlay") return "overlay";
  if (value === "bicolor" || value === "modern_bicolor") return "bicolor";
  if (value === "minimalist" || value === "minimal") return "bicolor";
  if (value === "default" || value === "classic" || value === "standard") return "default";
  return null;
}

function normalizeCardLayout(raw: unknown): "default" | "overlay" | "bicolor" {
  return parseCardLayoutToken(raw) || "default";
}

function normalizeCardStyle(raw: unknown): "rounded" | "sharp" {
  const value = String(raw || "").trim().toLowerCase();
  if (["sharp", "pointu", "carre", "square", "angled"].includes(value)) return "sharp";
  return "rounded";
}

function normalizeHexColor(raw: unknown, fallback: string) {
  const value = String(raw || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function isHexColorDark(raw: unknown) {
  const hex = normalizeHexColor(raw, "#FFFFFF").slice(1);
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

function normalizeOpacityPercent(raw: unknown, fallback = 100) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function normalizeBackgroundOpacity(raw: unknown, fallback = 1) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed > 1 && parsed <= 100) return Math.max(0, Math.min(1, parsed / 100));
  return Math.max(0, Math.min(1, parsed));
}

function resolveSupabasePublicUrl(value: unknown, fallbackBucket?: string) {
  const raw = String(value || "")
    .replace(/[\r\n"'\\]/g, "")
    .trim();
  if (!raw) return "";
  const lowered = raw.toLowerCase();
  if (["null", "undefined", "false", "[object object]"].includes(lowered)) return "";
  if (/^(data:|blob:)/i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/") && !raw.startsWith("/storage/")) return raw;

  const normalized = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.startsWith(SUPABASE_STORAGE_PUBLIC_MARKER)) {
    return `${supabaseUrl}/${normalized}`;
  }
  if (normalized.startsWith("object/public/")) {
    return `${supabaseUrl}/storage/v1/${normalized}`;
  }
  const markerIndex = normalized.indexOf(SUPABASE_STORAGE_PUBLIC_MARKER);
  if (markerIndex >= 0) {
    return `${supabaseUrl}/${normalized.slice(markerIndex)}`;
  }
  const knownBuckets = [RESTAURANT_LOGOS_BUCKET, RESTAURANT_BANNERS_BUCKET, DISH_IMAGES_BUCKET, "dishes-images"];
  if (knownBuckets.some((bucket) => normalized.startsWith(`${bucket}/`))) {
    return `${supabaseUrl}/storage/v1/object/public/${normalized}`;
  }
  if (fallbackBucket) {
    return `${supabaseUrl}/storage/v1/object/public/${fallbackBucket}/${normalized}`;
  }
  return raw;
}

function parseCookingTranslations(raw: unknown) {
  const source = parseObjectRecord(raw);
  const next: Record<CookingTranslationKey, Record<string, string>> = {
    rare: { ...DEFAULT_COOKING_TRANSLATIONS.rare },
    medium_rare: { ...DEFAULT_COOKING_TRANSLATIONS.medium_rare },
    medium: { ...DEFAULT_COOKING_TRANSLATIONS.medium },
    well_done: { ...DEFAULT_COOKING_TRANSLATIONS.well_done },
  };
  COOKING_TRANSLATION_ORDER.forEach((key) => {
    const row = parseObjectRecord(source[key]);
    Object.entries(row).forEach(([lang, label]) => {
      const code = normalizeLanguageKey(lang);
      if (!code) return;
      next[key][code] = String(label || "").trim();
    });
  });
  return next;
}

function createDefaultAllergenLibrary(): AllergenLibraryRow[] {
  return ALLERGEN_OPTIONS.map((nameFr) => ({
    id: createLocalId(),
    name_fr: String(nameFr || "").trim(),
    names_i18n:
      DEFAULT_ALLERGEN_TRANSLATIONS[normalizeText(String(nameFr || "").trim())] || { fr: String(nameFr || "").trim() },
  }));
}

function parseAllergenLibrary(raw: unknown): AllergenLibraryRow[] {
  const list = Array.isArray(raw) ? raw : [];
  const parsed = list
    .map((entry, index) => {
      const row = parseObjectRecord(entry);
      const nameFr = String(row.name_fr || row.name || "").trim();
      if (!nameFr) return null;
      const namesRaw = parseObjectRecord(row.names_i18n);
      const names_i18n = Object.fromEntries(
        Object.entries(namesRaw)
          .map(([lang, label]) => [normalizeLanguageKey(lang), String(label || "").trim()])
          .filter(([lang, label]) => Boolean(lang) && Boolean(label))
      ) as Record<string, string>;
      names_i18n.fr = names_i18n.fr || nameFr;
      return {
        id: String(row.id || `allergen-${index}-${createLocalId()}`),
        name_fr: nameFr,
        names_i18n,
      } as AllergenLibraryRow;
    })
    .filter(Boolean) as AllergenLibraryRow[];
  return parsed.length > 0 ? parsed : createDefaultAllergenLibrary();
}

function mergeAllergenLibraryRows(primary: AllergenLibraryRow[], secondary: AllergenLibraryRow[]) {
  const merged: AllergenLibraryRow[] = [];
  const indexByKey = new Map<string, number>();

  const upsert = (row: AllergenLibraryRow) => {
    const nameFr = String(row.name_fr || "").trim();
    if (!nameFr) return;
    const key = normalizeText(nameFr);
    if (!key) return;

    const cleanedNames = Object.fromEntries(
      Object.entries(row.names_i18n || {})
        .map(([lang, label]) => [normalizeLanguageKey(lang), String(label || "").trim()])
        .filter(([lang, label]) => Boolean(lang) && Boolean(label))
    ) as Record<string, string>;
    cleanedNames.fr = cleanedNames.fr || nameFr;

    const existingIndex = indexByKey.get(key);
    if (existingIndex == null) {
      indexByKey.set(key, merged.length);
      merged.push({
        id: String(row.id || createLocalId()),
        name_fr: nameFr,
        names_i18n: cleanedNames,
      });
      return;
    }

    const existing = merged[existingIndex];
    merged[existingIndex] = {
      ...existing,
      id: String(existing.id || row.id || createLocalId()),
      name_fr: existing.name_fr || nameFr,
      names_i18n: {
        ...(row.names_i18n || {}),
        ...(existing.names_i18n || {}),
        ...cleanedNames,
        fr: String(existing.names_i18n?.fr || cleanedNames.fr || existing.name_fr || nameFr),
      },
    };
  };

  primary.forEach(upsert);
  secondary.forEach(upsert);
  return merged.length > 0 ? merged : createDefaultAllergenLibrary();
}

function extractAllergenNamesFromDishPayload(rawDish: Record<string, unknown>): string[] {
  const parseList = (value: unknown) => {
    if (Array.isArray(value)) return value.map((entry) => String(entry || "").trim()).filter(Boolean);
    if (typeof value === "string") {
      return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return [] as string[];
  };

  const dietaryRaw = rawDish.dietary_tag;
  const dietary =
    typeof dietaryRaw === "string"
      ? parseObjectRecord(dietaryRaw)
      : (dietaryRaw as Record<string, unknown> | null) || {};
  const i18n = parseObjectRecord(dietary.i18n);
  const manual = parseObjectRecord(i18n.allergens_manual);
  const manualKeys = Object.keys(manual).map((key) => String(key || "").trim()).filter(Boolean);
  const manualValues = Object.values(manual).flatMap((entry) => {
    const row = parseObjectRecord(entry);
    return Object.values(row)
      .map((value) => String(value || "").trim())
      .filter(Boolean);
  });
  const i18nAllergens = parseObjectRecord(i18n.allergens);
  const localizedAllergens = Object.values(i18nAllergens).flatMap((entry) => parseList(entry));
  const fromDietary = parseList(dietary.allergens_selected ?? dietary.allergens_fr ?? dietary.allergens);
  const legacy = parseList(rawDish.allergens);
  const merged = [...fromDietary, ...manualKeys, ...manualValues, ...localizedAllergens, ...legacy];
  const seen = new Set<string>();
  return merged.filter((value) => {
    const key = normalizeText(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

interface Restaurant {
  id?: string | number;
  name?: string;
  owner_id?: string | null;
  first_login?: boolean | null;
  otp_enabled?: boolean | null;
  logo_url?: string;
  banner_image_url?: string | null;
  banner_url?: string | null;
  background_url?: string;
  background_image_url?: string | null;
  google_review_url?: string | null;
  primary_color?: string;
  text_color?: string | null;
  card_bg_color?: string | null;
  custom_tags?: string[];
  table_config?: Record<string, unknown> | string | null;
  font_family?: string | null;
  card_density?: string | null;
  density_style?: string | null;
  bg_opacity?: number | null;
  menu_layout?: string | null;
  card_layout?: string | null;
  card_style?: string | null;
  smtp_user?: string | null;
  smtp_password?: string | null;
  email_subject?: string | null;
  email_body_header?: string | null;
  email_footer?: string | null;
}

interface SuggestionRule {
  from_category_id: string;
  to_category_id: string;
}

interface Dish {
  id?: number;
  name: string;
  name_fr?: string | null;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
  description?: string | null;
  description_fr?: string | null;
  description_en?: string | null;
  description_es?: string | null;
  description_de?: string | null;
  price: number;
  category_id?: string | number | null;
  subcategory_id?: string | number | null;
  categorie: string;
  sub_category?: string | null;
  hunger_level?: string | null;
  image_url?: string | null;
  allergens?: string | null;
  calories_min?: number | null;
  calories_max?: number | null;
  suggestion_message?: string | null;
  is_available?: boolean;
  active?: boolean;
  has_sides?: boolean;
  has_extras?: boolean;
  allow_multi_select?: boolean | null;
  ask_cooking?: boolean;
  selected_sides?: Array<string | number> | null;
  max_options?: number | null;
  is_featured?: boolean | null;
  is_special?: boolean | null;
  is_chef_suggestion?: boolean | null;
  is_daily_special?: boolean | null;
  is_promo?: boolean | null;
  promo_price?: number | null;
  is_suggestion?: boolean | null;
  product_options?: ProductOptionItem[];
  extras?: unknown;
  extras_list?: unknown;
}

interface ProductOptionItem {
  id: string;
  name: string;
  name_fr?: string | null;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
  names_i18n?: Record<string, string>;
  price_override: number | null;
}

interface Order {
  id: string | number;
  created_at: string;
  updated_at?: string | null;
  closed_at?: string | null;
  paid_at?: string | null;
  finished_at?: string | null;
  ended_at?: string | null;
  items?: any;
  total?: number;
  total_price?: number;
  tip_amount?: number | null;
  status?: string;
  table_number?: string | number | null;
  covers?: number | null;
  guest_count?: number | null;
  customer_count?: number | null;
  payment_method?: string | null;
  payment_mode?: string | null;
  payment_type?: string | null;
  mode_paiement?: string | null;
}

interface TableAssignment {
  id?: string | number;
  table_number?: string | number | null;
  pin_code?: string | null;
  status?: string | null;
  payment_status?: string | null;
  occupied?: boolean | null;
}

interface Stats {
  total: number;
  totalTips: number;
  todayRevenue: number;
  todayTips: number;
  weekRevenue: number;
  weekTips: number;
  todayOrdersCount: number;
  averageBasket: number;
  topDishes: Array<{ name: string; count: number }>;
  weekByDay: Array<{ day: string; count: number }>;
}

type ReviewRow = {
  id: string;
  order_id?: string | null;
  dish_id?: string | null;
  rating?: number | null;
  comment?: string | null;
  created_at?: string | null;
  dish?: {
    id?: string | number | null;
    name?: string | null;
    name_fr?: string | null;
    image_url?: string | null;
  } | null;
};

const FINANCE_I18N = {
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

const ANALYTICS_I18N = {
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
    recommendationConversion: "Conversion Rate Recommendations",
    recommendationItems: "Articles via recommandation",
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
    recommendationConversion: "Conversion Rate Recommendations",
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
    recommendationConversion: "Conversion Rate Recommendations",
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

interface ExtrasItem {
  id: string;
  name_fr: string;
  name_en?: string;
  name_es?: string;
  name_de?: string;
  names_i18n?: Record<string, string>;
  price: number;
}

function createLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getExtraKey(nameFr: string, price: number) {
  return `${normalizeText(nameFr || "")}__${Number(price || 0).toFixed(2)}`;
}

const I18N_TOKEN = "__I18N__:";

function parseI18nToken(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw.startsWith(I18N_TOKEN)) return {} as Record<string, string>;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw.replace(I18N_TOKEN, "")));
    if (!parsed || typeof parsed !== "object") return {} as Record<string, string>;
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [
        String(k || "").toLowerCase(),
        String(v ?? ""),
      ])
    );
  } catch {
    return {} as Record<string, string>;
  }
}

function parseJsonObject(raw: unknown): Record<string, unknown> {
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

function buildI18nToken(values: Record<string, string>) {
  return `${I18N_TOKEN}${encodeURIComponent(JSON.stringify(values))}`;
}

function normalizeLanguageKey(value: string) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  return normalized;
}

function getLanguageColumnKeys(prefix: string, languageCode: string) {
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

function formatLanguageLabel(raw: string, fallbackKey: string) {
  const trimmed = String(raw || "").trim();
  if (trimmed) return trimmed;
  if (DEFAULT_LANGUAGE_LABELS[fallbackKey]) return DEFAULT_LANGUAGE_LABELS[fallbackKey];
  return fallbackKey.toUpperCase();
}

function getDefaultSuggestionLead(languageCode: string) {
  const normalized = normalizeLanguageKey(languageCode);
  return DEFAULT_SUGGESTION_LEADS[normalized] || DEFAULT_SUGGESTION_LEADS.fr;
}

function parseEnabledLanguageEntries(raw: unknown) {
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

function serializeEnabledLanguageEntries(codes: string[], labels: Record<string, string>) {
  const unique = Array.from(new Set(["fr", ...codes]));
  return unique.map((code) => `${code}::${formatLanguageLabel(labels[code], code)}`);
}

interface SideLibraryItem {
  id: number;
  name_fr: string;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
  category_id?: string | null;
}

interface CategoryItem {
  id: string | number;
  name_fr: string;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
  destination?: string | null;
}

interface SubCategoryItem {
  id: string | number;
  category_id: string | number;
  name_fr: string;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
}

interface DishForm {
  name_fr: string;
  name_en: string;
  name_es: string;
  name_de: string;
  name_i18n: Record<string, string>;
  description_fr: string;
  description_en: string;
  description_es: string;
  description_de: string;
  description_i18n: Record<string, string>;
  price: string;
  category_id: string;
  subcategory_id: string;
  hunger_level: string;
  image_url: string;
  allergens: string;
  calories_min: string;
  calories_max: string;
  has_sides: boolean;
  has_extras: boolean;
  allow_multi_select: boolean;
  ask_cooking: boolean;
  is_vegetarian_badge: boolean;
  is_spicy_badge: boolean;
  is_new_badge: boolean;
  is_gluten_free_badge: boolean;
  is_chef_suggestion: boolean;
  is_daily_special: boolean;
  is_promo: boolean;
  promo_price: string;
  is_suggestion: boolean;
  max_options: string;
  selected_side_ids: Array<string | number>;
  extras_list: ExtrasItem[];
  product_options: ProductOptionItem[];
  sales_tip: string;
  sales_tip_i18n: Record<string, string>;
  sales_tip_dish_id: string;
}

interface DishExtraDraftForm {
  name_fr: string;
  name_en: string;
  name_es: string;
  name_de: string;
  names_i18n: Record<string, string>;
  price: string;
}

function parseOptionsFromDescription(description?: string | null) {
  const result = {
    baseDescription: "",
    extrasList: [] as ExtrasItem[],
    sideIds: [] as Array<string | number>,
    askCooking: false,
  };
  if (!description) return result;

  const lines = description.split("\n");
  const remaining: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("__SIDE_IDS__:")) {
      const raw = trimmed.replace("__SIDE_IDS__:", "").trim();
      result.sideIds = raw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      return;
    }
    if (trimmed.startsWith("__ASK_COOKING__:")) {
      const raw = trimmed.replace("__ASK_COOKING__:", "").trim().toLowerCase();
      result.askCooking = raw === "true" || raw === "1";
      return;
    }
    if (trimmed.startsWith("__EXTRAS__:")) {
      const raw = trimmed.replace("__EXTRAS__:", "").trim();
      const list = raw
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((entry) => {
          const [namePart, pricePart] = entry.split("=").map((p) => p.trim());
          const price = pricePart ? Number(pricePart.replace(",", ".")) : 0;
          return {
            id: createLocalId(),
            name_fr: namePart || "Supplément",
            name_en: namePart || "Supplement",
            name_es: namePart || "Suplemento",
            name_de: namePart || "Zusatz",
            names_i18n: {},
            price: Number.isFinite(price) ? price : 0,
          };
        });
      result.extrasList = list;
      return;
    }
    if (trimmed.startsWith("__EXTRAS_JSON__:")) {
      const raw = trimmed.replace("__EXTRAS_JSON__:", "").trim();
      try {
        const parsed = JSON.parse(decodeURIComponent(raw));
        if (Array.isArray(parsed)) {
          result.extrasList = parsed
            .map((row) => {
              if (!row || typeof row !== "object") return null;
              const item = row as Record<string, unknown>;
              const namesObj = (item.names_i18n && typeof item.names_i18n === "object"
                ? (item.names_i18n as Record<string, unknown>)
                : {}) as Record<string, unknown>;
              const names: Record<string, string> = {};
              Object.entries(namesObj).forEach(([k, v]) => {
                const key = String(k || "").trim().toLowerCase();
                if (!key) return;
                names[key] = String(v ?? "").trim();
              });
              const fr = String(item.name_fr ?? names.fr ?? "").trim() || "Supplément";
              const priceRaw = item.price ?? 0;
              const price =
                typeof priceRaw === "number" ? priceRaw : Number(String(priceRaw).replace(",", "."));
              return {
                id: String(item.id ?? createLocalId()),
                name_fr: fr,
                name_en: String(item.name_en ?? names.en ?? "").trim(),
                name_es: String(item.name_es ?? names.es ?? "").trim(),
                name_de: String(item.name_de ?? names.de ?? "").trim(),
                names_i18n: names,
                price: Number.isFinite(price) ? Number(price) : 0,
              } as ExtrasItem;
            })
            .filter(Boolean) as ExtrasItem[];
          return;
        }
      } catch {
        // ignore malformed legacy data
      }
    }
    if (trimmed.startsWith("__EXTRAS_I18N__:")) {
      const raw = trimmed.replace("__EXTRAS_I18N__:", "").trim();
      const list = raw
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((entry) => {
          const [labels, pricePart] = entry.split("=").map((p) => p.trim());
          const [fr, en, es, de] = (labels || "").split("~").map((p) => decodeURIComponent((p || "").trim()));
          const price = pricePart ? Number(pricePart.replace(",", ".")) : 0;
          return {
            id: createLocalId(),
            name_fr: fr || "Supplément",
            name_en: en || "",
            name_es: es || "",
            name_de: de || "",
            names_i18n: {
              fr: fr || "",
              en: en || "",
              es: es || "",
              de: de || "",
            },
            price: Number.isFinite(price) ? price : 0,
          };
        });
      result.extrasList = list;
      return;
    }
    remaining.push(line);
  });

  result.baseDescription = remaining.join("\n").trim();
  return result;
}

function getDishDisplayDescription(dish: Dish) {
  const candidates = [
    dish.description_fr,
    dish.description,
    dish.description_en,
    dish.description_es,
    dish.description_de,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  for (const candidate of candidates) {
    const parsed = parseOptionsFromDescription(candidate);
    const cleaned = String(parsed.baseDescription || "").trim();
    if (cleaned) return cleaned;
  }
  return "";
}

function parseExtrasFromUnknown(raw: unknown): ExtrasItem[] {
  if (raw == null) return [];

  let source: unknown = raw;
  if (typeof source === "string") {
    const trimmed = source.trim();
    if (!trimmed) return [];
    try {
      source = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }

  const candidate =
    Array.isArray(source)
      ? source
      : typeof source === "object" && source !== null
        ? ((source as Record<string, unknown>).extras ??
          (source as Record<string, unknown>).items ??
          (source as Record<string, unknown>).list)
        : [];

  if (!Array.isArray(candidate)) return [];

  return candidate
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const nameFr =
        String(
          row.name_fr ?? row.name ?? row.label_fr ?? row.label ?? row.title ?? ""
        ).trim();
      if (!nameFr) return null;

      const priceRaw = row.price ?? row.amount ?? row.value ?? 0;
      const price =
        typeof priceRaw === "number"
          ? priceRaw
          : Number(String(priceRaw).replace(",", "."));

      return {
        id: String(row.id ?? row.extra_id ?? createLocalId()),
        name_fr: nameFr,
        name_en: String(row.name_en ?? row.label_en ?? "").trim(),
        name_es: String(row.name_es ?? row.label_es ?? "").trim(),
        name_de: String(row.name_de ?? row.label_de ?? "").trim(),
        names_i18n: row.names_i18n && typeof row.names_i18n === "object"
          ? Object.fromEntries(
              Object.entries(row.names_i18n as Record<string, unknown>).map(([k, v]) => [
                String(k || "").toLowerCase(),
                String(v ?? ""),
              ])
            )
          : undefined,
        price: Number.isFinite(price) ? Number(price) : 0,
      } as ExtrasItem;
    })
    .filter(Boolean) as ExtrasItem[];
}

function mergeExtrasUnique(primary: ExtrasItem[], secondary: ExtrasItem[]) {
  const out = [...primary];
  const seen = new Set(
    primary.map((extra) => `${normalizeText(extra.name_fr || "")}__${Number(extra.price || 0).toFixed(2)}`)
  );
  secondary.forEach((extra) => {
    const key = `${normalizeText(extra.name_fr || "")}__${Number(extra.price || 0).toFixed(2)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(extra);
  });
  return out;
}

function buildDescriptionWithOptions(baseDescription: string) {
  return String(baseDescription || "").trim();
}

function parseDishOptionsRowsToExtras(rows: Array<Record<string, unknown>>): ExtrasItem[] {
  return rows
    .map((row) => {
      const parsedNamesI18n = Object.fromEntries(
        Object.entries(parseObjectRecord(row.names_i18n)).map(([k, v]) => [
          String(k || "").toLowerCase(),
          String(v ?? "").trim(),
        ])
      ) as Record<string, string>;
      const dynamicNameColumns = Object.fromEntries(
        Object.entries(row)
          .filter(([key]) => /^name_[a-z]{2}$/i.test(String(key || "")))
          .map(([key, value]) => [String(key).slice(5).toLowerCase(), String(value || "").trim()])
          .filter(([, value]) => Boolean(value))
      ) as Record<string, string>;

      const nameFr = String(
        row.name_fr ?? parsedNamesI18n.fr ?? dynamicNameColumns.fr ?? row.name ?? row.label_fr ?? row.label ?? ""
      ).trim();
      if (!nameFr) return null;
      const priceRaw = row.price ?? row.option_price ?? 0;
      const price =
        typeof priceRaw === "number" ? priceRaw : Number(String(priceRaw || "0").replace(",", "."));
      const names_i18n: Record<string, string> = {
        ...parsedNamesI18n,
        ...dynamicNameColumns,
        fr: parsedNamesI18n.fr || dynamicNameColumns.fr || nameFr,
      };
      return {
        id: String(row.id ?? createLocalId()),
        name_fr: nameFr,
        name_en: String(row.name_en ?? parsedNamesI18n.en ?? names_i18n.en ?? "").trim(),
        name_es: String(row.name_es ?? parsedNamesI18n.es ?? names_i18n.es ?? "").trim(),
        name_de: String(row.name_de ?? parsedNamesI18n.de ?? names_i18n.de ?? "").trim(),
        names_i18n,
        price: Number.isFinite(price) ? price : 0,
      } as ExtrasItem;
    })
    .filter(Boolean) as ExtrasItem[];
}

const CATEGORY_TOKEN = "__CATEGORIES__:";
const SUBCATEGORY_TOKEN = "__SUBCATEGORIES__:";
const AUTO_PRINT_TOKEN = "__AUTO_PRINT__:";

function parseCategoryConfig(customTags: string[] | undefined) {
  const tags = Array.isArray(customTags) ? customTags : [];
  let categories: string[] | null = null;
  let subCategories: Record<string, string[]> | null = null;
  tags.forEach((tag) => {
    if (tag.startsWith(CATEGORY_TOKEN)) {
      try {
        categories = JSON.parse(tag.replace(CATEGORY_TOKEN, ""));
      } catch {
        categories = null;
      }
    }
    if (tag.startsWith(SUBCATEGORY_TOKEN)) {
      try {
        subCategories = JSON.parse(tag.replace(SUBCATEGORY_TOKEN, ""));
      } catch {
        subCategories = null;
      }
    }
  });
  const rest = tags.filter(
    (tag) =>
      !tag.startsWith(CATEGORY_TOKEN) &&
      !tag.startsWith(SUBCATEGORY_TOKEN) &&
      !tag.startsWith(AUTO_PRINT_TOKEN)
  );
  return { categories, subCategories, rest };
}

function parseAutoPrintSetting(customTags: string[] | undefined) {
  const tags = Array.isArray(customTags) ? customTags : [];
  let autoPrintKitchen = true;
  tags.forEach((tag) => {
    if (tag.startsWith(AUTO_PRINT_TOKEN)) {
      try {
        const parsed = JSON.parse(tag.replace(AUTO_PRINT_TOKEN, ""));
        if (typeof parsed?.kitchen === "boolean") autoPrintKitchen = parsed.kitchen;
      } catch {
        // ignore
      }
    }
  });
  return autoPrintKitchen;
}

function parseDisplaySettingsFromRow(row: Record<string, unknown>) {
  const show = toBoolean(row.show_calories, true);
  const langs = parseEnabledLanguageEntries(row.enabled_languages);
  const marketing = parseMarketingOptions(row.table_config || row);
  const totalTables = normalizeTotalTables(row, DEFAULT_TOTAL_TABLES);
  return {
    showCalories: show,
    enabledLanguages: langs.codes.length > 0 ? langs.codes : ["fr", "en"],
    languageLabels: langs.labels,
    heroEnabled: marketing.heroEnabled,
    upsellEnabled: marketing.upsellEnabled,
    consultationMode: marketing.consultationMode,
    suggestionRules: marketing.suggestionRules,
    suggestionMessage: marketing.suggestionMessage,
    heroBadgeType: marketing.heroBadgeType,
    totalTables,
  };
}

function parseDisplaySettingsFromSettingsJson(raw: unknown) {
  const source =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as Record<string, unknown>;
          } catch {
            return null;
          }
        })()
      : (raw as Record<string, unknown> | null);
  if (!source || typeof source !== "object") return null;
  const show = toBoolean(source.show_calories, true);
  const langs = parseEnabledLanguageEntries(source.enabled_languages);
  const marketing = parseMarketingOptions(source.table_config || source.marketing_options || source.marketing || source);
  const totalTables = normalizeTotalTables(source, DEFAULT_TOTAL_TABLES);
  return {
    showCalories: show,
    enabledLanguages: langs.codes.length > 0 ? langs.codes : ["fr", "en"],
    languageLabels: langs.labels,
    heroEnabled: marketing.heroEnabled,
    upsellEnabled: marketing.upsellEnabled,
    consultationMode: marketing.consultationMode,
    suggestionRules: marketing.suggestionRules,
    suggestionMessage: marketing.suggestionMessage,
    heroBadgeType: marketing.heroBadgeType,
    totalTables,
  };
}

function parseMarketingOptions(raw: unknown) {
  const source =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as Record<string, unknown>;
          } catch {
            return null;
          }
        })()
      : (raw as Record<string, unknown> | null);

  const marketingContainer =
    source && typeof source === "object" && source.marketing_options && typeof source.marketing_options === "object"
      ? (source.marketing_options as Record<string, unknown>)
      : source && typeof source === "object" && source.marketing && typeof source.marketing === "object"
        ? (source.marketing as Record<string, unknown>)
        : source;

  const rawRules =
    marketingContainer?.suggestion_rules && Array.isArray(marketingContainer.suggestion_rules)
      ? marketingContainer.suggestion_rules
      : [];
  const suggestionRules = rawRules
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const from = String(row.from_category_id || "").trim();
      const to = String(row.to_category_id || "").trim();
      if (!from || !to) return null;
      return { from_category_id: from, to_category_id: to } as SuggestionRule;
    })
    .filter(Boolean) as SuggestionRule[];
  const suggestionMessage = String(marketingContainer?.suggestion_message || "").trim();
  const heroBadgeTypeRaw = String(marketingContainer?.hero_badge_type || "chef").toLowerCase();
  const heroBadgeType = heroBadgeTypeRaw === "daily" ? "daily" : "chef";
  return {
    heroEnabled: toBoolean(marketingContainer?.hero_enabled ?? marketingContainer?.show_featured ?? source?.show_featured, true),
    upsellEnabled: toBoolean(marketingContainer?.upsell_enabled, false),
    consultationMode: toBoolean(marketingContainer?.consultation_mode, false) || readLocalClientOrderingDisabled(),
    suggestionRules,
    suggestionMessage,
    heroBadgeType,
  };
}

function toBoolean(value: unknown, defaultValue: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "1") return true;
    if (v === "false" || v === "0") return false;
  }
  if (typeof value === "number") return value !== 0;
  return defaultValue;
}

function readLocalClientOrderingDisabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CLIENT_ORDERING_DISABLED_KEY) === "1";
}

function writeLocalClientOrderingDisabled(value: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLIENT_ORDERING_DISABLED_KEY, value ? "1" : "0");
}

function SafeResponsiveContainer({ children }: { children: React.ReactElement }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      {children}
    </ResponsiveContainer>
  );
}

function toLoggableSupabaseError(error: unknown) {
  if (!error || typeof error !== "object") return { message: String(error || "Unknown error") };
  const raw = error as Record<string, unknown>;
  return {
    code: typeof raw.code === "string" ? raw.code : undefined,
    message: typeof raw.message === "string" ? raw.message : undefined,
    hint: typeof raw.hint === "string" ? raw.hint : undefined,
    details: typeof raw.details === "string" ? raw.details : undefined,
  };
}

function extractMissingColumnName(errorMessage: unknown) {
  const message = String(errorMessage || "").trim();
  if (!message) return "";
  const patterns = [
    /column\s+["']?([a-zA-Z0-9_]+)["']?\s+does not exist/i,
    /colonne\s+["']?([a-zA-Z0-9_]+)["']?\s+n['’]existe/i,
    /could not find the ['"]?([a-zA-Z0-9_]+)['"]?\s+column/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) return String(match[1]).trim();
  }
  return "";
}

function hasMissingColumnError(error: unknown, expectedColumn?: string) {
  if (!error || typeof error !== "object") return false;
  const row = error as Record<string, unknown>;
  const code = String(row.code || "").trim().toUpperCase();
  const message = String(row.message || "").trim();
  const hint = String(row.hint || "").trim();
  const details = String(row.details || "").trim();
  const missingColumn =
    extractMissingColumnName(message) || extractMissingColumnName(hint) || extractMissingColumnName(details);
  if (expectedColumn) {
    return missingColumn.toLowerCase() === String(expectedColumn || "").trim().toLowerCase();
  }
  return code === "42703" || code === "PGRST204" || Boolean(missingColumn);
}

export default function MenuManager() {
  const router = useRouter();
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
  const normalizeRestaurantId = (value: unknown) =>
    String(value || "")
      .trim()
      .replace(/^["'{\s]+|["'}\s]+$/g, "")
      .toLowerCase();
  const scopedRestaurantIdFromPath = normalizeRestaurantId(decodeAndTrim(params?.id || params?.restaurant_id || ""));
  const scopedRestaurantIdFromQuery = normalizeRestaurantId(decodeAndTrim(searchParams.get("restaurant_id") || ""));
  const scopedRestaurantId = String(scopedRestaurantIdFromPath || scopedRestaurantIdFromQuery || "").trim();
  const impersonateMode = String(searchParams.get("impersonate") || "").trim() === "1";
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    totalTips: 0,
    todayRevenue: 0,
    todayTips: 0,
    weekRevenue: 0,
    weekTips: 0,
    todayOrdersCount: 0,
    averageBasket: 0,
    topDishes: [],
    weekByDay: [],
  });
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [subCategories, setSubCategories] = useState<Record<string, string[]>>({});
  const [autoPrintKitchen, setAutoPrintKitchen] = useState(true);
  const [showCaloriesClient, setShowCaloriesClient] = useState(true);
  const [heroEnabled, setHeroEnabled] = useState(true);
  const [heroBadgeType, setHeroBadgeType] = useState<"chef" | "daily">("chef");
  const [consultationModeEnabled, setConsultationModeEnabled] = useState(false);
  const [totalTables, setTotalTables] = useState(DEFAULT_TOTAL_TABLES);
  const [activeLanguageCodes, setActiveLanguageCodes] = useState<string[]>(["fr", "en"]);
  const [languageLabels, setLanguageLabels] = useState<Record<string, string>>({
    fr: "Français",
    en: "English",
  });
  const [cookingTranslations, setCookingTranslations] = useState<Record<CookingTranslationKey, Record<string, string>>>(
    parseCookingTranslations(null)
  );
  const [allergenLibrary, setAllergenLibrary] = useState<AllergenLibraryRow[]>(createDefaultAllergenLibrary());
  const [newAllergenFr, setNewAllergenFr] = useState("");
  const [languageInput, setLanguageInput] = useState("");
  const [languageCodeInput, setLanguageCodeInput] = useState("");
  const [languagePresetToAdd, setLanguagePresetToAdd] = useState<string>("pt");
  const [criticalStock, setCriticalStock] = useState<Dish[]>([]);
  const [subCategoryRows, setSubCategoryRows] = useState<SubCategoryItem[]>([]);
  const [sidesLibrary, setSidesLibrary] = useState<SideLibraryItem[]>([]);
  const [tableAssignments, setTableAssignments] = useState<TableAssignment[]>([]);
  const [analyticsTab, setAnalyticsTab] = useState<"live" | "product" | "trends" | "ops">("live");
  const [analyticsRange, setAnalyticsRange] = useState<"today" | "7d" | "30d">("today");
  const [activeManagerTab, setActiveManagerTab] = useState<"menu" | "stats" | "staff" | "appearance" | "security">("menu");
  const [reportExportedRange, setReportExportedRange] = useState<"today" | "7d" | "30d" | null>(null);
  const [isPurgingHistory, setIsPurgingHistory] = useState(false);
  const [managerUserEmail, setManagerUserEmail] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordUpdateLoading, setPasswordUpdateLoading] = useState(false);
  const [passwordUpdateMessage, setPasswordUpdateMessage] = useState("");
  const [passwordUpdateError, setPasswordUpdateError] = useState("");
  const [managerOtpEnabled, setManagerOtpEnabled] = useState(false);
  const [managerOtpLoading, setManagerOtpLoading] = useState(false);
  const [managerOtpMessage, setManagerOtpMessage] = useState("");
  const [managerOtpError, setManagerOtpError] = useState("");
  const [forceFirstLoginPasswordChange, setForceFirstLoginPasswordChange] = useState(false);
  const [isRestaurantLoading, setIsRestaurantLoading] = useState(true);
  const [isSuperAdminSession, setIsSuperAdminSession] = useState(false);
  const [managerAccessError, setManagerAccessError] = useState("");
  const [globalManagerNotification, setGlobalManagerNotification] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const [openManagerPanels, setOpenManagerPanels] = useState({
    font: true,
    languages: false,
    cooking: false,
    allergens: false,
  });
  const [newSubCategory, setNewSubCategory] = useState({
    category_id: "",
    name_fr: "",
    name_en: "",
    name_es: "",
    name_de: "",
  });
  const toggleManagerPanel = (key: "font" | "languages" | "cooking" | "allergens") => {
    setOpenManagerPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const [openDishLanguagePanels, setOpenDishLanguagePanels] = useState<Record<string, boolean>>({ fr: true });
  const toggleDishLanguagePanel = (code: string) => {
    setOpenDishLanguagePanels((prev) => ({ ...prev, [code]: !prev[code] }));
  };
  const [newSubCategoryI18n, setNewSubCategoryI18n] = useState<Record<string, string>>({});
  const [editingSubCategoryId, setEditingSubCategoryId] = useState<string | number | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | number | null>(null);
  const [newSide, setNewSide] = useState({
    name_fr: "",
    name_en: "",
    name_es: "",
    name_de: "",
  });
  const [newSideI18n, setNewSideI18n] = useState<Record<string, string>>({});
  const [editingSideId, setEditingSideId] = useState<number | null>(null);
  const [showSideModal, setShowSideModal] = useState(false);
  const [sideForm, setSideForm] = useState({
    name_fr: "",
    name_en: "",
    name_es: "",
    name_de: "",
  });

  const [sideFormI18n, setSideFormI18n] = useState<Record<string, string>>({});
  const [dishExtraDraft, setDishExtraDraft] = useState<DishExtraDraftForm>({
    name_fr: "",
    name_en: "",
    name_es: "",
    name_de: "",
    names_i18n: {},
    price: "",
  });
  const [editingExtraId, setEditingExtraId] = useState<string | null>(null);
  const [editingExtraOriginKey, setEditingExtraOriginKey] = useState<string | null>(null);
  const [loadedDishExtras, setLoadedDishExtras] = useState<ExtrasItem[]>([]);
  const [extrasTouched, setExtrasTouched] = useState(false);
  const [productOptionDraft, setProductOptionDraft] = useState<{
    name: string;
    price_override: string;
    names_i18n: Record<string, string>;
  }>({
    name: "",
    price_override: "",
    names_i18n: {},
  });
  const [editingProductOptionId, setEditingProductOptionId] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name_fr: "",
    name_en: "",
    name_es: "",
    name_de: "",
    destination: "cuisine",
  });
  const [categoryFormI18n, setCategoryFormI18n] = useState<Record<string, string>>({});

  const [showDishModal, setShowDishModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dishToDelete, setDishToDelete] = useState<Dish | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [formData, setFormData] = useState<DishForm>({
    name_fr: "",
    name_en: "",
    name_es: "",
    name_de: "",
    name_i18n: {},
    description_fr: "",
    description_en: "",
    description_es: "",
    description_de: "",
    description_i18n: {},
    price: "",
    category_id: "",
    subcategory_id: "",
    hunger_level: "",
    image_url: "",
    allergens: "",
    calories_min: "",
    calories_max: "",
    has_sides: false,
    has_extras: false,
    allow_multi_select: false,
    ask_cooking: false,
    is_vegetarian_badge: false,
    is_spicy_badge: false,
    is_new_badge: false,
    is_gluten_free_badge: false,
    is_chef_suggestion: false,
    is_daily_special: false,
    is_promo: false,
    promo_price: "",
    is_suggestion: false,
    max_options: "1",
    selected_side_ids: [],
    extras_list: [],
    product_options: [],
    sales_tip: "",
    sales_tip_i18n: {},
    sales_tip_dish_id: "",
  });
  const [allergenFormI18n, setAllergenFormI18n] = useState<Record<string, Record<string, string>>>({});
  const [isUploadingRestaurantLogo, setIsUploadingRestaurantLogo] = useState(false);
  const [isUploadingRestaurantBanner, setIsUploadingRestaurantBanner] = useState(false);
  const [isUploadingRestaurantBackground, setIsUploadingRestaurantBackground] = useState(false);

  const [restaurantForm, setRestaurantForm] = useState({
    name: "",
    logo_url: "",
    banner_image_url: "",
    banner_url: "",
    background_url: "",
    background_image_url: "",
    google_review_url: "",
    instagram_url: "",
    snapchat_url: "",
    facebook_url: "",
    x_url: "",
    website_url: "",
    show_social_on_receipt: false,
    primary_color: "#FFFFFF",
    text_color: "#111111",
    card_bg_color: "#FFFFFF",
    card_bg_opacity: 100,
    card_text_color: "#111111",
    card_transparent: false,
    quick_add_to_cart_enabled: false,
    font_family: "Montserrat",
    card_density: "spacious",
    density_style: "spacious",
    bg_opacity: 1,
    menu_layout: "classic_grid",
    card_layout: "default",
    card_style: "rounded",
    smtp_user: "",
    smtp_password: "",
    email_subject: "",
    email_body_header: "",
    email_footer: "",
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.body;
    const repairDom = () => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let current = walker.nextNode();
      while (current) {
        const node = current as Text;
        const original = node.nodeValue || "";
        const repaired = repairMojibakeUiText(original);
        if (repaired !== original) node.nodeValue = repaired;
        current = walker.nextNode();
      }

      root.querySelectorAll("[placeholder],[title],[alt],[aria-label]").forEach((el) => {
        ["placeholder", "title", "alt", "aria-label"].forEach((attr) => {
          const raw = el.getAttribute(attr);
          if (!raw) return;
          const repaired = repairMojibakeUiText(raw);
          if (repaired !== raw) el.setAttribute(attr, repaired);
        });
      });
    };

    repairDom();
    const observer = new MutationObserver(() => repairDom());
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  const managerUiLang = useMemo<"fr" | "es" | "de">(() => {
    if (typeof window === "undefined") return "fr";
    const lang = String(window.navigator.language || "").toLowerCase();
    if (lang.startsWith("de")) return "de";
    if (lang.startsWith("es")) return "es";
    return "fr";
  }, []);

  const getManagerAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return String(data.session?.access_token || "").trim();
  };

  const normalizeArchiveFileToken = (value: string) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const buildArchiveMonthToken = (date = new Date()) => {
    const monthLabel = date.toLocaleString("fr-FR", { month: "long" });
    return `${normalizeArchiveFileToken(monthLabel)}_${date.getFullYear()}`;
  };

  const blobToBase64 = async (blob: Blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(arrayBuffer);
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  };

  const blobToDataUrl = async (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Conversion image impossible."));
      reader.readAsDataURL(blob);
    });

  const fetchImageAsDataUrl = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Chargement de l'image impossible.");
    }
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    return {
      dataUrl,
      mimeType: String(blob.type || "").toLowerCase(),
    };
  };

  const downloadPdfBlob = (blob: Blob, fileName: string) => {
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
  };

  const savePdfReportToArchive = async (folderKey: ManagerReportArchiveFolderKey, fileName: string, blob: Blob) => {
    const accessToken = await getManagerAccessToken();
    const restaurantId = String(restaurant?.id || scopedRestaurantId || "").trim();
    if (!accessToken || !restaurantId) return;

    const response = await fetch("/api/manager-reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        restaurantId,
        folderKey,
        fileName,
        pdfBase64: await blobToBase64(blob),
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      console.warn("Archivage PDF impossible:", payload.error || response.statusText);
    }
  };

  const analyticsText = ANALYTICS_I18N[managerUiLang];
  const bannerColorLabel =
    managerUiLang === "es"
      ? "Color principal"
      : managerUiLang === "de"
        ? "Primärfarbe"
        : "Couleur principale";
  const dishCardsColorLabel =
    managerUiLang === "es"
      ? "Color de los platos"
      : managerUiLang === "de"
        ? "Farbe der Gerichtskarten"
        : "Couleur des plats";
  const dishCardsOpacityLabel =
    managerUiLang === "es"
      ? "Opacidad del fondo de los platos"
      : managerUiLang === "de"
        ? "Deckkraft des Kartenhintergrunds"
        : "Opacit\u00e9 du fond des plats";
  const dishCardsTextColorLabel =
    managerUiLang === "es"
      ? "Color del texto de los platos"
      : managerUiLang === "de"
        ? "Textfarbe der Gerichtskarten"
        : "Couleur du texte des plats";
  const globalTextColorLabel =
    managerUiLang === "es"
      ? "Color del texto global"
      : managerUiLang === "de"
        ? "Globale Textfarbe"
        : "Couleur du texte global";
  const bannerImageLabel =
    managerUiLang === "es"
      ? "Imagen del banner (upload)"
      : managerUiLang === "de"
        ? "Bannerbild (Upload)"
        : "Image de bannière (upload)";
  const sevenDaysAgoIso = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString();
  }, []);
  const reviewAverage = useMemo(() => {
    const valid = reviews.map((r) => Number(r.rating || 0)).filter((v) => Number.isFinite(v) && v >= 1 && v <= 5);
    if (valid.length === 0) return 0;
    return Math.round((valid.reduce((sum, v) => sum + v, 0) / valid.length) * 10) / 10;
  }, [reviews]);
  const dishNameById = useMemo(() => {
    const map = new Map<string, string>();
    dishes.forEach((dish) => {
      const key = String(dish.id || "").trim();
      if (!key) return;
      map.set(key, String(dish.name_fr || dish.name || "Plat").trim() || "Plat");
    });
    return map;
  }, [dishes]);
  const topReviewedDish = useMemo(() => {
    const scoreByDish = new Map<string, { sum: number; count: number }>();
    reviews.forEach((review) => {
      const dishId = String(review.dish_id || "").trim();
      const rating = Number(review.rating || 0);
      if (!dishId || !Number.isFinite(rating) || rating < 1 || rating > 5) return;
      const current = scoreByDish.get(dishId) || { sum: 0, count: 0 };
      current.sum += rating;
      current.count += 1;
      scoreByDish.set(dishId, current);
    });
    let best: { dishId: string; avg: number; count: number } | null = null;
    scoreByDish.forEach((entry, dishId) => {
      const avg = entry.sum / Math.max(entry.count, 1);
      if (!best || avg > best.avg || (avg === best.avg && entry.count > best.count)) {
        best = { dishId, avg, count: entry.count };
      }
    });
    if (!best) return null;
    const bestDish = best as { dishId: string; avg: number; count: number };
    const reviewDishRow = reviews.find((r) => String(r.dish_id || "") === bestDish.dishId)?.dish;
    const name =
      String(reviewDishRow?.name_fr || reviewDishRow?.name || dishNameById.get(bestDish.dishId) || "Plat").trim() ||
      "Plat";
    return { ...bestDish, name, avg: Math.round(bestDish.avg * 10) / 10 };
  }, [reviews, dishNameById]);
  const restaurantReviews = useMemo(
    () => reviews.filter((review) => !String(review.dish_id || "").trim()),
    [reviews]
  );
  const dishReviews = useMemo(
    () => reviews.filter((review) => Boolean(String(review.dish_id || "").trim())),
    [reviews]
  );
  const weeklyAiSummary = useMemo(() => {
    const comments = reviews
      .map((review) => String(review.comment || "").trim())
      .filter(Boolean);
    const normalizedComments = comments.map((comment) => normalizeText(comment));

    const countThemeMatches = (tokens: string[]) =>
      normalizedComments.reduce((count, comment) => {
        return tokens.some((token) => comment.includes(token)) ? count + 1 : count;
      }, 0);

    const positiveThemes = [
      { label: "La rapidit? du service", tokens: ["rapide", "rapidite", "vite", "service rapide"] },
      { label: "L'accueil de l'?quipe", tokens: ["accueil", "sympa", "aimable", "souriant", "gentil"] },
      { label: "Le goût des plats", tokens: ["bon", "delicieux", "excellent", "savoureux", "gout"] },
      { label: "La cuisson / qualit? produit", tokens: ["cuisson", "qualite", "frais", "chaud"] },
      { label: "Le rapport qualit?-prix", tokens: ["prix", "rapport qualite prix", "abordable"] },
    ]
      .map((theme) => ({ ...theme, score: countThemeMatches(theme.tokens) }))
      .filter((theme) => theme.score > 0)
      .sort((a, b) => b.score - a.score);

    const watchThemes = [
      { label: "Le bruit en salle", tokens: ["bruit", "bruyant"] },
      { label: "Le temps d'attente", tokens: ["attente", "long", "lent", "retard"] },
      { label: "L'assaisonnement (sel / ?pices)", tokens: ["sale", "sal?", "sel", "epice", "epic?"] },
      { label: "La température des plats", tokens: ["froid", "tiède", "tiede", "pas chaud"] },
      { label: "L'organisation du service", tokens: ["oublie", "oubli?", "erreur", "service"] },
    ]
      .map((theme) => ({ ...theme, score: countThemeMatches(theme.tokens) }))
      .filter((theme) => theme.score > 0)
      .sort((a, b) => b.score - a.score);

    const strengths = positiveThemes.slice(0, 3).map((theme) => theme.label);
    const watchouts = watchThemes.slice(0, 3).map((theme) => theme.label);

    if (topReviewedDish && topReviewedDish.avg >= 4 && strengths.length < 3) {
      strengths.unshift(`Le goût de ${topReviewedDish.name}`);
    }
    if (reviewAverage >= 4 && strengths.length === 0) {
      strengths.push("La satisfaction globale des clients");
    }
    if (comments.length === 0 && strengths.length === 0) {
      strengths.push("Pas assez d'avis cette semaine pour détecter un point fort");
    }
    if (reviewAverage > 0 && reviewAverage < 4 && watchouts.length === 0) {
      watchouts.push("La satisfaction globale (note moyenne sous 4/5)");
    }
    if (comments.length === 0 && watchouts.length === 0) {
      watchouts.push("Pas assez d'avis cette semaine pour identifier un point ? surveiller");
    }

    return {
      strengths: strengths.slice(0, 3),
      watchouts: watchouts.slice(0, 3),
    };
  }, [reviews, reviewAverage, topReviewedDish]);
  const weeklyRelevantComments = useMemo(() => {
    return reviews
      .filter((review) => String(review.comment || "").trim().length > 0)
      .map((review) => {
        const comment = String(review.comment || "").trim();
        const rating = Number(review.rating || 0);
        const ts = review.created_at ? Date.parse(review.created_at) : 0;
        const recencyBoost = Number.isFinite(ts) ? Math.max(0, Math.floor(ts / 1000)) : 0;
        const score =
          Math.min(comment.length, 220) +
          (String(review.dish_id || "").trim() ? 8 : 14) +
          (rating <= 3 ? 12 : rating >= 4 ? 8 : 0) +
          recencyBoost / 1000000;
        return { review, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((entry) => entry.review);
  }, [reviews]);
  const reviewCriteriaAverages = useMemo(() => {
    const criteria = [
      { key: "service", label: "Service", fields: ["service_rating", "service_score", "rating_service"] },
      { key: "food", label: "Qualité des plats", fields: ["food_rating", "food_score", "quality_rating", "rating_food"] },
      { key: "speed", label: "Rapidité", fields: ["speed_rating", "speed_score", "rating_speed", "wait_time_rating"] },
      { key: "ambience", label: "Ambiance", fields: ["ambience_rating", "atmosphere_rating", "rating_ambience"] },
      { key: "value", label: "Rapport qualité-prix", fields: ["value_rating", "value_score", "rating_value"] },
      { key: "cleanliness", label: "Propreté", fields: ["cleanliness_rating", "clean_rating", "rating_cleanliness"] },
    ];
    const rows = criteria
      .map((criterion) => {
        const values = reviews
          .map((review) => {
            const row = review as unknown as Record<string, unknown>;
            for (const field of criterion.fields) {
              const candidate = Number(row[field]);
              if (Number.isFinite(candidate) && candidate >= 1 && candidate <= 5) return candidate;
            }
            return NaN;
          })
          .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);
        const count = values.length;
        const average = count > 0 ? values.reduce((sum, value) => sum + value, 0) / count : 0;
        return { key: criterion.key, label: criterion.label, average, count };
      })
      .filter((entry) => entry.count > 0);

    if (rows.length > 0) return rows;
    if (reviewAverage > 0) {
      return [
        {
          key: "global",
          label: "Satisfaction globale",
          average: reviewAverage,
          count: reviews.length,
        },
      ];
    }
    return [] as Array<{ key: string; label: string; average: number; count: number }>;
  }, [reviews, reviewAverage]);
  const renderReviewStars = (ratingRaw: number | null | undefined) => {
    const rating = Math.max(0, Math.min(5, Math.round(Number(ratingRaw || 0))));
    return (
      <div className="flex items-center gap-1" aria-label={`${rating}/5`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index} className={index < rating ? "text-amber-500" : "text-gray-300"}>
            {"\u2605"}
          </span>
        ))}
      </div>
    );
  };
  const handlePrintWeeklyReviewsReport = () => {
    if (typeof window === "undefined") return;
    const reportWindow = window.open("", "_blank", "width=900,height=1000");
    if (!reportWindow) {
      alert("Impossible d'ouvrir la fenêtre d'impression.");
      return;
    }

    const escapeReportHtml = (value: string) =>
      String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const topCommentsHtml =
      weeklyRelevantComments.length > 0
        ? weeklyRelevantComments
            .map((review, index) => {
              const rating = Number(review.rating || 0);
              const dishName =
                String(review.dish?.name_fr || review.dish?.name || "").trim() ||
                (review.dish_id ? dishNameById.get(String(review.dish_id)) : "") ||
                "Restaurant";
              const comment = String(review.comment || "").trim();
              const dateLabel = review.created_at ? new Date(review.created_at).toLocaleString("fr-FR") : "-";
              return `
                <div class="comment">
                  <div class="comment-head">
                    <strong>${index + 1}. ${escapeReportHtml(dishName)}</strong>
                    <span>${rating > 0 ? `${rating}/5` : "-"}</span>
                  </div>
                  <p>${escapeReportHtml(comment)}</p>
                  <div class="meta">${escapeReportHtml(dateLabel)}</div>
                </div>
              `;
            })
            .join("")
        : `<div class="empty">Aucun commentaire pertinent cette semaine.</div>`;

    const strengthsHtml = weeklyAiSummary.strengths.map((item) => `<li>${escapeReportHtml(item)}</li>`).join("");
    const watchoutsHtml = weeklyAiSummary.watchouts.map((item) => `<li>${escapeReportHtml(item)}</li>`).join("");
    const criteriaRowsHtml = reviewCriteriaAverages
      .map(
        (criterion) =>
          `<tr><td>${escapeReportHtml(criterion.label)}</td><td>${criterion.average.toFixed(2)}/5</td><td>${criterion.count}</td></tr>`
      )
      .join("");
    const detailedCommentsHtml = reviews
      .filter((review) => String(review.comment || "").trim().length > 0)
      .slice(0, 30)
      .map((review) => {
        const rating = Number(review.rating || 0);
        const dishName =
          String(review.dish?.name_fr || review.dish?.name || "").trim() ||
          (review.dish_id ? dishNameById.get(String(review.dish_id)) : "") ||
          "Restaurant";
        const scope = String(review.dish_id || "").trim() ? `Plat: ${dishName}` : "Avis restaurant";
        const comment = String(review.comment || "").trim();
        const dateLabel = review.created_at ? new Date(review.created_at).toLocaleString("fr-FR") : "-";
        return `
          <tr>
            <td>${escapeReportHtml(dateLabel)}</td>
            <td>${escapeReportHtml(scope)}</td>
            <td>${rating > 0 ? `${rating}/5` : "-"}</td>
            <td>${escapeReportHtml(comment)}</td>
          </tr>
        `;
      })
      .join("");
    const generatedAt = new Date().toLocaleString("fr-FR");

    reportWindow.document.open();
    reportWindow.document.write(`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Rapport hebdomadaire avis</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 24px; }
    h1,h2,h3 { margin: 0 0 10px; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 16px 0; }
    .card { border: 1px solid #d1d5db; border-radius: 10px; padding: 12px; background: #fff; }
    .label { font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 700; }
    .value { font-size: 24px; font-weight: 800; margin-top: 6px; }
    .muted { color: #4b5563; font-size: 13px; }
    .summary { border: 2px solid #111; border-radius: 12px; padding: 14px; background: #f9fafb; margin: 16px 0; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    ul { margin: 8px 0 0 18px; }
    li { margin: 4px 0; }
    .comment { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; }
    .comment-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .comment p { margin: 8px 0; white-space: pre-wrap; }
    .meta { color: #6b7280; font-size: 12px; }
    .empty { border: 1px dashed #d1d5db; padding: 12px; border-radius: 10px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-weight: 700; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>Rapport hebdomadaire des avis</h1>
  <div class="muted">Analyse sur les 7 derniers jours &bull; G\u00e9n\u00e9r\u00e9 le ${escapeReportHtml(generatedAt)}</div>
  <div class="grid">
    <div class="card"><div class="label">Note moyenne</div><div class="value">${reviewAverage > 0 ? `${reviewAverage}/5` : "-"}</div></div>
    <div class="card"><div class="label">Top plat</div><div class="value" style="font-size:18px;">${escapeReportHtml(topReviewedDish ? topReviewedDish.name : "Aucun")}</div><div class="muted">${topReviewedDish ? `${topReviewedDish.avg}/5 (${topReviewedDish.count} avis)` : ""}</div></div>
    <div class="card"><div class="label">Nombre d'avis</div><div class="value">${reviews.length}</div></div>
  </div>
  <h2>Moyennes par critère de satisfaction</h2>
  <table>
    <thead><tr><th>Critère</th><th>Note moyenne</th><th>Nb. avis</th></tr></thead>
    <tbody>${criteriaRowsHtml || `<tr><td colspan="3">Aucun critère détaillé disponible.</td></tr>`}</tbody>
  </table>
    <h2>R\u00e9sum\u00e9 de l'IA</h2>
    <div class="two-col">
      <div>
        <h3>Points forts</h3>
        <ul>${strengthsHtml || "<li>Aucun signal fort détecté</li>"}</ul>
      </div>
      <div>
        <h3>À surveiller</h3>
        <ul>${watchoutsHtml || "<li>Aucun point critique détecté</li>"}</ul>
      </div>
    </div>
  <h2>3 commentaires les plus pertinents</h2>
  ${topCommentsHtml}
  <h2>Détail des commentaires clients</h2>
  <table>
    <thead><tr><th>Date</th><th>Type</th><th>Note</th><th>Commentaire</th></tr></thead>
    <tbody>${detailedCommentsHtml || `<tr><td colspan="4">Aucun commentaire disponible.</td></tr>`}</tbody>
  </table>
</body>
</html>`);
    reportWindow.document.close();
    reportWindow.focus();
    window.setTimeout(() => {
      reportWindow.print();
    }, 250);
  };
  const soldUnitsLabel =
    managerUiLang === "es" ? "unidades vendidas" : managerUiLang === "de" ? "Portionen verkauft" : "unités vendues";
  const fullSalesInventoryLabel =
    managerUiLang === "es"
      ? "Inventario completo de ventas"
      : managerUiLang === "de"
        ? "Vollständiges Verkaufsinventar"
        : "Inventaire complet des ventes";
  const generatedRevenueLabel =
    managerUiLang === "es" ? "Facturación generada" : managerUiLang === "de" ? "Erzeugter Umsatz" : "CA généré";
  const quantitySoldLabel =
    managerUiLang === "es" ? "Cantidad vendida" : managerUiLang === "de" ? "Verkaufte Menge" : "Quantité vendue";
  const mostProfitableHourLabel =
    managerUiLang === "es" ? "Hora más rentable" : managerUiLang === "de" ? "Profitabelste Stunde" : "Heure la plus rentable";
  const peakOrdersLabel =
    managerUiLang === "es" ? "Pico de pedidos" : managerUiLang === "de" ? "Bestellspitze" : "Pic de commandes";
  const avgRevenuePerHourLabel =
    managerUiLang === "es"
      ? "Facturación media por hora"
      : managerUiLang === "de"
        ? "Durchschnittsumsatz pro Stunde"
        : "Chiffre d'affaires moyen par heure";
  const avgTableDurationLabel =
    managerUiLang === "es"
      ? "Tiempo medio por mesa"
      : managerUiLang === "de"
        ? "Durchschnittliche Tischdauer"
        : "Temps moyen de table";
  const avgOccupationRateLabel =
    managerUiLang === "es"
      ? "Tasa media de ocupación"
      : managerUiLang === "de"
        ? "Durchschnittliche Auslastung"
        : "Taux d'occupation moyen";
  const avgTicketPerCoverLabel =
    managerUiLang === "es"
      ? "Ticket medio por comensal"
      : managerUiLang === "de"
        ? "Durchschnittsbon pro Gast"
        : "Ticket moyen par couvert";
  const avgCoversPerTableLabel =
    managerUiLang === "es"
      ? "Promedio de cubiertos por mesa"
      : managerUiLang === "de"
        ? "Durchschnitt Gäste pro Tisch"
        : "Moyenne de couverts par table";
  const weeklyAverageSummaryLabel =
    managerUiLang === "es"
      ? "Promedio de la semana"
      : managerUiLang === "de"
        ? "Wochendurchschnitt"
        : "Moyenne de la semaine";
  const dailyServiceDetailsLabel =
    managerUiLang === "es"
      ? "Detalle diario (\u00faltimos 7 d\u00edas)"
      : managerUiLang === "de"
        ? "Tagesdetails (letzte 7 Tage)"
        : "D\u00e9tail journalier (7 derniers jours)";
  const weeklyEvolutionLabel =
    managerUiLang === "es"
      ? "Evoluci\u00f3n semanal (30 d\u00edas)"
      : managerUiLang === "de"
        ? "W\u00f6chentliche Entwicklung (30 Tage)"
        : "\u00c9volution hebdomadaire (30 jours)";
  const dateColumnLabel = managerUiLang === "es" ? "Fecha" : managerUiLang === "de" ? "Datum" : "Date";
  const ordersColumnLabel = managerUiLang === "es" ? "Pedidos" : managerUiLang === "de" ? "Bestellungen" : "Commandes";
  const avgDurationColumnLabel =
    managerUiLang === "es" ? "Tiempo medio mesa" : managerUiLang === "de" ? "\u00d8 Tischdauer" : "Temps moyen table";
  const weekColumnLabel = managerUiLang === "es" ? "Semana" : managerUiLang === "de" ? "Woche" : "Semaine";

  const formatEuro = (value: number) => {
    const amount = Number(value || 0);
    const safe = Number.isFinite(amount) ? amount : 0;
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
  };

  const applyDisplaySettings = (
    showCalories: boolean,
    langs: string[],
    labels?: Record<string, string>,
    heroFlag?: boolean,
    badgeType?: string,
    consultationModeFlag?: boolean,
    totalTablesCount?: number
  ) => {
    const normalized = Array.from(new Set(langs.map((code) => normalizeLanguageKey(code)).filter(Boolean)));
    if (!normalized.includes("fr")) normalized.unshift("fr");
    setShowCaloriesClient(showCalories);
    if (typeof heroFlag === "boolean") setHeroEnabled(heroFlag);
    if (badgeType === "chef" || badgeType === "daily") setHeroBadgeType(badgeType);
    if (typeof consultationModeFlag === "boolean") setConsultationModeEnabled(consultationModeFlag);
    if (typeof totalTablesCount === "number") setTotalTables(normalizeTotalTables(totalTablesCount, DEFAULT_TOTAL_TABLES));
    setActiveLanguageCodes(normalized);
    if (labels) {
      setLanguageLabels((prev) => ({ ...prev, ...labels, fr: labels.fr || prev.fr || "Français" }));
    }
  };

  const loadDisplaySettingsFromDb = async (targetRestaurantId?: string | number) => {
    const resolvedTargetId = String(targetRestaurantId ?? scopedRestaurantId ?? "").trim();
    if (!resolvedTargetId) return false;

    const { data: restaurantDataById, error: restaurantByIdError } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", resolvedTargetId)
      .single();
    if (!restaurantByIdError && restaurantDataById) {
      const parsed = parseDisplaySettingsFromRow(restaurantDataById as Record<string, unknown>);
      applyDisplaySettings(
        parsed.showCalories,
        parsed.enabledLanguages,
        parsed.languageLabels,
        parsed.heroEnabled,
        parsed.heroBadgeType,
        parsed.consultationMode,
        parsed.totalTables
      );
      return true;
    }
    console.error("Display settings storage not found in known locations", {
      restaurantByIdError,
      resolvedTargetId,
    });
    return false;
  };

  const persistDisplaySettings = async (
    showCalories: boolean,
    langs: string[],
    labels: Record<string, string>,
    marketingConfig: {
      heroEnabled: boolean;
      heroBadgeType: "chef" | "daily";
      consultationMode: boolean;
    },
    totalTablesCount: number,
    baseTableConfig: unknown,
    restaurantId?: number | string
  ) => {
    const strictHeroEnabled = Boolean(marketingConfig.heroEnabled);
    const strictConsultationMode = Boolean(marketingConfig.consultationMode);
    const enabledLanguagesSerialized = serializeEnabledLanguageEntries(langs, labels);
    const baseConfig = parseObjectRecord(baseTableConfig);
    const baseMarketing = parseObjectRecord(baseConfig.marketing);
    const baseMarketingOptions = parseObjectRecord(baseConfig.marketing_options);
    const nextTableConfig = {
      ...baseConfig,
      show_calories: !!showCalories,
      enabled_languages: enabledLanguagesSerialized,
      show_featured: strictHeroEnabled,
      hero_enabled: strictHeroEnabled,
      marketing: {
        ...baseMarketing,
        hero_enabled: strictHeroEnabled,
        hero_badge_type: marketingConfig.heroBadgeType,
        consultation_mode: strictConsultationMode,
        show_featured: strictHeroEnabled,
      },
      marketing_options: {
        ...baseMarketingOptions,
        hero_enabled: strictHeroEnabled,
        hero_badge_type: marketingConfig.heroBadgeType,
        consultation_mode: strictConsultationMode,
        show_featured: strictHeroEnabled,
      },
    };
    const normalizedTotalTables = normalizeTotalTables(totalTablesCount, DEFAULT_TOTAL_TABLES);
    const targetRestaurantId = String(restaurantId ?? scopedRestaurantId ?? "").trim();
    if (!targetRestaurantId) {
      return "Restaurant ID manquant pour sauvegarder les paramètres.";
    }
    const payloadWithExplicitFeatured = {
      table_count: normalizedTotalTables,
      enabled_languages: enabledLanguagesSerialized,
      show_calories: !!showCalories,
      show_featured: strictHeroEnabled,
      table_config: nextTableConfig,
    };
    const payloadWithoutTopLevelFeatured = {
      table_count: normalizedTotalTables,
      enabled_languages: enabledLanguagesSerialized,
      show_calories: !!showCalories,
      table_config: nextTableConfig,
    };
    const minimalPayload = {
      table_count: normalizedTotalTables,
      table_config: nextTableConfig,
    };

    const tryPersist = async (payload: Record<string, unknown>) => {
      console.log("Valeur envoyée au serveur:", {
        heroEnabled: strictHeroEnabled,
        show_featured: payload.show_featured,
        hero_enabled_table_config: (payload.table_config as Record<string, unknown> | undefined)?.hero_enabled,
      });
      const response = await supabase
        .from("restaurants")
        .update(payload as never)
        .eq("id", targetRestaurantId)
        .select("*")
        .maybeSingle();
      console.log("Réponse du serveur:", response);
      return response;
    };

    let result = await tryPersist(payloadWithExplicitFeatured);
    if (result.error) {
      const errorCode = String((result.error as { code?: string } | null)?.code || "");
      if (errorCode === "42703") {
        result = await tryPersist(payloadWithoutTopLevelFeatured);
      }
    }
    if (result.error) {
      const errorCode = String((result.error as { code?: string } | null)?.code || "");
      if (errorCode === "42703") {
        result = await tryPersist(minimalPayload);
      }
    }

    if (!result.error) {
      const row = result.data as Record<string, unknown> | null;
      if (row) {
        const parsed = parseDisplaySettingsFromRow(row);
        applyDisplaySettings(
          parsed.showCalories,
          parsed.enabledLanguages,
          parsed.languageLabels,
          parsed.heroEnabled,
          parsed.heroBadgeType,
          parsed.consultationMode,
          parsed.totalTables
        );
      } else {
        applyDisplaySettings(
          !!showCalories,
          langs,
          labels,
          strictHeroEnabled,
          marketingConfig.heroBadgeType,
          strictConsultationMode,
          normalizedTotalTables
        );
      }
      return null;
    }

    const errorMessage =
      (result.error as { message?: string } | null)?.message ||
      JSON.stringify(toLoggableSupabaseError(result.error));
    console.error("Display settings not persisted:", errorMessage, {
      payload: {
        table_count: normalizedTotalTables,
        enabled_languages: enabledLanguagesSerialized,
        show_featured: strictHeroEnabled,
      },
    });
    return errorMessage;
  };

  useEffect(() => {
    let mounted = true;
    const loadManagerUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setManagerUserEmail(String(data.user?.email || "").trim());
    };
    void loadManagerUser();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadGlobalNotification = async () => {
      const result = await supabase
        .from("global_notifications")
        .select("id,message")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const errorCode = String((result.error as { code?: string } | null)?.code || "");
      if (result.error && errorCode !== "42P01") {
        console.warn("global_notifications fetch failed (manager):", result.error.message);
      }
      if (!mounted) return;
      setGlobalManagerNotification(
        result.data && String(result.data.message || "").trim()
          ? {
              id: String(result.data.id || ""),
              message: String(result.data.message || "").trim(),
            }
          : null
      );
    };

    const channel = supabase
      .channel("manager-global-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "global_notifications" }, () => {
        void loadGlobalNotification();
      })
      .subscribe();

    void loadGlobalNotification();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    fetchRestaurant();
    fetchCategories();
    fetchDishes();
    fetchOrders();
    fetchReviews();
    fetchTableAssignments();
    fetchCriticalStock();
    fetchSubCategories();
    fetchSidesLibrary();
  }, [scopedRestaurantId]);

  useEffect(() => {
    const channel = supabase
      .channel("manager-stock")
      .on("postgres_changes", { event: "*", schema: "public", table: "dishes" }, () => {
        fetchDishes();
        fetchCriticalStock();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => {
        fetchCategories();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "subcategories" }, () => {
        fetchSubCategories();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "table_assignments" }, () => {
        fetchTableAssignments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scopedRestaurantId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("menuqr_subcategories");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setSubCategories(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("menuqr_subcategories", JSON.stringify(subCategories));
    } catch {
      // ignore
    }
  }, [subCategories]);

  useEffect(() => {
    if (orders.length > 0 || dishes.length > 0) calculateStats(orders);
  }, [orders, dishes]);

  useEffect(() => {
    if (showDishModal || forceFirstLoginPasswordChange) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    return undefined;
  }, [showDishModal, forceFirstLoginPasswordChange]);

  useEffect(() => {
    if (!restaurant) return;
    setForceFirstLoginPasswordChange(toBoolean((restaurant as Record<string, unknown>).first_login, false));
  }, [restaurant]);

  useEffect(() => {
    if (categories.length > 0) {
      if (!formData.category_id) {
        setFormData((prev) => ({ ...prev, category_id: String(categories[0].id) }));
      }
      fetchSubCategories();
    }
  }, [categories]);

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
        setManagerAccessError("Utilisateur non connecté. Veuillez vous reconnecter.");
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

        row = byScopedId.data as Record<string, unknown> | null;
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

          row = byOwner.data as Record<string, unknown>;
          resolvedRestaurantId = normalizeRestaurantId(row.id);
          if (resolvedRestaurantId && resolvedRestaurantId !== scopedRestaurantId) {
            resolvedAccessMessage = `Aucune configuration trouvée pour l'id ${scopedRestaurantId}. Configuration du restaurant ${resolvedRestaurantId} chargée via owner_id.`;
          }
        }
      }

      const rowOwnerId = String(row.owner_id || "").trim();
      if (!isSuperAdminSession && rowOwnerId && rowOwnerId !== authUserId) {
        setManagerAccessError(
          `Accès refusé: owner_id (${rowOwnerId}) différent de l'utilisateur connecté (${authUserId}).`
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

      const tableConfig = parseObjectRecord((row as Record<string, unknown>).table_config);
      const resolvedDensityStyle = normalizeDensityStyle(
        (row as Record<string, unknown>).card_density ??
          (row as Record<string, unknown>).density_style ??
          tableConfig.card_density ??
          tableConfig.density_style ??
          "spacious"
      );
      const resolvedFontFamily = normalizeManagerFontFamily(
        (row as Record<string, unknown>).font_family ?? tableConfig.font_family
      );
      const resolvedBgOpacity = normalizeBackgroundOpacity(
        (row as Record<string, unknown>).bg_opacity ?? tableConfig.bg_opacity,
        1
      );
      const resolvedCardStyle = normalizeCardStyle(
        (row as Record<string, unknown>).card_style ?? tableConfig.card_style
      );
      const hydratedRestaurant = {
        ...row,
        name: String(row.name ?? "").trim(),
        otp_enabled: toBoolean((row as Record<string, unknown>).otp_enabled, false),
        logo_url: String(row.logo_url || "").trim(),
        background_url:
          String(row.background_url || "").trim() ||
          String(row.background_image_url || "").trim() ||
          String(row.bg_image_url || "").trim(),
        text_color: normalizeHexColor(
          row.text_color ?? parseObjectRecord((row as Record<string, unknown>).table_config).text_color,
          "#111111"
        ),
        card_bg_color: normalizeHexColor(row.card_bg_color, "#FFFFFF"),
        card_bg_opacity: normalizeOpacityPercent(
          row.card_bg_opacity ?? parseObjectRecord((row as Record<string, unknown>).table_config).card_bg_opacity,
          toBoolean(
            row.card_transparent ??
              parseObjectRecord((row as Record<string, unknown>).table_config).card_transparent ??
              parseObjectRecord((row as Record<string, unknown>).table_config).cards_transparent,
            false
          )
            ? 0
            : 100
        ),
        card_text_color: normalizeHexColor(
          row.card_text_color ?? parseObjectRecord((row as Record<string, unknown>).table_config).card_text_color,
          "#111111"
        ),
        card_transparent: toBoolean(
          row.card_transparent ??
            parseObjectRecord((row as Record<string, unknown>).table_config).card_transparent ??
            parseObjectRecord((row as Record<string, unknown>).table_config).cards_transparent,
          false
        ),
        font_family: resolvedFontFamily,
        menu_layout: normalizeMenuLayout((row as Record<string, unknown>).menu_layout),
        card_layout:
          parseCardLayoutToken((row as Record<string, unknown>).card_layout) ??
          parseCardLayoutToken((row as Record<string, unknown>).card_style) ??
          "default",
        card_style: resolvedCardStyle,
        card_density: resolvedDensityStyle,
        density_style: resolvedDensityStyle,
        bg_opacity: resolvedBgOpacity,
      };
      setRestaurant(hydratedRestaurant as Restaurant);
      setManagerOtpEnabled(toBoolean((row as Record<string, unknown>).otp_enabled, false));
      setManagerOtpError("");
      setForceFirstLoginPasswordChange(toBoolean((row as Record<string, unknown>).first_login, false));
      const socialLinks = parseObjectRecord(tableConfig.social_links);
      const customTagsRaw = Array.isArray(row.custom_tags) ? row.custom_tags : [];
      const parsed = parseCategoryConfig(customTagsRaw) as {
        categories: string[] | null;
        subCategories: Record<string, string[]> | null;
        rest: string[];
      };
      setAutoPrintKitchen(
        Boolean(
          (row as Record<string, unknown>).auto_print ?? tableConfig.auto_print ??
            parseAutoPrintSetting(customTagsRaw)
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
        const langTable = await supabase
          .from("restaurant_languages")
          .select("language_code, language_name")
          .eq("restaurant_id", String(row.id || scopedRestaurantId));
        if (!langTable.error && Array.isArray(langTable.data)) {
          const options = langTable.data
            .map((entry) => {
              const code = normalizeLanguageKey(entry.language_code);
              if (!code) return null;
              return {
                code,
                label: String(entry.language_name || code.toUpperCase()).trim() || code.toUpperCase(),
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
      } catch {
        // ignore, fall back to row/table_config values
      }

      setRestaurantForm({
        ...row,
        name: String(row.name ?? "").trim(),
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
        smtp_user: String(row.smtp_user || ""),
        smtp_password: "",
        email_subject: String(row.email_subject || "Votre ticket de caisse - [Nom du Resto]"),
        email_body_header: String(row.email_body_header || "Merci de votre visite ! Voici votre ticket :"),
        email_footer: String(row.email_footer || "À bientôt !"),
      });
    } catch (error) {
      console.error("Manager: chargement configuration restaurant impossible:", error);
      setRestaurant(null);
      setManagerAccessError("Impossible de charger la configuration du restaurant.");
    } finally {
      setIsRestaurantLoading(false);
    }
  };
  const fetchCategories = async () => {
    if (!scopedRestaurantId) {
      setCategories([]);
      return;
    }

    let result = await supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", scopedRestaurantId)
      .order("id", { ascending: true });

    if (result.error && String((result.error as { code?: string })?.code || "") === "42703") {
      result = await supabase
        .from("categories")
        .select("*")
        .eq("id_restaurant", scopedRestaurantId)
        .order("id", { ascending: true });
    }

    if (result.error) {
      console.error("Erreur categories (scope restaurant)", result.error);
      setCategories([]);
      return;
    }

    setCategories((result.data || []) as CategoryItem[]);
  };

  const fetchDishes = async () => {
    if (!scopedRestaurantId) {
      setDishes([]);
      return;
    }

    let result = await supabase
      .from("dishes")
      .select("*")
      .eq("restaurant_id", scopedRestaurantId)
      .order("category_id", { ascending: true })
      .order("id", { ascending: true });

    if (result.error && String((result.error as { code?: string })?.code || "") === "42703") {
      result = await supabase
        .from("dishes")
        .select("*")
        .eq("id_restaurant", scopedRestaurantId)
        .order("category_id", { ascending: true })
        .order("id", { ascending: true });
    }

    if (result.error) {
      console.error("Erreur fetch dishes (scope restaurant):", result.error);
      setDishes([]);
      return;
    }

    const data = result.data;
    console.log("DEBUG manager dishes:", data);

    if (Array.isArray(data)) {
      const normalized = data.map((dish: Dish & Record<string, unknown>) => {
        const isChefSuggestion = toBoolean(dish.is_chef_suggestion ?? dish.is_featured ?? dish.is_suggestion, false);
        const isDailySpecial = toBoolean(dish.is_daily_special ?? dish.is_special, false);
        const isSuggestionBadge = toBoolean(dish.is_suggestion ?? isChefSuggestion, false);
        const promoPriceRaw = dish.promo_price;
        const promoPrice =
          promoPriceRaw == null || String(promoPriceRaw).trim() === ""
            ? null
            : Number(String(promoPriceRaw).replace(",", "."));
        const legacyCategoryKey = Object.keys(dish).find((key) => /^cat.*gorie$/i.test(key) && key !== "category");
        return {
          ...dish,
          category_id: dish.category_id ?? null,
          subcategory_id: dish.subcategory_id ?? null,
          categorie: String(
            (dish as unknown as Record<string, unknown>).category ??
              (dish as unknown as Record<string, unknown>)["catégorie"] ??
              (legacyCategoryKey ? (dish as unknown as Record<string, unknown>)[legacyCategoryKey] : undefined) ??
              dish.categorie ??
              ""
          ),
          sub_category: String(dish.sub_category ?? (dish as unknown as Record<string, unknown>).sous_categorie ?? ""),
          hunger_level: dish.hunger_level ?? "",
          is_featured: isChefSuggestion,
          is_special: isDailySpecial,
          is_chef_suggestion: isChefSuggestion,
          is_daily_special: isDailySpecial,
          is_suggestion: isSuggestionBadge,
          is_promo: toBoolean(dish.is_promo, false),
          promo_price: Number.isFinite(promoPrice as number) ? Number(promoPrice) : null,
          ask_cooking: dish.ask_cooking ?? false,
          max_options: dish.max_options ?? 1,
          selected_sides: Array.isArray(dish.selected_sides)
            ? dish.selected_sides
            : typeof dish.selected_sides === "string"
              ? (() => {
                  try {
                    const parsed = JSON.parse(dish.selected_sides);
                    return Array.isArray(parsed) ? parsed : [];
                  } catch {
                    return [];
                  }
                })()
              : [],
        };
      });
      const optionsByDishId = new Map<string, ProductOptionItem[]>();
      const extrasByDishId = new Map<string, ExtrasItem[]>();
      const dishIds = normalized
        .map((dish) => String(dish.id || "").trim())
        .filter(Boolean);
      if (dishIds.length > 0) {
        const dishOptionsResult = await supabase
          .from("dish_options")
          .select("*")
          .in("dish_id", dishIds as never)
          .order("created_at", { ascending: true });
        if (!dishOptionsResult.error && Array.isArray(dishOptionsResult.data)) {
          const groupedDishOptions = new Map<string, Array<Record<string, unknown>>>();
          (dishOptionsResult.data as Array<Record<string, unknown>>).forEach((row) => {
            const dishId = String(row.dish_id ?? "").trim();
            if (!dishId) return;
            const current = groupedDishOptions.get(dishId) || [];
            current.push(row);
            groupedDishOptions.set(dishId, current);
          });
          groupedDishOptions.forEach((rows, dishId) => {
            extrasByDishId.set(dishId, parseDishOptionsRowsToExtras(rows));
          });
        } else if (dishOptionsResult.error) {
          console.warn("dish_options fetch failed (manager dishes list):", dishOptionsResult.error.message);
        }

        const primaryProductOptionsResult = await supabase
          .from("product_options")
          .select("*")
          .in("product_id", dishIds as never)
          .order("created_at", { ascending: true });
        const useFallback =
          primaryProductOptionsResult.error &&
          String((primaryProductOptionsResult.error as { code?: string })?.code || "") === "42703";
        const fallbackProductOptionsResult = useFallback
          ? await supabase
            .from("product_options")
            .select("*")
            .in("dish_id", dishIds as never)
            .order("created_at", { ascending: true })
          : null;
        const finalProductOptionsData = useFallback
          ? fallbackProductOptionsResult?.data
          : primaryProductOptionsResult.data;
        const finalProductOptionsError = useFallback
          ? fallbackProductOptionsResult?.error
          : primaryProductOptionsResult.error;

        if (!finalProductOptionsError && Array.isArray(finalProductOptionsData)) {
          (finalProductOptionsData as Array<Record<string, unknown>>).forEach((row) => {
            const productId = String(row.product_id ?? row.dish_id ?? "").trim();
            const namesI18n = {
              ...parseObjectRecord(row.names_i18n),
              ...parseI18nToken(String(row.name_en || "")),
            };
            const name = String(row.name_fr || namesI18n.fr || row.name || "").trim();
            if (!productId || !name) return;
            const priceRaw = row.price_override;
            const priceOverride =
              priceRaw == null || String(priceRaw).trim() === ""
                ? null
                : Number.parseFloat(String(priceRaw).replace(",", "."));
            const current = optionsByDishId.get(productId) || [];
            current.push({
              id: String(row.id || createLocalId()),
              name,
              name_fr: name,
              name_en: String(row.name_en || namesI18n.en || "").trim() || null,
              name_es: String(row.name_es || namesI18n.es || "").trim() || null,
              name_de: String(row.name_de || namesI18n.de || "").trim() || null,
              names_i18n: {
                fr: name,
                ...Object.fromEntries(
                  Object.entries(namesI18n)
                    .map(([lang, value]) => [normalizeLanguageKey(lang), String(value || "").trim()])
                    .filter(([lang, value]) => Boolean(lang) && Boolean(value))
                ),
              },
              price_override: Number.isFinite(priceOverride as number) ? Number(priceOverride) : null,
            });
            optionsByDishId.set(productId, current);
          });
        } else if (finalProductOptionsError) {
          console.warn("product_options fetch failed (manager dishes list):", finalProductOptionsError.message);
        }
      }
      const normalizedWithOptions = normalized.map((dish) => ({
        ...dish,
        extras_list: mergeExtrasUnique(
          extrasByDishId.get(String(dish.id || "").trim()) || [],
          mergeExtrasUnique(
            parseExtrasFromUnknown((dish as Record<string, unknown>).extras),
            parseExtrasFromUnknown((dish as Record<string, unknown>).extras_list)
          )
        ),
        product_options: optionsByDishId.get(String(dish.id || "").trim()) || [],
      }));
      setDishes(normalizedWithOptions);
      setAllergenLibrary((prev) => {
        if (prev.length > 0) return prev;
        const discoveredRows: AllergenLibraryRow[] = [];
        const seen = new Set<string>();
        normalizedWithOptions.forEach((dish) => {
          const discovered = extractAllergenNamesFromDishPayload(dish as unknown as Record<string, unknown>);
          discovered.forEach((nameFr) => {
            const key = normalizeText(nameFr);
            if (!key || seen.has(key)) return;
            seen.add(key);
            discoveredRows.push({ id: createLocalId(), name_fr: nameFr, names_i18n: { fr: nameFr } });
          });
        });
        return mergeAllergenLibraryRows(prev, discoveredRows);
      });
    } else {
      setDishes([]);
    }
  };

  const fetchReviews = async () => {
    try {
      if (!scopedRestaurantId) {
        setReviews([]);
        return;
      }

      let data: unknown[] | null = null;
      let error: unknown = null;
      const joined = await supabase
        .from("reviews")
        .select("*, dish:dishes(id,name,name_fr,image_url)")
        .eq("restaurant_id", scopedRestaurantId)
        .gte("created_at", sevenDaysAgoIso)
        .order("created_at", { ascending: false })
        .limit(100);

      data = (joined.data as unknown[]) || null;
      error = joined.error;
      if (joined.error) {
        const fallback = await supabase
          .from("reviews")
          .select("*")
          .eq("restaurant_id", scopedRestaurantId)
          .gte("created_at", sevenDaysAgoIso)
          .order("created_at", { ascending: false })
          .limit(100);
        data = (fallback.data as unknown[]) || null;
        error = fallback.error;
      }

      if (error) {
        const code = String((error as { code?: string })?.code || "");
        if (code === "42P01") {
          console.warn("Table reviews absente ou schema incomplet:", (error as { message?: string })?.message || error);
          setReviews([]);
          return;
        }
        if (code !== "42703") {
          console.error("Erreur chargement reviews:", toLoggableSupabaseError(error));
          return;
        }
      }
      let reviewRows = Array.isArray(data) ? (data as ReviewRow[]) : [];
      if (reviewRows.length === 0 || String((error as { code?: string })?.code || "") === "42703") {
        let relatedOrders = await supabase
          .from("orders")
          .select("id")
          .eq("restaurant_id", scopedRestaurantId)
          .gte("created_at", sevenDaysAgoIso)
          .order("created_at", { ascending: false })
          .limit(400);
        if (relatedOrders.error && String((relatedOrders.error as { code?: string })?.code || "") === "42703") {
          relatedOrders = await supabase
            .from("orders")
            .select("id")
            .eq("id_restaurant", scopedRestaurantId)
            .gte("created_at", sevenDaysAgoIso)
            .order("created_at", { ascending: false })
            .limit(400);
        }
        const orderIds = Array.isArray(relatedOrders.data)
          ? relatedOrders.data.map((row) => String((row as { id?: string | number | null })?.id || "").trim()).filter(Boolean)
          : [];
        if (!relatedOrders.error && orderIds.length > 0) {
          let byOrder = await supabase
            .from("reviews")
            .select("*, dish:dishes(id,name,name_fr,image_url)")
            .in("order_id", orderIds)
            .gte("created_at", sevenDaysAgoIso)
            .order("created_at", { ascending: false })
            .limit(100);
          if (byOrder.error) {
            byOrder = await supabase
              .from("reviews")
              .select("*")
              .in("order_id", orderIds)
              .gte("created_at", sevenDaysAgoIso)
              .order("created_at", { ascending: false })
              .limit(100);
          }
          if (!byOrder.error && Array.isArray(byOrder.data)) {
            reviewRows = byOrder.data as ReviewRow[];
          }
        }
      }
      setReviews(reviewRows);
    } catch (error) {
      console.warn("Chargement reviews ignor?:", error);
    }
  };

  const fetchCriticalStock = async () => {
    if (!scopedRestaurantId) {
      setCriticalStock([]);
      return;
    }

    let result = await supabase
      .from("dishes")
      .select("*")
      .eq("active", false)
      .eq("restaurant_id", scopedRestaurantId);

    if (result.error && String((result.error as { code?: string })?.code || "") === "42703") {
      result = await supabase
        .from("dishes")
        .select("*")
        .eq("active", false)
        .eq("id_restaurant", scopedRestaurantId);
    }

    if (result.error) {
      console.error("Erreur stock critique:", result.error);
      setCriticalStock([]);
      return;
    }

    setCriticalStock((result.data || []) as Dish[]);
  };

  const fetchSubCategories = async () => {
    if (!scopedRestaurantId) {
      setSubCategoryRows([]);
      setSubCategories({});
      return;
    }

    let result = await supabase
      .from("subcategories")
      .select("*")
      .eq("restaurant_id", scopedRestaurantId)
      .order("category_id", { ascending: true })
      .order("name_fr", { ascending: true });

    if (result.error && String((result.error as { code?: string })?.code || "") === "42703") {
      result = await supabase
        .from("subcategories")
        .select("*")
        .eq("id_restaurant", scopedRestaurantId)
        .order("category_id", { ascending: true })
        .order("name_fr", { ascending: true });
    }

    if (result.error) {
      setSubCategoryRows([]);
      setSubCategories({});
      return;
    }

    const rows = (result.data || []) as SubCategoryItem[];
    setSubCategoryRows(rows);
    const map: Record<string, string[]> = {};
    const categoryMap = new Map<string, string>(categories.map((category) => [String(category.id), category.name_fr]));
    rows.forEach((row) => {
      const categoryName = categoryMap.get(String(row.category_id));
      if (!categoryName) return;
      if (!map[categoryName]) map[categoryName] = [];
      map[categoryName].push(row.name_fr);
    });
    setSubCategories(map);
  };

  const fetchSidesLibrary = async () => {
    if (!scopedRestaurantId) {
      setSidesLibrary([]);
      return;
    }

    let result = await supabase
      .from("sides_library")
      .select("*")
      .eq("restaurant_id", scopedRestaurantId)
      .order("id", { ascending: true });

    if (result.error && String((result.error as { code?: string })?.code || "") === "42703") {
      result = await supabase
        .from("sides_library")
        .select("*")
        .eq("id_restaurant", scopedRestaurantId)
        .order("id", { ascending: true });
    }

    if (result.error) {
      console.error("Erreur fetch sides_library (scope restaurant):", result.error);
      setSidesLibrary([]);
      return;
    }

    setSidesLibrary((result.data || []) as SideLibraryItem[]);
  };

  const fetchTableAssignments = async () => {
    if (!scopedRestaurantId) {
      setTableAssignments([]);
      return;
    }

    console.log("ID utilis?:", scopedRestaurantId, "[manager.fetchTableAssignments]");

    let primaryQuery = await supabase
      .from("table_assignments")
      .select("table_number,pin_code")
      .eq("restaurant_id", scopedRestaurantId)
      .order("table_number", { ascending: true });

    if (primaryQuery.error && String((primaryQuery.error as { code?: string })?.code || "") === "42703") {
      primaryQuery = await supabase
        .from("table_assignments")
        .select("table_number,pin_code")
        .eq("id_restaurant", scopedRestaurantId)
        .order("table_number", { ascending: true });
    }

    if (!primaryQuery.error) {
      setTableAssignments((primaryQuery.data || []) as TableAssignment[]);
      return;
    }

    let fallbackQuery = await supabase
      .from("table_assignments")
      .select("table_number,pin")
      .eq("restaurant_id", scopedRestaurantId)
      .order("table_number", { ascending: true });

    if (fallbackQuery.error && String((fallbackQuery.error as { code?: string })?.code || "") === "42703") {
      fallbackQuery = await supabase
        .from("table_assignments")
        .select("table_number,pin")
        .eq("id_restaurant", scopedRestaurantId)
        .order("table_number", { ascending: true });
    }

    if (fallbackQuery.error) {
      console.error("Erreur fetch table_assignments (scope restaurant):", primaryQuery.error, fallbackQuery.error);
      setTableAssignments([]);
      return;
    }

    const normalized = ((fallbackQuery.data || []) as Array<Record<string, unknown>>).map((row) => ({
      table_number: row.table_number as string | number | null,
      pin_code: row.pin as string | null,
    }));
    setTableAssignments(normalized as TableAssignment[]);
  };

  const fetchOrders = async () => {
    try {
      if (!scopedRestaurantId) {
        setOrders([]);
        return;
      }

      let response = await fetch(
        `${supabaseUrl}/rest/v1/orders?select=*&order=created_at.desc&restaurant_id=eq.${encodeURIComponent(scopedRestaurantId)}`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      let data = await response.json();
      if (
        !response.ok &&
        (String((data as { code?: string })?.code || "") === "42703" ||
          String((data as { message?: string })?.message || "").toLowerCase().includes("schema cache") ||
          String((data as { message?: string })?.message || "").toLowerCase().includes("column"))
      ) {
        response = await fetch(
          `${supabaseUrl}/rest/v1/orders?select=*&order=created_at.desc&id_restaurant=eq.${encodeURIComponent(scopedRestaurantId)}`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
          }
        );
        data = await response.json();
      }

      if (!response.ok) {
        console.error("Erreur lors de la récupération des commandes (scope restaurant):", data);
        setOrders([]);
        return;
      }

      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des commandes:", error);
      setOrders([]);
    }
  };

  const calculateStats = (ordersData: Order[]) => {
    let totalRevenue = 0;
    let totalTips = 0;
    let todayRevenue = 0;
    let todayTips = 0;
    let weekRevenue = 0;
    let weekTips = 0;
    let todayOrdersCount = 0;
    const today = new Date().toDateString();
    const dishCounts: Record<string, number> = {};
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const weekMap: Record<string, number> = {};
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);

    const paidOrders = ordersData.filter((order) => String(order.status || "").toLowerCase() === "paid");

    paidOrders.forEach((order) => {
      const orderTip = Number(order.tip_amount || 0);
      if (Number.isFinite(orderTip) && orderTip > 0) {
        totalTips += orderTip;
      }
      const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
      let orderTotal = 0;

      items.forEach((item: any) => {
        const dishName =
          item?.name ||
          item?.dish?.name ||
          item?.dish?.nom ||
          "Plat supprimé";
        const quantity = Number(item.quantity || 1);
        const itemPrice = Number(item.price || 0) * quantity;
        dishCounts[dishName] = (dishCounts[dishName] || 0) + quantity;
        totalRevenue += itemPrice;
        orderTotal += itemPrice;
      });

      if (!orderTotal) {
        const fallbackTotal = Number(order.total_price ?? order.total ?? 0);
        if (Number.isFinite(fallbackTotal) && fallbackTotal > 0) {
          orderTotal = fallbackTotal;
          totalRevenue += fallbackTotal;
        }
      }

      const orderDate = new Date(order.created_at).toDateString();
      if (orderDate === today) {
        todayRevenue += orderTotal;
        todayTips += Number.isFinite(orderTip) ? orderTip : 0;
        todayOrdersCount++;
      }
      const orderDateObj = new Date(order.created_at);
      if (orderDateObj >= weekAgo) {
        weekRevenue += orderTotal;
        weekTips += Number.isFinite(orderTip) ? orderTip : 0;
        const dayKey = dayNames[orderDateObj.getDay()];
        weekMap[dayKey] = (weekMap[dayKey] || 0) + 1;
      }
    });

    const topDishes = Object.entries(dishCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const averageBasket = todayOrdersCount > 0 ? todayRevenue / todayOrdersCount : 0;

    setStats({
      total: totalRevenue,
      totalTips,
      todayRevenue,
      todayTips,
      weekRevenue,
      weekTips,
      todayOrdersCount,
      averageBasket,
      topDishes,
      weekByDay: dayNames.map((day) => ({ day, count: weekMap[day] || 0 })),
    });
  };

  const resetForm = () => {
    setFormData({
      name_fr: "",
      name_en: "",
      name_es: "",
      name_de: "",
      name_i18n: {},
      description_fr: "",
      description_en: "",
      description_es: "",
      description_de: "",
      description_i18n: {},
      price: "",
      category_id: categories[0] ? String(categories[0].id) : "",
      subcategory_id: "",
      hunger_level: "",
      image_url: "",
      allergens: "",
      calories_min: "",
      calories_max: "",
      has_sides: false,
      has_extras: false,
      allow_multi_select: false,
      ask_cooking: false,
    is_vegetarian_badge: false,
    is_spicy_badge: false,
    is_new_badge: false,
      is_gluten_free_badge: false,
      is_chef_suggestion: false,
      is_daily_special: false,
      is_promo: false,
      promo_price: "",
      is_suggestion: false,
      max_options: "1",
      selected_side_ids: [],
      extras_list: [],
      product_options: [],
      sales_tip: "",
      sales_tip_i18n: {},
      sales_tip_dish_id: "",
    });
    setImagePreviewUrl("");
    setEditingDish(null);
    setDishExtraDraft({ name_fr: "", name_en: "", name_es: "", name_de: "", names_i18n: {}, price: "" });
    setEditingExtraId(null);
    setEditingExtraOriginKey(null);
    setLoadedDishExtras([]);
    setExtrasTouched(false);
    setProductOptionDraft({ name: "", price_override: "", names_i18n: {} });
    setEditingProductOptionId(null);
    setAllergenFormI18n({});
  };

  const handleAddDish = () => {
    resetForm();
    setOpenDishLanguagePanels({ fr: true });
    setShowDishModal(true);
  };

  const handleEditDish = async (dish: Dish) => {
    const dishRecord = dish as unknown as Record<string, unknown>;
    const parsed = parseOptionsFromDescription(dish.description || "");
    const dietaryRaw = (dish as unknown as Record<string, unknown>).dietary_tag;
    const dietary =
      typeof dietaryRaw === "string"
        ? (() => {
            try {
              return JSON.parse(dietaryRaw) as Record<string, unknown>;
            } catch {
              return {};
            }
          })()
        : (dietaryRaw as Record<string, unknown> | null) || {};
    const badgeFlags = parseObjectRecord((dietary as Record<string, unknown>).badges);
    const nameI18n =
      dietary?.i18n && typeof dietary.i18n === "object" && (dietary.i18n as Record<string, unknown>).name
        ? ((dietary.i18n as Record<string, unknown>).name as Record<string, unknown>)
        : {};
    const descriptionI18n =
      dietary?.i18n && typeof dietary.i18n === "object" && (dietary.i18n as Record<string, unknown>).description
        ? ((dietary.i18n as Record<string, unknown>).description as Record<string, unknown>)
        : {};
    const dietaryI18nNode =
      dietary?.i18n && typeof dietary.i18n === "object" ? (dietary.i18n as Record<string, unknown>) : {};
    const salesTipI18nNode = parseJsonObject((dietary as Record<string, unknown>).sales_tip_i18n);
    const directNameByLang = Object.fromEntries(
      activeLanguageCodes.map((code) => {
        const value =
          getLanguageColumnKeys("name", code)
            .map((key) => String(dishRecord[key] || "").trim())
            .find(Boolean) || "";
        return [code, value];
      })
    ) as Record<string, string>;
    const directDescriptionByLang = Object.fromEntries(
      activeLanguageCodes.map((code) => {
        const value =
          getLanguageColumnKeys("description", code)
            .map((key) => String(dishRecord[key] || "").trim())
            .find(Boolean) || "";
        return [code, value];
      })
    ) as Record<string, string>;
    const directSuggestionByLang = Object.fromEntries(
      activeLanguageCodes.map((code) => {
        const value =
          [
            ...getLanguageColumnKeys("suggestion", code),
            ...getLanguageColumnKeys("suggestion_message", code),
          ]
            .map((key) => String(dishRecord[key] || "").trim())
            .find(Boolean) || "";
        return [code, value];
      })
    ) as Record<string, string>;
    const manualAllergensByName = parseJsonObject(dietaryI18nNode.allergens_manual);
    const dietaryAllergensListRaw =
      (dietary as Record<string, unknown>).allergens_selected ??
      (dietary as Record<string, unknown>).allergens_fr ??
      (dietary as Record<string, unknown>).allergens;
    const initialAllergenList = (
      Array.isArray(dietaryAllergensListRaw)
        ? dietaryAllergensListRaw
        : typeof dietaryAllergensListRaw === "string"
          ? dietaryAllergensListRaw.split(",")
          : []
    )
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    const initialAllergenTranslations = Object.fromEntries(
      initialAllergenList.map((allergenFr) => {
        const row = parseJsonObject(manualAllergensByName[allergenFr]);
        const values = Object.fromEntries(
          activeLanguageCodes.map((code) => {
            const normalizedCode = normalizeLanguageKey(String(code || ""));
            const fallbackFr = normalizedCode === "fr" ? allergenFr : "";
            return [normalizedCode, String(row[normalizedCode] || row[code] || fallbackFr || "").trim()];
          })
        );
        return [allergenFr, values];
      })
    ) as Record<string, Record<string, string>>;
    const extrasFromColumn = mergeExtrasUnique(
      parseExtrasFromUnknown(dish.extras),
      parseExtrasFromUnknown(dish.extras_list)
    );
    let initialExtras = mergeExtrasUnique(extrasFromColumn, parsed.extrasList || []);
    let initialProductOptions: ProductOptionItem[] = [];
    if (dish.id != null) {
      const dishOptionsQuery = await supabase
        .from("dish_options")
        .select("*")
        .eq("dish_id", dish.id);
      if (!dishOptionsQuery.error && Array.isArray(dishOptionsQuery.data)) {
        const extrasFromDishOptions = parseDishOptionsRowsToExtras(
          dishOptionsQuery.data as Array<Record<string, unknown>>
        );
        if (extrasFromDishOptions.length > 0) {
          initialExtras = extrasFromDishOptions;
        }
      } else if (dishOptionsQuery.error) {
        console.warn("dish_options fetch failed (manager edit modal):", dishOptionsQuery.error.message);
      }

      const productOptionsQuery = await supabase
        .from("product_options")
        .select("*")
        .eq("product_id", dish.id)
        .order("created_at", { ascending: true });
      if (productOptionsQuery.error && String((productOptionsQuery.error as { code?: string })?.code || "") === "42703") {
        const fallbackProductOptionsQuery = await supabase
          .from("product_options")
          .select("*")
          .eq("dish_id", dish.id)
          .order("created_at", { ascending: true });
        if (!fallbackProductOptionsQuery.error && Array.isArray(fallbackProductOptionsQuery.data)) {
          initialProductOptions = (fallbackProductOptionsQuery.data as Array<Record<string, unknown>>)
            .map((row) => {
              const optionNames = {
                ...parseObjectRecord(row.names_i18n),
                ...parseI18nToken(String(row.name_en || "")),
              };
              const name = String(row.name_fr || optionNames.fr || row.name || "").trim();
              if (!name) return null;
              const priceRaw = row.price_override;
              const priceOverride =
                priceRaw == null || String(priceRaw).trim() === ""
                  ? null
                  : Number.parseFloat(String(priceRaw).replace(",", "."));
              return {
                id: String(row.id || createLocalId()),
                name,
                name_fr: name,
                name_en: String(row.name_en || optionNames.en || "").trim() || null,
                name_es: String(row.name_es || optionNames.es || "").trim() || null,
                name_de: String(row.name_de || optionNames.de || "").trim() || null,
                names_i18n: {
                  fr: name,
                  ...Object.fromEntries(
                    Object.entries(optionNames)
                      .map(([lang, value]) => [normalizeLanguageKey(lang), String(value || "").trim()])
                      .filter(([lang, value]) => Boolean(lang) && Boolean(value))
                  ),
                },
                price_override: Number.isFinite(priceOverride as number) ? Number(priceOverride) : null,
              } as ProductOptionItem;
            })
            .filter(Boolean) as ProductOptionItem[];
        } else if (fallbackProductOptionsQuery.error) {
          console.warn("product_options fetch fallback failed (manager edit modal):", fallbackProductOptionsQuery.error.message);
        }
      } else if (!productOptionsQuery.error && Array.isArray(productOptionsQuery.data)) {
        initialProductOptions = (productOptionsQuery.data as Array<Record<string, unknown>>)
          .map((row) => {
            const optionNames = {
              ...parseObjectRecord(row.names_i18n),
              ...parseI18nToken(String(row.name_en || "")),
            };
            const name = String(row.name_fr || optionNames.fr || row.name || "").trim();
            if (!name) return null;
            const priceRaw = row.price_override;
            const priceOverride =
              priceRaw == null || String(priceRaw).trim() === ""
                ? null
                : Number.parseFloat(String(priceRaw).replace(",", "."));
            return {
              id: String(row.id || createLocalId()),
              name,
              name_fr: name,
              name_en: String(row.name_en || optionNames.en || "").trim() || null,
              name_es: String(row.name_es || optionNames.es || "").trim() || null,
              name_de: String(row.name_de || optionNames.de || "").trim() || null,
              names_i18n: {
                fr: name,
                ...Object.fromEntries(
                  Object.entries(optionNames)
                    .map(([lang, value]) => [normalizeLanguageKey(lang), String(value || "").trim()])
                    .filter(([lang, value]) => Boolean(lang) && Boolean(value))
                ),
              },
              price_override: Number.isFinite(priceOverride as number) ? Number(priceOverride) : null,
            } as ProductOptionItem;
          })
          .filter(Boolean) as ProductOptionItem[];
      } else if (productOptionsQuery.error) {
        console.warn("product_options fetch failed (manager edit modal):", productOptionsQuery.error.message);
      }
    }

    setFormData({
      name_fr: dish.name_fr || dish.name || "",
      name_en: dish.name_en || "",
      name_es: dish.name_es || "",
      name_de: dish.name_de || "",
      name_i18n: {
        ...Object.fromEntries(
          Object.entries(nameI18n || {}).map(([k, v]) => [String(k || "").toLowerCase(), String(v ?? "")])
        ),
        ...Object.fromEntries(activeLanguageCodes.map((code) => [code, directNameByLang[code] || ""])),
        en: directNameByLang.en || dish.name_en || "",
        es: directNameByLang.es || dish.name_es || "",
        de: directNameByLang.de || dish.name_de || "",
      },
      description_fr: getDishDisplayDescription(dish) || "",
      description_en: dish.description_en || "",
      description_es: dish.description_es || "",
      description_de: dish.description_de || "",
      description_i18n: {
        ...Object.fromEntries(
          Object.entries(descriptionI18n || {}).map(([k, v]) => [String(k || "").toLowerCase(), String(v ?? "")])
        ),
        ...Object.fromEntries(activeLanguageCodes.map((code) => [code, directDescriptionByLang[code] || ""])),
        en: directDescriptionByLang.en || dish.description_en || "",
        es: directDescriptionByLang.es || dish.description_es || "",
        de: directDescriptionByLang.de || dish.description_de || "",
      },
      price: dish.price?.toString() || "",
      category_id: dish.category_id != null ? String(dish.category_id) : "",
      subcategory_id: dish.subcategory_id != null ? String(dish.subcategory_id) : "",
      hunger_level: dish.hunger_level || "",
      image_url: dish.image_url || "",
      allergens: initialAllergenList.join(", "),
      calories_min: dish.calories_min?.toString() || "",
      calories_max: dish.calories_max?.toString() || "",
      has_sides: !!dish.has_sides,
      has_extras: initialExtras.length > 0 ? true : !!dish.has_extras,
      allow_multi_select: !!(dish as unknown as Record<string, unknown>).allow_multi_select,
      ask_cooking: dish.ask_cooking ?? !!parsed.askCooking,
      is_vegetarian_badge: toBoolean(
        (dish as unknown as Record<string, unknown>).is_vegetarian ??
          (dietary as Record<string, unknown>).is_vegetarian ??
          badgeFlags.vegetarian,
        false
      ),
      is_spicy_badge: toBoolean(
        (dish as unknown as Record<string, unknown>).is_spicy ??
          (dietary as Record<string, unknown>).is_spicy ??
          badgeFlags.spicy ??
          String((dish as unknown as Record<string, unknown>).spicy_level || "").trim(),
        false
      ),
      is_new_badge: toBoolean(
        (dietary as Record<string, unknown>).is_new ??
          (dietary as Record<string, unknown>).new_badge ??
          badgeFlags.new,
        false
      ),
      is_gluten_free_badge: toBoolean(
        (dietary as Record<string, unknown>).is_gluten_free ??
          (dietary as Record<string, unknown>).gluten_free ??
          badgeFlags.gluten_free,
        false
      ),
      is_chef_suggestion: toBoolean(
        (dish as unknown as Record<string, unknown>).is_chef_suggestion ?? dish.is_featured,
        false
      ),
      is_daily_special: toBoolean(
        (dish as unknown as Record<string, unknown>).is_daily_special ?? dish.is_special,
        false
      ),
      is_promo: toBoolean((dish as unknown as Record<string, unknown>).is_promo, false),
      promo_price:
        (dish as unknown as Record<string, unknown>).promo_price == null
          ? ""
          : String((dish as unknown as Record<string, unknown>).promo_price),
      is_suggestion: toBoolean(
        (dish as unknown as Record<string, unknown>).is_suggestion ??
          (dish as unknown as Record<string, unknown>).is_chef_suggestion ??
          dish.is_featured,
        false
      ),
      max_options: String(dish.max_options ?? 1),
      selected_side_ids: Array.isArray(dish.selected_sides)
        ? dish.selected_sides
        : parsed.sideIds || [],
      extras_list: initialExtras,
      product_options: initialProductOptions,
      sales_tip:
        directSuggestionByLang.fr ||
        String(dish.suggestion_message || "").trim() ||
        (typeof (dietary as Record<string, unknown>).sales_tip === "string"
          ? String((dietary as Record<string, unknown>).sales_tip)
          : ""),
      sales_tip_i18n: Object.fromEntries(
        activeLanguageCodes.map((code) => [
          code,
          String(directSuggestionByLang[code] || salesTipI18nNode[normalizeLanguageKey(code)] || salesTipI18nNode[code] || "").trim(),
        ])
      ),
      sales_tip_dish_id:
        typeof (dietary as Record<string, unknown>).sales_tip_dish_id === "string"
          ? String((dietary as Record<string, unknown>).sales_tip_dish_id)
          : "",
    });
    setImagePreviewUrl(dish.image_url || "");
    setEditingDish(dish);
    setAllergenFormI18n(initialAllergenTranslations);
    setDishExtraDraft({ name_fr: "", name_en: "", name_es: "", name_de: "", names_i18n: {}, price: "" });
    setEditingExtraId(null);
    setEditingExtraOriginKey(null);
    setLoadedDishExtras(initialExtras);
    setExtrasTouched(false);
    setProductOptionDraft({ name: "", price_override: "", names_i18n: {} });
    setEditingProductOptionId(null);
    setOpenDishLanguagePanels(
      Object.fromEntries(activeLanguageCodes.map((code) => [code, code === "fr"]))
    );
    setShowDishModal(true);
  };

  const sanitizeFileName = (value: string) => {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .toLowerCase();
  };

  const handleDishImageUpload = async (file: File) => {
    const localPreview = URL.createObjectURL(file);
    setImagePreviewUrl(localPreview);
    setIsUploadingImage(true);

    try {
      const now = Date.now();
      const rawName = sanitizeFileName(file.name || `dish-${now}.jpg`);
      const filePath = `dishes/${now}-${rawName}`;

      const { error: uploadError } = await supabase.storage
        .from(DISH_IMAGES_BUCKET)
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        alert("Erreur upload image: " + uploadError.message);
        return;
      }

      const { data: publicData } = supabase.storage
        .from(DISH_IMAGES_BUCKET)
        .getPublicUrl(filePath);

      const publicUrl = publicData?.publicUrl || "";
      if (!publicUrl) {
        alert("Impossible de récupérer l'URL publique de l'image.");
        return;
      }

      setFormData((prev) => ({ ...prev, image_url: publicUrl }));
      setImagePreviewUrl(publicUrl);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const extractStoragePathFromPublicUrl = (publicUrl: string, bucket: string) => {
    const url = String(publicUrl || "").trim();
    if (!url) return null;
    try {
      const parsed = new URL(url);
      const marker = `/storage/v1/object/public/${bucket}/`;
      const index = parsed.pathname.indexOf(marker);
      if (index < 0) return null;
      const path = parsed.pathname.slice(index + marker.length);
      return decodeURIComponent(path || "");
    } catch {
      return null;
    }
  };

  const uploadRestaurantAsset = async (kind: "logo" | "banner" | "background", file: File) => {
    if (!restaurant?.id) {
      alert("Restaurant introuvable.");
      return;
    }
    const bucket =
      kind === "logo"
        ? RESTAURANT_LOGOS_BUCKET
        : RESTAURANT_BANNERS_BUCKET;
    const setLoading =
      kind === "logo"
        ? setIsUploadingRestaurantLogo
        : kind === "banner"
          ? setIsUploadingRestaurantBanner
          : setIsUploadingRestaurantBackground;
    const previousUrl =
      kind === "logo"
        ? String(restaurantForm.logo_url || "")
        : kind === "banner"
          ? String((restaurantForm as Record<string, unknown>).banner_image_url || (restaurantForm as Record<string, unknown>).banner_url || "")
          : String((restaurantForm as Record<string, unknown>).background_url || (restaurantForm as Record<string, unknown>).background_image_url || "");
    setLoading(true);
    try {
      const extension = sanitizeFileName(file.name || "").split(".").pop() || "png";
      const timestamp = Date.now();
      const filePath = `restaurants/${String(restaurant.id).trim()}/${kind}_${String(restaurant.id).trim()}_${timestamp}.${extension}`;

      const oldPath = extractStoragePathFromPublicUrl(previousUrl, bucket);
      if (oldPath) {
        const { error: removeOldError } = await supabase.storage.from(bucket).remove([oldPath]);
        if (removeOldError) {
          console.warn(`Suppression ancien asset ${kind} ignorée:`, removeOldError.message);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, { upsert: true });
      if (uploadError) {
        alert(`Erreur upload ${kind === "logo" ? "logo" : kind === "banner" ? "bannière" : "fond"}: ${uploadError.message}`);
        return;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      const publicUrl = String(data?.publicUrl || "").trim();
      if (!publicUrl) {
        alert("Impossible de récupérer l'URL publique.");
        return;
      }

      setRestaurantForm((prev) => ({
        ...prev,
        ...(kind === "logo"
          ? { logo_url: publicUrl }
          : kind === "banner"
            ? { banner_image_url: publicUrl, banner_url: publicUrl }
            : { background_url: publicUrl, background_image_url: publicUrl }),
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDish = (dish: Dish) => {
    setDishToDelete(dish);
    setShowDeleteModal(true);
  };

  const handleToggleDishHighlight = async (
    dish: Dish,
    field: "suggestion_chef" | "is_chef_suggestion" | "is_daily_special" | "is_suggestion" | "is_promo",
    nextValue: boolean
  ) => {
    if (!dish.id || !scopedRestaurantId) return;
    const payload =
      field === "suggestion_chef"
        ? { is_suggestion: nextValue, is_chef_suggestion: nextValue, is_featured: nextValue }
        : field === "is_chef_suggestion"
        ? { is_chef_suggestion: nextValue, is_featured: nextValue }
        : field === "is_daily_special"
          ? { is_daily_special: nextValue, is_special: nextValue }
          : field === "is_suggestion"
            ? { is_suggestion: nextValue }
            : { is_promo: nextValue, promo_price: nextValue ? (dish.promo_price ?? null) : null };
    try {
      let { error } = await supabase
        .from("dishes")
        .update(payload as never)
        .eq("id", dish.id)
        .eq("restaurant_id", scopedRestaurantId);
      if (error && String((error as { code?: string })?.code || "") === "42703") {
        const fallback = await supabase
          .from("dishes")
          .update(payload as never)
          .eq("id", dish.id)
          .eq("id_restaurant", scopedRestaurantId);
        error = fallback.error;
      }
      if (error) {
        console.error("Unable to update dish highlight:", toLoggableSupabaseError(error));
        alert(error.message || "Erreur lors de la mise ? jour des mises en avant.");
        return;
      }
      setDishes((prev) =>
        prev.map((row) => {
          if (row.id !== dish.id) return row;
          if (field === "suggestion_chef") {
            return {
              ...row,
              is_suggestion: nextValue,
              is_chef_suggestion: nextValue,
              is_featured: nextValue,
            };
          }
          if (field === "is_chef_suggestion") {
            return {
              ...row,
              is_chef_suggestion: nextValue,
              is_featured: nextValue,
            };
          }
          if (field === "is_daily_special") {
            return {
              ...row,
              is_daily_special: nextValue,
              is_special: nextValue,
            };
          }
          if (field === "is_suggestion") {
            return {
              ...row,
              is_suggestion: nextValue,
            };
          }
          return {
            ...row,
            is_promo: nextValue,
            promo_price: nextValue ? row.promo_price : null,
          };
        })
      );
      await fetchDishes();
    } catch (error: any) {
      console.error("Unexpected dish highlight toggle error:", error);
      alert(error?.message || "Erreur lors de la mise ? jour des mises en avant.");
    }
  };

  const confirmDeleteDish = async () => {
    if (!dishToDelete?.id || !scopedRestaurantId) return;
    if (!confirm("Supprimer ce plat ?")) return;

    try {
      let response = await fetch(
        `${supabaseUrl}/rest/v1/dishes?id=eq.${dishToDelete.id}&restaurant_id=eq.${encodeURIComponent(scopedRestaurantId)}`,
        {
          method: "DELETE",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );
      if (!response.ok) {
        const firstError = await response.clone().json().catch(() => ({}));
        if (String((firstError as { code?: string })?.code || "") === "42703") {
          response = await fetch(
            `${supabaseUrl}/rest/v1/dishes?id=eq.${dishToDelete.id}&id_restaurant=eq.${encodeURIComponent(scopedRestaurantId)}`,
            {
              method: "DELETE",
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
            }
          );
        }
      }
      if (!response.ok) {
        const errorData = await response.json();
        alert(`Erreur lors de la suppression: ${errorData.message || errorData.error || "Erreur inconnue"}`);
        return;
      }
      alert("Plat supprimé");
      await fetchDishes();
      setShowDeleteModal(false);
      setDishToDelete(null);
    } catch (error: any) {
      alert("Erreur: " + (error?.message || "Erreur inconnue"));
    }
  };

  const handleSave = async () => {
    if (!scopedRestaurantId) {
      alert("Restaurant non défini dans l'URL.");
      return;
    }

    const priceFloat = parseFloat(formData.price);
    if (!formData.name_fr || Number.isNaN(priceFloat) || priceFloat <= 0) {
      alert("Nom et prix valides obligatoires");
      return;
    }
    const parsedPromoPrice = String(formData.promo_price || "").trim()
      ? Number.parseFloat(String(formData.promo_price || "").trim().replace(",", "."))
      : null;
    const unifiedSuggestionFlag = Boolean(formData.is_suggestion || formData.is_chef_suggestion);
    if (formData.is_promo && parsedPromoPrice == null) {
      alert("Le prix promo est obligatoire quand le badge PROMO est activé.");
      return;
    }
    if (formData.is_promo && (!Number.isFinite(parsedPromoPrice as number) || Number(parsedPromoPrice) <= 0)) {
      alert("Prix promo invalide.");
      return;
    }

    if (!formData.category_id) {
      alert("Catégorie invalide");
      return;
    }
    if (formData.has_sides && formData.selected_side_ids.length === 0) {
      alert("Sélectionnez au moins un accompagnement");
      return;
    }
    const mergedEditExtras = editingDish?.id
      ? mergeExtrasUnique(loadedDishExtras, formData.extras_list)
      : formData.extras_list;
    const extrasToPersist = editingDish?.id
      ? (extrasTouched
          ? formData.extras_list
          : mergeExtrasUnique(loadedDishExtras, mergedEditExtras))
      : formData.extras_list;

    const normalizedDescriptionFr = String(formData.description_fr || "").trim();
    const finalDescription = buildDescriptionWithOptions(normalizedDescriptionFr);
    const mergedNameI18n: Record<string, string> = {
      ...(formData.name_i18n || {}),
      fr: formData.name_fr || "",
      en: formData.name_en || "",
      es: formData.name_es || "",
      de: formData.name_de || "",
    };
    const mergedDescriptionI18n: Record<string, string> = {
      ...(formData.description_i18n || {}),
      fr: normalizedDescriptionFr,
      en: formData.description_en || "",
      es: formData.description_es || "",
      de: formData.description_de || "",
    };
    const hasLinkedSuggestionDish = Boolean(String(formData.sales_tip_dish_id || "").trim());
    const resolvedSalesTipFr = String(formData.sales_tip || "").trim() || (hasLinkedSuggestionDish ? getDefaultSuggestionLead("fr") : "");
    const dietaryRaw = editingDish ? (editingDish as unknown as Record<string, unknown>).dietary_tag : null;
    const baseDietary =
      typeof dietaryRaw === "string"
        ? (() => {
            try {
              return JSON.parse(dietaryRaw) as Record<string, unknown>;
            } catch {
              return {};
            }
          })()
        : (dietaryRaw as Record<string, unknown> | null) || {};
    const dietaryTag = {
      ...baseDietary,
      is_vegetarian: !!formData.is_vegetarian_badge,
      is_spicy: !!formData.is_spicy_badge,
      is_new: !!formData.is_new_badge,
      is_gluten_free: !!formData.is_gluten_free_badge,
      badges: {
        ...parseObjectRecord((baseDietary as Record<string, unknown>).badges),
        vegetarian: !!formData.is_vegetarian_badge,
        spicy: !!formData.is_spicy_badge,
        new: !!formData.is_new_badge,
        gluten_free: !!formData.is_gluten_free_badge,
      },
      i18n: {
        ...(baseDietary.i18n && typeof baseDietary.i18n === "object" ? (baseDietary.i18n as Record<string, unknown>) : {}),
        name: mergedNameI18n,
        description: mergedDescriptionI18n,
      },
      sales_tip: resolvedSalesTipFr || null,
      sales_tip_i18n: Object.fromEntries(
        Object.entries(formData.sales_tip_i18n || {})
          .map(([lang, value]) => {
            const normalizedLang = normalizeLanguageKey(lang);
            const resolvedValue = String(value || "").trim() || (hasLinkedSuggestionDish ? getDefaultSuggestionLead(normalizedLang) : "");
            return [normalizedLang, resolvedValue];
          })
          .filter(([lang, value]) => Boolean(lang) && Boolean(value))
      ),
      sales_tip_dish_id: formData.sales_tip_dish_id?.trim() || null,
    };
    const selectedCategory = categories.find((category) => String(category.id) === formData.category_id);
    const selectedSubCategory = subCategoryRows.find((sub) => String(sub.id) === formData.subcategory_id);
    const selectedAllergens = String(formData.allergens || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const manualAllergensByName = Object.fromEntries(
      selectedAllergens.map((allergenFr) => {
        const values = Object.fromEntries(
          activeLanguageCodes.map((code) => {
            const normalizedCode = normalizeLanguageKey(String(code || ""));
            const manualValue = String(allergenFormI18n[allergenFr]?.[normalizedCode] || allergenFormI18n[allergenFr]?.[code] || "").trim();
            const fallbackValue = normalizedCode === "fr" ? allergenFr : "";
            return [normalizedCode, manualValue || fallbackValue];
          })
        );
        return [allergenFr, values];
      })
    );
    const allergensByLang = Object.fromEntries(
      activeLanguageCodes.map((code) => {
        const normalizedCode = normalizeLanguageKey(String(code || ""));
        const localizedList = selectedAllergens
          .map((allergenFr) =>
            String(
              (manualAllergensByName[allergenFr] as Record<string, string> | undefined)?.[normalizedCode] || allergenFr
            ).trim()
          )
          .filter(Boolean);
        return [normalizedCode, localizedList];
      })
    );

    const dishData = {
      name: formData.name_fr,
      name_fr: formData.name_fr,
      name_en: mergedNameI18n.en || null,
      name_es: mergedNameI18n.es || null,
      name_de: mergedNameI18n.de || null,
      description: finalDescription || null,
      description_fr: normalizedDescriptionFr || null,
      description_en: mergedDescriptionI18n.en || null,
      description_es: mergedDescriptionI18n.es || null,
      description_de: mergedDescriptionI18n.de || null,
      price: priceFloat,
      category_id: formData.category_id || null,
      subcategory_id: formData.subcategory_id || null,
      category: selectedCategory?.name_fr || null,
      sub_category: selectedSubCategory?.name_fr || null,
      hunger_level: formData.hunger_level || null,
      image_url: formData.image_url || null,
      calories_min: formData.calories_min ? parseInt(formData.calories_min) : null,
      calories_max: formData.calories_max ? parseInt(formData.calories_max) : null,
      suggestion_message: resolvedSalesTipFr || null,
      has_sides: !!formData.has_sides,
      has_extras: extrasToPersist.length > 0,
      allow_multi_select: !!formData.allow_multi_select,
      dietary_tag: {
        ...dietaryTag,
        allergens_selected: selectedAllergens,
        allergens_fr: selectedAllergens,
        i18n: {
          ...((dietaryTag as Record<string, unknown>).i18n && typeof (dietaryTag as Record<string, unknown>).i18n === "object"
            ? ((dietaryTag as Record<string, unknown>).i18n as Record<string, unknown>)
            : {}),
          allergens: allergensByLang,
          allergens_manual: manualAllergensByName,
        },
      },
      ask_cooking: !!formData.ask_cooking,
      is_chef_suggestion: unifiedSuggestionFlag,
      is_daily_special: !!formData.is_daily_special,
      is_suggestion: unifiedSuggestionFlag,
      is_promo: !!formData.is_promo,
      promo_price: formData.is_promo ? (parsedPromoPrice == null ? null : Number(parsedPromoPrice)) : null,
      is_featured: unifiedSuggestionFlag,
      is_special: !!formData.is_daily_special,
      selected_sides: formData.selected_side_ids || [],
      max_options: 1,
      is_available: true,
      active: true,
      restaurant_id: scopedRestaurantId,
    };
    activeLanguageCodes.forEach((code) => {
      const normalizedCode = normalizeLanguageKey(code);
      if (!normalizedCode) return;
      const nameValue =
        normalizedCode === "fr"
          ? String(formData.name_fr || "").trim()
          : String(formData.name_i18n?.[code] || formData.name_i18n?.[normalizedCode] || "").trim();
      const descriptionValue =
        normalizedCode === "fr"
          ? String(formData.description_fr || "").trim()
          : String(formData.description_i18n?.[code] || formData.description_i18n?.[normalizedCode] || "").trim();
      const suggestionValue =
        normalizedCode === "fr"
          ? resolvedSalesTipFr
          : String(formData.sales_tip_i18n?.[code] || formData.sales_tip_i18n?.[normalizedCode] || "").trim() ||
            (hasLinkedSuggestionDish ? getDefaultSuggestionLead(normalizedCode) : "");
      getLanguageColumnKeys("name", normalizedCode).forEach((columnKey) => {
        (dishData as Record<string, unknown>)[columnKey] = nameValue || null;
      });
      getLanguageColumnKeys("description", normalizedCode).forEach((columnKey) => {
        (dishData as Record<string, unknown>)[columnKey] = descriptionValue || null;
      });
      getLanguageColumnKeys("suggestion", normalizedCode).forEach((columnKey) => {
        (dishData as Record<string, unknown>)[columnKey] = suggestionValue || null;
      });
      getLanguageColumnKeys("suggestion_message", normalizedCode).forEach((columnKey) => {
        (dishData as Record<string, unknown>)[columnKey] = suggestionValue || null;
      });
    });

    try {
      let response;
      if (editingDish?.id) {
        response = await fetch(
          `${supabaseUrl}/rest/v1/dishes?id=eq.${editingDish.id}&restaurant_id=eq.${encodeURIComponent(scopedRestaurantId)}`,
          {
            method: "PATCH",
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify(dishData),
          }
        );
        if (!response.ok) {
          const firstError = await response.clone().json().catch(() => ({}));
          if (String((firstError as { code?: string })?.code || "") === "42703") {
            response = await fetch(
              `${supabaseUrl}/rest/v1/dishes?id=eq.${editingDish.id}&id_restaurant=eq.${encodeURIComponent(scopedRestaurantId)}`,
              {
                method: "PATCH",
                headers: {
                  apikey: supabaseKey,
                  Authorization: `Bearer ${supabaseKey}`,
                  "Content-Type": "application/json",
                  Prefer: "return=representation",
                },
                body: JSON.stringify(dishData),
              }
            );
          }
        }
      } else {
        response = await fetch(`${supabaseUrl}/rest/v1/dishes`, {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(dishData),
        });
      }

      const responseText = await response.text();
      let responseData: Record<string, unknown> = {};
      if (responseText.trim()) {
        try {
          responseData = JSON.parse(responseText) as Record<string, unknown>;
        } catch {
          responseData = { raw: responseText };
        }
      }
      if (!response.ok) {
        const errorMessage = String(
          responseData.message ||
            responseData.error ||
            responseData.details ||
            responseData.hint ||
            responseData.raw ||
            `HTTP ${response.status}`
        );
        console.error("Supabase SQL error while saving dish:", {
          status: response.status,
          statusText: response.statusText,
          payload: responseData,
        });
        if (
          String(responseData.code || "") === "42703" &&
          /suggestion_message/i.test(errorMessage)
        ) {
          alert(
            "Erreur SQL: une colonne dishes.suggestion_message* est absente.\n" +
              "Exécutez la migration add_suggestion_message_i18n_columns.sql."
          );
          return;
        }
        if (
          String(responseData.code || "") === "42703" &&
          /(is_chef_suggestion|is_daily_special)/i.test(errorMessage)
        ) {
          alert(
            "Erreur SQL: colonnes de mise en avant absentes.\n" +
              "Exécutez:\n" +
              "ALTER TABLE dishes ADD COLUMN IF NOT EXISTS is_chef_suggestion BOOLEAN DEFAULT FALSE;\n" +
              "ALTER TABLE dishes ADD COLUMN IF NOT EXISTS is_daily_special BOOLEAN DEFAULT FALSE;"
          );
          return;
        }
        if (
          String(responseData.code || "") === "42703" &&
          /(is_promo|promo_price|is_suggestion)/i.test(errorMessage)
        ) {
          alert(
            "Erreur SQL: colonnes promo/suggestion absentes.\n" +
              "Exécutez:\n" +
              "ALTER TABLE dishes ADD COLUMN IF NOT EXISTS is_promo BOOLEAN DEFAULT FALSE;\n" +
              "ALTER TABLE dishes ADD COLUMN IF NOT EXISTS is_suggestion BOOLEAN DEFAULT FALSE;\n" +
              "ALTER TABLE dishes ADD COLUMN IF NOT EXISTS promo_price NUMERIC(10,2);"
          );
          return;
        }
        alert(`Erreur: ${errorMessage}`);
        return;
      }

      alert(editingDish ? "Plat modifié !" : "Plat créé !");

      const responseRows = Array.isArray(responseData)
        ? (responseData as Array<Record<string, unknown>>)
        : [];
      let savedDishIdRaw: unknown = editingDish?.id ?? responseRows[0]?.id ?? null;
      if (savedDishIdRaw == null) {
        const fallbackDishLookup = await supabase
          .from("dishes")
          .select("id")
          .eq("name", formData.name_fr)
          .eq("restaurant_id", scopedRestaurantId)
          .order("id", { ascending: false })
          .limit(1);
        if (
          fallbackDishLookup.error &&
          String((fallbackDishLookup.error as { code?: string })?.code || "") === "42703"
        ) {
          const fallbackByLegacyColumn = await supabase
            .from("dishes")
            .select("id")
            .eq("name", formData.name_fr)
            .eq("id_restaurant", scopedRestaurantId)
            .order("id", { ascending: false })
            .limit(1);
          if (!fallbackByLegacyColumn.error && Array.isArray(fallbackByLegacyColumn.data) && fallbackByLegacyColumn.data[0]) {
            savedDishIdRaw = (fallbackByLegacyColumn.data[0] as Record<string, unknown>).id ?? null;
          } else if (fallbackByLegacyColumn.error) {
            console.warn("Fallback lookup dish id failed:", fallbackByLegacyColumn.error.message);
          }
        } else if (!fallbackDishLookup.error && Array.isArray(fallbackDishLookup.data) && fallbackDishLookup.data[0]) {
          savedDishIdRaw = (fallbackDishLookup.data[0] as Record<string, unknown>).id ?? null;
        } else if (fallbackDishLookup.error) {
          console.warn("Fallback lookup dish id failed:", fallbackDishLookup.error.message);
        }
      }

      const savedDishId = String(savedDishIdRaw || "").trim();
      if (savedDishId) {
        console.log("Tentative d'insertion dans dish_options pour le plat:", savedDishId);
        const deleteOptionsResult = await supabase.from("dish_options").delete().eq("dish_id", savedDishIdRaw as never);
        if (deleteOptionsResult.error) {
          console.error("Erreur suppression options dish_options:", deleteOptionsResult.error);
          alert(`Plat sauvegardé mais erreur de synchronisation des suppléments: ${deleteOptionsResult.error.message}`);
          return;
        }

        const optionsToInsert = extrasToPersist
          .map((extra) => {
            const names = Object.fromEntries(
              Object.entries({
                ...(extra.names_i18n || {}),
                fr: String(extra.name_fr || "").trim(),
                en: String(extra.name_en || extra.names_i18n?.en || "").trim(),
                es: String(extra.name_es || extra.names_i18n?.es || "").trim(),
                de: String(extra.name_de || extra.names_i18n?.de || "").trim(),
              })
                .map(([lang, value]) => [normalizeLanguageKey(lang), String(value || "").trim()])
                .filter(([lang, value]) => Boolean(lang) && Boolean(value))
            ) as Record<string, string>;
            names.fr = names.fr || String(extra.name_fr || "").trim();
            const row: Record<string, unknown> = {
              dish_id: savedDishIdRaw,
              name: String(names.fr || "").trim(),
              names_i18n: names,
              price: Number.parseFloat(String(extra.price || 0)) || 0,
            };
            return row;
          })
          .filter((row) => row.name);

        if (optionsToInsert.length > 0) {
          const insertOptionsResult = await supabase.from("dish_options").insert(optionsToInsert as never);
          if (insertOptionsResult.error) {
            console.error("Erreur insertion options:", insertOptionsResult.error);
            const schemaHint =
              String((insertOptionsResult.error as { code?: string })?.code || "") === "42703"
                ? " Exécutez la migration ensure_dish_options_i18n_and_fk.sql."
                : "";
            alert(
              `Plat sauvegardé mais erreur d'enregistrement des suppléments: ${insertOptionsResult.error.message}.${schemaHint}`
            );
            return;
          }
        }

        const variantRowsRich = (formData.product_options || [])
          .map((option) => {
            const nameFr = String(option.name_fr || option.name || "").trim();
            if (!nameFr) return null;
            const normalizedNames = Object.fromEntries(
              Object.entries(option.names_i18n || {})
                .map(([lang, value]) => [normalizeLanguageKey(lang), String(value || "").trim()])
                .filter(([lang]) => Boolean(lang))
            ) as Record<string, string>;
            normalizedNames.fr = nameFr;
            return {
              product_id: savedDishIdRaw,
              name: nameFr,
              name_fr: nameFr,
              names_i18n: normalizedNames,
              price_override:
                option.price_override == null || !Number.isFinite(option.price_override)
                  ? null
                  : Number(option.price_override),
            };
          })
          .filter(Boolean) as Array<Record<string, unknown>>;
        const variantRowsBasicByProductId = variantRowsRich.map((row) => ({
          product_id: row.product_id,
          name: row.name,
          price_override: row.price_override,
        }));
        const variantRowsBasicByDishId = variantRowsRich.map((row) => ({
          dish_id: row.product_id,
          name: row.name,
          price_override: row.price_override,
        }));
        let productOptionsDeleteResult = await supabase
          .from("product_options")
          .delete()
          .eq("product_id", savedDishIdRaw as never);
        if (productOptionsDeleteResult.error && hasMissingColumnError(productOptionsDeleteResult.error, "product_id")) {
          productOptionsDeleteResult = await supabase
            .from("product_options")
            .delete()
            .eq("dish_id", savedDishIdRaw as never);
        }
        if (productOptionsDeleteResult.error) {
          console.error("Erreur suppression product_options:", productOptionsDeleteResult.error);
          alert(`Plat sauvegardé mais erreur de synchronisation des variantes: ${productOptionsDeleteResult.error.message}`);
          return;
        }
        if (variantRowsRich.length > 0) {
          let insertVariantsResult = await supabase.from("product_options").insert(variantRowsRich as never);
          if (insertVariantsResult.error && hasMissingColumnError(insertVariantsResult.error)) {
            insertVariantsResult = await supabase.from("product_options").insert(variantRowsBasicByProductId as never);
          }
          if (insertVariantsResult.error && hasMissingColumnError(insertVariantsResult.error, "product_id")) {
            insertVariantsResult = await supabase.from("product_options").insert(variantRowsBasicByDishId as never);
          }
          if (insertVariantsResult.error) {
            console.error("Erreur insertion variantes product_options:", insertVariantsResult.error);
            alert(`Plat sauvegardé mais erreur d'enregistrement des variantes: ${insertVariantsResult.error.message}`);
            return;
          }
        }
      } else {
        console.warn("Impossible de synchroniser dish_options/product_options: dishId introuvable après sauvegarde du plat");
      }

      await fetchDishes();
      resetForm();
      setShowDishModal(false);
    } catch (error: any) {
      console.error("Unexpected save error:", error);
      alert("Erreur: " + (error?.message || "Erreur inconnue"));
    }
  };

  const handleDeleteAllergen = async (rowId: string) => {
    const nextLibrary = allergenLibrary.filter((item) => item.id !== rowId);
    setAllergenLibrary(nextLibrary);
    if (!restaurant?.id) return;
    try {
      const currentTableConfig = parseObjectRecord((restaurant as Record<string, unknown>)?.table_config);
      const nextTableConfig = {
        ...currentTableConfig,
        allergen_library: nextLibrary
          .map((row) => ({
            id: String(row.id || createLocalId()),
            name_fr: String(row.name_fr || "").trim(),
            names_i18n: Object.fromEntries(
              Object.entries(row.names_i18n || {})
                .map(([lang, label]) => [normalizeLanguageKey(lang), String(label || "").trim()])
                .filter(([lang, label]) => Boolean(lang) && Boolean(label))
            ),
          }))
          .filter((row) => row.name_fr),
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
      setRestaurant((prev) =>
        prev ? ({ ...(prev as Restaurant), table_config: nextTableConfig } as Restaurant) : prev
      );
      alert("Allergène supprimé.");
    } catch (error: any) {
      setAllergenLibrary(allergenLibrary);
      alert(`Erreur suppression allergène: ${String(error?.message || "Erreur inconnue")}`);
    }
  };

  const handleSaveRestaurant = async () => {
    if (!restaurant?.id) return;
    try {
      const enabledLangs = Array.from(
        new Set(
          activeLanguageCodes.map((code) => normalizeLanguageKey(String(code || ""))).filter(Boolean)
        )
      );
      if (!enabledLangs.includes("fr")) enabledLangs.unshift("fr");
      const safeName = String(restaurantForm.name ?? "").trim();
      const safeLogo =
        String(restaurantForm.logo_url || "").trim() ||
        String((restaurant as Record<string, unknown>)?.logo_url || "").trim();
      const safeBannerImage = String(
        (restaurantForm as Record<string, unknown>).banner_image_url || (restaurantForm as Record<string, unknown>).banner_url || ""
      ).trim();
      const safeBackground =
        String((restaurantForm as Record<string, unknown>).background_url || (restaurantForm as Record<string, unknown>).background_image_url || "").trim() ||
        String((restaurant as Record<string, unknown>)?.background_url || "").trim() ||
        String((restaurant as Record<string, unknown>)?.background_image_url || "").trim() ||
        String((restaurant as Record<string, unknown>)?.bg_image_url || "").trim();
      const safePrimaryColor =
        String(restaurantForm.primary_color || "").trim() ||
        String((restaurant as Record<string, unknown>)?.primary_color || "").trim() ||
        "#FFFFFF";
      const safeTextColor = normalizeHexColor(
        (restaurantForm as Record<string, unknown>).text_color,
        normalizeHexColor(
          (restaurant as Record<string, unknown>)?.text_color ??
            parseObjectRecord((restaurant as Record<string, unknown>)?.table_config).text_color ??
            parseObjectRecord((restaurant as Record<string, unknown>)?.table_config).global_text_color,
          "#111111"
        )
      );
      const safeCardBgColor = normalizeHexColor(
        (restaurantForm as Record<string, unknown>).card_bg_color,
        normalizeHexColor((restaurant as Record<string, unknown>)?.card_bg_color, "#FFFFFF")
      );
      const safeCardTransparent = toBoolean(
        (restaurantForm as Record<string, unknown>).card_transparent,
        toBoolean(
          (restaurant as Record<string, unknown>)?.card_transparent ??
            parseObjectRecord((restaurant as Record<string, unknown>)?.table_config).card_transparent ??
            parseObjectRecord((restaurant as Record<string, unknown>)?.table_config).cards_transparent,
          false
        )
      );
      const safeCardBgOpacity = normalizeOpacityPercent(
        (restaurantForm as Record<string, unknown>).card_bg_opacity,
        safeCardTransparent ? 0 : 100
      );
      const safeCardTextColor = normalizeHexColor(
        (restaurantForm as Record<string, unknown>).card_text_color,
        normalizeHexColor(
          (restaurant as Record<string, unknown>)?.card_text_color ??
            parseObjectRecord((restaurant as Record<string, unknown>)?.table_config).card_text_color,
          "#111111"
        )
      );
      const safeQuickAddToCartEnabled = toBoolean(
        (restaurantForm as Record<string, unknown>).quick_add_to_cart_enabled,
        toBoolean(parseObjectRecord((restaurant as Record<string, unknown>)?.table_config).quick_add_to_cart_enabled, false)
      );
      const safeGoogleReviewUrl = String((restaurantForm as Record<string, unknown>).google_review_url || "").trim();
      const safeInstagramUrl = String((restaurantForm as Record<string, unknown>).instagram_url || "").trim();
      const safeSnapchatUrl = String((restaurantForm as Record<string, unknown>).snapchat_url || "").trim();
      const safeFacebookUrl = String((restaurantForm as Record<string, unknown>).facebook_url || "").trim();
      const safeXUrl = String((restaurantForm as Record<string, unknown>).x_url || "").trim();
      const safeWebsiteUrl = String((restaurantForm as Record<string, unknown>).website_url || "").trim();
      const safeShowSocialOnReceipt = toBoolean(
        (restaurantForm as Record<string, unknown>).show_social_on_receipt,
        toBoolean(parseObjectRecord((restaurant as Record<string, unknown>)?.table_config).show_social_on_digital_receipt, false)
      );
      const safeDensityStyle = normalizeDensityStyle(
        (restaurantForm as Record<string, unknown>).card_density ??
          (restaurantForm as Record<string, unknown>).density_style ??
          (restaurant as Record<string, unknown>)?.card_density ??
          parseObjectRecord((restaurant as Record<string, unknown>)?.table_config).density_style ??
          parseObjectRecord((restaurant as Record<string, unknown>)?.table_config).card_density ??
          "spacious"
      );
      const safeBgOpacity = normalizeBackgroundOpacity(
        (restaurantForm as Record<string, unknown>).bg_opacity ??
          (restaurant as Record<string, unknown>)?.bg_opacity ??
          parseObjectRecord((restaurant as Record<string, unknown>)?.table_config).bg_opacity,
        1
      );
      const safeFontFamily = normalizeManagerFontFamily(restaurantForm.font_family);
      const safeMenuLayout = normalizeMenuLayout((restaurantForm as Record<string, unknown>).menu_layout);
      const safeCardLayout = normalizeCardLayout((restaurantForm as Record<string, unknown>).card_layout);
      const safeCardStyle = normalizeCardStyle((restaurantForm as Record<string, unknown>).card_style);
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
      const currentTableConfig = parseObjectRecord((restaurant as Record<string, unknown>)?.table_config);
      const nextCookingTranslations = Object.fromEntries(
        COOKING_TRANSLATION_ORDER.map((key) => {
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
        font_family: safeFontFamily,
        menu_layout: safeMenuLayout,
        card_layout: safeCardLayout,
        card_style: safeCardStyle,
        card_density: safeDensityStyle,
        density_style: safeDensityStyle,
        bg_opacity: safeBgOpacity,
        card_transparent: safeCardTransparent,
        card_bg_opacity: safeCardBgOpacity,
        text_color: safeTextColor,
        global_text_color: safeTextColor,
        card_text_color: safeCardTextColor,
        quick_add_to_cart_enabled: safeQuickAddToCartEnabled,
        social_links: {
          instagram: safeInstagramUrl || null,
          snapchat: safeSnapchatUrl || null,
          facebook: safeFacebookUrl || null,
          x: safeXUrl || null,
          website: safeWebsiteUrl || null,
        },
        show_social_on_digital_receipt: safeShowSocialOnReceipt,
        auto_print: autoPrintKitchen,
        cooking_translations: nextCookingTranslations,
        allergen_library: allergenLibrary
          .map((row) => ({
            id: String(row.id || createLocalId()),
            name_fr: String(row.name_fr || "").trim(),
            names_i18n: Object.fromEntries(
              Object.entries(row.names_i18n || {})
                .map(([lang, label]) => [normalizeLanguageKey(lang), String(label || "").trim()])
                .filter(([lang, label]) => Boolean(lang) && Boolean(label))
            ),
          }))
          .filter((row) => row.name_fr),
      };
      const restaurantPayloadBase: Record<string, unknown> = {
        name: safeName,
        google_review_url: safeGoogleReviewUrl || null,
        primary_color: safePrimaryColor,
        text_color: safeTextColor,
        card_bg_color: safeCardBgColor,
        font_family: safeFontFamily,
        is_order_disabled: consultationModeEnabled,
        auto_print: autoPrintKitchen,
        table_config: nextTableConfig,
        menu_layout: safeMenuLayout,
        card_layout: safeCardLayout,
        card_style: safeCardStyle,
        card_density: safeDensityStyle,
        bg_opacity: safeBgOpacity,
        smtp_user: safeSmtpUser || null,
        email_subject: safeEmailSubject,
        email_body_header: safeEmailBodyHeader,
        email_footer: safeEmailFooter,
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
      (["font_family", "card_style", "card_density"] as const).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(restaurantPayloadBase, key)) {
          console.error(`[manager.save] Clé de style absente du payload: ${key}`);
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
          console.log("DEBUG PAYLOAD:", restaurantData);
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
              confirmedRestaurantRow = updateResult.data as Record<string, unknown>;
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
          confirmedRestaurantRow = emailUpdateResult.data as Record<string, unknown>;
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
        const langRows = Array.from(new Set(enabledLangs))
          .map((code, index) => ({
            restaurant_id: restaurant.id,
            code,
            label: String(languageLabels[code] || DEFAULT_LANGUAGE_LABELS[code] || code.toUpperCase()).trim(),
            is_active: true,
            sort_order: index,
          }))
          .filter((row) => row.code && row.label);
        const deleteResult = await supabase.from("restaurant_languages").delete().eq("restaurant_id", restaurant.id);
        if (deleteResult.error && !["42P01", "42703"].includes(String((deleteResult.error as { code?: string })?.code || ""))) {
          console.warn("Suppression restaurant_languages échouée:", deleteResult.error);
        }
        if (langRows.length > 0) {
          const insertResult = await supabase.from("restaurant_languages").insert(langRows as never);
          if (insertResult.error && !["42P01", "42703"].includes(String((insertResult.error as { code?: string })?.code || ""))) {
            console.warn("Insertion restaurant_languages échouée:", insertResult.error);
          }
        }
      } catch (langTableError) {
        console.warn("Sync restaurant_languages ignor?:", langTableError);
      }
      writeLocalClientOrderingDisabled(consultationModeEnabled);
      if (!confirmedRestaurantRow) {
        const rowResult = await supabase.from("restaurants").select("*").eq("id", restaurant.id).maybeSingle();
        if (!rowResult.error && rowResult.data && typeof rowResult.data === "object") {
          confirmedRestaurantRow = rowResult.data as Record<string, unknown>;
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

      alert("Restaurant mis ? jour !");
      // Refresh related entities after restaurant settings are reloaded from DB.
      await Promise.all([fetchCategories(), fetchSubCategories(), fetchSidesLibrary(), fetchDishes()]);
    } catch (error: any) {
      console.error("Unexpected restaurant save error:", error);
      alert("Erreur: " + (error?.message || "Erreur inconnue"));
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
    setPasswordUpdateMessage("Mot de passe mis ? jour.");
    setForceFirstLoginPasswordChange(false);
    setRestaurant((prev) =>
      prev
        ? ({
            ...(prev as Restaurant),
            first_login: false,
          } as Restaurant)
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
    setRestaurant((prev) =>
      prev
        ? ({
            ...(prev as Restaurant),
            otp_enabled: nextValue,
          } as Restaurant)
        : prev
    );
  };

  const handleManagerSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleCreateSubCategory = async () => {
    if (!scopedRestaurantId) {
      alert("Restaurant non défini dans l'URL.");
      return;
    }

    const selectedCategoryId = String(newSubCategory.category_id || "").trim();
    const nameFr = String(newSubCategory.name_fr || "").trim();
    const subCategoryI18n = Object.fromEntries(
      activeLanguageCodes
        .filter((code) => code !== "fr")
        .map((code) => [code, String(newSubCategoryI18n[code] || "").trim()])
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
      alert("Catégorie et nom FR obligatoires");
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
          .eq("id_restaurant", scopedRestaurantId);
        error = legacyUpdate.error as { message?: string; code?: string } | null;
      }
    } else {
      const insertResult = await supabase.from("subcategories").insert([payload]);
      error = insertResult.error as { message?: string; code?: string } | null;
      if (error && String(error.code || "") === "42703") {
        const legacyPayload = {
          category_id: selectedCategoryId,
          id_restaurant: scopedRestaurantId,
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
      alert("Restaurant non défini dans l'URL.");
      return;
    }

    if (!categoryForm.name_fr.trim()) {
      alert("Nom FR obligatoire");
      return;
    }
    const categoryI18n = Object.fromEntries(
      activeLanguageCodes
        .filter((code) => code !== "fr")
        .map((code) => [code, String(categoryFormI18n[code] || "").trim()])
    ) as Record<string, string>;
    const payload = {
      restaurant_id: scopedRestaurantId,
      name_fr: categoryForm.name_fr.trim(),
      name_en: buildI18nToken(categoryI18n),
      name_es: (categoryI18n.es || "").trim() || null,
      name_de: (categoryI18n.de || "").trim() || null,
      destination: normalizeCategoryDestination(categoryForm.destination),
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
          .eq("id_restaurant", scopedRestaurantId);
        error = legacyUpdate.error as { message?: string; code?: string } | null;
      }
    } else {
      const insertResult = await supabase.from("categories").insert([payload]);
      error = insertResult.error as { message?: string; code?: string } | null;
      if (error && String(error.code || "") === "42703") {
        const legacyPayload = {
          id_restaurant: scopedRestaurantId,
          name_fr: categoryForm.name_fr.trim(),
          name_en: buildI18nToken(categoryI18n),
          name_es: (categoryI18n.es || "").trim() || null,
          name_de: (categoryI18n.de || "").trim() || null,
          destination: normalizeCategoryDestination(categoryForm.destination),
        };
        const legacyInsert = await supabase.from("categories").insert([legacyPayload]);
        error = legacyInsert.error as { message?: string; code?: string } | null;
      }
    }
    if (error) {
      alert(error.message);
      return;
    }
    setCategoryForm({ name_fr: "", name_en: "", name_es: "", name_de: "", destination: "cuisine" });
    setCategoryFormI18n({});
    setEditingCategoryId(null);
    setShowCategoryModal(false);
    fetchCategories();
  };

  const handleDeleteCategory = async (id: string | number) => {
    if (!scopedRestaurantId) return;

    let { error } = await supabase.from("categories").delete().eq("id", id).eq("restaurant_id", scopedRestaurantId);
    if (error && String((error as { code?: string })?.code || "") === "42703") {
      const legacyDelete = await supabase.from("categories").delete().eq("id", id).eq("id_restaurant", scopedRestaurantId);
      error = legacyDelete.error;
    }
    if (error) {
      alert(error.message);
      return;
    }
    setCategories((prev) => prev.filter((category) => category.id !== id));
    setSubCategoryRows((prev) => prev.filter((sub) => String(sub.category_id) !== String(id)));
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
        .eq("id_restaurant", scopedRestaurantId);
      error = legacyUpdate.error;
    }

    if (error) {
      alert(error.message);
      return;
    }

    setCategories((prev) =>
      prev.map((category) =>
        String(category.id) === String(id) ? { ...category, destination } : category
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
        .eq("id_restaurant", scopedRestaurantId);
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
      alert("Restaurant non défini dans l'URL.");
      return;
    }

    if (!newSide.name_fr.trim()) {
      alert("Nom FR obligatoire");
      return;
    }
    const i18n = Object.fromEntries(
      activeLanguageCodes
        .filter((code) => code !== "fr")
        .map((code) => [code, String(newSideI18n[code] || "").trim()])
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
        id_restaurant: scopedRestaurantId,
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
      return;
    }
    setNewSide({ name_fr: "", name_en: "", name_es: "", name_de: "" });
    setNewSideI18n({});
    fetchSidesLibrary();
  };

  const handleEditSide = (side: SideLibraryItem) => {
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
    const i18n = Object.fromEntries(
      activeLanguageCodes
        .filter((code) => code !== "fr")
        .map((code) => [code, String(sideFormI18n[code] || "").trim()])
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
        .eq("id_restaurant", scopedRestaurantId);
      error = legacyUpdate.error;
    }
    if (error) {
      alert(error.message);
      return;
    }
    setShowSideModal(false);
    setEditingSideId(null);
    setSideForm({ name_fr: "", name_en: "", name_es: "", name_de: "" });
    setSideFormI18n({});
    fetchSidesLibrary();
  };

  const handleDeleteSide = async (id: number) => {
    if (!scopedRestaurantId) return;

    let { error } = await supabase.from("sides_library").delete().eq("id", id).eq("restaurant_id", scopedRestaurantId);
    if (error && String((error as { code?: string })?.code || "") === "42703") {
      const legacyDelete = await supabase.from("sides_library").delete().eq("id", id).eq("id_restaurant", scopedRestaurantId);
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
      activeLanguageCodes.map((code) => {
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

    setFormData((prev) => {
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
          alert("Impossible d'enregistrer ce supplément. ID manquant.");
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
    setEditingExtraId(null);
    setEditingExtraOriginKey(null);
    setDishExtraDraft({ name_fr: "", name_en: "", name_es: "", name_de: "", names_i18n: {}, price: "" });
  };

  const handleEditExtraInDish = (extra: ExtrasItem) => {
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
    setFormData((prev) => {
      const nextExtras = prev.extras_list.filter((extra) => extra.id !== extraId);
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
  };

  const handleAddProductOptionToDish = () => {
    const name = String(productOptionDraft.name || "").trim();
    if (!name) {
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
        .filter((code) => code !== "fr")
        .map((code) => [normalizeLanguageKey(code), String(productOptionDraft.names_i18n?.[code] || productOptionDraft.names_i18n?.[normalizeLanguageKey(code)] || "").trim()])
        .filter(([code]) => Boolean(code))
    ) as Record<string, string>;
    setFormData((prev) => {
      const nextOptions = [...(prev.product_options || [])];
      const normalizedName = normalizeText(name);
      const duplicateIndex = nextOptions.findIndex(
        (option) =>
          normalizeText(option.name_fr || option.name || "") === normalizedName &&
          String(option.id || "") !== String(editingProductOptionId || "")
      );
      if (duplicateIndex >= 0) {
        alert("Cette variante existe déjà pour ce plat.");
        return prev;
      }

      const nextValue: ProductOptionItem = {
        id: editingProductOptionId || createLocalId(),
        name,
        name_fr: name,
        name_en: optionNamesI18n.en || null,
        name_es: optionNamesI18n.es || null,
        name_de: optionNamesI18n.de || null,
        names_i18n: {
          fr: name,
          ...Object.fromEntries(
            Object.entries(optionNamesI18n).filter(([, value]) => Boolean(String(value || "").trim()))
          ),
        },
        price_override: parsedPrice == null ? null : Number(parsedPrice.toFixed(2)),
      };
      if (editingProductOptionId) {
        const targetIndex = nextOptions.findIndex((option) => String(option.id || "") === String(editingProductOptionId));
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

  const handleEditProductOptionInDish = (option: ProductOptionItem) => {
    const encodedNames = parseI18nToken(String(option.name_en || ""));
    const draftNames = {
      ...(option.names_i18n || {}),
      ...encodedNames,
      en: String(option.name_en || option.names_i18n?.en || encodedNames.en || "").trim(),
      es: String(option.name_es || option.names_i18n?.es || encodedNames.es || "").trim(),
      de: String(option.name_de || option.names_i18n?.de || encodedNames.de || "").trim(),
    };
    setEditingProductOptionId(String(option.id || ""));
    setProductOptionDraft({
      name: String(option.name_fr || option.name || ""),
      price_override: option.price_override == null ? "" : Number(option.price_override).toFixed(2),
      names_i18n: draftNames,
    });
  };

  const handleRemoveProductOptionFromDish = (optionId: string) => {
    setFormData((prev) => ({
      ...prev,
      product_options: (prev.product_options || []).filter((option) => String(option.id || "") !== String(optionId)),
    }));
    if (String(editingProductOptionId || "") === String(optionId)) {
      setEditingProductOptionId(null);
      setProductOptionDraft({ name: "", price_override: "", names_i18n: {} });
    }
  };

  const preparedDishes = useMemo(() => {
    return dishes.map((dish) => {
      return {
        ...dish,
        description_display: getDishDisplayDescription(dish),
        ask_cooking: dish.ask_cooking ?? parseOptionsFromDescription(String(dish.description || "")).askCooking,
      };
    });
  }, [dishes]);

  const getCategoryLabel = (category: CategoryItem) => {
    return category.name_fr || `Catégorie ${category.id}`;
  };

  const normalizeCategoryDestination = (value: unknown): "cuisine" | "bar" => {
    return String(value || "").trim().toLowerCase() === "bar" ? "bar" : "cuisine";
  };

  const sides = sidesLibrary;

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [String(category.id), category])),
    [categories]
  );
  const configuredTableNumbers = useMemo(
    () => Array.from({ length: normalizeTotalTables(totalTables, DEFAULT_TOTAL_TABLES) }, (_, index) => index + 1),
    [totalTables]
  );

  const analyticsData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const rangeDays = analyticsRange === "today" ? 1 : analyticsRange === "7d" ? 7 : 30;
    const rangeStart = new Date(startOfToday);
    rangeStart.setDate(rangeStart.getDate() - (rangeDays - 1));
    const TABLE_SESSION_SETUP_OFFSET_MINUTES = 5;
    const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const managerLocale = managerUiLang === "es" ? "es-ES" : managerUiLang === "de" ? "de-DE" : "fr-FR";
    const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: localTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const hourMinuteFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: localTimezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const dayLabelFormatter = new Intl.DateTimeFormat(managerLocale, {
      timeZone: localTimezone,
      weekday: "long",
    });
    const shortDateFormatter = new Intl.DateTimeFormat(managerLocale, {
      timeZone: localTimezone,
      day: "2-digit",
      month: "2-digit",
    });

    const readItems = (order: Order) => {
      const raw = order.items;
      if (Array.isArray(raw)) return raw as Array<Record<string, unknown>>;
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
        } catch {
          return [];
        }
      }
      return [];
    };

    const normalizeText = (value: unknown) =>
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    const readStatus = (order: Order) => normalizeText(order.status);

    const readOrderDateLocal = (order: Order) => {
      const rawValue = String(order.created_at || "").trim();
      if (!rawValue) return new Date(NaN);
      const hasTimezone = /(?:z|[+-]\d{2}:\d{2})$/i.test(rawValue);
      const utcValue = hasTimezone ? rawValue : `${rawValue}Z`;
      return new Date(utcValue);
    };

    const readOrderCloseDateLocal = (order: Order, fallbackDate?: Date) => {
      const candidates = [order.closed_at, order.updated_at, order.paid_at, order.finished_at, order.ended_at];
      for (const candidate of candidates) {
        const rawValue = String(candidate || "").trim();
        if (!rawValue) continue;
        const hasTimezone = /(?:z|[+-]\d{2}:\d{2})$/i.test(rawValue);
        const utcValue = hasTimezone ? rawValue : `${rawValue}Z`;
        const parsed = new Date(utcValue);
        if (Number.isFinite(parsed.getTime())) return parsed;
      }
      if (fallbackDate && Number.isFinite(fallbackDate.getTime())) return fallbackDate;
      return new Date(NaN);
    };

    const readOrderTotal = (order: Order) => {
      const total = Number(order.total_price);
      return Number.isFinite(total) ? total : 0;
    };
    const readOrderTip = (order: Order) => {
      const tip = Number(order.tip_amount);
      return Number.isFinite(tip) ? tip : 0;
    };
    const readOrderCovers = (order: Order) => {
      const candidates = [order.covers, order.guest_count, order.customer_count];
      for (const value of candidates) {
        const n = Number(value);
        if (Number.isFinite(n) && n > 0) return Math.trunc(n);
      }
      return 0;
    };

    const boolFromUnknown = (value: unknown) => value === true || String(value || "").toLowerCase() === "true";

    const normalizeCategory = (value: unknown) =>
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    const getItemCategory = (item: Record<string, unknown>) => {
      const directLabel =
        String(item.category_name || item.category || item.categorie || item.category_label || "").trim();
      if (directLabel) return directLabel;
      const itemDish = (item.dish as Record<string, unknown> | undefined) || {};
      const nestedLabel = String(itemDish.category_name || itemDish.category || itemDish.categorie || "").trim();
      if (nestedLabel) return nestedLabel;
      const categoryId =
        item.category_id != null
          ? String(item.category_id)
          : itemDish.category_id != null
            ? String(itemDish.category_id)
            : "";
      if (!categoryId) return "";
      const category = categoryById.get(categoryId);
      return category?.name_fr || "";
    };

    const resolveMixKey = (categoryLabel: string) => {
      const normalized = normalizeCategory(categoryLabel);
      if (/(dessert|sucre|sweet)/.test(normalized)) return "desserts";
      if (/(boisson|drink|bar|beverage|cocktail|vin|wine|jus)/.test(normalized)) return "drinks";
      if (/(entree|starter|appetizer)/.test(normalized)) return "starters";
      return "mains";
    };

    const inRangeOrders = orders.filter((order) => {
      const date = readOrderDateLocal(order);
      return date >= rangeStart && date <= now;
    });

    const paidOrders = inRangeOrders.filter((order) => readStatus(order) === "paid");

    const realRevenue = paidOrders.reduce((sum, order) => sum + readOrderTotal(order), 0);
    const totalTips = paidOrders.reduce((sum, order) => sum + readOrderTip(order), 0);
    const averageBasket = paidOrders.length > 0 ? realRevenue / paidOrders.length : 0;
    const paidOrdersWithCovers = paidOrders.filter((order) => readOrderCovers(order) > 0);
    const totalCoversServed = paidOrdersWithCovers.reduce((sum, order) => sum + readOrderCovers(order), 0);
    const totalServedTableSessionsWithCovers = paidOrdersWithCovers.length;
    const averageTicketPerCover = totalCoversServed > 0 ? realRevenue / totalCoversServed : 0;
    const averageCoversPerTable = totalServedTableSessionsWithCovers > 0 ? totalCoversServed / totalServedTableSessionsWithCovers : 0;

    const productCountMap = new Map<string, number>();
    const productRevenueMap = new Map<string, number>();
    const productMix = { starters: 0, mains: 0, desserts: 0, drinks: 0 };
    let dessertOrdersCount = 0;
    let totalSoldItems = 0;
    let recommendedSoldItems = 0;
    let featuredSpecialSoldItems = 0;
    const dishesById = new Map(dishes.map((dish) => [String(dish.id ?? ""), dish]));

    paidOrders.forEach((order) => {
      const items = readItems(order);
      let hasDessert = false;
      items.forEach((item) => {
        const quantity = Number(item.quantity ?? item.qty ?? 1) || 1;
        const itemDish = (item.dish as Record<string, unknown> | undefined) || {};
        const itemId = String(item.id ?? itemDish.id ?? "");
        const sourceDish = itemId ? dishesById.get(itemId) : undefined;
        const name =
          String(item.name || itemDish.name || itemDish.nom || itemDish.name_fr || "").trim() || "Produit";
        productCountMap.set(name, (productCountMap.get(name) || 0) + quantity);
        const rawLineTotal = Number(item.line_total ?? item.total ?? item.total_price ?? NaN);
        const unitPrice = Number(item.price ?? itemDish.price ?? 0) || 0;
        const lineRevenue = Number.isFinite(rawLineTotal) && rawLineTotal > 0 ? rawLineTotal : unitPrice * quantity;
        productRevenueMap.set(name, (productRevenueMap.get(name) || 0) + lineRevenue);
        const mixKey = resolveMixKey(getItemCategory(item));
        if (mixKey === "desserts") hasDessert = true;
        productMix[mixKey] += quantity;
        totalSoldItems += quantity;
        if (item.from_recommendation === true || String(item.from_recommendation || "").toLowerCase() === "true") {
          recommendedSoldItems += quantity;
        }
        if (
          boolFromUnknown(item.is_special) ||
          boolFromUnknown(item.is_featured) ||
          boolFromUnknown(item.is_daily_special) ||
          boolFromUnknown(item.is_chef_suggestion) ||
          boolFromUnknown(itemDish.is_special) ||
          boolFromUnknown(itemDish.is_featured) ||
          boolFromUnknown(itemDish.is_daily_special) ||
          boolFromUnknown(itemDish.is_chef_suggestion) ||
          boolFromUnknown((sourceDish as Dish & { is_special?: boolean | null } | undefined)?.is_special) ||
          boolFromUnknown(sourceDish?.is_featured) ||
          boolFromUnknown(sourceDish?.is_daily_special) ||
          boolFromUnknown(sourceDish?.is_chef_suggestion)
        ) {
          featuredSpecialSoldItems += quantity;
        }
      });
      if (hasDessert) dessertOrdersCount += 1;
    });

    const occupiedTablesSet = new Set<number>();
    const configuredTableSet = new Set<number>(configuredTableNumbers);
    const terminalOccupancyStatuses = new Set([
      "paid",
      "paye",
      "payee",
      "completed",
      "complete",
      "done",
      "finished",
      "termine",
      "terminee",
      "archived",
      "archive",
      "archivee",
      "cancelled",
      "canceled",
      "annule",
      "annulee",
      "free",
      "libre",
      "available",
      "closed",
    ]);
    orders.forEach((order) => {
      const status = readStatus(order);
      if (terminalOccupancyStatuses.has(status)) return;
      const tableNumber = Number(order.table_number);
      if (!Number.isFinite(tableNumber)) return;
      if (!configuredTableSet.has(tableNumber)) return;
      occupiedTablesSet.add(tableNumber);
    });
    const tableStateCounts = {
      free: configuredTableNumbers.filter((tableNumber) => !occupiedTablesSet.has(tableNumber)).length,
      occupied: occupiedTablesSet.size,
    };

    const tableRevenueMap = new Map<string, number>();
    paidOrders.forEach((order) => {
      const tableKeyRaw = order.table_number;
      const tableKey = String(tableKeyRaw ?? "").trim();
      const tableLabel = tableKey || "Sans table";
      tableRevenueMap.set(tableLabel, (tableRevenueMap.get(tableLabel) || 0) + readOrderTotal(order));
    });

    const top5 = [...productCountMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topRevenue5 = [...productRevenueMap.entries()]
      .map(([name, revenue]) => ({ name, revenue, count: productCountMap.get(name) || 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const allProductNames = new Set<string>();
    dishes.forEach((dish) => {
      const name =
        String(
          (dish as unknown as Record<string, unknown>).name ||
            (dish as unknown as Record<string, unknown>).nom ||
            (dish as unknown as Record<string, unknown>).name_fr ||
            ""
        ).trim();
      if (name) allProductNames.add(name);
    });
    [...productCountMap.keys()].forEach((name) => allProductNames.add(name));
    [...productRevenueMap.keys()].forEach((name) => allProductNames.add(name));

    const allProductSales = [...allProductNames]
      .map((name) => ({
        name,
        count: productCountMap.get(name) || 0,
        revenue: productRevenueMap.get(name) || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue || b.count - a.count || a.name.localeCompare(b.name));

    const closedStatuses = new Set(["paid", "paye", "payee", "resolved", "termine", "terminee", "finished", "done"]);
    const closedOrderDurationEntries = inRangeOrders
      .map((order) => {
        if (!closedStatuses.has(readStatus(order))) return null;
        const startDate = readOrderDateLocal(order);
        const closeDate = readOrderCloseDateLocal(order, now);
        if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(closeDate.getTime()) || closeDate < startDate) {
          return null;
        }
        const realDurationMinutes = (closeDate.getTime() - startDate.getTime()) / (1000 * 60);
        const durationMinutes = realDurationMinutes + TABLE_SESSION_SETUP_OFFSET_MINUTES;
        if (!Number.isFinite(durationMinutes) || durationMinutes < 0) return null;
        return {
          startDate,
          dayKey: dateKeyFormatter.format(startDate),
          durationMinutes,
        };
      })
      .filter(
        (
          value
        ): value is {
          startDate: Date;
          dayKey: string;
          durationMinutes: number;
        } => value != null
      );
    const paidTableDurationsMinutes = closedOrderDurationEntries.map((entry) => entry.durationMinutes);

    const totalTablesCount = configuredTableNumbers.length;
    const occupancyIgnoredStatuses = new Set(["cancelled", "canceled", "annule", "annulee"]);
    const occupationSlotDefinitions = [
      { id: "lunch", label: "11h-14h", startHour: 11, endHour: 14 },
      { id: "dinner", label: "18h-22h", startHour: 18, endHour: 22 },
    ] as const;
    const occupationSlotDayMap = new Map<string, Map<string, Set<number>>>();
    occupationSlotDefinitions.forEach((slot) => {
      const dayMap = new Map<string, Set<number>>();
      for (let offset = 0; offset < rangeDays; offset += 1) {
        const date = new Date(rangeStart);
        date.setDate(rangeStart.getDate() + offset);
        dayMap.set(dateKeyFormatter.format(date), new Set<number>());
      }
      occupationSlotDayMap.set(slot.id, dayMap);
    });
    inRangeOrders.forEach((order) => {
      const status = readStatus(order);
      if (occupancyIgnoredStatuses.has(status)) return;
      const tableNumber = Number(order.table_number);
      if (!Number.isFinite(tableNumber) || tableNumber <= 0) return;
      if (!configuredTableSet.has(tableNumber)) return;
      const date = readOrderDateLocal(order);
      if (!Number.isFinite(date.getTime())) return;
      const dayKey = dateKeyFormatter.format(date);
      const hm = hourMinuteFormatter.format(date);
      const [hourText] = hm.split(":");
      const hour = Number(hourText);
      if (!Number.isFinite(hour)) return;
      occupationSlotDefinitions.forEach((slot) => {
        if (hour < slot.startHour || hour >= slot.endHour) return;
        const slotDayMap = occupationSlotDayMap.get(slot.id);
        const tables = slotDayMap?.get(dayKey);
        if (!tables) return;
        tables.add(tableNumber);
      });
    });
    const occupationByTimeSlots = occupationSlotDefinitions.map((slot) => {
      const slotDays = occupationSlotDayMap.get(slot.id);
      const daySets = slotDays ? [...slotDays.values()] : [];
      const occupiedSum = daySets.reduce((sum, tables) => sum + tables.size, 0);
      const peakOccupiedTables = daySets.reduce((max, tables) => Math.max(max, tables.size), 0);
      const sampleDays = daySets.reduce((sum, tables) => sum + (tables.size > 0 ? 1 : 0), 0);
      const averageOccupiedTables = rangeDays > 0 ? occupiedSum / rangeDays : 0;
      const occupancyRate = totalTablesCount > 0 ? (averageOccupiedTables / totalTablesCount) * 100 : 0;
      return {
        id: slot.id,
        label: slot.label,
        occupancyRate,
        averageOccupiedTables,
        peakOccupiedTables,
        sampleDays,
      };
    });
    const averageOccupationRate =
      occupationByTimeSlots.length > 0
        ? occupationByTimeSlots.reduce((sum, slot) => sum + Number(slot.occupancyRate || 0), 0) / occupationByTimeSlots.length
        : 0;
    const averageTableDurationMinutes =
      paidTableDurationsMinutes.length > 0
        ? paidTableDurationsMinutes.reduce((sum, value) => sum + value, 0) / paidTableDurationsMinutes.length
        : 0;

    const getHourlyServiceSlot = (date: Date) => {
      const hm = hourMinuteFormatter.format(date);
      const [hourText, minuteText] = hm.split(":");
      const hour = Number(hourText);
      const minute = Number(minuteText);
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "";
      const inLunch = hour >= 11 && hour < 14;
      const inDinner = hour >= 18 && hour < 22;
      if (!inLunch && !inDinner) return "";
      return `${String(hour).padStart(2, "0")}h-${String(hour + 1).padStart(2, "0")}h`;
    };

    const toLocalDateFromKey = (key: string) => {
      const [year, month, day] = key.split("-").map((value) => Number(value));
      if (!year || !month || !day) return new Date(NaN);
      return new Date(year, month - 1, day);
    };

    const capitalizeLabel = (value: string) => {
      const text = String(value || "").trim();
      if (!text) return text;
      return text.charAt(0).toUpperCase() + text.slice(1);
    };

    let salesTrendData: Array<{ label: string; value: number }> = [];
    let orderTrendData: Array<{ label: string; value: number }> = [];
    let topProductsTimelineData: Array<{ label: string; value: number }> = [];
    let tablePerformanceTimelineData: Array<{ label: string; value: number; table: string }> = [];
    let dailyServicePerformanceData: Array<{
      label: string;
      dateLabel: string;
      revenue: number;
      orders: number;
      averageTableDurationMinutes: number;
    }> = [];
    let weeklyServicePerformanceData: Array<{
      label: string;
      periodLabel: string;
      revenue: number;
      orders: number;
      averageTableDurationMinutes: number;
    }> = [];
    let weeklyRangeSummary = {
      averageRevenuePerDay: 0,
      averageOrdersPerDay: 0,
      averageTableDurationMinutes: 0,
    };
    let salesTrendTitle: string = analyticsText.salesByHour;
    const topProductNames = new Set(top5.map((item) => item.name));
    const averageSalesByHourTitle =
      managerUiLang === "es"
        ? "Promedio de ventas por franja horaria"
        : managerUiLang === "de"
          ? "Durchschnittlicher Umsatz pro Zeitfenster"
          : "Moyenne des ventes par créneau horaire";
    const resolveWeekNumber = (sourceDate: Date) => {
      const dayKey = dateKeyFormatter.format(sourceDate);
      const localDate = toLocalDateFromKey(dayKey);
      const diffMs = localDate.getTime() - rangeStart.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays < 0 || diffDays >= rangeDays) return null;
      return Math.floor(diffDays / 7) + 1;
    };

    const computeAverageHourlySales = () => {
      const slots = new Map<string, number>();
      const orderSlots = new Map<string, number>();
      const addSlot = (startHour: number) => {
        const label = `${String(startHour).padStart(2, "0")}h-${String(startHour + 1).padStart(2, "0")}h`;
        slots.set(label, 0);
        orderSlots.set(label, 0);
      };
      for (let hour = 11; hour < 14; hour += 1) addSlot(hour);
      for (let hour = 18; hour < 22; hour += 1) addSlot(hour);

      paidOrders.forEach((order) => {
        const date = readOrderDateLocal(order);
        const hm = hourMinuteFormatter.format(date);
        const [hourText, minuteText] = hm.split(":");
        const hour = Number(hourText);
        const minute = Number(minuteText);
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) return;
        const inLunch = hour >= 11 && hour < 14;
        const inDinner = hour >= 18 && hour < 22;
        if (!inLunch && !inDinner) return;
        const slotLabel = `${String(hour).padStart(2, "0")}h-${String(hour + 1).padStart(2, "0")}h`;
        if (!slots.has(slotLabel)) return;
        slots.set(slotLabel, (slots.get(slotLabel) || 0) + readOrderTotal(order));
        orderSlots.set(slotLabel, (orderSlots.get(slotLabel) || 0) + 1);
      });

      return {
        sales: [...slots.entries()].map(([label, total]) => ({
          label,
          value: rangeDays > 0 ? total / rangeDays : 0,
        })),
        orders: [...orderSlots.entries()].map(([label, total]) => ({
          label,
          value: rangeDays > 0 ? total / rangeDays : 0,
        })),
      };
    };

    if (analyticsRange === "today") {
      const slotMap = new Map<string, number>();
      const orderSlotMap = new Map<string, number>();
      const addSlot = (hour: number, minute: number) => {
        const slot = `${String(hour).padStart(2, "0")}:${minute === 0 ? "00" : "30"}`;
        slotMap.set(slot, 0);
        orderSlotMap.set(slot, 0);
      };
      for (let minute = 11 * 60; minute < 14 * 60; minute += 30) {
        addSlot(Math.floor(minute / 60), minute % 60);
      }
      for (let minute = 18 * 60; minute < 22 * 60; minute += 30) {
        addSlot(Math.floor(minute / 60), minute % 60);
      }

      paidOrders.forEach((order) => {
        const date = readOrderDateLocal(order);
        const hm = hourMinuteFormatter.format(date);
        const [hourText, minuteText] = hm.split(":");
        const hour = Number(hourText);
        const minute = Number(minuteText);
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) return;
        const inLunch = hour >= 11 && hour < 14;
        const inDinner = hour >= 18 && hour < 22;
        if (!inLunch && !inDinner) return;
        const slotMinute = minute < 30 ? 0 : 30;
        const slot = `${String(hour).padStart(2, "0")}:${slotMinute === 0 ? "00" : "30"}`;
        if (!slotMap.has(slot)) return;
        slotMap.set(slot, (slotMap.get(slot) || 0) + readOrderTotal(order));
        orderSlotMap.set(slot, (orderSlotMap.get(slot) || 0) + 1);
      });

      salesTrendData = [...slotMap.entries()].map(([label, value]) => ({ label, value }));
      orderTrendData = [...orderSlotMap.entries()].map(([label, value]) => ({ label, value }));
      salesTrendTitle = analyticsText.salesByHour;
    } else if (analyticsRange === "7d") {
      const dayMap = new Map<string, number>();
      const dayOrdersMap = new Map<string, number>();
      const dayDurationMap = new Map<string, { total: number; count: number }>();
      const dayTopProductsMap = new Map<string, number>();
      const dayTableMap = new Map<string, Map<string, number>>();
      for (let offset = 0; offset < 7; offset += 1) {
        const date = new Date(rangeStart);
        date.setDate(rangeStart.getDate() + offset);
        const key = dateKeyFormatter.format(date);
        dayMap.set(key, 0);
        dayOrdersMap.set(key, 0);
        dayDurationMap.set(key, { total: 0, count: 0 });
        dayTopProductsMap.set(key, 0);
        dayTableMap.set(key, new Map<string, number>());
      }
      paidOrders.forEach((order) => {
        const key = dateKeyFormatter.format(readOrderDateLocal(order));
        if (!dayMap.has(key)) return;
        dayMap.set(key, (dayMap.get(key) || 0) + readOrderTotal(order));
        dayOrdersMap.set(key, (dayOrdersMap.get(key) || 0) + 1);

        const tableLabel = String(order.table_number ?? "").trim() || "Sans table";
        const tableTotals = dayTableMap.get(key);
        if (tableTotals) {
          tableTotals.set(tableLabel, (tableTotals.get(tableLabel) || 0) + readOrderTotal(order));
        }

        const items = readItems(order);
        let topItemsSold = 0;
        items.forEach((item) => {
          const itemDish = (item.dish as Record<string, unknown> | undefined) || {};
          const name =
            String(item.name || itemDish.name || itemDish.nom || itemDish.name_fr || "").trim() || "Produit";
          if (!topProductNames.has(name)) return;
          const quantity = Number(item.quantity ?? item.qty ?? 1) || 1;
          topItemsSold += quantity;
        });
        dayTopProductsMap.set(key, (dayTopProductsMap.get(key) || 0) + topItemsSold);
      });
      closedOrderDurationEntries.forEach((entry) => {
        if (!dayDurationMap.has(entry.dayKey)) return;
        const current = dayDurationMap.get(entry.dayKey) || { total: 0, count: 0 };
        dayDurationMap.set(entry.dayKey, {
          total: current.total + entry.durationMinutes,
          count: current.count + 1,
        });
      });
      dailyServicePerformanceData = [...dayMap.keys()].map((key) => {
        const localDate = toLocalDateFromKey(key);
        const weekdayLabel = capitalizeLabel(dayLabelFormatter.format(localDate));
        const dateLabel = `${weekdayLabel} ${shortDateFormatter.format(localDate)}`;
        const durationStats = dayDurationMap.get(key) || { total: 0, count: 0 };
        const averageDayDuration = durationStats.count > 0 ? durationStats.total / durationStats.count : 0;
        return {
          label: dateLabel,
          dateLabel,
          revenue: dayMap.get(key) || 0,
          orders: dayOrdersMap.get(key) || 0,
          averageTableDurationMinutes: averageDayDuration,
        };
      });
      const weeklyDurationStats = [...dayDurationMap.values()].reduce(
        (acc, row) => ({
          total: acc.total + row.total,
          count: acc.count + row.count,
        }),
        { total: 0, count: 0 }
      );
      weeklyRangeSummary = {
        averageRevenuePerDay:
          dailyServicePerformanceData.length > 0
            ? dailyServicePerformanceData.reduce((sum, row) => sum + row.revenue, 0) / dailyServicePerformanceData.length
            : 0,
        averageOrdersPerDay:
          dailyServicePerformanceData.length > 0
            ? dailyServicePerformanceData.reduce((sum, row) => sum + row.orders, 0) / dailyServicePerformanceData.length
            : 0,
        averageTableDurationMinutes:
          weeklyDurationStats.count > 0 ? weeklyDurationStats.total / weeklyDurationStats.count : 0,
      };
      const averageTrend = computeAverageHourlySales();
      salesTrendData = averageTrend.sales;
      orderTrendData = averageTrend.orders;
      topProductsTimelineData = [...dayMap.keys()].map((key) => ({
        label: capitalizeLabel(dayLabelFormatter.format(toLocalDateFromKey(key))),
        value: dayTopProductsMap.get(key) || 0,
      }));
      tablePerformanceTimelineData = [...dayMap.keys()].map((key) => {
        const tableTotals = dayTableMap.get(key) || new Map<string, number>();
        let bestTable = "-";
        let bestRevenue = 0;
        tableTotals.forEach((value, tableLabel) => {
          if (value > bestRevenue) {
            bestRevenue = value;
            bestTable = tableLabel;
          }
        });
        return {
          label: capitalizeLabel(dayLabelFormatter.format(toLocalDateFromKey(key))),
          value: bestRevenue,
          table: bestTable,
        };
      });
      salesTrendTitle = averageSalesByHourTitle;
    } else {
      const weeksCount = Math.ceil(rangeDays / 7);
      const weekMap = new Map<number, number>();
      const weekOrdersMap = new Map<number, number>();
      const weekDurationMap = new Map<number, { total: number; count: number }>();
      const weekTopProductsMap = new Map<number, number>();
      const weekTableMap = new Map<number, Map<string, number>>();
      for (let week = 1; week <= weeksCount; week += 1) {
        weekMap.set(week, 0);
        weekOrdersMap.set(week, 0);
        weekDurationMap.set(week, { total: 0, count: 0 });
        weekTopProductsMap.set(week, 0);
        weekTableMap.set(week, new Map<string, number>());
      }
      paidOrders.forEach((order) => {
        const weekNumber = resolveWeekNumber(readOrderDateLocal(order));
        if (!weekNumber || !weekMap.has(weekNumber)) return;
        weekMap.set(weekNumber, (weekMap.get(weekNumber) || 0) + readOrderTotal(order));
        weekOrdersMap.set(weekNumber, (weekOrdersMap.get(weekNumber) || 0) + 1);

        const tableLabel = String(order.table_number ?? "").trim() || "Sans table";
        const tableTotals = weekTableMap.get(weekNumber);
        if (tableTotals) {
          tableTotals.set(tableLabel, (tableTotals.get(tableLabel) || 0) + readOrderTotal(order));
        }

        const items = readItems(order);
        let topItemsSold = 0;
        items.forEach((item) => {
          const itemDish = (item.dish as Record<string, unknown> | undefined) || {};
          const name =
            String(item.name || itemDish.name || itemDish.nom || itemDish.name_fr || "").trim() || "Produit";
          if (!topProductNames.has(name)) return;
          const quantity = Number(item.quantity ?? item.qty ?? 1) || 1;
          topItemsSold += quantity;
        });
        weekTopProductsMap.set(weekNumber, (weekTopProductsMap.get(weekNumber) || 0) + topItemsSold);
      });
      closedOrderDurationEntries.forEach((entry) => {
        const weekNumber = resolveWeekNumber(entry.startDate);
        if (!weekNumber || !weekDurationMap.has(weekNumber)) return;
        const current = weekDurationMap.get(weekNumber) || { total: 0, count: 0 };
        weekDurationMap.set(weekNumber, {
          total: current.total + entry.durationMinutes,
          count: current.count + 1,
        });
      });
      const weekPrefix = managerUiLang === "es" ? "Semana" : managerUiLang === "de" ? "Woche" : "Semaine";
      weeklyServicePerformanceData = [...weekMap.keys()].map((weekNumber) => {
        const durationStats = weekDurationMap.get(weekNumber) || { total: 0, count: 0 };
        const averageWeekDuration = durationStats.count > 0 ? durationStats.total / durationStats.count : 0;
        const weekStartDate = new Date(rangeStart);
        weekStartDate.setDate(rangeStart.getDate() + (weekNumber - 1) * 7);
        const weekEndDate = new Date(rangeStart);
        weekEndDate.setDate(rangeStart.getDate() + Math.min(weekNumber * 7 - 1, rangeDays - 1));
        return {
          label: `${weekPrefix} ${weekNumber}`,
          periodLabel: `${shortDateFormatter.format(weekStartDate)} - ${shortDateFormatter.format(weekEndDate)}`,
          revenue: weekMap.get(weekNumber) || 0,
          orders: weekOrdersMap.get(weekNumber) || 0,
          averageTableDurationMinutes: averageWeekDuration,
        };
      });
      const averageTrend = computeAverageHourlySales();
      salesTrendData = averageTrend.sales;
      orderTrendData = averageTrend.orders;
      topProductsTimelineData = [...weekMap.keys()].map((weekNumber) => ({
        label: `${weekPrefix} ${weekNumber}`,
        value: weekTopProductsMap.get(weekNumber) || 0,
      }));
      tablePerformanceTimelineData = [...weekMap.keys()].map((weekNumber) => {
        const tableTotals = weekTableMap.get(weekNumber) || new Map<string, number>();
        let bestTable = "-";
        let bestRevenue = 0;
        tableTotals.forEach((value, tableLabel) => {
          if (value > bestRevenue) {
            bestRevenue = value;
            bestTable = tableLabel;
          }
        });
        return {
          label: `${weekPrefix} ${weekNumber}`,
          value: bestRevenue,
          table: bestTable,
        };
      });
      salesTrendTitle = averageSalesByHourTitle;
    }

    const hourlyRevenueMap = new Map<string, number>();
    const hourlyOrdersMap = new Map<string, number>();
    paidOrders.forEach((order) => {
      const slot = getHourlyServiceSlot(readOrderDateLocal(order));
      if (!slot) return;
      hourlyRevenueMap.set(slot, (hourlyRevenueMap.get(slot) || 0) + readOrderTotal(order));
      hourlyOrdersMap.set(slot, (hourlyOrdersMap.get(slot) || 0) + 1);
    });

    const bestRevenueSlot =
      salesTrendData.length > 0
        ? salesTrendData.reduce((best, current) => (current.value > best.value ? current : best), salesTrendData[0])
        : null;

    const peakOrdersEntries = [...hourlyOrdersMap.entries()].map(([label, value]) => ({ label, value }));
    const peakOrdersSlot =
      peakOrdersEntries.length > 0
        ? peakOrdersEntries.reduce((best, current) => (current.value > best.value ? current : best), peakOrdersEntries[0])
        : null;

    const avgRevenueSource =
      analyticsRange === "today"
        ? [...hourlyRevenueMap.values()]
        : salesTrendData.map((entry) => Number(entry.value || 0));
    const averageRevenuePerHour =
      avgRevenueSource.length > 0
        ? avgRevenueSource.reduce((sum, value) => sum + value, 0) / avgRevenueSource.length
        : 0;

    const recentOrderHistory = [...inRangeOrders]
      .sort((a, b) => readOrderDateLocal(b).getTime() - readOrderDateLocal(a).getTime())
      .slice(0, 20)
      .map((order) => ({
        id: String(order.id ?? ""),
        tableLabel: String(order.table_number ?? "").trim() || "Sans table",
        covers: readOrderCovers(order),
        total: readOrderTotal(order) + readOrderTip(order),
        orderTotal: readOrderTotal(order),
        tipAmount: readOrderTip(order),
        status: String(order.status || "").trim() || "-",
        createdAtLabel: Number.isFinite(readOrderDateLocal(order).getTime())
          ? readOrderDateLocal(order).toLocaleString("fr-FR")
          : "-",
      }));

    return {
      realRevenue,
      totalTips,
      averageBasket,
      totalCoversServed,
      totalServedTableSessionsWithCovers,
      averageTicketPerCover,
      averageCoversPerTable,
      top5,
      topRevenue5,
      allProductSales,
      productMixData: [
        { name: analyticsText.starters, value: productMix.starters },
        { name: analyticsText.mains, value: productMix.mains },
        { name: analyticsText.desserts, value: productMix.desserts },
        { name: analyticsText.drinks, value: productMix.drinks },
      ],
      tableStateData: [
        { name: analyticsText.freeTables, value: tableStateCounts.free },
        { name: analyticsText.occupiedTables, value: tableStateCounts.occupied },
      ],
      totalTables: tableStateCounts.free + tableStateCounts.occupied,
      tablePerformance: [...tableRevenueMap.entries()]
        .map(([table, revenue]) => ({ table, revenue }))
        .sort((a, b) => b.revenue - a.revenue),
      upsellRate: paidOrders.length > 0 ? (dessertOrdersCount / paidOrders.length) * 100 : 0,
      recommendationConversion: totalSoldItems > 0 ? (recommendedSoldItems / totalSoldItems) * 100 : 0,
      recommendationSoldItems: recommendedSoldItems,
      featuredSpecialSoldItems,
      averageTableDurationMinutes,
      averageOccupationRate,
      occupationByTimeSlots,
      salesTrendData,
      orderTrendData,
      salesTrendTitle,
      bestRevenueSlot,
      peakOrdersSlot,
      averageRevenuePerHour,
      topProductsTimelineData,
      tablePerformanceTimelineData,
      dailyServicePerformanceData,
      weeklyServicePerformanceData,
      weeklyRangeSummary,
      paidOrdersCount: paidOrders.length,
      recentOrderHistory,
    };
  }, [
    orders,
    dishes,
    analyticsRange,
    categoryById,
    analyticsText,
    managerUiLang,
    configuredTableNumbers,
  ]);

  const [analyticsPersistentData, setAnalyticsPersistentData] = useState(() => analyticsData);

  useEffect(() => {
    setAnalyticsPersistentData(analyticsData);
  }, [analyticsData]);

  const displayedAnalytics = analyticsPersistentData;
  const monthlyCloseEnabled = analyticsRange === "30d" && reportExportedRange === "30d" && !isPurgingHistory;

  useEffect(() => {
    setReportExportedRange(null);
  }, [analyticsRange]);

  const getRangeBounds = (range: "today" | "7d" | "30d") => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
    const start = new Date(startOfToday);
    start.setDate(start.getDate() - (days - 1));
    return { start, end: now };
  };

  const getRangeLabel = (range: "today" | "7d" | "30d") => {
    if (range === "today") return analyticsText.today;
    if (range === "7d") return analyticsText.last7Days;
    return analyticsText.last30Days;
  };

  const formatReportDate = (value: Date) =>
    new Intl.DateTimeFormat(managerUiLang === "es" ? "es-ES" : managerUiLang === "de" ? "de-DE" : "fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(value);

  const escapeHtml = (value: string) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const handleExportMonthlyReportPdf = () => {
    const printWindow = window.open("", "_blank", "width=900,height=1000");
    if (!printWindow) {
      alert("Impossible d'ouvrir la fenêtre d'export PDF.");
      return;
    }
    const { start, end } = getRangeBounds(analyticsRange);
    const paidOrdersCount = Number(displayedAnalytics.paidOrdersCount || 0);
    const categoryTotal = (displayedAnalytics.productMixData || []).reduce(
      (sum: number, entry: { value: number }) => sum + Number(entry.value || 0),
      0
    );
    const categoryRows = (displayedAnalytics.productMixData || [])
      .map((entry: { name: string; value: number }) => {
        const value = Number(entry.value || 0);
        const share = categoryTotal > 0 ? (value / categoryTotal) * 100 : 0;
        return `<tr><td>${escapeHtml(entry.name)}</td><td>${value}</td><td>${share.toFixed(1)}%</td></tr>`;
      })
      .join("");
    const topRows = (displayedAnalytics.top5 || [])
      .map((item: { name: string; count: number }, index: number) => `<tr><td>${index + 1}</td><td>${escapeHtml(item.name)}</td><td>${item.count}</td></tr>`)
      .join("");
    const topRevenueRows = (displayedAnalytics.topRevenue5 || [])
      .map(
        (entry: { name: string; revenue: number; count: number }, index: number) =>
          `<tr><td>${index + 1}</td><td>${escapeHtml(entry.name)}</td><td>${formatEuro(entry.revenue)}</td><td>${Number(entry.count || 0)}</td></tr>`
      )
      .join("");
    const tableRows = (displayedAnalytics.tablePerformance || [])
      .map(
        (entry: { table: string; revenue: number }) =>
          `<tr><td>${escapeHtml(String(entry.table))}</td><td>${formatEuro(entry.revenue)}</td></tr>`
      )
      .join("");
    const occupationRows = (displayedAnalytics.occupationByTimeSlots || [])
      .map((slot: { label: string; occupancyRate: number; averageOccupiedTables: number; peakOccupiedTables: number }) => {
        const averageTables = Number(slot.averageOccupiedTables || 0).toFixed(2);
        const peakTables = Number(slot.peakOccupiedTables || 0).toFixed(0);
        return `<tr><td>${escapeHtml(slot.label)}</td><td>${Number(slot.occupancyRate || 0).toFixed(1)}%</td><td>${averageTables}</td><td>${peakTables}</td></tr>`;
      })
      .join("");
    const salesTrendSource = Array.isArray(displayedAnalytics.salesTrendData) ? displayedAnalytics.salesTrendData : [];
    const salesTrendMax = Math.max(
      1,
      ...salesTrendSource.map((entry: { value: number }) => Number(entry.value || 0))
    );
    const salesTrendBars = salesTrendSource
      .map((entry: { label: string; value: number }) => {
        const value = Number(entry.value || 0);
        const width = Math.max(2, Math.round((value / salesTrendMax) * 100));
        return `
          <div class="bar-row">
            <div class="bar-label">${escapeHtml(entry.label)}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
            <div class="bar-value">${formatEuro(value)}</div>
          </div>
        `;
      })
      .join("");
    const tablePerformanceSource = (displayedAnalytics.tablePerformance || []).slice(0, 8);
    const tablePerformanceMax = Math.max(
      1,
      ...tablePerformanceSource.map((entry: { revenue: number }) => Number(entry.revenue || 0))
    );
    const tablePerformanceBars = tablePerformanceSource
      .map((entry: { table: string; revenue: number }) => {
        const value = Number(entry.revenue || 0);
        const width = Math.max(2, Math.round((value / tablePerformanceMax) * 100));
        return `
          <div class="bar-row">
            <div class="bar-label">Table ${escapeHtml(String(entry.table))}</div>
            <div class="bar-track"><div class="bar-fill bar-fill-green" style="width:${width}%"></div></div>
            <div class="bar-value">${formatEuro(value)}</div>
          </div>
        `;
      })
      .join("");
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Rapport financier manager</title>
          <style>
            @page { margin: 10mm; }
            * { box-sizing: border-box; }
            body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; color: #111827; background: #ffffff; }
            h1, h2, h3 { margin: 0; }
            .wrapper { padding: 20px; }
            .header { margin-bottom: 16px; border-bottom: 2px solid #111827; padding-bottom: 10px; }
            .title { font-size: 26px; font-weight: 800; }
            .meta { margin-top: 6px; color: #4b5563; font-size: 12px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 14px 0 16px; }
            .kpi { border: 1px solid #d1d5db; border-radius: 10px; padding: 10px; background: #f9fafb; }
            .kpi-label { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; font-weight: 700; }
            .kpi-value { font-size: 21px; font-weight: 800; margin-top: 4px; color: #111827; }
            .section { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
            .section h2 { font-size: 15px; font-weight: 800; margin-bottom: 8px; }
            .two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 7px; text-align: left; }
            th { background: #f3f4f6; font-weight: 800; }
            .bar-panel { border: 1px dashed #d1d5db; border-radius: 10px; padding: 10px; background: #fff; }
            .bar-title { font-size: 12px; font-weight: 800; margin-bottom: 6px; }
            .bar-row { display: grid; grid-template-columns: 110px 1fr 90px; align-items: center; gap: 8px; margin: 6px 0; }
            .bar-label { font-size: 11px; color: #374151; }
            .bar-track { width: 100%; height: 9px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
            .bar-fill { height: 100%; background: linear-gradient(90deg, #2563eb, #60a5fa); }
            .bar-fill-green { background: linear-gradient(90deg, #059669, #34d399); }
            .bar-value { text-align: right; font-size: 11px; font-weight: 700; color: #111827; }
            .empty { color: #6b7280; font-style: italic; font-size: 12px; padding: 8px 0; }
            @media print {
              .wrapper { padding: 8mm; }
              .section { break-inside: avoid; page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="header">
              <h1 class="title">Rapport financier manager</h1>
              <div class="meta">Période: ${escapeHtml(getRangeLabel(analyticsRange))} (${formatReportDate(start)} - ${formatReportDate(end)})</div>
            </div>
            <div class="kpi-grid">
              <div class="kpi">
                <div class="kpi-label">CA total</div>
                <div class="kpi-value">${formatEuro(displayedAnalytics.realRevenue)}</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">Panier moyen</div>
                <div class="kpi-value">${formatEuro(displayedAnalytics.averageBasket)}</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">Commandes payées</div>
                <div class="kpi-value">${paidOrdersCount}</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">${escapeHtml(avgOccupationRateLabel)}</div>
                <div class="kpi-value">${Number(displayedAnalytics.averageOccupationRate || 0).toFixed(1)}%</div>
              </div>
            </div>
            <div class="section">
              <h2>Occupation par tranche horaire</h2>
              <table>
                <thead><tr><th>Tranche</th><th>Taux</th><th>Tables moyennes occupées</th><th>Pic de tables occupées</th></tr></thead>
                <tbody>${occupationRows || `<tr><td colspan="4">${escapeHtml(analyticsText.noData)}</td></tr>`}</tbody>
              </table>
            </div>
            <div class="two-cols">
              <div class="section">
                <h2>Détail par catégorie</h2>
                <table>
                  <thead><tr><th>Catégorie</th><th>Volume</th><th>Part</th></tr></thead>
                  <tbody>${categoryRows || `<tr><td colspan="3">${escapeHtml(analyticsText.noData)}</td></tr>`}</tbody>
                </table>
              </div>
              <div class="section">
                <h2>Top 5 ventes</h2>
                <table>
                  <thead><tr><th>#</th><th>Produit</th><th>Ventes</th></tr></thead>
                  <tbody>${topRows || `<tr><td colspan="3">${escapeHtml(analyticsText.noData)}</td></tr>`}</tbody>
                </table>
              </div>
            </div>
            <div class="section">
              <h2>Top CA produits</h2>
              <table>
                <thead><tr><th>#</th><th>Produit</th><th>CA</th><th>Volume</th></tr></thead>
                <tbody>${topRevenueRows || `<tr><td colspan="4">${escapeHtml(analyticsText.noData)}</td></tr>`}</tbody>
              </table>
            </div>
            <div class="two-cols">
              <div class="section">
                <h2>Performance horaire</h2>
                <div class="bar-panel">
                  <div class="bar-title">${escapeHtml(displayedAnalytics.salesTrendTitle || analyticsText.salesByHour)}</div>
                  ${salesTrendBars || `<div class="empty">${escapeHtml(analyticsText.noData)}</div>`}
                </div>
              </div>
              <div class="section">
                <h2>Performance par table (Top 8)</h2>
                <div class="bar-panel">
                  <div class="bar-title">${escapeHtml(analyticsText.tablePerformance)}</div>
                  ${tablePerformanceBars || `<div class="empty">${escapeHtml(analyticsText.noData)}</div>`}
                </div>
              </div>
            </div>
            <div class="section">
              <h2>CA par table</h2>
              <table>
                <thead><tr><th>Table</th><th>CA</th></tr></thead>
                <tbody>${tableRows || `<tr><td colspan="2">${escapeHtml(analyticsText.noData)}</td></tr>`}</tbody>
              </table>
            </div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setReportExportedRange(analyticsRange);
  };

  const handleCloseMonthAndPurge = async () => {
    if (analyticsRange !== "30d") {
      alert("Passez le filtre sur 30 jours pour clôturer le mois.");
      return;
    }
    if (reportExportedRange !== "30d") {
      alert("Téléchargez d'abord le rapport mensuel (PDF).");
      return;
    }
    const confirmed = window.confirm(
      "Clôturer le mois va supprimer les commandes PAYÉES sur la période de 30 jours. Confirmer ?"
    );
    if (!confirmed) return;

    setIsPurgingHistory(true);
    try {
      const { start, end } = getRangeBounds("30d");
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("status", "paid")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (error) {
        console.error("Erreur purge commandes payées:", error);
        alert("La purge a échoué. Vérifiez les droits Supabase.");
        return;
      }

      setReportExportedRange(null);
      await fetchOrders();
      alert("Mois clôturé. Les commandes payées de la période ont été purgées.");
    } finally {
      setIsPurgingHistory(false);
    }
  };
  const vitrineViewsCount = Number(
    (restaurantForm as Record<string, unknown>).views_vitrine ??
      (restaurant as Record<string, unknown> | null)?.views_vitrine ??
      0
  );
  const currentRestaurantQrId = String(restaurant?.id || scopedRestaurantId || "").trim();
  const currentRestaurantPublicUrl = currentRestaurantQrId ? buildRestaurantPublicUrl(currentRestaurantQrId) : "";
  const currentRestaurantVitrineUrl = currentRestaurantQrId ? buildRestaurantVitrineUrl(currentRestaurantQrId) : "";
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);
  const handleGeneratePrintableMenu = () => {
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      alert("Impossible d'ouvrir la previsualisation. Autorisez les pop-ups puis reessayez.");
      return;
    }

    const escapeHtml = (value: unknown) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const grouped = new Map<string, Dish[]>();
    const sideNameById = new Map<string, string>(
      (sidesLibrary || []).map((side) => [String(side.id || ""), String(side.name_fr || "").trim()])
    );

    const normalizePrintableUrl = (value: unknown, fallbackBucket?: string) =>
      resolveSupabasePublicUrl(value, fallbackBucket);
    const getPrintableExtraLabel = (extra: ExtrasItem) =>
      String(
        extra.names_i18n?.[managerUiLang] ||
          extra.names_i18n?.fr ||
          extra.name_fr ||
          ""
      ).trim();
    const getPrintableOptionLabel = (option: ProductOptionItem) =>
      String(
        option.names_i18n?.[managerUiLang] ||
          option.names_i18n?.fr ||
          option.name_fr ||
          option.name ||
          ""
      ).trim();

    const buildDishPrintableMeta = (dish: Dish) => {
      const parsedDescription = parseOptionsFromDescription(String(dish.description || ""));
      const sideIds = Array.isArray(dish.selected_sides) ? dish.selected_sides : parsedDescription.sideIds;
      const sideLabels = sideIds
        .map((sideId) => sideNameById.get(String(sideId || "").trim()) || "")
        .map((label) => String(label || "").trim())
        .filter(Boolean);
      const allergenLabels = String(dish.allergens || "")
        .split(",")
        .map((value) => String(value || "").trim())
        .filter(Boolean);

      const extrasMergedMap = new Map<string, ExtrasItem>();
      const addExtra = (extra: ExtrasItem) => {
        const key = `${normalizeText(extra.name_fr)}::${Number(extra.price || 0).toFixed(2)}`;
        if (!extrasMergedMap.has(key)) extrasMergedMap.set(key, extra);
      };
      const rawDish = dish as unknown as Record<string, unknown>;
      [dish.extras_list, rawDish.dish_options, rawDish.extras, rawDish.extras_json].forEach((rawValue) => {
        parseExtrasFromUnknown(rawValue).forEach(addExtra);
      });
      parsedDescription.extrasList.forEach(addExtra);
      const optionLabels = (Array.isArray(dish.product_options) ? dish.product_options : [])
        .map((option) => {
          const label = getPrintableOptionLabel(option);
          if (!label) return "";
          const parsedPrice = Number(option.price_override || 0);
          return Number.isFinite(parsedPrice) && parsedPrice > 0 ? `${label} (${formatEuro(parsedPrice)})` : label;
        })
        .filter(Boolean);
      return {
        sideLabels,
        allergenLabels,
        supplements: Array.from(extrasMergedMap.values()),
        optionLabels,
        hasCookingChoice: Boolean(dish.ask_cooking ?? parsedDescription.askCooking),
      };
    };
    preparedDishes.forEach((dish) => {
      const categoryLabel =
        categories.find((category) => String(category.id) === String(dish.category_id))?.name_fr ||
        String(dish.categorie || "Autres");
      const current = grouped.get(categoryLabel) || [];
      current.push(dish);
      grouped.set(categoryLabel, current);
    });

    const sectionsHtml = Array.from(grouped.entries())
      .map(([categoryName, dishesInCategory]) => {
        const items = dishesInCategory
          .map((dish) => {
            const description = getDishDisplayDescription(dish);
            const dishImageUrl = normalizePrintableUrl((dish as unknown as Record<string, unknown>).image_url, DISH_IMAGES_BUCKET);
            const printableMeta = buildDishPrintableMeta(dish);
            const supplementsHtml =
              printableMeta.supplements.length > 0
                ? `<div class="dish-supplements">${printableMeta.supplements
                    .map((extra) => {
                      const price = Number(extra.price || 0);
                      const label = getPrintableExtraLabel(extra) || extra.name_fr;
                      const priceText = Number.isFinite(price) && price > 0 ? ` (${formatEuro(price)})` : "";
                      return `<div class="dish-supplement">+ ${escapeHtml(label)}${escapeHtml(priceText)}</div>`;
                    })
                    .join("")}</div>`
                : "";
            const allergensHtml =
              printableMeta.allergenLabels.length > 0
                ? `<div class="dish-allergens">Allergènes : ${escapeHtml(printableMeta.allergenLabels.join(", "))}</div>`
                : "";
            const optionsHtml =
              printableMeta.optionLabels.length > 0 || printableMeta.hasCookingChoice
                ? `<div class="dish-options">${
                    printableMeta.optionLabels.length > 0
                      ? `<div>Options : ${escapeHtml(printableMeta.optionLabels.join(", "))}</div>`
                      : ""
                  }${
                    printableMeta.hasCookingChoice
                      ? `<div>Cuisson : ${escapeHtml(managerUiLang === "de" ? "wahlbar" : managerUiLang === "es" ? "a elegir" : "au choix")}</div>`
                      : ""
                  }</div>`
                : "";
            const sidesHtml =
              printableMeta.sideLabels.length > 0
                ? `<div class="dish-accompaniments">Accompagnements : ${escapeHtml(printableMeta.sideLabels.join(", "))}</div>`
                : "";
            return `
              <article class="dish-row">
                ${
                  dishImageUrl
                    ? `<img src="${escapeHtml(dishImageUrl)}" alt="${escapeHtml(dish.name || "Plat")}" class="dish-photo" crossorigin="anonymous" />`
                    : `<div class="dish-photo dish-photo-placeholder" aria-hidden="true"></div>`
                }
                <div class="dish-main">
                  <div class="dish-name">${escapeHtml(dish.name || "Plat")}</div>
                  ${description ? `<div class="dish-description">${escapeHtml(description)}</div>` : ""}
                  ${optionsHtml}
                  ${supplementsHtml}
                  ${allergensHtml}
                  ${sidesHtml}
                </div>
                <div class="dish-price">${escapeHtml(formatEuro(Number(dish.price || 0)))}</div>
              </article>
            `;
          })
          .join("");
        return `
          <section class="category-block">
            <h2>${escapeHtml(categoryName)}</h2>
            ${items}
          </section>
        `;
      })
      .join("");

    const logoUrl = normalizePrintableUrl(restaurantForm.logo_url || restaurant?.logo_url, RESTAURANT_LOGOS_BUCKET);
    const restaurantName = String(restaurantForm.name || restaurant?.name || "").trim();
    const backgroundUrl = normalizePrintableUrl(
      (restaurantForm as Record<string, unknown>).background_url ||
        (restaurantForm as Record<string, unknown>).background_image_url ||
        (restaurant as Record<string, unknown> | null)?.background_url ||
        (restaurant as Record<string, unknown> | null)?.background_image_url,
      RESTAURANT_BANNERS_BUCKET
    );
    const primaryColor = normalizeHexColor(restaurantForm.primary_color || restaurant?.primary_color, "#FFFFFF");
    const backgroundOpacity = normalizeBackgroundOpacity(
      (restaurantForm as Record<string, unknown>).bg_opacity ??
        (restaurant as Record<string, unknown> | null)?.bg_opacity ??
        parseObjectRecord((restaurant as Record<string, unknown> | null)?.table_config).bg_opacity,
      1
    );
    const backgroundOverlayOpacity = Math.max(0, Math.min(1, 1 - backgroundOpacity)).toFixed(2);
    const useLightPrintText = isHexColorDark(primaryColor) || backgroundOpacity >= 0.72;
    const printTextColor = useLightPrintText ? "#FFFFFF" : "#111111";
    const printMutedTextColor = useLightPrintText ? "rgba(255,255,255,0.86)" : "#444444";
    const printSubtleTextColor = useLightPrintText ? "rgba(255,255,255,0.78)" : "#2f2f2f";
    const printDividerColor = useLightPrintText ? "rgba(255,255,255,0.36)" : "#d0d0d0";
    const printDottedDividerColor = useLightPrintText ? "rgba(255,255,255,0.30)" : "#d8d8d8";
    const printSheetBackground = useLightPrintText ? "rgba(0,0,0,0.42)" : "rgba(255,255,255,0.78)";
    const pageBackgroundCss = backgroundUrl
      ? `background-image:
           linear-gradient(rgba(255,255,255,${backgroundOverlayOpacity}), rgba(255,255,255,${backgroundOverlayOpacity})),
           url('${backgroundUrl}'),
           url('${backgroundUrl}');
         background-size: cover, cover, auto;
         background-repeat: no-repeat, no-repeat, repeat;
         background-position: center center, center center, top left;`
      : `background: ${primaryColor};`;
    const printFontName = normalizeManagerFontFamily(restaurantForm.font_family);
    const printFontFamily = `'${printFontName}', sans-serif`;
    const printFontHref = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(printFontName).replace(/%20/g, "+")}:wght@400;700;800&display=swap`;

    const html = `
      <!doctype html>
      <html lang="fr">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${restaurantName ? `Carte - ${escapeHtml(restaurantName)}` : "Carte"}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="${escapeHtml(printFontHref)}" rel="stylesheet">
          <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            html, body {
              margin: 0;
              padding: 0;
              color: ${printTextColor};
              font-family: ${printFontFamily};
              color-scheme: ${useLightPrintText ? "dark" : "light"};
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            body {
              background: transparent;
            }
            .preview-actions {
              position: sticky;
              top: 0;
              z-index: 3;
              display: flex;
              justify-content: center;
              gap: 10px;
              padding: 14px 16px;
              background: rgba(17, 24, 39, 0.92);
              backdrop-filter: blur(6px);
            }
            .preview-actions button {
              border: 0;
              border-radius: 999px;
              padding: 10px 18px;
              font: inherit;
              font-weight: 700;
              cursor: pointer;
            }
            .preview-actions .primary {
              background: #ffffff;
              color: #111827;
            }
            .preview-actions .secondary {
              background: transparent;
              color: #ffffff;
              border: 1px solid rgba(255,255,255,0.35);
            }
            .print-page-bg {
              position: fixed;
              inset: 0;
              z-index: 0;
              ${pageBackgroundCss}
            }
            .sheet {
              width: 100%;
              max-width: 210mm;
              margin: 0 auto;
              padding: 12mm;
              background: ${printSheetBackground};
              position: relative;
              z-index: 1;
            }
            .header { text-align: center; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 2px solid ${printDividerColor}; }
            .logo { width: 96px; height: 96px; object-fit: contain; display: inline-block; margin-bottom: 8px; }
            .title { font-size: 32px; font-weight: 700; margin: 0; letter-spacing: 0.5px; }
            .category-block { margin: 18px 0 24px; break-inside: avoid; }
            .category-block h2 { font-size: 22px; margin: 0 0 10px; border-bottom: 1px solid ${printDividerColor}; padding-bottom: 4px; }
            .dish-row {
              display: grid;
              grid-template-columns: 88px 1fr auto;
              gap: 12px;
              align-items: start;
              border-bottom: 1px dotted ${printDottedDividerColor};
              padding: 10px 0;
              break-inside: avoid;
            }
            .dish-photo {
              width: 88px;
              height: 88px;
              object-fit: cover;
              border: 1px solid ${printDividerColor};
              background: ${useLightPrintText ? "rgba(255,255,255,0.12)" : "#f3f3f3"};
            }
            .dish-photo-placeholder {
              background: repeating-linear-gradient(
                45deg,
                ${useLightPrintText ? "rgba(255,255,255,0.16)" : "#efefef"} 0,
                ${useLightPrintText ? "rgba(255,255,255,0.16)" : "#efefef"} 8px,
                ${useLightPrintText ? "rgba(255,255,255,0.06)" : "#f8f8f8"} 8px,
                ${useLightPrintText ? "rgba(255,255,255,0.06)" : "#f8f8f8"} 16px
              );
            }
            .dish-main { min-width: 0; }
            .dish-name { font-size: 17px; font-weight: 700; margin-bottom: 2px; }
            .dish-description { font-size: 13px; color: ${printMutedTextColor}; line-height: 1.45; white-space: pre-wrap; }
            .dish-supplements,
            .dish-options,
            .dish-allergens,
            .dish-accompaniments {
              margin-top: 6px;
              font-size: 12px;
              line-height: 1.45;
              color: ${printSubtleTextColor};
            }
            .dish-supplement { margin-top: 2px; }
            .dish-price { white-space: nowrap; font-size: 18px; font-weight: 800; }
            @media print {
              @page { margin: 0; }
              html, body { width: auto; min-height: auto; }
              body { margin: 1.6cm !important; }
              .preview-actions { display: none !important; }
              .print-page-bg {
                position: fixed;
                inset: 0;
              }
              .sheet {
                max-width: none;
                min-height: auto;
                margin: 0;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="preview-actions">
            <button class="primary" type="button" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
            <button class="secondary" type="button" onclick="window.close()">Fermer</button>
          </div>
          <div class="print-page-bg" aria-hidden="true"></div>
          <main class="sheet">
            <header class="header">
              ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo restaurant" class="logo" crossorigin="anonymous" />` : ""}
              ${restaurantName ? `<h1 class="title">${escapeHtml(restaurantName)}</h1>` : ""}
            </header>
            ${sectionsHtml || "<p>Aucun plat disponible.</p>"}
          </main>
        </body>
      </html>
    `;
    previewWindow.document.open();
    previewWindow.document.write(html);
    previewWindow.document.close();
  };

  const handleExportMonthlyReportPdfArchive = async () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    let cursorY = 46;
    const { start, end } = getRangeBounds(analyticsRange);
    const occupationRows =
      (displayedAnalytics.occupationByTimeSlots || []).length > 0
        ? (displayedAnalytics.occupationByTimeSlots || []).map((slot: {
            label: string;
            occupancyRate: number;
            averageOccupiedTables: number;
            peakOccupiedTables: number;
          }) => [
            slot.label,
            `${Number(slot.occupancyRate || 0).toFixed(1)}%`,
            Number(slot.averageOccupiedTables || 0).toFixed(2),
            Number(slot.peakOccupiedTables || 0).toFixed(0),
          ])
        : [["Aucune donnee", "", "", ""]];
    const topRevenueRows =
      (displayedAnalytics.topRevenue5 || []).length > 0
        ? (displayedAnalytics.topRevenue5 || []).map((entry: { name: string; count: number; revenue: number }) => [
            entry.name,
            String(entry.count || 0),
            formatEuro(entry.revenue || 0),
          ])
        : [["Aucune donnee", "", ""]];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Rapport financier manager", margin, cursorY);
    cursorY += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Periode: ${getRangeLabel(analyticsRange)} (${formatReportDate(start)} - ${formatReportDate(end)})`, margin, cursorY);
    cursorY += 24;

    autoTable(doc, {
      startY: cursorY,
      head: [["Indicateur", "Valeur"]],
      body: [
        ["CA total", formatEuro(displayedAnalytics.realRevenue)],
        [analyticsText.tipsTotal, formatEuro(displayedAnalytics.totalTips || 0)],
        ["Panier moyen", formatEuro(displayedAnalytics.averageBasket)],
        ["Commandes payees", String(displayedAnalytics.paidOrdersCount || 0)],
        [avgOccupationRateLabel, `${Number(displayedAnalytics.averageOccupationRate || 0).toFixed(1)}%`],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [17, 24, 39] },
      margin: { left: margin, right: margin },
    });
    cursorY = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || cursorY) + 18;

    autoTable(doc, {
      startY: cursorY,
      head: [["Tranche", "Taux", "Tables moyennes", "Pic"]],
      body: occupationRows,
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: margin, right: margin },
    });
    cursorY = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || cursorY) + 18;

    autoTable(doc, {
      startY: cursorY,
      head: [["Produit", "Ventes", "CA"]],
      body: topRevenueRows,
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [5, 150, 105] },
      margin: { left: margin, right: margin },
    });

    const fileName = `analyses_financieres_${buildArchiveMonthToken(end)}.pdf`;
    const blob = doc.output("blob");
    await savePdfReportToArchive("financial", fileName, blob);
    downloadPdfBlob(blob, fileName);
    setReportExportedRange(analyticsRange);
  };

  const handlePrintWeeklyReviewsReportPdf = async () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    let cursorY = 46;
    const commentRows = reviews
      .filter((review) => String(review.comment || "").trim().length > 0)
      .slice(0, 30)
      .map((review) => {
        const rating = Number(review.rating || 0);
        const dishName =
          String(review.dish?.name_fr || review.dish?.name || "").trim() ||
          (review.dish_id ? dishNameById.get(String(review.dish_id)) : "") ||
          "Restaurant";
        return [
          review.created_at ? new Date(review.created_at).toLocaleString("fr-FR") : "-",
          String(review.dish_id || "").trim() ? `Plat: ${dishName}` : "Avis restaurant",
          rating > 0 ? `${rating}/5` : "-",
          String(review.comment || "").trim(),
        ];
      });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Rapport hebdomadaire des avis", margin, cursorY);
    cursorY += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Genere le ${new Date().toLocaleString("fr-FR")}`, margin, cursorY);
    cursorY += 22;

    autoTable(doc, {
      startY: cursorY,
      head: [["Indicateur", "Valeur"]],
      body: [
        ["Note moyenne", reviewAverage > 0 ? `${reviewAverage}/5` : "-"],
        ["Top plat", topReviewedDish ? topReviewedDish.name : "Aucun"],
        ["Nombre d'avis", String(reviews.length)],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [17, 24, 39] },
      margin: { left: margin, right: margin },
    });
    cursorY = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || cursorY) + 18;

    autoTable(doc, {
      startY: cursorY,
      head: [["Critere", "Note moyenne", "Nb. avis"]],
      body:
        reviewCriteriaAverages.length > 0
          ? reviewCriteriaAverages.map((criterion) => [
              criterion.label,
              `${criterion.average.toFixed(2)}/5`,
              String(criterion.count),
            ])
          : [["Aucun critere detaille disponible.", "", ""]],
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: margin, right: margin },
    });
    cursorY = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || cursorY) + 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Points forts", margin, cursorY);
    cursorY += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    (weeklyAiSummary.strengths.length > 0 ? weeklyAiSummary.strengths : ["Aucun signal fort detecte"]).forEach((item) => {
      const lines = doc.splitTextToSize(`- ${item}`, 500);
      doc.text(lines, margin, cursorY);
      cursorY += lines.length * 12;
    });
    cursorY += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("A surveiller", margin, cursorY);
    cursorY += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    (weeklyAiSummary.watchouts.length > 0 ? weeklyAiSummary.watchouts : ["Aucun point critique detecte"]).forEach((item) => {
      const lines = doc.splitTextToSize(`- ${item}`, 500);
      doc.text(lines, margin, cursorY);
      cursorY += lines.length * 12;
    });
    cursorY += 8;

    autoTable(doc, {
      startY: cursorY,
      head: [["Date", "Type", "Note", "Commentaire"]],
      body: commentRows.length > 0 ? commentRows : [["-", "-", "-", "Aucun commentaire disponible."]],
      styles: { fontSize: 8, cellPadding: 5, overflow: "linebreak" },
      headStyles: { fillColor: [5, 150, 105] },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 110 },
        2: { cellWidth: 50 },
      },
    });

    const fileName = `avis_clients_${buildArchiveMonthToken(new Date())}.pdf`;
    const blob = doc.output("blob");
    await savePdfReportToArchive("reviews", fileName, blob);
    downloadPdfBlob(blob, fileName);
  };

  const handleGeneratePrintableMenuPdf = async () => {
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      alert("Impossible d'ouvrir la previsualisation PDF. Autorisez les pop-ups puis reessayez.");
      return;
    }
    previewWindow.document.write(
      "<!doctype html><html><head><title>Generation du PDF...</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111} .box{max-width:480px;margin:64px auto;border:1px solid #ddd;border-radius:16px;padding:24px} h1{font-size:20px;margin:0 0 12px} p{margin:0;color:#555;line-height:1.5}</style></head><body><div class='box'><h1>Preparation de la carte papier</h1><p>Le PDF est en cours de generation. La previsualisation va s'ouvrir automatiquement dans cet onglet.</p></div></body></html>"
    );
    previewWindow.document.close();
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 46;
      const contentWidth = pageWidth - marginX * 2;
      const priceColumnWidth = 84;
      const textWidth = contentWidth - priceColumnWidth - 18;
      const bottomLimit = pageHeight - 54;
      let cursorY = 56;

      const resolvePrintableDishName = (dish: Dish) => {
        if (managerUiLang === "de") return String(dish.name_de || dish.name_fr || dish.name || "Plat").trim();
        if (managerUiLang === "es") return String(dish.name_es || dish.name_fr || dish.name || "Plat").trim();
        return String(dish.name_fr || dish.name || "Plat").trim();
      };

      const resolvePrintableOptionName = (option: ProductOptionItem) => {
        if (managerUiLang === "de") {
          return String(option.names_i18n?.de || option.name_de || option.name_fr || option.name || "Option").trim();
        }
        if (managerUiLang === "es") {
          return String(option.names_i18n?.es || option.name_es || option.name_fr || option.name || "Option").trim();
        }
        return String(option.names_i18n?.fr || option.name_fr || option.name || "Option").trim();
      };

      const resolvePrintableExtraLabel = (extra: ExtrasItem) => {
        if (managerUiLang === "de") return String(extra.names_i18n?.de || extra.name_de || extra.name_fr || "").trim();
        if (managerUiLang === "es") return String(extra.names_i18n?.es || extra.name_es || extra.name_fr || "").trim();
        return String(extra.names_i18n?.fr || extra.name_fr || "").trim();
      };

      const normalizePrintableUrl = (value: unknown, fallbackBucket?: string) =>
        resolveSupabasePublicUrl(value, fallbackBucket);

      const extractSupplementsForDish = (dish: Dish) => {
        const parsedDescription = parseOptionsFromDescription(String(dish.description || ""));
        const merged = new Map<string, ExtrasItem>();
        const addExtra = (extra: ExtrasItem) => {
          const key = `${normalizeText(extra.name_fr || "")}::${Number(extra.price || 0).toFixed(2)}`;
          if (!merged.has(key)) merged.set(key, extra);
        };
        const rawDish = dish as unknown as Record<string, unknown>;
        [dish.extras_list, rawDish.dish_options, rawDish.extras, rawDish.extras_json].forEach((rawValue) => {
          parseExtrasFromUnknown(rawValue).forEach(addExtra);
        });
        parsedDescription.extrasList.forEach(addExtra);
        return Array.from(merged.values());
      };

      const grouped = new Map<string, Dish[]>();
      preparedDishes.forEach((dish) => {
        const categoryLabel =
          categories.find((category) => String(category.id) === String(dish.category_id))?.name_fr || String(dish.categorie || "Autres");
        const current = grouped.get(categoryLabel) || [];
        current.push(dish);
        grouped.set(categoryLabel, current);
      });

      const ensureSpace = (requiredHeight: number) => {
        if (cursorY + requiredHeight <= bottomLimit) return;
        doc.addPage();
        cursorY = 58;
        doc.setDrawColor(217, 217, 217);
        doc.line(marginX, cursorY - 20, pageWidth - marginX, cursorY - 20);
      };

      const logoUrl = normalizePrintableUrl(restaurantForm.logo_url || restaurant?.logo_url, RESTAURANT_LOGOS_BUCKET);
      if (logoUrl) {
        try {
          const { dataUrl, mimeType } = await fetchImageAsDataUrl(logoUrl);
          const imageFormat = mimeType.includes("png") ? "PNG" : "JPEG";
          doc.addImage(dataUrl, imageFormat, pageWidth / 2 - 34, cursorY, 68, 68, undefined, "FAST");
          cursorY += 82;
        } catch (error) {
          console.warn("Chargement du logo PDF impossible:", error);
        }
      }

      const restaurantName = String(restaurantForm.name || restaurant?.name || "Carte").trim() || "Carte";
      doc.setFont("times", "bold");
      doc.setFontSize(26);
      doc.setTextColor(25, 25, 25);
      doc.text(restaurantName, pageWidth / 2, cursorY, { align: "center" });
      cursorY += 18;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      doc.text("Carte papier synchronisee avec la carte virtuelle", pageWidth / 2, cursorY, { align: "center" });
      cursorY += 18;

      doc.setDrawColor(205, 205, 205);
      doc.line(marginX + 18, cursorY, pageWidth - marginX - 18, cursorY);
      cursorY += 22;

      Array.from(grouped.entries()).forEach(([categoryName, dishesInCategory], categoryIndex) => {
        ensureSpace(categoryIndex === 0 ? 28 : 44);

        doc.setFont("times", "bold");
        doc.setFontSize(17);
        doc.setTextColor(32, 32, 32);
        doc.text(String(categoryName || "Autres").trim(), marginX, cursorY);
        cursorY += 8;
        doc.setDrawColor(190, 190, 190);
        doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
        cursorY += 18;

        dishesInCategory.forEach((dish) => {
          const dishName = resolvePrintableDishName(dish);
          const dishPrice = formatEuro(Number(dish.price || 0));
          const description = getDishDisplayDescription(dish);
          const descriptionLines = description ? doc.splitTextToSize(description, textWidth) : [];
          const supplements = extractSupplementsForDish(dish);
          const supplementLines = supplements.flatMap((extra) => {
            const label = resolvePrintableExtraLabel(extra) || extra.name_fr || "Supplement";
            const price = Number(extra.price || 0);
            const formatted = price > 0 ? `+ ${label} (${formatEuro(price)})` : `+ ${label}`;
            return doc.splitTextToSize(formatted, textWidth - 10);
          });
          const rawOptions = Array.isArray(dish.product_options) ? dish.product_options : [];
          const optionLines = rawOptions.flatMap((option) => {
            const label = resolvePrintableOptionName(option);
            if (!label) return [];
            const parsedPrice = Number(option.price_override || 0);
            const formatted = parsedPrice > 0 ? `Option: ${label} (${formatEuro(parsedPrice)})` : `Option: ${label}`;
            return doc.splitTextToSize(formatted, textWidth - 10);
          });

          const estimatedHeight =
            20 +
            descriptionLines.length * 12 +
            supplementLines.length * 11 +
            optionLines.length * 11 +
            16;
          ensureSpace(Math.max(estimatedHeight, 48));

          doc.setFont("times", "bold");
          doc.setFontSize(13);
          doc.setTextColor(20, 20, 20);
          doc.text(dishName || "Plat", marginX, cursorY);
          doc.text(dishPrice, pageWidth - marginX, cursorY, { align: "right" });
          cursorY += 14;

          if (descriptionLines.length > 0) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            doc.setTextColor(105, 105, 105);
            doc.text(descriptionLines, marginX, cursorY);
            cursorY += descriptionLines.length * 12;
          }

          if (supplementLines.length > 0) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(82, 82, 82);
            supplementLines.forEach((line) => {
              doc.text(String(line), marginX + 10, cursorY);
              cursorY += 11;
            });
          }

          if (optionLines.length > 0) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(110, 110, 110);
            optionLines.forEach((line) => {
              doc.text(String(line), marginX + 10, cursorY);
              cursorY += 11;
            });
          }

          cursorY += 8;
        });

        cursorY += 8;
      });

      const fileName = `statistiques_carte_${buildArchiveMonthToken(new Date())}.pdf`;
      const blob = doc.output("blob");
      await savePdfReportToArchive("stats", fileName, blob);

      const blobUrl = window.URL.createObjectURL(blob);
      previewWindow.location.href = blobUrl;
      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 5 * 60 * 1000);
    } catch (error) {
      console.error("Generation du PDF carte impossible:", error);
      previewWindow.document.open();
      previewWindow.document.write(
        "<!doctype html><html><head><title>Erreur PDF</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111} .box{max-width:520px;margin:64px auto;border:1px solid #f0c9c9;background:#fff7f7;border-radius:16px;padding:24px} h1{font-size:20px;margin:0 0 12px;color:#991b1b} p{margin:0;color:#7f1d1d;line-height:1.5}</style></head><body><div class='box'><h1>Impossible de generer la carte papier</h1><p>La previsualisation PDF a echoue. Verifiez les donnees du menu ou rechargez la page, puis reessayez.</p></div></body></html>"
      );
      previewWindow.document.close();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black p-6" style={{ fontFamily: "Inter, Montserrat, sans-serif" }}>
      <DashboardOtpGate scope="manager" restaurantId={String(params?.id || params?.restaurant_id || "")} />
      <div className={`max-w-6xl mx-auto ${forceFirstLoginPasswordChange ? "pointer-events-none select-none" : ""}`}>
        {isRestaurantLoading ? (
          <div className="mb-4 rounded-xl border border-gray-300 bg-white p-3 text-sm font-bold text-gray-700">
            Chargement...
          </div>
        ) : null}
        {!isRestaurantLoading && managerAccessError ? (
          <div className="mb-4 rounded-xl border-2 border-red-700 bg-red-50 p-3 text-sm font-bold text-red-800">
            {managerAccessError}
          </div>
        ) : null}
        {globalManagerNotification?.message ? (
          <div className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
            Mise à jour plateforme : {globalManagerNotification.message}
          </div>
        ) : null}
        <header className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black">Dashboard Manager</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/${scopedRestaurantId}/manager/archives`)}
                className="px-4 py-2 border-2 border-black font-black rounded-xl bg-white"
              >
                Archives & Rapports
              </button>
              <button
                type="button"
                onClick={() => void handleManagerSignOut()}
                className="px-4 py-2 border-2 border-black font-black rounded-xl bg-white"
              >
                Se déconnecter
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "menu", label: "Ma Carte" },
              { id: "stats", label: "Statistiques" },
              { id: "staff", label: "Staff" },
              { id: "appearance", label: "Apparence & Style" },
              { id: "security", label: "Securite" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveManagerTab(tab.id as "menu" | "stats" | "staff" | "appearance" | "security")}
                className={`px-4 py-2 border-2 font-black rounded-xl ${
                  activeManagerTab === tab.id ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
              <div className="min-w-0">
                <div className="font-black text-blue-950">Besoin d&apos;aide ?</div>
                <p className="mt-1 text-sm text-blue-900">
                  Pour toute question ou problème technique, contactez-nous :
                </p>
                <div className="mt-2 text-sm font-bold text-blue-950">
                  <a href="mailto:julesdelhomme67@gmail.com" className="underline underline-offset-2">
                    julesdelhomme67@gmail.com
                  </a>
                  {" · "}
                  <a href="tel:0760888872" className="underline underline-offset-2">
                    07 60 88 88 72
                  </a>
                </div>
              </div>
            </div>
          </div>
          {activeManagerTab === "staff" ? (
            <div className="rounded-xl border border-gray-300 bg-white p-4">
              <h2 className="text-lg font-black mb-2">Gestion du Staff</h2>
              <p className="text-sm text-gray-700 mb-3">
                Gérez les comptes serveurs et les codes PIN depuis l&apos;espace dédié.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/${scopedRestaurantId}/manager/staff`)}
                className="px-4 py-2 border-2 border-black font-black rounded-xl bg-black text-white"
              >
                Ouvrir la gestion Staff
              </button>
            </div>
          ) : null}
          {activeManagerTab !== "staff" && (
          <>
          <div className={`${activeManagerTab === "menu" ? "bg-white rounded-xl shadow-xl border border-gray-200 p-4" : "hidden"}`}>
            <h2 className="text-lg font-black mb-2">Catégories</h2>
              {categories.length === 0 ? (
                <div className="text-sm font-bold text-red-600 mb-3">Aucune catégorie créée</div>
              ) : (
                <div className="flex flex-wrap gap-2 mb-3">
                  {categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="px-3 py-1 rounded-full border border-gray-300 font-bold text-sm flex items-center gap-2"
                    >
                      {getCategoryLabel(cat)}
                      <select
                        value={normalizeCategoryDestination(cat.destination)}
                        onChange={(e) => {
                          e.stopPropagation();
                          void handleUpdateCategoryDestination(cat.id, normalizeCategoryDestination(e.target.value));
                        }}
                        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-bold"
                        title="Envoyer vers"
                      >
                        <option value="cuisine">Cuisine</option>
                        <option value="bar">Bar/Caisse</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const categoryToken = parseI18nToken(cat.name_en || "");
                          setEditingCategoryId(cat.id);
                          setCategoryForm({
                            name_fr: cat.name_fr || "",
                            name_en: cat.name_en || "",
                            name_es: cat.name_es || "",
                            name_de: cat.name_de || "",
                            destination: normalizeCategoryDestination(cat.destination),
                          });
                          setCategoryFormI18n({
                            ...categoryToken,
                            en: categoryToken.en || cat.name_en || "",
                            es: categoryToken.es || cat.name_es || "",
                            de: categoryToken.de || cat.name_de || "",
                          });
                          setShowCategoryModal(true);
                        }}
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            <button
              type="button"
              onClick={() => {
                setEditingCategoryId(null);
                setCategoryForm({ name_fr: "", name_en: "", name_es: "", name_de: "", destination: "cuisine" });
                setCategoryFormI18n({});
                setShowCategoryModal(true);
              }}
              className="px-4 py-2 border-2 border-black font-black"
            >
              Ajouter une catégorie
            </button>
            <div className="mt-4">
              <h3 className="font-black mb-2">Sous-catégories multilingues</h3>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-3">
                <select
                  value={newSubCategory.category_id}
                  onChange={(e) => setNewSubCategory({ ...newSubCategory, category_id: e.target.value })}
                  className="px-3 py-2 bg-white text-black border border-gray-300"
                >
                  <option value="">Catégorie</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {getCategoryLabel(cat)}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newSubCategory.name_fr}
                  onChange={(e) => setNewSubCategory({ ...newSubCategory, name_fr: e.target.value })}
                  placeholder="Nom FR"
                  className="px-3 py-2 bg-white text-black border border-gray-300"
                />
                {activeLanguageCodes
                  .filter((code) => code !== "fr")
                  .map((code) => (
                    <input
                      key={`new-subcat-${code}`}
                      type="text"
                      value={newSubCategoryI18n[code] || ""}
                      onChange={(e) => setNewSubCategoryI18n((prev) => ({ ...prev, [code]: e.target.value }))}
                      placeholder={`Nom ${code.toUpperCase()}`}
                      className="px-3 py-2 bg-white text-black border border-gray-300"
                    />
                  ))}
              </div>
              <button
                type="button"
                onClick={handleCreateSubCategory}
                className="px-4 py-2 border-2 border-black font-black"
              >
                {editingSubCategoryId ? "Modifier sous-catégorie" : "Ajouter sous-catégorie"}
              </button>
              <div className="mt-3 flex flex-col gap-2">
                {subCategoryRows.map((row) => (
                  <div key={row.id} className="border border-gray-200 rounded p-2 flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-black mr-2">
                        {getCategoryLabel(
                          categories.find((cat) => String(cat.id) === String(row.category_id)) || {
                            id: row.category_id,
                            name_fr: `Catégorie ${row.category_id}`,
                          }
                        )}
                      </span>
                      <span>{row.name_fr}</span>
                      <span className="text-gray-500">
                        {" | "}
                        {activeLanguageCodes
                          .filter((code) => code !== "fr")
                          .map((code) => {
                            const token = parseI18nToken(row.name_en || "");
                            const value =
                              token[code] ||
                              (code === "en" ? row.name_en : code === "es" ? row.name_es : code === "de" ? row.name_de : "") ||
                              "-";
                            return `${code.toUpperCase()}: ${value}`;
                          })
                          .join(" | ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const token = parseI18nToken(row.name_en || "");
                          setEditingSubCategoryId(row.id);
                          setNewSubCategory({
                            category_id: String(row.category_id),
                            name_fr: row.name_fr,
                            name_en: row.name_en || "",
                            name_es: row.name_es || "",
                            name_de: row.name_de || "",
                          });
                          setNewSubCategoryI18n({
                            ...token,
                            en: token.en || row.name_en || "",
                            es: token.es || row.name_es || "",
                            de: token.de || row.name_de || "",
                          });
                        }}
                        className="px-3 py-1 border border-black font-bold"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubCategory(row.id)}
                        className="px-3 py-1 border border-black font-bold text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={`${activeManagerTab === "menu" ? "bg-white rounded-xl shadow-xl border border-gray-200 p-4 mt-4" : "hidden"}`}>
            <h2 className="text-lg font-black mb-2">Bibliothèque d&apos;accompagnements</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
              <input
                type="text"
                value={newSide.name_fr}
                onChange={(e) => setNewSide({ ...newSide, name_fr: e.target.value })}
                placeholder="Nom FR"
                className="px-3 py-2 bg-white text-black border border-gray-300"
              />
              {activeLanguageCodes
                .filter((code) => code !== "fr")
                .map((code) => (
                  <input
                    key={`new-side-${code}`}
                    type="text"
                    value={newSideI18n[code] || ""}
                    onChange={(e) => setNewSideI18n((prev) => ({ ...prev, [code]: e.target.value }))}
                    placeholder={`Nom ${code.toUpperCase()}`}
                    className="px-3 py-2 bg-white text-black border border-gray-300"
                  />
                ))}
            </div>
            <button
              type="button"
              onClick={handleCreateSide}
              className="px-4 py-2 border-2 border-black font-black"
            >
              Ajouter accompagnement
            </button>
            <div className="mt-4">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 bg-gray-100 text-sm font-black px-3 py-2">
                  <div className="col-span-3">FR</div>
                  <div className="col-span-7">Traductions actives</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                {sides.map((s) => (
                  <div
                    key={s.id}
                    className="grid grid-cols-12 items-center px-3 py-2 border-t border-gray-200 text-sm"
                  >
                    <div className="col-span-3 font-bold">{s.name_fr}</div>
                    <div className="col-span-7 text-gray-700">
                      {activeLanguageCodes
                        .filter((code) => code !== "fr")
                        .map((code) => {
                          const sideI18n = parseI18nToken(s.name_en || "");
                          const value =
                            sideI18n[code] ||
                            (code === "en" ? s.name_en : code === "es" ? s.name_es : code === "de" ? s.name_de : "") ||
                            "-";
                          return `${code.toUpperCase()}: ${value}`;
                        })
                        .join(" | ")}
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditSide(s)}
                        className="px-2 py-1 border border-black rounded"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSide(s.id)}
                        className="px-2 py-1 border border-black rounded text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
                {sides.length === 0 && (
                  <div className="px-3 py-3 text-sm text-gray-600">Aucun accompagnement.</div>
                )}
              </div>
            </div>
          </div>
          <div className={`${activeManagerTab === "stats" ? "bg-white rounded-xl shadow-xl border border-gray-200 p-4" : "hidden"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-black">{analyticsText.title}</h2>
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAnalyticsRange("today")}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${
                      analyticsRange === "today" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"
                    }`}
                  >
                    {analyticsText.today}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsRange("7d")}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${
                      analyticsRange === "7d" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"
                    }`}
                  >
                    {analyticsText.last7Days}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsRange("30d")}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${
                      analyticsRange === "30d" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"
                    }`}
                  >
                    {analyticsText.last30Days}
                  </button>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void handleExportMonthlyReportPdfArchive()}
                    className="px-3 py-1.5 rounded-lg border text-sm font-black bg-blue-600 text-white border-blue-700"
                  >
                    Exporter le rapport mensuel (PDF)
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseMonthAndPurge}
                    disabled={!monthlyCloseEnabled}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-black ${
                      monthlyCloseEnabled
                        ? "bg-red-600 text-white border-red-700"
                        : "bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed"
                    }`}
                  >
                  {isPurgingHistory ? "Purge en cours..." : "Clôturer le mois et purger les données"}
                  </button>
                </div>
                <p className="text-xs text-gray-600">
                  La clôture mensuelle est activée après téléchargement du PDF et avec le filtre 30 jours.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {[
                { id: "live", label: analyticsText.liveTab },
                { id: "product", label: analyticsText.productTab },
                { id: "trends", label: analyticsText.trendsTab },
                { id: "ops", label: analyticsText.opsTab },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAnalyticsTab(tab.id as "live" | "product" | "trends" | "ops")}
                  className={`px-3 py-2 rounded-lg border text-sm font-black ${
                    analyticsTab === tab.id
                      ? "bg-orange-500 text-white border-orange-600"
                      : "bg-white text-black border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {analyticsTab === "live" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                    <div className="text-sm font-bold text-green-900">{analyticsText.realRevenue}</div>
                    <div className="text-2xl font-black text-green-700">{formatEuro(displayedAnalytics.realRevenue)}</div>
                  </div>
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-4">
                    <div className="text-sm font-bold text-rose-900">{analyticsText.tipsTotal}</div>
                    <div className="text-2xl font-black text-rose-700">{formatEuro(displayedAnalytics.totalTips || 0)}</div>
                  </div>
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                    <div className="text-sm font-bold text-blue-900">{analyticsText.averageBasket}</div>
                    <div className="text-2xl font-black text-blue-700">{formatEuro(displayedAnalytics.averageBasket)}</div>
                  </div>
                  <div className="rounded-xl bg-purple-50 border border-purple-200 p-4">
                    <div className="text-sm font-bold text-purple-900">{analyticsText.tableState}</div>
                    <div className="text-2xl font-black text-purple-700">
                      {displayedAnalytics.tableStateData.find((row: { name: string; value: number }) => row.name === analyticsText.occupiedTables)?.value || 0}/{displayedAnalytics.totalTables}
                    </div>
                    <p className="mt-1 text-xs font-bold text-purple-800">
                      {avgOccupationRateLabel}: {displayedAnalytics.averageOccupationRate.toFixed(1)}%
                    </p>
                    {Array.isArray(displayedAnalytics.occupationByTimeSlots) ? (
                      <div className="mt-2 space-y-1">
                        {displayedAnalytics.occupationByTimeSlots.map(
                          (slot: { id: string; label: string; occupancyRate: number }) => (
                            <p key={`live-occupation-slot-${slot.id}`} className="text-[11px] font-semibold text-purple-900">
                              {slot.label}: {Number(slot.occupancyRate || 0).toFixed(1)}%
                            </p>
                          )
                        )}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                    <div className="text-sm font-bold text-amber-900">{avgTicketPerCoverLabel}</div>
                    <div className="text-2xl font-black text-amber-700">{formatEuro(displayedAnalytics.averageTicketPerCover)}</div>
                    <p className="mt-1 text-xs font-bold text-amber-800">
                      Couverts: {Number(displayedAnalytics.totalCoversServed || 0)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-cyan-50 border border-cyan-200 p-4">
                    <div className="text-sm font-bold text-cyan-900">{avgCoversPerTableLabel}</div>
                    <div className="text-2xl font-black text-cyan-700">
                      {Number(displayedAnalytics.averageCoversPerTable || 0).toFixed(1)}
                    </div>
                    <p className="mt-1 text-xs font-bold text-cyan-800">
                      Tables servies: {Number(displayedAnalytics.totalServedTableSessionsWithCovers || 0)}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="font-black mb-3">{analyticsText.tableState}</h3>
                  {displayedAnalytics.totalTables === 0 ? (
                    <p className="text-sm text-gray-600">{analyticsText.noData}</p>
                  ) : (
                    <div className="h-64 min-w-0">
                      <SafeResponsiveContainer>
                        <PieChart>
                          <Pie data={displayedAnalytics.tableStateData} dataKey="value" nameKey="name" outerRadius={90}>
                            {displayedAnalytics.tableStateData.map((entry: { name: string; value: number }) => (
                              <Cell
                                key={`live-table-state-${entry.name}`}
                                fill={entry.name === analyticsText.freeTables ? "#22c55e" : "#f97316"}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </SafeResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            )}

            {analyticsTab === "product" && (
              <div className="space-y-4">
                <div className={`grid grid-cols-1 ${analyticsRange === "today" ? "md:grid-cols-1" : "md:grid-cols-2"} gap-4`}>
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="font-black mb-2">{analyticsText.top5}</h3>
                    {displayedAnalytics.top5.length === 0 ? (
                      <p className="text-sm text-gray-600">{analyticsText.noData}</p>
                    ) : (
                      <div className="space-y-1 text-sm">
                        {displayedAnalytics.top5.map((dish, index) => (
                          <div key={`top-${dish.name}-${index}`} className="flex justify-between">
                            <span className="font-semibold">{index + 1}. {dish.name}</span>
                            <span>{dish.count} {soldUnitsLabel}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {analyticsRange !== "today" ? (
                    <div className="rounded-xl border border-gray-200 p-4">
                      <h3 className="font-black mb-2">{analyticsText.topRevenue}</h3>
                      {displayedAnalytics.topRevenue5.length === 0 ? (
                        <p className="text-sm text-gray-600">{analyticsText.noData}</p>
                      ) : (
                        <div className="space-y-1 text-sm">
                          {displayedAnalytics.topRevenue5.map((dish, index) => (
                            <div key={`top-revenue-${dish.name}-${index}`} className="flex justify-between gap-2">
                              <span className="font-semibold truncate">{index + 1}. {dish.name}</span>
                              <span className="whitespace-nowrap">{formatEuro(dish.revenue)} ({dish.count} {soldUnitsLabel})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
                <details className="rounded-xl border border-gray-200 p-4">
                  <summary className="cursor-pointer font-black">{fullSalesInventoryLabel}</summary>
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-gray-200">
                          <th className="py-2 pr-3">Produit</th>
                          <th className="py-2 pr-3">{quantitySoldLabel}</th>
                          <th className="py-2">{generatedRevenueLabel}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedAnalytics.allProductSales.length === 0 ? (
                          <tr>
                            <td className="py-3 text-gray-600" colSpan={3}>{analyticsText.noData}</td>
                          </tr>
                        ) : (
                          displayedAnalytics.allProductSales.map((item: { name: string; count: number; revenue: number }, index: number) => (
                            <tr key={`inventory-sales-${item.name}-${index}`} className="border-b border-gray-100">
                              <td className="py-2 pr-3">{item.name}</td>
                              <td className="py-2 pr-3">{item.count} {soldUnitsLabel}</td>
                              <td className="py-2">{formatEuro(item.revenue)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </details>
                {analyticsRange !== "today" && (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="font-black mb-2">Évolution des Top Produits (volume)</h3>
                    {displayedAnalytics.topProductsTimelineData.length === 0 ? (
                      <p className="text-sm text-gray-600">{analyticsText.noData}</p>
                    ) : (
                      <div className="h-72 min-w-0">
                        <SafeResponsiveContainer>
                          <BarChart data={displayedAnalytics.topProductsTimelineData}>
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#f97316" />
                          </BarChart>
                        </SafeResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="font-black mb-2">{analyticsText.productMix}</h3>
                    <div className="h-64 min-w-0">
                      <SafeResponsiveContainer>
                        <PieChart>
                          <Pie data={displayedAnalytics.productMixData} dataKey="value" nameKey="name" outerRadius={90}>
                            {displayedAnalytics.productMixData.map((entry, index) => (
                              <Cell
                                key={`mix-${entry.name}`}
                                fill={["#0ea5e9", "#f97316", "#eab308", "#14b8a6"][index % 4]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </SafeResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {analyticsTab === "ops" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="font-black mb-2">{analyticsText.tablePerformance}</h3>
                  {displayedAnalytics.tablePerformance.length === 0 ? (
                    <p className="text-sm text-gray-600">{analyticsText.noData}</p>
                  ) : (
                    <div className="h-72 min-w-0">
                      <SafeResponsiveContainer>
                        <BarChart data={displayedAnalytics.tablePerformance}>
                          <XAxis dataKey="table" tick={{ fontSize: 11 }} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="revenue" fill="#22c55e" />
                        </BarChart>
                      </SafeResponsiveContainer>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                    <div className="text-sm font-bold text-blue-900">{avgTableDurationLabel}</div>
                    <div className="text-2xl font-black text-blue-700">
                      {Number(displayedAnalytics.averageTableDurationMinutes || 0).toFixed(2)} min
                    </div>
                  </div>
                  <div className="rounded-xl bg-purple-50 border border-purple-200 p-4">
                    <div className="text-sm font-bold text-purple-900">{avgOccupationRateLabel}</div>
                    <div className="text-2xl font-black text-purple-700">
                      {displayedAnalytics.averageOccupationRate.toFixed(1)}%
                    </div>
                    {Array.isArray(displayedAnalytics.occupationByTimeSlots) ? (
                      <div className="mt-2 space-y-1">
                        {displayedAnalytics.occupationByTimeSlots.map(
                          (slot: { id: string; label: string; occupancyRate: number }) => (
                            <p key={`ops-occupation-slot-${slot.id}`} className="text-[11px] font-semibold text-purple-900">
                              {slot.label}: {Number(slot.occupancyRate || 0).toFixed(1)}%
                            </p>
                          )
                        )}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                    <div className="text-sm font-bold text-emerald-900">{analyticsText.recommendationConversion}</div>
                    <div className="text-2xl font-black text-emerald-700">
                      {displayedAnalytics.recommendationConversion.toFixed(2)}%
                    </div>
                    <p className="mt-1 text-xs font-bold text-emerald-800">
                      {analyticsText.recommendationItems}: {displayedAnalytics.recommendationSoldItems}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="font-black mb-2">Historique des commandes (couverts)</h3>
                  {Array.isArray(displayedAnalytics.recentOrderHistory) &&
                  displayedAnalytics.recentOrderHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-left">
                            <th className="py-2 pr-3">Date</th>
                            <th className="py-2 pr-3">Table</th>
                            <th className="py-2 pr-3">Couverts</th>
                            <th className="py-2 pr-3">Statut</th>
                            <th className="py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedAnalytics.recentOrderHistory.map(
                            (
                              row: {
                                id: string;
                                tableLabel: string;
                                covers: number;
                                total: number;
                                orderTotal: number;
                                tipAmount: number;
                                status: string;
                                createdAtLabel: string;
                              },
                              index: number
                            ) => (
                              <tr key={`history-covers-${row.id || index}-${index}`} className="border-b border-gray-100">
                                <td className="py-2 pr-3 whitespace-nowrap">{row.createdAtLabel}</td>
                                <td className="py-2 pr-3">{row.tableLabel}</td>
                                <td className="py-2 pr-3 font-bold">{row.covers > 0 ? row.covers : "-"}</td>
                                <td className="py-2 pr-3">{row.status}</td>
                                <td className="py-2 whitespace-nowrap">
                                  <div className="font-bold">{formatEuro(row.total)}</div>
                                  {Number(row.tipAmount || 0) > 0 ? (
                                    <div className="text-xs text-gray-600">
                                      Commande {formatEuro(row.orderTotal)} + Pourboire {formatEuro(row.tipAmount)}
                                    </div>
                                  ) : null}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">Aucune commande sur la période sélectionnée.</p>
                  )}
                </div>
              </div>
            )}

            {analyticsTab === "trends" && (
              <div className="space-y-4">
                {analyticsRange === "7d" && (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="font-black mb-1">{weeklyAverageSummaryLabel}</h3>
                    <p className="text-xs text-gray-600 mb-3">{dailyServiceDetailsLabel}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                        <div className="text-xs font-bold text-green-900">{analyticsText.revenue}</div>
                        <div className="text-base font-black text-green-700">
                          {formatEuro(displayedAnalytics.weeklyRangeSummary.averageRevenuePerDay)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                        <div className="text-xs font-bold text-blue-900">{ordersColumnLabel}</div>
                        <div className="text-base font-black text-blue-700">
                          {Number(displayedAnalytics.weeklyRangeSummary.averageOrdersPerDay || 0).toFixed(1)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-purple-50 border border-purple-200 p-3">
                        <div className="text-xs font-bold text-purple-900">{avgDurationColumnLabel}</div>
                        <div className="text-base font-black text-purple-700">
                          {Number(displayedAnalytics.weeklyRangeSummary.averageTableDurationMinutes || 0).toFixed(2)} min
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {analyticsRange === "7d" && (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="font-black mb-2">{dailyServiceDetailsLabel}</h3>
                    {displayedAnalytics.dailyServicePerformanceData.length === 0 ? (
                      <p className="text-sm text-gray-600">{analyticsText.noData}</p>
                    ) : (
                      <>
                        <div className="h-72 min-w-0">
                          <SafeResponsiveContainer>
                            <ComposedChart data={displayedAnalytics.dailyServicePerformanceData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                              <Tooltip />
                              <Legend />
                              <Bar yAxisId="left" dataKey="revenue" name={analyticsText.revenue} fill="#16a34a" />
                              <Line yAxisId="right" type="monotone" dataKey="orders" name={ordersColumnLabel} stroke="#2563eb" strokeWidth={2} />
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="averageTableDurationMinutes"
                                name={avgDurationColumnLabel}
                                stroke="#7c3aed"
                                strokeWidth={2}
                              />
                            </ComposedChart>
                          </SafeResponsiveContainer>
                        </div>
                        <div className="mt-4 overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 text-left">
                                <th className="py-2 pr-3">{dateColumnLabel}</th>
                                <th className="py-2 pr-3">{analyticsText.revenue}</th>
                                <th className="py-2 pr-3">{ordersColumnLabel}</th>
                                <th className="py-2">{avgDurationColumnLabel}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayedAnalytics.dailyServicePerformanceData.map(
                                (
                                  row: {
                                    label: string;
                                    dateLabel: string;
                                    revenue: number;
                                    orders: number;
                                    averageTableDurationMinutes: number;
                                  },
                                  index: number
                                ) => (
                                  <tr key={`daily-service-${row.label}-${index}`} className="border-b border-gray-100">
                                    <td className="py-2 pr-3">{row.dateLabel}</td>
                                    <td className="py-2 pr-3">{formatEuro(row.revenue)}</td>
                                    <td className="py-2 pr-3">{row.orders}</td>
                                    <td className="py-2">{Number(row.averageTableDurationMinutes || 0).toFixed(2)} min</td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {analyticsRange === "30d" && (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="font-black mb-2">{weeklyEvolutionLabel}</h3>
                    {displayedAnalytics.weeklyServicePerformanceData.length === 0 ? (
                      <p className="text-sm text-gray-600">{analyticsText.noData}</p>
                    ) : (
                      <>
                        <div className="h-72 min-w-0">
                          <SafeResponsiveContainer>
                            <ComposedChart data={displayedAnalytics.weeklyServicePerformanceData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                              <Tooltip />
                              <Legend />
                              <Bar yAxisId="left" dataKey="revenue" name={analyticsText.salesByWeek} fill="#16a34a" />
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="averageTableDurationMinutes"
                                name={avgDurationColumnLabel}
                                stroke="#7c3aed"
                                strokeWidth={2}
                              />
                            </ComposedChart>
                          </SafeResponsiveContainer>
                        </div>
                        <div className="mt-4 overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 text-left">
                                <th className="py-2 pr-3">{weekColumnLabel}</th>
                                <th className="py-2 pr-3">{dateColumnLabel}</th>
                                <th className="py-2 pr-3">{analyticsText.revenue}</th>
                                <th className="py-2 pr-3">{ordersColumnLabel}</th>
                                <th className="py-2">{avgDurationColumnLabel}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayedAnalytics.weeklyServicePerformanceData.map(
                                (
                                  row: {
                                    label: string;
                                    periodLabel: string;
                                    revenue: number;
                                    orders: number;
                                    averageTableDurationMinutes: number;
                                  },
                                  index: number
                                ) => (
                                  <tr key={`weekly-service-${row.label}-${index}`} className="border-b border-gray-100">
                                    <td className="py-2 pr-3">{row.label}</td>
                                    <td className="py-2 pr-3">{row.periodLabel}</td>
                                    <td className="py-2 pr-3">{formatEuro(row.revenue)}</td>
                                    <td className="py-2 pr-3">{row.orders}</td>
                                    <td className="py-2">{Number(row.averageTableDurationMinutes || 0).toFixed(2)} min</td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="font-black mb-2">{displayedAnalytics.salesTrendTitle}</h3>
                  <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                      <div className="text-xs font-bold text-blue-900">{mostProfitableHourLabel}</div>
                      <div className="text-base font-black text-blue-700">
                        {displayedAnalytics.bestRevenueSlot?.label || "-"}
                      </div>
                    </div>
                    <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
                      <div className="text-xs font-bold text-orange-900">{peakOrdersLabel}</div>
                      <div className="text-base font-black text-orange-700">
                        {displayedAnalytics.peakOrdersSlot?.label || "-"}
                      </div>
                    </div>
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                      <div className="text-xs font-bold text-emerald-900">{avgRevenuePerHourLabel}</div>
                      <div className="text-base font-black text-emerald-700">
                        {formatEuro(displayedAnalytics.averageRevenuePerHour)}
                      </div>
                    </div>
                  </div>
                  <div className="h-72 min-w-0">
                    <SafeResponsiveContainer>
                      <LineChart data={displayedAnalytics.salesTrendData}>
                        <XAxis
                          dataKey="label"
                          interval={analyticsRange === "today" ? 1 : 0}
                          height={56}
                          tick={{ fontSize: 11 }}
                          angle={-35}
                          textAnchor="end"
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={false} />
                      </LineChart>
                    </SafeResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

          </div>
          </>
          )}
        </header>

        <section className={activeManagerTab === "menu" ? "mb-10" : "hidden"}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-black">Ma Carte</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAddDish}
                className="bg-black text-white px-4 py-2 font-black rounded-xl"
              >
                Ajouter un plat
              </button>
              <button
                type="button"
                onClick={handleGeneratePrintableMenu}
                className="px-4 py-2 border-2 border-black font-black rounded-xl bg-white"
              >
                Générer ma carte papier (PDF)
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full table-fixed text-left">
              <thead className="bg-gray-100">
                <tr className="text-sm font-bold text-black">
                  <th className="p-3 w-[30%]">Plat</th>
                  <th className="p-3 w-[14%]">Catégorie</th>
                  <th className="p-3 w-[10%]">Prix</th>
                  <th className="p-3 w-[20%]">Badges</th>
                  <th className="p-3 w-[14%]">Options</th>
                  <th className="p-3 w-[12rem] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {preparedDishes.map((dish) => (
                  <tr key={dish.id} className="border-t border-gray-200 hover:bg-gray-100">
                    <td className="p-3 align-top">
                      <div className="font-black flex items-center gap-2">
                        <span
                          className={`inline-block w-3 h-3 rounded-full ${
                            dish.active === false ? "bg-red-500" : "bg-green-500"
                          }`}
                        />
                        {dish.name}
                      </div>
                      <div className="mt-1 max-w-full break-words text-sm leading-5 text-gray-700">
                        {(dish as Dish & { description_display?: string }).description_display || ""}
                      </div>
                    </td>
                    <td className="p-3 align-top text-sm break-words">
                      {categories.find((category) => String(category.id) === String(dish.category_id))?.name_fr ||
                        dish.categorie}
                    </td>
                    <td className="p-3 align-top font-bold whitespace-nowrap">{formatEuro(Number(dish.price || 0))}</td>
                    <td className="p-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleDishHighlight(
                              dish,
                              "is_daily_special",
                              !toBoolean(
                                (dish as unknown as Record<string, unknown>).is_daily_special ?? dish.is_special,
                                false
                              )
                            )
                          }
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border font-black text-xs ${
                            toBoolean((dish as unknown as Record<string, unknown>).is_daily_special ?? dish.is_special, false)
                              ? "bg-green-100 border-green-600 text-green-900"
                              : "bg-white border-gray-300 text-gray-700"
                          }`}
                          title="Plat du Jour"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              toBoolean((dish as unknown as Record<string, unknown>).is_daily_special ?? dish.is_special, false)
                                ? "fill-current"
                                : ""
                            }`}
                            aria-hidden="true"
                          />
                          <span>Jour</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleDishHighlight(
                              dish,
                              "suggestion_chef",
                              !toBoolean(
                                (dish as unknown as Record<string, unknown>).is_suggestion ??
                                  (dish as unknown as Record<string, unknown>).is_chef_suggestion ??
                                  dish.is_featured,
                                false
                              )
                            )
                          }
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border font-black text-xs ${
                            toBoolean(
                              (dish as unknown as Record<string, unknown>).is_suggestion ??
                                (dish as unknown as Record<string, unknown>).is_chef_suggestion ??
                                dish.is_featured,
                              false
                            )
                              ? "bg-amber-100 border-amber-500 text-amber-900"
                              : "bg-white border-gray-300 text-gray-700"
                          }`}
                          title="Suggestion du Chef"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              toBoolean(
                                (dish as unknown as Record<string, unknown>).is_suggestion ??
                                  (dish as unknown as Record<string, unknown>).is_chef_suggestion ??
                                  dish.is_featured,
                                false
                              )
                                ? "fill-current"
                                : ""
                            }`}
                            aria-hidden="true"
                          />
                          <span>Suggestion du Chef</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleDishHighlight(
                              dish,
                              "is_promo",
                              !toBoolean((dish as unknown as Record<string, unknown>).is_promo, false)
                            )
                          }
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border font-black text-xs ${
                            toBoolean((dish as unknown as Record<string, unknown>).is_promo, false)
                              ? "bg-red-100 border-red-600 text-red-900"
                              : "bg-white border-gray-300 text-gray-700"
                          }`}
                          title="Badge PROMO"
                        >
                          <span>PROMO</span>
                        </button>
                      </div>
                    </td>
                    <td className="p-3 align-top text-sm break-words">
                      Accompagnements: {dish.has_sides ? "Oui" : "Non"} | Suppléments: {dish.has_extras ? "Oui" : "Non"} | Variantes: {Array.isArray((dish as Dish).product_options) ? (dish as Dish).product_options?.length || 0 : 0} | Cuisson: {dish.ask_cooking ? "Oui" : "Non"}
                    </td>
                    <td className="p-3 align-top text-right">
                      <div className="flex justify-end gap-2 whitespace-nowrap">
                        <button
                          onClick={() => {
                            const rawDish = dishes.find((row) => String(row.id) === String(dish.id));
                            handleEditDish(rawDish || dish);
                          }}
                          className="px-3 py-1 rounded-lg bg-black text-white font-bold shadow-sm"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => {
                            const rawDish = dishes.find((row) => String(row.id) === String(dish.id));
                            handleDeleteDish(rawDish || dish);
                          }}
                          className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold shadow-sm"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={activeManagerTab === "staff" ? "hidden" : "mb-10"}>
          <h2 className="text-xl font-black mb-3">
            {activeManagerTab === "stats"
              ? "Statistiques"
              : activeManagerTab === "appearance"
                ? "Apparence & Style"
                : activeManagerTab === "security"
                  ? "Parametres du compte"
                  : "Ma Carte"}
          </h2>
          <div className={`mb-4 grid grid-cols-1 lg:grid-cols-2 gap-3 ${activeManagerTab === "stats" ? "" : "hidden"}`}>
            <div className="rounded-xl border border-gray-300 bg-white p-3">
              <div className="text-sm font-black mb-2">QR Code Tables</div>
              <RestaurantQrCard
                restaurantId={currentRestaurantQrId}
                restaurantName={String(restaurantForm.name || restaurant?.name || "Restaurant").trim()}
                logoUrl={String(restaurantForm.logo_url || restaurant?.logo_url || "").trim()}
                primaryColor={String(restaurantForm.primary_color || restaurant?.primary_color || "#111111").trim()}
                title="QR Code Tables"
              />
              {currentRestaurantPublicUrl ? (
                <a
                  href={currentRestaurantPublicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center rounded border border-gray-300 px-3 py-1 text-xs font-black text-black hover:bg-gray-100"
                >
                  Voir ma carte
                </a>
              ) : null}
            </div>
            <div className="rounded-xl border border-gray-300 bg-white p-3">
              <div className="text-sm font-black mb-2">QR Code Vitrine</div>
              <RestaurantQrCard
                restaurantId={currentRestaurantQrId}
                restaurantName={String(restaurantForm.name || restaurant?.name || "Restaurant").trim()}
                logoUrl={String(restaurantForm.logo_url || restaurant?.logo_url || "").trim()}
                primaryColor={String(restaurantForm.primary_color || restaurant?.primary_color || "#111111").trim()}
                mode="vitrine"
                title="QR Code Vitrine"
              />
              <div className="mt-2 text-xs font-bold text-gray-600">Notre Carte / Our Menu</div>
              {currentRestaurantVitrineUrl ? (
                <a
                  href={currentRestaurantVitrineUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center rounded border border-gray-300 px-3 py-1 text-xs font-black text-black hover:bg-gray-100"
                >
                  Lien Vitrine
                </a>
              ) : null}
            </div>
            <div className="lg:col-span-2 rounded-xl border border-gray-300 bg-white p-3 text-sm">
              <div className="font-black">Vues mode vitrine</div>
              <div className="text-2xl font-black">{Number.isFinite(vitrineViewsCount) ? vitrineViewsCount : 0}</div>
              <div className="text-gray-600">Ce compteur augmente à chaque visite via le QR vitrine.</div>
            </div>
          </div>
          <div className={`bg-white rounded-xl shadow-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 ${activeManagerTab === "menu" || activeManagerTab === "appearance" ? "" : "hidden"}`}>
            <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
              <label className="block mb-1 font-bold">Nom du restaurant</label>
              <input
                type="text"
                value={restaurantForm.name}
                onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-white text-black border border-gray-300"
              />
            </div>
            <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
              <label className="block mb-1 font-bold">Logo (upload)</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const inputEl = e.target as HTMLInputElement | null;
                  const file = e.target.files?.[0];
                  if (!file) return;
                  await uploadRestaurantAsset("logo", file);
                  if (inputEl) inputEl.value = "";
                }}
                className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                disabled={isUploadingRestaurantLogo}
              />
              {restaurantForm.logo_url ? (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={restaurantForm.logo_url}
                    alt="Aperçu logo"
                    className="h-12 w-12 object-contain border border-gray-200 bg-white"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                  <span className="text-xs text-gray-600 break-all">{restaurantForm.logo_url}</span>
                </div>
              ) : null}
              {isUploadingRestaurantLogo ? <p className="mt-1 text-xs text-gray-600">Upload du logo...</p> : null}
            </div>
            <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
              <label className="block mb-1 font-bold">{bannerImageLabel}</label>
              <p className="mb-1 text-xs text-gray-600">Bannière : 1200x400px conseillé</p>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const inputEl = e.target as HTMLInputElement | null;
                  const file = e.target.files?.[0];
                  if (!file) return;
                  await uploadRestaurantAsset("banner", file);
                  if (inputEl) inputEl.value = "";
                }}
                className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                disabled={isUploadingRestaurantBanner}
              />
              {isUploadingRestaurantBanner ? <p className="mt-1 text-xs text-gray-600">Upload de la bannière...</p> : null}
            </div>
            <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
              {String((restaurantForm as Record<string, unknown>).banner_image_url || "").trim() ? (
                <div className="mt-2">
                  <img
                    src={String((restaurantForm as Record<string, unknown>).banner_image_url || "")}
                    alt="Aperçu bannière"
                    className="h-20 w-full object-cover border border-gray-200 bg-white rounded"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                  <span className="mt-1 block text-xs text-gray-600 break-all">
                    {String((restaurantForm as Record<string, unknown>).banner_image_url || "")}
                  </span>
                </div>
              ) : (
                <div className="h-full flex items-end">
                  <p className="text-xs text-gray-500">Aucune bannière uploadée.</p>
                </div>
              )}
            </div>
            <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
              <label className="block mb-1 font-bold">Image de fond (upload)</label>
              <p className="mb-1 text-xs text-gray-600">Format Portrait conseillé (ex: 1080x1920px) pour remplir tout l&apos;écran du téléphone.</p>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const inputEl = e.target as HTMLInputElement | null;
                  const file = e.target.files?.[0];
                  if (!file) return;
                  await uploadRestaurantAsset("background", file);
                  if (inputEl) inputEl.value = "";
                }}
                className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                disabled={isUploadingRestaurantBackground}
              />
              {restaurantForm.background_url ? (
                <div className="mt-2">
                  <img
                    src={restaurantForm.background_url}
                    alt="Aperçu fond"
                    className="h-20 w-full object-cover border border-gray-200 bg-white rounded"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                  <span className="mt-1 block text-xs text-gray-600 break-all">{restaurantForm.background_url}</span>
                </div>
              ) : null}
              {isUploadingRestaurantBackground ? <p className="mt-1 text-xs text-gray-600">Upload du fond...</p> : null}
            </div>
            <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
              <label className="block mb-1 font-bold">{bannerColorLabel}</label>
              <input
                type="color"
                value={restaurantForm.primary_color}
                onChange={(e) => setRestaurantForm({ ...restaurantForm, primary_color: e.target.value })}
                className="w-full h-10 bg-white text-black border border-gray-300"
              />
            </div>
            <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
              <label className="block mb-1 font-bold">{globalTextColorLabel}</label>
              <input
                type="color"
                value={String((restaurantForm as Record<string, unknown>).text_color || "#111111")}
                onChange={(e) => setRestaurantForm({ ...restaurantForm, text_color: e.target.value })}
                className="w-full h-10 bg-white text-black border border-gray-300"
              />
            </div>
            <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
              <label className="block mb-1 font-bold">{dishCardsColorLabel}</label>
              <input
                type="color"
                value={String((restaurantForm as Record<string, unknown>).card_bg_color || "#FFFFFF")}
                onChange={(e) => setRestaurantForm({ ...restaurantForm, card_bg_color: e.target.value })}
                className="w-full h-10 bg-white text-black border border-gray-300"
              />
            </div>
            <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
              <label className="block mb-1 font-bold">{dishCardsOpacityLabel}</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Number((restaurantForm as Record<string, unknown>).card_bg_opacity ?? 100)}
                  onChange={(e) =>
                    setRestaurantForm({
                      ...restaurantForm,
                      card_bg_opacity: normalizeOpacityPercent(e.target.value, 100),
                    })
                  }
                  className="flex-1"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={Number((restaurantForm as Record<string, unknown>).card_bg_opacity ?? 100)}
                  onChange={(e) =>
                    setRestaurantForm({
                      ...restaurantForm,
                      card_bg_opacity: normalizeOpacityPercent(e.target.value, 100),
                    })
                  }
                  className="w-20 px-2 py-2 bg-white text-black border border-gray-300 rounded font-bold"
                />
                <span className="text-sm font-bold">%</span>
              </div>
            </div>
            <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
              <label className="block mb-1 font-bold">{dishCardsTextColorLabel}</label>
              <input
                type="color"
                value={String((restaurantForm as Record<string, unknown>).card_text_color || "#111111")}
                onChange={(e) => setRestaurantForm({ ...restaurantForm, card_text_color: e.target.value })}
                className="w-full h-10 bg-white text-black border border-gray-300"
              />
            </div>
            <label className={`flex items-center gap-2 text-sm font-bold text-black ${activeManagerTab === "appearance" ? "" : "hidden"}`}>
              <input
                type="checkbox"
                checked={Boolean((restaurantForm as Record<string, unknown>).card_transparent)}
                onChange={(e) =>
                  setRestaurantForm({
                    ...restaurantForm,
                    card_transparent: e.target.checked,
                    card_bg_opacity: e.target.checked
                      ? 0
                      : Math.max(Number((restaurantForm as Record<string, unknown>).card_bg_opacity ?? 0), 100),
                  })
                }
              />
              Fond transparent
            </label>
            <div className={`${activeManagerTab === "appearance" ? "border border-gray-200 rounded bg-white" : "hidden"}`}>
              <label className="flex items-start gap-2 text-sm font-bold text-black">
                <input
                  type="checkbox"
                  checked={Boolean((restaurantForm as Record<string, unknown>).quick_add_to_cart_enabled)}
                  onChange={(e) =>
                    setRestaurantForm({
                      ...restaurantForm,
                      quick_add_to_cart_enabled: e.target.checked,
                    })
                  }
                  className="mt-0.5"
                />
                <span>
                  <span className="block">Activer l&apos;ajout rapide au panier</span>
                  <span className="mt-0.5 block text-xs font-semibold text-gray-600">
                    Permet aux clients d&apos;ajouter un article directement depuis la liste des plats sans ouvrir la fiche détaillée.
                  </span>
                </span>
              </label>
            </div>
            <div className={`${activeManagerTab === "appearance" ? "md:col-span-2 border border-gray-200 rounded bg-white p-3" : "hidden"}`}>
              <div className="text-sm font-black text-black mb-2">Commande client</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-start gap-2 text-sm font-bold text-black">
                  <input
                    type="checkbox"
                    checked={showCaloriesClient}
                    onChange={(e) => setShowCaloriesClient(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block">Afficher les kilocalories (kcal)</span>
                    <span className="mt-0.5 block text-xs font-semibold text-gray-600">
                      Si désactivé, les calories sont masquées sur la carte client.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm font-bold text-black">
                  <input
                    type="checkbox"
                    checked={consultationModeEnabled}
                    onChange={(e) => setConsultationModeEnabled(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block">Mode commande serveur</span>
                    <span className="mt-0.5 block text-xs font-semibold text-gray-600">
                      Désactive l&apos;ajout au panier et le tunnel de commande côté client.
                    </span>
                  </span>
                </label>
              </div>
            </div>
            <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
              <button
                type="button"
                onClick={() => toggleManagerPanel("font")}
                className="w-full flex items-center justify-between px-3 py-2 text-left font-black"
              >
                <span>Police du menu</span>
                {openManagerPanels.font ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${openManagerPanels.font ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}
              >
                <div className="px-3 pb-3">
                  <style jsx global>{`
                    .manager-font-preview-live {
                      font-family: ${JSON.stringify(normalizeManagerFontFamily(restaurantForm.font_family))}, sans-serif !important;
                    }
                    ${MENU_FONT_OPTIONS.map(
                      (fontName) =>
                        `.manager-font-select option[data-font-option="${fontName.replace(/"/g, '\"') }"] { font-family: ${JSON.stringify(fontName)}, sans-serif !important; }`
                    ).join("\n")}
                  `}</style>
                  <select
                    value={restaurantForm.font_family}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, font_family: e.target.value })}
                    className="manager-font-select w-full px-3 py-2 bg-white text-black border border-gray-300 rounded"
                    style={{ fontFamily: normalizeManagerFontFamily(restaurantForm.font_family) }}
                  >
                    {MENU_FONT_OPTIONS.map((fontName) => (
                      <option key={fontName} value={fontName} data-font-option={fontName} style={{ fontFamily: fontName }}>
                        {fontName}
                      </option>
                    ))}
                  </select>
                  <p
                    className="manager-font-preview-live mt-2 text-sm text-gray-700 border border-gray-200 rounded px-3 py-2 bg-gray-50"
                    style={{ fontFamily: normalizeManagerFontFamily(restaurantForm.font_family) }}
                  >
                    Aper&ccedil;u du texte : La carte de mon restaurant
                  </p>
                </div>
              </div>
            </div>
            <div className="hidden">
              <label className="block mb-1 font-bold">Disposition des cartes (menu client)</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRestaurantForm((prev) => ({ ...prev, menu_layout: "classic_grid" }))}
                  className={`px-3 py-2 border-2 font-black rounded ${String((restaurantForm as Record<string, unknown>).menu_layout || "classic_grid") === "classic_grid" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"}`}
                >
                  Classique (image en haut)
                </button>
                <button
                  type="button"
                  onClick={() => setRestaurantForm((prev) => ({ ...prev, menu_layout: "modern_list" }))}
                  className={`px-3 py-2 border-2 font-black rounded ${String((restaurantForm as Record<string, unknown>).menu_layout || "classic_grid") === "modern_list" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"}`}
                >
                  Compact (image ? gauche)
                </button>
              </div>
            </div>
            <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
              <label className="block mb-1 font-bold">Style des cartes (affichage)</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRestaurantForm((prev) => ({ ...prev, card_layout: "default" }))}
                  className={`px-3 py-2 border-2 font-black rounded ${String((restaurantForm as Record<string, unknown>).card_layout || "default") === "default" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"}`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setRestaurantForm((prev) => ({ ...prev, card_layout: "overlay" }))}
                  className={`px-3 py-2 border-2 font-black rounded ${String((restaurantForm as Record<string, unknown>).card_layout || "default") === "overlay" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"}`}
                >
                  Overlay (pleine image)
                </button>
                <button
                  type="button"
                  onClick={() => setRestaurantForm((prev) => ({ ...prev, card_layout: "bicolor" }))}
                  className={`px-3 py-2 border-2 font-black rounded ${String((restaurantForm as Record<string, unknown>).card_layout || "default") === "bicolor" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"}`}
                >
                  Moderne Bicolore
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                Format recommandé : 4:3 ou 1:1 (Carré). Taille conseillée : 800x600px. Assurez-vous que le plat est centré.
              </p>
            </div>
            <div className={activeManagerTab === "appearance" ? "" : "hidden"}>
              <label className="block mb-1 font-bold">Style des cartes (coins)</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRestaurantForm((prev) => ({ ...prev, card_style: "rounded" }))}
                  className={`px-3 py-2 border-2 font-black rounded ${normalizeCardStyle((restaurantForm as Record<string, unknown>).card_style) === "rounded" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"}`}
                >
                  Moderne / Arrondi
                </button>
                <button
                  type="button"
                  onClick={() => setRestaurantForm((prev) => ({ ...prev, card_style: "sharp" }))}
                  className={`px-3 py-2 border-2 font-black rounded ${normalizeCardStyle((restaurantForm as Record<string, unknown>).card_style) === "sharp" ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"}`}
                >
                  Élégant / Pointu
                </button>
              </div>
            </div>
            <div id="manager-google-review-config" className={activeManagerTab === "appearance" ? "" : "hidden"}>
              <label className="block mb-1 font-bold">Lien Google Review</label>
              <input
                type="url"
                value={String((restaurantForm as Record<string, unknown>).google_review_url || "")}
                onChange={(e) => setRestaurantForm({ ...restaurantForm, google_review_url: e.target.value })}
                placeholder="https://g.page/r/.../review"
                className="w-full px-3 py-2 bg-white text-black border border-gray-300"
              />
              <p className="mt-1 text-xs text-gray-600">
                Utilisé pour le bouton Google affiché aux clients après un avis de 4 ou 5 étoiles.
              </p>
            </div>
            <div id="manager-email-config" className={activeManagerTab === "appearance" ? "md:col-span-2 border border-gray-200 rounded bg-white p-3" : "hidden"}>
              <div className="mb-3">
                <div>
                  <div className="font-black">Configuration Email</div>
                  <p className="text-sm text-gray-600 mt-1">
                    Utilisez un mot de passe d&apos;application Gmail pour sécuriser l&apos;envoi des tickets de caisse.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-bold">Gmail SMTP (adresse)</label>
                  <input
                    type="email"
                    value={restaurantForm.smtp_user}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, smtp_user: e.target.value })}
                    placeholder="ex: restaurant@gmail.com"
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold">Mot de passe d&apos;application Gmail (16 caractères)</label>
                  <input
                    type="password"
                    value={restaurantForm.smtp_password}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, smtp_password: e.target.value })}
                    placeholder="Laisser vide pour conserver l&apos;existant"
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold">Objet de l&apos;e-mail</label>
                  <input
                    type="text"
                    value={restaurantForm.email_subject}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, email_subject: e.target.value })}
                    placeholder="Votre ticket de caisse - [Nom du Resto]"
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold">Message (début de l&apos;e-mail)</label>
                  <textarea
                    value={restaurantForm.email_body_header}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, email_body_header: e.target.value })}
                    placeholder="Merci de votre visite ! Voici votre ticket :"
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                    rows={2}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-1 font-bold">Message / pied de page</label>
                  <textarea
                    value={restaurantForm.email_footer}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, email_footer: e.target.value })}
                    placeholder="À bientôt !"
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                    rows={3}
                  />
                </div>
                <details className="md:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <summary className="cursor-pointer font-black text-blue-950">
                    Comment configurer votre envoi de mail ?
                  </summary>
                  <div className="mt-3 space-y-2 text-sm text-blue-950">
                    <p><strong>Étape 1 :</strong> Créez une adresse Gmail dédiée à votre restaurant.</p>
                    <p><strong>Étape 2 :</strong> Activez la &apos;Validation en deux étapes&apos; dans les paramètres de sécurité Google.</p>
                    <p><strong>Étape 3 :</strong> Recherchez &apos;Mots de passe d&apos;application&apos; dans votre compte Google.</p>
                    <p><strong>Étape 4 :</strong> Générez un code pour &apos;Application de messagerie&apos;. Copiez ce code de 16 caractères.</p>
                    <p><strong>Étape 5 :</strong> Collez ce code dans le champ &apos;Mot de passe SMTP&apos; de votre interface Elemdho.</p>
                    <p className="pt-1 text-blue-900">
                      <strong>Note :</strong> Cela permet à l&apos;application d&apos;envoyer les codes de sécurité à vos clients en toute sécurité.
                    </p>
                  </div>
                </details>
                <div id="manager-social-config" className="md:col-span-2 font-black">Réseaux Sociaux</div>
                <div>
                  <label className="block mb-1 font-bold">Instagram</label>
                  <input
                    type="url"
                    value={String((restaurantForm as Record<string, unknown>).instagram_url || "")}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, instagram_url: e.target.value })}
                    placeholder="https://instagram.com/..."
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold">Snapchat</label>
                  <input
                    type="url"
                    value={String((restaurantForm as Record<string, unknown>).snapchat_url || "")}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, snapchat_url: e.target.value })}
                    placeholder="https://snapchat.com/add/..."
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold">Facebook</label>
                  <input
                    type="url"
                    value={String((restaurantForm as Record<string, unknown>).facebook_url || "")}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, facebook_url: e.target.value })}
                    placeholder="https://facebook.com/..."
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold">X</label>
                  <input
                    type="url"
                    value={String((restaurantForm as Record<string, unknown>).x_url || "")}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, x_url: e.target.value })}
                    placeholder="https://x.com/..."
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-1 font-bold">Site Web</label>
                  <input
                    type="url"
                    value={String((restaurantForm as Record<string, unknown>).website_url || "")}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, website_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-black">
                    <input
                      type="checkbox"
                      checked={Boolean((restaurantForm as Record<string, unknown>).show_social_on_receipt)}
                      onChange={(e) =>
                        setRestaurantForm({ ...restaurantForm, show_social_on_receipt: e.target.checked })
                      }
                    />
                    Afficher les réseaux sociaux sur le reçu digital
                  </label>
                </div>
                </div>
            </div>
            <div className="hidden">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-bold">
                      <Printer className={`h-4 w-4 ${autoPrintKitchen ? "text-green-600" : "text-gray-500"}`} />
                      <span>{autoPrintKitchen ? "Impression automatique : Activée" : "Affichage écran uniquement"}</span>
                    </div>
                    <p className={`text-sm mt-1 ${autoPrintKitchen ? "text-green-700" : "text-gray-600"}`}>
                      {autoPrintKitchen
                        ? "Activée (Les tickets s'impriment dès qu'une commande arrive)"
                        : "Désactivée (Affichage sur écran uniquement)"}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoPrintKitchen}
                    onClick={() => setAutoPrintKitchen((prev) => !prev)}
                    className={`relative inline-flex h-8 w-16 items-center rounded-full border-2 transition ${autoPrintKitchen ? "border-green-700 bg-green-500" : "border-gray-400 bg-gray-300"}`}
                  >
                    <span className="sr-only">Impression automatique des tickets</span>
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${autoPrintKitchen ? "translate-x-8" : "translate-x-1"}`}
                    />
                  </button>
                </div>
              </div>
            </div>
            <div className="hidden">
              <label className="flex items-center gap-3 font-bold">
                <input
                  type="checkbox"
                  checked={showCaloriesClient}
                  onChange={(e) => setShowCaloriesClient(e.target.checked)}
                />
                Afficher les Calories (menu client)
              </label>
            </div>
            <div className="hidden">
              <div className="font-bold mb-2">Options de Vente</div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 font-bold">
                  <input
                    type="checkbox"
                    checked={heroEnabled}
                    onChange={(e) => setHeroEnabled(e.target.checked)}
                  />
                  Activer la Mise en Avant (Hero Section)
                </label>
                <p className="text-sm text-gray-600">
                  Active ou désactive l&apos;affichage du bandeau des suggestions en haut du menu.
                </p>
                <label className="flex items-center gap-3 font-bold">
                  <input
                    type="checkbox"
                    checked={consultationModeEnabled}
                    onChange={(e) => setConsultationModeEnabled(e.target.checked)}
                  />
                  Désactiver la commande client (Mode Consultation)
                </label>
                <p className="text-sm text-gray-600">
                  Si activé, le panier et le bouton Commander sont masqués côté client.
                </p>
                <div className="mt-1 max-w-xs">
                  <label className="block text-sm font-bold mb-1">Nombre total de tables</label>
                  <input
                    type="number"
                    min={1}
                    max={MAX_TOTAL_TABLES}
                    value={totalTables}
                    onChange={(e) => setTotalTables(normalizeTotalTables(e.target.value, totalTables))}
                    className="w-full px-3 py-2 border border-gray-300 bg-white text-black rounded"
                  />
                  <p className="text-xs text-gray-600 mt-1">Utilisé pour l&apos;état des tables sur le dashboard.</p>
                </div>
                <div className="mt-1">
                  <div className="text-sm font-bold mb-1">Badge de mise en avant</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setHeroBadgeType("chef")}
                      className={`px-3 py-1 border-2 font-bold rounded ${
                        heroBadgeType === "chef"
                          ? "bg-amber-100 border-amber-500 text-amber-900"
                          : "bg-white border-gray-300 text-black"
                      }`}
                    >
                      Suggestion du Chef
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroBadgeType("daily")}
                      className={`px-3 py-1 border-2 font-bold rounded ${
                        heroBadgeType === "daily"
                          ? "bg-green-100 border-green-600 text-green-900"
                          : "bg-white border-gray-300 text-black"
                      }`}
                    >
                      Plat du Jour
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className={`md:col-span-2 border border-gray-200 rounded p-3 bg-gray-50 ${activeManagerTab === "appearance" ? "" : "hidden"}`}>
              <button
                type="button"
                onClick={() => toggleManagerPanel("languages")}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <div className="font-bold">Gestion des Langues (client + champs manager)</div>
                {openManagerPanels.languages ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <div
                className={`grid transition-all duration-300 ease-out ${
                  openManagerPanels.languages ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 mb-3">
                <select
                  value={languagePresetToAdd}
                  onChange={(e) => setLanguagePresetToAdd(e.target.value)}
                  className="px-3 py-2 bg-white text-black border border-gray-300 rounded"
                >
                  {PREDEFINED_LANGUAGE_OPTIONS.map((langOption) => (
                    <option key={langOption.code} value={langOption.code}>
                      {langOption.label} ({langOption.code.toUpperCase()})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const selected = PREDEFINED_LANGUAGE_OPTIONS.find((entry) => entry.code === languagePresetToAdd);
                    const label = String(selected?.label || "").trim();
                    const code = normalizeLanguageKey(String(selected?.code || ""));
                    if (!label || !code) return;
                    if (activeLanguageCodes.includes(code)) return;
                    setActiveLanguageCodes((prev) => [...prev, code]);
                    setLanguageLabels((prev) => ({ ...prev, [code]: label }));
                  }}
                  className="px-4 py-2 border-2 border-black font-black"
                >
                  Ajouter langue
                </button>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                La base enregistre déjà chaque langue sous la forme <code>code::label</code> (abréviation + nom complet).
              </p>
              <div className="space-y-2">
                {activeLanguageCodes.map((code) => {
                  const label = languageLabels[code] || DEFAULT_LANGUAGE_LABELS[code] || code.toUpperCase();
                  return (
                    <div key={code} className="grid grid-cols-1 md:grid-cols-[1fr_160px_auto] gap-2 items-center border border-gray-200 rounded p-2 bg-white">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Nom complet</label>
                        <input
                          type="text"
                          value={label}
                          onChange={(e) =>
                            setLanguageLabels((prev) => ({
                              ...prev,
                              [code]: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Abréviation</label>
                        <input
                          type="text"
                          value={code.toUpperCase()}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-700"
                        />
                      </div>
                      <div className="flex justify-end">
                        {code !== "fr" && (
                          <button
                            type="button"
                            onClick={() => {
                              const confirmDelete = window.confirm(
                                "Êtes-vous sûr ? Cela supprimera toutes les traductions associées à cette langue."
                              );
                              if (!confirmDelete) return;
                              setActiveLanguageCodes((prev) => prev.filter((item) => item !== code));
                              setLanguageLabels((prev) => {
                                const next = { ...prev };
                                delete next[code];
                                return next;
                              });
                              setNewSideI18n((prev) => {
                                const next = { ...prev };
                                delete next[code];
                                return next;
                              });
                              setSideFormI18n((prev) => {
                                const next = { ...prev };
                                delete next[code];
                                return next;
                              });
                              setDishExtraDraft((prev) => {
                                const nextNames = { ...(prev.names_i18n || {}) };
                                delete nextNames[code];
                                return { ...prev, names_i18n: nextNames };
                              });
                              setFormData((prev) => {
                                const nextNameI18n = { ...prev.name_i18n };
                                const nextDescriptionI18n = { ...prev.description_i18n };
                                delete nextNameI18n[code];
                                delete nextDescriptionI18n[code];
                                const nextExtras = prev.extras_list.map((extra) => {
                                  const nextNames = { ...(extra.names_i18n || {}) };
                                  delete nextNames[code];
                                  return { ...extra, names_i18n: nextNames };
                                });
                                return {
                                  ...prev,
                                  name_i18n: nextNameI18n,
                                  description_i18n: nextDescriptionI18n,
                                  extras_list: nextExtras,
                                };
                              });
                            }}
                            className="text-red-600 font-black p-2"
                            title={`Retirer ${label}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
                </div>
              </div>
            </div>
            <div className={`md:col-span-2 border border-gray-200 rounded p-3 bg-gray-50 ${activeManagerTab === "menu" ? "" : "hidden"}`}>
              <button
                type="button"
                onClick={() => toggleManagerPanel("cooking")}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <div className="font-bold">Traductions des Cuissons</div>
                {openManagerPanels.cooking ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <div
                className={`grid transition-all duration-300 ease-out ${
                  openManagerPanels.cooking ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-gray-200 rounded bg-white">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-black">{"Français"}</th>
                      {activeLanguageCodes
                        .filter((code) => code !== "fr")
                        .map((code) => (
                          <th key={`cook-head-${code}`} className="px-3 py-2 text-left font-black">
                            {languageLabels[code] || DEFAULT_LANGUAGE_LABELS[code] || code.toUpperCase()}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COOKING_TRANSLATION_ORDER.map((cookingKey) => (
                      <tr key={cookingKey} className="border-t border-gray-200">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={cookingTranslations[cookingKey]?.fr || DEFAULT_COOKING_TRANSLATIONS[cookingKey].fr}
                            onChange={(e) =>
                              setCookingTranslations((prev) => ({
                                ...prev,
                                [cookingKey]: { ...(prev[cookingKey] || {}), fr: e.target.value },
                              }))
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        {activeLanguageCodes
                          .filter((code) => code !== "fr")
                          .map((code) => (
                            <td key={`cook-cell-${cookingKey}-${code}`} className="px-3 py-2">
                              <input
                                type="text"
                                value={cookingTranslations[cookingKey]?.[code] || DEFAULT_COOKING_TRANSLATIONS[cookingKey][code] || ""}
                                onChange={(e) =>
                                  setCookingTranslations((prev) => ({
                                    ...prev,
                                    [cookingKey]: { ...(prev[cookingKey] || {}), [code]: e.target.value },
                                  }))
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                {"Traductions manuelles des niveaux de cuisson. Vous pouvez modifier toutes les langues actives ici."}
              </p>
                </div>
              </div>
            </div>
            <div className={`md:col-span-2 border border-gray-200 rounded p-3 bg-gray-50 ${activeManagerTab === "menu" ? "" : "hidden"}`}>
              <button
                type="button"
                onClick={() => toggleManagerPanel("allergens")}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <div className="font-bold">Bibliothèque des Allergènes</div>
                {openManagerPanels.allergens ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <div
                className={`grid transition-all duration-300 ease-out ${
                  openManagerPanels.allergens ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="font-bold">{"Bibliothèque des Allergènes"}</div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newAllergenFr}
                    onChange={(e) => setNewAllergenFr(e.target.value)}
                    placeholder={"Ajouter un allergène (FR)"}
                    className="px-3 py-2 bg-white text-black border border-gray-300 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const nameFr = String(newAllergenFr || "").trim();
                      if (!nameFr) return;
                      if (allergenLibrary.some((row) => normalizeText(row.name_fr) === normalizeText(nameFr))) {
                        return;
                      }
                      setAllergenLibrary((prev) => [
                        ...prev,
                        { id: createLocalId(), name_fr: nameFr, names_i18n: { fr: nameFr } },
                      ]);
                      setNewAllergenFr("");
                    }}
                    className="px-3 py-2 border-2 border-black font-black rounded"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-gray-200 rounded bg-white">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-black">Français</th>
                      {activeLanguageCodes
                        .filter((code) => code !== "fr")
                        .map((code) => (
                          <th key={`allergen-head-${code}`} className="px-3 py-2 text-left font-black">
                            {languageLabels[code] || DEFAULT_LANGUAGE_LABELS[code] || code.toUpperCase()}
                          </th>
                        ))}
                      <th className="px-3 py-2 text-left font-black">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allergenLibrary.map((row, rowIndex) => (
                      <tr key={row.id} className="border-t border-gray-200">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.name_fr}
                            onChange={(e) =>
                              setAllergenLibrary((prev) =>
                                prev.map((item, index) =>
                                  index === rowIndex
                                    ? {
                                        ...item,
                                        name_fr: e.target.value,
                                        names_i18n: { ...(item.names_i18n || {}), fr: e.target.value },
                                      }
                                    : item
                                )
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        {activeLanguageCodes
                          .filter((code) => code !== "fr")
                          .map((code) => (
                            <td key={`allergen-cell-${row.id}-${code}`} className="px-3 py-2">
                              <input
                                type="text"
                                value={row.names_i18n?.[code] || ""}
                                onChange={(e) =>
                                  setAllergenLibrary((prev) =>
                                    prev.map((item, index) =>
                                      index === rowIndex
                                        ? {
                                            ...item,
                                            names_i18n: { ...(item.names_i18n || {}), [code]: e.target.value },
                                          }
                                        : item
                                    )
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            </td>
                          ))}
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => void handleDeleteAllergen(String(row.id))}
                            className="px-2 py-1 border border-red-300 text-red-700 rounded font-bold"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                {"La carte client utilise cette bibliothèque pour afficher les allergènes dans la langue active, avec repli en français."}
              </p>
                </div>
              </div>
            </div>
          </div>
          <div className={`mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 ${activeManagerTab === "stats" ? "" : "hidden"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-lg font-black">Avis & Satisfaction</h3>
                <p className="text-sm text-gray-600">Note moyenne, top plat et derniers commentaires reçus depuis la page feedback.</p>
                <p className="mt-1 text-xs text-gray-500">
                  Les avis sont conservés 7 jours pour garantir une analyse fraîche de votre service.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handlePrintWeeklyReviewsReportPdf()}
                  className="px-3 py-2 border-2 border-black bg-blue-100 font-black rounded"
                >
                  Imprimer le rapport hebdomadaire
                </button>
              </div>
            </div>
            <div className="mb-4 rounded-lg border-2 border-black bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-black text-base">Résumé de l&apos;IA</h4>
                <span className="text-xs font-bold text-gray-500 uppercase">7 derniers jours</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div className="rounded border border-green-200 bg-green-50 p-3">
                  <div className="text-sm font-black text-green-800">Points forts</div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-green-900 space-y-1">
                    {weeklyAiSummary.strengths.map((item, index) => (
                      <li key={`ai-strength-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded border border-amber-200 bg-amber-50 p-3">
                  <div className="text-sm font-black text-amber-900">À surveiller</div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-amber-900 space-y-1">
                    {weeklyAiSummary.watchouts.map((item, index) => (
                      <li key={`ai-watch-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-white border border-gray-200 rounded p-3">
                <div className="text-xs font-bold text-gray-500 uppercase">Note moyenne</div>
                <div className="text-2xl font-black mt-1">{reviewAverage > 0 ? `${reviewAverage}/5` : "-"}</div>
              </div>
              <div className="bg-white border border-gray-200 rounded p-3">
                <div className="text-xs font-bold text-gray-500 uppercase">Nombre total d&apos;avis</div>
                <div className="text-2xl font-black mt-1">{reviews.length}</div>
              </div>
              <div className="bg-white border border-gray-200 rounded p-3">
                <div className="text-xs font-bold text-gray-500 uppercase">Top plat</div>
                <div className="text-sm font-black mt-1">{topReviewedDish ? topReviewedDish.name : "Aucun"}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {topReviewedDish ? `${topReviewedDish.avg}/5 (${topReviewedDish.count} avis)` : ""}
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded p-3">
                <div className="text-xs font-bold text-gray-500 uppercase">Dernier avis</div>
                <div className="text-sm font-bold mt-2">
                  {reviews[0]?.created_at ? new Date(reviews[0].created_at).toLocaleString("fr-FR") : "Aucun"}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-black">Avis Restaurant</h4>
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {restaurantReviews.length === 0 ? (
                    <div className="text-sm text-gray-600 bg-white border border-gray-200 rounded p-3">
                      Aucun avis restaurant pour le moment.
                    </div>
                  ) : (
                    restaurantReviews.map((review) => {
                      const rating = Number(review.rating || 0);
                      return (
                        <div key={String(review.id)} className="bg-white border border-gray-200 rounded p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-black">Restaurant</div>
                            <div className="flex items-center gap-2">
                              {renderReviewStars(rating)}
                              <div className="text-sm font-bold">{rating > 0 ? `${rating}/5` : "-"}</div>
                            </div>
                          </div>
                          {review.comment ? (
                            <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{review.comment}</p>
                          ) : null}
                          <div className="mt-2 text-xs text-gray-500">
                            {review.created_at ? new Date(review.created_at).toLocaleString("fr-FR") : "-"}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-black">Avis sur les Plats</h4>
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {dishReviews.length === 0 ? (
                    <div className="text-sm text-gray-600 bg-white border border-gray-200 rounded p-3">
                      Aucun avis plat pour le moment.
                    </div>
                  ) : (
                    dishReviews.map((review) => {
                      const rating = Number(review.rating || 0);
                      const dishName =
                        String(review.dish?.name_fr || review.dish?.name || "").trim() ||
                        (review.dish_id ? dishNameById.get(String(review.dish_id)) : "") ||
                        "Plat";
                      const dishImage = String(review.dish?.image_url || "").trim();
                      return (
                        <div key={String(review.id)} className="bg-white border border-gray-200 rounded p-3">
                          <div className="flex items-start gap-3">
                            <div className="h-14 w-14 rounded border border-gray-200 bg-gray-100 overflow-hidden shrink-0">
                              {dishImage ? (
                                <img src={dishImage} alt={dishName} className="h-full w-full object-cover" />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="font-black truncate">{dishName}</div>
                                <div className="flex items-center gap-2">
                                  {renderReviewStars(rating)}
                                  <div className="text-sm font-bold">{rating > 0 ? `${rating}/5` : "-"}</div>
                                </div>
                              </div>
                              {review.comment ? (
                                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{review.comment}</p>
                              ) : null}
                              <div className="mt-2 text-xs text-gray-500">
                                {review.created_at ? new Date(review.created_at).toLocaleString("fr-FR") : "-"}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleSaveRestaurant}
            className={`mt-4 bg-black text-white px-4 py-2 font-black border-2 border-black ${activeManagerTab === "appearance" ? "" : "hidden"}`}
          >
            Sauvegarder
          </button>
          <div className={`${activeManagerTab === "security" ? "grid grid-cols-1 xl:grid-cols-3 gap-4" : "hidden"}`}>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Profil</div>
              <h3 className="mt-2 text-lg font-black">Compte manager</h3>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="text-xs font-bold uppercase text-gray-500">Restaurant</div>
                  <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 font-bold">
                    {String(restaurant?.name || restaurantForm.name || "Restaurant").trim() || "Restaurant"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-gray-500">Email</div>
                  <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 font-bold break-all">
                    {managerUserEmail || "Compte connecte via Supabase Auth"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Securite</div>
              <h3 className="mt-2 text-lg font-black">Double authentification</h3>
              <p className="mt-2 text-sm text-gray-600">
                Activez la verification par code email pour exiger un OTP a chaque connexion manager.
              </p>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div>
                  <div className="font-black">Activer la double securite</div>
                  <div className="mt-1 text-sm text-gray-600">
                    {managerOtpEnabled ? "Un code OTP sera demande a la connexion." : "Connexion directe apres le mot de passe."}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={managerOtpEnabled}
                  disabled={managerOtpLoading}
                  onClick={() => void handleToggleManagerOtp(!managerOtpEnabled)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full border-2 transition ${
                    managerOtpEnabled ? "bg-blue-600 border-blue-700" : "bg-gray-300 border-gray-400"
                  } ${managerOtpLoading ? "opacity-60" : ""}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      managerOtpEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              {managerOtpError ? <p className="mt-3 text-sm font-bold text-red-600">{managerOtpError}</p> : null}
              {managerOtpMessage ? <p className="mt-3 text-sm font-bold text-green-700">{managerOtpMessage}</p> : null}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Mot de passe</div>
              <h3 className="mt-2 text-lg font-black">Modifier mon mot de passe</h3>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <div>
                  <label className="block mb-1 font-bold">Ancien mot de passe</label>
                  <input
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        oldPassword: e.target.value,
                      }))
                    }
                    placeholder="Mot de passe actuel"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-black"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder="Minimum 8 caracteres"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-black"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold">Confirmation</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="Ressaisir le mot de passe"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-black"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleUpdateManagerPassword()}
                  disabled={passwordUpdateLoading}
                  className="rounded-xl border-2 border-black bg-black px-4 py-2 font-black text-white disabled:opacity-60"
                >
                  {passwordUpdateLoading ? "Mise a jour..." : "Changer le mot de passe"}
                </button>
                {passwordUpdateError ? <span className="text-sm font-bold text-red-600">{passwordUpdateError}</span> : null}
                {passwordUpdateMessage ? <span className="text-sm font-bold text-green-700">{passwordUpdateMessage}</span> : null}
              </div>
            </div>
          </div>
        </section>
      </div>

      {forceFirstLoginPasswordChange && (
        <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border-2 border-black rounded-xl p-6">
            <h2 className="text-2xl font-black">Sécurité du compte</h2>
            <p className="mt-2 text-sm text-gray-700">
              Première connexion détectée. Saisissez votre mot de passe actuel, puis définissez un nouveau mot de passe pour continuer.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <div>
                <label className="block mb-1 font-bold">Ancien mot de passe</label>
                <input
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      oldPassword: e.target.value,
                    }))
                  }
                  placeholder="Mot de passe actuel"
                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                />
              </div>
              <div>
                <label className="block mb-1 font-bold">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  placeholder="Minimum 8 caractères"
                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                />
              </div>
              <div>
                <label className="block mb-1 font-bold">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  placeholder="Ressaisir le mot de passe"
                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                />
              </div>
            </div>
            {passwordUpdateError ? <p className="mt-3 text-sm font-bold text-red-600">{passwordUpdateError}</p> : null}
            {passwordUpdateMessage ? <p className="mt-3 text-sm font-bold text-green-700">{passwordUpdateMessage}</p> : null}
            <button
              type="button"
              onClick={() => void handleUpdateManagerPassword()}
              disabled={passwordUpdateLoading}
              className="mt-4 w-full px-4 py-2 border-2 border-black bg-black text-white font-black rounded disabled:opacity-60"
            >
              {passwordUpdateLoading ? "Mise à jour..." : "Valider le nouveau mot de passe"}
            </button>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-2 border-black w-full max-w-lg p-6">
            <h3 className="text-2xl font-black mb-4">
              {editingCategoryId ? "Modifier la catégorie" : "Ajouter une catégorie"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={categoryForm.name_fr}
                onChange={(e) => setCategoryForm({ ...categoryForm, name_fr: e.target.value })}
                placeholder="Nom FR"
                className="w-full px-3 py-2 bg-white text-black border border-gray-300"
              />
              <select
                value={categoryForm.destination}
                onChange={(e) => setCategoryForm({ ...categoryForm, destination: normalizeCategoryDestination(e.target.value) })}
                className="w-full px-3 py-2 bg-white text-black border border-gray-300"
              >
                <option value="cuisine">Envoyer vers : Cuisine</option>
                <option value="bar">Envoyer vers : Bar/Caisse</option>
              </select>
              {activeLanguageCodes
                .filter((code) => code !== "fr")
                .map((code) => (
                  <input
                    key={`category-edit-${code}`}
                    type="text"
                    value={categoryFormI18n[code] || ""}
                    onChange={(e) => setCategoryFormI18n((prev) => ({ ...prev, [code]: e.target.value }))}
                    placeholder={`Nom ${code.toUpperCase()}`}
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={handleCreateCategory}
                className="bg-black text-white px-5 py-2 font-black border-2 border-black"
              >
                {editingCategoryId ? "Modifier" : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategoryId(null);
                  setCategoryForm({ name_fr: "", name_en: "", name_es: "", name_de: "", destination: "cuisine" });
                  setCategoryFormI18n({});
                }}
                className="px-5 py-2 font-black border-2 border-black"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showSideModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-2 border-black w-full max-w-lg p-6">
            <h3 className="text-2xl font-black mb-4">Modifier accompagnement</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={sideForm.name_fr}
                onChange={(e) => setSideForm({ ...sideForm, name_fr: e.target.value })}
                placeholder="Nom FR"
                className="w-full px-3 py-2 bg-white text-black border border-gray-300"
              />
              {activeLanguageCodes
                .filter((code) => code !== "fr")
                .map((code) => (
                  <input
                    key={`side-edit-${code}`}
                    type="text"
                    value={sideFormI18n[code] || ""}
                    onChange={(e) => setSideFormI18n((prev) => ({ ...prev, [code]: e.target.value }))}
                    placeholder={`Nom ${code.toUpperCase()}`}
                    className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  />
                ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={handleSaveSide}
                className="bg-black text-white px-5 py-2 font-black border-2 border-black"
              >
                Sauvegarder
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSideModal(false);
                  setEditingSideId(null);
                  setSideForm({ name_fr: "", name_en: "", name_es: "", name_de: "" });
                  setSideFormI18n({});
                }}
                className="px-5 py-2 font-black border-2 border-black"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showDishModal && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border-2 border-black w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 pb-2">
            <h3 className="text-2xl font-black mb-4">
              {editingDish ? "Modifier un plat" : "Ajouter un plat"}
            </h3>
            </div>
            <div className="px-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-bold">Nom français</label>
                <input
                  type="text"
                  value={formData.name_fr}
                  onChange={(e) => setFormData({ ...formData, name_fr: e.target.value })}
                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                />
              </div>
              {false && activeLanguageCodes
                .filter((code) => code !== "fr")
                .map((code) => (
                  <div key={`dish-name-${code}`}>
                    <label className="block mb-1 font-bold">Nom ({code.toUpperCase()})</label>
                    <input
                      type="text"
                      value={
                        formData.name_i18n[code] ||
                        (code === "en" ? formData.name_en : code === "es" ? formData.name_es : code === "de" ? formData.name_de : "")
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ...(code === "en" ? { name_en: e.target.value } : {}),
                          ...(code === "es" ? { name_es: e.target.value } : {}),
                          ...(code === "de" ? { name_de: e.target.value } : {}),
                          name_i18n: { ...formData.name_i18n, [code]: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                    />
                  </div>
                ))}
            <div className={`md:col-span-2 border border-gray-200 rounded p-3 bg-gray-50 ${activeManagerTab === "menu" ? "" : "hidden"}`}>
                <div className="font-bold mb-3">Contenu multilingue (Nom / Description / Suggestion)</div>
                <div className="space-y-2">
                  {activeLanguageCodes.map((code) => {
                    const isFr = code === "fr";
                    const isOpen = !!openDishLanguagePanels[code];
                    const languageTitle = languageLabels[code] || DEFAULT_LANGUAGE_LABELS[code] || code.toUpperCase();
                    const currentName =
                      isFr
                        ? formData.name_fr
                        : formData.name_i18n[code] ||
                          (code === "en" ? formData.name_en : code === "es" ? formData.name_es : code === "de" ? formData.name_de : "");
                    const currentDescription =
                      isFr
                        ? formData.description_fr
                        : formData.description_i18n[code] ||
                          (code === "en"
                            ? formData.description_en
                            : code === "es"
                              ? formData.description_es
                              : code === "de"
                                ? formData.description_de
                                : "");
                    const currentSalesTip = isFr ? formData.sales_tip : String(formData.sales_tip_i18n?.[code] || "").trim();
                    const suggestionPlaceholder = `${getDefaultSuggestionLead(code)} :`;
                    return (
                      <div key={`dish-lang-accordion-${code}`} className="border border-gray-200 rounded bg-white">
                        <button
                          type="button"
                          onClick={() => toggleDishLanguagePanel(code)}
                          className="w-full flex items-center justify-between gap-3 text-left px-3 py-2"
                        >
                          <div className="font-bold">{languageTitle} ({code.toUpperCase()})</div>
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <div className={`grid transition-all duration-300 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                          <div className="overflow-hidden">
                            <div className="px-3 pb-3 grid grid-cols-1 gap-3">
                              <div>
                                <label className="block mb-1 font-bold">{isFr ? "Nom français" : `Nom (${code.toUpperCase()})`}</label>
                                <input
                                  type="text"
                                  value={currentName}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      ...(isFr ? { name_fr: e.target.value } : {}),
                                      ...(code === "en" ? { name_en: e.target.value } : {}),
                                      ...(code === "es" ? { name_es: e.target.value } : {}),
                                      ...(code === "de" ? { name_de: e.target.value } : {}),
                                      name_i18n: isFr ? formData.name_i18n : { ...formData.name_i18n, [code]: e.target.value },
                                    })
                                  }
                                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                                />
                              </div>
                              <div>
                                <label className="block mb-1 font-bold">{isFr ? "Description française" : `Description (${code.toUpperCase()})`}</label>
                                <textarea
                                  value={currentDescription}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      ...(isFr ? { description_fr: e.target.value } : {}),
                                      ...(code === "en" ? { description_en: e.target.value } : {}),
                                      ...(code === "es" ? { description_es: e.target.value } : {}),
                                      ...(code === "de" ? { description_de: e.target.value } : {}),
                                      description_i18n: isFr ? formData.description_i18n : { ...formData.description_i18n, [code]: e.target.value },
                                    })
                                  }
                                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                                  rows={2}
                                />
                              </div>
                              <div>
                                <label className="block mb-1 font-bold">{isFr ? "Message de suggestion" : `Message de suggestion (${code.toUpperCase()})`}</label>
                                <div className="mb-1 text-xs text-gray-500">
                                  Laissez vide pour utiliser automatiquement : {suggestionPlaceholder}
                                </div>
                                <textarea
                                  value={currentSalesTip}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      ...(isFr ? { sales_tip: e.target.value } : {}),
                                      sales_tip_i18n: isFr ? formData.sales_tip_i18n : { ...(formData.sales_tip_i18n || {}), [code]: e.target.value },
                                    })
                                  }
                                  placeholder={suggestionPlaceholder}
                                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                                  rows={2}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block mb-1 font-bold">Prix (&euro;)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                />
              </div>
              <div>
                <label className="block mb-1 font-bold">Prix promo (&euro;)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.promo_price}
                  onChange={(e) => setFormData({ ...formData, promo_price: e.target.value })}
                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  placeholder={formData.is_promo ? "Obligatoire si PROMO" : "Activez PROMO pour saisir un prix"}
                  disabled={!formData.is_promo}
                  required={formData.is_promo}
                />
              </div>
              <div>
                <label className="block mb-1 font-bold">Catégorie</label>
                <select
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData({ ...formData, category_id: e.target.value, subcategory_id: "" })
                  }
                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                >
                  <option value="">--</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={String(cat.id)}>
                      {getCategoryLabel(cat)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 font-bold">Sous-catégorie</label>
                <select
                  value={formData.subcategory_id}
                  onChange={(e) => setFormData({ ...formData, subcategory_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                >
                  <option value="">--</option>
                  {subCategoryRows
                    .filter((row) => String(row.category_id) === String(formData.category_id))
                    .map((sub) => (
                    <option key={sub.id} value={String(sub.id)}>
                      {sub.name_fr}
                    </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 font-bold">Niveau de faim</label>
                <select
                  value={formData.hunger_level}
                  onChange={(e) => setFormData({ ...formData, hunger_level: e.target.value })}
                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                >
                  <option value="">--</option>
                  {HUNGER_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 hidden">
                <label className="block mb-1 font-bold">Description française</label>
                <textarea
                  value={formData.description_fr}
                  onChange={(e) => setFormData({ ...formData, description_fr: e.target.value })}
                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  rows={3}
                />
              </div>
              {false && activeLanguageCodes
                .filter((code) => code !== "fr")
                .map((code) => (
                  <div key={`dish-description-${code}`} className="md:col-span-2">
                    <label className="block mb-1 font-bold">Description ({code.toUpperCase()})</label>
                    <textarea
                      value={
                        formData.description_i18n[code] ||
                        (code === "en"
                          ? formData.description_en
                          : code === "es"
                            ? formData.description_es
                            : code === "de"
                              ? formData.description_de
                              : "")
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ...(code === "en" ? { description_en: e.target.value } : {}),
                          ...(code === "es" ? { description_es: e.target.value } : {}),
                          ...(code === "de" ? { description_de: e.target.value } : {}),
                          description_i18n: { ...formData.description_i18n, [code]: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                      rows={2}
                    />
                  </div>
                ))}
              <div className="md:col-span-2 hidden">
                <label className="block mb-1 font-bold">Conseil / Suggestion de vente</label>
                <textarea
                  value={formData.sales_tip}
                  onChange={(e) => setFormData({ ...formData, sales_tip: e.target.value })}
                  placeholder={"Ex: Ce vin de Bourgogne se marie à merveille avec cette côte de bœuf !"}
                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                  rows={2}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block mb-1 font-bold">{"Produit conseillé (optionnel)"}</label>
                <select
                  value={formData.sales_tip_dish_id}
                  onChange={(e) => setFormData({ ...formData, sales_tip_dish_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                >
                  <option value="">Aucun lien</option>
                  {dishes
                    .filter((dish) => !editingDish || String(dish.id) !== String(editingDish.id))
                    .map((dish) => (
                      <option key={`tip-link-${dish.id}`} value={String(dish.id || "")}>
                        {dish.name_fr || dish.name || `Plat #${dish.id}`} - {formatEuro(Number(dish.price || 0))}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 font-bold">Image du plat</label>
                <p className="mb-2 text-xs text-gray-600">Format recommandé : 4:3 ou 1:1 (Carré). Taille conseillée : 800x600px. Assurez-vous que le plat est centré.</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await handleDishImageUpload(file);
                  }}
                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                />
                {isUploadingImage && (
                  <div className="text-sm font-bold text-black mt-2">Upload en cours...</div>
                )}
                {(imagePreviewUrl || formData.image_url) && (
                  <img
                    src={imagePreviewUrl || formData.image_url}
                      alt="Prévisualisation"
                    className="mt-2 h-24 w-32 object-cover border border-gray-300 rounded" style={{ aspectRatio: "4 / 3" }}
                  />
                )}
              </div>
              <div>
                <label className="block mb-1 font-bold">Calories min</label>
                <input
                  type="number"
                  value={formData.calories_min}
                  onChange={(e) => setFormData({ ...formData, calories_min: e.target.value })}
                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                />
              </div>
              <div>
                <label className="block mb-1 font-bold">Calories max</label>
                <input
                  type="number"
                  value={formData.calories_max}
                  onChange={(e) => setFormData({ ...formData, calories_max: e.target.value })}
                  className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block mb-1 font-bold">Allergènes</label>
                <div className="flex flex-wrap gap-3">
                  {(allergenLibrary.length > 0 ? allergenLibrary.map((row) => row.name_fr) : ALLERGEN_OPTIONS).map((allergen) => {
                    const current = formData.allergens
                      ? formData.allergens.split(",").map((a) => a.trim()).filter(Boolean)
                      : [];
                    const checked = current.includes(allergen);
                    return (
                      <label key={allergen} className="flex items-center gap-2 text-black font-bold">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...current, allergen]
                              : current.filter((a) => a !== allergen);
                            setFormData({ ...formData, allergens: next.join(", ") });
                          }}
                        />
                        {allergen}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-black font-bold">
                  <input
                    type="checkbox"
                    checked={formData.has_sides}
                    onChange={(e) => setFormData({ ...formData, has_sides: e.target.checked })}
                  />
                  Proposer accompagnements
                </label>
                <label className="flex items-center gap-2 text-black font-bold">
                  <input
                    type="checkbox"
                    checked={formData.ask_cooking}
                    onChange={(e) => setFormData({ ...formData, ask_cooking: e.target.checked })}
                  />
                  Demander la cuisson ?
                </label>
                <div className="flex items-center gap-2 text-black font-bold">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.allow_multi_select}
                      onChange={(e) => setFormData({ ...formData, allow_multi_select: e.target.checked })}
                    />
                    Autoriser la sélection multiple
                  </label>
                  <span
                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center self-center text-gray-500 cursor-help"
                    title="Si coché, le client pourra sélectionner plusieurs suppléments ou options. Si décoché, il ne pourra en choisir qu'un seul (boutons radio)."
                    aria-label="Aide sélection multiple"
                  >
                    <CircleHelp className="h-4 w-4" />
                  </span>
                </div>
                <label className="flex items-center gap-2 text-black font-bold">
                  <input
                    type="checkbox"
                    checked={formData.is_vegetarian_badge}
                    onChange={(e) => setFormData({ ...formData, is_vegetarian_badge: e.target.checked })}
                  />
                  Végétarien
                </label>
                <label className="flex items-center gap-2 text-black font-bold">
                  <input
                    type="checkbox"
                    checked={formData.is_spicy_badge}
                    onChange={(e) => setFormData({ ...formData, is_spicy_badge: e.target.checked })}
                  />
                  Piment?
                </label>
                <label className="flex items-center gap-2 text-black font-bold">
                  <input
                    type="checkbox"
                    checked={formData.is_new_badge}
                    onChange={(e) => setFormData({ ...formData, is_new_badge: e.target.checked })}
                  />
                  Nouveau
                </label>
                <label className="flex items-center gap-2 text-black font-bold">
                  <input
                    type="checkbox"
                    checked={formData.is_gluten_free_badge}
                    onChange={(e) => setFormData({ ...formData, is_gluten_free_badge: e.target.checked })}
                  />
                  Sans Gluten
                </label>
                <label className="flex items-center gap-2 text-black font-bold">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.is_suggestion || formData.is_chef_suggestion)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_suggestion: e.target.checked,
                        is_chef_suggestion: e.target.checked,
                      })
                    }
                  />
                  Suggestion du Chef
                </label>
                <label className="flex items-center gap-2 text-black font-bold">
                  <input
                    type="checkbox"
                    checked={formData.is_daily_special}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_daily_special: e.target.checked,
                      })
                    }
                  />
                  Plat du Jour
                </label>
                <label className="flex items-center gap-2 text-black font-bold">
                  <input
                    type="checkbox"
                    checked={formData.is_promo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_promo: e.target.checked,
                        promo_price: e.target.checked ? formData.promo_price : "",
                      })
                    }
                  />
                  Badge PROMO
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block mb-1 font-bold">Accompagnements disponibles</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto border border-gray-200 rounded p-2 bg-white">
                  {sidesLibrary.map((side) => (
                    <label key={side.id} className="flex items-center gap-2 text-black font-bold px-2 py-1 rounded hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.selected_side_ids.some(
                          (id) => String(id) === String(side.id)
                        )}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selected_side_ids: [...formData.selected_side_ids, side.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selected_side_ids: formData.selected_side_ids.filter(
                                (id) => String(id) !== String(side.id)
                              ),
                            });
                          }
                        }}
                      />
                      {side.name_fr}
                    </label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 border border-gray-200 rounded p-3 bg-white">
                <label className="block mb-2 font-bold">Options / Variantes</label>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                  <div className="md:col-span-2">
                    <label className="block mb-1 text-sm font-bold">Nom FR</label>
                    <input
                      type="text"
                      value={productOptionDraft.name}
                      onChange={(e) => setProductOptionDraft((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                      placeholder="Ex: Verre, Bouteille, Grand format..."
                    />
                  </div>
                  {activeLanguageCodes
                    .filter((code) => code !== "fr")
                    .map((code) => (
                      <div key={`product-option-name-${code}`}>
                        <label className="block mb-1 text-sm font-bold">Nom {code.toUpperCase()}</label>
                        <input
                          type="text"
                          value={productOptionDraft.names_i18n?.[code] || productOptionDraft.names_i18n?.[normalizeLanguageKey(code)] || ""}
                          onChange={(e) =>
                            setProductOptionDraft((prev) => ({
                              ...prev,
                              names_i18n: { ...(prev.names_i18n || {}), [normalizeLanguageKey(code)]: e.target.value },
                            }))
                          }
                          className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                          placeholder={`Nom ${code.toUpperCase()}`}
                        />
                      </div>
                    ))}
                  <div className="md:col-span-2">
                    <label className="block mb-1 text-sm font-bold">Prix (&euro;)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={productOptionDraft.price_override}
                      onChange={(e) => setProductOptionDraft((prev) => ({ ...prev, price_override: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                      placeholder="Optionnel (ex: 0 ou 2.00)"
                    />
                  </div>
                  <div className="md:col-span-6">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddProductOptionToDish}
                        className="px-4 py-2 border-2 border-black font-black"
                      >
                        {editingProductOptionId ? "Valider la modification" : "Ajouter la variante"}
                      </button>
                      {editingProductOptionId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProductOptionId(null);
                            setProductOptionDraft({ name: "", price_override: "", names_i18n: {} });
                          }}
                          className="px-4 py-2 border border-gray-400 font-bold"
                        >
                          Annuler édition
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 border border-gray-200 rounded">
                  {(formData.product_options || []).map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 border-b border-gray-200 last:border-b-0"
                    >
                      <div className="text-sm">
                        <span className="font-bold">{option.name_fr || option.name}</span>
                        {Number(option.price_override || 0) > 0 ? (
                          <span className="font-bold"> (+{Number(option.price_override || 0).toFixed(2)} {"\u20AC"})</span>
                        ) : null}
                        <span className="text-gray-600">
                          {" | "}
                          {activeLanguageCodes
                            .filter((code) => code !== "fr")
                            .map((code) => {
                              const normalizedCode = normalizeLanguageKey(code);
                              const fallbackToken = parseI18nToken(String(option.name_en || ""));
                              const value =
                                option.names_i18n?.[normalizedCode] ||
                                fallbackToken[normalizedCode] ||
                                (normalizedCode === "en"
                                  ? option.name_en
                                  : normalizedCode === "es"
                                    ? option.name_es
                                    : normalizedCode === "de"
                                      ? option.name_de
                                      : "") ||
                                "-";
                              return `${code.toUpperCase()}: ${value}`;
                            })
                            .join(" | ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditProductOptionInDish(option)}
                          className="text-black font-black border border-black rounded w-7 h-7 leading-5"
                          title="Modifier"
                          aria-label={`Modifier la variante ${option.name}`}
                        >
                          <Pencil className="mx-auto h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveProductOptionFromDish(option.id)}
                          className="text-red-600 font-black border border-red-600 rounded w-7 h-7 leading-5"
                          title="Supprimer"
                          aria-label={`Supprimer la variante ${option.name}`}
                        >
                          <Trash2 className="mx-auto h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(formData.product_options || []).length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-600">Aucune variante ajoutée.</div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 border border-gray-200 rounded p-3 bg-white">
                <label className="block mb-2 font-bold">Suppléments</label>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                  <div className="md:col-span-2">
                    <label className="block mb-1 text-sm font-bold">Nom FR</label>
                    <input
                      type="text"
                      value={dishExtraDraft.name_fr}
                      onChange={(e) => setDishExtraDraft((prev) => ({ ...prev, name_fr: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                      placeholder="Ex: fromage"
                    />
                  </div>
                  {activeLanguageCodes
                    .filter((code) => code !== "fr")
                    .map((code) => (
                      <div key={`extra-name-${code}`}>
                        <label className="block mb-1 text-sm font-bold">Nom {code.toUpperCase()}</label>
                        <input
                          type="text"
                          value={
                            dishExtraDraft.names_i18n?.[code] ||
                            (code === "en" ? dishExtraDraft.name_en : code === "es" ? dishExtraDraft.name_es : code === "de" ? dishExtraDraft.name_de : "")
                          }
                          onChange={(e) =>
                            setDishExtraDraft((prev) => ({
                              ...prev,
                              ...(code === "en" ? { name_en: e.target.value } : {}),
                              ...(code === "es" ? { name_es: e.target.value } : {}),
                              ...(code === "de" ? { name_de: e.target.value } : {}),
                              names_i18n: { ...(prev.names_i18n || {}), [code]: e.target.value },
                            }))
                          }
                          className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                        />
                      </div>
                    ))}
                  <div>
                    <label className="block mb-1 text-sm font-bold">Prix (&euro;)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={dishExtraDraft.price}
                      onChange={(e) => setDishExtraDraft((prev) => ({ ...prev, price: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-black border border-gray-300"
                    />
                  </div>
                  <div className="md:col-span-6">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddExtraToDish}
                        className="px-4 py-2 border-2 border-black font-black"
                      >
                        {editingExtraId ? "Valider la modification" : "Ajouter au plat"}
                      </button>
                      {editingExtraId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExtraId(null);
                            setEditingExtraOriginKey(null);
                            setDishExtraDraft({ name_fr: "", name_en: "", name_es: "", name_de: "", names_i18n: {}, price: "" });
                          }}
                          className="px-4 py-2 border border-gray-400 font-bold"
                        >
                          Annuler édition
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 border border-gray-200 rounded">
                  {formData.extras_list.map((extra) => (
                    <div
                      key={extra.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 border-b border-gray-200 last:border-b-0"
                    >
                      <div className="text-sm">
                        <span className="font-bold">{extra.name_fr}</span>
                        {activeLanguageCodes
                          .filter((code) => code !== "fr")
                          .map((code) => (
                            <span key={`extra-preview-${extra.id}-${code}`} className="text-gray-600">
                              {" "} | {code.toUpperCase()}: {extra.names_i18n?.[code] || (code === "en" ? extra.name_en : code === "es" ? extra.name_es : code === "de" ? extra.name_de : "") || "-"}
                            </span>
                          ))}
                        {Number(extra.price || 0) > 0 ? (
                          <span className="font-bold"> (+{formatEuro(Number(extra.price || 0))})</span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditExtraInDish(extra)}
                          className="text-black font-black border border-black rounded w-7 h-7 leading-5"
                          title="Modifier"
                          aria-label={`Modifier le supplément ${extra.name_fr}`}
                        >
                          <Pencil className="mx-auto h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveExtraFromDish(extra.id)}
                          className="text-red-600 font-black border border-red-600 rounded w-7 h-7 leading-5"
                          title="Supprimer"
                          aria-label={`Supprimer le supplément ${extra.name_fr}`}
                        >
                          <Trash2 className="mx-auto h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {formData.extras_list.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-600">Aucun supplément ajout?.</div>
                  )}
                </div>
              </div>
            </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t-2 border-black px-6 py-4 flex gap-3">
              <button
                onClick={handleSave}
                className="bg-black text-white px-5 py-2 font-black border-2 border-black"
              >
                {editingDish ? "Modifier" : "Créer"}
              </button>
              <button
                onClick={() => {
                  setShowDishModal(false);
                  resetForm();
                }}
                className="px-5 py-2 font-black border-2 border-black"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <iframe
        ref={printFrameRef}
        title="impression-carte"
        className="fixed pointer-events-none opacity-0 w-0 h-0 border-0"
        aria-hidden="true"
      />

      {showDeleteModal && dishToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-2 border-black w-full max-w-md p-6">
            <h3 className="text-xl font-black mb-3">Supprimer le plat</h3>
            <p className="mb-4">
              Êtes-vous sûr de vouloir supprimer <strong>{dishToDelete.name}</strong> ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmDeleteDish}
                className="bg-red-600 text-white px-4 py-2 font-black border-2 border-black"
              >
                Supprimer
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDishToDelete(null);
                }}
                className="px-4 py-2 font-black border-2 border-black"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}













