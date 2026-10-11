"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const links = [
  { href: "/", label: "Chat" },
  { href: "/tasks", label: "Aufgaben" },
  { href: "/agents", label: "Agenten" },
  { href: "/projects", label: "Projekte" },
  { href: "/memory", label: "Memory" },
  { href: "/tools", label: "Tools" },
];

export default function LunaNav() {
  const pathname = usePathname();
  return (
    <nav className="luna-topbar" aria-label="LUNA Navigation">
      <Link className="luna-nav-brand" href="/" aria-label="LUNA Startseite"><span>◐</span> LUNA</Link>
      <div className="luna-nav-links">
        {links.map((link) => <Link key={link.href} className={pathname === link.href ? "active" : ""} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>{link.label}</Link>)}
      </div>
      <Link className="luna-nav-profile" href="/#profile" aria-label="Profil">◯</Link>
    </nav>
  );
}
