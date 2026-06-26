import type { LucideIcon } from "lucide-react";

export type CrmSectionId = "painel-visual" | "clientes" | "agendamentos" | "whatsapp" | "financeiro";
export type CrmActionKind = "clientes" | "agendamentos";
export type AcceptanceMode = "automatico" | "manual";

export type SectionConfig = {
  id: CrmSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  action?: string;
};
