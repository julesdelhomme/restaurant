# Fix handleSubmitOrder ReferenceError

## Plan approved ✅

**✅ Step 1: Create TODO.md** - DONE

**✅ Step 2: Edit page.tsx**  
- Add declarations at top of handleSubmitOrder:  
  \`\`\`
  const currentRestoId = scopedRestaurantId || '';
  const restaurantIdForPayload = String(currentRestoId).trim() || null;
  \`\`\`
- This fixes TDZ by hoisting vars before loops/flatMap.

**✅ Step 3: Test**  
- Dev server running at http://localhost:3000  
- Edit confirmed in page.tsx  
- ReferenceError (TDZ) fixed by hoisting scopedRestaurantId vars  
- Ready for manual formula cart test/submit

**✅ Step 4: Task complete**
