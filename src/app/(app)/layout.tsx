import { UserButton } from "@clerk/nextjs";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Placeholder */}
      <aside className="w-64 border-r bg-muted/20 flex flex-col p-4 hidden md:flex">
        <div className="font-bold text-xl tracking-tight mb-8 text-primary">FounderStack AI</div>
        <nav className="space-y-2 flex-1">
          <div className="px-3 py-2 text-sm font-medium rounded-md bg-secondary text-secondary-foreground cursor-pointer">
            Dashboard
          </div>
          <div className="px-3 py-2 text-sm font-medium rounded-md hover:bg-muted text-muted-foreground transition-colors cursor-pointer">
            Agents
          </div>
          <div className="px-3 py-2 text-sm font-medium rounded-md hover:bg-muted text-muted-foreground transition-colors cursor-pointer">
            Integrations
          </div>
        </nav>
      </aside>

      {/* Main Content Node */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b flex items-center justify-between px-6 bg-background">
          <h1 className="text-sm font-medium text-foreground">Overview</h1>
          <div>
            <UserButton />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
