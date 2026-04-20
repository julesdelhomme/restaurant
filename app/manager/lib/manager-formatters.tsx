import React from "react";

export function formatEuro(value: number) {
  const amount = Number(value || 0);
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function renderManagerReviewStars(ratingRaw: number | null | undefined) {
  const rating = Math.max(0, Math.min(5, Math.round(Number(ratingRaw || 0))));
  return (
    <div className="flex items-center gap-1" aria-label={`${rating}/5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className={index < rating ? "text-amber-500" : "text-gray-300"}>
          {"★"}
        </span>
      ))}
    </div>
  );
}
