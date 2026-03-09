import type { ReactNode } from "react";
import ProAccessGuard from "../components/ProAccessGuard";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <ProAccessGuard requiredRole="server" allowSuperAdmin={false}>{children}</ProAccessGuard>;
}
