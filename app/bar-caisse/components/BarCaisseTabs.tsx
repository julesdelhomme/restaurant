import { MessageSquare } from "lucide-react";

export function BarCaisseTabs(props: any) {
  const {
    activeTab,
    setActiveTab,
    hasNewDrinkAlert,
    setKitchenNoteOpen,
    kitchenNoteFeedback,
  } = props;

  return (
    <>
      <div className="mb-6 w-full overflow-x-auto whitespace-nowrap">
        <div className="inline-flex items-center gap-2">
          <button onClick={() => setActiveTab("boissons")} className={`relative px-4 py-3 border-2 border-black font-black ${activeTab === "boissons" ? "bg-blue-600 text-white" : "bg-white text-black"}`}>
            Bar - Boissons
            {hasNewDrinkAlert && activeTab !== "boissons" ? <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse border border-black" /> : null}
          </button>
          <button onClick={() => setActiveTab("caisse")} className={`px-4 py-3 border-2 border-black font-black ${activeTab === "caisse" ? "bg-emerald-600 text-white" : "bg-white text-black"}`}>Caisse</button>
          <button onClick={() => setActiveTab("inventaire")} className={`px-4 py-3 border-2 border-black font-black ${activeTab === "inventaire" ? "bg-black text-white" : "bg-white text-black"}`}>Inventaire</button>
          <button
            type="button"
            onClick={() => setKitchenNoteOpen(true)}
            className="inline-flex items-center gap-2 border-2 border-black bg-amber-300 px-4 py-3 font-black text-black"
          >
            <MessageSquare className="h-4 w-4" />
            Note Cuisine
          </button>
        </div>
      </div>
      {kitchenNoteFeedback ? (
        <div className="mb-4 rounded border-2 border-black bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-900">
          {kitchenNoteFeedback}
        </div>
      ) : null}
    </>
  );
}
