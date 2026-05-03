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
