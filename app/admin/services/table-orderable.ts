type EnsureTableIsOrderableForServerParams = {
  supabaseClient: any;
  tableNumber: number;
  covers?: number | null;
  targetRestaurantId: string;
  normalizeCoversValue: (value: unknown) => number | null;
};
const TABLE_ASSIGNMENT_ASSIGNEE_COLUMNS = ["staff_id", "waiter_id", "server_id", "user_id"] as const;
const isMissingColumnError = (error: unknown) => {
  const code = String((error as { code?: string })?.code || "");
  const msg = String((error as { message?: string })?.message || "").toLowerCase();
  return code === "42703" || msg.includes("column") || msg.includes("schema cache");
};
const buildTableAssignmentPayloadVariants = (
  basePayload: Record<string, unknown>,
  restaurantId: string,
  authUserId: string
) => {
  const scopedBase = { ...basePayload, restaurant_id: restaurantId };
  if (!authUserId) return [scopedBase];
  const withAssignee = TABLE_ASSIGNMENT_ASSIGNEE_COLUMNS.map((columnName) => ({
    ...scopedBase,
    [columnName]: authUserId,
  }));
  return [...withAssignee, scopedBase];
};

export async function ensureTableIsOrderableForServerService({
  supabaseClient,
  tableNumber,
  covers,
  targetRestaurantId,
  normalizeCoversValue,
}: EnsureTableIsOrderableForServerParams) {
  if (!targetRestaurantId) return null;
  const authUserId = String((await supabaseClient.auth.getUser())?.data?.user?.id || "").trim();
  if (!authUserId) {
    return { message: "identifiant serveur manquant" };
  }

  const markTableAsOccupied = async () => {
    // Le schéma table_assignments varie selon les environnements (ex: colonne `occupied` absente).
    // Pour ne jamais bloquer l'envoi de commande, on n'essaie plus d'écrire ce flag ici.
    return null;
  };

  let selectPrimaryQuery = supabaseClient
    .from("table_assignments")
    .select("table_number,pin_code")
    .eq("table_number", tableNumber)
    .limit(1);
  if (targetRestaurantId) selectPrimaryQuery = selectPrimaryQuery.eq("restaurant_id", targetRestaurantId);
  let selectPrimary = await selectPrimaryQuery;
  if (selectPrimary.error && String((selectPrimary.error as { code?: string }).code || "") === "42703" && targetRestaurantId) {
    selectPrimary = await supabaseClient.from("table_assignments").select("table_number,pin_code").eq("table_number", tableNumber).limit(1);
  }
  if (selectPrimary.error) return selectPrimary.error;

  const row =
    Array.isArray(selectPrimary.data) && selectPrimary.data[0]
      ? (selectPrimary.data[0] as { pin_code?: unknown })
      : null;
  const currentPin = String(row?.pin_code || "").trim();

  if (!row) {
    const normalizedCovers = normalizeCoversValue(covers);
    const upsertBasePayloads = normalizedCovers
      ? [
          { table_number: tableNumber, pin_code: "SERVEUR", covers: normalizedCovers, nb_persons: normalizedCovers, guest_count: normalizedCovers, customer_count: normalizedCovers },
          { table_number: tableNumber, pin_code: "SERVEUR", covers: normalizedCovers, nb_persons: normalizedCovers, guest_count: normalizedCovers },
          { table_number: tableNumber, pin_code: "SERVEUR", covers: normalizedCovers },
          { table_number: tableNumber, pin_code: "SERVEUR", nb_persons: normalizedCovers },
          { table_number: tableNumber, pin_code: "SERVEUR", guest_count: normalizedCovers },
          { table_number: tableNumber, pin_code: "SERVEUR", customer_count: normalizedCovers },
          { table_number: tableNumber, pin_code: "SERVEUR" },
        ]
      : [
          { table_number: tableNumber, pin_code: "SERVEUR" },
        ];
    const upsertPayloads = upsertBasePayloads.flatMap((payload) =>
      buildTableAssignmentPayloadVariants(payload, targetRestaurantId, authUserId)
    );
    let inserted = await supabaseClient
      .from("table_assignments")
      .upsert([upsertPayloads[0]], { onConflict: "table_number" });
    for (let i = 1; inserted.error && i < upsertPayloads.length; i += 1) {
      if (!isMissingColumnError(inserted.error)) break;
      inserted = await supabaseClient.from("table_assignments").upsert([upsertPayloads[i]], { onConflict: "table_number" });
    }
    if (inserted.error) return inserted.error;
    return await markTableAsOccupied();
  }

  if (!currentPin || currentPin === "0000" || normalizeCoversValue(covers)) {
    const normalizedCovers = normalizeCoversValue(covers);
    const updateBasePayloads = normalizedCovers
      ? [
          { pin_code: "SERVEUR", covers: normalizedCovers, nb_persons: normalizedCovers, guest_count: normalizedCovers, customer_count: normalizedCovers },
          { pin_code: "SERVEUR", covers: normalizedCovers, nb_persons: normalizedCovers, guest_count: normalizedCovers },
          { pin_code: "SERVEUR", covers: normalizedCovers },
          { pin_code: "SERVEUR", nb_persons: normalizedCovers },
          { pin_code: "SERVEUR", guest_count: normalizedCovers },
          { pin_code: "SERVEUR", customer_count: normalizedCovers },
          { pin_code: "SERVEUR" },
        ]
      : [{ pin_code: "SERVEUR" }];
    const updatePayloads = updateBasePayloads.flatMap((payload) =>
      buildTableAssignmentPayloadVariants(payload, targetRestaurantId, authUserId)
    );
    let updateQuery = supabaseClient.from("table_assignments").update(updatePayloads[0]).eq("table_number", tableNumber);
    if (targetRestaurantId) updateQuery = updateQuery.eq("restaurant_id", targetRestaurantId);
    let updated = await updateQuery;
    for (let i = 1; updated.error && i < updatePayloads.length; i += 1) {
      if (!isMissingColumnError(updated.error)) break;
      let nextUpdateQuery = supabaseClient.from("table_assignments").update(updatePayloads[i]).eq("table_number", tableNumber);
      if (targetRestaurantId) nextUpdateQuery = nextUpdateQuery.eq("restaurant_id", targetRestaurantId);
      updated = await nextUpdateQuery;
    }
    if (updated.error) return updated.error;
  }

  return await markTableAsOccupied();
}
