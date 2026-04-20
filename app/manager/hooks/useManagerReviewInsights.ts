// @ts-nocheck
import { useMemo } from "react";

export function useManagerReviewInsights(deps: Record<string, any>) {
  const { reviews, dishes, normalizeText } = deps;

  const reviewAverage = useMemo(() => {
    const valid = reviews.map((r) => Number(r.rating || 0)).filter((v) => Number.isFinite(v) && v >= 1 && v <= 5);
    if (valid.length === 0) return 0;
    return Math.round((valid.reduce((sum, v) => sum + v, 0) / valid.length) * 10) / 10;
  }, [reviews]);
  const dishNameById = useMemo(() => {
    const map = new Map<string, string>();
    dishes.forEach((dish) => {
      const key = String(dish.id || "").trim();
      if (!key) return;
      map.set(key, String(dish.name_fr || dish.name || "Plat").trim() || "Plat");
    });
    return map;
  }, [dishes]);
  const topReviewedDish = useMemo(() => {
    const scoreByDish = new Map<string, { sum: number; count: number }>();
    reviews.forEach((review) => {
      const dishId = String(review.dish_id || "").trim();
      const rating = Number(review.rating || 0);
      if (!dishId || !Number.isFinite(rating) || rating < 1 || rating > 5) return;
      const current = scoreByDish.get(dishId) || { sum: 0, count: 0 };
      current.sum += rating;
      current.count += 1;
      scoreByDish.set(dishId, current);
    });
    let best: { dishId: string; avg: number; count: number } | null = null;
    scoreByDish.forEach((entry, dishId) => {
      const avg = entry.sum / Math.max(entry.count, 1);
      if (!best || avg > best.avg || (avg === best.avg && entry.count > best.count)) {
        best = { dishId, avg, count: entry.count };
      }
    });
    if (!best) return null;
    const bestDish = best as { dishId: string; avg: number; count: number };
    const reviewDishRow = reviews.find((r) => String(r.dish_id || "") === bestDish.dishId)?.dish;
    const name =
      String(reviewDishRow?.name_fr || reviewDishRow?.name || dishNameById.get(bestDish.dishId) || "Plat").trim() ||
      "Plat";
    return { ...bestDish, name, avg: Math.round(bestDish.avg * 10) / 10 };
  }, [reviews, dishNameById]);
  const restaurantReviews = useMemo(
    () => reviews.filter((review) => !String(review.dish_id || "").trim()),
    [reviews]
  );
  const dishReviews = useMemo(
    () => reviews.filter((review) => Boolean(String(review.dish_id || "").trim())),
    [reviews]
  );
  const weeklyAiSummary = useMemo(() => {
    const comments = reviews
      .map((review) => String(review.comment || "").trim())
      .filter(Boolean);
    const normalizedComments = comments.map((comment) => normalizeText(comment));

    const countThemeMatches = (tokens: string[]) =>
      normalizedComments.reduce((count, comment) => {
        return tokens.some((token) => comment.includes(token)) ? count + 1 : count;
      }, 0);

    const positiveThemes = [
      { label: "La rapidité du service", tokens: ["rapide", "rapidite", "vite", "service rapide"] },
      { label: "L'accueil de l'équipe", tokens: ["accueil", "sympa", "aimable", "souriant", "gentil"] },
      { label: "Le goût des plats", tokens: ["bon", "delicieux", "excellent", "savoureux", "gout"] },
      { label: "La cuisson / qualité produit", tokens: ["cuisson", "qualite", "frais", "chaud"] },
      { label: "Le rapport qualité-prix", tokens: ["prix", "rapport qualite prix", "abordable"] },
    ]
      .map((theme) => ({ ...theme, score: countThemeMatches(theme.tokens) }))
      .filter((theme) => theme.score > 0)
      .sort((a, b) => b.score - a.score);

    const watchThemes = [
      { label: "Le bruit en salle", tokens: ["bruit", "bruyant"] },
      { label: "Le temps d'attente", tokens: ["attente", "long", "lent", "retard"] },
      { label: "L'assaisonnement (sel / épices)", tokens: ["sale", "salé", "sel", "epice", "epicé"] },
      { label: "La température des plats", tokens: ["froid", "tiède", "tiede", "pas chaud"] },
      { label: "L'organisation du service", tokens: ["oublie", "oubli?", "erreur", "service"] },
    ]
      .map((theme) => ({ ...theme, score: countThemeMatches(theme.tokens) }))
      .filter((theme) => theme.score > 0)
      .sort((a, b) => b.score - a.score);

    const strengths = positiveThemes.slice(0, 3).map((theme) => theme.label);
    const watchouts = watchThemes.slice(0, 3).map((theme) => theme.label);

    if (topReviewedDish && topReviewedDish.avg >= 4 && strengths.length < 3) {
      strengths.unshift(`Le goût de ${topReviewedDish.name}`);
    }
    if (reviewAverage >= 4 && strengths.length === 0) {
      strengths.push("La satisfaction globale des clients");
    }
    if (comments.length === 0 && strengths.length === 0) {
      strengths.push("Pas assez d'avis cette semaine pour détecter un point fort");
    }
    if (reviewAverage > 0 && reviewAverage < 4 && watchouts.length === 0) {
      watchouts.push("La satisfaction globale (note moyenne sous 4/5)");
    }
    if (comments.length === 0 && watchouts.length === 0) {
      watchouts.push("Pas assez d'avis cette semaine pour identifier un point ? surveiller");
    }

    return {
      strengths: strengths.slice(0, 3),
      watchouts: watchouts.slice(0, 3),
    };
  }, [reviews, reviewAverage, topReviewedDish]);
  const reviewCriteriaAverages = useMemo(() => {
    const criteria = [
      { key: "service", label: "Service", fields: ["service_rating", "service_score", "rating_service"] },
      { key: "food", label: "Qualit? des plats", fields: ["food_rating", "food_score", "quality_rating", "rating_food"] },
      { key: "speed", label: "Rapidit?", fields: ["speed_rating", "speed_score", "rating_speed", "wait_time_rating"] },
      { key: "ambience", label: "Ambiance", fields: ["ambience_rating", "atmosphere_rating", "rating_ambience"] },
      { key: "value", label: "Rapport qualité-prix", fields: ["value_rating", "value_score", "rating_value"] },
      { key: "cleanliness", label: "Propreté", fields: ["cleanliness_rating", "clean_rating", "rating_cleanliness"] },
    ];
    const rows = criteria
      .map((criterion) => {
        const values = reviews
          .map((review) => {
            const row = review as unknown as any;
            for (const field of criterion.fields) {
              const candidate = Number(row[field]);
              if (Number.isFinite(candidate) && candidate >= 1 && candidate <= 5) return candidate;
            }
            return NaN;
          })
          .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);
        const count = values.length;
        const average = count > 0 ? values.reduce((sum, value) => sum + value, 0) / count : 0;
        return { key: criterion.key, label: criterion.label, average, count };
      })
      .filter((entry) => entry.count > 0);

    if (rows.length > 0) return rows;
    if (reviewAverage > 0) {
      return [
        {
          key: "global",
          label: "Satisfaction globale",
          average: reviewAverage,
          count: reviews.length,
        },
      ];
    }
    return [] as Array<{ key: string; label: string; average: number; count: number }>;
  }, [reviews, reviewAverage]);
  return {
    reviewAverage,
    dishNameById,
    topReviewedDish,
    restaurantReviews,
    dishReviews,
    weeklyAiSummary,
    reviewCriteriaAverages,
  };
}
