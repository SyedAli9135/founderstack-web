import { Calendar } from "lucide-react";

// One simplified brand mark per provider — icons the underlying lucide
// set doesn't cover. Google Calendar uses lucide's own Calendar glyph
// instead (see brandIconMap below): a brand-exact calendar icon is mostly
// colored grid squares that don't reduce to a single-color silhouette
// the way the others below do, and the adjacent label already carries
// the identification. Shared between IntegrationCard and the landing
// page so the two never drift out of sync with different path data.
export function SlackIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.042a2.528 2.528 0 0 1-2.522 2.52H8.823a2.528 2.528 0 0 1-2.52-2.52v-5.042zM8.823 5.043a2.528 2.528 0 0 1 2.52-2.522 2.528 2.528 0 0 1 2.522 2.522v2.52h-2.522a2.528 2.528 0 0 1-2.52-2.52zm0 1.261a2.528 2.528 0 0 1 2.52 2.52v5.043a2.528 2.528 0 0 1-2.522 2.522H3.78a2.528 2.528 0 0 1-2.522-2.522V8.824a2.528 2.528 0 0 1 2.522-2.52h5.043zm10.135 10.134a2.528 2.528 0 0 1 2.52-2.52h2.522a2.528 2.528 0 0 1 2.522 2.52 2.528 2.528 0 0 1-2.522 2.522h-2.522a2.528 2.528 0 0 1-2.52-2.522zm-1.262 0a2.528 2.528 0 0 1-2.52 2.522h-5.043a2.528 2.528 0 0 1-2.522-2.522v-5.043a2.528 2.528 0 0 1 2.522-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.043zm-3.781-10.134a2.528 2.528 0 0 1 2.522 2.522v2.52h-2.522a2.528 2.528 0 0 1-2.52-2.52 2.528 2.528 0 0 1 2.52-2.522zm0 1.261a2.528 2.528 0 0 1-2.522 2.52v5.043a2.528 2.528 0 0 1 2.522 2.522h5.043a2.528 2.528 0 0 1 2.52-2.522V8.824a2.528 2.528 0 0 1-2.52-2.52h-5.043z" />
    </svg>
  );
}

export function DiscordIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.211.375-.444.879-.608 1.279a18.27 18.27 0 0 0-5.487 0A12.6 12.6 0 0 0 9.182 3a19.74 19.74 0 0 0-4.435 1.371C1.678 8.885.933 13.3 1.306 17.653a19.9 19.9 0 0 0 5.993 2.99c.483-.647.913-1.334 1.283-2.06a12.9 12.9 0 0 1-2.02-.955c.17-.121.335-.248.494-.378a14.2 14.2 0 0 0 12.05 0c.16.13.325.257.495.378-.643.377-1.319.694-2.02.955.37.726.8 1.413 1.283 2.06a19.86 19.86 0 0 0 6.002-2.99c.463-5.043-.803-9.416-3.549-13.284ZM8.885 15.03c-1.183 0-2.156-1.075-2.156-2.393 0-1.319.949-2.394 2.156-2.394 1.207 0 2.18 1.075 2.156 2.394 0 1.318-.949 2.393-2.156 2.393Zm6.23 0c-1.183 0-2.156-1.075-2.156-2.393 0-1.319.948-2.394 2.156-2.394 1.207 0 2.179 1.075 2.156 2.394 0 1.318-.949 2.393-2.156 2.393Z" />
    </svg>
  );
}

export function LinkedInIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"
      />
    </svg>
  );
}

export function StripeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.962 10.631c-1.46-.228-2.264-.56-2.264-1.282 0-.649.699-1.002 1.884-1.002 1.517 0 2.973.456 3.965.986l1.003-3.155c-.933-.42-2.585-.828-4.708-.828-3.791 0-6.19 1.942-6.19 5.228 0 3.528 2.915 4.549 5.86 5.207 1.916.429 2.501.815 2.501 1.488 0 .749-.858 1.156-2.28 1.156-1.916 0-3.792-.619-4.876-1.189l-1.07 3.197c1.173.57 3.196 1.055 5.617 1.055 4.195 0 6.848-1.928 6.848-5.385.002-3.882-3.037-4.786-6.09-5.28z" />
    </svg>
  );
}

export function GoogleDriveIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19.43 12.98L12 24h-3.43l7.43-12.98h3.43zM8.57 12.98L1.14 0h3.43l7.43 12.98H8.57zm.57-1L16.57 0h3.43L12.57 11.98H9.14z" />
    </svg>
  );
}

export function NotionIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.2 3h15.6c.7 0 1.2.5 1.2 1.2v15.6c0 .7-.5 1.2-1.2 1.2H4.2C3.5 22 3 21.5 3 20.8V4.2C3 3.5 3.5 3 4.2 3zm4.5 4v6.8l3.7-6.8H15v10h-2V9.8L9.2 17H7V7h1.7z"
      />
    </svg>
  );
}

export const brandIconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  slack: SlackIcon,
  discord: DiscordIcon,
  linkedin: LinkedInIcon,
  github: GitHubIcon,
  stripe: StripeIcon,
  google_drive: GoogleDriveIcon,
  google_calendar: Calendar,
  notion: NotionIcon,
};

// Text-color-only pairs — brand hue touches just the glyph, never card
// chrome, so eight different brand colors don't turn a grid into a
// rainbow.
export const brandColorMap: Record<string, string> = {
  slack: "text-[#4A154B] dark:text-[#ECB22E]",
  discord: "text-[#5865F2]",
  linkedin: "text-[#0A66C2]",
  github: "text-foreground",
  stripe: "text-[#635BFF]",
  google_drive: "text-[#1FA463]",
  google_calendar: "text-[#1A73E8]",
  notion: "text-foreground",
};
