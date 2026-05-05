import Image from "next/image";
import { Brand } from "@/components/Brand";
import { AdminLoginClient } from "@/components/admin/AdminLoginClient";

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-[100dvh] w-full max-w-full overflow-x-hidden lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden bg-[#07131f] p-12 text-white lg:block">
        <Image
          src="/assets/landing/section7/final-cta-map.png"
          alt="LOOM signal map"
          fill
          className="object-cover opacity-50"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07131f] via-[#07131f]/85 to-transparent" />
        {/* Mesh line overlay */}
        <svg className="absolute inset-0 h-full w-full opacity-20" aria-hidden="true">
          <path
            d="M80 120 C200 80 280 180 420 130 S600 90 780 150"
            fill="none"
            stroke="#12a7a2"
            strokeWidth="2"
            className="mesh-line"
          />
          <path
            d="M120 280 C260 220 340 320 500 260 S700 200 900 270"
            fill="none"
            stroke="#0f5fd7"
            strokeWidth="2"
            className="mesh-line"
          />
          <path
            d="M60 420 C180 370 300 450 480 400 S660 350 850 420"
            fill="none"
            stroke="#12a7a2"
            strokeWidth="1.5"
            className="mesh-line"
          />
        </svg>
        <div className="relative z-10">
          <Brand inverse />
          <h1 className="mt-20 max-w-3xl text-[clamp(3rem,5vw,5.5rem)] font-black leading-[1] tracking-tight">
            Operate the network when the field is under pressure.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-slate-300/90">
            Register nodes, inspect markers, and review message history from one protected console.
          </p>
          <div className="mt-12 flex items-center gap-6 text-sm text-slate-400">
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[var(--mesh)] animate-breathe" />
              Secure authentication
            </span>
            <span className="flex items-center gap-2">
              <span
                className="size-1.5 rounded-full bg-[var(--mesh)] animate-breathe"
                style={{ animationDelay: "0.8s" }}
              />
              Role-based access
            </span>
            <span className="flex items-center gap-2">
              <span
                className="size-1.5 rounded-full bg-[var(--mesh)] animate-breathe"
                style={{ animationDelay: "1.6s" }}
              />
              Audit ready
            </span>
          </div>
        </div>
      </section>
      <section className="grid place-items-center px-5 py-16 md:px-10">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <AdminLoginClient />
        </div>
      </section>
    </main>
  );
}
