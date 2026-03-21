# TODO: Fix allergens array serialization for restaurant_formulas

## Plan approved ✅
- [x] Step 1: Edit api/formulas/save/route.ts - Convert allergens string → array before upsert
- [x] Step 2: Edit lib/formula-service.ts - Add defensive allergens conversion in saveFormula()
- [x] Step 3: Test formula save (no more "malformed array literal" error)
- [x] Step 4: Verify client display (comma-separated allergens)
- [x] Step 5: attempt_completion

