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

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return String(data.session?.access_token || "").trim();
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

    const nextItems = Array.isArray(payload.items) ? payload.items : [];
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
    setLoading(false);
  };

  useEffect(() => {
    void fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  useEffect(() => {
    setIdentifier("");
  }, []);

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

