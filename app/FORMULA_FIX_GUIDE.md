# 🔧 Formula Save/Sync Fix - Complete Troubleshooting Guide

## The Problem

Your code was trying to insert into a `formula_dish_links` table that **doesn't exist** in your Supabase schema.

```javascript
// ❌ WRONG - This table doesn't exist
const { error: linkError } = await supabase
  .from('formula_dish_links')  // This table name is incorrect!
  .insert(yourLinksArray);
```

## The Solution

Your actual schema uses:
- **`restaurant_formulas`** - Stores formula metadata (name, price, image, etc.)
- **`formula_steps`** - Stores the recipe steps (which dishes are in which formula)

```javascript
// ✅ CORRECT - Use the right tables
const { error: linkError } = await supabase
  .from('formula_steps')  // Use this table instead!
  .insert(yourLinksArray);
```

---

## 📋 Correct Table Structures

### `restaurant_formulas`
```sql
CREATE TABLE restaurant_formulas (
  id BIGINT PRIMARY KEY,
  restaurant_id BIGINT NOT NULL,
  name VARCHAR(255),
  price NUMERIC(10,2),
  image_url TEXT,
  image_path TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### `formula_steps` (was probably called `formula_dish_links` in old code)
```sql
CREATE TABLE formula_steps (
  id BIGINT PRIMARY KEY DEFAULT gen_random_bigint(),
  formula_id BIGINT NOT NULL REFERENCES restaurant_formulas(id),
  dish_id BIGINT NOT NULL,
  step_number INTEGER DEFAULT 1,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

---

## 🔍 How to Find Your Actual Table Names

Go to Supabase Dashboard > Explorer and look for:
1. Any table containing "formula" in the name
2. Any table containing "step" or "link" in the name

Then adjust the table names in your code accordingly.

---

## ✅ Complete Working Example

```typescript
import { supabase } from '@/lib/supabase';

const saveFormula = async (formulaData, formulaSteps) => {
  try {
    // Step 1: Save the formula itself
    const { data: formula, error: fError } = await supabase
      .from('restaurant_formulas')  // ✅ Correct table
      .upsert(formulaData)
      .select()
      .single();

    if (fError) {
      console.error("Erreur de sauvegarde formule:", fError.message);
      throw fError;
    }

    console.log("Formula saved with ID:", formula.id);

    // Step 2: Delete old steps for this formula
    const { error: deleteError } = await supabase
      .from('formula_steps')  // ✅ Correct table
      .delete()
      .eq('formula_id', formula.id);

    if (deleteError) {
      console.warn("Could not delete old steps:", deleteError.message);
      // Not blocking - continue anyway
    }

    // Step 3: Insert new steps
    if (formulaSteps && formulaSteps.length > 0) {
      const { error: linkError } = await supabase
        .from('formula_steps')  // ✅ Correct table  
        .insert(
          formulaSteps.map(step => ({
            formula_id: formula.id,
            dish_id: step.dish_id,
            step_number: step.step_number || 1,
            is_required: step.is_required ?? false,
          }))
        );

      if (linkError) {
        console.error("Erreur de synchro:", linkError.message);
        alert("Plat sauvegardé mais erreur de synchronisation formule");
        // NOT throwing - formula is saved, sync is optional warning
        return { formula, syncError: linkError };
      }
    }

    return { formula, success: true };
  } catch (err) {
    console.error("Error:", err);
    alert("Erreur: " + err.message);
    throw err;
  }
};
```

---

## 🚨 Common Errors and Fixes

### Error: `42P01` - Relation does not exist
```
Error: "relation "formula_dish_links" does not exist"
```
**Fix:** Replace `formula_dish_links` with `formula_steps` or check your actual table name in Supabase.

### Error: `23503` - Foreign key violation
```
Error: "insert or update on table formula_steps violates foreign key constraint"
```
**Fix:** Ensure the `formula_id` you're inserting actually exists in `restaurant_formulas`.

### Error: `23505` - Unique constraint violation
```
Error: "duplicate key value violates unique constraint"
```
**Fix:** Either:
1. Use upsert instead of insert
2. Delete old records first (Step 2 in the example above)
3. Add `onConflict` parameter to insert

### Error: Table not found
```
Error: "Unauthorized. Missing or invalid credentials"
```
**Fix:** 
1. Verify your API keys are correct
2. Check that the user has SELECT/INSERT/UPDATE/DELETE permissions
3. Verify the table name spelling

---

## 🔗 Where These Tables Are Used

Look for these patterns in your codebase:

### In admin/page.tsx:
```typescript
// OLD - WRONG
const { data, error } = await supabase
  .from('formula_dish_links')  // ❌ Wrong
  .select('*, formula_id(...)')

// NEW - CORRECT
const { data, error } = await supabase
  .from('formula_steps')  // ✅ Right
  .select('formula_id, dish_id, step_number, is_required')
```

### In manager/page.tsx:
```typescript
// Already using the CORRECT tables:
.from("formula_steps")  // ✅ Good
.from("restaurant_formulas")  // ✅ Good
```

---

## 📊 Migration Path

If you're migrating from `formula_dish_links` to `formula_steps`:

```sql
-- 1. Create the new table if it doesn't exist
CREATE TABLE IF NOT EXISTS formula_steps (
  id BIGINT PRIMARY KEY DEFAULT gen_random_bigint(),
  formula_id BIGINT NOT NULL,
  dish_id BIGINT NOT NULL,
  step_number INTEGER DEFAULT 1,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  FOREIGN KEY (formula_id) REFERENCES restaurant_formulas(id)
);

-- 2. Copy data if needed
INSERT INTO formula_steps (formula_id, dish_id, step_number, is_required)
SELECT formula_id, dish_id, step_number, is_required 
FROM formula_dish_links
WHERE NOT EXISTS (
  SELECT 1 FROM formula_steps 
  WHERE formula_steps.formula_id = formula_dish_links.formula_id
    AND formula_steps.dish_id = formula_dish_links.dish_id
);

-- 3. Drop old table (only if you're sure data is migrated)
-- DROP TABLE formula_dish_links;
```

---

## ✨ Next Steps

1. **Replace all references** to `formula_dish_links` with `formula_steps` in your code
2. **Test the save function** with the corrected code samples provided
3. **Monitor console logs** for any sync errors (they won't be blocking)
4. **Verify Supabase** table structure matches the expected schema

---

## 📚 Related Files

- `app/lib/formula-service.ts` - Complete working service functions
- `app/api/formulas/save/route.ts` - Backend API endpoint example
- `app/manager/page.tsx` - Already has correct implementation to reference

---

## 💡 Key Takeaways

| Aspect | Wrong | Right |
|--------|-------|-------|
| Formula storage | formula_dish_links | restaurant_formulas |
| Links storage | formula_dish_links | formula_steps |
| Insert method | insert() | upsert() for formulas, insert() for steps |
| Error handling | Throw on sync error | Warning only - formula is saved |
| Cleanup | None | Delete old steps before inserting new ones |
