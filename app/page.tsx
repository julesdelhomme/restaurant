
"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import { AlertTriangle, CheckCircle2, CircleHelp, Droplets, Euro, Globe, Moon, PhoneCall, Receipt, ShoppingCart, Sun, Trash2, XCircle } from "lucide-react";
import RestaurantOffline from "./components/RestaurantOffline";
import {
  DEFAULT_LANGUAGE_FLAGS as SHARED_LANGUAGE_FLAGS,
  DEFAULT_LANGUAGE_LABELS as SHARED_LANGUAGE_LABELS,
  getCookingLabelFr,
  normalizeCookingKey,
  translateAllergenFallback,
  translateHungerLevelFallback,
  translateSpicyLevelFallback,
} from "./lib/ui-translations";
import { SMART_CALL_I18N_EXTENDED } from "./lib/languagesConfig";
import { MASTER_UI_DICTIONARY } from "../constants/translations";
const UI_TRANSLATIONS = MASTER_UI_DICTIONARY;
const PRICE_FORMATTER_EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function parsePriceNumber(raw: unknown): number {
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

function parseAddonPrice(raw: unknown): number {
  const parsed = parsePriceNumber(raw);
  return parsed > 0 ? parsed : 0;
}

function formatPriceTwoDecimals(value: number): string {
  const safe = parsePriceNumber(value);
  return `${safe.toFixed(2)} \u20AC`;
}

const supabaseUrl = "https://ezzetspsjqgylsqkukdp.supabase.co";
const supabaseKey = "sb_publishable_ckJLAlKTmQN1KJw4m2Bk9A_k2Aij-Xd";
const BACKGROUND_URL = "";
const DEFAULT_RESTAURANT_NAME = "Mon Restaurant";
const SETTINGS_ROW_ID = "c9012859-d0af-469d-8dbb-af9dee733aaa";

type CoreUiLang = "fr" | "en" | "es" | "de";

const DEFAULT_LANGUAGE_LABELS: Record<string, string> = SHARED_LANGUAGE_LABELS;
const DEFAULT_LANGUAGE_FLAGS: Record<string, string> = SHARED_LANGUAGE_FLAGS;
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

type SmartCallOptionKey =
  | "help_question"
  | "ask_bill"
  | "need_water"
  | "need_bread"
  | "clear_table"
  | "report_problem";

const SMART_CALL_UI = SMART_CALL_I18N_EXTENDED;

const SMART_CALL_OPTION_META: Array<{
  key: SmartCallOptionKey;
  icon: typeof CircleHelp;
  colorClass: string;
}> = [
  { key: "help_question", icon: CircleHelp, colorClass: "text-blue-600" },
  { key: "ask_bill", icon: Receipt, colorClass: "text-purple-600" },
  { key: "need_water", icon: Droplets, colorClass: "text-cyan-600" },
  { key: "need_bread", icon: CircleHelp, colorClass: "text-amber-600" },
  { key: "clear_table", icon: Trash2, colorClass: "text-gray-700" },
  { key: "report_problem", icon: AlertTriangle, colorClass: "text-red-600" },
];

const SERVER_CALL_THROTTLE_MS = 60_000;
const LAST_SERVER_CALL_STORAGE_KEY = "last_server_call";

function getServerCallCooldownText(secondsLeft: number) {
  const safeSeconds = Math.max(1, Math.ceil(secondsLeft));
  return `Attendez ${safeSeconds}s`;
}

const UI_TEXT = {
  fr: {
    categories: ["Tous", "Entrées", "Plats", "Desserts", "Boissons"],
    labels: {
      all: "Tous",
      others: "Autres",
      order_success: "Votre commande a été envoyée avec succès. Votre plat va bientôt arriver. Bon appétit.",
      order_confirmed: "Votre commande a été envoyée avec succès. Votre plat va bientôt arriver. Bon appétit.",
      order_success_message: "Votre commande a été envoyée avec succès ! Table {table}. Bon appétit !",
      consultation_mode_banner: "La commande se fait auprès de votre serveur. Utilisez ce menu pour découvrir nos plats !",
      validation_code_prompt: "Saisissez le code PIN de votre table pour valider la commande.",
      validation_code_label: "Code PIN",
      validation_code_placeholder: "Code PIN",
      validation_code_invalid: "Code PIN incorrect.",
      table_required: "Veuillez renseigner votre table.",
      table_invalid: "Numéro de table invalide.",
      empty_cart_error: "Votre panier est vide.",
      side_required_error: "Veuillez choisir un accompagnement obligatoire.",
      cooking_required_error: "Veuillez choisir une cuisson.",
      max_options_error: "Maximum {max} options.",
      server_called_success: "Serveur appelé !",
      generic_error: "Erreur.",
      supabase_error_prefix: "Erreur Supabase :",
      item_added: "Article ajouté !",
      added: "Ajouté au panier",
      details_label: "Précisions",
      details_none: "Aucune demande particulière.",
      pin_required_cart: "Renseignez la table et le code PIN avant d'ajouter un article.",
      loading: "Chargement...",
      featured_daily: "Plat du Jour",
      featured_chef: "Suggestion du Chef",
      sales_advice_title: "Conseil du Chef",
      sales_advice_view_item: "Voir l'article",
      vegetarian: "Végétarien",
      spicy: "Pimenté",
      select_sides_up_to: "Choisissez jusqu'à {max} choix",
      select_sides_up_to_icecream: "Choisissez jusqu'à {max} parfums",
      no_side_configured: "Aucun accompagnement configuré pour ce plat.",
      formulas: "Formules",
      available_in_formula: "Disponible en formule",
      view_formula: "Voir la formule",
      formula_name: "Nom de la formule",
      formula_image: "Image de la formule",
      view_formula_offer: "Voir l'offre en formule",
      order_in_formula: "Commander en formule",
      item_details: "Détails de l'article",
      formula_option_locked: "Supplément indisponible en formule",
    },
    categoryMap: {
      all: "Tous",
      tous: "Tous",
      entree: "Entrées",
      entrees: "Entrées",
      plats: "Plats",
      plat: "Plats",
      dessert: "Desserts",
      desserts: "Desserts",
      boisson: "Boissons",
      boissons: "Boissons",
      starters: "Entrées",
      mains: "Plats",
      drinks: "Boissons",
    },
    subcategoryMap: {
      autres: "Autres",
      other: "Autres",
      others: "Autres",
    },
    addToCart: "Ajouter au panier",
    cart: "Panier",
    total: "Total",
    order: "Commander",
    backToMenu: "Retour au menu",
    menu: "Menu",
    callServer: "Appeler le serveur",
    help: "Besoin d'aide ?",
    categoriesTitle: "Catégories",
    close: "Fermer",
    quantity: "Quantité",
    emptyCart: "Votre panier est vide.",
    noDishes: "Aucun plat disponible.",
    specialRequestLabel: "Demande spéciale",
    specialRequestPlaceholder: "Ex : sans oignons, sauce à part...",
    sidesLabel: "Accompagnements",
    allergensLabel: "Allerg&egrave;nes",
    extraLabel: "Supplément",
    extrasLabel: "Suppléments",
    table: "Table",
    pin: "Code PIN",
    yourTable: "Votre Table",
    pinCode: "Code PIN",
    hunger: {
      small: "Petite faim",
      medium: "Moyenne faim",
      large: "Grande faim",
    },
    cookingLabel: "Cuisson",
    cooking: {
      blue: "Bleu",
      rare: "Saignant",
      medium: "À point",
      wellDone: "Bien cuit",
    },
  },
  en: {
    categories: ["All", "Starters", "Mains", "Desserts", "Drinks"],
    labels: {
      all: "All",
      others: "Others",
      order_success: "Your order has been sent successfully. Your dish will arrive soon. Enjoy your meal.",
      order_confirmed: "Your order has been sent successfully. Your dish will arrive soon. Enjoy your meal.",
      order_success_message: "Your order has been sent successfully! Table {table}. Enjoy your meal!",
      consultation_mode_banner: "Please order directly with your server. Use this menu to discover our dishes!",
      validation_code_prompt: "Enter your table PIN code to confirm the order.",
      validation_code_label: "PIN code",
      validation_code_placeholder: "PIN code",
      validation_code_invalid: "Invalid PIN code.",
      table_required: "Please enter your table number.",
      table_invalid: "Invalid table number.",
      empty_cart_error: "Your cart is empty.",
      side_required_error: "Please choose a required side.",
      cooking_required_error: "Please choose a cooking level.",
      max_options_error: "Maximum {max} options.",
      server_called_success: "Server called!",
      generic_error: "Error.",
      supabase_error_prefix: "Supabase error:",
      item_added: "Item added!",
      added: "Added to cart",
      details_label: "Details",
      details_none: "No special request.",
      pin_required_cart: "Enter table number and a valid PIN code before adding an item.",
      loading: "Loading...",
      featured_daily: "Dish of the Day",
      featured_chef: "Chef Suggestion",
      sales_advice_title: "Chef's recommendation",
      sales_advice_view_item: "View item",
      vegetarian: "Vegetarian",
      spicy: "Spicy",
      select_sides_up_to: "Choose up to {max} options",
      select_sides_up_to_icecream: "Choose up to {max} flavors",
      no_side_configured: "No side configured for this dish.",
      formulas: "Menus",
      available_in_formula: "Available in formula",
      view_formula: "View menu",
      formula_name: "Formula name",
      formula_image: "Formula image",
      view_formula_offer: "View formula offer",
      order_in_formula: "Order as set menu",
      item_details: "Item details",
      formula_option_locked: "Extra not available in set menu",
    },
    categoryMap: {
      all: "All",
      tous: "All",
      entree: "Starters",
      entrees: "Starters",
      plats: "Mains",
      plat: "Mains",
      dessert: "Desserts",
      desserts: "Desserts",
      boisson: "Drinks",
      boissons: "Drinks",
      starters: "Starters",
      mains: "Mains",
      drinks: "Drinks",
    },
    subcategoryMap: {
      autres: "Others",
      other: "Others",
      others: "Others",
    },
    addToCart: "Add to cart",
    cart: "Cart",
    total: "Total",
    order: "Order",
    backToMenu: "Back to menu",
    menu: "Menu",
    callServer: "Call the server",
    help: "Need help?",
    categoriesTitle: "Categories",
    close: "Close",
    quantity: "Quantity",
    emptyCart: "Your cart is empty.",
    noDishes: "No dishes available.",
    specialRequestLabel: "Special request",
    specialRequestPlaceholder: "Ex: no onions, sauce on the side...",
    sidesLabel: "Sides",
    allergensLabel: "Allergens",
    extraLabel: "Extra",
    extrasLabel: "Extras",
    table: "Table",
    pin: "PIN code",
    yourTable: "Your Table",
    pinCode: "PIN Code",
    hunger: {
      small: "Small appetite",
      medium: "Medium appetite",
      large: "Large appetite",
    },
    cookingLabel: "Cooking",
    cooking: {
      blue: "Blue",
      rare: "Rare",
      medium: "Medium",
      wellDone: "Well done",
    },
  },
  es: {
    categories: ["Todos", "Entrantes", "Platos", "Postres", "Bebidas"],
    labels: {
      all: "Todos",
      others: "Otros",
      order_success: "Tu pedido se ha enviado con éxito. Tu plato llegará pronto. Buen provecho.",
      order_confirmed: "Tu pedido se ha enviado con éxito. Tu plato llegará pronto. Buen provecho.",
      order_success_message: "¡Tu pedido se ha enviado con éxito! Mesa {table}. ¡Buen provecho!",
      consultation_mode_banner: "El pedido se realiza con su camarero. ¡Use este menú para descubrir nuestros platos!",
      validation_code_prompt: "Introduzca el código PIN de su mesa para validar el pedido.",
      validation_code_label: "Código PIN",
      validation_code_placeholder: "Código PIN",
      validation_code_invalid: "Código PIN incorrecto.",
      table_required: "Indique su número de mesa.",
      table_invalid: "Número de mesa inválido.",
      empty_cart_error: "Tu carrito está vacío.",
      side_required_error: "Seleccione un acompañamiento obligatorio.",
      cooking_required_error: "Seleccione un punto de cocción.",
      max_options_error: "Máximo {max} opciones.",
      server_called_success: "¡Camarero avisado!",
      generic_error: "Error.",
      supabase_error_prefix: "Error de Supabase:",
      item_added: "¡Artículo añadido!",
      added: "Añadido al carrito",
      details_label: "Detalles",
      details_none: "Sin petición especial.",
      pin_required_cart: "Indique mesa y código PIN válido antes de añadir un artículo.",
      loading: "Cargando...",
      featured_daily: "Plato del Día",
      featured_chef: "Sugerencia del Chef",
      sales_advice_title: "Consejo del chef",
      sales_advice_view_item: "Ver artículo",
      vegetarian: "Vegetariano",
      spicy: "Picante",
      select_sides_up_to: "Elige hasta {max} opciones",
      select_sides_up_to_icecream: "Elige hasta {max} sabores",
      no_side_configured: "No hay acompañamiento configurado para este plato.",
      formulas: "Menús",
      available_in_formula: "Disponible en fórmula",
      view_formula: "Ver el menú",
      formula_name: "Nombre de la fórmula",
      formula_image: "Imagen de la fórmula",
      view_formula_offer: "Ver la oferta en fórmula",
      order_in_formula: "Pedir en menú",
      item_details: "Detalles del artículo",
      formula_option_locked: "Suplemento no disponible en el menú",
    },
    categoryMap: {
      all: "Todos",
      todos: "Todos",
      entree: "Entrantes",
      entrees: "Entrantes",
      platos: "Platos",
      plat: "Platos",
      dessert: "Postres",
      desserts: "Postres",
      boisson: "Bebidas",
      boissons: "Bebidas",
      starters: "Entrantes",
      mains: "Platos",
      drinks: "Bebidas",
    },
    subcategoryMap: {
      autres: "Otros",
      other: "Otros",
      others: "Otros",
    },
    addToCart: "Añadir al carrito",
    cart: "Carrito",
    total: "Total",
    order: "Pedir",
    backToMenu: "Volver al menú",
    menu: "Menú",
    callServer: "Llamar al camarero",
    help: "¿Necesitas ayuda?",
    categoriesTitle: "Categorías",
    close: "Cerrar",
    quantity: "Cantidad",
    emptyCart: "Tu carrito está vacío.",
    noDishes: "No hay platos disponibles.",
    specialRequestLabel: "Petición especial",
    specialRequestPlaceholder: "Ej: sin cebolla, salsa aparte...",
    sidesLabel: "Acompañamientos",
    allergensLabel: "Alérgenos",
    extraLabel: "Suplemento",
    extrasLabel: "Suplementos",
    table: "Mesa",
    pin: "Código PIN",
    yourTable: "Su Mesa",
    pinCode: "Código PIN",
    hunger: {
      small: "Poca hambre",
      medium: "Hambre media",
      large: "Mucha hambre",
    },
    cookingLabel: "Cocción",
    cooking: {
      blue: "Poco hecho",
      rare: "Poco cocido",
      medium: "En su punto",
      wellDone: "Bien cocido",
    },
  },
  de: {
    categories: ["Alle", "Vorspeisen", "Hauptgerichte", "Desserts", "Getränke"],
    labels: {
      all: "Alle",
      others: "Andere",
      order_success: "Ihre Bestellung wurde erfolgreich gesendet. Ihr Gericht kommt bald. Guten Appetit.",
      order_confirmed: "Ihre Bestellung wurde erfolgreich gesendet. Ihr Gericht kommt bald. Guten Appetit.",
      order_success_message: "Ihre Bestellung wurde erfolgreich gesendet! Tisch {table}. Guten Appetit!",
      consultation_mode_banner: "Bestellen Sie bitte direkt beim Service. Nutzen Sie dieses Menü, um unsere Gerichte zu entdecken!",
      validation_code_prompt: "Geben Sie den PIN-Code Ihres Tisches ein, um die Bestellung zu bestätigen.",
      validation_code_label: "PIN-Code",
      validation_code_placeholder: "PIN-Code",
      validation_code_invalid: "Ungültiger PIN-Code.",
      table_required: "Bitte geben Sie Ihre Tischnummer ein.",
      table_invalid: "Ungültige Tischnummer.",
      empty_cart_error: "Ihr Warenkorb ist leer.",
      side_required_error: "Bitte wählen Sie eine Beilage aus.",
      cooking_required_error: "Bitte wählen Sie eine Garstufe.",
      max_options_error: "Maximal {max} Optionen.",
      server_called_success: "Service gerufen!",
      generic_error: "Fehler.",
      supabase_error_prefix: "Supabase-Fehler:",
      item_added: "Artikel hinzugefügt!",
      added: "In den Warenkorb",
      details_label: "Details",
      details_none: "Keine besondere Anfrage.",
      pin_required_cart: "Geben Sie Tischnummer und gültigen PIN-Code ein, bevor Sie einen Artikel hinzufügen.",
      loading: "Wird geladen...",
      featured_daily: "Tagesgericht",
      featured_chef: "Empfehlung des Chefs",
      sales_advice_title: "Empfehlung des Küchenchefs",
      sales_advice_view_item: "Artikel ansehen",
      vegetarian: "Vegetarisch",
      spicy: "Scharf",
      select_sides_up_to: "Wählen Sie bis zu {max} Optionen",
      select_sides_up_to_icecream: "Wählen Sie bis zu {max} Sorten",
      no_side_configured: "Keine Beilage für dieses Gericht konfiguriert.",
      formulas: "Menüs",
      available_in_formula: "In Formel verfügbar",
      view_formula: "Menü ansehen",
      formula_name: "Formelname",
      formula_image: "Formelbild",
      view_formula_offer: "Formelangebot ansehen",
      order_in_formula: "Als Menü bestellen",
      item_details: "Artikeldetails",
      formula_option_locked: "Aufpreis im Menü nicht verfügbar",
    },
    categoryMap: {
      all: "Alle",
      tous: "Alle",
      entree: "Vorspeisen",
      entrees: "Vorspeisen",
      plat: "Hauptgerichte",
      plats: "Hauptgerichte",
      dessert: "Desserts",
      desserts: "Desserts",
      boisson: "Getränke",
      boissons: "Getränke",
      starters: "Vorspeisen",
      mains: "Hauptgerichte",
      drinks: "Getränke",
    },
    subcategoryMap: {
      autres: "Andere",
      other: "Andere",
      others: "Andere",
    },
    addToCart: "In den Warenkorb",
    cart: "Warenkorb",
    total: "Summe",
    order: "Bestellen",
    backToMenu: "Zurück zum Menü",
    menu: "Menü",
    callServer: "Service rufen",
    help: "Hilfe benötigt?",
    categoriesTitle: "Kategorien",
    close: "Schließen",
    quantity: "Menge",
    emptyCart: "Ihr Warenkorb ist leer.",
    noDishes: "Keine Gerichte verfügbar.",
    specialRequestLabel: "Besonderer Wunsch",
    specialRequestPlaceholder: "Z.B. ohne Zwiebeln, Sauce extra...",
    sidesLabel: "Beilagen",
    allergensLabel: "Allergene",
    extraLabel: "Extra",
    extrasLabel: "Extras",
    table: "Tisch",
    pin: "PIN-Code",
    yourTable: "Ihr Tisch",
    pinCode: "PIN-Code",
    hunger: {
      small: "Kleiner Hunger",
      medium: "Mittlerer Hunger",
      large: "Großer Hunger",
    },
    cookingLabel: "Garstufe",
    cooking: {
      blue: "Sehr blutig",
      rare: "Blutig",
      medium: "Medium",
      wellDone: "Durchgebraten",
    },
  },
} as const;
const CATEGORY_KEYS = ["all", "entree", "plat", "dessert", "boisson"] as const;
const FORMULAS_CATEGORY_ID = "__formulas__";
const FORMULA_DIRECT_SEND_SEQUENCE = 4;

function normalizeCategory(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const DAY_KEY_ALIASES: Record<string, string[]> = {
  sun: ["0", "7", "sun", "sunday", "dim", "dimanche"],
  mon: ["1", "mon", "monday", "lun", "lundi"],
  tue: ["2", "tue", "tues", "tuesday", "mar", "mardi"],
  wed: ["3", "wed", "weds", "wednesday", "mer", "mercredi"],
  thu: ["4", "thu", "thur", "thurs", "thursday", "jeu", "jeudi"],
  fri: ["5", "fri", "friday", "ven", "vendredi"],
  sat: ["6", "sat", "saturday", "sam", "samedi"],
};

function normalizeDayKey(value: unknown): string | null {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  for (const [key, aliases] of Object.entries(DAY_KEY_ALIASES)) {
    if (aliases.includes(raw)) return key;
  }
  return null;
}

function parseAvailableDays(value: unknown): string[] {
  if (!value) return [];
  const rawList: Array<unknown> = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? (() => {
          const trimmed = value.trim();
          if (!trimmed) return [];
          if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
              const parsed = JSON.parse(trimmed);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          }
          if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            return trimmed
              .slice(1, -1)
              .split(",")
              .map((entry) => entry.replace(/\"/g, "").trim())
              .filter(Boolean);
          }
          return trimmed.split(",").map((entry) => entry.trim()).filter(Boolean);
        })()
      : [];
  const normalized = rawList
    .map((entry) => normalizeDayKey(entry))
    .filter((entry): entry is string => Boolean(entry));
  return Array.from(new Set(normalized));
}

function parseTimeToMinutes(value: unknown): number | null {
  if (value == null) return null;
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parts = raw.split(":");
  if (parts.length < 2) return null;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const safeHours = Math.min(23, Math.max(0, Math.trunc(hours)));
  const safeMinutes = Math.min(59, Math.max(0, Math.trunc(minutes)));
  return safeHours * 60 + safeMinutes;
}

function toBooleanFlag(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "y" || normalized === "on";
  }
  return false;
}

function isWithinTimeWindow(nowMinutes: number, startMinutes: number | null, endMinutes: number | null): boolean {
  if (startMinutes == null && endMinutes == null) return true;
  if (startMinutes != null && endMinutes != null) {
    if (startMinutes <= endMinutes) {
      return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
    }
    return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
  }
  if (startMinutes != null) return nowMinutes >= startMinutes;
  if (endMinutes != null) return nowMinutes <= endMinutes;
  return true;
}

function fixDisplayText(value: string) {
  let output = String(value || "");
  const replacements: Array<[string, string]> = [
    ["\u00C3\u00A9", "\u00E9"],
    ["\u00C3\u00A8", "\u00E8"],
    ["\u00C3\u00AA", "\u00EA"],
    ["\u00C3\u00AB", "\u00EB"],
    ["\u00C3\u00A7", "\u00E7"],
    ["\u00C3\u00A0", "\u00E0"],
    ["\u00C3\u00A2", "\u00E2"],
    ["\u00C3\u00B4", "\u00F4"],
    ["\u00C3\u00BB", "\u00FB"],
    ["\u00C3\u00AE", "\u00EE"],
    ["\u00C3\u00B9", "\u00F9"],
    ["\u00C3\u00A1", "\u00E1"],
    ["\u00C3\u00B3", "\u00F3"],
    ["\u00C3\u00BA", "\u00FA"],
    ["\u00C3\u00B1", "\u00F1"],
    ["\u00C3\u00BC", "\u00FC"],
    ["\u00C3\u00A4", "\u00E4"],
    ["\u00C3\u00B6", "\u00F6"],
    ["\u00C3\u0178", "\u00DF"],
    ["\u00C3\u20AC", "\u00C0"],
    ["\u00C2\u00A1", "\u00A1"],
    ["\u00C2\u00BF", "\u00BF"],
    ["\u00E2\u201A\u00AC", "\u20AC"],
    ["\u00C3\u2014", "\u00D7"],
  ];
  replacements.forEach(([from, to]) => {
    output = output.split(from).join(to);
  });
  const decodeMojibakeOnce = (input: string) => {
    const bytes = Uint8Array.from(Array.from(input).map((ch) => ch.charCodeAt(0) & 0xff));
    return new TextDecoder("utf-8").decode(bytes);
  };
  for (let i = 0; i < 2; i += 1) {
    if (!/[\u00C3]/.test(output)) break;
    const decoded = decodeMojibakeOnce(output);
    if (!decoded || decoded === output) break;
    output = decoded;
  }
  return output;
}

function deepFixDisplayText<T>(value: T): T {
  if (typeof value === "string") {
    return fixDisplayText(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => deepFixDisplayText(entry)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as unknown as any).map(([key, entry]) => [key, deepFixDisplayText(entry)])
    ) as T;
  }
  return value;
}

const UI_TEXT_CLEAN = deepFixDisplayText(UI_TEXT);

function normalizeHexColor(value: unknown, fallback: string) {
  const raw = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback;
}

function sanitizeMediaUrl(value: unknown, fallbackBucket?: string) {
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
  const storageMarker = "storage/v1/object/public/";
  if (normalized.startsWith(storageMarker)) {
    return `${supabaseUrl}/${normalized}`;
  }
  if (normalized.startsWith("object/public/")) {
    return `${supabaseUrl}/storage/v1/${normalized}`;
  }
  const markerIndex = normalized.indexOf(storageMarker);
  if (markerIndex >= 0) {
    return `${supabaseUrl}/${normalized.slice(markerIndex)}`;
  }
  const knownBuckets = ["logos", "banners", "dishes-images-", "dishes-images"];
  if (knownBuckets.some((bucket) => normalized.startsWith(`${bucket}/`))) {
    return `${supabaseUrl}/storage/v1/object/public/${normalized}`;
  }
  if (fallbackBucket) {
    return `${supabaseUrl}/storage/v1/object/public/${fallbackBucket}/${normalized}`;
  }
  return raw;
}

function normalizeBackgroundOpacity(value: unknown, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed > 1 && parsed <= 100) return Math.max(0, Math.min(1, parsed / 100));
  return Math.max(0, Math.min(1, parsed));
}

function normalizeOpacityPercent(value: unknown, fallback = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed >= 0 && parsed <= 1) return Math.max(0, Math.min(100, Math.round(parsed * 100)));
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function getHexContrastTextColor(backgroundHex: string) {
  const hex = normalizeHexColor(backgroundHex, "#FFFFFF").slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.55 ? "#FFFFFF" : "#111111";
}

function withAlpha(hexColor: string, alphaHex: string) {
  return `${normalizeHexColor(hexColor, "#FFFFFF")}${alphaHex}`;
}

function alphaHexFromPercent(percent: unknown, fallback = 100) {
  const parsed = Number(percent);
  const clamped = Number.isFinite(parsed) ? Math.min(100, Math.max(0, Math.round(parsed))) : fallback;
  return Math.round((clamped / 100) * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
}

function t(lang: string, key: keyof (typeof UI_TEXT)["fr"]["labels"]) {
  const uiLang = toUiLang(lang);
  return fixDisplayText(UI_TEXT_CLEAN[uiLang].labels[key] || String(key));
}

type UiDictionary = Record<string, string>;
type UiTranslationsByLang = Record<string, UiDictionary>;

const RTL_LANGUAGE_CODES = new Set(["ar", "he", "fa", "ur"]);
const ENABLE_RESTAURANT_PROFILE_FALLBACK = false;

function parseUiTranslations(raw: unknown): UiTranslationsByLang {
  const source = parseJsonObject(raw);
  const parsed: UiTranslationsByLang = {};
  Object.entries(source).forEach(([rawCode, value]) => {
    const code = normalizeLanguageKey(rawCode);
    if (!code || !value || typeof value !== "object") return;
    const dict = Object.fromEntries(
      Object.entries(value as unknown as any)
        .map(([k, v]) => [String(k || "").trim(), String(v || "").trim()])
        .filter(([k, v]) => k.length > 0 && v.length > 0)
    ) as UiDictionary;
    if (Object.keys(dict).length > 0) parsed[code] = dict;
  });
  return parsed;
}

function buildRuntimeUiText(
  base: (typeof UI_TEXT)[keyof typeof UI_TEXT],
  flatTranslations: UiDictionary
): (typeof UI_TEXT)["fr"] {
  const normalizeUiLabelToken = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const translateKnownDbLabel = (rawValue: string) => {
    const normalized = normalizeUiLabelToken(rawValue);
    const canonicalKey =
      normalized === "precision" || normalized === "precisions"
        ? "precision"
        : normalized === "supplement" || normalized === "supplements"
        ? "supplements"
        : normalized === "cuisson"
        ? "cooking"
        : normalized === "accompagnement" || normalized === "accompagnements"
        ? "sideDish"
        : normalized === "kcal"
        ? "kcal"
        : "";

    if (!canonicalKey) return "";
    const translated =
      String(flatTranslations[canonicalKey] || "").trim() ||
      (canonicalKey === "sideDish" ? String(flatTranslations.sidesLabel || "").trim() : "") ||
      (canonicalKey === "supplements" ? String(flatTranslations.extrasLabel || "").trim() : "") ||
      (canonicalKey === "precision" ? String(flatTranslations.specialRequestLabel || "").trim() : "") ||
      (canonicalKey === "cooking" ? String(flatTranslations.cookingLabel || "").trim() : "");
    return translated ? fixDisplayText(translated) : "";
  };

  const pick = (key: string, fallback: string) => {
    const value = String(flatTranslations[key] || "").trim();
    if (value) {
      const mappedValue = translateKnownDbLabel(value);
      return mappedValue || fixDisplayText(value);
    }
    const mappedFallback = translateKnownDbLabel(fallback);
    return mappedFallback || fixDisplayText(fallback);
  };
  const pickAlias = (primaryKey: string, aliasKeys: string[], fallback: string) => {
    for (const key of [primaryKey, ...aliasKeys]) {
      const value = String(flatTranslations[key] || "").trim();
      if (value) {
        const mappedValue = translateKnownDbLabel(value);
        return mappedValue || fixDisplayText(value);
      }
    }
    const mappedFallback = translateKnownDbLabel(fallback);
    return mappedFallback || fixDisplayText(fallback);
  };

  const mergedLabels = { ...base.labels } as Record<keyof typeof base.labels, string>;
  (Object.keys(base.labels) as Array<keyof typeof base.labels>).forEach((labelKey) => {
    mergedLabels[labelKey] = pick(`labels.${String(labelKey)}`, base.labels[labelKey]);
  });
  mergedLabels.all = pickAlias("labels.all", ["categories.all", "all"], base.labels.all);

  const merged = {
    ...base,
    categories: [
      pickAlias("categories.all", ["labels.all", "all"], base.categories[0]),
      pick("categories.starters", base.categories[1]),
      pick("categories.mains", base.categories[2]),
      pick("categories.desserts", base.categories[3]),
      pick("categories.drinks", base.categories[4]),
    ],
    labels: mergedLabels,
    addToCart: pick("addToCart", base.addToCart),
    cart: pick("cart", base.cart),
    total: pick("total", base.total),
    order: pick("order", base.order),
    backToMenu: pick("backToMenu", base.backToMenu),
    menu: pick("menu", base.menu),
    callServer: pick("callServer", base.callServer),
    help: pick("help", base.help),
    categoriesTitle: pickAlias("categoriesTitle", ["categories.title", "categories.header"], base.categoriesTitle),
    close: pick("close", base.close),
    quantity: pickAlias("quantity", [], base.quantity),
    kcal: pickAlias("kcal", [], "kcal"),
    emptyCart: pick("emptyCart", base.emptyCart),
    noDishes: pick("noDishes", base.noDishes),
    specialRequestLabel: pickAlias("specialRequestLabel", ["precision"], base.specialRequestLabel),
    specialRequestPlaceholder: pickAlias(
      "specialRequestPlaceholder",
      ["precisionExample", "special_request_placeholder"],
      base.specialRequestPlaceholder
    ),
    precision: pickAlias("precision", ["specialRequestLabel"], base.specialRequestLabel),
    precisionExample: pickAlias("precisionExample", ["specialRequestPlaceholder"], base.specialRequestPlaceholder),
    optionsAndVariants: pickAlias("optionsAndVariants", ["options_variants"], "Options / Variantes"),
    itemTotal: pickAlias("itemTotal", ["item_total"], "Total article"),
    sidesLabel: pickAlias("sidesLabel", ["sideDish"], base.sidesLabel),
    sideDish: pickAlias("sideDish", ["sidesLabel"], base.sidesLabel),
    allergensLabel: pickAlias("allergensLabel", ["allergens"], base.allergensLabel),
    extraLabel: pick("extraLabel", base.extraLabel),
    extrasLabel: pickAlias("extrasLabel", ["supplements"], base.extrasLabel),
    supplements: pickAlias("supplements", ["extrasLabel"], base.extrasLabel),
    table: pick("table", base.table),
    pin: pick("pin", base.pin),
    yourTable: pickAlias("yourTable", [], base.yourTable),
    pinCode: pick("pinCode", base.pinCode),
    cookingLabel: pickAlias("cookingLabel", ["cooking"], base.cookingLabel),
    cookingText: pickAlias("cooking", ["cookingLabel"], base.cookingLabel),
    hunger: {
      small: pickAlias("hunger.small", ["smallHunger"], base.hunger.small),
      medium: pickAlias("hunger.medium", ["mediumHunger"], base.hunger.medium),
      large: pickAlias("hunger.large", ["bigHunger"], base.hunger.large),
    },
    cooking: {
      blue: pick("cooking.blue", base.cooking.blue),
      rare: pick("cooking.rare", base.cooking.rare),
      medium: pick("cooking.medium", base.cooking.medium),
      wellDone: pick("cooking.wellDone", base.cooking.wellDone),
    },
  };
  return merged as unknown as typeof UI_TEXT["fr"];
}

interface Dish {
  id: number | string;
  name: string;
  nom?: string;
  name_fr?: string;
  name_en?: string;
  name_es?: string;
  name_de?: string;
  name_el?: string;
  name_nl?: string;
  name_pl?: string;
  name_ro?: string;
  name_zh?: string;
  name_ko?: string;
  name_ru?: string;
  name_ar?: string;
  name_gr?: string;
  name_cn?: string;
  name_kr?: string;
  description?: string;
  description_fr?: string;
  description_en?: string;
  description_es?: string;
  description_de?: string;
  description_el?: string;
  description_nl?: string;
  description_pl?: string;
  description_ro?: string;
  description_zh?: string;
  description_ko?: string;
  description_ru?: string;
  description_ar?: string;
  description_gr?: string;
  description_cn?: string;
  description_kr?: string;
  price: number;
  category_id?: string | number | null;
  subcategory_id?: string | number | null;
  selected_sides?: Array<string | number> | null;
  image_url?: string;
  is_available?: boolean;
  dietary_tag?: string;
  dietary_tags?: string[];
  allergens?: string;
  is_vegetarian?: boolean;
  is_spicy?: boolean;
  spicy_level?: string | null;
  has_sides?: boolean;
  max_options?: number | null;
  has_extras?: boolean;
  allow_multi_select?: boolean | null;
  ask_cooking?: boolean;
  calories_min?: number | null;
  calories_max?: number | null;
  calories?: number | string | null;
  suggestion_message?: string | null;
  is_featured?: boolean | null;
  is_special?: boolean | null;
  is_chef_suggestion?: boolean | null;
  is_daily_special?: boolean | null;
  is_promo?: boolean | null;
  formula_price?: number | null;
  is_formula?: boolean | null;
  formula_category_ids?: Array<string | number> | null;
  only_in_formula?: boolean | null;
  formula_id?: string | number | null;
    promo_price?: number | null;
    is_suggestion?: boolean | null;
    available_days?: string[] | string | null;
    start_time?: string | null;
    end_time?: string | null;
    dish_options?: ExtrasItem[];
  product_options?: ProductOptionItem[];
  translations?: Record<string, unknown> | string | null;
}

interface ProductOptionItem {
  id?: string;
  product_id?: string | number;
  name: string;
  name_fr?: string | null;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
  names_i18n?: Record<string, string> | string | null;
  price_override?: number | null;
}

interface SuggestionRule {
  from_category_id: string;
  to_category_id: string;
}

interface Restaurant {
  id?: number;
  name?: string;
  logo_url?: string;
  banner_image_url?: string | null;
  banner_url?: string | null;
  background_url?: string;
  background_image_url?: string | null;
  primary_color?: string | null;
  text_color?: string | null;
  card_bg_color?: string | null;
  card_bg_opacity?: number | null;
  card_text_color?: string | null;
  card_transparent?: boolean | null;
  cards_transparent?: boolean | null;
  font_family?: string | null;
  card_style?: string | null;
  card_density?: string | null;
  density_style?: string | null;
  bg_opacity?: number | null;
  menu_layout?: string | null;
  card_layout?: string | null;
  settings?: Record<string, unknown> | string | null;
  table_config?: Record<string, unknown> | string | null;
  show_calories?: boolean | string | number | null;
  enabled_languages?: string[] | string | null;
  priority_display?: string | null;
}

function normalizeLanguageKey(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

function parseEnabledLanguageEntries(raw: unknown): { codes: string[]; labels: Record<string, string> } {
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
  const withDefaults = values.length > 0 ? values : ["fr::Fran\u00e7ais", "en::English"];
  withDefaults.forEach((entryRaw) => {
    const entry = String(entryRaw || "").trim();
    if (!entry) return;
    const sepIndex = entry.indexOf("::");
    const rawCode = sepIndex >= 0 ? entry.slice(0, sepIndex).trim() : entry;
    const rawLabel = sepIndex >= 0 ? entry.slice(sepIndex + 2).trim() : entry;
    const code = normalizeLanguageKey(rawCode) || normalizeLanguageKey(rawLabel);
    if (!code) return;
    if (!orderedCodes.includes(code)) orderedCodes.push(code);
    labels[code] = rawLabel || labels[code] || code.toUpperCase();
  });
  if (!orderedCodes.includes("fr")) orderedCodes.unshift("fr");
  labels.fr = labels.fr || "Fran\u00e7ais";
  return { codes: orderedCodes, labels };
}

function getLanguageFlag(code: string) {
  return DEFAULT_LANGUAGE_FLAGS[code] || "GL";
}

function parseJsonObject(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as unknown as any) : {};
    } catch {
      return {};
    }
  }
  return raw && typeof raw === "object" ? (raw as unknown as any) : {};
}

const toSafeString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

