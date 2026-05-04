import { AdminOverviewClient } from "@/components/admin/AdminOverviewClient";
import { AdminShell } from "@/components/admin/AdminShell";

export default function AdminPage() {
  return (
    <AdminShell title="Overview">
      <AdminOverviewClient />
    </AdminShell>
  );
}
