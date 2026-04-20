import {
  DEFAULT_LANGUAGE_FLAGS as SHARED_LANGUAGE_FLAGS,
  DEFAULT_LANGUAGE_LABELS as SHARED_LANGUAGE_LABELS,
} from "../ui-translations";

export const PRICE_FORMATTER_EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function parsePriceNumber(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? Number(raw.toFixed(2)) : 0;
  }
  const text = String(raw).trim();
  if (!text) return 0;
  const cleaned = text.replace(/\s+/g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return 0;
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(2));
}

export function parseAddonPrice(raw: unknown): number {
  const parsed = parsePriceNumber(raw);
  return parsed > 0 ? parsed : 0;
}

export function parseVariantPrice(raw: unknown): number | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;
  const parsed = parsePriceNumber(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatPriceTwoDecimals(value: number): string {
  const safe = parsePriceNumber(value);
  return `${safe.toFixed(2)} \u20AC`;
}

export const supabaseUrl = "https://ezzetspsjqgylsqkukdp.supabase.co";
export const supabaseKey = "sb_publishable_ckJLAlKTmQN1KJw4m2Bk9A_k2Aij-Xd";
export const BACKGROUND_URL = "";
export const ALLERGEN_MAP: Record<string, string> = {
  A1: "Gluten",
  A2: "Crustacés",
  A3: "Œufs",
  A4: "Poissons",
  A5: "Arachides",
  A6: "Soja",
  A7: "Lait",
  A8: "Fruits à coque",
  A9: "Céleri",
  A10: "Moutarde",
  A11: "Sésame",
  A12: "Sulfites",
  A13: "Lupin",
  A14: "Mollusques",
};
export const DEFAULT_RESTAURANT_NAME = "Mon Restaurant";
export const SETTINGS_ROW_ID = "c9012859-d0af-469d-8dbb-af9dee733aaa";

export const DEFAULT_LANGUAGE_LABELS: Record<string, string> = SHARED_LANGUAGE_LABELS;
export const DEFAULT_LANGUAGE_FLAGS: Record<string, string> = SHARED_LANGUAGE_FLAGS;
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

export const MENU_FONT_OPTIONS = [
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
