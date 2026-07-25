"use client";

import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { ApiKeyForm } from "@/components/onboarding/ApiKeyForm";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useIntegrations } from "@/hooks/useIntegrations";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Puzzle, Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const { data: integrations, isLoading } = useIntegrations();

  useEffect(() => {
    const handleSearchParams = () => {
      const params = new URLSearchParams(window.location.search);
      const stepParam = params.get("step");
      if (stepParam) {
        setStep(parseInt(stepParam, 10));
      } else {
        setStep(1);
      }
    };

    handleSearchParams();

    window.addEventListener("popstate", handleSearchParams);
    return () => window.removeEventListener("popstate", handleSearchParams);
  }, []);

  const handleStep1Success = () => {
    router.push("/onboarding?step=2");
    setStep(2);
  };

  const handleFinish = () => {
    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-zinc-950 text-center relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="z-10 w-full max-w-4xl"
      >
        <div className="mb-8 flex justify-center">
          <UserButton appearance={{ elements: { userButtonAvatarBox: "w-10 h-10 border border-zinc-800" } }} />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-xl mx-auto"
            >
              <div className="mb-10">
                <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
                  Setting up your Forge
                </h1>
                <p className="text-zinc-400 max-w-sm mx-auto text-sm leading-relaxed">
                  Every great founder needs a powerful team. Secure your workspace with an Anthropic key to start building your agentic workflows.
                </p>
              </div>

              <ApiKeyForm onSuccess={handleStep1Success} />

              <p className="mt-8 text-zinc-600 text-xs">
                Need a key? <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Get one from Anthropic</a>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <div className="text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <Puzzle className="w-6 h-6 text-blue-400" />
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Connect Your Stack
                </h1>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed font-light">
                  Grant permission to the tools you run your business with. Your AI agents will use these credentials to perform tasks on your behalf.
                </p>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <p className="text-zinc-500 text-xs animate-pulse font-medium">RETRIEVING INTEGRATION CATALOG...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto pt-2">
                  {integrations?.map((integration) => (
                    <IntegrationCard key={integration.service} integration={integration} />
                  ))}
                </div>
              )}

              <div className="flex justify-center items-center gap-4 pt-6 border-t border-zinc-900/80 max-w-xl mx-auto">
                <Button
                  variant="ghost"
                  onClick={handleFinish}
                  className="text-zinc-500 hover:text-zinc-300 text-sm h-10 px-4"
                >
                  Skip for now
                </Button>
                <Button
                  onClick={handleFinish}
                  className="bg-white hover:bg-zinc-200 text-black font-semibold px-5 h-10 group"
                >
                  <span className="flex items-center gap-2">
                    Finish & Go to Dashboard
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
