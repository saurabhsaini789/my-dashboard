import React from "react";
import { dashboardTokens } from "@/lib/design-system"; type SectionHeaderProps = { title: string; description?: string; actions?: React.ReactNode;
}; export function SectionHeader({ title, description, actions }: SectionHeaderProps) { return ( <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"> <div> <h2 className={dashboardTokens.text.section}>{title}</h2> {description && <p className={`mt-1 ${dashboardTokens.text.muted}`}>{description}</p>} </div> {actions && <div className="shrink-0">{actions}</div>} </div> );
}
