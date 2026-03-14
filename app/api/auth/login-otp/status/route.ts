import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, readAccessContextForUser, readUserFromAccessToken } from "@/lib/server/access-context";
import { isOtpBypassEnabled, normalizeOtpScope, readRestaurantOtpEnabled, resolveOtpSessionId } from "@/lib/server/login-otp";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

export async function GET(request: NextRequest) {
  const accessToken = getBearerToken(request.headers.get("authorization"));
  if (!accessToken) {
    return NextResponse.json({ error: "Session manquante." }, { status: 401 });
  }

  const user = await readUserFromAccessToken(accessToken);
  if (!user) {
    return NextResponse.json({ error: "Session invalide." }, { status: 401 });
  }

  const context = await readAccessContextForUser(user);
  const scope = normalizeOtpScope(request.nextUrl.searchParams.get("scope"));
  const restaurantId = String(request.nextUrl.searchParams.get("restaurantId") || "").trim();
  if (!scope) {
    return NextResponse.json({ error: "Scope OTP invalide." }, { status: 400 });
  }

  const canAccessScope =
    scope === "super_admin"
      ? context.isSuperAdmin
      : context.isSuperAdmin || context.restaurants.some((entry) => entry.roles.includes("manager"));
  if (!canAccessScope) {
    return NextResponse.json({ error: "Acces OTP refuse." }, { status: 403 });
  }

  const userEmail = String(user.email || "").trim().toLowerCase();
  if (scope === "manager") {
    if (context.isSuperAdmin) {
      return NextResponse.json({ verified: true, bypassed: true }, { status: 200 });
    }

    const hasManagerAccess = context.restaurants.some(
      (entry) => entry.restaurantId === restaurantId && entry.roles.includes("manager")
    );
    if (!hasManagerAccess) {
      return NextResponse.json({ error: "Acces manager refuse." }, { status: 403 });
    }

    const otpEnabled = await readRestaurantOtpEnabled(restaurantId);
    if (!otpEnabled) {
      return NextResponse.json({ verified: true, bypassed: true, otpEnabled: false }, { status: 200 });
    }
  }

  if (isOtpBypassEnabled(userEmail, scope)) {
    return NextResponse.json({ verified: true, bypassed: true }, { status: 200 });
  }

  const supabase = createSupabaseAdminClient();
  const sessionId = resolveOtpSessionId(accessToken, user.id);
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

  const result = await supabase
    .from("auth_login_otps")
    .select("id")
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .eq("scope", scope)
    .not("consumed_at", "is", null)
    .gte("created_at", twelveHoursAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    const schemaHint =
      String((result.error as { code?: string } | null)?.code || "") === "42P01"
        ? " Executez la migration create_auth_login_otps.sql."
        : "";
    return NextResponse.json(
      { error: `${result.error.message || "Impossible de verifier le statut OTP."}${schemaHint}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ verified: Boolean(result.data) }, { status: 200 });
}
