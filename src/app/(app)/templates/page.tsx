"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTemplates, useInstallTemplate } from "@/hooks/useTemplates";
import { TemplatePreviewSheet } from "@/components/templates/TemplatePreviewSheet";
import { Button } from "@/components/ui/button";
import { brandIconMap, brandColorMap } from "@/components/integrations/brand-icons";
import { AgentTemplateSummary } from "@/lib/api/types";
import { Loader2, Sparkles, Wrench } from "lucide-react";

const CATEGORIES = ["All", "Finance", "Comms", "Marketing", "Engineering", "Ops"];

function TemplateCard({
  template,
  onPreview,
  onInstalled,
}: {
  template: AgentTemplateSummary;
  onPreview: () => void;
  onInstalled: (agentId: string) => void;
}) {
  const installMutation = useInstallTemplate();
  const Icon = brandIconMap[template.icon];
  const iconColor = brandColorMap[template.icon] ?? "text-foreground";

  return (
    <div className="flex min-h-[200px] flex-col justify-between rounded-lg border border-border bg-card p-4">
      <div>
        <div className="mb-3 flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent">
            {Icon && <Icon className={`h-4 w-4 ${iconColor}`} />}
          </div>
          <div className="flex items-center gap-1.5">
            {template.is_featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                Featured
              </span>
            )}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {template.category}
            </span>
          </div>
        </div>
        <h4 className="text-sm font-medium text-foreground">{template.name}</h4>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{template.description}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Wrench className="h-3 w-3" />
          {template.tool_count} {template.tool_count === 1 ? "tool" : "tools"}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onPreview}>
          Preview
        </Button>
        <Button
          size="sm"
          onClick={() =>
            installMutation.mutate(template.id, {
              onSuccess: (data) => onInstalled(data.agent_id),
            })
          }
          disabled={installMutation.isPending}
        >
          {installMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Install"}
        </Button>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [category, setCategory] = useState("All");
  const { data: templates, isLoading, error } = useTemplates(category === "All" ? undefined : category);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const router = useRouter();

  const handleInstalled = (agentId: string) => {
    setPreviewId(null);
    toast.success("Agent installed! Customize it here.");
    router.push(`/agents/${agentId}`);
  };

  const featured = (templates ?? []).filter((t) => t.is_featured);
  const rest = (templates ?? []).filter((t) => !t.is_featured);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="border-b border-border pb-6">
        <h1 className="text-xl font-semibold tracking-tight">Agent templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pre-built agents for the tools you already use — install one and customize it freely.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              category === c
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm font-medium text-destructive">Could not load templates</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      ) : !templates || templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium text-foreground">No templates in this category</p>
        </div>
      ) : (
        <div className="space-y-8">
          {featured.length > 0 && category === "All" && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-foreground">Featured</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((t) => (
                  <TemplateCard key={t.id} template={t} onPreview={() => setPreviewId(t.id)} onInstalled={handleInstalled} />
                ))}
              </div>
            </div>
          )}
          <div>
            {featured.length > 0 && category === "All" && (
              <h2 className="mb-3 text-sm font-medium text-foreground">All templates</h2>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(category === "All" ? rest : templates).map((t) => (
                <TemplateCard key={t.id} template={t} onPreview={() => setPreviewId(t.id)} onInstalled={handleInstalled} />
              ))}
            </div>
          </div>
        </div>
      )}

      <TemplatePreviewSheet
        templateId={previewId}
        open={previewId !== null}
        onOpenChange={(open) => !open && setPreviewId(null)}
        onInstalled={handleInstalled}
      />
    </div>
  );
}
