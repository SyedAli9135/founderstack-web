"use client";

import { useState, type ReactNode } from "react";
import { useDocuments, useDeleteDocument, useReindexDocument } from "@/hooks/useDocuments";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { DocumentSearch } from "@/components/documents/DocumentSearch";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AppDocument, DocumentProcessingStatus } from "@/lib/api/types";
import {
  FileText,
  Loader2,
  Plus,
  RefreshCcw,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
} from "lucide-react";

const statusBadge: Record<DocumentProcessingStatus, ReactNode> = {
  indexed: (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      <CheckCircle2 className="h-3 w-3" />
      Ready
    </span>
  ),
  failed: (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
      <XCircle className="h-3 w-3" />
      Failed
    </span>
  ),
  processing: (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      Indexing
    </span>
  ),
  pending: (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <Clock className="h-3 w-3" />
      Pending
    </span>
  ),
  deleting: (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Deleting
    </span>
  ),
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentRow({ doc }: { doc: AppDocument }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteMutation = useDeleteDocument();
  const reindexMutation = useReindexDocument();

  const isBusy = doc.processing_status === "pending" || doc.processing_status === "processing";

  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm text-foreground">{doc.filename}</span>
          {doc.visibility === "owner_only" && (
            <span title="Owner only">
              <Lock className="h-3 w-3 shrink-0 text-muted-foreground" role="img" aria-label="Owner only" />
            </span>
          )}
        </div>
      </td>
      <td className="py-3 pr-4 text-sm capitalize text-muted-foreground">{doc.category}</td>
      <td className="py-3 pr-4">{statusBadge[doc.processing_status]}</td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">
        {doc.processing_status === "indexed" ? doc.total_chunks : "—"}
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">{formatBytes(doc.byte_size)}</td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">
        {new Date(doc.created_at).toLocaleDateString()}
      </td>
      <td className="py-3">
        {confirmingDelete ? (
          <div className="flex justify-end gap-2">
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="xs"
              variant="destructive"
              onClick={() => deleteMutation.mutate(doc.id, { onSuccess: () => setConfirmingDelete(false) })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              title="Reindex"
              onClick={() => reindexMutation.mutate(doc.id)}
              disabled={isBusy || reindexMutation.isPending}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              title="Delete"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function DocumentsPage() {
  const { data: documents, isLoading, error } = useDocuments();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm font-medium text-destructive">Could not load documents</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const items = documents ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload company knowledge so your agents can reference it when they run.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Upload document
        </Button>
      </div>

      {items.length > 0 && <DocumentSearch onActiveChange={setSearchActive} />}

      {searchActive ? null : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <FileText className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No documents yet</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Upload legal agreements, financial reports, or SOPs to make them searchable by your
            agents.
          </p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => setUploadOpen(true)}>
            Upload document
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Category</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Chunks</th>
                <th className="pb-2 pr-4 font-medium">Size</th>
                <th className="pb-2 pr-4 font-medium">Uploaded</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={uploadOpen} onOpenChange={setUploadOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Upload document</SheetTitle>
            <SheetDescription>
              PDF, DOCX, TXT, or MD — up to 50MB. Indexing usually finishes within a minute.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <DocumentUploader />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
