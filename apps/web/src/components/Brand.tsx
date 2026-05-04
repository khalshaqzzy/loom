import { UserCircle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className="focus-ring inline-flex items-center gap-3 rounded-lg">
      <span
        className={`grid size-10 place-items-center rounded-full border-2 ${
          inverse ? "border-blue-400 text-blue-400" : "border-command text-command"
        }`}
      >
        <UserCircle size={26} weight="bold" />
      </span>
      <span className={`text-3xl font-black tracking-normal ${inverse ? "text-blue-400" : "text-command"}`}>LOOM</span>
    </Link>
  );
}
