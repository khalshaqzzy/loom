import { AdminNodeDetailClient } from "@/components/admin/AdminNodeDetailClient";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminNodeDetailPage({ params }: { params: Promise<{ nodeId: string }> }) {
  const { nodeId } = await params;
  return (
    <AdminShell title="Node detail">
      <AdminNodeDetailClient nodeId={nodeId} />
    </AdminShell>
  );
}
