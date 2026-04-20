import type { DishItem } from "../types";

type FetchRestaurantFormulaRowByDishId = (
  formulaDishId: string | number,
  restaurantId?: string | number | null
) => Promise<{
  formula_config: unknown;
  excluded_main_options: unknown;
  formula_visible: boolean | null;
  formula_supplements: unknown;
} | null>;

export async function resolveFormulaModalOpeningData(args: {
  formula: DishItem;
  sourceDish: DishItem | null | undefined;
  dishes: DishItem[];
  currentRestaurantId: string;
  readBooleanFlag: (raw: unknown, fallback?: boolean) => boolean;
  fetchRestaurantFormulaRowByDishId: FetchRestaurantFormulaRowByDishId;
}) {
  const { formula, sourceDish, dishes, currentRestaurantId, readBooleanFlag, fetchRestaurantFormulaRowByDishId } = args;
  const sourceFormula = dishes?.find((row) => String(row?.id || "") === String(formula?.id || "")) || formula;
  const formulaDishId = String(sourceFormula?.id || "").trim();
  const resolvedSourceDish = sourceDish
    ? dishes?.find((row) => String(row?.id || "") === String(sourceDish?.id || "")) || sourceDish
    : null;

  let dbFormulaConfig: unknown = (sourceFormula as unknown as { formula_config?: unknown })?.formula_config ?? null;
  let dbExcludedMainOptions: unknown =
    (sourceFormula as unknown as { excluded_main_options?: unknown })?.excluded_main_options ?? null;
  let dbFormulaSupplements: unknown =
    (sourceFormula as unknown as { formula_supplements?: unknown })?.formula_supplements ?? null;
  let dbFormulaVisible: boolean | null =
    (sourceFormula as unknown as { formula_visible?: unknown })?.formula_visible == null
      ? null
      : readBooleanFlag((sourceFormula as unknown as { formula_visible?: unknown })?.formula_visible, true);
  let loadError: string | null = null;
  if (formulaDishId) {
    try {
      const formulaRow = await fetchRestaurantFormulaRowByDishId(formulaDishId, currentRestaurantId || null);
      dbFormulaConfig = formulaRow?.formula_config ?? null;
      dbExcludedMainOptions = formulaRow?.excluded_main_options ?? null;
      dbFormulaSupplements = formulaRow?.formula_supplements ?? null;
      dbFormulaVisible = formulaRow?.formula_visible ?? null;
    } catch (error) {
      console.error("Erreur chargement formula_config (restaurant_formulas):", error);
      loadError = "Configuration de formule introuvable.";
    }
  }

  const enrichedFormula = {
    ...(sourceFormula as Record<string, unknown>),
    formula_config: dbFormulaConfig,
    excluded_main_options: dbExcludedMainOptions,
    formula_supplements: dbFormulaSupplements,
    formula_visible: dbFormulaVisible,
  } as DishItem;

  const configEmpty =
    dbFormulaConfig == null ||
    (Array.isArray(dbFormulaConfig) && dbFormulaConfig.length === 0) ||
    (typeof dbFormulaConfig === "object" &&
      !Array.isArray(dbFormulaConfig) &&
      Array.isArray((dbFormulaConfig as Record<string, unknown>).steps) &&
      ((dbFormulaConfig as Record<string, unknown>).steps as unknown[]).length === 0);

  return {
    sourceFormula,
    formulaDishId,
    resolvedSourceDish,
    enrichedFormula,
    loadError,
    configEmpty,
  };
}
