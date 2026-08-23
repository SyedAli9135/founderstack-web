"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useUploadDocument, useDocument, useReindexDocument } from "@/hooks/useDocuments";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";

const CATEGORIES = ["Legal", "Finance", "HR", "Technical", "General"];

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
};

export function DocumentUploader() {
  const [category, setCategory] = useState("General");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [docId, setDocId] = useState<string | null>(null);

  const uploadMutation = useUploadDocument();
  const reindexMutation = useReindexDocument();
  const { data: doc } = useDocument(docId);

  const settled = doc?.processing_status === "indexed" || doc?.processing_status === "failed";

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setDocId(null);
      setProgress(0);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 50 * 1024 * 1024,
    multiple: false,
    disabled: uploadMutation.isPending || (!!docId && !settled),
  });

  const handleUpload = () => {
    if (!file) return;
    uploadMutation.mutate(
      { file, category: category.toLowerCase(), onProgress: setProgress },
      {
        onSuccess: (data) => setDocId(data.doc_id),
      }
    );
  };

  const reset = () => {
    setFile(null);
    setDocId(null);
    setProgress(0);
  };

  // Phase 1: no file chosen yet — the dropzone.
  if (!file) {
    return (
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40"
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          {isDragActive ? "Drop the file here" : "Drag & drop a file, or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground">PDF, DOCX, TXT, or MD — up to 50MB</p>
      </div>
    );
  }

  // Phase 2: file chosen, not yet uploaded — category + confirm.
  if (!docId && !uploadMutation.isPending) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{file.name}</span>
          <button
            type="button"
            onClick={reset}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Remove file"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div>
          <label htmlFor="doc-category" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Category
          </label>
          <select
            id="doc-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <Button onClick={handleUpload} className="w-full">
          Upload document
        </Button>
      </div>
    );
  }

  // Phase 3: uploading — real progress bar via XHR upload events.
  if (uploadMutation.isPending || (docId && !doc)) {
    return (
      <div className="space-y-3 rounded-md border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{file.name}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {progress < 100 ? `Uploading… ${progress}%` : "Upload complete, starting processing…"}
        </p>
      </div>
    );
  }

  // Phase 4: processing / indexed / failed — polled via useDocument.
  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">{file.name}</span>
      </div>

      {doc?.processing_status === "indexed" ? (
        <div className="flex items-center gap-2 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4" />
          Ready — {doc.total_chunks} chunks indexed
        </div>
      ) : doc?.processing_status === "failed" ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <XCircle className="h-4 w-4" />
            Processing failed
          </div>
          {doc.error_detail && (
            <p className="text-xs text-muted-foreground">{doc.error_detail}</p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => docId && reindexMutation.mutate(docId)}
              disabled={reindexMutation.isPending}
            >
              {reindexMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Retry"
              )}
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              Try a different file
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Indexing…
        </div>
      )}

      {settled && (
        <Button size="sm" variant="ghost" onClick={reset}>
          Upload another
        </Button>
      )}
    </div>
  );
}
