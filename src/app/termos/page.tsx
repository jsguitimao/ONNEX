import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Termos de Utilização",
  description: "Condições gerais de utilização da plataforma ONNEX.PT.",
  alternates: {
    canonical: "/termos",
  },
};

export default function TermsPage() {
  return (
    <LegalPageShell
      eyebrow="Termos"
      title="Termos de Utilização"
      description="Estas condições definem as regras básicas de acesso e uso da plataforma, tanto para os negócios que a configuram como para os clientes que marcam online."
      updatedAt="14 de abril de 2026"
    >
      <section className="grid gap-3">
        <h2>1. Objeto do serviço</h2>
        <p>
          O ONNEX.PT disponibiliza uma plataforma para gestão de agenda, página pública,
          equipa, clientes e comunicação operacional de barbearias.
        </p>
      </section>

      <section className="grid gap-3">
        <h2>2. Contas e acesso</h2>
        <p>
          Cada negócio é responsável por manter os acessos da sua conta protegidos, atualizar a
          informação publicada e garantir que os utilizadores internos só acedem ao que lhes diz
          respeito.
        </p>
      </section>

      <section className="grid gap-3">
        <h2>3. Utilização aceitável</h2>
        <ul>
          <li>usar a plataforma apenas para fins legítimos de gestão e marcação</li>
          <li>não publicar informação enganosa, ofensiva ou ilícita</li>
          <li>não tentar contornar controlos de autenticação, segurança ou limite técnico</li>
          <li>não usar a plataforma para spam ou envio de comunicações não autorizadas</li>
        </ul>
      </section>

      <section className="grid gap-3">
        <h2>4. Reservas e disponibilidade</h2>
        <p>
          A disponibilidade mostrada em cada página pública depende da configuração da barbearia,
          dos profissionais ativos, dos bloqueios de agenda e das regras definidas pelo próprio
          negócio. Reservas podem ser recusadas, ajustadas ou canceladas quando existam motivos
          operacionais válidos.
        </p>
      </section>

      <section className="grid gap-3">
        <h2>5. Comunicação e notificações</h2>
        <p>
          A plataforma pode enviar emails operacionais relacionados com a reserva, como confirmação,
          cancelamento, remarcação e lembretes. Essas mensagens fazem parte do funcionamento normal
          do serviço.
        </p>
      </section>

      <section className="grid gap-3">
        <h2>6. Disponibilidade da plataforma</h2>
        <p>
          Fazemos o possível para manter o serviço estável e atualizado, mas podem existir
          interrupções pontuais por manutenção, integrações externas, rede ou infraestrutura.
        </p>
      </section>

      <section className="grid gap-3">
        <h2>7. Atualização dos termos</h2>
        <p>
          Estes termos podem ser ajustados para refletir evolução funcional, técnica ou legal do
          produto. A versão mais recente fica sempre disponível nesta página.
        </p>
      </section>
    </LegalPageShell>
  );
}
