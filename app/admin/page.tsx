"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import { getCookingLabelFr, normalizeCookingKey } from "../lib/ui-translations";
import { Check, Euro, X } from "lucide-react";

export const dynamic = "force-dynamic";

const MAX_TOTAL_TABLES = 200;
const COOKING_CHOICES = ["Bleu", "Saignant", "A point", "Bien cuit"];

function toCookingKeyFromLabel(label: string) {
  const normalized = String(label || \"\")
    .normalize(\"NFD\")
.replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (normalized === \"bleu\") return \"rare\";
  if (normalized === \"saignant\") return \"medium_rare\";
  if (normalized === \"a point\" || normalized === \"a point\") return \"medium\";
  if (normalized === \"bien cuit\") return \"well_done\";
  return \"\";
}

const CLIENT_ORDERING_DISABLED_KEY = \"menuqr_disable_client_ordering_tmp\";
const FORMULAS_CATEGORY_KEY = \"__formulas__\";
const FORMULA_DIRECT_SEND_SEQUENCE = 4;

function readLocalClientOrderingDisabled() {
  if (typeof window === \"undefined\") return false;
  return window.localStorage.getItem(CLIENT_ORDERING_DISABLED_KEY) === \"1\";
}

function resolveClientOrderingDisabled(row: Record<string, unknown>) {
  if (typeof row.is_active === \"boolean\") return !row.is_active;
  const status = String(row.status || \"\").trim().toLowerCase();
  if (status === \"consultation\" || status === \"menu_only\" || status === \"disabled\") return true;
  return readLocalClientOrderingDisabled();
}

function parseJsonObject(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === \"string\") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === \"object\" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === \"object\") return raw as Record<string, unknown>;
  return null;
}

function parsePriceNumber(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === \"number\") return Number.isFinite(raw) ? Number(raw.toFixed(2)) : 0;
  const text = String(raw).trim();
  if (!text) return 0;
const cleaned = text.replace(/\s+/g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === \"-\" || cleaned === \".\") return 0;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function resolveTotalTables(value: unknown): number | null {
  const readNumber = (entry: unknown): number | null => {
    const numeric = Number(entry);
    if (!Number.isFinite(numeric)) return null;
    const whole = Math.trunc(numeric);
    return whole > 0 ? whole : null;
  };

  const walk = (entry: unknown, depth = 0): number | null => {
    if (depth > 3 || entry == null) return null;
    const direct = readNumber(entry);
    if (direct != null) return direct;
    const source = parseJsonObject(entry);
    if (!source) return null;
    return (
      readNumber(source.table_count) ??
      walk(source.table_config, depth + 1) ??
      walk(source.settings, depth + 1) ??
      walk(source.marketing_options, depth + 1)
    );
  };

  const resolved = walk(value);
  if (resolved == null) return null;
  return Math.min(MAX_TOTAL_TABLES, Math.max(1, resolved));
}

const FAST_ORDER_I18N = {
  fr: {
    tableInvalid: \"Numéro de table invalide.\",
    addItem: \"Ajoutez au moins un article.\",
    noValidItem: \"Aucun article valide à envoyer.\",
    sendError: \"Erreur lors de l'envoi.\",
    sent: \"Commande envoyée en cuisine.\",
  },
  en: {
    tableInvalid: \"Invalid table number.\",
    addItem: \"Add at least one item.\",
    noValidItem: \"No valid item to send.\",
    sendError: \"Error while sending the order.\",
    sent: \"Order sent to kitchen.\",
  },
  es: {
    tableInvalid: \"Número de mesa inválido.\",
    addItem: \"Añada al menos un artículo.\",
    noValidItem: \"Ningún artículo válido para enviar.\",
    sendNameError: \"Error al enviar el pedido.\",
    sent: \"Pedido enviado a cocina.\",
  },
  de: {
    tableInvalid: \"Ungültige Tischnummer.\",
    addItem: \"Fügen Sie mindestens einen Artikel hinzu.\",
    noValidItem: \"Kein gültiger Artikel zum Senden.\",
    sendError: \"Fehler beim Senden der Bestellung.\",
    sent: \"Bestellung an die Küche gesendet.\",
  },
} as const;

type Item = {
  id?: string | number;
  dish_id?: string | number;
  destination?: string | null;
  name?: string;
  name_fr?: string;
  label?: string;
  product_name?: string;
  productName?: string;
  dish_name?: string;
  dishName?: string;
  product?: { name?: string; name_fr?: string; label?: string | null };
  dish?: { name?: string; name_fr?: string } | null;
  quantity?: number;
  category?: string;
  categorie?: string;
  instructions?: string;
  price?: number;
  cooking?: string | null;
  cuisson?: string | null;
  side?: unknown;
  accompagnement?: string | null;
  accompagnements?: string | null;
  side_dish?: string | null;
  sideDish?: string | null;
  selected_options?: unknown;
  selected_option?: unknown;
  selected_option_id?: string | number | null;
  selected_option_name?: string | null;
  selected_option_price?: number | null;
  selectedOptions?: unknown;
  options?: unknown;
  supplement?: unknown;
  supplements?: unknown;
  selected_side_ids?: string[];
  selected_extra_ids?: string[];
  selected_extras?: Array<{ id: string; label_fr: string; price: number }>;
  selected_cooking_key?: string | null;
  selected_cooking_label_fr?: string | null;
  is_formula?: boolean | null;
  formula_id?: string | number | null;
  special_request?: string;
  selectedSides?: string[];
  selectedExtras?: Array<{ name: string; price: number }>;
  is_drink?: boolean;
  from_recommendation?: boolean;
  created_at?: string | null;
  added_at?: string | null;
  inserted_at?: string | null;
  updated_at?: string | null;
  timestamp?: string | null;
  status?: string | null;
};

type Order = {
  id: string;
  table_number: number;
  items: unknown;
  status: string;
  created_at: string;
  service_step?: string | null;
  current_step?: number | null;
  covers?: number | null;
  guest_count?: number | null;
  customer_count?: number | null;
};

type ServiceNotification = {
  id: string;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  status?: string | null;
  table_number?: string | number | null;
  restaurant_id?: string | number | null;
  created_at?: string | null;
};

