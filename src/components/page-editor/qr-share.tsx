"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, Loader2, Printer, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  slug: string;
  businessName: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function QrShare({ slug, businessName }: Props) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"link" | "qr" | null>(null);

  // Abre o modal e gera o QR (o link é o mesmo domínio + slug). Feito no clique
  // — não num efeito — para evitar setState em cascata.
  function handleOpen() {
    const publicUrl = `${window.location.origin}/${slug}`;
    setUrl(publicUrl);
    setError(null);
    setDataUrl(null);
    setCopied(null);
    setOpen(true);
    QRCode.toDataURL(publicUrl, { width: 1024, margin: 2, errorCorrectionLevel: "M" })
      .then(setDataUrl)
      .catch(() => setError("Não foi possível gerar o QR Code."));
  }

  // Fecha com Esc.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function flagCopied(what: "link" | "qr") {
    setCopied(what);
    window.setTimeout(() => setCopied((current) => (current === what ? null : current)), 1800);
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(url);
      flagCopied("link");
    } catch {
      setError("O navegador não deixou copiar. Copia o link manualmente.");
    }
  }

  async function handleCopyQr() {
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      flagCopied("qr");
    } catch {
      // Nem todos os navegadores deixam copiar imagens (ex.: iOS mais antigo).
      setError("Este navegador não deixa copiar a imagem. Usa \"Descarregar\" ou \"Imprimir\".");
    }
  }

  function handleDownload() {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `qr-${slug}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function handlePrint() {
    if (!dataUrl) return;
    const win = window.open("", "_blank", "width=640,height=760");
    if (!win) {
      setError("O navegador bloqueou a janela de impressão. Permite pop-ups e tenta de novo.");
      return;
    }
    win.document.write(
      `<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>QR Code — ${escapeHtml(
        businessName,
      )}</title><style>*{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:48px 24px;text-align:center;color:#0a0a0a}h1{font-size:22px;margin:0 0 24px}img{width:340px;height:340px;max-width:80vw}p{margin-top:24px;color:#555;font-size:13px;word-break:break-all}</style></head><body><h1>${escapeHtml(
        businessName,
      )}</h1><img src="${dataUrl}" alt="QR Code"><p>${escapeHtml(
        url,
      )}</p><script>window.onload=function(){window.focus();window.print();}</script></body></html>`,
    );
    win.document.close();
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={handleOpen}>
        <QrCode className="size-3.5" />
        QR Code
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="QR Code da página"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">QR Code da tua página</h2>
                <p className="text-xs text-muted-foreground">
                  Quem apontar a câmara abre a tua página de marcações.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-center rounded-lg border border-border bg-white p-4">
              {dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL local (QR gerado no browser), sem otimização do next/image
                <img src={dataUrl} alt="QR Code da página" className="size-52" />
              ) : error ? (
                <p className="py-16 text-center text-xs text-destructive">{error}</p>
              ) : (
                <div className="flex size-52 items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{url}</span>
              <Button type="button" size="sm" variant="ghost" onClick={handleCopyLink}>
                {copied === "link" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied === "link" ? "Copiado" : "Copiar link"}
              </Button>
            </div>

            {error && dataUrl ? (
              <p role="alert" className="mt-2 text-[11px] text-destructive">
                {error}
              </p>
            ) : null}

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button type="button" size="sm" variant="outline" disabled={!dataUrl} onClick={handleCopyQr}>
                {copied === "qr" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied === "qr" ? "Copiado" : "Copiar QR"}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={!dataUrl} onClick={handleDownload}>
                <Download className="size-3.5" />
                Descarregar
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={!dataUrl} onClick={handlePrint}>
                <Printer className="size-3.5" />
                Imprimir
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
