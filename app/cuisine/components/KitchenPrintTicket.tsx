import { useEffect, useRef, useState } from "react";
import type { Item, Order } from "../types";

type KitchenPrintTicketProps = {
  printOrderId: string;
  printOrder: Order | null;
  printableCuisineItems: (order: Order) => Item[];
  getUpcomingKitchenItems: (order: Order) => Item[];
  getKitchenSelectedOptionLines: (item: Item) => string[];
  resolveKitchenDishName: (item: Item) => string;
  triggerOrderId: string;
  triggerPrintNonce: number;
  onPrinted?: (payload: { orderId: string; nonce: number; step: number }) => void;
};

export function KitchenPrintTicket({
  printOrderId,
  printOrder,
  printableCuisineItems,
  getUpcomingKitchenItems,
  getKitchenSelectedOptionLines,
  resolveKitchenDishName,
  triggerOrderId,
  triggerPrintNonce,
  onPrinted,
}: KitchenPrintTicketProps) {
  const [resolvedPrintOrder, setResolvedPrintOrder] = useState<Order | null>(null);
  const [loadingOrderId, setLoadingOrderId] = useState<string>("");
  const lastPrintedKey = useRef<string | null>(null);

  useEffect(() => {
    const normalizedPrintOrderId = String(printOrderId || printOrder?.id || "").trim();
    const normalizedOrderId = String(printOrder?.id || "").trim();

    // Anti-fuite entre tables: reset immédiat avant de charger la commande ciblée.
    setResolvedPrintOrder(null);
    setLoadingOrderId(normalizedPrintOrderId);

    if (!normalizedPrintOrderId) {
      setLoadingOrderId("");
      return;
    }

    if (normalizedOrderId && normalizedOrderId === normalizedPrintOrderId && printOrder) {
      setResolvedPrintOrder(printOrder);
      setLoadingOrderId("");
      return;
    }

    setLoadingOrderId("");
  }, [printOrderId, printOrder]);

  const resolveTicketLabel = (item: Item) => {
    const displayName =
      (item as unknown as { dish?: { name_fr?: string }; name_fr?: string; name?: string }).dish?.name_fr ||
      (item as unknown as { name_fr?: string }).name_fr ||
      (item as unknown as { name?: string }).name;
    return displayName || "Plat";
  };

  const uniqueTexts = (values: string[]) => {
    const seen = new Set<string>();
    return values
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .filter((value) => {
        const key = value
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  const splitValues = (value: string) =>
    String(value || "")
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);

  const extractPrintDetailGroups = (item: Item) => {
    const prefixedLines = getKitchenSelectedOptionLines(item);
    const sides: string[] = [];
    const cooking: string[] = [];
    const options: string[] = [];
    const supplements: string[] = [];

    prefixedLines.forEach((line) => {
      const text = String(line || "").trim();
      if (!text) return;
      if (/^ACC\s*:/i.test(text)) {
        sides.push(...splitValues(text.replace(/^ACC\s*:\s*/i, "")));
        return;
      }
      if (/^CUI\s*:/i.test(text)) {
        cooking.push(...splitValues(text.replace(/^CUI\s*:\s*/i, "")));
        return;
      }
      if (/^SUP\s*:/i.test(text)) {
        supplements.push(...splitValues(text.replace(/^SUP\s*:\s*/i, "")));
        return;
      }
      if (/^OP\s*:/i.test(text)) {
        options.push(...splitValues(text.replace(/^OP\s*:\s*/i, "")));
      }
    });

    return {
      sides: uniqueTexts(sides),
      cooking: uniqueTexts(cooking),
      options: uniqueTexts(options),
      supplements: uniqueTexts(supplements),
    };
  };

  const order = resolvedPrintOrder;
  const orderItems = order ? printableCuisineItems(order) : [];

  useEffect(() => {
    if (!order || !order.id) {
      return;
    }

    if (typeof window === "undefined" || typeof window.print !== "function") return;

    // 1. On bloque si les données ne sont pas encore là
    if (!orderItems || orderItems.length === 0) {
      return;
    }

    const resolveStep = (item: Item) => {
      const rawStep = (item as unknown as Record<string, unknown>).step_number;
      const numeric = Number(rawStep || 1);
      return Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : 1;
    };

    // 2. La logique de scan (déjà en place)
    const uniqueSteps = [...new Set(orderItems.map((item) => resolveStep(item)))];
    let needsPrinting = false;
    let callbackStep = 1;

    uniqueSteps.forEach((step) => {
      const itemsForStep = orderItems.filter((item) => resolveStep(item) === step);
      const printKey = `${order?.id}_step${step}_count${itemsForStep.length}`;

      if (!window.sessionStorage.getItem(printKey)) {
        needsPrinting = true;
        callbackStep = Number(step) || 1;
        lastPrintedKey.current = printKey;
        window.sessionStorage.setItem(printKey, "true");
      }
    });

    // 3. L'impression avec le délai d'1 seconde
    if (needsPrinting) {
      const timer = window.setTimeout(() => {
        window.print();
        onPrinted?.({
          orderId: String(order?.id || "").trim(),
          nonce: Number(triggerPrintNonce) || 0,
          step: callbackStep,
        });
      }, 1000);
      return () => {
        window.clearTimeout(timer);
      };
    }
  }, [order, orderItems]);

  const activeOrder = resolvedPrintOrder;
  if (!activeOrder) return null;
  const normalizedPrintOrderId = String(printOrderId || activeOrder.id || "").trim();
  const normalizedOrderId = String(activeOrder.id || "").trim();
  if (normalizedPrintOrderId && normalizedOrderId && normalizedPrintOrderId !== normalizedOrderId) {
    false && console.warn("TRACE:", {
      context: "kitchen.KitchenPrintTicket.mismatchedOrder",
      expectedOrderId: normalizedPrintOrderId,
      providedOrderId: normalizedOrderId,
    });
    return null;
  }
  const currentStepItems = printableCuisineItems(activeOrder);
  const upcomingItems = getUpcomingKitchenItems(activeOrder);
  const activeOrderId = String(activeOrder?.id || "");
  false && console.log("TRACE:", {
    context: "kitchen.KitchenPrintTicket",
    expectedOrderId: normalizedPrintOrderId || null,
    orderId: activeOrderId || null,
    loadingOrderId: loadingOrderId || null,
    currentStepItemsCount: currentStepItems.length,
    currentStepItemsCountSafe: currentStepItems.length,
    upcomingItemsCount: upcomingItems.length,
    currentStepItems: currentStepItems.map((item) => {
      const record = item as unknown as Record<string, unknown>;
      return {
        order_item_id: String(record.order_item_id ?? record.orderItemId ?? "").trim() || null,
        dish_id: String(record.dish_id ?? item.id ?? "").trim() || null,
        name: resolveTicketLabel(item),
        quantity: Number(item.quantity || 1),
      };
    }),
  });

  return (
    <div id="ticket-print" className="hidden p-4 text-black print:block">
      <div className="text-xl font-bold">
        CUISINE - T-{activeOrder.table_number}
        {Number(activeOrder.covers || activeOrder.guest_count || activeOrder.customer_count) > 0
          ? ` | Couverts: ${Number(activeOrder.covers || activeOrder.guest_count || activeOrder.customer_count)}`
          : ""}
      </div>
      <div className="border-y border-dashed border-black py-2">
        {currentStepItems.length === 0 ? (
          (() => {
            false && console.log("TRACE:", {
              context: "kitchen.KitchenPrintTicket.emptyCurrentStepItems",
              orderId: activeOrderId || null,
              tableNumber: activeOrder?.table_number ?? null,
            });
            return null;
          })()
        ) : null}
        {currentStepItems.map((item, idx) => {
          const details = extractPrintDetailGroups(item);
          return (
            <div key={`print-${String(activeOrder.id)}-${idx}-${String(item.dish_id || item.id || "")}`} className="text-lg font-black">
              {item.quantity}x{" "}
              <span translate="no" className="notranslate">
                {resolveTicketLabel(item)}
              </span>
              {details.sides.map((label, lineIndex) => (
                <div
                  key={`print-acc-${String(activeOrder.id)}-${idx}-${lineIndex}`}
                  translate="no"
                  className="notranslate"
                  style={{ fontSize: "12px", marginLeft: "10px", fontWeight: 400 }}
                >
                  CC: {label}
                </div>
              ))}
              {details.cooking.map((label, lineIndex) => (
                <div
                  key={`print-cui-${String(activeOrder.id)}-${idx}-${lineIndex}`}
                  translate="no"
                  className="notranslate"
                  style={{ fontSize: "12px", marginLeft: "10px", fontWeight: 400 }}
                >
                  OP: {label}
                </div>
              ))}
              {details.options.map((label, lineIndex) => (
                <div
                  key={`print-op-${String(activeOrder.id)}-${idx}-${lineIndex}`}
                  translate="no"
                  className="notranslate"
                  style={{ fontSize: "12px", marginLeft: "10px", fontWeight: 400 }}
                >
                  - OP: {label}
                </div>
              ))}
              {details.supplements.map((label, lineIndex) => (
                <div
                  key={`print-sup-${String(activeOrder.id)}-${idx}-${lineIndex}`}
                  translate="no"
                  className="notranslate"
                  style={{ fontSize: "12px", marginLeft: "10px", fontWeight: 400 }}
                >
                  - SUP: {label}
                </div>
              ))}
            </div>
          );
        })}

        {upcomingItems.length > 0 ? (
          <div className="mt-2 text-[10px] font-bold uppercase tracking-wide">
            A SUIVRE :
            <div className="mt-1 space-y-0.5 normal-case font-normal">
              {upcomingItems.map((item, idx) => {
                const details = extractPrintDetailGroups(item);
                return (
                  <div
                    key={`print-upcoming-${String(activeOrder.id)}-${idx}-${String(item.dish_id || item.id || "")}`}
                    className="notranslate"
                    translate="no"
                  >
                    <div>- {Math.max(1, Number(item.quantity) || 1)}x {resolveTicketLabel(item)}</div>
                    <div className="ml-3 text-[10px]">
                      {details.sides.length > 0 ? (
                        <div>
                          {details.sides.map((label, lineIndex) => (
                            <div key={`print-upcoming-acc-${String(activeOrder.id)}-${idx}-${lineIndex}`}>CC: {label}</div>
                          ))}
                        </div>
                      ) : null}
                      {details.cooking.length > 0 ? (
                        <div>
                          {details.cooking.map((label, lineIndex) => (
                            <div key={`print-upcoming-cui-${String(activeOrder.id)}-${idx}-${lineIndex}`}>OP: {label}</div>
                          ))}
                        </div>
                      ) : null}
                      {details.options.length > 0 ? (
                        <div>
                          {details.options.map((label, lineIndex) => (
                            <div key={`print-upcoming-op-${String(activeOrder.id)}-${idx}-${lineIndex}`}>- OP: {label}</div>
                          ))}
                        </div>
                      ) : null}
                      {details.supplements.length > 0 ? (
                        <div>
                          {details.supplements.map((label, lineIndex) => (
                            <div key={`print-upcoming-sup-${String(activeOrder.id)}-${idx}-${lineIndex}`}>- SUP: {label}</div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}



