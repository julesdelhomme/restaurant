type SyncCurrentStepPreparingParams = {
  items: Array<Record<string, unknown>>;
  currentStep: number;
  normalizeFormulaStepValue: (value: unknown, strict?: boolean) => number | null;
};

export function synchronizeCurrentStepPreparingService({
  items,
  currentStep,
  normalizeFormulaStepValue,
}: SyncCurrentStepPreparingParams): Array<Record<string, unknown>> {
  const normalizeStatusText = (value: unknown) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const isPendingLikeStatus = (value: unknown) => {
    const normalized = normalizeStatusText(value);
    return (
      !normalized ||
      normalized === "pending" ||
      normalized === "waiting" ||
      normalized === "en_attente" ||
      normalized === "attente" ||
      normalized === "queued" ||
      normalized === "queue"
    );
  };

  const resolveStepForSync = (record: Record<string, unknown>) =>
    normalizeFormulaStepValue(
      record.step ??
        record.sequence ??
        record.step_number ??
        record.sort_order ??
        record.sortOrder ??
        record.service_step_sequence ??
        record.formula_current_sequence ??
        record.formulaCurrentSequence,
      true
    );

  const syncCurrentStepPreparing = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map((entry) => syncCurrentStepPreparing(entry));
    if (!value || typeof value !== "object") return value;

    const record = { ...(value as Record<string, unknown>) };
    const step = resolveStepForSync(record);
    const rawStatus =
      record.status ?? record.item_status ?? record.preparation_status ?? record.prep_status ?? record.state;

    if (currentStep > 0 && step != null && step === currentStep && isPendingLikeStatus(rawStatus)) {
      record.status = "preparing";
    }

    const nestedKeys = [
      "formula_items",
      "formulaItems",
      "selections",
      "selection",
      "formula_selections",
      "formulaSelections",
      "choices",
      "choice",
    ];
    nestedKeys.forEach((key) => {
      if (record[key] != null) record[key] = syncCurrentStepPreparing(record[key]);
    });

    if (record.metadata && typeof record.metadata === "object") {
      record.metadata = syncCurrentStepPreparing(record.metadata);
    }
    if (record.meta && typeof record.meta === "object") {
      record.meta = syncCurrentStepPreparing(record.meta);
    }

    return record;
  };

  return items.map((item) => syncCurrentStepPreparing(item) as Record<string, unknown>);
}
