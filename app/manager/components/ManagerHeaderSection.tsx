// @ts-nocheck
import React from "react";
import { CircleHelp } from "lucide-react";

type ManagerHeaderSectionProps = {
  [key: string]: any;
};

const EmptyMenuPanel = () => null;

export default function ManagerHeaderSection(props: ManagerHeaderSectionProps) {
  const {
    ManagerMenuPanel = EmptyMenuPanel,
    activeManagerTab = "menu",
    handleManagerSignOut = () => undefined,
    managerMenuPanelProps = {},
    router = { push: () => undefined },
    scopedRestaurantId = "",
    setActiveManagerTab = () => undefined,
  } = props;

  return (
<>
        <header className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black">Dashboard Manager</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/${scopedRestaurantId}/manager/archives`)}
                className="px-4 py-2 border-2 border-black font-black rounded-xl bg-white"
              >
                Archives & Rapports
              </button>
              <button
                type="button"
                onClick={() => void handleManagerSignOut()}
                className="px-4 py-2 border-2 border-black font-black rounded-xl bg-white"
              >
                Se déconnecter
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "menu", label: "Ma Carte" },
              { id: "stats", label: "Statistiques" },
              { id: "staff", label: "Staff & Salles" },
              { id: "appearance", label: "Apparence & Style" },
              { id: "configuration", label: "Configuration" },
              { id: "card_designer", label: "Design des Cartes" },
              { id: "security", label: "Securite" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveManagerTab(
                    tab.id as "menu" | "stats" | "staff" | "appearance" | "configuration" | "card_designer" | "security"
                  )
                }
                className={`px-4 py-2 border-2 font-black rounded-xl ${
                  activeManagerTab === tab.id ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
              <div className="min-w-0">
                <div className="font-black text-blue-950">Besoin d&apos;aide ?</div>
                <p className="mt-1 text-sm text-blue-900">
                  Pour toute question ou problème technique, contactez-nous :
                </p>
                <div className="mt-2 text-sm font-bold text-blue-950">
                  <a href="mailto:support@elemdho.fr" className="underline underline-offset-2">
                    support@elemdho.fr
                  </a>
                  {" · "}
                  <a href="tel:0760888872" className="underline underline-offset-2">
                    07 60 88 88 72
                  </a>
                </div>
              </div>
            </div>
          </div>
          <ManagerMenuPanel {...(managerMenuPanelProps || {})} />
        </header>
</>
  );
}
