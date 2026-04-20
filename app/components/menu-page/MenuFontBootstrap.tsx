"use client";

type MenuFontBootstrapProps = {
  menuFontFamily: string;
};

export function MenuFontBootstrap({ menuFontFamily }: MenuFontBootstrapProps) {
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
    </>
  );
}
