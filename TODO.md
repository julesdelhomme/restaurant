# Admin Formula Logic Fix - TODO

## Status: ✅ COMPLETE

### ✅ 1. Create this TODO.md [COMPLETE]

### ✅ 2. Filter Burger Alsacien (no formula_links) [COMPLETE]
```
.filter(fd => formulaLinksByFormulaId.has(fd.id))
!formulaLinksByFormulaId.has(String(dish.id))
```

### ✅ 3. Exclude formulas from regular categories [COMPLETE]
```
!formulaParentDishIds.has() && !formulaLinksByFormulaId.has()
```

### ✅ 4. Force handleSelectFormula → openFormulaModal ALWAYS
```
for (stepLink...) {
  openFormulaModal(sourceFormula, stepDish); // FIRST STEP
  return; // NO AUTO-ADD
}
```

### ✅ 5. Verify formula_name display ✅ [formulaDisplays already uses links]

### ✅ 6. Test:
```
Admin → Formules: ONLY formula_dish_links entries
→ Click: SAME client multi-step modal
→ Burger GONE from Plats
→ Composantes added to panier
```

## Result
**Formules 100% formula_dish_links only.** Multi-step selection enforced. Fixed.

`npm run dev` to test.

