
// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import UnifiedDishCardLayout from "../../components/UnifiedDishCardLayout";
import { CARD_HEIGHT, CARD_WIDTH } from "../../lib/card-layout-constants";
import { supabase } from "../../lib/supabase";

type DishOption = {
  id?: string | number | null;
  name?: string | null;
  name_fr?: string | null;
  description?: string | null;
  description_fr?: string | null;
  image_url?: string | null;
  price?: number | string | null;
  formula_price?: number | string | null;
  calories?: number | string | null;
  calories_min?: number | string | null;
  hunger_level?: string | null;
  hunger_levels?: Record<string, unknown> | string | null;
  is_formula?: boolean | null;
};
type SaveMeta = { scope: "global" | "dish"; dishId?: string };
type CardDesignerProps = {
  restaurantId?: string | number | null;
  initialConfig?: unknown;
  dishes?: DishOption[];
  onSaved?: (config: Record<string, unknown>, meta?: SaveMeta) => void;
};

type Pos = { x: number; y: number };
type Size = { width: number; height: number };
type BorderStyleOption = "solid" | "dashed" | "dotted" | "double";
type BackgroundFillMode = "solid" | "vertical" | "horizontal";
type TextShadowPreset = "none" | "light" | "strong" | "glow";
type ElementStyle = {
  color: string;
  fontSize: number;
  fontWeight: string;
  fontFamily: string;
  opacity: number;
  zIndex: number;
  textAlign: "left" | "center" | "right";
  borderRadius: number;
  letterSpacing: number;
  lineHeight: number;
  textShadow: string;
  glassmorphism: boolean;
  backdropBlur: number;
  borderWidth: number;
  borderStyle: BorderStyleOption;
  borderColor: string;
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
  borderBottomRightRadius: number;
  borderBottomLeftRadius: number;
  backgroundColor: string | null;
  backgroundGradient: string | null;
  objectFit: "cover" | "contain" | "fill";
  brightness: number;
  contrast: number;
};
type ElementConfig = { visible: boolean; locked: boolean; position: Pos; size: Size; style: ElementStyle };
type DecorationConfig = { id: string; src: string; visible: boolean; locked: boolean; position: Pos; size: Size; opacity: number; zIndex: number; borderRadius: number };
type ElementKey = "image" | "name" | "price" | "description" | "badges" | "addToCartButton" | "viewDetailsButton";
type DesignerConfig = {
  version: 2;
  layoutToken: "default" | "overlay" | "bicolor";
  canvas: { width: number; height: number };
  globalStyle: {
    backgroundColor: string;
    backgroundGradient: string | null;
    backgroundImage: string | null;
    borderRadius: number;
    shadowPreset: "none" | "soft" | "strong" | "glass";
    opacity: number;
    borderWidth: number;
    borderStyle: BorderStyleOption;
    borderColor: string;
    overlayTextGradient: string | null;
    overlayTextGradientHeight: number;
  };
  elements: Record<ElementKey, ElementConfig>;
  decorations: DecorationConfig[];
};
type Selection = { kind: "element"; key: ElementKey } | { kind: "deco"; id: string };
type SavedLayoutItem = { id: string; name: string; config: DesignerConfig; createdAt?: string };
type LoadSavedLayoutsOptions = { silent?: boolean };

const ELEMENT_KEYS: ElementKey[] = ["image", "name", "price", "description", "badges", "addToCartButton", "viewDetailsButton"];
const ELEMENT_LABELS: Record<ElementKey, string> = {
  image: "Image",
  name: "Nom",
  price: "Prix",
  description: "Description",
  badges: "Badges",
  addToCartButton: "Bouton Ajouter au panier",
  viewDetailsButton: "Bouton Voir détails",
};
const FONT_OPTIONS = ["Montserrat", "Roboto", "Playfair Display", "Lora", "Poppins", "Lato", "Raleway", "Nunito"];
const TEMPLATE_KEYS: Array<{ key: "default" | "overlay" | "bicolor"; label: string }> = [
  { key: "default", label: "Modèle Standard" },
  { key: "bicolor", label: "Modèle Bicolore" },
  { key: "overlay", label: "Modèle Overlay" },
];
const DEFAULT_COLOR_SUGGESTIONS = ["#0f172a", "#1d4ed8", "#e11d48", "#f59e0b", "#f8fafc"];
const SAVED_LAYOUT_PAYLOAD_COLUMN = "payload";
const SAVED_LAYOUT_CONFIG_COLUMN = "layout_config";

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const obj = (value: unknown): Record<string, unknown> => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" ? (value as Record<string, unknown>) : {};
};
const clamp = (v: unknown, fallback: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};
const hex = (v: unknown, fallback: string) => (/^#[0-9A-Fa-f]{6}$/.test(String(v || "").trim()) ? String(v).trim() : fallback);
const safeFont = (v: unknown, fallback = "Montserrat") => {
  const s = String(v || "").trim();
  return FONT_OPTIONS.includes(s) ? s : fallback;
};
const shadowCss = (preset: DesignerConfig["globalStyle"]["shadowPreset"]) =>
  preset === "soft"
    ? "0 18px 35px rgba(15,23,42,0.16)"
    : preset === "strong"
      ? "0 22px 48px rgba(15,23,42,0.32)"
      : preset === "glass"
        ? "0 18px 40px rgba(14,116,144,0.22), inset 0 1px 0 rgba(255,255,255,0.5)"
        : "none";
const normalizeBorderStyle = (value: unknown, fallback: BorderStyleOption = "solid"): BorderStyleOption => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "double") return "double";
  if (raw === "dashed") return "dashed";
  if (raw === "dotted") return "dotted";
  if (raw === "solid") return "solid";
  return fallback;
};
const buildBackgroundGradient = (mode: BackgroundFillMode, colorA: string, colorB: string) =>
  mode === "vertical"
    ? `linear-gradient(180deg, ${colorA} 0%, ${colorB} 100%)`
    : mode === "horizontal"
      ? `linear-gradient(90deg, ${colorA} 0%, ${colorB} 100%)`
      : null;
