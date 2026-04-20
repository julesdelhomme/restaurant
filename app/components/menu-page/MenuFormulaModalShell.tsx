"use client";

import type React from "react";
import { XCircle } from "lucide-react";

type MenuFormulaModalShellProps = {
  show: boolean;
  closeLabel: string;
  title: string;
  subtitle: string;
  submitLabel: string;
  submitDisabled: boolean;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
};

export function MenuFormulaModalShell({
  show,
  closeLabel,
  title,
  subtitle,
  submitLabel,
  submitDisabled,
  onClose,
  onSubmit,
  children,
}: MenuFormulaModalShellProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[130] flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90dvh] rounded-none sm:rounded-2xl border-t-4 sm:border-4 border-black overflow-hidden flex flex-col">
        <div className="relative p-4 border-b-4 border-black">
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white text-black rounded-full font-bold flex items-center justify-center border-4 border-black"
            onClick={onClose}
            aria-label={closeLabel}
            title={closeLabel}
          >
            <XCircle size={20} className="text-red-500" />
          </button>
          <div className="text-center">
            <div className="text-lg font-black">{title}</div>
            <div className="text-sm text-black/70">{subtitle}</div>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-28 pt-4 sm:pb-6">{children}</div>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t-4 border-black bg-white">
          <button
            disabled={submitDisabled}
            className="w-full py-3 bg-black text-white font-black rounded-xl border-4 border-black disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onSubmit}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
