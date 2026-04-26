"use client";

import { useState } from "react";
import {
  CalendarDays,
  ExternalLink,
  LayoutTemplate,
  Mail,
  Menu,
  Settings2,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "agenda" | "comunicacao" | "clientes" | "pagina" | "gestao";

const tabs: { id: Tab; label: string; icon: typeof CalendarDays }[] = [
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "comunicacao", label: "Comunicação", icon: Mail },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "pagina", label: "Página", icon: LayoutTemplate },
  { id: "gestao", label: "Gestão", icon: Settings2 },
];

type DashboardTabsProps = {
  businessName: string;
  slug: string;
  stats: { label: string; value: string; color: string }[];
  userButton: React.ReactNode;
  children: {
    agenda: React.ReactNode;
    comunicacao: React.ReactNode;
    clientes: React.ReactNode;
    pagina: React.ReactNode;
    gestao: React.ReactNode;
  };
};

export function DashboardTabs({
  businessName,
  slug,
  stats,
  userButton,
  children,
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("agenda");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-accent text-sm font-bold text-sidebar-accent-foreground">
            {businessName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{businessName}</p>
            <p className="truncate text-xs text-muted-foreground">/{slug}</p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-muted-foreground hover:text-sidebar-foreground lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Menu
          </p>
          <div className="grid gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  activeTab === tab.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <tab.icon className="size-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="border-t border-sidebar-border px-5 py-4">
          <a
            href={`/${slug}`}
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-muted-foreground transition hover:text-sidebar-foreground"
          >
            <ExternalLink className="size-3.5" />
            Ver página pública
          </a>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="size-4" />
            </button>
            <h1 className="text-lg font-semibold">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {userButton}
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-4 sm:px-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={cn("rounded-xl px-4 py-3", stat.color)}
            >
              <p className="text-xs font-medium opacity-80">{stat.label}</p>
              <p className="mt-1 text-xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 px-4 pb-8 sm:px-6">
          {children[activeTab]}
        </div>
      </div>
    </div>
  );
}
