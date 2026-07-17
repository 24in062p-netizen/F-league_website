"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "ホーム" },
  { href: "/schedule", label: "日程" },
  { href: "/standings", label: "順位表" },
  { href: "/teams", label: "チーム" },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-4 h-12"
      style={{ background: "var(--nav-bg)", color: "var(--nav-text)" }}
    >
      <span className="font-bold text-base tracking-tight">Fリーグ試合情報</span>
      <ul className="flex gap-1">
        {NAV.map((n) => {
          const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
