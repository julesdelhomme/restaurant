import type { ServiceNotification } from "../types";

export async function runFetchNotificationsService(params: {
  supabase: any;
  restaurantScope: string | number | null;
  canAccessAssignedTable: (tableNumberRaw: unknown) => boolean;
  isKitchenOnlyNotification: (row: Record<string, unknown>) => boolean;
  normalizeNotificationRow: (row: Record<string, unknown>) => ServiceNotification;
  setServiceNotifications: (value: ServiceNotification[]) => void;
}): Promise<void> {
  const {
    supabase,
    restaurantScope,
    canAccessAssignedTable,
    isKitchenOnlyNotification,
    normalizeNotificationRow,
    setServiceNotifications,
  } = params;
  const currentRestaurantId = String(restaurantScope ?? "").trim();
  console.log("ID utilise:", currentRestaurantId, "[admin.fetchNotifications]");
  if (!currentRestaurantId) {
    setServiceNotifications([]);
    return;
  }
  const query = supabase
    .from("notifications")
    .select("*")
    .eq("restaurant_id", currentRestaurantId)
    .order("created_at", { ascending: false })
    .limit(50);
  const { data, error } = await query;
  if (error) {
    const errMsg = String((error as { message?: string } | null)?.message || "").toLowerCase();
    if (!errMsg.includes("does not exist")) {
      console.warn("Notifications admin indisponibles:", error);
    }
    setServiceNotifications([]);
    return;
  }
  const isKitchenReminderNotification = (row: Record<string, unknown>) => {
    const type = String(row.type || "").trim().toUpperCase();
    const tableText = String(row.table_number || "").trim().toUpperCase();
    return type === "CUISINE" || tableText === "CUISINE";
  };

  const rows = ((data || []) as Array<Record<string, unknown>>)
    .filter((row) => {
      const status = String(row.status || "").trim().toLowerCase();
      if (status && status !== "pending") return false;
      if (isKitchenOnlyNotification(row)) return false;
      if (isKitchenReminderNotification(row)) return true;
      return canAccessAssignedTable(row.table_number);
    })
    .map((row) => normalizeNotificationRow(row)) as ServiceNotification[];
  setServiceNotifications(rows);
}

export function handleNotificationInsertPayload(params: {
  payload: unknown;
  restaurantId: string | number | null;
  canAccessAssignedTable: (tableNumberRaw: unknown) => boolean;
  isKitchenOnlyNotification: (row: Record<string, unknown>) => boolean;
  normalizeNotificationRow: (row: Record<string, unknown>) => ServiceNotification;
  setServiceNotifications: (updater: (prev: ServiceNotification[]) => ServiceNotification[]) => void;
  playReadyNotificationBeep: () => void;
}): void {
  const {
    payload,
    restaurantId,
    canAccessAssignedTable,
    isKitchenOnlyNotification,
    normalizeNotificationRow,
    setServiceNotifications,
    playReadyNotificationBeep,
  } = params;
  const isKitchenReminderNotification = (raw: Record<string, unknown>) => {
    const type = String(raw.type || "").trim().toUpperCase();
    const tableText = String(raw.table_number || "").trim().toUpperCase();
    return type === "CUISINE" || tableText === "CUISINE";
  };
  const row = normalizeNotificationRow(((payload as { new?: Record<string, unknown> }).new || {}) as Record<string, unknown>);
  if (!row.id) return;
  if (isKitchenOnlyNotification(row as unknown as Record<string, unknown>)) return;
  const status = String(row.status || "").trim().toLowerCase();
  if (status && status !== "pending") return;
  const currentRestaurantId = String(restaurantId ?? "").trim();
  const rowRestaurantId = String(row.restaurant_id ?? "").trim();
  if (currentRestaurantId && rowRestaurantId && rowRestaurantId !== currentRestaurantId) return;
  if (!isKitchenReminderNotification(row as unknown as Record<string, unknown>) && !canAccessAssignedTable(row.table_number)) return;
  setServiceNotifications((prev) => {
    if (prev.some((entry) => String(entry.id) === String(row.id))) return prev;
    return [row, ...prev];
  });
  playReadyNotificationBeep();
}

export function handleNotificationUpdatePayload(params: {
  payload: unknown;
  canAccessAssignedTable: (tableNumberRaw: unknown) => boolean;
  isKitchenOnlyNotification: (row: Record<string, unknown>) => boolean;
  normalizeNotificationRow: (row: Record<string, unknown>) => ServiceNotification;
  setServiceNotifications: (updater: (prev: ServiceNotification[]) => ServiceNotification[]) => void;
}): void {
  const { payload, canAccessAssignedTable, isKitchenOnlyNotification, normalizeNotificationRow, setServiceNotifications } = params;
  const isKitchenReminderNotification = (raw: Record<string, unknown>) => {
    const type = String(raw.type || "").trim().toUpperCase();
    const tableText = String(raw.table_number || "").trim().toUpperCase();
    return type === "CUISINE" || tableText === "CUISINE";
  };
  const row = normalizeNotificationRow(((payload as { new?: Record<string, unknown> }).new || {}) as Record<string, unknown>);
  if (isKitchenOnlyNotification(row as unknown as Record<string, unknown>)) {
    setServiceNotifications((prev) => prev.filter((entry) => String(entry.id) !== String(row.id)));
    return;
  }
  const status = String(row.status || "").trim().toLowerCase();
  setServiceNotifications((prev) => {
    const filtered = prev.filter((entry) => String(entry.id) !== String(row.id));
    if (status === "pending" && (isKitchenReminderNotification(row as unknown as Record<string, unknown>) || canAccessAssignedTable(row.table_number))) return [row, ...filtered];
    return filtered;
  });
}

export function handleNotificationDeletePayload(params: {
  payload: unknown;
  setServiceNotifications: (updater: (prev: ServiceNotification[]) => ServiceNotification[]) => void;
}): void {
  const { payload, setServiceNotifications } = params;
  const oldRow = ((payload as { old?: Record<string, unknown> }).old || {}) as Record<string, unknown>;
  const oldId = String(oldRow.id || "").trim();
  if (!oldId) return;
  setServiceNotifications((prev) => prev.filter((entry) => String(entry.id) !== oldId));
}
