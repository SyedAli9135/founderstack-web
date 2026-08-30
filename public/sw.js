// Workflow 10's Web Push service worker — the one piece of the approval
// flow that has to run outside the Next.js app entirely. A service
// worker's notificationclick handler has no access to page JS state (no
// live Clerk session, no NEXT_PUBLIC_* env vars baked in at build time),
// so it can't call the backend the way the rest of the app does. It
// works two ways instead:
//   1. The push payload itself carries ready-to-POST approve_url/
//      reject_url — full URLs already signed with a single-purpose action
//      token (see founderstack-api-go's internal/core/notify package),
//      built server-side because this file has no build-time access to
//      NEXT_PUBLIC_API_URL.
//   2. Clicking the notification body (not an action button) just opens/
//      focuses the app at /approvals — the normal authenticated path.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Approval needed", {
      body: payload.body || "",
      data: payload,
      tag: payload.approval_id, // a re-sent notification for the same approval replaces, not stacks
      actions: [
        { action: "approve", title: "✅ Approve" },
        { action: "reject", title: "❌ Reject" },
      ],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  const payload = event.notification.data || {};
  event.notification.close();

  if (event.action === "approve" || event.action === "reject") {
    const url = event.action === "approve" ? payload.approve_url : payload.reject_url;
    if (!url) return;

    // A reject tapped straight from the notification has no way to
    // collect a reason — the backend requires a non-empty one, so this
    // sends a fixed, honest default rather than failing silently.
    const body =
      event.action === "reject" ? JSON.stringify({ reason: "Rejected via push notification" }) : undefined;

    event.waitUntil(
      fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
      }).catch(() => {
        // Nothing to recover to from inside a service worker — the
        // approval just stays pending, visible (and still actionable) in
        // the app's own /approvals page.
      })
    );
    return;
  }

  // Default click (the notification body, not an action button): open or
  // focus the app.
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/approvals");
    })
  );
});
