import { X } from "lucide-react";

export function PostPaymentModal(props: any) {
  const {
    postPaymentModalOpen,
    closePostPaymentModal,
    postPaymentPayload,
    euro,
    openThermalPrint,
    postPaymentEmailMode,
    setPostPaymentEmailMode,
    postPaymentEmail,
    setPostPaymentEmail,
    postPaymentEmailSending,
    setPostPaymentEmailSending,
    sendTicketByEmail,
  } = props;

  if (!postPaymentModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white border-2 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="mb-4 flex items-start justify-between gap-3 border-b-2 border-black pb-3">
          <div>
            <h3 className="text-2xl font-black uppercase">Paiement validé !</h3>
            <p className="text-sm font-semibold text-gray-700">
              Choisissez maintenant l&apos;impression ou l&apos;envoi par e-mail.
            </p>
          </div>
          <button
            type="button"
            onClick={closePostPaymentModal}
            className="h-10 w-10 border-2 border-black inline-flex items-center justify-center bg-white"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {postPaymentPayload ? (
          <div className="mb-4 rounded border border-gray-300 bg-gray-50 p-3 text-sm font-semibold">
            Table {postPaymentPayload.tableNumber} | Total encaissé : {euro.format(
              Number(postPaymentPayload.totalTtc || 0) + Number(postPaymentPayload.tipAmount || 0)
            )}
          </div>
        ) : (
          <div className="mb-4 rounded border border-amber-500 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            Paiement enregistré, ticket indisponible pour cette opération.
          </div>
        )}

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              if (postPaymentPayload) openThermalPrint(postPaymentPayload);
              closePostPaymentModal();
            }}
            className="w-full border-2 border-black bg-indigo-600 p-3 text-left text-white font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:bg-indigo-300"
            disabled={!postPaymentPayload}
          >
            🖨️ Imprimer le ticket
          </button>

          <button
            type="button"
            onClick={() => setPostPaymentEmailMode((prev: boolean) => !prev)}
            className="w-full border-2 border-black bg-blue-600 p-3 text-left text-white font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:bg-blue-300"
            disabled={!postPaymentPayload}
          >
            📧 Envoyer par e-mail
          </button>

          {postPaymentEmailMode ? (
            <div className="rounded border-2 border-black bg-white p-3">
              <label className="mb-1 block text-sm font-black">Email du client</label>
              <input
                type="email"
                value={postPaymentEmail}
                onChange={(event) => setPostPaymentEmail(event.target.value)}
                placeholder="client@email.com"
                className="h-11 w-full border-2 border-black px-3"
                autoFocus
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPostPaymentEmailMode(false)}
                  className="px-3 py-2 border-2 border-black bg-white font-black"
                  disabled={postPaymentEmailSending}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!postPaymentPayload) return;
                    if (!String(postPaymentEmail || "").trim()) {
                      alert("Saisissez une adresse email.");
                      return;
                    }
                    setPostPaymentEmailSending(true);
                    try {
                      await sendTicketByEmail(postPaymentEmail, postPaymentPayload);
                      closePostPaymentModal();
                      alert("Ticket envoyé par email.");
                    } catch (error) {
                      console.error("Erreur envoi email ticket:", error);
                      alert(String((error as { message?: string })?.message || "Erreur d'envoi email."));
                    } finally {
                      setPostPaymentEmailSending(false);
                    }
                  }}
                  className="px-3 py-2 border-2 border-black bg-blue-600 text-white font-black disabled:bg-blue-300"
                  disabled={postPaymentEmailSending}
                >
                  {postPaymentEmailSending ? "Envoi..." : "Envoyer"}
                </button>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={closePostPaymentModal}
            className="w-full border-2 border-black bg-gray-100 p-3 text-left font-black"
          >
            Terminer sans ticket
          </button>
        </div>
      </div>
    </div>
  );
}
