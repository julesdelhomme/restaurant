import AdminPage from "../../admin/page";
import ProAccessGuard from "../../components/ProAccessGuard";

export default function RestaurantAdminPage() {
  return (
    <ProAccessGuard requiredRole="server" allowSuperAdmin={false}>
      <AdminPage />
    </ProAccessGuard>
  );
}
