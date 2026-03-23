import { supabase } from "./supabase";

export async function migrateTranslationsToJsonb() {
  console.log("Starting migration of translations to JSONB...");

  // Migrate dishes
  const { data: dishes, error: dishesError } = await supabase
    .from("dishes")
    .select("id, name_fr, name_en, name_es, name_de, description_fr, description_en, description_es, description_de, translations");

  if (dishesError) {
    console.error("Error fetching dishes:", dishesError);
    return;
  }

  const dishUpdates = dishes?.map((dish) => {
    const translations = {
      fr: {
        name: dish.name_fr || "",
        description: dish.description_fr || "",
      },
      en: {
        name: dish.name_en || "",
        description: dish.description_en || "",
      },
      es: {
        name: dish.name_es || "",
        description: dish.description_es || "",
      },
      de: {
        name: dish.name_de || "",
        description: dish.description_de || "",
      },
    };

    return {
      id: dish.id,
      translations,
    };
  }) || [];

  for (const update of dishUpdates) {
    const { error } = await supabase
      .from("dishes")
      .update({ translations: update.translations })
      .eq("id", update.id);

    if (error) {
      console.error(`Error updating dish ${update.id}:`, error);
    }
  }

  console.log(`Migrated ${dishUpdates.length} dishes`);

  // Migrate dish_options (though they might already be in JSONB)
  const { data: options, error: optionsError } = await supabase
    .from("dish_options")
    .select("id, name_fr, name_en, name_es, name_de, names_i18n");

  if (optionsError) {
    console.error("Error fetching options:", optionsError);
    return;
  }

  const optionUpdates = options?.map((option) => {
    const names_i18n = {
      fr: option.name_fr || "",
      en: option.name_en || "",
      es: option.name_es || "",
      de: option.name_de || "",
    };

    return {
      id: option.id,
      names_i18n,
    };
  }) || [];

  for (const update of optionUpdates) {
    const { error } = await supabase
      .from("dish_options")
      .update({ names_i18n: update.names_i18n })
      .eq("id", update.id);

    if (error) {
      console.error(`Error updating option ${update.id}:`, error);
    }
  }

  console.log(`Migrated ${optionUpdates.length} options`);

  console.log("Migration completed!");
}