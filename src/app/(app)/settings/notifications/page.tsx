"use client";

import { useState } from "react";
import { useApprovalSettings, useUpdateApprovalSettings } from "@/hooks/useApprovalSettings";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Hash, BellRing, CheckCircle2 } from "lucide-react";

function SlackChannelForm() {
  const { data, isLoading } = useApprovalSettings();
  const update = useUpdateApprovalSettings();
  // undefined until the founder actually types — the input then falls back
  // to rendering the saved value straight from the query, no effect needed
  // to "sync" it in (the react-hooks/set-state-in-effect anti-pattern this
  // codebase's own workflow-9 build already hit once).
  const [edited, setEdited] = useState<string | undefined>(undefined);
  const channel = edited ?? data?.slack_channel_id ?? "";

  const handleSave = () => {
    const trimmed = channel.trim();
    update.mutate(trimmed, {
      // Pin the input to exactly what was just saved rather than clearing
      // back to `undefined` — the background refetch this triggers hasn't
      // necessarily landed yet, and resetting to undefined would
      // momentarily fall back to the pre-save value until it does.
      onSuccess: () => {
        setEdited(trimmed);
        toast.success("Approvals Slack channel saved");
      },
      onError: (err) => toast.error("Could not save", { description: err.message }),
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Hash className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">Slack channel for approvals</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        When an agent needs your approval — a refund, a public post — a message posts here. Your
        FounderStack Slack app must already be a member of this channel (invite it with{" "}
        <code className="rounded bg-muted px-1 py-0.5">/invite @FounderStack</code> in Slack
        first), or messages will fail to send.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          value={channel}
          onChange={(e) => setEdited(e.target.value)}
          placeholder="#approvals or a channel ID (e.g. C0123456789)"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button onClick={handleSave} disabled={update.isPending || channel.trim() === ""}>
          {update.isPending ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
          Save
        </Button>
      </div>
      {data?.slack_channel_id && (
        <p className="mt-2 flex items-center gap-1 text-xs text-primary">
          <CheckCircle2 className="h-3 w-3" />
          Saved: {data.slack_channel_id}
        </p>
      )}
    </div>
  );
}

function PushNotificationsCard() {
  const { state, subscribe } = usePushSubscription();

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <BellRing className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">Browser push notifications</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Get a notification on this device when an agent needs approval, with one-tap Approve/
        Reject buttons that work without opening the app.
      </p>

      <div className="mt-4">
        {state === "unsupported" && (
          <p className="text-xs text-muted-foreground">Not supported in this browser.</p>
        )}
        {state === "subscribed" && (
          <p className="flex items-center gap-1 text-xs text-primary">
            <CheckCircle2 className="h-3 w-3" />
            Enabled on this browser
          </p>
        )}
        {state === "denied" && (
          <p className="text-xs text-destructive">
            Blocked — enable notifications for this site in your browser&apos;s settings, then reload.
          </p>
        )}
        {/* "granted" is included here, not treated as done: the browser
            permission can be granted from an earlier visit while no
            PushSubscription has ever actually been registered with our
            backend — only "subscribed" means the full flow completed. */}
        {(state === "default" || state === "granted" || state === "subscribing") && (
          <Button size="sm" disabled={state === "subscribing"} onClick={() => subscribe()}>
            {state === "subscribing" ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
            Enable notifications
          </Button>
        )}
      </div>
    </div>
  );
}

export default function NotificationSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how you hear about pending approvals.
        </p>
      </div>

      <div className="space-y-4">
        <SlackChannelForm />
        <PushNotificationsCard />
      </div>
    </div>
  );
}