function getNameTranslation(source: Record<string, unknown>, langCode: string) {
  const lang = normalizeLanguageKey(langCode);
  const nameFr = toSafeString(source.name_fr);
  if (!lang || lang === "fr") {
    if (nameFr) return nameFr;
  }
  const encodedToken = toSafeString(source.name_en);
  if (encodedToken.startsWith("__I18N__:")) {
    try {
      const parsed = JSON.parse(decodeURIComponent(encodedToken.replace("__I18N__:", ""))) as unknown as any;
      const dynamic = toSafeString(parsed[lang]);
      if (dynamic) return dynamic;
      const dynamicFr = toSafeString(parsed.fr);
      if (dynamicFr) return dynamicFr;
    } catch {
      // ignore malformed token
    }
  }
  const directColumnValue = source[`name_${lang}`];
  const directColumn = toSafeString(directColumnValue);
  if (directColumn) {
    if (directColumn.startsWith("__I18N__:")) {
      try {
        const parsed = JSON.parse(decodeURIComponent(directColumn.replace("__I18N__:", ""))) as unknown as any;
        const dynamic = toSafeString(parsed[lang]);
        if (dynamic) return dynamic;
        const fallback = toSafeString(parsed.fr);
        if (fallback) return fallback;
      } catch {
        // ignore malformed token
      }
    } else {
      return directColumn;
    }
  }
  const translations = parseJsonObject(source.translations);
  const nameNode =
    translations.name && typeof translations.name === "object"
      ? (translations.name as unknown as any)
      : null;
  if (nameNode) {
    const nestedValue = nameNode[lang];
    const nested = toSafeString(nestedValue);
    if (nested) return nested;
  }
  const prefixedValue = translations[`name_${lang}`];
  const prefixed = toSafeString(prefixedValue);
  if (prefixed) return prefixed;
  const langNode = parseJsonObject(translations[lang]);
  const nameValue = langNode.name || langNode.name_fr;
  const nodeName = toSafeString(nameValue);
  if (nodeName) return nodeName;
  const flatValue = translations[lang];
  const flat = toSafeString(flatValue);
  if (flat) return flat;
  return nameFr;
}

function normalizePinValue(raw: unknown) {
  return String(raw || "").replace(/\s+/g, "").trim();
}

function normalizeTableNumberKey(raw: unknown) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && asNumber > 0) return String(Math.trunc(asNumber));
  return trimmed;
}

function normalizeLookupText(raw: unknown) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseI18nToken(raw: unknown) {
  const value = String(raw || "").trim();
  if (!value.startsWith("__I18N__:")) return {} as Record<string, string>;
  try {
    const parsed = JSON.parse(decodeURIComponent(value.replace("__I18N__:", "")));
    if (!parsed || typeof parsed !== "object") return {} as Record<string, string>;
    return Object.fromEntries(
      Object.entries(parsed as unknown as any).map(([k, v]) => [
        String(k || "").toLowerCase(),
        String(v || "").trim(),
      ])
    );
  } catch {
    return {} as Record<string, string>;
  }
}

function buildStableExtraId(dishId: unknown, extra: ExtrasItem, index: number) {
  const explicit = String(extra.id || "").trim();
  if (explicit) return explicit;
  const dishKey = String(dishId || "").trim();
  const nameKey = normalizeLookupText(extra.name_fr || extra.name_en || extra.name_es || extra.name_de || "");
  const priceKey = parsePriceNumber(extra.price).toFixed(2);
  return `extra:${dishKey}:${nameKey || "option"}:${priceKey}:${index}`;
}

function translateCookingToFrench(raw: unknown) {
  return getCookingLabelFr(raw);
}

function parseShowCalories(raw: unknown, fallback: boolean) {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") {
    const v = raw.trim().toLowerCase();
    if (v === "true" || v === "1") return true;
    if (v === "false" || v === "0") return false;
  }
  if (typeof raw === "number") return raw !== 0;
  return fallback;
}

function toLoggableSupabaseError(error: unknown) {
  if (error == null) return { message: "Unknown error" };
  if (typeof error === "string") return { message: error };
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message || "Unknown error",
      stack: error.stack,
    };
  }
  if (typeof error !== "object") return { message: String(error) };
  const raw = error as unknown as any;
  const parsed = {
    code: typeof raw.code === "string" ? raw.code : undefined,
    message: typeof raw.message === "string" ? raw.message : undefined,
    hint: typeof raw.hint === "string" ? raw.hint : undefined,
    details: typeof raw.details === "string" ? raw.details : undefined,
  };
  const hasUsefulFields = Object.values(parsed).some((value) => String(value || "").trim().length > 0);
  if (hasUsefulFields) return parsed;
  try {
    return {
      message: JSON.stringify(raw) || "Unknown error",
      raw,
    };
  } catch {
    return { message: String(raw) };
  }
}

function isMissingColumnError(error: unknown, columnNames: string[]) {
  const info = toLoggableSupabaseError(error) as unknown as any;
  const code = String(info.code || "").trim();
  const joined = [info.message, info.details, info.hint].map((value) => String(value || "")).join(" ").toLowerCase();
  if (code === "42703") return true;
  if (!joined.includes("column")) return false;
  return columnNames.some((name) => joined.includes(String(name || "").toLowerCase()));
}

function parseDisplaySettingsFromRow(row: Record<string, unknown>) {
  const settingsPayload = parseDisplaySettingsFromSettingsJson(row.settings);
  const langs = parseEnabledLanguageEntries(row.enabled_languages ?? settingsPayload?.enabledLanguages);
  const marketing = parseMarketingOptions(row.table_config || row.settings || row);
  const tableConfig = parseJsonObject(row.table_config);
  const settingsConfig = parseJsonObject(row.settings);
  const uiTranslations = {
    ...parseUiTranslations(settingsPayload?.uiTranslations),
    ...parseUiTranslations(tableConfig.ui_translations || tableConfig.translations_ui),
    ...parseUiTranslations(settingsConfig.ui_translations || settingsConfig.translations_ui),
    ...parseUiTranslations(row.ui_translations || row.translations_ui),
  };
  const priorityRaw = String(row.priority_display || "").toLowerCase().trim();
  const priorityDisplay = priorityRaw === "daily" ? "daily" : priorityRaw === "chef" ? "chef" : marketing.heroBadgeType;
  const consultationMode =
    Object.prototype.hasOwnProperty.call(row, "is_order_disabled")
      ? parseShowCalories(row.is_order_disabled, marketing.consultationMode)
      : marketing.consultationMode;
  return {
    showCalories: parseShowCalories(row.show_calories, settingsPayload?.showCalories ?? true),
    enabledLanguages: langs.codes,
    languageLabels: langs.labels,
    heroEnabled: marketing.heroEnabled,
    upsellEnabled: marketing.upsellEnabled,
    consultationMode,
    orderValidationCode: marketing.orderValidationCode,
    suggestionRules: marketing.suggestionRules,
    suggestionMessage: marketing.suggestionMessage,
    suggestionMessagesI18n: marketing.suggestionMessagesI18n,
    heroBadgeType: priorityDisplay,
    uiTranslations,
  };
}

function parseDisplaySettingsFromSettingsJson(raw: unknown) {
  const source =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as unknown as any;
          } catch {
            return null;
          }
        })()
      : (raw as unknown as any | null);
  if (!source || typeof source !== "object") return null;
  const langs = parseEnabledLanguageEntries(source.enabled_languages);
  const marketing = parseMarketingOptions(source.table_config || source.marketing_options || source.marketing || source);
  const config = parseJsonObject(source.table_config);
  const uiTranslations = {
    ...parseUiTranslations(config.ui_translations || config.translations_ui),
    ...parseUiTranslations(source.ui_translations || source.translations_ui),
  };
  const priorityRaw = String(source.priority_display || "").toLowerCase().trim();
  const priorityDisplay = priorityRaw === "daily" ? "daily" : priorityRaw === "chef" ? "chef" : marketing.heroBadgeType;
  return {
    showCalories: parseShowCalories(source.show_calories, true),
    enabledLanguages: langs.codes,
    languageLabels: langs.labels,
    heroEnabled: marketing.heroEnabled,
    upsellEnabled: marketing.upsellEnabled,
    consultationMode: marketing.consultationMode,
    orderValidationCode: marketing.orderValidationCode,
    suggestionRules: marketing.suggestionRules,
    suggestionMessage: marketing.suggestionMessage,
    suggestionMessagesI18n: marketing.suggestionMessagesI18n,
    heroBadgeType: priorityDisplay,
    uiTranslations,
  };
}

function parseMarketingOptions(raw: unknown) {
  const source =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as unknown as any;
          } catch {
            return null;
          }
        })()
      : (raw as unknown as any | null);
  const marketingContainer =
    source && typeof source === "object" && source.marketing_options && typeof source.marketing_options === "object"
      ? (source.marketing_options as unknown as any)
      : source && typeof source === "object" && source.marketing && typeof source.marketing === "object"
        ? (source.marketing as unknown as any)
        : source;
  const rawRules =
    marketingContainer?.suggestion_rules && Array.isArray(marketingContainer.suggestion_rules)
      ? marketingContainer.suggestion_rules
      : [];
  const suggestionRules = rawRules
    .map((item: unknown) => {
      if (!item || typeof item !== "object") return null;
      const row = item as unknown as any;
      const from = String(row.from_category_id || "").trim();
      const to = String(row.to_category_id || "").trim();
      if (!from || !to) return null;
      return { from_category_id: from, to_category_id: to } as SuggestionRule;
    })
    .filter(Boolean) as SuggestionRule[];
  const suggestionMessage = String(marketingContainer?.suggestion_message || "").trim();
  const rawSuggestionMessages =
    marketingContainer?.suggestion_message_i18n && typeof marketingContainer.suggestion_message_i18n === "object"
      ? (marketingContainer.suggestion_message_i18n as unknown as any)
      : {};
  const suggestionMessagesI18n = Object.fromEntries(
    Object.entries(rawSuggestionMessages)
      .map(([code, value]) => [normalizeLanguageKey(code), String(value || "").trim()])
      .filter(([code, value]) => String(code || "").trim().length > 0 && String(value || "").trim().length > 0)
  ) as Record<string, string>;
  if (suggestionMessage && !suggestionMessagesI18n.fr) {
    suggestionMessagesI18n.fr = suggestionMessage;
  }
  const orderValidationCode = String(
    marketingContainer?.order_validation_code ||
      marketingContainer?.validation_code ||
      source?.order_validation_code ||
      source?.validation_code ||
      "1234"
  ).trim();
  const heroBadgeTypeRaw = String(marketingContainer?.hero_badge_type || "chef").toLowerCase();
  const heroBadgeType = heroBadgeTypeRaw === "daily" ? "daily" : "chef";
  return {
    heroEnabled: parseShowCalories(marketingContainer?.hero_enabled ?? marketingContainer?.show_featured ?? source?.show_featured, true),
    upsellEnabled: parseShowCalories(marketingContainer?.upsell_enabled, false),
    consultationMode: parseShowCalories(
      marketingContainer?.consultation_mode ?? marketingContainer?.is_order_disabled ?? source?.is_order_disabled,
      false
    ),
    orderValidationCode: orderValidationCode || "1234",
    suggestionRules,
    suggestionMessage,
    suggestionMessagesI18n,
    heroBadgeType,
  };
}

function toUiLang(lang: string): CoreUiLang {
  if (lang === "en" || lang === "es" || lang === "de" || lang === "fr") return lang;
  return "fr";
}

async function fetchPublicRestaurantConfig(restaurantId: string) {
  const query = restaurantId ? `?restaurant_id=${encodeURIComponent(restaurantId)}` : "";
  const response = await fetch(`/api/public/restaurant-config${query}`, {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => ({}))) as { restaurant?: Record<string, unknown> };
  const row = payload.restaurant;
  if (!row || typeof row !== "object") return null;
  return row;
}

interface ExtrasItem {
  id?: string;
  name_fr: string;
  name?: string;
  name_en?: string;
  name_es?: string;
  name_de?: string;
  names_i18n?: Record<string, string>;
  price: number;
}

interface SideLibraryItem {
  id: string | number;
  name_fr: string;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
  translations?: Record<string, unknown> | string | null;
}

interface CategoryItem {
  id: string | number;
  name_fr: string;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
  translations?: Record<string, unknown> | string | null;
  destination?: string | null;
  sort_order?: number | null;
}

interface SubCategoryItem {
  id: string | number;
  category_id?: string | number | null;
  name_fr: string;
  name_en?: string | null;
  name_es?: string | null;
  name_de?: string | null;
  translations?: Record<string, unknown> | string | null;
}

interface ParsedOptions {
  baseDescription: string;
  extrasList: ExtrasItem[];
  sideIds: number[];
  askCooking: boolean;
}

interface CartItem {
  dish: Dish;
  quantity: number;
  selectedSides?: string[];
  selectedSideIds?: string[];
  selectedExtras?: ExtrasItem[];
  selectedProductOptions?: ProductOptionItem[];
  selectedProductOption?: ProductOptionItem | null;
  selectedCooking?: string;
  specialRequest?: string;
  fromRecommendation?: boolean;
  formulaSelections?: FormulaSelection[];
  formulaDishId?: string;
  formulaDishName?: string;
  formulaUnitPrice?: number | null;
}

interface FormulaSelection {
  categoryId: string;
  categoryLabel: string;
  dishId: string;
  dishName: string;
  dishNameFr: string;
  sequence?: number | null;
  selectedSideIds?: string[];
  selectedSides?: string[];
  selectedCooking?: string;
  selectedOptionIds?: string[];
  selectedOptionNames?: string[];
  selectedOptionPrice?: number;
}

interface FormulaSelectionDetails {
  selectedSideIds: string[];
  selectedSides: string[];
  selectedCooking: string;
  selectedProductOptionIds: string[];
}

interface FormulaDishLink {
  formulaDishId: string;
  dishId: string;
  categoryId?: string | null;
  sequence: number | null;
  step?: number | null;
  defaultProductOptionIds?: string[];
  formulaName?: string;
  formulaImageUrl?: string;
  formulaMainDishId?: string | null;
  formulaPrice?: number | null;
}

