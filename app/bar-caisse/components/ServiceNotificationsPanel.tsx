import { BellRing, CheckCircle2 } from "lucide-react";

export function ServiceNotificationsPanel(props: any) {
  const {
    enabled,
    serviceNotifications,
    normalizeStatus,
    parseNotificationPayload,
    getServiceNotificationReasonFr,
    markNotificationHandled,
  } = props;

  if (!enabled || serviceNotifications.length === 0) return null;

  return (
    <section className="mb-6 rounded-xl border-2 border-black bg-amber-50 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-amber-700" />
          <h2 className="text-lg font-black uppercase">Notifications service</h2>
        </div>
        <span className="rounded border-2 border-black bg-white px-2 py-1 text-xs font-black">
          {serviceNotifications.length} en attente
        </span>
      </div>
      <div className="space-y-2">
        {serviceNotifications.map((notification: any) => {
          const tableText =
            String(notification.table_number ?? "").trim() ||
            String(notification.table_id ?? "").trim() ||
            "-";
          const createdText = notification.created_at
            ? new Date(notification.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
            : "--:--";
          const typeNormalized = normalizeStatus(notification.type);
          const isKitchenCall =
            typeNormalized === "kitchen_call" ||
            typeNormalized === "cuisine" ||
            String(tableText).toUpperCase() === "CUISINE";
          const notificationPrefix = isKitchenCall ? "CUISINE" : `Table ${tableText}`;
          const notificationPayload = parseNotificationPayload(notification.payload);
          const requestKey = String(
            notificationPayload?.request_key ||
              notificationPayload?.request_type ||
              notification.request_type ||
              ""
          )
            .trim()
            .toLowerCase();
          const reasonLabel = getServiceNotificationReasonFr(notification);
          const notificationSentence =
            !isKitchenCall && requestKey === "help_question"
              ? `La Table ${tableText} demande de l'aide`
              : `${notificationPrefix} : ${reasonLabel}`;
          return (
            <div
              key={String(notification.id)}
              className="flex flex-col gap-3 rounded-lg border-2 border-black bg-white p-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {isKitchenCall ? (
                    <span className="rounded border border-red-700 bg-red-600 px-2 py-0.5 font-black text-white">
                      CUISINE
                    </span>
                  ) : (
                    <span className="rounded border border-black bg-black px-2 py-0.5 font-black text-white">
                      Table {tableText}
                    </span>
                  )}
                  <span className="font-mono text-xs text-gray-600">{createdText}</span>
                  <span className="rounded border border-amber-600 bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                    {String(notification.type || "notification").replace(/_/g, " ")}
                  </span>
                </div>
                <p className="mt-1 font-bold text-black">{notificationSentence}</p>
              </div>
              <button
                type="button"
                onClick={() => void markNotificationHandled(notification.id)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-black bg-emerald-600 px-3 py-2 font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                <CheckCircle2 className="h-4 w-4" />
                OK
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
