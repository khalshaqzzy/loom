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
import { Button, InlineAlert, LoadingSpinner, StatusDot } from "../ui";

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
  const [mobileNav, setMobileNav] = useState(false);

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
      <main className="grid min-h-[100dvh] place-items-center bg-gradient-to-br from-slate-50 to-slate-100/80 px-5">
        <div className="animate-fade-up">
          <InlineAlert tone="error">{error}</InlineAlert>
        </div>
      </main>
    );
  }

  if (!session?.authenticated) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-gradient-to-br from-slate-50 to-slate-100/80">
        <div className="flex flex-col items-center gap-4 animate-fade-up">
          <LoadingSpinner size={28} className="text-command" />
          <p className="text-sm font-semibold text-slate-400">Verifying session</p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-gradient-to-br from-slate-50 via-[#eef5f6] to-slate-100/60 lg:grid-cols-[272px_1fr]">
      {/* Sidebar */}
      <aside className="hidden border-r border-slate-200/60 bg-white/70 backdrop-blur-xl lg:block">
        <div className="sticky top-0 flex h-[100dvh] flex-col">
          <div className="px-6 pt-7 pb-5">
            <Brand />
          </div>
          <nav className="flex-1 px-3">
            <div className="grid gap-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      active
                        ? "bg-command text-white shadow-[0_2px_12px_-2px_rgba(15,95,215,0.35)]"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-white/80" />
                    )}
                    <Icon size={19} weight={active ? "bold" : "regular"} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
          <div className="border-t border-slate-100 px-4 py-4">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
              <div className="grid size-9 place-items-center rounded-full bg-command/10 text-command">
                <UserCircle size={20} weight="bold" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800">
                  {session.admin?.displayName ?? session.admin?.username}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-slate-400">
                  <StatusDot tone="mesh" size="xs" />
                  Online
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile nav overlay */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" onClick={() => setMobileNav(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white/95 backdrop-blur-xl shadow-xl animate-slide-up">
            <div className="px-6 pt-7 pb-5">
              <Brand />
            </div>
            <nav className="px-3">
              <div className="grid gap-1">
                {nav.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileNav(false)}
                      className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition ${
                        active
                          ? "bg-command text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon size={19} weight={active ? "bold" : "regular"} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <section className="min-w-0">
        <header className="glass-panel-strong sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200/50 px-5 py-3.5 md:px-8">
          <div className="flex items-center gap-3">
            <button
              className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileNav(true)}
              aria-label="Open navigation"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">LOOM operations</p>
              <h1 className="text-xl font-black tracking-tight text-slate-950">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2.5 rounded-lg border border-slate-200/70 bg-white/80 px-3.5 py-2 text-sm font-semibold md:flex">
              <StatusDot tone="mesh" size="xs" />
              <span className="text-slate-600">{session.admin?.displayName ?? session.admin?.username}</span>
            </div>
            <Button variant="ghost" onClick={logout} className="text-slate-500 hover:text-slate-700">
              <SignOut size={17} weight="bold" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>
        <div className="p-5 md:p-8">{children}</div>
      </section>
    </main>
  );
}
