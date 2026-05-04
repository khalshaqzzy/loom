import { AdminMessagesClient } from "@/components/admin/AdminMessagesClient";
import { AdminShell } from "@/components/admin/AdminShell";

export default function AdminMessagesPage() {
  return (
    <AdminShell title="Messages">
      <AdminMessagesClient />
    </AdminShell>
  );
}
