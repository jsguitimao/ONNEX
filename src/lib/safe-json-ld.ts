// Serializa JSON para embeber dentro de um <script>. `JSON.stringify` NÃO escapa
// `<`, por isso um campo controlado pelo utilizador (ex.: nome/descrição do
// negócio) que contenha `</script>` quebraria o bloco e injetaria HTML — XSS
// armazenado contra os visitantes da página pública.
//
// Escapamos `<` `>` `&` e os separadores de linha U+2028/U+2029 (válidos em JSON
// mas que quebram alguns parsers de script). O resultado continua a ser JSON
// válido: estas sequências `\uXXXX` são desescapadas pelo parser de JSON-LD.
//
// Nota: U+2028/U+2029 são terminadores de linha em JS, por isso não podem
// aparecer literalmente num regex no código-fonte. Usamos `String.fromCharCode`
// + `split/join` para os referir sem os escrever diretamente.
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .split(LINE_SEPARATOR)
    .join("\\u2028")
    .split(PARAGRAPH_SEPARATOR)
    .join("\\u2029");
}
