import React from "react";
import { dashboardTokens } from "@/lib/design-system";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className={dashboardTokens.text.label}>{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className={`mt-2 ${dashboardTokens.text.muted}`}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
