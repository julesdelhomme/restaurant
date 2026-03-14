import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, readAccessContextForUser, readUserFromAccessToken } from "@/lib/server/access-context";
import {
  generateOtpCode,
  hashOtpCode,
  isOtpBypassEnabled,
  normalizeOtpScope,
  readRestaurantOtpEnabled,
  resolveOtpSessionId,
  sendDashboardOtpEmail,
} from "@/lib/server/login-otp";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

export async function POST(request: NextRequest) {
  const accessToken = getBearerToken(request.headers.get("authorization"));
  if (!accessToken) {
    return NextResponse.json({ error: "Session manquante." }, { status: 401 });
  }

  const user = await readUserFromAccessToken(accessToken);
  if (!user) {
    return NextResponse.json({ error: "Session invalide." }, { status: 401 });
  }

  const context = await readAccessContextForUser(user);
  const body = (await request.json().catch(() => ({}))) as { scope?: string; restaurantId?: string };
  const scope = normalizeOtpScope(body.scope);
  const restaurantId = String(body.restaurantId || "").trim();
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
      return NextResponse.json({ success: true, bypassed: true }, { status: 200 });
    }

    const hasManagerAccess = context.restaurants.some(
      (entry) => entry.restaurantId === restaurantId && entry.roles.includes("manager")
    );
    if (!hasManagerAccess) {
      return NextResponse.json({ error: "Acces manager refuse." }, { status: 403 });
    }

    const otpEnabled = await readRestaurantOtpEnabled(restaurantId);
    if (!otpEnabled) {
      return NextResponse.json({ success: true, bypassed: true, otpEnabled: false }, { status: 200 });
    }
  }

  if (isOtpBypassEnabled(userEmail, scope)) {
    return NextResponse.json({ success: true, bypassed: true }, { status: 200 });
  }

  const supabase = createSupabaseAdminClient();
  const sessionId = resolveOtpSessionId(accessToken, user.id);
  const code = generateOtpCode();
  const codeHash = hashOtpCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const cleanup = await supabase
    .from("auth_login_otps")
    .update({ consumed_at: new Date().toISOString() } as never)
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .eq("scope", scope)
    .is("consumed_at", null);

  const cleanupErrorCode = String((cleanup.error as { code?: string } | null)?.code || "");
  if (cleanup.error && cleanupErrorCode !== "42P01") {
    return NextResponse.json({ error: cleanup.error.message || "Impossible de preparer le code OTP." }, { status: 500 });
  }

  const insertResult = await supabase.from("auth_login_otps").insert([
    {
      user_id: user.id,
      email: userEmail,
      scope,
      session_id: sessionId,
      code_hash: codeHash,
      expires_at: expiresAt,
    } as never,
  ]);

  if (insertResult.error) {
    const schemaHint =
      String((insertResult.error as { code?: string } | null)?.code || "") === "42P01"
        ? " Executez la migration create_auth_login_otps.sql."
        : "";
    return NextResponse.json(
      { error: `${insertResult.error.message || "Impossible d'enregistrer le code OTP."}${schemaHint}` },
      { status: 500 }
    );
  }

  try {
    await sendDashboardOtpEmail({
      to: userEmail,
      code,
      scope,
    });
  } catch (error) {
    return NextResponse.json(
      { error: String((error as Error)?.message || "Impossible d'envoyer le code OTP par email.") },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
