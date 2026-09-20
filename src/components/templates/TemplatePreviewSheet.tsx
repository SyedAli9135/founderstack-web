"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useTemplate, useInstallTemplate } from "@/hooks/useTemplates";
import { brandIconMap, brandColorMap } from "@/components/integrations/brand-icons";
import { Loader2, Wrench } from "lucide-react";

// Workflow 19: the slide-in preview a founder opens from a template
// card's "Preview" button before committing to install — full system
// prompt, model, and tool list, per the plan's own acceptance criterion
// ("Template preview shows the full system prompt and tool list before
// installing").
export function TemplatePreviewSheet({
  templateId,
  open,
  onOpenChange,
  onInstalled,
}: {
  templateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstalled: (agentId: string) => void;
}) {
  const { data: template, isLoading } = useTemplate(open ? templateId : null);
  const installMutation = useInstallTemplate();

  const Icon = template ? brandIconMap[template.icon] : undefined;
  const iconColor = template ? brandColorMap[template.icon] ?? "text-foreground" : "";

  const handleInstall = () => {
    if (!templateId) return;
    installMutation.mutate(templateId, {
      onSuccess: (data) => onInstalled(data.agent_id),
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-6 sm:max-w-lg">
        {isLoading || !template ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <SheetHeader className="space-y-3 p-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent">
                  {Icon && <Icon className={`h-5 w-5 ${iconColor}`} />}
                </div>
                <div>
                  <SheetTitle>{template.name}</SheetTitle>
                  <span className="text-xs text-muted-foreground">{template.category}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{template.description}</p>
            </SheetHeader>

            <div>
              <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">Model</h3>
              <p className="rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-foreground">
                {template.model}
              </p>
            </div>

            <div>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Wrench className="h-3 w-3" />
                Tools this agent can use
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {template.allowed_tools.map((tool) => (
                  <span key={tool} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">System prompt</h3>
              <pre className="whitespace-pre-wrap rounded-md border border-border bg-card p-3 font-mono text-xs leading-relaxed text-foreground">
                {template.system_prompt}
              </pre>
            </div>

            <Button onClick={handleInstall} disabled={installMutation.isPending} className="w-full">
              {installMutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Install this Agent
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
