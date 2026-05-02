"use client";

import Image from "next/image";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionShell } from "@/components/page-editor/section-shell";
import { uploadMedia } from "@/lib/client-upload";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 12;

type Props = {
  images: string[];
  onChange: (images: string[]) => void;
  readOnly?: boolean;
};

export function SectionGallery({ images, onChange, readOnly = false }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList) {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setError(`Máximo de ${MAX_IMAGES} fotos.`);
      return;
    }
    const candidates = Array.from(files)
      .slice(0, remaining)
      .filter((f) => f.size <= MAX_IMAGE_BYTES);

    if (candidates.length === 0) return;
    setError(null);

    if (readOnly) {
      try {
        const urls = await Promise.all(
          candidates.map(
            (file) =>
              new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === "string") resolve(reader.result);
                  else reject(new Error("read-failed"));
                };
                reader.onerror = () =>
                  reject(reader.error ?? new Error("read-failed"));
                reader.readAsDataURL(file);
              }),
          ),
        );
        onChange([...images, ...urls]);
      } catch {
        setError("Falha a carregar uma das imagens.");
      }
      return;
    }

    try {
      setBusy(true);
      const urls = await Promise.all(candidates.map((f) => uploadMedia(f)));
      onChange([...images, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setBusy(false);
    }
  }

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <SectionShell
      step={8}
      title="Galeria"
      description={`Carousel de "últimos trabalhos". Até ${MAX_IMAGES} fotos.`}
    >
      {images.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2">
          {images.map((src, index) => (
            <li key={`${index}-${src}`} className="group relative aspect-square overflow-hidden rounded-md bg-muted">
              <Image
                src={src}
                alt={`Trabalho ${index + 1}`}
                fill
                sizes="120px"
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label={`Remover foto ${index + 1}`}
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
        disabled={images.length >= MAX_IMAGES || busy}
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <ImagePlus className="size-3.5" />
        )}
        {images.length === 0 ? "Carregar fotos" : "Adicionar mais"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        hidden
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <p className="text-xs text-muted-foreground">
        {images.length} / {MAX_IMAGES} fotos · até 5 MB cada
      </p>
    </SectionShell>
  );
}
