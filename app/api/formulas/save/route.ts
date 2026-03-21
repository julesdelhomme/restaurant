import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface FormulaStepRow {
  formula_id: string | number;
  dish_id: string | number;
  step_number: number;
  is_required?: boolean;
}

interface SaveFormulaRequest {
  restaurantId: string | number;
  formulaData: Record<string, unknown>;
  formulaSteps?: FormulaStepRow[];
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveFormulaRequest = await request.json();
    const { restaurantId, formulaData, formulaSteps = [] } = body;

    if (!restaurantId || !formulaData) {
      return NextResponse.json(
        { error: 'Missing restaurantId or formulaData' },
        { status: 400 }
      );
    }

    // 1. Sauvegarde de la formule elle-même dans restaurant_formulas
    // Fix allergens: convert string to array for Supabase text[] column
    const allergensArray = typeof formulaData.allergens === 'string' 
      ? formulaData.allergens.split(',').map(a => a.trim()).filter(Boolean) 
      : Array.isArray(formulaData.allergens) ? formulaData.allergens : [];

    const { data: formula, error: fError } = await supabase
      .from('restaurant_formulas')
      .upsert({
        ...formulaData,
        ...(allergensArray.length > 0 && { allergens: allergensArray }),
        restaurant_id: restaurantId,
      } as never)
      .select()
      .single();

    if (fError) {
      console.error('Formula save error:', fError);
      return NextResponse.json(
        {
          error: 'Formula save failed',
          message: fError.message,
          code: (fError as any).code,
        },
        { status: 400 }
      );
    }

    console.log('Formula saved:', formula?.id);

    // 2. Sauvegarde des liens formule-plat dans formula_steps
    if (formulaSteps.length > 0) {
      // D'abord, supprimer les anciens liens pour cette formule
      const deleteResult = await supabase
        .from('formula_steps')
        .delete()
        .eq('formula_id', formula.id as never);

      if (deleteResult.error) {
        console.warn('Error deleting old formula_steps:', deleteResult.error);
        // Continue malgré l'erreur de suppression - ce n'est pas bloquant
      }

      // Ensuite, insérer les nouveaux liens
      const { error: linkError } = await supabase
        .from('formula_steps')
        .insert(
          formulaSteps.map(step => ({
            formula_id: formula.id,
            dish_id: step.dish_id,
            step_number: step.step_number || 1,
            is_required: step.is_required ?? false,
          })) as never
        );

      if (linkError) {
        console.error('Formula steps sync error:', linkError);
        // Important: Le plat est sauvegardé, mais la synchro formule a échoué
        return NextResponse.json(
          {
            success: true,
            formula,
            syncWarning: true,
            syncError: linkError.message,
            message: 'Formula saved but step sync failed',
          },
          { status: 201 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        formula,
        stepsCount: formulaSteps.length,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      {
        error: 'Server error',
        message: (err as Error).message,
      },
      { status: 500 }
    );
  }
}
