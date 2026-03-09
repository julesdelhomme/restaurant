import React, { useState } from "react";
import { supabase } from "../lib/supabase";

interface TableConfigManagerProps {
  restaurant: any;
  setRestaurant: (r: any) => void;
}

type TableConfig = Array<{ number: number; pin: string }>;

export default function TableConfigManager({ restaurant, setRestaurant }: TableConfigManagerProps) {
  const [editing, setEditing] = useState<TableConfig>(
    Array.isArray(restaurant?.table_config)
      ? restaurant.table_config.map((row: any) => ({ number: row.number ?? row.table_number, pin: row.pin }))
      : []
  );
  const [newTable, setNewTable] = useState<{ number: string; pin: string }>({ number: "", pin: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (idx: number, field: "number" | "pin", value: string) => {
    setEditing((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: field === "number" ? Number(value) : value } : row))
    );
  };

  const handleAdd = () => {
    if (!newTable.number || !newTable.pin) return;
    setEditing((prev) => [...prev, { number: Number(newTable.number), pin: newTable.pin }]);
    setNewTable({ number: "", pin: "" });
  };

  const handleDelete = (idx: number) => {
    setEditing((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase
        .from("restaurants")
        .update({ table_config: editing })
        .eq("id", restaurant.id);
      if (error) throw error;
      setRestaurant({ ...restaurant, table_config: editing });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <table className="w-full mb-4">
        <thead>
          <tr>
            <th className="text-left text-white">Table</th>
            <th className="text-left text-white">PIN</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {editing.map((row, idx) => (
            <tr key={idx}>
              <td>
                <input
                  type="number"
                  value={row.number}
                  onChange={(e) => handleChange(idx, "number", e.target.value)}
                  className="px-2 py-1 rounded bg-zinc-700 text-white w-20"
                />
              </td>
              <td>
                <input
                  type="text"
                  value={row.pin}
                  onChange={(e) => handleChange(idx, "pin", e.target.value)}
                  className="px-2 py-1 rounded bg-zinc-700 text-white w-24"
                />
              </td>
              <td>
                <button
                  onClick={() => handleDelete(idx)}
                  className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
          <tr>
            <td>
              <input
                type="number"
                value={newTable.number}
                onChange={(e) => setNewTable((prev) => ({ ...prev, number: e.target.value }))}
                className="px-2 py-1 rounded bg-zinc-700 text-white w-20"
                placeholder="N°"
              />
            </td>
            <td>
              <input
                type="text"
                value={newTable.pin}
                onChange={(e) => setNewTable((prev) => ({ ...prev, pin: e.target.value }))}
                className="px-2 py-1 rounded bg-zinc-700 text-white w-24"
                placeholder="PIN"
              />
            </td>
            <td>
              <button
                onClick={handleAdd}
                className="px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
              >
                Ajouter
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <button
        onClick={handleSave}
        className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 disabled:opacity-50"
        disabled={saving}
      >
        {saving ? "Enregistrement..." : "Enregistrer la configuration"}
      </button>
      {error && <div className="text-red-400 mt-2">Erreur : {error}</div>}
    </div>
  );
}