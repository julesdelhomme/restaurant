import { Check, Users } from "lucide-react";
import type { TableAssignment } from "../types";

type TableSlot = {
  tableNumber: number;
  isOccupied: boolean;
  row: TableAssignment | null;
};

type TableSessionsSectionProps = {
  tableNumberInput: string;
  pinInput: string;
  coversInput: string;
  saving: boolean;
  message: string;
  configuredTotalTables: number;
  tableSlots: TableSlot[];
  onChangeTableNumber: (value: string) => void;
  onChangePin: (value: string) => void;
  onChangeCovers: (value: string) => void;
  onDecrementCovers: () => void;
  onIncrementCovers: () => void;
  onSave: () => void;
  readCoversFromRow: (row: Record<string, unknown>) => number | null;
  onEditTable: (row: TableAssignment) => void;
  onDeleteTable: (row: TableAssignment) => void;
};

export function TableSessionsSection({
  tableNumberInput,
  pinInput,
  coversInput,
  saving,
  message,
  configuredTotalTables,
  tableSlots,
  onChangeTableNumber,
  onChangePin,
  onChangeCovers,
  onDecrementCovers,
  onIncrementCovers,
  onSave,
  readCoversFromRow,
  onEditTable,
  onDeleteTable,
}: TableSessionsSectionProps) {
  return (
    <section className="bg-white border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <h2 className="text-xl font-bold mb-4 uppercase bg-emerald-100 p-2 rounded">Disponibilit&eacute; des tables</h2>
      <div className="grid grid-cols-1 gap-3 max-w-md">
        <input
          type="number"
          placeholder={"Num\u00E9ro de table"}
          value={tableNumberInput}
          onChange={(e) => onChangeTableNumber(e.target.value)}
          className="h-11 px-3 border-2 border-black bg-white text-black"
        />
        <input
          type="text"
          placeholder="Code PIN"
          value={pinInput}
          onChange={(e) => onChangePin(e.target.value)}
          className="h-11 px-3 border-2 border-black bg-white text-black"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDecrementCovers}
            className="h-11 w-11 border-2 border-black bg-white font-black text-xl"
          >
            -
          </button>
          <input
            type="number"
            min={1}
            placeholder="Nombre de couverts"
            value={coversInput}
            onChange={(e) => onChangeCovers(e.target.value)}
            className="h-11 flex-1 px-3 border-2 border-black bg-white text-black"
          />
          <button
            type="button"
            onClick={onIncrementCovers}
            className="h-11 w-11 border-2 border-black bg-white font-black text-xl"
          >
            +
          </button>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="h-11 bg-green-700 text-white border-2 border-black font-black disabled:opacity-60"
        >
          <span className="inline-flex items-center gap-2">
            <Check className="h-4 w-4" />
            {saving ? "Enregistrement..." : "Valider"}
          </span>
        </button>
        {message ? <p className="text-sm font-semibold">{message}</p> : null}
      </div>

      <div className="mt-6">
        <h3 className="text-base font-bold mb-2 uppercase">{`\u00C9tat des tables (1 \u00E0 ${configuredTotalTables})`}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tableSlots.map((slot) => (
            <div
              key={`table-slot-${slot.tableNumber}`}
              className={`border-2 border-black p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-2 ${
                slot.isOccupied ? "bg-red-100" : "bg-green-100"
              }`}
            >
              <div className="font-bold text-sm">
                TABLE {slot.tableNumber} | {slot.isOccupied ? "Occup\u00E9e" : "Libre"}
                {slot.isOccupied ? ` | PIN: ${String(slot.row?.pin_code || "")}` : ""}
                {slot.isOccupied
                  ? (() => {
                      const covers = readCoversFromRow((slot.row || null) as unknown as Record<string, unknown>);
                      return covers ? (
                        <>
                          {" "}
                          | <Users size={12} className="inline-block align-text-bottom" /> {covers}
                        </>
                      ) : null;
                    })()
                  : null}
              </div>
              {slot.isOccupied && slot.row ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEditTable(slot.row as TableAssignment)}
                    className="px-3 py-1 border-2 border-black bg-white font-black text-xs"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => onDeleteTable(slot.row as TableAssignment)}
                    className="px-3 py-1 border-2 border-black bg-red-700 text-white font-black text-xs"
                  >
                    Fermer la Table
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
