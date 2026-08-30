<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FounderStack Web

Frontend for FounderStack (Next.js 16/Turbopack, React 19, Tailwind v4, shadcn `base-nova`, Clerk
auth), built against `../founderstack-api-go`'s wire contract (originally the Python
`../founderstack-api`'s, unchanged when the backend was rewritten). See
`../WORKFLOW_PLAN_GO.md` for the full workflow-by-workflow spec, and the Go backend's own
`CLAUDE.md` for the API surface this consumes.

## Design system

Minimal, cool-neutral + deep-teal token system (`src/app/globals.css`), deliberately *not* a
generic "AI dashboard" template — dark-mode-first, `--primary: #0b6b57`. Check
`globals.css`'s token definitions before reaching for a raw Tailwind color; a status/semantic
color not already in the palette (e.g. the amber used for "awaiting approval") is added as a
literal Tailwind class at the call site rather than a new named token, to keep the palette itself
small. `tw-animate-css` is available for entrance/exit animation utilities
(`animate-in fade-in slide-in-from-*`) — used e.g. for new rows appearing in the live event feed.

## Workflow 9 — live run tracking (`src/hooks/useWorkflowStream.ts`,
`src/components/workflows/{AgentPipeline,LiveFeed}.tsx`, `src/app/(app)/runs/`)

The workflows list's "Run now" button launches a real run (`POST /workflows/{id}/run`) and
navigates straight to `/runs/{id}`, which live-streams the run via SSE while it's in flight and
shows the persisted summary once it's terminal.

**SSE is hand-rolled, not the browser's native `EventSource`** — `EventSource` has no way to send
an `Authorization` header, and this backend's stream endpoint needs the same Clerk-JWT-as-Bearer
auth every other request does. `useWorkflowStream` is `fetch` + a manual `ReadableStream` reader
parsing `event: <type>\ndata: <json>\n\n` frames.

**Two real, non-obvious frontend-only bugs, found and fixed 2026-08-28 by actually driving the
UI in a real browser (Claude-in-Chrome) rather than trusting `tsc`/`lint`/`build`** — neither
catchable by any unit or integration test, since both are "does the live SSE UI reflect live
state correctly" bugs:

1. **Stale status badge during an approval pause.** `runs/[id]/page.tsx`'s REST-refetch
   `useEffect` only invalidated the `useRun` query on the SSE stream's `complete`/`error` events —
   not `approval_required`, which moves `workflow_runs.status` to `'awaiting_approval'` server-
   side. The pipeline card (driven directly off live SSE `data`) correctly showed "Waiting on
   approval," but the header badge above it (driven off the separate REST `useRun` query) stayed
   stuck on whatever status the page had when it first mounted. Fixed by adding
   `approval_required` to the invalidation condition.
