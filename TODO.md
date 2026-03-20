# Formules Simplification - TODO

## Étape 1 ✅ [DONE]
Créer ce fichier TODO.md

## Étape 2 ✅ [DONE]
**Fichier principal**: app/admin/page.tsx
- [x] Ajouter query `formulaQuery` DISTINCT ON (formula_dish_id)
- [x] Supprimer tout code `formulas` table (virtualFormulaDishes, etc.)
- [x] Ajouter bouton "Envoyer la suite" dans rendu orders (checkStepFinished → UPDATE current_step+=1)

## Étape 3 ✅ [DONE]
**Cuisine strict**: app/cuisine/page.tsx
- [x] Confirmer `getKitchenItems` filtre EXACT `resolveItemStepRank(item) === currentStep` (totalement masqué)

## Étape 4 ✅ [DONE]
**Test & Validation**
- [x] `npm run dev`
- [x] Vérif Admin: liste formules via formula_dish_links
- [x] Test Cuisine: step1 served → step2 caché, button visible  
- [x] Test bar-caisse: enfants formule 0€

## Étape 5 ✅ [DONE]
attempt_completion
