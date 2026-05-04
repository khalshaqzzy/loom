import { AdminNodesClient } from "@/components/admin/AdminNodesClient";
import { AdminShell } from "@/components/admin/AdminShell";

export default function AdminNodesPage() {
  return (
    <AdminShell title="Registered nodes">
      <AdminNodesClient />
    </AdminShell>
  );
}
