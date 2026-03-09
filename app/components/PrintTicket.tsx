"use client";

import React, { useMemo, useRef, useEffect } from "react";

interface OrderItem {
  dish?: {
    name?: string;
    nom?: string;
    price?: number;
    categorie?: string;
    category?: string;
  };
  name?: string;
  categorie?: string;
  category?: string;
  quantity?: number;
  price?: number;
  special_request?: string;
  instructions?: string;
}

interface Order {
  id: string;
  table_number: number;
  items: unknown;
  status: string;
  created_at: string;
  notes?: string;
}

interface PrintTicketProps {
  order: Order | null;
  isVisible: boolean;
  logoUrl?: string;
  restaurantName?: string;
  categoryFilter?: 'drinks' | 'food' | null;
}

export default function PrintTicket({ order, isVisible, logoUrl, restaurantName, categoryFilter }: PrintTicketProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const parsedItems = useMemo<OrderItem[]>(() => {
    const raw = order?.items;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as OrderItem[];
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw || "[]");
        return Array.isArray(parsed) ? (parsed as OrderItem[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [order?.items]);

  const filteredItems = useMemo(() => {
    return parsedItems.filter((item) => {
      if (!categoryFilter) return true;
      const category = (item?.categorie || item?.category || "").toLowerCase();
      const isDrink = category === "boisson" || category === "boissons";
      return categoryFilter === 'drinks' ? isDrink : !isDrink;
    });
  }, [parsedItems, categoryFilter]);

  useEffect(() => {
    if (isVisible && order && iframeRef.current && filteredItems.length > 0) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(`
          <html>
            <head>
              <style>
                body {
                  font-family: monospace;
                  font-size: 14px;
                  line-height: 1.2;
                  margin: 0;
                  padding: 0;
                  color: #000;
                  background: #fff;
                }
                .ticket {
                  border: 1px dashed #000;
                  padding: 10px;
                  max-width: 80mm;
                  margin: 0 auto;
                }
                @media print {
                  body * {
                    visibility: visible !important;
                  }
                  .ticket {
                    border: 1px dashed #000 !important;
                    padding: 10px !important;
                    margin: 0 !important;
                  }
                }
              </style>
            </head>
            <body>
              <div class="ticket">
                ${(logoUrl || restaurantName) ? `
                  <div style="text-align: center; margin-bottom: 10px;">
                    ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height: 40px; object-fit: contain;" />` : ''}
                    ${restaurantName ? `<div style="font-weight: bold;">${restaurantName}</div>` : ''}
                  </div>
                ` : ''}
                <div style="text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 5px;">TABLE ${order.table_number}</div>
                <div style="text-align: center; font-size: 12px; margin-bottom: 10px;">
                  ${new Date(order.created_at).toLocaleTimeString("fr-FR")}
                </div>
                <div style="border-bottom: 1px dashed #000; margin-bottom: 10px;"></div>
                <div>
                  ${filteredItems.map((item, index) => {
                    const itemName = item?.name || "Plat inconnu";
                    return `
                      <div style="margin-bottom: 5px;">
                        <div style="display: flex; justify-content: space-between;">
                          <span>${item?.quantity || 0}x</span>
                          <span style="flex: 1; margin-left: 10px;">${itemName}</span>
                        </div>
                        ${(item?.special_request || item?.instructions) ? `
                          <span style="color: #000; font-weight: bold; font-size: 12px;">
                            ${item.special_request || item.instructions}
                          </span>
                        ` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </body>
          </html>
        `);
        iframeDoc.close();

        // Trigger print after a short delay
        setTimeout(() => {
          iframe.contentWindow?.print();
        }, 100);
      }
    }
  }, [isVisible, order, logoUrl, restaurantName, categoryFilter, filteredItems]);

  return (
    <iframe
      ref={iframeRef}
      style={{ display: 'none' }}
      title="Print Ticket"
    />
  );
}
