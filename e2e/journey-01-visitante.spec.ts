import { expect, test } from "@playwright/test";

// ETAPA 1 da jornada — visitante anónimo chega à plataforma.
// Cobre: landing (conteúdo comercial), páginas legais, SEO e os headers de
// segurança que TODAS as respostas devem transportar.

test.describe("Etapa 1 — Visitante: landing", () => {
  test("landing carrega com a proposta e os 3 planos", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);

    const html = (await page.content()).toLowerCase();
    expect(html).toContain("onnex");
    // Preços dos 3 planos (mensal / trimestral / anual)
    expect(html).toContain("25,99");
    expect(html).toContain("66,99");
    expect(html).toContain("249,99");
  });

  test("landing tem o email de suporte clicável", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const mailtos = page.locator('a[href^="mailto:onnex.pt@gmail.com"]');
    expect(await mailtos.count()).toBeGreaterThanOrEqual(3);
  });

  test("landing liga às páginas legais", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator('a[href="/privacidade"]').first()).toBeAttached();
    await expect(page.locator('a[href="/termos"]').first()).toBeAttached();
  });

  test("privacidade e termos carregam e têm contacto RGPD", async ({ page }) => {
    const privacy = await page.goto("/privacidade", { waitUntil: "domcontentloaded" });
    expect(privacy?.status()).toBe(200);
    await expect(page.locator('a[href^="mailto:onnex.pt@gmail.com"]').first()).toBeAttached();

    const terms = await page.goto("/termos", { waitUntil: "domcontentloaded" });
    expect(terms?.status()).toBe(200);
  });

  test("sitemap.xml e robots.txt respondem 200", async ({ request }) => {
    expect((await request.get("/sitemap.xml")).status()).toBe(200);
    expect((await request.get("/robots.txt")).status()).toBe(200);
  });
});

test.describe("Etapa 1 — Segurança transversal: headers", () => {
  test("respostas transportam os headers de segurança", async ({ request, baseURL }) => {
    const response = await request.get("/privacidade");
    const headers = response.headers();

    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["content-security-policy"]).toBeTruthy();
    expect(headers["x-frame-options"] ?? headers["content-security-policy"]).toBeTruthy();

    // HSTS só faz sentido (e só é honrado) em HTTPS — produção.
    if (baseURL?.startsWith("https://")) {
      expect(headers["strict-transport-security"]).toContain("max-age");
    }
  });
});
