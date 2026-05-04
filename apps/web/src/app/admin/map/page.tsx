import { AdminMapClient } from "@/components/admin/AdminMapClient";
import { AdminShell } from "@/components/admin/AdminShell";

export default function AdminMapPage() {
  return (
    <AdminShell title="Map">
      <AdminMapClient />
    </AdminShell>
  );
}
