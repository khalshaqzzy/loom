import { Brand } from "@/components/Brand";
import { LinkButton } from "@/components/ui";
import {
  MapTrifold,
  ClockCounterClockwise,
  UserCircle,
  WarningCircle
} from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-gradient-to-br from-slate-50 via-[#eef5f6] to-slate-100/60 px-5">
      {/* Subtle mesh lines */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]"
        aria-hidden="true"
      >
        <path
          d="M80 120 C200 80 280 180 420 130 S600 90 780 150"
          fill="none"
          stroke="#12a7a2"
          strokeWidth="2"
          className="mesh-line"
        />
        <path
          d="M120 350 C260 290 340 390 500 330 S700 270 900 340"
          fill="none"
          stroke="#0f5fd7"
          strokeWidth="2"
          className="mesh-line"
        />
      </svg>

      <section className="relative max-w-2xl text-center">
        <div className="flex justify-center animate-fade-up">
          <Brand />
        </div>

        <div className="mt-10 animate-fade-up" style={{ animationDelay: "80ms" }}>
          <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm">
            <WarningCircle size={32} weight="duotone" />
          </div>
        </div>

        <h1
          className="mt-6 text-5xl font-black tracking-tight text-slate-950 animate-fade-up"
          style={{ animationDelay: "120ms" }}
        >
          Route not found
        </h1>
        <p
          className="mt-4 text-lg leading-relaxed text-slate-500 animate-fade-up"
          style={{ animationDelay: "160ms" }}
        >
          The page you are looking for does not exist or has been moved. Return to the public map,
          privacy lookup, or admin console.
        </p>
        <div
          className="mt-8 flex flex-wrap justify-center gap-3 animate-fade-up"
          style={{ animationDelay: "200ms" }}
        >
          <LinkButton href="/public">
            <MapTrifold size={17} weight="bold" />
            Public map
          </LinkButton>
          <LinkButton href="/public/history" variant="secondary">
            <ClockCounterClockwise size={17} weight="bold" />
            History lookup
          </LinkButton>
          <LinkButton href="/admin/login" variant="secondary">
            <UserCircle size={17} weight="bold" />
            Admin login
          </LinkButton>
        </div>
      </section>
    </main>
  );
}
