"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Check, CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/practice/ConfirmDialog";
import { useBillingPortal, useConfirmCheckout, useSubscription, useUpgradePlan } from "@/hooks/useSubscription";
import { Plan, Subscription } from "@/lib/api/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatGB(bytes: number) {
  const gb = bytes / 1024 ** 3;
  if (gb >= 10) return `${gb.toFixed(0)} GB`;
  if (gb >= 0.1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1024 ** 2;
  return mb >= 1 ? `${mb.toFixed(0)} MB` : `${Math.round(bytes / 1024)} KB`;
}

const statusLabel: Record<string, { label: string; className: string }> = {
  trial: { label: "Free trial", className: "border-primary/30 text-primary" },
  trial_expired: { label: "Trial ended", className: "border-amber-500/40 text-amber-600 dark:text-amber-400" },
  active: { label: "Active", className: "border-primary/30 text-primary" },
  trialing: { label: "Trial", className: "border-primary/30 text-primary" },
  past_due: { label: "Payment failed", className: "border-destructive/40 text-destructive" },
  unpaid: { label: "Unpaid", className: "border-destructive/40 text-destructive" },
  canceled: { label: "Canceled", className: "border-border text-muted-foreground" },
  incomplete: { label: "Payment pending", className: "border-amber-500/40 text-amber-600 dark:text-amber-400" },
  incomplete_expired: { label: "Checkout expired", className: "border-border text-muted-foreground" },
};

const isLive = (status: string) => ["active", "trialing", "past_due"].includes(status);

