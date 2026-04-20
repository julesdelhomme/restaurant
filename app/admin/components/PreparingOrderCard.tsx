import { Users } from "lucide-react";
import type { Order } from "../types";
import type { Item } from "../utils/order-items";

type PreparingOrderCardProps = {
  order: Order;
  tableCoversByNumber: Map<number, number>;
  readyAlertOrderIds: Record<string, boolean>;
  serviceStepLabels: Record<string, string>;
  normalizeCoversValue: (value: unknown) => number | null;
  resolveOrderItemLabel: (item: Item) => string;
  normalizeLookupText: (value: string) => string;
  parseItems: (value: unknown) => Item[];
  isItemServed: (item: Item) => boolean;
  hasExplicitItemStatus: (item: Item) => boolean;
  normalizeWorkflowItemStatus: (item: Item) => string;
  getItemPrepStatus: (item: Item) => string;
  isPreparingLikeOrderStatus: (status: unknown) => boolean;
  isDrink: (item: Item) => boolean;
  isFormulaOrderItem: (item: Item) => boolean;
  resolveOrderServiceStep: (order: Order, items: Item[]) => string;
  summarizeItems: (items: Item[]) => { total: number; ready: number };
  getItemStatusLabel: (item: Item) => string;
  getItemStatusClass: (item: Item) => string;
};

