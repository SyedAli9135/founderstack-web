"use client";

import { useState } from "react";
import { useApprovalSettings, useUpdateApprovalSettings } from "@/hooks/useApprovalSettings";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import {
  useDigestSettings,
  useUpdateDigestSettings,
  useSendTestDigest,
} from "@/hooks/useDigestSettings";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Hash, BellRing, CheckCircle2, Mail } from "lucide-react";

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

// Not exhaustive (no IANA-zone-picker library is installed anywhere in
// this app) — a curated set of common zones, plus whatever the org's
// saved value or the browser's own detected zone already is, appended so
// neither ever silently disappears from the list.
const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Moscow",
  "Africa/Cairo",
  "Africa/Lagos",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => {
  const period = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
});

function DailyDigestCard() {
  const { data, isLoading } = useDigestSettings();
  const update = useUpdateDigestSettings();
  const sendTest = useSendTestDigest();

  // Same "no useEffect sync" shape as SlackChannelForm above — undefined
  // until the founder actually touches a control, falling back to the
  // saved value (or a browser-detected default for timezone specifically)
  // straight from the query in the meantime.
  const [enabled, setEnabled] = useState<boolean | undefined>(undefined);
  const [hour, setHour] = useState<number | undefined>(undefined);
  const [timezone, setTimezone] = useState<string | undefined>(undefined);

  const browserTimezone =
    typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const effectiveEnabled = enabled ?? data?.digest_enabled ?? true;
  const effectiveHour = hour ?? data?.digest_send_hour ?? 8;
  const effectiveTimezone = timezone ?? data?.digest_timezone ?? browserTimezone;
  const timezoneOptions = COMMON_TIMEZONES.includes(effectiveTimezone)
    ? COMMON_TIMEZONES
    : [effectiveTimezone, ...COMMON_TIMEZONES];

  const save = (next: { enabled: boolean; hour: number; timezone: string }) => {
    update.mutate(
      { digest_enabled: next.enabled, digest_send_hour: next.hour, digest_timezone: next.timezone },
      {
        onSuccess: () => toast.success("Digest settings saved"),
        onError: (err) => toast.error("Could not save", { description: err.message }),
      },
    );
  };

  const handleToggle = () => {
    const next = !effectiveEnabled;
    setEnabled(next);
    save({ enabled: next, hour: effectiveHour, timezone: effectiveTimezone });
  };

  const handleHourChange = (next: number) => {
    setHour(next);
    save({ enabled: effectiveEnabled, hour: next, timezone: effectiveTimezone });
  };

  const handleTimezoneChange = (next: string) => {
    setTimezone(next);
    save({ enabled: effectiveEnabled, hour: effectiveHour, timezone: next });
  };

  const handleSendTest = () => {
    sendTest.mutate(undefined, {
      onSuccess: () => toast.success("Check your inbox!", { description: "Test digest sent." }),
      onError: (err) => toast.error("Could not send test email", { description: err.message }),
    });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-foreground">Daily email digest</h2>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={effectiveEnabled}
          onClick={handleToggle}
          disabled={update.isPending}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
            effectiveEnabled ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform ${
              effectiveEnabled ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        A morning email showing what your agents did yesterday — runs completed, hours saved,
        cost incurred, and pending approvals — sent to org owners and admins.
      </p>

      {effectiveEnabled && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Send at</span>
          <select
            value={effectiveHour}
            onChange={(e) => handleHourChange(Number(e.target.value))}
            disabled={update.isPending}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {HOUR_LABELS.map((label, h) => (
              <option key={h} value={h}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={effectiveTimezone}
            onChange={(e) => handleTimezoneChange(e.target.value)}
            disabled={update.isPending}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {timezoneOptions.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={handleSendTest} disabled={sendTest.isPending}>
          {sendTest.isPending ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
          Send test email
        </Button>
        <p className="text-xs text-muted-foreground">
          Builds and sends a real digest for yesterday to your own email right now.
        </p>
      </div>

      {effectiveEnabled && <DigestPreview />}
    </div>
  );
}

// A static mockup, not fetched from real data — matches the plan's own
// "preview section" acceptance item without pretending to be the actual
// send (that's what "Send test email" above is for).
function DigestPreview() {
  return (
    <div className="mt-4 overflow-hidden rounded-md border border-border">
      <div className="bg-foreground/90 px-3 py-2 text-xs font-medium text-background">
        FounderStack
      </div>
      <div className="space-y-2 bg-background p-3">
        <p className="text-xs font-medium text-foreground">Your digest for Monday, Jan 5</p>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Runs completed</span>
            <span className="text-foreground">12 (11 succeeded, 1 failed)</span>
          </div>
          <div className="flex justify-between">
            <span>Hours saved</span>
            <span className="text-foreground">4.5</span>
          </div>
          <div className="flex justify-between">
            <span>Cost incurred</span>
            <span className="text-foreground">$1.82</span>
          </div>
        </div>
        <div className="rounded bg-primary/10 px-2 py-1.5 text-xs text-primary">
          2 approvals waiting on you
        </div>
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
          Choose how you hear about pending approvals and daily activity.
        </p>
      </div>

      <div className="space-y-4">
        <SlackChannelForm />
        <PushNotificationsCard />
        <DailyDigestCard />
      </div>
    </div>
  );
}
