import { LockKey, MapTrifold } from "@phosphor-icons/react/dist/ssr";
import { Brand } from "./Brand";
import { LinkButton } from "./ui";

export function PublicTopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/88 px-5 py-4 backdrop-blur-xl md:px-8">
      <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-4">
        <Brand />
        <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-700 md:flex">
          <a href="/public">Public map</a>
          <a href="/public/history">History lookup</a>
          <a href="/admin/login">Admin login</a>
        </nav>
        <div className="flex gap-3">
          <LinkButton href="/public" variant="secondary" className="hidden sm:inline-flex">
            <MapTrifold size={18} weight="bold" />
            Map
          </LinkButton>
          <LinkButton href="/admin/login" variant="secondary">
            <LockKey size={18} weight="bold" />
            Admin
          </LinkButton>
        </div>
      </div>
    </header>
  );
}
