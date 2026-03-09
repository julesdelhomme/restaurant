import CuisinePage from "../../cuisine/page";
import ProAccessGuard from "../../components/ProAccessGuard";

export default function RestaurantCuisinePage() {
  return (
    <ProAccessGuard requiredRole="cuisine" allowSuperAdmin={false}>
      <CuisinePage />
    </ProAccessGuard>
  );
}
