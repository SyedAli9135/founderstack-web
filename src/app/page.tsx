import Link from "next/link";
import { Button } from "@/components/ui/button";
import { brandIconMap, brandColorMap } from "@/components/integrations/brand-icons";
import { ArrowRight, KeyRound, Puzzle, Bot } from "lucide-react";

const CONNECTED_SERVICES = [
  "slack",
  "discord",
  "notion",
  "google_drive",
  "google_calendar",
  "stripe",
  "github",
  "linkedin",
];

const FEATURES = [
  {
    icon: KeyRound,
    title: "Bring your own key",
    description:
      "Add your Anthropic API key once. It's encrypted with AES-256 and never leaves your workspace — you're never paying us a markup on model usage.",
  },
  {
    icon: Puzzle,
    title: "One panel, eight integrations",
    description:
      "Slack, Notion, Google Drive, Google Calendar, GitHub, Stripe, LinkedIn, Discord — connect each once and your agents can act on all of them.",
  },
  {
    icon: Bot,
    title: "Built for one person",
    description:
      "No team seats, no admin console, no enterprise sales call. FounderStack runs the parts of your business you don't have time for — solo, from day one.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 flex h-16 items-center border-b border-border bg-background px-4 lg:px-6">
        <Link className="flex items-center" href="/">
          <span className="text-lg font-semibold tracking-tight">FounderStack</span>
        </Link>
        <nav className="ml-auto flex items-center gap-4">
          <Link
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
            href="/sign-in"
          >
            Sign in
          </Link>
          <Button asChild size="sm">
            <Link href="/sign-up">
              Get started
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-24 text-center md:py-32">
          <p className="text-sm font-medium text-muted-foreground">Private beta</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
            The Headless COO for <span className="text-primary">solo founders</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Connect the tools you already run your business on. Bring your own Anthropic key. Let
            agents handle the busywork while you build.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/sign-up">
                Get started
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>

          <div className="mt-16">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Works with the tools you already use
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {CONNECTED_SERVICES.map((service) => {
                const Icon = brandIconMap[service];
                return (
                  <div
                    key={service}
                    className={`flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card ${brandColorMap[service] ?? "text-foreground"}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-20 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title}>
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-primary">
                  <feature.icon className="h-4 w-4" />
                </div>
                <h3 className="mt-4 text-sm font-medium">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="flex flex-col items-center gap-3 border-t border-border px-4 py-6 text-muted-foreground sm:flex-row">
        <p className="text-xs">© 2026 FounderStack. All rights reserved.</p>
        <nav className="flex gap-6 sm:ml-auto">
          <Link className="text-xs underline-offset-4 hover:underline" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs underline-offset-4 hover:underline" href="#">
            Privacy Policy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
