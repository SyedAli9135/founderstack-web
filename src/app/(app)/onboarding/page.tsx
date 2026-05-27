import { UserButton } from "@clerk/nextjs";

export default function OnboardingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center">
      <div className="mb-8">
        <UserButton />
      </div>
      <h1 className="text-3xl font-bold mb-4">Welcome to FounderStack!</h1>
      <p className="text-muted-foreground max-w-md mx-auto">
        We're glad to have you. This is the onboarding page where you'll soon configure your API keys and first integrations.
      </p>
      <div className="mt-8 p-6 border border-dashed border-border rounded-xl">
        <p className="text-primary font-medium italic">Workflow 3 is currently under construction...</p>
      </div>
    </div>
  );
}
