"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { ApiError } from "@/lib/api/client";

// No query key carries the org, so after a workspace switch every cached
// response still belongs to the previous workspace. Resetting on the
// orgId change itself (rather than in the switcher) covers every way the
// active org can change: the switcher, Clerk's own UI, another tab.
function ResetQueriesOnOrgSwitch() {
  const { isLoaded, orgId } = useAuth();
  const queryClient = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;
    const current = orgId ?? null;
    if (previous.current !== undefined && previous.current !== current) {
      void queryClient.cancelQueries().then(() => queryClient.resetQueries());
    }
    previous.current = current;
  }, [isLoaded, orgId, queryClient]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            // A 4xx (auth/permission/not-found) will never succeed on
            // retry — most visibly for a signed-in user with no synced
            // backend org yet (USER_NOT_SYNCHRONIZED/ORGANIZATION_NOT_FOUND),
            // where every org-scoped hook on a page used to double-fire a
            // doomed request before OnboardingShield could redirect away.
            retry: (failureCount, error) =>
              error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500
                ? false
                : failureCount < 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ClerkProvider>
      <QueryClientProvider client={queryClient}>
        <ResetQueriesOnOrgSwitch />
        {children}
        <Toaster richColors position="bottom-right" />
      </QueryClientProvider>
    </ClerkProvider>
  );
}
