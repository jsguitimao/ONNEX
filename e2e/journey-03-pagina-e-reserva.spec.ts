import { expect, test } from "@playwright/test";

// ETAPA 3 da jornada — a página pública do barbeiro e o fluxo de reserva.
// Cobre: render da página (front), dados estruturados (SEO), 404 controlado,
// o fluxo de reserva no browser (via /mock, sem tocar em BD nem notificações)
// e as defesas da API pública (CSRF por origem + validação de dados).

test.describe("Etapa 3 — Página pública: front-end", () => {
  test("página do negócio demo renderiza serviços", async ({ page }) => {
    const response = await page.goto("/barbearia-sample", { waitUntil: "domcontentloaded" });
    if (response?.status() === 404) {
      test.skip(true, "negócio demo não existe nesta base de dados");
      return;
    }
    expect(response?.status()).toBe(200);

    // "Corte Tradicional" é um serviço estável do seed (existe no payload e no
    // render); evita acoplar o teste ao nome do negócio, que pode variar.
    const html = await page.content();
    expect(html).toContain("Corte Tradicional");
  });

  test("página tem dados estruturados JSON-LD válidos", async ({ page }) => {
    const response = await page.goto("/barbearia-sample", { waitUntil: "domcontentloaded" });
    if (response?.status() === 404) {
      test.skip(true, "negócio demo não existe nesta base de dados");
      return;
    }
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(jsonLd).toBeTruthy();
    // Tem de fazer parse sem rebentar (o escape anti-XSS não pode partir o JSON)
    const parsed = JSON.parse(jsonLd ?? "") as { "@type"?: string };
    expect(parsed["@type"]).toBeTruthy();
  });

  test("slug inexistente mostra 'não encontrada' e é noindex (SEO seguro)", async ({
    page,
  }) => {
    const response = await page.goto("/slug-que-nao-existe-xyz", {
      waitUntil: "domcontentloaded",
    });
    // Comportamento verificado e correto: por a rota ter loading.tsx, a resposta
    // é transmitida em streaming e o Next não pode mudar o status para 404 depois
    // dos headers (fica 200). MAS o Next injeta <meta name="robots" noindex>, o
    // que impede a indexação pelo Google — logo, não há dano de SEO. Ver o
    // documento de fluxo (Etapa 3) para a explicação completa.
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByText(/não está disponível/i).first()).toBeVisible();
    // O Next injeta o meta no streaming, podendo aparecer em <head> e <body>;
    // basta confirmar que existe pelo menos um.
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  });
});

test.describe("Etapa 3 — Fluxo de reserva no browser (/mock, sem efeitos)", () => {
  test("clicar num serviço abre o painel de reserva", async ({ page }) => {
    await page.goto("/mock", { waitUntil: "domcontentloaded" });

    const serviceButton = page.locator('button[aria-label^="Agendar"]').first();
    await expect(serviceButton).toBeVisible({ timeout: 30_000 });

    // /mock é estático: o botão existe no HTML antes de o React hidratar e ligar
    // o onClick. Repetimos clique+verificação até o handler estar ativo (open()
    // é idempotente, por isso cliques repetidos são seguros). O painel é um
    // Drawer (base-ui) com o título "Reservar em <negócio>".
    await expect(async () => {
      await serviceButton.click();
      await expect(page.getByText(/Reservar em/i)).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
  });
});

test.describe("Etapa 3 — Segurança da API pública de reservas", () => {
  test("POST de uma origem estrangeira é rejeitado (anti-CSRF)", async ({ request }) => {
    // A defesa rejeita um Origin de outro site ANTES de qualquer trabalho.
    // (Um pedido sem Origin nenhum é permitido de propósito no endpoint
    // público — cobre clientes não-browser; a proteção incide no cross-site.)
    const response = await request.post("/api/public/barbearia-sample/bookings", {
      headers: { origin: "https://site-malicioso.example" },
      data: {
        serviceId: "x",
        staffMemberId: "y",
        startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        customerName: "Teste CSRF",
        customerPhone: "+351910000000",
      },
    });
    expect(response.status()).toBe(403);
    const body = (await response.json()) as { error?: string };
    expect(body.error ?? "").toContain("Origem");
  });

  test("POST com dados inválidos é rejeitado com 400", async ({ request, baseURL }) => {
    const response = await request.post("/api/public/barbearia-sample/bookings", {
      headers: { origin: baseURL ?? "" },
      data: { serviceId: "", startsAt: "nao-e-data" },
    });
    expect(response.status()).toBe(400);
  });

  test("availability responde de forma controlada", async ({ request }) => {
    const response = await request.get("/api/public/barbearia-sample/availability");
    expect([200, 400, 404]).toContain(response.status());
  });

  test("gestão de reserva com token inválido devolve 404", async ({ request }) => {
    const response = await request.get("/api/public/booking/token-invalido-xyz");
    expect([400, 404]).toContain(response.status());
  });
});
