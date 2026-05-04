import { Brand } from "@/components/Brand";
import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="grid min-h-[100dvh] place-items-center px-5">
      <section className="max-w-2xl text-center">
        <div className="flex justify-center"><Brand /></div>
        <h1 className="mt-10 text-5xl font-black text-slate-950">Route not found</h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">Return to the public map, privacy lookup, or admin console.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <LinkButton href="/public">Public map</LinkButton>
          <LinkButton href="/public/history" variant="secondary">History lookup</LinkButton>
          <LinkButton href="/admin/login" variant="secondary">Admin login</LinkButton>
        </div>
      </section>
    </main>
  );
}
