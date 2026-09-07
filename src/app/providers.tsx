"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { ApiError } from "@/lib/api/client";

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
        {children}
        <Toaster richColors position="bottom-right" />
      </QueryClientProvider>
    </ClerkProvider>
  );
}
