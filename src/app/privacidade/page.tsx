import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Informação sobre recolha, utilização e conservação de dados na plataforma ONNEX.PT.",
  alternates: {
    canonical: "/privacidade",
  },
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="Privacidade"
      title="Política de Privacidade"
      description="Explicamos de forma direta como os dados são tratados na plataforma para suportar marcações, comunicação com clientes e operação da barbearia."
      updatedAt="14 de abril de 2026"
    >
      <section className="grid gap-3">
        <h2>1. Que dados recolhemos</h2>
        <p>
          O ONNEX.PT trata os dados necessários para operar a agenda online das
          barbearias, incluindo nome, email, telefone, serviços marcados, histórico de reservas e
          dados internos de configuração do negócio.
        </p>
      </section>

      <section className="grid gap-3">
        <h2>2. Para que usamos os dados</h2>
        <ul>
          <li>criar, confirmar, remarcar e cancelar reservas</li>
          <li>apresentar a página pública de cada negócio</li>
          <li>enviar emails operacionais e lembretes relacionados com a marcação</li>
          <li>dar ao negócio visibilidade sobre agenda, clientes e histórico</li>
          <li>proteger a segurança, integridade e disponibilidade do serviço</li>
        </ul>
      </section>

      <section className="grid gap-3">
        <h2>3. Papel da plataforma e da barbearia</h2>
        <p>
          Cada barbearia é responsável pelos dados dos seus clientes e pela informação publicada na
          sua página. O ONNEX.PT atua como plataforma de suporte técnico e operacional para
          disponibilizar reservas online, acessos autenticados e comunicação transacional.
        </p>
      </section>

      <section className="grid gap-3">
        <h2>4. Conservação e segurança</h2>
        <p>
          Os dados são conservados pelo tempo necessário para operar o serviço, cumprir obrigações
          legais e manter histórico operacional do negócio. Aplicamos controlos técnicos de acesso,
          autenticação e proteção de infraestrutura adequados ao contexto do produto.
        </p>
      </section>

      <section className="grid gap-3">
        <h2>5. Partilha com terceiros</h2>
        <p>
          A plataforma pode recorrer a prestadores externos para autenticação, base de dados,
          alojamento e envio de emails transacionais. Esses prestadores apenas recebem os dados
          estritamente necessários para executar a sua função técnica.
        </p>
      </section>

      <section className="grid gap-3">
        <h2>6. Direitos dos titulares</h2>
        <p>
          Os titulares dos dados podem pedir acesso, retificação, apagamento ou limitação do
          tratamento nos termos aplicáveis. Sempre que o pedido diga respeito a uma reserva numa
          barbearia específica, o negócio responsável deve ser o primeiro ponto de contacto.
        </p>
      </section>

      <section className="grid gap-3">
        <h2>7. Exportar e apagar a tua conta</h2>
        <p>
          Os titulares de conta na plataforma podem, no separador <strong>Gestão</strong> do dashboard:
        </p>
        <ul>
          <li>
            <strong>Exportar dados</strong>: descarregar um ficheiro JSON com utilizador, negócios,
            serviços, equipa, clientes e marcações.
          </li>
          <li>
            <strong>Apagar conta</strong>: eliminar de forma permanente o utilizador, o negócio e todos
            os dados relacionados (cascade). A operação requer confirmação explícita e não é reversível.
          </li>
        </ul>
      </section>

      <section id="cookies" className="grid gap-3">
        <h2>8. Cookies</h2>
        <p>
          A plataforma utiliza apenas cookies tecnicamente necessários (autenticação, sessão, prevenção
          de abuso). Não utilizamos cookies de tracking publicitário. Na primeira visita é mostrado um
          aviso para registo do consentimento.
        </p>
      </section>
    </LegalPageShell>
  );
}
