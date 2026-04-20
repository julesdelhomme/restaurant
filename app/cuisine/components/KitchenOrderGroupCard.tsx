import type { Item } from "../types";

type GroupItem = {
  orderId: string | number;
  item: Item;
  idx: number;
  serviceStep: unknown;
};

type GroupedPriorityOrder = {
  groupKey: string;
  tableNumber: string;
  covers: number | null;
  createdAt: string;
  orderIds: Array<string | number>;
  serviceStep?: string | null;
  currentStep?: number;
  nextStepItems: Array<{ orderId: string | number; item: Item; idx: number }>;
  items: GroupItem[];
};

type KitchenOrderGroupCardProps = {
  group: GroupedPriorityOrder;
  isSubmitting: boolean;
  resolveItemStepRank: (item: Item) => number;
  resolveItemExplicitStep: (item: Item) => number | null;
  resolveFormulaStepLabelForItem: (item: Item) => string | null;
  resolveItemCourse: (item: Item) => string;
  serviceStepLabels: Record<string, string>;
  getKitchenSelectedOptionLines: (item: Item) => string[];
  resolveKitchenDishName: (item: Item) => string;
  formatTime: (value: string) => string;
  onReadyGroup: (groupKey: string, orderIds: Array<string | number>) => Promise<void>;
};

