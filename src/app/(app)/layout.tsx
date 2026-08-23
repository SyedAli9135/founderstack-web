"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { OnboardingShield } from "@/components/auth/OnboardingShield";
import { LayoutDashboard, Bot, Puzzle, KeyRound, Menu, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/integrations", label: "Integrations", icon: Puzzle },
];

const settingsItems = [{ href: "/settings/api-key", label: "LLM Providers", icon: KeyRound }];

function NavLink({
  href,
  label,
  icon: Icon,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="space-y-1 border-t border-border pt-4">
        <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Settings
        </p>
        {settingsItems.map((item) => (
          <NavLink key={item.href} {...item} onNavigate={onNavigate} />
        ))}
      </div>
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <OnboardingShield>
      <div className="flex min-h-screen bg-background text-foreground">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-border p-4 md:flex">
          <div className="mb-8 px-3 text-sm font-semibold tracking-tight">FounderStack</div>
          <NavContent />
        </aside>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-64 p-4">
            <SheetHeader className="p-0">
              <SheetTitle>FounderStack</SheetTitle>
            </SheetHeader>
            <NavContent onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="flex h-screen flex-1 flex-col overflow-hidden">
          <header className="flex h-14 items-center justify-between border-b border-border px-4 md:px-6">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <span className="text-sm font-medium text-muted-foreground">FounderStack</span>
            </div>
            <UserButton />
          </header>

          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </main>
      </div>
    </OnboardingShield>
  );
}
