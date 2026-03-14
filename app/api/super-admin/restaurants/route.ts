import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, readAccessContextForUser, readUserFromAccessToken } from "@/lib/server/access-context";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

type CreateRestaurantBody = {
  restaurantName?: string;
  ownerEmail?: string;
  ownerPassword?: string;
};

type UpdateRestaurantBody = {
  restaurantId?: string;
  isActive?: boolean;
  restaurantPayload?: Record<string, unknown>;
};

type RestaurantRow = {
  id: string | number | null;
  name: string | null;
  owner_id: string | null;
  created_at?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  is_active?: boolean | null;
  otp_enabled?: boolean | null;
};

function isMissingColumnError(error: { code?: string } | null | undefined) {
  return String(error?.code || "") === "42703";
}

async function requireSuperAdmin(request: NextRequest) {
  const accessToken = getBearerToken(request.headers.get("authorization"));
  if (!accessToken) return null;
  const user = await readUserFromAccessToken(accessToken);
  if (!user) return null;
  const context = await readAccessContextForUser(user);
  if (!context.isSuperAdmin) return null;
  return { user, context };
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth) return NextResponse.json({ error: "Acces super-admin requis." }, { status: 403 });

  const supabase = createSupabaseAdminClient();
  const rowsWithActiveResult = await supabase
    .from("restaurants")
    .select("id,name,owner_id,created_at,logo_url,primary_color,is_active,otp_enabled")
    .order("name", { ascending: true });

  let rowsError = rowsWithActiveResult.error;
  let rows = (rowsWithActiveResult.data || []) as RestaurantRow[];

  if (isMissingColumnError(rowsError as { code?: string } | null)) {
    const rowsFallbackResult = await supabase
      .from("restaurants")
      .select("id,name,owner_id,created_at,logo_url,primary_color")
      .order("name", { ascending: true });
    rowsError = rowsFallbackResult.error;
    rows = ((rowsFallbackResult.data || []) as Omit<RestaurantRow, "is_active">[]).map((row) => ({
      ...row,
      is_active: null,
      otp_enabled: null,
    }));
  }

  if (rowsError) {
    return NextResponse.json({ error: rowsError.message || "Impossible de lire les restaurants." }, { status: 400 });
  }

  const withOwnerEmails = await Promise.all(
    rows.map(async (row) => {
      const ownerId = String(row.owner_id || "").trim();
      if (!ownerId) {
        return {
          id: String(row.id || ""),
          name: String(row.name || "").trim(),
          ownerId: "",
          ownerEmail: "",
          createdAt: String(row.created_at || ""),
          logoUrl: String(row.logo_url || "").trim(),
          primaryColor: String(row.primary_color || "").trim(),
          isActive: typeof row.is_active === "boolean" ? row.is_active : true,
          otpEnabled: typeof row.otp_enabled === "boolean" ? row.otp_enabled : false,
        };
      }

      const owner = await supabase.auth.admin.getUserById(ownerId);
      return {
        id: String(row.id || ""),
        name: String(row.name || "").trim(),
        ownerId,
        ownerEmail: String(owner.data.user?.email || "").trim().toLowerCase(),
        createdAt: String(row.created_at || ""),
        logoUrl: String(row.logo_url || "").trim(),
        primaryColor: String(row.primary_color || "").trim(),
        isActive: typeof row.is_active === "boolean" ? row.is_active : true,
        otpEnabled: typeof row.otp_enabled === "boolean" ? row.otp_enabled : false,
      };
    })
  );

  return NextResponse.json({ items: withOwnerEmails }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth) return NextResponse.json({ error: "Acces super-admin requis." }, { status: 403 });

  let body: CreateRestaurantBody;
  try {
    body = (await request.json()) as CreateRestaurantBody;
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const restaurantName = String(body.restaurantName || "").trim();
  const ownerEmail = String(body.ownerEmail || "").trim().toLowerCase();
  const ownerPassword = String(body.ownerPassword || "");

  if (!restaurantName) return NextResponse.json({ error: "Nom du restaurant manquant." }, { status: 400 });
  if (!ownerEmail || !ownerEmail.includes("@")) return NextResponse.json({ error: "Email owner invalide." }, { status: 400 });
  if (ownerPassword.length < 6) {
    return NextResponse.json({ error: "Mot de passe owner trop court (6 caracteres min)." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const ownerCreateResult = await supabase.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true,
    user_metadata: {
      role: "manager",
      display_name: restaurantName,
    },
  });

  if (ownerCreateResult.error || !ownerCreateResult.data.user?.id) {
    return NextResponse.json(
      { error: ownerCreateResult.error?.message || "Creation du compte manager impossible." },
      { status: 400 }
    );
  }

  const ownerId = String(ownerCreateResult.data.user.id);
  const insertWithActiveResult = await supabase
    .from("restaurants")
      .insert({
        name: restaurantName,
        owner_id: ownerId,
        is_active: true,
        otp_enabled: false,
      })
      .select("id,name,owner_id,created_at,logo_url,primary_color,is_active,otp_enabled")
      .maybeSingle();

  let insertRestaurantError = insertWithActiveResult.error;
  let insertRestaurantData = insertWithActiveResult.data as RestaurantRow | null;

  if (isMissingColumnError(insertRestaurantError as { code?: string } | null)) {
    const insertFallbackResult = await supabase
      .from("restaurants")
      .insert({
        name: restaurantName,
        owner_id: ownerId,
      })
      .select("id,name,owner_id,created_at,logo_url,primary_color")
      .maybeSingle();
    insertRestaurantError = insertFallbackResult.error;
    insertRestaurantData = insertFallbackResult.data
      ? ({
          ...(insertFallbackResult.data as Omit<RestaurantRow, "is_active">),
          is_active: true,
          otp_enabled: false,
        } as RestaurantRow)
      : null;
  }

  if (insertRestaurantError || !insertRestaurantData) {
    await supabase.auth.admin.deleteUser(ownerId);
    return NextResponse.json(
      { error: insertRestaurantError?.message || "Creation du restaurant impossible." },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      item: {
        id: String(insertRestaurantData.id || ""),
        name: String(insertRestaurantData.name || "").trim(),
        ownerId,
        ownerEmail,
        createdAt: String(insertRestaurantData.created_at || ""),
        logoUrl: String(insertRestaurantData.logo_url || "").trim(),
        primaryColor: String(insertRestaurantData.primary_color || "").trim(),
        isActive: typeof insertRestaurantData.is_active === "boolean" ? Boolean(insertRestaurantData.is_active) : true,
        otpEnabled: typeof insertRestaurantData.otp_enabled === "boolean" ? Boolean(insertRestaurantData.otp_enabled) : false,
      },
    },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth) return NextResponse.json({ error: "Acces super-admin requis." }, { status: 403 });

  let body: UpdateRestaurantBody;
  try {
    body = (await request.json()) as UpdateRestaurantBody;
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const restaurantId = String(body.restaurantId || "").trim();
  if (!restaurantId) return NextResponse.json({ error: "restaurantId manquant." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  if (body.restaurantPayload && typeof body.restaurantPayload === "object") {
    const updateResult = await supabase
      .from("restaurants")
      .update(body.restaurantPayload)
      .eq("id", restaurantId)
      .select("*")
      .maybeSingle();

    if (updateResult.error) {
      if (isMissingColumnError(updateResult.error as { code?: string } | null)) {
        return NextResponse.json(
          { error: updateResult.error.message || "Colonne manquante dans restaurants." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: updateResult.error.message || "Mise a jour impossible." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, restaurantId, restaurant: updateResult.data ?? null }, { status: 200 });
  }

  if (typeof body.isActive !== "boolean") return NextResponse.json({ error: "isActive manquant." }, { status: 400 });
  const updateResult = await supabase.from("restaurants").update({ is_active: body.isActive }).eq("id", restaurantId);

  if (updateResult.error) {
    if (isMissingColumnError(updateResult.error as { code?: string } | null)) {
      return NextResponse.json(
        { error: "La colonne restaurants.is_active est absente. Executez le script SQL demande." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: updateResult.error.message || "Mise a jour impossible." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, restaurantId, isActive: body.isActive }, { status: 200 });
}
