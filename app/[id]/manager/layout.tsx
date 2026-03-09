import type { ReactNode } from "react";
import ProAccessGuard from "../../components/ProAccessGuard";

type RestaurantManagerLayoutProps = {
  children: ReactNode;
};

export default function RestaurantManagerLayout({ children }: RestaurantManagerLayoutProps) {
  return <ProAccessGuard requiredRole="manager">{children}</ProAccessGuard>;
}