export function PreparingOrderCard({
  order,
  tableCoversByNumber,
  readyAlertOrderIds,
  serviceStepLabels,
  normalizeCoversValue,
  resolveOrderItemLabel,
  normalizeLookupText,
  parseItems,
  isItemServed,
  hasExplicitItemStatus,
  normalizeWorkflowItemStatus,
  getItemPrepStatus,
  isPreparingLikeOrderStatus,
  isDrink,
  isFormulaOrderItem,
  resolveOrderServiceStep,
  summarizeItems,
  getItemStatusLabel,
  getItemStatusClass,
}: PreparingOrderCardProps) {
  void resolveOrderItemLabel;
  const resolvedCovers = (() => {
    const direct =
      normalizeCoversValue((order as unknown as Record<string, unknown>).covers) ??
      normalizeCoversValue((order as unknown as Record<string, unknown>).guest_count) ??
      normalizeCoversValue((order as unknown as Record<string, unknown>).customer_count);
    if (direct) return direct;
    return tableCoversByNumber.get(Number(order.table_number)) || null;
  })();

  const flattenChoiceTexts = (value: unknown): string[] => {
    if (value == null) return [];
    if (Array.isArray(value)) return value.flatMap((entry) => flattenChoiceTexts(entry));
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value || "").trim();
      return text ? [text] : [];
    }
    if (typeof value === "object") {
      const rec = value as Record<string, unknown>;
      return [
        rec.label_fr,
        rec.label,
        rec.name_fr,
        rec.name,
        rec.value_fr,
        rec.value,
        rec.choice,
        rec.selected,
        rec.text,
        rec.title,
      ]
        .map((entry) => String(entry || "").trim())
        .filter(Boolean);
    }
    return [];
  };

  const uniqueTexts = (values: string[]) => {
    const seen = new Set<string>();
    return values.filter((value) => {
      const normalized = String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  };

  const stripDetailPrefix = (text: string, type: "side" | "cooking" | "extra") => {
    const raw = String(text || "").trim();
    if (!raw) return "";
    if (type === "side" && /^(accompagnements|sides|acompa(?:n|ÃƒÆ’Ã‚Â±)amientos|beilage(?:n)?)\s*:/i.test(raw)) {
      return raw.replace(/^[^:]+:\s*/i, "").trim();
    }
    if (type === "cooking" && /^(cuisson|cooking|garstufe|cocci[oÃƒÆ’Ã‚Â³]n)\s*:/i.test(raw)) {
      return raw.replace(/^[^:]+:\s*/i, "").trim();
    }
    if (type === "extra" && /^(supplements?|extras?|suplementos?)\s*:/i.test(raw)) {
      return raw.replace(/^[^:]+:\s*/i, "").trim();
    }
    return raw;
  };

  const getOrderItemDetails = (item: Item) => {
    const rec = item as unknown as Record<string, unknown>;
    const selectedOptions = rec.selected_options ?? rec.options;
    const optionEntries = Array.isArray(selectedOptions)
      ? selectedOptions
      : selectedOptions && typeof selectedOptions === "object"
        ? Object.values(selectedOptions as Record<string, unknown>)
        : [];

    const optionValuesByKind = optionEntries.reduce(
      (acc, entry) => {
        if (entry == null) return acc;
        if (typeof entry === "string" || typeof entry === "number") {
          const raw = String(entry || "").trim();
          if (!raw) return acc;
          if (/^(accompagnements|sides|acompa(?:n|ÃƒÆ’Ã‚Â±)amientos|beilage(?:n)?)\s*:/i.test(raw)) acc.side.push(stripDetailPrefix(raw, "side"));
          else if (/^(cuisson|cooking|garstufe|cocci[oÃƒÆ’Ã‚Â³]n)\s*:/i.test(raw)) acc.cooking.push(stripDetailPrefix(raw, "cooking"));
          else if (/^(supplements?|extras?|suplementos?)\s*:/i.test(raw)) acc.extras.push(stripDetailPrefix(raw, "extra"));
          return acc;
        }
        const optionRec = entry as Record<string, unknown>;
        const kind = String(optionRec.kind || optionRec.type || optionRec.key || optionRec.group || optionRec.category || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
        const values = flattenChoiceTexts(
          optionRec.values ??
            optionRec.value ??
            optionRec.selection ??
            optionRec.selected ??
            optionRec.choice ??
            optionRec.option ??
            optionRec
        );
        if (/(side|accompagnement|acomp|beilage)/.test(kind)) acc.side.push(...values.map((v) => stripDetailPrefix(v, "side")));
        else if (/(cooking|cuisson|garstufe|cocc)/.test(kind)) acc.cooking.push(...values.map((v) => stripDetailPrefix(v, "cooking")));
        else if (/(extra|supplement|suplemento)/.test(kind)) acc.extras.push(...values.map((v) => stripDetailPrefix(v, "extra")));
        return acc;
      },
      { side: [] as string[], cooking: [] as string[], extras: [] as string[] }
    );

    const sideValues = uniqueTexts(
      [
        ...flattenChoiceTexts(rec.side),
        ...flattenChoiceTexts(rec.accompaniment),
        ...flattenChoiceTexts(rec.accompagnement),
        ...flattenChoiceTexts(rec.accompaniments),
        ...flattenChoiceTexts(rec.accompagnements),
        ...flattenChoiceTexts(rec.side_dish),
        ...flattenChoiceTexts(rec.sideDish),
        ...optionValuesByKind.side,
      ].map((v) => stripDetailPrefix(v, "side"))
    );
    const cookingValues = uniqueTexts(
      [
        String(rec.cooking || "").trim(),
        String(rec.cuisson || "").trim(),
        String(item.selected_cooking_label_fr || "").trim(),
        String(item.selected_cooking_key || "").trim(),
        ...optionValuesByKind.cooking,
      ].map((v) => stripDetailPrefix(v, "cooking"))
    );
    const extraValues = uniqueTexts(
      [
        ...flattenChoiceTexts(rec.supplement),
        ...flattenChoiceTexts(rec.supplements),
        ...(Array.isArray(item.selected_extras)
          ? item.selected_extras.map((extra) => String(extra?.label_fr || "").trim()).filter(Boolean)
          : []),
        ...(Array.isArray(item.selectedExtras)
          ? item.selectedExtras.map((extra) => String(extra?.name || "").trim()).filter(Boolean)
          : []),
        ...optionValuesByKind.extras,
      ].map((v) => stripDetailPrefix(v, "extra"))
    );

    const parts: string[] = [];
    if (cookingValues.length > 0) parts.push(`Cuisson: ${cookingValues.join(", ")}`);
    if (sideValues.length > 0) parts.push(`Accompagnements: ${sideValues.join(", ")}`);
    if (extraValues.length > 0) parts.push(`Supplements: ${extraValues.join(", ")}`);
    return parts.join(" | ");
  };

  const activeItems = parseItems(order.items).filter((item) => !isItemServed(item));
  const currentStep = Number(
    (order as unknown as Record<string, unknown>).current_step ??
      (order as unknown as Record<string, unknown>).currentStep ??
      NaN
  );
  const resolveItemStep = (item: Item) => {
    const rec = item as unknown as Record<string, unknown>;
    const step = Number(
      rec.step ??
        rec.step_number ??
        rec.service_step_sequence ??
        rec.formula_current_sequence ??
        rec.formulaCurrentSequence ??
        rec.sequence ??
        NaN
    );
    return Number.isFinite(step) && step > 0 ? Math.trunc(step) : null;
  };
  const stepMatchedItems = Number.isFinite(currentStep) && currentStep > 0
    ? activeItems.filter((item) => resolveItemStep(item) === Math.trunc(currentStep))
    : [];
  const hasExplicitItemStatuses = activeItems.some((item) => hasExplicitItemStatus(item));
  const preparingMatchedItems = activeItems.filter((item) => {
    const normalizedStatus = normalizeWorkflowItemStatus(item);
    if (
      normalizedStatus === "preparing" ||
      normalizedStatus === "in_progress" ||
      normalizedStatus === "in progress" ||
      getItemPrepStatus(item) === "preparing"
    ) {
      return true;
    }
    if (!hasExplicitItemStatuses && isPreparingLikeOrderStatus(order.status)) return true;
    return false;
  });
  const items = stepMatchedItems.length > 0 ? stepMatchedItems : preparingMatchedItems;

  if (items.length === 0) return null;

  const foodItems = items.filter((item) => !isDrink(item));
  const drinkItems = items.filter((item) => isDrink(item));
  const hasFormulaItems = items.some((item) => isFormulaOrderItem(item));
  const currentServiceStep = hasFormulaItems ? resolveOrderServiceStep(order, items) : "";
  const serviceStepLabel = currentServiceStep ? serviceStepLabels[currentServiceStep] : "";
  const itemProgress = summarizeItems(items);
  const isReadyCard = itemProgress.total > 0 && itemProgress.ready === itemProgress.total;
  const isReadyHighlighted = isReadyCard && !!readyAlertOrderIds[String(order.id)];
  const hasPartiallyReadyItems = !isReadyCard && itemProgress.ready > 0;
  const readyToneClass = isReadyCard
    ? "bg-green-100 border-green-500"
    : hasPartiallyReadyItems
      ? "bg-amber-50 border-amber-400"
      : "bg-white border-black";

  const buildItemDetailLine = (item: Item) => {
    const details = getOrderItemDetails(item);
    const instructionValues = uniqueTexts(
      [String(item.instructions || "").trim(), String(item.special_request || "").trim()]
        .map((value) =>
          String(value || "")
            .replace(/^details?\s*:\s*/i, "")
            .replace(/^commentaire cuisine\s*:\s*/i, "")
            .trim()
        )
        .filter(Boolean)
    );
    const parts = details ? [details] : [];
    instructionValues.forEach((value) => {
      const normalizedValue = normalizeLookupText(value);
      const alreadyIncluded = parts.some((part) => {
        const normalizedPart = normalizeLookupText(part);
        return normalizedPart.includes(normalizedValue) || normalizedValue.includes(normalizedPart);
      });
      if (!alreadyIncluded) parts.push(value);
    });
    const merged = uniqueTexts(parts);
    return merged.length > 0 ? `Details: ${merged.join(" | ")}` : "";
  };

  const renderItemsSection = (sectionLabel: "Plats" | "Boissons", sectionItems: Item[]) => {
    if (sectionItems.length === 0) return null;
    const sectionProgress = summarizeItems(sectionItems);
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded border border-black bg-white px-2 py-1">
          <span className="text-xs font-black uppercase">{sectionLabel}</span>
          <span className="text-[11px] font-bold text-gray-700">
            {sectionProgress.ready}/{sectionProgress.total} {"pr\u00EAts"}
          </span>
        </div>
        {sectionItems.map((item, idx) => {
          const detailsLine = buildItemDetailLine(item);
          const selectedOptionsRaw =
            (item as unknown as Record<string, unknown>).selected_options ??
            (item as unknown as Record<string, unknown>).selectedOptions;
          const selectedOptions = Array.isArray(selectedOptionsRaw)
            ? (selectedOptionsRaw as Array<Record<string, unknown>>)
            : selectedOptionsRaw && typeof selectedOptionsRaw === "object"
              ? Object.values(selectedOptionsRaw as Record<string, unknown>).filter(
                  (entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object"
                )
              : [];
          const selectedOptionLabels = uniqueTexts(
            selectedOptions
              .map((opt) =>
                String(
                  (opt as Record<string, unknown>).label_fr ??
                    (opt as Record<string, unknown>).value ??
                    (opt as Record<string, unknown>).name_fr ??
                    ""
                ).trim()
              )
              .filter(Boolean)
          );
          const itemStep = resolveItemStep(item);
          const isCurrentStepItem = Number.isFinite(currentStep) && currentStep > 0 && itemStep === Math.trunc(currentStep);
          const itemPrepStatus = getItemPrepStatus(item);
          const statusLabel =
            isCurrentStepItem && itemPrepStatus !== "ready" ? "En pr\u00E9paration" : getItemStatusLabel(item);
          const statusClass =
            isCurrentStepItem && itemPrepStatus !== "ready"
              ? "border-amber-700 bg-amber-500 text-black"
              : getItemStatusClass(item);
          const record = item as unknown as Record<string, unknown>;
          const uniqueLineId =
            String(record.order_item_id ?? record.orderItemId ?? "").trim() ||
            String(record.id ?? "").trim() ||
            `${sectionLabel}-${idx}`;
          /* --- ZONE SANCTUAIRE : NE JAMAIS MODIFIER CETTE LOGIQUE D'AFFICHAGE --- */
          /* Ici on affiche le nom du PLAT (name_fr) et JAMAIS le nom de la formule. */
          const displayName =
            (item as unknown as { dish?: { name_fr?: string }; name_fr?: string }).dish?.name_fr ||
            (item as unknown as { name_fr?: string }).name_fr ||
            (item as unknown as { name?: string }).name;
          /* --- FIN DE ZONE SANCTUAIRE --- */
          return (
            <div
              key={uniqueLineId}
              className="bg-gray-100 px-2 py-2 border border-gray-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-base">
                  <span className="bg-black text-white px-2 mr-2 rounded">{Number(item.quantity) || 1}x</span>
                  <span translate="no" className="notranslate">
                    {displayName}
                  </span>
                </div>
                <span className={`mt-0.5 rounded border px-2 py-0.5 text-[10px] font-black uppercase ${statusClass}`}>
                  {statusLabel}
                </span>
              </div>
              {detailsLine ? (
                <div className="mt-1 text-xs italic text-gray-800 notranslate" translate="no">
                  {detailsLine}
                </div>
              ) : null}
              {selectedOptionLabels.length > 0 ? (
                <div className="mt-1">
                  {selectedOptionLabels.map((label, optionIdx) => (
                    <div key={`${uniqueLineId}-selected-option-${optionIdx}`} className="text-xs text-gray-500 italic">
                      - {label}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      key={`${order.id}-all`}
      className={`${readyToneClass} border-2 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between transition-all ${
        isReadyHighlighted ? "ring-4 ring-green-400 animate-pulse bg-green-50" : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3 border-b-2 border-black pb-2">
        <div>
          <div className="text-2xl font-black uppercase">
            T-{order.table_number ?? "?"}
            {resolvedCovers ? (
              <span className="inline-flex items-center gap-1 ml-2">
                <Users size={12} className="inline-block align-text-bottom" /> {resolvedCovers}
              </span>
            ) : null}
          </div>
          {serviceStepLabel ? (
            <div className="mt-1 inline-flex items-center rounded border-2 border-black bg-white px-2 py-1 text-[11px] font-black">
              {serviceStepLabel}
            </div>
          ) : null}
        </div>
        <div className="text-xs font-mono text-gray-500">#{String(order.id).slice(0, 4)}</div>
      </div>
      <div className="space-y-3 text-sm text-black">
        {renderItemsSection("Plats", foodItems)}
        {renderItemsSection("Boissons", drinkItems)}
      </div>
    </div>
  );
}





