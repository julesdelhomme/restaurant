"use client";

import type React from "react";
import { Globe } from "lucide-react";
import type { SocialFooterEntry } from "../../lib/menu-page/social-runtime";

type MenuSocialFooterProps = {
  entries: SocialFooterEntry[];
  darkMode: boolean;
  thankYouLabel: string;
  followUsLabel: string;
  photoShareLabel: string;
  onImageError: (event: React.SyntheticEvent<HTMLImageElement>) => void;
};

export function MenuSocialFooter({
  entries,
  darkMode,
  thankYouLabel,
  followUsLabel,
  photoShareLabel,
  onImageError,
}: MenuSocialFooterProps) {
  if (entries.length === 0) return null;

  return (
    <div
      className={`menu-surface-shell mt-3 border-t-4 ${darkMode ? "border-[#d99a2b] text-white" : "border-black text-black"} px-4 py-5 text-center`}
      style={!darkMode ? { backgroundColor: "transparent" } : undefined}
    >
      <div className={`font-black text-lg ${darkMode ? "text-white" : "text-black"}`}>{thankYouLabel}</div>
      <div className={`mt-1 text-sm font-semibold ${darkMode ? "text-gray-200" : "text-gray-700"}`}>{followUsLabel}</div>
      <div className={`mt-2 text-sm ${darkMode ? "text-gray-300" : "text-gray-700"} max-w-2xl mx-auto`}>
        {photoShareLabel}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
        {entries.map((entry) => (
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
                <img src={entry.iconUrl} alt="" aria-hidden="true" className="w-4 h-4 object-contain" onError={onImageError} />
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
