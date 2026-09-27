import { BookOpen } from "lucide-react";
import { SopLabel } from "@/lib/api/types";

// Marks an agent/workflow a practice SOP deployment manages — the next sync
// replaces manual edits, so it's worth seeing before editing.
export function SopBadge({ sop }: { sop: SopLabel }) {
  return (
    <span
      title={`Managed by the "${sop.name}" SOP (v${sop.version}). Syncing replaces manual edits.`}
      className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-primary/30 px-2 py-0.5 text-[11px] text-primary"
    >
      <BookOpen className="h-3 w-3 shrink-0" />
      <span className="truncate">SOP: {sop.name} v{sop.version}</span>
    </span>
  );
}
