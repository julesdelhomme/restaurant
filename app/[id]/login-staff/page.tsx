"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import RestaurantOffline from "../../components/RestaurantOffline";
import {
  PRO_ROLE_PRIORITY,
  extractRestaurantIdFromPath,
  getRoleRoute,
  inferRequiredRoleFromPath,
  normalizeProRole,
  type AccessContext,
  type ProRole,
} from "@/lib/auth/types";

type ResolveIdentifierPayload = {
  email?: string;
  restaurantId?: string;
  role?: string;
  error?: string;
};

function isProtectedForRestaurant(pathname: string, restaurantId: string) {
  const requiredRole = inferRequiredRoleFromPath(pathname);
  if (!requiredRole || requiredRole === "super_admin") return false;
  return extractRestaurantIdFromPath(pathname) === restaurantId;
}

function hasRoleInRestaurant(context: AccessContext, restaurantId: string, role: ProRole) {
  return context.restaurants.some((entry) => entry.restaurantId === restaurantId && entry.roles.includes(role));
}

function canAccessTargetPath(context: AccessContext, pathname: string) {
  const requiredRole = inferRequiredRoleFromPath(pathname);
  if (!requiredRole || requiredRole === "super_admin") return false;
  const restaurantId = extractRestaurantIdFromPath(pathname);
  if (!restaurantId) return false;
  if (context.isSuperAdmin) return true;
  return hasRoleInRestaurant(context, restaurantId, requiredRole);
}

function pickDefaultRouteForRestaurant(context: AccessContext, restaurantId: string) {
  for (const role of PRO_ROLE_PRIORITY) {
    if (hasRoleInRestaurant(context, restaurantId, role)) {
      return getRoleRoute(restaurantId, role);
    }
  }
  return "";
}

export default function LoginStaffPage() {
  const router = useRouter();
  const params = useParams<{ id?: string; restaurant_id?: string }>();
  const searchParams = useSearchParams();

  const restaurantId = String(params?.id || params?.restaurant_id || "").trim();
  const nextPathCandidate = String(searchParams.get("next") || searchParams.get("redirect") || "").trim();
  const requestedPath = useMemo(() => {
    if (!nextPathCandidate) return "";
    try {
      const decoded = decodeURIComponent(nextPathCandidate).trim();
      return isProtectedForRestaurant(decoded, restaurantId) ? decoded : "";
    } catch {
      return "";
    }
  }, [nextPathCandidate, restaurantId]);

  const requiredRole = useMemo(() => {
    const role = inferRequiredRoleFromPath(requestedPath);
    return role && role !== "super_admin" ? role : null;
  }, [requestedPath]);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingRestaurantStatus, setCheckingRestaurantStatus] = useState(true);
  const [isRestaurantOffline, setIsRestaurantOffline] = useState(false);
  const [offlineRestaurantName, setOfflineRestaurantName] = useState("");

  useEffect(() => {
    void (async () => {
      if (!restaurantId) {
        setCheckingRestaurantStatus(false);
        setIsRestaurantOffline(false);
        setOfflineRestaurantName("");
        return;
      }
      setCheckingRestaurantStatus(true);
      const response = await fetch(`/api/public/restaurant-config?restaurant_id=${encodeURIComponent(restaurantId)}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        restaurant?: { is_active?: boolean | null; name?: string | null };
      };
      const row = payload.restaurant;
      const isOffline = Boolean(row && typeof row.is_active === "boolean" && !row.is_active);
      setIsRestaurantOffline(isOffline);
      setOfflineRestaurantName(String(row?.name || "").trim());
      setCheckingRestaurantStatus(false);
    })();
  }, [restaurantId]);

  const readAccessContext = async (accessToken: string) => {
    const response = await fetch("/api/auth/access-context", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) return null;
    const context = (await response.json()) as AccessContext;
    return context;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    if (!restaurantId) {
      setLoading(false);
      setError("Restaurant introuvable dans l'URL.");
      return;
    }

    const resolveResponse = await fetch("/api/auth/resolve-identifier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: String(identifier || "").trim(),
        restaurantId,
      }),
    });
    const resolved = (await resolveResponse.json().catch(() => ({}))) as ResolveIdentifierPayload;
    if (!resolveResponse.ok || !resolved.email) {
      setLoading(false);
      setError(resolved.error || "Identifiant introuvable pour ce restaurant.");
      return;
    }

    const resolvedRestaurantId = String(resolved.restaurantId || "").trim();
    const resolvedRole = normalizeProRole(resolved.role);
    if (!resolvedRestaurantId || resolvedRestaurantId !== restaurantId) {
      setLoading(false);
      setError("Identifiant invalide pour ce restaurant.");
      return;
    }
    if (requiredRole && resolvedRole !== requiredRole) {
      setLoading(false);
      setError("Ce compte n'est pas autorisé pour cette interface.");
      return;
    }

    const signIn = await supabase.auth.signInWithPassword({
      email: String(resolved.email || "").trim().toLowerCase(),
      password: String(password || ""),
    });
    if (signIn.error) {
      setLoading(false);
      setError(signIn.error.message || "Connexion impossible.");
      return;
    }

    const accessToken = String(signIn.data.session?.access_token || "").trim();
    if (!accessToken) {
      setLoading(false);
      setError("Session invalide.");
      return;
    }

    const context = await readAccessContext(accessToken);
    if (!context) {
      setLoading(false);
      setError("Impossible de charger vos droits.");
      return;
    }

    if (requestedPath && canAccessTargetPath(context, requestedPath)) {
      router.replace(requestedPath);
      return;
    }

    const roleRoute = resolvedRole ? getRoleRoute(restaurantId, resolvedRole) : "";
    if (roleRoute && canAccessTargetPath(context, roleRoute)) {
      router.replace(roleRoute);
      return;
    }

    const fallbackRoute = pickDefaultRouteForRestaurant(context, restaurantId);
    if (fallbackRoute) {
      router.replace(fallbackRoute);
      return;
    }

    await supabase.auth.signOut();
    setLoading(false);
    setError("Aucun accès autorisé pour ce restaurant.");
  };

  if (checkingRestaurantStatus) {
    return (
      <div className="min-h-screen bg-gray-100 text-black flex items-center justify-center p-4">
        <p className="font-black">Chargement...</p>
      </div>
    );
  }

  if (isRestaurantOffline) {
    return <RestaurantOffline restaurantName={offlineRestaurantName} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 text-black flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border-2 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
      >
        <h1 className="text-2xl font-black">Connexion Staff</h1>
        <p className="mt-1 text-sm text-gray-600">Restaurant: {restaurantId || "inconnu"}</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block mb-1 font-bold">Identifiant</label>
            <input
              type="text"
              required
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
              placeholder="Ex: Cuisine 1"
            />
          </div>
          <div>
            <label className="block mb-1 font-bold">Code PIN / Mot de passe</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
            />
          </div>
        </div>

        {error ? <p className="mt-3 text-sm font-bold text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded border-2 border-black bg-black px-4 py-2 font-black text-white disabled:opacity-60"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
