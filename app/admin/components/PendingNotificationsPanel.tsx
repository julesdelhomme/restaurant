import { Check } from "lucide-react";
import type { ServiceNotification } from "../types";

type PendingNotificationsPanelProps = {
  pendingNotifications: ServiceNotification[];
  markNotificationRead: (notificationId: string) => Promise<void>;
};

export function PendingNotificationsPanel({
  pendingNotifications,
  markNotificationRead,
}: PendingNotificationsPanelProps) {
  if (pendingNotifications.length === 0) return null;

  return (
    <section className="mb-4 rounded border-2 border-black bg-white p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-black uppercase">Live Alerts ({pendingNotifications.length})</div>
        <div className="text-xs font-bold text-gray-600">Temps rÃƒÂ©el</div>
      </div>
      <div className="space-y-2">
        {pendingNotifications.map((notification) => {
          const type = String(notification.type || "").trim().toUpperCase();
          const isCuisine = type === "CUISINE";
          const tableLabel = String(notification.table_number || "").trim();
          const titleLabel = isCuisine ? "CUISINE" : `TABLE ${tableLabel || "?"}`;
          const detailLabel = String(notification.message || "Appel simple").trim() || "Appel simple";
          return (
            <div
              key={`notif-${notification.id}`}
              className={`flex items-center justify-between gap-3 border-2 p-2 ${
                isCuisine ? "border-red-500 bg-red-50 animate-pulse" : "border-blue-300 bg-blue-50"
              }`}
            >
              <div>
                <div className={`font-black ${isCuisine ? "text-red-700" : "text-blue-900"}`}>{titleLabel}</div>
                <div className="text-sm font-semibold text-black">{detailLabel}</div>
                <div className="text-xs text-gray-600">
                  {notification.created_at ? new Date(notification.created_at).toLocaleTimeString("fr-FR") : "-"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void markNotificationRead(notification.id)}
                className="inline-flex items-center gap-2 border-2 border-black bg-green-700 px-3 py-2 text-sm font-black text-white"
              >
                <Check className="h-4 w-4" />
                Marquer comme lu
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
