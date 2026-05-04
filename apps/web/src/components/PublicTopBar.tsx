import { ClockCounterClockwise, LockKey, MapTrifold } from "@phosphor-icons/react/dist/ssr";
import { Brand } from "./Brand";
import { LinkButton } from "./ui";

export function PublicTopBar() {
  return (
    <header className="glass-panel-strong sticky top-0 z-40 border-b border-slate-200/40 px-5 py-3.5 md:px-8">
      <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-4">
        <Brand />
        <nav className="hidden items-center gap-1 text-sm font-semibold md:flex">
          {[
            { href: "/public", label: "Public map" },
            { href: "/public/history", label: "History lookup" },
            { href: "/admin/login", label: "Admin login" }
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative rounded-lg px-3.5 py-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              {link.label}
              <span className="absolute bottom-0.5 left-3.5 right-3.5 h-[2px] scale-x-0 rounded-full bg-command transition-transform group-hover:scale-x-100" />
            </a>
          ))}
        </nav>
        <div className="flex gap-2">
          <LinkButton href="/public" variant="secondary" className="hidden sm:inline-flex">
            <MapTrifold size={17} weight="bold" />
            Map
          </LinkButton>
          <LinkButton href="/public/history" variant="secondary" className="hidden sm:inline-flex">
            <ClockCounterClockwise size={17} weight="bold" />
            History
          </LinkButton>
          <LinkButton href="/admin/login" variant="secondary">
            <LockKey size={17} weight="bold" />
            <span className="hidden sm:inline">Admin</span>
          </LinkButton>
        </div>
      </div>
    </header>
  );
}
