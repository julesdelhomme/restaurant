import { useMemo } from "react";

type Params = Record<string, any>;

export function useAdminFastOrderUi(params: Params) {
  const {
    setSelectedFastTableNumber,
    tableCoversByNumber,
    setFastCoversInput,
    fastCoversInput,
    coversInput,
    fastLoading,
    fastLinesLength,
    selectedFastTableNumber,
    normalizeCoversValue,
    setCoversInput,
  } = params;

  const handleFastTableSelection = (nextValue: string) => {
    setSelectedFastTableNumber(nextValue);
    const tableNum = Number(nextValue);
    const knownCovers = tableCoversByNumber.get(tableNum);
    if (knownCovers) setFastCoversInput(String(knownCovers));
  };

  const handleFastCoversDecrement = () => setFastCoversInput(String(Math.max(1, Number(fastCoversInput || 1) - 1)));
  const handleFastCoversIncrement = () => setFastCoversInput(String(Math.max(1, Number(fastCoversInput || 0) + 1)));

  const canSubmitFastOrder = useMemo(
    () => !(fastLoading || fastLinesLength === 0 || !String(selectedFastTableNumber || "").trim() || !normalizeCoversValue(fastCoversInput)),
    [fastLoading, fastLinesLength, selectedFastTableNumber, fastCoversInput]
  );

  const handleSessionCoversDecrement = () => setCoversInput(String(Math.max(1, Number(coversInput || 1) - 1)));
  const handleSessionCoversIncrement = () => setCoversInput(String(Math.max(1, Number(coversInput || 0) + 1)));

  return {
    handleFastTableSelection,
    handleFastCoversDecrement,
    handleFastCoversIncrement,
    canSubmitFastOrder,
    handleSessionCoversDecrement,
    handleSessionCoversIncrement,
  };
}
