$content = [System.IO.File]::ReadAllText('c:\Users\Jules067\menu-qr\app\bar-caisse\page.tsx')

# Fix 5: handleDrinkReady - mettre a jour order_items avec status='ready'
$oldDrinkReady = '    const { error } = await supabase
      .from("orders")
      .update({ items: nextItems, status: nextStatus })
      .eq("id", orderId);
    if (error) {
      console.error("Erreur Boisson prete:", error);
      await fetchOrders();
    }
  };'

$newDrinkReady = '    // Mettre a jour order_items (items bar) avec status ready
    const rawItems = Array.isArray((targetOrder as any).items) ? (targetOrder as any).items as OrderItem[] : currentItems;
    const barItemIds = rawItems
      .filter((item) => resolveStaffDestination(item, categoryDestinationById, dishCategoryIdByDishId) === "bar")
      .map((item) => String((item as any).id || (item as any).order_item_id || "").trim())
      .filter(Boolean);
    if (barItemIds.length > 0) {
      await supabase.from("order_items").update({ status: "ready" }).in("id", barItemIds as never[]);
    }
    const { error } = await supabase
      .from("orders")
      .update({ items: nextItems, status: nextStatus })
      .eq("id", orderId);
    if (error) {
      console.error("Erreur Boisson prete:", error);
      await fetchOrders();
    }
  };'

$content = $content.Replace($oldDrinkReady, $newDrinkReady)

# Fix 4: Ajouter l'etat pour l'alerte NOUVEAU TICKET et le check auto
# Chercher la ligne avec thermalPrintTriggerRef
$oldRefs = '  const thermalPrintTriggerRef = useRef<number | null>(null);
  const printedRealtimeTransitionsRef = useRef<Record<string, boolean>>({});'

$newRefs = '  const thermalPrintTriggerRef = useRef<number | null>(null);
  const printedRealtimeTransitionsRef = useRef<Record<string, boolean>>({});
  const [newTicketAlert, setNewTicketAlert] = useState(false);
  const knownBarItemCountRef = useRef<number>(-1);'

$content = $content.Replace($oldRefs, $newRefs)

# Fix 4: Ajouter le check auto toutes les 5s dans le useEffect principal
$oldPoll = '    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(orderItemsChannel);
    };
  }, [restaurantId, activeTab, categoryDestinationById, dishCategoryIdByDishId]);'

$newPoll = '    // Check auto toutes les 5s pour detecter nouveaux items bar
    const autoCheckInterval = window.setInterval(async () => {
      const currentRestaurantId = String(restaurantId ?? scopedRestaurantId ?? "").trim();
      let q = supabase.from("order_items").select("id", { count: "exact", head: true }).eq("status", "preparing");
      if (currentRestaurantId) q = q.eq("restaurant_id", currentRestaurantId);
      const { count } = await q;
      const newCount = count ?? 0;
      if (knownBarItemCountRef.current >= 0 && newCount > knownBarItemCountRef.current) {
        setNewTicketAlert(true);
        void fetchOrders();
      }
      knownBarItemCountRef.current = newCount;
    }, 5000);

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(orderItemsChannel);
      window.clearInterval(autoCheckInterval);
    };
  }, [restaurantId, activeTab, categoryDestinationById, dishCategoryIdByDishId]);'

$content = $content.Replace($oldPoll, $newPoll)

# Fix 4: Ajouter l'alerte visuelle dans le JSX, juste avant la section boissons
$oldBoissonsHeader = '          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold uppercase bg-blue-100 p-2 rounded">Bar - Boissons</h2>'

$newBoissonsHeader = '          {newTicketAlert ? (
            <div
              className="mb-4 p-4 bg-red-600 text-white text-center font-black text-3xl animate-pulse cursor-pointer border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
              onClick={() => { setNewTicketAlert(false); if (typeof window !== "undefined") window.print(); }}
            >
              🔔 NOUVEAU TICKET — CLIQUEZ POUR IMPRIMER
            </div>
          ) : null}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold uppercase bg-blue-100 p-2 rounded">Bar - Boissons</h2>'

$content = $content.Replace($oldBoissonsHeader, $newBoissonsHeader)

[System.IO.File]::WriteAllText('c:\Users\Jules067\menu-qr\app\bar-caisse\page.tsx', $content)
Write-Host "Done"
