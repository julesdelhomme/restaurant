"use client";

import React from "react";

type ElementLayout = {
  visible?: boolean;
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  zIndex?: number | string;
  position?: { x?: number; y?: number };
  size?: { width?: number; height?: number };
  style?: Record<string, unknown>;
};

type UnifiedDishCardLayoutProps = {
  layout: {
    layoutToken?: string | null;
    canvas?: { width?: number; height?: number };
    globalStyle?: Record<string, unknown>;
    elements?: Record<string, ElementLayout>;
    decorations?: Array<Record<string, unknown>>;
  } | null;
  dishName: string;
  description: string;
  imageUrl?: string | null;
  badges?: Array<
    | string
    | {
        key?: string;
        label?: string;
        type?: string;
      }
  >;
  basePrice: number;
  promoPrice?: number | null;
  addToCartLabel?: string;
  viewDetailsLabel?: string;
  formulaLabel?: string;
  onAddToCart?: () => void;
  onViewDetails?: () => void;
  onViewFormula?: () => void;
  onCardClick?: () => void;
  interactive?: boolean;
  showFormulaButton?: boolean;
  overlayBadgeLift?: number;
  forcedLayoutToken?: string | null;
  className?: string;
};

const num = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const parseObj = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
};

const str = (value: unknown, fallback = "") => {
  const s = String(value ?? "").trim();
  return s || fallback;
};

const bool = (value: unknown, fallback = true) => {
  if (value == null) return fallback;
  return Boolean(value);
};

const op = (value: unknown, fallback = 1) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const normalized = n > 1 ? n / 100 : n;
  return Math.max(0, Math.min(1, normalized));
};

const colorOr = (value: unknown, fallback: string) =>
  /^#[0-9A-Fa-f]{6}$/.test(String(value || "").trim()) ? String(value).trim() : fallback;

const resolveShadow = (preset: string) => {
  if (preset === "soft") return "0 18px 35px rgba(15,23,42,0.16)";
  if (preset === "strong") return "0 22px 48px rgba(15,23,42,0.32)";
  if (preset === "glass") return "0 18px 40px rgba(14,116,144,0.22), inset 0 1px 0 rgba(255,255,255,0.5)";
  return "none";
};

const normalizeLayoutToken = (raw: unknown): "overlay" | "standard" | "bicolor" => {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "overlay" || value === "grid_overlay") return "overlay";
  if (value === "bicolor" || value === "modern_bicolor" || value === "minimal" || value === "minimalist") return "bicolor";
  return "standard";
};

