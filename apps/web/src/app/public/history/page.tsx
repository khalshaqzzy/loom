import { PublicHistoryLookup } from "@/components/PublicHistoryLookup";
import { PublicTopBar } from "@/components/PublicTopBar";
import { Panel } from "@/components/ui";

export default function PublicHistoryPage() {
  return (
    <main className="min-h-[100dvh] w-full max-w-full overflow-x-hidden">
      <PublicTopBar />
      <section className="px-5 py-16 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_0.8fr]">
          <PublicHistoryLookup />
          <Panel className="p-8">
            <h2 className="text-3xl font-black text-slate-950">Privacy boundaries</h2>
            <div className="mt-8 grid gap-5 text-slate-700">
              <p>Public lookup requires a full name and birth date together.</p>
              <p>Failed lookups remain generic and do not reveal whether a name exists.</p>
              <p>Birth dates are used for validation and are never displayed in the web UI.</p>
            </div>
          </Panel>
        </div>
      </section>
    </main>
  );
}