2. **No pipeline/activity state for a run whose live events arrived late or never.**
   `Engine.Bus` (the backend's pub/sub) never replays past events to a late subscriber, and
   `isLive = LIVE_STATUSES.includes(run.status)` only attaches the SSE stream when the run is
   still `pending`/`running`/`awaiting_approval` *at page-mount time* — so a run that finished
   before the page finished loading (very common: most mock runs complete in 1-4s, and browser
   navigation + React mount + fetch handshake isn't instant) showed **zero** pipeline progress and
   a misleading "Waiting for the first event…" message, even though the run had actually
   completed successfully. Fixed two ways: (a) `GET /runs/{id}` now returns `current_node`
   (backend: added to `GetRunDetail`/`runDetail`), and `AgentPipeline.tsx` accepts
   `finalStatus`/`finalNode` props, merging a REST-derived backfill status map *underneath*
   whatever live SSE events actually arrived (live data always wins where present) — exact for a
   `completed` run (the pipeline is strictly sequential, so `completed` implies all 4 nodes
   finished), best-known-stopping-point for `failed`/`cancelled` (only the nodes strictly before
   `current_node` are marked done, `current_node` itself is marked failed, later nodes stay
   honestly "unknown/pending" rather than guessed). (b) `LiveFeed.tsx` takes an `isLive` prop and
   shows a different, honest empty-state message ("this run already finished before the live view
   connected") instead of "Waiting for the first event…" when `isLive === false`.

**`AgentPipeline.tsx`** renders the 4 nodes actually built server-side
(`planner`/`executor`/`validator`/`reporter` — no `rag_retriever` yet), each a card with
pending/active/completed/failed states (lucide icons + the token palette, not a
glow-ring/pulse-animation look). Shows a "Waiting on approval" panel when the run has suspended;
as of workflow 10 the actual decision controls render just below it — see that section.

**`LiveFeed.tsx`** is the auto-scrolling raw event log behind the pipeline's summarized state.
As of 2026-08-28 it renders two additional event types beyond the original
node/tool-call/error/complete set, both added once the backend started actually emitting them:
- **`reasoning`** — the model's own text/intent on a turn, including turns that also request a
  tool call (real providers, e.g. Anthropic, commonly return both together — this was already
  captured backend-side but never surfaced until now). Rendered as its own visually distinct row
  (italic text, sparkle icon, a subtle `border-primary/30` left accent) — deliberately different
  styling from the mechanical node/tool lines around it, so a founder can tell "what the agent is
  thinking" apart from "what the harness is doing" at a glance.
- **`tool_result`** now carries the tool's actual (truncated) output text, not just a bare
  `is_error` flag. Rendered collapsed by default (click-to-expand, keeps the feed scannable) —
  expands into a monospace `<pre>` box showing the real content.

**Known, deliberate gaps** (not oversights — each was checked against what the backend actually
sends): no per-run custom-input textarea (`POST .../run` has no field to receive one — the
existing "Run now" button uses the workflow's stored `task_input_template`, unchanged), no live
per-token counter (no `ChatClient` adapter streams token-by-token — all 3 are single blocking
calls), no markdown rendering of `run.output` (plain `whitespace-pre-wrap`, no markdown dependency
installed for this alone yet).

**Verification method**: this frontend's workflow-9 UI is normally exercised against
`MOCK_LLM_MODE=true` on the Go backend (no real BYOK key needed) — see
`founderstack-api-go/MOCK_LLM_TESTING.md` and its `mock:*` scenario catalog (23 scenarios as of
2026-08-28, one `[TEST] *` workflow per scenario in the founder's real dev org, covering every
MCP tool except LinkedIn's `draft_post`). Prefer clicking through a `[TEST] *` workflow's "Run
now" button over writing new frontend tests for this feature — the real value here is confirming
the live SSE UI behaves correctly against a real running backend, which is exactly what a unit
test can't catch (see the two bugs above, neither of which any existing test suite found).

## Workflow 10 — approval decisions (`src/hooks/useApprovals.ts`, `src/hooks/usePushSubscription.ts`,
`src/components/approvals/{ApprovalCard,PushPermissionPrompt}.tsx`, `src/app/(app)/approvals/`,
`src/app/(app)/settings/notifications/page.tsx`, `public/sw.js`)

**`/settings/notifications` (added 2026-08-30, a real gap caught by the founder, not built in the
original pass)** — the backend's `GET/PUT /api/v1/settings/approvals` endpoint existed from the
start of this workflow, but nothing in the frontend ever called it; the only way to set an org's
approvals Slack channel was a raw `curl`. `src/hooks/useApprovalSettings.ts` +
`settings/notifications/page.tsx` close that: a plain text input (channel name or ID) + Save,
plus the same push-notification "Enable" control `PushPermissionPrompt` uses, reachable from the
sidebar's Settings section. The input intentionally isn't seeded via a `useEffect` (`value =
edited ?? data?.slack_channel_id ?? ""`, `edited` starts `undefined`) — this codebase already hit
the `react-hooks/set-state-in-effect` lint rule once during workflow 9 and the fix here avoids
re-hitting it, not just working around a lint error blind.

Closes workflow 9's own "approving or rejecting isn't available from this page yet" gap.
`ApprovalCard` is used two ways from one component: inline on a live run
(`runs/[id]/page.tsx`, built straight from the `approval_required` SSE event's data — no extra
`GET /approvals/{id}` fetch, since the backend's `ApprovalRequiredData` and `approvalSummary` are
wire-identical) and on `/approvals` (built from `GET /approvals` rows, tabbed Pending/Past). A
decided card (on `/approvals`, `status !== "pending"`) is wrapped in a `Link` out to its run;
a still-pending card never is — its own Approve/Reject buttons would otherwise nest inside the
anchor, which is invalid HTML and would fire an unwanted navigation on every click (caught before
it shipped, not live).

**A real, non-obvious bug found live 2026-08-30, the same way workflow 9's two bugs were —
`tsc`/lint/build all stayed green through it.** `useApprovals.ts`'s `useDecideApproval` originally
attempted an optimistic update: on `onMutate`, `queryClient.setQueriesData({queryKey:
["approvals"]}, (old) => old?.filter(...))`. This throws — `old?.filter is not a function` — the
instant `useApproval(id)`'s single-approval detail query (`["approvals", id]`, cache value a bare
`Approval` object) is also mounted, since the partial key `["approvals"]` matches *every*
query prefixed with it, including that one, and an object has no `.filter`. Worse than a visible
crash: **React Query calls `onMutate` before `mutationFn`**, so a thrown `onMutate` aborts the
mutation before the real `fetch` ever runs — Approve/Reject looked like they simply did nothing
(no network request at all, confirmed via the browser's own network panel), with no console error
and no toast, since the failure happens before any of that machinery runs. Root cause: the
optimistic-update code assumed the cache's value was the *selected* shape (`Approval[]`, what
`useQuery`'s `select` option hands to a component) rather than its *real* raw shape (the API
envelope, `{ approvals: Approval[] }` for the list queries) — `select` transforms what a
component reads, never what's actually stored in the cache `setQueriesData`/`getQueriesData`
operate on. Fixed by dropping the optimistic update entirely, matching `useRuns.ts`'s
`useCancelRun` (which never attempted one for the same reason) — `onSuccess` just invalidates
`["approvals"]` and `["runs"]`. Live-verified afterward end-to-end: a real `[TEST] approval` run's
Approve resumed it to a completed refund; a fresh run's Reject-with-a-typed-reason resumed it to
"Run stopped: ... Reason: \<the typed reason\>" with `tool_call_count: 0`.

**The push notification's Approve/Reject buttons work without opening the app — `public/sw.js`,
not React.** A service worker's `notificationclick` handler has no access to page JS state (no
live Clerk session, no `NEXT_PUBLIC_*` env vars baked into a static file at build time), so it
can't call the backend the normal authenticated way. The push payload itself carries full,
ready-to-POST `approve_url`/`reject_url` (already signed with a single-purpose action token) built
server-side (`founderstack-api-go`'s `internal/core/notify` — see that repo's `CLAUDE.md`) — the
service worker's `notificationclick` handler just `fetch()`s whichever URL matches the tapped
action, with a fixed default reason (`"Rejected via push notification"`) on reject, since there's
no UI in a notification to collect one. Clicking the notification body itself (not an action
button) opens/focuses `/approvals` instead — the normal authenticated path.
`usePushSubscription.ts` registers the worker, requests permission, and POSTs the resulting
`PushSubscription` to `/settings/push-subscription`; `NEXT_PUBLIC_VAPID_PUBLIC_KEY` must match the
backend's `WEBPUSH_VAPID_PUBLIC_KEY` (same keypair) or every `subscribe()` call fails silently
against the browser's push service. `PushPermissionPrompt` is a dismissible bottom-right banner
(not a modal), shown 30s after the app shell mounts, once per browser via a `localStorage` flag —
per-viewer convenience state, not synced anywhere, matching this codebase's own guidance on what
`localStorage` is and isn't for.

**Known, deliberate gaps**: no Slack-native interactive Approve/Reject buttons (notification-only
by design — see `founderstack-api-go/CLAUDE.md`'s Workflow 10 section for why); no broader
"what's my agent up to" activity feed beyond approvals themselves (explicitly deferred, a
separate, smaller feature).

**Verification method**: same as workflow 9 — `MOCK_LLM_MODE=true`, the existing `[TEST]
approval` mock-scenario workflow, driven through the real browser UI (both a full approve and a
full reject leg, not just one). Email (Brevo) and push delivery themselves need real
`BREVO_API_KEY`/`WEBPUSH_VAPID_*` credentials neither server has configured yet in this
environment — the decision *mechanism* (this section's bug and fix) is what's been live-verified;
actual email/push delivery still needs a real account signed up and configured to verify further.
