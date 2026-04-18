"use client";

import { useState } from "react";
import {
  CalendarDays,
  Mail,
  Settings2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "agenda" | "comunicacao" | "clientes" | "gestao";

const tabs: { id: Tab; label: string; icon: typeof CalendarDays }[] = [
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "comunicacao", label: "Comunicação", icon: Mail },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "gestao", label: "Gestão", icon: Settings2 },
];

type DashboardTabsProps = {
  children: {
    agenda: React.ReactNode;
    comunicacao: React.ReactNode;
    clientes: React.ReactNode;
    gestao: React.ReactNode;
  };
};

export function DashboardTabs({ children }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("agenda");

  return (
    <div>
      <div className="mb-6 flex gap-1 rounded-2xl border border-border/70 bg-muted/30 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="size-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div>{children[activeTab]}</div>
    </div>
  );
}
