import type { TableAssignment } from "../types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TABLE_ASSIGNMENT_ASSIGNEE_COLUMNS = ["staff_id", "waiter_id", "server_id", "user_id"] as const;

const isUuid = (value: unknown) => UUID_PATTERN.test(String(value || "").trim());

const isMissingColumnError = (error: unknown) => {
  const code = String((error as { code?: string })?.code || "");
  const message = String((error as { message?: string })?.message || "").toLowerCase();
  return code === "42703" || message.includes("column") || message.includes("schema cache");
};

const normalizeStatus = (value: unknown) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

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

export async function runHandleSaveTableService(params: {
  supabase: any;
  tableNumberInput: string;
  pinInput: string;
  coversInput: string;
  restaurantId: string | number | null;
  scopedRestaurantId: string;
  normalizeCoversValue: (value: unknown) => number | null;
  setMessage: (value: string) => void;
  setSaving: (value: boolean) => void;
  setPinInput: (value: string) => void;
  setCoversInput: (value: string) => void;
  fetchActiveTables: (restaurantScope?: string | number | null) => Promise<void>;
}): Promise<void> {
  const {
    supabase,
    tableNumberInput,
    pinInput,
    coversInput,
    restaurantId,
    scopedRestaurantId,
    normalizeCoversValue,
    setMessage,
    setSaving,
    setPinInput,
    setCoversInput,
    fetchActiveTables,
  } = params;

  const tableNumber = Number(tableNumberInput);
  const pin = pinInput.trim();
  const normalizedCovers = normalizeCoversValue(coversInput);
  const coversValue = Math.max(0, Math.trunc(Number(normalizedCovers || 0)));
  const targetRestaurantId = String(restaurantId || scopedRestaurantId || "").trim();

  if (!targetRestaurantId) {
    setMessage("ID restaurant manquant dans l'URL.");
    return;
  }
  if (!isUuid(targetRestaurantId)) {
    setMessage("ID restaurant invalide (UUID attendu).");
    return;
  }
  if (!Number.isFinite(tableNumber) || tableNumber <= 0 || !pin || !coversValue) {
    setMessage("Veuillez saisir le numero de table, le PIN et le nombre de couverts.");
    return;
  }

  setSaving(true);
  setMessage("");
  const authUserId = String((await supabase.auth.getUser())?.data?.user?.id || "").trim();
  if (!authUserId) {
    setMessage("Session invalide: identifiant serveur manquant.");
    setSaving(false);
    return;
  }
  if (!isUuid(authUserId)) {
    setMessage("Session invalide: identifiant serveur doit etre un UUID.");
    setSaving(false);
    return;
  }

  const sessionBasePayloads = [
    {
      table_number: tableNumber,
      pin_code: pin,
      covers: coversValue,
      nb_persons: coversValue,
      guest_count: coversValue,
      customer_count: coversValue,
    },
    { table_number: tableNumber, pin_code: pin, covers: coversValue, nb_persons: coversValue, guest_count: coversValue },
    { table_number: tableNumber, pin_code: pin, covers: coversValue },
    { table_number: tableNumber, pin_code: pin, nb_persons: coversValue },
    { table_number: tableNumber, pin_code: pin, guest_count: coversValue },
    { table_number: tableNumber, pin_code: pin, customer_count: coversValue },
    { table_number: tableNumber, pin_code: pin },
  ];
  const sessionPayloads = sessionBasePayloads.flatMap((payload) =>
    buildTableAssignmentPayloadVariants(payload, targetRestaurantId, authUserId)
  );

  console.log("Saisie couverts detectee :", coversValue);
  console.log("Donnees envoyees :", sessionPayloads[0]);
  let insertResult = await supabase.from("table_assignments").insert(sessionPayloads[0]);
  for (let i = 1; insertResult.error && i < sessionPayloads.length; i += 1) {
    if (!isMissingColumnError(insertResult.error)) break;
    console.log("Donnees envoyees :", sessionPayloads[i]);
    insertResult = await supabase.from("table_assignments").insert(sessionPayloads[i]);
  }

  if (insertResult.error) {
    const code = String((insertResult.error as { code?: string })?.code || "");
    const message = String(insertResult.error.message || "").toLowerCase();
    const duplicate = code === "23505" || message.includes("duplicate key") || message.includes("unique");
    if (!duplicate) {
      setMessage("Erreur enregistrement: " + insertResult.error.message);
      setSaving(false);
      return;
    }

    const updateBasePayloads = [
      { pin_code: pin, covers: coversValue, nb_persons: coversValue, guest_count: coversValue, customer_count: coversValue },
      { pin_code: pin, covers: coversValue, nb_persons: coversValue, guest_count: coversValue },
      { pin_code: pin, covers: coversValue },
      { pin_code: pin, nb_persons: coversValue },
      { pin_code: pin, guest_count: coversValue },
      { pin_code: pin, customer_count: coversValue },
      { pin_code: pin },
    ];
    const updatePayloads = updateBasePayloads.flatMap((payload) =>
      buildTableAssignmentPayloadVariants(payload, targetRestaurantId, authUserId)
    );

    console.log("Saisie couverts detectee :", coversValue);
    console.log("Donnees envoyees :", updatePayloads[0]);
    let updateQuery = supabase.from("table_assignments").update(updatePayloads[0]).eq("table_number", tableNumber);
    updateQuery = updateQuery.eq("restaurant_id", targetRestaurantId);
    let updateResult = await updateQuery;

    for (let i = 1; updateResult.error && i < updatePayloads.length; i += 1) {
      if (!isMissingColumnError(updateResult.error)) break;
      console.log("Donnees envoyees :", updatePayloads[i]);
      let nextUpdateQuery = supabase.from("table_assignments").update(updatePayloads[i]).eq("table_number", tableNumber);
      nextUpdateQuery = nextUpdateQuery.eq("restaurant_id", targetRestaurantId);
      updateResult = await nextUpdateQuery;
    }

    if (updateResult.error) {
      setMessage("Erreur enregistrement: " + updateResult.error.message);
      setSaving(false);
      return;
    }
  }

  try {
    const closedStatuses = new Set([
      "paid",
      "paye",
      "payee",
      "archived",
      "archive",
      "archivee",
      "closed",
      "cloture",
      "cloturee",
      "cancelled",
      "canceled",
      "annule",
      "annulee",
    ]);

    let existingOrderResult = await supabase
      .from("orders")
      .select("id,status,created_at")
      .eq("table_number", tableNumber)
      .eq("restaurant_id", targetRestaurantId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (existingOrderResult.error && isMissingColumnError(existingOrderResult.error)) {
      existingOrderResult = await supabase
        .from("orders")
        .select("id,status,created_at")
        .eq("table_number", tableNumber)
        .order("created_at", { ascending: false })
        .limit(20);
    }

    const existingRows = Array.isArray(existingOrderResult.data)
      ? (existingOrderResult.data as Array<Record<string, unknown>>)
      : [];

    const openOrder = existingRows.find((row) => !closedStatuses.has(normalizeStatus(row.status)));

    const orderUpdatePayloads = [
      { covers: coversValue, nb_persons: coversValue, guest_count: coversValue, customer_count: coversValue },
      { covers: coversValue, nb_persons: coversValue, guest_count: coversValue },
      { covers: coversValue },
      { nb_persons: coversValue },
      { guest_count: coversValue },
      { customer_count: coversValue },
    ];

    const orderInsertPayloads = [
      {
        restaurant_id: targetRestaurantId,
        table_number: tableNumber,
        covers: coversValue,
        nb_persons: coversValue,
        guest_count: coversValue,
        customer_count: coversValue,
        items: [],
        total_price: 0,
        status: "pending",
        service_step: "pending",
        current_step: 1,
      },
      {
        restaurant_id: targetRestaurantId,
        table_number: tableNumber,
        covers: coversValue,
        nb_persons: coversValue,
        guest_count: coversValue,
        items: [],
        total_price: 0,
        status: "pending",
      },
      {
        restaurant_id: targetRestaurantId,
        table_number: tableNumber,
        covers: coversValue,
        nb_persons: coversValue,
        items: [],
        total_price: 0,
        status: "pending",
      },
      {
        table_number: tableNumber,
        covers: coversValue,
        nb_persons: coversValue,
        guest_count: coversValue,
        customer_count: coversValue,
        items: [],
        total_price: 0,
        status: "pending",
      },
      {
        table_number: tableNumber,
        covers: coversValue,
        nb_persons: coversValue,
        items: [],
        total_price: 0,
        status: "pending",
      },
      {
        table_number: tableNumber,
        items: [],
        total_price: 0,
        status: "pending",
      },
    ];

    if (openOrder?.id) {
      for (let i = 0; i < orderUpdatePayloads.length; i += 1) {
        const payload = orderUpdatePayloads[i];
        console.log("Donnees envoyees :", payload);
        const result = await supabase.from("orders").update(payload).eq("id", openOrder.id);
        if (!result.error) break;
        if (!isMissingColumnError(result.error)) break;
      }
    } else {
      for (let i = 0; i < orderInsertPayloads.length; i += 1) {
        const payload = orderInsertPayloads[i];
        console.log("Donnees envoyees :", payload);
        const result = await supabase.from("orders").insert([payload]);
        if (!result.error) break;
        if (!isMissingColumnError(result.error)) break;
      }
    }
  } catch (syncError) {
    console.warn("Synchronisation covers vers orders impossible:", syncError);
  }

  setMessage("Table enregistree.");
  setPinInput("");
  setCoversInput(String(coversValue));
  setSaving(false);
  await fetchActiveTables(targetRestaurantId);
}

export async function runHandleDeleteTableService(params: {
  supabase: any;
  row: TableAssignment;
  restaurantId: string | number | null;
  scopedRestaurantId: string;
  setMessage: (value: string) => void;
  fetchActiveTables: (restaurantScope?: string | number | null) => Promise<void>;
}): Promise<void> {
  const { supabase, row, restaurantId, scopedRestaurantId, setMessage, fetchActiveTables } = params;
  const tableNumber = Number(row.table_number);
  const targetRestaurantId = String(restaurantId || scopedRestaurantId || "").trim();
  if (!targetRestaurantId) {
    setMessage("ID restaurant manquant dans l'URL.");
    return;
  }
  let deleteQuery = supabase.from("table_assignments").delete().eq("table_number", tableNumber);
  if (targetRestaurantId) deleteQuery = deleteQuery.eq("restaurant_id", targetRestaurantId);
  const deleteResult = await deleteQuery;
  if (deleteResult.error) {
    setMessage("Erreur fermeture table: " + String(deleteResult.error.message || ""));
    return;
  }
  setMessage("Table fermee.");
  await fetchActiveTables(targetRestaurantId);
}

export function runFillFormForEditService(params: {
  row: TableAssignment;
  readCoversFromRow: (row: Record<string, unknown>) => number | null;
  setTableNumberInput: (value: string) => void;
  setPinInput: (value: string) => void;
  setCoversInput: (value: string) => void;
  setMessage: (value: string) => void;
}): void {
  const { row, readCoversFromRow, setTableNumberInput, setPinInput, setCoversInput, setMessage } = params;
  setTableNumberInput(String(row.table_number));
  setPinInput(String(row.pin_code || ""));
  setCoversInput(String(readCoversFromRow(row as unknown as Record<string, unknown>) || 1));
  setMessage("");
}
