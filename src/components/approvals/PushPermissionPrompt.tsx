"use client";

import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/hooks/usePushSubscription";

const DISMISSED_KEY = "founderstack.push-prompt-dismissed";

// PushPermissionPrompt is a small dismissible banner, not a modal — shown
// 30s after the app shell mounts (not on first paint, so it doesn't
// compete with whatever a founder actually opened the app to do), once
// per browser via localStorage. Per-viewer convenience state, correctly
// scoped: this codebase's own Artifact/browser-storage guidance is that
// localStorage is for exactly this kind of "don't re-prompt" flag, not for
// anything that must persist reliably or sync across devices.
export function PushPermissionPrompt() {
  const { state, subscribe } = usePushSubscription();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (state === "unsupported" || state === "granted" || state === "subscribed" || state === "denied") return;
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return;
    } catch {
      // Storage inaccessible (private window, blocked site data) — fall
      // through and show the prompt; worst case it re-appears next visit.
    }
    const timer = setTimeout(() => setVisible(true), 30_000);
    return () => clearTimeout(timer);
  }, [state]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Non-fatal — see the read-side comment above.
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-lg">
      <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">Get notified about approvals</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Turn on browser notifications so you can approve or reject an agent&apos;s action from
          your phone or desktop without opening the app.
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            disabled={state === "subscribing"}
            onClick={async () => {
              await subscribe();
              dismiss();
            }}
          >
            Enable notifications
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss}>
            Not now
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
