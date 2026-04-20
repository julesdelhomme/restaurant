import { Send } from "lucide-react";

export function KitchenNoteModal(props: any) {
  const {
    kitchenNoteOpen,
    setKitchenNoteOpen,
    kitchenNoteText,
    setKitchenNoteText,
    kitchenNoteSending,
    handleSendKitchenNote,
  } = props;

  if (!kitchenNoteOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-lg rounded-lg border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="text-lg font-black uppercase">Note Cuisine</h3>
        <p className="mt-1 text-sm font-semibold text-gray-700">
          Redigez un message rapide pour l'equipe cuisine.
        </p>
        <textarea
          value={kitchenNoteText}
          onChange={(event) => setKitchenNoteText(event.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Ex: Priorite table 12 pour les desserts."
          className="mt-3 w-full resize-none rounded border-2 border-black px-3 py-2 text-sm font-semibold text-black"
        />
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setKitchenNoteOpen(false);
              setKitchenNoteText("");
            }}
            className="rounded border-2 border-black bg-white px-3 py-2 text-sm font-black text-black"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void handleSendKitchenNote()}
            disabled={kitchenNoteSending}
            className="inline-flex items-center gap-2 rounded border-2 border-black bg-black px-3 py-2 text-sm font-black text-white disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {kitchenNoteSending ? "Envoi..." : "Envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}
