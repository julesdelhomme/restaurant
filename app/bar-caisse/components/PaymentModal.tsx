import { Banknote, CreditCard, X } from "lucide-react";

export function PaymentModal(props: any) {
  const {
    encaisseModalTable,
    modalTable,
    closePaymentModal,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    tipAmountInput,
    setTipAmountInput,
    euro,
    parsePriceNumber,
    runPaymentFlow,
    paymentProcessing,
  } = props;

  if (encaisseModalTable == null || !modalTable) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white border-2 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
          <div>
            <h3 className="text-2xl font-black uppercase">Paiement - Table {encaisseModalTable}</h3>
            <p className="text-sm font-semibold">Total : {euro.format(modalTable.total)}</p>
          </div>
          <button type="button" onClick={closePaymentModal} className="h-10 w-10 border-2 border-black inline-flex items-center justify-center bg-white" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 border-2 border-black bg-gray-50 p-3">
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

        <div className="mb-4 border-2 border-black bg-white p-3">
          <label className="mb-1 block text-sm font-black uppercase">Pourboire (facultatif)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={tipAmountInput}
            onChange={(e) => setTipAmountInput(e.target.value)}
            placeholder="0.00"
            className="h-12 w-full border-2 border-black px-3 font-bold"
          />
          <p className="mt-2 text-sm font-semibold text-gray-700">
            Total encaissé : {euro.format(Number(modalTable.total || 0) + parsePriceNumber(tipAmountInput))}
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void runPaymentFlow()}
            disabled={paymentProcessing}
            className="w-full border-2 border-black bg-emerald-600 p-4 text-left text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:bg-emerald-300"
          >
            <div className="text-lg font-black">Encaisser</div>
            <div className="text-sm font-semibold text-emerald-100">
              Confirmer le paiement puis choisir le ticket sur l&apos;écran suivant.
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
