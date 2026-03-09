import BarCaissePage from "../../bar-caisse/page";
import ProAccessGuard from "../../components/ProAccessGuard";

export default function RestaurantBarCaissePage() {
  return (
    <ProAccessGuard requiredRole="bar_caisse" allowSuperAdmin={false}>
      <BarCaissePage />
    </ProAccessGuard>
  );
}
