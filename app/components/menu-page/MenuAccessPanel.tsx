"use client";

type MenuAccessPanelProps = {
  isVitrineMode: boolean;
  darkMode: boolean;
  cardTransparentEnabled: boolean;
  yourTableLabel: string;
  validationCodeLabel: string;
  validationCodePlaceholder: string;
  validationCodeInvalidLabel: string;
  tableNumber: string;
  orderValidationCodeInput: string;
  typedValidationCode: string;
  isValidationCodeValid: boolean;
  onTableNumberChange: (value: string) => void;
  onOrderValidationCodeInputChange: (value: string) => void;
};

export function MenuAccessPanel({
  isVitrineMode,
  darkMode,
  cardTransparentEnabled,
  yourTableLabel,
  validationCodeLabel,
  validationCodePlaceholder,
  validationCodeInvalidLabel,
  tableNumber,
  orderValidationCodeInput,
  typedValidationCode,
  isValidationCodeValid,
  onTableNumberChange,
  onOrderValidationCodeInputChange,
}: MenuAccessPanelProps) {
  if (isVitrineMode) {
    return (
      <div className="border-4 rounded-none p-3 mx-0 my-2 relative z-30 bg-white/95 border-black text-black menu-surface-shell">
        <p className="text-sm font-black">Mode vitrine actif : consultation du menu uniquement.</p>
      </div>
    );
  }

  return (
    <div
      className={`border-4 rounded-none p-3 mx-0 my-2 relative z-30 ${
        darkMode
          ? "bg-black/95 border-[#d99a2b] text-[#E0E0E0]"
          : cardTransparentEnabled
            ? "bg-transparent border-black text-black"
            : "bg-white/95 border-black text-black"
      } menu-surface-shell`}
      style={!darkMode ? { backgroundColor: "transparent" } : undefined}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-black text-black">{yourTableLabel}</label>
          <input
            type="number"
            placeholder={yourTableLabel}
            value={tableNumber}
            onChange={(event) => onTableNumberChange(event.target.value)}
            className="px-4 py-2 bg-white text-black border border-gray-300 w-28 font-bold"
          />
        </div>
        <div className="min-w-[180px]">
          <label className="mb-1 block text-sm font-black text-black">{validationCodeLabel}</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={orderValidationCodeInput}
            onChange={(event) => onOrderValidationCodeInputChange(event.target.value)}
            placeholder={validationCodePlaceholder}
            className="w-full px-4 py-2 bg-white text-black border border-gray-300 font-bold"
          />
        </div>
      </div>
      <div className="mt-2 text-sm font-bold">
        {typedValidationCode.length > 0 && !isValidationCodeValid ? (
          <p className="text-red-600">{validationCodeInvalidLabel}</p>
        ) : null}
      </div>
    </div>
  );
}
