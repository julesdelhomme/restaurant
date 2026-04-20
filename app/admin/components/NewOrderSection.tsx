import { Check } from "lucide-react";
import type { DishItem, FastOrderLine } from "../types";

type FastEntryCategory = {
  key: string;
  label: string;
};

type NewOrderSectionProps = {
  tableSelectOptions: number[];
  selectedFastTableNumber: string;
  fastCoversInput: string;
  fastItemCount: number;
  fastTotal: number;
  categoriesForFastEntry: FastEntryCategory[];
  effectiveSelectedFastCategoryKey: string;
  visibleFastEntryDishes: DishItem[];
  formulaParentDishIds: Set<string>;
  dishIdsWithLinkedExtras: Set<string>;
  fastLines: FastOrderLine[];
  fastLoading: boolean;
  fastMessage: string;
  canSubmit: boolean;
  onSelectTable: (value: string) => void;
  onDecrementCovers: () => void;
  onIncrementCovers: () => void;
  onCoversInputChange: (value: string) => void;
  onSelectCategory: (key: string) => void;
  onSelectDish: (dish: DishItem) => void;
  onRemoveFastLine: (lineId: string) => void;
  onUpdateLineKitchenComment: (lineId: string, comment: string) => void;
  onSubmit: () => void;
  readBooleanFlag: (value: unknown, fallback?: boolean) => boolean;
  getFormulaDisplayName: (dish: DishItem) => string;
  getDishName: (dish: DishItem) => string;
  getFormulaPackPrice: (dish: DishItem) => number;
  getDishPrice: (dish: DishItem) => number;
  dishNeedsCooking: (dish: DishItem) => boolean;
  parseDishProductOptions: (dish: DishItem) => unknown[];
  parseDishExtras: (dish: DishItem) => unknown[];
  parseDishSideIds: (dish: DishItem) => unknown[];
  resolveFastLineUnitPrice: (line: FastOrderLine) => number;
  buildLineInstructions: (line: FastOrderLine) => string;
};

