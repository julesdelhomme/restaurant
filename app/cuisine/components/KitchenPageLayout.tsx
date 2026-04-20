import type { Item, KitchenMessage, Order } from "../types";
import { KitchenHeader } from "./KitchenHeader";
import { KitchenMessagesPanel } from "./KitchenMessagesPanel";
import { KitchenPrintStyles } from "./KitchenPrintStyles";
import { KitchenPrintTicket } from "./KitchenPrintTicket";

type KitchenFlowRow = {
  order: Order;
  currentStep: number;
  items: Item[];
};

type KitchenPageLayoutProps = {
  isMounted: boolean;
  currentTime: Date;
  autoPrintEnabled: boolean;
  orders: Order[];
  onManualPrint: () => void;
  onRemindServer: () => void;
  kitchenMessages: KitchenMessage[];
  readingKitchenMessageId: string;
  extractKitchenMessageText: (row: KitchenMessage) => string;
  formatKitchenMessageAge: (value: string | null | undefined) => string;
  onMarkKitchenMessageRead: (messageId: string) => Promise<void>;
  enCoursRows: KitchenFlowRow[];
  aSuivreRows: KitchenFlowRow[];
  readyGroupLoadingKey: string | null;
  formatTime: (value: string) => string;
  getKitchenSelectedOptionLines: (item: Item) => string[];
  resolveKitchenDishName: (item: Item) => string;
  onReadyGroup: (groupKey: string, orderIds: Array<string | number>) => Promise<void>;
  printOrderId: string;
  printOrder: Order | null;
  printableCuisineItems: (order: Order) => Item[];
  getUpcomingKitchenItems: (order: Order) => Item[];
  triggerOrderId: string;
  triggerPrintNonce: number;
  onTicketPrinted: (payload: { orderId: string; nonce: number; step: number }) => void;
};

