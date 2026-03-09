export type CoreUiLang = "fr" | "en" | "es" | "de";

export type CookingKey = "bleu" | "saignant" | "a_point" | "bien_cuit";

export const LANGUAGE_CATALOG = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "he", label: "עברית", flag: "🇮🇱" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "sv", label: "Svenska", flag: "🇸🇪" },
  { code: "da", label: "Dansk", flag: "🇩🇰" },
  { code: "no", label: "Norsk", flag: "🇳🇴" },
  { code: "fi", label: "Suomi", flag: "🇫🇮" },
  { code: "el", label: "Ελληνικά", flag: "🇬🇷" },
  { code: "cs", label: "Čeština", flag: "🇨🇿" },
  { code: "ro", label: "Română", flag: "🇷🇴" },
  { code: "hu", label: "Magyar", flag: "🇭🇺" },
  { code: "uk", label: "Українська", flag: "🇺🇦" },
  { code: "bg", label: "Български", flag: "🇧🇬" },
  { code: "hr", label: "Hrvatski", flag: "🇭🇷" },
  { code: "sr", label: "Српски", flag: "🇷🇸" },
  { code: "sk", label: "Slovenčina", flag: "🇸🇰" },
  { code: "sl", label: "Slovenščina", flag: "🇸🇮" },
  { code: "lt", label: "Lietuvių", flag: "🇱🇹" },
  { code: "lv", label: "Latviešu", flag: "🇱🇻" },
  { code: "et", label: "Eesti", flag: "🇪🇪" },
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", label: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "bn", label: "বাংলা", flag: "🇧🇩" },
  { code: "ur", label: "اردو", flag: "🇵🇰" },
  { code: "fa", label: "فارسی", flag: "🇮🇷" },
] as const;

export const DEFAULT_LANGUAGE_LABELS: Record<string, string> = Object.fromEntries(
  LANGUAGE_CATALOG.map((entry) => [entry.code, entry.label])
);

export const DEFAULT_LANGUAGE_FLAGS: Record<string, string> = Object.fromEntries(
  LANGUAGE_CATALOG.map((entry) => [entry.code, entry.flag])
);

export const COOKING_LABELS_BY_LANG: Record<string, Record<CookingKey, string>> = {
  fr: {
    bleu: "Bleu",
    saignant: "Saignant",
    a_point: "À point",
    bien_cuit: "Bien cuit",
  },
  en: {
    bleu: "Blue",
    saignant: "Rare",
    a_point: "Medium",
    bien_cuit: "Well done",
  },
  es: {
    bleu: "Poco hecho",
    saignant: "Poco cocido",
    a_point: "En su punto",
    bien_cuit: "Bien cocido",
  },
  de: {
    bleu: "Sehr blutig",
    saignant: "Blutig",
    a_point: "Medium",
    bien_cuit: "Durchgebraten",
  },
};

function normalizeLookupText(raw: unknown) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function normalizeCookingKey(raw: unknown): CookingKey | "" {
  const value = normalizeLookupText(raw).replace(/-/g, " ");
  if (!value) return "";
  if (value === "blue" || value === "bleu" || value === "very rare") return "bleu";
  if (value === "rare" || value === "saignant" || value === "blutig" || value === "poco cocido") return "saignant";
  if (value === "medium" || value === "a point" || value === "a_point" || value === "en su punto") return "a_point";
  if (value === "well done" || value === "bien cuit" || value === "durchgebraten" || value === "bien cocido") {
    return "bien_cuit";
  }
  return "";
}

export function getCookingLabelByLang(langCode: string, key: CookingKey | "") {
  if (!key) return "";
  const lang = String(langCode || "fr").toLowerCase();
  const byLang = COOKING_LABELS_BY_LANG[lang] || COOKING_LABELS_BY_LANG.fr;
  return byLang[key] || COOKING_LABELS_BY_LANG.fr[key];
}

export function getCookingLabelFr(raw: unknown) {
  const key = normalizeCookingKey(raw);
  if (!key) return String(raw || "").trim();
  return COOKING_LABELS_BY_LANG.fr[key];
}

function normalizeTranslationLookup(raw: unknown) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeTargetLang(lang: unknown) {
  const code = String(lang || "fr").toLowerCase().trim();
  return (code.split("-")[0] || "fr") as string;
}

