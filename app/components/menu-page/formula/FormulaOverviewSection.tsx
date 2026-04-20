"use client";

import { FormulaMainConfigSection } from "./FormulaMainConfigSection";

export function FormulaOverviewSection(props: any) {
  const {
    formulaDish,
    mainFormulaStepLabel,
    formulaDisplayName,
    getFormulaPackPrice,
    formulaInfoById,
    dishById,
    formulaStepEntries,
    sanitizeMediaUrl,
    getAllergenLabel,
    formulaMainConfig,
  } = props;

  if (!formulaDish) return null;

  return (
    <>
      <h2 className="text-2xl font-black text-black mb-1">{mainFormulaStepLabel || formulaDisplayName}</h2>
      <div className="text-base font-black inline-flex items-center gap-1 mb-4">
        {Number(getFormulaPackPrice(formulaDish) || 0).toFixed(2)}&euro;
      </div>
      {(() => {
        const info = formulaInfoById.get(String(formulaDish.id || ""));
        const linkedDish = info?.dishId ? dishById.get(String(info.dishId)) : null;
        const firstStepDish =
          [...formulaStepEntries]
            .sort((a: any, b: any) => a.step - b.step || (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
            .find((entry: any) => entry.dish)?.dish || null;
        const imageUrl = sanitizeMediaUrl(
          info?.imageUrl || (formulaDish as any)?.image_url || (firstStepDish as any)?.image_url || (linkedDish as any)?.image_url,
          "dishes-images-"
        );
        if (!imageUrl) return null;
        return (
          <img
            src={imageUrl}
            alt={formulaDisplayName || mainFormulaStepLabel}
            className="w-full h-48 object-cover rounded-lg border-2 border-black mb-4"
          />
        );
      })()}
      {(() => {
        const info = formulaInfoById.get(String(formulaDish.id || ""));
        const desc = String((info as any)?.description || "").trim();
        const calories = (info as any)?.calories != null ? Number((info as any).calories) : null;
        const rawAllergens = (info as any)?.allergens;
        const allergenTokens = Array.isArray(rawAllergens)
          ? rawAllergens.map((value) => String(value || "").trim())
          : String(rawAllergens || "")
              .replace(/^\[|\]$/g, "")
              .split(",")
              .map((value) => String(value || "").replace(/^["']|["']$/g, "").trim());
        const allergenLabels = allergenTokens
          .filter(Boolean)
          .map((code) => getAllergenLabel(code))
          .filter(Boolean)
          .join(", ");
        if (!desc && calories == null && !allergenLabels) return null;
        return (
          <div className="mb-4 space-y-2 text-sm">
            {desc && <p className="whitespace-pre-line">{desc}</p>}
            {calories != null && <p className="font-bold">Calories : {calories} kcal</p>}
            {allergenLabels && (
              <p className="text-black">
                <span className="font-bold">Allergenes :</span> {allergenLabels}
              </p>
            )}
          </div>
        );
      })()}
      <FormulaMainConfigSection {...props} formulaMainConfig={formulaMainConfig} />
    </>
  );
}
