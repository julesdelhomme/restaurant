import type { Item, Order } from "../types";

type KitchenReadyHistoryProps = {
  orders: Order[];
  getServedOrReadyKitchenItems: (order: Order) => Item[];
  getKitchenSelectedOptionLines: (item: Item) => string[];
  resolveKitchenDishName: (item: Item) => string;
};

export function KitchenReadyHistory({
  orders,
  getServedOrReadyKitchenItems,
  getKitchenSelectedOptionLines,
  resolveKitchenDishName,
}: KitchenReadyHistoryProps) {
  if (orders.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-black uppercase text-gray-700">Plats servis/prets</h2>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => {
          const kitchenItems = getServedOrReadyKitchenItems(order);
          if (kitchenItems.length === 0) return null;

          return (
            <div key={`ready-${order.id}`} className="rounded border border-gray-300 bg-gray-50 p-2">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-sm font-black">
                  T-{order.table_number}
                  {Number(order.covers || order.guest_count || order.customer_count) > 0
                    ? ` | Couverts: ${Number(order.covers || order.guest_count || order.customer_count)}`
                    : ""}
                </div>
                <span className="rounded bg-green-600 px-2 py-0.5 text-[10px] font-bold text-white">SERVI/PRET</span>
              </div>
              <div className="space-y-1">
                {kitchenItems.map((item, idx) => {
                  const optionLines = getKitchenSelectedOptionLines(item);
                  return (
                    <div key={`${String(order.id)}-ready-${idx}-${String(item.dish_id || item.id || "")}`} className="text-xs text-black">
                      <div className="font-semibold">
                        {item.quantity}x{" "}
                        <span translate="no" className="notranslate">
                          {resolveKitchenDishName(item)}
                        </span>
                      </div>
                      {optionLines.length > 0 ? (
                        <div className="notranslate text-[11px] text-gray-700" translate="no">
                          {optionLines.map((line, optionIndex) => (
                            <div key={`${String(order.id)}-ready-opt-${idx}-${optionIndex}`}>- {line}</div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

