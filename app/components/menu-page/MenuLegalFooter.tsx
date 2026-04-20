"use client";

type MenuLegalFooterProps = {
  darkMode: boolean;
  footerLegalLabel: string;
  footerRulesLabel: string;
  legalFooterModal: null | "legal" | "rules";
  legalFooterModalTitle: string;
  legalFooterModalBody: string;
  onOpenLegal: () => void;
  onOpenRules: () => void;
  onCloseModal: () => void;
};

export function MenuLegalFooter({
  darkMode,
  footerLegalLabel,
  footerRulesLabel,
  legalFooterModal,
  legalFooterModalTitle,
  legalFooterModalBody,
  onOpenLegal,
  onOpenRules,
  onCloseModal,
}: MenuLegalFooterProps) {
  return (
    <>
      <footer className={`mt-4 pb-6 text-center text-[11px] font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
        <button type="button" onClick={onOpenLegal} className="underline underline-offset-2">
          {footerLegalLabel}
        </button>
        <span className="mx-2">&bull;</span>
        <button type="button" onClick={onOpenRules} className="underline underline-offset-2">
          {footerRulesLabel}
        </button>
      </footer>
      {legalFooterModal ? (
        <div className="fixed inset-0 z-[21000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-2xl rounded-2xl border-2 ${
              darkMode ? "border-[#d99a2b] bg-black text-[#F5F5F5]" : "border-black bg-white text-black"
            } p-5 shadow-xl`}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base sm:text-lg font-black">{legalFooterModalTitle}</h3>
              <button
                type="button"
                onClick={onCloseModal}
                className={`rounded-full border-2 px-3 py-1 text-xs font-black ${
                  darkMode ? "border-[#d99a2b] text-[#F5F5F5]" : "border-black text-black"
                }`}
              >
                Fermer
              </button>
            </div>
            <p
              className={`mt-3 max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed ${
                darkMode ? "text-gray-200" : "text-gray-700"
              }`}
            >
              {legalFooterModalBody}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
