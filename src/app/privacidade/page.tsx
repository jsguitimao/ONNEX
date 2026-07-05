import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacidade",
  description: "Informacao sobre recolha, utilizacao e conservacao de dados na plataforma ONNEX.PT.",
  alternates: {
    canonical: "/privacidade",
  },
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="Privacidade"
      title="Politica de Privacidade"
      description="Explicamos de forma direta como os dados sao tratados na plataforma para suportar marcacoes, comunicacao com clientes e operacao da barbearia."
      updatedAt="14 de abril de 2026"
    >
      <section className="grid gap-3">
        <h2>1. Que dados recolhemos</h2>
        <p>
          O ONNEX.PT trata os dados necessarios para operar a agenda online das
          barbearias, incluindo nome, email, telefone, servicos marcados, historico de reservas e
          dados internos de configuracao do negocio.
        </p>
      </section>

      <section className="grid gap-3">
        <h2>2. Para que usamos os dados</h2>
        <ul>
          <li>criar, confirmar, remarcar e cancelar reservas</li>
          <li>apresentar a pagina publica de cada negocio</li>
          <li>enviar emails operacionais e lembretes relacionados com a marcacao</li>
          <li>dar ao negocio visibilidade sobre agenda, clientes e historico</li>
          <li>proteger a seguranca, integridade e disponibilidade do servico</li>
        </ul>
      </section>

      <section className="grid gap-3">
        <h2>3. Papel da plataforma e da barbearia</h2>
        <p>
          Cada barbearia e responsavel pelos dados dos seus clientes e pela informacao publicada na
          sua pagina. O ONNEX.PT atua como plataforma de suporte tecnico e operacional para
          disponibilizar reservas online, acessos autenticados e comunicacao transacional.
        </p>
      </section>

      <section className="grid gap-3">
        <h2>4. Conservacao e seguranca</h2>
        <p>
          Os dados sao conservados pelo tempo necessario para operar o servico, cumprir obrigacoes
          legais e manter historico operacional do negocio. Aplicamos controlos tecnicos de acesso,
          autenticacao e protecao de infraestrutura adequados ao contexto do produto.
        </p>
      </section>

      <section className="grid gap-3">
        <h2>5. Partilha com terceiros</h2>
        <p>
          A plataforma pode recorrer a prestadores externos para autenticacao, base de dados,
          alojamento e envio de emails transacionais. Esses prestadores apenas recebem os dados
          estritamente necessarios para executar a sua funcao tecnica.
        </p>
      </section>

      <section className="grid gap-3">
        <h2>6. Direitos dos titulares</h2>
        <p>
          Os titulares dos dados podem pedir acesso, retificacao, apagamento ou limitacao do
          tratamento nos termos aplicaveis. Sempre que o pedido diga respeito a uma reserva numa
          barbearia especifica, o negocio responsavel deve ser o primeiro ponto de contacto.
        </p>
      </section>

      <section className="grid gap-3">
        <h2>7. Exportar e apagar a tua conta</h2>
        <p>
          Os titulares de conta na plataforma podem, no separador <strong>Gestão</strong> do dashboard:
        </p>
        <ul>
          <li>
            <strong>Exportar dados</strong>: descarregar um ficheiro JSON com utilizador, negocios,
            servicos, equipa, clientes e marcacoes.
          </li>
          <li>
            <strong>Apagar conta</strong>: eliminar de forma permanente o utilizador, o negocio e todos
            os dados relacionados (cascade). A operacao requer confirmacao explicita e nao e reversivel.
          </li>
        </ul>
      </section>

      <section id="cookies" className="grid gap-3">
        <h2>8. Cookies</h2>
        <p>
          A plataforma utiliza apenas cookies tecnicamente necessarios (autenticacao, sessao, prevencao
          de abuso). Nao utilizamos cookies de tracking publicitario. Na primeira visita e mostrado um
          aviso para registo do consentimento.
        </p>
      </section>
    </LegalPageShell>
  );
}
