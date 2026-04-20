"use client";

import type React from "react";
import { XCircle } from "lucide-react";

type SmartCallOptionItem = {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
};

type MenuSmartCallModalProps = {
  show: boolean;
  isSendingCall: boolean;
  isServerCallThrottled: boolean;
  title: string;
  subtitle: string;
  sendingLabel: string;
  cancelLabel: string;
  options: SmartCallOptionItem[];
  optionLabels: Record<string, string>;
  onClose: () => void;
  onSelectOption: (key: string) => void;
};

export function MenuSmartCallModal({
  show,
  isSendingCall,
  isServerCallThrottled,
  title,
  subtitle,
  sendingLabel,
  cancelLabel,
  options,
  optionLabels,
  onClose,
  onSelectOption,
}: MenuSmartCallModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={() => !isSendingCall && onClose()}>
      <div
        className="w-full max-w-md bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
        onClick={(event) => event.stopPropagation()}
        translate="no"
      >
        <div className="p-4 border-b-2 border-black flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-black text-black">{title}</div>
            <div className="text-sm font-semibold text-gray-700">{subtitle}</div>
          </div>
          <button
            type="button"
            onClick={() => !isSendingCall && onClose()}
            className="w-10 h-10 bg-white text-black rounded-full border-2 border-black flex items-center justify-center"
          >
            <XCircle size={18} className="text-red-500" />
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 gap-2">
          {options.map(({ key, icon: Icon, colorClass }) => (
            <button
              key={key}
              type="button"
              disabled={isSendingCall || isServerCallThrottled}
              onClick={() => onSelectOption(key)}
              className="w-full text-left border-2 border-black rounded-xl px-3 py-3 bg-white hover:bg-gray-50 disabled:opacity-60"
            >
              <span className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full border-2 border-black bg-white flex items-center justify-center">
                  <Icon className={`h-4 w-4 ${colorClass}`} />
                </span>
                <span className="font-black text-black">{optionLabels[key] || key}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={() => !isSendingCall && onClose()}
            disabled={isSendingCall}
            className="px-4 py-2 border-2 border-black rounded-lg font-black bg-white disabled:opacity-60"
          >
            {isSendingCall ? sendingLabel : cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export type { SmartCallOptionItem };
