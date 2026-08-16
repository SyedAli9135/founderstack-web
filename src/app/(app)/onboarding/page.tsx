"use client";

import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { ApiKeyForm } from "@/components/onboarding/ApiKeyForm";
import { useRouter } from "next/navigation";
import { useIntegrations } from "@/hooks/useIntegrations";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const { data: integrations, isLoading } = useIntegrations();

  useEffect(() => {
    const handleSearchParams = () => {
      const params = new URLSearchParams(window.location.search);
      const stepParam = params.get("step");
      setStep(stepParam ? parseInt(stepParam, 10) : 1);
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="mb-8">
        <UserButton />
      </div>

      {step === 1 ? (
        <div className="mx-auto w-full max-w-sm">
          <h1 className="mb-3 text-2xl font-semibold tracking-tight">Set up your workspace</h1>
          <p className="mx-auto mb-8 max-w-xs text-sm text-muted-foreground">
            Add an Anthropic key to start running agentic workflows.
          </p>

          <ApiKeyForm onSuccess={handleStep1Success} />

          <p className="mt-6 text-xs text-muted-foreground">
            Need a key?{" "}
            <a
              href="https://console.anthropic.com/"
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline underline-offset-4"
            >
              Get one from Anthropic
            </a>
          </p>
        </div>
      ) : (
        <div className="w-full max-w-4xl space-y-8">
          <div className="mx-auto max-w-md text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Connect your stack</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Grant access to the tools your agents will act on your behalf with. You can add more
              later.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
              {integrations?.map((integration) => (
                <IntegrationCard key={integration.service} integration={integration} />
              ))}
            </div>
          )}

          <div className="mx-auto flex max-w-xl items-center justify-center gap-3 border-t border-border pt-6">
            <Button variant="ghost" onClick={handleFinish}>
              Skip for now
            </Button>
            <Button onClick={handleFinish} className="group">
              Finish & go to dashboard
              <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
