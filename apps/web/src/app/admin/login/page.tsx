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
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07131f] via-[#07131f]/80 to-transparent" />
        <div className="relative z-10">
          <Brand inverse />
          <h1 className="mt-20 max-w-3xl text-[clamp(3rem,5vw,5.5rem)] font-black leading-[1]">
            Operate the network when the field is under pressure.
          </h1>
          <p className="mt-8 max-w-xl text-xl leading-9 text-slate-300">
            Register nodes, inspect markers, and review message history from one protected console.
          </p>
        </div>
      </section>
      <section className="grid place-items-center px-5 py-16 md:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <AdminLoginClient />
        </div>
      </section>
    </main>
  );
}
