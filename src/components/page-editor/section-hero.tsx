"use client";

import Image from "next/image";
import { ImagePlus, Loader2, Trash2, Video } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionShell } from "@/components/page-editor/section-shell";
import { uploadMedia } from "@/lib/client-upload";
import type { EditorHeroMedia } from "@/lib/page-editor/draft";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_BYTES = 8 * 1024 * 1024; // 8 MB

type Props = {
  hero: EditorHeroMedia | null;
  onChange: (hero: EditorHeroMedia | null) => void;
  /** Demo mode: usa data URL local (sem chamar /api/upload). */
  readOnly?: boolean;
};

export function SectionHero({ hero, onChange, readOnly = false }: Props) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<null | "image" | "video">(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File, kind: "image" | "video") {
    const limit = kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > limit) {
      setError(
        `Ficheiro grande demais. Máx ${kind === "video" ? "8 MB" : "5 MB"}.`,
      );
      return;
    }
    setError(null);

    if (readOnly) {
      // Demo: mostra localmente (não persiste).
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onChange({ kind, url: reader.result, posterUrl: null });
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    try {
      setBusy(kind);
      const url = await uploadMedia(file);
      onChange({ kind, url, posterUrl: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <SectionShell
      step={1}
      title="Hero (vídeo ou imagem)"
      description="Primeiro elemento visível. Quadrado 1:1. Vídeo até 8 MB, imagem até 5 MB."
    >
      <div className="overflow-hidden rounded-lg border border-border bg-muted">
        <div className="relative aspect-square w-full">
          {hero ? (
            hero.kind === "video" ? (
              <video
                src={hero.url}
                muted
                playsInline
                loop
                autoPlay
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <Image
                src={hero.url}
                alt="Hero"
                fill
                sizes="320px"
                className="object-cover"
                unoptimized
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Sem media
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() => imageInputRef.current?.click()}
        >
          {busy === "image" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ImagePlus className="size-3.5" />
          )}
          Carregar imagem
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() => videoInputRef.current?.click()}
        >
          {busy === "video" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Video className="size-3.5" />
          )}
          Carregar vídeo
        </Button>
        {hero ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={busy !== null}
            onClick={() => onChange(null)}
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
          accept="video/mp4,video/webm"
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
