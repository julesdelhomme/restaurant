import React, { useEffect } from "react";
import { resolveSelectedDishLabel } from "@/app/lib/order-item-display";

type TicketItem = {
  quantity?: number;
  name?: string;
  name_fr?: string;
  nom?: string;
  category?: string;
  categorie?: string;
  destination?: string;
  selected_side_label_fr?: string;
  accompagnement_fr?: string;
  selectedSides?: string[];
  selected_option_name?: string;
  selectedExtras?: Array<{ name?: string; name_fr?: string }>;
  specialRequest?: string;
};

type TicketOrder = {
  table_number?: string | number;
  created_at?: string;
  items?: TicketItem[] | string;
};

export default function ThermalTicket({ order, isVisible }: { order: TicketOrder | null; isVisible: boolean }) {
  useEffect(() => {
    if (order && isVisible) {
      setTimeout(() => window.print(), 300);
    }
  }, [order, isVisible]);

  if (!order || !isVisible) return null;

  const keepStaffFrenchLabel = (value: unknown) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    return (raw.split(/\s\/\s/).map((part) => part.trim()).filter(Boolean)[0] || raw)
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  const resolveTicketDestination = (item: TicketItem) => {
    const explicit = String(item.destination || "").trim().toLowerCase();
    if (explicit === "cuisine" || explicit === "bar") return explicit;
    const cat = String(item.categorie || item.category || "").toLowerCase();
    return ["boisson", "boissons", "vin", "vins", "bar", "drink", "drinks", "wine", "wines"].includes(cat) ? "bar" : "cuisine";
  };

  let items: TicketItem[] = Array.isArray(order.items) ? order.items : [];
  if (typeof order.items === "string") {
    try {
      const parsed = JSON.parse(order.items);
      items = Array.isArray(parsed) ? (parsed as TicketItem[]) : [];
    } catch {
      items = [];
    }
  }

  return (
    <>
      <style>{`
        .printable { display: none; }
        @media print {
          .printable { display: block !important; }
          #thermal-ticket {
            width: 80mm !important;
            max-width: 80mm !important;
            min-width: 80mm !important;
            height: auto !important;
            overflow: hidden !important;
            background: #fff !important;
            color: #000 !important;
            font-family: monospace !important;
            font-size: 18px !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
      <div className="printable">
        <div id="thermal-ticket" style={{ background: "#fff", color: "#000", fontFamily: "monospace", padding: 16 }}>
          <div style={{ fontSize: 40, fontWeight: "bold", textAlign: "center", marginBottom: 8 }}>
            TABLE {order.table_number}
          </div>
          <div style={{ borderBottom: "2px solid #000", marginBottom: 8 }} />
          <div>
            {items
              .filter((item) => resolveTicketDestination(item) === "cuisine")
              .map((item, idx) => (
                <div key={idx} style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 22, fontWeight: "bold" }}>
                    {Number(item.quantity || 1)}x {keepStaffFrenchLabel(resolveSelectedDishLabel(item) || item.nom || "Plat inconnu")}
                  </div>
                  {(String(item.selected_side_label_fr || item.accompagnement_fr || "").trim() || (Array.isArray(item.selectedSides) && item.selectedSides.length > 0)) ? (
                    <div style={{ marginLeft: 18, fontSize: 16 }}>
                      - Accompagnement: {(String(item.selected_side_label_fr || item.accompagnement_fr || "").trim()
                        ? [item.selected_side_label_fr || item.accompagnement_fr || ""]
                        : item.selectedSides || []
                      )
                        .map((entry) => keepStaffFrenchLabel(entry))
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  ) : null}
                  {item.selected_option_name ? (
                    <div style={{ marginLeft: 18, fontSize: 16 }}>
                      - OP: {keepStaffFrenchLabel(item.selected_option_name)}
                    </div>
                  ) : null}
                  {Array.isArray(item.selectedExtras) && item.selectedExtras.length > 0 ? (
                    <div style={{ marginLeft: 18, fontSize: 16 }}>
                      - Suppléments:{" "}
                      {item.selectedExtras
                        .map((entry) => keepStaffFrenchLabel(entry?.name_fr || entry?.name || ""))
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  ) : null}
                  {item.specialRequest ? <div style={{ marginLeft: 18, fontSize: 16 }}>- {keepStaffFrenchLabel(item.specialRequest)}</div> : null}
                </div>
              ))}
          </div>
          <div style={{ borderTop: "2px solid #000", margin: "12px 0 4px 0" }} />
          <div style={{ textAlign: "center", fontSize: 18 }}>
            {new Date(order.created_at || 0).toLocaleTimeString("fr-FR")}
          </div>
        </div>
      </div>
    </>
  );
}
