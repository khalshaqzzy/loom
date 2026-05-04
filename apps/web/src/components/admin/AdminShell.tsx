"use client";

import {
  ChartLineUp,
  GearSix,
  ListMagnifyingGlass,
  MapTrifold,
  SignOut,
  TreeStructure,
  UserCircle
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AdminSessionResponse } from "@loom/contracts";
import { api } from "@/lib/api";
import { Brand } from "../Brand";
import { Button, InlineAlert, Skeleton } from "../ui";

const nav = [
  { href: "/admin", label: "Overview", icon: ChartLineUp },
  { href: "/admin/map", label: "Map", icon: MapTrifold },
  { href: "/admin/nodes", label: "Nodes", icon: TreeStructure },
  { href: "/admin/messages", label: "Messages", icon: ListMagnifyingGlass },
  { href: "/admin/settings", label: "Settings", icon: GearSix }
];

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AdminSessionResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .session()
      .then((value) => {
        if (!value.authenticated) {
          router.replace("/admin/login");
          return;
        }
        setSession(value);
      })
      .catch(() => setError("Admin session is unavailable."));
  }, [router]);

  const logout = async () => {
    await api.logout().catch(() => null);
    router.replace("/admin/login");
  };

  if (error) {
    return (
      <main className="grid min-h-[100dvh] place-items-center px-5">
        <InlineAlert tone="error">{error}</InlineAlert>
      </main>
    );
  }

  if (!session?.authenticated) {
    return (
      <main className="grid min-h-[100dvh] place-items-center px-5">
        <Skeleton className="h-32 w-full max-w-lg" />
      </main>
    );
  }

  return (
    <main className="grid min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#eef5f6] lg:grid-cols-[280px_1fr]">
      <aside className="border-r border-border bg-white/88 px-5 py-6 backdrop-blur-xl">
        <Brand />
        <nav className="mt-10 grid gap-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`focus-ring flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition ${
                  active ? "bg-command text-white" : "text-slate-700 hover:bg-mist"
                }`}
              >
                <Icon size={20} weight="bold" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <section className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-white/82 px-5 py-4 backdrop-blur-xl md:px-8">
          <div>
            <p className="text-sm font-semibold text-slate-500">LOOM operations</p>
            <h1 className="text-2xl font-black text-slate-950">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold md:flex">
              <UserCircle size={20} weight="bold" className="text-command" />
              {session.admin?.displayName ?? session.admin?.username}
            </div>
            <Button variant="secondary" onClick={logout}>
              <SignOut size={18} weight="bold" />
              Logout
            </Button>
          </div>
        </header>
        <div className="p-5 md:p-8">{children}</div>
      </section>
    </main>
  );
}
