import React from "react";
import { dashboardTokens, type DashboardTone } from "@/lib/design-system";

type MetricTileProps = {
  label: string;
  value: string | number;
  helper?: string;
  tone?: DashboardTone;
};

export function MetricTile({ label, value, helper, tone = "neutral" }: MetricTileProps) {
  const toneBg = dashboardTokens.state[tone].split(" ")[0];

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-all hover:shadow-sm">
      <p className={dashboardTokens.text.label}>{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
        <span className={`h-2 w-2 rounded-full ${toneBg}`} />
      </div>
      {helper && (
        <p className={`mt-2 ${dashboardTokens.text.muted}`}>
          {helper}
        </p>
      )}
    </div>
  );
}
