import { PublicHistoryLookup } from "@/components/PublicHistoryLookup";
import { PublicTopBar } from "@/components/PublicTopBar";
import { Panel } from "@/components/ui";
import { LockKey, ShieldCheck, EyeSlash, UserCircle } from "@phosphor-icons/react/dist/ssr";

export default function PublicHistoryPage() {
  return (
    <main className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-gradient-to-br from-slate-50 via-[#eef5f6] to-slate-100/60">
      <PublicTopBar />
      <section className="px-5 py-12 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="animate-fade-up">
            <PublicHistoryLookup />
          </div>
          <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
            <Panel className="sticky top-24 p-8">
              <div className="grid size-12 place-items-center rounded-2xl bg-[var(--safe-soft)] text-[var(--safe)]">
                <ShieldCheck size={26} weight="bold" />
              </div>
              <h2 className="mt-5 text-xl font-black tracking-tight text-slate-950">
                Privacy boundaries
              </h2>
              <div className="mt-6 grid gap-4">
                {[
                  {
                    icon: UserCircle,
                    title: "Identity verified",
                    copy: "Public lookup requires a full name and birth date together."
                  },
                  {
                    icon: EyeSlash,
                    title: "Generic responses",
                    copy: "Failed lookups remain generic and do not reveal whether a name exists."
                  },
                  {
                    icon: LockKey,
                    title: "Never displayed",
                    copy: "Birth dates are used for validation and are never shown in the web UI."
                  }
                ].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="stagger-item flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4"
                      style={{ "--stagger-index": index } as React.CSSProperties}
                    >
                      <div className="grid size-9 place-items-center rounded-lg bg-white text-slate-400 shadow-sm">
                        <Icon size={18} weight="bold" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{item.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.copy}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        </div>
      </section>
    </main>
  );
}
