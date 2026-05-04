import clsx from "clsx";
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "command" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "command", ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55",
        variant === "command" && "bg-command text-white shadow-soft hover:-translate-y-0.5 hover:bg-blue-700",
        variant === "secondary" && "border border-border bg-white text-slate-900 shadow-soft hover:-translate-y-0.5",
        variant === "ghost" && "text-slate-700 hover:bg-white/70",
        variant === "danger" && "bg-[var(--critical)] text-white hover:bg-red-800",
        className
      )}
      {...props}
    />
  );
}

type LinkButtonProps = {
  href: string;
  variant?: ButtonProps["variant"];
  className?: string;
  children: ReactNode;
};

export function LinkButton({ className, variant = "command", href, ...props }: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={clsx(
        "focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition",
        variant === "command" && "bg-command text-white shadow-soft hover:-translate-y-0.5 hover:bg-blue-700",
        variant === "secondary" && "border border-border bg-white text-slate-900 shadow-soft hover:-translate-y-0.5",
        variant === "ghost" && "text-slate-700 hover:bg-white/70",
        variant === "danger" && "bg-[var(--critical)] text-white hover:bg-red-800",
        className
      )}
      {...props}
    />
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={clsx("rounded-xl border border-border bg-white/88 shadow-panel backdrop-blur", className)}>
      {children}
    </div>
  );
}

export function Field({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-800">
      <span>{label}</span>
      <input
        className={clsx(
          "focus-ring min-h-11 rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm",
          error ? "border-[var(--critical)]" : "border-border"
        )}
        {...props}
      />
      {error ? <span className="text-xs font-medium text-[var(--critical)]">{error}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label className={clsx("grid gap-2 text-sm font-semibold text-slate-800", className)}>
      <span>{label}</span>
      <select className="focus-ring min-h-11 rounded-lg border border-border bg-white px-3 text-sm shadow-sm" {...props}>
        {children}
      </select>
    </label>
  );
}

export function Badge({ children, tone = "command" }: { children: ReactNode; tone?: string }) {
  const toneClass =
    tone === "safe"
      ? "bg-[var(--safe-soft)] text-[var(--safe)]"
      : tone === "critical"
        ? "bg-[var(--critical-soft)] text-[var(--critical)]"
        : tone === "attention"
          ? "bg-[var(--attention-soft)] text-[var(--attention)]"
          : tone === "mesh"
            ? "bg-[var(--mesh-soft)] text-[var(--mesh)]"
            : "bg-[var(--command-soft)] text-command";
  return <span className={clsx("inline-flex rounded-md px-2.5 py-1 text-xs font-semibold", toneClass)}>{children}</span>;
}

export function InlineAlert({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" }) {
  return (
    <div
      className={clsx(
        "rounded-lg border px-4 py-3 text-sm",
        tone === "error" && "border-[var(--critical)]/25 bg-[var(--critical-soft)] text-[var(--critical)]",
        tone === "success" && "border-[var(--safe)]/25 bg-[var(--safe-soft)] text-[var(--safe)]",
        tone === "info" && "border-border bg-mist text-slate-700"
      )}
    >
      {children}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-lg bg-slate-200/70", className)} />;
}
