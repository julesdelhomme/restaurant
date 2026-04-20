import type { KitchenMessage } from "../types";

type KitchenMessagesPanelProps = {
  kitchenMessages: KitchenMessage[];
  readingKitchenMessageId: string;
  extractKitchenMessageText: (row: KitchenMessage) => string;
  formatKitchenMessageAge: (value: string | null | undefined) => string;
  onMarkKitchenMessageRead: (messageId: string) => Promise<void>;
};

export function KitchenMessagesPanel({
  kitchenMessages,
  readingKitchenMessageId,
  extractKitchenMessageText,
  formatKitchenMessageAge,
  onMarkKitchenMessageRead,
}: KitchenMessagesPanelProps) {
  if (kitchenMessages.length === 0) return null;

  return (
    <section className="mb-4 space-y-2">
      {kitchenMessages.map((alert) => {
        const messageText = extractKitchenMessageText(alert);
        const senderLabel = String(alert.sender_name || "Serveur").trim() || "Serveur";
        const senderNormalized = senderLabel.toLowerCase();
        const isBarSender =
          senderNormalized.includes("bar/caisse") || senderNormalized.includes("bar") || senderNormalized.includes("caisse");
        const headerLabel = isBarSender ? "MESSAGE DU BAR" : "MESSAGE SERVEUR";

        return (
          <div
            key={`kitchen-message-${alert.id}`}
            className="rounded border-2 border-orange-900 bg-orange-500 px-3 py-3 text-white shadow-[4px_4px_0px_0px_rgba(124,45,18,0.65)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-wide text-orange-100">{headerLabel}</div>
                <div className="mt-1 text-sm font-black">
                  MESSAGE {String(senderLabel).toUpperCase()} : {messageText}{" "}
                  <span className="font-semibold">({formatKitchenMessageAge(alert.created_at)})</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void onMarkKitchenMessageRead(alert.id)}
                disabled={readingKitchenMessageId === alert.id}
                className="inline-flex shrink-0 items-center rounded border-2 border-black bg-black px-3 py-1.5 text-xs font-black text-white disabled:opacity-60"
              >
                {readingKitchenMessageId === alert.id ? "..." : "OK / Lu"}
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}

