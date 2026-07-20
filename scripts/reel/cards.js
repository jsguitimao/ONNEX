// Gera cartões intro/outro 1080x1920 com o logótipo ONNEX
const { chromium } = require("@playwright/test");
const path = require("path");

const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="220" height="220">
  <rect width="512" height="512" rx="96" fill="#0A0A0A"/>
  <rect x="117" y="112" width="130" height="40" rx="6" fill="#FFFFFF"/>
  <circle cx="256" cy="322" r="110" fill="none" stroke="#FFFFFF" stroke-width="58"/>
</svg>`;

const page_html = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:1080px; height:1920px; background:#0A0A0A; color:#F5F0E8;
         font-family:'Segoe UI',system-ui,sans-serif; display:flex; flex-direction:column;
         align-items:center; justify-content:center; text-align:center; gap:48px; }
  .logo { border:3px solid #2a2a2a; border-radius:56px; }
  h1 { font-size:120px; letter-spacing:0.18em; font-weight:800; color:#fff; }
  p  { font-size:52px; line-height:1.4; color:#cfc8bc; max-width:820px; }
  .big { font-size:64px; color:#fff; font-weight:700; line-height:1.35; }
  .url { font-size:58px; color:#fff; font-weight:800; letter-spacing:0.04em;
         border:3px solid #3a3a3a; padding:22px 56px; border-radius:evenly 999px; border-radius:999px; }
</style></head><body>${body}</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });

  await page.setContent(page_html(`
    <div class="logo">${LOGO}</div>
    <h1>ONNEX</h1>
    <p>É assim que um cliente marca corte às 23h&nbsp;👇</p>
  `));
  await page.screenshot({ path: path.join(__dirname, "frames", "00-intro.png") });

  await page.setContent(page_html(`
    <div class="logo">${LOGO}</div>
    <div class="big">Confirmação e lembrete<br/>automáticos no WhatsApp&nbsp;✅</div>
    <p>Menos chamadas. Menos faltas.<br/>7 dias grátis, sem compromisso.</p>
    <div class="url">onnex.pt</div>
  `));
  await page.screenshot({ path: path.join(__dirname, "frames", "99-outro.png") });

  console.log("cartoes ok");
  await browser.close();
})().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
