"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LayoutGrid, Table2, Settings as SettingsIcon, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: LayoutGrid },
  { href: "/clients", label: "Clients", icon: Table2 },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="hp-sidebar">
      <div className="hp-brand">
        <div className="hp-brand-mark">HP</div>
        <div className="hp-brand-text">
          <div className="hp-brand-name">Hoff Parquet</div>
          <div className="hp-brand-sub">Studio workspace</div>
        </div>
      </div>

      <nav className="hp-nav">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} className={"hp-nav-item" + (active ? " active" : "")}>
              <item.icon size={17} strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button className="hp-nav-add" onClick={logout}>
        <LogOut size={16} strokeWidth={2} />
        <span>Sign out</span>
      </button>
    </aside>
  );
}
