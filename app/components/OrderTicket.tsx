import React from "react";

type OrderTicketItem = {
  quantity?: number;
  name?: string;
  nom?: string;
  category?: string;
  categorie?: string;
  "catégorie"?: string;
};

type OrderTicketOrder = {
  table_number?: string | number;
  created_at?: string;
  special_request?: string;
  items?: unknown;
};

function parseItems(items: unknown): OrderTicketItem[] {
  if (Array.isArray(items)) return items as OrderTicketItem[];
  if (typeof items === "string") {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? (parsed as OrderTicketItem[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function keepStaffFrenchLabel(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return (raw.split(/\s\/\s/).map((part) => part.trim()).filter(Boolean)[0] || raw)
    .replace(/\s{2,}/g, " ")
    .trim();
}

export default function OrderTicket({ order }: { order: OrderTicketOrder | null }) {
  if (!order) return null;

  const items = parseItems(order.items);

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm !important;
            background: #fff !important;
          }
          body * { visibility: hidden !important; }
          #section-to-print, #section-to-print * { visibility: visible !important; }
          #section-to-print { position: absolute; left: 0; top: 0; width: 80mm; background: #fff !important; color: #000 !important; }
        }
      `}</style>
      <div id="section-to-print" style={{ background: "#fff", color: "#000", fontFamily: "monospace", padding: 16 }}>
        <div style={{ fontSize: 48, fontWeight: "bold", textAlign: "center", marginBottom: 8 }}>
          TABLE {order.table_number}
        </div>
        <div style={{ textAlign: "center", fontSize: 20, marginBottom: 8 }}>
          {order.created_at ? new Date(order.created_at).toLocaleTimeString("fr-FR") : ""}
        </div>
        <div style={{ borderBottom: "2px solid #000", marginBottom: 8 }} />
        <div style={{ marginBottom: 16 }}>
          {items
            .filter((item) => {
              const cat = String(item["catégorie"] || item.categorie || item.category || "")
                .toLowerCase()
                .trim();
              return !["boisson", "boissons", "vin", "vins", "bar", "drink", "drinks", "wine", "wines"].includes(cat);
            })
              .map((item, idx) => (
              <div key={idx} style={{ fontSize: 22, fontWeight: "bold", marginBottom: 4 }}>
                {Number(item.quantity || 1)}x {keepStaffFrenchLabel(item.name || item.nom || "Plat inconnu")}
              </div>
            ))}
        </div>
        {order.special_request ? (
          <div style={{ fontSize: 22, fontWeight: "bold", margin: "16px 0 8px 0", textAlign: "center" }}>
            📝 {order.special_request}
          </div>
        ) : null}
      </div>
    </>
  );
}
