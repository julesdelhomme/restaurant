"use client";

type RestaurantOfflineProps = {
  restaurantName?: string;
};

export default function RestaurantOffline({ restaurantName }: RestaurantOfflineProps) {
  const safeName = String(restaurantName || "").trim();
  return (
    <div className="min-h-screen bg-gray-100 text-black flex items-center justify-center p-4">
      <div className="max-w-lg w-full rounded-2xl border-2 border-black bg-white p-6 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-2xl font-black">Établissement momentanément indisponible</h1>
        <p className="mt-2 text-sm text-gray-700">
          {safeName
            ? `${safeName} est temporairement indisponible.`
            : "Cet établissement est temporairement indisponible."}
        </p>
      </div>
    </div>
  );
}
