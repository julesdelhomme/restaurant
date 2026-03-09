import type { ReactNode } from "react";
import ProAccessGuard from "../components/ProAccessGuard";

type ServerLayoutProps = {
  children: ReactNode;
};

export default function ServerLayout({ children }: ServerLayoutProps) {
  return <ProAccessGuard requiredRole="server">{children}</ProAccessGuard>;
}

