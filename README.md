# FounderStack AI — Web Client

<p align="center">
  <em>The open-source Headless COO for Solo Founders.</em>
</p>

## Overview

FounderStack AI provides solo founders with an autonomous operations team. This repository contains the Next.js Web Client, serving as the dashboard to monitor, intercept, and manage your AI workflows. 

For the Core Orchestration Engine, see the [Backend Repository](link_to_backend).

## Features

- 📊 **Real-Time Dashboards**: Monitor token usage, cost breakdowns, and agent performance.
- ⚡ **Live Feed**: Stream agent reasoning and tool executions in real-time via Server-Sent Events (SSE).
- ✋ **Human-in-the-Loop**: Intercept high-risk actions (like processing refunds or sending public emails) with one-click approval gates.
- 🧩 **Agent Configurator**: Define Agent personas, assign capabilities, and set strict "cost-per-run" limits.
- 📚 **Knowledge Hub**: Drag-and-drop document uploader with live indexing progress to train your internal RAG base.

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Auth**: Clerk (React SDK)
- **State**: TanStack Query v5 (Server) + Zustand (Client)
- **Charts**: Recharts

## Quickstart (Local Dev)

1. **Install Dependencies**:
   ```bash
   git clone https://github.com/yourusername/founderstack-frontend.git
   cd founderstack-frontend
   npm install
   ```
2. **Environment**: 
   Copy `.env.example` to `.env.local` and add your `NEXT_PUBLIC_API_URL` and Clerk keys.
3. **Run**:
   ```bash
   npm run dev
   ```

## License

**GNU Affero General Public License v3.0 (AGPLv3)**

FounderStack AI Web is open-source. You are free to use, modify, and distribute this software. However, if you provide this software (or its modifications) to others over a network as a service, the complete source code must be made publicly available under AGPLv3.


---

## Next.js Automatic Documentation

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
