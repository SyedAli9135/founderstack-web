"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

// Sitewide, so a failed renewal is seen wherever the founder is working —
// not only if they happen to open the billing page. Stripe keeps retrying
// the card for days while past_due; this is the warning before agents
// would go offline.
export function PaymentFailedBanner() {
  const { data } = useSubscription();
  const pathname = usePathname();
  if (!data || data.managed_by_practice || (data.status !== "past_due" && data.status !== "unpaid")) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
      <span className="inline-flex items-center gap-1.5">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Payment failed. Update billing to keep agents running.
      </span>
      {pathname !== "/settings/billing" && (
        <Link href="/settings/billing" className="font-medium underline underline-offset-2">
          {data.can_manage ? "Update billing" : "View billing"}
        </Link>
      )}
    </div>
  );
}
