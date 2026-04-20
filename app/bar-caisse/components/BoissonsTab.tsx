export function BoissonsTab(props: any) {
  const {
    activeTab,
    pendingDrinkOrders,
    parseItems,
    resolveStaffDestination,
    categoryDestinationById,
    dishCategoryIdByDishId,
    isItemReady,
    getItemExtras,
    getItemNotes,
    formatItemInlineDetails,
    getItemName,
    euro,
    calcLineTotal,
    handleDrinkReady,
  } = props;

  if (activeTab !== "boissons") return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold uppercase bg-blue-100 p-2 rounded">Bar - Boissons</h2>
        <span className="text-sm font-black">{pendingDrinkOrders.length} en attente</span>
      </div>
      <div className="space-y-4">
        {pendingDrinkOrders.length === 0 ? <p className="text-gray-500 italic">Aucune boisson en attente.</p> : null}
        {pendingDrinkOrders.map((order: any) => {
          const drinks = parseItems(order.items).filter(
            (i: any) => resolveStaffDestination(i, categoryDestinationById, dishCategoryIdByDishId) === "bar" && !isItemReady(i)
          );
          if (drinks.length === 0) return null;
          return (
            <div key={String(order.id)} className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-2">
                  <h3 className="text-3xl font-black uppercase">
                    T-{order.table_number}
                    {Number(order.covers || order.guest_count || order.customer_count) > 0
                      ? ` | \u{1F465} ${Number(order.covers || order.guest_count || order.customer_count)}`
                      : ""}
                  </h3>
                  <span className="text-xs font-mono text-gray-500">#{String(order.id).slice(0, 4)}</span>
                </div>
                <div className="space-y-2 mb-4" translate="no">
                  {drinks.map((item: any, idx: number) => {
                    const itemExtras = getItemExtras(item);
                    const itemNotes = getItemNotes(item);
                    const inlineDetails = formatItemInlineDetails(item);
                    const drinkLabel = getItemName(item);
                    return (
                      <div key={`${String(order.id)}-${idx}`} className="bg-gray-100 p-2">
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-bold text-lg">
                            <span className="bg-black text-white px-2 mr-2 rounded">{Number(item.quantity) || 1}x</span>
                            <span className="notranslate" translate="no">
                              {drinkLabel}
                              {inlineDetails ? ` ${inlineDetails}` : ""}
                            </span>
                          </span>
                          <span className="font-bold text-sm">{euro.format(calcLineTotal(item))}</span>
                        </div>
                        {itemExtras.length > 0 ? (
                          <div className="mt-1 text-xs text-gray-700 notranslate" translate="no">
                            Supplements : {itemExtras.join(", ")}
                          </div>
                        ) : null}
                        {itemNotes.length > 0 ? (
                          <div className="mt-1 text-xs italic text-gray-700 notranslate" translate="no">
                            Options : {itemNotes.join(" | ")}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
              <button onClick={() => void handleDrinkReady(order.id)} className="w-full bg-blue-500 hover:opacity-90 text-white font-bold py-4 text-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all">BOISSON PRETE</button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
