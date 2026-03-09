"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import { PRO_ROLE_PRIORITY, extractRestaurantIdFromPath, getRoleRoute, inferRequiredRoleFromPath, type AccessContext } from "@/lib/auth/types";

const UUID_REGEX = /^[0-9a-fA-F-]{36}$/i;

function decodeMaybe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizePathCandidate(rawValue: unknown) {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";
  const decoded = decodeMaybe(raw).trim();
  if (!decoded.startsWith("/")) return "";
  return decoded;
}

function isProtectedPath(pathname: string) {
  const requiredRole = inferRequiredRoleFromPath(pathname);
  return Boolean(requiredRole);
}

function extractRestaurantIdFromAny(rawValue: unknown) {
  const asText = String(rawValue || "").trim();
  if (!asText) return "";
  const decoded = decodeMaybe(asText).trim();
  if (UUID_REGEX.test(decoded)) return decoded;
  return extractRestaurantIdFromPath(decoded);
}

function hasRoleInRestaurant(context: AccessContext, restaurantId: string, role: "server" | "cuisine" | "bar_caisse" | "manager") {
  return context.restaurants.some((entry) => entry.restaurantId === restaurantId && entry.roles.includes(role));
}

function canAccessPath(context: AccessContext, pathname: string) {
  const requiredRole = inferRequiredRoleFromPath(pathname);
  if (!requiredRole) return false;
  if (requiredRole === "super_admin") return context.isSuperAdmin;
  const restaurantId = extractRestaurantIdFromPath(pathname);
  if (!restaurantId) return false;
  if (context.isSuperAdmin) return true;
  return hasRoleInRestaurant(context, restaurantId, requiredRole);
}

function pickRedirectForRestaurant(context: AccessContext, restaurantId: string) {
  for (const role of PRO_ROLE_PRIORITY) {
    if (hasRoleInRestaurant(context, restaurantId, role)) {
      return getRoleRoute(restaurantId, role);
    }
  }
  if (context.isSuperAdmin) return "/super-admin";
  return "";
}

function resolveBestRedirect(context: AccessContext, preferredPath: string, preferredRestaurantId: string) {
  if (preferredPath && canAccessPath(context, preferredPath)) return preferredPath;
  if (preferredRestaurantId) {
    const byRestaurant = pickRedirectForRestaurant(context, preferredRestaurantId);
    if (byRestaurant) return byRestaurant;
  }
  return String(context.defaultRedirect || "").trim();
}

export default function LoginPage() {
  const router = useRouter();
  const pathname = usePathname() || "/login";
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestedPath = useMemo(() => {
    const fromNext = normalizePathCandidate(searchParams.get("next"));
    if (fromNext && isProtectedPath(fromNext)) return fromNext;

    const fromRedirect = normalizePathCandidate(searchParams.get("redirect"));
    if (fromRedirect && isProtectedPath(fromRedirect)) return fromRedirect;

    return "";
  }, [searchParams]);

  const requestedRestaurantId = useMemo(() => {
    const fromPath = extractRestaurantIdFromPath(requestedPath);
    if (fromPath) return fromPath;

    const fromIdQuery = extractRestaurantIdFromAny(searchParams.get("id") || searchParams.get("restaurant_id"));
    if (fromIdQuery) return fromIdQuery;

    return extractRestaurantIdFromAny(pathname);
  }, [pathname, requestedPath, searchParams]);

  const readAccessContext = async (accessToken: string) => {
    const contextResponse = await fetch("/api/auth/access-context", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!contextResponse.ok) return null;
    const context = (await contextResponse.json()) as AccessContext;
    return context;
  };

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      const accessToken = String(data.session?.access_token || "").trim();
      if (!mounted || !accessToken) return;

      const context = await readAccessContext(accessToken);
      if (!context) return;
      const redirectTarget = resolveBestRedirect(context, requestedPath, requestedRestaurantId);
      if (redirectTarget) router.replace(redirectTarget);
    };
    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [requestedPath, requestedRestaurantId, router]);

  const resolveLoginEmail = async () => {
    const typedValue = String(identifier || "").trim();
    if (!typedValue) {
      throw new Error("Identifiant manquant.");
    }

    if (typedValue.includes("@")) {
      return typedValue.toLowerCase();
    }

    const response = await fetch("/api/auth/resolve-identifier", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: typedValue,
        restaurantId: requestedRestaurantId || undefined,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { email?: string; error?: string };
    if (!response.ok || !payload.email) {
      throw new Error(payload.error || "Identifiant staff introuvable.");
    }
    return String(payload.email || "").trim().toLowerCase();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const emailToUse = await resolveLoginEmail();
      const signInResult = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: String(password || ""),
      });
      if (signInResult.error) {
        setLoading(false);
        setError(signInResult.error.message || "Connexion impossible.");
        return;
      }

      const accessToken = String(signInResult.data.session?.access_token || "").trim();
      if (!accessToken) {
        setLoading(false);
        setError("Session invalide.");
        return;
      }

      const context = await readAccessContext(accessToken);
      if (!context) {
        setLoading(false);
        setError("Impossible de charger vos droits d'accès.");
        return;
      }

      const redirectTarget = resolveBestRedirect(context, requestedPath, requestedRestaurantId);
      setLoading(false);
      if (!redirectTarget) {
        setError("Aucun accès professionnel n'est associé à ce compte.");
        return;
      }
      router.replace(redirectTarget);
    } catch (caughtError) {
      setLoading(false);
      const message = caughtError instanceof Error ? caughtError.message : "Connexion impossible.";
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-black flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border-2 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
      >
        <h1 className="text-2xl font-black">Connexion</h1>
        <p className="mt-1 text-sm text-gray-600">Accès sécurisé: Serveur, Cuisine, Bar-Caisse, Manager, Super-Admin.</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block mb-1 font-bold">Identifiant ou Email</label>
            <input
              type="text"
              required
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
              placeholder="Ex: Cuisine 1 ou manager@exemple.com"
            />
          </div>
          <div>
            <label className="block mb-1 font-bold">Mot de passe</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
