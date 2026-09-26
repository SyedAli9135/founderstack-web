"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCreateClientWorkspace, useSwitchWorkspace } from "@/hooks/usePortfolio";

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60";

export default function NewClientWorkspacePage() {
  const router = useRouter();
  const create = useCreateClientWorkspace();
  const { switchTo } = useSwitchWorkspace();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the workspace a name — usually the client's company name.");
      return;
    }
    setError(null);
    create.mutate(
      { name: trimmed, ...(email.trim() ? { client_contact_email: email.trim() } : {}) },
      {
        onSuccess: (ws) => {
          toast.success(`${ws.name} is ready`, {
            description: "Switch into it to connect the client's key and tools.",
            action: { label: "Open", onClick: () => void switchTo(ws.clerk_org_id) },
          });
          router.push("/practice");
        },
        onError: (err) => setError(err.message),
      }
    );
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/practice" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Portfolio
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Add client workspace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A separate, fully isolated workspace for one client. Billing stays with your practice.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div>
          <label htmlFor="client-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Client name
          </label>
          <input
            id="client-name"
            autoFocus
            maxLength={255}
            placeholder="Acme Inc."
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            disabled={create.isPending}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="client-email" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Client contact email <span className="font-normal">(optional)</span>
          </label>
          <input
            id="client-email"
            type="email"
            placeholder="founder@acme.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            disabled={create.isPending}
            className={inputClass}
          />
        </div>

        {error && (
          <p className="flex items-start gap-1.5 text-xs text-destructive">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/practice">Cancel</Link>
          </Button>
          <Button type="submit" size="sm" className="gap-1.5" disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create workspace
          </Button>
        </div>
      </form>
    </div>
  );
}
