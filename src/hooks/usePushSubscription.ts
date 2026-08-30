"use client";

import { useCallback, useState } from "react";
import { useApiClient } from "@/lib/api/client";

// urlBase64ToUint8Array converts a VAPID public key (base64url, no
// padding — the format the Web Push spec and every VAPID key generator
// produce) into the raw Uint8Array pushManager.subscribe expects.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}

export type PushSubscriptionState = "unsupported" | "default" | "granted" | "denied" | "subscribing" | "subscribed";

// usePushSubscription is the workflow-10 counterpart to Slack/email
// notifications: registers public/sw.js, requests browser permission, and
// hands the resulting PushSubscription to the backend so
// notify.WebPushSender has somewhere to deliver an approval notification's
// Approve/Reject action buttons to. NEXT_PUBLIC_VAPID_PUBLIC_KEY must
// match the backend's WEBPUSH_VAPID_PUBLIC_KEY (internal/config/config.go)
// — different keypairs on each side would make every subscribe call fail
// silently against a push service that rejects the mismatched key.
export function usePushSubscription() {
  const api = useApiClient();
  const [state, setState] = useState<PushSubscriptionState>(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      return "unsupported";
    }
    return Notification.permission as PushSubscriptionState;
  });

  const subscribe = useCallback(async () => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey || state === "unsupported") return;

    setState("subscribing");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission as PushSubscriptionState);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // TS's DOM lib types applicationServerKey as BufferSource, which a
        // plain Uint8Array<ArrayBufferLike> (what .from returns) doesn't
        // structurally satisfy in current TS — the runtime value is fine,
        // this cast only works around the type-level mismatch.
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const json = subscription.toJSON();

      await api.post("/settings/push-subscription", {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      });
      setState("subscribed");
    } catch {
      // A denied/failed subscribe degrades to "no push notifications for
      // this browser" — Slack/email/the in-app approvals page are still
      // there, so this is never the only way to find out about a pending
      // approval.
      setState("default");
    }
  }, [api, state]);

  return { state, subscribe };
}