function parseOptionsFromDescription(description?: string | null): ParsedOptions {
  const result: ParsedOptions = {
    baseDescription: "",
    extrasList: [],
    sideIds: [],
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
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isFinite(v));
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
        .map((entry, index) => {
          const [namePart, pricePart] = entry.split("=").map((p) => p.trim());
          const price = pricePart ? Number(pricePart.replace(",", ".")) : 0;
          return {
            id: buildStableExtraId("legacy", { name_fr: namePart || "Supplément", price: Number.isFinite(price) ? price : 0 }, index),
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
              const item = row as unknown as any;
              const namesObj = (item.names_i18n && typeof item.names_i18n === "object"
                ? (item.names_i18n as unknown as any)
                : {}) as unknown as any;
              const names: Record<string, string> = {};
              Object.entries(namesObj).forEach(([k, v]) => {
                const key = String(k || "").trim().toLowerCase();
                if (!key) return;
                names[key] = String(v || "").trim();
              });
              const fr = String(item.name_fr || names.fr || "").trim() || "Supplément";
              const priceRaw = item.price || 0;
              const price =
                typeof priceRaw === "number" ? priceRaw : Number(String(priceRaw).replace(",", "."));
              return {
                id: String(item.id || ""),
                name_fr: fr,
                name_en: String(item.name_en || names.en || "").trim(),
                name_es: String(item.name_es || names.es || "").trim(),
                name_de: String(item.name_de || names.de || "").trim(),
                names_i18n: names,
                price: Number.isFinite(price) ? Number(price) : 0,
              } as ExtrasItem;
            })
            .filter(Boolean) as ExtrasItem[];
          return;
        }
      } catch {
        // ignore malformed payload
      }
    }
    if (trimmed.startsWith("__EXTRAS_I18N__:")) {
      const raw = trimmed.replace("__EXTRAS_I18N__:", "").trim();
      const list = raw
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((entry, index) => {
          const [labels, pricePart] = entry.split("=").map((p) => p.trim());
          const [fr, en, es, de] = (labels || "").split("~").map((p) => decodeURIComponent((p || "").trim()));
          const price = pricePart ? Number(pricePart.replace(",", ".")) : 0;
          return {
            id: buildStableExtraId("legacy-extra", { name_fr: fr || "Supplément", price: Number.isFinite(price) ? price : 0 }, index),
            name_fr: fr || "Supplément",
            name_en: en || fr || "Supplement",
            name_es: es || fr || "Suplemento",
            name_de: de || fr || "Zusatz",
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

function parseExtrasFromUnknown(raw: unknown, dishId: unknown): ExtrasItem[] {
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
        ? ((source as any).extras ??
          (source as any).items ??
          (source as any).list)
        : [];

  if (!Array.isArray(candidate)) return [];

  return candidate
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as any;
      const parsedNamesI18n = Object.fromEntries(
        Object.entries(parseJsonObject(row.names_i18n)).map(([k, v]) => [
          normalizeLanguageKey(k),
          String(v || "").trim(),
        ])
      ) as Record<string, string>;
      const nameFr = String(row.name_fr ?? parsedNamesI18n.fr ?? row.name ?? row.label_fr ?? row.label ?? "").trim();
      if (!nameFr) return null;
      const priceRaw = row.price ?? row.amount ?? row.value ?? 0;
      const price =
        typeof priceRaw === "number" ? priceRaw : Number(String(priceRaw).replace(",", "."));
      return {
        id: buildStableExtraId(
          dishId,
          { id: String(row.id ?? row.extra_id ?? ""), name_fr: nameFr, price: Number.isFinite(price) ? price : 0 },
          index
        ),
        name_fr: nameFr,
        name_en: String(row.name_en ?? parsedNamesI18n.en ?? "").trim(),
        name_es: String(row.name_es ?? parsedNamesI18n.es ?? "").trim(),
        name_de: String(row.name_de ?? parsedNamesI18n.de ?? "").trim(),
        names_i18n: {
          ...parsedNamesI18n,
          fr: parsedNamesI18n.fr || nameFr,
        },
        price: Number.isFinite(price) ? Number(price) : 0,
      } as ExtrasItem;
    })
    .filter(Boolean) as ExtrasItem[];
}

function parseDishOptionsRowsToExtras(rows: Array<Record<string, unknown>>, dishId: unknown): ExtrasItem[] {
  return rows
    .map((row, index) => {
      const parsedNamesI18n = Object.fromEntries(
        Object.entries(parseJsonObject(row.names_i18n)).map(([k, v]) => [
          normalizeLanguageKey(k),
          String(v || "").trim(),
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
      return {
        id: buildStableExtraId(
          dishId,
          { id: String(row.id || ""), name_fr: nameFr, price: Number.isFinite(price) ? price : 0 },
          index
        ),
        name_fr: nameFr,
        name_en: String(row.name_en ?? parsedNamesI18n.en ?? dynamicNameColumns.en ?? "").trim(),
        name_es: String(row.name_es ?? parsedNamesI18n.es ?? dynamicNameColumns.es ?? "").trim(),
        name_de: String(row.name_de ?? parsedNamesI18n.de ?? dynamicNameColumns.de ?? "").trim(),
        names_i18n: {
          ...parsedNamesI18n,
          ...dynamicNameColumns,
          fr: parsedNamesI18n.fr || dynamicNameColumns.fr || nameFr,
        },
        price: Number.isFinite(price) ? price : 0,
      } as ExtrasItem;
    })
    .filter(Boolean) as ExtrasItem[];
}

function mergeExtrasUnique(primary: ExtrasItem[], secondary: ExtrasItem[]) {
  const out = [...primary];
  const seen = new Set(
    primary.map((extra) => `${normalizeLookupText(extra.name_fr || "")}__${parsePriceNumber(extra.price).toFixed(2)}`)
  );
  secondary.forEach((extra) => {
    const key = `${normalizeLookupText(extra.name_fr || "")}__${parsePriceNumber(extra.price).toFixed(2)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(extra);
  });
  return out;
}

function getDishExtras(dish: Dish) {
  const dishRecord = dish as unknown as any;
  const fromRelation = Array.isArray(dishRecord.dish_options)
    ? parseDishOptionsRowsToExtras(dishRecord.dish_options as Array<Record<string, unknown>>, dish.id)
    : [];
  const fromColumns = mergeExtrasUnique(
    parseExtrasFromUnknown(dishRecord.extras, dish.id),
    parseExtrasFromUnknown(dishRecord.extras_list, dish.id)
  );
  const fromDescription = parseOptionsFromDescription(String(dish.description || "")).extrasList || [];
  return mergeExtrasUnique(fromRelation, mergeExtrasUnique(fromColumns, fromDescription));
}

function getDishName(dish: Dish, lang: string) {
  const uiLang = toUiLang(lang);
  const dishRecord = dish as unknown as any;
  const normalizedLang = normalizeLanguageKey(lang);
  const fallbackNameFr =
    toSafeString(dish.name_fr) ||
    toSafeString(dish.name) ||
    toSafeString(dish.nom);
  // Prioritize JSONB translations
  const fromTranslations = getNameTranslation(
    {
      ...dishRecord,
      name_fr: fallbackNameFr,
    },
    lang
  );
  if (fromTranslations) return fromTranslations;
  // Fallback to individual columns
  const langColumnCandidates = [
    `name_${normalizedLang}`,
    `name_${uiLang}`,
    normalizedLang === "ja" ? "name_ja" : "",
    normalizedLang === "ja" ? "name_jp" : "",
    normalizedLang === "zh" ? "name_zh" : "",
    normalizedLang === "zh" ? "name_cn" : "",
    normalizedLang === "ko" ? "name_ko" : "",
    normalizedLang === "ko" ? "name_kr" : "",
    normalizedLang === "el" ? "name_el" : "",
    normalizedLang === "el" ? "name_gr" : "",
    normalizedLang === "ro" ? "name_ro" : "",
    normalizedLang === "pl" ? "name_pl" : "",
    normalizedLang === "it" ? "name_it" : "",
    normalizedLang === "nl" ? "name_nl" : "",
    normalizedLang === "ar" ? "name_ar" : "",
    normalizedLang === "ru" ? "name_ru" : "",
  ].filter(Boolean);
  for (const key of langColumnCandidates) {
    const directColumnValue = toSafeString(dishRecord[key]);
    if (directColumnValue) return directColumnValue;
  }

  const meta = (dish as unknown as any).dietary_tag;
  const parsedMeta =
    typeof meta === "string"
      ? (() => {
          try {
            return JSON.parse(meta) as unknown as any;
          } catch {
            return {};
          }
        })()
      : (meta as unknown as any | null) || {};
  const i18nName =
    parsedMeta.i18n && typeof parsedMeta.i18n === "object"
      ? ((parsedMeta.i18n as unknown as any).name as unknown as any | undefined)
      : undefined;
  if (i18nName && typeof i18nName === "object") {
    const normalizedDynamicValue = i18nName[normalizedLang as keyof typeof i18nName];
    if (typeof normalizedDynamicValue === "string" && normalizedDynamicValue.trim()) return normalizedDynamicValue.trim();
    const uiDynamicValue = i18nName[uiLang as keyof typeof i18nName];
    if (typeof uiDynamicValue === "string" && uiDynamicValue.trim()) return uiDynamicValue.trim();
    const rawDynamicValue = i18nName[lang as keyof typeof i18nName];
    if (typeof rawDynamicValue === "string" && rawDynamicValue.trim()) return rawDynamicValue.trim();
  }
  const nameEn = toSafeString(dish.name_en);
  if (lang === "en" && nameEn) return nameEn;
  const nameEs = toSafeString(dish.name_es);
  if (lang === "es" && nameEs) return nameEs;
  const nameDe = toSafeString(dish.name_de);
  if (lang === "de" && nameDe) return nameDe;
  const fallbackName = fallbackNameFr || "Plat";
  const normalizedFallbackName = normalizeLookupText(fallbackName);
  if (normalizedFallbackName === "plat du jour" || normalizedFallbackName === "platdujour") {
    return String(
      UI_TRANSLATIONS[normalizedLang]?.platDuJour ||
        UI_TRANSLATIONS[normalizedLang]?.featured_daily ||
        UI_TRANSLATIONS[uiLang]?.platDuJour ||
        UI_TRANSLATIONS[uiLang]?.featured_daily ||
        fallbackName
    );
  }
  return fallbackName;
}

function getDescription(dish: Dish, lang: string) {
  const langCode = normalizeLanguageKey(lang);
  const uiLang = toUiLang(lang);
  const dishRecord = dish as unknown as any;
  // Prioritize JSONB translations
  const translations = parseJsonObject((dish as unknown as any).translations);
  const directTranslation = translations[langCode] ?? translations[lang] ?? translations[uiLang];
  if (typeof directTranslation === "string" && directTranslation.trim()) {
    return parseOptionsFromDescription(directTranslation.trim()).baseDescription;
  }
  if (directTranslation && typeof directTranslation === "object") {
    const directDesc = (directTranslation as Record<string, unknown>).description;
    if (typeof directDesc === "string" && directDesc.trim()) {
      return parseOptionsFromDescription(directDesc.trim()).baseDescription;
    }
  }
  const descriptionNode =
    translations.description && typeof translations.description === "object"
      ? (translations.description as unknown as any)
      : {};
  const descValue = descriptionNode[langCode];
  const translatedDescription = typeof descValue === 'string' ? descValue.trim() : "";
  if (translatedDescription) {
    return parseOptionsFromDescription(translatedDescription).baseDescription;
  }
  // Fallback to individual columns
  const directDescriptionColumnCandidates = [
    `description_${langCode}`,
    `description_${uiLang}`,
    langCode === "ja" ? "description_ja" : "",
    langCode === "ja" ? "description_jp" : "",
    langCode === "zh" ? "description_zh" : "",
    langCode === "zh" ? "description_cn" : "",
    langCode === "ko" ? "description_ko" : "",
    langCode === "ko" ? "description_kr" : "",
    langCode === "el" ? "description_el" : "",
    langCode === "el" ? "description_gr" : "",
  ].filter(Boolean);
  for (const key of directDescriptionColumnCandidates) {
    const directValue = dishRecord[key];
    const direct = typeof directValue === 'string' ? directValue.trim() : "";
    if (direct) return parseOptionsFromDescription(direct).baseDescription;
  }

  const meta = (dish as unknown as any).dietary_tag;
  const parsedMeta =
    typeof meta === "string"
      ? (() => {
          try {
            return JSON.parse(meta) as unknown as any;
          } catch {
            return {};
          }
        })()
      : (meta as unknown as any | null) || {};
  const i18nDescription =
    parsedMeta.i18n && typeof parsedMeta.i18n === "object"
      ? ((parsedMeta.i18n as unknown as any).description as unknown as any | undefined)
      : undefined;
  if (i18nDescription && typeof i18nDescription === "object") {
    const normalizedDynamicValue = i18nDescription[langCode as keyof typeof i18nDescription];
    if (typeof normalizedDynamicValue === "string" && normalizedDynamicValue.trim()) return normalizedDynamicValue.trim();
    const uiDynamicValue = i18nDescription[toUiLang(lang) as keyof typeof i18nDescription];
    if (typeof uiDynamicValue === "string" && uiDynamicValue.trim()) return uiDynamicValue.trim();
    const rawDynamicValue = i18nDescription[lang as keyof typeof i18nDescription];
    if (typeof rawDynamicValue === "string" && rawDynamicValue.trim()) return rawDynamicValue.trim();
  }
  const key = `description_${toUiLang(lang)}` as const;
  const rawValue = (dish as Record<string, any>)[key] || dish.description_fr || dish.description || "";
  const raw = typeof rawValue === 'string' ? rawValue : "";
  return parseOptionsFromDescription(raw).baseDescription;
}

function getExtraLabel(extra: ExtrasItem, lang: string) {
  const names = (extra as unknown as any).names_i18n;
  const normalizedLang = normalizeLanguageKey(lang);
  const uiLang = toUiLang(lang);
  if (names && typeof names === "object") {
    const namesRecord = names as unknown as any;
    const dynamicValue = namesRecord[normalizedLang] ?? namesRecord[uiLang] ?? namesRecord[lang];
    if (typeof dynamicValue === "string" && dynamicValue.trim()) return dynamicValue.trim();
  }
  if (normalizedLang === "en" && extra.name_en) return extra.name_en;
  if (normalizedLang === "es" && extra.name_es) return extra.name_es;
  if (normalizedLang === "de" && extra.name_de) return extra.name_de;
  return extra.name_fr || "Supplément";
}
function getAllergens(dish: Dish) {
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

  const dietaryMeta = parseJsonObject((dish as unknown as any).dietary_tag);
  const dietaryI18n = parseJsonObject(dietaryMeta.i18n);
  const topLevelDietaryList = parseList(
    dietaryMeta.allergens_selected ?? dietaryMeta.allergens_fr ?? dietaryMeta.allergens
  );
  const manualAllergensByName = parseJsonObject(dietaryI18n.allergens_manual);
  const manualKeys = Object.keys(manualAllergensByName).map((value) => String(value || "").trim()).filter(Boolean);
  const i18nAllergensByLang = parseJsonObject(dietaryI18n.allergens);
  const i18nFrList = parseList(i18nAllergensByLang.fr ?? i18nAllergensByLang.default);

  const parts = (topLevelDietaryList.length > 0 ? topLevelDietaryList : manualKeys.length > 0 ? manualKeys : i18nFrList)
    .map((a) => a.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const unique: string[] = [];
  parts.forEach((item) => {
    const key = item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(item);
  });
  return unique;
}

function getLocalizedAllergens(dish: Dish, lang: string) {
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

  const fromField = getAllergens(dish);
  const dietaryMeta = parseJsonObject((dish as unknown as any).dietary_tag);
  const dietaryI18n = parseJsonObject(dietaryMeta.i18n);
  const translations = parseJsonObject((dish as unknown as any).translations);
  const requestedLang = normalizeLanguageKey(lang);
  const uiLang = toUiLang(lang);

  const manualAllergensByName = parseJsonObject(dietaryI18n.allergens_manual);
  const manualKeys = Object.keys(manualAllergensByName);
  if (manualKeys.length > 0) {
    const baseList = fromField.length > 0 ? fromField : manualKeys;
    const localizedFromManual = baseList
      .map((allergenFr) => {
        const manualNode = parseJsonObject(
          manualAllergensByName[allergenFr] ?? manualAllergensByName[String(allergenFr || "").trim()]
        );
        return String(manualNode[requestedLang] ?? manualNode[uiLang] ?? manualNode.fr ?? allergenFr).trim();
      })
      .filter(Boolean);
    if (localizedFromManual.length > 0) return localizedFromManual;
  }

  const dietaryAllergensNode = dietaryI18n.allergens;
  if (dietaryAllergensNode) {
    if (Array.isArray(dietaryAllergensNode) || typeof dietaryAllergensNode === "string") {
      const local = parseList(dietaryAllergensNode);
      if (local.length > 0) return local;
    } else if (typeof dietaryAllergensNode === "object") {
      const source = dietaryAllergensNode as any;
      const localizedRaw = source[requestedLang] ?? source[uiLang] ?? source.fr ?? source.default;
      const localized = parseList(localizedRaw);
      if (localized.length > 0) return localized;
    }
  }

  const langNode = parseJsonObject(translations[requestedLang] ?? translations[uiLang]);
  const allergensNode = langNode.allergens ?? translations.allergens;
  if (!allergensNode) return fromField;

  if (Array.isArray(allergensNode) || typeof allergensNode === "string") {
    const local = parseList(allergensNode);
    return local.length > 0 ? local : fromField;
  }
  if (typeof allergensNode !== "object") return fromField;

  const source = allergensNode as any;
  const localizedRaw = source[requestedLang] ?? source[uiLang] ?? source.fr ?? source.default;
  const localized = parseList(localizedRaw);
  return localized.length > 0 ? localized : fromField;
}

function translateAllergen(allergen: string, lang: string) {
  return translateAllergenFallback(allergen, lang);
}

function normalizeAllergenKey(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildAllergenLibraryLookup(raw: unknown) {
  const rows = Array.isArray(raw) ? raw : [];
  const lookup: Record<string, Record<string, string>> = {};
  rows.forEach((entry) => {
    const row = parseJsonObject(entry);
    const nameFr = String(row.name_fr || row.name || "").trim();
    if (!nameFr) return;
    const names = parseJsonObject(row.names_i18n);
    const record: Record<string, string> = {};
    Object.entries(names).forEach(([lang, label]) => {
      const code = normalizeLanguageKey(lang);
      const value = String(label || "").trim();
      if (!code || !value) return;
      record[code] = value;
    });
    record.fr = record.fr || nameFr;
    lookup[normalizeAllergenKey(nameFr)] = record;
  });
  return lookup;
}

function getSpicyBadgeLabel(dish: Dish, lang: string) {
  const uiLang = toUiLang(lang);
  const requestedLang = normalizeLanguageKey(lang);
  const translations = parseJsonObject((dish as unknown as any).translations);
  const langNode = parseJsonObject(translations[requestedLang] ?? translations[uiLang]);
  const spicyNode = langNode.spicy_level ?? translations.spicy_level;
  let localized = "";

  if (typeof spicyNode === "string") {
    localized = spicyNode.trim();
  } else if (spicyNode && typeof spicyNode === "object") {
    const source = spicyNode as any;
    localized = String(source[requestedLang] ?? source[uiLang] ?? source.fr ?? "").trim();
  }

  const fallback = String(localized || dish.spicy_level || "").trim();
  if (!fallback) return dish.is_spicy ? UI_TEXT_CLEAN[uiLang].labels.spicy : "";

  return translateSpicyLevelFallback(fallback, lang) || fallback;
}

function getDishStyleBadgeFlags(dish: Dish) {
  const dietaryMeta = parseJsonObject((dish as unknown as any).dietary_tag);
  const badges = parseJsonObject(dietaryMeta.badges);
  const spicyFallback = Boolean(String((dish as unknown as any).spicy_level || "").trim());
  return {
    vegetarian: Boolean(dish.is_vegetarian ?? dietaryMeta.is_vegetarian ?? badges.vegetarian),
    spicy: Boolean(dish.is_spicy ?? dietaryMeta.is_spicy ?? badges.spicy ?? spicyFallback),
    isNew: Boolean(dietaryMeta.is_new ?? dietaryMeta.new_badge ?? badges.new),
    glutenFree: Boolean(dietaryMeta.is_gluten_free ?? dietaryMeta.gluten_free ?? badges.gluten_free),
  };
}
function getHungerLevel(dish: Dish, lang: string) {
  const uiLang = toUiLang(lang);
  const normalizedLang = normalizeLanguageKey(lang);
  const translatedHungerLabel = (size: "small" | "medium" | "big", fallback: string) =>
    String(
      (size === "small"
        ? UI_TRANSLATIONS[normalizedLang]?.smallHunger
        : size === "medium"
          ? UI_TRANSLATIONS[normalizedLang]?.mediumHunger
          : UI_TRANSLATIONS[normalizedLang]?.bigHunger) ||
        (size === "small"
          ? UI_TRANSLATIONS[uiLang]?.smallHunger
          : size === "medium"
            ? UI_TRANSLATIONS[uiLang]?.mediumHunger
            : UI_TRANSLATIONS[uiLang]?.bigHunger) ||
        fallback
    );
  const directHungerRaw = String((dish as unknown as any).hunger_level || "").trim();
  if (directHungerRaw) {
    const normalizedHungerRaw = normalizeLookupText(directHungerRaw);
    if (normalizedHungerRaw === "petite faim") return translatedHungerLabel("small", directHungerRaw);
    if (normalizedHungerRaw === "moyenne faim") return translatedHungerLabel("medium", directHungerRaw);
    if (normalizedHungerRaw === "grosse faim") return translatedHungerLabel("big", directHungerRaw);
    if (normalizedHungerRaw === "small hunger") return translatedHungerLabel("small", directHungerRaw);
    if (normalizedHungerRaw === "medium hunger") return translatedHungerLabel("medium", directHungerRaw);
    if (normalizedHungerRaw === "big hunger") return translatedHungerLabel("big", directHungerRaw);
  }
  const translateFrenchHungerFallback = (value: string) => {
    const normalized = normalizeLookupText(value);
    if (normalized === "petite faim") return translatedHungerLabel("small", value);
    if (normalized === "moyenne faim") return translatedHungerLabel("medium", value);
    if (normalized === "grosse faim") return translatedHungerLabel("big", value);
    return value;
  };
  const translations = parseJsonObject((dish as unknown as any).translations);
  const langNode = parseJsonObject(translations[normalizedLang] ?? translations[uiLang]);
  const cal = Number(dish.calories_max || dish.calories_min || 0);
  if (!cal || Number.isNaN(cal)) return "";
  const levelKey = cal >= 800 ? "large" : cal >= 500 ? "medium" : "small";
  const hungerNodeRaw = langNode.hunger_level ?? langNode.hunger ?? translations.hunger_level ?? translations.hunger;
  const hungerNode = parseJsonObject(hungerNodeRaw);
  if (hungerNode && Object.keys(hungerNode).length > 0) {
    const directValue = String(hungerNode[levelKey] || "").trim();
    if (directValue) return translateFrenchHungerFallback(directValue);
    const nestedLang = parseJsonObject(hungerNode[normalizedLang] ?? hungerNode[uiLang]);
    const nestedValue = String(nestedLang[levelKey] || "").trim();
    if (nestedValue) return translateFrenchHungerFallback(nestedValue);
  }
  if (cal >= 800) {
    return normalizedLang === "fr" || normalizedLang === "en" || normalizedLang === "es" || normalizedLang === "de"
      ? UI_TEXT_CLEAN[uiLang].hunger.large
      : translatedHungerLabel("big", translateHungerLevelFallback("large", lang));
  }
  if (cal >= 500) {
    return normalizedLang === "fr" || normalizedLang === "en" || normalizedLang === "es" || normalizedLang === "de"
      ? UI_TEXT_CLEAN[uiLang].hunger.medium
      : translatedHungerLabel("medium", translateHungerLevelFallback("medium", lang));
  }
  return normalizedLang === "fr" || normalizedLang === "en" || normalizedLang === "es" || normalizedLang === "de"
    ? UI_TEXT_CLEAN[uiLang].hunger.small
    : translatedHungerLabel("small", translateHungerLevelFallback("small", lang));
}

function getCaloriesLabel(dish: Dish, kcalLabel = "kcal") {
  const unit = String(kcalLabel || "kcal").trim() || "kcal";
  const formatValue = (value: unknown) => {
    const cleaned = String(value ?? "")
      .replace(/\b(kcal|千卡|ккал)\b/gi, "")
      .replace(/سعرة(?:\s+حرارية)?/gi, "")
      .trim();
    return cleaned;
  };

  const min = dish.calories_min;
  const max = dish.calories_max;
  if (min && max) return `${min}-${max} ${unit}`;
  if (min) return `${min} ${unit}`;
  if (max) return `${max} ${unit}`;

  const singleCalories = formatValue(dish.calories);
  if (singleCalories) return `${singleCalories} ${unit}`;
  return "";
}

function collapseDuplicateWords(value: string) {
  const parts = String(value || "")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const unique: string[] = [];
  let previousKey = "";
  parts.forEach((part) => {
    const key = part
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!key || key === previousKey) return;
    unique.push(part);
    previousKey = key;
  });
  return unique.join(" ").trim();
}

function dedupeDisplayValues(values: unknown[]) {
  const seen = new Set<string>();
  const output: string[] = [];
  values.forEach((value) => {
    const collapsed = collapseDuplicateWords(String(value || "").trim());
    if (!collapsed) return;
    const key = collapsed
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (seen.has(key)) return;
    seen.add(key);
    output.push(collapsed);
  });
  return output;
}

function getProductOptionLabel(option: ProductOptionItem | null | undefined, lang: string) {
  if (!option) return "";
  const normalizedLang = normalizeLanguageKey(lang);
  const optionNames = {
    ...parseJsonObject(option.names_i18n),
    ...parseI18nToken(String(option.name_en || "")),
  };
  const fallbackFr = String(option.name_fr || option.name || "").trim();
  if (!normalizedLang || normalizedLang === "fr") return fallbackFr;
  const translated =
    String(optionNames[normalizedLang] || "").trim() ||
    String(
      normalizedLang === "en"
        ? option.name_en
        : normalizedLang === "es"
          ? option.name_es
          : normalizedLang === "de"
            ? option.name_de
            : ""
    ).trim();
  return translated || fallbackFr;
}

function getSelectedProductOptionsList(
  selectedProductOptions?: ProductOptionItem[] | null,
  selectedProductOption?: ProductOptionItem | null
) {
  if (Array.isArray(selectedProductOptions) && selectedProductOptions.length > 0) {
    return selectedProductOptions.filter(Boolean);
  }
  return selectedProductOption ? [selectedProductOption] : [];
}

function buildInstructionText(
  lang: string,
  selectedSides?: string[],
  selectedExtras?: ExtrasItem[],
  selectedProductOptions?: ProductOptionItem[] | null,
  selectedProductOption?: ProductOptionItem | null,
  selectedCooking?: string,
  specialRequest?: string,
  uiCopy?: (typeof UI_TEXT)["fr"]
) {
  const uiLang = toUiLang(lang);
  const labels = uiCopy || UI_TEXT_CLEAN[uiLang];
  const parts: string[] = [];
  const uniqueSides = dedupeDisplayValues((selectedSides || []) as unknown[]);
  if (uniqueSides.length > 0) {
    parts.push(`${labels.sidesLabel}: ${uniqueSides.join(", ")}`);
  }
  const optionLabels = dedupeDisplayValues(
    getSelectedProductOptionsList(selectedProductOptions, selectedProductOption).map((option) => {
      const optionLabel = getProductOptionLabel(option, lang);
      const optionPrice = parseAddonPrice(option.price_override);
      return optionPrice > 0 ? `${optionLabel} (+${formatPriceTwoDecimals(optionPrice)})` : optionLabel;
    })
  );
  if (optionLabels.length > 0) {
    parts.push(`Option: ${optionLabels.join(", ")}`);
  }
  if (selectedCooking) parts.push(`${labels.cookingLabel}: ${selectedCooking}`);
  if (selectedExtras && selectedExtras.length > 0) {
    const extrasText = dedupeDisplayValues(
      selectedExtras.map((e) => {
        const extraName = String(e.name_fr || "Suppl\u00e9ment").trim() || "Suppl\u00e9ment";
        const extraPrice = parsePriceNumber(e.price);
        return extraPrice > 0 ? `${extraName} (+${PRICE_FORMATTER_EUR.format(extraPrice)})` : extraName;
      })
    )
      .join(", ");
    if (extrasText) parts.push(`${labels.extrasLabel}: ${extrasText}`);
  }
  if (specialRequest && specialRequest.trim()) {
    parts.push(`${labels.specialRequestLabel}: ${specialRequest.trim()}`);
  }
  return parts.join(" | ");
}

export default function MenuDigital() {
  const router = useRouter();
  const params = useParams<{ id?: string; restaurant_id?: string }>();
  const pathname = usePathname();
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
  const scopedRestaurantId = scopedRestaurantIdFromPath || scopedRestaurantIdFromQuery || scopedRestaurantIdFromLocation;
  const modeParam = String(searchParams.get("mode") || "").trim().toLowerCase();
  const pathSegments = String(pathname || "")
    .split("/")
    .map((part) => String(part || "").trim().toLowerCase())
    .filter(Boolean);
  const isVitrinePath = pathSegments[0] === "vitrine";
  const forceInteractiveMode = ["table", "commande", "order", "command"].includes(modeParam);
  const isVitrineMode =
    !forceInteractiveMode &&
    (isVitrinePath || ["vitrine", "view", "consultation", "readonly", "read-only"].includes(modeParam));

  useEffect(() => {
    if (scopedRestaurantId) return;
    if (pathSegments.length > 0) return;
    router.replace("/admin");
  }, [scopedRestaurantId, pathSegments.length, router]);
  const [lang, setLang] = useState<string>("fr");
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [formulaDish, setFormulaDish] = useState<Dish | null>(null);
  const [formulaSourceDish, setFormulaSourceDish] = useState<Dish | null>(null);
  const [formulaLinksByFormulaId, setFormulaLinksByFormulaId] = useState<Map<string, FormulaDishLink[]>>(new Map());
  const [formulaLinksByDishId, setFormulaLinksByDishId] = useState<Map<string, FormulaDishLink[]>>(new Map());
  const [formulaInfoById, setFormulaInfoById] = useState<
    Map<string, { name?: string; imageUrl?: string; dishId?: string | null; price?: number | null; description?: string | null; calories?: number | null; allergens?: string | null; formula_category_ids?: unknown; parent_dish_name?: string | null }>
  >(new Map());
  const [formulaSelections, setFormulaSelections] = useState<Record<string, string>>({});
  const [formulaSelectionDetails, setFormulaSelectionDetails] = useState<Record<string, FormulaSelectionDetails>>({});
  const [formulaMainDetails, setFormulaMainDetails] = useState<FormulaSelectionDetails>({
    selectedSideIds: [],
    selectedSides: [],
    selectedCooking: "",
    selectedProductOptionIds: [],
  });
  const [formulaSelectionError, setFormulaSelectionError] = useState("");
  const [formulaItemDetailsOpen, setFormulaItemDetailsOpen] = useState<Record<string, boolean>>({});
  const [dishModalQuantity, setDishModalQuantity] = useState(1);
  const [serverCallMsg, setServerCallMsg] = useState("");
  const [showCallModal, setShowCallModal] = useState(false);
  const [isSendingCall, setIsSendingCall] = useState(false);
  const [serverCallCooldownUntil, setServerCallCooldownUntil] = useState(0);
  const [serverCallSecondsLeft, setServerCallSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRestaurantOffline, setIsRestaurantOffline] = useState(false);
  const [offlineRestaurantName, setOfflineRestaurantName] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");
  const [selectedSides, setSelectedSides] = useState<string[]>([]);
  const [selectedCooking, setSelectedCooking] = useState("");
  const [selectedExtras, setSelectedExtras] = useState<ExtrasItem[]>([]);
  const [modalProductOptions, setModalProductOptions] = useState<ProductOptionItem[]>([]);
  const [selectedProductOptionIds, setSelectedProductOptionIds] = useState<string[]>([]);
  const [modalSidesOptions, setModalSidesOptions] = useState<string[]>([]);
  const [modalExtrasOptions, setModalExtrasOptions] = useState<ExtrasItem[]>([]);
  const [modalAskCooking, setModalAskCooking] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [orderValidationCodeInput, setOrderValidationCodeInput] = useState("");
  const [, setOrderValidationCode] = useState("1234");
  const [tablePinCodesByNumber, setTablePinCodesByNumber] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [cartBump, setCartBump] = useState(false);
  const [isStickyActionsCompact, setIsStickyActionsCompact] = useState(false);
  const actionDockSentinelRef = useRef<HTMLDivElement | null>(null);
  const categoryTabsRef = useRef<HTMLDivElement | null>(null);
  const [isCategoryTabsOutOfView, setIsCategoryTabsOutOfView] = useState(false);
  const vitrineViewTrackedRef = useRef<Record<string, boolean>>({});
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sideError, setSideError] = useState("");
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoryDrawerEnabled, setCategoryDrawerEnabled] = useState(false);
  const [keepSuggestionsOnTop, setKeepSuggestionsOnTop] = useState(false);
  const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
  const [serviceHours, setServiceHours] = useState({
    lunch_start: "",
    lunch_end: "",
    dinner_start: "",
    dinner_end: "",
  });
  const [subCategoryRows, setSubCategoryRows] = useState<SubCategoryItem[]>([]);
  const [sidesLibrary, setSidesLibrary] = useState<SideLibraryItem[]>([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [showCaloriesClient, setShowCaloriesClient] = useState(true);
  const [consultationModeClient, setConsultationModeClient] = useState(false);
  const [heroEnabledClient, setHeroEnabledClient] = useState(true);
  const [heroBadgeTypeClient, setHeroBadgeTypeClient] = useState<"chef" | "daily">("chef");
  const [enabledLanguagesClient, setEnabledLanguagesClient] = useState<string[]>(["fr", "en"]);
  const [enabledLanguageLabels, setEnabledLanguageLabels] = useState<Record<string, string>>({
    fr: "Fran\u00e7ais",
    en: "English",
  });
  const [showSalesAdviceModal, setShowSalesAdviceModal] = useState(false);
  const [salesAdviceMessage, setSalesAdviceMessage] = useState("");
  const [salesAdviceDishId, setSalesAdviceDishId] = useState<string>("");
  const [recommendationSourceDishId, setRecommendationSourceDishId] = useState<string>("");
  const [suggestionLeadByLang, setSuggestionLeadByLang] = useState<Record<string, string>>({});
  const [uiTranslationsByLang, setUiTranslationsByLang] = useState<UiTranslationsByLang>({});
  const [darkMode, setDarkMode] = useState(false);
  const [timeTick, setTimeTick] = useState(0);
  const [headerLogoLoadError, setHeaderLogoLoadError] = useState(false);
  const [headerLogoLoaded, setHeaderLogoLoaded] = useState(false);
  const [headerLogoCacheBuster, setHeaderLogoCacheBuster] = useState<number>(Date.now());
  const hideBrokenImage = (event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.style.display = "none";
  };
  const uiLang = toUiLang(lang);
  const normalizedLang = normalizeLanguageKey(lang);
  const isRtl = RTL_LANGUAGE_CODES.has(normalizedLang);
  const serverCallThrottleLabel = getServerCallCooldownText(serverCallSecondsLeft);
  const triggerHaptic = (pattern: number | number[]) => {
    try {
      if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
      navigator.vibrate(pattern);
    } catch {
      // noop on unsupported browsers/devices
    }
  };
  const mergedUiDictionary = useMemo(() => {
    const master = UI_TRANSLATIONS[normalizedLang] || UI_TRANSLATIONS[uiLang] || {};
    return {
      ...(uiTranslationsByLang.fr || {}),
      ...(uiTranslationsByLang[uiLang] || {}),
      ...(uiTranslationsByLang[normalizedLang] || {}),
      ...master,
    } as UiDictionary;
  }, [uiTranslationsByLang, uiLang, normalizedLang]);
  const formulaUi = useMemo(() => {
    const get = (key: string, fallbackValue: string) =>
      String(
        mergedUiDictionary[key] ||
          (UI_TRANSLATIONS[normalizedLang] as Record<string, string> | undefined)?.[key] ||
          (UI_TRANSLATIONS[uiLang] as Record<string, string> | undefined)?.[key] ||
          fallbackValue
      ).trim();
    return {
      title: get("formula_title", "Composer votre formule"),
      subtitle: get("formula_subtitle", "Choisissez vos plats"),
      missing: get("formula_missing", "Veuillez choisir un plat pour chaque catégorie."),
      missingOptions: get("formula_missing_options", "Veuillez compléter les options obligatoires des plats sélectionnés."),
      label: get("formula_label", "Formule"),
      choose: get("formula_choose", "Choisir"),
    };
  }, [mergedUiDictionary, normalizedLang, uiLang]);
  const formulaCategoryLabel = useMemo(
    () =>
      String(
        mergedUiDictionary["categories.formulas"] ||
          mergedUiDictionary["labels.formulas"] ||
          mergedUiDictionary.formulas ||
          UI_TRANSLATIONS[normalizedLang]?.["categories.formulas"] ||
          UI_TRANSLATIONS[normalizedLang]?.["labels.formulas"] ||
          UI_TRANSLATIONS[normalizedLang]?.formulas ||
          UI_TRANSLATIONS[uiLang]?.["categories.formulas"] ||
          UI_TRANSLATIONS[uiLang]?.["labels.formulas"] ||
          UI_TRANSLATIONS[uiLang]?.formulas ||
          UI_TEXT_CLEAN[uiLang].labels.formulas
      ).trim() || UI_TEXT_CLEAN[uiLang].labels.formulas,
    [mergedUiDictionary, normalizedLang, uiLang]
  );
  const availableInFormulaLabel = useMemo(
    () =>
      String(
        mergedUiDictionary["labels.available_in_formula"] ||
          mergedUiDictionary.available_in_formula ||
          UI_TRANSLATIONS[normalizedLang]?.["labels.available_in_formula"] ||
          UI_TRANSLATIONS[normalizedLang]?.available_in_formula ||
          UI_TRANSLATIONS[uiLang]?.["labels.available_in_formula"] ||
          UI_TRANSLATIONS[uiLang]?.available_in_formula ||
          UI_TEXT_CLEAN[uiLang].labels.available_in_formula
      ).trim() || UI_TEXT_CLEAN[uiLang].labels.available_in_formula,
    [mergedUiDictionary, normalizedLang, uiLang]
  );
  const viewFormulaLabel = useMemo(
    () =>
      String(
        mergedUiDictionary["labels.view_formula"] ||
          mergedUiDictionary.view_formula ||
          UI_TRANSLATIONS[normalizedLang]?.["labels.view_formula"] ||
          UI_TRANSLATIONS[normalizedLang]?.view_formula ||
          UI_TRANSLATIONS[uiLang]?.["labels.view_formula"] ||
          UI_TRANSLATIONS[uiLang]?.view_formula ||
          UI_TEXT_CLEAN[uiLang].labels.view_formula
      ).trim() || UI_TEXT_CLEAN[uiLang].labels.view_formula,
    [mergedUiDictionary, normalizedLang, uiLang]
  );
  const dishBadgeLabels = useMemo(() => {
    const pick = (key: string, fallback: string) =>
      String(mergedUiDictionary[key] || UI_TRANSLATIONS[normalizedLang]?.[key] || UI_TRANSLATIONS[uiLang]?.[key] || fallback);
    return {
      vegetarian: pick("badge_vegetarian", "Végétarien"),
      spicy: pick("badge_spicy", "Pimenté"),
      isNew: pick("badge_new", "Nouveau"),
      glutenFree: pick("badge_gluten_free", "Sans gluten"),
    };
  }, [mergedUiDictionary, normalizedLang, uiLang]);
  const promoBadgeLabel = String(
    mergedUiDictionary.badge_promo ||
      UI_TRANSLATIONS[normalizedLang]?.badge_promo ||
      UI_TRANSLATIONS[uiLang]?.badge_promo ||
      "PROMO"
  );
  const chefSuggestionBadgeLabel = String(
    mergedUiDictionary.badge_suggestion_chef ||
      UI_TRANSLATIONS[normalizedLang]?.badge_suggestion_chef ||
      UI_TRANSLATIONS[uiLang]?.badge_suggestion_chef ||
      "SUGGESTION DU CHEF"
  );
  const footerThankYouLabel = String(
    mergedUiDictionary.footer_thank_you ||
      UI_TRANSLATIONS[normalizedLang]?.footer_thank_you ||
      UI_TRANSLATIONS[uiLang]?.footer_thank_you ||
      "Merci de votre visite"
  );
  const footerFollowUsLabel = String(
    mergedUiDictionary.footer_follow_us ||
      UI_TRANSLATIONS[normalizedLang]?.footer_follow_us ||
      UI_TRANSLATIONS[uiLang]?.footer_follow_us ||
      "Suivez-nous sur nos réseaux"
  );
  const footerPhotoShareLabel = String(
    mergedUiDictionary.footer_photo_share_cta ||
      UI_TRANSLATIONS[normalizedLang]?.footer_photo_share_cta ||
      UI_TRANSLATIONS[uiLang]?.footer_photo_share_cta ||
      "N'hésitez pas à prendre vos plats en photo, à les partager et à nous mentionner !"
  );
  const getDishStyleBadges = (dish: Dish) => {
    const flags = getDishStyleBadgeFlags(dish);
    const badges: Array<{ key: string; label: string; dotClass: string }> = [];
    if (flags.vegetarian) badges.push({ key: "vegetarian", label: dishBadgeLabels.vegetarian, dotClass: "bg-green-500" });
    if (flags.spicy) badges.push({ key: "spicy", label: dishBadgeLabels.spicy, dotClass: "bg-red-500" });
    if (flags.isNew) badges.push({ key: "new", label: dishBadgeLabels.isNew, dotClass: "bg-blue-500" });
    if (flags.glutenFree) badges.push({ key: "gluten_free", label: dishBadgeLabels.glutenFree, dotClass: "bg-amber-500" });
    return badges;
  };
  const uiText = useMemo(() => buildRuntimeUiText(UI_TEXT_CLEAN[uiLang], mergedUiDictionary), [uiLang, mergedUiDictionary]);
  const kcalLabel = String((uiText as unknown as any).kcal || "kcal").trim() || "kcal";
  const isOrderingDisabledClient =
    consultationModeClient || parseShowCalories((restaurant as unknown as any | null)?.is_order_disabled, false);
  const isInteractionDisabled = isOrderingDisabledClient || isVitrineMode;
  const allergenLibraryLookup = useMemo(() => {
    const tableConfig = parseJsonObject(restaurant?.table_config);
    return buildAllergenLibraryLookup(tableConfig.allergen_library);
  }, [restaurant]);
  const tt = (key: keyof (typeof UI_TEXT)["fr"]["labels"]) => {
    if (key === "featured_chef" || key === "sales_advice_title") {
      return (
        String(
          (uiText as unknown as any).chefSuggestion ||
            mergedUiDictionary.chefSuggestion ||
            UI_TRANSLATIONS[normalizedLang]?.chefSuggestion ||
            UI_TRANSLATIONS[uiLang]?.chefSuggestion
        ).trim() || "Suggestion du chef"
      );
    }
    return uiText.labels[key] || t(lang, key);
  };
  const optionVariantsLabel =
    String((uiText as unknown as any).optionsAndVariants || "").trim() || "Options / Variantes";
  const itemTotalLabel =
    String((uiText as unknown as any).itemTotal || "").trim() || "Total article";
  const itemDetailsLabel = tt("item_details");
  const formulaOptionLockedLabel = tt("formula_option_locked");
  const toFinitePrice = (raw: unknown) => {
    if (raw == null) return null;
    if (typeof raw === "string" && raw.trim() === "") return null;
    return parsePriceNumber(raw);
  };
  const getPromoPriceForDish = (dish: Dish) => {
    const source = dish as unknown as any;
    if (!Boolean(source.is_promo)) return null;
    const promo = toFinitePrice(source.promo_price);
    if (promo == null || promo <= 0) return null;
    return promo;
  };
  const getDishBasePrice = (dish: Dish) => parsePriceNumber(dish.price);
  const getFormulaPackPrice = (dish: Dish) => {
    const formulaPrice = Number((dish as any).formula_price);
    if (Number.isFinite(formulaPrice) && formulaPrice > 0) {
      return formulaPrice;
    }
    return getDishBasePrice(dish);
  };
  const getDishOptionSupplement = (option?: ProductOptionItem | null) =>
    option ? parseAddonPrice(option.price_override) : 0;
  const getDishOptionSupplementTotal = (
    selectedProductOptions?: ProductOptionItem[] | null,
    selectedProductOption?: ProductOptionItem | null
  ) =>
    getSelectedProductOptionsList(selectedProductOptions, selectedProductOption).reduce(
      (sum, option) => sum + getDishOptionSupplement(option),
      0
    );
  const getDishUnitPrice = (
    dish: Dish,
    selectedProductOptions?: ProductOptionItem[] | null,
    selectedProductOption?: ProductOptionItem | null
  ) => {
    const isFormulaDish = toBooleanFlag((dish as any).is_formula ?? dish.is_formula);
    if (isFormulaDish) {
      return getFormulaPackPrice(dish);
    }
    const basePrice = getDishBasePrice(dish);
    const optionSupplement = getDishOptionSupplementTotal(selectedProductOptions, selectedProductOption);
    const promoPrice = getPromoPriceForDish(dish);
    const discountedBase = promoPrice != null && promoPrice < basePrice ? promoPrice : basePrice;
    return discountedBase + optionSupplement;
  };
  const isFormulaCartItem = (item: CartItem) =>
    Boolean(String(item.formulaDishId || "").trim()) ||
    Number(item.formulaUnitPrice || 0) > 0 ||
    toBooleanFlag(((item.dish as unknown as any)?.is_formula ?? item.dish?.is_formula) as unknown);
  const getCartItemUnitPrice = (item: CartItem) => {
    const formulaPrice = Number(item.formulaUnitPrice);
    if (Number.isFinite(formulaPrice) && formulaPrice > 0) {
      return formulaPrice;
    }
    const formulaDishId = String(item.formulaDishId || "").trim();
    if (formulaDishId) {
      const formulaDish = dishes.find((dish) => String(dish.id || "").trim() === formulaDishId);
      if (formulaDish) return getFormulaPackPrice(formulaDish);
    }
    if (toBooleanFlag(((item.dish as unknown as any)?.is_formula ?? item.dish?.is_formula) as unknown)) {
      return getFormulaPackPrice(item.dish);
    }
    return getDishUnitPrice(
      item.dish,
      getSelectedProductOptionsList(item.selectedProductOptions, item.selectedProductOption),
      item.selectedProductOption
    );
  };
  const getDishSuggestionBadge = (dish: Dish) => {
    const source = dish as unknown as any;
    return Boolean(source.is_suggestion || source.is_chef_suggestion || source.is_featured);
  };
  const modalSelectedProductOptions = useMemo(() => {
    if (!modalProductOptions.length || selectedProductOptionIds.length === 0) return [] as ProductOptionItem[];
    const selectedIdSet = new Set(selectedProductOptionIds.map((value) => String(value || "")));
    return modalProductOptions.filter((option) => selectedIdSet.has(String(option.id || "")));
  }, [modalProductOptions, selectedProductOptionIds]);
  const modalSelectedProductOption = modalSelectedProductOptions[0] || null;
  const modalUnitPrice = selectedDish ? getDishUnitPrice(selectedDish, modalSelectedProductOptions, modalSelectedProductOption) : 0;
  const modalTotalPrice =
    modalUnitPrice * Math.max(1, dishModalQuantity) +
    (selectedExtras || []).reduce((sum, extra) => sum + parsePriceNumber(extra.price), 0) * Math.max(1, dishModalQuantity);
  const clickDetailsLabel =
    String(
      mergedUiDictionary.click_details ||
        UI_TRANSLATIONS[normalizedLang]?.click_details ||
        UI_TRANSLATIONS[uiLang]?.click_details ||
        ""
    ).trim() || "Cliquez pour voir les détails";
  const viewDetailsLabel =
    String(
      mergedUiDictionary.view_details ||
        UI_TRANSLATIONS[normalizedLang]?.view_details ||
        UI_TRANSLATIONS[uiLang]?.view_details ||
        ""
    ).trim() || "Voir détails";
  const consultationModeBannerText =
    String(
      (uiText as unknown as any).consultation_mode_banner ||
        "La commande se fait auprès de votre serveur. Utilisez ce menu pour découvrir nos plats !"
    ).trim() || "La commande se fait auprès de votre serveur. Utilisez ce menu pour découvrir nos plats !";
  const restaurantTableConfig = parseJsonObject(restaurant?.table_config);
  const restaurantRecord = restaurant as any | null;
  const quickAddToCartEnabled =
    !isInteractionDisabled &&
    parseShowCalories(
      restaurantTableConfig.quick_add_to_cart_enabled ?? restaurantTableConfig.quick_add_enabled,
      false
    );
  const cardTransparentEnabled = darkMode
    ? false
    : parseShowCalories(
        restaurantRecord?.card_transparent ??
          restaurantRecord?.cards_transparent ??
          restaurantTableConfig.card_transparent ??
          restaurantTableConfig.cards_transparent,
        false
      );
  const bannerBgColor = darkMode ? "#000000" : normalizeHexColor(restaurant?.primary_color, "#FFFFFF");
  const bannerTextColor = getHexContrastTextColor(bannerBgColor);
  const bannerImageUrl = sanitizeMediaUrl(
    restaurantRecord?.banner_image_url ||
      restaurantRecord?.banner_url ||
      restaurantTableConfig.banner_image_url ||
      restaurantTableConfig.banner_url ||
      ""
  );
  const hasBannerImage = bannerImageUrl.length > 0;
  const showBannerImage = !darkMode && hasBannerImage;
  const bannerContentTextColor = showBannerImage ? "#FFFFFF" : bannerTextColor;
  const restaurantDisplayName = String(restaurant?.name ?? "").trim();
  const headerLogoUrl = sanitizeMediaUrl(restaurant?.logo_url);
  const headerLogoSrc = headerLogoUrl
    ? `${headerLogoUrl}${headerLogoUrl.includes("?") ? "&" : "?"}t=${headerLogoCacheBuster}`
    : "";
  const hasHeaderLogo = headerLogoUrl.length > 0;
  const showHeaderLogo = hasHeaderLogo && !headerLogoLoadError;
  const cardBgColor = darkMode ? "#000000" : normalizeHexColor(restaurant?.card_bg_color, "#FFFFFF");
  const cardBgOpacityPercent = darkMode
    ? 100
    : normalizeOpacityPercent(
        restaurantRecord?.card_bg_opacity ?? restaurantTableConfig.card_bg_opacity,
        cardTransparentEnabled ? 0 : 100
      );
  const cardBgOpacityAlpha = darkMode
    ? "FF"
    : alphaHexFromPercent(cardBgOpacityPercent, cardTransparentEnabled ? 0 : 100);
  const cardSurfaceBg = darkMode ? "#000000" : withAlpha(cardBgColor, cardBgOpacityAlpha);
  const cardImagePanelBg = darkMode ? "#000000" : withAlpha(cardBgColor, cardBgOpacityAlpha);
  const cardTextColorValue = darkMode
    ? getHexContrastTextColor(cardBgColor)
    : normalizeHexColor(restaurantRecord?.card_text_color ?? restaurantTableConfig.card_text_color, "#111111");
  const cardTextIsLight = darkMode && cardTextColorValue === "#FFFFFF";
  const globalTextColorValue = darkMode
    ? "#F5F5F5"
    : normalizeHexColor(
        (restaurant as any | null)?.text_color ??
          restaurantTableConfig.text_color ??
          restaurantTableConfig.global_text_color,
        getHexContrastTextColor(bannerBgColor)
      );
  const backgroundImageUrl = sanitizeMediaUrl(
    restaurantRecord?.background_url ||
      restaurantRecord?.background_image_url ||
      restaurantTableConfig.background_url ||
      restaurantTableConfig.background_image_url ||
      restaurantTableConfig.bg_image_url ||
      ""
  );
  const backgroundOpacity = darkMode
    ? 1
    : normalizeBackgroundOpacity(
        (restaurant as any | null)?.bg_opacity ??
          restaurantTableConfig.bg_opacity,
        1
      );
  const restaurantSocialLinks = parseJsonObject(restaurantTableConfig.social_links);
  const instagramUrl = String(restaurantSocialLinks.instagram || restaurantRecord?.instagram_url || "").trim();
  const facebookUrl = String(restaurantSocialLinks.facebook || restaurantRecord?.facebook_url || "").trim();
  const xUrl = String(restaurantSocialLinks.x || restaurantSocialLinks.twitter || restaurantRecord?.x_url || "").trim();
  const snapchatUrl = String(restaurantSocialLinks.snapchat || restaurantRecord?.snapchat_url || "").trim();
  const websiteUrl = String(restaurantSocialLinks.website || restaurantSocialLinks.site || restaurantRecord?.website_url || "").trim();
  const socialFooterEntries = [
    {
      key: "instagram",
      label: "Instagram",
      url: instagramUrl,
      iconUrl: "https://cdn.simpleicons.org/instagram/E4405F",
      iconBg: "#ffffff",
    },
    {
      key: "facebook",
      label: "Facebook",
      url: facebookUrl,
      iconUrl: "https://cdn.simpleicons.org/facebook/1877F2",
      iconBg: "#ffffff",
    },
    {
      key: "x",
      label: "X",
      url: xUrl,
      iconUrl: "https://cdn.simpleicons.org/x/111111",
      iconBg: "#ffffff",
    },
    {
      key: "snapchat",
      label: "Snapchat",
      url: snapchatUrl,
      iconUrl: "https://cdn.simpleicons.org/snapchat/111111",
      iconBg: "#FFFC00",
    },
    {
      key: "website",
      label: "Web",
      url: websiteUrl,
      iconUrl: "",
      iconBg: "#ffffff",
    },
  ].filter((entry) => entry.url);
  const hideCompactFloatingActions =
    isStickyActionsCompact && (isCartOpen || !!selectedDish || !!formulaDish || isVitrineMode);
  const showCategoryDrawerButton =
    categoryDrawerEnabled && isCategoryTabsOutOfView && !isCategoryDrawerOpen && !hideCompactFloatingActions;
  const applyRealtimeDisplaySettingsRow = (rawRow: unknown) => {
    if (!rawRow || typeof rawRow !== "object") return;
    const row = rawRow as any;
    if (scopedRestaurantId) {
      const rowId = String(row.id || "").trim();
      if (!rowId || rowId !== scopedRestaurantId) return;
    }
    const parsed = parseDisplaySettingsFromRow(row);
    setShowCaloriesClient(parsed.showCalories);
    setEnabledLanguagesClient(parsed.enabledLanguages);
    setEnabledLanguageLabels(parsed.languageLabels);
    setHeroEnabledClient(parsed.heroEnabled);
    setHeroBadgeTypeClient(parsed.heroBadgeType === "daily" ? "daily" : "chef");
    setConsultationModeClient(parsed.consultationMode);
    setOrderValidationCode(parsed.orderValidationCode || "1234");
    setSuggestionLeadByLang(parsed.suggestionMessagesI18n || {});
    setUiTranslationsByLang(parsed.uiTranslations || {});
    const config = parseJsonObject(row.table_config || row.settings);
    const rawDrawerEnabled =
      config.category_drawer_enabled ??
      config.show_category_drawer ??
      (row as any).category_drawer_enabled ??
      (row as any).show_category_drawer;
    const rawKeepSuggestions =
      config.keep_suggestions_on_top ??
      config.pin_suggestions ??
      (row as any).keep_suggestions_on_top ??
      (row as any).pin_suggestions;
    setCategoryDrawerEnabled(Boolean(rawDrawerEnabled));
    setKeepSuggestionsOnTop(Boolean(rawKeepSuggestions));
    setServiceHours({
      lunch_start: String(config.service_lunch_start || config.lunch_start || "").trim(),
      lunch_end: String(config.service_lunch_end || config.lunch_end || "").trim(),
      dinner_start: String(config.service_dinner_start || config.dinner_start || "").trim(),
      dinner_end: String(config.service_dinner_end || config.dinner_end || "").trim(),
    });
    if (Object.prototype.hasOwnProperty.call(row, "is_active")) {
      const isActive = typeof row.is_active === "boolean" ? row.is_active : true;
      setIsRestaurantOffline(!isActive);
      setOfflineRestaurantName(String(row.name || "").trim());
    }
    if (
      Object.prototype.hasOwnProperty.call(row, "font_family") ||
      Object.prototype.hasOwnProperty.call(row, "name") ||
      Object.prototype.hasOwnProperty.call(row, "logo_url") ||
      Object.prototype.hasOwnProperty.call(row, "banner_image_url") ||
      Object.prototype.hasOwnProperty.call(row, "banner_url") ||
      Object.prototype.hasOwnProperty.call(row, "background_url") ||
      Object.prototype.hasOwnProperty.call(row, "background_image_url") ||
      Object.prototype.hasOwnProperty.call(row, "primary_color") ||
      Object.prototype.hasOwnProperty.call(row, "text_color") ||
      Object.prototype.hasOwnProperty.call(row, "card_bg_color") ||
      Object.prototype.hasOwnProperty.call(row, "card_bg_opacity") ||
      Object.prototype.hasOwnProperty.call(row, "card_text_color") ||
      Object.prototype.hasOwnProperty.call(row, "card_transparent")
    ) {
      setRestaurant((prev) => ({
        ...(prev || ({} as Restaurant)),
        ...(row as Partial<Restaurant>),
        font_family: String((row as any).font_family || (prev as any)?.font_family || "").trim() || null,
      }) as Restaurant);
    }
  };
  useEffect(() => {
    setHeaderLogoLoadError(false);
    setHeaderLogoLoaded(false);
    setHeaderLogoCacheBuster(Date.now());
  }, [headerLogoUrl]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateStickyState = () => {
      const top = actionDockSentinelRef.current?.getBoundingClientRect().top;
      setIsStickyActionsCompact(typeof top === "number" && top <= 0);
    };
    updateStickyState();
    window.addEventListener("scroll", updateStickyState, { passive: true });
    window.addEventListener("resize", updateStickyState);
    return () => {
      window.removeEventListener("scroll", updateStickyState);
      window.removeEventListener("resize", updateStickyState);
    };
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateCategoryTabsVisibility = () => {
      const rect = categoryTabsRef.current?.getBoundingClientRect();
      if (!rect) {
        setIsCategoryTabsOutOfView(false);
        return;
      }
      // Drawer trigger appears only when tabs are fully above viewport.
      setIsCategoryTabsOutOfView(rect.bottom <= 0);
    };
    updateCategoryTabsVisibility();
    window.addEventListener("scroll", updateCategoryTabsVisibility, { passive: true });
    window.addEventListener("resize", updateCategoryTabsVisibility);
    return () => {
      window.removeEventListener("scroll", updateCategoryTabsVisibility);
      window.removeEventListener("resize", updateCategoryTabsVisibility);
    };
  }, []);
  const fetchConsultationModeState = async () => {
    const applyRow = (row: unknown) => {
      if (!row || typeof row !== "object") return false;
      const parsed = parseDisplaySettingsFromRow(row as any);
      setConsultationModeClient(parsed.consultationMode);
      return true;
    };

    const publicRestaurantRow = await fetchPublicRestaurantConfig(scopedRestaurantId);
    if (publicRestaurantRow && applyRow(publicRestaurantRow)) return;

    const restaurantsResult = scopedRestaurantId
      ? await supabase.from("restaurants").select("*").eq("id", scopedRestaurantId).limit(1)
      : await supabase.from("restaurants").select("*").limit(1);
    if (!restaurantsResult.error && Array.isArray(restaurantsResult.data) && applyRow(restaurantsResult.data[0])) return;
  };
  const getAllergenLabel = (allergen: string) => {
    const key = normalizeAllergenKey(allergen);
    const row = allergenLibraryLookup[key];
    if (row) {
      const requested = normalizeLanguageKey(lang);
      const uiCode = toUiLang(lang);
      const localized = String(row[requested] || row[uiCode] || row.fr || allergen).trim();
      if (localized) return localized;
    }
    return translateAllergen(allergen, lang);
  };
  const getVisibleDishAllergenLabels = (dish: Dish) => {
    const baseAllergens = getAllergens(dish);
    const hasLibrary = Object.keys(allergenLibraryLookup).length > 0;
    if (hasLibrary) {
      const filteredBase = baseAllergens.filter((allergen) => {
        const key = normalizeAllergenKey(allergen);
        return Boolean(allergenLibraryLookup[key]);
      });
      if (baseAllergens.length > 0) {
        return filteredBase.map((allergen) => getAllergenLabel(allergen)).filter(Boolean);
      }
    }
    return getLocalizedAllergens(dish, lang).map((allergen) => getAllergenLabel(allergen)).filter(Boolean);
  };
  const currentLanguageMeta = {
    code: lang,
    name: enabledLanguageLabels[lang] || DEFAULT_LANGUAGE_LABELS[lang] || lang.toUpperCase(),
    flag: getLanguageFlag(lang),
  };
  const smartCallUi = SMART_CALL_UI[normalizedLang] || SMART_CALL_UI[uiLang] || SMART_CALL_UI.fr;

  useEffect(() => {
    fetchData();
  }, [scopedRestaurantId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchConsultationModeState();
    }, 10000);
    return () => window.clearInterval(intervalId);
  }, [scopedRestaurantId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("menuqr-client-theme");
    if (stored === "dark" || stored === "light") {
      setDarkMode(stored === "dark");
      return;
    }
    setDarkMode(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("menuqr-client-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeTick((prev) => prev + 1);
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("client-dishes")
      .on("postgres_changes", { event: "*", schema: "public", table: "dishes" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "subcategories" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sides_library" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "table_assignments" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurants" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scopedRestaurantId]);

  useEffect(() => {
    const channel = supabase
      .channel("client-display-settings")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "restaurants" },
        (payload) => {
          applyRealtimeDisplaySettingsRow(payload.new);
        }
      )
      .subscribe((status) => {
        console.log("Realtime client display settings:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scopedRestaurantId]);

  useEffect(() => {
    if (isCartOpen || formulaDish) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
    return undefined;
  }, [isCartOpen, formulaDish]);

  useEffect(() => {
    if (isInteractionDisabled && isCartOpen) {
      setIsCartOpen(false);
      setOrderSuccess(false);
    }
    if (isInteractionDisabled && formulaDish) {
      setFormulaDish(null);
      setFormulaSourceDish(null);
      setFormulaSelections({});
      setFormulaSelectionDetails({});
      setFormulaSelectionError("");
      setFormulaItemDetailsOpen({});
    }
  }, [isInteractionDisabled, isCartOpen, formulaDish]);

  useEffect(() => {
    if (!categoryDrawerEnabled) {
      setIsCategoryDrawerOpen(false);
    }
  }, [categoryDrawerEnabled]);

  useEffect(() => {
    if (!isVitrineMode) return;
    const targetRestaurantId = String((restaurant as any | null)?.id || scopedRestaurantId || "").trim();
    if (!targetRestaurantId) return;
    if (vitrineViewTrackedRef.current[targetRestaurantId]) return;
    vitrineViewTrackedRef.current[targetRestaurantId] = true;
    void fetch("/api/public/vitrine-view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ restaurant_id: targetRestaurantId }),
      cache: "no-store",
    }).catch(() => null);
  }, [isVitrineMode, restaurant, scopedRestaurantId]);

  useEffect(() => {
    if (!enabledLanguagesClient.includes(lang)) {
      setLang("fr");
    }
  }, [enabledLanguagesClient, lang]);

  useEffect(() => {
    setOrderValidationCodeInput("");
  }, [tableNumber]);

  const fetchFormulaLinksForMenu = async (sourceDishes: Dish[]) => {
    if (!scopedRestaurantId) {
      setFormulaLinksByFormulaId(new Map());
      setFormulaLinksByDishId(new Map());
      return;
    }

    const formulasResult = await supabase
      .from("restaurant_formulas")
      .select("*")
      .eq("restaurant_id", scopedRestaurantId)
      .eq("active", true);
    if (formulasResult.error) {
      console.warn("restaurant_formulas fetch failed (menu public):", toLoggableSupabaseError(formulasResult.error));
      setFormulaLinksByFormulaId(new Map());
      setFormulaLinksByDishId(new Map());
      setFormulaInfoById(new Map());
      return;
    }

    const formulaInfoByIdLocal = new Map<
      string,
      { name?: string; imageUrl?: string; dishId?: string | null; price?: number | null; description?: string | null; calories?: number | null; allergens?: string | null; formula_category_ids?: unknown; parent_dish_name?: string | null }
    >();
    const formulaIds: string[] = [];
    (formulasResult.data || []).forEach((row: unknown) => {
      if (!row || typeof row !== "object") return;
      const record = row as any;
      const formulaId = String(record.id || "").trim();
      if (!formulaId) return;
      const isActive = record.active == null ? true : toBooleanFlag(record.active);
      if (!isActive) return;
      const linkedDishId = record.dish_id ? String(record.dish_id) : null;
      const linkedDish =
        linkedDishId != null ? sourceDishes.find((d) => String(d.id) === linkedDishId) || null : null;
      const linkedDishPrice = parsePriceNumber(linkedDish?.price);
      const rawImage = sanitizeMediaUrl(
        record.image_url ?? record.image_path ?? record.image ?? linkedDish?.image_url,
        "dishes-images-"
      );
      formulaInfoByIdLocal.set(formulaId, {
        name: String(record.name || "").trim() || undefined,
        imageUrl: rawImage || undefined,
        dishId: linkedDishId,
        price: Number.isFinite(parsePriceNumber(record.price)) ? parsePriceNumber(record.price) : linkedDishPrice,
        description: record.description ?? null,
        calories: record.calories ?? null,
        allergens: record.allergens ?? null,
        parent_dish_name: record.parent_dish_name ?? record.parentDishName ?? null,
        formula_category_ids: record.formula_category_ids ?? null,
      });
      formulaIds.push(formulaId);
    });

    if (formulaIds.length === 0) {
      setFormulaLinksByFormulaId(new Map());
      setFormulaLinksByDishId(new Map());
      setFormulaInfoById(new Map());
      return;
    }

    const stepsResult = await supabase
      .from("formula_steps")
      .select("formula_id,dish_id,step_number,is_required,sort_order")
      .in("formula_id", formulaIds as never)
      .order("sort_order", { ascending: true });
    if (stepsResult.error) {
      console.warn("formula_steps fetch failed (menu public):", toLoggableSupabaseError(stepsResult.error));
      setFormulaLinksByFormulaId(new Map());
      setFormulaLinksByDishId(new Map());
      setFormulaInfoById(formulaInfoByIdLocal);
      return;
    }

    const formulaIdSet = new Set(formulaIds);
    const byFormula = new Map<string, FormulaDishLink[]>();
    const byDish = new Map<string, FormulaDishLink[]>();
    (stepsResult.data || []).forEach((rawRow: unknown) => {
      if (!rawRow || typeof rawRow !== "object") return;
      const row = rawRow as any;
      const formulaDishId = String(row.formula_id || "").trim();
      const dishId = String(row.dish_id || "").trim();
      if (!formulaDishId || !dishId || !formulaIdSet.has(formulaDishId)) return;
      const sequence = normalizeFormulaStepValue(row.step_number, true);
      const linkedDish = sourceDishes.find((d) => String(d.id) === dishId);
      const categoryId = linkedDish ? String(linkedDish.category_id || "").trim() : null;
      const formulaInfo = formulaInfoByIdLocal.get(formulaDishId);
      const formulaDish = sourceDishes.find((d) => String(d.id) === formulaDishId);
      const defaultOptions = formulaDish && (formulaDish as any).formula_default_option_ids
        ? ((formulaDish as any).formula_default_option_ids as any)[dishId] || []
        : [];
      const link: FormulaDishLink = {
        formulaDishId,
        dishId,
        categoryId,
        sequence,
        step: sequence,
        defaultProductOptionIds: Array.isArray(defaultOptions) ? defaultOptions : [],
        formulaName: formulaInfo?.name,
        formulaImageUrl: formulaInfo?.imageUrl,
        formulaMainDishId: formulaInfo?.dishId || null,
        formulaPrice: formulaInfo?.price ?? null,
      };
      const formulaLinks = byFormula.get(formulaDishId) || [];
      if (!formulaLinks.some((entry) => entry.dishId === dishId)) formulaLinks.push(link);
      byFormula.set(formulaDishId, formulaLinks);
      const dishLinks = byDish.get(dishId) || [];
      if (!dishLinks.some((entry) => entry.formulaDishId === formulaDishId)) dishLinks.push(link);
      byDish.set(dishId, dishLinks);
    });
    setFormulaLinksByFormulaId(byFormula);
    setFormulaLinksByDishId(byDish);
    setFormulaInfoById(formulaInfoByIdLocal);
  };

  const fetchData = async () => {
    console.log("ID utilisé:", scopedRestaurantId, "[client.fetchData]");
    setLoading(true);
    setIsRestaurantOffline(false);
    setOfflineRestaurantName("");
    setSuggestionLeadByLang({});
    setServiceHours({ lunch_start: "", lunch_end: "", dinner_start: "", dinner_end: "" });
    setTablePinCodesByNumber({});
    let displayFound = false;
    let restaurantFound = false;
    const applyRestaurantRow = (baseRow: Restaurant & Record<string, unknown>) => {
      const tableConfig = parseJsonObject(baseRow.table_config);
      const bannerImage = sanitizeMediaUrl(
        baseRow.banner_image_url ||
          baseRow.banner_url ||
          tableConfig.banner_image_url ||
          tableConfig.banner_url ||
          ""
      );
      const backgroundImage = sanitizeMediaUrl(
        baseRow.background_url ||
          baseRow.background_image_url ||
          baseRow.bg_image_url ||
          tableConfig.background_url ||
          tableConfig.background_image_url ||
          tableConfig.bg_image_url ||
          ""
      );
      const resolvedCardTransparent = parseShowCalories(
        baseRow.card_transparent ?? tableConfig.card_transparent ?? tableConfig.cards_transparent,
        false
      );
      const restaurantRow = {
        ...baseRow,
        font_family: String(baseRow.font_family || "").trim() || null,
        name: String(baseRow.name ?? "").trim(),
        logo_url: sanitizeMediaUrl(baseRow.logo_url),
        banner_image_url: bannerImage,
        banner_url: bannerImage,
        primary_color: normalizeHexColor(baseRow.primary_color, "#FFFFFF"),
        text_color: normalizeHexColor(baseRow.text_color ?? tableConfig.text_color ?? tableConfig.global_text_color, "#111111"),
        card_bg_color: normalizeHexColor(baseRow.card_bg_color, "#FFFFFF"),
        card_text_color: normalizeHexColor(baseRow.card_text_color ?? tableConfig.card_text_color, "#111111"),
        card_bg_opacity: normalizeOpacityPercent(
          baseRow.card_bg_opacity ?? tableConfig.card_bg_opacity,
          resolvedCardTransparent ? 0 : 100
        ),
        card_transparent: resolvedCardTransparent,
        card_density: String(baseRow.card_density || baseRow.density_style || tableConfig.card_density || tableConfig.density_style || "").trim() || null,
        density_style: String(baseRow.density_style || baseRow.card_density || tableConfig.density_style || tableConfig.card_density || "").trim() || null,
        bg_opacity: normalizeBackgroundOpacity(baseRow.bg_opacity ?? tableConfig.bg_opacity, 1),
        background_url: backgroundImage || BACKGROUND_URL,
        background_image_url: backgroundImage || BACKGROUND_URL,
      } as Restaurant & Record<string, unknown>;
      const isActive = typeof restaurantRow.is_active === "boolean" ? restaurantRow.is_active : true;
      if (!isActive) {
        setRestaurant(restaurantRow);
        setIsRestaurantOffline(true);
        setOfflineRestaurantName(String(restaurantRow.name || "").trim());
        setDishes([]);
        setCategories([]);
        setSubCategoryRows([]);
        setSidesLibrary([]);
        return false;
      }

      setIsRestaurantOffline(false);
      setOfflineRestaurantName("");
      setRestaurant(restaurantRow);
      console.log("POLICE RECUPEREE:", restaurantRow.font_family || null);
      console.log("Etat du mode consultation recu du serveur :", (restaurantRow as any).is_order_disabled ?? null);
      restaurantFound = true;
      if (
        Object.prototype.hasOwnProperty.call(restaurantRow, "show_calories") ||
        Object.prototype.hasOwnProperty.call(restaurantRow, "enabled_languages")
      ) {
        const parsed = parseDisplaySettingsFromRow(restaurantRow);
        setShowCaloriesClient(parsed.showCalories);
        setEnabledLanguagesClient(parsed.enabledLanguages);
        setEnabledLanguageLabels(parsed.languageLabels);
        setHeroEnabledClient(parsed.heroEnabled);
        setHeroBadgeTypeClient(parsed.heroBadgeType === "daily" ? "daily" : "chef");
        setConsultationModeClient(parsed.consultationMode);
        setOrderValidationCode(parsed.orderValidationCode || "1234");
        setSuggestionLeadByLang(parsed.suggestionMessagesI18n || {});
        setUiTranslationsByLang(parsed.uiTranslations || {});
        displayFound = true;
      } else {
        const parsed = parseDisplaySettingsFromSettingsJson(restaurantRow.settings);
        if (parsed) {
          setShowCaloriesClient(parsed.showCalories);
          setEnabledLanguagesClient(parsed.enabledLanguages);
          setEnabledLanguageLabels(parsed.languageLabels);
          setHeroEnabledClient(parsed.heroEnabled);
          setHeroBadgeTypeClient(parsed.heroBadgeType === "daily" ? "daily" : "chef");
          setConsultationModeClient(parsed.consultationMode);
          setOrderValidationCode(parsed.orderValidationCode || "1234");
          setSuggestionLeadByLang(parsed.suggestionMessagesI18n || {});
          setUiTranslationsByLang(parsed.uiTranslations || {});
          displayFound = true;
        }
      }
        const rawDrawerEnabled =
          tableConfig.category_drawer_enabled ??
          tableConfig.show_category_drawer ??
          (restaurantRow as any).category_drawer_enabled ??
          (restaurantRow as any).show_category_drawer;
        const rawKeepSuggestions =
          tableConfig.keep_suggestions_on_top ??
          tableConfig.pin_suggestions ??
          (restaurantRow as any).keep_suggestions_on_top ??
          (restaurantRow as any).pin_suggestions;
        setCategoryDrawerEnabled(Boolean(rawDrawerEnabled));
        setKeepSuggestionsOnTop(Boolean(rawKeepSuggestions));
        setServiceHours({
          lunch_start: String(tableConfig.service_lunch_start || tableConfig.lunch_start || "").trim(),
          lunch_end: String(tableConfig.service_lunch_end || tableConfig.lunch_end || "").trim(),
          dinner_start: String(tableConfig.service_dinner_start || tableConfig.dinner_start || "").trim(),
          dinner_end: String(tableConfig.service_dinner_end || tableConfig.dinner_end || "").trim(),
        });
      return true;
    };

    const publicRestaurantRow = await fetchPublicRestaurantConfig(scopedRestaurantId);
    if (publicRestaurantRow) {
      const shouldContinue = applyRestaurantRow(publicRestaurantRow as Restaurant & Record<string, unknown>);
      if (!shouldContinue) {
        setLoading(false);
        return;
      }
    }

    if (!restaurantFound) {
      const restaurantsResult = scopedRestaurantId
        ? await supabase
            .from("restaurants")
            .select("*")
            .eq("id", scopedRestaurantId)
            .limit(1)
        : await supabase
            .from("restaurants")
            .select("*")
            .limit(1);
      const restaurantsData = restaurantsResult.data;
      const restaurantsError = restaurantsResult.error;
      if (!restaurantsError && Array.isArray(restaurantsData) && restaurantsData[0]) {
        const shouldContinue = applyRestaurantRow(restaurantsData[0] as Restaurant & Record<string, unknown>);
        if (!shouldContinue) {
          setLoading(false);
          return;
        }
      }
    }

    if (!scopedRestaurantId && !displayFound && ENABLE_RESTAURANT_PROFILE_FALLBACK) {
      const { data: profileData, error: profileError } = await supabase
        .from("restaurant_profile")
        .select("*")
        .limit(1);
      if (!profileError && Array.isArray(profileData) && profileData[0]) {
        const row = profileData[0] as unknown as any;
        if (!restaurantFound) {
          const normalizedProfileRow = {
            ...row,
            font_family: String(row.font_family || "").trim() || null,
          } as Restaurant;
          setRestaurant(normalizedProfileRow);
          console.log("POLICE RECUPEREE:", (normalizedProfileRow as any).font_family || null);
        }
        if (
          Object.prototype.hasOwnProperty.call(row, "show_calories") ||
          Object.prototype.hasOwnProperty.call(row, "enabled_languages")
        ) {
    const parsed = parseDisplaySettingsFromRow(row);
    console.log("État du mode consultation reçu du serveur :", row.is_order_disabled ?? null, "=> parsed:", parsed.consultationMode);
    setShowCaloriesClient(parsed.showCalories);
          setEnabledLanguagesClient(parsed.enabledLanguages);
          setEnabledLanguageLabels(parsed.languageLabels);
          setHeroEnabledClient(parsed.heroEnabled);
          setHeroBadgeTypeClient(parsed.heroBadgeType === "daily" ? "daily" : "chef");
          setConsultationModeClient(parsed.consultationMode);
          setOrderValidationCode(parsed.orderValidationCode || "1234");
          setSuggestionLeadByLang(parsed.suggestionMessagesI18n || {});
        setUiTranslationsByLang(parsed.uiTranslations || {});
          displayFound = true;
        } else {
          const parsed = parseDisplaySettingsFromSettingsJson((row as { settings?: unknown }).settings);
          if (parsed) {
            setShowCaloriesClient(parsed.showCalories);
            setEnabledLanguagesClient(parsed.enabledLanguages);
            setEnabledLanguageLabels(parsed.languageLabels);
            setHeroEnabledClient(parsed.heroEnabled);
            setHeroBadgeTypeClient(parsed.heroBadgeType === "daily" ? "daily" : "chef");
            setConsultationModeClient(parsed.consultationMode);
            setOrderValidationCode(parsed.orderValidationCode || "1234");
            setSuggestionLeadByLang(parsed.suggestionMessagesI18n || {});
        setUiTranslationsByLang(parsed.uiTranslations || {});
            displayFound = true;
          }
        }
      }
    }

    if (!restaurantFound) {
      try {
        const restaurantPath = scopedRestaurantId
          ? `${supabaseUrl}/rest/v1/restaurants?select=*&id=eq.${encodeURIComponent(scopedRestaurantId)}&limit=1`
          : `${supabaseUrl}/rest/v1/restaurants?select=*&limit=1`;
        const restoResponse = await fetch(restaurantPath, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
        });
        const restoData = await restoResponse.json();
        if (Array.isArray(restoData) && restoData[0]) {
          const shouldContinue = applyRestaurantRow(restoData[0] as Restaurant & Record<string, unknown>);
          if (!shouldContinue) {
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error("Unable to fetch restaurants via REST fallback:", e);
      }
    }

    let categoriesResult = scopedRestaurantId
      ? await supabase
          .from("categories")
          .select("*")
          .eq("restaurant_id", scopedRestaurantId)
          .order("id", { ascending: true })
      : await supabase
          .from("categories")
          .select("*")
          .order("id", { ascending: true });
    if (categoriesResult.error && !scopedRestaurantId) {
      categoriesResult = await supabase
        .from("categories")
        .select("*")
        .order("id", { ascending: true });
    }
    const categoriesData = categoriesResult.data;
    const categoriesError = categoriesResult.error;
    if (!categoriesError) {
      setCategories((categoriesData || []) as CategoryItem[]);
    } else {
      setCategories([]);
    }

    let subRowsResult = scopedRestaurantId
      ? await supabase
          .from("subcategories")
          .select("*")
          .eq("restaurant_id", scopedRestaurantId)
          .order("id", { ascending: true })
      : await supabase
          .from("subcategories")
          .select("*")
          .order("id", { ascending: true });
    if (subRowsResult.error && !scopedRestaurantId) {
      subRowsResult = await supabase
        .from("subcategories")
        .select("*")
        .order("id", { ascending: true });
    }
    const subRows = subRowsResult.data;
    const subRowsError = subRowsResult.error;
    if (subRowsError) {
      setSubCategoryRows([]);
    } else {
      setSubCategoryRows((subRows || []) as SubCategoryItem[]);
    }

    const buildDishesQuery = ({
      selectClause,
      filterActive,
      orderByCategory,
      withScope,
      scopeColumn,
    }: {
      selectClause: string;
      filterActive: boolean;
      orderByCategory: boolean;
      withScope: boolean;
      scopeColumn: "restaurant_id";
    }) => {
      let query = supabase.from("dishes").select(selectClause);
      if (withScope && scopedRestaurantId) query = query.eq(scopeColumn, scopedRestaurantId);
      if (filterActive) query = query.eq("active", true);
      if (orderByCategory) query = query.order("category_id", { ascending: true });
      return query.order("id", { ascending: true });
    };

    const dishesQueryAttempts: Array<{
      label: string;
      selectClause: string;
      filterActive: boolean;
      orderByCategory: boolean;
      withScope: boolean;
      scopeColumn: "restaurant_id";
    }> = [
      {
        label: "dishes-rich-select+active+category",
        selectClause:
          "*, is_chef_suggestion, is_suggestion, is_daily_special, suggestion_message_fr, suggestion_message_en, suggestion_message_es, suggestion_message_de, formula_default_option_ids, formula_sequence_by_dish",
        filterActive: true,
        orderByCategory: true,
        withScope: Boolean(scopedRestaurantId),
        scopeColumn: "restaurant_id",
      },
      {
        label: "dishes-rich-select+active+category(retry-2)",
        selectClause:
          "*, is_chef_suggestion, is_suggestion, is_daily_special, suggestion_message_fr, suggestion_message_en, suggestion_message_es, suggestion_message_de, formula_default_option_ids, formula_sequence_by_dish",
        filterActive: true,
        orderByCategory: true,
        withScope: Boolean(scopedRestaurantId),
        scopeColumn: "restaurant_id",
      },
      {
        label: "dishes-basic-select+active+category",
        selectClause: "*",
        filterActive: true,
        orderByCategory: true,
        withScope: Boolean(scopedRestaurantId),
        scopeColumn: "restaurant_id",
      },
      {
        label: "dishes-basic-select+active+category(retry-2)",
        selectClause: "*",
        filterActive: true,
        orderByCategory: true,
        withScope: Boolean(scopedRestaurantId),
        scopeColumn: "restaurant_id",
      },
      {
        label: "dishes-basic-select+category",
        selectClause: "*",
        filterActive: false,
        orderByCategory: true,
        withScope: Boolean(scopedRestaurantId),
        scopeColumn: "restaurant_id",
      },
      {
        label: "dishes-basic-select+category(retry-2)",
        selectClause: "*",
        filterActive: false,
        orderByCategory: true,
        withScope: Boolean(scopedRestaurantId),
        scopeColumn: "restaurant_id",
      },
      {
        label: "rich-select+active+category",
        selectClause:
          "*, is_chef_suggestion, is_suggestion, is_daily_special, suggestion_message_fr, suggestion_message_en, suggestion_message_es, suggestion_message_de",
        filterActive: true,
        orderByCategory: true,
        withScope: Boolean(scopedRestaurantId),
        scopeColumn: "restaurant_id",
      },
      {
        label: "rich-select+active+category(retry-2)",
        selectClause:
          "*, is_chef_suggestion, is_suggestion, is_daily_special, suggestion_message_fr, suggestion_message_en, suggestion_message_es, suggestion_message_de",
        filterActive: true,
        orderByCategory: true,
        withScope: Boolean(scopedRestaurantId),
        scopeColumn: "restaurant_id",
      },
      { label: "basic-select+active+category", selectClause: "*", filterActive: true, orderByCategory: true, withScope: Boolean(scopedRestaurantId), scopeColumn: "restaurant_id" },
      { label: "basic-select+active+category(retry-2)", selectClause: "*", filterActive: true, orderByCategory: true, withScope: Boolean(scopedRestaurantId), scopeColumn: "restaurant_id" },
      { label: "basic-select+category", selectClause: "*", filterActive: false, orderByCategory: true, withScope: Boolean(scopedRestaurantId), scopeColumn: "restaurant_id" },
      { label: "basic-select+category(retry-2)", selectClause: "*", filterActive: false, orderByCategory: true, withScope: Boolean(scopedRestaurantId), scopeColumn: "restaurant_id" },
      { label: "basic-select+id", selectClause: "*", filterActive: false, orderByCategory: false, withScope: Boolean(scopedRestaurantId), scopeColumn: "restaurant_id" },
      { label: "basic-select+id(retry-2)", selectClause: "*", filterActive: false, orderByCategory: false, withScope: Boolean(scopedRestaurantId), scopeColumn: "restaurant_id" },
    ];
    if (!scopedRestaurantId) {
      dishesQueryAttempts.push(
      { label: "dishes-basic-select+active+category(unscoped)", selectClause: "*", filterActive: true, orderByCategory: true, withScope: false, scopeColumn: "restaurant_id" },
      { label: "dishes-basic-select+id(unscoped)", selectClause: "*", filterActive: false, orderByCategory: false, withScope: false, scopeColumn: "restaurant_id" },
        { label: "basic-select+active+category(unscoped)", selectClause: "*", filterActive: true, orderByCategory: true, withScope: false, scopeColumn: "restaurant_id" },
        { label: "basic-select+id(unscoped)", selectClause: "*", filterActive: false, orderByCategory: false, withScope: false, scopeColumn: "restaurant_id" }
      );
    }

    let dishesData: unknown[] | null = null;
    let dishesError: unknown = null;
    for (const attempt of dishesQueryAttempts) {
      const result = await buildDishesQuery(attempt);
      if (!result.error) {
        dishesData = (result.data as unknown[] | null) || [];
        dishesError = null;
        break;
      }
      dishesError = result.error;
      console.warn("Dishes query attempt failed:", attempt.label, toLoggableSupabaseError(result.error));
    }

    if (!dishesError && Array.isArray(dishesData)) {
      const normalized = (dishesData as Array<Record<string, any>>)
        .filter((dish) => {
          if (!Object.prototype.hasOwnProperty.call(dish, "active")) return true;
          return Boolean((dish as any).active);
        })
        .map((dish) => {
        const row = dish as Dish & Record<string, any>;
        const selectedSides = Array.isArray(row.selected_sides)
          ? row.selected_sides
          : (() => {
              if (typeof row.selected_sides !== "string") return null;
              try {
                const parsed = JSON.parse(row.selected_sides);
                return Array.isArray(parsed) ? parsed : null;
              } catch {
                return null;
              }
            })();

          return {
            ...row,
            image_url: sanitizeMediaUrl(row.image_url ?? row.image ?? row.photo_url, "dishes-images-"),
            is_chef_suggestion: Boolean(row.is_chef_suggestion ?? row.is_featured ?? row.is_suggestion ?? false),
            is_suggestion: Boolean(row.is_suggestion ?? row.is_chef_suggestion ?? row.is_featured ?? false),
            is_promo: Boolean(row.is_promo ?? false),
            promo_price:
              row.promo_price == null || String(row.promo_price).trim() === ""
                ? null
                : Number(String(row.promo_price).replace(",", ".")),
            category_id: row.category_id ?? row.category ?? null,
            subcategory_id: row.subcategory_id ?? null,
            selected_sides: selectedSides,
            is_available: row.active ?? true,
            max_options: Number(row.max_options || 1),
            ask_cooking: row.ask_cooking ?? parseOptionsFromDescription(String(row.description || "")).askCooking,
          };
        });
      const optionsByDishId = new Map<string, ProductOptionItem[]>();
      const extrasByDishId = new Map<string, ExtrasItem[]>();
      const dishIds = normalized.map((row) => String(row.id || "").trim()).filter(Boolean);
      if (dishIds.length > 0) {
        const dishOptionsResult = await supabase
          .from("dish_options")
          .select("*")
          .in("dish_id", dishIds as never);
        if (!dishOptionsResult.error && Array.isArray(dishOptionsResult.data)) {
          const rowsByDishId = new Map<string, Array<Record<string, unknown>>>();
          (dishOptionsResult.data as Array<Record<string, unknown>>).forEach((row) => {
            const dishId = String(row.dish_id ?? "").trim();
            if (!dishId) return;
            const current = rowsByDishId.get(dishId) || [];
            current.push(row);
            rowsByDishId.set(dishId, current);
          });
          rowsByDishId.forEach((rows, dishId) => {
            const parsedRows = parseDishOptionsRowsToExtras(rows, dishId);
            if (parsedRows.length > 0) extrasByDishId.set(dishId, parsedRows);
          });
        } else if (dishOptionsResult.error) {
          console.warn("dish_options fetch failed (menu public):", toLoggableSupabaseError(dishOptionsResult.error));
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
            const dishId = String(row.product_id ?? row.dish_id ?? "").trim();
            const optionNames = {
              ...parseJsonObject(row.names_i18n),
              ...parseI18nToken(String(row.name_en || "")),
            };
            const optionName = String(row.name_fr || optionNames.fr || row.name || "").trim();
            if (!dishId || !optionName) return;
            const optionPrice = parsePriceNumber(row.price_override);
            const current = optionsByDishId.get(dishId) || [];
            current.push({
              id: String(row.id || ""),
              product_id: dishId,
              name: optionName,
              name_fr: optionName,
              name_en: String(row.name_en || optionNames.en || "").trim() || null,
              name_es: String(row.name_es || optionNames.es || "").trim() || null,
              name_de: String(row.name_de || optionNames.de || "").trim() || null,
              names_i18n: {
                fr: optionName,
                ...Object.fromEntries(
                  Object.entries(optionNames)
                    .map(([lang, value]) => [normalizeLanguageKey(lang), String(value || "").trim()])
                    .filter(([lang, value]) => Boolean(lang) && Boolean(value))
                ),
              },
              price_override: optionPrice > 0 ? optionPrice : 0,
            });
            optionsByDishId.set(dishId, current);
          });
        } else if (finalProductOptionsError) {
          console.warn("product_options fetch failed (menu public):", toLoggableSupabaseError(finalProductOptionsError));
        }
      }
      const normalizedWithOptions = normalized.map((dish) => ({
        ...dish,
        dish_options: extrasByDishId.get(String(dish.id || "").trim()) || [],
        has_extras:
          Boolean(dish.has_extras) ||
          (extrasByDishId.get(String(dish.id || "").trim()) || []).length > 0,
        product_options: optionsByDishId.get(String(dish.id || "").trim()) || [],
      }));
      setDishes(normalizedWithOptions as Dish[]);
      await fetchFormulaLinksForMenu(normalizedWithOptions as Dish[]);
    } else {
      console.error("Erreur Supabase dishes:", toLoggableSupabaseError(dishesError));
      setDishes([]);
      setFormulaLinksByFormulaId(new Map());
      setFormulaLinksByDishId(new Map());
    }

    let sideRowsResult = scopedRestaurantId
      ? await supabase
          .from("sides_library")
          .select("*")
          .eq("restaurant_id", scopedRestaurantId)
          .order("id", { ascending: true })
      : await supabase
          .from("sides_library")
          .select("*")
          .order("id", { ascending: true });
    if (sideRowsResult.error && !scopedRestaurantId) {
      sideRowsResult = await supabase
        .from("sides_library")
        .select("*")
        .order("id", { ascending: true });
    }
    const sideRows = sideRowsResult.data;
    const sideRowsError = sideRowsResult.error;
    if (sideRowsError) {
      setSidesLibrary([]);
    } else {
      setSidesLibrary((sideRows || []) as SideLibraryItem[]);
    }

    let tableAssignmentResult = scopedRestaurantId
      ? await supabase
          .from("table_assignments")
          .select("table_number,pin_code")
          .eq("restaurant_id", scopedRestaurantId)
      : await supabase
          .from("table_assignments")
          .select("table_number,pin_code");
    if (tableAssignmentResult.error && !scopedRestaurantId) {
      tableAssignmentResult = await supabase
        .from("table_assignments")
        .select("table_number,pin_code");
    }
    const tableAssignmentRows = tableAssignmentResult.data;
    const tableAssignmentError = tableAssignmentResult.error;
    if (tableAssignmentError) {
      setTablePinCodesByNumber({});
    } else {
      const nextPinsByTable: Record<string, string> = {};
      (tableAssignmentRows || []).forEach((row) => {
        const source = row as { table_number?: unknown; pin_code?: unknown };
        const tableKey = normalizeTableNumberKey(source.table_number);
        const pinCode = normalizePinValue(source.pin_code);
        if (!tableKey || !pinCode || pinCode === "0000") return;
        nextPinsByTable[tableKey] = pinCode;
      });
      setTablePinCodesByNumber(nextPinsByTable);
    }

    setLoading(false);
  };

  const getCategoryLabel = (category: CategoryItem) => {
    return getNameTranslation(category as unknown as unknown as any, lang) || category.name_fr;
  };

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const aOrder = Number.isFinite(Number(a.sort_order)) ? Number(a.sort_order) : 0;
      const bOrder = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return String(a.name_fr || "").localeCompare(String(b.name_fr || ""));
    });
  }, [categories]);
  const formulaMenuDishes = useMemo(() => {
    const list: Dish[] = [];
    formulaInfoById.forEach((info, formulaId) => {
      const baseDish =
        (info?.dishId && dishes.find((dish) => String(dish.id || "").trim() === String(info.dishId))) ||
        dishes.find((dish) => String(dish.id || "").trim() === String(formulaId)) ||
        null;
      const price = parsePriceNumber(info?.price ?? (baseDish as any)?.price);
      const imageUrl = sanitizeMediaUrl(info?.imageUrl ?? (baseDish as any)?.image_url, "dishes-images-");
      const name = info?.name || (baseDish ? getDishName(baseDish, lang) : `Formule ${String(formulaId).slice(-4)}`);
      const display: Dish = {
        ...(baseDish || {
          id: formulaId,
          name,
          name_fr: name,
          price,
          category_id: FORMULAS_CATEGORY_ID,
        }),
        name_fr: (baseDish as any)?.name_fr ?? name,
        name: (baseDish as any)?.name ?? name,
        price,
        category_id: FORMULAS_CATEGORY_ID,
        image_url: imageUrl || (baseDish as any)?.image_url,
        is_formula: true,
        formula_id: formulaId,
        formula_category_ids: info?.formula_category_ids ?? (baseDish as any)?.formula_category_ids ?? undefined,
      };
      list.push(display);
    });
    return list;
  }, [formulaInfoById, dishes, lang]);
  const hasFormulaDishes = useMemo(
    () =>
      dishes.some((dish) => toBooleanFlag((dish as any).is_formula ?? dish.is_formula)) ||
      formulaMenuDishes.length > 0,
    [dishes, formulaMenuDishes.length]
  );
  const menuCategories = useMemo(() => {
    if (!hasFormulaDishes) return sortedCategories;
    const virtualFormulaCategory: CategoryItem = {
      id: FORMULAS_CATEGORY_ID,
      name_fr: formulaCategoryLabel,
      sort_order: Number.MAX_SAFE_INTEGER,
      destination: "cuisine",
    };
    return [...sortedCategories, virtualFormulaCategory];
  }, [sortedCategories, hasFormulaDishes, formulaCategoryLabel]);

  const categoryList = useMemo(() => {
    const allLabel = uiText.categories[0];
    return [
      allLabel,
      ...menuCategories.map((category) =>
        String(category.id || "") === FORMULAS_CATEGORY_ID ? formulaCategoryLabel : getCategoryLabel(category)
      ),
    ];
  }, [menuCategories, uiText.categories, formulaCategoryLabel]);

  const categorySortMap = useMemo(() => {
    const map = new Map<string | number, number>();
    sortedCategories.forEach((category, index) => {
      const raw = Number(category.sort_order);
      const order = Number.isFinite(raw) ? raw : index;
      map.set(category.id, order);
    });
    return map;
  }, [sortedCategories]);

  const availabilitySnapshot = useMemo(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const todayKey = dayKeys[now.getDay()] || "sun";
    const windows = [
      {
        start: parseTimeToMinutes(serviceHours.lunch_start),
        end: parseTimeToMinutes(serviceHours.lunch_end),
      },
      {
        start: parseTimeToMinutes(serviceHours.dinner_start),
        end: parseTimeToMinutes(serviceHours.dinner_end),
      },
    ].filter((range) => range.start != null || range.end != null);
    const isWithinServiceWindow =
      windows.length === 0 ||
      windows.some((range) => isWithinTimeWindow(nowMinutes, range.start ?? null, range.end ?? null));
    return { nowMinutes, todayKey, isWithinServiceWindow };
  }, [serviceHours, timeTick]);

  const isDishAvailableNow = (dish: Dish) => {
    const availableDays = parseAvailableDays(dish.available_days);
    const hasDayRestriction = availableDays.length > 0;
    if (hasDayRestriction && !availableDays.includes(availabilitySnapshot.todayKey)) return false;
    const dishStart = parseTimeToMinutes(dish.start_time);
    const dishEnd = parseTimeToMinutes(dish.end_time);
    const hasTimeRestriction = dishStart != null || dishEnd != null;
    if (hasTimeRestriction && !isWithinTimeWindow(availabilitySnapshot.nowMinutes, dishStart, dishEnd))
      return false;
    const hasDishRestriction = hasDayRestriction || hasTimeRestriction;
    if (!hasDishRestriction) {
      return true;
    }
    if (!availabilitySnapshot.isWithinServiceWindow) return false;
    return true;
  };

  const isDishVisibleInMenu = (dish: Dish) => {
    const dishRecord = dish as unknown as any;
    const onlyInFormula = toBooleanFlag(dishRecord.only_in_formula ?? dish.only_in_formula);
    // Les plats only_in_formula ne sont affich�s que dans les formules
    if (onlyInFormula) return false;
    return true;
  };

  const getSideLabel = (side: SideLibraryItem) => {
    const fromTranslations = getNameTranslation(side as unknown as unknown as any, lang);
    if (fromTranslations) return fromTranslations;
    const raw = String(side.name_en || "");
    if (raw.startsWith("__I18N__:")) {
      try {
        const parsed = JSON.parse(decodeURIComponent(raw.replace("__I18N__:", ""))) as unknown as any;
        const dynamic = parsed?.[lang];
        if (typeof dynamic === "string" && dynamic.trim()) return dynamic.trim();
        const dynamicUi = parsed?.[uiLang];
        if (typeof dynamicUi === "string" && dynamicUi.trim()) return dynamicUi.trim();
      } catch {
        // ignore malformed token
      }
    }
    if (lang === "en" && side.name_en) return side.name_en;
    if (lang === "es" && side.name_es) return side.name_es;
    if (lang === "de" && side.name_de) return side.name_de;
    return side.name_fr;
  };

  const getSubCategoryLabel = (subCategory: SubCategoryItem) => {
    return getNameTranslation(subCategory as unknown as unknown as any, lang) || subCategory.name_fr;
  };

  const sideNameFrById = useMemo(() => {
    const map = new Map<string, string>();
    sidesLibrary.forEach((side) => {
      const id = String(side.id || "").trim();
      if (!id) return;
      const label = String(side.name_fr || "").trim();
      if (!label) return;
      map.set(id, label);
    });
    return map;
  }, [sidesLibrary]);

  const sideIdByAlias = useMemo(() => {
    const map = new Map<string, string>();
    sidesLibrary.forEach((side) => {
      const id = String(side.id || "").trim();
      if (!id) return;
      const aliasValues = new Set<string>();
      [side.name_fr, side.name_en, side.name_es, side.name_de].forEach((value) => {
        const text = String(value || "").trim();
        if (!text) return;
        aliasValues.add(text);
        const tokenValues = parseI18nToken(text);
        Object.values(tokenValues).forEach((tokenValue) => {
          const tokenText = String(tokenValue || "").trim();
          if (tokenText) aliasValues.add(tokenText);
        });
      });
      aliasValues.forEach((alias) => {
        const normalized = normalizeLookupText(alias);
        if (!normalized) return;
        map.set(normalized, id);
      });
    });
    return map;
  }, [sidesLibrary]);
  const emptyFormulaSelectionDetails: FormulaSelectionDetails = {
    selectedSideIds: [],
    selectedSides: [],
    selectedCooking: "",
    selectedProductOptionIds: [],
  };
  const getFormulaSelectionDetails = (categoryId: string) => {
    const details = formulaSelectionDetails[categoryId];
    return details || emptyFormulaSelectionDetails;
  };
  const getFormulaDishConfig = (dish: Dish) => {
    const parsed = parseOptionsFromDescription(String(dish.description || ""));
    const selectedSideIdsRaw = Array.isArray(dish.selected_sides) ? dish.selected_sides : parsed.sideIds || [];
    const sideOptions = dedupeDisplayValues(
      selectedSideIdsRaw
        .map((id) => sidesLibrary.find((side) => String(side.id) === String(id)))
        .filter(Boolean)
        .map((side) => getSideLabel(side as SideLibraryItem))
    );
    const hasRequiredSides = Boolean(dish.has_sides) || sideOptions.length > 0;
    const maxRaw = Number(dish.max_options);
    const maxSides = Number.isFinite(maxRaw) && maxRaw > 0 ? Math.max(1, Math.trunc(maxRaw)) : 1;
    const askCooking = Boolean(dish.ask_cooking || parsed.askCooking);
    const dishRecord = dish as any;
    const productOptions = Array.isArray(dishRecord.product_options)
      ? (dishRecord.product_options as ProductOptionItem[]).filter(Boolean)
      : [];
    return { sideOptions, hasRequiredSides, maxSides, askCooking, productOptions };
  };

  const selectedCategoryId = useMemo(() => {
    if (selectedCategory === 0) return null;
    const category = menuCategories[selectedCategory - 1];
    return category?.id ?? null;
  }, [selectedCategory, menuCategories]);

  useEffect(() => {
    const maxIndex = categoryList.length - 1;
    if (selectedCategory > maxIndex) {
      setSelectedCategory(Math.max(0, maxIndex));
    }
  }, [categoryList.length, selectedCategory]);

  const categoryById = useMemo(() => {
    const map = new Map<string, CategoryItem>();
    sortedCategories.forEach((category) => {
      const key = String(category.id || "").trim();
      if (!key) return;
      map.set(key, category);
    });
    return map;
  }, [sortedCategories]);

  const dishById = useMemo(() => {
    const map = new Map<string, Dish>();
    dishes.forEach((dish) => map.set(String(dish.id || "").trim(), dish));
    return map;
  }, [dishes]);

  const linkedFormulasByDishId = useMemo(() => {
    const map = new Map<string, Dish[]>();
    formulaLinksByDishId.forEach((links, dishId) => {
      const formulas = links
        .map((link) => dishById.get(link.formulaDishId))
        .filter(
          (formula): formula is Dish =>
            Boolean(formula) && toBooleanFlag(((formula as unknown as any).is_formula ?? formula?.is_formula) as unknown)
        );
      if (formulas.length === 0) return;
      const uniqueById = new Map<string, Dish>();
      formulas.forEach((formula) => uniqueById.set(String(formula.id || "").trim(), formula));
      const sorted = [...uniqueById.values()].sort(
        (a, b) => getDishBasePrice(a) - getDishBasePrice(b)
      );
      map.set(dishId, sorted);
    });
    return map;
  }, [formulaLinksByDishId, dishById]);
  const formulaMainConfig = formulaDish ? getFormulaDishConfig(formulaDish) : null;

  const formulaDefaultOptionsByDishId = useMemo(() => {
    const map = new Map<string, string[]>();
    const formulaDishId = String(formulaDish?.id || "").trim();
    if (!formulaDishId) return map;
    const links = formulaLinksByFormulaId.get(formulaDishId) || [];
    links.forEach((link) => {
      const dishId = String(link.dishId || "").trim();
      if (!dishId) return;
      const defaults = Array.isArray(link.defaultProductOptionIds) ? link.defaultProductOptionIds : [];
      if (defaults.length > 0) map.set(dishId, defaults);
    });
    return map;
  }, [formulaDish, formulaLinksByFormulaId]);

  const formulaDisplayById = useMemo(() => {
    const map = new Map<string, { name?: string; imageUrl?: string; description?: string | null; calories?: number | null }>();
    formulaInfoById.forEach((info, id) => {
      map.set(id, { name: info.name, imageUrl: info.imageUrl, description: info.description, calories: info.calories });
    });
    return map;
  }, [formulaInfoById]);

  const getFormulaDisplayName = (formula: Dish | null) => {
    if (!formula) return "";
    const formulaId = String(formula.id || "").trim();
    const display = formulaDisplayById.get(formulaId);
    return String(display?.name || "").trim() || getDishName(formula, lang);
  };

  const formulaLinkedOptionsByCategory = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const formulaDishId = String(formulaDish?.id || "").trim();
    if (!formulaDishId) return map;
    const links = formulaLinksByFormulaId.get(formulaDishId) || [];
    if (links.length === 0) return map;
    links.forEach((link) => {
      const categoryId = link.categoryId ? String(link.categoryId || "").trim() : null;
      if (!categoryId) {
        const dish = dishById.get(String(link.dishId || "").trim());
        if (!dish) return;
        const fallbackCategoryId = String(dish.category_id || "").trim();
        if (fallbackCategoryId) {
          const current = map.get(fallbackCategoryId) || new Set<string>();
          current.add(String(link.dishId || "").trim());
          map.set(fallbackCategoryId, current);
        }
        return;
      }
      const current = map.get(categoryId) || new Set<string>();
      current.add(String(link.dishId || "").trim());
      map.set(categoryId, current);
    });
    return map;
  }, [formulaDish, formulaLinksByFormulaId, dishById]);

  const normalizedFormulaCategoryIds = useMemo(() => {
    const raw = (formulaDish as unknown as any | null)?.formula_category_ids;
    if (!raw) return [] as string[];
    if (Array.isArray(raw)) {
      return raw.map((entry) => String(entry || "").trim()).filter(Boolean);
    }
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map((entry) => String(entry || "").trim()).filter(Boolean);
        }
      } catch {
        // ignore invalid json
      }
      return raw
        .split(",")
        .map((entry) => String(entry || "").trim())
        .filter(Boolean);
    }
    return [];
  }, [formulaDish]);

  const formulaCategories = useMemo(() => {
    if (normalizedFormulaCategoryIds.length === 0) return [] as CategoryItem[];
    return normalizedFormulaCategoryIds
      .map((id) => categoryById.get(id))
      .filter(Boolean) as CategoryItem[];
  }, [normalizedFormulaCategoryIds, categoryById]);

  const formulaOptionsByCategory = useMemo(() => {
    const map = new Map<string, Dish[]>();
    if (formulaCategories.length === 0) return map;
    formulaCategories.forEach((category) => {
      const categoryId = String(category.id || "").trim();
      const linkedIds = formulaLinkedOptionsByCategory.get(categoryId);
      if (!linkedIds || linkedIds.size === 0) {
        map.set(categoryId, []);
        return;
      }
      const options = dishes
        .filter((dish) => String(dish.category_id || "").trim() === categoryId)
        .filter((dish) => dish.is_available !== false)
        .filter((dish) => isDishAvailableNow(dish))
        .filter((dish) => !toBooleanFlag((dish as any).is_formula))
        .filter((dish) => String(dish.id) !== String(formulaDish?.id || ""));
      const filteredOptions = options.filter((dish) => linkedIds.has(String(dish.id || "").trim()));
      const sourceDishId = String(formulaSourceDish?.id || "").trim();
      const sourceCategoryId = String(formulaSourceDish?.category_id || "").trim();
      if (sourceDishId && sourceCategoryId === categoryId) {
        const sourceDish = dishById.get(sourceDishId) || formulaSourceDish;
        if (sourceDish) {
          const exists = filteredOptions.some((dish) => String(dish.id || "").trim() === sourceDishId);
          if (!exists) filteredOptions.unshift(sourceDish);
        }
      }
      map.set(categoryId, filteredOptions);
    });
    return map;
  }, [dishes, formulaCategories, formulaDish, availabilitySnapshot, formulaLinkedOptionsByCategory, formulaSourceDish, dishById]);

  const formulaSequenceByDishId = useMemo(() => {
    const map = new Map<string, number>();
    const formulaDishId = String(formulaDish?.id || "").trim();
    if (!formulaDishId) return map;
    const links = formulaLinksByFormulaId.get(formulaDishId) || [];
    links.forEach((link) => {
      const sequence = normalizeFormulaStepValue(link.step ?? link.sequence, true);
      if (sequence == null) return;
      const dishId = String(link.dishId || "").trim();
      if (!dishId) return;
      map.set(dishId, sequence);
    });
    return map;
  }, [formulaDish, formulaLinksByFormulaId]);
  const formulaStepTitle = useMemo(() => {
    const fromSource = String(formulaSourceDish?.name_fr || formulaSourceDish?.name || "").trim();
    if (fromSource) return fromSource;
    const formulaDishId = String(formulaDish?.id || "").trim();
    if (!formulaDishId) return "";
    const links = formulaLinksByFormulaId.get(formulaDishId) || [];
    const firstStepLink = [...links]
      .map((link) => ({
        link,
        step: normalizeFormulaStepValue(link.step ?? link.sequence, true),
      }))
      .filter((entry) => entry.step != null && entry.step > 0)
      .sort((a, b) => Number(a.step) - Number(b.step))[0];
    if (!firstStepLink) return "";
    const stepDishId = String(firstStepLink.link.dishId || "").trim();
    if (!stepDishId) return "";
    const stepDish = dishById.get(stepDishId);
    return stepDish ? getDishName(stepDish, lang) : "";
  }, [formulaSourceDish, formulaDish, formulaLinksByFormulaId, dishById, lang]);

  const selectedDishLinkedFormulas = useMemo(() => {
    if (!selectedDish) return [] as Dish[];
    const dishId = String(selectedDish.id || "").trim();
    return linkedFormulasByDishId.get(dishId) || [];
  }, [selectedDish, linkedFormulasByDishId]);

  const isSelectedFormulaDish = selectedDish
    ? toBooleanFlag((selectedDish as any).is_formula ?? selectedDish.is_formula)
    : false;
  const selectedFormulaButtonDish =
    selectedDishLinkedFormulas[0] || (isSelectedFormulaDish && selectedDish ? selectedDish : null);
  const formulaAddDisabled = (() => {
    if (!formulaDish) return false;
    const formulaMainConfig = getFormulaDishConfig(formulaDish);
    if (formulaMainConfig) {
      if (formulaMainConfig.hasRequiredSides && formulaMainDetails.selectedSides.length === 0) return true;
      if (formulaMainConfig.askCooking && !String(formulaMainDetails.selectedCooking || "").trim()) return true;
    }
    const hasMissingCategory = normalizedFormulaCategoryIds.some((categoryId) => {
      const normalizedCategoryId = String(categoryId || "").trim();
      if (!normalizedCategoryId) return false;
      const options = formulaOptionsByCategory.get(normalizedCategoryId) || [];
      if (options.length === 0) return false;
      return !formulaSelections[normalizedCategoryId];
    });
    if (hasMissingCategory) return true;
    const hasMissingRequiredOptions = normalizedFormulaCategoryIds.some((categoryId) => {
      const normalizedCategoryId = String(categoryId || "").trim();
      if (!normalizedCategoryId) return false;
      const selectedId = String(formulaSelections[normalizedCategoryId] || "").trim();
      if (!selectedId) return false;
      const selectedDish = dishById.get(selectedId);
      if (!selectedDish) return false;
      const config = getFormulaDishConfig(selectedDish);
      const details = formulaSelectionDetails[normalizedCategoryId] || emptyFormulaSelectionDetails;
      if (config.productOptions.length > 0 && details.selectedProductOptionIds.length === 0) {
        return true;
      }
      if (config.hasRequiredSides && details.selectedSides.length === 0) {
        return true;
      }
      if (config.askCooking && !String(details.selectedCooking || "").trim()) {
        return true;
      }
      return false;
    });
    return hasMissingRequiredOptions;
  })();

  useEffect(() => {
    if (!formulaDish || !formulaSourceDish) return;
    const sourceDishId = String(formulaSourceDish.id || "").trim();
    const sourceCategoryId = String(formulaSourceDish.category_id || "").trim();
    if (!sourceDishId || !sourceCategoryId) return;
    const options = formulaOptionsByCategory.get(sourceCategoryId) || [];
    if (!options.some((dish) => String(dish.id || "").trim() === sourceDishId)) return;
    setFormulaSelections((prev) => {
      if (prev[sourceCategoryId] === sourceDishId) return prev;
      return { ...prev, [sourceCategoryId]: sourceDishId };
    });
    const config = getFormulaDishConfig(formulaSourceDish);
    const rawDefaults = formulaDefaultOptionsByDishId.get(sourceDishId) || [];
    const allowedIds = new Set(config.productOptions.map((option) => String(option.id || "").trim()).filter(Boolean));
    const normalizedDefaults = rawDefaults.filter((id) => allowedIds.has(String(id || "").trim()));
    if (normalizedDefaults.length > 0) {
      const allowMulti = Boolean((formulaSourceDish as any)?.allow_multi_select);
      const nextDefaults = allowMulti ? normalizedDefaults : normalizedDefaults.slice(0, 1);
      setFormulaSelectionDetails((prev) => {
        const current = prev[sourceCategoryId];
        if (current && current.selectedProductOptionIds.length > 0) return prev;
        return {
          ...prev,
          [sourceCategoryId]: {
            selectedSideIds: [],
            selectedSides: [],
            selectedCooking: "",
            selectedProductOptionIds: nextDefaults,
          },
        };
      });
    }
  }, [formulaDish, formulaSourceDish, formulaOptionsByCategory, formulaDefaultOptionsByDishId]);

  function normalizeFormulaStepValue(value: unknown, allowZero = false) {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return null;
    const truncated = Math.trunc(raw);
    if (allowZero && truncated === 0) return 0;
    if (truncated <= 0) return null;
    return Math.max(1, truncated);
  }

  function isDirectFormulaStep(value: unknown) {
    const normalizedText = normalizeLookupText(value);
    if (normalizedText.includes("direct")) return true;
    const normalizedStep = normalizeFormulaStepValue(value, true);
    if (normalizedStep == null) return false;
    return normalizedStep === 0 || normalizedStep >= FORMULA_DIRECT_SEND_SEQUENCE;
  }

  function resolveInitialFormulaItemStatus(sequence: number | null, sortOrder?: unknown) {
    const normalizedSort = Number(sortOrder);
    if (Number.isFinite(normalizedSort) && Math.trunc(normalizedSort) === 0) return "preparing";
    if (sequence != null && sequence <= 1) return "preparing";
    if (sequence != null && sequence > 1) return "pending";
    return "pending";
  }

  function mapSequenceToOrderStep(value: unknown) {
    const normalizedStep = normalizeFormulaStepValue(value, true);
    if (normalizedStep == null) return null;
    if (isDirectFormulaStep(normalizedStep)) return 0;
    if (normalizedStep <= 1) return 1;
    if (normalizedStep === 2) return 2;
    return 3;
  }

  function resolveOrderStepForPayloadItem(item: Record<string, unknown>) {
    const explicitStep = mapSequenceToOrderStep(
      item.step ?? item.sequence ?? item.formula_current_sequence ?? item.formulaCurrentSequence
    );
    if (explicitStep != null) return explicitStep;
    const destination = String(item.destination || "").trim().toLowerCase();
    if (destination === "bar") return 0;
    const categoryId = item.category_id as string | number | null | undefined;
    if (item.is_drink === true || isDrinkCategory(categoryId)) return 0;
    const categoryLabel = normalizeLookupText(
      String(item.category || item.categorie || categoryById.get(String(categoryId || "").trim())?.name_fr || "")
    );
    if (/(entree|starter|appetizer)/.test(categoryLabel)) return 1;
    if (isDessertCategory(categoryId) || /(dessert|sweet|sucre)/.test(categoryLabel)) return 3;
    return 2;
  }

  function normalizeFormulaOrderItemsForPayload<T extends Record<string, unknown>>(items: T[]) {
    const normalized = items.map((entry) => {
      const current = { ...entry } as T;
      const step = resolveOrderStepForPayloadItem(current as Record<string, unknown>);
      const currentRecord = current as Record<string, unknown>;
      currentRecord.step = step;
      currentRecord.sequence = step;
      const formulaDishId = String(
        currentRecord.formula_dish_id ?? currentRecord.formulaDishId ?? currentRecord.formula_id ?? currentRecord.formulaId ?? ""
      ).trim();
      const isFormulaItem = Boolean(currentRecord.is_formula ?? formulaDishId);
      if (isFormulaItem) {
        const existingStatus = String(currentRecord.status || "").trim().toLowerCase();
        if (!existingStatus || existingStatus === "pending" || existingStatus === "waiting") {
          const sequence = normalizeFormulaStepValue(
            currentRecord.step ??
              currentRecord.sequence ??
              currentRecord.formula_current_sequence ??
              currentRecord.formulaCurrentSequence,
            true
          );
          const sortOrder = currentRecord.sort_order ?? currentRecord.step_number ?? currentRecord.sortOrder;
          currentRecord.status = resolveInitialFormulaItemStatus(sequence, sortOrder);
        }
      }
      return current;
    });

    const byFormulaInstance = new Map<string, number[]>();
    normalized.forEach((entry, index) => {
      const record = entry as Record<string, unknown>;
      const formulaDishId = String(
        record.formula_dish_id ?? record.formulaDishId ?? record.formula_id ?? record.formulaId ?? ""
      ).trim();
      const isFormulaItem = Boolean(record.is_formula ?? formulaDishId);
      if (!isFormulaItem || !formulaDishId) return;
      const explicitInstanceId = String(record.formula_instance_id ?? record.formulaInstanceId ?? "").trim();
      const instanceKey = explicitInstanceId || formulaDishId;
      const group = byFormulaInstance.get(instanceKey) || [];
      group.push(index);
      byFormulaInstance.set(instanceKey, group);
    });

    byFormulaInstance.forEach((indexes) => {
      if (indexes.length === 0) return;
      const chooseParentIndex = () => {
        for (const index of indexes) {
          const record = normalized[index] as Record<string, unknown>;
          if (record.is_formula_parent === true || record.isFormulaParent === true) return index;
        }
        for (const index of indexes) {
          const record = normalized[index] as Record<string, unknown>;
          if (record.is_main === true || record.isMain === true) return index;
        }
        for (const index of indexes) {
          const record = normalized[index] as Record<string, unknown>;
          if (parsePriceNumber(record.price) > 0 || parsePriceNumber(record.formula_unit_price) > 0) return index;
        }
        return indexes[0];
      };
      const parentIndex = chooseParentIndex();
      const parentRecord = normalized[parentIndex] as Record<string, unknown>;
      const parentUnitPrice =
        parsePriceNumber(parentRecord.price) > 0
          ? parsePriceNumber(parentRecord.price)
          : parsePriceNumber(parentRecord.formula_unit_price);
      parentRecord.is_formula = true;
      parentRecord.is_formula_parent = true;
      parentRecord.price = parentUnitPrice;
      parentRecord.base_price = parentUnitPrice;
      parentRecord.unit_total_price = parentUnitPrice;
      parentRecord.formula_unit_price = parentUnitPrice;

      indexes.forEach((index) => {
        if (index === parentIndex) return;
        const childRecord = normalized[index] as Record<string, unknown>;
        childRecord.is_formula = true;
        childRecord.is_formula_parent = false;
        childRecord.price = 0;
        childRecord.base_price = 0;
        childRecord.unit_total_price = 0;
        childRecord.formula_unit_price = 0;
      });
    });

    return normalized;
  }

  function resolveInitialCurrentStepFromOrderItems(items: Array<Record<string, unknown>>) {
    const stepValues = items
      .map((item) => Number(item.step))
      .filter((value) => Number.isFinite(value))
      .map((value) => Math.trunc(value));
    const positive = stepValues.filter((value) => value > 0);
    if (positive.length > 0) return Math.min(...positive);
    return 0;
  }

  function resolveLegacyServiceStepFromCurrentStep(currentStep: number) {
    if (currentStep >= 3) return "dessert";
    if (currentStep <= 1) return "entree";
    return "plat";
  }

  const getCategoryDestination = (categoryId?: string | number | null) => {
    if (!categoryId) return "cuisine";
    const category = categoryById.get(String(categoryId || "").trim());
    const destination = String(category?.destination || "").trim().toLowerCase();
    if (destination === "bar") return "bar";
    if (destination === "cuisine") return "cuisine";
    return isDrinkCategory(categoryId) ? "bar" : "cuisine";
  };

  const isDrinkCategory = (categoryId?: string | number | null) => {
    if (!categoryId) return false;
    const category = categoryById.get(String(categoryId || "").trim());
    if (!category) return false;
    const keys = [
      normalizeCategory(category.name_fr || ""),
      normalizeCategory(category.name_en || ""),
      normalizeCategory(category.name_es || ""),
      normalizeCategory(category.name_de || ""),
    ];
    return keys.some(
      (key) =>
        key === "boisson" ||
        key === "boissons" ||
        key === "bar" ||
        key === "drink" ||
        key === "drinks" ||
        key === "beverage" ||
        key === "beverages" ||
        key === "getranke"
    );
  };

  const isDessertCategory = (categoryId?: string | number | null) => {
    if (!categoryId) return false;
    const category = categoryById.get(String(categoryId || "").trim());
    if (!category) return false;
    const keys = [
      normalizeCategory(category.name_fr || ""),
      normalizeCategory(category.name_en || ""),
      normalizeCategory(category.name_es || ""),
      normalizeCategory(category.name_de || ""),
    ];
    return keys.some(
      (key) =>
        key.includes("dessert") ||
        key.includes("postre") ||
        key.includes("nachtisch") ||
        key.includes("sweet")
    );
  };

  const isMainDish = (dish: Dish) => {
    if (isDrinkCategory(dish.category_id)) return false;
    if (isDessertCategory(dish.category_id)) return false;
    return true;
  };

  const availableSubCategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    if (String(selectedCategoryId) === FORMULAS_CATEGORY_ID) return [];
    return subCategoryRows.filter((sub) => String(sub.category_id) === String(selectedCategoryId));
  }, [selectedCategoryId, subCategoryRows]);

  useEffect(() => {
    if (selectedCategory === 0) {
      setSelectedSubCategory("");
      return;
    }
    if (
      selectedSubCategory &&
      !availableSubCategories.some(
        (sub) => String(sub.id) === selectedSubCategory
      )
    ) {
      setSelectedSubCategory("");
    }
  }, [selectedCategory, availableSubCategories, selectedSubCategory]);

  const suggestionPinnedDishes = useMemo(() => {
    if (!keepSuggestionsOnTop) return [];
    const suggestionList = (dishes || []).filter((dish) => {
      if (dish.is_available === false) return false;
      if (!isDishVisibleInMenu(dish)) return false;
      if (!isDishAvailableNow(dish)) return false;
      return dish.is_suggestion || dish.is_chef_suggestion || dish.is_featured;
    });
    return suggestionList.sort((a, b) => {
      return String(a.name_fr || a.name || "").localeCompare(String(b.name_fr || b.name || ""));
    });
  }, [dishes, keepSuggestionsOnTop, availabilitySnapshot]);

  const filteredDishes = useMemo(() => {
    if (String(selectedCategoryId) === FORMULAS_CATEGORY_ID) {
      return formulaMenuDishes;
    }
    const list = (dishes || []).filter((dish) => {
      if (dish.is_available === false) return false;
      if (!isDishVisibleInMenu(dish)) return false;
      if (!isDishAvailableNow(dish)) return false;
      const isFormulaDish = toBooleanFlag((dish as any).is_formula ?? dish.is_formula);
      if (!selectedCategoryId) return true;
      return String(dish.category_id) === String(selectedCategoryId);
    });
    const filteredBySub =
      !selectedSubCategory || !selectedCategoryId || String(selectedCategoryId) === FORMULAS_CATEGORY_ID
        ? list
        : list.filter((dish) => String(dish.subcategory_id) === String(selectedSubCategory));
    const isSuggestionDish = (dish: Dish) =>
      Boolean(dish.is_suggestion || dish.is_chef_suggestion || dish.is_featured);
    const filteredVisible =
      selectedCategoryId && String(selectedCategoryId) !== FORMULAS_CATEGORY_ID
        ? filteredBySub.filter((dish) => !dish.only_in_formula)
        : filteredBySub;
    const sortByName = (a: Dish, b: Dish) =>
      String(a.name_fr || a.name || "").localeCompare(String(b.name_fr || b.name || ""));
    const sortByCategoryAndName = (a: Dish, b: Dish) => {
      const aCat = categorySortMap.get(String(a.category_id ?? "")) ?? 0;
      const bCat = categorySortMap.get(String(b.category_id ?? "")) ?? 0;
      if (aCat !== bCat) return aCat - bCat;
      return sortByName(a, b);
    };
    const sorted = [...filteredVisible].sort(selectedCategoryId ? sortByName : sortByCategoryAndName);
    if (keepSuggestionsOnTop) {
      // Les suggestions restent visibles dans leur cat�gorie
      return sorted;
    }
    return sorted;
  }, [
    dishes,
    selectedCategoryId,
    selectedSubCategory,
    categorySortMap,
    keepSuggestionsOnTop,
    suggestionPinnedDishes,
    availabilitySnapshot,
  ]);

  const groupedDishes = useMemo(() => {
    if (!selectedCategoryId) {
      const baseGroups = [{ title: "", items: filteredDishes }];
      if (keepSuggestionsOnTop && suggestionPinnedDishes.length > 0) {
        return [{ title: chefSuggestionBadgeLabel, items: suggestionPinnedDishes }, ...baseGroups];
      }
      return baseGroups;
    }
    if (String(selectedCategoryId) === FORMULAS_CATEGORY_ID) {
      return [{ title: "", items: filteredDishes }];
    }
    const groups: Record<string, Dish[]> = {};
    filteredDishes.forEach((dish) => {
      const key = String(dish.subcategory_id || "0");
      if (!groups[key]) groups[key] = [];
      groups[key].push(dish);
    });
    const ordered: Array<{ title: string; items: Dish[] }> = [];
    if (keepSuggestionsOnTop && suggestionPinnedDishes.length > 0) {
      ordered.push({ title: chefSuggestionBadgeLabel, items: suggestionPinnedDishes });
    }
    availableSubCategories.forEach((sub) => {
      const key = String(sub.id);
      if (groups[key] && groups[key].length > 0) {
        ordered.push({ title: getSubCategoryLabel(sub), items: groups[key] });
        delete groups[key];
      }
    });
    Object.entries(groups).forEach(([subId, items]) => {
      const sub = subCategoryRows.find((row) => String(row.id) === String(subId));
      ordered.push({ title: sub ? getSubCategoryLabel(sub) : uiText.labels.others, items });
    });
    return ordered;
  }, [filteredDishes, selectedCategoryId, availableSubCategories, subCategoryRows, lang, keepSuggestionsOnTop, suggestionPinnedDishes, chefSuggestionBadgeLabel]);

  const featuredHighlights = useMemo(() => {
    const visibleDishes = dishes.filter(
      (dish) => dish.is_available !== false && isDishVisibleInMenu(dish) && isDishAvailableNow(dish)
    );
    const isChefSuggestion = (dish: Dish) => dish.is_chef_suggestion === true || dish.is_featured === true;
    const isDailySpecial = (dish: Dish) => dish.is_daily_special === true || dish.is_special === true;

    const dailyDish = visibleDishes.find((dish) => isDailySpecial(dish)) || null;
    const chefDish = visibleDishes.find((dish) => isChefSuggestion(dish)) || null;
    const preferredOrder: Array<"daily" | "chef"> =
      heroBadgeTypeClient === "daily" ? ["daily", "chef"] : ["chef", "daily"];

    if (!dailyDish && !chefDish) return [] as Array<{ key: string; dish: Dish; types: Array<"daily" | "chef"> }>;
    if (dailyDish && chefDish && String(dailyDish.id) === String(chefDish.id)) {
      return [
        {
          key: `combined-${String(dailyDish.id)}`,
          dish: dailyDish,
          types: preferredOrder,
        },
      ];
    }

    const highlights: Array<{ key: string; dish: Dish; types: Array<"daily" | "chef"> }> = [];
    preferredOrder.forEach((type) => {
      if (type === "daily" && dailyDish) highlights.push({ key: `daily-${String(dailyDish.id)}`, dish: dailyDish, types: ["daily"] });
      if (type === "chef" && chefDish) highlights.push({ key: `chef-${String(chefDish.id)}`, dish: chefDish, types: ["chef"] });
    });
    return highlights;
  }, [dishes, heroBadgeTypeClient, availabilitySnapshot]);

  const shouldShowHeroSection =
    heroEnabledClient && featuredHighlights.length > 0 && (keepSuggestionsOnTop || !selectedCategoryId);

  const getFeaturedLabel = (type: "daily" | "chef") => {
    return type === "daily" ? tt("featured_daily") : tt("featured_chef");
  };

  const linkedSalesAdviceDish = useMemo(() => {
    if (!salesAdviceDishId) return null;
    return dishes.find((dish) => String(dish.id) === String(salesAdviceDishId)) || null;
  }, [dishes, salesAdviceDishId]);

  const getSuggestionLeadMessage = (langCode: string) => {
    const normalizedLang = normalizeLanguageKey(langCode);
    const fallbackLang = toUiLang(langCode);
    const configured =
      String(suggestionLeadByLang[normalizedLang] || "").trim() ||
      String(suggestionLeadByLang[fallbackLang] || "").trim() ||
      String(suggestionLeadByLang.fr || "").trim();
    if (configured) return configured;
    return (
      DEFAULT_SUGGESTION_LEADS[normalizedLang] ||
      DEFAULT_SUGGESTION_LEADS[fallbackLang] ||
      DEFAULT_SUGGESTION_LEADS.fr
    );
  };

  const getSalesAdvice = (dish: Dish) => {
    const dishRecord = dish as unknown as any;
    const raw = dishRecord.dietary_tag;
    const parsed =
      typeof raw === "string"
        ? (() => {
            try {
              return JSON.parse(raw) as unknown as any;
            } catch {
            return {};
          }
        })()
        : (raw as unknown as any | null) || {};
    const explicitMessage = String(dish.suggestion_message || "").trim();
    const normalizedLang = normalizeLanguageKey(lang);
    const suggestionColumnCandidates = [
      `suggestion_${normalizedLang}`,
      `suggestion_${toUiLang(lang)}`,
      normalizedLang === "ja" ? "suggestion_jp" : "",
      normalizedLang === "zh" ? "suggestion_cn" : "",
      normalizedLang === "ko" ? "suggestion_kr" : "",
      normalizedLang === "el" ? "suggestion_gr" : "",
      `suggestion_message_${normalizedLang}`,
      `suggestion_message_${toUiLang(lang)}`,
      normalizedLang === "ja" ? "suggestion_message_jp" : "",
      normalizedLang === "zh" ? "suggestion_message_cn" : "",
      normalizedLang === "ko" ? "suggestion_message_kr" : "",
      normalizedLang === "el" ? "suggestion_message_gr" : "",
    ].filter(Boolean);
    const directSuggestionByColumns =
      suggestionColumnCandidates.map((key) => String(dishRecord[key] || "").trim()).find(Boolean) || "";
    const frenchSuggestion =
      String(dishRecord.suggestion_fr || "").trim() ||
      String(dishRecord.suggestion_message_fr || "").trim();
    const explicitByColumn =
      (normalizedLang === "fr" ? frenchSuggestion : "") ||
      directSuggestionByColumns ||
      String(
        (lang === "en"
          ? dishRecord.suggestion_message_en
          : lang === "es"
            ? dishRecord.suggestion_message_es
            : lang === "de"
              ? dishRecord.suggestion_message_de
              : dishRecord.suggestion_message_fr) || ""
      ).trim() ||
      String(dishRecord.suggestion_message_fr || "").trim() ||
      explicitMessage;
    const tipI18nRaw =
      parsed.sales_tip_i18n && typeof parsed.sales_tip_i18n === "object"
        ? (parsed.sales_tip_i18n as unknown as any)
        : {};
    const tipI18n = Object.fromEntries(
      Object.entries(tipI18nRaw).map(([code, value]) => [normalizeLanguageKey(code), String(value || "").trim()])
    ) as Record<string, string>;
    const currentLang = normalizedLang;
    const fallbackUiLang = toUiLang(lang);
    const explicitLocalizedMessage =
      String(tipI18n[currentLang] || "").trim() ||
      String(tipI18n[fallbackUiLang] || "").trim() ||
      String(tipI18n.fr || "").trim() ||
      String(tipI18n.en || "").trim() ||
      explicitByColumn;
    const linkedDishId =
      typeof parsed.sales_tip_dish_id === "string"
        ? parsed.sales_tip_dish_id.trim()
        : typeof parsed.sales_tip_dish_id === "number"
          ? String(parsed.sales_tip_dish_id)
          : "";
    if (!linkedDishId && !explicitLocalizedMessage) return { message: "", linkedDishId: "" };
    const linkedDish = dishes.find((candidate) => String(candidate.id) === linkedDishId) || null;
    const linkedDishName = linkedDish ? getDishName(linkedDish, lang) : "";
    const leadMessage = explicitLocalizedMessage || getSuggestionLeadMessage(lang);
    const normalizedLead = normalizeLookupText(leadMessage);
    const normalizedLinkedDishName = normalizeLookupText(linkedDishName);
    const messageWithLinkedDish =
      linkedDishName && normalizedLinkedDishName && !normalizedLead.includes(normalizedLinkedDishName)
        ? `${leadMessage.replace(/[:.!\s]*$/, "").trim()} : ${linkedDishName}`.trim()
        : leadMessage.trim();
    if (messageWithLinkedDish) {
      return {
        message: messageWithLinkedDish.replace(/\s+/g, " ").trim(),
        linkedDishId,
      };
    }
    if (!linkedDishId) return { message: "", linkedDishId: "" };
    return {
      message: linkedDishName ? `${getSuggestionLeadMessage(lang)} : ${linkedDishName}` : "",
      linkedDishId,
    };
  };

  const addToCart = (item: CartItem, options?: { skipUpsell?: boolean; fromRecommendation?: boolean }) => {
    if (isInteractionDisabled) {
      return;
    }
    if (!tableNumber) {
      alert(tt("table_required"));
      return;
    }
    if (!typedValidationCode) {
      alert(tableValidationPromptMessage);
      return;
    }
    if (!isValidationCodeValid) {
      alert(tt("validation_code_invalid"));
      return;
    }
    setCart((prev) => {
      const idx = prev.findIndex(
        (c) =>
          c.dish.id === item.dish.id &&
          JSON.stringify(
            getSelectedProductOptionsList(c.selectedProductOptions, c.selectedProductOption)
              .map((option) => String(option.id || ""))
              .sort()
          ) ===
            JSON.stringify(
              getSelectedProductOptionsList(item.selectedProductOptions, item.selectedProductOption)
                .map((option) => String(option.id || ""))
                .sort()
            ) &&
          JSON.stringify(c.selectedSides || []) === JSON.stringify(item.selectedSides || []) &&
          JSON.stringify(c.selectedSideIds || []) === JSON.stringify(item.selectedSideIds || []) &&
          JSON.stringify(c.selectedExtras || []) === JSON.stringify(item.selectedExtras || []) &&
          JSON.stringify(c.formulaSelections || []) === JSON.stringify(item.formulaSelections || []) &&
          (c.formulaDishId || "") === (item.formulaDishId || "") &&
          Number(c.formulaUnitPrice || 0) === Number(item.formulaUnitPrice || 0) &&
          (c.selectedCooking || "") === (item.selectedCooking || "") &&
          (c.specialRequest || "") === (item.specialRequest || "")
      );
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx].quantity += item.quantity;
        if (item.fromRecommendation || options?.fromRecommendation) {
          updated[idx].fromRecommendation = true;
        }
        return updated;
      }
      return [...prev, { ...item, fromRecommendation: item.fromRecommendation || !!options?.fromRecommendation }];
    });
    setOrderSuccess(false);
    setCartBump(true);
    setTimeout(() => setCartBump(false), 300);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    triggerHaptic(10);
    setToastMessage(tt("item_added"));
    if (!options?.skipUpsell) {
      const advice = getSalesAdvice(item.dish);
      if (advice.message) {
        setSalesAdviceMessage(advice.message);
        setSalesAdviceDishId(advice.linkedDishId);
        setShowSalesAdviceModal(true);
      }
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage("");
    }, 1200);
  };

  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const tableValidationPromptMessage = tt("validation_code_prompt");
  const normalizedTableKey = normalizeTableNumberKey(tableNumber);
  const tablePinCode = normalizedTableKey ? tablePinCodesByNumber[normalizedTableKey] : "";
  const expectedValidationCode = normalizePinValue(tablePinCode);
  const typedValidationCode = normalizePinValue(orderValidationCodeInput || "");
  const isServerCallThrottled = serverCallSecondsLeft > 0;
  const isValidationCodeValid =
    typedValidationCode.length > 0 && expectedValidationCode.length > 0 && typedValidationCode === expectedValidationCode;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedAt = Number(window.localStorage.getItem(LAST_SERVER_CALL_STORAGE_KEY) || "0");
      const nextCooldownUntil = Number.isFinite(storedAt) && storedAt > 0 ? storedAt + SERVER_CALL_THROTTLE_MS : 0;
      if (!nextCooldownUntil || nextCooldownUntil <= Date.now()) {
        window.localStorage.removeItem(LAST_SERVER_CALL_STORAGE_KEY);
        setServerCallCooldownUntil(0);
        setServerCallSecondsLeft(0);
        return;
      }
      setServerCallCooldownUntil(nextCooldownUntil);
    } catch {
      setServerCallCooldownUntil(0);
      setServerCallSecondsLeft(0);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!serverCallCooldownUntil) {
      setServerCallSecondsLeft(0);
      return;
    }
    const syncCountdown = () => {
      const remainingMs = serverCallCooldownUntil - Date.now();
      if (remainingMs <= 0) {
        try {
          window.localStorage.removeItem(LAST_SERVER_CALL_STORAGE_KEY);
        } catch {
          // localStorage unavailable: keep UI functional without persistence.
        }
        setServerCallCooldownUntil(0);
        setServerCallSecondsLeft(0);
        return;
      }
      setServerCallSecondsLeft(Math.ceil(remainingMs / 1000));
    };
    syncCountdown();
    const intervalId = window.setInterval(syncCountdown, 250);
    return () => window.clearInterval(intervalId);
  }, [serverCallCooldownUntil]);

  const startServerCallCooldown = () => {
    const lastCallAt = Date.now();
    const nextCooldownUntil = lastCallAt + SERVER_CALL_THROTTLE_MS;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LAST_SERVER_CALL_STORAGE_KEY, String(lastCallAt));
      } catch {
        // Ignore storage failures: the action itself must still work.
      }
    }
    setServerCallCooldownUntil(nextCooldownUntil);
    setServerCallSecondsLeft(Math.ceil(SERVER_CALL_THROTTLE_MS / 1000));
  };

  const handleSubmitSmartCall = async (callType: SmartCallOptionKey) => {
    setServerCallMsg("");
    if (isVitrineMode) {
      setServerCallMsg("Mode vitrine : appel serveur indisponible.");
      setTimeout(() => setServerCallMsg(""), 2000);
      return;
    }
    if (!tableNumber) {
      setServerCallMsg(tt("table_required"));
      setTimeout(() => setServerCallMsg(""), 2000);
      return;
    }
    if (!typedValidationCode) {
      setServerCallMsg(tableValidationPromptMessage);
      setTimeout(() => setServerCallMsg(""), 2000);
      return;
    }
    if (!isValidationCodeValid) {
      setServerCallMsg(tt("validation_code_invalid"));
      setTimeout(() => setServerCallMsg(""), 2000);
      return;
    }
    if (isServerCallThrottled) {
      setServerCallMsg(serverCallThrottleLabel);
      setTimeout(() => setServerCallMsg(""), 2000);
      return;
    }
    try {
      setIsSendingCall(true);
      const tableNum = Number(String(tableNumber || "").trim());
      if (!Number.isFinite(tableNum) || tableNum <= 0) {
        setServerCallMsg(tt("table_invalid"));
        setTimeout(() => setServerCallMsg(""), 2000);
        return;
      }
      const tableNumText = String(tableNum);
      const localizedMessage = smartCallUi.options[callType] || smartCallUi.options.help_question;
      const frenchMessage = (SMART_CALL_UI.fr?.options?.[callType] || SMART_CALL_UI.fr?.options?.help_question || localizedMessage).trim();
      const payloadBase = {
        status: "pending",
        created_at: new Date(),
        type: "appel",
        message: frenchMessage,
        restaurant_id: restaurant?.id ?? SETTINGS_ROW_ID,
      };

      // New pipeline: persist in notifications for centralized request handling (best effort).
      const notificationPayloads = [
        {
          type: "CLIENT",
          status: "pending",
          message: frenchMessage,
          title: "Client request",
          table_number: tableNumText,
          table_id: tableNum,
          restaurant_id: restaurant?.id ?? SETTINGS_ROW_ID,
          payload: {
            request_key: callType,
            request_type: callType,
            request_label_fr: frenchMessage,
            request_label_client: localizedMessage,
            client_lang: normalizedLang,
            source: "client_menu",
          },
          created_at: new Date().toISOString(),
        },
        {
          type: "CLIENT",
          status: "pending",
          message: frenchMessage,
          table_number: tableNumText,
          restaurant_id: restaurant?.id ?? SETTINGS_ROW_ID,
          created_at: new Date().toISOString(),
        },
      ];
      let notificationSaved = false;
      let notificationError: unknown = null;
      for (const payload of notificationPayloads) {
        const notifTry = await supabase.from("notifications").insert([payload as never]);
        if (!notifTry.error) {
          notificationSaved = true;
          break;
        }
        notificationError = notifTry.error;
      }

      let callSaved = false;
      let callError: unknown = null;
      const firstTry = await supabase
        .from("calls")
        .insert([{ ...payloadBase, table_number: tableNumText, table_id: tableNum }]);

      if (!firstTry.error) {
        callSaved = true;
      } else {
        const secondTry = await supabase
          .from("calls")
          .insert([{ ...payloadBase, table_number: tableNumText }]);
        if (!secondTry.error) {
          callSaved = true;
        } else {
          const thirdTry = await supabase
            .from("calls")
            .insert([{ ...payloadBase, table_id: tableNum }]);
          if (!thirdTry.error) {
            callSaved = true;
          } else {
            callError = thirdTry.error;
          }
        }
      }

      if (!notificationSaved) {
        console.warn("Server call notification insert failed:", toLoggableSupabaseError(notificationError));
      }
      if (!callSaved) {
        console.warn("Server call legacy calls insert failed:", toLoggableSupabaseError(callError || notificationError));
      }
      if (!notificationSaved && !callSaved) {
        throw callError || notificationError || new Error("Server call insert failed");
      }

      setShowCallModal(false);
      startServerCallCooldown();
      triggerHaptic([10, 50, 10]);
    } catch (e) {
      console.error("handleSubmitSmartCall failed:", toLoggableSupabaseError(e));
      setServerCallMsg("Impossible d'appeler le serveur pour le moment.");
      setTimeout(() => setServerCallMsg(""), 2500);
    } finally {
      setIsSendingCall(false);
    }
  };

async function handleSubmitOrder() {
  const restaurantIdForPayload = String(scopedRestaurantId || '').trim() || null;
  console.log("Tentative de commande...", cart);
    if (isInteractionDisabled) return;
    if (!tableNumber) {
      alert(tt("table_required"));
      return;
    }
    if (!typedValidationCode) {
      alert(tableValidationPromptMessage);
      return;
    }
    if (!isValidationCodeValid) {
      alert(tt("validation_code_invalid"));
      return;
    }
    if (cart.length === 0) {
      alert(tt("empty_cart_error"));
      return;
    }
    const missingSide = cart.find(
      (item) => item?.dish?.has_sides && (!item.selectedSides || item.selectedSides.length === 0)
    );
    if (missingSide) {
      alert(tt("side_required_error"));
      return;
    }
    const missingCooking = cart.find(
      (item) => item?.dish?.ask_cooking && !(item.selectedCooking && item.selectedCooking.trim())
    );
    if (missingCooking) {
      alert(tt("cooking_required_error"));
      return;
    }

    // Déclarations initiales
    const currentRestoId = restaurant?.id || '...';
    const parsedTableNumber = Number(String(tableNumber || "").trim());
    let gId = null;
    let finalPayload: any[] = [];

    const orderItems: any[] = [];

    // Boucle principale : traiter chaque item du panier
    cart.forEach((item, cartIndex) => {
      const formulaDishId = String(item.formulaDishId || "").trim() || null;
      const formulaInstanceId = formulaDishId
        ? `client:${String(parsedTableNumber)}:${cartIndex}:${formulaDishId}`
        : null;
      const formulaGroupId =
        formulaDishId && typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : formulaDishId
            ? `${parsedTableNumber}:${cartIndex}:${formulaDishId}:${Date.now()}`
            : null;
      const rawExtrasPrice = (item.selectedExtras || []).reduce(
        (sum, extra) => sum + parsePriceNumber(extra.price),
        0
      );
      const extrasPrice = isFormulaCartItem(item) ? 0 : rawExtrasPrice;
      const normalizedSelectedProductOptions = getSelectedProductOptionsList(item.selectedProductOptions, item.selectedProductOption);
      const unitPrice = getCartItemUnitPrice({
        ...item,
        selectedProductOptions: normalizedSelectedProductOptions,
      });
      const drinkItem = isDrinkCategory(item.dish.category_id);
      const selectedSideIds = Array.isArray(item.selectedSideIds)
        ? item.selectedSideIds.map((id) => String(id || "").trim()).filter(Boolean)
        : [];
      const fallbackSideIds =
        selectedSideIds.length > 0
          ? selectedSideIds
          : (item.selectedSides || [])
              .map((label) => sideIdByAlias.get(normalizeLookupText(label)) || "")
              .filter(Boolean);
      const selectedSideLabelsFr = dedupeDisplayValues(
        fallbackSideIds
          .map((id) => sidesLibrary.find((side) => String(side.id) === String(id)))
          .filter(Boolean)
          .map((side) => String((side as SideLibraryItem).name_fr || "").trim())
      );
      const selectedExtraIds = (item.selectedExtras || [])
        .map((extra, index) => buildStableExtraId(item.dish.id, extra, index))
        .filter(Boolean);
      const cookingKey = normalizeCookingKey(item.selectedCooking || "");
      const hasCookingChoice = Boolean(item?.dish?.ask_cooking);
      const cookingLabelFr = cookingKey ? getCookingLabelFr(cookingKey) : hasCookingChoice ? "Saignant" : null;
      const stableCookingValue = (cookingKey || "") || (cookingLabelFr || "") || "";
      const selectedOptionIds = normalizedSelectedProductOptions
        .map((option) => String(option.id || "").trim())
        .filter(Boolean);
      const selectedOptionNamesFr = normalizedSelectedProductOptions
        .map((option) => {
          const namesI18n =
            option.names_i18n && typeof option.names_i18n === "object"
              ? (option.names_i18n as any)
              : null;
          return String(option.name_fr || namesI18n?.fr || option.name || "").trim();
        })
        .filter(Boolean);
      const selectedOptionNames = normalizedSelectedProductOptions
        .map((option) => getProductOptionLabel(option, lang))
        .filter(Boolean);
      const selectedOptionPrice = normalizedSelectedProductOptions.reduce(
        (sum, option) => sum + parseAddonPrice(option.price_override),
        0
      );
      const selectedExtras = (item.selectedExtras || []).map((extra, index) => ({
        id: buildStableExtraId(item.dish.id, extra, index),
        label_fr: String(extra.name_fr || extra.name || "").trim() || "Supplément",
        price: parsePriceNumber(extra.price),
      }));
      const selectedOptionsPayload: Array<Record<string, unknown>> = [];
      normalizedSelectedProductOptions.forEach((option) => {
        const optionId = String(option.id || "").trim() || null;
        const namesI18n =
          option.names_i18n && typeof option.names_i18n === "object"
            ? (option.names_i18n as any)
            : null;
        const optionNameFr = String(option.name_fr || namesI18n?.fr || option.name || "").trim() || null;
        const optionName = getProductOptionLabel(option, lang) || optionNameFr || null;
        if (!optionNameFr && !optionName) return;
        selectedOptionsPayload.push({
          kind: "option",
          id: optionId,
          value: optionName,
          label_fr: optionNameFr || optionName,
          name_fr: optionNameFr || optionName,
          price: parseAddonPrice(option.price_override),
        });
      });
      if (fallbackSideIds.length > 0) {
        selectedOptionsPayload.push({
          kind: "side",
          ids: fallbackSideIds,
          values: selectedSideLabelsFr.length > 0 ? selectedSideLabelsFr : dedupeDisplayValues((item.selectedSides || []) as unknown[]),
          label_fr: selectedSideLabelsFr.join(", "),
        });
      }
      if (stableCookingValue) {
        selectedOptionsPayload.push({
          kind: "cooking",
          key: cookingKey || null,
          value: stableCookingValue,
          label_fr: cookingLabelFr || stableCookingValue,
        });
      }
      const formulaDishName = String(item.formulaDishName || "").trim() || null;
      const formulaUnitPriceRaw = Number(item.formulaUnitPrice);
      const formulaUnitPrice =
        Number.isFinite(formulaUnitPriceRaw) && formulaUnitPriceRaw > 0 ? formulaUnitPriceRaw : null;
      const formulaSelections = Array.isArray(item.formulaSelections) ? item.formulaSelections : [];
      const sortedFormulaSelections = [...formulaSelections].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
      console.log(`FORMULA SELECTIONS for ${formulaDishId}:`, sortedFormulaSelections.map(s => ({ id: s.dishId, name: s.dishName, seq: s.sequence })));

      // Pousser le Plat Parent (Step 2)
      const parentStep = 2;
      const parentOrderItem = {
        dish_id: String(item.dish.id || "").trim(),
        id: String(item.dish.id || "").trim(),
        formula_group_id: formulaGroupId,
        formula_id: formulaDishId,
        category_id: item.dish.category_id ?? null,
        destination: getCategoryDestination(item.dish.category_id),
        is_drink: drinkItem,
        name_fr: String(item.dish.name_fr || item.dish.name || item.dish.nom || "").trim() || "Plat",
        description_fr: String(item.dish.description_fr || item.dish.description || "").trim() || null,
        quantity: item.quantity,
        price: unitPrice + extrasPrice,
        selected_option_id: selectedOptionIds.length > 0 ? selectedOptionIds.join(",") : null,
        selected_option_name: selectedOptionNamesFr.length > 0 ? selectedOptionNamesFr.join(", ") : selectedOptionNames.length > 0 ? selectedOptionNames.join(", ") : null,
        selected_option_price: selectedOptionPrice,
        selected_options: selectedOptionsPayload,
        selectedOptions: selectedOptionsPayload,
        selected_side_ids: fallbackSideIds,
        selected_side_label_fr: selectedSideLabelsFr.join(", ") || null,
        accompagnement_fr: selectedSideLabelsFr.join(", ") || null,
        selected_extra_ids: selectedExtraIds,
        selected_extras: selectedExtras,
        selected_cooking: stableCookingValue || null,
        selected_cooking_key: cookingKey || null,
        selected_cooking_label_fr: cookingLabelFr,
        formula_dish_id: formulaDishId,
        formula_dish_name: formulaDishName,
        formula_unit_price: formulaUnitPrice,
        formula_instance_id: formulaInstanceId,
        is_formula_parent: Boolean(formulaDishId),
        is_formula_child: false,
        is_formula: Boolean(formulaDishId),
        sort_order: parentStep,
        step_number: parentStep,
        special_request: String(item.specialRequest || "").trim(),
        from_recommendation: !!item.fromRecommendation,
        status: parentStep === 1 ? "preparing" : "pending",
      };
      orderItems.push(parentOrderItem);

      // Pousser chaque élément de item.formulaSelections
      sortedFormulaSelections.forEach((sel) => {
        if (!sel?.dishId) return;
        const childDish = dishById.get(String(sel.dishId));
        const childOrderItem = {
          dish_id: String(sel.dishId || "").trim(),
          id: String(sel.dishId || "").trim(),
          formula_group_id: formulaGroupId,
          formula_id: formulaDishId,
          category_id: sel.categoryId || null,
          destination: getCategoryDestination(sel.categoryId) || "cuisine",
          is_drink: false,
          name_fr: String(sel.dishNameFr || sel.dishName || "").trim() || "Plat formule",
          description_fr: childDish ? String(childDish.description_fr || childDish.description || "").trim() || null : null,
          quantity: item.quantity,
          price: 0,
          selected_option_id: Array.isArray(sel.selectedOptionIds) && sel.selectedOptionIds.length > 0
            ? sel.selectedOptionIds.map(id => String(id || "").trim()).filter(Boolean).join(",")
            : null,
          selected_option_name: Array.isArray(sel.selectedOptionNames) && sel.selectedOptionNames.length > 0
            ? sel.selectedOptionNames.map(name => String(name || "").trim()).filter(Boolean).join(", ")
            : null,
          selected_option_price: Number(sel.selectedOptionPrice || 0) || 0,
          selected_options: [],
          selectedOptions: [],
          selected_side_ids: Array.isArray(sel.selectedSideIds) ? sel.selectedSideIds : [],
          selected_side_label_fr: Array.isArray(sel.selectedSides) && sel.selectedSides.length > 0
            ? sel.selectedSides.map(side => String(side || "").trim()).filter(Boolean).join(", ")
            : null,
          accompagnement_fr: Array.isArray(sel.selectedSides) && sel.selectedSides.length > 0
            ? sel.selectedSides.map(side => String(side || "").trim()).filter(Boolean).join(", ")
            : null,
          selected_extra_ids: [],
          selected_extras: [],
          selected_cooking: String(sel.selectedCooking || "").trim() || null,
          selected_cooking_key: normalizeCookingKey(String(sel.selectedCooking || "").trim()) || null,
          selected_cooking_label_fr: String(sel.selectedCooking || "").trim() || null,
          formula_dish_id: formulaDishId,
          formula_dish_name: formulaDishName,
          formula_unit_price: 0,
          formula_instance_id: formulaInstanceId,
          is_formula_parent: false,
          is_formula_child: true,
          is_formula: true,
          sort_order: sel.sequence,
          step_number: sel.sequence,
          special_request: String(item.specialRequest || "").trim(),
          from_recommendation: !!item.fromRecommendation,
          status: Number(sel.sequence) === 1 ? "preparing" : "pending",
        };
        orderItems.push(childOrderItem);
      });

      // Pour les items non-formule, pousser normalement
      if (!formulaDishId) {
        const nonFormulaItem = {
          dish_id: String(item.dish.id || "").trim(),
          id: String(item.dish.id || "").trim(),
          formula_group_id: null,
          formula_id: null,
          category_id: item.dish.category_id ?? null,
          destination: getCategoryDestination(item.dish.category_id),
          is_drink: drinkItem,
          name_fr: String(item.dish.name_fr || item.dish.name || item.dish.nom || "").trim() || "Plat",
          description_fr: String(item.dish.description_fr || item.dish.description || "").trim() || null,
          quantity: item.quantity,
          price: unitPrice + extrasPrice,
          selected_option_id: selectedOptionIds.length > 0 ? selectedOptionIds.join(",") : null,
          selected_option_name: selectedOptionNamesFr.length > 0 ? selectedOptionNamesFr.join(", ") : selectedOptionNames.length > 0 ? selectedOptionNames.join(", ") : null,
          selected_option_price: selectedOptionPrice,
          selected_options: selectedOptionsPayload,
          selectedOptions: selectedOptionsPayload,
          selected_side_ids: fallbackSideIds,
          selected_side_label_fr: selectedSideLabelsFr.join(", ") || null,
          accompagnement_fr: selectedSideLabelsFr.join(", ") || null,
          selected_extra_ids: selectedExtraIds,
          selected_extras: selectedExtras,
          selected_cooking: stableCookingValue || null,
          selected_cooking_key: cookingKey || null,
          selected_cooking_label_fr: cookingLabelFr,
          formula_dish_id: null,
          formula_dish_name: null,
          formula_unit_price: null,
          formula_instance_id: null,
          is_formula_parent: false,
          is_formula_child: false,
          is_formula: false,
          sort_order: null,
          step_number: null,
          special_request: String(item.specialRequest || "").trim(),
          from_recommendation: !!item.fromRecommendation,
          status: "pending",
        };
        orderItems.push(nonFormulaItem);
      }
    });

    const totalPrice = cart.reduce((sum, item) => {
      const rawExtrasPrice = (item.selectedExtras || []).reduce(
        (acc, extra) => acc + parsePriceNumber(extra.price),
        0
      );
      const extrasPrice = isFormulaCartItem(item) ? 0 : rawExtrasPrice;
      return sum + (getCartItemUnitPrice(item) + extrasPrice) * item.quantity;
    }, 0);

      type OrderPayloadItem = NonNullable<(typeof orderItems)[number]>;
      const normalizedOrderItems: OrderPayloadItem[] = normalizeFormulaOrderItemsForPayload(
        orderItems.filter(
        (entry): entry is OrderPayloadItem => entry != null
        )
      );
      normalizedOrderItems.forEach((item) => {
        if (item.formula_dish_id || item.is_formula) {
          console.log("DEBUG FORMULE:", item);
        }
      });
      const barItems = normalizedOrderItems.filter(
        (item) => String(item.destination || "").trim().toLowerCase() === "bar"
      );
      const kitchenItems = normalizedOrderItems.filter(
        (item) => String(item.destination || "cuisine").trim().toLowerCase() === "cuisine"
      );

      finalPayload = [...kitchenItems, ...barItems];
      const resolvedRestaurantId = restaurant?.id ?? SETTINGS_ROW_ID;

      const finalCurrentStep = finalPayload.length > 0
        ? resolveInitialCurrentStepFromOrderItems(finalPayload as Array<Record<string, unknown>>)
        : 1;

      const finalTotalPrice = finalPayload.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
        0
      );

      // Trier les items par sort_order croissant pour corriger l'ordre des �tapes
      finalPayload.sort((a, b) => {
        const aOrder = Number(a.sort_order || a.step_number || 0);
        const bOrder = Number(b.sort_order || b.step_number || 0);
        return aOrder - bOrder;
      });

      // DEBUG: Log d�taill� des items avant envoi
      console.log("DEBUG_ORDRE - Items cuisine:", kitchenItems.map(item => ({
        name: item.name_fr,
        sort_order: item.sort_order,
        step_number: item.step_number,
        status: item.status,
        is_formula_parent: item.is_formula_parent,
        is_formula_child: item.is_formula_child
      })));

      console.log("NB ITEMS FINAUX:", finalPayload.length);

      const newOrder = {
        table_number: String(parsedTableNumber),
        items: finalPayload,
        total_price: finalTotalPrice,
        status: "pending",
        restaurant_id: resolvedRestaurantId,
        service_step: resolveLegacyServiceStepFromCurrentStep(finalCurrentStep || 1),
        current_step: finalCurrentStep > 0 ? finalCurrentStep : 1,
      };

      console.table(finalPayload.map(item => ({
        id: item.id,
        name_fr: item.name_fr,
        sort_order: item.sort_order,
        step_number: item.step_number,
        destination: item.destination,
        description_fr: item.description_fr,
        is_formula_parent: item.is_formula_parent,
        is_formula_child: item.is_formula_child
      })));

      console.log("CRITICAL: Sending payload length:", finalPayload.length);

      const { error } = await supabase.from("orders").insert([newOrder as any]);
      if (error) {
        console.log("Détails erreur commande:", JSON.stringify(error, null, 2));
        alert(`${tt("supabase_error_prefix")} ${error.message}`);
        return;
      }

      triggerHaptic([15, 40, 15, 40, 25]);
      alert(tt("order_success"));
      setCart([]);
      setOrderSuccess(true);
    }

  const openFormulaModal = (formula: Dish, sourceDish?: Dish | null) => {
    const sourceFormula = dishes.find((row) => String(row.id) === String(formula.id)) || formula;
    const resolvedSourceDish = sourceDish
      ? dishes.find((row) => String(row.id) === String(sourceDish.id)) || sourceDish
      : null;
    setFormulaDish(sourceFormula);
    setFormulaSourceDish(resolvedSourceDish);
    setFormulaSelections({});
    setFormulaSelectionDetails({});
    setFormulaMainDetails(emptyFormulaSelectionDetails);
    setFormulaSelectionError("");
    setFormulaItemDetailsOpen({});
    setSelectedDish(null);
    setModalProductOptions([]);
    setSelectedProductOptionIds([]);
    setRecommendationSourceDishId("");
  };

  const handleSelectDish = (dish: Dish) => {
    const isFormulaDish = toBooleanFlag((dish as any).is_formula ?? dish.is_formula);
    if (isFormulaDish && String(selectedCategoryId || "") === FORMULAS_CATEGORY_ID) {
      openFormulaModal(dish, null);
      return;
    }
    const sourceDish = dishes.find((row) => String(row.id) === String(dish.id)) || dish;
    const parsed = parseOptionsFromDescription(sourceDish.description || "");
    const sourceDishRecord = sourceDish as unknown as any;
    const productOptions = Array.isArray(sourceDishRecord.product_options)
      ? ((sourceDishRecord.product_options as ProductOptionItem[]) || [])
      : [];
    const dishExtras = getDishExtras(sourceDish);
    // Source de v?rit?: selected_sides (table sides_library). Pas de fallback legacy.
    const sideIds = Array.isArray(sourceDish.selected_sides) ? sourceDish.selected_sides : [];
    const sideOptionsFromLibrary = sideIds
      .map((id) => sidesLibrary.find((side) => String(side.id) === String(id)))
      .filter(Boolean)
      .map((side) => getSideLabel(side as SideLibraryItem));
    setSelectedDish(sourceDish);
    setDishModalQuantity(1);
    setSpecialRequest("");
    setSelectedSides([]);
    setSelectedCooking("");
    setSelectedExtras([]);
    setModalProductOptions(productOptions);
    setModalSidesOptions(sideOptionsFromLibrary);
    setModalExtrasOptions(dishExtras);
    setModalAskCooking(!!(sourceDish.ask_cooking || parsed.askCooking));
    setSideError("");
    setSelectedProductOptionIds([]);
  };

  const dishNeedsQuickAddModal = (dish: Dish) => {
    const sourceDish = dishes.find((row) => String(row.id) === String(dish.id)) || dish;
    const parsed = parseOptionsFromDescription(sourceDish.description || "");
    const sourceDishRecord = sourceDish as unknown as any;
    const productOptions = Array.isArray(sourceDishRecord.product_options)
      ? ((sourceDishRecord.product_options as ProductOptionItem[]) || [])
      : [];
    const extras = getDishExtras(sourceDish);
    const selectedSideIds = Array.isArray(sourceDish.selected_sides) ? sourceDish.selected_sides : [];
    const hasRequiredSides =
      Boolean(sourceDish.has_sides) ||
      selectedSideIds.length > 0 ||
      (Array.isArray(parsed.sideIds) && parsed.sideIds.length > 0);
    const needsCooking = Boolean(sourceDish.ask_cooking || parsed.askCooking);
    return hasRequiredSides || needsCooking || productOptions.length > 0 || extras.length > 0;
  };

  const handleQuickAddFromList = (dish: Dish) => {
    if (toBooleanFlag((dish as any).is_formula ?? dish.is_formula)) {
      openFormulaModal(dish, null);
      return;
    }
    if (dishNeedsQuickAddModal(dish)) {
      handleSelectDish(dish);
      return;
    }
    addToCart({
      dish,
      quantity: 1,
      selectedSides: [],
      selectedSideIds: [],
      selectedExtras: [],
      selectedProductOptions: [],
      selectedProductOption: null,
      selectedCooking: "",
      specialRequest: "",
    });
  };

  const modalInstructionPreview = useMemo(() => {
    return buildInstructionText(
      lang,
      selectedSides,
      selectedExtras,
      modalSelectedProductOptions,
      modalSelectedProductOption,
      selectedCooking,
      specialRequest,
      uiText
    );
  }, [lang, selectedSides, selectedExtras, modalSelectedProductOptions, modalSelectedProductOption, selectedCooking, specialRequest, uiText]);

  const getSideMaxOptions = (dish?: Dish | null) => {
    if (!dish) return 1;
    const value = Number(dish.max_options || 1);
    return Number.isFinite(value) && value > 0 ? value : 1;
  };

  const isIceCreamDish = (dish?: Dish | null) => {
    if (!dish) return false;
    const category = dish.category_id ? categoryById.get(String(dish.category_id || "").trim()) : undefined;
    const label = normalizeCategory(
      `${category?.name_fr || ""} ${category?.name_en || ""} ${category?.name_es || ""} ${category?.name_de || ""}`
    );
    return label.includes("glace") || label.includes("icecream") || label.includes("helado");
  };

  const menuFontFamily = useMemo(() => {
    const tableConfig = parseJsonObject(restaurant?.table_config);
    const restaurantRecord = restaurant as any | null;
    const raw = String(restaurantRecord?.font_family || tableConfig.font_family || "Montserrat").trim();
    const allowed = new Set(MENU_FONT_OPTIONS as readonly string[]);
    return allowed.has(raw) ? raw : "Montserrat";
  }, [restaurant]);

  const menuLayout = useMemo<"classic_grid" | "modern_list">(() => {
    const tableConfig = parseJsonObject(restaurant?.table_config);
    const raw = String((restaurant as any | null)?.menu_layout || tableConfig.menu_layout || "classic_grid")
      .trim()
      .toLowerCase();
    return raw === "modern_list" || raw === "horizontal" ? "modern_list" : "classic_grid";
  }, [restaurant]);

  const cardLayout = useMemo<"default" | "overlay" | "bicolor">(() => {
    const parseLayoutToken = (raw: unknown): "default" | "overlay" | "bicolor" | null => {
      const value = String(raw || "").trim().toLowerCase();
      if (value === "overlay" || value === "grid_overlay") return "overlay";
      if (value === "bicolor" || value === "modern_bicolor") return "bicolor";
      if (value === "minimalist" || value === "minimal") return "bicolor";
      if (value === "default" || value === "classic" || value === "standard") return "default";
      return null;
    };
    const tableConfig = parseJsonObject(restaurant?.table_config);
    return (
      parseLayoutToken((restaurant as any | null)?.card_layout) ||
      parseLayoutToken(tableConfig.card_layout) ||
      parseLayoutToken((restaurant as any | null)?.card_style) ||
      parseLayoutToken(tableConfig.card_style) ||
      "default"
    );
  }, [restaurant]);

  const cardVisualStyle = useMemo<"rounded" | "sharp">(() => {
    const parseVisualStyle = (raw: unknown): "rounded" | "sharp" | null => {
      const value = String(raw || "").trim().toLowerCase();
      if (["sharp", "pointu", "carre", "square", "angled"].includes(value)) return "sharp";
      if (["rounded", "arrondi", "moderne"].includes(value)) return "rounded";
      return null;
    };
    const tableConfig = parseJsonObject(restaurant?.table_config);
    return (
      parseVisualStyle(tableConfig.card_style) ||
      parseVisualStyle((restaurant as any | null)?.card_style) ||
      "rounded"
    );
  }, [restaurant]);
  const densityStyle = useMemo<"compact" | "spacious">(() => {
    const tableConfig = parseJsonObject(restaurant?.table_config);
    const raw = String(
      (restaurant as any | null)?.card_density ??
        (restaurant as any | null)?.density_style ??
        tableConfig.card_density ??
        tableConfig.density_style ??
        "spacious"
    )
      .trim()
      .toLowerCase();
    return ["compact", "compacte", "dense"].includes(raw) ? "compact" : "spacious";
  }, [restaurant]);
  const dishCardRadiusClass = cardVisualStyle === "sharp" ? "rounded-none" : "rounded-xl";
  const dishMediaRadiusClass = cardVisualStyle === "sharp" ? "rounded-none" : "rounded-lg";

  useEffect(() => {
    if (!restaurant) return;
    const row = restaurant as any;
    console.log("Style actuel:", {
      card_style: row.card_style ?? null,
      card_layout: row.card_layout ?? null,
      resolved: cardLayout,
    });
  }, [restaurant, cardLayout]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = "menuqr-dynamic-font-link";
    const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(menuFontFamily).replace(/%20/g, "+")}:wght@400;700&display=swap`;
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.href !== href) link.href = href;
  }, [menuFontFamily]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("menuqr-selected-font", menuFontFamily);
      const cssFont = `'${menuFontFamily.replace(/'/g, "\\'")}', sans-serif`;
      const styleId = "menuqr-runtime-font-style";
      let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = `.menu-client-font, .menu-client-font * { font-family: ${cssFont} !important; }`;
    } catch {
      // ignore font cache sync errors
    }
  }, [menuFontFamily]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const forceFont = () => {
      try {
        const fontName = String(menuFontFamily || "").trim();
        if (!fontName) return;

        let link = document.getElementById("dynamic-google-font") as HTMLLinkElement | null;
        const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName).replace(/%20/g, "+")}:wght@400;700&display=swap`;
        if (!link) {
          link = document.createElement("link");
          link.id = "dynamic-google-font";
          link.rel = "stylesheet";
          document.head.appendChild(link);
        }
        if (link.href !== href) link.href = href;

        let styleTag = document.getElementById("force-font-style") as HTMLStyleElement | null;
        if (!styleTag) {
          styleTag = document.createElement("style");
          styleTag.id = "force-font-style";
          document.head.appendChild(styleTag);
        }
        const safeFont = fontName.replace(/'/g, "\\'");
        styleTag.innerHTML = `
          * { font-family: '${safeFont}', sans-serif !important; }
          body { font-family: '${safeFont}', sans-serif !important; }
          .menu-client-font, .menu-client-font * { font-family: '${safeFont}', sans-serif !important; }
        `;
      } catch {
        // no-op
      }
    };

    forceFont();
    const timer = window.setTimeout(forceFont, 500);
    return () => window.clearTimeout(timer);
  }, [menuFontFamily]);

  if (isRestaurantOffline) {
    return <RestaurantOffline restaurantName={offlineRestaurantName || String(restaurant?.name || "").trim()} />;
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(menuFontFamily).replace(/%20/g, "+")}:wght@400;700&display=swap`}
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html, body, .menu-client-font, .menu-client-font * {
              font-family: '${menuFontFamily.replace(/'/g, "\\'")}', sans-serif !important;
            }
          `,
        }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              try {
                var raw = localStorage.getItem("menuqr-selected-font") || "";
                var font = String(raw || "").trim();
                if (!font) return;
                var cssFont = "'" + font.replace(/'/g, "\\\\'") + "', sans-serif";
                var styleId = "menuqr-prehydrate-font-style";
                var styleEl = document.getElementById(styleId);
                if (!styleEl) {
                  styleEl = document.createElement("style");
                  styleEl.id = styleId;
                  document.head.appendChild(styleEl);
                }
                styleEl.textContent = ".menu-client-font, .menu-client-font * { font-family: " + cssFont + " !important; }";
                var id = "menuqr-dynamic-font-link";
                var href = "https://fonts.googleapis.com/css2?family=" + encodeURIComponent(font).replace(/%20/g, "+") + ":wght@400;700&display=swap";
                var link = document.getElementById(id);
                if (!link) {
                  link = document.createElement("link");
                  link.id = id;
                  link.rel = "stylesheet";
                  document.head.appendChild(link);
                }
                if (link.href !== href) link.href = href;
              } catch (_) {}
            })();
          `,
        }}
      />
      <div
        key={menuFontFamily}
        dir={isRtl ? "rtl" : "ltr"}
        className={`menu-client-public menu-client-font relative isolate min-h-screen h-full w-screen max-w-none overflow-x-hidden ${darkMode ? "menu-client-dark" : ""} ${!darkMode ? "menu-client-transparent-shell" : ""} ${cardVisualStyle === "sharp" ? "menu-sharp-mode" : ""} ${densityStyle === "compact" ? "menu-density-compact" : "menu-density-spacious"}`}
        style={{
          width: "100vw",
          maxWidth: "100vw",
          fontFamily: `'${menuFontFamily}', sans-serif`,
          color: globalTextColorValue,
          ["--menu-text-color" as string]: globalTextColorValue,
        }}
    >
      {showCategoryDrawerButton ? (
        <button
          type="button"
          onClick={() => setIsCategoryDrawerOpen(true)}
          className="fixed left-4 z-[45] inline-flex h-12 w-12 items-center justify-center rounded-xl border-4 border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          style={{ top: "calc(env(safe-area-inset-top) + 4.5rem)" }}
          aria-label={uiText.categoriesTitle}
          title={uiText.categoriesTitle}
        >
          <span className="flex flex-col gap-1.5" aria-hidden="true">
            <span className="block h-0.5 w-7 bg-black" />
            <span className="block h-0.5 w-7 bg-black" />
            <span className="block h-0.5 w-7 bg-black" />
          </span>
        </button>
      ) : null}
      <style>{`
        .menu-client-bg-content {
          background-size: cover !important;
          background-repeat: no-repeat !important;
          background-position: center center !important;
          transform: none !important;
          transition: none !important;
        }
        .dish-card-sharp {
          border-radius: 0px !important;
        }
        .dish-card-sharp .dish-card-media,
        .dish-card-sharp .dish-card-media img {
          border-radius: 0px !important;
        }
        .promo-dish-card {
          border-color: #ff2d00 !important;
          border-width: 6px !important;
          box-shadow: 0 0 0 3px rgba(255, 45, 0, 0.28), 8px 8px 0px 0px rgba(255, 45, 0, 0.5) !important;
        }
        .promo-badge-giant {
          font-size: clamp(1rem, 2.2vw, 1.35rem) !important;
          line-height: 1 !important;
          letter-spacing: 0.05em !important;
          padding: 0.55rem 0.95rem !important;
          border-width: 3px !important;
        }
        .menu-sharp-mode [class*="rounded"] {
          border-radius: 0px !important;
        }
        .menu-sharp-mode .rounded,
        .menu-sharp-mode .rounded-full,
        .menu-sharp-mode .rounded-lg,
        .menu-sharp-mode .rounded-xl,
        .menu-sharp-mode .rounded-2xl {
          border-radius: 0px !important;
        }
        .menu-sharp-mode .menu-surface-shell,
        .menu-sharp-mode .menu-surface-shell *,
        .menu-sharp-mode .dish-card-shell,
        .menu-sharp-mode .dish-card-shell * {
          border-radius: 0px !important;
        }
        .menu-sharp-mode [class*="badge"],
        .menu-sharp-mode [class*="card"],
        .menu-sharp-mode [class*="surface"],
        .menu-sharp-mode [class*="container"],
        .menu-sharp-mode [class*="chip"] {
          border-radius: 0px !important;
        }
        .menu-sharp-mode button,
        .menu-sharp-mode [role="button"],
        .menu-sharp-mode [role="switch"],
        .menu-sharp-mode input,
        .menu-sharp-mode textarea,
        .menu-sharp-mode select {
          border-radius: 0px !important;
        }
        .menu-density-compact .dish-card-shell {
          padding: 0.65rem !important;
        }
        .menu-density-compact .dish-card-shell .dish-card-media:not(.absolute) {
          max-height: 150px !important;
          height: auto !important;
        }
        .menu-density-compact .menu-surface-shell {
          gap: 0.75rem !important;
        }
        .menu-density-spacious .dish-card-shell .dish-card-media:not(.absolute) {
          max-height: 260px !important;
        }
      `}</style>
      <div
        className="pointer-events-none fixed inset-0 z-[-10] menu-client-bg-content"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
          minHeight: "100dvh",
          zIndex: -10,
          marginTop: "calc(env(safe-area-inset-top, 0px) * -1)",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          backgroundImage: !darkMode && backgroundImageUrl ? `url(${backgroundImageUrl})` : "none",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center center",
          backgroundSize: "cover",
          opacity: !darkMode && backgroundImageUrl ? backgroundOpacity : 1,
          backgroundColor: darkMode ? "#000000" : bannerBgColor,
          transform: "none",
          transition: "none",
        }}
      />
      <div
        className={`absolute inset-0 z-[-1] pointer-events-none ${
          darkMode ? "bg-black/94" : "bg-transparent"
        }`}
      />
      <div
        className={`${darkMode ? "border-[#d99a2b]" : "border-black"} border-b-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-[200px] md:h-[300px] px-4 flex flex-col items-center justify-center relative z-50 overflow-visible`}
        style={{
          backgroundColor: withAlpha(bannerBgColor, "F2"),
          color: bannerContentTextColor,
          ...(showBannerImage
            ? {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.38), rgba(0,0,0,0.38)), url(${bannerImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}),
        }}
      >
        <div className="w-full h-full flex items-center justify-center gap-3 flex-wrap px-4 text-center">
          {showHeaderLogo ? (
            <img
              src={headerLogoSrc}
              alt="Logo"
              className="h-[120px] md:h-[160px] w-auto object-contain my-2 mx-2 shrink-0 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
              onLoad={() => setHeaderLogoLoaded(true)}
              onError={() => {
                setHeaderLogoLoadError(true);
                setHeaderLogoLoaded(false);
              }}
            />
          ) : null}
          {restaurantDisplayName ? (
            <h1 className="text-3xl font-black text-center" style={{ color: bannerContentTextColor }}>
              {restaurantDisplayName}
            </h1>
          ) : null}
        </div>
        <div className="absolute top-4 right-4 z-[9999]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={darkMode ? "Mode clair" : "Mode sombre"}
              onClick={() => setDarkMode((prev) => !prev)}
              className={`border-2 rounded-full px-3 py-1 ${darkMode ? "bg-black text-[#E0E0E0] border-[#d99a2b]" : "bg-white text-black border-black"}`}
            >
              {darkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-gray-800" />}
            </button>
            <button
              className={`${darkMode ? "text-[#E0E0E0] bg-black border-[#d99a2b]" : "text-black bg-white border-black"} font-bold text-xl border-2 rounded-full px-3 py-1`}
              onClick={() => setShowLangMenu((v) => !v)}
            >
              {currentLanguageMeta.flag}
            </button>
          </div>
          {showLangMenu && (
            <div className={`absolute right-0 mt-2 rounded-lg shadow-lg z-[9999] border-2 ${darkMode ? "bg-black border-[#d99a2b]" : "bg-white border-black"}`}>
              {enabledLanguagesClient.map((code) => {
                const languageName = enabledLanguageLabels[code] || DEFAULT_LANGUAGE_LABELS[code] || code.toUpperCase();
                const languageFlag = getLanguageFlag(code);
                return (
                <button
                  key={code}
                  onClick={() => {
                    triggerHaptic(6);
                    setLang(code);
                    setShowLangMenu(false);
                  }}
                  className={`flex items-center w-full px-4 py-2 text-left transition-colors ${darkMode ? "text-[#E0E0E0] hover:bg-[#2a2a2a]" : "text-black hover:bg-gray-100"}`}
                >
                  <span className="text-lg">{languageFlag}</span>
                  <span className="ml-2 font-bold">{languageName}</span>
                </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {!isVitrineMode ? (
        <div
          className={`border-4 rounded-none p-3 mx-0 my-2 relative z-30 ${
            darkMode
              ? "bg-black/95 border-[#d99a2b] text-[#E0E0E0]"
              : cardTransparentEnabled
                ? "bg-transparent border-black text-black"
                : "bg-white/95 border-black text-black"
          } menu-surface-shell`}
          style={!darkMode ? { backgroundColor: "transparent" } : undefined}
        >
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-sm font-black text-black">{uiText.yourTable}</label>
              <input
                type="number"
                placeholder={uiText.yourTable}
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="px-4 py-2 bg-white text-black border border-gray-300 w-28 font-bold"
              />
            </div>
            <div className="min-w-[180px]">
              <label className="mb-1 block text-sm font-black text-black">{tt("validation_code_label")}</label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={orderValidationCodeInput}
                onChange={(e) => setOrderValidationCodeInput(e.target.value)}
                placeholder={tt("validation_code_placeholder")}
                className="w-full px-4 py-2 bg-white text-black border border-gray-300 font-bold"
              />
            </div>
          </div>
          <div className="mt-2 text-sm font-bold">
            {typedValidationCode.length > 0 && !isValidationCodeValid ? (
              <p className="text-red-600">{tt("validation_code_invalid")}</p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="border-4 rounded-none p-3 mx-0 my-2 relative z-30 bg-white/95 border-black text-black menu-surface-shell">
          <p className="text-sm font-black">Mode vitrine actif : consultation du menu uniquement.</p>
        </div>
      )}
      {darkMode ? (
        <style>{`
          .menu-client-dark [class*='bg-white'] { background-color: #000000 !important; color: #F5F5F5 !important; }
          .menu-client-dark [class*='bg-gray-'] { background-color: #020617 !important; color: #F5F5F5 !important; }
          .menu-client-dark [class*='text-black'] { color: #F5F5F5 !important; }
          .menu-client-dark [class*='border-black'] { border-color: #3a3a3a !important; }
          .menu-client-dark [class*='border-gray-'] { border-color: #3a3a3a !important; }
          .menu-client-dark [class*='text-gray-'] { color: #c5c5c5 !important; }
          .menu-client-dark button { border-color: #3a3a3a; background-color: #000000; color: #F5F5F5; }
          .menu-client-dark input, .menu-client-dark textarea, .menu-client-dark select {
            background: #000000 !important; color: #F5F5F5 !important; border-color: #4a4a4a !important;
          }
          .menu-client-dark .shadow-\\[4px_4px_0px_0px_rgba\\(0\\,0\\,0\\,1\\)\\] { box-shadow: 4px 4px 0 0 rgba(217,154,43,.45) !important; }
        `}</style>
      ) : null}
      {!darkMode ? (
        <style>{`
          .menu-client-transparent-shell .menu-surface-shell {
            background: transparent !important;
            background-color: transparent !important;
            box-shadow: none !important;
          }
          .menu-client-public [class*='text-black'],
          .menu-client-public [class*='text-gray-'] {
            color: var(--menu-text-color) !important;
          }
          .menu-client-public input[class*='text-'],
          .menu-client-public textarea[class*='text-'],
          .menu-client-public select[class*='text-'] {
            color: #111111 !important;
          }
        `}</style>
      ) : null}

      <div ref={actionDockSentinelRef} aria-hidden="true" className="h-px -mt-px" />
      <div
        className={`menu-client-action-dock ${
          isVitrineMode || hideCompactFloatingActions
            ? "hidden"
            : isStickyActionsCompact
            ? "fixed top-2 left-1/2 -translate-x-1/2 w-auto max-w-max z-[80] rounded-full border-2 shadow-lg backdrop-blur-md justify-center pointer-events-none"
            : "sticky top-0 left-0 w-full z-20 menu-surface-shell border-b-4"
        } px-3 py-2 flex gap-2 ${
          darkMode
            ? isStickyActionsCompact
              ? "bg-black/60 border-[#d99a2b]"
              : "bg-black/95 border-[#d99a2b]"
            : isStickyActionsCompact
              ? "bg-white/70 border-black"
              : "bg-transparent border-black"
        }`}
        style={
          isStickyActionsCompact
            ? {
                zIndex: 80,
                backgroundColor: darkMode ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.45)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
              }
            : !darkMode
              ? { backgroundColor: "transparent", zIndex: 20 }
              : { zIndex: 20 }
        }
      >
        {!isVitrineMode && (
          <button
            className={`${isStickyActionsCompact ? "pointer-events-auto w-12 h-12 border-4 rounded-full flex items-center justify-center p-0 shrink-0" : "flex-1 border-4 rounded-xl px-4 py-2"} font-black disabled:opacity-100 disabled:cursor-not-allowed`}
            style={{
              backgroundColor: isServerCallThrottled ? (darkMode ? "#111827" : "#D1D5DB") : darkMode ? "#000000" : "#FFFFFF",
              color: isServerCallThrottled ? (darkMode ? "#9CA3AF" : "#4B5563") : darkMode ? "#F5F5F5" : "#111111",
              borderColor: isServerCallThrottled ? (darkMode ? "#4B5563" : "#9CA3AF") : darkMode ? "#d99a2b" : "#000000",
            }}
            onClick={() => !isServerCallThrottled && setShowCallModal(true)}
            disabled={isServerCallThrottled}
            aria-label={isServerCallThrottled ? serverCallThrottleLabel : uiText.callServer}
            title={isServerCallThrottled ? serverCallThrottleLabel : uiText.callServer}
          >
            {isStickyActionsCompact ? (
              isServerCallThrottled ? (
                <span className="text-[10px] leading-none text-center font-black px-1">{Math.max(1, serverCallSecondsLeft)}s</span>
              ) : (
                <PhoneCall className="h-5 w-5" />
              )
            ) : isServerCallThrottled ? (
              serverCallThrottleLabel
            ) : (
              uiText.callServer
            )}
          </button>
        )}
        {!isInteractionDisabled && (
          <button
            className={`${isStickyActionsCompact ? "pointer-events-auto w-12 h-12 border-4 rounded-full p-0 flex items-center justify-center shrink-0" : "flex-1 border-4 rounded-xl px-4 py-2"} font-black disabled:opacity-50 ${
              cartBump ? "cart-bounce" : ""
            }`}
            style={{
              backgroundColor: darkMode ? "#000000" : "#FFFFFF",
              color: darkMode ? "#F5F5F5" : "#111111",
              borderColor: darkMode ? "#d99a2b" : "#000000",
            }}
            onClick={() => setIsCartOpen(true)}
            disabled={cart.length === 0}
            aria-label={uiText.cart}
            title={uiText.cart}
          >
            {isStickyActionsCompact ? (
              <span className="relative inline-flex items-center justify-center">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-black text-white text-[10px] leading-5 border border-white text-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </span>
            ) : (
              `${uiText.cart} (${cart.reduce((sum, item) => sum + item.quantity, 0)})`
            )}
          </button>
        )}
      </div>
      {isStickyActionsCompact && !hideCompactFloatingActions ? <div aria-hidden="true" className="h-16" /> : null}
      {showCallModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={() => !isSendingCall && setShowCallModal(false)}>
          <div
            className="w-full max-w-md bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
            onClick={(e) => e.stopPropagation()}
            translate="no"
          >
            <div className="p-4 border-b-2 border-black flex items-start justify-between gap-3">
              <div>
                <div className="text-xl font-black text-black">{smartCallUi.title}</div>
                <div className="text-sm font-semibold text-gray-700">{smartCallUi.subtitle}</div>
              </div>
              <button
                type="button"
                onClick={() => !isSendingCall && setShowCallModal(false)}
                className="w-10 h-10 bg-white text-black rounded-full border-2 border-black flex items-center justify-center"
              >
                <XCircle size={18} className="text-red-500" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 gap-2">
              {SMART_CALL_OPTION_META.map(({ key, icon: Icon, colorClass }) => (
                <button
                  key={key}
                  type="button"
                  disabled={isSendingCall || isServerCallThrottled}
                  onClick={() => void handleSubmitSmartCall(key)}
                  className="w-full text-left border-2 border-black rounded-xl px-3 py-3 bg-white hover:bg-gray-50 disabled:opacity-60"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full border-2 border-black bg-white flex items-center justify-center">
                      <Icon className={`h-4 w-4 ${colorClass}`} />
                    </span>
                    <span className="font-black text-black">{smartCallUi.options[key]}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => !isSendingCall && setShowCallModal(false)}
                disabled={isSendingCall}
                className="px-4 py-2 border-2 border-black rounded-lg font-black bg-white disabled:opacity-60"
              >
                {isSendingCall ? smartCallUi.sending : smartCallUi.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSalesAdviceModal && (
        <div className="fixed bottom-4 right-4 z-[100] w-[92vw] max-w-md border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="p-3 border-b-2 border-black bg-emerald-50">
            <div className="text-lg font-black text-black">
              {tt("sales_advice_title")}
            </div>
          </div>
          <div className="p-3 text-black font-semibold leading-relaxed">
            {salesAdviceMessage}
          </div>
          <div className="p-3 border-t border-gray-200 flex justify-end gap-2">
            {linkedSalesAdviceDish && (
              <button
                type="button"
                onClick={() => {
                  setShowSalesAdviceModal(false);
                  setSalesAdviceMessage("");
                  setSalesAdviceDishId("");
                  setRecommendationSourceDishId(String(linkedSalesAdviceDish.id || ""));
                  setSelectedDish(null);
                  requestAnimationFrame(() => {
                    handleSelectDish(linkedSalesAdviceDish);
                  });
                }}
                className="px-3 py-1 border-2 border-black rounded font-black"
                style={{ backgroundColor: bannerBgColor, color: bannerContentTextColor }}
              >
                {tt("sales_advice_view_item")}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowSalesAdviceModal(false);
                setSalesAdviceMessage("");
                setSalesAdviceDishId("");
              }}
              className="px-3 py-1 bg-emerald-600 text-white border-2 border-black rounded font-black"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {shouldShowHeroSection && (
        <div className="mx-0 my-2 space-y-3">
          {featuredHighlights.map((highlight) => {
            const featuredDish = highlight.dish;
            const featuredLinkedFormulas = linkedFormulasByDishId.get(String(featuredDish.id || "").trim()) || [];
            const featuredPrimaryFormula = featuredLinkedFormulas[0] || null;
            const isFeaturedFormulaDish = toBooleanFlag((featuredDish as any).is_formula ?? featuredDish.is_formula);
            const featuredFormulaButtonDish = featuredPrimaryFormula || (isFeaturedFormulaDish ? featuredDish : null);
            const primaryType = highlight.types[0] || "daily";
            const featuredOverlay = cardLayout === "overlay" && Boolean(featuredDish.image_url);
            const primaryBackground = cardSurfaceBg;
            return (
              <section
                key={highlight.key}
                className={`border-4 ${darkMode ? "border-[#d99a2b]" : "border-black"} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${
                  consultationModeClient ? "cursor-pointer" : "cursor-pointer"
                }`}
                style={featuredOverlay ? undefined : { backgroundColor: primaryBackground }}
                onClick={() => handleSelectDish(featuredDish)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSelectDish(featuredDish);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="p-3 sm:p-4">
                  <h2
                    className={`text-2xl font-black mb-3 ${darkMode ? "text-[#F5F5F5]" : ""}`}
                    style={!featuredOverlay ? { color: cardTextColorValue } : undefined}
                  >
                    {getFeaturedLabel(primaryType)}
                  </h2>
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch`}>
                    {
                    <div
                      className={`relative overflow-hidden rounded-lg border-2 border-black aspect-[4/3] ${featuredOverlay ? "min-h-[240px] sm:min-h-[280px]" : ""}`}
                      style={{ backgroundColor: cardImagePanelBg }}
                    >
                      {featuredDish.image_url ? (
                        <img
                          src={featuredDish.image_url}
                          alt={getDishName(featuredDish, lang)}
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={hideBrokenImage}
                        />
                      ) : (
                        <div className="absolute inset-0 h-full w-full bg-gray-100" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent pointer-events-none" />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                        {highlight.types.map((badgeType) => (
                          <span
                            key={`${highlight.key}-${badgeType}`}
                            className={`text-xs md:text-sm font-black px-3 py-1 rounded-full border-2 border-white ${
                              badgeType === "daily" ? "bg-green-700 text-white" : "bg-amber-500 text-black"
                            }`}
                          >
                            {getFeaturedLabel(badgeType)}
                          </span>
                        ))}
                        {getPromoPriceForDish(featuredDish) != null && (
                          <span className="promo-badge-giant font-black rounded-full border-2 border-white bg-[#ff2d00] text-white">
                            {promoBadgeLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    }
                    <div className="flex flex-col justify-between">
                      <div
                        className={`rounded-lg p-4 border-2 border-black ${darkMode ? "bg-black text-white" : "bg-white text-black"}`}
                      >
                        <div className="mb-2">
                          <h3 className="text-3xl md:text-4xl font-black" style={!darkMode ? { color: cardTextColorValue } : undefined}>
                            {getDishName(featuredDish, lang)}
                          </h3>
                          {getDishStyleBadges(featuredDish).length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {getDishStyleBadges(featuredDish).map((badge) => (
                                <span
                                  key={`featured-${featuredDish.id}-${badge.key}`}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${darkMode ? "border-white/30 bg-black text-white" : "border-black bg-white text-black"}`}
                                >
                                  <span className={`inline-block w-2 h-2 rounded-full ${badge.dotClass}`} />
                                  {badge.label}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <p
                          className={`text-base md:text-lg leading-relaxed mb-4 ${darkMode ? "text-gray-200" : "text-gray-700"}`}
                          style={!darkMode ? { color: cardTextColorValue } : undefined}
                        >
                          {getDescription(
                            featuredPrimaryFormula
                              ? {
                                  ...featuredDish,
                                  description: (featuredPrimaryFormula as any).description || featuredDish.description,
                                  description_fr: (featuredPrimaryFormula as any).description || featuredDish.description_fr,
                                }
                              : featuredDish,
                            lang
                          )}
                        </p>
                        {(() => {
                          const displayDish = featuredPrimaryFormula
                            ? {
                                ...featuredDish,
                                calories: (featuredPrimaryFormula as any).calories || featuredDish.calories,
                                calories_min: (featuredPrimaryFormula as any).calories_min || featuredDish.calories_min,
                                calories_max: (featuredPrimaryFormula as any).calories_max || featuredDish.calories_max,
                              }
                            : featuredDish;
                          return (
                            (getHungerLevel(displayDish, lang) || (showCaloriesClient && getCaloriesLabel(displayDish, kcalLabel))) && (
                              <div className="flex flex-wrap gap-2 mb-2">
                                {getHungerLevel(displayDish, lang) && (
                                  <span className="inline-flex items-center gap-2 bg-white/95 text-black border border-black rounded-full px-3 py-1.5 text-sm md:text-base font-bold">
                                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                                    {getHungerLevel(displayDish, lang)}
                                  </span>
                                )}
                                {showCaloriesClient && getCaloriesLabel(displayDish, kcalLabel) && (
                                  <span className="inline-flex items-center gap-2 bg-white/95 text-black border border-black rounded-full px-3 py-1.5 text-sm md:text-base font-bold">
                                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500" />
                                    {getCaloriesLabel(displayDish, kcalLabel)}
                                  </span>
                                )}
                              </div>
                            )
                          );
                        })()}
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                        {getPromoPriceForDish(featuredDish) != null ? (
                          <div
                            className="inline-flex items-center gap-2"
                            style={{ color: featuredOverlay ? "#FFFFFF" : darkMode ? "#FFFFFF" : cardTextColorValue }}
                          >
                            <span className="text-xl font-bold line-through opacity-70 inline-flex items-center gap-1">
                              {Number(getDishBasePrice(featuredDish) || 0).toFixed(2)}
                              <Euro size={16} />
                            </span>
                            <span className="text-5xl font-black inline-flex items-center gap-1 text-[#ff2d00]">
                              {Number(getPromoPriceForDish(featuredDish) || 0).toFixed(2)}
                              <Euro size={28} />
                            </span>
                          </div>
                        ) : (
                          <span
                            className="text-4xl font-black inline-flex items-center gap-1"
                            style={{ color: featuredOverlay ? "#FFFFFF" : darkMode ? "#FFFFFF" : cardTextColorValue }}
                          >
                            {Number(getDishBasePrice(featuredDish) || 0).toFixed(2)}
                            <Euro size={24} />
                          </span>
                        )}
                        <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
                          {featuredFormulaButtonDish && !isInteractionDisabled ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (featuredFormulaButtonDish === featuredDish) {
                                  openFormulaModal(featuredFormulaButtonDish, null);
                                  return;
                                }
                                openFormulaModal(featuredFormulaButtonDish, featuredDish);
                              }}
                              className="text-sm md:text-base font-black px-4 py-2.5 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap shrink-0"
                              style={{ backgroundColor: "#FFF8E1", color: "#111111" }}
                            >
                              {viewFormulaLabel} ({getFormulaPackPrice(featuredFormulaButtonDish).toFixed(2)} &euro;)
                            </button>
                          ) : null}
                          {quickAddToCartEnabled ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleQuickAddFromList(featuredDish);
                              }}
                              className="text-sm md:text-base font-black px-4 py-2.5 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap shrink-0"
                              style={{ backgroundColor: bannerBgColor, color: bannerContentTextColor }}
                            >
                              {uiText.addToCart}
                            </button>
                          ) : null}
                          <span
                            className="text-sm md:text-base font-black px-4 py-2 rounded-lg border-2 whitespace-nowrap"
                            style={{
                              borderColor: featuredOverlay ? "rgba(255,255,255,0.9)" : "#000000",
                              color: featuredOverlay ? "#FFFFFF" : darkMode ? "#FFFFFF" : "#111111",
                              backgroundColor: featuredOverlay ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.65)",
                            }}
                          >
                            {clickDetailsLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div
        ref={categoryTabsRef}
        className={`menu-surface-shell border-4 border-black rounded-none p-3 mx-0 my-2 ${!darkMode ? "bg-transparent" : "bg-white/95"}`}
        style={!darkMode ? { backgroundColor: "transparent" } : undefined}
      >
          <div className="flex items-center gap-3">
            <div className="flex flex-nowrap gap-3 overflow-x-auto">
              {categoryList.map((category, index) => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(index);
                    if (index === 0) setSelectedSubCategory("");
                  }}
                  className={`px-6 py-4 rounded-xl font-black text-xl md:text-2xl border-black whitespace-nowrap transition ${
                    selectedCategory === index
                      ? "bg-black text-white border-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      : "bg-white text-black border-2"
                  }`}
                  style={
                    selectedCategory === index
                      ? { backgroundColor: bannerBgColor, color: bannerContentTextColor, borderColor: darkMode ? "#d99a2b" : "#000000" }
                      : undefined
                  }
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
      </div>

      {categoryDrawerEnabled && isCategoryDrawerOpen ? (
        <div className="fixed inset-0 z-[1200] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/65"
            onClick={() => setIsCategoryDrawerOpen(false)}
            aria-label={uiText.close}
          />
          <aside className="absolute left-0 top-0 h-full w-[78%] max-w-[320px] bg-white border-r-4 border-black p-4 pt-6 shadow-[6px_0_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-black text-lg">{uiText.categoriesTitle}</span>
              <button
                type="button"
                onClick={() => setIsCategoryDrawerOpen(false)}
                className="px-2 py-1 border-2 border-black font-black"
              >
                {uiText.close}
              </button>
            </div>
            <div className="space-y-2">
              {categoryList.map((category, index) => (
                <button
                  key={`drawer-${category}`}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(index);
                    if (index === 0) setSelectedSubCategory("");
                    setIsCategoryDrawerOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg font-black border-2 ${
                    selectedCategory === index ? "bg-black text-white border-black" : "bg-white text-black border-black"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </aside>
        </div>
      ) : null}

      {selectedCategory !== 0 && availableSubCategories.length > 0 && (
        <div
          className={`menu-surface-shell border-4 border-black rounded-none p-3 mx-0 mb-2 ${!darkMode ? "bg-transparent" : "bg-white/95"}`}
          style={!darkMode ? { backgroundColor: "transparent" } : undefined}
        >
          <div className="flex flex-nowrap gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedSubCategory("")}
              className={`px-3 py-1 rounded-full font-black text-sm border-2 border-black text-black whitespace-nowrap ${
                !selectedSubCategory ? "bg-black text-white" : "bg-white"
              }`}
              style={
                !selectedSubCategory
                  ? { backgroundColor: bannerBgColor, color: bannerContentTextColor, borderColor: darkMode ? "#d99a2b" : "#000000" }
                  : undefined
              }
            >
              {uiText.labels.all}
            </button>
            {availableSubCategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubCategory(String(sub.id))}
                className={`px-3 py-1 rounded-full font-black text-sm border-2 border-black text-black whitespace-nowrap ${
                  selectedSubCategory === String(sub.id)
                    ? "bg-black text-white"
                    : "bg-white"
                }`}
                style={
                  selectedSubCategory === String(sub.id)
                    ? { backgroundColor: bannerBgColor, color: bannerContentTextColor, borderColor: darkMode ? "#d99a2b" : "#000000" }
                    : undefined
                }
              >
                {getSubCategoryLabel(sub)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className="menu-surface-shell w-full min-w-0 p-3 sm:p-4 grid grid-cols-1 gap-4"
        style={!darkMode ? { backgroundColor: "transparent" } : undefined}
      >
        {loading ? (
          <div className="text-black text-center font-bold py-8">{tt("loading")}</div>
        ) : filteredDishes.length === 0 ? (
          <div className="text-black text-center font-bold py-8">{uiText.noDishes}</div>
        ) : (
          groupedDishes.map((group) => (
            <div key={group.title || "default"} className="flex flex-col gap-4">
              {selectedCategory !== 0 && group.title && (
                <h3 className="text-xl font-black text-black mt-2">
                  {group.title}
                </h3>
              )}
              {group.items.map((dish) => {
                const isBicolorCard = cardLayout === "bicolor";
                const isPromoDish = getPromoPriceForDish(dish) != null;
                const isFormulaDishCard = toBooleanFlag((dish as any).is_formula ?? dish.is_formula);
                const linkedFormulas = linkedFormulasByDishId.get(String(dish.id || "").trim()) || [];
                const primaryLinkedFormula = linkedFormulas[0] || null;
                const formulaButtonDish = primaryLinkedFormula || (isFormulaDishCard ? dish : null);
                const isFormulasCategorySelected = String(selectedCategoryId || "") === FORMULAS_CATEGORY_ID;
                const formulaDisplay = isFormulasCategorySelected && isFormulaDishCard
                  ? formulaDisplayById.get(String(dish.id || "").trim())
                  : null;
                const cardDishName = formulaDisplay?.name || getDishName(dish, lang);
                const cardDishImage = formulaDisplay?.imageUrl || dish.image_url;
                const isOverlayCard = cardLayout === "overlay" && Boolean(cardDishImage);
                const displayBasePrice =
                  isFormulasCategorySelected && isFormulaDishCard ? getFormulaPackPrice(dish) : getDishBasePrice(dish);
                const cardTextColor = isOverlayCard ? "text-white" : cardTextIsLight ? "text-white" : "text-black";
                const badgeBaseClass = isOverlayCard
                  ? "bg-black/50 border-white/70 text-white backdrop-blur-[1px]"
                  : cardTextIsLight
                    ? "bg-white/10 border-white/40 text-white"
                    : "bg-gray-100 border-gray-300 text-black";
                return (
                  <div
                    key={dish.id}
                    className={`dish-card-shell ${cardVisualStyle === "sharp" ? "dish-card-sharp" : ""} ${isPromoDish ? "promo-dish-card" : ""} border-4 border-black ${dishCardRadiusClass} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer relative overflow-hidden ${
                      isOverlayCard
                        ? "p-0 flex items-end"
                        : isBicolorCard
                          ? "p-0 flex flex-col sm:flex-row items-stretch"
                          : `p-4 ${menuLayout === "modern_list" ? "flex flex-row gap-3 items-start" : "flex flex-col"}`
                    } w-full min-w-0`}
                    style={!isOverlayCard ? { backgroundColor: cardSurfaceBg, color: cardTextColorValue } : undefined}
                    onClick={() => handleSelectDish(dish)}
                  >
                    {isOverlayCard ? (
                      <>
                        <img
                          src={cardDishImage}
                          alt={cardDishName}
                          className="dish-card-media absolute inset-0 h-full w-full object-cover"
                          style={{ aspectRatio: "4 / 3" }}
                          onError={hideBrokenImage}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                      </>
                    ) : null}
                    {!isOverlayCard && !isBicolorCard && cardDishImage ? (
                      <img
                        src={cardDishImage}
                        alt={cardDishName}
                        className={`dish-card-media object-cover ${dishMediaRadiusClass} ${
                          menuLayout === "modern_list"
                            ? "w-24 sm:w-28 shrink-0 aspect-[4/3]"
                            : "w-full aspect-[4/3] mb-3"
                        }`}
                        onError={hideBrokenImage}
                      />
                    ) : null}
                    {!isOverlayCard && isBicolorCard ? (
                      cardDishImage ? (
                        <img
                          src={cardDishImage}
                          alt={cardDishName}
                          className="dish-card-media w-full sm:w-[42%] aspect-[4/3] object-cover"
                          onError={hideBrokenImage}
                        />
                      ) : (
                        <div className="dish-card-media w-full sm:w-[42%] aspect-[4/3] bg-gray-100 border-b-2 sm:border-b-0 sm:border-r-2 border-black" />
                      )
                    ) : null}
                    <div
                      className={`relative z-10 ${
                        isOverlayCard
                          ? "w-full p-4"
                          : isBicolorCard
                            ? "w-full sm:flex-1 min-w-0 p-4 sm:border-l-2 border-black flex flex-col justify-between"
                            : menuLayout === "modern_list"
                              ? "flex-1 min-w-0"
                              : ""
                      } ${cardTextColor}`}
                      style={
                        !isOverlayCard && isBicolorCard
                          ? { backgroundColor: cardSurfaceBg, color: cardTextColorValue }
                          : undefined
                      }
                    >
                      <div className="mb-1">
                        <h4
                          className={`text-lg font-bold ${
                            menuLayout === "modern_list" && !isOverlayCard && !isBicolorCard ? "truncate" : ""
                          } ${isBicolorCard ? "text-xl tracking-wide" : ""}`}
                          title={cardDishName}
                          style={!isOverlayCard ? { color: cardTextColorValue } : undefined}
                        >
                          {cardDishName}
                        </h4>
                        {getPromoPriceForDish(dish) != null || getDishSuggestionBadge(dish) || getDishStyleBadges(dish).length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {getPromoPriceForDish(dish) != null && (
                              <span
                                className={`promo-badge-giant inline-flex items-center gap-1 rounded-full font-black border-2 ${
                                  isOverlayCard
                                    ? "bg-[#ff2d00] border-white text-white"
                                    : darkMode
                                      ? "bg-[#ff2d00] border-white text-white"
                                      : "bg-[#ffede7] border-[#ff2d00] text-[#c21807]"
                                }`}
                              >
                                {promoBadgeLabel}
                              </span>
                            )}
                            {getDishSuggestionBadge(dish) && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                  isOverlayCard
                                    ? "bg-black/70 border-white text-white"
                                    : darkMode
                                      ? "bg-black border-white/20 text-white"
                                      : "bg-gray-100 border-black text-black"
                                }`}
                              >
                                {chefSuggestionBadgeLabel}
                              </span>
                            )}
                            {getDishStyleBadges(dish).map((badge) => (
                              <span
                                key={`${dish.id}-${badge.key}`}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                  isOverlayCard
                                    ? "bg-black/45 border-white/60 text-white"
                                    : darkMode
                                      ? "bg-black border-white/20 text-white"
                                      : "bg-white border-black text-black"
                                }`}
                              >
                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                                {badge.label}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <p
                        className={`text-sm mb-2 ${
                          isBicolorCard
                            ? `max-w-xl ${cardTextIsLight ? "text-white/85" : "text-gray-700"}`
                            : menuLayout === "modern_list" && !isOverlayCard
                              ? "break-words line-clamp-3"
                              : ""
                        } ${isOverlayCard ? "text-white/90 line-clamp-3" : ""} ${!darkMode && !isOverlayCard ? "text-black" : ""}`}
                        style={!isOverlayCard ? { color: cardTextColorValue } : undefined}
                      >
                        {getDescription(
                          formulaDisplay && (formulaDisplay as any)?.description
                            ? {
                                ...dish,
                                description: (formulaDisplay as any).description,
                                description_fr: (formulaDisplay as any).description,
                              }
                            : dish,
                          lang
                        )}
                      </p>
                      {(() => {
                        const displayDish = formulaDisplay && (formulaDisplay as any)?.calories != null
                          ? {
                              ...dish,
                              calories: (formulaDisplay as any).calories,
                              calories_min: (formulaDisplay as any).calories,
                              calories_max: (formulaDisplay as any).calories,
                            }
                          : dish;
                        return (
                          (getHungerLevel(displayDish, lang) || (showCaloriesClient && getCaloriesLabel(displayDish, kcalLabel))) && (
                            <div className={`flex flex-wrap gap-3 text-xs font-bold mb-2 ${isBicolorCard ? "" : ""} ${cardTextColor}`}>
                              {getHungerLevel(displayDish, lang) && (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 border ${badgeBaseClass}`}>
                                  <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                                  {getHungerLevel(displayDish, lang)}
                                </span>
                              )}
                              {showCaloriesClient && getCaloriesLabel(displayDish, kcalLabel) && (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 border ${badgeBaseClass}`}>
                                  <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
                                  {getCaloriesLabel(displayDish, kcalLabel)}
                                </span>
                              )}
                            </div>
                          )
                        );
                      })()}
                      <div className={`flex gap-2 mb-2 flex-wrap ${isBicolorCard ? "" : ""}`}>
                        {dish.is_vegetarian && (
                          <span className={`px-2 py-1 rounded font-bold text-xs border-2 ${isOverlayCard ? "bg-green-700/80 border-white text-white" : "bg-green-200 border-black text-black"}`}>
                            {tt("vegetarian")}
                          </span>
                        )}
                        {getSpicyBadgeLabel(dish, lang) && (
                          <span className={`px-2 py-1 rounded font-bold text-xs border-2 ${isOverlayCard ? "bg-red-700/80 border-white text-white" : "bg-red-200 border-black text-black"}`}>
                            {getSpicyBadgeLabel(dish, lang)}
                          </span>
                        )}
                        {getVisibleDishAllergenLabels(dish).map((a, i) => (
                          <span
                            key={i}
                            className={`px-2 py-1 rounded font-bold text-xs border-2 ${
                              isOverlayCard
                                ? "bg-black/45 border-yellow-300 text-yellow-200"
                                : darkMode
                                  ? "bg-transparent border-yellow-400 text-yellow-300"
                                  : "bg-yellow-200 border-black text-black"
                            }`}
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                      {linkedFormulas.length > 0 || isFormulaDishCard ? (
                        <div className="mb-2 inline-flex items-center gap-1 rounded-full border-2 border-black bg-white px-2 py-1 text-xs font-black text-black">
                          {availableInFormulaLabel}
                        </div>
                      ) : null}
                      <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        {getPromoPriceForDish(dish) != null ? (
                          <div
                            className={`inline-flex items-center gap-2 ${isOverlayCard ? "text-white" : ""}`}
                            style={!isOverlayCard ? { color: cardTextColorValue } : undefined}
                          >
                            <span className="text-sm font-bold line-through opacity-70 inline-flex items-center gap-1">
                              {Number(displayBasePrice || 0).toFixed(2)}
                              <Euro size={14} />
                            </span>
                            <span className="text-3xl md:text-4xl font-black inline-flex items-center gap-1 text-[#ff2d00]">
                              {Number(getPromoPriceForDish(dish) || 0).toFixed(2)}
                              <Euro size={20} />
                            </span>
                          </div>
                        ) : (
                          <span
                            className={`text-2xl md:text-3xl font-black inline-flex items-center gap-1 ${isOverlayCard ? "text-white" : ""}`}
                            style={!isOverlayCard ? { color: cardTextColorValue } : undefined}
                          >
                            {Number(displayBasePrice || 0).toFixed(2)}
                            <Euro size={18} />
                          </span>
                        )}
                        <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2 sm:justify-end">
                          {formulaButtonDish && !isInteractionDisabled ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (formulaButtonDish === dish) {
                                  openFormulaModal(formulaButtonDish, null);
                                  return;
                                }
                                openFormulaModal(formulaButtonDish, dish);
                              }}
                              className={`h-11 px-3.5 py-2 rounded-lg inline-flex items-center justify-center text-sm sm:text-base font-black border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap ${
                                isOverlayCard ? "border-white" : "border-black"
                              }`}
                              style={{
                                backgroundColor: isOverlayCard ? "#FFF8E1" : "#FFF8E1",
                                color: "#111111",
                              }}
                            >
                              {viewFormulaLabel} ({getFormulaPackPrice(formulaButtonDish).toFixed(2)} &euro;)
                            </button>
                          ) : null}
                          {quickAddToCartEnabled ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleQuickAddFromList(dish);
                              }}
                              className={`h-11 px-3.5 py-2 rounded-lg inline-flex items-center justify-center text-sm sm:text-base font-black border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap ${
                                isOverlayCard ? "border-white" : "border-black"
                              }`}
                              style={{
                                backgroundColor: isOverlayCard ? "#FFFFFF" : bannerBgColor,
                                color: isOverlayCard ? "#111111" : bannerContentTextColor,
                              }}
                              aria-label={uiText.addToCart}
                              title={uiText.addToCart}
                            >
                              {uiText.addToCart}
                            </button>
                          ) : null}
                          <span
                            className={`h-11 px-3.5 py-2 rounded-lg inline-flex items-center justify-center text-sm sm:text-base font-black border-2 whitespace-nowrap ${
                              isOverlayCard ? "border-white" : "border-black"
                            }`}
                            style={{
                              backgroundColor: isOverlayCard
                                ? "rgba(0,0,0,0.25)"
                                : darkMode
                                  ? "#000000"
                                  : "rgba(255,255,255,0.65)",
                              color: darkMode ? "#FFFFFF" : isOverlayCard ? "#FFFFFF" : "#111111",
                            }}
                          >
                            {viewDetailsLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {formulaDish && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90dvh] rounded-none sm:rounded-2xl border-t-4 sm:border-4 border-black overflow-hidden flex flex-col">
            <div className="relative p-4 border-b-4 border-black">
              <button
                className="absolute top-4 right-4 w-10 h-10 bg-white text-black rounded-full font-bold flex items-center justify-center border-4 border-black"
                onClick={() => {
                  setFormulaDish(null);
                  setFormulaSourceDish(null);
                  setFormulaSelections({});
                  setFormulaSelectionDetails({});
                  setFormulaMainDetails(emptyFormulaSelectionDetails);
                  setFormulaSelectionError("");
                  setFormulaItemDetailsOpen({});
                }}
                aria-label={uiText.close}
                title={uiText.close}
              >
                <XCircle size={20} className="text-red-500" />
              </button>
              <div className="text-center">
                <div className="text-lg font-black">{formulaUi.title}</div>
                <div className="text-sm text-black/70">{formulaUi.subtitle}</div>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-28 pt-4 sm:pb-6">
              <h2 className="text-2xl font-black text-black mb-1">{formulaStepTitle || getFormulaDisplayName(formulaDish)}</h2>
              <div className="text-base font-black inline-flex items-center gap-1 mb-4">
                {Number(getFormulaPackPrice(formulaDish) || 0).toFixed(2)}
                <Euro size={16} />
              </div>
              {(() => {
                const info = formulaInfoById.get(String(formulaDish.id || ""));
                const linkedDish = info?.dishId ? dishById.get(String(info.dishId)) : null;
                const imageUrl = sanitizeMediaUrl(info?.imageUrl || (linkedDish as any)?.image_url, "dishes-images-");
                if (!imageUrl) return null;
                return <img src={imageUrl} alt={getFormulaDisplayName(formulaDish)} className="w-full h-48 object-cover rounded-lg border-2 border-black mb-4" />;
              })()}
              {(() => {
                const info = formulaInfoById.get(String(formulaDish.id || ""));
                const desc = String((info as any)?.description || "").trim();
const calories = (info as any)?.calories != null ? Number((info as any).calories) : null;
const allergens = String((info as any)?.allergens || "").trim();
                if (!desc && calories == null && !allergens) return null;
                return (
                  <div className="mb-4 space-y-2 text-sm">
                    {desc && <p className="whitespace-pre-line">{desc}</p>}
                    {calories != null && <p className="font-bold">Calories : {calories} kcal</p>}
                    {allergens && <p className="text-black"><span className="font-bold">Allergènes :</span> {allergens}</p>}
                  </div>
                );
              })()}
              {formulaMainConfig && (formulaMainConfig.hasRequiredSides || formulaMainConfig.askCooking) ? (
                <div className="mb-4 border-2 border-black rounded-xl p-3">
                  {(() => {
                const info = formulaInfoById.get(String(formulaDish?.id || ""));
                const parentDishId = info?.dishId;
                const parentDish = parentDishId ? dishById.get(String(parentDishId)) : null;
                const parentDishNameFromFormula = String(info?.parent_dish_name || "").trim();
                const stepDishName =
                  formulaStepTitle ||
                  (parentDish ? getDishName(parentDish, lang) : "") ||
                  parentDishNameFromFormula;
                const parentDishName = stepDishName || getFormulaDisplayName(formulaDish);
                return <div className="font-black text-base mb-2">{parentDishName}</div>;
              })()}
                  <div className="space-y-3">
                    {formulaMainConfig.hasRequiredSides ? (
                      <div>
                        <div className="text-xs font-black uppercase tracking-wide mb-2">
                          {uiText.sidesLabel} ({Math.min(formulaMainConfig.maxSides, formulaMainDetails.selectedSides.length)}/
                          {formulaMainConfig.maxSides})
                        </div>
                        {formulaMainConfig.sideOptions.length === 0 ? (
                          <div className="text-xs font-bold text-red-600">{tt("no_side_configured")}</div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2">
                            {formulaMainConfig.sideOptions.map((sideLabel) => {
                              const sideId = sideIdByAlias.get(normalizeLookupText(sideLabel)) || sideLabel;
                              const checked = formulaMainDetails.selectedSideIds.includes(sideId);
                              return (
                                <label key={`formula-main-side-${sideId}`} className="flex items-center gap-2 text-sm font-bold">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) => {
                                      setFormulaSelectionError("");
                                      setFormulaMainDetails((current) => {
                                        const maxSides = formulaMainConfig.maxSides;
                                        const nextPairs = current.selectedSideIds.map((id, index) => ({
                                          id,
                                          label: current.selectedSides[index] || id,
                                        }));
                                        const exists = nextPairs.some((entry) => entry.id === sideId);
                                        const canAdd = nextPairs.length < maxSides;
                                        const updatedPairs = event.target.checked
                                          ? exists
                                            ? nextPairs
                                            : canAdd
                                              ? [...nextPairs, { id: sideId, label: sideLabel }]
                                              : nextPairs
                                          : nextPairs.filter((entry) => entry.id !== sideId);
                                        return {
                                          ...current,
                                          selectedSideIds: updatedPairs.map((entry) => entry.id),
                                          selectedSides: updatedPairs.map((entry) => entry.label),
                                        };
                                      });
                                    }}
                                  />
                                  <span>{sideLabel}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : null}
                    {formulaMainConfig.askCooking ? (
                      <div>
                        <div className="text-xs font-black uppercase tracking-wide mb-2">{uiText.cookingLabel}</div>
                        <div className="grid grid-cols-1 gap-2">
                          {[uiText.cooking.blue, uiText.cooking.rare, uiText.cooking.medium, uiText.cooking.wellDone].map(
                            (cookingLabel) => (
                              <label
                                key={`formula-main-cooking-${cookingLabel}`}
                                className="flex items-center gap-2 text-sm font-bold"
                              >
                                <input
                                  type="radio"
                                  name="formula-main-cooking"
                                  checked={formulaMainDetails.selectedCooking === cookingLabel}
                                  onChange={() => {
                                    setFormulaSelectionError("");
                                    setFormulaMainDetails((current) => ({
                                      ...current,
                                      selectedCooking: cookingLabel,
                                    }));
                                  }}
                                />
                                <span>{cookingLabel}</span>
                              </label>
                            )
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {formulaCategories.length === 0 ? (
                <div className="text-sm text-black/70">{uiText.noDishes}</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {formulaCategories.map((category) => {
                    const categoryId = String(category.id || "").trim();
                    const options = formulaOptionsByCategory.get(categoryId) || [];
                    const selectedId = formulaSelections[categoryId] || "";
                    const selectedDishForCategory = selectedId ? dishById.get(String(selectedId || "").trim()) || null : null;
                    const formulaDishConfig = selectedDishForCategory ? getFormulaDishConfig(selectedDishForCategory) : null;
                    const categoryDetails = getFormulaSelectionDetails(categoryId);
                    const allowMultiOptionSelection = Boolean((selectedDishForCategory as any)?.allow_multi_select);
                    const selectedDishIdForDefaults = selectedDishForCategory ? String(selectedDishForCategory.id || "").trim() : "";
                    const rawDefaultOptionIdsForSelectedDish = selectedDishIdForDefaults
                      ? formulaDefaultOptionsByDishId.get(selectedDishIdForDefaults) || []
                      : [];
                    const availableOptionIdSet = new Set(
                      (formulaDishConfig?.productOptions || []).map((option) => String(option.id || "").trim()).filter(Boolean)
                    );
                    const defaultOptionIdsForSelectedDish = rawDefaultOptionIdsForSelectedDish.filter((id) =>
                      availableOptionIdSet.has(String(id || "").trim())
                    );
                    return (
                      <div key={`formula-category-${categoryId}`} className="border-2 border-black rounded-xl p-3">
                        <div className="font-black text-base mb-2">{getCategoryLabel(category)}</div>
                        {options.length === 0 ? (
                          <div className="text-sm text-black/60">{uiText.noDishes}</div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2">
                            {options.map((optionDish) => {
                              const optionId = String(optionDish.id || "").trim();
                              if (!optionId) return null;
                              const isSelected = selectedId === optionId;
                              const optionConfig = getFormulaDishConfig(optionDish);
                              const rawDefaultOptionIds = formulaDefaultOptionsByDishId.get(optionId) || [];
                              const optionProductOptionIds = new Set(
                                optionConfig.productOptions.map((option) => String(option.id || "").trim()).filter(Boolean)
                              );
                              const normalizedDefaultOptionIds = rawDefaultOptionIds.filter((id) =>
                                optionProductOptionIds.has(String(id || "").trim())
                              );
                              const allowMultiDefaults = Boolean((optionDish as any)?.allow_multi_select);
                              const defaultOptionIds = allowMultiDefaults ? normalizedDefaultOptionIds : normalizedDefaultOptionIds.slice(0, 1);
                              const isDetailsOpen = Boolean(formulaItemDetailsOpen[optionId]);
                              const optionDescription = getDescription(optionDish, lang);
                              return (
                                <div key={`formula-option-${categoryId}-${optionId}`} className="flex flex-col gap-2">
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormulaSelectionError("");
                                        setFormulaSelections((prev) => ({ ...prev, [categoryId]: optionId }));
                                        setFormulaSelectionDetails((prev) => ({
                                          ...prev,
                                          [categoryId]: {
                                            selectedSideIds: [],
                                            selectedSides: [],
                                            selectedCooking: "",
                                            selectedProductOptionIds: defaultOptionIds,
                                          },
                                        }));
                                      }}
                                      className={`flex-1 text-left px-3 py-2 rounded-lg border-2 font-black ${
                                        isSelected ? "bg-black text-white border-black" : "bg-white text-black border-black"
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        {optionDish.image_url ? (
                                          <img
                                            src={optionDish.image_url}
                                            alt={getDishName(optionDish, lang)}
                                            className="h-10 w-10 rounded-md object-cover border border-black/20"
                                            onError={hideBrokenImage}
                                          />
                                        ) : null}
                                        <span>{getDishName(optionDish, lang)}</span>
                                      </div>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setFormulaItemDetailsOpen((prev) => ({ ...prev, [optionId]: !prev[optionId] }))
                                      }
                                      className="px-3 py-2 rounded-lg border-2 border-black bg-white text-xs font-black text-black whitespace-nowrap"
                                    >
                                      {itemDetailsLabel}
                                    </button>
                                  </div>
                                  {isDetailsOpen ? (
                                    <div className="text-sm text-black/70 rounded-lg border border-black/10 bg-white px-3 py-2">
                                      {optionDescription || tt("details_none")}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {selectedDishForCategory && formulaDishConfig ? (
                          <div className="mt-3 space-y-3 border-t border-black/20 pt-3">
                            <h3 className="font-black text-base mb-2">{getDishName(selectedDishForCategory, lang)}</h3>
                            {formulaDishConfig.productOptions.length > 0 ? (
                              <div>
                                <div className="text-xs font-black uppercase tracking-wide mb-2">{optionVariantsLabel}</div>
                                <div className="grid grid-cols-1 gap-2">
                                  {formulaDishConfig.productOptions.map((option) => {
                                    const optionId = String(option.id || "").trim();
                                    if (!optionId) return null;
                                    const optionPrice = parseAddonPrice(option.price_override);
                                    const isPaidOption = optionPrice > 0;
                                    const isDefaultOption = defaultOptionIdsForSelectedDish.includes(optionId);
                                    const isLocked = isPaidOption && !isDefaultOption;
                                    const selected = categoryDetails.selectedProductOptionIds.includes(optionId);
                                    return (
                                      <label
                                        key={`formula-option-detail-${categoryId}-${optionId}`}
                                        className={`flex items-center gap-2 text-sm font-bold ${isLocked ? "text-gray-400" : ""}`}
                                      >
                                        <input
                                          type={allowMultiOptionSelection ? "checkbox" : "radio"}
                                          name={`formula-product-option-${categoryId}`}
                                          checked={selected}
                                          disabled={isLocked}
                                          onChange={(event) => {
                                            if (isLocked) return;
                                            setFormulaSelectionError("");
                                            setFormulaSelectionDetails((prev) => {
                                              const current = prev[categoryId] || {
                                                selectedSideIds: [],
                                                selectedSides: [],
                                                selectedCooking: "",
                                                selectedProductOptionIds: [],
                                              };
                                              const nextIds = allowMultiOptionSelection
                                                ? event.target.checked
                                                  ? [...current.selectedProductOptionIds, optionId]
                                                  : current.selectedProductOptionIds.filter((id) => id !== optionId)
                                                : event.target.checked
                                                  ? [optionId]
                                                  : [];
                                              return {
                                                ...prev,
                                                [categoryId]: {
                                                  ...current,
                                                  selectedProductOptionIds: Array.from(new Set(nextIds)),
                                                },
                                              };
                                            });
                                          }}
                                        />
                                        <span>
                                          {getProductOptionLabel(option, lang)}
                                          {isLocked ? ` (${formulaOptionLockedLabel})` : ""}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}
                            {formulaDishConfig.hasRequiredSides ? (
                              <div>
                                <div className="text-xs font-black uppercase tracking-wide mb-2">
                                  {uiText.sidesLabel} ({Math.min(formulaDishConfig.maxSides, categoryDetails.selectedSides.length)}/{formulaDishConfig.maxSides})
                                </div>
                                {formulaDishConfig.sideOptions.length === 0 ? (
                                  <div className="text-xs font-bold text-red-600">{tt("no_side_configured")}</div>
                                ) : (
                                  <div className="grid grid-cols-1 gap-2">
                                    {formulaDishConfig.sideOptions.map((sideLabel) => {
                                      const sideId = sideIdByAlias.get(normalizeLookupText(sideLabel)) || sideLabel;
                                      const checked = categoryDetails.selectedSideIds.includes(sideId);
                                      return (
                                        <label key={`formula-side-${categoryId}-${sideId}`} className="flex items-center gap-2 text-sm font-bold">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(event) => {
                                              setFormulaSelectionError("");
                                              setFormulaSelectionDetails((prev) => {
                                                const current = prev[categoryId] || {
                                                  selectedSideIds: [],
                                                  selectedSides: [],
                                                  selectedCooking: "",
                                                  selectedProductOptionIds: [],
                                                };
                                                const maxSides = formulaDishConfig.maxSides;
                                                const nextPairs = current.selectedSideIds.map((id, index) => ({
                                                  id,
                                                  label: current.selectedSides[index] || id,
                                                }));
                                                const exists = nextPairs.some((entry) => entry.id === sideId);
                                                const canAdd = nextPairs.length < maxSides;
                                                const updatedPairs = event.target.checked
                                                  ? exists
                                                    ? nextPairs
                                                    : canAdd
                                                      ? [...nextPairs, { id: sideId, label: sideLabel }]
                                                      : nextPairs
                                                  : nextPairs.filter((entry) => entry.id !== sideId);
                                                return {
                                                  ...prev,
                                                  [categoryId]: {
                                                    ...current,
                                                    selectedSideIds: updatedPairs.map((entry) => entry.id),
                                                    selectedSides: updatedPairs.map((entry) => entry.label),
                                                  },
                                                };
                                              });
                                            }}
                                          />
                                          <span>{sideLabel}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : null}
                            {formulaDishConfig.askCooking ? (
                              <div>
                                <div className="text-xs font-black uppercase tracking-wide mb-2">{uiText.cookingLabel}</div>
                                <div className="grid grid-cols-1 gap-2">
                                  {[uiText.cooking.blue, uiText.cooking.rare, uiText.cooking.medium, uiText.cooking.wellDone].map((cookingLabel) => (
                                    <label key={`formula-cooking-${categoryId}-${cookingLabel}`} className="flex items-center gap-2 text-sm font-bold">
                                      <input
                                        type="radio"
                                        name={`formula-cooking-${categoryId}`}
                                        checked={categoryDetails.selectedCooking === cookingLabel}
                                        onChange={() => {
                                          setFormulaSelectionError("");
                                          setFormulaSelectionDetails((prev) => {
                                            const current = prev[categoryId] || {
                                              selectedSideIds: [],
                                              selectedSides: [],
                                              selectedCooking: "",
                                              selectedProductOptionIds: [],
                                            };
                                            return {
                                              ...prev,
                                              [categoryId]: {
                                                ...current,
                                                selectedCooking: cookingLabel,
                                              },
                                            };
                                          });
                                        }}
                                      />
                                      <span>{cookingLabel}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
              {formulaSelectionError ? (
                <div className="mt-4 text-sm text-red-600 font-bold">{formulaSelectionError}</div>
              ) : null}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t-4 border-black bg-white">
              <button
                disabled={formulaAddDisabled}
                className="w-full py-3 bg-black text-white font-black rounded-xl border-4 border-black disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  const missingCategory = normalizedFormulaCategoryIds.find((categoryId) => {
                    const normalizedCategoryId = String(categoryId || "").trim();
                    if (!normalizedCategoryId) return false;
                    const options = formulaOptionsByCategory.get(normalizedCategoryId) || [];
                    if (options.length === 0) return false;
                    return !formulaSelections[normalizedCategoryId];
                  });
                  if (missingCategory) {
                    setFormulaSelectionError(formulaUi.missing);
                    return;
                  }
                  const formulaMainConfig = formulaDish ? getFormulaDishConfig(formulaDish) : null;
                  if (formulaMainConfig) {
                    if (formulaMainConfig.hasRequiredSides && formulaMainDetails.selectedSides.length === 0) {
                      setFormulaSelectionError(formulaUi.missingOptions);
                      return;
                    }
                    if (formulaMainConfig.askCooking && !String(formulaMainDetails.selectedCooking || "").trim()) {
                      setFormulaSelectionError(formulaUi.missingOptions);
                      return;
                    }
                  }
                  const missingRequiredOptionsCategory = normalizedFormulaCategoryIds.find((categoryId) => {
                    const normalizedCategoryId = String(categoryId || "").trim();
                    if (!normalizedCategoryId) return false;
                    const selectedId = String(formulaSelections[normalizedCategoryId] || "").trim();
                    if (!selectedId) return false;
                    const selectedDish = dishById.get(selectedId);
                    if (!selectedDish) return false;
                    const config = getFormulaDishConfig(selectedDish);
                    const details = getFormulaSelectionDetails(normalizedCategoryId);
                    if (config.productOptions.length > 0 && details.selectedProductOptionIds.length === 0) {
                      return true;
                    }
                    if (config.hasRequiredSides && details.selectedSides.length === 0) {
                      return true;
                    }
                    if (config.askCooking && !String(details.selectedCooking || "").trim()) {
                      return true;
                    }
                    return false;
                  });
                  if (missingRequiredOptionsCategory) {
                    setFormulaSelectionError(formulaUi.missingOptions);
                    return;
                  }
                  const selections: FormulaSelection[] = normalizedFormulaCategoryIds
                    .map((categoryId, categoryIndex) => {
                      const normalizedCategoryId = String(categoryId || "").trim();
                      const selectedId = String(formulaSelections[normalizedCategoryId] || "").trim();
                      if (!normalizedCategoryId || !selectedId) return null;
                      const category = categoryById.get(normalizedCategoryId);
                      const selectedDish = dishById.get(selectedId);
                      if (!selectedDish) return null;
                      const config = getFormulaDishConfig(selectedDish);
                      const details = getFormulaSelectionDetails(normalizedCategoryId);
                      const selectedOptions = config.productOptions.filter((option) =>
                        details.selectedProductOptionIds.includes(String(option.id || "").trim())
                      );
                      const selectedOptionNames = selectedOptions
                        .map((option) => getProductOptionLabel(option, lang))
                        .filter(Boolean);
                      const selectedOptionPrice = selectedOptions.reduce(
                        (sum, option) => sum + parseAddonPrice(option.price_override),
                        0
                      );
                      const linkedSequence = formulaSequenceByDishId.get(selectedId);
                      const sequence =
                        Number.isFinite(Number(linkedSequence))
                          ? Number(linkedSequence)
                          : categoryIndex + 1;
                      return {
                        categoryId: normalizedCategoryId,
                        categoryLabel: category ? getCategoryLabel(category) : "",
                        dishId: selectedId,
                        dishName: getDishName(selectedDish, lang),
                        dishNameFr: String(selectedDish.name_fr || selectedDish.name || selectedDish.nom || "").trim() || getDishName(selectedDish, lang),
                        sequence,
                        selectedSideIds: details.selectedSideIds,
                        selectedSides: details.selectedSides,
                        selectedCooking: details.selectedCooking,
                        selectedOptionIds: details.selectedProductOptionIds,
                        selectedOptionNames,
                        selectedOptionPrice,
                      };
                    })
                    .filter(Boolean) as FormulaSelection[];
                  addToCart({
                    dish: formulaSourceDish || formulaDish,
                    quantity: 1,
                    selectedSides: formulaMainDetails.selectedSides,
                    selectedSideIds: formulaMainDetails.selectedSideIds,
                    selectedExtras: [],
                    selectedProductOptions: [],
                    selectedProductOption: null,
                    selectedCooking: formulaMainDetails.selectedCooking,
                    specialRequest: "",
                    formulaSelections: selections,
                    formulaDishId: String(formulaDish.id || "").trim() || undefined,
                    formulaDishName: getFormulaDisplayName(formulaDish),
                    formulaUnitPrice: getFormulaPackPrice(formulaDish),
                  });
                  setFormulaDish(null);
                  setFormulaSourceDish(null);
                  setFormulaSelections({});
                  setFormulaSelectionDetails({});
                  setFormulaMainDetails(emptyFormulaSelectionDetails);
                  setFormulaSelectionError("");
                  setFormulaItemDetailsOpen({});
                }}
              >
                {uiText.addToCart}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedDish && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className={`${darkMode ? "bg-black border-[#d99a2b] text-[#F5F5F5]" : "bg-white border-black"} border-4 rounded-t-2xl sm:rounded-xl w-full max-w-md h-[100dvh] sm:h-auto sm:max-h-[92vh] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative flex flex-col overflow-hidden`}>
            <button
              type="button"
              aria-label={uiText.close}
              title={uiText.close}
              onClick={() => {
                setSelectedDish(null);
                setModalProductOptions([]);
                setSelectedProductOptionIds([]);
                setRecommendationSourceDishId("");
              }}
              className={`absolute top-3 right-3 w-10 h-10 rounded-full font-bold flex items-center justify-center border-4 ${
                darkMode ? "bg-black text-[#F5F5F5] border-[#d99a2b]" : "bg-white text-black border-black"
              }`}
            >
              <XCircle size={18} className={darkMode ? "text-red-300" : "text-red-500"} />
            </button>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-14 sm:px-6 sm:pb-6">
              {selectedDish.image_url && (
                <img
                  src={selectedDish.image_url}
                  alt={getDishName(selectedDish, lang)}
                  className="w-full aspect-[4/3] object-cover rounded-xl mb-4"
                  onError={hideBrokenImage}
                />
              )}
              <h2 className="text-2xl font-black text-black mb-2">
                {getDishName(selectedDish, lang)}
              </h2>
              {(() => {
                const selectedFormulaDisplay = selectedDishLinkedFormulas[0] || null;
                const displayDish = selectedFormulaDisplay
                  ? {
                      ...selectedDish,
                      description: (selectedFormulaDisplay as any).description || selectedDish.description,
                      description_fr: (selectedFormulaDisplay as any).description || selectedDish.description_fr,
                    }
                  : selectedDish;
                return <p className="text-black mb-2">{getDescription(displayDish, lang)}</p>;
              })()}
              {selectedFormulaButtonDish ? (
                <div className="mb-3 rounded-lg border-2 border-black bg-amber-50 p-3">
                  <div className="text-sm font-black text-black mb-1">{availableInFormulaLabel}</div>
                  {selectedFormulaButtonDish && !isInteractionDisabled ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedFormulaButtonDish === selectedDish) {
                          openFormulaModal(selectedFormulaButtonDish, null);
                          return;
                        }
                        openFormulaModal(selectedFormulaButtonDish, selectedDish);
                      }}
                      className="w-full mb-2 px-3 py-3 rounded-lg border-2 border-black bg-black text-white font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      {viewFormulaLabel} ({getFormulaPackPrice(selectedFormulaButtonDish).toFixed(2)} &euro;)
                    </button>
                  ) : null}
                </div>
              ) : null}
              {(() => {
                const selectedFormulaDisplay = selectedDishLinkedFormulas[0] || null;
                const displayDish = selectedFormulaDisplay
                  ? {
                      ...selectedDish,
                      calories: (selectedFormulaDisplay as any).calories || selectedDish.calories,
                      calories_min: (selectedFormulaDisplay as any).calories_min || selectedDish.calories_min,
                      calories_max: (selectedFormulaDisplay as any).calories_max || selectedDish.calories_max,
                    }
                  : selectedDish;
                return (
                  (getHungerLevel(displayDish, lang) || (showCaloriesClient && getCaloriesLabel(displayDish, kcalLabel))) && (
                    <div className="flex flex-wrap gap-3 text-xs font-bold text-black mb-3">
                      {getHungerLevel(displayDish, lang) && (
                        <span className="inline-flex items-center gap-1 bg-gray-100 border border-gray-300 rounded-full px-2 py-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                          {getHungerLevel(displayDish, lang)}
                        </span>
                      )}
                      {showCaloriesClient && getCaloriesLabel(displayDish, kcalLabel) && (
                        <span className="inline-flex items-center gap-1 bg-gray-100 border border-gray-300 rounded-full px-2 py-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
                          {getCaloriesLabel(displayDish, kcalLabel)}
                        </span>
                      )}
                    </div>
                  )
                );
              })()}
              {getVisibleDishAllergenLabels(selectedDish).length > 0 && (
                <div className="mb-3">
                  <label className="font-bold text-black mb-1 block">{uiText.allergensLabel} :</label>
                  <div className="flex flex-wrap gap-2">
                    {getVisibleDishAllergenLabels(selectedDish).map((a, i) => (
                      <span
                        key={`${a}-${i}`}
                        className={`px-2 py-1 rounded font-bold text-xs border-2 ${
                          darkMode ? "bg-transparent border-yellow-400 text-yellow-300" : "bg-yellow-200 border-black text-black"
                        }`}
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {isInteractionDisabled ? (
                <div className="mb-3 rounded-lg border-2 border-black bg-gray-100 px-3 py-2 text-sm font-bold text-black">
                  {consultationModeBannerText}
                </div>
              ) : null}

            {(selectedDish.has_sides || modalSidesOptions.length > 0) && (
              <div className="mb-3">
                <span className="font-bold text-black">{uiText.sidesLabel} :</span>
                {getSideMaxOptions(selectedDish) > 1 && (
                  <div className="text-sm text-black/70 mt-1">
                    {(isIceCreamDish(selectedDish) ? tt("select_sides_up_to_icecream") : tt("select_sides_up_to")).replace(
                      "{max}",
                      String(getSideMaxOptions(selectedDish))
                    )}
                  </div>
                )}
                {modalSidesOptions.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2">
                    {modalSidesOptions.map((side) => {
                      const maxOptions = getSideMaxOptions(selectedDish);
                      const checked = selectedSides.includes(side);
                      const limitReached = selectedSides.length >= maxOptions && !checked;
                      if (maxOptions === 1) {
                        return (
                          <label key={side} className="flex items-center gap-2 text-black font-bold">
                            <input
                              type="radio"
                              name="side"
                              checked={checked}
                              onChange={() => setSelectedSides([side])}
                            />
                            {side}
                          </label>
                        );
                      }
                      return (
                        <label key={side} className={`flex items-center gap-2 font-bold ${limitReached ? "text-gray-400" : "text-black"}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={limitReached}
                            onChange={(e) => {
                              const max = Math.max(1, Number(selectedDish.max_options || 1));
                              if (e.target.checked) {
                                if (selectedSides.length >= max) {
                                  alert(tt("max_options_error").replace("{max}", String(max)));
                                  return;
                                }
                                setSelectedSides((prev) => [...prev, side]);
                              } else {
                                setSelectedSides((prev) => prev.filter((s) => s !== side));
                              }
                            }}
                          />
                          {side}
                        </label>
                      );
                    })}
                  </div>
                )}
                {modalSidesOptions.length === 0 && (
                  <div className="mt-2 text-sm font-bold text-red-600">
                    {tt("no_side_configured")}
                  </div>
                )}
              </div>
            )}

            {modalProductOptions.length > 0 && (
              <div className="mb-3">
                <label className="font-bold text-black mb-1 block">{optionVariantsLabel} :</label>
                <div className="flex flex-col gap-2">
                  {modalProductOptions.map((option, optionIndex) => {
                    const optionId = String(option.id || `option-${optionIndex}`);
                    const allowMultiSelect = Boolean(selectedDish?.allow_multi_select);
                    const checked = selectedProductOptionIds.includes(optionId);
                    const optionPrice = parseAddonPrice(option.price_override);
                    const optionLabel = getProductOptionLabel(option, lang);
                    return (
                      <label key={optionId} className="flex items-center gap-2 text-black font-bold">
                        <input
                          type={allowMultiSelect ? "checkbox" : "radio"}
                          name={allowMultiSelect ? undefined : "product-option"}
                          checked={checked}
                          onChange={(event) => {
                            if (allowMultiSelect) {
                              setSelectedProductOptionIds((prev) =>
                                event.target.checked ? [...prev, optionId] : prev.filter((id) => id !== optionId)
                              );
                              return;
                            }
                            setSelectedProductOptionIds(event.target.checked ? [optionId] : []);
                          }}
                        />
                        <span>
                          {optionLabel}
                          {optionPrice > 0 ? ` (+ ${optionPrice.toFixed(2)} \u20AC)` : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {modalExtrasOptions.length > 0 && (
              <div className="mb-3">
                <label className="font-bold text-black mb-1 block">{uiText.extrasLabel} :</label>
                <div className="flex flex-col gap-2">
                  {modalExtrasOptions.map((extra) => {
                    const extraKey = `${extra.name_fr}-${parsePriceNumber(extra.price)}`;
                    const extraPriceAmount = parsePriceNumber(extra.price);
                    const checked = selectedExtras.some(
                      (e) => `${e.name_fr}-${parsePriceNumber(e.price)}` === extraKey
                    );
                    return (
                      <label key={extraKey} className="flex items-center gap-2 text-black font-bold">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedExtras([...selectedExtras, extra]);
                            } else {
                              setSelectedExtras(
                                selectedExtras.filter(
                                  (x) => `${x.name_fr}-${parsePriceNumber(x.price)}` !== extraKey
                                )
                              );
                            }
                          }}
                        />
                        {uiText.extraLabel}: {getExtraLabel(extra, lang)}
                        {extraPriceAmount > 0 ? (
                          <> (+{extraPriceAmount.toFixed(2)} <Euro size={14} className="inline-block" />)</>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {modalAskCooking && (
              <div className="mb-3">
                <label className="font-bold text-black mb-1 block">{uiText.cookingLabel} :</label>
                <div className="flex flex-col gap-2">
                  {[
                    uiText.cooking.blue,
                    uiText.cooking.rare,
                    uiText.cooking.medium,
                    uiText.cooking.wellDone,
                  ].map((cooking) => (
                    <label key={cooking} className="flex items-center gap-2 text-black font-bold">
                      <input
                        type="radio"
                        name="cooking"
                        checked={selectedCooking === cooking}
                        onChange={() => setSelectedCooking(cooking)}
                      />
                      {cooking}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {!isInteractionDisabled && (
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-black">{uiText.quantity}:</span>
                <button
                  onClick={() => setDishModalQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1 border-2 border-black rounded bg-white text-black font-black"
                >
                  -
                </button>
                <span className="font-black text-lg text-black">{dishModalQuantity}</span>
                <button
                  onClick={() => setDishModalQuantity((q) => q + 1)}
                  className="px-3 py-1 border-2 border-black rounded bg-white text-black font-black"
                >
                  +
                </button>
              </div>
            )}

            {!isInteractionDisabled && (
              <>
                <div className="mb-3">
                  <label className="font-bold text-black mb-1 block">{uiText.specialRequestLabel} :</label>
                  <textarea
                    value={specialRequest}
                    onChange={(e) => setSpecialRequest(e.target.value)}
                    dir={isRtl ? "rtl" : "ltr"}
                    className={`w-full px-3 py-2 bg-white text-black border border-gray-300 ${isRtl ? "text-right" : "text-left"}`}
                    style={{ textAlign: isRtl ? "right" : "left" }}
                    rows={2}
                    placeholder={uiText.specialRequestPlaceholder}
                  />
                </div>
                <div className="text-sm font-bold text-black mb-2">
                  {itemTotalLabel}: {modalTotalPrice.toFixed(2)}&euro;
                </div>

                {sideError && (
                  <div className="text-sm font-bold text-red-600 mb-2">
                    {sideError}
                  </div>
                )}
                {modalInstructionPreview && (
                  <div className="text-sm font-bold text-black mb-2">
                    {modalInstructionPreview}
                  </div>
                )}
              </>
            )}
            </div>
            {!isInteractionDisabled && (
              <div className={`shrink-0 border-t-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] ${darkMode ? "border-[#d99a2b] bg-black" : "border-black bg-white"}`}>
                <button
                  disabled={
                    (((!!selectedDish?.has_sides) || modalSidesOptions.length > 0) && selectedSides.length === 0) ||
                    (modalAskCooking && !selectedCooking)
                  }
                  className={`w-full py-3 rounded-xl font-black border-4 disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode ? "bg-[#d99a2b] text-black border-[#d99a2b]" : "bg-black text-white border-black"
                  }`}
                  onClick={() => {
                    if ((selectedDish.has_sides || modalSidesOptions.length > 0) && selectedSides.length === 0) {
                      setSideError(tt("side_required_error"));
                      return;
                    }
                    if (modalAskCooking && !selectedCooking) {
                      setSideError(tt("cooking_required_error"));
                      return;
                    }

                    addToCart({
                      dish: selectedDish,
                      quantity: dishModalQuantity,
                      selectedSides: selectedSides,
                      selectedSideIds: selectedSides
                        .map((sideLabel) => sideIdByAlias.get(normalizeLookupText(sideLabel)) || "")
                        .filter(Boolean),
                      selectedExtras: selectedExtras,
                      selectedProductOptions: modalSelectedProductOptions,
                      selectedProductOption: modalSelectedProductOption,
                      selectedCooking: selectedCooking,
                      specialRequest,
                      fromRecommendation: String(selectedDish.id || "") === recommendationSourceDishId,
                    });
                    setSelectedDish(null);
                    setModalProductOptions([]);
                    setSelectedProductOptionIds([]);
                    setRecommendationSourceDishId("");
                    setSideError("");
                  }}
                >
                  {uiText.addToCart} ({modalTotalPrice.toFixed(2)}&euro;)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {serverCallMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-black/90 text-white border border-white/20 px-4 py-2 rounded-full font-bold text-sm z-50 shadow-lg backdrop-blur-sm">
          {serverCallMsg}
        </div>
      )}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full font-bold z-50 animate-pulse">
          {toastMessage}
        </div>
      )}

      {isCartOpen && !isInteractionDisabled && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
          <div className="w-full h-[100dvh] min-h-[100dvh] bg-white flex flex-col">
          <div className="p-4 border-b-4 border-black relative shrink-0">
            <button
              type="button"
              aria-label={uiText.close}
              title={uiText.close}
              className="absolute top-4 right-4 w-10 h-10 bg-white text-black rounded-full font-bold flex items-center justify-center border-4 border-black"
              onClick={() => {
                setIsCartOpen(false);
                setOrderSuccess(false);
              }}
            >
              <XCircle size={20} className="text-red-500" />
            </button>
            <h2 className="text-2xl font-black text-black text-center">
              {uiText.cart}
            </h2>
          </div>
          <div className="flex-1 min-h-0 px-4 py-4 flex flex-col">
            {orderSuccess ? (
              <div className="flex-1 flex items-center justify-center text-center">
                <div className="bg-white border-4 border-black rounded-2xl px-6 py-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-black max-w-xs w-full">
                  <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-green-200 border-4 border-black flex items-center justify-center text-2xl"><CheckCircle2 size={24} className="text-green-700" /></div>
                  <div className="text-lg font-black">{tt("order_success")}</div>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {cart.length === 0 ? (
                    <div className="text-black text-center py-4">{uiText.emptyCart}</div>
                  ) : (
                    <div className="flex flex-col gap-4 mb-4">
                      {cart.map((item, idx) => {
                        const instructions = buildInstructionText(
                          lang,
                          item.selectedSides,
                          item.selectedExtras,
                          item.selectedProductOptions,
                          item.selectedProductOption,
                          item.selectedCooking,
                          item.specialRequest,
                          uiText
                        );
                        const extrasPrice = (item.selectedExtras || []).reduce(
                          (sum, extra) => sum + parsePriceNumber(extra.price),
                          0
                        );
                        const payableExtrasPrice = isFormulaCartItem(item) ? 0 : extrasPrice;
                        const itemUnitPrice = getCartItemUnitPrice(item);
                        return (
                          <div
                            key={idx}
                            className="bg-white border-2 border-black rounded-xl p-4 flex flex-col text-black"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <h3 className="text-lg font-bold">{getDishName(item.dish, lang)}</h3>
                              <button
                                onClick={() => removeFromCart(idx)}
                                className="text-red-500 hover:text-red-700 transition-colors"
                              ><XCircle size={18} className="text-red-500" /></button>
                            </div>
                            <p className="text-sm mb-2">{getDescription(item.dish, lang)}</p>
                            {item.formulaSelections && item.formulaSelections.length > 0 ? (
                              <div className="text-sm text-black/80 mb-2">
                                <div className="font-bold">{formulaUi.label}</div>
                                <div className="mt-1 space-y-1">
                                  {item.formulaSelections.map((selection, selectionIndex) => (
                                    <div key={`${selection.categoryId}-${selection.dishId}-${selectionIndex}`}>
                                      {selection.categoryLabel
                                        ? `${selection.categoryLabel} : ${selection.dishName}`
                                        : selection.dishName}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            <p className="text-sm font-bold text-black">
                              {instructions || `${tt("details_label")}: ${tt("details_none")}`}
                            </p>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-xl font-black inline-flex items-center gap-1">{(itemUnitPrice + payableExtrasPrice).toFixed(2)}<Euro size={16} /></span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    if (item.quantity > 1) {
                                      setCart((prev) =>
                                        prev.map((c, i) =>
                                          i === idx ? { ...c, quantity: c.quantity - 1 } : c
                                        )
                                      );
                                    } else {
                                      removeFromCart(idx);
                                    }
                                  }}
                                  className="px-3 py-1 border-2 border-black rounded bg-white text-black font-black"
                                >
                                  -
                                </button>
                                <span className="font-black text-lg text-black">{item.quantity}</span>
                                <button
                                  onClick={() =>
                                    setCart((prev) =>
                                      prev.map((c, i) =>
                                        i === idx ? { ...c, quantity: c.quantity + 1 } : c
                                      )
                                    )
                                  }
                                  className="px-3 py-1 border-2 border-black rounded bg-white text-black font-black"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="mt-auto sticky bottom-0 bg-white pt-4 pb-2 shadow-[0_-10px_20px_rgba(255,255,255,0.8)]">
                  <div className="flex justify-between font-bold text-black mb-3 px-4">
                    <span>{uiText.total}:</span>
                    <span>
                      {cart
                        .reduce((sum, item) => {
                          const extrasPrice = (item.selectedExtras || []).reduce(
                            (acc, extra) => acc + parsePriceNumber(extra.price),
                            0
                          );
                          const payableExtrasPrice = isFormulaCartItem(item) ? 0 : extrasPrice;
                          return (
                            sum +
                            (getCartItemUnitPrice(item) +
                              payableExtrasPrice) *
                              item.quantity
                          );
                        }, 0)
                        .toFixed(2)} <Euro size={16} className="inline-block align-text-bottom" />
                    </span>
                  </div>
                  <div className="px-4 pb-2">
                    <button
                      className="w-full py-3 bg-black text-white rounded-xl font-black border-4 border-black disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleSubmitOrder}
                      disabled={!tableNumber}
                    >
                      {uiText.order}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      )}

      {socialFooterEntries.length > 0 && (
        <div
          className={`menu-surface-shell mt-3 border-t-4 ${darkMode ? "border-[#d99a2b] text-white" : "border-black text-black"} px-4 py-5 text-center`}
          style={!darkMode ? { backgroundColor: "transparent" } : undefined}
        >
          <div className={`font-black text-lg ${darkMode ? "text-white" : "text-black"}`}>{footerThankYouLabel}</div>
          <div className={`mt-1 text-sm font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>{footerFollowUsLabel}</div>
          <div className={`mt-2 text-sm ${darkMode ? "text-gray-300" : "text-gray-700"} max-w-2xl mx-auto`}>
            {footerPhotoShareLabel}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            {socialFooterEntries.map((entry) => (
              <a
                key={`footer-social-${entry.key}`}
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center w-12 h-12 rounded-full border-2 ${darkMode ? "border-white/30 bg-black" : "border-black bg-white"} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}
                title={entry.label}
                aria-label={entry.label}
              >
                {entry.key === "website" ? (
                  <Globe className={`h-5 w-5 ${darkMode ? "text-white" : "text-blue-600"}`} />
                ) : (
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: entry.iconBg }}
                  >
                    <img src={entry.iconUrl} alt="" aria-hidden="true" className="w-4 h-4 object-contain" onError={hideBrokenImage} />
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

    </div>
    </>
  );
}










