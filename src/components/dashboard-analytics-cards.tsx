import { ArrowDownRight, ArrowUpRight, BadgePercent, Minus, Sparkles, Wallet } from "lucide-react";
import type { DashboardAnalytics } from "@/lib/business-modules/dashboard";
import { formatEuro } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

type Props = {
  analytics: DashboardAnalytics;
};

export function DashboardAnalyticsCards({ analytics }: Props) {
  const deltaIcon = (() => {
    if (analytics.weeklyDeltaPct === null) return Minus;
    if (analytics.weeklyDeltaPct > 0) return ArrowUpRight;
    if (analytics.weeklyDeltaPct < 0) return ArrowDownRight;
    return Minus;
  })();
  const DeltaIcon = deltaIcon;

  const deltaText =
    analytics.weeklyDeltaPct === null
      ? "sem histórico"
      : `${analytics.weeklyDeltaPct > 0 ? "+" : ""}${analytics.weeklyDeltaPct}% vs semana passada`;

  const cards = [
    {
      key: "weekly",
      label: "Reservas (7d)",
      value: analytics.bookingsThisWeek.toString(),
      hint: deltaText,
      Icon: DeltaIcon,
      tone:
        analytics.weeklyDeltaPct !== null && analytics.weeklyDeltaPct < 0
          ? "border-amber-500/30 text-amber-700 dark:text-amber-300"
          : "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
    },
    {
      key: "revenue",
      label: "Receita confirmada (30d)",
      value: formatEuro(analytics.confirmedRevenueCents30d),
      hint: "CONFIRMED + COMPLETED",
      Icon: Wallet,
      tone: "border-amber-500/30 text-amber-700 dark:text-amber-300",
    },
    {
      key: "cancellation",
      label: "Cancelamentos (30d)",
      value: `${analytics.cancellationRatePct}%`,
      hint: analytics.cancellationRatePct >= 25 ? "atenção" : "saudável",
      Icon: BadgePercent,
      tone:
        analytics.cancellationRatePct >= 25
          ? "border-destructive/40 text-destructive"
          : "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
    },
    {
      key: "topService",
      label: "Top serviço (30d)",
      value: analytics.topService?.name ?? "—",
      hint: analytics.topService
        ? `${analytics.topService.bookings} marcações`
        : "sem dados",
      Icon: Sparkles,
      tone: "border-violet-500/30 text-violet-700 dark:text-violet-300",
    },
  ];

  return (
    <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className={cn(
            "rounded-2xl border bg-card p-4 transition",
            card.tone,
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">{card.label}</p>
            <card.Icon className="size-4 opacity-70" aria-hidden />
          </div>
          <p className="truncate text-xl font-bold text-foreground">{card.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
        </div>
      ))}
    </section>
  );
}
