const stats = [
  { label: "Active agents", value: 0 },
  { label: "Pending approvals", value: 0 },
  { label: "Tokens this month", value: 0 },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
