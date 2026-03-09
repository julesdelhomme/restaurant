import type { ReactNode } from "react";
import ProAccessGuard from "../components/ProAccessGuard";

type CuisineLayoutProps = {
  children: ReactNode;
};

export default function CuisineLayout({ children }: CuisineLayoutProps) {
  return <ProAccessGuard requiredRole="cuisine" allowSuperAdmin={false}>{children}</ProAccessGuard>;
}
