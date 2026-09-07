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

## Workflow 11 — run trace & cost (`src/components/workflows/RunTimeline.tsx`,
`src/components/analytics/CostBreakdown.tsx`, `src/app/(app)/runs/[id]/page.tsx`)

Adds a persisted trace and a per-run cost breakdown below the existing live SSE feed on a run's
detail page — `RunTimeline` reads `GET /runs/{id}/steps` once (works for a run that already
finished before the page loaded, unlike the SSE feed which only ever shows events that arrived
while connected), `CostBreakdown` reads `GET /runs/{id}/cost`. Both are plain `useQuery` calls
(`useRunSteps`/`useRunCost` in `src/hooks/useRuns.ts`), refetched via the same prefix-match
`invalidateQueries(["runs", id])` the run-status effect already fires on `complete`/`error`/
`approval_required` — no new invalidation wiring needed, React Query's default `exact: false`
already covers the nested query keys.

**`CostBreakdown` is a horizontal segmented bar, not the donut chart `WORKFLOW_PLAN_GO.md`
literally specifies** — a deliberate deviation, confirmed with the founder before finalizing
("what do you think is best?" → founder agreed to keep the bar). The dataviz skill's own guidance
recommends a stacked bar over a pie/donut for a 2-4-category part-to-whole breakdown; a donut
would have matched the plan's wording but been the objectively weaker chart for this exact shape
of data. Color is assigned by a **fixed per-`cost_type` slot** (`llm_inference` → `--chart-1`,
`tool_call` → `--chart-2`, etc.), never by sort/rank order — coloring nominal categories by
whichever one happens to be biggest in a given run is a real accessibility anti-pattern (implies a
false ordinal relationship between categories that have none). This repurposed the app's
`--chart-1..4` tokens (`src/app/globals.css`) from an unused monochromatic teal ramp — appropriate
for *sequential* (magnitude) data, wrong for *categorical* (identity) data like cost types — to a
validated categorical palette, checked against this app's own light/dark card surfaces via the
dataviz skill's validator script before committing to the hex values.

**Verification method**: `tsc`/`lint`/`build` all pass clean. Backend side (the `workflow_steps`
persistence gap this closes, the PII sanitizer, `hours_saved`) is documented in
`founderstack-api-go/CLAUDE.md`'s "View Run Trace & Cost (workflow 11)" section.

## Workflow 12 — document search (`src/components/documents/DocumentSearch.tsx`,
`src/components/documents/DocumentUploader.tsx`, `src/app/(app)/documents/page.tsx`)

A search bar above the documents table (`useSearchDocuments`, a `useMutation` in
`src/hooks/useDocuments.ts` — explicit-submit driven, not a `useQuery`-by-key the way the
documents list is, since search shouldn't refetch on its own). Submitting a query replaces the
table with a results list (`SearchResultCard`: filename, category badge, a relevance score
meter, and the matched query terms highlighted via a small client-side regex — the backend
doesn't return match spans, just the excerpt text); clearing the query returns to the normal
table view. A "⚡ From cache" label renders when the backend's response carries `from_cache: true`.

**No skeleton-placeholder loading state, unlike the plan's literal wording** — this app has no
skeleton component anywhere; every existing list page (documents, agents, approvals, runs) uses
the same centered `Loader2` spinner, so the search results area matches that established
convention instead of introducing a new loading-state style for one feature.

**`DocumentUploader.tsx` gained an "Owner only — hide from other members" checkbox**, sending the
new `visibility` form field `POST /documents/upload` now accepts — the ACL primitive this
workflow's search endpoint enforces (`documents.visibility`, added in `founderstack-api-go`, no
frontend-facing concept before this). The documents table shows a small lock icon next to an
owner-only file's name.

**Verification method**: `tsc`/`lint`/`build` all pass clean, but **this UI was not visually
verified in a real browser this session** — Claude-in-Chrome was fully disconnected (not the
usual flaky-reconnect issue seen in earlier sessions, genuinely not connected at all), so the
founder ran their own manual pass (uploading a real multi-section sample policy document and
trying a range of literal, paraphrased, and no-match queries) instead of a live-browser check
here. Backend side (the ACL/cache-isolation/audit-log bugs found and fixed, real end-to-end
timing against live Cohere/Pinecone/Redis) is documented in `founderstack-api-go/CLAUDE.md`'s
"Search Knowledge Base / RAG Query (workflow 12)" section.

## Workflow 13 — team members & roles (`src/hooks/useTeam.ts`,
`src/app/(app)/settings/team/page.tsx`)

