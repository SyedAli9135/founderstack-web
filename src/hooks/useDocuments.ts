"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useApiClient, ApiError } from "@/lib/api/client";
import { AppDocument, DocumentVisibility, SearchResponse } from "@/lib/api/types";
import { toast } from "sonner";

let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
if (!API_BASE_URL.endsWith("/api/v1")) {
  API_BASE_URL = `${API_BASE_URL.replace(/\/$/, "")}/api/v1`;
}

export function useDocuments() {
  const api = useApiClient();
  return useQuery({
    queryKey: ["documents"],
    queryFn: () => api.get<AppDocument[]>("/documents"),
    // Keeps status badges live for documents that were already
    // pending/processing when the table loaded (not just the one being
    // actively uploaded, which useDocument already polls on its own).
    refetchInterval: (query) => {
      const items = query.state.data ?? [];
      const hasActiveJob = items.some(
        (doc) => doc.processing_status === "pending" || doc.processing_status === "processing"
      );
      return hasActiveJob ? 3000 : false;
    },
  });
}

// Polls a single document while it's still being processed — the backend
// has no push channel for this, so the uploader falls back to a 3s
// interval per workflow 6's spec, stopping once the doc lands on a
// terminal status.
export function useDocument(docId: string | null, options?: { enabled?: boolean }) {
  const api = useApiClient();
  return useQuery({
    queryKey: ["documents", docId],
    queryFn: () => api.get<AppDocument>(`/documents/${docId}`),
    enabled: !!docId && (options?.enabled ?? true),
    refetchInterval: (query) => {
      const status = query.state.data?.processing_status;
      return status === "indexed" || status === "failed" ? false : 3000;
    },
  });
}

interface UploadVariables {
  file: File;
  category: string;
  visibility?: DocumentVisibility;
  onProgress?: (percent: number) => void;
}

interface UploadResponse {
  doc_id: string;
  status: string;
}

// Not routed through useApiClient: progress events during upload require
// XMLHttpRequest specifically — fetch's Request body stream has no
// upload-progress signal, and workflow 6's spec calls for a real percentage
// bar, not an indeterminate spinner.
export function useUploadDocument() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<UploadResponse, ApiError, UploadVariables>({
    mutationFn: async ({ file, category, visibility, onProgress }) => {
      const token = await getToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      if (visibility) formData.append("visibility", visibility);

      return new Promise<UploadResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE_URL}/documents/upload`);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          let body: { data?: UploadResponse; error?: { code?: string; message?: string } } = {};
          try {
            body = JSON.parse(xhr.responseText);
          } catch {
            // fall through to the generic error below
          }
          if (xhr.status >= 200 && xhr.status < 300 && body.data) {
            resolve(body.data);
          } else {
            reject(
              new ApiError(
                body.error?.message || "Upload failed",
                xhr.status,
                body.error?.code
              )
            );
          }
        };

        xhr.onerror = () => reject(new ApiError("Network error during upload", 0));
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err) => {
      toast.error("Upload failed", { description: err.message });
    },
  });
}

export function useDeleteDocument() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (docId) => api.delete<void>(`/documents/${docId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted");
    },
    onError: (err) => {
      toast.error("Delete failed", { description: err.message });
    },
  });
}

interface SearchVariables {
  query: string;
  category?: string;
  top_k?: number;
}

// A mutation, not a useQuery-by-key: search is explicit-submit driven
// (a founder clicking "Search" or hitting enter), not something that
// should refetch on its own the way the documents list does.
export function useSearchDocuments() {
  const api = useApiClient();
  return useMutation<SearchResponse, ApiError, SearchVariables>({
    mutationFn: (body) => api.post<SearchResponse>("/documents/search", body),
    onError: (err) => {
      toast.error("Search failed", { description: err.message });
    },
  });
}

export function useReindexDocument() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<UploadResponse, ApiError, string>({
    mutationFn: (docId) => api.post<UploadResponse>(`/documents/${docId}/reindex`, {}),
    onSuccess: (_, docId) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["documents", docId] });
      toast.success("Reindexing started");
    },
    onError: (err) => {
      toast.error("Reindex failed", { description: err.message });
    },
  });
}
