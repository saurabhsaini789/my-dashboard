import React from "react";
import { dashboardTokens, type DashboardTone } from "@/lib/design-system"; type StatusBadgeProps = { tone?: DashboardTone; children: React.ReactNode; className?: string;
}; export function StatusBadge({ tone = "neutral", children, className = "" }: StatusBadgeProps) { return ( <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${dashboardTokens.state[tone]} ${className}`} > {children} </span> );
}