function Meter({ label, used, limit, display }: { label: string; used: number; limit: number; display?: string }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const over = used > limit;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`tabular-nums ${over ? "text-destructive" : "text-foreground"}`}>{display ?? `${used} / ${limit}`}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${over || pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// What a downgrade would leave over its limits — shown before confirming,
// since existing agents/workflows keep running but nothing new can be added.
function overages(sub: Subscription, plan: Plan): string[] {
  const out: string[] = [];
  const u = sub.usage;
  if (u.agents.used > plan.max_agents) out.push(`${u.agents.used} agents (${plan.name} allows ${plan.max_agents})`);
  if (u.workflows.used > plan.max_workflows) out.push(`${u.workflows.used} workflows (${plan.name} allows ${plan.max_workflows})`);
  if (u.storage_bytes > plan.max_storage_gb * 1024 ** 3) out.push(`${formatGB(u.storage_bytes)} of documents (${plan.name} allows ${plan.max_storage_gb} GB)`);
  return out;
}

// Stripe sends the founder back here after Checkout; the session is
// applied immediately rather than waiting on the webhook, then the query
// string is dropped so a reload doesn't repeat it.
function CheckoutReturn() {
  const params = useSearchParams();
  const router = useRouter();
  const payment = params.get("payment");
  const sessionId = payment === "success" ? params.get("session_id") : null;
  const confirm = useConfirmCheckout(sessionId);

  // Toasts carry the session id as their id, so the effect running twice
  // (dev-mode double mount) can't show two of them.
  useEffect(() => {
    if (payment === "cancelled") {
      toast("Checkout cancelled", { id: "checkout-cancelled", description: "No charge was made." });
      router.replace("/settings/billing");
    } else if (payment && !sessionId) {
      router.replace("/settings/billing");
    }
  }, [payment, sessionId, router]);

  useEffect(() => {
    if (!sessionId || confirm.isPending) return;
    if (confirm.data) {
      toast.success("Plan upgraded!", { id: sessionId, description: `You're now on ${confirm.data.plan.name}.` });
    } else {
      toast.success("Payment received", { id: sessionId, description: "Your plan will update in a few seconds." });
    }
    router.replace("/settings/billing");
  }, [sessionId, confirm.isPending, confirm.data, router]);

  return sessionId && confirm.isPending ? (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Confirming your payment…
    </div>
  ) : null;
}

export default function BillingPage() {
  const { data: sub, isLoading, error } = useSubscription();
  const upgrade = useUpgradePlan();
  const portal = useBillingPortal();
  const [pending, setPending] = useState<Plan | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-[20rem] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !sub) {
    return <p className="py-20 text-center text-sm text-destructive">{error?.message ?? "Could not load billing"}</p>;
  }

  const live = isLive(sub.status);
  const current = sub.plan;
  const cw = sub.client_workspaces;
  const st = statusLabel[sub.status] ?? { label: sub.status, className: "border-border text-muted-foreground" };

  const choose = (plan: Plan) => {
    upgrade.mutate(plan.tier, {
      onSuccess: (res) => {
        if (res.checkout_url) {
          window.location.href = res.checkout_url;
          return;
        }
        setPending(null);
        toast.success(`Plan changed to ${plan.name}`, { description: "Stripe prorates the difference on your next invoice." });
      },
      onError: (err) => {
        setPending(null);
        toast.error("Could not change plan", { description: err.message });
      },
    });
  };

  // With a live subscription a click changes the plan immediately, so it's
  // confirmed first; without one it only opens Stripe Checkout.
  const onPick = (plan: Plan) => (live ? setPending(plan) : choose(plan));
  const openPortal = () => portal.mutate(undefined, { onError: (err) => toast.error("Could not open billing portal", { description: err.message }) });

  if (sub.managed_by_practice) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          This client workspace is billed through the practice that manages it. Plan changes and invoices are handled by the practice owner.
        </div>
      </div>
    );
  }

  const pendingOver = pending ? overages(sub, pending) : [];
  const rankOf = (tier: string) => sub.plans.findIndex((p) => p.tier === tier);
  const pendingIsUpgrade = pending ? rankOf(pending.tier) > rankOf(current.tier) : false;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your plan, what it includes, and how much of it you&apos;re using.</p>
      </div>

      <Suspense>
        <CheckoutReturn />
      </Suspense>

      {(sub.status === "past_due" || sub.status === "unpaid") && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Payment failed — update your billing to restore access.
          </p>
          {sub.can_manage && (
            <Button size="sm" variant="destructive" onClick={openPortal} disabled={portal.isPending} className="gap-1.5">
              {portal.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Update payment method
            </Button>
          )}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current plan</p>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${st.className}`}>{st.label}</span>
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight">{current.name}</p>
          <p className="text-sm text-muted-foreground">
            {live ? `$${current.monthly_price_usd} / month` : sub.status === "trial" ? "Free while your trial lasts" : "No active subscription"}
          </p>
          <div className="mt-4 space-y-1 text-sm text-muted-foreground">
            {sub.cancel_at_period_end && sub.next_billing_date ? (
              <p className="text-amber-600 dark:text-amber-400">Cancels on {formatDate(sub.next_billing_date)}</p>
            ) : sub.next_billing_date ? (
              <p>Next billing date: <span className="text-foreground">{formatDate(sub.next_billing_date)}</span></p>
            ) : null}
            {sub.next_invoice_estimate_usd != null && sub.next_invoice_estimate_usd !== current.monthly_price_usd && (
              <p>
                Estimated next invoice: <span className="text-foreground">${sub.next_invoice_estimate_usd}</span>
                <span className="text-xs"> (plan + extra client workspaces)</span>
              </p>
            )}
            {sub.status === "trial" && sub.trial_ends_at && <p>Trial ends {formatDate(sub.trial_ends_at)} — pick a plan to keep going.</p>}
            {sub.status === "trial_expired" && <p>Your trial has ended. Choose a plan below to keep your agents running.</p>}
          </div>
          {sub.has_billing_account && sub.can_manage && sub.billing_configured && (
            <Button variant="outline" size="sm" className="mt-5 gap-1.5" onClick={openPortal} disabled={portal.isPending}>
              {portal.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
              Manage payment & invoices <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-5 lg:col-span-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Usage</p>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Meter label="Agents" used={sub.usage.agents.used} limit={sub.usage.agents.limit} />
            <Meter label="Workflows" used={sub.usage.workflows.used} limit={sub.usage.workflows.limit} />
            <Meter
              label="Knowledge base"
              used={sub.usage.storage_bytes}
              limit={sub.usage.storage_limit_gb * 1024 ** 3}
              display={`${formatGB(sub.usage.storage_bytes)} / ${sub.usage.storage_limit_gb} GB`}
            />
            <Meter label="Integrations" used={sub.usage.integrations.used} limit={sub.usage.integrations.limit} />
            {cw && (
              <div className="sm:col-span-2">
                <Meter
                  label="Client workspaces"
                  used={cw.active}
                  limit={cw.max}
                  display={`${cw.active} of ${cw.included} included${cw.max > cw.included ? ` · up to ${cw.max}` : ""}`}
                />
                <p className={`mt-1.5 text-xs ${cw.extra > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                  {cw.extra > 0
                    ? `+${cw.extra} extra this cycle, ~$${cw.extra * cw.extra_workspace_usd}/month ($${cw.extra_workspace_usd} each)`
                    : cw.extra_workspace_usd > 0
                      ? `Each workspace beyond ${cw.included} adds $${cw.extra_workspace_usd}/month.`
                      : `${current.name} includes ${cw.included}. Upgrade to add more.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-sm font-medium text-foreground">Plans</h2>
          {!sub.can_manage && <p className="text-xs text-muted-foreground">Only owners and admins can change the plan.</p>}
          {sub.can_manage && !sub.billing_configured && <p className="text-xs text-muted-foreground">Billing isn&apos;t configured on this server yet.</p>}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {sub.plans.map((plan, i) => {
            const isCurrent = live && plan.tier === current.tier;
            const rank = rankOf(current.tier);
            const verb = !live ? "Choose" : i > rank ? "Upgrade to" : "Switch to";
            const busy = upgrade.isPending && upgrade.variables === plan.tier && !pending;
            // A plan with a lower client workspace cap than the practice is
            // running is refused server-side; say so before the click.
            const tooMany = !!cw && cw.active > plan.max_client_workspaces;
            return (
              <div key={plan.tier} className={`flex flex-col rounded-lg border bg-card p-5 ${isCurrent ? "border-primary" : "border-border"}`}>
                <div className="flex items-baseline justify-between">
                  <p className="font-medium">{plan.name}</p>
                  {isCurrent && <span className="text-[11px] text-primary">Current plan</span>}
                </div>
                <p className="mt-2">
                  <span className="text-3xl font-semibold tabular-nums tracking-tight">${plan.monthly_price_usd}</span>
                  <span className="text-sm text-muted-foreground"> / month</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-muted-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-5 w-full gap-1.5"
                  variant={isCurrent || (live && i < rank) ? "outline" : "default"}
                  disabled={isCurrent || tooMany || !sub.can_manage || !sub.billing_configured || upgrade.isPending}
                  onClick={() => onPick(plan)}
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isCurrent ? "Current plan" : `${verb} ${plan.name}`}
                </Button>
                {tooMany && !isCurrent && cw && (
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    Allows {plan.max_client_workspaces} client workspace{plan.max_client_workspaces === 1 ? "" : "s"} — remove{" "}
                    {cw.active - plan.max_client_workspaces} first
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Payments are handled by Stripe — your card details never touch FounderStack. Prices in USD, billed monthly.
        </p>
      </section>

      <ConfirmDialog
        open={!!pending}
        variant="default"
        title={pending ? `${pendingIsUpgrade ? "Upgrade" : "Switch"} to ${pending.name}?` : ""}
        description={
          pending && (
            <span className="block space-y-2">
              <span className="block">
                Your plan changes to {pending.name} (${pending.monthly_price_usd}/month) right away. Stripe prorates the difference onto your next invoice.
              </span>
              {pendingOver.length > 0 && (
                <span className="block text-amber-600 dark:text-amber-400">
                  You&apos;re currently over {pending.name}&apos;s limits: {pendingOver.join(", ")}. Everything keeps running, but you won&apos;t be able to add more until you&apos;re under them.
                </span>
              )}
            </span>
          )
        }
        confirmLabel={pending ? `${pendingIsUpgrade ? "Upgrade" : "Switch"} to ${pending.name}` : ""}
        pending={upgrade.isPending}
        onOpenChange={(o) => !o && setPending(null)}
        onConfirm={() => pending && choose(pending)}
      />
    </div>
  );
}
