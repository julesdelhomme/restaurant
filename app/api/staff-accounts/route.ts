import { NextRequest, NextResponse } from "next/server";
import { type ProRole } from "@/lib/auth/types";
import {
  getBearerToken,
  readAccessContextForUser,
  readUserFromAccessToken,
  userCanAccessRole,
} from "@/lib/server/access-context";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

type StaffAccountRow = {
  id: string;
  auth_user_id: string;
  restaurant_id: string;
  identifier: string;
  normalized_identifier: string;
  role: string;
  is_active: boolean;
  plain_password: string | null;
  assigned_tables?: unknown;
  created_at: string;
};

type CreateStaffBody = {
  restaurantId?: string;
  identifier?: string;
  password?: string;
  role?: string;
  assignedTables?: unknown;
};

type UpdateStaffBody = {
  staffAccountId?: string;
  identifier?: string;
  password?: string;
  role?: string;
  isActive?: boolean;
  assignedTables?: unknown;
};

type DeleteStaffBody = {
  staffAccountId?: string;
};

function normalizeIdentifier(raw: unknown) {
  return String(raw || "").trim().replace(/\s+/g, " ");
}

function toSlug(raw: string) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildStaffEmail(restaurantId: string, identifier: string) {
  const base = toSlug(identifier) || "staff";
  const random = Math.random().toString(36).slice(2, 8);
  const timestamp = Date.now().toString(36);
  const rid = String(restaurantId || "").slice(0, 8);
  return `${base}.${rid}.${timestamp}.${random}@staff.menuqr.local`;
}

function readAllowedStaffRole(rawRole: unknown): ProRole | null {
  const role = String(rawRole || "").trim().toLowerCase();
  if (role === "server" || role === "cuisine" || role === "bar_caisse") return role;
  return null;
}

function normalizeAssignedTables(value: unknown): number[] {
  const parsed = Array.isArray(value)
    ? value
    : typeof value === "string"
    ? (() => {
        try {
          const json = JSON.parse(value);
          return Array.isArray(json) ? json : [];
        } catch {
          return [];
        }
      })()
    : [];
  const normalized = parsed
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry))
    .map((entry) => Math.max(1, Math.trunc(entry)));
  return Array.from(new Set(normalized)).sort((a, b) => a - b);
}

function isMissingAssignedTablesColumn(error: unknown) {
  const code = String((error as { code?: string } | null)?.code || "");
  const message = String((error as { message?: string } | null)?.message || "").toLowerCase();
  return code === "42703" && message.includes("assigned_tables");
}

async function resolveContext(request: NextRequest) {
  const accessToken = getBearerToken(request.headers.get("authorization"));
  if (!accessToken) return null;
  const user = await readUserFromAccessToken(accessToken);
  if (!user) return null;
  const context = await readAccessContextForUser(user);
  return { context, user };
}

function canManageRestaurant(context: Awaited<ReturnType<typeof readAccessContextForUser>>, restaurantId: string) {
  return context.isSuperAdmin || userCanAccessRole(context, restaurantId, "manager", false);
}

async function selectStaffRows(supabase: ReturnType<typeof createSupabaseAdminClient>, restaurantId: string) {
  let assignedTablesColumnMissing = false;
  let result: any = await supabase
    .from("staff_accounts")
    .select("id,auth_user_id,restaurant_id,identifier,normalized_identifier,role,is_active,plain_password,assigned_tables,created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true });
  if (result.error && isMissingAssignedTablesColumn(result.error)) {
    assignedTablesColumnMissing = true;
    result = await supabase
      .from("staff_accounts")
      .select("id,auth_user_id,restaurant_id,identifier,normalized_identifier,role,is_active,plain_password,created_at")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: true });
  }
  return { result, assignedTablesColumnMissing };
}

