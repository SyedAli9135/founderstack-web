import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Zap, Shield, Rocket } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b border-border/40 backdrop-blur-md sticky top-0 z-50">
        <Link className="flex items-center justify-center space-x-2" href="/">
          <div className="bg-primary p-1 rounded-lg">
            <Bot className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tight">FounderStack AI</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="hidden sm:flex text-sm font-medium hover:text-primary transition-colors items-center" href="/sign-in">
            Login
          </Link>
          <Button asChild size="sm">
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-background to-background/50 relative overflow-hidden">
          {/* Subtle Glow Effects */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="container px-4 md:px-6 mx-auto relative z-10">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary shadow-sm space-x-2 animate-pulse">
                <Zap className="h-4 w-4" />
                <span>Now in Beta for V1 Founders</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none max-w-4xl mx-auto">
                The Headless COO for <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent italic">Solo Founders</span>
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl lg:text-2xl font-light leading-relaxed">
                FounderStack AI automates your ops, finances, and marketing so you can focus on building what matters. Your 24/7 autonomous team starts here.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button asChild size="lg" className="h-12 px-8 text-lg font-semibold shadow-lg shadow-primary/20 rounded-full">
                  <Link href="/sign-up">
                    Build Your Agent Team <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-8 text-lg font-semibold rounded-full">
                  <Link href="#features">Learn More</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 border-t border-border/40 bg-zinc-950/20">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 p-8 rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-300">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Zero-Trust Security</h3>
                <p className="text-muted-foreground text-center leading-relaxed">
                  Agents have capabilities, not credentials. Automated tool tokens are handled securely via Arcade AI.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 p-8 rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-300">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Agentic Orchestration</h3>
                <p className="text-muted-foreground text-center leading-relaxed">
                  Complex workflows handled by specialized agents that plan, execute, and verify their own work autonomously.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 p-8 rounded-3xl border border-border/40 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-300">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Rocket className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Rapid Integration</h3>
                <p className="text-muted-foreground text-center leading-relaxed">
                  Connect Stripe, Slack, and your knowledge base in minutes with our native Model Context Protocol support.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-6 px-4 md:px-6 border-t border-border/40 flex flex-col sm:flex-row items-center gap-4 text-muted-foreground bg-background">
        <p className="text-xs">© 2026 FounderStack AI. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacy Policy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
