"use client";

import { useRouter } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import { Briefcase, Building2, Check, ChevronsUpDown, LayoutGrid, Loader2, Plus } from "lucide-react";
import { useMyWorkspaces, useSwitchWorkspace } from "@/hooks/usePortfolio";
import { WorkspaceRef } from "@/lib/api/types";

const itemClass =
  "flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:opacity-50";

function typeLabel(ws: WorkspaceRef): string {
  if (ws.organization_type === "client_workspace") return "Client workspace";
  if (ws.organization_type === "practice") return "Practice";
  return "Workspace";
}

export function WorkspaceSwitcher() {
  const router = useRouter();
  const { data: workspaces, isLoading } = useMyWorkspaces();
  const { switchTo, switchingTo } = useSwitchWorkspace();

  const current = workspaces?.find((w) => w.is_current);
  const topLevel = (workspaces ?? []).filter((w) => w.organization_type !== "client_workspace");
  const clients = (workspaces ?? []).filter((w) => w.organization_type === "client_workspace");
  // A client workspace reached only through an invitation (the client's own
  // staff) has no practice above it the person can manage.
  const canAddClients = topLevel.some((w) => w.role === "owner" || w.role === "admin");

  if (isLoading) {
    return <div className="h-8 w-40 animate-pulse rounded-md bg-muted" aria-hidden />;
  }

  const renderItem = (ws: WorkspaceRef) => (
    <Menu.Item
      key={ws.id}
      className={itemClass}
      disabled={!!switchingTo}
      onClick={() => {
        if (!ws.is_current) void switchTo(ws.clerk_org_id);
      }}
    >
      {ws.organization_type === "client_workspace" ? (
        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
      <span className="flex-1 truncate">{ws.name}</span>
      {switchingTo === ws.clerk_org_id ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : ws.is_current ? (
        <Check className="h-3.5 w-3.5 text-primary" />
      ) : null}
    </Menu.Item>
  );

  return (
    <Menu.Root>
      <Menu.Trigger
        className="flex max-w-[16rem] items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/40 data-[popup-open]:bg-accent/60"
        aria-label="Switch workspace"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">{current?.name ?? "FounderStack"}</span>
          {current && (
            <span className="block text-[11px] leading-tight text-muted-foreground">{typeLabel(current)}</span>
          )}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="start" className="z-50">
          <Menu.Popup className="w-64 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
            {topLevel.length > 0 && (
              <Menu.Group>
                <Menu.GroupLabel className="px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {topLevel.length === 1 ? "Your practice" : "Your practices"}
                </Menu.GroupLabel>
                {topLevel.map(renderItem)}
              </Menu.Group>
            )}
            {clients.length > 0 && (
              <Menu.Group>
                <Menu.GroupLabel className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Client workspaces
                </Menu.GroupLabel>
                <div className="max-h-64 overflow-y-auto">{clients.map(renderItem)}</div>
              </Menu.Group>
            )}
            <Menu.Separator className="my-1 h-px bg-border" />
            <Menu.Item className={itemClass} onClick={() => router.push("/practice")}>
              <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
              Portfolio overview
            </Menu.Item>
            {canAddClients && (
              <Menu.Item className={itemClass} onClick={() => router.push("/practice/new-client")}>
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                Add client workspace
              </Menu.Item>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
