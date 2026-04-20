"use client";

type MenuSalesAdviceModalProps = {
  show: boolean;
  title: string;
  message: string;
  viewItemLabel: string;
  showViewItemButton: boolean;
  bannerBgColor: string;
  bannerContentTextColor: string;
  onViewItem: () => void;
  onClose: () => void;
};

export function MenuSalesAdviceModal({
  show,
  title,
  message,
  viewItemLabel,
  showViewItemButton,
  bannerBgColor,
  bannerContentTextColor,
  onViewItem,
  onClose,
}: MenuSalesAdviceModalProps) {
  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-[92vw] max-w-md border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="p-3 border-b-2 border-black bg-emerald-50">
        <div className="text-lg font-black text-black">{title}</div>
      </div>
      <div className="p-3 text-black font-semibold leading-relaxed">{message}</div>
      <div className="p-3 border-t border-gray-200 flex justify-end gap-2">
        {showViewItemButton ? (
          <button
            type="button"
            onClick={onViewItem}
            className="px-3 py-1 border-2 border-black rounded font-black"
            style={{ backgroundColor: bannerBgColor, color: bannerContentTextColor }}
          >
            {viewItemLabel}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 bg-emerald-600 text-white border-2 border-black rounded font-black"
        >
          OK
        </button>
      </div>
    </div>
  );
}