export function KitchenOrderGroupCard({
  group,
  isSubmitting,
  resolveItemStepRank,
  resolveItemExplicitStep,
  resolveFormulaStepLabelForItem,
  resolveItemCourse,
  serviceStepLabels,
  getKitchenSelectedOptionLines,
  resolveKitchenDishName,
  formatTime,
  onReadyGroup,
}: KitchenOrderGroupCardProps) {
  if (group.items.length === 0) return null;

  const visibleGroupItems = (() => {
    const stepRanks = group.items
      .map((entry) => resolveItemStepRank(entry.item))
      .filter((value) => Number.isFinite(value));
    if (stepRanks.length === 0) return [];
    const preferredStepRank =
      Number.isFinite(Number(group.currentStep)) && Number(group.currentStep) > 0 ? Number(group.currentStep) : null;
    const currentStepRank = preferredStepRank != null ? preferredStepRank : Math.min(...stepRanks);
    const hasCurrentStepItems = stepRanks.includes(currentStepRank);
    false && console.log("TRACE:", {
      context: "kitchen.KitchenOrderGroupCard.visibleGroupItems",
      groupKey: group.groupKey,
      groupCurrentStep: group.currentStep ?? null,
      resolvedCurrentStepRank: currentStepRank,
      hasCurrentStepItems,
      itemSteps: group.items.map((entry) => ({
        orderId: entry.orderId,
        order_item_id: String((entry.item as any).order_item_id ?? (entry.item as any).orderItemId ?? "").trim() || null,
        dish_id: String((entry.item as any).dish_id ?? entry.item.id ?? "").trim() || null,
        name: String((entry.item as any).name_fr || entry.item.name || "").trim() || null,
        stepRank: resolveItemStepRank(entry.item),
      })),
    });
    if (!hasCurrentStepItems) return [];
    return group.items.filter((entry) => resolveItemStepRank(entry.item) === currentStepRank);
  })();

  const itemsByStep = visibleGroupItems.reduce(
    (map, entry) => {
      const sourceItem = entry.item;
      const stepRank = resolveItemStepRank(sourceItem);
      const explicitStep = resolveItemExplicitStep(sourceItem);
      const stepLabel =
        (explicitStep ? `ÉTAPE ${explicitStep}` : null) ||
        resolveFormulaStepLabelForItem(sourceItem) ||
        serviceStepLabels[resolveItemCourse(sourceItem)] ||
        "PLAT";
      const stepKey = `${stepRank}-${stepLabel}`;
      const existing = map.get(stepKey);
      if (existing) {
        existing.items.push(entry);
        return map;
      }
      map.set(stepKey, {
        stepKey,
        stepRank,
        stepLabel,
        items: [entry],
      });
      return map;
    },
    new Map<string, { stepKey: string; stepRank: number; stepLabel: string; items: GroupItem[] }>()
  );

  const orderedStepGroups = [...itemsByStep.values()].sort((a, b) => a.stepRank - b.stepRank);

  return (
    <div className="flex flex-col justify-between border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div>
        <div className="mb-4 flex items-start justify-between border-b-2 border-black pb-2">
          <div>
            <h2 className="text-3xl font-black">
              T-{group.tableNumber}
              {group.covers ? ` | Couverts: ${group.covers}` : ""}
            </h2>
            {orderedStepGroups.length > 0 ? (
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {orderedStepGroups.map((stepGroup) => (
                  <span
                    key={`${group.groupKey}-${stepGroup.stepKey}`}
                    className="inline-flex items-center rounded border-2 border-black bg-white px-2 py-1 text-[11px] font-black"
                  >
                    {stepGroup.stepLabel}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <span className="text-xs font-mono text-gray-500">{group.orderIds.length} commande(s)</span>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">Arrivée: {formatTime(group.createdAt)}</p>
          <p className="text-sm font-black text-black">À PRÉPARER : {orderedStepGroups[0]?.stepLabel || "EN ATTENTE"}</p>
          <div className="text-xs text-gray-700">
            <div className="font-bold">A SUIVRE :</div>
            {group.nextStepItems.length > 0 ? (
              <div className="mt-1 space-y-1">
                {group.nextStepItems.map(({ orderId, item, idx }) => {
                  const optionLines = getKitchenSelectedOptionLines(item);
                  return (
                    <div
                      key={`${group.groupKey}-next-${String(orderId)}-${idx}-${String(item.dish_id || item.id || "")}`}
                      className="notranslate"
                      translate="no"
                    >
                      <div>- {Math.max(1, Number(item.quantity) || 1)}x {resolveKitchenDishName(item)}</div>
                      {optionLines.length > 0 ? (
                        <div className="ml-4 text-[11px] leading-tight">
                          {optionLines.map((line, optionIndex) => (
                            <div key={`${group.groupKey}-next-opt-${String(orderId)}-${idx}-${optionIndex}`}>- {line}</div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>Aucun</div>
            )}
          </div>
        </div>

        <div className="mb-4 space-y-3">
          {orderedStepGroups.length === 0 ? (
            <div className="rounded border border-dashed border-gray-400 bg-gray-50 p-2 text-xs text-gray-700">
              Étape suivante en attente de validation serveur.
            </div>
          ) : null}
          {orderedStepGroups.map((stepGroup) => (
            <div key={`${group.groupKey}-${stepGroup.stepKey}`} className="space-y-2">
              {stepGroup.items.map(({ item, orderId, idx }) => {
                const optionLines = getKitchenSelectedOptionLines(item);
                return (
                  <div key={`${String(orderId)}-${idx}-${String(item.dish_id || item.id || "")}`} className="bg-gray-100 p-2">
                    <div className="text-lg font-bold">
                      <span className="mr-2 rounded bg-black px-2 text-white">{item.quantity}x</span>
                      <span translate="no" className="notranslate">
                        {resolveKitchenDishName(item)}
                      </span>
                    </div>
                    {optionLines.length > 0 ? (
                      <div className="notranslate mt-1 text-xs leading-tight text-gray-800" translate="no">
                        {optionLines.map((line, optionIndex) => (
                          <div key={`${String(orderId)}-${idx}-opt-${optionIndex}`}>- {line}</div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t-2 border-dashed border-gray-300 pt-4">
        <div className="space-y-2">
          <button
            onClick={() => void onReadyGroup(group.groupKey, group.orderIds)}
            disabled={isSubmitting || orderedStepGroups.length === 0}
            className="w-full border-2 border-black bg-green-600 py-5 text-2xl font-black text-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ width: "100%", padding: "20px", fontSize: "1.5rem" }}
          >
            {isSubmitting ? "MISE À JOUR..." : "TOUT EST PRET"}
          </button>
        </div>
      </div>
    </div>
  );
}

