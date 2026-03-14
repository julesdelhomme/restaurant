import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, readAccessContextForUser, readUserFromAccessToken } from "@/lib/server/access-context";
import { hashOtpCode, isOtpBypassEnabled, normalizeOtpScope, resolveOtpSessionId } from "@/lib/server/login-otp";
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
  const body = (await request.json().catch(() => ({}))) as { scope?: string; code?: string };
  const scope = normalizeOtpScope(body.scope);
  const code = String(body.code || "").trim();
  if (!scope || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Code OTP invalide." }, { status: 400 });
  }

  const canAccessScope =
    scope === "super_admin"
      ? context.isSuperAdmin
      : context.isSuperAdmin || context.restaurants.some((entry) => entry.roles.includes("manager"));
  if (!canAccessScope) {
    return NextResponse.json({ error: "Acces OTP refuse." }, { status: 403 });
  }

  const userEmail = String(user.email || "").trim().toLowerCase();
  if (isOtpBypassEnabled(userEmail, scope) && code === "123456") {
    return NextResponse.json({ success: true, bypassed: true }, { status: 200 });
  }

  const supabase = createSupabaseAdminClient();
  const sessionId = resolveOtpSessionId(accessToken, user.id);
  const codeHash = hashOtpCode(code);
  const nowIso = new Date().toISOString();

  const result = await supabase
    .from("auth_login_otps")
    .select("id")
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .eq("scope", scope)
    .eq("code_hash", codeHash)
    .is("consumed_at", null)
    .gte("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    const schemaHint =
      String((result.error as { code?: string } | null)?.code || "") === "42P01"
        ? " Executez la migration create_auth_login_otps.sql."
        : "";
    return NextResponse.json(
      { error: `${result.error.message || "Impossible de verifier le code OTP."}${schemaHint}` },
      { status: 500 }
    );
  }

  if (!result.data?.id) {
    return NextResponse.json({ error: "Code invalide ou expire." }, { status: 400 });
  }

  const updateResult = await supabase
    .from("auth_login_otps")
    .update({ consumed_at: nowIso } as never)
    .eq("id", result.data.id);

  if (updateResult.error) {
    return NextResponse.json({ error: updateResult.error.message || "Impossible de valider le code OTP." }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
