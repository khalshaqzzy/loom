import clsx from "clsx";
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { CheckCircle, Info, WarningCircle, XCircle } from "@phosphor-icons/react/dist/ssr";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "command" | "secondary" | "ghost" | "danger";
  loading?: boolean;
};

export function Button({
  className,
  variant = "command",
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "focus-ring tactile-press inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55",
        variant === "command" &&
          "bg-command text-white shadow-soft hover:bg-blue-700 hover:shadow-md",
        variant === "secondary" &&
          "border border-border bg-white text-slate-900 shadow-soft hover:border-slate-300 hover:shadow-md",
        variant === "ghost" && "text-slate-700 hover:bg-slate-100/70",
        variant === "danger" && "bg-[var(--critical)] text-white hover:bg-red-800",
        loading && "relative text-transparent",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner />
        </span>
      ) : null}
      {children}
    </button>
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
        "focus-ring tactile-press inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition",
        variant === "command" &&
          "bg-command text-white shadow-soft hover:bg-blue-700 hover:shadow-md",
        variant === "secondary" &&
          "border border-border bg-white text-slate-900 shadow-soft hover:border-slate-300 hover:shadow-md",
        variant === "ghost" && "text-slate-700 hover:bg-slate-100/70",
        variant === "danger" && "bg-[var(--critical)] text-white hover:bg-red-800",
        className
      )}
      {...props}
    />
  );
}

export function Panel({
  className,
  children,
  style
}: {
  className?: string;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-slate-200/70 bg-white/90 shadow-[0_1px_3px_rgb(var(--shadow-tint-rgb)/0.04),0_8px_24px_-4px_rgb(var(--shadow-tint-rgb)/0.06)] backdrop-blur-sm",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}

export function PanelFlush({
  className,
  children,
  style
}: {
  className?: string;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={clsx(
        "overflow-hidden rounded-xl border border-slate-200/70 bg-white/90 shadow-[0_1px_3px_rgb(var(--shadow-tint-rgb)/0.04),0_8px_24px_-4px_rgb(var(--shadow-tint-rgb)/0.06)] backdrop-blur-sm",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}

export function Field({
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <input
        className={clsx(
          "focus-ring min-h-11 rounded-lg border bg-white px-3.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400",
          error
            ? "border-[var(--critical)] bg-[var(--critical-soft)]/30"
            : "border-slate-200 hover:border-slate-300"
        )}
        {...props}
      />
      {hint && !error ? <span className="text-xs font-normal text-slate-400">{hint}</span> : null}
      {error ? (
        <span className="flex items-center gap-1 text-xs font-medium text-[var(--critical)]">
          <WarningCircle size={13} weight="bold" />
          {error}
        </span>
      ) : null}
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
    <label className={clsx("grid gap-1.5 text-sm font-semibold text-slate-700", className)}>
      <span>{label}</span>
      <select
        className="focus-ring min-h-11 rounded-lg border border-slate-200 bg-white px-3.5 text-sm shadow-sm transition-colors hover:border-slate-300"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Badge({
  children,
  tone = "command",
  dot = false
}: {
  children: ReactNode;
  tone?: string;
  dot?: boolean;
}) {
  const toneClass =
    tone === "safe"
      ? "bg-[var(--safe-soft)] text-[var(--safe)]"
      : tone === "critical"
        ? "bg-[var(--critical-soft)] text-[var(--critical)]"
        : tone === "attention"
          ? "bg-[var(--attention-soft)] text-[var(--attention)]"
          : tone === "mesh"
            ? "bg-[var(--mesh-soft)] text-[var(--mesh)]"
            : tone === "unknown"
              ? "bg-slate-100 text-slate-500"
              : "bg-[var(--command-soft)] text-command";
  const dotColor =
    tone === "safe"
      ? "bg-[var(--safe)]"
      : tone === "critical"
        ? "bg-[var(--critical)]"
        : tone === "attention"
          ? "bg-[var(--attention)]"
          : tone === "mesh"
            ? "bg-[var(--mesh)]"
            : tone === "unknown"
              ? "bg-slate-400"
              : "bg-command";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold",
        toneClass
      )}
    >
      {dot ? <span className={clsx("size-1.5 rounded-full", dotColor)} /> : null}
      {children}
    </span>
  );
}

export function StatusDot({
  tone = "mesh",
  size = "sm"
}: {
  tone?: string;
  size?: "xs" | "sm" | "md";
}) {
  const color =
    tone === "safe" || tone === "mesh"
      ? "bg-[var(--mesh)]"
      : tone === "critical"
        ? "bg-[var(--critical)]"
        : tone === "attention"
          ? "bg-[var(--attention)]"
          : "bg-slate-400";
  const sizeClass = size === "xs" ? "size-1.5" : size === "sm" ? "size-2" : "size-2.5";
  return (
    <span className="relative inline-flex">
      <span className={clsx("rounded-full", color, sizeClass)} />
      {(tone === "safe" || tone === "mesh") && (
        <span
          className={clsx(
            "absolute inset-0 animate-breathe rounded-full opacity-40",
            color,
            sizeClass
          )}
        />
      )}
    </span>
  );
}

export function InlineAlert({
  children,
  tone = "info"
}: {
  children: ReactNode;
  tone?: "info" | "error" | "success" | "warning";
}) {
  const Icon =
    tone === "error"
      ? XCircle
      : tone === "success"
        ? CheckCircle
        : tone === "warning"
          ? WarningCircle
          : Info;
  return (
    <div
      className={clsx(
        "flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm animate-fade-up",
        tone === "error" &&
          "border-[var(--critical)]/20 bg-[var(--critical-soft)]/50 text-[var(--critical)]",
        tone === "success" && "border-[var(--safe)]/20 bg-[var(--safe-soft)]/50 text-[var(--safe)]",
        tone === "warning" &&
          "border-[var(--attention)]/20 bg-[var(--attention-soft)]/50 text-[var(--attention)]",
        tone === "info" && "border-slate-200 bg-slate-50 text-slate-600"
      )}
    >
      <Icon size={18} weight="bold" className="mt-0.5 flex-none" />
      <span>{children}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("shimmer rounded-lg bg-slate-100", className)} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={clsx("grid gap-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="shimmer h-4 rounded bg-slate-100"
          style={{ width: index === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function LoadingSpinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={clsx("animate-spin", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path
        d="M12 2C6.477 2 2 6.477 2 12"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = React.ComponentType<any>;

export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: {
  icon: IconComponent;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="grid size-14 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
        <Icon size={28} weight="duotone" />
      </div>
      <h3 className="mt-5 text-lg font-bold text-slate-800">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={clsx("border-t border-slate-100", className)} />;
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-mono font-semibold text-slate-500">
      {children}
    </kbd>
  );
}
