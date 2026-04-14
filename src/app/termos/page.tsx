import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Termos",
  description: "Condicoes gerais de utilizacao da plataforma BUKBARBEARIA.COM.",
  alternates: {
    canonical: "/termos",
  },
};

export default function TermsPage() {
  return (
    <LegalPageShell
      eyebrow="Termos"
      title="Termos de Utilizacao"
      description="Estas condicoes definem as regras basicas de acesso e uso da plataforma, tanto para os negocios que a configuram como para os clientes que marcam online."
      updatedAt="14 de abril de 2026"
    >
      <section className="grid gap-3">
        <h2>1. Objeto do servico</h2>
        <p>
          O BUKBARBEARIA.COM disponibiliza uma plataforma para gestao de agenda, pagina publica,
          equipa, clientes e comunicacao operacional de barbearias.
        </p>
      </section>

      <section className="grid gap-3">
        <h2>2. Contas e acesso</h2>
        <p>
          Cada negocio e responsavel por manter os acessos da sua conta protegidos, atualizar a
          informacao publicada e garantir que os utilizadores internos so acedem ao que lhes diz
          respeito.
        </p>
      </section>

      <section className="grid gap-3">
        <h2>3. Utilizacao aceitavel</h2>
        <ul>
          <li>usar a plataforma apenas para fins legitimos de gestao e marcacao</li>
          <li>nao publicar informacao enganosa, ofensiva ou ilicita</li>
          <li>nao tentar contornar controlos de autenticacao, seguranca ou limite tecnico</li>
          <li>nao usar a plataforma para spam ou envio de comunicacoes nao autorizadas</li>
        </ul>
      </section>

      <section className="grid gap-3">
        <h2>4. Reservas e disponibilidade</h2>
        <p>
          A disponibilidade mostrada em cada pagina publica depende da configuracao da barbearia,
          dos profissionais ativos, dos bloqueios de agenda e das regras definidas pelo proprio
          negocio. Reservas podem ser recusadas, ajustadas ou canceladas quando existam motivos
          operacionais validos.
        </p>
      </section>

      <section className="grid gap-3">
        <h2>5. Comunicacao e notificacoes</h2>
        <p>
          A plataforma pode enviar emails operacionais relacionados com a reserva, como confirmacao,
          cancelamento, remarcacao e lembretes. Essas mensagens fazem parte do funcionamento normal
          do servico.
        </p>
      </section>

      <section className="grid gap-3">
        <h2>6. Disponibilidade da plataforma</h2>
        <p>
          Fazemos o possivel para manter o servico estavel e atualizado, mas podem existir
          interrupcoes pontuais por manutencao, integracoes externas, rede ou infraestrutura.
        </p>
      </section>

      <section className="grid gap-3">
        <h2>7. Atualizacao dos termos</h2>
        <p>
          Estes termos podem ser ajustados para refletir evolucao funcional, tecnica ou legal do
          produto. A versao mais recente fica sempre disponivel nesta pagina.
        </p>
      </section>
    </LegalPageShell>
  );
}
