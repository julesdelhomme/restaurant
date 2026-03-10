"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, Star } from "lucide-react";
import { supabase } from "../../lib/supabase";

type FeedbackDishLine = {
  key: string;
  dish_id: string | null;
  name: string;
  image_url: string | null;
  quantity: number;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REASSURANCE_TEXT =
  "Vos avis sont transmis directement au restaurateur pour améliorer son service. Ils ne sont pas publiés sur Internet.";

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Note">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(score)}
          className={`h-10 w-10 rounded-full border-2 flex items-center justify-center ${
            score <= value ? "bg-amber-500 border-amber-700 text-white" : "bg-white border-gray-300 text-gray-500"
          }`}
          aria-label={`Noter ${score}/5`}
          aria-pressed={score === value}
        >
          <Star className={`h-5 w-5 ${score <= value ? "fill-current" : ""}`} />
        </button>
      ))}
    </div>
  );
}

function parseJsonItems(value: unknown): any[] {
  const flattenNestedCandidates = (candidates: unknown[]): any[] =>
    candidates.flatMap((candidate) => {
      if (Array.isArray(candidate)) return candidate.flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));
      if (candidate && typeof candidate === "object") return parseJsonItems(candidate);
      return [];
    });

  if (Array.isArray(value)) return value.flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));
      if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;
        const nestedCandidates = [
          record.items,
          record.order_items,
          record.kitchenItems,
          record.barItems,
          record.kitchen_items,
          record.bar_items,
        ];
        const nested = flattenNestedCandidates(nestedCandidates);
        if (nested.length > 0) return nested;
        return Object.values(record).flatMap((candidate) => {
          if (Array.isArray(candidate)) return candidate.flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));
          if (candidate && typeof candidate === "object") return parseJsonItems(candidate);
          return [];
        });
      }
      return [];
    } catch {
      return [];
    }
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const nestedCandidates = [
      record.items,
      record.order_items,
      record.kitchenItems,
      record.barItems,
      record.kitchen_items,
      record.bar_items,
    ];
    const nested = flattenNestedCandidates(nestedCandidates);
    if (nested.length > 0) return nested;
    return Object.values(record).flatMap((candidate) => {
      if (Array.isArray(candidate)) return candidate.flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));
      if (candidate && typeof candidate === "object") return parseJsonItems(candidate);
      return [];
    });
  }
  return [];
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function normalizeDisplayText(value: unknown) {
  return String(value || "").trim().normalize("NFC");
}

function firstValidUrl(...values: unknown[]) {
  for (const value of values) {
    const raw = String(value || "").trim();
    if (!raw) continue;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/google\./i.test(raw)) return `https://${raw.replace(/^\/+/, "")}`;
  }
  return "";
}

function resolveRestaurantGoogleUrl(row: Record<string, unknown>) {
  const tableConfig = parseJsonRecord(row.table_config);
  return firstValidUrl(
    row.google_review_url,
    row.google_url,
    row.google_reviews_url,
    row.google_maps_url,
    row.google_business_url,
    row.google_place_url,
    tableConfig?.google_url,
    tableConfig?.google_review_url,
    tableConfig?.google_reviews_url,
    tableConfig?.google_maps_url
  );
}

