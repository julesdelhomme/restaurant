import { Suspense, type ReactNode } from "react";
import ProAccessGuard from "../components/ProAccessGuard";

export const dynamic = "force-dynamic";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100 text-black">Chargement...</div>}>
      <ProAccessGuard requiredRole="server" allowSuperAdmin={false}>{children}</ProAccessGuard>
    </Suspense>
  );
}
