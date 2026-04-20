// @ts-nocheck
import React from "react";

type StaffAndRoomsProps = {
  [key: string]: any;
};

export default function StaffAndRooms(props: StaffAndRoomsProps) {
  const {
    MAX_TOTAL_TABLES,
    activeManagerTab,
    normalizeTotalTables,
    router,
    scopedRestaurantId,
    setTotalTables,
    totalTables,
  } = props;

  if (activeManagerTab !== "staff") return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="rounded-xl border border-gray-300 bg-white p-4">
        <h2 className="text-lg font-black mb-2">Staff & Salles</h2>
        <p className="text-sm text-gray-700 mb-3">Gérez les comptes serveurs, les codes PIN et les tables assignées depuis l&apos;espace dédié.</p>
        <button
          type="button"
          onClick={() => router.push(`/${scopedRestaurantId}/manager/staff`)}
          className="px-4 py-2 border-2 border-black font-black rounded-xl bg-black text-white"
        >
          Ouvrir la gestion Staff
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <label className="block text-sm font-bold mb-1">Nombre total de tables</label>
        <input
          type="number"
          min={1}
          max={MAX_TOTAL_TABLES}
          value={totalTables}
          onChange={(e) => setTotalTables(normalizeTotalTables(e.target.value, totalTables))}
          className="w-full max-w-xs px-3 py-2 border border-gray-300 bg-white text-black rounded"
        />
        <p className="text-xs text-gray-600 mt-1">Utilisé pour les tables fixes du restaurant et les assignations staff (1 à N).</p>
      </div>
    </div>
  );
}
