# Pipeline de Reels demo (ecrã do produto)

Gera um Reel 1080×1920 do fluxo de marcação em onnex.pt/mock (Studio Lapidar —
fictício, nenhuma reserva real é criada), com cartões de marca na abertura/fecho.

Como se usou a 20/07/2026 (Reel do Dia 1, `onnex-reel-dia1.mp4` no Desktop):

1. `capture.js` — Playwright (o do repo) abre onnex.pt e /mock em viewport iPhone
   (390×844, deviceScaleFactor 3 → PNGs nítidos 1170×2532) e percorre o booking:
   serviço → barbeiro → data → hora → dados (sem submeter). Guarda frames numa
   pasta `frames/` ao lado do script.
   `NODE_PATH=<repo>/node_modules node capture.js`
2. `cards.js` — gera intro/outro 1080×1920 com o logótipo (SVG inline de
   `src/app/icon.svg`) em fundo #0A0A0A.
3. ffmpeg (`npm i ffmpeg-static` numa pasta temporária) — cada frame vira clip de
   ~2,6 s com zoom suave (zoompan 1→1.06); frames de telemóvel são redimensionados
   para 887×1920 e acolchoados a 1080×1920 em #0A0A0A; concat final a 30 fps,
   H.264 CRF 18, sem áudio (a música põe-se no Instagram/CapCut).

Notas:
- `barbearia-sample` NÃO serve: paywall esconde o botão Agendar. Usar sempre `/mock`.
- O banner de cookies tem de ser dispensado ("Apenas essenciais") antes de clicar.
- A sheet de booking vive num portal `[data-base-ui-portal]`, não em `[role=dialog]`.
- Dias do calendário: `button[aria-label*="21 de julho"]`; slots: texto `HH:MM`.
- Datas no capture.js estão fixas (ex.: "21 de julho") — ajustar ao dia seguinte real.
