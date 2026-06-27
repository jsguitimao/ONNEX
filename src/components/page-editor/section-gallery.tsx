"use client";

import Image from "next/image";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionShell } from "@/components/page-editor/section-shell";
import { uploadMedia } from "@/lib/client-upload";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES = 12;
const MAX_CONCURRENT_UPLOADS = 3;

type Props = {
  images: string[];
  onChange: (images: string[]) => void;
};

export function SectionGallery({ images, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, true>>({});

  async function handleFiles(files: FileList) {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setError(`Máximo de ${MAX_IMAGES} fotos.`);
      return;
    }

    const picked = Array.from(files).slice(0, remaining);
    const tooLarge = picked.filter((file) => file.size > MAX_IMAGE_BYTES);
    const candidates = picked.filter((file) => file.size <= MAX_IMAGE_BYTES);

    if (tooLarge.length > 0) {
      setError("Algumas imagens excedem 10 MB e não foram carregadas.");
    }
    if (candidates.length === 0) return;
    if (tooLarge.length === 0) setError(null);

    try {
      setBusy(true);
      const urls = await uploadFilesWithConcurrency(candidates);
      setFailedImages((prev) => {
        const next = { ...prev };
        for (const url of urls) delete next[url];
        return next;
      });
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
            <li
              key={`${index}-${src}`}
              className="group relative aspect-square overflow-hidden rounded-md bg-muted"
            >
              {failedImages[src] ? (
                <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-muted-foreground">
                  Imagem indisponível
                </div>
              ) : (
                <Image
                  src={src}
                  alt={`Trabalho ${index + 1}`}
                  fill
                  sizes="120px"
                  className="object-cover"
                  unoptimized
                  onError={() => setFailedImages((prev) => ({ ...prev, [src]: true }))}
                />
              )}
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
        {images.length} / {MAX_IMAGES} fotos · até 10 MB cada
      </p>
    </SectionShell>
  );
}

async function uploadFilesWithConcurrency(files: File[]): Promise<string[]> {
  const urls = new Array<string>(files.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < files.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      urls[currentIndex] = await uploadMedia(files[currentIndex]);
    }
  }

  const workerCount = Math.min(MAX_CONCURRENT_UPLOADS, files.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return urls;
}
