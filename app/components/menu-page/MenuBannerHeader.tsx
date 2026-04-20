"use client";

import { Moon, Sun } from "lucide-react";

type MenuLanguageOption = {
  code: string;
  name: string;
  flag: string;
};

type MenuBannerHeaderProps = {
  darkMode: boolean;
  bannerBackgroundColor: string;
  bannerContentTextColor: string;
  showBannerImage: boolean;
  bannerImageUrl: string;
  showHeaderLogo: boolean;
  headerLogoSrc: string;
  showNameOnClient: boolean;
  restaurantDisplayName: string;
  currentLanguageFlag: string;
  showLangMenu: boolean;
  languageOptions: MenuLanguageOption[];
  onLogoLoad?: () => void;
  onLogoError: () => void;
  onToggleDarkMode: () => void;
  onToggleLanguageMenu: () => void;
  onSelectLanguage: (code: string) => void;
};

export function MenuBannerHeader({
  darkMode,
  bannerBackgroundColor,
  bannerContentTextColor,
  showBannerImage,
  bannerImageUrl,
  showHeaderLogo,
  headerLogoSrc,
  showNameOnClient,
  restaurantDisplayName,
  currentLanguageFlag,
  showLangMenu,
  languageOptions,
  onLogoLoad,
  onLogoError,
  onToggleDarkMode,
  onToggleLanguageMenu,
  onSelectLanguage,
}: MenuBannerHeaderProps) {
  return (
    <div
      className={`${darkMode ? "border-[#d99a2b]" : "border-black"} border-b-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-[200px] md:h-[300px] px-4 flex flex-col items-center justify-center relative z-50 overflow-visible`}
      style={{
        backgroundColor: bannerBackgroundColor,
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
            onLoad={onLogoLoad}
            onError={onLogoError}
          />
        ) : null}
        {showNameOnClient && restaurantDisplayName ? (
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
            onClick={onToggleDarkMode}
            className={`border-2 rounded-full px-3 py-1 ${darkMode ? "bg-black text-[#E0E0E0] border-[#d99a2b]" : "bg-white text-black border-black"}`}
          >
            {darkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-gray-800" />}
          </button>
          <button
            className={`${darkMode ? "text-[#E0E0E0] bg-black border-[#d99a2b]" : "text-black bg-white border-black"} font-bold text-xl border-2 rounded-full px-3 py-1`}
            onClick={onToggleLanguageMenu}
          >
            {currentLanguageFlag}
          </button>
        </div>
        {showLangMenu ? (
          <div
            className={`absolute right-0 mt-2 rounded-lg shadow-lg z-[9999] border-2 ${darkMode ? "bg-black border-[#d99a2b]" : "bg-white border-black"}`}
          >
            {languageOptions.map((languageOption) => (
              <button
                key={languageOption.code}
                onClick={() => onSelectLanguage(languageOption.code)}
                className={`flex items-center w-full px-4 py-2 text-left transition-colors ${darkMode ? "text-[#E0E0E0] hover:bg-[#2a2a2a]" : "text-black hover:bg-gray-100"}`}
              >
                <span className="text-lg">{languageOption.flag}</span>
                <span className="ml-2 font-bold">{languageOption.name}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export type { MenuLanguageOption };
