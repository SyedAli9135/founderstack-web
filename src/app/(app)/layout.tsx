"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { OnboardingShield } from "@/components/auth/OnboardingShield";
import { LayoutDashboard, Bot, Puzzle, KeyRound, Settings, ChevronRight } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/integrations", label: "Integrations", icon: Puzzle },
];

const settingsItems = [
  { href: "/settings/api-key", label: "API Key", icon: KeyRound },
];

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors group ${isActive
          ? "bg-white/10 text-white"
          : "text-zinc-400 hover:bg-white/5 hover:text-white"
        }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
      {isActive && <ChevronRight className="w-3 h-3 ml-auto text-zinc-500" />}
    </Link>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingShield>
      <div className="flex min-h-screen bg-zinc-950 text-white">
        {/* Sidebar */}
        <aside className="w-60 border-r border-zinc-800/60 bg-zinc-900/40 flex flex-col p-4 hidden md:flex shrink-0">
          <div className="font-bold text-lg tracking-tight mb-8 text-white px-3">
            FounderStack <span className="text-blue-400">AI</span>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>

          {/* Settings section */}
          <div className="pt-4 border-t border-zinc-800 space-y-1">
            <p className="px-3 text-[10px] uppercase tracking-widest text-zinc-600 mb-2 font-semibold">
              Settings
            </p>
            {settingsItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Topbar */}
          <header className="h-14 border-b border-zinc-800/60 flex items-center justify-between px-6 bg-zinc-950/80 backdrop-blur-sm">
            <span className="text-sm font-medium text-zinc-400">FounderStack AI</span>
            <UserButton />
          </header>

          {/* Page Content */}
          <div className="flex-1 p-6 overflow-y-auto bg-zinc-950">
            {children}
          </div>
        </main>
      </div>
    </OnboardingShield>
  );
}
