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
glow-ring/pulse-animation look). Shows a "Waiting on approval" panel when the run has suspended —
honestly notes that approving/rejecting isn't available from this page yet (workflow 10 isn't
built), rather than showing a fake control.

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
