import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/lib/safe-json-ld";

const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

describe("serializeJsonLd", () => {
  it("escapa < e > para impedir a quebra do bloco <script> (XSS)", () => {
    const out = serializeJsonLd({
      name: "</script><script>alert(document.cookie)</script>",
    });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<script>");
    expect(out).toContain("\\u003c");
    expect(out).toContain("\\u003e");
  });

  it("escapa o caractere &", () => {
    const out = serializeJsonLd({ name: "Tó & Filhos" });
    expect(out).toContain("\\u0026");
    expect(out).not.toMatch(/[^\\]&/);
  });

  it("continua a ser JSON válido e desescapável", () => {
    const payload = {
      "@type": "BarberShop",
      name: "</script> Barbearia <b>top</b> & Cª",
      description: `Linha 1${LS}Linha 2${PS}fim`,
    };
    const out = serializeJsonLd(payload);
    expect(JSON.parse(out)).toEqual(payload);
  });

  it("escapa os separadores de linha U+2028 e U+2029", () => {
    const out = serializeJsonLd({ text: `a${LS}b${PS}c` });
    expect(out).not.toContain(LS);
    expect(out).not.toContain(PS);
    expect(out).toContain("\\u2028");
    expect(out).toContain("\\u2029");
  });
});
