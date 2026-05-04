import { PublicMapClient } from "@/components/PublicMapClient";
import { PublicTopBar } from "@/components/PublicTopBar";

export default function PublicMapPage() {
  return (
    <main className="min-h-[100dvh] w-full max-w-full overflow-x-hidden">
      <PublicTopBar />
      <section className="px-5 py-8 md:px-8">
        <div className="mx-auto max-w-[92rem]">
          <PublicMapClient />
        </div>
      </section>
    </main>
  );
}
