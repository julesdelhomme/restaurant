"use client";

import { ReactNode, Suspense, useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";
import { type AccessContext, type RequiredRole } from "@/lib/auth/types";
import RestaurantOffline from "./RestaurantOffline";

type ProAccessGuardProps = {
  children: ReactNode;
  requiredRole: RequiredRole;
  allowSuperAdmin?: boolean;
};

type GuardState = "checking" | "allowed" | "denied" | "offline";

function extractRestaurantId(pathname: string, paramsId: unknown) {
  const fromParams = String(paramsId || "").trim();
  if (fromParams) return fromParams;
  const match = String(pathname || "").trim().match(/^\/([0-9a-fA-F-]{36})(?:\/|$)/);
  return String(match?.[1] || "").trim();
}

function buildCurrentTarget(pathname: string, search: URLSearchParams) {
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function buildLoginUrl(requiredRole: RequiredRole, restaurantId: string, currentTarget: string) {
  const next = encodeURIComponent(currentTarget);
  if (requiredRole === "manager") {
    return `/login?next=${next}`;
  }
  if (requiredRole !== "super_admin" && restaurantId) {
    return `/${restaurantId}/login-staff?next=${next}`;
  }
  return `/login?next=${next}`;
}

function ProAccessGuardContent({ children, requiredRole, allowSuperAdmin = true }: ProAccessGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ id?: string; restaurant_id?: string }>();
  const [guardState, setGuardState] = useState<GuardState>("checking");
  const [errorMessage, setErrorMessage] = useState("");

  const targetRestaurantId = useMemo(
    () => extractRestaurantId(String(pathname || ""), params?.id || params?.restaurant_id),
    [pathname, params]
  );
  const currentTarget = useMemo(() => buildCurrentTarget(String(pathname || "/"), searchParams), [pathname, searchParams]);

  useEffect(() => {
    let mounted = true;

    const runGuard = async () => {
      if (requiredRole !== "super_admin" && targetRestaurantId) {
        const statusResponse = await fetch(
          `/api/public/restaurant-config?restaurant_id=${encodeURIComponent(targetRestaurantId)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );
        if (!mounted) return;
        if (statusResponse.ok) {
          const payload = (await statusResponse.json().catch(() => ({}))) as {
            restaurant?: { is_active?: boolean | null; name?: string | null };
          };
          const restaurant = payload.restaurant;
          if (restaurant && typeof restaurant.is_active === "boolean" && !restaurant.is_active) {
            setErrorMessage(String(restaurant.name || "").trim());
            setGuardState("offline");
            return;
          }
        }
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session?.access_token) {
        router.replace(buildLoginUrl(requiredRole, targetRestaurantId, currentTarget));
        return;
      }

      const contextResponse = await fetch("/api/auth/access-context", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!mounted) return;
      if (!contextResponse.ok) {
        await supabase.auth.signOut();
        router.replace(buildLoginUrl(requiredRole, targetRestaurantId, currentTarget));
        return;
      }

      const context = (await contextResponse.json()) as AccessContext;
      const isSuperAdminAllowed = allowSuperAdmin && context.isSuperAdmin;
      if (requiredRole === "super_admin") {
        if (context.isSuperAdmin) {
          setGuardState("allowed");
          setErrorMessage("");
        } else {
          await supabase.auth.signOut();
          router.replace(buildLoginUrl(requiredRole, targetRestaurantId, currentTarget));
        }
        return;
      }

      if (!targetRestaurantId) {
        setGuardState("denied");
        setErrorMessage("Accès refusé : identifiant restaurant absent dans l'URL.");
        return;
      }

      const restaurantScope = context.restaurants.find((entry) => entry.restaurantId === targetRestaurantId);
      const hasRole = Boolean(restaurantScope?.roles.includes(requiredRole));
      if (hasRole || isSuperAdminAllowed) {
        setGuardState("allowed");
        setErrorMessage("");
      } else {
        await supabase.auth.signOut();
        router.replace(buildLoginUrl(requiredRole, targetRestaurantId, currentTarget));
        return;
      }
    };

    void runGuard();

    return () => {
      mounted = false;
    };
  }, [allowSuperAdmin, currentTarget, requiredRole, router, targetRestaurantId]);

  if (guardState === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-black">
        Vérification des accès...
      </div>
    );
  }

  if (guardState === "denied") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-black p-4">
        <div className="max-w-lg w-full rounded-xl border-2 border-red-700 bg-red-50 p-4 text-red-800 font-bold">
          {errorMessage || "Accès refusé."}
        </div>
      </div>
    );
  }

  if (guardState === "offline") {
    return <RestaurantOffline restaurantName={errorMessage} />;
  }

  return <>{children}</>;
}

export default function ProAccessGuard(props: ProAccessGuardProps) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100 text-black">Chargement...</div>}>
      <ProAccessGuardContent {...props} />
    </Suspense>
  );
}

