"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { API_BASE_URL } from "@/lib/api/client";
import { RunEvent } from "@/lib/api/types";

export type StreamConnectionState = "idle" | "connecting" | "open" | "closed" | "error";

// GET /runs/{id}/stream via fetch + a manual ReadableStream reader, not
// the browser's native EventSource — EventSource has no way to send an
// Authorization header, and this backend's SSE endpoint requires the same
// Clerk-JWT-as-Bearer-token auth as every other request (see
// middleware.RequireAuth). The wire format is plain
// "event: <type>\ndata: <json>\n\n" frames (internal/api/runs/handler.go's
// Stream handler), so parsing them by hand here is a small, self-contained
// amount of code — not worth a dependency for.
export function useWorkflowStream(runId: string | null) {
  const { getToken } = useAuth();
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [connectionState, setConnectionState] = useState<StreamConnectionState>("idle");
  const getTokenRef = useRef(getToken);

  // Kept in a ref (synced from its own effect, not assigned during
  // render) purely so the streaming effect below doesn't need getToken
  // itself in its dependency array — Clerk returns a new function
  // identity often enough that depending on it directly would reconnect
  // the stream far more than actually necessary.
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    if (!runId) return;

    const controller = new AbortController();
    let cancelled = false;

    async function connect() {
      // Reset for the new runId inside the async callback, not
      // synchronously in the effect body — avoids the extra render pass
      // React's own effect guidance warns against.
      setEvents([]);
      setConnectionState("connecting");
      try {
        const token = await getTokenRef.current();
        const res = await fetch(`${API_BASE_URL}/runs/${runId}/stream`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          if (!cancelled) setConnectionState("error");
          return;
        }
        if (!cancelled) setConnectionState("open");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let boundary: number;
          while ((boundary = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const event = parseFrame(frame);
            if (event && !cancelled) {
              setEvents((prev) => [...prev, event]);
            }
          }
        }
        if (!cancelled) setConnectionState("closed");
      } catch (err) {
        // AbortError is this effect's own cleanup firing — not a real
        // connection failure.
        if (!cancelled && !(err instanceof DOMException && err.name === "AbortError")) {
          setConnectionState("error");
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [runId]);

  return { events, connectionState };
}

function parseFrame(frame: string): RunEvent | null {
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("data: ")) dataLines.push(line.slice("data: ".length));
  }
  if (dataLines.length === 0) return null;
  try {
    return JSON.parse(dataLines.join("\n")) as RunEvent;
  } catch {
    return null;
  }
}
