"use client";

import { useEffect, useRef, useState } from "react";
import { Integration } from "@/lib/api/types";
import { useConnectIntegration, useDisconnectIntegration } from "@/hooks/useIntegrations";
import { IntegrationApiKeyForm } from "./IntegrationApiKeyForm";
import { brandIconMap, brandColorMap } from "./brand-icons";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Plug, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface IntegrationCardProps {
  integration: Integration;
  // Set when this card is the target of a workflow-16 reconnect_url
  // (?reconnect=service, from a live run's "needs reconnection" banner) —
  // scrolls itself into view and briefly rings so it's easy to find among
  // a whole category grid of cards.
  highlighted?: boolean;
}

export function IntegrationCard({ integration, highlighted }: IntegrationCardProps) {
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlighted) cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlighted]);

  const connectMutation = useConnectIntegration();
  const disconnectMutation = useDisconnectIntegration();

  const { service, name, auth_type, status, description } = integration;

  const IconComponent = brandIconMap[service] || Plug;
  const iconColorClass = brandColorMap[service] || "text-foreground";

  const handleConnect = () => {
    if (auth_type === "oauth") {
      connectMutation.mutate({ service });
    } else {
      setShowKeyForm(true);
    }
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate(service, {
      onSuccess: () => setShowConfirmDisconnect(false),
    });
  };

  const statusBadge = {
    connected: (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
        <CheckCircle2 className="h-3 w-3" />
        Connected
      </span>
    ),
    expired: (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
        <AlertTriangle className="h-3 w-3" />
        Reconnect
      </span>
    ),
    not_connected: (
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        Not connected
      </span>
    ),
    unknown: null,
  }[status];

  return (
    <div
      ref={cardRef}
      className={`flex min-h-[176px] flex-col justify-between rounded-lg border bg-card p-4 transition-shadow ${
        highlighted ? "border-primary ring-2 ring-primary/40" : "border-border"
      }`}
    >
      <div>
        <div className="mb-3 flex items-start justify-between">
          <div className={`flex h-9 w-9 items-center justify-center rounded-md bg-accent ${iconColorClass}`}>
            <IconComponent className="h-4 w-4" />
          </div>
          {statusBadge}
        </div>

        <h4 className="text-sm font-medium text-foreground">{name}</h4>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description || `Let your agents act on ${name} on your behalf.`}
        </p>
      </div>

      <div className="mt-4">
        <AnimatePresence mode="wait">
          {showKeyForm ? (
            <motion.div
              key="key-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <IntegrationApiKeyForm
                service={service}
                onSuccess={() => setShowKeyForm(false)}
                onCancel={() => setShowKeyForm(false)}
              />
            </motion.div>
          ) : showConfirmDisconnect ? (
            <motion.div
              key="confirm-disconnect"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-md border border-border bg-muted/50 p-3"
            >
              <p className="mb-3 text-xs leading-normal text-muted-foreground">
                This will stop workflows that use {name}.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setShowConfirmDisconnect(false)}
                  disabled={disconnectMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  size="xs"
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Disconnect"
                  )}
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="flex justify-end">
              {status === "connected" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfirmDisconnect(true)}
                  className="w-full justify-center text-muted-foreground"
                >
                  Disconnect
                </Button>
              )}
              {status === "expired" && (
                <Button
                  onClick={handleConnect}
                  size="sm"
                  className="w-full justify-center"
                  disabled={connectMutation.isPending}
                >
                  {connectMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Reconnect"
                  )}
                </Button>
              )}
              {status === "not_connected" && (
                <Button
                  onClick={handleConnect}
                  size="sm"
                  variant="outline"
                  className="w-full justify-center"
                  disabled={connectMutation.isPending}
                >
                  {connectMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : auth_type === "oauth" ? (
                    "Connect"
                  ) : (
                    "Add credentials"
                  )}
                </Button>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
