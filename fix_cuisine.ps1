$content = [System.IO.File]::ReadAllText('c:\Users\Jules067\menu-qr\app\cuisine\page.tsx')

# Fix 4 cuisine: ajouter etat alerte et ref compteur
$oldRef = '  const isOrderStatusUpdatingRef = useRef(false);
  const needsOrderRefreshRef = useRef(false);'

$newRef = '  const isOrderStatusUpdatingRef = useRef(false);
  const needsOrderRefreshRef = useRef(false);
  const [newTicketAlertCuisine, setNewTicketAlertCuisine] = useState(false);
  const knownCuisineItemCountRef = useRef<number>(-1);'

$content = $content.Replace($oldRef, $newRef)

# Fix 4 cuisine: ajouter le check auto dans le useEffect principal (apres le poll existant)
$oldPoll = '    const poll = window.setInterval(() => {
      void fetchOrders();
    }, refreshMs);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(poll);
    };
  }, [refreshMs, autoPrintEnabled, resolvedRestaurantId]);'

$newPoll = '    const poll = window.setInterval(() => {
      void fetchOrders();
    }, refreshMs);

    // Check auto toutes les 5s pour detecter nouveaux items cuisine
    const autoCheck = window.setInterval(async () => {
      const rid = String(resolvedRestaurantId || "").trim();
      let q = supabase.from("order_items").select("id", { count: "exact", head: true }).eq("status", "preparing");
      if (rid) q = q.eq("restaurant_id", rid);
      const { count } = await q;
      const newCount = count ?? 0;
      if (knownCuisineItemCountRef.current >= 0 && newCount > knownCuisineItemCountRef.current) {
        setNewTicketAlertCuisine(true);
        const shouldPrint = await fetchOrders(true);
        if (shouldPrint) handleAutoPrint();
      }
      knownCuisineItemCountRef.current = newCount;
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(poll);
      window.clearInterval(autoCheck);
    };
  }, [refreshMs, autoPrintEnabled, resolvedRestaurantId]);'

$content = $content.Replace($oldPoll, $newPoll)

# Fix 4 cuisine: ajouter l'alerte visuelle dans le JSX, juste apres le h1 CUISINE
$oldHeader = '      {orders.length === 0 && <p className="text-gray-500 italic">Aucune commande en attente pour la cuisine.</p>}'

$newHeader = '      {newTicketAlertCuisine ? (
        <div
          className="mb-4 p-4 bg-red-600 text-white text-center font-black text-3xl animate-pulse cursor-pointer border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
          onClick={() => { setNewTicketAlertCuisine(false); handleAutoPrint(); }}
        >
          🔔 NOUVEAU TICKET — CLIQUEZ POUR IMPRIMER
        </div>
      ) : null}
      {orders.length === 0 && <p className="text-gray-500 italic">Aucune commande en attente pour la cuisine.</p>}'

$content = $content.Replace($oldHeader, $newHeader)

[System.IO.File]::WriteAllText('c:\Users\Jules067\menu-qr\app\cuisine\page.tsx', $content)
Write-Host "Done"