export async function GET(request: NextRequest) {
  const auth = await resolveContext(request);
  if (!auth) return NextResponse.json({ error: "Session invalide." }, { status: 401 });

  const restaurantId = String(request.nextUrl.searchParams.get("restaurant_id") || "").trim();
  if (!restaurantId) return NextResponse.json({ error: "restaurant_id manquant." }, { status: 400 });
  if (!canManageRestaurant(auth.context, restaurantId)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  const { result: rowsResult, assignedTablesColumnMissing } = await selectStaffRows(supabase, restaurantId);
  if (rowsResult.error) {
    const missingColumn = String((rowsResult.error as { code?: string } | null)?.code || "") === "42703";
    const missingTable = String((rowsResult.error as { code?: string } | null)?.code || "") === "42P01";
    const message = missingTable
      ? "La table staff_accounts est absente. Exécutez le script SQL de sécurisation."
      : missingColumn
      ? "La colonne plain_password est absente. Exécutez le script SQL staff_accounts."
      : "Impossible de lire les comptes staff.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const rows = (rowsResult.data || []) as StaffAccountRow[];
  const withEmails = await Promise.all(
    rows.map(async (row) => {
      const authUser = await supabase.auth.admin.getUserById(row.auth_user_id);
      return {
        id: row.id,
        restaurantId: row.restaurant_id,
        identifier: row.identifier,
        normalizedIdentifier: row.normalized_identifier,
        role: row.role,
        isActive: row.is_active,
        plainPassword: String(row.plain_password || ""),
        assignedTables: assignedTablesColumnMissing ? [] : normalizeAssignedTables(row.assigned_tables),
        createdAt: row.created_at,
        authUserId: row.auth_user_id,
        email: String(authUser.data.user?.email || "").trim().toLowerCase(),
      };
    })
  );

  return NextResponse.json({ items: withEmails }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const auth = await resolveContext(request);
  if (!auth) return NextResponse.json({ error: "Session invalide." }, { status: 401 });

  let body: CreateStaffBody;
  try {
    body = (await request.json()) as CreateStaffBody;
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const restaurantId = String(body.restaurantId || "").trim();
  const identifier = normalizeIdentifier(body.identifier);
  const password = String(body.password || "");
  const role = readAllowedStaffRole(body.role);
  const assignedTables = normalizeAssignedTables(body.assignedTables);

  if (!restaurantId) return NextResponse.json({ error: "restaurantId manquant." }, { status: 400 });
  if (!identifier) return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "Mot de passe trop court (6 caractères min)." }, { status: 400 });
  if (!role) return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
  if (!canManageRestaurant(auth.context, restaurantId)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  const normalizedIdentifier = identifier.toLowerCase();
  const existingIdentifier = await supabase
    .from("staff_accounts")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("normalized_identifier", normalizedIdentifier)
    .maybeSingle();
  if (existingIdentifier.error) {
    return NextResponse.json(
      { error: existingIdentifier.error.message || "Vérification identifiant impossible." },
      { status: 400 }
    );
  }
  if (existingIdentifier.data?.id) {
    return NextResponse.json({ error: "Cet identifiant est déjà utilisé." }, { status: 400 });
  }

  let createdUserId = "";
  let createdEmail = "";
  let createUserError = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const email = buildStaffEmail(restaurantId, identifier);
    const created = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: identifier,
        staff_identifier: identifier,
        restaurant_id: restaurantId,
        role,
      },
    });
    if (!created.error && created.data.user?.id) {
      createdUserId = String(created.data.user.id);
      createdEmail = email;
      break;
    }
    createUserError = String(created.error?.message || "Création utilisateur impossible.");
  }
  if (!createdUserId) {
    return NextResponse.json({ error: createUserError || "Création utilisateur impossible." }, { status: 400 });
  }

  let insertResult = await supabase
    .from("staff_accounts")
    .insert({
      auth_user_id: createdUserId,
      restaurant_id: restaurantId,
      identifier,
      normalized_identifier: normalizedIdentifier,
      role,
      is_active: true,
      plain_password: password,
      assigned_tables: assignedTables,
    })
    .select("id,auth_user_id,restaurant_id,identifier,normalized_identifier,role,is_active,plain_password,assigned_tables,created_at")
    .maybeSingle();
  let assignedTablesColumnMissing = false;
  if (insertResult.error && isMissingAssignedTablesColumn(insertResult.error)) {
    assignedTablesColumnMissing = true;
    insertResult = await supabase
      .from("staff_accounts")
      .insert({
        auth_user_id: createdUserId,
        restaurant_id: restaurantId,
        identifier,
        normalized_identifier: normalizedIdentifier,
        role,
        is_active: true,
        plain_password: password,
      })
      .select("id,auth_user_id,restaurant_id,identifier,normalized_identifier,role,is_active,plain_password,created_at")
      .maybeSingle();
  }

  if (insertResult.error || !insertResult.data) {
    await supabase.auth.admin.deleteUser(createdUserId);
    const missingColumn = String((insertResult.error as { code?: string } | null)?.code || "") === "42703";
    const duplicateIdentifier = String((insertResult.error as { code?: string } | null)?.code || "") === "23505";
    const errorMessage = missingColumn
      ? "La colonne plain_password est absente. Exécutez le script SQL staff_accounts."
      : duplicateIdentifier
      ? "Cet identifiant est déjà utilisé."
      : insertResult.error?.message || "Création staff impossible.";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  return NextResponse.json(
    {
      item: {
        id: insertResult.data.id,
        restaurantId: insertResult.data.restaurant_id,
        identifier: insertResult.data.identifier,
        normalizedIdentifier: insertResult.data.normalized_identifier,
        role: insertResult.data.role,
        isActive: insertResult.data.is_active,
        plainPassword: String(insertResult.data.plain_password || ""),
        assignedTables: assignedTablesColumnMissing
          ? []
          : normalizeAssignedTables((insertResult.data as StaffAccountRow).assigned_tables),
        createdAt: insertResult.data.created_at,
        authUserId: insertResult.data.auth_user_id,
        email: createdEmail,
      },
    },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const auth = await resolveContext(request);
  if (!auth) return NextResponse.json({ error: "Session invalide." }, { status: 401 });

  let body: UpdateStaffBody;
  try {
    body = (await request.json()) as UpdateStaffBody;
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const staffAccountId = String(body.staffAccountId || "").trim();
  if (!staffAccountId) return NextResponse.json({ error: "staffAccountId manquant." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const existingResult = await supabase
    .from("staff_accounts")
    .select("id,auth_user_id,restaurant_id,identifier,normalized_identifier,role,is_active,plain_password,assigned_tables,created_at")
    .eq("id", staffAccountId)
    .maybeSingle();
  if (existingResult.error || !existingResult.data) {
    return NextResponse.json({ error: "Compte staff introuvable." }, { status: 404 });
  }

  const existing = existingResult.data as StaffAccountRow;
  if (!canManageRestaurant(auth.context, String(existing.restaurant_id || "").trim())) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const nextIdentifier = body.identifier != null ? normalizeIdentifier(body.identifier) : null;
  const nextRole = body.role != null ? readAllowedStaffRole(body.role) : null;
  const nextPassword = body.password != null ? String(body.password || "") : null;
  const nextIsActive = body.isActive;
  const nextAssignedTables = body.assignedTables != null ? normalizeAssignedTables(body.assignedTables) : null;

  if (nextIdentifier != null && !nextIdentifier) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }
  if (nextRole === null && body.role != null) {
    return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
  }
  if (nextPassword != null && nextPassword.length < 6) {
    return NextResponse.json({ error: "Mot de passe trop court (6 caractères min)." }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {};
  if (nextIdentifier != null) {
    const normalizedIdentifier = nextIdentifier.toLowerCase();
    const existingIdentifier = await supabase
      .from("staff_accounts")
      .select("id")
      .eq("restaurant_id", String(existing.restaurant_id || "").trim())
      .eq("normalized_identifier", normalizedIdentifier)
      .neq("id", staffAccountId)
      .maybeSingle();
    if (existingIdentifier.error) {
      return NextResponse.json(
        { error: existingIdentifier.error.message || "Vérification identifiant impossible." },
        { status: 400 }
      );
    }
    if (existingIdentifier.data?.id) {
      return NextResponse.json({ error: "Cet identifiant est déjà utilisé." }, { status: 400 });
    }
    updatePayload.identifier = nextIdentifier;
    updatePayload.normalized_identifier = normalizedIdentifier;
  }
  if (nextRole != null) updatePayload.role = nextRole;
  if (typeof nextIsActive === "boolean") updatePayload.is_active = nextIsActive;
  if (nextAssignedTables != null) updatePayload.assigned_tables = nextAssignedTables;

  const authUpdatePayload: { password?: string; user_metadata?: Record<string, unknown> } = {};
  if (nextPassword != null) authUpdatePayload.password = nextPassword;
  if (nextIdentifier != null || nextRole != null) {
    authUpdatePayload.user_metadata = {
      display_name: nextIdentifier ?? existing.identifier,
      staff_identifier: nextIdentifier ?? existing.identifier,
      restaurant_id: existing.restaurant_id,
      role: nextRole ?? existing.role,
    };
  }
  if (Object.keys(authUpdatePayload).length > 0) {
    const authUpdate = await supabase.auth.admin.updateUserById(existing.auth_user_id, authUpdatePayload);
    if (authUpdate.error) {
      return NextResponse.json({ error: authUpdate.error.message || "Mise à jour du mot de passe impossible." }, { status: 400 });
    }
  }
  if (nextPassword != null) updatePayload.plain_password = nextPassword;

  if (Object.keys(updatePayload).length > 0) {
    let updatedRow = await supabase.from("staff_accounts").update(updatePayload).eq("id", staffAccountId);
    if (updatedRow.error && nextAssignedTables != null && isMissingAssignedTablesColumn(updatedRow.error)) {
      delete updatePayload.assigned_tables;
      updatedRow = await supabase.from("staff_accounts").update(updatePayload).eq("id", staffAccountId);
    }
    if (updatedRow.error) {
      const missingColumn = String((updatedRow.error as { code?: string } | null)?.code || "") === "42703";
      const duplicateIdentifier = String((updatedRow.error as { code?: string } | null)?.code || "") === "23505";
      const errorMessage = missingColumn
        ? "La colonne plain_password est absente. Exécutez le script SQL staff_accounts."
        : duplicateIdentifier
        ? "Cet identifiant est déjà utilisé."
        : updatedRow.error.message || "Mise à jour du staff impossible.";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
  }

  let assignedTablesColumnMissing = false;
  let finalResult = await supabase
    .from("staff_accounts")
    .select("id,auth_user_id,restaurant_id,identifier,normalized_identifier,role,is_active,plain_password,assigned_tables,created_at")
    .eq("id", staffAccountId)
    .maybeSingle();
  if (finalResult.error && isMissingAssignedTablesColumn(finalResult.error)) {
    assignedTablesColumnMissing = true;
    finalResult = await supabase
      .from("staff_accounts")
      .select("id,auth_user_id,restaurant_id,identifier,normalized_identifier,role,is_active,plain_password,created_at")
      .eq("id", staffAccountId)
      .maybeSingle();
  }
  if (finalResult.error || !finalResult.data) {
    return NextResponse.json({ error: "Compte staff mis à jour mais relecture impossible." }, { status: 200 });
  }

  const authUser = await supabase.auth.admin.getUserById(finalResult.data.auth_user_id);
  return NextResponse.json(
    {
      item: {
        id: finalResult.data.id,
        restaurantId: finalResult.data.restaurant_id,
        identifier: finalResult.data.identifier,
        normalizedIdentifier: finalResult.data.normalized_identifier,
        role: finalResult.data.role,
        isActive: finalResult.data.is_active,
        plainPassword: String(finalResult.data.plain_password || ""),
        assignedTables: assignedTablesColumnMissing
          ? []
          : normalizeAssignedTables((finalResult.data as StaffAccountRow).assigned_tables),
        createdAt: finalResult.data.created_at,
        authUserId: finalResult.data.auth_user_id,
        email: String(authUser.data.user?.email || "").trim().toLowerCase(),
      },
    },
    { status: 200 }
  );
}

export async function DELETE(request: NextRequest) {
  const auth = await resolveContext(request);
  if (!auth) return NextResponse.json({ error: "Session invalide." }, { status: 401 });

  let body: DeleteStaffBody;
  try {
    body = (await request.json()) as DeleteStaffBody;
  } catch {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const staffAccountId = String(body.staffAccountId || "").trim();
  if (!staffAccountId) return NextResponse.json({ error: "staffAccountId manquant." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const existingResult = await supabase
    .from("staff_accounts")
    .select("id,restaurant_id")
    .eq("id", staffAccountId)
    .maybeSingle();
  if (existingResult.error || !existingResult.data) {
    return NextResponse.json({ error: "Compte staff introuvable." }, { status: 404 });
  }

  const restaurantId = String(existingResult.data.restaurant_id || "").trim();
  if (!canManageRestaurant(auth.context, restaurantId)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const deleteResult = await supabase.from("staff_accounts").delete().eq("id", staffAccountId);
  if (deleteResult.error) {
    return NextResponse.json({ error: deleteResult.error.message || "Suppression impossible." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, staffAccountId }, { status: 200 });
}
