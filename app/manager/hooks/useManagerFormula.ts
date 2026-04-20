import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { parseJsonObject } from "../managerRuntimeShared"; // <-- CORRECTION ICI

export function useManagerFormula(editingDish: any, scopedRestaurantId: string) {
  const [selectedFormulaDishes, setSelectedFormulaDishes] = useState<string[]>([]);
  const [dishSteps, setDishSteps] = useState<Record<string, number>>({});
  const [mainDishStep, setMainDishStep] = useState<number>(1);
  const [selectedMainDishOptions, setSelectedMainDishOptions] = useState<string[]>([]);

  useEffect(() => {
    if (!editingDish?.id || !editingDish.is_formula) return;

    const fetchFormulaDetails = async () => {
      // FIX : On prend TOUTES les colonnes pour ne rien rater
      const { data, error } = await supabase
        .from("restaurant_formulas")
        .select("*")
        .eq("dish_id", editingDish.id)
        .maybeSingle();

      if (data) {
        // FIX BUG OPTION : On récupère les options exclues même si elles sont null
        setSelectedMainDishOptions(data.excluded_main_options || []);
        
        const config = typeof data.formula_config === "string" 
          ? parseJsonObject(data.formula_config) 
          : data.formula_config;

        if (config) {
          setSelectedFormulaDishes(config.selected_dishes || []);
          setDishSteps(config.steps_by_dish || {});
          setMainDishStep(config.main_dish_step || 1);
        }
      } else {
        console.log("KITCHEN DATA FORMULA: No record found for dish", editingDish.id);
      }
    };

    fetchFormulaDetails();
  }, [editingDish?.id]);

  return {
    selectedFormulaDishes, setSelectedFormulaDishes,
    dishSteps, setDishSteps,
    mainDishStep, setMainDishStep,
    selectedMainDishOptions, setSelectedMainDishOptions
  };
}