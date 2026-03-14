import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, readAccessContextForUser, readUserFromAccessToken } from "@/lib/server/access-context";
import {
  generateOtpCode,
  hashOtpCode,
  normalizeOtpScope,
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
  const body = (await request.json().catch(() => ({}))) as { scope?: string };
  const scope = normalizeOtpScope(body.scope);
  if (!scope) {
    return NextResponse.json({ error: "Scope OTP invalide." }, { status: 400 });
  }

  const canAccessScope =
    scope === "super_admin"
      ? context.isSuperAdmin
      : context.isSuperAdmin || context.restaurants.some((entry) => entry.roles.includes("manager"));
  if (!canAccessScope) {
    return NextResponse.json({ error: "Accès OTP refusé." }, { status: 403 });
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
    return NextResponse.json({ error: cleanup.error.message || "Impossible de préparer le code OTP." }, { status: 500 });
  }

  const insertResult = await supabase.from("auth_login_otps").insert([
    {
      user_id: user.id,
      email: String(user.email || "").trim().toLowerCase(),
      scope,
      session_id: sessionId,
      code_hash: codeHash,
      expires_at: expiresAt,
    } as never,
  ]);

  if (insertResult.error) {
    const schemaHint =
      String((insertResult.error as { code?: string } | null)?.code || "") === "42P01"
        ? " Exécutez la migration create_auth_login_otps.sql."
        : "";
    return NextResponse.json(
      { error: `${insertResult.error.message || "Impossible d'enregistrer le code OTP."}${schemaHint}` },
      { status: 500 }
    );
  }

  try {
    await sendDashboardOtpEmail({
      to: String(user.email || "").trim().toLowerCase(),
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
