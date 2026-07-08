import { expect, test } from "@playwright/test";

// ETAPA 2 da jornada — criação de conta e paywall.
// Cobre: páginas de autenticação, proteção de TODAS as rotas privadas sem
// sessão, APIs privadas a exigirem autenticação, e o paywall a fechar o
// negócio sem subscrição real (checkout abandonado NÃO dá acesso).

test.describe("Etapa 2 — Conta: páginas de autenticação", () => {
  // O widget em si é da responsabilidade do Clerk (e o seu render depende de
  // chaves/rede externas); aqui provamos que a NOSSA rota compila e serve.
  test("sign-up serve sem erro de servidor", async ({ page }) => {
    const response = await page.goto("/sign-up", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
  });

  test("sign-in serve sem erro de servidor", async ({ page }) => {
    const response = await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("Etapa 2 — Segurança: rotas privadas sem sessão", () => {
  for (const route of ["/crm", "/billing", "/onboarding"]) {
    test(`${route} redireciona para sign-in`, async ({ request }) => {
      const response = await request.get(route, { maxRedirects: 0 });
      expect([302, 303, 307, 308]).toContain(response.status());
      expect(response.headers().location).toContain("/sign-in");
    });
  }

  test("/dashboard (legado) redireciona para /crm", async ({ request }) => {
    const response = await request.get("/dashboard", { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(response.status());
    expect(response.headers().location).toContain("/crm");
  });

  test("APIs privadas exigem autenticação", async ({ request }) => {
    const dashboard = await request.get("/api/dashboard");
    expect(dashboard.status()).toBe(401);

    const exportData = await request.get("/api/account/export");
    expect(exportData.status()).toBe(401);

    const deleteAccount = await request.post("/api/account/delete", {
      data: { confirmation: "APAGAR CONTA" },
    });
    expect(deleteAccount.status()).toBe(401);
  });

  test("cron de lembretes exige o segredo", async ({ request }) => {
    const response = await request.get("/api/cron/send-reminders");
    expect(response.status()).toBe(401);
  });
});

test.describe("Etapa 2 — Paywall: negócio sem subscrição real fica fechado", () => {
  // O negócio demo (barbearia-sample) está TRIALING sem cliente Stripe —
  // exatamente o estado de quem criou conta e abandonou o checkout.

  test("página pública não oferece o separador Agendar", async ({ page }) => {
    const response = await page.goto("/barbearia-sample", { waitUntil: "domcontentloaded" });
    if (response?.status() === 404) {
      test.skip(true, "negócio demo não existe nesta base de dados");
      return;
    }
    expect(response?.status()).toBe(200);
    await expect(page.locator('a[href="#agendar"]')).toHaveCount(0);
  });

  test("API de reservas rejeita com aviso de subscrição", async ({ request, baseURL }) => {
    const response = await request.post("/api/public/barbearia-sample/bookings", {
      headers: { origin: baseURL ?? "" },
      data: {
        serviceId: "servico-inexistente",
        staffMemberId: "staff-inexistente",
        startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        customerName: "Teste Paywall",
        customerPhone: "+351910000000",
      },
    });
    if (response.status() === 404) {
      test.skip(true, "negócio demo não existe nesta base de dados");
      return;
    }
    expect(response.status()).toBe(403);
    const body = (await response.json()) as { error?: string };
    expect(body.error ?? "").toContain("não está a aceitar reservas");
  });
});
