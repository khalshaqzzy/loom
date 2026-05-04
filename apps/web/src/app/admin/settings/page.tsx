import { AdminShell } from "@/components/admin/AdminShell";
import { Panel } from "@/components/ui";

export default function AdminSettingsPage() {
  return (
    <AdminShell title="Settings">
      <Panel className="max-w-3xl p-6">
        <h2 className="text-2xl font-black text-slate-950">Runtime diagnostics</h2>
        <div className="mt-6 grid gap-4">
          <div className="rounded-lg bg-mist p-4">
            <p className="text-xs font-semibold text-slate-500">API base URL</p>
            <p className="mt-2 font-mono text-sm">{process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"}</p>
          </div>
          <p className="text-sm leading-6 text-slate-600">Secrets, database internals, and API keys are not displayed in the web UI.</p>
        </div>
      </Panel>
    </AdminShell>
  );
}
