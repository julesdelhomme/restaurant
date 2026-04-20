"use client";

const BASE_MENU_STYLES = `
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
`;

const DARK_MENU_STYLES = `
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
`;

const LIGHT_MENU_STYLES = `
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
`;

type MenuVisualStylesProps = {
  darkMode: boolean;
};

export function MenuVisualStyles({ darkMode }: MenuVisualStylesProps) {
  return (
    <>
      <style>{BASE_MENU_STYLES}</style>
      {darkMode ? <style>{DARK_MENU_STYLES}</style> : <style>{LIGHT_MENU_STYLES}</style>}
    </>
  );
}