const parseBackgroundFill = (gradient: string | null, fallbackColor: string) => {
  const clean = String(gradient || "").trim().toLowerCase();
  if (!clean) return { mode: "solid" as BackgroundFillMode, colorA: fallbackColor, colorB: "#dbeafe" };
  const colors = String(gradient || "").match(/#[0-9a-fA-F]{6}/g) || [];
  const colorA = colors[0] || fallbackColor;
  const colorB = colors[1] || colorA;
  const mode: BackgroundFillMode =
    clean.includes("to right") || clean.includes("90deg") ? "horizontal" : "vertical";
  return { mode, colorA, colorB };
};
const TEXT_SHADOW_PRESET_VALUES: Record<TextShadowPreset, string> = {
  none: "",
  light: "0 1px 3px rgba(0,0,0,0.35)",
  strong: "0 3px 8px rgba(0,0,0,0.55)",
  glow: "0 0 12px rgba(255,255,255,0.8)",
};
const getTextShadowPreset = (value: unknown): TextShadowPreset => {
  const clean = String(value || "").trim();
  if (!clean) return "none";
  if (clean === TEXT_SHADOW_PRESET_VALUES.light) return "light";
  if (clean === TEXT_SHADOW_PRESET_VALUES.strong) return "strong";
  if (clean === TEXT_SHADOW_PRESET_VALUES.glow) return "glow";
  const lower = clean.toLowerCase();
  if (lower.includes("0 0") || lower.includes("glow")) return "glow";
  if (lower.includes("0 3px") || lower.includes("0 4px")) return "strong";
  return "light";
};
const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0"))
    .join("")}`;
const extractSuggestedColors = async (imageSrc: string, maxColors = 5) => {
  if (typeof window === "undefined" || !String(imageSrc || "").trim()) {
    return DEFAULT_COLOR_SUGGESTIONS.slice(0, maxColors);
  }
  return new Promise<string[]>((resolve) => {
    const fallback = DEFAULT_COLOR_SUGGESTIONS.slice(0, maxColors);
    const image = new Image();
    image.decoding = "async";
    if (!String(imageSrc || "").startsWith("data:")) image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const side = 48;
        canvas.width = side;
        canvas.height = side;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(fallback);
          return;
        }
        ctx.drawImage(image, 0, 0, side, side);
        const pixels = ctx.getImageData(0, 0, side, side).data;
        const buckets = new Map<string, { r: number; g: number; b: number; count: number; saturation: number }>();
        for (let i = 0; i < pixels.length; i += 16) {
          const alpha = pixels[i + 3];
          if (alpha < 90) continue;
          const r = Math.round(pixels[i] / 32) * 32;
          const g = Math.round(pixels[i + 1] / 32) * 32;
          const b = Math.round(pixels[i + 2] / 32) * 32;
          const key = `${r},${g},${b}`;
          const saturation = Math.max(r, g, b) - Math.min(r, g, b);
          const current = buckets.get(key);
          if (current) {
            current.count += 1;
          } else {
            buckets.set(key, { r, g, b, count: 1, saturation });
          }
        }
        const palette = Array.from(buckets.values())
          .sort((a, b) => b.count - a.count || b.saturation - a.saturation)
          .map((entry) => rgbToHex(entry.r, entry.g, entry.b))
          .filter((color, index, arr) => arr.indexOf(color) === index)
          .slice(0, maxColors);
        resolve(palette.length ? palette : fallback);
      } catch {
        resolve(fallback);
      }
    };
    image.onerror = () => resolve(fallback);
    image.src = imageSrc;
  });
};
const isMissingColumnError = (error: unknown, col: string) => {
  const code = String((error as any)?.code || "").trim();
  const message = String((error as any)?.message || "").toLowerCase();
  return code === "42703" || (message.includes("column") && message.includes(col.toLowerCase()));
};
const isMissingTableError = (error: unknown, table: string) => {
  const code = String((error as any)?.code || "").trim();
  const message = String((error as any)?.message || "").toLowerCase();
  return code === "42P01" || (message.includes("relation") && message.includes(table.toLowerCase()));
};
const isSchemaCacheError = (error: unknown, table?: string, col?: string) => {
  const code = String((error as any)?.code || "").trim().toUpperCase();
  const message = String((error as any)?.message || "").toLowerCase();
  if (!message.includes("schema cache")) return false;
  if (table && !message.includes(String(table).toLowerCase())) return false;
  if (col && !message.includes(String(col).toLowerCase())) return false;
  return code.startsWith("PGRST") || message.includes("could not find");
};
const extractSchemaCacheColumn = (error: unknown) => {
  const message = String((error as any)?.message || "");
  const quoted = message.match(/'([^']+)'/g);
  if (!quoted || quoted.length === 0) return "";
  const first = String(quoted[0] || "").replace(/'/g, "").trim();
  return first;
};
const asNumber = (value: unknown, fallback = 0) => {
  const normalized = typeof value === "string" ? value.replace(",", ".") : value;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : fallback;
};
const hasLayout = (raw: unknown) => {
  const source = obj(raw);
  return Object.keys(source).length > 0 && Boolean(source.elements || source.globalStyle || source.layout_token || source.layoutToken || source.decorations);
};
const parseHungerLevels = (value: unknown) => {
  const raw = obj(value);
  const fallback = String(value || "").trim().toLowerCase();
  const fallbackSmall = fallback === "small" || fallback === "petite" || fallback === "petite_faim";
  const fallbackMedium = fallback === "medium" || fallback === "moyenne" || fallback === "moyenne_faim";
  const fallbackLarge = fallback === "large" || fallback === "grande" || fallback === "grande_faim";
  return {
    small: Boolean(raw.small ?? raw.petite ?? raw["petite_faim"] ?? fallbackSmall),
    medium: Boolean(raw.medium ?? raw.moyenne ?? raw["moyenne_faim"] ?? fallbackMedium),
    large: Boolean(raw.large ?? raw.grande ?? raw["grande_faim"] ?? fallbackLarge),
  };
};
const withLockedTemplate = (config: DesignerConfig): DesignerConfig => ({
  ...config,
  elements: {
    image: { ...config.elements.image, locked: true },
    name: { ...config.elements.name, locked: true },
    price: { ...config.elements.price, locked: true },
    description: { ...config.elements.description, locked: true },
    badges: { ...config.elements.badges, locked: true },
    addToCartButton: { ...config.elements.addToCartButton, locked: true },
    viewDetailsButton: { ...config.elements.viewDetailsButton, locked: true },
  },
  decorations: config.decorations.map((deco) => ({ ...deco, locked: true })),
});
const toCanvasX = (percent: number) => Math.round((CARD_WIDTH * percent) / 100);
const toCanvasY = (percent: number) => Math.round((CARD_HEIGHT * percent) / 100);
const SNAP_GRID = 4;
const SNAP_ALIGN_TOLERANCE = 6;
const PREVIEW_BASE_SCALE = 1.3;
const PREVIEW_IMAGE_SRC = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#6ee7b7" />
        <stop offset="52%" stop-color="#60a5fa" />
        <stop offset="100%" stop-color="#fda4af" />
      </linearGradient>
    </defs>
    <rect width="720" height="960" fill="url(#g)" />
    <circle cx="130" cy="170" r="120" fill="rgba(255,255,255,0.25)" />
    <circle cx="560" cy="760" r="170" fill="rgba(15,23,42,0.22)" />
  </svg>`
)}`;

const defaultStyle = (s?: Partial<ElementStyle>): ElementStyle => ({
  color: "#111111",
  fontSize: 16,
  fontWeight: "700",
  fontFamily: "Montserrat",
  opacity: 1,
  zIndex: 10,
  textAlign: "left",
  borderRadius: 12,
  letterSpacing: 0,
  lineHeight: 1.25,
  textShadow: "",
  glassmorphism: false,
  backdropBlur: 10,
  borderWidth: 0,
  borderStyle: "solid",
  borderColor: "#111111",
  borderTopLeftRadius: 12,
  borderTopRightRadius: 12,
  borderBottomRightRadius: 12,
  borderBottomLeftRadius: 12,
  backgroundColor: null,
  backgroundGradient: null,
  objectFit: "cover",
  brightness: 1,
  contrast: 1,
  ...s,
});
const defaultElement = (position: Pos, size: Size, style?: Partial<ElementStyle>): ElementConfig => ({
  visible: true,
  locked: true,
  position,
  size,
  style: defaultStyle(style),
});

const DEFAULT_CONFIG: DesignerConfig = {
  version: 2,
  layoutToken: "default",
  canvas: { width: CARD_WIDTH, height: CARD_HEIGHT },
  globalStyle: {
    backgroundColor: "#ffffff",
    backgroundGradient: null,
    backgroundImage: null,
    borderRadius: 24,
    shadowPreset: "soft",
    opacity: 1,
    borderWidth: 0,
    borderStyle: "solid",
    borderColor: "#111111",
    overlayTextGradient: null,
    overlayTextGradientHeight: 220,
  },
  elements: {
    image: defaultElement({ x: 16, y: 16 }, { width: 300, height: 180 }, { zIndex: 3, borderRadius: 16 }),
    name: defaultElement({ x: 16, y: 216 }, { width: 220, height: 46 }, { fontSize: 28, fontWeight: "900", zIndex: 12 }),
    price: defaultElement({ x: 242, y: 220 }, { width: 90, height: 36 }, { fontSize: 22, fontWeight: "900", color: "#dc2626", zIndex: 13 }),
    description: defaultElement({ x: 16, y: 268 }, { width: 300, height: 78 }, { fontSize: 14, fontWeight: "500", color: "#475569", zIndex: 11 }),
    badges: defaultElement({ x: 16, y: 362 }, { width: 300, height: 48 }, { fontSize: 11, fontWeight: "800", zIndex: 14 }),
    addToCartButton: defaultElement({ x: 16, y: 394 }, { width: 156, height: 48 }, { fontSize: 15, fontWeight: "900", color: "#ffffff", zIndex: 15, borderRadius: 12 }),
    viewDetailsButton: defaultElement({ x: 184, y: 394 }, { width: 156, height: 48 }, { fontSize: 15, fontWeight: "900", color: "#111111", zIndex: 15, borderRadius: 12 }),
  },
  decorations: [],
};
const normalizeElement = (raw: unknown, fb: ElementConfig): ElementConfig => {
  const s = obj(raw);
  const p = obj(s.position);
  const z = obj(s.size);
  const st = obj(s.style);
  return {
    visible: s.visible == null ? fb.visible : Boolean(s.visible),
    locked: s.locked == null ? fb.locked : Boolean(s.locked),
    position: { x: clamp(p.x, fb.position.x, 0, 9999), y: clamp(p.y, fb.position.y, 0, 9999) },
    size: { width: clamp(z.width, fb.size.width, 24, 1500), height: clamp(z.height, fb.size.height, 24, 1500) },
    style: {
      color: hex(st.color, fb.style.color),
      fontSize: clamp(st.fontSize, fb.style.fontSize, 8, 120),
      fontWeight: String(st.fontWeight || fb.style.fontWeight),
      fontFamily: safeFont(st.fontFamily, fb.style.fontFamily),
      opacity: clamp(st.opacity, fb.style.opacity, 0.1, 1),
      zIndex: Math.trunc(clamp(st.zIndex, fb.style.zIndex, 0, 100)),
      textAlign: String(st.textAlign || fb.style.textAlign).trim().toLowerCase() === "center" ? "center" : String(st.textAlign || fb.style.textAlign).trim().toLowerCase() === "right" ? "right" : "left",
      borderRadius: clamp(st.borderRadius, fb.style.borderRadius, 0, 80),
      letterSpacing: clamp(st.letterSpacing, fb.style.letterSpacing, -2, 20),
      lineHeight: clamp(st.lineHeight, fb.style.lineHeight, 0.8, 2.4),
      textShadow: String(st.textShadow || fb.style.textShadow || "").trim(),
      glassmorphism: st.glassmorphism == null ? fb.style.glassmorphism : Boolean(st.glassmorphism),
      backdropBlur: clamp(st.backdropBlur, fb.style.backdropBlur, 0, 30),
      borderWidth: clamp(st.borderWidth, fb.style.borderWidth, 0, 12),
      borderStyle: normalizeBorderStyle(st.borderStyle, normalizeBorderStyle(fb.style.borderStyle)),
      borderColor: hex(st.borderColor, fb.style.borderColor),
      borderTopLeftRadius: clamp(st.borderTopLeftRadius, fb.style.borderTopLeftRadius ?? fb.style.borderRadius, 0, 120),
      borderTopRightRadius: clamp(st.borderTopRightRadius, fb.style.borderTopRightRadius ?? fb.style.borderRadius, 0, 120),
      borderBottomRightRadius: clamp(st.borderBottomRightRadius, fb.style.borderBottomRightRadius ?? fb.style.borderRadius, 0, 120),
      borderBottomLeftRadius: clamp(st.borderBottomLeftRadius, fb.style.borderBottomLeftRadius ?? fb.style.borderRadius, 0, 120),
      backgroundColor:
        st.backgroundColor == null || String(st.backgroundColor).trim() === ""
          ? fb.style.backgroundColor
          : /^#[0-9A-Fa-f]{6}$/.test(String(st.backgroundColor).trim())
            ? String(st.backgroundColor).trim()
            : fb.style.backgroundColor,
      backgroundGradient: String(st.backgroundGradient || "").trim() || fb.style.backgroundGradient || null,
      objectFit:
        String(st.objectFit || fb.style.objectFit).trim().toLowerCase() === "contain"
          ? "contain"
          : String(st.objectFit || fb.style.objectFit).trim().toLowerCase() === "fill"
            ? "fill"
            : "cover",
      brightness: clamp(st.brightness, fb.style.brightness, 0.3, 1.8),
      contrast: clamp(st.contrast, fb.style.contrast, 0.3, 1.8),
    },
  };
};

const normalizeConfig = (raw: unknown): DesignerConfig => {
  const source = obj(raw);
  const rawVersion = Number(source.version ?? source.schemaVersion ?? source.layoutVersion ?? 0);
  const normalizedVersion = Number.isFinite(rawVersion) ? rawVersion : 0;
  const canvas = obj(source.canvas);
  const globalNode = obj(source.globalStyle);
  const elements = obj(source.elements);
  const token = String(source.layoutToken || source.layout_token || "").trim().toLowerCase();
  const layoutToken: DesignerConfig["layoutToken"] = token === "overlay" || token === "bicolor" || token === "default" ? (token as any) : "default";
  const shadowRaw = String(globalNode.shadowPreset || source.shadowPreset || "").trim().toLowerCase();
  const shadowPreset: DesignerConfig["globalStyle"]["shadowPreset"] = shadowRaw === "soft" || shadowRaw === "strong" || shadowRaw === "glass" || shadowRaw === "none" ? (shadowRaw as any) : "soft";
  const normalized: DesignerConfig = {
    version: 2,
    layoutToken,
    canvas: { width: clamp(canvas.width, DEFAULT_CONFIG.canvas.width, 240, 900), height: clamp(canvas.height, DEFAULT_CONFIG.canvas.height, 280, 1400) },
    globalStyle: {
      backgroundColor: hex(globalNode.backgroundColor ?? source.cardBackgroundColor, DEFAULT_CONFIG.globalStyle.backgroundColor),
      backgroundGradient: String(globalNode.backgroundGradient ?? source.cardBackgroundGradient ?? "").trim() || null,
      backgroundImage: String(globalNode.backgroundImage ?? source.cardBackgroundImage ?? "").trim() || null,
      borderRadius: clamp(globalNode.borderRadius ?? source.borderRadius, DEFAULT_CONFIG.globalStyle.borderRadius, 0, 60),
      shadowPreset,
      opacity: clamp(globalNode.opacity ?? source.opacity, DEFAULT_CONFIG.globalStyle.opacity, 0.2, 1),
      borderWidth: clamp(globalNode.borderWidth ?? source.borderWidth, DEFAULT_CONFIG.globalStyle.borderWidth, 0, 12),
      borderStyle: normalizeBorderStyle(
        globalNode.borderStyle ?? source.borderStyle,
        normalizeBorderStyle(DEFAULT_CONFIG.globalStyle.borderStyle)
      ),
      borderColor: hex(globalNode.borderColor ?? source.borderColor, DEFAULT_CONFIG.globalStyle.borderColor),
      overlayTextGradient: String(globalNode.overlayTextGradient ?? source.overlayTextGradient ?? "").trim() || null,
      overlayTextGradientHeight: clamp(
        globalNode.overlayTextGradientHeight ?? source.overlayTextGradientHeight,
        DEFAULT_CONFIG.globalStyle.overlayTextGradientHeight,
        80,
        420
      ),
    },
    elements: {
      image: normalizeElement(elements.image, DEFAULT_CONFIG.elements.image),
      name: normalizeElement(elements.name, DEFAULT_CONFIG.elements.name),
      price: normalizeElement(elements.price, DEFAULT_CONFIG.elements.price),
      description: normalizeElement(elements.description, DEFAULT_CONFIG.elements.description),
      badges: normalizeElement(elements.badges, DEFAULT_CONFIG.elements.badges),
      addToCartButton: normalizeElement(elements.addToCartButton ?? elements.add_to_cart_button, DEFAULT_CONFIG.elements.addToCartButton),
      viewDetailsButton: normalizeElement(elements.viewDetailsButton ?? elements.view_details_button, DEFAULT_CONFIG.elements.viewDetailsButton),
    },
    decorations: Array.isArray(source.decorations)
      ? source.decorations
          .map((x) => {
            const d = obj(x);
            const p = obj(d.position);
            const s = obj(d.size);
            const src = String(d.src || "").trim();
            if (!src) return null;
            return {
              id: String(d.id || uid()),
              src,
              visible: d.visible == null ? true : Boolean(d.visible),
              locked: d.locked == null ? true : Boolean(d.locked),
              position: { x: clamp(p.x, 24, 0, 9999), y: clamp(p.y, 24, 0, 9999) },
              size: { width: clamp(s.width, 84, 16, 1200), height: clamp(s.height, 84, 16, 1200) },
              opacity: clamp(d.opacity, 1, 0.1, 1),
              zIndex: Math.trunc(clamp(d.zIndex, 16, 0, 100)),
              borderRadius: clamp(d.borderRadius, 10, 0, 80),
            };
          })
          .filter(Boolean)
      : [],
  };
  if (normalized.layoutToken !== "overlay") return normalized;
  if (normalizedVersion >= 2) return normalized;
  const h = normalized.canvas.height;
  const w = normalized.canvas.width;
  const toX = (percent: number) => Math.round((w * percent) / 100);
  const toY = (percent: number) => Math.round((h * percent) / 100);
  const nameBottom = normalized.elements.name.position.y + normalized.elements.name.size.height;
  const priceBottom = normalized.elements.price.position.y + normalized.elements.price.size.height;
  const descriptionBottom = normalized.elements.description.position.y + normalized.elements.description.size.height;
  const badgesBottom = normalized.elements.badges.position.y + normalized.elements.badges.size.height;
  const addTop = normalized.elements.addToCartButton.position.y;
  const detailsTop = normalized.elements.viewDetailsButton.position.y;
  const addBottom = normalized.elements.addToCartButton.position.y + normalized.elements.addToCartButton.size.height;
  const detailsBottom = normalized.elements.viewDetailsButton.position.y + normalized.elements.viewDetailsButton.size.height;
  const nameAndPriceMisaligned =
    Math.abs(normalized.elements.name.position.y - normalized.elements.price.position.y) > Math.max(10, h * 0.03);
  const hasOverflow =
    addBottom > h + 2 || detailsBottom > h + 2 || badgesBottom > h + 2 || descriptionBottom > h + 2;
  const floatingOverlayContent = normalized.elements.name.position.y < h * 0.48 || nameBottom < h * 0.55;
  const badgesTooCloseToButtons = badgesBottom > Math.min(addTop, detailsTop) - 20;
  if (!nameAndPriceMisaligned && !hasOverflow && !floatingOverlayContent && !badgesTooCloseToButtons) {
    return normalized;
  }
  return {
    ...normalized,
    globalStyle: {
      ...normalized.globalStyle,
      overlayTextGradient:
        normalized.globalStyle.overlayTextGradient ||
        "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.68) 58%, rgba(0,0,0,0.9) 100%)",
      overlayTextGradientHeight: clamp(normalized.globalStyle.overlayTextGradientHeight, toY(50), 80, 420),
    },
    elements: {
      ...normalized.elements,
      image: {
        ...normalized.elements.image,
        position: { x: 0, y: 0 },
        size: { width: toX(100), height: toY(100) },
        style: {
          ...normalized.elements.image.style,
          objectFit: "cover",
          zIndex: 0,
          borderRadius: 0,
        },
      },
      name: {
        ...normalized.elements.name,
        position: { x: toX(5), y: toY(63) },
        size: { width: toX(66), height: toY(7.5) },
      },
      price: {
        ...normalized.elements.price,
        position: { x: toX(72), y: toY(63) },
        size: { width: toX(23), height: toY(7.5) },
        style: { ...normalized.elements.price.style, textAlign: "right" },
      },
      description: {
        ...normalized.elements.description,
        position: { x: toX(5), y: toY(71.5) },
        size: { width: toX(90), height: toY(8.5) },
      },
      badges: {
        ...normalized.elements.badges,
        position: { x: toX(5), y: toY(80.5) },
        size: { width: toX(90), height: toY(8.5) },
      },
      addToCartButton: {
        ...normalized.elements.addToCartButton,
        position: { x: toX(5), y: toY(91) },
        size: { width: toX(44), height: toY(7.2) },
      },
      viewDetailsButton: {
        ...normalized.elements.viewDetailsButton,
        position: { x: toX(52), y: toY(91) },
        size: { width: toX(44), height: toY(7.2) },
      },
    },
  };
};

const buildTemplate = (key: DesignerConfig["layoutToken"]) => {
  if (key === "overlay") {
    return withLockedTemplate(normalizeConfig({
      ...DEFAULT_CONFIG,
      layoutToken: "overlay",
      globalStyle: {
        ...DEFAULT_CONFIG.globalStyle,
        backgroundColor: "#000000",
        backgroundGradient: null,
        overlayTextGradient:
          "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.68) 58%, rgba(0,0,0,0.9) 100%)",
        overlayTextGradientHeight: toCanvasY(52),
      },
      elements: {
        ...DEFAULT_CONFIG.elements,
        image: {
          ...DEFAULT_CONFIG.elements.image,
          position: { x: 0, y: 0 },
          size: { width: toCanvasX(100), height: toCanvasY(100) },
          style: {
            ...DEFAULT_CONFIG.elements.image.style,
            zIndex: 0,
            borderRadius: 0,
            objectFit: "cover",
            brightness: 0.88,
            contrast: 1.08,
          },
        },
        name: {
          ...DEFAULT_CONFIG.elements.name,
          position: { x: toCanvasX(5), y: toCanvasY(63) },
          size: { width: toCanvasX(66), height: toCanvasY(7.5) },
          style: {
            ...DEFAULT_CONFIG.elements.name.style,
            color: "#ffffff",
            fontSize: 21,
            lineHeight: 1.2,
            zIndex: 50,
            textShadow: "0 2px 14px rgba(0,0,0,0.75)",
            letterSpacing: 0.2,
          },
        },
        price: {
          ...DEFAULT_CONFIG.elements.price,
          position: { x: toCanvasX(72), y: toCanvasY(63) },
          size: { width: toCanvasX(23), height: toCanvasY(7.5) },
          style: {
            ...DEFAULT_CONFIG.elements.price.style,
            color: "#ffffff",
            fontSize: 20,
            lineHeight: 1.2,
            zIndex: 50,
            textAlign: "right",
            textShadow: "0 2px 10px rgba(0,0,0,0.7)",
          },
        },
        description: {
          ...DEFAULT_CONFIG.elements.description,
          position: { x: toCanvasX(5), y: toCanvasY(71.5) },
          size: { width: toCanvasX(90), height: toCanvasY(8.5) },
          style: {
            ...DEFAULT_CONFIG.elements.description.style,
            color: "#f1f5f9",
            fontSize: 14,
            zIndex: 50,
            lineHeight: 1.2,
            textShadow: "0 2px 8px rgba(0,0,0,0.72)",
          },
        },
        badges: {
          ...DEFAULT_CONFIG.elements.badges,
          position: { x: toCanvasX(5), y: toCanvasY(80.5) },
          size: { width: toCanvasX(90), height: toCanvasY(8.5) },
          style: {
            ...DEFAULT_CONFIG.elements.badges.style,
            color: "#ffffff",
            zIndex: 50,
          },
        },
        addToCartButton: {
          ...DEFAULT_CONFIG.elements.addToCartButton,
          position: { x: toCanvasX(5), y: toCanvasY(91) },
          size: { width: toCanvasX(44), height: toCanvasY(7.2) },
          style: {
            ...DEFAULT_CONFIG.elements.addToCartButton.style,
            zIndex: 50,
            fontSize: 13,
            fontWeight: "900",
            color: "#ffffff",
            backgroundColor: "#111111",
            borderWidth: 2,
            borderRadius: 14,
            borderColor: "#ffffff",
          },
        },
        viewDetailsButton: {
          ...DEFAULT_CONFIG.elements.viewDetailsButton,
          position: { x: toCanvasX(52), y: toCanvasY(91) },
          size: { width: toCanvasX(44), height: toCanvasY(7.2) },
          style: {
            ...DEFAULT_CONFIG.elements.viewDetailsButton.style,
            zIndex: 50,
            fontSize: 13,
            fontWeight: "900",
            color: "#ffffff",
            backgroundColor: "#111111",
            borderWidth: 2,
            borderRadius: 14,
            borderColor: "#ffffff",
          },
        },
      },
    }));
  }
  if (key === "bicolor") {
    return withLockedTemplate(normalizeConfig({
      ...DEFAULT_CONFIG,
      layoutToken: "bicolor",
      globalStyle: {
        ...DEFAULT_CONFIG.globalStyle,
        backgroundColor: "#ffffff",
        backgroundGradient: null,
        overlayTextGradient: null,
      },
      elements: {
        ...DEFAULT_CONFIG.elements,
        image: {
          ...DEFAULT_CONFIG.elements.image,
          position: { x: toCanvasX(5), y: toCanvasY(3) },
          size: { width: toCanvasX(90), height: toCanvasY(38) },
          style: { ...DEFAULT_CONFIG.elements.image.style, zIndex: 4, borderRadius: 16, objectFit: "cover" },
        },
        name: {
          ...DEFAULT_CONFIG.elements.name,
          position: { x: toCanvasX(5), y: toCanvasY(44.5) },
          size: { width: toCanvasX(66), height: toCanvasY(9) },
          style: { ...DEFAULT_CONFIG.elements.name.style, zIndex: 14, fontSize: 28, color: "#0f172a" },
        },
        price: {
          ...DEFAULT_CONFIG.elements.price,
          position: { x: toCanvasX(73), y: toCanvasY(46) },
          size: { width: toCanvasX(22), height: toCanvasY(7) },
          style: { ...DEFAULT_CONFIG.elements.price.style, zIndex: 15, textAlign: "right", color: "#0f172a" },
        },
        description: {
          ...DEFAULT_CONFIG.elements.description,
          position: { x: toCanvasX(5), y: toCanvasY(56) },
          size: { width: toCanvasX(90), height: toCanvasY(16) },
          style: { ...DEFAULT_CONFIG.elements.description.style, zIndex: 13, fontSize: 14, color: "#334155" },
        },
        badges: {
          ...DEFAULT_CONFIG.elements.badges,
          position: { x: toCanvasX(5), y: toCanvasY(76) },
          size: { width: toCanvasX(90), height: toCanvasY(10) },
          style: { ...DEFAULT_CONFIG.elements.badges.style, zIndex: 16, color: "#0f172a" },
        },
        addToCartButton: {
          ...DEFAULT_CONFIG.elements.addToCartButton,
          position: { x: toCanvasX(5), y: toCanvasY(88.5) },
          size: { width: toCanvasX(43), height: toCanvasY(9) },
          style: {
            ...DEFAULT_CONFIG.elements.addToCartButton.style,
            zIndex: 17,
            fontSize: 13,
            color: "#111827",
            backgroundColor: "#ffffff",
            borderWidth: 2,
            borderColor: "#111111",
          },
        },
        viewDetailsButton: {
          ...DEFAULT_CONFIG.elements.viewDetailsButton,
          position: { x: toCanvasX(52), y: toCanvasY(88.5) },
          size: { width: toCanvasX(43), height: toCanvasY(9) },
          style: {
            ...DEFAULT_CONFIG.elements.viewDetailsButton.style,
            zIndex: 17,
            fontSize: 13,
            color: "#111827",
            backgroundColor: "#ffffff",
            borderWidth: 1,
            borderColor: "#111111",
          },
        },
      },
    }));
  }
  return withLockedTemplate(normalizeConfig({
    ...DEFAULT_CONFIG,
    layoutToken: "default",
    globalStyle: {
      ...DEFAULT_CONFIG.globalStyle,
      backgroundColor: "#f8fafc",
      backgroundGradient: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
      overlayTextGradient: null,
    },
    elements: {
      ...DEFAULT_CONFIG.elements,
      image: {
        ...DEFAULT_CONFIG.elements.image,
        position: { x: 0, y: 0 },
        size: { width: toCanvasX(100), height: toCanvasY(56) },
        style: { ...DEFAULT_CONFIG.elements.image.style, zIndex: 3, borderRadius: 0, objectFit: "cover" },
      },
      name: {
        ...DEFAULT_CONFIG.elements.name,
        position: { x: toCanvasX(5), y: toCanvasY(60) },
        size: { width: toCanvasX(66), height: toCanvasY(8) },
        style: { ...DEFAULT_CONFIG.elements.name.style, zIndex: 14, fontSize: 26, color: "#0f172a" },
      },
      price: {
        ...DEFAULT_CONFIG.elements.price,
        position: { x: toCanvasX(72), y: toCanvasY(60) },
        size: { width: toCanvasX(23), height: toCanvasY(8) },
        style: { ...DEFAULT_CONFIG.elements.price.style, zIndex: 15, textAlign: "right", color: "#0f172a" },
      },
      description: {
        ...DEFAULT_CONFIG.elements.description,
        position: { x: toCanvasX(5), y: toCanvasY(69) },
        size: { width: toCanvasX(90), height: toCanvasY(10) },
        style: { ...DEFAULT_CONFIG.elements.description.style, zIndex: 13, fontSize: 13, color: "#334155" },
      },
      badges: {
        ...DEFAULT_CONFIG.elements.badges,
        position: { x: toCanvasX(5), y: toCanvasY(80) },
        size: { width: toCanvasX(90), height: toCanvasY(7) },
        style: { ...DEFAULT_CONFIG.elements.badges.style, zIndex: 16, color: "#0f172a" },
      },
        addToCartButton: {
          ...DEFAULT_CONFIG.elements.addToCartButton,
          position: { x: toCanvasX(5), y: toCanvasY(89) },
          size: { width: toCanvasX(43), height: toCanvasY(8.5) },
          style: {
            ...DEFAULT_CONFIG.elements.addToCartButton.style,
            zIndex: 17,
            fontSize: 12,
            color: "#111827",
            backgroundColor: "#ffffff",
            borderWidth: 2,
            borderColor: "#111111",
          },
        },
        viewDetailsButton: {
          ...DEFAULT_CONFIG.elements.viewDetailsButton,
          position: { x: toCanvasX(52), y: toCanvasY(89) },
          size: { width: toCanvasX(43), height: toCanvasY(8.5) },
          style: {
            ...DEFAULT_CONFIG.elements.viewDetailsButton.style,
            zIndex: 17,
            fontSize: 12,
            color: "#111827",
            borderWidth: 1,
            borderColor: "#111111",
            backgroundColor: "#e2e8f0",
          },
        },
      },
  }));
};

export default function CardDesigner({ restaurantId, initialConfig, dishes = [], onSaved }: CardDesignerProps) {
  const initial = useMemo(() => normalizeConfig(initialConfig), [initialConfig]);
  const initialRef = useRef<DesignerConfig>(initial);
  const dishList = useMemo(
    () =>
      Array.isArray(dishes)
        ? dishes
            .map((d) => ({ id: String(d?.id ?? "").trim(), label: String(d?.name_fr || d?.name || "").trim() }))
            .filter((d) => d.id && d.label)
        : [],
    [dishes]
  );
  const dishById = useMemo(() => {
    const map = new Map<string, DishOption>();
    for (const dish of dishes) {
      const key = String(dish?.id ?? "").trim();
      if (key) map.set(key, dish);
    }
    return map;
  }, [dishes]);
  const [config, setConfigState] = useState<DesignerConfig>(initial);
  const [selection, setSelection] = useState<Selection>({ kind: "element", key: "name" });
  const [tab, setTab] = useState<"global" | "elements">("global");
  const [scope, setScope] = useState<"global" | "dish">("global");
  const [dishId, setDishId] = useState(dishList[0]?.id || "");
  const [status, setStatus] = useState<"idle" | "saving" | "error" | "success">("idle");
  const [toast, setToast] = useState("");
  const [loadingLayout, setLoadingLayout] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySaving, setLibrarySaving] = useState(false);
  const [libraryName, setLibraryName] = useState("");
  const [savedLayouts, setSavedLayouts] = useState<SavedLayoutItem[]>([]);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [canvasVersion, setCanvasVersion] = useState(0);
  const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  // UI zoom where 100% corresponds to the new physical baseline scale (130%).
  const [previewZoom, setPreviewZoom] = useState(1);
  const [backgroundFillMode, setBackgroundFillMode] = useState<BackgroundFillMode>(() =>
    parseBackgroundFill(initial.globalStyle.backgroundGradient, initial.globalStyle.backgroundColor).mode
  );
  const [backgroundColorA, setBackgroundColorA] = useState<string>(() =>
    parseBackgroundFill(initial.globalStyle.backgroundGradient, initial.globalStyle.backgroundColor).colorA
  );
  const [backgroundColorB, setBackgroundColorB] = useState<string>(() =>
    parseBackgroundFill(initial.globalStyle.backgroundGradient, initial.globalStyle.backgroundColor).colorB
  );
  const [suggestedColors, setSuggestedColors] = useState<string[]>(DEFAULT_COLOR_SUGGESTIONS);
  const [previewViewportHeight, setPreviewViewportHeight] = useState(0);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const bgRef = useRef<HTMLInputElement | null>(null);
  const decoRef = useRef<HTMLInputElement | null>(null);
  const guideTimeoutRef = useRef<number | null>(null);
  const measureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const draftsRef = useRef<{ global?: DesignerConfig; dishes: Record<string, DesignerConfig> }>({ dishes: {} });
  const configRef = useRef<DesignerConfig>(initial);
  const overlayInitDoneRef = useRef<string>("");
  const saveRequestRef = useRef(0);
  const lastSaveTimeRef = useRef(0);
  const normalizeId = (value: unknown) => String(value ?? "").trim();
  const snapValue = (value: number) => (snapEnabled ? Math.round(value / SNAP_GRID) * SNAP_GRID : value);
  const getLayoutCacheKey = (restId: string) => `menuqr:card-layout-cache:${restId}`;
  const readLayoutCache = (restId: string): { global?: DesignerConfig; dishes: Record<string, DesignerConfig> } => {
    if (typeof window === "undefined" || !restId) return { dishes: {} };
    try {
      const raw = window.localStorage.getItem(getLayoutCacheKey(restId));
      if (!raw) return { dishes: {} };
      const parsed = obj(JSON.parse(raw));
      const global = hasLayout(parsed.global) ? normalizeConfig(parsed.global) : undefined;
      const dishesRaw = obj(parsed.dishes);
      const dishesFromCache = Object.fromEntries(
        Object.entries(dishesRaw)
          .map(([k, v]) => [normalizeId(k), hasLayout(v) ? normalizeConfig(v) : null] as const)
          .filter(([k, v]) => Boolean(k) && Boolean(v))
      ) as Record<string, DesignerConfig>;
      return { global, dishes: dishesFromCache };
    } catch {
      return { dishes: {} };
    }
  };
  const writeLayoutCache = (restId: string, nextConfig: DesignerConfig, meta: SaveMeta) => {
    if (typeof window === "undefined" || !restId) return;
    const existing = readLayoutCache(restId);
    const nextPayload = {
      global: meta.scope === "global" ? nextConfig : existing.global || null,
      dishes:
        meta.scope === "dish" && meta.dishId
          ? { ...existing.dishes, [normalizeId(meta.dishId)]: nextConfig }
          : existing.dishes,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(getLayoutCacheKey(restId), JSON.stringify(nextPayload));
  };
  const refreshCanvas = () => {
    setCanvasVersion((prev) => prev + 1);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => setCanvasVersion((prev) => prev + 1));
    }
  };
  const syncDraftSnapshot = (
    nextConfig: DesignerConfig,
    meta?: { scope?: "global" | "dish"; dishId?: string }
  ) => {
    configRef.current = nextConfig;
    const targetScope = meta?.scope || scope;
    const targetDishId = meta?.dishId ?? dishId;
    if (targetScope === "global") {
      draftsRef.current.global = nextConfig;
      return;
    }
    const normalized = normalizeId(targetDishId);
    if (normalized) draftsRef.current.dishes[normalized] = nextConfig;
  };
  const setConfig = (
    nextConfig: React.SetStateAction<DesignerConfig>,
    meta?: { scope?: "global" | "dish"; dishId?: string }
  ) => {
    setConfigState((prev) => {
      const resolved =
        typeof nextConfig === "function"
          ? (nextConfig as (prevState: DesignerConfig) => DesignerConfig)(prev)
          : nextConfig;
      syncDraftSnapshot(resolved, meta);
      return resolved;
    });
  };
  const applyBackgroundControls = (mode: BackgroundFillMode, colorA: string, colorB: string) => {
    setConfig((prev) => ({
      ...prev,
      globalStyle: {
        ...prev.globalStyle,
        backgroundColor: colorA,
        backgroundGradient: buildBackgroundGradient(mode, colorA, colorB),
      },
    }));
  };

  const getMeasureContext = () => {
    if (typeof document === "undefined") return null;
    if (!measureCanvasRef.current) {
      measureCanvasRef.current = document.createElement("canvas");
    }
    return measureCanvasRef.current.getContext("2d");
  };

  const autoFitFontSize = (
    text: string,
    element: ElementConfig,
    minFontSize = 8,
    forceSingleLine = false
  ) => {
    const content = String(text || "").trim();
    if (!content) return element.style.fontSize;
    const baseFontSize = Math.max(minFontSize, Math.round(Number(element.style.fontSize || 14)));
    const inset = textInset(element);
    const maxWidth = Math.max(12, Number(element.size.width || 12) - inset * 2);
    const maxHeight = Math.max(12, Number(element.size.height || 12) - inset * 2);
    const lineHeight = Math.max(0.8, Number(element.style.lineHeight || 1.25));
    const letterSpacing = Number(element.style.letterSpacing || 0);
    const ctx = getMeasureContext();
    if (!ctx) return element.style.fontSize;

    const fitsAt = (fontSize: number) => {
      ctx.font = `${String(element.style.fontWeight || "700")} ${fontSize}px '${String(
        element.style.fontFamily || "Montserrat"
      )}', sans-serif`;
      let lineCount = 1;
      let currentWidth = 0;
      let maxLineWidth = 0;
      const step = (char: string) =>
        ctx.measureText(char).width + (char.trim() ? Math.max(0, letterSpacing) : 0);

      for (const ch of content) {
        if (ch === "\n") {
          lineCount += 1;
          maxLineWidth = Math.max(maxLineWidth, currentWidth);
          currentWidth = 0;
          continue;
        }
        const width = step(ch);
        if (currentWidth + width > maxWidth && currentWidth > 0) {
          lineCount += 1;
          maxLineWidth = Math.max(maxLineWidth, currentWidth);
          currentWidth = width;
        } else {
          currentWidth += width;
        }
      }
      maxLineWidth = Math.max(maxLineWidth, currentWidth);
      if (forceSingleLine && lineCount > 1) return false;
      return maxLineWidth <= maxWidth + 0.5 && lineCount * fontSize * lineHeight <= maxHeight + 0.5;
    };

    let size = baseFontSize;
    while (size > minFontSize && !fitsAt(size)) size -= 1;
    return size;
  };

  const mapSavedLayoutRows = (rows: unknown[]): SavedLayoutItem[] =>
    rows
      .map((entry) => {
        const row = obj(entry);
        const id = String(row.id || row.uuid || uid()).trim();
        const name = String(row.name || row.label || row.title || "Modèle sans nom").trim();
        const payload = row[SAVED_LAYOUT_PAYLOAD_COLUMN] ?? row[SAVED_LAYOUT_CONFIG_COLUMN];
        if (!id || !name || !hasLayout(payload)) return null;
        return {
          id,
          name,
          config: normalizeConfig(payload),
          createdAt: String(row.created_at || row.updated_at || "").trim() || undefined,
        };
      })
      .filter(Boolean) as SavedLayoutItem[];

  const upsertSavedLayoutLocal = (item: SavedLayoutItem) => {
    setSavedLayouts((prev) => {
      const withoutSame = prev.filter((entry) => entry.id !== item.id);
      const next = [item, ...withoutSame];
      next.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      return next;
    });
  };

  const loadSavedLayouts = async (options: LoadSavedLayoutsOptions = {}) => {
    const { silent = false } = options;
    const restId = String(restaurantId || "").trim();
    const targetRestaurantId = restId;
    setLibraryLoading(true);
    try {
      const r = await supabase.from("saved_layouts").select("*");
      if (r.error) {
        console.error(
          "ERREUR SUPABASE RÉELLE :",
          (r.error as any)?.message,
          (r.error as any)?.details,
          (r.error as any)?.hint,
          r.error
        );
        if (isMissingTableError(r.error, "saved_layouts")) {
          setSavedLayouts([]);
          return;
        }
        throw new Error(r.error.message || "Impossible de charger la bibliothèque.");
      }
      const allRows = Array.isArray(r.data) ? r.data : [];
      const filteredRows = allRows.filter((entry) => {
        const row = obj(entry);
        const rowRestaurantId = String(row.restaurant_id || row.resto_id || "").trim();
        return !rowRestaurantId || !restId || rowRestaurantId === restId;
      });
      const mapped = mapSavedLayoutRows(filteredRows);
      mapped.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      setSavedLayouts(mapped);
    } catch (e) {
      if (!silent) {
        setStatus("error");
        setToast(String((e as any)?.message || "Erreur de chargement de la bibliothèque."));
      }
    } finally {
      setLibraryLoading(false);
    }
  };

  const handleSaveToLibrary = async () => {
    const name = String(libraryName || "").trim();
    if (!name) {
      setStatus("error");
      setToast("Veuillez donner un nom à votre modèle.");
      return;
    }
    setLibrarySaving(true);
    try {
      const payload = normalizeConfig(config);
      const baseRecord = { name };
      const saveRecord = {
        ...baseRecord,
        [SAVED_LAYOUT_PAYLOAD_COLUMN]: payload,
        [SAVED_LAYOUT_CONFIG_COLUMN]: payload,
      };
      const r = await supabase.from("saved_layouts").insert(saveRecord as never).select("*").maybeSingle();
      if (r.error) {
        console.error(
          "ERREUR SUPABASE RÉELLE :",
          (r.error as any)?.message,
          (r.error as any)?.details,
          (r.error as any)?.hint,
          r.error
        );
        if (isMissingTableError(r.error, "saved_layouts")) {
          throw new Error("La table saved_layouts est absente. Crée-la pour activer la bibliothèque.");
        }
        if (
          isMissingColumnError(r.error, SAVED_LAYOUT_PAYLOAD_COLUMN) ||
          isSchemaCacheError(r.error, "saved_layouts", SAVED_LAYOUT_PAYLOAD_COLUMN)
        ) {
          const missingColumn = extractSchemaCacheColumn(r.error) || SAVED_LAYOUT_PAYLOAD_COLUMN;
          throw new Error(
            `La colonne "${missingColumn}" est introuvable dans saved_layouts. Vérifiez le schéma Supabase et rechargez le cache PostgREST.`
          );
        }
        throw new Error(r.error.message || "Impossible d'enregistrer le modèle.");
      }

      const row = obj(r.data as any);
      const persistedPayload =
        row[SAVED_LAYOUT_PAYLOAD_COLUMN] ?? row[SAVED_LAYOUT_CONFIG_COLUMN] ?? payload;
      const localItem: SavedLayoutItem = {
        id: String(row.id || row.uuid || uid()).trim() || uid(),
        name: String(row.name || name).trim() || name,
        config: normalizeConfig(persistedPayload),
        createdAt: String(row.created_at || row.updated_at || new Date().toISOString()).trim() || undefined,
      };
      upsertSavedLayoutLocal(localItem);
      setLibraryName("");
      setStatus("success");
      setToast("Félicitations ! Votre modèle a été correctement sauvegardé dans votre bibliothèque Elemdho.");
      window.setTimeout(() => setStatus("idle"), 1200);
      void loadSavedLayouts({ silent: true });
    } catch (e) {
      setStatus("error");
      setToast(String((e as any)?.message || "Erreur d'enregistrement du modèle."));
    } finally {
      setLibrarySaving(false);
    }
  };

  const applySavedLayout = (item: SavedLayoutItem) => {
    setConfig(normalizeConfig(item.config));
    setSelection({ kind: "element", key: "name" });
    setTab("elements");
    refreshCanvas();
    setToast(`Modèle "${item.name}" appliqué.`);
  };
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    initialRef.current = initial;
  }, [initial]);

  useEffect(() => {
    const parsed = parseBackgroundFill(config.globalStyle.backgroundGradient, config.globalStyle.backgroundColor);
    setBackgroundFillMode(parsed.mode);
    setBackgroundColorA(parsed.colorA);
    setBackgroundColorB(parsed.colorB);
  }, [config.globalStyle.backgroundGradient, config.globalStyle.backgroundColor]);

  useEffect(() => {
    return () => {
      if (guideTimeoutRef.current != null) {
        window.clearTimeout(guideTimeoutRef.current);
        guideTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    void loadSavedLayouts();
  }, [restaurantId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => refreshCanvas());
    const timer = window.setTimeout(() => refreshCanvas(), 40);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (loadingLayout) return;
    if (config.layoutToken !== "overlay") return;
    const scopeKey = scope === "dish" ? `dish:${normalizeId(dishId)}` : "global";
    if (overlayInitDoneRef.current === scopeKey) return;

    setConfig((prev) => {
      if (prev.layoutToken !== "overlay") return prev;
      const keys: ElementKey[] = [
        "name",
        "price",
        "description",
        "badges",
        "addToCartButton",
        "viewDetailsButton",
      ];
      let changed = false;
      const nextElements = { ...prev.elements };
      for (const key of keys) {
        const currentVisible = (nextElements[key] as any)?.visible;
        const position = (nextElements[key] as any)?.position || {};
        const size = (nextElements[key] as any)?.size || {};
        const hasCoordinates = Number.isFinite(Number(position.x)) && Number.isFinite(Number(position.y));
        const hasSize = Number.isFinite(Number(size.width)) && Number(size.width) > 0 && Number.isFinite(Number(size.height)) && Number(size.height) > 0;
        if (hasCoordinates && hasSize && currentVisible !== true) {
          nextElements[key] = { ...nextElements[key], visible: true };
          changed = true;
          continue;
        }
        if (typeof currentVisible !== "boolean") {
          nextElements[key] = { ...nextElements[key], visible: true };
          changed = true;
        }
      }
      return changed ? { ...prev, elements: nextElements } : prev;
    });

    overlayInitDoneRef.current = scopeKey;
    const frame = window.requestAnimationFrame(() => refreshCanvas());
    return () => window.cancelAnimationFrame(frame);
  }, [config.layoutToken, config, scope, dishId, loadingLayout]);

  useEffect(() => {
    const restId = String(restaurantId || "").trim();
    if (!restId) return;
    const cached = readLayoutCache(restId);
    if (cached.global) draftsRef.current.global = cached.global;
    draftsRef.current.dishes = { ...cached.dishes, ...draftsRef.current.dishes };
  }, [restaurantId]);

  useEffect(() => {
    if (loadingLayout) return;
    const frame = window.requestAnimationFrame(() => refreshCanvas());
    return () => window.cancelAnimationFrame(frame);
  }, [loadingLayout, scope, dishId]);

  useEffect(() => {
    if (dishList.length === 0) {
      setDishId("");
      if (scope === "dish") setScope("global");
      return;
    }
    const normalizedDishId = normalizeId(dishId);
    if (!dishList.some((d) => d.id === normalizedDishId)) setDishId(dishList[0].id);
  }, [dishList, dishId, scope]);

  useEffect(() => {
    if (status === "saving") return;
    let cancelled = false;
    const hydrate = async () => {
      const fallbackInitial = initialRef.current;
      const restId = String(restaurantId || "").trim();
      const saveLockUntil =
        typeof window !== "undefined" && restId
          ? Number(window.localStorage.getItem(`menuqr:card-layout-save-lock:${restId}`) || 0)
          : 0;
      const withinLocalLock = Date.now() - lastSaveTimeRef.current < 5000;
      const withinStorageLock = Number.isFinite(saveLockUntil) && Date.now() < saveLockUntil;
      if (withinLocalLock || withinStorageLock) {
        const normalizedDishId = normalizeId(dishId);
        if (scope === "dish" && normalizedDishId && draftsRef.current.dishes[normalizedDishId]) {
          setConfig(draftsRef.current.dishes[normalizedDishId]);
          refreshCanvas();
          return;
        }
        setConfig(draftsRef.current.global || fallbackInitial);
        refreshCanvas();
        return;
      }
      try {
        if (scope === "global") {
          if (draftsRef.current.global) {
            setConfig(draftsRef.current.global);
            refreshCanvas();
            return;
          }
          const restId = String(restaurantId || "").trim();
          if (!restId) {
            setConfig(fallbackInitial);
            draftsRef.current.global = fallbackInitial;
            refreshCanvas();
            return;
          }
          setLoadingLayout(true);
          const r = await supabase.from("restaurants").select("id,settings,table_config,card_layout").eq("id", restId).maybeSingle();
          if (r.error) throw new Error(r.error.message || "Impossible de charger le design global.");
          const row = obj(r.data as any);
          const settings = obj(row.settings);
          const tableConfig = obj(row.table_config);
          const candidate =
            settings.card_layout ??
            settings.card_designer ??
            row.card_layout ??
            tableConfig.card_layout ??
            tableConfig.card_designer;
          const next = hasLayout(candidate) ? normalizeConfig(candidate) : fallbackInitial;
          if (cancelled) return;
          draftsRef.current.global = next;
          setConfig(next);
          refreshCanvas();
          return;
        }

        const normalizedDishId = normalizeId(dishId);
        if (!normalizedDishId) {
          setConfig(draftsRef.current.global || fallbackInitial);
          refreshCanvas();
          return;
        }
        if (draftsRef.current.dishes[normalizedDishId]) {
          setConfig(draftsRef.current.dishes[normalizedDishId]);
          refreshCanvas();
          return;
        }
        setLoadingLayout(true);
        const r = await supabase.from("dishes").select("id,custom_card_layout").eq("id", normalizedDishId).maybeSingle();
        if (r.error) {
          if (isMissingColumnError(r.error, "custom_card_layout")) {
            throw new Error("La colonne custom_card_layout est absente de la table dishes.");
          }
          throw new Error(r.error.message || "Impossible de charger le design du plat.");
        }
        const next = hasLayout((r.data as any)?.custom_card_layout)
          ? normalizeConfig((r.data as any)?.custom_card_layout)
          : draftsRef.current.global || fallbackInitial;
        if (cancelled) return;
        draftsRef.current.dishes[normalizedDishId] = next;
        setConfig(next);
        refreshCanvas();
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setToast(String((e as any)?.message || "Erreur de chargement."));
          setConfig(draftsRef.current.global || fallbackInitial);
          refreshCanvas();
        }
      } finally {
        if (!cancelled) setLoadingLayout(false);
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [scope, dishId, restaurantId, status]);

  useEffect(() => {
    if (scope === "global") draftsRef.current.global = config;
    else if (dishId) draftsRef.current.dishes[normalizeId(dishId)] = config;
    configRef.current = config;
  }, [config, scope, dishId]);

  const selected = selection.kind === "element" ? config.elements[selection.key] : config.decorations.find((x) => x.id === selection.id) || null;
  const corners = (el: ElementConfig) => ({
    borderTopLeftRadius: el.style.borderTopLeftRadius ?? el.style.borderRadius,
    borderTopRightRadius: el.style.borderTopRightRadius ?? el.style.borderRadius,
    borderBottomRightRadius: el.style.borderBottomRightRadius ?? el.style.borderRadius,
    borderBottomLeftRadius: el.style.borderBottomLeftRadius ?? el.style.borderRadius,
  });
  const elementFilter = (el: ElementConfig) => `brightness(${el.style.brightness ?? 1}) contrast(${el.style.contrast ?? 1})`;
  const textInset = (el: ElementConfig) => {
    const maxRadius = Math.max(
      Number(el.style.borderTopLeftRadius ?? el.style.borderRadius ?? 0),
      Number(el.style.borderTopRightRadius ?? el.style.borderRadius ?? 0),
      Number(el.style.borderBottomRightRadius ?? el.style.borderRadius ?? 0),
      Number(el.style.borderBottomLeftRadius ?? el.style.borderRadius ?? 0)
    );
    const cornerInset = Math.min(10, Math.max(1, Math.round(maxRadius * 0.18)));
    const fontInset = Math.min(8, Math.max(1, Math.round(Number(el.style.fontSize || 14) * 0.12)));
    return Math.max(2, cornerInset, fontInset);
  };

  const textStyle = (el: ElementConfig, fontSizeOverride?: number): React.CSSProperties => {
    const innerPadding = textInset(el);
    const verticalPadding = Math.max(1, Math.round(innerPadding * 0.5));
    const horizontalPadding = Math.max(3, Math.round(innerPadding * 0.8));
    return {
      width: "100%",
      height: "100%",
      maxWidth: "100%",
      maxHeight: "100%",
      overflow: "hidden",
      overflowWrap: "anywhere",
      wordBreak: "break-word",
      textOverflow: "ellipsis",
      boxSizing: "border-box",
      padding: `${verticalPadding}px ${horizontalPadding}px`,
      color: el.style.color,
      fontSize: fontSizeOverride ?? el.style.fontSize,
      fontWeight: el.style.fontWeight as any,
      fontFamily: `'${el.style.fontFamily.replace(/'/g, "\\'")}', sans-serif`,
      opacity: el.style.opacity,
      zIndex: el.style.zIndex,
      textAlign: el.style.textAlign,
      letterSpacing: `${el.style.letterSpacing ?? 0}px`,
      lineHeight: el.style.lineHeight || 1.25,
      textShadow: el.style.textShadow || "none",
      background: el.style.backgroundGradient || el.style.backgroundColor || "transparent",
      borderWidth: el.style.borderWidth || 0,
      borderStyle: el.style.borderStyle || "solid",
      borderColor: el.style.borderColor || "#111111",
      backdropFilter: el.style.glassmorphism ? `blur(${el.style.backdropBlur || 10}px)` : undefined,
      WebkitBackdropFilter: el.style.glassmorphism ? `blur(${el.style.backdropBlur || 10}px)` : undefined,
      whiteSpace: "normal",
      ...corners(el),
    };
  };

  const actionStyle = (el: ElementConfig, primary: boolean, fontSizeOverride?: number): React.CSSProperties => {
    const innerPadding = textInset(el);
    return {
      ...textStyle(el, fontSizeOverride),
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
      padding: `0 ${Math.max(10, innerPadding + 2)}px`,
      border:
        (el.style.borderWidth || 0) > 0
          ? `${el.style.borderWidth}px ${el.style.borderStyle || "solid"} ${el.style.borderColor || "#111111"}`
          : "2px solid #111111",
      boxShadow: "2px 2px 0 rgba(15,23,42,0.8)",
      backgroundColor: el.style.backgroundColor || (primary ? "#111111" : "rgba(255,255,255,0.95)"),
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
    };
  };

  const getAutoFontFactor = (key: ElementKey) =>
    key === "name"
      ? 0.62
      : key === "price"
        ? 0.6
        : key === "description"
          ? 0.24
          : key === "badges"
            ? 0.2
            : key === "addToCartButton" || key === "viewDetailsButton"
              ? 0.36
              : 0;

  const clearGuidesSoon = () => {
    if (guideTimeoutRef.current != null) {
      window.clearTimeout(guideTimeoutRef.current);
    }
    guideTimeoutRef.current = window.setTimeout(() => {
      setGuides({ x: null, y: null });
      guideTimeoutRef.current = null;
    }, 520);
  };

  const getSnapTargets = (selfId: string) => {
    const xTargets = [Math.round(config.canvas.width / 2)];
    const yTargets = [Math.round(runtimeCanvasHeight / 2)];

    for (const key of ELEMENT_KEYS) {
      const id = `element:${key}`;
      if (id === selfId) continue;
      const element = config.elements[key];
      if (!element.visible) continue;
      xTargets.push(Math.round(element.position.x + element.size.width / 2));
      yTargets.push(Math.round(element.position.y + element.size.height / 2));
    }
    for (const deco of config.decorations) {
      const id = `deco:${deco.id}`;
      if (id === selfId) continue;
      if (!deco.visible) continue;
      xTargets.push(Math.round(deco.position.x + deco.size.width / 2));
      yTargets.push(Math.round(deco.position.y + deco.size.height / 2));
    }
    return { xTargets, yTargets };
  };

  const applySmartSnap = (
    selfId: string,
    x: number,
    y: number,
    width: number,
    height: number,
    previewOnly = false
  ) => {
    if (!snapEnabled) {
      setGuides({ x: null, y: null });
      return { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) };
    }
    let nextX = snapValue(x);
    let nextY = snapValue(y);
    let guideX: number | null = null;
    let guideY: number | null = null;
    const { xTargets, yTargets } = getSnapTargets(selfId);
    const centerX = nextX + width / 2;
    const centerY = nextY + height / 2;

    let bestDx = Number.POSITIVE_INFINITY;
    for (const targetX of xTargets) {
      const dx = targetX - centerX;
      if (Math.abs(dx) <= SNAP_ALIGN_TOLERANCE && Math.abs(dx) < Math.abs(bestDx)) {
        bestDx = dx;
        guideX = targetX;
      }
    }
    if (Number.isFinite(bestDx)) nextX += bestDx;

    let bestDy = Number.POSITIVE_INFINITY;
    for (const targetY of yTargets) {
      const dy = targetY - centerY;
      if (Math.abs(dy) <= SNAP_ALIGN_TOLERANCE && Math.abs(dy) < Math.abs(bestDy)) {
        bestDy = dy;
        guideY = targetY;
      }
    }
    if (Number.isFinite(bestDy)) nextY += bestDy;

    setGuides({ x: guideX, y: guideY });
    if (!previewOnly) clearGuidesSoon();
    return {
      x: Math.max(0, Math.round(nextX)),
      y: Math.max(0, Math.round(nextY)),
    };
  };

  const onElementDragStop = (key: ElementKey, x: number, y: number) => {
    const snapped = applySmartSnap(`element:${key}`, x, y, config.elements[key].size.width, config.elements[key].size.height);
    setConfig((prev) => ({
      ...prev,
      elements: {
        ...prev.elements,
        [key]: {
          ...prev.elements[key],
          position: { x: snapped.x, y: snapped.y },
        },
      },
    }));
  };

  const onElementDrag = (key: ElementKey, x: number, y: number) => {
    const element = config.elements[key];
    const snapped = applySmartSnap(`element:${key}`, x, y, element.size.width, element.size.height, true);
    setConfig((prev) => {
      const current = prev.elements[key];
      if (current.position.x === snapped.x && current.position.y === snapped.y) return prev;
      return {
        ...prev,
        elements: {
          ...prev.elements,
          [key]: {
            ...current,
            position: { x: snapped.x, y: snapped.y },
          },
        },
      };
    });
  };

  const onElementResizeStop = (key: ElementKey, width: number, height: number, x: number, y: number) => {
    setConfig((prev) => {
      const current = prev.elements[key];
      const nextWidth = Math.max(24, Math.round(snapValue(width)));
      const nextHeight = Math.max(24, Math.round(snapValue(height)));
      const snapped = applySmartSnap(`element:${key}`, x, y, nextWidth, nextHeight);
      const factor = getAutoFontFactor(key);
      const nextStyle = factor > 0 ? { ...current.style, fontSize: clamp(nextHeight * factor, current.style.fontSize, 8, 120) } : current.style;
      return {
        ...prev,
        elements: {
          ...prev.elements,
          [key]: {
            ...current,
            position: { x: snapped.x, y: snapped.y },
            size: { width: nextWidth, height: nextHeight },
            style: nextStyle,
          },
        },
      };
    });
  };

  const onDecorationDragStop = (id: string, x: number, y: number) => {
    const deco = config.decorations.find((entry) => entry.id === id);
    if (!deco) return;
    const snapped = applySmartSnap(`deco:${id}`, x, y, deco.size.width, deco.size.height);
    setConfig((prev) => ({
      ...prev,
      decorations: prev.decorations.map((deco) =>
        deco.id === id ? { ...deco, position: { x: snapped.x, y: snapped.y } } : deco
      ),
    }));
  };

  const onDecorationDrag = (id: string, x: number, y: number) => {
    const deco = config.decorations.find((entry) => entry.id === id);
    if (!deco) return;
    const snapped = applySmartSnap(`deco:${id}`, x, y, deco.size.width, deco.size.height, true);
    setConfig((prev) => {
      let changed = false;
      const decorations = prev.decorations.map((entry) => {
        if (entry.id !== id) return entry;
        if (entry.position.x === snapped.x && entry.position.y === snapped.y) return entry;
        changed = true;
        return { ...entry, position: { x: snapped.x, y: snapped.y } };
      });
      return changed ? { ...prev, decorations } : prev;
    });
  };

  const onDecorationResizeStop = (id: string, width: number, height: number, x: number, y: number) => {
    const snappedWidth = Math.max(16, Math.round(snapValue(width)));
    const snappedHeight = Math.max(16, Math.round(snapValue(height)));
    const snapped = applySmartSnap(`deco:${id}`, x, y, snappedWidth, snappedHeight);
    setConfig((prev) => ({
      ...prev,
      decorations: prev.decorations.map((deco) =>
        deco.id === id
          ? {
              ...deco,
              position: { x: snapped.x, y: snapped.y },
              size: { width: snappedWidth, height: snappedHeight },
            }
          : deco
      ),
    }));
  };

  const runtimeCanvasHeight = useMemo(() => {
    let requiredHeight = config.canvas.height;
    for (const key of ELEMENT_KEYS) {
      const element = config.elements[key];
      if (!element.visible) continue;
      requiredHeight = Math.max(requiredHeight, element.position.y + element.size.height + 8);
    }
    for (const deco of config.decorations) {
      if (!deco.visible) continue;
      requiredHeight = Math.max(requiredHeight, deco.position.y + deco.size.height + 8);
    }
    return Math.max(config.canvas.height, Math.round(requiredHeight));
  }, [config]);

  const phoneBaseHeight = useMemo(() => runtimeCanvasHeight + 64, [runtimeCanvasHeight]);
  const effectivePreviewScale = useMemo(() => {
    const targetScale = previewZoom * PREVIEW_BASE_SCALE;
    if (!Number.isFinite(previewViewportHeight) || previewViewportHeight <= 0 || phoneBaseHeight <= 0) return targetScale;
    const fitScale = Math.max(0.45, (previewViewportHeight - 8) / phoneBaseHeight);
    return Math.min(targetScale, fitScale);
  }, [phoneBaseHeight, previewViewportHeight, previewZoom]);

  useEffect(() => {
    const node = previewViewportRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const update = () => setPreviewViewportHeight(node.clientHeight || 0);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const shiftSelectionLayer = (delta: number) => {
    if (!selection) return;
    if (selection.kind === "element") {
      setConfig((prev) => {
        const current = prev.elements[selection.key];
        const currentZ = Number(current.style.zIndex || 0);
        const nextZ = Math.trunc(clamp(currentZ + delta, currentZ, 0, 100));
        if (nextZ === currentZ) return prev;
        return {
          ...prev,
          elements: {
            ...prev.elements,
            [selection.key]: {
              ...current,
              style: {
                ...current.style,
                zIndex: nextZ,
              },
            },
          },
        };
      });
      return;
    }
    setConfig((prev) => {
      let changed = false;
      const decorations = prev.decorations.map((entry) => {
        if (entry.id !== selection.id) return entry;
        const currentZ = Number(entry.zIndex || 0);
        const nextZ = Math.trunc(clamp(currentZ + delta, currentZ, 0, 100));
        if (nextZ === currentZ) return entry;
        changed = true;
        return { ...entry, zIndex: nextZ };
      });
      return changed ? { ...prev, decorations } : prev;
    });
  };
  const setSelectionLayerBoundary = (boundary: "front" | "back") => {
    const targetZ = boundary === "front" ? 100 : 0;
    if (selection.kind === "element") {
      setConfig((prev) => ({
        ...prev,
        elements: {
          ...prev.elements,
          [selection.key]: {
            ...prev.elements[selection.key],
            style: {
              ...prev.elements[selection.key].style,
              zIndex: targetZ,
            },
          },
        },
      }));
      return;
    }
    setConfig((prev) => ({
      ...prev,
      decorations: prev.decorations.map((entry) => (entry.id === selection.id ? { ...entry, zIndex: targetZ } : entry)),
    }));
  };

  const collidedItemIds = useMemo(() => {
    type Box = { id: string; left: number; top: number; right: number; bottom: number };
    const boxes: Box[] = [];
    for (const key of ELEMENT_KEYS) {
      const element = config.elements[key];
      if (!element.visible) continue;
      if (element.locked) continue;
      if (key === "image") continue;
      boxes.push({
        id: `element:${key}`,
        left: element.position.x,
        top: element.position.y,
        right: element.position.x + element.size.width,
        bottom: element.position.y + element.size.height,
      });
    }
    for (const deco of config.decorations) {
      if (!deco.visible) continue;
      if (deco.locked) continue;
      boxes.push({
        id: `deco:${deco.id}`,
        left: deco.position.x,
        top: deco.position.y,
        right: deco.position.x + deco.size.width,
        bottom: deco.position.y + deco.size.height,
      });
    }
    const collisions = new Set<string>();
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const separated = a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
        if (!separated) {
          collisions.add(a.id);
          collisions.add(b.id);
        }
      }
    }
    return collisions;
  }, [config]);

  const handleSave = async () => {
    if (status === "saving") return;
    const saveRequestId = saveRequestRef.current + 1;
    saveRequestRef.current = saveRequestId;
    const targetRestaurantId = String(restaurantId || "").trim();
    const restId = targetRestaurantId;
    const normalizedDishId = normalizeId(dishId);
    if (!targetRestaurantId) {
      setStatus("error");
      setToast("Restaurant introuvable.");
      return;
    }
    if (scope === "dish" && !normalizedDishId) {
      setStatus("error");
      setToast("Sélectionne un plat.");
      return;
    }

    const latestConfig = configRef.current || config;
    console.log("Config before save:", latestConfig);
    const payload = normalizeConfig(latestConfig);
    const activeLayout = normalizeConfig(configRef.current || config).layoutToken;
    const resolvedLayout = activeLayout;
    console.log("ID DE SAUVEGARDE CIBLE :", targetRestaurantId);
    const configToSave = {
      ...payload,
      layoutToken: activeLayout,
    };
    const layoutUpdate = JSON.parse(JSON.stringify(configToSave)) as Record<string, unknown>;
    layoutUpdate.layoutToken = activeLayout;
    layoutUpdate.layout_token = activeLayout;
    const finalCardLayout = JSON.stringify(layoutUpdate);
    console.log(`JSON INTERNE SYNCHRONISÉ : ${resolvedLayout}`);
    if (typeof window !== "undefined") {
      console.debug("[CardDesigner] save payload", { scope, dishId: scope === "dish" ? dishId : null, payload });
    }
    const preLockUntil = Date.now() + 5000;
    lastSaveTimeRef.current = Date.now();
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`menuqr:card-layout-save-lock:${restId}`, String(preLockUntil));
    }
      setStatus("saving");
    try {
      if (typeof window !== "undefined") {
        console.log("SAUVEGARDE EN COURS POUR :", targetRestaurantId, "LAYOUT :", (configToSave as any)?.layoutToken);
      }
      if (scope === "global") {
          const read = await supabase.from("restaurants").select("id,settings").eq("id", targetRestaurantId).maybeSingle();
          if (read.error) throw new Error(read.error.message || "Impossible de charger les paramètres globaux.");
          const settings = obj((read.data as any)?.settings);
          const nextSettings = {
            ...settings,
            card_layout: finalCardLayout,
            card_designer: layoutUpdate,
            resolved: resolvedLayout,
          };
          const r = await supabase
            .from("restaurants")
            .update({ settings: nextSettings } as never)
            .eq("id", targetRestaurantId)
            .select("id,settings");
          if (r.error) throw new Error(r.error.message || "Erreur de sauvegarde globale.");
          if (!Array.isArray(r.data) || r.data.length === 0) {
            throw new Error("Aucun restaurant mis à jour. Vérifie l'identifiant restaurant.");
          }
          console.log("Données reçues après save:", r.data);
          const persistedRow = obj((r.data as any[])[0]);
          const persistedSettings = obj(persistedRow.settings);
          const persistedCandidate = persistedSettings.card_layout ?? persistedSettings.card_designer;
          const persistedGlobal = hasLayout(persistedCandidate)
            ? normalizeConfig(persistedCandidate)
            : configToSave;
          draftsRef.current.global = persistedGlobal;
        if (saveRequestRef.current !== saveRequestId) return;
        setConfig(persistedGlobal);
        if (typeof onSaved === "function") onSaved(persistedGlobal as any, { scope: "global" });
        writeLayoutCache(restId, persistedGlobal, { scope: "global" });
      } else {
        let r = await supabase
          .from("dishes")
          .update({ custom_card_layout: configToSave } as never)
          .eq("id", normalizedDishId)
          .eq("restaurant_id", restId)
          .select("id,custom_card_layout");
        if (!r.error && Array.isArray(r.data) && r.data.length === 0) {
          r = await supabase
            .from("dishes")
            .update({ custom_card_layout: configToSave } as never)
            .eq("id", normalizedDishId)
            .select("id,custom_card_layout");
        }
        if (r.error) {
          throw new Error(
            isMissingColumnError(r.error, "custom_card_layout")
              ? "La colonne custom_card_layout est absente de la table dishes."
              : r.error.message || "Erreur de sauvegarde du plat."
          );
        }
        if (!Array.isArray(r.data) || r.data.length === 0) {
          throw new Error("Aucun plat mis à jour. Vérifie le plat sélectionné.");
        }
        console.log("Données reçues après save:", r.data);
        const persistedRow = obj((r.data as any[])[0]);
        const persistedDish = hasLayout(persistedRow.custom_card_layout)
          ? normalizeConfig(persistedRow.custom_card_layout)
          : configToSave;
        draftsRef.current.dishes[normalizedDishId] = persistedDish;
        if (saveRequestRef.current !== saveRequestId) return;
        setConfig(persistedDish);
        if (typeof onSaved === "function") onSaved(persistedDish as any, { scope: "dish", dishId: normalizedDishId });
        writeLayoutCache(restId, persistedDish, { scope: "dish", dishId: normalizedDishId });
      }
      if (saveRequestRef.current !== saveRequestId) return;
      refreshCanvas();
      if (typeof window !== "undefined") {
        const lockUntil = Date.now() + 5000;
        lastSaveTimeRef.current = Date.now();
        window.localStorage.setItem(`menuqr:card-layout-save-lock:${restId}`, String(lockUntil));
        window.localStorage.setItem(
          `menuqr:card-layout-updated:${restId}`,
          JSON.stringify({ ts: Date.now(), scope, dishId: scope === "dish" ? normalizedDishId : null })
        );
        try {
          const channel = new BroadcastChannel("menuqr:card-layout");
          channel.postMessage({ ts: Date.now(), restaurantId: restId, scope, dishId: scope === "dish" ? normalizedDishId : null });
          channel.close();
        } catch {
          // ignore broadcast channel failures
        }
      }
      setStatus("success");
      setToast("Design publié avec succès sur le menu client !");
      console.log("SUCCESS");
      window.setTimeout(() => setStatus("idle"), 1600);
    } catch (e) {
      setStatus("error");
      setToast(String((e as any)?.message || "Erreur de sauvegarde."));
    }
  };

  const backgroundLayers = [config.globalStyle.backgroundImage ? `url("${config.globalStyle.backgroundImage}")` : "", config.globalStyle.backgroundGradient || ""].filter(Boolean);
  const selectedDishData = dishById.get(dishId) || null;
  const selectedPreviewLabel = dishList.find((d) => d.id === dishId)?.label || "";
  const previewDishName = selectedPreviewLabel || "Bière blonde";
  const selectedDishName = selectedPreviewLabel || "Plat";
  const previewDescription = String(selectedDishData?.description_fr || selectedDishData?.description || "").trim() || "Description du plat";
  const previewPrice = asNumber(selectedDishData?.formula_price ?? selectedDishData?.price, 12.9);
  const previewPriceLabel = `${previewPrice.toFixed(2)} €`;
  const previewPromoPriceRaw = asNumber(selectedDishData?.promo_price, 0);
  const previewPromoEnabled =
    Boolean((selectedDishData as any)?.dish_on_promo ?? (selectedDishData as any)?.is_promo) &&
    Number.isFinite(previewPromoPriceRaw) &&
    previewPromoPriceRaw > 0;
  const previewPromoPrice = previewPromoEnabled ? previewPromoPriceRaw : null;
  const previewImage = String(selectedDishData?.image_url || "").trim();
  const previewCalories = asNumber(selectedDishData?.calories ?? selectedDishData?.calories_min, 0);
  const hunger = parseHungerLevels(selectedDishData?.hunger_levels ?? selectedDishData?.hunger_level);
  const previewBadges = [
    ...(hunger.small ? ["Petite faim"] : []),
    ...(hunger.medium ? ["Moyenne faim"] : []),
    ...(hunger.large ? ["Grande faim"] : []),
    ...(previewCalories > 0 ? [`${Math.round(previewCalories)} kcal`] : []),
  ];
  const previewBadgeLabels = previewBadges.length > 0 ? previewBadges : ["Petite faim", "45 kcal"];
  useEffect(() => {
    let cancelled = false;
    const source = String(previewImage || config.globalStyle.backgroundImage || PREVIEW_IMAGE_SRC).trim();
    void extractSuggestedColors(source, 5).then((palette) => {
      if (!cancelled) setSuggestedColors(palette);
    });
    return () => {
      cancelled = true;
    };
  }, [previewImage, config.globalStyle.backgroundImage]);
  const previewHasSplitPromo =
    Boolean(previewPromoPrice != null) &&
    Number.isFinite(previewPromoPrice) &&
    Number(previewPromoPrice) > 0 &&
    Number(previewPrice) > 0 &&
    Number(previewPromoPrice) < Number(previewPrice);
  const managerCanvasLayout = useMemo(() => {
    if (config.layoutToken !== "overlay") return config;
    return {
      ...config,
      elements: {
        ...config.elements,
        name: { ...config.elements.name, visible: false },
        price: { ...config.elements.price, visible: false },
        description: { ...config.elements.description, visible: false },
        badges: { ...config.elements.badges, visible: false },
        addToCartButton: { ...config.elements.addToCartButton, visible: false },
        viewDetailsButton: { ...config.elements.viewDetailsButton, visible: false },
      },
      decorations: [],
    };
  }, [config]);
  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-x-hidden overflow-y-hidden bg-white">
      <div className="mx-5 mb-4 mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">Appliquer ce design à</span>
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
            <button type="button" onClick={() => setScope("global")} className={`rounded-md px-3 py-1.5 text-xs font-black ${scope === "global" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>Tous les plats (global)</button>
            <button type="button" onClick={() => setScope("dish")} disabled={dishList.length === 0} className={`rounded-md px-3 py-1.5 text-xs font-black ${scope === "dish" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"} disabled:opacity-50`}>Plat spécifique</button>
          </div>
          {scope === "dish" ? (
            <select value={dishId} onChange={(e) => setDishId(e.target.value)} className="min-w-[220px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              {dishList.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          ) : null}
          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700">
            <input type="checkbox" checked={snapEnabled} onChange={(e) => setSnapEnabled(e.target.checked)} />
            Magnétisme (grille {SNAP_GRID}px)
          </label>
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-500">{scope === "global" ? "Ce design sera appliqué à tous les plats du restaurant." : `Vous modifiez le design du plat "${selectedDishName}".`}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className={`text-xs font-bold ${collidedItemIds.size > 0 ? "text-red-600" : "text-emerald-700"}`}>
            {collidedItemIds.size > 0
              ? "Une collision a été détectée. Veuillez ajuster les éléments encadrés en rouge."
              : "Aucune collision détectée."}
          </span>
        </div>
      </div>

      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-5 overflow-hidden px-5 pb-5 xl:grid-cols-[350px_minmax(0,1fr)]">
        <div
          className="flex h-full min-h-0 max-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4"
          style={{ maxHeight: "calc(100vh - 150px)" }}
        >
          <div className="sticky top-0 z-20 -mx-1 mb-3 bg-slate-50 px-1 pb-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={status === "saving" || loadingLayout}
              className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-slate-700 disabled:opacity-60"
            >
              {status === "saving" ? "Publication..." : "Sauvegarder le design"}
            </button>
          </div>
          <div className="mb-3 flex gap-2 rounded-xl bg-white p-1 shadow-sm">
            <button type="button" onClick={() => setTab("global")} className={`flex-1 rounded-lg px-3 py-2 text-xs font-black ${tab === "global" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>Style global</button>
            <button type="button" onClick={() => setTab("elements")} className={`flex-1 rounded-lg px-3 py-2 text-xs font-black ${tab === "elements" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>Éléments</button>
          </div>
          <div className="min-h-0 h-full flex-1 overflow-y-auto overscroll-contain pr-1 pb-20" style={{ maxHeight: "calc(100vh - 150px)" }}>
          {tab === "global" ? (
            <div className="space-y-3">
              <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Templates rapides</label>
              <div className="grid grid-cols-1 gap-2">
                {TEMPLATE_KEYS.map((t) => (
                  <button key={t.key} type="button" onClick={() => { const next = buildTemplate(t.key); setConfig(next); refreshCanvas(); setSelection({ kind: "element", key: "name" }); setTab("elements"); setToast(`Modèle "${t.label}" appliqué.`); }} className={`rounded-xl border px-3 py-2 text-left text-xs font-black ${config.layoutToken === t.key ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Ma bibliothèque</label>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={libraryName}
                    onChange={(e) => setLibraryName(e.target.value)}
                    placeholder="Nom du modèle (ex: Design Été)"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveToLibrary()}
                    disabled={librarySaving}
                    className="rounded-xl border border-slate-300 bg-slate-900 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                  >
                    {librarySaving ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
                <div className="mt-3 max-h-40 space-y-2 overflow-auto pr-1">
                  {libraryLoading ? (
                    <p className="text-xs font-semibold text-slate-500">Chargement...</p>
                  ) : savedLayouts.length === 0 ? (
                    <p className="text-xs font-semibold text-slate-500">Aucun modèle sauvegardé.</p>
                  ) : (
                    savedLayouts.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
                        <span className="truncate text-xs font-bold text-slate-700">{item.name}</span>
                        <button
                          type="button"
                          onClick={() => applySavedLayout(item)}
                          className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-800 hover:bg-slate-200"
                        >
                          Appliquer
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Arrière-plan</label>
                <select
                  value={backgroundFillMode}
                  onChange={(e) => {
                    const mode = e.target.value as BackgroundFillMode;
                    setBackgroundFillMode(mode);
                    applyBackgroundControls(mode, backgroundColorA, backgroundColorB);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  <option value="solid">Couleur unie</option>
                  <option value="vertical">Dégradé vertical</option>
                  <option value="horizontal">Dégradé horizontal</option>
                </select>
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Couleurs suggérées</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {suggestedColors.map((color) => (
                      <button
                        key={`global-suggestion-${color}`}
                        type="button"
                        title={`Appliquer ${color}`}
                        onClick={() => {
                          setBackgroundColorA(color);
                          applyBackgroundControls(backgroundFillMode, color, backgroundColorB);
                        }}
                        className="h-6 w-6 rounded-full border border-slate-300 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                {backgroundFillMode === "solid" ? (
                  <div className="grid grid-cols-[auto_1fr] items-center gap-2">
                    <input
                      type="color"
                      value={config.globalStyle.backgroundColor}
                      onChange={(e) => {
                        const color = e.target.value;
                        setBackgroundColorA(color);
                        setConfig((prev) => ({
                          ...prev,
                          globalStyle: { ...prev.globalStyle, backgroundColor: color, backgroundGradient: null },
                        }));
                      }}
                      className="h-10 w-12 rounded-xl border border-slate-300 bg-white p-1"
                    />
                    <span className="text-xs font-semibold text-slate-600">{config.globalStyle.backgroundColor}</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1 text-xs font-bold text-slate-600">
                      <span>Couleur A</span>
                      <input
                        type="color"
                        value={backgroundColorA}
                        onChange={(e) => {
                          const color = e.target.value;
                          setBackgroundColorA(color);
                          applyBackgroundControls(backgroundFillMode, color, backgroundColorB);
                        }}
                        className="h-10 w-full rounded-xl border border-slate-300 bg-white p-1"
                      />
                    </label>
                    <label className="space-y-1 text-xs font-bold text-slate-600">
                      <span>Couleur B</span>
                      <input
                        type="color"
                        value={backgroundColorB}
                        onChange={(e) => {
                          const color = e.target.value;
                          setBackgroundColorB(color);
                          applyBackgroundControls(backgroundFillMode, backgroundColorA, color);
                        }}
                        className="h-10 w-full rounded-xl border border-slate-300 bg-white p-1"
                      />
                    </label>
                  </div>
                )}
                <p className="text-[11px] font-semibold text-slate-500">
                  Le dégradé est généré automatiquement pour vous.
                </p>
              </div>
              <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Arrondi {Math.round(config.globalStyle.borderRadius)}px</label>
              <input type="range" min={0} max={60} value={config.globalStyle.borderRadius} onChange={(e) => setConfig((prev) => ({ ...prev, globalStyle: { ...prev.globalStyle, borderRadius: Number(e.target.value || prev.globalStyle.borderRadius) } }))} className="w-full" />
              <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Opacité {Math.round(config.globalStyle.opacity * 100)}%</label>
              <input type="range" min={0.2} max={1} step={0.01} value={config.globalStyle.opacity} onChange={(e) => setConfig((prev) => ({ ...prev, globalStyle: { ...prev.globalStyle, opacity: Number(e.target.value || prev.globalStyle.opacity) } }))} className="w-full" />
              <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Contour carte {Math.round(config.globalStyle.borderWidth)}px</label>
              <input type="range" min={0} max={12} step={1} value={config.globalStyle.borderWidth} onChange={(e) => setConfig((prev) => ({ ...prev, globalStyle: { ...prev.globalStyle, borderWidth: Number(e.target.value || prev.globalStyle.borderWidth) } }))} className="w-full" />
              <select value={config.globalStyle.borderStyle} onChange={(e) => setConfig((prev) => ({ ...prev, globalStyle: { ...prev.globalStyle, borderStyle: e.target.value as any } }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                <option value="solid">Continu</option>
                <option value="dashed">Pointillés</option>
                <option value="double">Double</option>
              </select>
              <input type="color" value={config.globalStyle.borderColor} onChange={(e) => setConfig((prev) => ({ ...prev, globalStyle: { ...prev.globalStyle, borderColor: e.target.value } }))} className="h-10 w-full rounded-xl border border-slate-300 bg-white p-1" />
              <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Ombre</label>
              <select value={config.globalStyle.shadowPreset} onChange={(e) => setConfig((prev) => ({ ...prev, globalStyle: { ...prev.globalStyle, shadowPreset: e.target.value as any } }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                <option value="none">Aucune</option><option value="soft">Douce</option><option value="strong">Marquée</option><option value="glass">Glass</option>
              </select>
              <div className="flex gap-2">
                <button type="button" onClick={() => bgRef.current?.click()} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">Upload fond</button>
                <button type="button" onClick={() => setConfig((prev) => ({ ...prev, globalStyle: { ...prev.globalStyle, backgroundImage: null } }))} className="rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-black text-red-700 hover:bg-red-50">Effacer</button>
                <input ref={bgRef} type="file" accept="image/png,image/jpeg,image/webp,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const reader = new FileReader(); reader.onload = () => setConfig((prev) => ({ ...prev, globalStyle: { ...prev.globalStyle, backgroundImage: String(reader.result || "").trim() || null } })); reader.readAsDataURL(f); e.currentTarget.value = ""; }} />
              </div>
              <label className="flex items-center justify-between text-sm font-bold text-slate-700">
                <span>Dégradé de lisibilité Overlay</span>
                <input
                  type="checkbox"
                  checked={Boolean(config.globalStyle.overlayTextGradient)}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      globalStyle: {
                        ...prev.globalStyle,
                        overlayTextGradient: e.target.checked
                          ? prev.globalStyle.overlayTextGradient || "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.68) 58%, rgba(0,0,0,0.9) 100%)"
                          : null,
                      },
                    }))
                  }
                />
              </label>
              {config.globalStyle.overlayTextGradient ? (
                <>
                  <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Hauteur overlay {Math.round(config.globalStyle.overlayTextGradientHeight)}px
                  </label>
                  <input
                    type="range"
                    min={80}
                    max={420}
                    value={config.globalStyle.overlayTextGradientHeight}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        globalStyle: {
                          ...prev.globalStyle,
                          overlayTextGradientHeight: Number(e.target.value || prev.globalStyle.overlayTextGradientHeight),
                        },
                      }))
                    }
                    className="w-full"
                  />
                </>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                {ELEMENT_KEYS.map((k) => (
                  <button key={k} type="button" onClick={() => setSelection({ kind: "element", key: k })} className={`rounded-lg border px-3 py-2 text-left text-xs font-black ${selection.kind === "element" && selection.key === k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}>{ELEMENT_LABELS[k]}</button>
                ))}
              </div>
              <button type="button" onClick={() => decoRef.current?.click()} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">Ajouter une image déco</button>
              <input ref={decoRef} type="file" accept="image/png,image/jpeg,image/webp,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const reader = new FileReader(); reader.onload = () => setConfig((prev) => ({ ...prev, decorations: [...prev.decorations, { id: uid(), src: String(reader.result || "").trim(), visible: true, locked: false, position: { x: 24, y: 24 }, size: { width: 84, height: 84 }, opacity: 1, zIndex: 16, borderRadius: 10 }] })); reader.readAsDataURL(f); e.currentTarget.value = ""; }} />
              {selected ? (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                  <label className="flex items-center justify-between text-sm font-bold text-slate-700"><span>Visible</span><input type="checkbox" checked={Boolean(selected.visible)} onChange={(e) => selection.kind === "element" ? setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], visible: e.target.checked } } })) : setConfig((prev) => ({ ...prev, decorations: prev.decorations.map((x) => x.id === selection.id ? { ...x, visible: e.target.checked } : x) }))} /></label>
                  <label className="flex items-center justify-between text-sm font-bold text-slate-700">
                    <span>{selection.kind === "element" ? "Cadenas élément" : "Cadenas déco"}</span>
                    <button
                      type="button"
                      onClick={() =>
                        selection.kind === "element"
                          ? setConfig((prev) => ({
                              ...prev,
                              elements: {
                                ...prev.elements,
                                [selection.key]: {
                                  ...prev.elements[selection.key],
                                  locked: !prev.elements[selection.key].locked,
                                },
                              },
                            }))
                          : setConfig((prev) => ({
                              ...prev,
                              decorations: prev.decorations.map((x) =>
                                x.id === selection.id ? { ...x, locked: !x.locked } : x
                              ),
                            }))
                      }
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-100"
                    >
                      {Boolean((selected as any).locked) ? "🔒 Verrouillé" : "🔓 Déverrouillé"}
                    </button>
                  </label>
                  <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Couches{" "}
                    {selection.kind === "element"
                      ? `(actuelle: ${Math.round(selected.style.zIndex || 0)})`
                      : `(actuelle: ${Math.round((selected as DecorationConfig).zIndex || 0)})`}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectionLayerBoundary("front")}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-100"
                    >
                      ⬆️ Premier plan
                    </button>
                    <button
                      type="button"
                      onClick={() => shiftSelectionLayer(1)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-100"
                    >
                      🔼 Avancer
                    </button>
                    <button
                      type="button"
                      onClick={() => shiftSelectionLayer(-1)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-100"
                    >
                      🔽 Reculer
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectionLayerBoundary("back")}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-100"
                    >
                      ⬇️ Arrière-plan
                    </button>
                  </div>
                  {selection.kind === "element" ? (
                    <>
                      <select value={selected.style.fontFamily} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, fontFamily: e.target.value } } } }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">{FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}</select>
                      <input type="color" value={selected.style.color} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, color: e.target.value } } } }))} className="h-10 w-full rounded-xl border border-slate-300 bg-white p-1" />
                      <select value={selected.style.fontWeight} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, fontWeight: e.target.value } } } }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><option value="400">400</option><option value="500">500</option><option value="700">700</option><option value="900">900</option></select>
                      <select value={selected.style.textAlign} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, textAlign: e.target.value as any } } } }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option></select>
                      <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Opacité {Math.round(selected.style.opacity * 100)}%</label>
                      <input type="range" min={0.1} max={1} step={0.01} value={selected.style.opacity} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, opacity: Number(e.target.value || selected.style.opacity) } } } }))} className="w-full" />
                      <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Espacement des lettres {Number(selected.style.letterSpacing || 0).toFixed(1)}px</label>
                      <input type="range" min={-2} max={20} step={0.1} value={selected.style.letterSpacing || 0} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, letterSpacing: Number(e.target.value || 0) } } } }))} className="w-full" />
                      <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Hauteur de ligne {Number(selected.style.lineHeight || 1.25).toFixed(2)}</label>
                      <input type="range" min={0.8} max={2.4} step={0.05} value={selected.style.lineHeight || 1.25} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, lineHeight: Number(e.target.value || 1.25) } } } }))} className="w-full" />
                      <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Ombre du texte</label>
                      <input type="text" value={selected.style.textShadow || ""} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, textShadow: e.target.value } } } }))} placeholder="0 2px 12px rgba(0,0,0,0.45)" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700" />
                      <label className="flex items-center justify-between text-sm font-bold text-slate-700"><span>Effet verre dépoli</span><input type="checkbox" checked={Boolean(selected.style.glassmorphism)} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, glassmorphism: e.target.checked } } } }))} /></label>
                      <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Flou (rayon de l'ombre) {Math.round(selected.style.backdropBlur || 10)}px</label>
                      <input type="range" min={0} max={30} step={1} value={selected.style.backdropBlur || 10} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, backdropBlur: Number(e.target.value || 10) } } } }))} className="w-full" />
                      <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Arrière-plan de l'élément</label>
                      <input type="color" value={selected.style.backgroundColor || "#ffffff"} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, backgroundColor: e.target.value } } } }))} className="h-10 w-full rounded-xl border border-slate-300 bg-white p-1" />
                      <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Bordure {Math.round(selected.style.borderWidth || 0)}px</label>
                      <input type="range" min={0} max={12} step={1} value={selected.style.borderWidth || 0} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, borderWidth: Number(e.target.value || 0) } } } }))} className="w-full" />
                      <select value={selected.style.borderStyle || "solid"} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, borderStyle: e.target.value as any } } } }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><option value="solid">Continu</option><option value="dashed">Pointillés</option><option value="dotted">Point fin</option></select>
                      <input type="color" value={selected.style.borderColor || "#111111"} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, borderColor: e.target.value } } } }))} className="h-10 w-full rounded-xl border border-slate-300 bg-white p-1" />
                      <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Coins indépendants</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" min={0} max={120} value={selected.style.borderTopLeftRadius ?? selected.style.borderRadius ?? 0} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, borderTopLeftRadius: Number(e.target.value || 0) } } } }))} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold" />
                        <input type="number" min={0} max={120} value={selected.style.borderTopRightRadius ?? selected.style.borderRadius ?? 0} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, borderTopRightRadius: Number(e.target.value || 0) } } } }))} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold" />
                        <input type="number" min={0} max={120} value={selected.style.borderBottomLeftRadius ?? selected.style.borderRadius ?? 0} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, borderBottomLeftRadius: Number(e.target.value || 0) } } } }))} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold" />
                        <input type="number" min={0} max={120} value={selected.style.borderBottomRightRadius ?? selected.style.borderRadius ?? 0} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, borderBottomRightRadius: Number(e.target.value || 0) } } } }))} className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold" />
                      </div>
                      {selection.key === "image" ? (
                        <>
                          <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Ajustement de l'image</label>
                          <select value={selected.style.objectFit || "cover"} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, objectFit: e.target.value as any } } } }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><option value="cover">Recouvrir</option><option value="contain">Contenir</option><option value="fill">Remplir</option></select>
                          <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Luminosité {(selected.style.brightness || 1).toFixed(2)}</label>
                          <input type="range" min={0.3} max={1.8} step={0.01} value={selected.style.brightness || 1} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, brightness: Number(e.target.value || 1) } } } }))} className="w-full" />
                          <label className="block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Contraste {(selected.style.contrast || 1).toFixed(2)}</label>
                          <input type="range" min={0.3} max={1.8} step={0.01} value={selected.style.contrast || 1} onChange={(e) => setConfig((prev) => ({ ...prev, elements: { ...prev.elements, [selection.key]: { ...prev.elements[selection.key], style: { ...prev.elements[selection.key].style, contrast: Number(e.target.value || 1) } } } }))} className="w-full" />
                        </>
                      ) : null}
                      <p className="text-[11px] font-semibold text-slate-500">La taille de police se règle via les poignées de redimensionnement du canvas.</p>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-[#eef2f6] p-4">
          <div className="flex h-full w-full min-h-0 flex-col rounded-xl border border-slate-200 bg-[radial-gradient(circle_at_1px_1px,_rgba(15,23,42,0.14)_1px,_transparent_0)] bg-[length:16px_16px] p-4">
            <div className="mb-3 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setPreviewZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))} className="h-8 w-8 rounded-lg border border-slate-300 bg-white text-sm font-black text-slate-700 hover:bg-slate-100">-</button>
              <span className="min-w-[70px] text-center text-xs font-black text-slate-600">{Math.round(previewZoom * 100)}%</span>
              <button type="button" onClick={() => setPreviewZoom((z) => Math.min(1.8, Number((z + 0.1).toFixed(2))))} className="h-8 w-8 rounded-lg border border-slate-300 bg-white text-sm font-black text-slate-700 hover:bg-slate-100">+</button>
            </div>
            <div ref={previewViewportRef} className="mx-auto flex h-full w-full min-h-0 flex-1 items-center justify-center overflow-hidden">
              <div id="phone-simulator-wrapper" style={{ transform: `scale(${effectivePreviewScale})`, transformOrigin: "center center" }}>
                <div className="mx-auto w-[420px] max-w-full rounded-[36px] bg-slate-900 p-[10px] shadow-[0_20px_45px_rgba(15,23,42,0.35)]">
                  <div className="rounded-[28px] bg-slate-100 p-3">
                    <div className="mx-auto h-5 w-28 rounded-b-2xl bg-slate-900" />
                    <div className="mt-2 overflow-visible">
                      <div key={`canvas-${canvasVersion}`} ref={canvasRef} className="relative mx-auto" style={{ width: config.canvas.width, height: runtimeCanvasHeight, borderRadius: config.globalStyle.borderRadius, backgroundColor: config.globalStyle.backgroundColor, backgroundImage: backgroundLayers.join(", "), backgroundSize: config.globalStyle.backgroundImage ? "cover, auto" : undefined, backgroundPosition: config.globalStyle.backgroundImage ? "center center, center center" : undefined, boxShadow: shadowCss(config.globalStyle.shadowPreset), opacity: config.globalStyle.opacity, overflow: "hidden", borderWidth: config.globalStyle.borderWidth, borderStyle: config.globalStyle.borderStyle, borderColor: config.globalStyle.borderColor }}>
                        <div className="pointer-events-none absolute inset-0 z-[2]">
                          <UnifiedDishCardLayout
                            layout={managerCanvasLayout as any}
                            dishName={previewDishName}
                            description={previewDescription}
                            imageUrl={previewImage || PREVIEW_IMAGE_SRC}
                            badges={previewBadgeLabels}
                            basePrice={previewPrice}
                            promoPrice={previewPromoPrice}
                            addToCartLabel="Ajouter au panier"
                            viewDetailsLabel="Voir détails"
                            interactive={false}
                            overlayBadgeLift={24}
                          />
                        </div>
                        {config.layoutToken === "bicolor" ? <div className="absolute inset-x-0 bottom-0" style={{ height: Math.round(runtimeCanvasHeight * 0.42), background: "linear-gradient(180deg,#f8fafc 0%, #e9edf2 100%)", zIndex: 1 }} /> : null}
                        {config.globalStyle.overlayTextGradient ? <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: config.globalStyle.overlayTextGradientHeight, background: config.globalStyle.overlayTextGradient, zIndex: 10 }} /> : null}
                        {guides.x != null ? <div className="pointer-events-none absolute top-0 bottom-0 w-px bg-cyan-400/90" style={{ left: guides.x, zIndex: 98 }} /> : null}
                        {guides.y != null ? <div className="pointer-events-none absolute left-0 right-0 h-px bg-red-400/90" style={{ top: guides.y, zIndex: 98 }} /> : null}
                        {ELEMENT_KEYS.map((key) => {
                          const element = config.elements[key];
                          if (!element.visible) return null;
                          const isSelected = selection.kind === "element" && selection.key === key;
                          const isLocked = Boolean(element.locked);
                          const overlayInteractionZ =
                            config.layoutToken === "overlay"
                              ? key === "image"
                                ? 0
                                : Math.max(50, Number(element.style.zIndex || 0))
                              : Number(element.style.zIndex || 0);
                          const isColliding = collidedItemIds.has(`element:${key}`);
                          const isHovered = hoveredItemId === `element:${key}`;
                          const isAction = key === "addToCartButton" || key === "viewDetailsButton";
                          const isOverlayEditor = config.layoutToken === "overlay";
                          const showLiveContent = isOverlayEditor && key !== "image";
                          const contentText =
                            key === "name"
                              ? previewDishName
                              : key === "price"
                                ? previewPriceLabel
                                : key === "description"
                                  ? previewDescription
                                  : key === "addToCartButton"
                                    ? "Ajouter au panier"
                                    : key === "viewDetailsButton"
                                      ? "Voir détails"
                                      : "";
                          const fittedTextSize = contentText ? autoFitFontSize(contentText, element, isAction ? 9 : 8, isAction) : element.style.fontSize;
                          const previewBody =
                            key === "name" ? (
                              <div className="pointer-events-none h-full w-full" style={textStyle(element, fittedTextSize)}>
                                {previewDishName}
                              </div>
                            ) : key === "price" ? (
                              <div
                                className="pointer-events-none h-full w-full"
                                style={{
                                  ...textStyle(element, fittedTextSize),
                                  width: "max-content",
                                  maxWidth: "100%",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  overflow: "visible",
                                  textOverflow: "clip",
                                  whiteSpace: "nowrap",
                                  borderRadius: 0,
                                  borderTopLeftRadius: 0,
                                  borderTopRightRadius: 0,
                                  borderBottomRightRadius: 0,
                                  borderBottomLeftRadius: 0,
                                }}
                              >
                                {previewHasSplitPromo ? (
                                  <div
                                    className="inline-flex w-fit items-center gap-1 whitespace-nowrap"
                                    style={config.layoutToken === "overlay" ? { fontSize: "85%" } : undefined}
                                  >
                                    <span className="text-[11px] font-bold line-through opacity-75">{Number(previewPrice || 0).toFixed(2)} €</span>
                                    <span className="inline-flex items-center rounded border border-[#ff2d00] bg-[rgba(255,45,0,0.1)] px-1.5 py-0.5 text-sm font-black leading-none text-[#ff2d00]">
                                      {Number(previewPromoPrice || 0).toFixed(2)} €
                                    </span>
                                  </div>
                                ) : previewPromoEnabled ? (
                                  <span
                                    className="inline-flex items-center rounded border border-[#ff2d00] bg-[rgba(255,45,0,0.1)] px-1.5 py-0.5 text-sm font-black leading-none text-[#ff2d00]"
                                    style={config.layoutToken === "overlay" ? { fontSize: "85%" } : undefined}
                                  >
                                    {Number(previewPromoPrice || 0).toFixed(2)} €
                                  </span>
                                ) : (
                                  <span>{previewPriceLabel}</span>
                                )}
                              </div>
                            ) : key === "description" ? (
                              <div className="pointer-events-none h-full w-full" style={textStyle(element, fittedTextSize)}>
                                {previewDescription}
                              </div>
                            ) : key === "badges" ? (
                              <div className="pointer-events-none flex h-full w-full flex-wrap content-start items-start gap-1.5 overflow-hidden p-1.5">
                                {previewBadgeLabels.map((badge, idx) => (
                                  <span
                                    key={`${badge}-${idx}`}
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black ${
                                      String(badge).toLowerCase().includes("promo")
                                        ? "border-[#ff2d00] bg-[rgba(255,45,0,0.12)] text-[#c21807]"
                                        : "border-slate-300 bg-white/95 text-black"
                                    }`}
                                  >
                                    {badge}
                                  </span>
                                ))}
                              </div>
                            ) : key === "addToCartButton" ? (
                              <div
                                className="pointer-events-none h-full w-full"
                                style={{ ...actionStyle(element, true, fittedTextSize), minHeight: 0, height: "100%", width: "100%" }}
                              >
                                Ajouter au panier
                              </div>
                            ) : key === "viewDetailsButton" ? (
                              <div
                                className="pointer-events-none h-full w-full"
                                style={{ ...actionStyle(element, false, fittedTextSize), minHeight: 0, height: "100%", width: "100%" }}
                              >
                                Voir détails
                              </div>
                            ) : key === "image" ? (
                              <img
                                src={previewImage || PREVIEW_IMAGE_SRC}
                                alt=""
                                className="pointer-events-none h-full w-full object-cover"
                                style={{ borderRadius: Number(element.style.borderRadius || 0), filter: elementFilter(element) }}
                              />
                            ) : null;
                          const content = (
                            <div
                              className="relative h-full w-full select-none border border-dashed"
                              style={{
                                borderColor: isSelected ? "rgba(15,23,42,0.65)" : isHovered ? "rgba(71,85,105,0.5)" : "rgba(148,163,184,0.35)",
                                background: isSelected ? "rgba(255,255,255,0.08)" : "transparent",
                              }}
                            >
                              {showLiveContent ? <div className="pointer-events-none absolute inset-0">{previewBody}</div> : null}
                              {isSelected || isHovered ? (
                                <span className="absolute left-1.5 top-1.5 rounded bg-slate-900/85 px-1.5 py-0.5 text-[10px] font-black text-white">
                                  {ELEMENT_LABELS[key]}
                                </span>
                              ) : null}
                            </div>
                          );

                          return (
                            <Rnd
                              key={key}
                              scale={effectivePreviewScale}
                              bounds="parent"
                              size={{ width: element.size.width, height: element.size.height }}
                              position={{ x: element.position.x, y: element.position.y }}
                              minWidth={isAction ? 120 : 24}
                              minHeight={isAction ? 44 : 20}
                              disableDragging={isLocked}
                              enableResizing={!isLocked}
                              onDragStart={() => setSelection({ kind: "element", key })}
                              onDrag={(_, data) => onElementDrag(key, data.x, data.y)}
                              onDragStop={(_, data) => onElementDragStop(key, data.x, data.y)}
                              onResizeStart={() => setSelection({ kind: "element", key })}
                              onResizeStop={(_, __, ref, ___, position) =>
                                onElementResizeStop(key, ref.offsetWidth, ref.offsetHeight, position.x, position.y)
                              }
                              style={{
                                zIndex: overlayInteractionZ,
                                pointerEvents:
                                  config.layoutToken === "overlay" && key === "image"
                                    ? "none"
                                    : undefined,
                              }}
                              className={`${isSelected ? "ring-2 ring-slate-900/70" : isHovered ? "ring-1 ring-slate-400/70" : ""} ${isColliding && (isSelected || isHovered) ? "ring-2 ring-red-400/70" : ""}`}
                            >
                              <div
                                className="relative h-full w-full"
                                onMouseDown={() => setSelection({ kind: "element", key })}
                                onMouseEnter={() => setHoveredItemId(`element:${key}`)}
                                onMouseLeave={() => setHoveredItemId((prev) => (prev === `element:${key}` ? null : prev))}
                              >
                                {content}
                              </div>
                            </Rnd>
                          );
                        })}
                        {config.decorations.map((deco) => {
                          if (!deco.visible) return null;
                          const isSelected = selection.kind === "deco" && selection.id === deco.id;
                          const isLocked = Boolean(deco.locked);
                          const isColliding = collidedItemIds.has(`deco:${deco.id}`);
                          const isHovered = hoveredItemId === `deco:${deco.id}`;
                          return (
                            <Rnd
                              key={deco.id}
                              scale={effectivePreviewScale}
                              bounds="parent"
                              size={{ width: deco.size.width, height: deco.size.height }}
                              position={{ x: deco.position.x, y: deco.position.y }}
                              minWidth={16}
                              minHeight={16}
                              disableDragging={isLocked}
                              enableResizing={!isLocked}
                              onDragStart={() => setSelection({ kind: "deco", id: deco.id })}
                              onDrag={(_, data) => onDecorationDrag(deco.id, data.x, data.y)}
                              onDragStop={(_, data) => onDecorationDragStop(deco.id, data.x, data.y)}
                              onResizeStart={() => setSelection({ kind: "deco", id: deco.id })}
                              onResizeStop={(_, __, ref, ___, position) =>
                                onDecorationResizeStop(deco.id, ref.offsetWidth, ref.offsetHeight, position.x, position.y)
                              }
                              style={{ zIndex: deco.zIndex, opacity: deco.opacity }}
                              className={`${isSelected ? "ring-2 ring-slate-900/70" : isHovered ? "ring-1 ring-slate-400/70" : ""} ${isColliding && (isSelected || isHovered) ? "ring-2 ring-red-400/70" : ""}`}
                            >
                              <div
                                className="relative h-full w-full"
                                onMouseDown={() => setSelection({ kind: "deco", id: deco.id })}
                                onMouseEnter={() => setHoveredItemId(`deco:${deco.id}`)}
                                onMouseLeave={() => setHoveredItemId((prev) => (prev === `deco:${deco.id}` ? null : prev))}
                              >
                                <img src={deco.src} alt="" className="h-full w-full object-contain" style={{ borderRadius: deco.borderRadius }} />
                              </div>
                            </Rnd>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast ? <div className={`pointer-events-none absolute right-5 top-5 rounded-xl border px-4 py-2 text-sm font-black shadow-lg ${status === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{toast}</div> : null}
      {loadingLayout ? <div className="pointer-events-none absolute bottom-5 right-5 rounded-lg bg-slate-900/90 px-3 py-2 text-xs font-black text-white">Chargement du design...</div> : null}
    </div>
  );
}