export function NewOrderSection({
  tableSelectOptions,
  selectedFastTableNumber,
  fastCoversInput,
  fastItemCount,
  fastTotal,
  categoriesForFastEntry,
  effectiveSelectedFastCategoryKey,
  visibleFastEntryDishes,
  formulaParentDishIds,
  dishIdsWithLinkedExtras,
  fastLines,
  fastLoading,
  fastMessage,
  canSubmit,
  onSelectTable,
  onDecrementCovers,
  onIncrementCovers,
  onCoversInputChange,
  onSelectCategory,
  onSelectDish,
  onRemoveFastLine,
  onUpdateLineKitchenComment,
  onSubmit,
  readBooleanFlag,
  getFormulaDisplayName,
  getDishName,
  getFormulaPackPrice,
  getDishPrice,
  dishNeedsCooking,
  parseDishProductOptions,
  parseDishExtras,
  parseDishSideIds,
  resolveFastLineUnitPrice,
  buildLineInstructions,
}: NewOrderSectionProps) {
  return (
    <section className="bg-white border-2 border-black rounded-lg p-4">
      <h2 className="text-lg font-bold mb-3">Nouvelle Commande (Saisie rapide)</h2>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-bold mb-1">{"Num\u00E9ro de table"}</label>
            <select
              value={selectedFastTableNumber}
              onChange={(e) => onSelectTable(e.target.value)}
              className="h-12 w-40 border-2 border-black px-3 text-lg font-bold bg-white"
            >
              <option value="">{"S\u00E9lectionner"}</option>
              {tableSelectOptions.map((table) => (
                <option key={table} value={table}>
                  Table {table}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Couverts</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onDecrementCovers}
                className="h-12 w-10 border-2 border-black bg-white font-black text-lg"
                aria-label="Diminuer les couverts"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                required
                value={fastCoversInput}
                onChange={(e) => onCoversInputChange(e.target.value)}
                className="h-12 w-24 border-2 border-black px-2 text-lg font-bold bg-white text-center"
                placeholder="Couverts"
              />
              <button
                type="button"
                onClick={onIncrementCovers}
                className="h-12 w-10 border-2 border-black bg-white font-black text-lg"
                aria-label="Augmenter les couverts"
              >
                +
              </button>
            </div>
          </div>
        </div>
        <div className="text-sm font-bold">Articles: {fastItemCount}</div>
        <div className="text-sm font-bold">Total: {fastTotal.toFixed(2)}&euro;</div>
      </div>
      {false && <div id="debug-formula"></div>}

      <div className="mb-4 flex flex-wrap gap-2">
        {categoriesForFastEntry.map((category) => (
          <button
            key={category.key}
            type="button"
            onClick={() => onSelectCategory(category.key)}
            className={`px-4 py-2 border-2 border-black font-bold ${
              effectiveSelectedFastCategoryKey === category.key ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="border-2 border-black rounded overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] bg-gray-100 border-b-2 border-black px-3 py-2 font-bold text-sm">
          <div>Produit</div>
          <div className="pr-4">Prix</div>
          <div className="text-center">Action</div>
        </div>
        {visibleFastEntryDishes.length === 0 ? <div className="px-3 py-3 text-sm">Aucun article.</div> : null}
        {visibleFastEntryDishes.map((dish) => {
          const dishId = String(dish.id);
          const displayMode = String((dish as DishItem & { formulaDisplayMode?: unknown }).formulaDisplayMode || "")
            .trim()
            .toLowerCase();
          const isFormulaDish =
            displayMode === "formula"
              ? true
              : displayMode === "base"
                ? false
                : formulaParentDishIds.has(String(dish.id || "").trim()) ||
                  readBooleanFlag((dish as unknown as { is_formula?: unknown }).is_formula, false);
          const displayName = isFormulaDish ? getFormulaDisplayName(dish) : getDishName(dish);
          const displayPrice = isFormulaDish ? getFormulaPackPrice(dish) : getDishPrice(dish);
          const linkedDishOptions =
            Array.isArray((dish as DishItem & { dish_options?: unknown }).dish_options)
              ? (((dish as DishItem & { dish_options?: unknown }).dish_options as unknown[]) || [])
              : [];
          console.log("Plat:", dish.name, "Options trouvÃƒÂ©es:", linkedDishOptions);
          const hasOptions = isFormulaDish
            ? true
            : dishNeedsCooking(dish) ||
              parseDishProductOptions(dish).length > 0 ||
              parseDishExtras(dish).length > 0 ||
              linkedDishOptions.length > 0 ||
              dishIdsWithLinkedExtras.has(dishId) ||
              parseDishSideIds(dish).length > 0;
          return (
            <div
              key={`${dishId}:${displayMode || "default"}`}
              className="grid grid-cols-[1fr_auto_auto] items-center px-3 py-2 border-t border-gray-200"
            >
              <div>
                <div className="font-bold">
                  {displayName}
                  {isFormulaDish ? (
                    <span className="ml-2 inline-flex items-center rounded-full border border-black bg-yellow-200 px-2 py-0.5 text-[10px] font-black uppercase">
                      FORMULE
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="pr-4 text-sm">{displayPrice.toFixed(2)}&euro;</div>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => onSelectDish(dish)}
                  className={`h-10 px-3 border-2 border-black text-xs font-bold ${hasOptions ? "bg-white" : "bg-gray-100"}`}
                >
                  {hasOptions ? "Configurer" : "Ajouter"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded border-2 border-black p-3 max-h-56 overflow-y-auto">
        <h3 className="font-bold mb-2">R&eacute;capitulatif commande</h3>
        {fastLines.length === 0 ? <p className="text-sm text-gray-600">Aucune ligne.</p> : null}
        <div className="space-y-2">
          {fastLines.map((line) => (
            <div key={line.lineId} className="border border-gray-300 rounded p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <div className="font-semibold">
                    {line.quantity}x {line.isFormula ? `Formule: ${line.formulaDishName || "Formule"}` : line.dishName}
                  </div>
                  {(line.selectedCooking || line.selectedSides.length > 0) && (
                    <div className="text-xs text-gray-600 mt-1">
                      {line.selectedCooking && <span>Cuisson: {line.selectedCooking}</span>}
                      {line.selectedCooking && line.selectedSides.length > 0 && <span> | </span>}
                      {line.selectedSides.length > 0 && <span>Accompagnements: {line.selectedSides.join(", ")}</span>}
                    </div>
                  )}
                  {Array.isArray(line.formulaSelections) && line.formulaSelections.length > 0 ? (
                    <div className="mt-2 space-y-1 text-xs text-gray-700 border-t border-gray-200 pt-1">
                      {line.formulaSelections.map((selection, index) => (
                        <div key={`fast-summary-formula-${line.lineId}-${selection.dishId || index}`}>
                          <span className="font-bold">{selection.dishName}</span>
                          {selection.selectedCooking && <span> - Cuisson: {selection.selectedCooking}</span>}
                          {(selection.selectedSides?.length ?? 0) > 0 && (
                            <span>, Accompagnements: {selection.selectedSides?.join(", ")}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">
                    {(resolveFastLineUnitPrice(line) * line.quantity).toFixed(2)}&euro;
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveFastLine(line.lineId)}
                    className="px-2 py-1 text-xs font-bold border border-black bg-white"
                  >
                    Retirer
                  </button>
                </div>
              </div>
              {buildLineInstructions(line) ? (
                <div className="mt-1 text-xs text-gray-700">{buildLineInstructions(line)}</div>
              ) : null}
              <div className="mt-2">
                <label className="block text-xs font-bold mb-1">Commentaire cuisine</label>
                <textarea
                  value={line.specialRequest}
                  onChange={(event) => onUpdateLineKitchenComment(line.lineId, event.target.value)}
                  placeholder="Ex: sans oignons"
                  className="w-full border border-black px-2 py-1 text-xs"
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="mt-4 w-full h-14 bg-green-700 text-white text-xl font-bold border-2 border-black disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        <span className="inline-flex items-center gap-2">
          <Check className="h-5 w-5" />
          {fastLoading ? "ENVOI..." : "Valider la commande"}
        </span>
      </button>
      {fastMessage ? <p className="mt-2 text-sm font-semibold">{fastMessage}</p> : null}
    </section>
  );
}
