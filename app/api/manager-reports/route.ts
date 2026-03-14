import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, readAccessContextForUser, readUserFromAccessToken } from "@/lib/server/access-context";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

const MANAGER_REPORTS_BUCKET = "manager-reports";
const REPORT_FOLDERS = {
  financial: { path: "analyses-financieres", label: "Analyses Financieres" },
  stats: { path: "statistiques", label: "Statistiques" },
  reviews: { path: "avis-clients", label: "Avis Clients" },
} as const;

type FolderKey = keyof typeof REPORT_FOLDERS;

async function ensureBucket() {
  const supabase = createSupabaseAdminClient();
  const result = await supabase.storage.createBucket(MANAGER_REPORTS_BUCKET, {
    public: false,
    allowedMimeTypes: ["application/pdf"],
    fileSizeLimit: 20 * 1024 * 1024,
  });
  const errorMessage = String(result.error?.message || "").toLowerCase();
  if (result.error && !errorMessage.includes("already exists")) {
    throw new Error(result.error.message || "Impossible de preparer le bucket des rapports.");
  }
}

async function requireManagerAccess(request: NextRequest, restaurantId: string) {
  const accessToken = getBearerToken(request.headers.get("authorization"));
  if (!accessToken) return null;
  const user = await readUserFromAccessToken(accessToken);
  if (!user) return null;
  const context = await readAccessContextForUser(user);
  if (context.isSuperAdmin) return { user, context };
  const hasManagerAccess = context.restaurants.some(
    (entry) => entry.restaurantId === restaurantId && entry.roles.includes("manager")
  );
  return hasManagerAccess ? { user, context } : null;
}

export async function GET(request: NextRequest) {
  const restaurantId = String(request.nextUrl.searchParams.get("restaurantId") || "").trim();
  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId manquant." }, { status: 400 });
  }

  const auth = await requireManagerAccess(request, restaurantId);
  if (!auth) {
    return NextResponse.json({ error: "Acces manager requis." }, { status: 403 });
  }

  await ensureBucket();
  const supabase = createSupabaseAdminClient();

  const folders = await Promise.all(
    (Object.entries(REPORT_FOLDERS) as Array<[FolderKey, (typeof REPORT_FOLDERS)[FolderKey]]>).map(async ([key, folder]) => {
      const prefix = `${restaurantId}/${folder.path}`;
      const listResult = await supabase.storage.from(MANAGER_REPORTS_BUCKET).list(prefix, {
        limit: 100,
        sortBy: { column: "name", order: "desc" },
      });
      if (listResult.error) {
        return { key, label: folder.label, items: [] as Array<Record<string, unknown>> };
      }

      const rawItems = (listResult.data || []).filter((item) => String(item.name || "").toLowerCase().endsWith(".pdf"));
      const signed = await Promise.all(
        rawItems.map(async (item) => {
          const path = `${prefix}/${item.name}`;
          const signedResult = await supabase.storage.from(MANAGER_REPORTS_BUCKET).createSignedUrl(path, 60 * 60);
          return {
            name: item.name,
            path,
            updatedAt: item.updated_at || null,
            createdAt: item.created_at || null,
            signedUrl: signedResult.data?.signedUrl || "",
          };
        })
      );

      return { key, label: folder.label, items: signed };
    })
  );

  return NextResponse.json({ bucket: MANAGER_REPORTS_BUCKET, folders }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    restaurantId?: string;
    folderKey?: FolderKey;
    fileName?: string;
    pdfBase64?: string;
  };

  const restaurantId = String(body.restaurantId || "").trim();
  const folderKey = String(body.folderKey || "").trim() as FolderKey;
  const fileName = String(body.fileName || "").trim();
  const pdfBase64 = String(body.pdfBase64 || "").trim();

  if (!restaurantId || !fileName || !pdfBase64 || !REPORT_FOLDERS[folderKey]) {
    return NextResponse.json({ error: "Payload rapport invalide." }, { status: 400 });
  }

  const auth = await requireManagerAccess(request, restaurantId);
  if (!auth) {
    return NextResponse.json({ error: "Acces manager requis." }, { status: 403 });
  }

  await ensureBucket();
  const supabase = createSupabaseAdminClient();
  const folder = REPORT_FOLDERS[folderKey];
  const path = `${restaurantId}/${folder.path}/${fileName}`;
  const buffer = Buffer.from(pdfBase64, "base64");

  const uploadResult = await supabase.storage.from(MANAGER_REPORTS_BUCKET).upload(path, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (uploadResult.error) {
    return NextResponse.json({ error: uploadResult.error.message || "Upload du PDF impossible." }, { status: 500 });
  }

  const signedResult = await supabase.storage.from(MANAGER_REPORTS_BUCKET).createSignedUrl(path, 60 * 60);

  return NextResponse.json(
    {
      ok: true,
      path,
      signedUrl: signedResult.data?.signedUrl || "",
      folder: folder.label,
    },
    { status: 200 }
  );
}
