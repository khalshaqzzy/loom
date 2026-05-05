import { PublicMapClient } from "@/components/PublicMapClient";
import { PublicTopBar } from "@/components/PublicTopBar";

export default function PublicMapPage() {
  return (
    <main className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-gradient-to-br from-slate-50 via-[#eef5f6] to-slate-100/60">
      <PublicTopBar />
      <section className="px-5 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-[92rem]">
          <PublicMapClient />
        </div>
      </section>
    </main>
  );
}
