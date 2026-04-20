// app/manager/hooks/useManagerAnalytics.ts
import { useMemo } from "react";

export function useManagerAnalytics(orders: any[], analyticsRange: string) {
  
  const analyticsData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const rangeDays = analyticsRange === "today" ? 1 : analyticsRange === "7d" ? 7 : 30;
    const rangeStart = new Date(startOfToday);
    rangeStart.setDate(rangeStart.getDate() - (rangeDays - 1));

    // Fonction sécurisée pour lire les items (Fix Sync Admin)
    const readItems = (order: any) => {
      const raw = order.items;
      if (Array.isArray(raw)) return raw;
      try { return typeof raw === "string" ? JSON.parse(raw) : []; } catch { return []; }
    };

    const inRangeOrders = orders.filter((order) => {
      const date = new Date(order.created_at);
      return date >= rangeStart && date <= now;
    });

    const paidOrders = inRangeOrders.filter((order) => order.status?.toLowerCase() === "paid");

    const realRevenue = paidOrders.reduce((sum, order) => sum + (Number(order.total_price) || 0), 0);
    const averageBasket = paidOrders.length > 0 ? realRevenue / paidOrders.length : 0;

    const productMix = { starters: 0, mains: 0, desserts: 0, drinks: 0 };
    const productCountMap = new Map();

    paidOrders.forEach((order) => {
      const items = readItems(order);
      items.forEach((item: any) => {
        const qty = Number(item.quantity || item.qty || 1);
        const name = item.name || item.dish?.name_fr || "Produit";
        productCountMap.set(name, (productCountMap.get(name) || 0) + qty);
        
        const cat = String(item.category_name || item.dish?.category_name || "").toLowerCase();
        if (cat.includes("entree") || cat.includes("starter")) productMix.starters += qty;
        else if (cat.includes("dessert") || cat.includes("sucre")) productMix.desserts += qty;
        else if (cat.includes("boisson") || cat.includes("drink")) productMix.drinks += qty;
        else productMix.mains += qty;
      });
    });

    return {
      realRevenue,
      averageBasket,
      paidOrdersCount: paidOrders.length,
      productMixData: [
        { name: "Entr\u00e9es", value: productMix.starters }, // UTF-8 pour les accents
        { name: "Plats", value: productMix.mains },
        { name: "Desserts", value: productMix.desserts },
        { name: "Boissons", value: productMix.drinks },
      ],
      top5: [...productCountMap.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count).slice(0, 5)
    };
  }, [orders, analyticsRange]);

  return analyticsData;
}