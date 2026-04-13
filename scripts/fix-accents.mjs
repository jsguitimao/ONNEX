import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const map = {
  operacao: "operação",
  operacoes: "operações",
  operacional: "operacional",
  servico: "serviço",
  servicos: "serviços",
  gestao: "gestão",
  pagina: "página",
  paginas: "páginas",
  publica: "pública",
  publico: "público",
  marcacao: "marcação",
  marcacoes: "marcações",
  confirmacao: "confirmação",
  confirmacoes: "confirmações",
  localizacao: "localização",
  localizacoes: "localizações",
  informacao: "informação",
  informacoes: "informações",
  notificacao: "notificação",
  notificacoes: "notificações",
  negocio: "negócio",
  negocios: "negócios",
  historico: "histórico",
  calendario: "calendário",
  proximo: "próximo",
  proxima: "próxima",
  ultimo: "último",
  ultima: "última",
  numero: "número",
  codigo: "código",
  endereco: "endereço",
  periodo: "período",
  rapida: "rápida",
  rapido: "rápido",
  facil: "fácil",
  faceis: "fáceis",
  visao: "visão",
  decisao: "decisão",
  conclusao: "conclusão",
  aplicacao: "aplicação",
  automacao: "automação",
  integracao: "integração",
  organizacao: "organização",
  comunicacao: "comunicação",
  criacao: "criação",
  geracao: "geração",
  validacao: "validação",
  automatica: "automática",
  automatico: "automático",
  simbolo: "símbolo",
  nao: "não",
  ola: "olá",
  ja: "já",
  ate: "até",
  tres: "três",
  sao: "são",
  sera: "será",
  estao: "estão",
  tambem: "também",
  porem: "porém",
  alem: "além",
  atencao: "atenção",
  direcao: "direção",
  execucao: "execução",
  atras: "atrás",
  experiencia: "experiência",
  referencia: "referência",
  frequencia: "frequência",
  presenca: "presença",
  urgencia: "urgência",
  existencia: "existência",
  preferencia: "preferência",
  ocorrencia: "ocorrência",
  transparencia: "transparência",
  eficiencia: "eficiência",
  inteligencia: "inteligência",
  competencia: "competência",
  nivel: "nível",
  niveis: "níveis",
  estrategia: "estratégia",
  categoria: "categoria",
  memoria: "memória",
  tecnologia: "tecnologia",
  agencia: "agência",
  sequencia: "sequência",
  pendencia: "pendência",
  util: "útil",
  uteis: "úteis",
  possivel: "possível",
  impossivel: "impossível",
  disponivel: "disponível",
  responsavel: "responsável",
};

// Delete same-mapping (when already correct) to avoid no-ops
for (const k of Object.keys(map)) {
  if (map[k] === k) delete map[k];
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const files = execSync(
  'git ls-files "src/**/*.ts" "src/**/*.tsx"',
  { cwd: process.cwd(), encoding: "utf8" }
).split("\n").filter(Boolean);

let totalReplacements = 0;
const touched = [];

for (const file of files) {
  let content = readFileSync(file, "utf8");
  const original = content;
  let fileCount = 0;

  for (const [wrong, right] of Object.entries(map)) {
    // lowercase
    const reLower = new RegExp(`\\b${wrong}\\b`, "g");
    content = content.replace(reLower, (m) => {
      fileCount++;
      return right;
    });
    // Capitalized
    const reCap = new RegExp(`\\b${cap(wrong)}\\b`, "g");
    content = content.replace(reCap, (m) => {
      fileCount++;
      return cap(right);
    });
  }

  if (content !== original) {
    writeFileSync(file, content);
    touched.push(`${file}: ${fileCount}`);
    totalReplacements += fileCount;
  }
}

console.log(`Total: ${totalReplacements} replacements in ${touched.length} files`);
for (const t of touched) console.log(`  ${t}`);