function normalizeOrderItemsToDishLines(
  orderRow: Record<string, unknown>,
  relationalRows: any[] | null,
  forcedDishId: string,
  forcedDishName: string
): FeedbackDishLine[] {
  const expandByQuantity = (base: Omit<FeedbackDishLine, "key" | "quantity"> & { keySeed: string; quantity: number }) => {
    const qty = Math.max(1, Number(base.quantity || 1));
    return Array.from({ length: qty }, (_, unitIndex) => ({
      key: `${base.keySeed}-${unitIndex}`,
      dish_id: base.dish_id,
      name: base.name,
      image_url: base.image_url,
      quantity: 1,
    })) satisfies FeedbackDishLine[];
  };
  let lines: FeedbackDishLine[] = [];

  if (Array.isArray(relationalRows) && relationalRows.length > 0) {
    lines = relationalRows
      .flatMap((row: any, index) => {
        const joinedDish = Array.isArray(row?.dishes) ? row.dishes[0] : row?.dishes;
        const dish = joinedDish && typeof joinedDish === "object" ? joinedDish : row?.dish;
        const dishId = String(row?.dish_id || dish?.id || "").trim() || null;
        const name = normalizeDisplayText(dish?.name || row?.name || forcedDishName || "");
        if (!name) return [];
        const image_url = normalizeDisplayText(dish?.image_url || row?.image_url || "") || null;
        return expandByQuantity({
          keySeed: `${String(row?.id || dishId || "dish")}-${index}`,
          dish_id: dishId,
          name,
          image_url,
          quantity: Number(row?.quantity || 1),
        });
      })
      .filter(Boolean) as FeedbackDishLine[];
  }

  if (lines.length === 0) {
    const items = parseJsonItems(orderRow.items);
    items.forEach((item: any, index) => {
      const nestedDish = item?.dish && typeof item.dish === "object" ? item.dish : null;
      const dishId = String(item?.dish_id || nestedDish?.id || "").trim() || null;
      const name = normalizeDisplayText(
        nestedDish?.name || item?.name_fr || item?.name || item?.product_name || item?.label || forcedDishName || ""
      );
      if (!name) return;
      const image_url = normalizeDisplayText(item?.image_url || nestedDish?.image_url || "") || null;
      lines.push(
        ...expandByQuantity({
          keySeed: `${String(item?.line_id || item?.id || dishId || "dish")}-${index}`,
          dish_id: dishId,
          name,
          image_url,
          quantity: Number(item?.quantity || 1),
        })
      );
    });
  }

  if (lines.length === 0 && forcedDishId) {
    const forcedName = normalizeDisplayText(forcedDishName || "");
    if (forcedName) {
      lines = [
        {
          key: forcedDishId,
          dish_id: forcedDishId,
          name: forcedName,
          image_url: null,
          quantity: 1,
        },
      ];
    }
  }
  return lines.map((line, idx) => ({
    ...line,
    key: `${line.key || `${line.dish_id || "no-dish"}::${line.name}`}-${idx}`,
  }));
}

