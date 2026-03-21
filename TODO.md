# TODO: Fix Syntax Errors in TableConfigManager.tsx

**Status: 0/6 Complete**

## Plan Steps:
1. [ ] Add missing `);` after first `formulaQueryResult = await formulaQuery` (~line 3705)
2. [ ] Delete redundant `primaryDishesQuery = primaryDishesQueryRes;` (~line 3715)
3. [ ] Complete `String(...)` expression, remove "let linksResult..." garbage (~lines 3780-3800)  
4. [ ] Fix `applyFormulasRows` lambda braces/indentation
5. [ ] Consolidate duplicated `formula_dish_links` queries (use single clean version)
6. [ ] Preserve fallbacks/error handling (42703), formulaDisplays logic

**Next:** edit_file on app/admin/TableConfigManager.tsx

**Followup:** `npx next dev` → test browser console → realtime OK → attempt_completion

