import { expect, test } from "@playwright/test";

test.describe("Dashboard - acesso sem autenticacao", () => {
  test("dashboard redireciona para sign-in", async ({ request }) => {
    const response = await request.get("/dashboard", { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(response.status());
    expect(response.headers().location).toContain("/sign-in");
  });

  test("onboarding redireciona para sign-in", async ({ request }) => {
    const response = await request.get("/onboarding", { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(response.status());
    expect(response.headers().location).toContain("/sign-in");
  });

  test("api dashboard sem sessao devolve json 401", async ({ request }) => {
    const response = await request.get("/api/dashboard");
    expect(response.status()).toBe(401);
    expect(response.headers()["content-type"]).toContain("application/json");
  });

  test("sign-in carrega sem erro 500", async ({ page }) => {
    const response = await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
  });

  test("sign-up carrega sem erro 500", async ({ page }) => {
    const response = await page.goto("/sign-up", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("API publica - booking", () => {
  test("availability retorna resposta controlada para request incompleto", async ({ request }) => {
    const response = await request.get("/api/public/buk-barbearia/availability");
    expect([200, 400, 404]).toContain(response.status());
  });

  test("booking com token invalido retorna 404", async ({ request }) => {
    const response = await request.get("/api/public/booking/token-invalido-xyz");
    expect([404, 400]).toContain(response.status());
  });
});
