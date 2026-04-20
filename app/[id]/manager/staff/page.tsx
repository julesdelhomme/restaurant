"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";

type StaffItem = {
  id: string;
  identifier: string;
  role: string;
  isActive: boolean;
  plainPassword: string;
  assignedTables?: number[];
};

type StaffRole = "server" | "cuisine" | "bar_caisse";

const ROLE_OPTIONS: Array<{ value: StaffRole; label: string }> = [
  { value: "server", label: "Serveur" },
  { value: "cuisine", label: "Cuisine" },
  { value: "bar_caisse", label: "Bar-Caisse" },
];

function roleLabel(rawRole: string) {
  const role = String(rawRole || "").trim().toLowerCase();
  const found = ROLE_OPTIONS.find((entry) => entry.value === role);
  return found?.label || role || "Inconnu";
}

export default function ManagerStaffPage() {
  const router = useRouter();
  const params = useParams<{ id?: string; restaurant_id?: string }>();
  const restaurantId = useMemo(() => String(params?.id || params?.restaurant_id || "").trim(), [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<StaffItem[]>([]);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("server");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [identifierDraftById, setIdentifierDraftById] = useState<Record<string, string>>({});
  const [roleDraftById, setRoleDraftById] = useState<Record<string, StaffRole>>({});
  const [passwordDraftById, setPasswordDraftById] = useState<Record<string, string>>({});
  const [showStoredPasswordById, setShowStoredPasswordById] = useState<Record<string, boolean>>({});
  const [showDraftPasswordById, setShowDraftPasswordById] = useState<Record<string, boolean>>({});
  const [updatingStaffId, setUpdatingStaffId] = useState("");
  const [deletingStaffId, setDeletingStaffId] = useState("");
  const [availableTables, setAvailableTables] = useState<number[]>([]);
  const [assignedTablesDraftById, setAssignedTablesDraftById] = useState<Record<string, number[]>>({});
  const [createAssignedTables, setCreateAssignedTables] = useState<number[]>([]);

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return String(data.session?.access_token || "").trim();
  };

  const normalizeTableList = (value: unknown): number[] => {
    const list = Array.isArray(value) ? value : [];
    const parsed = list
      .map((entry) => Number(entry))
      .filter((entry) => Number.isFinite(entry))
      .map((entry) => Math.max(1, Math.trunc(entry)));
    return Array.from(new Set(parsed)).sort((a, b) => a - b);
  };

  const toggleTableInList = (list: number[], tableNumber: number) => {
    if (!Number.isFinite(tableNumber) || tableNumber <= 0) return list;
    if (list.includes(tableNumber)) return list.filter((value) => value !== tableNumber);
    return [...list, tableNumber].sort((a, b) => a - b);
  };

  const fetchRestaurantTables = async () => {
    if (!restaurantId) {
      setAvailableTables([]);
      return;
    }
    const parseJsonObject = (value: unknown): Record<string, unknown> | null => {
      if (value && typeof value === "object") return value as Record<string, unknown>;
      if (typeof value !== "string") return null;
      const raw = value.trim();
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
      } catch {
        return null;
      }
    };
    const collectTableNumbersFromConfig = (source: unknown): number[] => {
      const config = parseJsonObject(source);
      if (!config) return [];
      const toNum = (value: unknown) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
      };
      const explicitLists = [
        config.tables,
        config.table_numbers,
        config.tableNumbers,
      ];
      const fromLists = explicitLists.flatMap((entry) => {
        if (!Array.isArray(entry)) return [];
        return entry
          .map((row) => {
            if (row && typeof row === "object") {
              const rec = row as Record<string, unknown>;
              return (
                toNum(rec.table_number) ??
                toNum(rec.tableNumber) ??
                toNum(rec.number) ??
                toNum(rec.id)
              );
            }
            return toNum(row);
          })
          .filter((value): value is number => Number.isFinite(value));
      });
      const totalTables =
        toNum(config.total_tables) ??
        toNum(config.totalTables) ??
        toNum(config.nb_tables) ??
        toNum(config.number_of_tables) ??
        null;
      const fromTotal =
        totalTables && totalTables > 0
          ? Array.from({ length: totalTables }, (_, index) => index + 1)
          : [];
      return [...fromLists, ...fromTotal];
    };
    const { data: configuredTableRowsData, error: configuredTableRowsError } = await supabase
      .from("table_assignments")
      .select("table_number")
      .eq("restaurant_id", restaurantId)
      .order("table_number", { ascending: true });
    if (configuredTableRowsError) {
      false && console.warn("TRACE:", {
        context: "manager.staff.fetchRestaurantTables.tableAssignmentsError",
        message: String((configuredTableRowsError as { message?: string } | null)?.message || configuredTableRowsError || ""),
      });
    }
    const configuredTableRows = Array.isArray(configuredTableRowsData)
      ? (configuredTableRowsData as Array<Record<string, unknown>>)
      : [];
    const { data: restaurantConfigData, error: restaurantConfigError } = await supabase
      .from("restaurants")
      .select("table_config")
      .eq("id", restaurantId)
      .maybeSingle();
    if (restaurantConfigError) {
      false && console.warn("TRACE:", {
        context: "manager.staff.fetchRestaurantTables.tableConfigError",
        message: String((restaurantConfigError as { message?: string } | null)?.message || restaurantConfigError || ""),
      });
    }
    const staticTableNumbers = collectTableNumbersFromConfig(restaurantConfigData?.table_config ?? null);
    const nextTables = Array.from(
      new Set(
        [
          ...staticTableNumbers,
          ...configuredTableRows
            .map((row) => Number(row.table_number ?? NaN))
            .filter((value) => Number.isFinite(value))
            .map((value) => Math.max(1, Math.trunc(value))),
        ]
      )
    ).sort((a, b) => a - b);
    false && console.log("TRACE:", {
      context: "manager.staff.fetchRestaurantTables",
      restaurantId,
      staticTablesFromTableConfig: staticTableNumbers,
      configuredTablesFromTableAssignments: configuredTableRows.length,
      tables: nextTables,
    });
    setAvailableTables(nextTables);
  };

  const fetchStaff = async () => {
    if (!restaurantId) {
      setError("Restaurant ID absent dans l'URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError("Session invalide.");
      setLoading(false);
      return;
    }

    const response = await fetch(`/api/staff-accounts?restaurant_id=${encodeURIComponent(restaurantId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as { items?: StaffItem[]; error?: string };
    if (!response.ok) {
      setError(payload.error || "Impossible de charger les comptes staff.");
      setLoading(false);
      return;
    }

    const nextItems = Array.isArray(payload.items)
      ? payload.items.map((item) => ({
          ...item,
          assignedTables: normalizeTableList(item.assignedTables),
        }))
      : [];
    setItems(nextItems);
    setIdentifierDraftById(
      Object.fromEntries(nextItems.map((item) => [item.id, String(item.identifier || "").trim()]))
    );
    setRoleDraftById(
      Object.fromEntries(
        nextItems.map((item) => {
          const normalizedRole = String(item.role || "").trim().toLowerCase();
          const safeRole =
            normalizedRole === "server" ||
            normalizedRole === "cuisine" ||
            normalizedRole === "bar_caisse"
              ? normalizedRole
              : "server";
          return [item.id, safeRole];
        })
      ) as Record<string, StaffRole>
    );
    setPasswordDraftById(
      Object.fromEntries(nextItems.map((item) => [item.id, String(item.plainPassword || "").trim()]))
    );
    setAssignedTablesDraftById(
      Object.fromEntries(nextItems.map((item) => [item.id, normalizeTableList(item.assignedTables)]))
    );
    setLoading(false);
  };

  useEffect(() => {
    void (async () => {
      await fetchRestaurantTables();
      await fetchStaff();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  useEffect(() => {
    setIdentifier("");
  }, []);

  useEffect(() => {
    if (role !== "server" && createAssignedTables.length > 0) {
      setCreateAssignedTables([]);
    }
  }, [role, createAssignedTables.length]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    setSaving(true);

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setSaving(false);
      setMessage("Session invalide.");
      return;
    }
    const normalizedIdentifier = String(identifier || "").trim().toLowerCase();
    if (items.some((item) => String(item.identifier || "").trim().toLowerCase() === normalizedIdentifier)) {
      setSaving(false);
      setMessage("Cet identifiant est déjà utilisé.");
      return;
    }

    const response = await fetch("/api/staff-accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        restaurantId,
        identifier: identifier.trim(),
        password,
        role,
        assignedTables: role === "server" ? createAssignedTables : [],
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setMessage(payload.error || "Creation impossible.");
      return;
    }

    setIdentifier("");
    setPassword("");
    setRole("server");
    setCreateAssignedTables([]);
    setShowCreatePassword(false);
    setMessage("Compte staff cree.");
    await fetchStaff();
  };

  const handleDeleteStaff = async (item: StaffItem) => {
    const confirmed = window.confirm("\u00CAtes-vous s\u00FBr de vouloir supprimer ce compte ?");
    if (!confirmed) return;
    setMessage("");
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setMessage("Session invalide.");
      return;
    }

    setDeletingStaffId(item.id);
    const response = await fetch("/api/staff-accounts", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        staffAccountId: item.id,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setDeletingStaffId("");
    if (!response.ok) {
      setMessage(payload.error || "Suppression impossible.");
      return;
    }
    setMessage(`Compte staff "${item.identifier}" supprim\u00E9.`);
    await fetchStaff();
  };

  const handleSaveStaff = async (item: StaffItem) => {
    const nextIdentifier = String(identifierDraftById[item.id] || item.identifier || "").trim();
    const nextRoleRaw = String(roleDraftById[item.id] || item.role || "server").trim().toLowerCase();
    const nextRole =
      nextRoleRaw === "server" ||
      nextRoleRaw === "cuisine" ||
      nextRoleRaw === "bar_caisse"
        ? nextRoleRaw
        : "server";
    const nextPassword = String(passwordDraftById[item.id] || "").trim();
    const nextAssignedTables =
      nextRole === "server" ? normalizeTableList(assignedTablesDraftById[item.id] || []) : [];

    if (!nextIdentifier) {
      setMessage("Identifiant invalide.");
      return;
    }
    const normalizedIdentifier = nextIdentifier.toLowerCase();
    if (
      items.some(
        (entry) =>
          entry.id !== item.id && String(entry.identifier || "").trim().toLowerCase() === normalizedIdentifier
      )
    ) {
      setMessage("Cet identifiant est déjà utilisé.");
      return;
    }
    if (nextPassword && nextPassword.length < 6) {
      setMessage("Le code PIN / mot de passe doit contenir au moins 6 caracteres.");
      return;
    }

    setMessage("");
    setUpdatingStaffId(item.id);
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setUpdatingStaffId("");
      setMessage("Session invalide.");
      return;
    }

    const body: Record<string, unknown> = {
      staffAccountId: item.id,
      identifier: nextIdentifier,
      role: nextRole,
      assignedTables: nextAssignedTables,
    };
    if (nextPassword) body.password = nextPassword;

    const response = await fetch("/api/staff-accounts", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setUpdatingStaffId("");
    if (!response.ok) {
      setMessage(payload.error || "Mise a jour impossible.");
      return;
    }

    setShowDraftPasswordById((prev) => ({ ...prev, [item.id]: false }));
    setMessage(`Compte staff mis a jour pour "${nextIdentifier}".`);
    await fetchStaff();
  };

  return (
    <div className="min-h-screen bg-gray-100 text-black p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-black">Gestion du Staff</h1>
          <button
            type="button"
            onClick={() => router.push(`/${restaurantId}/manager`)}
            className="px-4 py-2 rounded border-2 border-black font-black bg-white"
          >
            Retour Manager
          </button>
        </header>

        <section className="rounded-xl border-2 border-black bg-white p-4">
          <h2 className="text-xl font-black mb-3">Creer un compte staff</h2>
          <form onSubmit={handleCreate} autoComplete="off" className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              required
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              onFocus={(event) => {
                const value = String(event.currentTarget.value || "").trim();
                if (value.includes("@")) setIdentifier("");
              }}
              autoComplete="off"
              name="staff_identifier_create"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className="px-3 py-2 border border-gray-300 rounded"
              placeholder="Identifiant (ex: Cuisine 1)"
            />
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as StaffRole)}
              className="px-3 py-2 border border-gray-300 rounded"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={`role-option-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type={showCreatePassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="px-3 py-2 border border-gray-300 rounded"
              placeholder="Code PIN / mot de passe"
            />
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={showCreatePassword}
                onChange={(event) => setShowCreatePassword(event.target.checked)}
              />
              Voir le code
            </label>
            {role === "server" ? (
              <div className="md:col-span-4 rounded border border-gray-300 bg-gray-50 p-3">
                <div className="mb-2 text-xs font-black uppercase tracking-wide text-gray-700">Tables assignées</div>
                <div className="flex flex-wrap gap-2">
                  {availableTables.map((tableNumber) => {
                    const checked = createAssignedTables.includes(tableNumber);
                    return (
                      <label
                        key={`create-assigned-table-${tableNumber}`}
                        className={`inline-flex items-center gap-2 rounded border px-2 py-1 text-xs font-bold ${
                          checked ? "border-green-700 bg-green-100 text-green-900" : "border-gray-300 bg-white text-gray-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setCreateAssignedTables((prev) => toggleTableInList(prev, tableNumber))
                          }
                        />
                        T-{tableNumber}
                      </label>
                    );
                  })}
                  {availableTables.length === 0 ? (
                    <div className="text-xs font-bold text-gray-500">
                      Aucune table trouvée.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded border-2 border-black bg-black text-white font-black disabled:opacity-60 md:col-span-4"
            >
              {saving ? "Creation..." : "Creer"}
            </button>
          </form>
          {message ? <p className="mt-2 text-sm font-bold text-blue-700">{message}</p> : null}
        </section>

        <section className="rounded-xl border-2 border-black bg-white p-4">
          <h2 className="text-xl font-black mb-3">Comptes existants</h2>
          {loading ? <p className="font-bold">Chargement...</p> : null}
          {error ? <p className="font-bold text-red-700">{error}</p> : null}
          {!loading && !error ? (
            <div className="space-y-2">
              {items.length === 0 ? <p className="text-sm text-gray-600">Aucun compte staff.</p> : null}
              {items.map((item) => (
                <div key={item.id} className="rounded border border-gray-300 p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div className="font-bold">{item.identifier}</div>
                    <div className="text-gray-700">
                      {roleLabel(item.role)} | {item.isActive ? "Actif" : "Inactif"}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input
                      type="text"
                      value={identifierDraftById[item.id] || ""}
                      onChange={(event) =>
                        setIdentifierDraftById((prev) => ({ ...prev, [item.id]: event.target.value }))
                      }
                      autoComplete="off"
                      name={`staff_identifier_edit_${item.id}`}
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Identifiant"
                    />
                    <select
                      value={roleDraftById[item.id] || "server"}
                      onChange={(event) =>
                        setRoleDraftById((prev) => ({
                          ...prev,
                          [item.id]: event.target.value as StaffRole,
                        }))
                      }
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={`edit-role-${item.id}-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type={showDraftPasswordById[item.id] ? "text" : "password"}
                      value={passwordDraftById[item.id] || ""}
                      onChange={(event) =>
                        setPasswordDraftById((prev) => ({ ...prev, [item.id]: event.target.value }))
                      }
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Code PIN / mot de passe"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowDraftPasswordById((prev) => ({ ...prev, [item.id]: !Boolean(prev[item.id]) }))
                      }
                      className="px-2 py-1 border border-black rounded text-xs font-black bg-white"
                    >
                      {showDraftPasswordById[item.id] ? "Masquer saisie" : "Voir saisie"}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-gray-700">Code actuel:</span>
                    <input
                      type={showStoredPasswordById[item.id] ? "text" : "password"}
                      readOnly
                      value={String(item.plainPassword || "")}
                      className="px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50"
                      placeholder="Non renseigne"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowStoredPasswordById((prev) => ({ ...prev, [item.id]: !Boolean(prev[item.id]) }))
                      }
                      className="px-2 py-1 border border-black rounded text-xs font-black bg-white"
                    >
                      {showStoredPasswordById[item.id] ? "Masquer code actuel" : "Voir code actuel"}
                    </button>
                  </div>
                  {(roleDraftById[item.id] || "server") === "server" ? (
                    <div className="rounded border border-gray-300 bg-gray-50 p-2">
                      <div className="mb-1 text-xs font-black uppercase tracking-wide text-gray-700">Tables assignées</div>
                      <div className="flex flex-wrap gap-2">
                        {availableTables.map((tableNumber) => {
                          const selected = normalizeTableList(assignedTablesDraftById[item.id] || []).includes(tableNumber);
                          return (
                            <label
                              key={`staff-${item.id}-table-${tableNumber}`}
                              className={`inline-flex items-center gap-2 rounded border px-2 py-1 text-xs font-bold ${
                                selected ? "border-blue-700 bg-blue-100 text-blue-900" : "border-gray-300 bg-white text-gray-700"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() =>
                                  setAssignedTablesDraftById((prev) => ({
                                    ...prev,
                                    [item.id]: toggleTableInList(
                                      normalizeTableList(prev[item.id] || item.assignedTables || []),
                                      tableNumber
                                    ),
                                  }))
                                }
                              />
                              T-{tableNumber}
                            </label>
                          );
                        })}
                        {availableTables.length === 0 ? (
                          <span className="text-xs font-bold text-gray-500">Aucune table disponible.</span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSaveStaff(item)}
                      disabled={updatingStaffId === item.id}
                      className="px-3 py-1 border-2 border-black rounded font-black bg-black text-white disabled:opacity-60"
                    >
                      {updatingStaffId === item.id ? "Enregistrement..." : "Enregistrer modifications"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteStaff(item)}
                      disabled={deletingStaffId === item.id}
                      className="inline-flex items-center gap-1 px-3 py-1 border-2 border-red-700 rounded font-black bg-red-600 text-white disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingStaffId === item.id ? "Suppression..." : "Supprimer"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

