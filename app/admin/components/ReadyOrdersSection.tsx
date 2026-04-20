import { Users } from "lucide-react";
import type { Order } from "../types";
import type { Item } from "../utils/order-items";

type ReadyEntry = { item: Item; index: number; orderItemId?: string | null; fallbackItemId?: string | null };

type ReadyOrdersSectionProps = {
  readyOrders: Order[];
  getReadyItemEntries: (order: Order) => ReadyEntry[];
  isDrink: (item: Item) => boolean;
  normalizeCoversValue: (value: unknown) => number | null;
  tableCoversByNumber: Map<number, number>;
  resolveOrderItemLabel: (item: Item) => string;
  handleServeItems: (
    orderId: string,
    itemRefs: Array<{ index: number; orderItemId?: string | null; fallbackItemId?: string | null }>
  ) => Promise<void>;
};

export function ReadyOrdersSection({
  readyOrders,
  getReadyItemEntries,
  isDrink,
  normalizeCoversValue,
  tableCoversByNumber,
  resolveOrderItemLabel,
  handleServeItems,
}: ReadyOrdersSectionProps) {
  void resolveOrderItemLabel;
  return (
    <section className="bg-green-50 border-2 border-green-300 p-4">
      <h2 className="text-xl font-bold mb-4 uppercase bg-green-100 p-2 rounded">{"Pr\u00EAt"}</h2>
      <div className="space-y-2">
        {readyOrders.length === 0 ? (
          <p className="text-sm text-gray-500 italic">{"Aucune commande pr\u00EAte."}</p>
        ) : (
          readyOrders.map((order) => {
            const readyEntries = getReadyItemEntries(order);
            if (readyEntries.length === 0) return null;
            const readyFoodEntries = readyEntries.filter((entry) => !isDrink(entry.item));
            const readyDrinkEntries = readyEntries.filter((entry) => isDrink(entry.item));
            const covers =
              normalizeCoversValue((order as unknown as Record<string, unknown>).covers) ??
              normalizeCoversValue((order as unknown as Record<string, unknown>).guest_count) ??
              normalizeCoversValue((order as unknown as Record<string, unknown>).customer_count) ??
              tableCoversByNumber.get(Number(order.table_number)) ??
              null;

            const renderReadyBlock = (title: "PLATS" | "BOISSONS", entries: ReadyEntry[]) => {
              if (entries.length === 0) return null;
              const isFoodBlock = title === "PLATS";
              return (
                <div className={`border-2 p-2 ${isFoodBlock ? "border-orange-300 bg-orange-50" : "border-blue-300 bg-blue-50"}`}>
                  <div className="mb-2 text-xs font-black uppercase">{title}</div>
                  <div className="space-y-2">
                    {entries.map(({ item, index }) => (
                      (() => {
                        const record = item as unknown as Record<string, unknown>;
                        /* --- ZONE SANCTUAIRE : NE JAMAIS MODIFIER CETTE LOGIQUE D'AFFICHAGE --- */
                        /* Ici on affiche le nom du PLAT (name_fr) et JAMAIS le nom de la formule. */
                        const displayName =
                          (item as unknown as { dish?: { name_fr?: string }; name_fr?: string }).dish?.name_fr ||
                          (item as unknown as { name_fr?: string }).name_fr ||
                          (item as unknown as { name?: string }).name;
                        /* --- FIN DE ZONE SANCTUAIRE --- */
                        return (
                          <div
                            key={
                              String(
                                record.order_item_id ??
                                  record.orderItemId ??
                                  record.id ??
                                  `ready-line-${order.id}-${title}-${index}`
                              ).trim()
                            }
                            className="border border-gray-300 bg-white p-2"
                          >
                        <div className="font-bold text-sm">
                          <span className="bg-black text-white px-2 mr-2 rounded">{Number(item.quantity) || 1}x</span>
                          <span className="notranslate" translate="no">
                            {displayName}
                          </span>
                        </div>
                        {String(item.instructions || "").trim() ? (
                          <div className="mt-1 text-xs italic text-gray-700 notranslate" translate="no">
                            {String(item.instructions || "").trim()}
                          </div>
                        ) : null}
                          </div>
                        );
                      })()
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void handleServeItems(
                        String(order.id),
                        entries.map((entry) => ({
                          index: entry.index,
                          orderItemId: entry.orderItemId ?? null,
                          fallbackItemId: entry.fallbackItemId ?? null,
                        }))
                      )
                    }
                    className={`mt-3 w-full border-2 border-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                      isFoodBlock ? "bg-yellow-400" : "bg-blue-200"
                    }`}
                    style={{ width: "100%", padding: "15px", fontWeight: 800 }}
                  >
                    {isFoodBlock ? "TOUT SERVIR" : "TOUT SERVIR BOISSONS"}
                  </button>
                </div>
              );
            };

            return (
              <div
                key={`ready-items-${order.id}`}
                className="border-2 border-green-500 bg-white p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="mb-2 flex items-center justify-between border-b-2 border-black pb-2">
                  <div className="text-xl font-black uppercase">
                    T-{order.table_number ?? "?"}
                    {covers ? (
                      <>
                        {" "}
                        | <Users size={12} className="inline-block align-text-bottom" /> {covers}
                      </>
                    ) : ""}
                  </div>
                  <div className="text-xs font-mono text-gray-500">#{String(order.id).slice(0, 4)}</div>
                </div>
                <div className="space-y-3">
                  {renderReadyBlock("PLATS", readyFoodEntries)}
                  {renderReadyBlock("BOISSONS", readyDrinkEntries)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}





