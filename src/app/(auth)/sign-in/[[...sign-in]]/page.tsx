import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn 
      forceRedirectUrl="/dashboard"
      appearance={{
        elements: {
          rootBox: 'mx-auto',
          card: 'bg-card border border-border shadow-xl',
        }
      }}
    />
  );
}
