/**
 * FORMULA SAVE/SYNC FIX GUIDE
 * 
 * ISSUE: Code was trying to insert into 'formula_dish_links' table which doesn't exist
 * 
 * SOLUTION: Use the correct tables:
 * - restaurant_formulas: stores formula metadata (name, price, image, etc.)
 * - formula_steps: stores the links between formulas and dishes
 * 
 * TABLE STRUCTURE:
 * ================
 * 
 * restaurant_formulas:
 *   id, restaurant_id, name, price, image_url, image_path, active, created_at, updated_at
 * 
 * formula_steps:
 *   id, formula_id, dish_id, step_number, is_required, created_at, updated_at
 */

import { supabase } from './supabase';

interface FormulaData {
  id?: string | number;
  restaurant_id?: string | number;
  name: string;
  price?: number | null;
  image_url?: string | null;
  image_path?: string | null;
  active?: boolean;
}

interface FormulaStepRow {
  formula_id: string | number;
  dish_id: string | number;
  step_number: number;
  is_required?: boolean;
}

interface SaveFormulaResponse {
  success: boolean;
  formula?: any;
  syncError?: string;
  syncWarning?: boolean;
  error?: string;
  message?: string;
}

/**
 * Save a formula and its linked dishes
 * 
 * @param formulaData - The formula to save (id required for upsert)
 * @param formulaSteps - Array of links between this formula and dishes
 * @param restaurantId - The restaurant ID for context
 * @returns Response with success/error info
 */
export const saveFormula = async (
  formulaData: FormulaData,
  formulaSteps: FormulaStepRow[] = [],
  restaurantId?: string | number
): Promise<SaveFormulaResponse> => {
  try {
    if (!formulaData) {
      throw new Error('Formula data is required');
    }

    // 1. Sauvegarde de la formule elle-même dans restaurant_formulas
    const payload = {
      ...formulaData,
      ...(restaurantId && { restaurant_id: restaurantId }),
    };

    console.log('Saving formula:', payload);

    const { data: formula, error: fError } = await supabase
      .from('restaurant_formulas')
      .upsert(payload as never)
      .select()
      .single();

    if (fError) {
      console.error('Erreur sauvegarde formule:', fError);
      throw new Error(`Formula save failed: ${fError.message}`);
    }

    console.log('Formula saved with ID:', formula.id);
    const formulaId = formula.id;

    // 2. Sauvegarde des liens formule-plat dans formula_steps
    // C'est ICI que le code plante souvent!
    // ✅ CORRECT: On utilise 'formula_steps' (pas 'formula_dish_links')
    
    if (formulaSteps.length > 0) {
      // 2a. Supprimer les anciens liens pour cette formule
      const { error: deleteError } = await supabase
        .from('formula_steps')
        .delete()
        .eq('formula_id', formulaId as never);

      if (deleteError) {
        console.warn('Erreur suppression formula_steps:', deleteError.message);
        // On continue malgré l'erreur - ce n'est pas bloquant
      }

      // 2b. Insérer les nouveaux liens
      const stepsPayload = formulaSteps.map(step => ({
        formula_id: formulaId,
        dish_id: step.dish_id,
        step_number: step.step_number || 1,
        is_required: step.is_required ?? false,
      }));

      console.log('Inserting formula steps:', stepsPayload);

      const { error: linkError } = await supabase
        .from('formula_steps')
        .insert(stepsPayload as never);

      if (linkError) {
        console.error('Erreur de synchro formula_steps:', linkError.message);
        
        // IMPORTANT: La formule est sauvegardée mais la synchro a échoué
        // C'est un avertissement, pas une erreur bloquante
        return {
          success: true,
          formula,
          syncWarning: true,
          syncError: linkError.message,
          message: 'Plat sauvegardé mais erreur de synchronisation formule',
        };
      }
    }

    return {
      success: true,
      formula,
      message: 'Formule sauvegardée avec succès',
    };
  } catch (err: any) {
    console.error('Unexpected error in saveFormula:', err);
    return {
      success: false,
      error: err.message || 'Unknown error',
      message: 'Erreur lors de la sauvegarde',
    };
  }
};

/**
 * Fetch formula links (relationships between formulas and dishes)
 */
export const fetchFormulaLinks = async (
  restaurantId: string | number
): Promise<FormulaStepRow[]> => {
  try {
    // ✅ CORRECT: On utilise 'formula_steps' avec les bonnes relations
    const { data, error } = await supabase
      .from('formula_steps')
      .select('formula_id, dish_id, step_number, is_required')
      .in(
        'formula_id',
        (
          await supabase
            .from('restaurant_formulas')
            .select('id')
            .eq('restaurant_id', restaurantId)
        ).data?.map((f: any) => f.id) || []
      );

    if (error) {
      console.error('Error fetching formula_steps:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching formula links:', err);
    return [];
  }
};

/**
 * Get formulas for a restaurant
 */
export const fetchFormulas = async (
  restaurantId: string | number
): Promise<FormulaData[]> => {
  try {
    const { data, error } = await supabase
      .from('restaurant_formulas')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('active', true);

    if (error) {
      console.error('Error fetching formulas:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching formulas:', err);
    return [];
  }
};
