import { Sparkles, Atom, Gem, Cpu, Waves } from "lucide-react";

// Generic lucide glyphs, not exact brand marks — same call
// brand-icons.tsx already makes for Google Calendar (a brand-exact icon
// there was mostly colored grid squares not worth reducing to a single
// silhouette); these 5 LLM providers' real logos have the same problem,
// so a distinct recognizable shape + brand-ish color per provider does
// the identification job without a fragile hand-traced path.
export const llmProviderIconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  anthropic: Sparkles,
  openai: Atom,
  gemini: Gem,
  qwen: Cpu,
  deepseek: Waves,
};

export const llmProviderColorMap: Record<string, string> = {
  anthropic: "text-[#D97757]",
  openai: "text-foreground",
  gemini: "text-[#4285F4]",
  qwen: "text-[#615CED]",
  deepseek: "text-[#4D6BFE]",
};

// Frontend-only — the backend's Catalog has no reason to know signup
// URLs, that's purely a UI concern for the "need a key?" link.
export const llmProviderSignupURL: Record<string, string> = {
  anthropic: "https://console.anthropic.com/",
  openai: "https://platform.openai.com/api-keys",
  gemini: "https://aistudio.google.com/apikey",
  qwen: "https://bailian.console.aliyun.com/",
  deepseek: "https://platform.deepseek.com/api_keys",
};
