import { UserButton } from "@clerk/nextjs";

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <UserButton />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="p-6 rounded-xl border border-border bg-card">
          <h2 className="font-semibold mb-2">Active Agents</h2>
          <p className="text-2xl font-bold text-primary">0</p>
        </div>
        <div className="p-6 rounded-xl border border-border bg-card">
          <h2 className="font-semibold mb-2">Pending Approvals</h2>
          <p className="text-2xl font-bold text-primary">0</p>
        </div>
        <div className="p-6 rounded-xl border border-border bg-card">
          <h2 className="font-semibold mb-2">Tokens (This Month)</h2>
          <p className="text-2xl font-bold text-primary">0</p>
        </div>
      </div>
    </div>
  );
}
