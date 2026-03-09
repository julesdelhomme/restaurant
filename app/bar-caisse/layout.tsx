import type { ReactNode } from "react";
import ProAccessGuard from "../components/ProAccessGuard";

type BarCaisseLayoutProps = {
  children: ReactNode;
};

export default function BarCaisseLayout({ children }: BarCaisseLayoutProps) {
  return <ProAccessGuard requiredRole="bar_caisse" allowSuperAdmin={false}>{children}</ProAccessGuard>;
}
