export function InventaireTab(props: any) {
  const { activeTab, inventory, inventoryByCategory, euro, toggleStock } = props;

  if (activeTab !== "inventaire") return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold uppercase bg-gray-200 p-2 rounded">Inventaire</h2>
        <span className="text-sm font-black">{inventory.length} articles</span>
      </div>
      <div className="space-y-3" translate="no">
        {inventory.length === 0 ? <p className="text-red-700 text-xl font-black text-center py-8">LA TABLE DISHES RENVOIE 0 LIGNE</p> : null}
        {inventoryByCategory.map(([categoryLabel, items]: [string, any[]]) => (
          <div key={categoryLabel} className="space-y-2">
            <div className="px-3 py-2 bg-gray-100 border-2 border-black font-black uppercase text-sm">
              {categoryLabel}
            </div>
            {items.map((item) => {
              const inStock = Boolean(item.active);
              return (
                <div key={String(item.id)} className="bg-white border-2 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold">{String(item.name || `Item ${item.id}`)}</div>
                    <div className="text-sm text-gray-600">{euro.format(Number(item.price || 0))}</div>
                  </div>
                  <button onClick={() => void toggleStock(item)} className={`px-3 py-2 border-2 border-black font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] ${inStock ? "bg-green-700" : "bg-red-700"}`}>
                    {inStock ? "En stock" : "Rupture"}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