export function KitchenPageLayout({
  isMounted,
  currentTime,
  autoPrintEnabled,
  orders,
  onManualPrint,
  onRemindServer,
  kitchenMessages,
  readingKitchenMessageId,
  extractKitchenMessageText,
  formatKitchenMessageAge,
  onMarkKitchenMessageRead,
  enCoursRows,
  aSuivreRows,
  readyGroupLoadingKey,
  formatTime,
  getKitchenSelectedOptionLines,
  resolveKitchenDishName,
  onReadyGroup,
  printOrderId,
  printOrder,
  printableCuisineItems,
  getUpcomingKitchenItems,
  triggerOrderId,
  triggerPrintNonce,
  onTicketPrinted,
}: KitchenPageLayoutProps) {
  const uniqueTexts = (values: string[]) => {
    const seen = new Set<string>();
    return values
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .filter((value) => {
        const key = value
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  const toTextList = (value: unknown): string[] => {
    if (value == null) return [];
    if (Array.isArray(value)) return value.flatMap((entry) => toTextList(entry));
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value || "").trim();
      return text ? [text] : [];
    }
    if (typeof value !== "object") return [];
    const record = value as Record<string, unknown>;
    const nestedValues = [
      ...toTextList(record.values),
      ...toTextList(record.value),
      ...toTextList(record.selected),
      ...toTextList(record.selection),
      ...toTextList(record.choice),
      ...toTextList(record.option),
      ...toTextList(record.options),
      ...toTextList(record.name),
      ...toTextList(record.name_fr),
      ...toTextList(record.label),
      ...toTextList(record.label_fr),
      ...toTextList(record.text),
      ...toTextList(record.title),
    ];
    return nestedValues;
  };

  const splitValues = (value: string) =>
    String(value || "")
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);

  const extractKitchenDetailGroups = (item: Item) => {
    const record = item as unknown as Record<string, unknown>;
    const prefixedLines = getKitchenSelectedOptionLines(item);

    const sides: string[] = [
      ...toTextList(record.selected_sides),
      ...toTextList(record.selectedSides),
      ...toTextList(record.selected_side_label_fr),
      ...toTextList(record.accompagnement),
      ...toTextList(record.accompagnements),
      ...toTextList(record.side),
      ...toTextList(record.sides),
    ];
    const cooking: string[] = [
      ...toTextList(record.selected_cooking_label_fr),
      ...toTextList(record.selected_cooking_label),
      ...toTextList(record.selected_cooking),
      ...toTextList(record.selectedCooking),
      ...toTextList(record.cooking),
      ...toTextList(record.cuisson),
    ];
    const options: string[] = [
      ...toTextList(record.selected_option_name),
      ...toTextList(record.selectedOptionName),
      ...toTextList(record.selected_option),
      ...toTextList(record.option),
      ...toTextList(record.options),
    ];
    const supplements: string[] = [
      ...toTextList(record.selected_extras),
      ...toTextList(record.selectedExtras),
      ...toTextList(record.supplement),
      ...toTextList(record.supplements),
      ...toTextList(record.extra),
      ...toTextList(record.extras),
    ];

    prefixedLines.forEach((line) => {
      const text = String(line || "").trim();
      if (!text) return;
      if (/^ACC\s*:/i.test(text)) {
        sides.push(...splitValues(text.replace(/^ACC\s*:\s*/i, "")));
        return;
      }
      if (/^CUI\s*:/i.test(text)) {
        cooking.push(...splitValues(text.replace(/^CUI\s*:\s*/i, "")));
        return;
      }
      if (/^SUP\s*:/i.test(text)) {
        supplements.push(...splitValues(text.replace(/^SUP\s*:\s*/i, "")));
        return;
      }
      if (/^OP\s*:/i.test(text)) {
        options.push(...splitValues(text.replace(/^OP\s*:\s*/i, "")));
      }
    });

    const normalizeValueKey = (value: string) =>
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    const sidesNormalizedSet = new Set(uniqueTexts(sides).map((value) => normalizeValueKey(value)));
    const cookingNormalizedSet = new Set(uniqueTexts(cooking).map((value) => normalizeValueKey(value)));
    const filteredOptions = uniqueTexts(options).filter((value) => {
      const key = normalizeValueKey(value);
      if (!key) return false;
      return !sidesNormalizedSet.has(key) && !cookingNormalizedSet.has(key);
    });

    return {
      sides: uniqueTexts(sides),
      cooking: uniqueTexts(cooking),
      options: filteredOptions,
      supplements: uniqueTexts(supplements),
    };
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-black">
      <KitchenHeader
        isMounted={isMounted}
        currentTime={currentTime}
        autoPrintEnabled={autoPrintEnabled}
        orders={orders}
        onManualPrint={onManualPrint}
        onRemindServer={onRemindServer}
      />

      <KitchenMessagesPanel
        kitchenMessages={kitchenMessages}
        readingKitchenMessageId={readingKitchenMessageId}
        extractKitchenMessageText={extractKitchenMessageText}
        formatKitchenMessageAge={formatKitchenMessageAge}
        onMarkKitchenMessageRead={onMarkKitchenMessageRead}
      />

      {orders.length === 0 ? <p className="italic text-gray-500">Aucune commande en attente pour la cuisine.</p> : null}

      <section className="mb-6 rounded-2xl border-2 border-black bg-white p-4">
        <h2 className="text-2xl font-black uppercase">EN COURS</h2>
        <p className="text-xs font-bold text-gray-600">Étape active uniquement, toutes tables confondues (ordre chronologique).</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {enCoursRows.map((row) => {
            const orderId = String(row.order.id || "").trim();
            const loadingKey = `order:${orderId}`;
            return (
              <article key={`encours-${orderId}`} className="rounded-xl border-2 border-black bg-gray-50 p-3">
                <div className="mb-2 border-b border-dashed border-black pb-2">
                  <div className="text-2xl font-black">
                    T-{row.order.table_number}
                    {Number(row.order.covers || row.order.guest_count || row.order.customer_count || 0) > 0
                      ? ` | Couverts: ${Number(row.order.covers || row.order.guest_count || row.order.customer_count || 0)}`
                      : ""}
                  </div>
                  <div className="text-xs font-bold text-gray-700">
                    Arrivée: {formatTime(String(row.order.created_at || ""))} | Étape {row.currentStep}
                  </div>
                </div>
                <div className="space-y-2">
                  {row.items.map((item, idx) => {
                    /* --- ZONE SANCTUAIRE : NE JAMAIS MODIFIER CETTE LOGIQUE D'AFFICHAGE --- */
                    /* Ici on affiche le nom du PLAT (name_fr) et JAMAIS le nom de la formule. */
                    const displayName =
                      (item as unknown as { dish?: { name_fr?: string }; name_fr?: string }).dish?.name_fr ||
                      (item as unknown as { name_fr?: string }).name_fr ||
                      (item as unknown as { name?: string }).name;
                    /* --- FIN DE ZONE SANCTUAIRE --- */
                    const detailGroups = extractKitchenDetailGroups(item);
                    return (
                      <div key={`encours-item-${orderId}-${idx}`} className="rounded border border-gray-300 bg-white p-2">
                        <div className="text-lg font-black">
                          {Math.max(1, Number(item.quantity) || 1)}x {displayName}
                        </div>
                        <div className="mt-1 text-[11px] font-medium text-gray-700">
                          {detailGroups.sides.length > 0 ? (
                            <div>
                              {detailGroups.sides.map((label, optIndex) => (
                                <div key={`encours-root-acc-${orderId}-${idx}-${optIndex}`}>CC: {label}</div>
                              ))}
                            </div>
                          ) : null}
                          {detailGroups.cooking.length > 0 ? (
                            <div>
                              {detailGroups.cooking.map((label, optIndex) => (
                                <div key={`encours-root-cui-${orderId}-${idx}-${optIndex}`}>OP: {label}</div>
                              ))}
                            </div>
                          ) : null}
                          {detailGroups.options.length > 0 ? (
                            <div>
                              {detailGroups.options.map((label, optIndex) => (
                                <div key={`encours-root-op-${orderId}-${idx}-${optIndex}`}>- OP: {label}</div>
                              ))}
                            </div>
                          ) : null}
                          {detailGroups.supplements.length > 0 ? (
                            <div>
                              {detailGroups.supplements.map((label, optIndex) => (
                                <div key={`encours-root-sup-${orderId}-${idx}-${optIndex}`}>- SUP: {label}</div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => void onReadyGroup(loadingKey, [row.order.id])}
                  disabled={readyGroupLoadingKey === loadingKey}
                  className="mt-3 w-full rounded border-2 border-black bg-green-600 px-3 py-2 text-lg font-black text-white disabled:opacity-60"
                >
                  {readyGroupLoadingKey === loadingKey ? "MISE À JOUR..." : "PRET"}
                </button>
              </article>
            );
          })}
          {enCoursRows.length === 0 ? (
            <div className="rounded border border-dashed border-gray-400 bg-gray-50 p-3 text-sm font-bold text-gray-600">
              Aucun plat en préparation sur l’étape active.
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-gray-400 bg-gray-50 p-3 opacity-75">
        <h2 className="text-base font-black uppercase tracking-wide text-gray-700">A SUIVRE</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {aSuivreRows.map((row) => {
            const orderId = String(row.order.id || "").trim();
            return (
              <article key={`asuivre-${orderId}`} className="rounded-lg border border-gray-300 bg-white p-2">
                <div className="mb-1 border-b border-dashed border-gray-300 pb-1">
                  <div className="text-sm font-black">
                    T-{row.order.table_number}
                    {Number(row.order.covers || row.order.guest_count || row.order.customer_count || 0) > 0
                      ? ` | Couverts: ${Number(row.order.covers || row.order.guest_count || row.order.customer_count || 0)}`
                      : ""}
                  </div>
                  <div className="text-[11px] font-semibold text-gray-500">
                    Arrivée: {formatTime(String(row.order.created_at || ""))} | Étape active: {row.currentStep}
                  </div>
                </div>
                <div className="space-y-1">
                  {row.items.map((item, idx) => {
                    /* --- ZONE SANCTUAIRE : NE JAMAIS MODIFIER CETTE LOGIQUE D'AFFICHAGE --- */
                    /* Ici on affiche le nom du PLAT (name_fr) et JAMAIS le nom de la formule. */
                    const displayName =
                      (item as unknown as { dish?: { name_fr?: string }; name_fr?: string }).dish?.name_fr ||
                      (item as unknown as { name_fr?: string }).name_fr ||
                      (item as unknown as { name?: string }).name;
                    /* --- FIN DE ZONE SANCTUAIRE --- */
                    const detailGroups = extractKitchenDetailGroups(item);
                    return (
                      <div key={`asuivre-item-${orderId}-${idx}`} className="rounded border border-gray-200 bg-gray-50 p-1.5">
                        <div className="text-sm font-black">
                          {Math.max(1, Number(item.quantity) || 1)}x {displayName}
                        </div>
                        <div className="mt-0.5 text-[10px] text-gray-600">
                          {detailGroups.sides.length > 0 ? (
                            <div>
                              {detailGroups.sides.map((label, optIndex) => (
                                <div key={`asuivre-root-acc-${orderId}-${idx}-${optIndex}`}>CC: {label}</div>
                              ))}
                            </div>
                          ) : null}
                          {detailGroups.cooking.length > 0 ? (
                            <div>
                              {detailGroups.cooking.map((label, optIndex) => (
                                <div key={`asuivre-root-cui-${orderId}-${idx}-${optIndex}`}>OP: {label}</div>
                              ))}
                            </div>
                          ) : null}
                          {detailGroups.options.length > 0 ? (
                            <div>
                              {detailGroups.options.map((label, optIndex) => (
                                <div key={`asuivre-root-op-${orderId}-${idx}-${optIndex}`}>- OP: {label}</div>
                              ))}
                            </div>
                          ) : null}
                          {detailGroups.supplements.length > 0 ? (
                            <div>
                              {detailGroups.supplements.map((label, optIndex) => (
                                <div key={`asuivre-root-sup-${orderId}-${idx}-${optIndex}`}>- SUP: {label}</div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
          {aSuivreRows.length === 0 ? (
            <div className="rounded border border-dashed border-gray-400 bg-gray-50 p-3 text-sm font-bold text-gray-600">
              Aucun plat en attente d’étape suivante.
            </div>
          ) : null}
        </div>
      </section>

      {printOrder ? (
        <>
          <KitchenPrintTicket
            key={`kitchen-print-${printOrderId || String(printOrder.id || "")}`}
            printOrderId={printOrderId}
            printOrder={printOrder}
            printableCuisineItems={printableCuisineItems}
            getUpcomingKitchenItems={getUpcomingKitchenItems}
            getKitchenSelectedOptionLines={getKitchenSelectedOptionLines}
            resolveKitchenDishName={resolveKitchenDishName}
            triggerOrderId={triggerOrderId}
            triggerPrintNonce={triggerPrintNonce}
            onPrinted={onTicketPrinted}
          />
          <KitchenPrintStyles />
        </>
      ) : null}
    </div>
  );
}

