import { AdminShell } from "@/components/admin/AdminShell";
import { Panel } from "@/components/ui";
import { GearSix, GlobeHemisphereWest, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

export default function AdminSettingsPage() {
  return (
    <AdminShell title="Settings">
      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <Panel className="animate-fade-up p-7">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-500">
              <GearSix size={22} weight="bold" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950">Runtime diagnostics</h2>
              <p className="text-xs text-slate-500">System configuration and connection details</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4">
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">API base URL</p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
                  {process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"}
                </p>
              </div>
              <div className="grid size-9 place-items-center rounded-lg bg-command/10 text-command">
                <GlobeHemisphereWest size={18} weight="bold" />
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="animate-fade-up p-7" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-[var(--safe-soft)] text-[var(--safe)]">
              <ShieldCheck size={22} weight="bold" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-950">Security</h2>
              <p className="text-xs text-slate-500">Data protection policies</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {[
              "Secrets, database internals, and API keys are not displayed in the web UI.",
              "Owner birth dates are collected for validation and never shown.",
              "Admin sessions are cookie-based with server-side validation."
            ].map((text, index) => (
              <div
                key={index}
                className="stagger-item flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3"
                style={{ "--stagger-index": index } as React.CSSProperties}
              >
                <ShieldCheck size={15} weight="bold" className="mt-0.5 flex-none text-[var(--safe)]" />
                <p className="text-xs leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AdminShell>
  );
}
