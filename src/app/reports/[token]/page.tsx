"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { FileX2, Loader2, Printer } from "lucide-react";
import { ReportView } from "@/components/reports/ReportView";
import { API_BASE_URL } from "@/lib/api/client";
import { PublicReport } from "@/lib/api/types";

// The public endpoint lives beside /api/v1, not under it.
const PUBLIC_API = API_BASE_URL.replace(/\/api\/v1$/, "/api/public");

type State =
  | { kind: "loading" }
  | { kind: "ready"; report: PublicReport }
  | { kind: "unavailable" }
  | { kind: "busy" }
  | { kind: "error" };

// Fetched from the viewer's browser on purpose: the endpoint rate-limits per
// client IP, and a server-side fetch would put every viewer behind the
// Next.js server's one IP.
export default function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`${PUBLIC_API}/reports/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) return setState({ kind: "unavailable" });
        if (res.status === 429) return setState({ kind: "busy" });
        if (!res.ok) return setState({ kind: "error" });
        const body = await res.json();
        setState({ kind: "ready", report: body.data as PublicReport });
      })
      .catch(() => !cancelled && setState({ kind: "error" }));
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-10 sm:px-6">
      <main className="flex-1">
        {state.kind === "loading" && (
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {state.kind === "ready" && (
          <>
            <div className="mb-6 flex justify-end print:hidden">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Printer className="h-3.5 w-3.5" /> Print / Save as PDF
              </button>
            </div>
            <ReportView title={state.report.title} snapshot={state.report.snapshot} />
          </>
        )}

        {(state.kind === "unavailable" || state.kind === "busy" || state.kind === "error") && (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
            <FileX2 className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-lg font-semibold">
              {state.kind === "unavailable" ? "This report is no longer available" : "This report can't be shown right now"}
            </h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              {state.kind === "unavailable"
                ? "The link may have expired or been turned off. Ask whoever shared it for a new one."
                : state.kind === "busy"
                  ? "Too many requests from your network — please try again in a minute."
                  : "Something went wrong loading it. Please try again shortly."}
            </p>
          </div>
        )}
      </main>

      <footer className="mt-16 border-t border-border pt-6 text-center text-xs text-muted-foreground print:mt-8">
        Powered by{" "}
        <Link href="/" className="font-medium text-foreground hover:underline">
          FounderStack
        </Link>{" "}
        — AI operations for founders and the operators who run them.
      </footer>
    </div>
  );
}
