"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import ProAccessGuard from "../components/ProAccessGuard";
import RestaurantQrCard from "../components/RestaurantQrCard";
import { supabase } from "../lib/supabase";

type RestaurantItem = {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  createdAt: string;
  isActive: boolean;
  logoUrl: string;
  primaryColor: string;
};

type StaffItem = {
  id: string;
  identifier: string;
  role: string;
  isActive: boolean;
  email: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function SuperAdminPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<RestaurantItem[]>([]);
  const [updatingRestaurantId, setUpdatingRestaurantId] = useState("");

  const [restaurantName, setRestaurantName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [creatingRestaurant, setCreatingRestaurant] = useState(false);
  const [createMessage, setCreateMessage] = useState("");

  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [staffIdentifier, setStaffIdentifier] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffRole, setStaffRole] = useState<"server" | "cuisine" | "bar_caisse">("server");
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [staffMessage, setStaffMessage] = useState("");
  const [staffItems, setStaffItems] = useState<StaffItem[]>([]);

  const selectedRestaurantLabel = useMemo(() => {
    const match = items.find((entry) => entry.id === selectedRestaurantId);
    return match?.name || "";
  }, [items, selectedRestaurantId]);

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return String(data.session?.access_token || "").trim();
  };

  const fetchRestaurants = async () => {
    setLoading(true);
    setError("");
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setLoading(false);
      setError("Session invalide.");
      return;
    }

    const response = await fetch("/api/super-admin/restaurants", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as { items?: RestaurantItem[]; error?: string };
    if (!response.ok) {
      setLoading(false);
      setError(payload.error || "Impossible de charger les restaurants.");
      return;
    }

    const nextItems = Array.isArray(payload.items) ? payload.items : [];
    setItems(nextItems);
    if (!selectedRestaurantId && nextItems.length > 0) {
      setSelectedRestaurantId(nextItems[0].id);
    }
    setLoading(false);
  };

  const fetchStaffForRestaurant = async (restaurantId: string) => {
    if (!restaurantId) {
      setStaffItems([]);
      return;
    }
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setStaffItems([]);
      return;
    }

    const response = await fetch(`/api/staff-accounts?restaurant_id=${encodeURIComponent(restaurantId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = (await response.json().catch(() => ({}))) as { items?: StaffItem[] };
    if (!response.ok) {
      setStaffItems([]);
      return;
    }
    setStaffItems(Array.isArray(payload.items) ? payload.items : []);
  };

  useEffect(() => {
    void fetchRestaurants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setStaffIdentifier("");
  }, []);

  useEffect(() => {
    void fetchStaffForRestaurant(selectedRestaurantId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRestaurantId]);

  const handleCreateRestaurant = async (event: FormEvent) => {
    event.preventDefault();
    setCreateMessage("");
    setCreatingRestaurant(true);

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setCreatingRestaurant(false);
      setCreateMessage("Session invalide.");
      return;
    }

    const response = await fetch("/api/super-admin/restaurants", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        restaurantName: restaurantName.trim(),
        ownerEmail: ownerEmail.trim(),
        ownerPassword: ownerPassword,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setCreatingRestaurant(false);
    if (!response.ok) {
      setCreateMessage(payload.error || "Création impossible.");
      return;
    }

    setRestaurantName("");
    setOwnerEmail("");
    setOwnerPassword("");
    setCreateMessage("Restaurant et compte manager créés.");
    await fetchRestaurants();
  };

  const handleToggleRestaurant = async (item: RestaurantItem, nextValue: boolean) => {
    setError("");
    setUpdatingRestaurantId(item.id);
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setUpdatingRestaurantId("");
      setError("Session invalide.");
      return;
    }

    const response = await fetch("/api/super-admin/restaurants", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        restaurantId: item.id,
        isActive: nextValue,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setUpdatingRestaurantId("");
    if (!response.ok) {
      setError(payload.error || "Mise à jour impossible.");
      return;
    }

    setItems((prev) =>
      prev.map((entry) => (entry.id === item.id ? { ...entry, isActive: nextValue } : entry))
    );
  };

  const handleCreateStaff = async (event: FormEvent) => {
    event.preventDefault();
    setStaffMessage("");
    setCreatingStaff(true);
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setCreatingStaff(false);
      setStaffMessage("Session invalide.");
      return;
    }
    const response = await fetch("/api/staff-accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        restaurantId: selectedRestaurantId,
        identifier: staffIdentifier.trim(),
        password: staffPassword,
        role: staffRole,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setCreatingStaff(false);
    if (!response.ok) {
      setStaffMessage(payload.error || "Création staff impossible.");
      return;
    }
    setStaffIdentifier("");
    setStaffPassword("");
    setStaffRole("server");
    setStaffMessage("Compte staff créé.");
    await fetchStaffForRestaurant(selectedRestaurantId);
  };

  const handleToggleStaff = async (item: StaffItem) => {
    setStaffMessage("");
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setStaffMessage("Session invalide.");
      return;
    }
    const response = await fetch("/api/staff-accounts", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        staffAccountId: item.id,
        isActive: !item.isActive,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setStaffMessage(payload.error || "Mise à jour staff impossible.");
      return;
    }
    await fetchStaffForRestaurant(selectedRestaurantId);
  };

  return (
    <ProAccessGuard requiredRole="super_admin" allowSuperAdmin>
      <div className="min-h-screen bg-gray-100 text-black p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <header className="flex items-center justify-between">
            <h1 className="text-3xl font-black">Super-Admin</h1>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/login";
              }}
              className="px-4 py-2 border-2 border-black bg-white rounded font-black"
            >
              Se déconnecter
            </button>
          </header>

          <section className="rounded-xl border-2 border-black bg-white p-4">
            <h2 className="text-xl font-black mb-3">Créer un restaurant + compte Manager</h2>
            <form onSubmit={handleCreateRestaurant} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={restaurantName}
                onChange={(event) => setRestaurantName(event.target.value)}
                className="px-3 py-2 border border-gray-300 rounded"
                placeholder="Nom du restaurant"
              />
              <input
                type="email"
                required
                value={ownerEmail}
                onChange={(event) => setOwnerEmail(event.target.value)}
                className="px-3 py-2 border border-gray-300 rounded"
                placeholder="Email manager"
              />
              <input
                type="password"
                required
                minLength={6}
                value={ownerPassword}
                onChange={(event) => setOwnerPassword(event.target.value)}
                className="px-3 py-2 border border-gray-300 rounded"
                placeholder="Mot de passe manager"
              />
              <button
                type="submit"
                disabled={creatingRestaurant}
                className="md:col-span-3 px-4 py-2 rounded border-2 border-black bg-black text-white font-black disabled:opacity-60"
              >
                {creatingRestaurant ? "Création..." : "Créer le restaurant"}
              </button>
            </form>
            {createMessage ? <p className="mt-2 text-sm font-bold text-blue-700">{createMessage}</p> : null}
          </section>

          <section className="rounded-xl border-2 border-black bg-white p-4">
            <h2 className="text-xl font-black mb-3">Restaurants</h2>
            {loading ? <p className="font-bold">Chargement...</p> : null}
            {error ? <p className="font-bold text-red-700">{error}</p> : null}
            {!loading && !error ? (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-gray-300 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-base font-black">{item.name || "-"}</div>
                        <div className="text-xs text-gray-700">{item.id}</div>
                        <div className="text-sm text-gray-700">
                          Manager: {item.ownerEmail || "-"} | Créé le {formatDate(item.createdAt)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center gap-2 text-sm font-bold">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={Boolean(item.isActive)}
                            disabled={updatingRestaurantId === item.id}
                            onClick={() => void handleToggleRestaurant(item, !item.isActive)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full border-2 transition ${
                              item.isActive ? "bg-green-600 border-green-700" : "bg-gray-300 border-gray-400"
                            } ${updatingRestaurantId === item.id ? "opacity-60" : ""}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                item.isActive ? "translate-x-5" : "translate-x-1"
                              }`}
                            />
                          </button>
                          {item.isActive ? "Actif" : "Hors ligne"}
                        </div>
                        <Link
                          href={`/${item.id}/manager?impersonate=1`}
                          className="px-3 py-1 border-2 border-black rounded font-black bg-black text-white"
                        >
                          Gérer ce restaurant
                        </Link>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <RestaurantQrCard
                        restaurantId={item.id}
                        restaurantName={item.name}
                        logoUrl={item.logoUrl}
                        primaryColor={item.primaryColor}
                        compact
                      />
                      <RestaurantQrCard
                        restaurantId={item.id}
                        restaurantName={item.name}
                        logoUrl={item.logoUrl}
                        primaryColor={item.primaryColor}
                        mode="vitrine"
                        compact
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-600">
                      Le QR vitrine pointe vers `/vitrine/{item.id}` pour l&apos;affichage extérieur.
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border-2 border-black bg-white p-4">
            <h2 className="text-xl font-black mb-3">Créer un compte staff</h2>
            <div className="mb-3">
              <label className="block mb-1 font-bold">Restaurant cible</label>
              <select
                value={selectedRestaurantId}
                onChange={(event) => setSelectedRestaurantId(event.target.value)}
                className="w-full md:w-[420px] px-3 py-2 border border-gray-300 rounded"
              >
                <option value="">Sélectionner un restaurant</option>
                {items.map((item) => (
                  <option key={`restaurant-opt-${item.id}`} value={item.id}>
                    {item.name} ({item.id})
                  </option>
                ))}
              </select>
            </div>
            <form onSubmit={handleCreateStaff} autoComplete="off" className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                required
                value={staffIdentifier}
                onChange={(event) => setStaffIdentifier(event.target.value)}
                onFocus={(event) => {
                  const value = String(event.currentTarget.value || "").trim();
                  if (value.includes("@")) setStaffIdentifier("");
                }}
                autoComplete="off"
                name="superadmin_staff_identifier_create"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="px-3 py-2 border border-gray-300 rounded"
                placeholder="Identifiant (ex: Cuisine 1)"
              />
              <select
                value={staffRole}
                onChange={(event) => setStaffRole(event.target.value as "server" | "cuisine" | "bar_caisse")}
                className="px-3 py-2 border border-gray-300 rounded"
              >
                <option value="server">Serveur</option>
                <option value="cuisine">Cuisine</option>
                <option value="bar_caisse">Bar-Caisse</option>
              </select>
              <input
                type="password"
                required
                minLength={6}
                value={staffPassword}
                onChange={(event) => setStaffPassword(event.target.value)}
                className="px-3 py-2 border border-gray-300 rounded"
                placeholder="Mot de passe"
              />
              <button
                type="submit"
                disabled={creatingStaff || !selectedRestaurantId}
                className="px-4 py-2 rounded border-2 border-black bg-black text-white font-black disabled:opacity-60"
              >
                {creatingStaff ? "Création..." : "Créer le staff"}
              </button>
            </form>
            {staffMessage ? <p className="mt-2 text-sm font-bold text-blue-700">{staffMessage}</p> : null}
            {selectedRestaurantId ? (
              <div className="mt-4">
                <h3 className="font-black mb-2">
                  Comptes staff de {selectedRestaurantLabel || selectedRestaurantId}
                </h3>
                {staffItems.length === 0 ? (
                  <p className="text-sm text-gray-600">Aucun compte staff.</p>
                ) : (
                  <div className="space-y-2">
                    {staffItems.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-300 p-2">
                        <div className="text-sm">
                          <div className="font-bold">{item.identifier}</div>
                          <div className="text-gray-700">
                            {item.role} | {item.email} | {item.isActive ? "Actif" : "Inactif"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleToggleStaff(item)}
                          className="px-3 py-1 border-2 border-black rounded font-black bg-white"
                        >
                          {item.isActive ? "Désactiver" : "Activer"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </ProAccessGuard>
  );
}
