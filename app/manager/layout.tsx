import type { ReactNode } from "react";
import ProAccessGuard from "../components/ProAccessGuard";

type ManagerLayoutProps = {
  children: ReactNode;
};

export default function ManagerLayout({ children }: ManagerLayoutProps) {
  return <ProAccessGuard requiredRole="manager">{children}</ProAccessGuard>;
}

