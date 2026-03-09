"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ManagerLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    router.replace(query ? `/login?${query}` : "/login");
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gray-100 text-black flex items-center justify-center p-4">
      Redirection vers la connexion...
    </div>
  );
}

