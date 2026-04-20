import { MessageSquare } from "lucide-react";

type AdminTab = "orders" | "sessions" | "new-order" | "service";

type AdminTabsBarProps = {
  showNewOrderTab: boolean;
  resolvedActiveTab: AdminTab;
  hasReadyTabAlert: boolean;
  onChangeTab: (tab: AdminTab) => void;
  onOpenKitchenNote: () => void;
};

export function AdminTabsBar({
  showNewOrderTab,
  resolvedActiveTab,
  hasReadyTabAlert,
  onChangeTab,
  onOpenKitchenNote,
}: AdminTabsBarProps) {
  return (
    <div className="mb-4 w-full overflow-x-auto whitespace-nowrap">
      <div className="inline-flex items-center gap-2">
        {showNewOrderTab ? (
          <button
            onClick={() => onChangeTab("new-order")}
            className={`px-4 py-3 border-2 border-black font-black ${
              resolvedActiveTab === "new-order" ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            Prendre une commande
          </button>
        ) : null}
        <button
          onClick={() => onChangeTab("orders")}
          className={`relative px-4 py-3 border-2 border-black font-black ${
            resolvedActiveTab === "orders" ? "bg-black text-white" : "bg-white text-black"
          }`}
        >
          Commandes
          {hasReadyTabAlert && resolvedActiveTab !== "orders" ? (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse border border-black" />
          ) : null}
        </button>
        <button
          onClick={() => onChangeTab("sessions")}
          className={`px-4 py-3 border-2 border-black font-black ${
            resolvedActiveTab === "sessions" ? "bg-black text-white" : "bg-white text-black"
          }`}
        >
          Ouvrir une table
        </button>
        <button
          type="button"
          onClick={onOpenKitchenNote}
          className="inline-flex items-center gap-2 border-2 border-black bg-amber-300 px-4 py-3 font-black text-black"
        >
          <MessageSquare className="h-4 w-4" />
          Note Cuisine
        </button>
      </div>
    </div>
  );
}
