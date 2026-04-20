import { Banknote, CreditCard, X } from "lucide-react";

type SplitPaymentRow = {
  key: string;
  itemName: string;
  detailsText: string;
  maxQuantity: number;
  unitPrice: number;
  totalPrice: number;
};

type SplitPaymentModalProps = {
  splitPaymentTable: number | null;
  splitModalTable: { total: number } | null;
  closeSplitPaymentModal: () => void;
  splitPaymentRows: SplitPaymentRow[];
  splitPaymentSelections: Record<string, number>;
  updateSplitSelectionQuantity: (key: string, value: number, maxQuantity: number) => void;
  splitPaymentTotal: number;
  selectedPaymentMethod: "Carte Bancaire" | "Espèces";
  setSelectedPaymentMethod: (value: "Carte Bancaire" | "Espèces") => void;
  splitTipAmountInput: string;
  setSplitTipAmountInput: (value: string) => void;
  parsePriceNumber: (value: unknown) => number;
  euro: Intl.NumberFormat;
  splitPaymentProcessing: boolean;
  runSplitPaymentFlow: () => Promise<void>;
};

export function SplitPaymentModal({
  splitPaymentTable,
  splitModalTable,
  closeSplitPaymentModal,
  splitPaymentRows,
  splitPaymentSelections,
  updateSplitSelectionQuantity,
  splitPaymentTotal,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  splitTipAmountInput,
  setSplitTipAmountInput,
  parsePriceNumber,
  euro,
  splitPaymentProcessing,
  runSplitPaymentFlow,
}: SplitPaymentModalProps) {
  if (splitPaymentTable == null || !splitModalTable) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-white border-2 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
          <div>
            <h3 className="text-2xl font-black uppercase">Payer séparément - Table {splitPaymentTable}</h3>
            <p className="text-sm font-semibold">Total restant : {euro.format(splitModalTable.total)}</p>
          </div>
          <button
            type="button"
            onClick={closeSplitPaymentModal}
            className="h-10 w-10 border-2 border-black inline-flex items-center justify-center bg-white"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {splitPaymentRows.length === 0 ? (
          <div className="rounded border-2 border-emerald-700 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
            Tous les articles sont déjà marqués comme payés.
          </div>
        ) : (
          <div className="space-y-2">
            {splitPaymentRows.map((row) => {
              const selectedQuantity = Math.max(
                0,
                Math.min(row.maxQuantity, Number(splitPaymentSelections[row.key] || 0))
              );
              return (
                <div key={row.key} className="flex flex-wrap items-center justify-between gap-3 border-2 border-black bg-gray-50 p-3">
                  <div className="min-w-[220px] flex-1">
                    <div className="font-black">
                      {row.itemName}
                      {row.detailsText ? ` ${row.detailsText}` : ""}
                    </div>
                    <div className="text-xs font-semibold text-gray-700">
                      Prix unitaire: {euro.format(row.unitPrice)} | Ligne: {euro.format(row.totalPrice)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateSplitSelectionQuantity(row.key, selectedQuantity - 1, row.maxQuantity)}
                      className="h-9 w-9 border-2 border-black bg-white font-black"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={row.maxQuantity}
                      value={selectedQuantity}
                      onChange={(event) =>
                        updateSplitSelectionQuantity(row.key, Number(event.target.value || 0), row.maxQuantity)
                      }
                      className="h-9 w-20 border-2 border-black bg-white px-2 text-center font-black"
                    />
                    <button
                      type="button"
                      onClick={() => updateSplitSelectionQuantity(row.key, selectedQuantity + 1, row.maxQuantity)}
                      className="h-9 w-9 border-2 border-black bg-white font-black"
                    >
                      +
                    </button>
                    <div className="min-w-[88px] text-right text-sm font-black">
                      {euro.format(selectedQuantity * row.unitPrice)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 border-2 border-black bg-white p-3">
          <div className="text-sm font-semibold text-gray-700">Total partiel</div>
          <div className="text-2xl font-black">{euro.format(splitPaymentTotal)}</div>
        </div>

        <div className="mt-4 border-2 border-black bg-gray-50 p-3">
          <div className="mb-2 text-sm font-black uppercase">Mode de paiement</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod("Carte Bancaire")}
              className={`flex items-center justify-center gap-2 border-2 border-black px-3 py-3 font-black ${
                selectedPaymentMethod === "Carte Bancaire" ? "bg-emerald-600 text-white" : "bg-white text-black"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Carte Bancaire
            </button>
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod("Espèces")}
              className={`flex items-center justify-center gap-2 border-2 border-black px-3 py-3 font-black ${
                selectedPaymentMethod === "Espèces" ? "bg-amber-500 text-black" : "bg-white text-black"
              }`}
            >
              <Banknote className="h-4 w-4" />
              Espèces
            </button>
          </div>
        </div>

        <div className="mt-4 border-2 border-black bg-white p-3">
          <label className="mb-1 block text-sm font-black uppercase">Ajouter un pourboire (facultatif)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={splitTipAmountInput}
            onChange={(event) => setSplitTipAmountInput(event.target.value)}
            placeholder="0.00"
            className="h-12 w-full border-2 border-black px-3 font-bold"
          />
          <p className="mt-2 text-sm font-semibold text-gray-700">
            Total encaissé : {euro.format(splitPaymentTotal + parsePriceNumber(splitTipAmountInput))}
          </p>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={closeSplitPaymentModal}
            className="px-4 py-2 border-2 border-black bg-white font-black"
            disabled={splitPaymentProcessing}
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={() => void runSplitPaymentFlow()}
            className="px-4 py-2 border-2 border-black bg-emerald-600 text-white font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:bg-emerald-300 disabled:shadow-none"
            disabled={splitPaymentProcessing || splitPaymentTotal <= 0}
          >
            {splitPaymentProcessing ? "Encaissement..." : "Encaisser la sélection"}
          </button>
        </div>
      </div>
    </div>
  );
}
