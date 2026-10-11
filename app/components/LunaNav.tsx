"use client";

import { usePathname } from "next/navigation";

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
      <a className="luna-nav-brand" href="/" aria-label="LUNA Startseite"><span>◐</span> LUNA</a>
      <div className="luna-nav-links">
        {links.map((link) => <a key={link.href} className={pathname === link.href ? "active" : ""} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>{link.label}</a>)}
      </div>
      <a className="luna-nav-profile" href="/settings" aria-label="Einstellungen">◯</a>
    </nav>
  );
}
