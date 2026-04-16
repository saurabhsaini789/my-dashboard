import React from "react";
import { dashboardTokens } from "@/lib/design-system"; type DashboardCardProps = { title?: string; description?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string;
}; export function DashboardCard({ title, description, actions, children, className = "",
}: DashboardCardProps) { return ( <section className={`${dashboardTokens.surface.card} rounded-xl p-5 md:p-6 ${className}`}> {(title || description || actions) && ( <div className="mb-5 flex items-start justify-between gap-4"> <div className="min-w-0"> {title && <h2 className={dashboardTokens.text.section}>{title}</h2>} {description && <p className={`mt-1 ${dashboardTokens.text.muted}`}>{description}</p>} </div> {actions && <div className="shrink-0">{actions}</div>} </div> )} {children} </section> );
}
