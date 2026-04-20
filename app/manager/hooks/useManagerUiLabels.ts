import { useMemo } from "react";

export function useManagerUiLabels(deps: Record<string, any>) {
  const { ANALYTICS_I18N } = deps;

  const managerUiLang = useMemo<"fr" | "es" | "de">(() => {
    if (typeof window === "undefined") return "fr";
    const lang = String(window.navigator.language || "").toLowerCase();
    if (lang.startsWith("de")) return "de";
    if (lang.startsWith("es")) return "es";
    return "fr";
  }, []);

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
        : "Opacité du fond des plats";
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

  return {
    managerUiLang,
    analyticsText,
    bannerColorLabel,
    dishCardsColorLabel,
    dishCardsOpacityLabel,
    dishCardsTextColorLabel,
    globalTextColorLabel,
    bannerImageLabel,
    sevenDaysAgoIso,
  };
}
