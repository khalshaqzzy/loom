import { Broadcast } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className="focus-ring inline-flex items-center gap-3 rounded-lg">
      <span
        className={`relative grid size-10 place-items-center rounded-full border-2 ${
          inverse ? "border-blue-400/80 text-blue-400" : "border-command/80 text-command"
        }`}
      >
        <Broadcast size={24} weight="bold" />
        <span
          className={`absolute inset-0 rounded-full animate-breathe opacity-30 ${
            inverse ? "bg-blue-400" : "bg-command"
          }`}
        />
      </span>
      <span
        className={`text-[1.7rem] font-black tracking-tight ${inverse ? "text-blue-400" : "text-command"}`}
      >
        LOOM
      </span>
    </Link>
  );
}
