import type { Order } from "./types";

export const isRateLimitError = (error: any) => {
  const code = String(error.code || error.status || "").toLowerCase();
  const message = String(error.message || "").toLowerCase();
  return code === "429" || message.includes("too many requests") || message.includes("rate limit");
};

export const resolveCallsTable = async (args: {
  supabase: any;
  logSqlError: (context: string, error: unknown) => void;
}) => {
  const primary = await args.supabase.from("calls").select("id").limit(1);
  if (!primary.error) return "calls" as const;
  args.logSqlError("kitchen.resolveCallsTable.primary", primary.error);
  return "calls" as const;
};

export const fetchKitchenAutoPrintSetting = async (args: {
  supabase: any;
  restaurantId: string;
}) => {
  const restaurantId = String(args.restaurantId || "").trim();
  if (!restaurantId) return null;
  const { data, error } = await args.supabase
    .from("restaurants")
    .select("*")
    .eq("id", restaurantId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  const tableConfig =
    typeof row.table_config === "string"
      ? (() => {
          try {
            return JSON.parse(String(row.table_config || "{}")) as Record<string, unknown>;
          } catch {
            return {} as Record<string, unknown>;
          }
        })()
      : (row.table_config as Record<string, unknown> | null) || {};
  const direct = row.auto_print_kitchen ?? row.auto_print;
  const nested = tableConfig.auto_print_kitchen ?? tableConfig.auto_print;
  const hasDirectAutoPrintValue = direct !== null && direct !== undefined && String(direct).trim() !== "";
  const nextAutoPrint = hasDirectAutoPrintValue
    ? direct === true || direct === "true"
    : nested === true || nested === "true";
  return nextAutoPrint;
};

export const hydrateDishNamesFromOrders = async (args: {
  supabase: any;
  ordersToHydrate: Order[];
  getOrderItems: (order: Order) => any[];
  normalizeEntityId: (value: unknown) => string;
  resolveDishNameFrFromRow: (row: Record<string, unknown>) => string;
}) => {
  const { supabase, ordersToHydrate, getOrderItems, normalizeEntityId, resolveDishNameFrFromRow } = args;
  const ids = Array.from(
    new Set(
      ordersToHydrate
        .flatMap((order) => getOrderItems(order))
        .map((item) => normalizeEntityId(item.dish_id || item.id || item.dish?.id))
        .filter(Boolean)
    )
  );
  if (ids.length === 0) return {} as Record<string, string>;

  const lookup = await supabase.from("dishes").select("id,name,name_fr,translations").in("id", ids);
  if (lookup.error) {
    console.warn("Lookup dishes cuisine échoué:", lookup.error);
    return {} as Record<string, string>;
  }

  const byId: Record<string, string> = {};
  (lookup.data || []).forEach((row: any) => {
    const source = row as { id: unknown; name_fr: unknown; name: unknown; translations: unknown };
    const key = normalizeEntityId(source.id);
    const label = resolveDishNameFrFromRow(source as Record<string, unknown>);
    if (!key || !label) return;
    byId[key] = label;
  });
  return byId;
};