`usePermissions()` is the one new piece every permission-gated page in this app now depends on —
it derives the signed-in user's own role by matching Clerk's own `useUser().user.id` against
`GET /org/members`'s member list (`clerk_user_id` field), not a separate `/org/me` endpoint. No
new endpoint was needed: every page that gates on permissions also needs the team roster fetched
anyway, and React Query dedupes the underlying `["org", "members"]` query across every caller.
Returns `{ role, isOwnerOrAdmin, canModifyAgents, canModifyWorkflows, canTriggerWorkflows,
canManageAPIKeys, canManageIntegrations, isLoading }` — `canModifyAgents`/`canModifyWorkflows`/
`canTriggerWorkflows` are pure functions of `role` (mirroring `authctx.User`'s own Go-side helpers
exactly — `canModifyWorkflows` added 2026-09-07 alongside the backend's own
`CanModifyWorkflows()`, see that section's write-up in `founderstack-api-go/CLAUDE.md`),
`canManageAPIKeys`/`canManageIntegrations` read the member's own boolean flags from the API
response.

**"Invite Member" opens Clerk's real `<OrganizationProfile />` modal** (`useClerk()
.openOrganizationProfile()`), not a custom invite form — this app has never used any Clerk
organization UI before (`<OrganizationSwitcher>`, `<OrganizationProfile>`, `useOrganization()`
were all unused prior to this workflow; the app's only prior Clerk usage was `<ClerkProvider>`,
the sign-in/sign-up pages, and `<UserButton>`), but Clerk already owns the real invite-email flow
end to end, so no reason to rebuild it just to stay "consistent" with this app's own custom-UI
convention elsewhere.

**`/settings/team`'s table**: avatar (Clerk-hosted image if `avatar_url` is set, else initials —
first-plus-last-name or the first 2 characters of the email), name/email, a role dropdown (only
rendered for an owner/admin viewing someone *else's* row — the signed-in user's own row always
shows a plain badge, matching the backend's own "cannot remove/demote yourself via this endpoint"
guard), last login (formatted date or "Never" — `last_login_at` had no write path anywhere before
this workflow, see `founderstack-api-go/CLAUDE.md`'s Workflow 13 section), and a remove button
with the same inline-confirm pattern `DocumentRow`/`AgentCard` already use elsewhere in this app.
Removal is a plain `invalidateQueries` on success, not an optimistic update — this codebase's own
established caution after workflow 10's `onMutate`-before-`mutationFn` bug (see this file's own
Workflow 10 section).

**Enforcement added to 2 other pages, both new to this workflow** (neither page gated on
permissions before this): `/agents` hides "New agent," an agent card's Edit/Delete controls (shows
"View only" instead) for anyone without `canModifyAgents`; `/workflows` hides "Run now" for a
viewer (`canTriggerWorkflows`). Both are the FE mirror of a real backend 403 — a viewer/member
who bypasses the UI (a direct API call, or navigating straight to `/agents/new`) still gets
blocked server-side; this is convenience/clarity in the UI, not the actual enforcement boundary.
`/agents/new` itself is not separately guarded against direct navigation — a viewer who navigates
there directly can still see the create form, they just get a real 403 on submit. Left as a minor,
deliberate gap rather than adding a redirect for a path the sidebar/list page already hides.

**A real gap in the above, found and closed 2026-09-07: `/workflows` only ever gated "Run now" —
the pause/resume toggle, Delete, and "New workflow" had no permission check at all, matching a
real backend gap (`Create`/`Update`/`Delete` had no server-side guard either — see
`founderstack-api-go/CLAUDE.md`'s workflow 13 section for that half of the fix).** Found live: the
founder, testing the invitation flow with a real second (member/viewer) account, asked whether a
viewer should be able to delete a workflow. Fixed with the new `canModifyWorkflows` (above): the
top and empty-state "New workflow" buttons and a card's Delete button now require it; the
pause/resume toggle switch renders as a static, non-interactive dot (still showing active/paused
state) instead of a real `<button>` when the signed-in user can't modify workflows. `canTrigger`
and `canModify` are deliberately independent props on `WorkflowCard` — a member sees "Run now" but
not Delete/the toggle; a viewer sees neither and gets a plain "View only" label instead.

**Verification method**: `tsc`/`lint`/`build` all pass clean, but **this UI was not visually
verified in a real browser this session** — Claude-in-Chrome remained disconnected (same as
workflow 12's pass). Backend side (the admin/owner-equivalence design, the
`can_manage_api_keys`/`can_manage_integrations` regression caught and backfilled before shipping,
the Clerk-removal-ordering/resurrection-risk reasoning) is documented in
`founderstack-api-go/CLAUDE.md`'s "Manage Team Members & Roles (workflow 13)" section.

**Recipient-side invitations (`src/hooks/usePendingInvitations.ts`,
`src/components/organizations/InvitationsList.tsx`, `src/app/invitations/page.tsx`), added
2026-09-07, reworked the same day after a live bug** — closes a gap this workflow's own
`PendingInvitationsCard` didn't: that card shows an *admin* their own sent invitations
(backend-mediated, `GET /org/invitations`); nothing showed an *invitee* their own received
invitation from inside this app at all — the only path was Clerk's emailed accept link.

**`/invitations` is a standalone top-level route (`src/app/invitations/`), deliberately outside
both `(app)` and `(auth)`.** A user with a purely pending invitation has no backend-synced `users`
row yet — that row is only created once `organizationMembership.created` fires on acceptance — so
it must never depend on `AppLayout`/`OnboardingShield` or any backend call. It talks to Clerk only
(`useOrganizationList({ userInvitations: ... })` via `usePendingInvitations`, `useUser()`), so it
renders correctly regardless of whether this app's backend has ever seen the signed-in Clerk user.
`(app)/layout.tsx`'s sidebar also links here (with a pending-count badge, same pattern as
Approvals') for the case of an already-onboarded member getting invited to a *second* org.

**First shipped as a global banner mounted in the root layout — reverted after it caused a real
production incident, not preemptively.** A banner rendered above `{children}` in
`src/app/providers.tsx` meant the *rest* of the tree — the full `(app)` shell, sidebar included —
still mounted underneath it for a recipient with no synced org, and every org-scoped hook across
that shell (`OnboardingShield`'s own provider check, the sidebar's pending-approvals poll, whatever
the landed-on page itself queried) fired its own doomed `401 USER_NOT_SYNCHRONIZED`/
`404 ORGANIZATION_NOT_FOUND` request — doubled by React Query's default `retry: 1`, which doesn't
know a 4xx will never succeed on retry. In practice this froze the tab under a burst of ~13 failed
requests before `OnboardingShield`'s redirect effect could untangle it. Fixed two ways, both now
load-bearing beyond just this feature: (1) `providers.tsx`'s `QueryClient` no longer retries any
`ApiError` in the 4xx range; (2) `OnboardingShield.tsx` now inspects `useLLMProviders`'s error
`code` directly — `USER_NOT_SYNCHRONIZED`/`ORGANIZATION_NOT_FOUND` means "no resolvable org," and
in that state it renders a bare spinner instead of `children`, then `router.replace("/invitations")`
(previously it always rendered `children` immediately once `isLoading` was false, regardless of an
error — the actual root cause, since that's what let the whole shell mount for a single render
before the redirect took effect). An org-less user now lands on `/invitations` instead of
thrashing between `(app)`'s protected routes and `/onboarding` (which itself issues more org-scoped
queries via `useIntegrations`, compounding the same failure).

**"Reject" is a local-only dismiss, not a real Clerk API call — deliberately, not a shortcut.**
Checked `UserOrganizationInvitationResource`'s actual type definition
(`@clerk/shared`'s bundled types, re-exported through `@clerk/nextjs`) before building anything:
it exposes `accept()` and nothing else — no `reject()`/`decline()`. Clerk's only invitation-negation
primitive is admin-side "revoke" (`DELETE /org/invitations/{id}`, already built as this workflow's
own `useRevokeInvitation` — a different actor, the sender). "Reject" here hides the invitation in
this browser only (`localStorage`, keyed per Clerk user id) — the sender still sees it as pending
until they revoke it or it expires. The button is intentionally still labeled "Reject" (matching
what the founder asked for), with the real behavior disclosed via its title tooltip rather than
silently overpromising.

**Accept calls the real `invitation.accept()`, then `setActive({ organization: ... })`.** Clerk's
`accept()` joins the membership but doesn't itself move the signed-in user's active organization,
so without the explicit `setActive` call the user would stay on whatever org (or no org) they were
previously scoped to. `@clerk/types` isn't a direct dependency (only `@clerk/nextjs` is in
`package.json`), so the invitation's type is derived from `useOrganizationList`'s own return type
via an indexed-access type rather than importing a package not actually installed.

**`/invitations` actively polls for the webhook sync after Accept, instead of just linking to
`/dashboard` — a second real bug, caught live the same day this shipped.** A naive "Continue to
app" `Link` raced the async `organizationMembership.created` webhook: clicking through immediately
after Accept usually hit `/dashboard` before that webhook had created the backend's `users` row,
so `OnboardingShield` caught the same `USER_NOT_SYNCHRONIZED`/`ORGANIZATION_NOT_FOUND` this whole
feature exists to route around and bounced the user straight back — a confusing "nothing happened,
and there's an API error" loop even after the original all-shell-hooks-fire-at-once bug (see
above) was fixed. Fixed by having `InvitationsList` take an `onAccepted(orgName)` callback, fired
only on a real successful accept (`usePendingInvitations.accept` now returns a boolean), which the
page uses to switch into a "Setting up your access to `<org>`…" state: `useLLMProviders` gets a
real `refetchInterval` (extended with an optional-options param for exactly this) and polls every
1.5s until its error stops being a no-org error, then `router.push`es to `/dashboard` itself — by
which point `["llm-providers"]`'s cache is already warm, so `OnboardingShield`'s own call there is
a cache hit, not another race. Caps at 20s before falling back to the always-present manual
button, rather than polling forever if sync is ever genuinely stuck. `isNoOrgError` (the two error
codes) now lives once, in `src/lib/api/orgSync.ts`, reused by both `OnboardingShield` and this
page; `client.ts`'s generic `console.error` on every `ApiError` also now skips these specific codes
(`EXPECTED_TRANSIENT_CODES`, exported from `client.ts` — the one place that decides what's noise),
since a 401 that's expected and about to resolve on its own isn't a fault worth logging.
