"use client";

import { UserButton } from "@clerk/nextjs";
import { ApiKeyForm } from "@/components/onboarding/ApiKeyForm";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function OnboardingPage() {
  const router = useRouter();

  const handleSuccess = () => {
    // Small delay to let the toast be seen
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-zinc-950 text-center relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="z-10 w-full max-w-xl"
      >
        <div className="mb-12 flex justify-center">
          <UserButton appearance={{ elements: { userButtonAvatarBox: "w-10 h-10 border border-zinc-800" } }} />
        </div>

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Setting up your Forge
          </h1>
          <p className="text-zinc-400 max-w-sm mx-auto text-sm leading-relaxed">
            Every great founder needs a powerful team. Secure your workspace with an Anthropic key to start building your agentic workflows.
          </p>
        </div>

        <ApiKeyForm onSuccess={handleSuccess} />

        <p className="mt-8 text-zinc-600 text-xs">
          Need a key? <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Get one from Anthropic</a>
        </p>
      </motion.div>
    </div>
  );
}