const ALLERGEN_FALLBACKS: Record<string, Record<string, string>> = {
  gluten: { fr: "Gluten", en: "Gluten", es: "Gluten", de: "Gluten" },
  crustaces: { fr: "Crustacés", en: "Crustaceans", es: "Crustáceos", de: "Krebstiere" },
  eggs: { fr: "Œufs", en: "Eggs", es: "Huevos", de: "Eier" },
  oeufs: { fr: "Œufs", en: "Eggs", es: "Huevos", de: "Eier" },
  fish: { fr: "Poisson", en: "Fish", es: "Pescado", de: "Fisch" },
  poisson: { fr: "Poisson", en: "Fish", es: "Pescado", de: "Fisch" },
  peanuts: { fr: "Arachides", en: "Peanuts", es: "Cacahuetes", de: "Erdnüsse" },
  arachides: { fr: "Arachides", en: "Peanuts", es: "Cacahuetes", de: "Erdnüsse" },
  soja: { fr: "Soja", en: "Soy", es: "Soja", de: "Soja" },
  soy: { fr: "Soja", en: "Soy", es: "Soja", de: "Soja" },
  milk: { fr: "Lait", en: "Milk", es: "Leche", de: "Milch" },
  lait: { fr: "Lait", en: "Milk", es: "Leche", de: "Milch" },
  nuts: { fr: "Fruits à coque", en: "Nuts", es: "Frutos de cáscara", de: "Schalenfrüchte" },
  sesame: { fr: "Sésame", en: "Sesame", es: "Sésamo", de: "Sesam" },
  sesame_seed: { fr: "Sésame", en: "Sesame", es: "Sésamo", de: "Sesam" },
  mustard: { fr: "Moutarde", en: "Mustard", es: "Mostaza", de: "Senf" },
  moutarde: { fr: "Moutarde", en: "Mustard", es: "Mostaza", de: "Senf" },
  celery: { fr: "Céleri", en: "Celery", es: "Apio", de: "Sellerie" },
  celeri: { fr: "Céleri", en: "Celery", es: "Apio", de: "Sellerie" },
  sulphites: { fr: "Sulfites", en: "Sulphites", es: "Sulfitos", de: "Sulfite" },
  sulfites: { fr: "Sulfites", en: "Sulphites", es: "Sulfitos", de: "Sulfite" },
  lupin: { fr: "Lupin", en: "Lupin", es: "Altramuces", de: "Lupinen" },
  molluscs: { fr: "Mollusques", en: "Molluscs", es: "Moluscos", de: "Weichtiere" },
  mollusques: { fr: "Mollusques", en: "Molluscs", es: "Moluscos", de: "Weichtiere" },
};

const SPICY_LEVEL_FALLBACKS: Record<string, Record<string, string>> = {
  mild: { fr: "Léger", en: "Mild", es: "Suave", de: "Mild" },
  light: { fr: "Léger", en: "Mild", es: "Suave", de: "Mild" },
  medium: { fr: "Moyen", en: "Medium", es: "Medio", de: "Mittel" },
  hot: { fr: "Épicé", en: "Hot", es: "Picante", de: "Scharf" },
  spicy: { fr: "Épicé", en: "Spicy", es: "Picante", de: "Würzig" },
  very_spicy: { fr: "Très épicé", en: "Very spicy", es: "Muy picante", de: "Sehr scharf" },
  tres_epice: { fr: "Très épicé", en: "Very spicy", es: "Muy picante", de: "Sehr scharf" },
};

const HUNGER_LEVEL_FALLBACKS: Record<string, Record<string, string>> = {
  small: { fr: "Petite faim", en: "Light", es: "Ligero", de: "Leicht" },
  medium: { fr: "Faim moyenne", en: "Medium", es: "Medio", de: "Mittel" },
  large: { fr: "Grande faim", en: "Hearty", es: "Grande", de: "Großer Hunger" },
};

