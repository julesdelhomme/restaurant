import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, readAccessContextForUser, readUserFromAccessToken } from "@/lib/server/access-context";
import { normalizeOtpScope } from "@/lib/server/login-otp";

const OTP_DISABLED_FOR_TESTING = true;

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
    return NextResponse.json({ error: "Acces OTP refuse." }, { status: 403 });
  }

  if (OTP_DISABLED_FOR_TESTING) {
    return NextResponse.json({ success: true, bypassed: true, disabled: true }, { status: 200 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
