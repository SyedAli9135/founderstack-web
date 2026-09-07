"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { OnboardingShield } from "@/components/auth/OnboardingShield";
import { PushPermissionPrompt } from "@/components/approvals/PushPermissionPrompt";
import { usePendingApprovals } from "@/hooks/useApprovals";
import { usePendingInvitations } from "@/hooks/usePendingInvitations";
import {
  LayoutDashboard,
  Bot,
  Puzzle,
  KeyRound,
  Menu,
  FileText,
  Workflow,
  History,
  ShieldAlert,
  BellRing,
  Users,
  Mail,
  BarChart3,
  Gauge,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/runs", label: "Runs", icon: History },
  { href: "/approvals", label: "Approvals", icon: ShieldAlert },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/integrations", label: "Integrations", icon: Puzzle },
  { href: "/analytics/usage", label: "Usage", icon: BarChart3 },
  { href: "/analytics/agents", label: "Agent Performance", icon: Gauge },
  { href: "/invitations", label: "Invitations", icon: Mail },
];

const settingsItems = [
  { href: "/settings/api-key", label: "LLM Providers", icon: KeyRound },
  { href: "/settings/notifications", label: "Notifications", icon: BellRing },
  { href: "/settings/team", label: "Team", icon: Users },
  { href: "/settings/security", label: "Audit Log", icon: Shield },
];

function NavLink({
  href,
  label,
  icon: Icon,
  badge,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
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
      <span className="flex-1">{label}</span>
      {!!badge && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  // Polled, not SSE-driven — the badge just needs to be roughly current,
  // and every other page reads it the same way (see usePendingApprovals'
  // own refetchInterval reasoning).
  const { data: pendingApprovals } = usePendingApprovals();
  // Pure Clerk data, no backend call — safe here even though this sidebar
  // only ever mounts for a user OnboardingShield has already confirmed has
  // a synced org (see that component's hasNoOrg gate).
  const { invitations: pendingInvitations } = usePendingInvitations();

  const badgeCounts: Record<string, number | undefined> = {
    "/approvals": pendingApprovals?.length,
    "/invitations": pendingInvitations.length,
  };

  return (
    <>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} badge={badgeCounts[item.href]} onNavigate={onNavigate} />
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
      <PushPermissionPrompt />
    </OnboardingShield>
  );
}
