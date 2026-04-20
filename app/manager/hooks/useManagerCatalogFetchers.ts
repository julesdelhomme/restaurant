import { supabase } from "../../lib/supabase";
import type { Dish, Order, ReviewRow, SideLibraryItem, SubCategoryItem } from "../types";

export function useManagerCatalogFetchers(deps: Record<string, any>) {
  const {
    scopedRestaurantId,
    setReviews,
    sevenDaysAgoIso,
    toLoggableSupabaseError,
    setCriticalStock,
    setSubCategoryRows,
    setSubCategories,
    categories,
    setSidesLibrary,
    setAllergenLibrary,
    createDefaultAllergenLibrary,
    hasAllergenLibraryTableRef,
    isMissingTableError,
    parseAllergenLibrary,
    supabaseUrl,
    supabaseKey,
    setOrders,
    setStats,
  } = deps;

  const fetchReviews = async () => {
    try {
      if (!scopedRestaurantId) {
        setReviews([]);
        return;
      }

      let data: unknown[] | null = null;
      let error: unknown = null;
      const joined = await supabase
        .from("reviews")
        .select("*, dish:dishes(id,name,name_fr,image_url)")
        .eq("restaurant_id", scopedRestaurantId)
        .gte("created_at", sevenDaysAgoIso)
        .order("created_at", { ascending: false })
        .limit(100);

      data = (joined.data as unknown[]) || null;
      error = joined.error;
      if (joined.error) {
        const fallback = await supabase
          .from("reviews")
          .select("*")
          .eq("restaurant_id", scopedRestaurantId)
          .gte("created_at", sevenDaysAgoIso)
          .order("created_at", { ascending: false })
          .limit(100);
        data = (fallback.data as unknown[]) || null;
        error = fallback.error;
      }

      if (error) {
        const code = String((error as { code?: string })?.code || "");
        if (code === "42P01") {
          console.warn("Table reviews absente ou schema incomplet:", (error as { message?: string })?.message || error);
          setReviews([]);
          return;
        }
        if (code !== "42703") {
          console.error("Erreur chargement reviews:", toLoggableSupabaseError(error));
          return;
        }
      }

      let reviewRows = Array.isArray(data) ? (data as ReviewRow[]) : [];
      if (reviewRows.length === 0 || String((error as { code?: string })?.code || "") === "42703") {
        let relatedOrders = await supabase
          .from("orders")
          .select("id")
          .eq("restaurant_id", scopedRestaurantId)
          .gte("created_at", sevenDaysAgoIso)
          .order("created_at", { ascending: false })
          .limit(400);
        if (relatedOrders.error && String((relatedOrders.error as { code?: string })?.code || "") === "42703") {
          relatedOrders = await supabase
            .from("orders")
            .select("id")
            .eq("restaurant_id", scopedRestaurantId)
            .gte("created_at", sevenDaysAgoIso)
            .order("created_at", { ascending: false })
            .limit(400);
        }
        const orderIds = Array.isArray(relatedOrders.data)
          ? relatedOrders.data
              .map((row) => String((row as { id?: string | number | null })?.id || "").trim())
              .filter(Boolean)
          : [];
        if (!relatedOrders.error && orderIds.length > 0) {
          let byOrder = await supabase
            .from("reviews")
            .select("*, dish:dishes(id,name,name_fr,image_url)")
            .in("order_id", orderIds)
            .gte("created_at", sevenDaysAgoIso)
            .order("created_at", { ascending: false })
            .limit(100);
          if (byOrder.error) {
            byOrder = await supabase
              .from("reviews")
              .select("*")
              .in("order_id", orderIds)
              .gte("created_at", sevenDaysAgoIso)
              .order("created_at", { ascending: false })
              .limit(100);
          }
          if (!byOrder.error && Array.isArray(byOrder.data)) {
            reviewRows = byOrder.data as ReviewRow[];
          }
        }
      }
      setReviews(reviewRows);
    } catch (error) {
      console.warn("Chargement reviews ignore:", error);
    }
  };

  const fetchCriticalStock = async () => {
    if (!scopedRestaurantId) {
      setCriticalStock([]);
      return;
    }

    let result = await supabase.from("dishes").select("*").eq("active", false).eq("restaurant_id", scopedRestaurantId);

    if (result.error && String((result.error as { code?: string })?.code || "") === "42703") {
      result = await supabase.from("dishes").select("*").eq("active", false).eq("restaurant_id", scopedRestaurantId);
    }

    if (result.error) {
      console.error("Erreur stock critique:", result.error);
      setCriticalStock([]);
      return;
    }

    setCriticalStock((result.data || []) as Dish[]);
  };

  const fetchSubCategories = async () => {
    if (!scopedRestaurantId) {
      setSubCategoryRows([]);
      setSubCategories({});
      return;
    }

    let result = await supabase
      .from("subcategories")
      .select("*")
      .eq("restaurant_id", scopedRestaurantId)
      .order("category_id", { ascending: true })
      .order("name_fr", { ascending: true });

    if (result.error && String((result.error as { code?: string })?.code || "") === "42703") {
      result = await supabase
        .from("subcategories")
        .select("*")
        .eq("restaurant_id", scopedRestaurantId)
        .order("category_id", { ascending: true })
        .order("name_fr", { ascending: true });
    }

    if (result.error) {
      setSubCategoryRows([]);
      setSubCategories({});
      return;
    }

    const rows = (result.data || []) as SubCategoryItem[];
    setSubCategoryRows(rows);
    const map: Record<string, string[]> = {};
    const categoryMap = new Map<string, string>(categories.map((category: any) => [String(category.id), category.name_fr]));
    rows.forEach((row) => {
      const categoryName = categoryMap.get(String(row.category_id));
      if (!categoryName) return;
      if (!map[categoryName]) map[categoryName] = [];
      map[categoryName].push(row.name_fr);
    });
    setSubCategories(map);
  };

  const fetchSidesLibrary = async () => {
    if (!scopedRestaurantId) {
      setSidesLibrary([]);
      return;
    }

    let result = await supabase
      .from("sides_library")
      .select("*")
      .eq("restaurant_id", scopedRestaurantId)
      .order("id", { ascending: true });

    if (result.error && String((result.error as { code?: string })?.code || "") === "42703") {
      result = await supabase
        .from("sides_library")
        .select("*")
        .eq("restaurant_id", scopedRestaurantId)
        .order("id", { ascending: true });
    }

    if (result.error) {
      console.error("Erreur fetch sides_library (scope restaurant):", result.error);
      setSidesLibrary([]);
      return;
    }

    setSidesLibrary((result.data || []) as SideLibraryItem[]);
  };

  const fetchAllergenLibrary = async () => {
    if (!scopedRestaurantId) {
      setAllergenLibrary(createDefaultAllergenLibrary());
      return;
    }
    if (!hasAllergenLibraryTableRef.current) {
      setAllergenLibrary(createDefaultAllergenLibrary());
      return;
    }

    const result = await supabase
      .from("allergen_library")
      .select("*")
      .eq("restaurant_id", scopedRestaurantId)
      .order("id", { ascending: true });

    if (result.error) {
      if (isMissingTableError(result.error)) {
        hasAllergenLibraryTableRef.current = false;
        setAllergenLibrary(createDefaultAllergenLibrary());
        return;
      }
      console.warn("Erreur fetch allergen_library (scope restaurant):", result.error.message);
      setAllergenLibrary(createDefaultAllergenLibrary());
      return;
    }

    if (result.data && result.data.length > 0) {
      const parsed = parseAllergenLibrary(result.data);
      setAllergenLibrary(parsed.length > 0 ? parsed : createDefaultAllergenLibrary());
    } else {
      setAllergenLibrary(createDefaultAllergenLibrary());
    }
  };

  const fetchOrders = async () => {
    try {
      if (!scopedRestaurantId) {
        setOrders([]);
        return;
      }

      let response = await fetch(
        `${supabaseUrl}/rest/v1/orders?select=*&order=created_at.desc&restaurant_id=eq.${encodeURIComponent(scopedRestaurantId)}`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      let data = await response.json();
      if (
        !response.ok &&
        (String((data as { code?: string })?.code || "") === "42703" ||
          String((data as { message?: string })?.message || "").toLowerCase().includes("schema cache") ||
          String((data as { message?: string })?.message || "").toLowerCase().includes("column"))
      ) {
        response = await fetch(
          `${supabaseUrl}/rest/v1/orders?select=*&order=created_at.desc&restaurant_id=eq.${encodeURIComponent(scopedRestaurantId)}`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
          }
        );
        data = await response.json();
      }

      if (!response.ok) {
        console.error("Erreur lors de la recuperation des commandes (scope restaurant):", data);
        setOrders([]);
        return;
      }

      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Erreur lors de la recuperation des commandes:", error);
      setOrders([]);
    }
  };

  const calculateStats = (ordersData: Order[]) => {
    let totalRevenue = 0;
    let totalTips = 0;
    let todayRevenue = 0;
    let todayTips = 0;
    let weekRevenue = 0;
    let weekTips = 0;
    let todayOrdersCount = 0;
    const today = new Date().toDateString();
    const dishCounts: Record<string, number> = {};
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const weekMap: Record<string, number> = {};
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);

    const paidOrders = ordersData.filter((order) => String(order.status || "").toLowerCase() === "paid");

    paidOrders.forEach((order) => {
      const orderTip = Number(order.tip_amount ?? order.tips ?? 0);
      if (Number.isFinite(orderTip) && orderTip > 0) {
        totalTips += orderTip;
      }
      const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
      let orderTotal = 0;

      items.forEach((item: any) => {
        const dishName = item?.name || item?.dish?.name || item?.dish?.nom || "Plat supprime";
        const quantity = Number(item.quantity || 1);
        const itemPrice = Number(item.price || 0) * quantity;
        dishCounts[dishName] = (dishCounts[dishName] || 0) + quantity;
        totalRevenue += itemPrice;
        orderTotal += itemPrice;
      });

      if (!orderTotal) {
        const fallbackTotal = Number(order.total_price ?? order.total ?? 0);
        if (Number.isFinite(fallbackTotal) && fallbackTotal > 0) {
          orderTotal = fallbackTotal;
          totalRevenue += fallbackTotal;
        }
      }

      const orderDate = new Date(order.created_at).toDateString();
      if (orderDate === today) {
        todayRevenue += orderTotal;
        todayTips += Number.isFinite(orderTip) ? orderTip : 0;
        todayOrdersCount++;
      }
      const orderDateObj = new Date(order.created_at);
      if (orderDateObj >= weekAgo) {
        weekRevenue += orderTotal;
        weekTips += Number.isFinite(orderTip) ? orderTip : 0;
        const dayKey = dayNames[orderDateObj.getDay()];
        weekMap[dayKey] = (weekMap[dayKey] || 0) + 1;
      }
    });

    const topDishes = Object.entries(dishCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const averageBasket = todayOrdersCount > 0 ? todayRevenue / todayOrdersCount : 0;

    setStats({
      total: totalRevenue,
      totalTips,
      todayRevenue,
      todayTips,
      weekRevenue,
      weekTips,
      todayOrdersCount,
      averageBasket,
      topDishes,
      weekByDay: dayNames.map((day) => ({ day, count: weekMap[day] || 0 })),
    });
  };

  return {
    fetchReviews,
    fetchCriticalStock,
    fetchSubCategories,
    fetchSidesLibrary,
    fetchAllergenLibrary,
    fetchOrders,
    calculateStats,
  };
}