const isLightColor = (raw: unknown) => {
  const hex = String(raw || "").trim().toLowerCase();
  const match = hex.match(/^#([0-9a-f]{6})$/i);
  if (!match) return false;
  const n = parseInt(match[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance >= 0.78;
};

const resolveInlineTextColor = (
  explicitColor: unknown,
  layoutMode: "overlay" | "standard" | "bicolor",
  cardBackgroundColor: unknown
) => {
  const parsed = colorOr(explicitColor, "");
  if (parsed) return parsed;
  if (layoutMode === "standard") return "#1a1a1a";
  if (layoutMode === "bicolor" && isLightColor(cardBackgroundColor)) return "#1a1a1a";
  if (isLightColor(cardBackgroundColor)) return "#1a1a1a";
  if (layoutMode === "bicolor") return "#1a1a1a";
  return "#ffffff";
};

const elementStyleValue = (element: ElementLayout | null | undefined, key: string, fallback?: unknown) => {
  const style = (element?.style || {}) as Record<string, unknown>;
  const styleValue = style[key];
  if (styleValue != null && String(styleValue).trim() !== "") return styleValue;
  const direct = (element as any)?.[key];
  if (direct != null && String(direct).trim() !== "") return direct;
  return fallback;
};

const readElementColor = (element: ElementLayout | null | undefined): unknown =>
  elementStyleValue(element, "color", elementStyleValue(element, "textColor", null));

const toKebabCase = (value: string) => value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);

const applyImportantInlineStyles = (node: HTMLElement | null, style: React.CSSProperties) => {
  if (!node) return;
  Object.entries(style).forEach(([key, value]) => {
    if (value == null) return;
    if (typeof value === "object") return;
    node.style.setProperty(toKebabCase(key), String(value), "important");
  });
};

const cssLength = (value: unknown, fallback: number | string): number | string => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return fallback;
    if (/^-?\d+(\.\d+)?%$/.test(raw)) return raw;
    if (/^-?\d+(\.\d+)?px$/.test(raw)) return raw;
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
};

const px = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  if (/^-?\d+(\.\d+)?px$/.test(raw)) return Number(raw.replace("px", ""));
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

const clampNum = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const calcSingleLineFontPx = (baseFontPx: number, boxWidthPx: number, text: string, minPx = 9) => {
  const content = String(text || "").trim();
  if (!content) return baseFontPx;
  const approxByWidth = boxWidthPx / Math.max(1, content.length * 0.6);
  return Math.round(clampNum(Math.min(baseFontPx, approxByWidth), minPx, baseFontPx));
};

const calcMultiLineFontPx = (
  baseFontPx: number,
  boxWidthPx: number,
  boxHeightPx: number,
  baseLineHeight: number,
  text: string,
  minPx = 10
) => {
  const content = String(text || "").trim();
  if (!content) return baseFontPx;
  const safeLineHeight = Math.max(1.05, baseLineHeight || 1.25);
  const maxLines = Math.max(1, Math.floor(boxHeightPx / Math.max(1, baseFontPx * safeLineHeight)));
  const approxCharsPerLine = Math.max(1, Math.floor(boxWidthPx / Math.max(1, baseFontPx * 0.55)));
  const totalCapacity = maxLines * approxCharsPerLine;
  if (content.length <= totalCapacity) return baseFontPx;
  const shrinkRatio = totalCapacity / Math.max(1, content.length);
  return Math.round(clampNum(Math.floor(baseFontPx * Math.max(0.7, shrinkRatio)), minPx, baseFontPx));
};

const frameStyle = (
  element: ElementLayout,
  defaults: { width: number; height: number },
  defaultZIndex = 10
): React.CSSProperties => {
  const pos = element?.position || {};
  const size = element?.size || {};
  const x = (element as any)?.x ?? pos.x;
  const y = (element as any)?.y ?? pos.y;
  const width = (element as any)?.width ?? size.width;
  const height = (element as any)?.height ?? size.height;
  const zIndex = elementStyleValue(element, "zIndex", defaultZIndex);
  return {
    position: "absolute",
    left: cssLength(x, 0),
    top: cssLength(y, 0),
    width: cssLength(width, defaults.width),
    height: cssLength(height, defaults.height),
    opacity: op(elementStyleValue(element, "opacity", 1), 1),
    zIndex: num(zIndex, defaultZIndex),
    boxSizing: "border-box",
  };
};

const buildElementInlineStyle = (
  element: ElementLayout,
  defaults: { width: number; height: number },
  defaultZIndex: number
): React.CSSProperties => {
  const borderRadius = num(elementStyleValue(element, "borderRadius", 12), 12);
  const borderWidth = num(elementStyleValue(element, "borderWidth", 0), 0);
  const borderStyle = str(elementStyleValue(element, "borderStyle", "solid"), "solid");
  const borderColor = colorOr(elementStyleValue(element, "borderColor", "#111111"), "#111111");
  const backgroundColor = str(elementStyleValue(element, "backgroundColor", ""), "");
  const backgroundGradient = str(elementStyleValue(element, "backgroundGradient", ""), "");
  const explicitColor = str(readElementColor(element), "");
  const explicitBackgroundColor = str(elementStyleValue(element, "backgroundColor", elementStyleValue(element, "bgColor", "")), "");
  const resolvedColor = explicitColor || "#000000";

  return {
    ...frameStyle(element, defaults, defaultZIndex),
    color: resolvedColor,
    backgroundColor: explicitBackgroundColor || backgroundColor || "transparent",
    backgroundImage: backgroundGradient || undefined,
    fontFamily: str(elementStyleValue(element, "fontFamily", "Montserrat"), "Montserrat"),
    fontSize: `${num(elementStyleValue(element, "fontSize", 14), 14)}px`,
    fontWeight: str(elementStyleValue(element, "fontWeight", "700"), "700") as React.CSSProperties["fontWeight"],
    textAlign: str(elementStyleValue(element, "textAlign", "left"), "left") as "left" | "center" | "right",
    opacity: op(elementStyleValue(element, "opacity", 1), 1),
    letterSpacing: `${num(elementStyleValue(element, "letterSpacing", 0), 0)}px`,
    lineHeight: num(elementStyleValue(element, "lineHeight", 1.25), 1.25),
    textShadow: str(elementStyleValue(element, "textShadow", "none"), "none"),
    borderRadius: `${borderRadius}px`,
    border: `${borderWidth}px ${borderStyle} ${borderColor}`,
    borderTopLeftRadius: `${num(elementStyleValue(element, "borderTopLeftRadius", borderRadius), borderRadius)}px`,
    borderTopRightRadius: `${num(elementStyleValue(element, "borderTopRightRadius", borderRadius), borderRadius)}px`,
    borderBottomRightRadius: `${num(elementStyleValue(element, "borderBottomRightRadius", borderRadius), borderRadius)}px`,
    borderBottomLeftRadius: `${num(elementStyleValue(element, "borderBottomLeftRadius", borderRadius), borderRadius)}px`,
    overflow: "hidden",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    padding: 4,
  };
};

type BadgeInput = NonNullable<UnifiedDishCardLayoutProps["badges"]>[number];

const cleanHungerLabel = (raw: string) =>
  String(raw || "")
    .replace(/^(?:app_|app\b)/i, "")
    .trim();

const cleanFormulaLabel = (raw: string) => {
  const cleaned = String(raw || "")
    .replace(/^(?:SET_|set_|SET|set)/i, "")
    .trim();
  return cleaned || "En Formule";
};

const normalizeBadge = (badge: BadgeInput, index: number) => {
  if (typeof badge === "string") {
    const label = String(badge || "").trim();
    const lower = label.toLowerCase();
    const type = lower.includes("kcal")
      ? "calories"
      : lower.includes("piment") || lower.includes("spicy")
        ? "spicy"
        : lower.includes("vég") || lower.includes("veg")
          ? "vegetarian"
          : lower.includes("sans gluten") || lower.includes("gluten")
            ? "gluten_free"
            : lower.includes("suggestion") || lower.includes("chef")
              ? "suggestion"
              : lower.includes("promo")
                ? "promo"
                : lower.includes("formule") || lower.includes("formula")
                  ? "in_formula"
                : lower.includes("faim") || lower.includes("hunger") || lower.startsWith("app_")
                  ? "hunger"
                : "custom";
    const normalizedLabel =
      type === "hunger"
        ? cleanHungerLabel(label)
        : type === "in_formula"
          ? cleanFormulaLabel(label)
          : label;
    return { key: `${type}-${index}`, label: normalizedLabel, type };
  }
  const rawType = String(badge?.type || "").trim().toLowerCase();
  const rawLabel = String(badge?.label || "").trim();
  const lowerLabel = rawLabel.toLowerCase();
  const isHungerType =
    rawType.includes("hunger") ||
    rawType.includes("appetite") ||
    rawType === "app" ||
    lowerLabel.includes("faim") ||
    lowerLabel.includes("hunger") ||
    lowerLabel.startsWith("app_");
  const type = isHungerType ? "hunger" : rawType || "custom";
  return {
    key: String(badge?.key || `${type}-${index}`),
    label:
      type === "hunger"
        ? cleanHungerLabel(rawLabel)
        : type === "in_formula"
          ? cleanFormulaLabel(rawLabel)
          : rawLabel,
    type,
  };
};

const badgeIcon = (type: string) => {
  if (type === "spicy") return "HOT";
  if (type === "vegetarian") return "VEG";
  if (type === "calories") return "KCAL";
  if (type === "suggestion") return "★";
  if (type === "promo") return "%";
  if (type === "gluten_free") return "GF";
  if (type === "in_formula") return "";
  if (type === "hunger") return "";
  return "•";
};

const hungerPalette = (label: string) => {
  const normalized = String(label || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (
    normalized.includes("petite faim") ||
    normalized.includes("small hunger") ||
    normalized.includes("small")
  ) {
    return { background: "#FACC15", color: "#111111", border: "#CA8A04" };
  }
  if (
    normalized.includes("moyenne faim") ||
    normalized.includes("medium hunger") ||
    normalized.includes("medium")
  ) {
    return { background: "#FB923C", color: "#111111", border: "#C2410C" };
  }
  if (
    normalized.includes("grosse faim") ||
    normalized.includes("big hunger") ||
    normalized.includes("large hunger") ||
    normalized.includes("large") ||
    normalized.includes("big")
  ) {
    return { background: "#EF4444", color: "#ffffff", border: "#B91C1C" };
  }
  return { background: "#FB923C", color: "#111111", border: "#C2410C" };
};

export default function UnifiedDishCardLayout({
  layout,
  dishName,
  description,
  imageUrl,
  badges = [],
  basePrice,
  promoPrice = null,
  addToCartLabel = "Ajouter au panier",
  viewDetailsLabel = "Voir détails",
  formulaLabel = "Voir la formule",
  onAddToCart,
  onViewDetails,
  onViewFormula,
  onCardClick,
  interactive = true,
  showFormulaButton = false,
  forcedLayoutToken,
  className = "",
}: UnifiedDishCardLayoutProps) {
  if (!layout) return null;
  const parsedLayout = parseObj(layout as unknown);
  const safeLayout = Object.keys(parsedLayout).length > 0 ? (parsedLayout as unknown as NonNullable<UnifiedDishCardLayoutProps["layout"]>) : layout;

  const styleActuel = safeLayout as any;
  const parsedCardLayout = parseObj(styleActuel?.card_layout);
  const finalLayout = normalizeLayoutToken(
    styleActuel?.resolved || styleActuel?.layoutToken || styleActuel?.layout_token || parsedCardLayout?.layoutToken || "standard"
  );
  const globalStyle = ((safeLayout as any).globalStyle || {}) as Record<string, unknown>;
  const elements = ((safeLayout as any).elements || {}) as Record<string, ElementLayout>;
  const canvas = (safeLayout as any).canvas || {};
  const pickElement = (...keys: string[]): ElementLayout => {
    for (const key of keys) {
      const candidate = elements[key];
      if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) return candidate;
    }
    return {};
  };
  const hasElement = (element: ElementLayout) => Object.keys(element || {}).length > 0;

  const imageEl = pickElement("image");
  const nameEl = pickElement("name", "title", "dishName");
  const priceEl = pickElement("price");
  const descriptionEl = pickElement("description", "desc");
  const badgesEl = pickElement("badges", "badge");
  const addEl = pickElement("addToCartButton", "add_to_cart_button", "addButton");
  const detailsEl = pickElement("viewDetailsButton", "view_details_button", "detailsButton");

  const cardWidth = num(canvas.width, 350);
  const cardHeight = num(canvas.height, 450);
  const safeBasePrice = Number.isFinite(Number(basePrice)) ? Number(basePrice) : 0;
  const safePromoPrice = Number.isFinite(Number(promoPrice)) ? Number(promoPrice) : 0;
  const hasValidPromoPrice = safePromoPrice > 0;
  const hasPromoBadge = badges.some((badge, index) => normalizeBadge(badge as BadgeInput, index).type === "promo");
  const isPromo = hasPromoBadge || hasValidPromoPrice;
  const shouldSplitPromo = hasValidPromoPrice && safeBasePrice > 0 && safePromoPrice < safeBasePrice;

  const cardBackgroundLayers = [
    str(globalStyle.backgroundImage) ? `url("${str(globalStyle.backgroundImage)}")` : "",
    str(globalStyle.backgroundGradient),
  ].filter(Boolean);

  const hasRenderableLayout =
    hasElement(imageEl) ||
    hasElement(nameEl) ||
    hasElement(priceEl) ||
    hasElement(descriptionEl) ||
    hasElement(badgesEl) ||
    hasElement(addEl) ||
    hasElement(detailsEl);

  const fallbackCard = (
    <div
      className={`relative overflow-hidden ${className}`}
      onClick={() => {
        if (!interactive) return;
        onCardClick?.();
      }}
      style={{
        position: "relative",
        width: cardWidth,
        minWidth: cardWidth,
        maxWidth: cardWidth,
        height: cardHeight,
        minHeight: cardHeight,
        maxHeight: cardHeight,
        borderRadius: 20,
        border: "2px solid #111111",
        background: "#ffffff",
      }}
    >
      <div className="h-[58%] w-full overflow-hidden bg-slate-100">
        {imageUrl ? (
          <img src={imageUrl} alt={dishName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-black text-slate-500">Image du plat</div>
        )}
      </div>
      <div className="flex h-[42%] flex-col gap-2 p-3">
        <div className="text-base font-black text-black line-clamp-2">{dishName}</div>
        <div className="text-sm text-slate-600 line-clamp-2">{description}</div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="text-base font-black text-black">
            {hasValidPromoPrice ? safePromoPrice.toFixed(2) : safeBasePrice.toFixed(2)} €
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (!interactive) return;
              onAddToCart?.();
            }}
            className="inline-flex items-center rounded-md border-2 border-black bg-black px-3 py-1.5 text-xs font-black text-white"
          >
            {addToCartLabel}
          </button>
        </div>
      </div>
    </div>
  );

  if (!hasRenderableLayout) return fallbackCard;

  const imageZIndex = finalLayout === "overlay" ? 0 : num((imageEl.style as any)?.zIndex ?? (imageEl as any)?.zIndex, 0);
  const overlayedTextZ = (element: ElementLayout) =>
    Math.max(10, imageZIndex + 1, num((element.style as any)?.zIndex ?? (element as any)?.zIndex, 10));

  const priceNode = shouldSplitPromo ? (
    <div style={{ display: "inline-flex", width: "fit-content", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
      <span style={{ fontSize: "0.68em", fontWeight: 700, textDecoration: "line-through", opacity: 0.7 }}>{safeBasePrice.toFixed(2)} €</span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          border: "1px solid currentColor",
          padding: "2px 6px",
          fontSize: "0.96em",
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        {safePromoPrice.toFixed(2)} €
      </span>
    </div>
  ) : hasValidPromoPrice ? (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid currentColor",
        padding: "2px 6px",
        fontSize: "0.96em",
        fontWeight: 900,
        lineHeight: 1,
      }}
    >
      {safePromoPrice.toFixed(2)} €
    </span>
  ) : (
    <span style={{ fontSize: "0.96em", fontWeight: 900 }}>{safeBasePrice.toFixed(2)} €</span>
  );

  const isOverlay = finalLayout === "overlay";
  const isStandard = finalLayout === "standard";
  const cardBgColor = isStandard ? "#ffffff" : colorOr(globalStyle.backgroundColor, "#ffffff");
  const baseCardShadow = resolveShadow(str(globalStyle.shadowPreset, "soft"));
  const promoCardShadow = "0 0 15px rgba(239, 68, 68, 0.5)";
  const nameInlineStyle = hasElement(nameEl)
    ? buildElementInlineStyle(nameEl, { width: 220, height: 54 }, 10)
    : {};
  const priceInlineStyle = hasElement(priceEl)
    ? buildElementInlineStyle(priceEl, { width: 120, height: 48 }, 10)
    : {};
  const descriptionInlineStyle = hasElement(descriptionEl)
    ? buildElementInlineStyle(descriptionEl, { width: 260, height: 72 }, 10)
    : {};
  const descriptionHeightPx = px(descriptionInlineStyle.height, 72);
  const descriptionFontSizePx = px(descriptionInlineStyle.fontSize, 14);
  const descriptionLineHeight = Number(descriptionInlineStyle.lineHeight) || 1.25;
  const nameHeightPx = px(nameInlineStyle.height, 54);
  const nameWidthPx = px(nameInlineStyle.width, 220);
  const nameFontSizePx = px(nameInlineStyle.fontSize, 14);
  const adjustedNameFontPx = calcSingleLineFontPx(nameFontSizePx, Math.max(40, nameWidthPx - 8), dishName, 9);
  const adjustedNameFontSize = `${adjustedNameFontPx}px`;

  const priceTextForSizing = shouldSplitPromo
    ? `${safeBasePrice.toFixed(2)} € ${safePromoPrice.toFixed(2)} €`
    : `${(hasValidPromoPrice ? safePromoPrice : safeBasePrice).toFixed(2)} €`;
  const priceHeightPx = px(priceInlineStyle.height, 48);
  const priceWidthPx = px(priceInlineStyle.width, 120);
  const priceFontSizePx = px(priceInlineStyle.fontSize, 14);
  const adjustedPriceFontPx = calcSingleLineFontPx(priceFontSizePx, Math.max(40, priceWidthPx - 8), priceTextForSizing, 9);
  const adjustedPriceFontSize = `${adjustedPriceFontPx}px`;
  const descriptionWidthPx = px(descriptionInlineStyle.width, 260);
  const adjustedDescriptionFontPx = calcMultiLineFontPx(
    descriptionFontSizePx,
    Math.max(40, descriptionWidthPx - 8),
    Math.max(20, descriptionHeightPx - 8),
    descriptionLineHeight,
    description,
    10
  );
  const adjustedDescriptionLineHeight = clampNum(descriptionLineHeight - (adjustedDescriptionFontPx < descriptionFontSizePx ? 0.08 : 0), 1.05, 1.35);
  const adjustedDescriptionClampLines = Math.max(
    1,
    Math.floor((Math.max(12, descriptionHeightPx) - 8) / Math.max(10, adjustedDescriptionFontPx * adjustedDescriptionLineHeight))
  );

  const textCageBase: React.CSSProperties = {
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    wordBreak: "break-word",
    textOverflow: "ellipsis"
  };
  const mapTextAlignToAlignItems = (value: unknown): React.CSSProperties["alignItems"] => {
    const textAlign = String(value || "").toLowerCase();
    if (textAlign === "center") return "center";
    if (textAlign === "right") return "flex-end";
    return "flex-start";
  };
  const nameAlignItems = mapTextAlignToAlignItems(nameInlineStyle.textAlign);
  const priceAlignItems = mapTextAlignToAlignItems(priceInlineStyle.textAlign);
  const descriptionAlignItems = mapTextAlignToAlignItems(descriptionInlineStyle.textAlign);
  const badgesInlineStyle = hasElement(badgesEl)
    ? buildElementInlineStyle(badgesEl, { width: cardWidth, height: 48 }, 10)
    : {};
  const addInlineStyle = hasElement(addEl)
    ? buildElementInlineStyle(addEl, { width: 156, height: 48 }, 10)
    : {};
  const detailsInlineStyle = hasElement(detailsEl)
    ? buildElementInlineStyle(detailsEl, { width: 156, height: 48 }, 10)
    : {};
  const shouldShowFormulaButton = Boolean(showFormulaButton && hasElement(addEl) && hasElement(detailsEl));
  const addBtnLeft = px(addInlineStyle.left, 16);
  const addBtnTop = px(addInlineStyle.top, 394);
  const addBtnWidth = px(addInlineStyle.width, 156);
  const addBtnHeight = px(addInlineStyle.height, 48);
  const detailsBtnLeft = px(detailsInlineStyle.left, 184);
  const detailsBtnTop = px(detailsInlineStyle.top, 394);
  const detailsBtnWidth = px(detailsInlineStyle.width, 156);
  const detailsBtnHeight = px(detailsInlineStyle.height, 48);
  const buttonsGroupLeft = Math.min(addBtnLeft, detailsBtnLeft);
  const buttonsGroupTop = Math.min(addBtnTop, detailsBtnTop);
  const buttonsGroupWidth = Math.max(addBtnLeft + addBtnWidth, detailsBtnLeft + detailsBtnWidth) - buttonsGroupLeft;
  const buttonsGroupHeight = Math.max(addBtnHeight, detailsBtnHeight);

  return (
    <div
        className={`udc-root ${interactive ? "udc-client" : "udc-preview"} relative overflow-hidden ${className}`}
        onClick={() => {
          if (!interactive) return;
          onCardClick?.();
        }}
        style={{
          position: "relative",
          width: cardWidth,
          minWidth: cardWidth,
          maxWidth: cardWidth,
          height: cardHeight,
          minHeight: cardHeight,
          maxHeight: cardHeight,
          backgroundColor: cardBgColor,
          backgroundImage: cardBackgroundLayers.join(", "),
          backgroundSize: str(globalStyle.backgroundImage) ? "cover, auto" : undefined,
          backgroundPosition: str(globalStyle.backgroundImage) ? "center center, center center" : undefined,
          borderRadius: num(globalStyle.borderRadius, 24),
          boxShadow: hasPromoBadge ? promoCardShadow : baseCardShadow,
          opacity: num(globalStyle.opacity, 1),
          border: hasPromoBadge
            ? "4px solid #ef4444"
            : `${num(globalStyle.borderWidth, 0)}px ${str(globalStyle.borderStyle, "solid")} ${colorOr(globalStyle.borderColor, "#111111")}`,
        }}
      >
      {isStandard ? (
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ height: Math.round(cardHeight * 0.44), background: "linear-gradient(180deg,#ffffff 0%, #f1f5f9 100%)", zIndex: 1 }}
        />
      ) : null}

      {isOverlay && str(globalStyle.overlayTextGradient) ? (
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{
            height: num(globalStyle.overlayTextGradientHeight, 220),
            background: str(globalStyle.overlayTextGradient),
            zIndex: 10,
          }}
        />
      ) : null}

      {hasElement(imageEl) && bool(imageEl.visible, true) ? (
        imageUrl ? (
          <img
            src={imageUrl}
            alt={dishName}
            className="absolute object-cover"
            style={{
              ...(finalLayout === "overlay"
                ? {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: 0,
                  }
                : frameStyle(imageEl, { width: cardWidth, height: cardHeight }, 0)),
              borderRadius: num(imageEl.style?.borderRadius, 0),
              objectFit: str(imageEl.style?.objectFit, "cover") as React.CSSProperties["objectFit"],
              filter: `brightness(${num(imageEl.style?.brightness, 1)}) contrast(${num(imageEl.style?.contrast, 1)})`,
            }}
          />
        ) : (
          <div
            className="absolute flex items-center justify-center bg-gray-100 text-xs font-black text-gray-500"
            style={{
              ...(finalLayout === "overlay"
                ? {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: 0,
                  }
                : frameStyle(imageEl, { width: cardWidth, height: cardHeight }, 0)),
              borderRadius: num(imageEl.style?.borderRadius, 0),
            }}
          >
            Image du plat
          </div>
        )
      ) : null}

      {hasElement(nameEl) && bool(nameEl.visible, true) ? (
        <div
          className=""
          ref={(node) => applyImportantInlineStyles(node, nameInlineStyle)}
          style={{
            ...nameInlineStyle,
            zIndex: overlayedTextZ(nameEl),
            ...textCageBase,
            alignItems: nameAlignItems,
            maxHeight: nameInlineStyle.height
          }}
        >
          <span
            style={{
              color: str(readElementColor(nameEl), "") || "#000000",
              fontSize: adjustedNameFontSize,
              lineHeight: nameInlineStyle.lineHeight,
              width: "100%",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              wordBreak: "break-word",
            }}
          >
            {dishName}
          </span>
        </div>
      ) : null}

      {hasElement(priceEl) && bool(priceEl.visible, true) ? (
        <div
          className=""
          ref={(node) => applyImportantInlineStyles(node, priceInlineStyle)}
          style={{
            ...priceInlineStyle,
            zIndex: overlayedTextZ(priceEl),
            ...textCageBase,
            maxHeight: priceInlineStyle.height,
            alignItems: priceAlignItems,
          }}
        >
          <div
            style={{
              color: str(readElementColor(priceEl), "") || "#000000",
              fontSize: adjustedPriceFontSize,
              lineHeight: priceInlineStyle.lineHeight,
              width: "100%",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              wordBreak: "break-word",
              maxWidth: "100%",
            }}
          >
            {priceNode}
          </div>
        </div>
      ) : null}

      {hasElement(descriptionEl) && bool(descriptionEl.visible, true) ? (
        <div
          className=""
          ref={(node) => applyImportantInlineStyles(node, descriptionInlineStyle)}
          style={{
            ...descriptionInlineStyle,
            zIndex: overlayedTextZ(descriptionEl),
            ...textCageBase,
            alignItems: descriptionAlignItems,
            maxHeight: descriptionInlineStyle.height,
          }}
        >
          <span
            style={{
              color: str(readElementColor(descriptionEl), "") || "#000000",
              fontSize: `${adjustedDescriptionFontPx}px`,
              lineHeight: adjustedDescriptionLineHeight,
              width: "100%",
              display: "-webkit-box",
              WebkitLineClamp: adjustedDescriptionClampLines,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
              wordBreak: "break-word",
              hyphens: "auto",
            }}
          >
            {description}
          </span>
        </div>
      ) : null}

      {hasElement(badgesEl) && bool(badgesEl.visible, true) && badges.length > 0 ? (
        <div
          className="absolute flex flex-wrap content-start items-start gap-1 overflow-hidden"
          ref={(node) => applyImportantInlineStyles(node, badgesInlineStyle)}
          style={{
            ...badgesInlineStyle,
            position: "absolute",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            alignContent: "flex-start",
            gap: 4,
            padding: 0,
            overflow: "hidden",
          }}
        >
          {badges.map((badge, index) => {
            const normalizedBadge = normalizeBadge(badge, index);
            const badgeType = normalizedBadge.type;
            const palette =
              badgeType === "vegetarian"
                ? { background: "#16a34a", color: "#ffffff", border: "#166534" }
                : badgeType === "spicy"
                  ? { background: "#dc2626", color: "#ffffff", border: "#991b1b" }
                  : badgeType === "new"
                    ? { background: "#facc15", color: "#111111", border: "#ca8a04" }
                    : badgeType === "suggestion"
                      ? { background: "#2563eb", color: "#ffffff", border: "#1d4ed8" }
                    : badgeType === "in_formula"
                        ? { background: "#16a34a", color: "#ffffff", border: "#166534" }
                    : badgeType === "hunger"
                          ? hungerPalette(normalizedBadge.label)
                        : badgeType === "promo"
                          ? { background: "#ef4444", color: "#ffffff", border: "#b91c1c" }
                          : { background: "#ffffff", color: "#111111", border: "#111111" };
            const icon = badgeIcon(normalizedBadge.type);
            return (
              <span
                key={normalizedBadge.key}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 9999,
                  fontWeight: 700,
                  fontSize: 11,
                  padding: "4px 8px",
                  border: `1px solid ${palette.border}`,
                  backgroundColor: palette.background,
                  color: palette.color,
                  maxWidth: "100%",
                  overflow: "hidden",
                }}
              >
                {icon ? <span style={{ fontSize: "0.9em", fontWeight: 900, lineHeight: 1 }}>{icon}</span> : null}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{normalizedBadge.label}</span>
              </span>
            );
          })}
        </div>
      ) : null}

      {shouldShowFormulaButton ? (
        <div
          className="absolute"
          style={{
            left: buttonsGroupLeft,
            top: buttonsGroupTop,
            width: buttonsGroupWidth,
            height: buttonsGroupHeight * 2 + 8,
            zIndex: Math.max(overlayedTextZ(addEl), overlayedTextZ(detailsEl)),
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", width: "100%", gap: 8, minHeight: buttonsGroupHeight }}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (!interactive) return;
                onAddToCart?.();
              }}
              className="udc-btn inline-flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              style={{
                flex: 1,
                height: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                backgroundColor: colorOr((addEl.style as any)?.backgroundColor, colorOr(globalStyle.backgroundColor, "#111111")),
                color: resolveInlineTextColor(readElementColor(addEl), finalLayout, (addEl.style as any)?.backgroundColor || globalStyle.backgroundColor),
              }}
            >
              {addToCartLabel}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (!interactive) return;
                onViewDetails?.();
              }}
              className="udc-btn inline-flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              style={{
                flex: 1,
                height: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                backgroundColor: colorOr((detailsEl.style as any)?.backgroundColor, "#ffffff"),
                color: resolveInlineTextColor(readElementColor(detailsEl), finalLayout, (detailsEl.style as any)?.backgroundColor || globalStyle.backgroundColor),
              }}
            >
              {viewDetailsLabel}
            </button>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (!interactive) return;
              onViewFormula?.();
            }}
            className="udc-btn inline-flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            style={{
              width: "100%",
              minHeight: buttonsGroupHeight,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              backgroundColor: "#dcfce7",
              color: "#14532d",
            }}
          >
            {formulaLabel}
          </button>
        </div>
      ) : hasElement(addEl) && bool(addEl.visible, true) ? (
        <button
          type="button"
          ref={(node) => applyImportantInlineStyles(node, addInlineStyle)}
          onClick={(event) => {
            event.stopPropagation();
            if (!interactive) return;
            onAddToCart?.();
          }}
          className="udc-btn absolute inline-flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          style={{
            ...addInlineStyle,
            zIndex: overlayedTextZ(addEl),
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            padding: "0 14px",
            backgroundColor: colorOr((addEl.style as any)?.backgroundColor, colorOr(globalStyle.backgroundColor, "#111111")),
            color: resolveInlineTextColor(readElementColor(addEl), finalLayout, (addEl.style as any)?.backgroundColor || globalStyle.backgroundColor),
          }}
        >
          {addToCartLabel}
        </button>
      ) : null}

      {!shouldShowFormulaButton && hasElement(detailsEl) && bool(detailsEl.visible, true) ? (
        <button
          type="button"
          ref={(node) => applyImportantInlineStyles(node, detailsInlineStyle)}
          onClick={(event) => {
            event.stopPropagation();
            if (!interactive) return;
            onViewDetails?.();
          }}
          className="udc-btn absolute inline-flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          style={{
            ...detailsInlineStyle,
            zIndex: overlayedTextZ(detailsEl),
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            padding: "0 14px",
            backgroundColor: colorOr((detailsEl.style as any)?.backgroundColor, "#ffffff"),
            color: resolveInlineTextColor(readElementColor(detailsEl), finalLayout, (detailsEl.style as any)?.backgroundColor || globalStyle.backgroundColor),
          }}
        >
          {viewDetailsLabel}
        </button>
      ) : null}

      {(((safeLayout as any).decorations as Array<Record<string, unknown>>) || []).map((deco, index) => {
        const visible = bool((deco as any)?.visible, true);
        if (!visible) return null;
        const src = str((deco as any)?.src);
        if (!src) return null;
        return (
          <img
            key={str((deco as any)?.id, `deco-${index}`)}
            src={src}
            alt=""
            className="absolute object-contain pointer-events-none"
            style={{
              left: num((deco as any)?.position?.x, 0),
              top: num((deco as any)?.position?.y, 0),
              width: num((deco as any)?.size?.width, 24),
              height: num((deco as any)?.size?.height, 24),
              opacity: num((deco as any)?.opacity, 1),
              zIndex: num((deco as any)?.zIndex, 16),
              borderRadius: num((deco as any)?.borderRadius, 10),
            }}
          />
        );
      })}

      </div>
  );
}


