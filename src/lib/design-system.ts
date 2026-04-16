export const dashboardTokens = {
  radius: {
    sm: "rounded-md",
    md: "rounded-lg",
    lg: "rounded-xl",
  },
  surface: {
    page: "bg-background text-foreground",
    card: "border border-border bg-card shadow-sm",
    muted: "bg-muted/5",
  },
  text: {
    title: "text-2xl font-semibold tracking-tight text-foreground",
    section: "text-base font-semibold text-foreground",
    body: "text-sm text-card-foreground",
    muted: "text-sm text-muted-foreground",
    label: "text-xs font-medium text-muted-foreground",
  },
  state: {
    critical: "bg-error/10 text-error",
    important: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
    info: "bg-info/10 text-info",
    neutral: "bg-muted/10 text-muted",
  },
} as const;

export type DashboardTone = keyof typeof dashboardTokens.state;
