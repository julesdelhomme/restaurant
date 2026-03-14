"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProAccessGuard from "../../../components/ProAccessGuard";
import { supabase } from "../../../lib/supabase";

type ArchiveItem = {
  name: string;
  path: string;
  updatedAt?: string | null;
  createdAt?: string | null;
  signedUrl: string;
};

type ArchiveFolder = {
  key: string;
  label: string;
  items: ArchiveItem[];
};

export default function ManagerArchivesPage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const restaurantId = String(params?.id || "").trim();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [folders, setFolders] = useState<ArchiveFolder[]>([]);
  const [selectedFile, setSelectedFile] = useState<ArchiveItem | null>(null);

  const title = useMemo(() => (selectedFile ? selectedFile.name : "Selectionnez un PDF"), [selectedFile]);

  useEffect(() => {
    let mounted = true;
    const fetchArchives = async () => {
      setLoading(true);
      setError("");

      const { data } = await supabase.auth.getSession();
      const accessToken = String(data.session?.access_token || "").trim();
      if (!accessToken || !restaurantId) {
        if (!mounted) return;
        setLoading(false);
        setError("Session manager invalide.");
        return;
      }

      const response = await fetch(`/api/manager-reports?restaurantId=${encodeURIComponent(restaurantId)}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const payload = (await response.json().catch(() => ({}))) as { folders?: ArchiveFolder[]; error?: string };
      if (!mounted) return;
      if (!response.ok) {
        setLoading(false);
        setError(payload.error || "Impossible de charger les archives.");
        return;
      }

      const nextFolders = Array.isArray(payload.folders) ? payload.folders : [];
      setFolders(nextFolders);
      const firstFile = nextFolders.flatMap((folder) => folder.items || [])[0] || null;
      setSelectedFile(firstFile);
      setLoading(false);
    };

    void fetchArchives();
    return () => {
      mounted = false;
    };
  }, [restaurantId]);

  return (
    <ProAccessGuard requiredRole="manager">
      <div className="min-h-screen bg-gray-50 p-6 text-black">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black">Archives & Rapports</h1>
              <p className="mt-1 text-sm text-gray-600">
                Retrouvez ici les PDF sauvegardes automatiquement depuis le dashboard manager.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/${restaurantId}/manager`)}
              className="rounded-xl border-2 border-black bg-white px-4 py-2 font-black"
            >
              Retour au dashboard
            </button>
          </div>

          {loading ? <div className="rounded-xl border border-gray-300 bg-white p-4 font-bold">Chargement...</div> : null}
          {error ? <div className="rounded-xl border-2 border-red-600 bg-red-50 p-4 font-bold text-red-700">{error}</div> : null}

          {!loading && !error ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div className="space-y-4">
                {folders.map((folder) => (
                  <section key={folder.key} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <h2 className="text-lg font-black">{folder.label}</h2>
                    <div className="mt-3 space-y-2">
                      {folder.items.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
                          Aucun PDF archive pour le moment.
                        </div>
                      ) : (
                        folder.items.map((item) => (
                          <div
                            key={item.path}
                            className={`rounded-xl border p-3 ${
                              selectedFile?.path === item.path ? "border-black bg-black text-white" : "border-gray-200 bg-gray-50"
                            }`}
                          >
                            <button type="button" onClick={() => setSelectedFile(item)} className="w-full text-left">
                              <div className="font-bold break-all">{item.name}</div>
                              <div className={`mt-1 text-xs ${selectedFile?.path === item.path ? "text-gray-200" : "text-gray-500"}`}>
                                {item.updatedAt ? new Date(item.updatedAt).toLocaleString("fr-FR") : "-"}
                              </div>
                            </button>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <a
                                href={item.signedUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={`rounded-lg border px-3 py-1.5 text-sm font-black ${
                                  selectedFile?.path === item.path ? "border-white bg-white text-black" : "border-black bg-white text-black"
                                }`}
                              >
                                Telecharger
                              </a>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                ))}
              </div>

              <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3">
                  <h2 className="text-lg font-black">{title}</h2>
                  <p className="mt-1 text-sm text-gray-600">Previsualisation du PDF selectionne.</p>
                </div>
                {selectedFile?.signedUrl ? (
                  <iframe
                    title={selectedFile.name}
                    src={selectedFile.signedUrl}
                    className="h-[75vh] w-full rounded-xl border border-gray-200"
                  />
                ) : (
                  <div className="flex h-[60vh] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-sm font-bold text-gray-500">
                    Aucun document a previsualiser.
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </ProAccessGuard>
  );
}
