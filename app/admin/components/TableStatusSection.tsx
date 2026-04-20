import type { Order } from "../types";

type TableStatusRow = {
  tableNumber: number;
  allServed: boolean;
  hasStartedTasting: boolean;
  isAwaitingNextStep: boolean;
  diningMinutes: number | null;
  waitingMinutes: number | null;
  count: number;
  formulaActionOrder: Order | null;
  nextFormulaStep: number | null;
};

type TableStatusSectionProps = {
  rows: TableStatusRow[];
  sendingNextStepOrderIds: Record<string, boolean>;
  handleSendNextServiceStep: (order: Order, nextStep: number) => Promise<void>;
};

export function TableStatusSection({
  rows,
  sendingNextStepOrderIds,
  handleSendNextServiceStep,
}: TableStatusSectionProps) {
  return (
    <section className="bg-emerald-50 border-2 border-emerald-300 p-4">
      <h2 className="text-xl font-bold mb-4 uppercase bg-emerald-100 p-2 rounded">Statut des Tables</h2>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Aucune table active.</p>
        ) : (
          rows.map((row) => {
            const orderRecord = row.formulaActionOrder as (Order & { items?: unknown; current_step?: unknown; currentStep?: unknown }) | null;
            const allTableItems = (() => {
              const rawItems = orderRecord?.items;
              if (Array.isArray(rawItems)) return rawItems as Array<Record<string, unknown>>;
              if (typeof rawItems === "string") {
                try {
                  const parsed = JSON.parse(rawItems);
                  return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
                } catch {
                  return [];
                }
              }
              return [];
            })();
            const currentServedStepRaw = Number(orderRecord?.current_step ?? orderRecord?.currentStep ?? NaN);
            const currentServedStep =
              Number.isFinite(currentServedStepRaw) && currentServedStepRaw > 0
                ? Math.trunc(currentServedStepRaw)
                : 0;
            const futureSteps = allTableItems
              .map((item) => Number(item?.step_number ?? item?.step ?? NaN))
              .filter((step) => Number.isFinite(step) && step > currentServedStep);
            const hasNextStep = futureSteps.length > 0;
            const isServed = row.allServed;
            const nextExactStep = hasNextStep ? Math.min(...futureSteps) : null;
            const nextStepToSend =
              Number.isFinite(nextExactStep) && Number(nextExactStep) > 0
                ? Math.trunc(Number(nextExactStep))
                : null;
            return (
            <div key={`table-status-${row.tableNumber}`} className="border border-emerald-300 bg-white p-3 rounded">
              <div className="font-bold">
                {row.isAwaitingNextStep
                  ? `Table ${row.tableNumber} - En attente depuis ${row.waitingMinutes ?? 0} min`
                  : row.hasStartedTasting
                    ? `Table ${row.tableNumber} - En train de manger`
                    : `Table ${row.tableNumber} attend sa commande`}
                {row.hasStartedTasting && row.diningMinutes != null ? ` · ${row.diningMinutes} min` : ""}
              </div>
              <div className="mt-1 text-xs text-gray-700">
                {row.hasStartedTasting ? <>Servi : {row.count}</> : `Commandes en cours : ${row.count}`}
              </div>
              {!row.isAwaitingNextStep && !row.hasStartedTasting && row.waitingMinutes != null ? (
                <div className="mt-1 text-sm font-black text-orange-700">Attente : {row.waitingMinutes} min</div>
              ) : null}
              {isServed && hasNextStep && row.formulaActionOrder && nextStepToSend ? (
                <button
                  type="button"
                  disabled={Boolean(sendingNextStepOrderIds[String((row.formulaActionOrder as Order).id || "")])}
                  onClick={() =>
                    void handleSendNextServiceStep(row.formulaActionOrder as Order, nextStepToSend as number)
                  }
                  className="mt-2 w-full border-2 border-black bg-orange-500 px-3 py-3 text-sm font-black uppercase text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ display: "block", width: "100%", position: "relative", zIndex: 20 }}
                >
                  Envoyer la suite
                </button>
              ) : null}
            </div>
          );
          })
        )}
      </div>
    </section>
  );
}

