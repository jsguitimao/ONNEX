"use client";

import Image from "next/image";
import { ImagePlus, Loader2, Trash2, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionShell } from "@/components/page-editor/section-shell";
import { uploadMedia } from "@/lib/client-upload";
import { inferMediaKindFromUrl } from "@/lib/media-url";
import type { EditorHeroMedia } from "@/lib/page-editor/draft";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB
const PLAYABLE_VIDEO_EXTENSIONS = new Set(["mp4", "webm"]);

type Props = {
  hero: EditorHeroMedia | null;
  onChange: (hero: EditorHeroMedia | null) => void;
};

export function SectionHero({ hero, onChange }: Props) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const uploadRunRef = useRef(0);
  const [busy, setBusy] = useState<null | "image" | "video">(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [urlValue, setUrlValue] = useState(hero?.url ?? "");

  useEffect(() => {
    setUrlValue(hero?.url ?? "");
    setMediaFailed(false);
  }, [hero?.url]);

  async function handleFile(file: File, kind: "image" | "video") {
    const uploadRun = uploadRunRef.current + 1;
    uploadRunRef.current = uploadRun;
    const limit = kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > limit) {
      setError(
        `Ficheiro grande demais. Máx ${kind === "video" ? "50 MB" : "10 MB"}.`,
      );
      return;
    }
    if (kind === "video" && !isPlayableVideoFile(file)) {
      setError("Vídeo não suportado. Carrega um ficheiro MP4 ou WEBM.");
      return;
    }
    setError(null);
    setMediaFailed(false);

    try {
      setBusy(kind);
      setProgress(0);
      const url = await uploadMedia(file, (p) => {
        if (uploadRunRef.current !== uploadRun) return;
        setProgress(p.percent);
      });
      if (uploadRunRef.current !== uploadRun) return;
      onChange({ kind, url, posterUrl: null });
    } catch (err) {
      if (uploadRunRef.current !== uploadRun) return;
      setError(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      if (uploadRunRef.current === uploadRun) {
        setBusy(null);
        setProgress(null);
      }
    }
  }

  function applyUrl() {
    uploadRunRef.current += 1;
    setBusy(null);
    const trimmed = urlValue.trim();
    if (!trimmed) {
      setError(null);
      onChange(null);
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) {
        throw new Error("invalid");
      }
      const kind = inferMediaKindFromUrl(trimmed);
      if (!kind) {
        setError("O URL deve apontar diretamente para uma imagem ou vídeo suportado.");
        return;
      }
      setError(null);
      setMediaFailed(false);
      onChange({ kind, url: trimmed, posterUrl: null });
    } catch {
      setError("Usa um URL válido que comece por http:// ou https://.");
    }
  }

  return (
    <SectionShell
      step={1}
      title="Hero (imagem ou vídeo)"
      description="Foto ou vídeo grande no topo da página pública. Vídeos tocam em loop, sem som. Imagens até 10 MB, vídeos até 50 MB."
    >
      <div className="overflow-hidden rounded-lg border border-border bg-muted">
        <div className="relative aspect-square w-full">
          {hero && !mediaFailed ? (
            hero.kind === "video" ? (
              <video
                key={hero.url}
                src={hero.url}
                muted
                playsInline
                loop
                autoPlay
                controls
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setMediaFailed(true)}
              />
            ) : (
              <Image
                src={hero.url}
                alt="Hero"
                fill
                sizes="320px"
                className="object-cover"
                unoptimized
                onError={() => setMediaFailed(true)}
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {mediaFailed ? "Media indisponível. Carrega outro ficheiro." : "Sem media"}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          type="url"
          value={urlValue}
          onChange={(event) => setUrlValue(event.target.value)}
          onBlur={applyUrl}
          placeholder="https://... ou carrega um ficheiro"
          className="h-11 min-w-0 rounded-full border border-border bg-background px-4 text-sm outline-none transition focus:border-foreground/50 focus:ring-2 focus:ring-ring/30"
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full"
          onClick={applyUrl}
        >
          Aplicar URL
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => imageInputRef.current?.click()}
          disabled={busy !== null}
        >
          {busy === "image" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ImagePlus className="size-3.5" />
          )}
          {busy === "image" && progress !== null
            ? `A carregar… ${progress}%`
            : "Carregar imagem"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => videoInputRef.current?.click()}
          disabled={busy !== null}
        >
          {busy === "video" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Video className="size-3.5" />
          )}
          {busy === "video" && progress !== null
            ? `A carregar… ${progress}%`
            : "Carregar vídeo"}
        </Button>
        {hero ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              uploadRunRef.current += 1;
              setBusy(null);
              setMediaFailed(false);
              onChange(null);
            }}
          >
            <Trash2 className="size-3.5" />
            Remover
          </Button>
        ) : null}
        {error ? (
          <p role="alert" className="basis-full text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file, "image");
            e.target.value = "";
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,.mp4,.webm"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file, "video");
            e.target.value = "";
          }}
        />
      </div>
    </SectionShell>
  );
}

function isPlayableVideoFile(file: File) {
  const type = file.type.toLowerCase();
  if (type === "video/mp4" || type === "video/webm") return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return PLAYABLE_VIDEO_EXTENSIONS.has(ext);
}
