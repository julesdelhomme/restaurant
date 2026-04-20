import { BellRing } from "lucide-react";
import type { Order } from "../types";

type KitchenHeaderProps = {
  isMounted: boolean;
  currentTime: Date;
  autoPrintEnabled: boolean;
  orders: Order[];
  onManualPrint: () => void;
  onRemindServer: () => void;
};

export function KitchenHeader({
  isMounted,
  currentTime,
  autoPrintEnabled,
  orders,
  onManualPrint,
  onRemindServer,
}: KitchenHeaderProps) {
  return (
    <div className="mb-6 rounded-lg bg-white p-4 shadow">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold uppercase">
          CUISINE - <span suppressHydrationWarning>{isMounted ? currentTime.toLocaleTimeString("fr-FR") : "--:--:--"}</span>
        </h1>
        <div className="flex items-center gap-2">
          {autoPrintEnabled ? (
            <span className="rounded border-2 border-black bg-green-100 px-3 py-2 text-xs font-black text-green-900">
              Impression auto...
            </span>
          ) : (
            <button
              onClick={onManualPrint}
              disabled={orders.length === 0}
              className="rounded border-2 border-black bg-white px-4 py-2 text-sm font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-gray-100 disabled:opacity-50 disabled:shadow-none"
            >
              IMPRIMER
            </button>
          )}
          <button
            onClick={onRemindServer}
            className="rounded border-2 border-black bg-orange-600 px-4 py-2 text-sm font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-orange-700"
          >
            <span className="inline-flex items-center gap-2">
              <BellRing className="h-4 w-4" />
              APPELER SERVEUR
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

