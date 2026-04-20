import { useEffect, useRef, useState } from "react";

type ReadyAlertItem = Record<string, unknown>;
type ReadyAlertOrderLike = { items: unknown };

type UseReadyOrderAlertsOptions<TItem extends ReadyAlertItem = ReadyAlertItem> = {
  parseItems: (raw: unknown) => TItem[];
  isItemReady: (item: TItem) => boolean;
  isItemServed: (item: TItem) => boolean;
};

export function useReadyOrderAlerts<TItem extends ReadyAlertItem = ReadyAlertItem>(
  orders: ReadyAlertOrderLike[],
  options: UseReadyOrderAlertsOptions<TItem>
) {
  const [readyAlertOrderIds, setReadyAlertOrderIds] = useState<Record<string, boolean>>({});
  const [hasReadyTabAlert, setHasReadyTabAlert] = useState(false);
  const readyAlertTimeoutsRef = useRef<Record<string, number>>({});
  const { parseItems, isItemReady, isItemServed } = options;

  function playReadyNotificationBeep() {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx =
        (window as typeof window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.2);
      window.setTimeout(() => void ctx.close().catch(() => undefined), 300);
    } catch (error) {
      console.warn("Beep notification impossible:", error);
    }
  }

  function triggerReadyOrderAlert(orderId: string, playSound = true) {
    const key = String(orderId || "").trim();
    if (!key) return;
    setReadyAlertOrderIds((prev) => ({ ...prev, [key]: true }));
    const existing = readyAlertTimeoutsRef.current[key];
    if (existing) window.clearTimeout(existing);
    readyAlertTimeoutsRef.current[key] = window.setTimeout(() => {
      setReadyAlertOrderIds((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      delete readyAlertTimeoutsRef.current[key];
    }, 8000);
    setHasReadyTabAlert(true);
    if (playSound) playReadyNotificationBeep();
  }

  useEffect(() => {
    return () => {
      Object.values(readyAlertTimeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
      readyAlertTimeoutsRef.current = {};
    };
  }, []);

  useEffect(() => {
    const hasAnyReadyLine = orders.some((order) => {
      const items = parseItems(order.items);
      return items.some((item) => !isItemServed(item) && isItemReady(item));
    });
    setHasReadyTabAlert(hasAnyReadyLine);
  }, [orders]);

  return {
    readyAlertOrderIds,
    hasReadyTabAlert,
    triggerReadyOrderAlert,
    playReadyNotificationBeep,
  };
}