export default function FeedbackPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const orderId = String(params?.id || "").trim();
  const forcedDishId = String(searchParams.get("dish_id") || "").trim();
  const forcedDishName = normalizeDisplayText(searchParams.get("dish_name") || "");

  const [checkingOrder, setCheckingOrder] = useState(true);
  const [orderExists, setOrderExists] = useState(false);
  const [dishLines, setDishLines] = useState<FeedbackDishLine[]>([]);
  const [dishRatings, setDishRatings] = useState<Record<string, number>>({});
  const [dishComments, setDishComments] = useState<Record<string, string>>({});
  const [restaurantRating, setRestaurantRating] = useState(5);
  const [restaurantIdForReview, setRestaurantIdForReview] = useState("");
  const [restaurantGoogleUrl, setRestaurantGoogleUrl] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const isValidOrderId = UUID_REGEX.test(orderId);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!orderId || !isValidOrderId) {
        if (!cancelled) {
          setCheckingOrder(false);
          setOrderExists(false);
          setError("Lien de feedback expiré ou invalide.");
        }
        return;
      }

      setCheckingOrder(true);
      setError("");

      const { data: order, error: orderError } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
      if (cancelled) return;
      if (orderError || !order) {
        setOrderExists(false);
        setDishLines([]);
        setError(orderError?.message || "Commande introuvable.");
        setCheckingOrder(false);
        return;
      }

      let googleUrl = "";
      const orderRow = order as Record<string, unknown>;
      const relatedOrders: Record<string, unknown>[] = [orderRow];
      const orderTableNumber = Number(orderRow.table_number || 0);
      const orderRestaurantId = String(orderRow.restaurant_id || orderRow.id_restaurant || "").trim();
      const sharedPaidAt = String(orderRow.paid_at || orderRow.closed_at || "").trim();

      if (Number.isFinite(orderTableNumber) && orderTableNumber > 0 && orderRestaurantId && sharedPaidAt) {
        const siblingsQuery = await supabase
          .from("orders")
          .select("*")
          .eq("restaurant_id", orderRestaurantId)
          .eq("table_number", orderTableNumber)
          .eq("paid_at", sharedPaidAt);

        if (!siblingsQuery.error && Array.isArray(siblingsQuery.data) && siblingsQuery.data.length > 1) {
          const byId = new Map<string, Record<string, unknown>>();
          [orderRow, ...(siblingsQuery.data as Array<Record<string, unknown>>)].forEach((row) => {
            const id = String(row.id || "").trim() || `${String(row.table_number || "")}-${String(row.created_at || "")}`;
            byId.set(id, row);
          });
          relatedOrders.splice(0, relatedOrders.length, ...Array.from(byId.values()));
        } else if (
          (siblingsQuery.error || !Array.isArray(siblingsQuery.data) || siblingsQuery.data.length <= 1) &&
          String(orderRow.closed_at || "").trim() &&
          String(orderRow.paid_at || "").trim() !== String(orderRow.closed_at || "").trim()
        ) {
          const closedAt = String(orderRow.closed_at || "").trim();
          const fallbackSiblingsQuery = await supabase
            .from("orders")
            .select("*")
            .eq("restaurant_id", orderRestaurantId)
            .eq("table_number", orderTableNumber)
            .eq("closed_at", closedAt);
          if (!fallbackSiblingsQuery.error && Array.isArray(fallbackSiblingsQuery.data) && fallbackSiblingsQuery.data.length > 1) {
            const byId = new Map<string, Record<string, unknown>>();
            [orderRow, ...(fallbackSiblingsQuery.data as Array<Record<string, unknown>>)].forEach((row) => {
              const id = String(row.id || "").trim() || `${String(row.table_number || "")}-${String(row.created_at || "")}`;
              byId.set(id, row);
            });
            relatedOrders.splice(0, relatedOrders.length, ...Array.from(byId.values()));
          }
        }
      }

      const rawJsonItems = relatedOrders.flatMap((row) => parseJsonItems(row.items));
      if (rawJsonItems.length === 0) {
        console.log(order);
        console.log("DEBUG ORDER:", orderRow);
        console.log("DEBUG RELATED ORDERS:", relatedOrders);
      }
      const dishIds = Array.from(
        new Set(
          rawJsonItems
            .map((item: any) => String(item?.dish_id || item?.id || item?.dish?.id || "").trim())
            .filter(Boolean)
        )
      );
      let dishesById: Record<string, { id?: string; name?: string; image_url?: string | null }> = {};
      if (dishIds.length > 0) {
        const dishesLookup = await supabase.from("dishes").select("id,name,image_url").in("id", dishIds);
        if (!dishesLookup.error && Array.isArray(dishesLookup.data)) {
          dishesById = Object.fromEntries(
            dishesLookup.data.map((row: any) => [
              String(row.id || "").trim(),
              row as { id?: string; name?: string; image_url?: string | null },
            ])
          );
        }
      }
      const relationalRows: any[] = rawJsonItems.map((item: any, index) => {
        const dishId = String(item?.dish_id || item?.id || item?.dish?.id || "").trim();
        return {
          id: String(item?.line_id || item?.id || `${dishId || "dish"}-${index}`),
          dish_id: dishId || null,
          quantity: Number(item?.quantity || 1),
          name: String(item?.name || item?.name_fr || item?.product_name || item?.label || "").trim(),
          image_url: String(item?.image_url || item?.dish?.image_url || "").trim() || null,
          dishes: dishId ? dishesById[dishId] || null : null,
        };
      });
      const restaurantQuery = orderRestaurantId
        ? await supabase.from("restaurants").select("*").eq("id", orderRestaurantId).maybeSingle()
        : await supabase.from("restaurants").select("*").limit(1).maybeSingle();
      if (!restaurantQuery.error && restaurantQuery.data) {
        googleUrl = resolveRestaurantGoogleUrl(restaurantQuery.data as Record<string, unknown>);
      }

      const nextLines = normalizeOrderItemsToDishLines(
        orderRow,
        relationalRows,
        forcedDishId,
        forcedDishName
      );
      if (nextLines.length === 0) {
        console.log(order);
        console.log("DEBUG ORDER:", orderRow);
        console.log("DEBUG RELATED ORDERS:", relatedOrders);
      }

      if (!cancelled) {
        setOrderExists(true);
        setRestaurantIdForReview(orderRestaurantId);
        setDishLines(nextLines);
        setRestaurantGoogleUrl(googleUrl);
        setDishRatings((prev) => {
          const next: Record<string, number> = { ...prev };
          nextLines.forEach((line) => {
            if (!next[line.key]) next[line.key] = 5;
          });
          return next;
        });
        setDishComments((prev) => {
          const next: Record<string, string> = { ...prev };
          nextLines.forEach((line) => {
            if (typeof next[line.key] !== "string") next[line.key] = "";
          });
          return next;
        });
        setCheckingOrder(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [orderId, forcedDishId, forcedDishName, isValidOrderId]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!orderExists) {
      setError("Commande introuvable.");
      return;
    }
    if (restaurantRating < 1 || restaurantRating > 5) {
      setError("Choisissez une note globale entre 1 et 5.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const rows: Array<Record<string, unknown>> = [];

      rows.push({
        order_id: orderId,
        restaurant_id: restaurantIdForReview || null,
        dish_id: null,
        rating: restaurantRating,
        comment: String(comment || "").trim() || null,
      });

      dishLines.forEach((line) => {
        const lineRating = Number(dishRatings[line.key] || 0);
        if (lineRating < 1 || lineRating > 5) return;
        rows.push({
          order_id: orderId,
          restaurant_id: restaurantIdForReview || null,
          dish_id: line.dish_id || null,
          rating: lineRating,
          comment: String(dishComments[line.key] || "").trim() || null,
        });
      });

      let { error: insertError } = await supabase.from("reviews").insert(rows as never);
      if (insertError && String((insertError as { code?: string })?.code || "") === "42703") {
        const fallbackRows = rows.map((row) =>
          Object.fromEntries(Object.entries(row).filter(([key]) => key !== "restaurant_id"))
        );
        const fallbackInsert = await supabase.from("reviews").insert(fallbackRows as never);
        insertError = fallbackInsert.error;
      }
      if (insertError) {
        setError(insertError.message || "Impossible d'enregistrer votre avis.");
        return;
      }
      setDone(true);
    } catch (submitError) {
      setError(String((submitError as { message?: string })?.message || "Erreur inconnue."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white border-2 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6">
        {done ? (
          <div className="text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
            {restaurantRating >= 4 ? (
              <>
                <h1 className="mt-3 text-2xl font-black">Merci pour vos {restaurantRating} étoiles !</h1>
                <p className="mt-2 text-slate-700">Votre avis a bien été transmis au restaurateur.</p>
                {restaurantGoogleUrl ? (
                  <a
                    href={restaurantGoogleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex w-full items-center justify-center rounded-xl border-2 border-black bg-[#4285F4] px-5 py-4 text-center text-base font-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition hover:bg-[#2f6fe0]"
                  >
                    ⭐ Cliquez ici pour publier votre avis sur Google
                  </a>
                ) : (
                  <p className="mt-4 text-sm text-slate-600">
                    Merci pour votre confiance ! Vous pouvez aussi partager votre expérience sur Google.
                  </p>
                )}
              </>
            ) : (
              <>
                <h1 className="mt-3 text-2xl font-black">Merci pour votre retour</h1>
                <p className="mt-2 text-slate-700">Merci pour votre retour, nous allons faire le nécessaire pour nous améliorer.</p>
              </>
            )}
            <p className="mt-5 text-base text-slate-500 text-center">{REASSURANCE_TEXT}</p>
          </div>
        ) : checkingOrder ? (
          <div className="text-center py-8">
            <h1 className="text-2xl font-black">Chargement...</h1>
            <p className="mt-2 text-slate-600">Vérification de la commande.</p>
          </div>
        ) : !orderExists ? (
          <div className="text-center py-8">
            <h1 className="text-2xl font-black">Lien invalide</h1>
            <p className="mt-2 text-slate-700">{error || "Lien de feedback expiré ou invalide."}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-center">Donnez votre avis au restaurateur</h1>
              <p className="mt-3 text-base text-slate-600 text-center">{REASSURANCE_TEXT}</p>
            </div>

            {dishLines.length > 0 ? (
              <section className="space-y-3">
                <h2 className="font-black text-lg">Notation par plat</h2>
                {dishLines.map((line) => (
                  <div key={line.key} className="border border-slate-200 rounded-lg p-4 bg-white">
                    <div className="flex items-start gap-3">
                      {line.image_url ? (
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          <img
                            src={line.image_url}
                            alt={line.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-base leading-tight break-words">{line.quantity} x {line.name}</div>
                        <div className="mt-2 text-sm font-semibold text-slate-700">Votre note</div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <StarPicker
                        value={Number(dishRatings[line.key] || 5)}
                        onChange={(next) =>
                          setDishRatings((prev) => ({
                            ...prev,
                            [line.key]: next,
                          }))
                        }
                      />
                    </div>
                    <label className="block mt-3 mb-1 text-sm font-bold">Commentaire (optionnel)</label>
                    <textarea
                      value={dishComments[line.key] || ""}
                      onChange={(e) =>
                        setDishComments((prev) => ({
                          ...prev,
                          [line.key]: e.target.value,
                        }))
                      }
                      rows={2}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900"
                      placeholder={`Votre avis sur ${line.name}...`}
                    />
                  </div>
                ))}
              </section>
            ) : (
              <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Aucun plat n&apos;a été détecté pour cette commande. Vous pouvez laisser une note globale au restaurant.
              </section>
            )}

            <section className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <h2 className="font-black text-lg mb-3">Note globale du restaurant</h2>
              <StarPicker value={restaurantRating} onChange={setRestaurantRating} />
              <label className="block mt-4 mb-2 font-bold">Commentaire (optionnel)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900"
                placeholder="Partagez votre expérience..."
              />
            </section>

            {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white font-black rounded-lg px-4 py-3 disabled:opacity-60"
            >
              {loading ? "Envoi..." : "Envoyer mon avis"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
