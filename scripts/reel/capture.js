// Captura de stills do fluxo de marcação em onnex.pt/mock (mobile, alta resolução)
const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const OUT = path.join(__dirname, "frames");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  let n = 0;
  const snap = async (name) => {
    n += 1;
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT, `${String(n).padStart(2, "0")}-${name}.png`) });
    console.log("snap:", n, name);
  };
  const dismissCookies = async () => {
    const b = page.getByRole("button", { name: "Apenas essenciais" });
    if (await b.count()) { await b.first().click().catch(() => {}); await page.waitForTimeout(400); }
  };

  // 1. Landing
  await page.goto("https://onnex.pt", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  await dismissCookies();
  await snap("landing");

  // 2. Página da barbearia (mock — Studio Lapidar)
  await page.goto("https://onnex.pt/mock", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  await dismissCookies();
  await snap("pagina-topo");

  // 3. Serviços + abrir booking
  const agendarBtn = page.locator('[aria-label^="Agendar"]').first();
  await agendarBtn.scrollIntoViewIfNeeded();
  await snap("servicos");
  await agendarBtn.click();
  await page.waitForTimeout(1200);

  // sheet vive num portal base-ui
  const portal = page.locator("[data-base-ui-portal]").last();
  await snap("sheet-aberta");

  // clica a primeira opção "real" dentro do portal (ul.grid > li > button)
  const clickOption = async (re) => {
    const opts = portal.locator("ul button:visible");
    const count = await opts.count();
    for (let i = 0; i < count; i++) {
      const o = opts.nth(i);
      if (await o.isDisabled().catch(() => false)) continue;
      const t = ((await o.textContent()) || "").trim();
      if (!t || /Confirmar|Fechar|Voltar/i.test(t)) continue;
      if (re && !re.test(t)) continue;
      console.log("  click:", JSON.stringify(t.slice(0, 40)));
      await o.click({ timeout: 8000 }).catch((e) => console.log("  (falhou)", e.message.split("\n")[0]));
      return t;
    }
    console.log("  (sem opcoes p/", re, ")");
    return null;
  };

  await clickOption(null);            // barbeiro (ou primeiro passo apresentado)
  await page.waitForTimeout(900);
  await snap("passo-data");
  // dia: amanhã (botão com aria-label "…, 21 de julho")
  const dia = portal.locator('button[aria-label*="21 de julho"]').first();
  await dia.click({ timeout: 8000 });
  await page.waitForTimeout(1100);
  await snap("passo-hora");
  // slot de hora: 10:30 (fica bem no vídeo), senão o primeiro
  let slot = portal.locator("button:visible", { hasText: /^10:30$/ }).first();
  if (!(await slot.count())) slot = portal.locator("button:visible", { hasText: /^\d{2}:\d{2}$/ }).first();
  await slot.click({ timeout: 8000 });
  await page.waitForTimeout(900);

  // contacto (NÃO submete)
  const nome = portal.locator('input[name="name"], input[placeholder*="ome" i]').first();
  const tel = portal.locator('input[type="tel"], input[name="phone"]').first();
  try {
    await nome.fill("Miguel Santos", { timeout: 5000 });
    await tel.fill("912 345 678", { timeout: 5000 });
  } catch (e) {
    console.log("  contacto:", e.message.split("\n")[0]);
  }
  await snap("passo-contacto");

  console.log("--- portal text ---");
  console.log(((await portal.textContent().catch(() => "")) || "").replace(/\s+/g, " ").slice(0, 700));

  await browser.close();
})().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
