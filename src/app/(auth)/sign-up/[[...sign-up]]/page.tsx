import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <SignUp 
      forceRedirectUrl="/onboarding"
      appearance={{
        elements: {
          rootBox: 'mx-auto',
          card: 'bg-card border border-border shadow-xl',
        }
      }}
    />
  );
}