export function translateAllergenFallback(value: string, lang: string) {
  const key = normalizeTranslationLookup(value)
    .replace(/&/g, " and ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, "_");
  const langCode = normalizeTargetLang(lang);
  const match = ALLERGEN_FALLBACKS[key] || ALLERGEN_FALLBACKS[key.replace(/_/g, "")];
  return (match && (match[langCode] || match.fr)) || String(value || "").trim();
}

export function translateSpicyLevelFallback(value: string, lang: string) {
  const key = normalizeTranslationLookup(value).replace(/\s+/g, "_");
  const langCode = normalizeTargetLang(lang);
  const match = SPICY_LEVEL_FALLBACKS[key];
  return (match && (match[langCode] || match.fr)) || String(value || "").trim();
}

export function translateHungerLevelFallback(level: string, lang: string) {
  const key = normalizeTranslationLookup(level).replace(/\s+/g, "_");
  const langCode = normalizeTargetLang(lang);
  const match = HUNGER_LEVEL_FALLBACKS[key];
  return (match && (match[langCode] || match.fr)) || String(level || "").trim();
}

export type UiLabelKey =
  | "cart"
  | "callServer"
  | "total"
  | "order"
  | "addToCart"
  | "sidesLabel"
  | "extrasLabel"
  | "cookingLabel"
  | "specialRequestLabel"
  | "quantity"
  | "noDishes"
  | "emptyCart";

export type UiLabels = Record<UiLabelKey, string>;

export const UI_BASE_FR: UiLabels = {
  cart: "Panier",
  callServer: "Appeler serveur",
  total: "Total",
  order: "Commander",
  addToCart: "Ajouter au panier",
  sidesLabel: "Accompagnements",
  extrasLabel: "Suppléments",
  cookingLabel: "Cuisson",
  specialRequestLabel: "Précisions",
  quantity: "Quantité",
  noDishes: "Aucun plat disponible",
  emptyCart: "Votre panier est vide",
};

export const UI_LABELS_BY_LANG: Record<string, UiLabels> = {
  fr: { ...UI_BASE_FR },
  en: {
    cart: "Cart",
    callServer: "Call waiter",
    total: "Total",
    order: "Order",
    addToCart: "Add to cart",
    sidesLabel: "Sides",
    extrasLabel: "Extras",
    cookingLabel: "Cooking",
    specialRequestLabel: "Notes",
    quantity: "Quantity",
    noDishes: "No dishes available",
    emptyCart: "Your cart is empty",
  },
  es: {
    cart: "Carrito",
    callServer: "Llamar al camarero",
    total: "Total",
    order: "Pedir",
    addToCart: "Añadir al carrito",
    sidesLabel: "Guarniciones",
    extrasLabel: "Suplementos",
    cookingLabel: "Cocción",
    specialRequestLabel: "Indicaciones",
    quantity: "Cantidad",
    noDishes: "No hay platos disponibles",
    emptyCart: "Tu carrito está vacío",
  },
  de: {
    cart: "Warenkorb",
    callServer: "Service rufen",
    total: "Gesamt",
    order: "Bestellen",
    addToCart: "In den Warenkorb",
    sidesLabel: "Beilagen",
    extrasLabel: "Extras",
    cookingLabel: "Garstufe",
    specialRequestLabel: "Hinweise",
    quantity: "Menge",
    noDishes: "Keine Gerichte verfügbar",
    emptyCart: "Ihr Warenkorb ist leer",
  },
  it: {
    cart: "Carrello",
    callServer: "Chiama il cameriere",
    total: "Totale",
    order: "Ordina",
    addToCart: "Aggiungi al carrello",
    sidesLabel: "Contorni",
    extrasLabel: "Extra",
    cookingLabel: "Cottura",
    specialRequestLabel: "Note",
    quantity: "Quantità",
    noDishes: "Nessun piatto disponibile",
    emptyCart: "Il tuo carrello è vuoto",
  },
  pt: {
    cart: "Carrinho",
    callServer: "Chamar garçom",
    total: "Total",
    order: "Pedir",
    addToCart: "Adicionar ao carrinho",
    sidesLabel: "Acompanhamentos",
    extrasLabel: "Extras",
    cookingLabel: "Cozimento",
    specialRequestLabel: "Observações",
    quantity: "Quantidade",
    noDishes: "Nenhum prato disponível",
    emptyCart: "Seu carrinho está vazio",
  },
};

export function getUiLabels(languageCode: string): UiLabels {
  const code = String(languageCode || "").toLowerCase();
  return UI_LABELS_BY_LANG[code] || UI_LABELS_BY_LANG.fr;
}

export async function translateUiTermsForLanguage(baseFr: Record<string, string>, targetLanguageCode: string) {
  const code = String(targetLanguageCode || "").trim().toLowerCase();
  if (!code || code === "fr") return { ...baseFr };
  const translated: Record<string, string> = {};
  const entries = Object.entries(baseFr);
  for (const [key, value] of entries) {
    const source = String(value || "").trim();
    if (!source) continue;
    try {
      const endpoint =
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=${encodeURIComponent(code)}&dt=t&q=${encodeURIComponent(source)}`;
      const response = await fetch(endpoint);
      if (!response.ok) {
        translated[key] = source;
        continue;
      }
      const payload = (await response.json()) as unknown;
      if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
        translated[key] = source;
        continue;
      }
      const result = (payload[0] as unknown[])
        .map((entry) => (Array.isArray(entry) ? String(entry[0] || "") : ""))
        .join("")
        .trim();
      translated[key] = result || source;
    } catch {
      translated[key] = source;
    }
  }
  return translated;
}
