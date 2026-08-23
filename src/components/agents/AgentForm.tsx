"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useAvailableTools,
  useCreateAgent,
  useUpdateAgent,
  AgentFormInput,
} from "@/hooks/useAgents";
import { Agent } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";

const MIN_SYSTEM_PROMPT_LEN = 50;
const DEFAULT_MODEL = "claude-sonnet-5";

interface AgentFormProps {
  agent?: Agent; // present = editing; absent = creating
}

export function AgentForm({ agent }: AgentFormProps) {
  const router = useRouter();
  const isEditing = !!agent;

  const [name, setName] = useState(agent?.name ?? "");
  const [description, setDescription] = useState(agent?.description ?? "");
  const [agentType, setAgentType] = useState(agent?.agent_type ?? "specialist");
  const [model, setModel] = useState(agent?.model ?? DEFAULT_MODEL);
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt ?? "");
  const [maxToolCalls, setMaxToolCalls] = useState(
    agent?.policy_scope.max_tool_calls?.toString() ?? "20"
  );
  const [maxCostPerRun, setMaxCostPerRun] = useState(
    agent?.policy_scope.max_cost_per_run_usd?.toString() ?? "2.00"
  );
  const [selectedTools, setSelectedTools] = useState<Set<string>>(
    new Set(agent?.policy_scope.allowed_tools ?? [])
  );
  const [error, setError] = useState<string | null>(null);

  const { data: tools, isLoading: toolsLoading } = useAvailableTools();
  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const toggleTool = (toolId: string) => {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) next.delete(toolId);
      else next.add(toolId);
      return next;
    });
  };

  const toolsByService = (tools ?? []).reduce<Record<string, typeof tools>>((acc, tool) => {
    (acc[tool.service] ??= []).push(tool);
    return acc;
  }, {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (systemPrompt.trim().length < MIN_SYSTEM_PROMPT_LEN) {
      setError(`System prompt must be at least ${MIN_SYSTEM_PROMPT_LEN} characters`);
      return;
    }
    if (selectedTools.size === 0) {
      setError("Select at least one allowed tool");
      return;
    }

    const costCap = maxCostPerRun ? parseFloat(maxCostPerRun) : undefined;
    if (costCap !== undefined && (Number.isNaN(costCap) || costCap <= 0)) {
      setError("Max cost per run must be a positive number");
      return;
    }
    const toolCallCap = maxToolCalls ? parseInt(maxToolCalls, 10) : undefined;
    if (toolCallCap !== undefined && (Number.isNaN(toolCallCap) || toolCallCap <= 0)) {
      setError("Max tool calls must be a positive number");
      return;
    }

    const input: AgentFormInput = {
      name,
      description: description || undefined,
      agent_type: agentType,
      model: model || undefined,
      system_prompt: systemPrompt,
      policy_scope: {
        allowed_tools: Array.from(selectedTools),
        max_tool_calls: toolCallCap,
        max_cost_per_run_usd: costCap,
      },
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: agent.id, input },
        {
          onSuccess: () => {
            toast.success("Agent updated");
            router.push("/agents");
          },
          onError: (err) => setError(err.message),
        }
      );
    } else {
      createMutation.mutate(input, {
        onSuccess: () => {
          toast.success("Agent created");
          router.push("/agents");
        },
        onError: (err) => setError(err.message),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="agent-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Name
          </label>
          <input
            id="agent-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Finance Agent"
            className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>

        <div>
          <label htmlFor="agent-type" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Type
          </label>
          <select
            id="agent-type"
            value={agentType}
            onChange={(e) => setAgentType(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            <option value="specialist">Specialist</option>
            <option value="orchestrator">Orchestrator</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="agent-description" className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Description <span className="text-muted-foreground/60">(optional)</span>
        </label>
        <input
          id="agent-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this agent do?"
          className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      <div>
        <label htmlFor="agent-model" className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Model
        </label>
        <input
          id="agent-model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={DEFAULT_MODEL}
          className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <label htmlFor="agent-system-prompt" className="block text-xs font-medium text-muted-foreground">
            System prompt
          </label>
          <span
            className={`text-xs ${
              systemPrompt.trim().length < MIN_SYSTEM_PROMPT_LEN ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {systemPrompt.trim().length} / {MIN_SYSTEM_PROMPT_LEN} min
          </span>
        </div>
        <textarea
          id="agent-system-prompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          required
          rows={5}
          placeholder="You are a finance agent that helps founders understand their revenue metrics..."
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Policy</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="max-tool-calls" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Max tool calls per run
            </label>
            <input
              id="max-tool-calls"
              type="number"
              min={1}
              value={maxToolCalls}
              onChange={(e) => setMaxToolCalls(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div>
            <label htmlFor="max-cost" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Max cost per run (USD)
            </label>
            <input
              id="max-cost"
              type="number"
              min={0.01}
              step={0.01}
              value={maxCostPerRun}
              onChange={(e) => setMaxCostPerRun(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Allowed tools</label>
          {toolsLoading ? (
            <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading tool catalog…
            </div>
          ) : !tools || tools.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
              No tools available yet — connect an integration first.
            </p>
          ) : (
            <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border border-border p-3">
              {Object.entries(toolsByService).map(([service, serviceTools]) => (
                <div key={service}>
                  <p className="mb-1 text-xs font-medium capitalize text-foreground">
                    {service.replace(/_/g, " ")}
                  </p>
                  <div className="space-y-1.5">
                    {serviceTools?.map((tool) => (
                      <label
                        key={tool.tool_id}
                        className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 hover:bg-accent/40"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTools.has(tool.tool_id)}
                          onChange={() => toggleTool(tool.tool_id)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-input"
                        />
                        <span className="text-sm">
                          <span className="text-foreground">{tool.name}</span>
                          <span className="ml-1.5 text-xs text-muted-foreground">{tool.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={() => router.push("/agents")}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isEditing ? (
            "Save changes"
          ) : (
            "Create agent"
          )}
        </Button>
      </div>
    </form>
  );
}
