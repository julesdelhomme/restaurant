// @ts-nocheck
import { useEffect } from "react";

export function useManagerSessionEffects(deps: Record<string, any>) {
  const { supabase, setManagerUserEmail, setGlobalManagerNotification } = deps;

  useEffect(() => {
    let mounted = true;
    const loadManagerUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setManagerUserEmail(String(data.user?.email || "").trim());
    };
    void loadManagerUser();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadGlobalNotification = async () => {
      const result = await supabase
        .from("global_notifications")
        .select("id,message")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const errorCode = String((result.error as { code?: string } | null)?.code || "");
      if (result.error && errorCode !== "42P01") {
        console.warn("global_notifications fetch failed (manager):", result.error.message);
      }
      if (!mounted) return;
      setGlobalManagerNotification(
        result.data && String(result.data.message || "").trim()
          ? {
              id: String(result.data.id || ""),
              message: String(result.data.message || "").trim(),
            }
          : null
      );
    };

    const channel = supabase
      .channel("manager-global-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "global_notifications" }, () => {
        void loadGlobalNotification();
      })
      .subscribe();

    void loadGlobalNotification();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);
}
