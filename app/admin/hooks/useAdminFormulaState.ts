import { useState } from "react";
import type { DishItem, FormulaDishLink, FormulaSelectionDetails } from "../types";

export function useAdminFormulaState() {
  const [formulaLinksByFormulaId, setFormulaLinksByFormulaId] = useState<Map<string, FormulaDishLink[]>>(new Map());
  const [formulaLinksByDishId, setFormulaLinksByDishId] = useState<Map<string, FormulaDishLink[]>>(new Map());
  const [formulaDisplayById, setFormulaDisplayById] = useState<Map<string, { name?: string; imageUrl?: string }>>(new Map());
  const [formulaDishIdsFromLinks, setFormulaDishIdsFromLinks] = useState<Set<string>>(new Set());
  const [formulaPriceByDishId, setFormulaPriceByDishId] = useState<Map<string, number>>(new Map());

  const [formulaModalOpen, setFormulaModalOpen] = useState(false);
  const [formulaModalDish, setFormulaModalDish] = useState<DishItem | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [formulaToConfig, setFormulaToConfig] = useState<DishItem | null>(null);
  const [formulaModalSourceDish, setFormulaModalSourceDish] = useState<DishItem | null>(null);
  const [formulaModalSelections, setFormulaModalSelections] = useState<Record<string, string>>({});
  const [formulaModalSelectionDetails, setFormulaModalSelectionDetails] = useState<Record<string, FormulaSelectionDetails>>({});
  const [formulaModalError, setFormulaModalError] = useState("");
  const [formulaModalItemDetailsOpen, setFormulaModalItemDetailsOpen] = useState<Record<string, boolean>>({});
  const [formulaResolvedDishById, setFormulaResolvedDishById] = useState<Record<string, DishItem>>({});
  const [formulaOptionModalState, setFormulaOptionModalState] = useState<{ categoryId: string; dishId: string } | null>(null);

  const [sendingNextStepOrderIds, setSendingNextStepOrderIds] = useState<Record<string, boolean>>({});
  const [tablesAwaitingNextStepUntilMs, setTablesAwaitingNextStepUntilMs] = useState<Record<number, number>>({});
  const [sendingServiceStepOrderIds, setSendingServiceStepOrderIds] = useState<Record<string, boolean>>({});
  const [waitClockMs, setWaitClockMs] = useState(() => Date.now());

  return {
    formulaLinksByFormulaId,
    setFormulaLinksByFormulaId,
    formulaLinksByDishId,
    setFormulaLinksByDishId,
    formulaDisplayById,
    setFormulaDisplayById,
    formulaDishIdsFromLinks,
    setFormulaDishIdsFromLinks,
    formulaPriceByDishId,
    setFormulaPriceByDishId,
    formulaModalOpen,
    setFormulaModalOpen,
    formulaModalDish,
    setFormulaModalDish,
    configModalOpen,
    setConfigModalOpen,
    formulaToConfig,
    setFormulaToConfig,
    formulaModalSourceDish,
    setFormulaModalSourceDish,
    formulaModalSelections,
    setFormulaModalSelections,
    formulaModalSelectionDetails,
    setFormulaModalSelectionDetails,
    formulaModalError,
    setFormulaModalError,
    formulaModalItemDetailsOpen,
    setFormulaModalItemDetailsOpen,
    formulaResolvedDishById,
    setFormulaResolvedDishById,
    formulaOptionModalState,
    setFormulaOptionModalState,
    sendingNextStepOrderIds,
    setSendingNextStepOrderIds,
    tablesAwaitingNextStepUntilMs,
    setTablesAwaitingNextStepUntilMs,
    sendingServiceStepOrderIds,
    setSendingServiceStepOrderIds,
    waitClockMs,
    setWaitClockMs,
  };
}
