"use client";

import { Fragment, useState } from "react";
import { useSearchDocuments } from "@/hooks/useDocuments";
import { Button } from "@/components/ui/button";
import { SearchResult } from "@/lib/api/types";
import { Search, X, Loader2, FileText, Zap } from "lucide-react";

// Word-boundary, case-insensitive — good enough for a search-excerpt
// highlight (not a full-text-search-engine's own match spans, which the
// backend doesn't return). Splits query into individual words so multi-word
// queries still highlight each term that appears, not just an exact phrase.
function highlightMatches(text: string, query: string) {
  const terms = query
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (terms.length === 0) return text;

  const pattern = new RegExp(`(${terms.join("|")})`, "gi");
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    pattern.test(part) ? (
      <mark key={i} className="rounded-sm bg-primary/20 text-foreground">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(1, score)) * 100;
  return (
    <div className="flex items-center gap-1.5" title={`Relevance: ${(score * 100).toFixed(0)}%`}>
      <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] tabular-nums text-muted-foreground">{(score * 100).toFixed(0)}%</span>
    </div>
  );
}

function SearchResultCard({ result, query }: { result: SearchResult; query: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium text-foreground">{result.doc_filename}</span>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
            {result.category}
          </span>
        </div>
        <ScoreBar score={result.relevance_score} />
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{highlightMatches(result.content, query)}</p>
    </div>
  );
}

/** The founder's document search bar (workflow 12) — replaces the document
 * table with a results list while a search is active; clearing the query
 * returns to the normal table view (see documents/page.tsx). */
export function DocumentSearch({ onActiveChange }: { onActiveChange?: (active: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const searchMutation = useSearchDocuments();

  const active = submittedQuery !== null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSubmittedQuery(trimmed);
    onActiveChange?.(true);
    searchMutation.mutate({ query: trimmed });
  };

  const clear = () => {
    setQuery("");
    setSubmittedQuery(null);
    searchMutation.reset();
    onActiveChange?.(false);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about your documents…"
            className="w-full rounded-md border border-input bg-background py-2.5 pr-9 pl-9 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          {query && (
            <button
              type="button"
              onClick={clear}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button type="submit" disabled={!query.trim() || searchMutation.isPending}>
          {searchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      {active && (
        <div className="space-y-3">
          {searchMutation.isPending ? (
            <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-border">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : searchMutation.isError ? (
            <div className="flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-center">
              <p className="text-sm font-medium text-destructive">Search failed</p>
              <p className="text-sm text-muted-foreground">{searchMutation.error.message}</p>
            </div>
          ) : searchMutation.data && searchMutation.data.results.length === 0 ? (
            <div className="flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-center">
              <p className="text-sm font-medium text-foreground">No results</p>
              <p className="text-xs text-muted-foreground">
                Nothing in your documents matched — try different wording, or check the document is indexed.
              </p>
            </div>
          ) : searchMutation.data ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {searchMutation.data.results.length} result{searchMutation.data.results.length === 1 ? "" : "s"} for
                  &ldquo;{submittedQuery}&rdquo;
                </p>
                {searchMutation.data.from_cache && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Zap className="h-3 w-3" />
                    From cache
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {searchMutation.data.results.map((r, i) => (
                  <SearchResultCard key={i} result={r} query={submittedQuery ?? ""} />
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
