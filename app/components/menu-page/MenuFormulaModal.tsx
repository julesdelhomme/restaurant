"use client";

import { MenuFormulaModalShell } from "./MenuFormulaModalShell";
import { FormulaOverviewSection } from "./formula/FormulaOverviewSection";
import { FormulaCategoriesSection } from "./formula/FormulaCategoriesSection";
import { handleFormulaModalSubmit } from "../../lib/menu-page/formula-modal-submit";

export function MenuFormulaModal(props: any) {
  const {
    formulaDish,
    uiText,
    formulaUi,
    formulaAddDisabled,
    setFormulaDish,
    setFormulaSourceDish,
    setFormulaSelections,
    setFormulaSelectionDetails,
    setFormulaMainDetails,
    emptyFormulaSelectionDetails,
    setFormulaSelectionError,
    setFormulaItemDetailsOpen,
    formulaSelectionError,
  } = props;

  const resetFormulaState = () => {
    setFormulaDish(null);
    setFormulaSourceDish(null);
    setFormulaSelections({});
    setFormulaSelectionDetails({});
    setFormulaMainDetails(emptyFormulaSelectionDetails);
    setFormulaSelectionError("");
    setFormulaItemDetailsOpen({});
  };

  return (
    <MenuFormulaModalShell
      show={Boolean(formulaDish)}
      closeLabel={uiText.close}
      title={formulaUi.title}
      subtitle={formulaUi.subtitle}
      submitLabel={uiText.addToCart}
      submitDisabled={formulaAddDisabled}
      onClose={resetFormulaState}
      onSubmit={() => handleFormulaModalSubmit({ ...props, resetFormulaState })}
    >
      <FormulaOverviewSection {...props} />
      <FormulaCategoriesSection {...props} />
      {formulaSelectionError ? <div className="mt-4 text-sm text-red-600 font-bold">{formulaSelectionError}</div> : null}
    </MenuFormulaModalShell>
  );
}
