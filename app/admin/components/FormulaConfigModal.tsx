import type { FormulaConfigModalProps } from "../types";

export function FormulaConfigModal({ isOpen, allDishes, selectedFormula, children }: FormulaConfigModalProps) {
  if (!isOpen || !selectedFormula || !Array.isArray(allDishes)) return null;
  if (allDishes.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white border-2 border-black rounded-lg p-4 font-bold">
          Aucun plat disponible dans le modal. VÃƒÂ©rifie la prop `allDishes` transmise depuis le parent.
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
