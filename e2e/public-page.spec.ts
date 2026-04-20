import { expect, test } from "@playwright/test";

test.describe("Página pública do negócio", () => {
  test("homepage carrega sem erros", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
  });

  test("página de demo carrega", async ({ page }) => {
    const response = await page.goto("/buk-barbearia", { waitUntil: "domcontentloaded" });
    if (response?.status() === 404) {
      test.skip();
      return;
    }
    expect(response?.status()).toBeLessThan(500);
  });

  test("slug inexistente não dá 500", async ({ page }) => {
    const response = await page.goto("/slug-que-nao-existe-xyz", { waitUntil: "domcontentloaded" });
    expect(response?.status()).not.toBe(500);
  });

  test("página de privacidade carrega", async ({ page }) => {
    const response = await page.goto("/privacidade", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
  });

  test("página de termos carrega", async ({ page }) => {
    const response = await page.goto("/termos", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
  });

  test("sitemap.xml retorna 200", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
  });

  test("robots.txt retorna 200", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
  });
});
