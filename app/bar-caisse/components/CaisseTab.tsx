export function CaisseTab(props: any) {
  const {
    activeTab,
    readyForCashTables,
    pendingCashTables,
    expandedTables,
    setExpandedTables,
    tableHasUnpaidItems,
    euro,
    openSplitPaymentModal,
    openPaymentModal,
    buildCashDisplayLines,
    paidTablesHistory,
    restorePaidTableFromHistory,
    setPaidTablesHistory,
  } = props;

  if (activeTab !== "caisse") return null;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold uppercase bg-emerald-100 p-2 rounded">Caisse</h2>
        <div className="flex gap-2 text-sm font-bold">
          <span className="px-2 py-1 border-2 border-black bg-white">Pretes: {readyForCashTables.length}</span>
          <span className="px-2 py-1 border-2 border-black bg-white">En service: {pendingCashTables.length}</span>
        </div>
      </div>

      <div className="space-y-4">
        {readyForCashTables.length === 0 ? <p className="text-gray-500 italic">Aucune commande terminee prete a encaisser.</p> : null}
        {readyForCashTables.map((table: any) => {
          const expanded = !!expandedTables[table.tableNumber];
          const hasUnpaidItems = tableHasUnpaidItems.get(table.tableNumber) !== false;
          return (
            <div key={table.tableNumber} className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-2">
                <div>
                  <div className="text-3xl font-black uppercase">
                    T-{table.tableNumber}
                    {Number(table.covers || 0) > 0 ? ` | 👥 ${Number(table.covers || 0)}` : ""}
                  </div>
                  <div className="text-sm font-bold">Total restant : {euro.format(table.total)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setExpandedTables((prev: any) => ({ ...prev, [table.tableNumber]: !prev[table.tableNumber] }))} className="px-3 py-2 border-2 border-black bg-white font-black">{expanded ? "Masquer" : "Details"}</button>
                  <button
                    type="button"
                    onClick={() => openSplitPaymentModal(table.tableNumber)}
                    className="px-4 py-3 border-2 border-black bg-white font-black"
                    disabled={!hasUnpaidItems}
                  >
                    Payer separement
                  </button>
                  <button type="button" onClick={() => openPaymentModal(table.tableNumber)} className="px-4 py-3 border-2 border-black bg-emerald-600 text-white font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">MARQUER PAYE</button>
                </div>
              </div>
              {expanded ? (
                <div className="mt-3 space-y-2" translate="no">
                  {buildCashDisplayLines(table.items).map((line: any, idx: number) => (
                    <div
                      key={`${table.tableNumber}-${line.key}-${idx}`}
                      className={`flex items-start justify-between gap-2 p-2 ${
                        line.paymentStatus === "paid"
                          ? "bg-gray-100 opacity-60"
                          : line.paymentStatus === "mixed"
                            ? "bg-amber-50"
                            : "bg-gray-100"
                      }`}
                    >
                      <div>
                        <div className="font-bold notranslate" translate="no">
                          x{line.quantity} {line.name}
                          {line.detailsText ? ` ${line.detailsText}` : ""}
                          {line.paymentStatus === "paid" ? (
                            <span className="ml-2 inline-flex items-center rounded border border-emerald-700 bg-emerald-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                              PAYE
                            </span>
                          ) : null}
                          {line.paymentStatus === "mixed" ? (
                            <span className="ml-2 inline-flex items-center rounded border border-amber-700 bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-black">
                              PARTIEL
                            </span>
                          ) : null}
                        </div>
                        {line.isFormulaGroup && line.subDishNames.length > 0 ? (
                          <div className="text-xs text-gray-700 mt-1">
                            {line.subDishNames.map((dishName: string) => (
                              <div key={`${line.key}-${dishName}`}>- {dishName}</div>
                            ))}
                          </div>
                        ) : null}
                        {line.extras.length > 0 ? <div className="text-xs text-gray-700">Supplements : {line.extras.join(", ")}</div> : null}
                        {line.notes.length > 0 ? <div className="text-xs text-gray-700">Notes : {line.notes.join(" | ")}</div> : null}
                      </div>
                      <div className="font-black">{euro.format(line.amount)}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {pendingCashTables.length > 0 ? (
        <div className="mt-6 bg-orange-50 border-2 border-orange-300 p-4">
          <h3 className="text-lg font-black mb-2 uppercase">Commandes en cours</h3>
          <div className="space-y-4">
            {pendingCashTables.map((table: any) => {
              const expanded = !!expandedTables[table.tableNumber];
              const hasUnpaidItems = tableHasUnpaidItems.get(table.tableNumber) !== false;
              return (
                <div key={table.tableNumber} className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-2">
                    <div>
                      <div className="text-3xl font-black uppercase">
                        T-{table.tableNumber}
                        {Number(table.covers || 0) > 0 ? ` | 👥 ${Number(table.covers || 0)}` : ""}
                      </div>
                      <div className="text-sm font-bold">Total restant : {euro.format(table.total)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setExpandedTables((prev: any) => ({ ...prev, [table.tableNumber]: !prev[table.tableNumber] }))} className="px-3 py-2 border-2 border-black bg-white font-black">{expanded ? "Masquer" : "Details"}</button>
                      <button
                        type="button"
                        onClick={() => openSplitPaymentModal(table.tableNumber)}
                        className="px-4 py-3 border-2 border-black bg-white font-black"
                        disabled={!hasUnpaidItems}
                      >
                        Payer separement
                      </button>
                    </div>
                  </div>
                  {expanded ? (
                    <div className="mt-3 space-y-2" translate="no">
                      {buildCashDisplayLines(table.items).map((line: any, idx: number) => (
                        <div
                          key={`${table.tableNumber}-${line.key}-${idx}`}
                          className={`flex items-start justify-between gap-2 p-2 ${
                            line.paymentStatus === "paid"
                              ? "bg-gray-100 opacity-60"
                              : line.paymentStatus === "mixed"
                                ? "bg-amber-50"
                                : "bg-gray-100"
                          }`}
                        >
                          <div>
                            <div className="font-bold notranslate" translate="no">
                              x{line.quantity} {line.name}
                              {line.detailsText ? ` ${line.detailsText}` : ""}
                              {line.paymentStatus === "paid" ? (
                                <span className="ml-2 inline-flex items-center rounded border border-emerald-700 bg-emerald-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                                  PAYE
                                </span>
                              ) : null}
                              {line.paymentStatus === "mixed" ? (
                                <span className="ml-2 inline-flex items-center rounded border border-amber-700 bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-black">
                                  PARTIEL
                                </span>
                              ) : null}
                            </div>
                            {line.isFormulaGroup && line.subDishNames.length > 0 ? (
                              <div className="text-xs text-gray-700 mt-1">
                                {line.subDishNames.map((dishName: string) => (
                                  <div key={`${line.key}-${dishName}`}>- {dishName}</div>
                                ))}
                              </div>
                            ) : null}
                            {line.extras.length > 0 ? <div className="text-xs text-gray-700">Supplements : {line.extras.join(", ")}</div> : null}
                            {line.notes.length > 0 ? <div className="text-xs text-gray-700">Notes : {line.notes.join(" | ")}</div> : null}
                          </div>
                          <div className="font-black">{euro.format(line.amount)}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {pendingCashTables.length > 0 ? (
        <div className="mt-6 bg-yellow-50 border-2 border-yellow-300 p-4">
          <h3 className="text-lg font-black mb-2 uppercase">Encaissement bloque (service en cours)</h3>
          <div className="flex flex-wrap gap-2">
            {pendingCashTables.map((t: any) => (
              <span key={`blocked-${t.tableNumber}`} className="px-2 py-1 border-2 border-black bg-white font-bold text-sm">Table {t.tableNumber}</span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-lg font-black uppercase">Historique des Tables Encaissees (24h)</h3>
          <span className="px-2 py-1 border-2 border-black bg-gray-100 text-xs font-black">
            {paidTablesHistory.length} entree{paidTablesHistory.length > 1 ? "s" : ""}
          </span>
        </div>
        {paidTablesHistory.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            Aucune table encaissee conservee. Les entrees sont supprimees automatiquement apres 24h.
          </p>
        ) : (
          <div className="space-y-3">
            {paidTablesHistory.map((entry: any) => {
              const orderTotal = Number(entry.total || 0);
              const tipAmount = Number(entry.tipAmount || 0);
              const paidTotal = orderTotal + tipAmount;
              return (
                <details key={entry.id} className="border-2 border-black bg-gray-50 p-3">
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-black uppercase">
                        T-{entry.tableNumber}
                        {Number(entry.covers || 0) > 0 ? ` | 👥 ${Number(entry.covers || 0)}` : ""}
                      </div>
                      <div className="text-sm font-bold">
                        {new Date(entry.closedAt).toLocaleString("fr-FR")} | {euro.format(paidTotal)}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-700 font-semibold">
                      Paiement : {entry.paymentMethod}
                    </div>
                    <div className="mt-1 text-xs text-gray-700">
                      {tipAmount > 0
                        ? `${euro.format(paidTotal)} (dont ${euro.format(tipAmount)} de pourboire)`
                        : euro.format(orderTotal)}
                    </div>
                  </summary>
                  <div className="mt-3 space-y-2">
                    {buildCashDisplayLines(Array.isArray(entry.items) ? entry.items : []).map((line: any, idx: number) => (
                      <div key={`${entry.id}-item-${line.key}-${idx}`} className="flex items-start justify-between gap-2 bg-white border border-gray-200 p-2">
                        <div className="min-w-0">
                          <div className="font-bold">
                            x{line.quantity} {line.name}
                            {line.detailsText ? ` ${line.detailsText}` : ""}
                          </div>
                          {line.isFormulaGroup && line.subDishNames.length > 0 ? (
                            <div className="text-xs text-gray-700 mt-1">
                              {line.subDishNames.map((dishName: string) => (
                                <div key={`${line.key}-${dishName}`}>- {dishName}</div>
                              ))}
                            </div>
                          ) : null}
                          {line.extras.length > 0 ? (
                            <div className="text-xs text-gray-700">Supplements : {line.extras.join(", ")}</div>
                          ) : null}
                          {line.notes.length > 0 ? (
                            <div className="text-xs text-gray-700">Notes : {line.notes.join(" | ")}</div>
                          ) : null}
                        </div>
                        <div className="font-black whitespace-nowrap">{euro.format(line.amount)}</div>
                      </div>
                    ))}
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => void restorePaidTableFromHistory(entry)}
                        className="px-3 py-2 border-2 border-black bg-blue-600 text-white font-black"
                      >
                        Restaurer
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaidTablesHistory((prev: any) => prev.filter((row: any) => row.id !== entry.id))}
                        className="px-3 py-2 border-2 border-black bg-white font-black"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
