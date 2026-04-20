"use client";

import { useEffect, useLayoutEffect } from "react";

export function useMenuFontEffects(menuFontFamily: string) {
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
}
