import { CalendarDays, LayoutDashboard, UsersRound, WalletCards } from "lucide-react";
import type { SectionConfig } from "./crm-types";

export const sections: SectionConfig[] = [
  {
    id: "painel-visual",
    label: "Painel Visual",
    description: "Edita a página pública da barbearia.",
    icon: LayoutDashboard,
  },
  {
    id: "clientes",
    label: "Cliente",
    description: "Base de contactos, preferências e histórico.",
    icon: UsersRound,
    action: "Novo cliente",
  },
  {
    id: "agendamentos",
    label: "Agendamento",
    description: "Marcações, estado, origem e equipa.",
    icon: CalendarDays,
    action: "Marcação manual",
  },
  {
    id: "financeiro",
    label: "Financeiro",
    description: "Valores lançados quando o profissional finaliza o serviço.",
    icon: WalletCards,
  },
];
