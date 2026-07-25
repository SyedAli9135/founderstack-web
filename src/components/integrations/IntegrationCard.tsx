"use client";

import { useState } from "react";
import { Integration } from "@/lib/api/types";
import { useConnectIntegration, useDisconnectIntegration } from "@/hooks/useIntegrations";
import { IntegrationApiKeyForm } from "./IntegrationApiKeyForm";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle,
  CheckCircle2,
  Plug,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface IntegrationCardProps {
  integration: Integration;
}

// Highly stylized premium SVG components for third-party brands
function SlackIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.042a2.528 2.528 0 0 1-2.522 2.52H8.823a2.528 2.528 0 0 1-2.52-2.52v-5.042zM8.823 5.043a2.528 2.528 0 0 1 2.52-2.522 2.528 2.528 0 0 1 2.522 2.522v2.52h-2.522a2.528 2.528 0 0 1-2.52-2.52zm0 1.261a2.528 2.528 0 0 1 2.52 2.52v5.043a2.528 2.528 0 0 1-2.522 2.522H3.78a2.528 2.528 0 0 1-2.522-2.522V8.824a2.528 2.528 0 0 1 2.522-2.52h5.043zm10.135 10.134a2.528 2.528 0 0 1 2.52-2.52h2.522a2.528 2.528 0 0 1 2.522 2.52 2.528 2.528 0 0 1-2.522 2.522h-2.522a2.528 2.528 0 0 1-2.52-2.522zm-1.262 0a2.528 2.528 0 0 1-2.52 2.522h-5.043a2.528 2.528 0 0 1-2.522-2.522v-5.043a2.528 2.528 0 0 1 2.522-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.043zm-3.781-10.134a2.528 2.528 0 0 1 2.522 2.522v2.52h-2.522a2.528 2.528 0 0 1-2.52-2.52 2.528 2.528 0 0 1 2.52-2.522zm0 1.261a2.528 2.528 0 0 1-2.522 2.52v5.043a2.528 2.528 0 0 1 2.522 2.522h5.043a2.528 2.528 0 0 1 2.52-2.522V8.824a2.528 2.528 0 0 1-2.52-2.52h-5.043z"/>
    </svg>
  );
}

function LinkedInIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

function StripeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.962 10.631c-1.46-.228-2.264-.56-2.264-1.282 0-.649.699-1.002 1.884-1.002 1.517 0 2.973.456 3.965.986l1.003-3.155c-.933-.42-2.585-.828-4.708-.828-3.791 0-6.19 1.942-6.19 5.228 0 3.528 2.915 4.549 5.86 5.207 1.916.429 2.501.815 2.501 1.488 0 .749-.858 1.156-2.28 1.156-1.916 0-3.792-.619-4.876-1.189l-1.07 3.197c1.173.57 3.196 1.055 5.617 1.055 4.195 0 6.848-1.928 6.848-5.385.002-3.882-3.037-4.786-6.09-5.28z" />
    </svg>
  );
}

function GoogleDriveIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19.43 12.98L12 24h-3.43l7.43-12.98h3.43zM8.57 12.98L1.14 0h3.43l7.43 12.98H8.57zm.57-1L16.57 0h3.43L12.57 11.98H9.14z"/>
    </svg>
  );
}

function NotionIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M4.2 3h15.6c.7 0 1.2.5 1.2 1.2v15.6c0 .7-.5 1.2-1.2 1.2H4.2C3.5 22 3 21.5 3 20.8V4.2C3 3.5 3.5 3 4.2 3zm4.5 4v6.8l3.7-6.8H15v10h-2V9.8L9.2 17H7V7h1.7z" />
    </svg>
  );
}

const iconMap: Record<string, any> = {
  slack: SlackIcon,
  linkedin: LinkedInIcon,
  github: GitHubIcon,
  stripe: StripeIcon,
  google_drive: GoogleDriveIcon,
  notion: NotionIcon,
};

const colorMap: Record<string, string> = {
  slack: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  linkedin: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  github: "text-zinc-200 bg-zinc-800/50 border-zinc-700/30",
  stripe: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  google_drive: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  notion: "text-zinc-100 bg-zinc-800/85 border-zinc-700/50",
};

export function IntegrationCard({ integration }: IntegrationCardProps) {
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false);
  
  const connectMutation = useConnectIntegration();
  const disconnectMutation = useDisconnectIntegration();

  const { service, name, category, auth_type, status, description } = integration;
  
  const IconComponent = iconMap[service] || Plug;
  const brandColorClass = colorMap[service] || "text-zinc-400 bg-zinc-850 border-zinc-800";

  const handleConnect = () => {
    if (auth_type === "oauth") {
      connectMutation.mutate({ service });
    } else {
      setShowKeyForm(true);
    }
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate(service, {
      onSuccess: () => {
        setShowConfirmDisconnect(false);
      }
    });
  };

  const getStatusBadge = () => {
    switch (status) {
      case "connected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Connected
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3 animate-pulse" />
            Reconnect
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-850 text-zinc-500 border border-zinc-800/60">
            Not Connected
          </span>
        );
    }
  };

  return (
    <div className="relative group bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-md rounded-2xl p-5 hover:border-zinc-700/50 hover:bg-zinc-900/60 transition-all duration-350 shadow-lg flex flex-col justify-between overflow-hidden min-h-[190px]">
      {/* Decorative Glow */}
      <div className="absolute -right-10 -top-10 w-28 h-28 bg-blue-500/5 blur-2xl rounded-full pointer-events-none group-hover:bg-blue-500/10 transition-all duration-350" />
      
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${brandColorClass}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          {getStatusBadge()}
        </div>

        <h4 className="text-base font-semibold text-white tracking-tight">{name}</h4>
        <p className="text-xs text-zinc-400 mt-1.5 mb-4 leading-relaxed font-light">{description || `Integrate ${name} into your agent workflows.`}</p>
      </div>

      <div className="mt-auto pt-2">
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-red-950/10 border border-red-900/20 rounded-xl p-3 text-left"
            >
              <p className="text-[11px] text-zinc-300 leading-normal mb-3">
                This will stop all workflows using {name}. Disconnect?
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setShowConfirmDisconnect(false)}
                  className="text-zinc-400 hover:text-white h-7 text-[10px]"
                  disabled={disconnectMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  size="xs"
                  variant="destructive"
                  onClick={handleDisconnect}
                  className="font-semibold h-7 text-[10px] bg-red-650 hover:bg-red-600"
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    "Disconnect"
                  )}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="action-buttons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-end gap-2"
            >
              {status === "connected" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfirmDisconnect(true)}
                  className="text-zinc-400 hover:text-red-400 hover:border-red-500/20 border-zinc-800 bg-transparent text-xs hover:bg-red-500/5 transition-all w-full justify-center"
                >
                  Disconnect
                </Button>
              )}
              {status === "expired" && (
                <Button
                  onClick={handleConnect}
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold w-full justify-center"
                  disabled={connectMutation.isPending}
                >
                  {connectMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
                  className="w-full justify-center text-zinc-300 hover:text-white border-zinc-800 bg-zinc-950/20 hover:bg-zinc-800/30 text-xs transition-all font-semibold"
                  disabled={connectMutation.isPending}
                >
                  {connectMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : auth_type === "oauth" ? (
                    "Connect"
                  ) : (
                    "Add Credentials"
                  )}
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
