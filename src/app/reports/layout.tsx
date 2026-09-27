import type { Metadata } from "next";

// Shared client reports are private-by-link: never indexed, and rendered
// without any of the signed-in app's chrome.
export const metadata: Metadata = {
  title: "Automation report",
  robots: { index: false, follow: false },
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground">{children}</div>;
}
