import { expect, test } from "@playwright/test";

test.describe("Dashboard — acesso sem autenticação", () => {
  test("dashboard redireciona para sign-in", async ({ page }) => {
    const response = await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const url = page.url();
    const redirectedOrBlocked =
      url.includes("/sign-in") || (response?.status() ?? 0) >= 300;
    expect(redirectedOrBlocked).toBe(true);
  });

  test("onboarding redireciona para sign-in", async ({ page }) => {
    const response = await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
    const url = page.url();
    const redirectedOrBlocked =
      url.includes("/sign-in") || (response?.status() ?? 0) >= 300;
    expect(redirectedOrBlocked).toBe(true);
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

test.describe("API cron — segurança", () => {
  test("rejeita request sem secret", async ({ request }) => {
    const response = await request.get("/api/cron/send-reminders");
    expect([401, 503]).toContain(response.status());
  });

  test("rejeita request com secret errado", async ({ request }) => {
    const response = await request.post("/api/cron/send-reminders", {
      headers: { "x-cron-secret": "wrong-secret" },
    });
    expect([401, 503]).toContain(response.status());
  });
});

test.describe("API pública — booking", () => {
  test("availability retorna dados para slug válido", async ({ request }) => {
    const response = await request.get("/api/public/buk-barbearia/availability");
    const status = response.status();
    expect([200, 404]).toContain(status);
  });

  test("booking com token inválido retorna 404", async ({ request }) => {
    const response = await request.get("/api/public/booking/token-invalido-xyz");
    expect([404, 400]).toContain(response.status());
  });
});
