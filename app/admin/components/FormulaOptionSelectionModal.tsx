import type { DishItem, ExtraChoice, FormulaSelectionDetails, ProductOptionChoice } from "../types";
import { COOKING_CHOICES } from "../utils/page-helpers";

type FormulaOptionModalConfig = {
  productOptions: ProductOptionChoice[];
  hasRequiredSides: boolean;
  sideOptions: string[];
  maxSides: number;
  askCooking: boolean;
  extras: ExtraChoice[];
};

type FormulaOptionSelectionModalProps = {
  open: boolean;
  dish: DishItem | null;
  categoryId: string;
  config: FormulaOptionModalConfig | null;
  details: FormulaSelectionDetails;
  allowMulti: boolean;
  defaultOptionIds: string[];
  missingRequired: boolean;
  optionsLabel: string;
  optionLockedLabel: string;
  getDishName: (dish: DishItem) => string;
  parsePriceNumber: (value: unknown) => number;
  mapSideLabelToId: (sideLabel: string) => string;
  onSetError: (message: string) => void;
  onClose: () => void;
  onProductOptionChange: (optionId: string, checked: boolean) => void;
  onSideToggle: (sideId: string, sideLabel: string, checked: boolean, maxSides: number) => void;
  onExtraToggle: (extra: ExtraChoice, checked: boolean) => void;
  onCookingChange: (cookingLabel: string) => void;
};

export function FormulaOptionSelectionModal({
  open,
  dish,
  categoryId,
  config,
  details,
  allowMulti,
  defaultOptionIds,
  missingRequired,
  optionsLabel,
  optionLockedLabel,
  getDishName,
  parsePriceNumber,
  mapSideLabelToId,
  onSetError,
  onClose,
  onProductOptionChange,
  onSideToggle,
  onExtraToggle,
  onCookingChange,
}: FormulaOptionSelectionModalProps) {
  if (!open || !dish || !config) return null;
  const isFormulaMode = true;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border-2 border-black bg-white">
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-3">
          <div>
            <div className="text-xs font-black uppercase text-black/60">ProductOptionsModal</div>
            <div className="text-lg font-black">{getDishName(dish)}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 border-2 border-black bg-white font-black"
            aria-label="Fermer"
          >
            &times;
          </button>
        </div>

        <div className="space-y-4 p-4">
          {config.productOptions.length > 0 ? (
            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-wide">{optionsLabel}</div>
              <div className="grid grid-cols-1 gap-2">
                {config.productOptions.map((option) => {
                  const optionId = String(option.id || "").trim();
                  if (!optionId) return null;
                  const optionPrice = parsePriceNumber(option.price);
                  const isPaidOption = optionPrice > 0;
                  const isDefaultOption = defaultOptionIds.includes(optionId);
                  const isLocked = isPaidOption && !isDefaultOption;
                  const selected = details.selectedProductOptionIds.includes(optionId);
                  return (
                    <label
                      key={`formula-option-modal-option-${categoryId}-${optionId}`}
                      className={`flex items-center gap-2 text-sm font-bold ${isLocked ? "text-gray-400" : "text-black"}`}
                    >
                      <input
                        type={allowMulti ? "checkbox" : "radio"}
                        name={`formula-option-modal-${categoryId}`}
                        checked={selected}
                        disabled={isLocked}
                        onChange={(event) => {
                          if (isLocked) return;
                          onSetError("");
                          onProductOptionChange(optionId, event.target.checked);
                        }}
                      />
                      <span>
                        {String(option.name || "").trim()}
                        {optionPrice > 0 ? ` (+${optionPrice.toFixed(2)}\u20AC)` : ""}
                        {isLocked ? ` (${optionLockedLabel})` : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          {config.hasRequiredSides ? (
            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-wide">
                Accompagnements ({Math.min(config.maxSides, details.selectedSides.length)}/{config.maxSides})
              </div>
              {config.sideOptions.length === 0 ? (
                <div className="text-xs font-bold text-red-600">Aucun accompagnement configur&#233;.</div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {config.sideOptions.map((sideLabel) => {
                    const sideId = mapSideLabelToId(sideLabel);
                    const checked = details.selectedSideIds.includes(sideId);
                    return (
                      <label
                        key={`formula-option-modal-side-${categoryId}-${sideId}`}
                        className="flex items-center gap-2 text-sm font-bold"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            onSetError("");
                            onSideToggle(sideId, sideLabel, event.target.checked, config.maxSides);
                          }}
                        />
                        <span>{sideLabel}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {!isFormulaMode && config.extras.length > 0 ? (
            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-wide">Supplements</div>
              <div className="grid grid-cols-1 gap-2">
                {config.extras.map((extra) => {
                  const extraKey = `${extra.name}:${parsePriceNumber(extra.price).toFixed(2)}`;
                  const checked = details.selectedExtras.some(
                    (value) => `${value.name}:${parsePriceNumber(value.price).toFixed(2)}` === extraKey
                  );
                  return (
                    <label
                      key={`formula-option-modal-extra-${categoryId}-${extraKey}`}
                      className="flex items-center gap-2 text-sm font-bold"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          onSetError("");
                          onExtraToggle(extra, event.target.checked);
                        }}
                      />
                      <span>
                        {extra.name}
                        {parsePriceNumber(extra.price) > 0
                          ? ` (+${parsePriceNumber(extra.price).toFixed(2)}\u20AC)`
                          : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          {config.askCooking ? (
            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-wide">Cuisson</div>
              <div className="grid grid-cols-1 gap-2">
                {COOKING_CHOICES.map((cookingLabel) => (
                  <label
                    key={`formula-option-modal-cooking-${categoryId}-${cookingLabel}`}
                    className="flex items-center gap-2 text-sm font-bold"
                  >
                    <input
                      type="radio"
                      name={`formula-option-modal-cooking-${categoryId}`}
                      checked={details.selectedCooking === cookingLabel}
                      onChange={() => {
                        onSetError("");
                        onCookingChange(cookingLabel);
                      }}
                    />
                    <span>{cookingLabel}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            disabled={missingRequired}
            className="h-11 w-full border-2 border-black bg-black font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Valider ce plat de formule
          </button>
        </div>
      </div>
    </div>
  );
}
