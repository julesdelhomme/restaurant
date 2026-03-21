# TableConfigManager.tsx Syntax Fix Task
**Progress: 0/6**

## Steps:
1. [ ] Add missing `);` after first `formulaQueryResult = await formulaQuery` (~line 3705)
2. [ ] Delete redundant `primaryDishesQuery = primaryDishesQueryRes;` (~line 3715)  
3. [ ] Fix lines ~3780-3800: Remove garbage "let linksResult...", complete String expression
4. [ ] Fix `applyFormulasRows` lambda braces/indentation
5. [ ] Consolidate duplicate `formula_dish_links` queries → single clean version with fallbacks
6. [ ] Test: `npx next dev`, admin page loads, realtime OK

**Next**: edit_file app/admin/TableConfigManager.tsx → step 1-2

