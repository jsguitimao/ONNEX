"use client";

import Image from "next/image";
import { ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/page-editor/field";
import { SectionShell } from "@/components/page-editor/section-shell";
import { uploadMedia } from "@/lib/client-upload";
import type { EditorStaff } from "@/lib/page-editor/draft";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

type Props = {
  staff: EditorStaff[];
  onChange: (staff: EditorStaff[]) => void;
  readOnly?: boolean;
};

export function SectionTeam({ staff, onChange, readOnly = false }: Props) {
  function addMember() {
    const next: EditorStaff = {
      id: crypto.randomUUID(),
      fullName: "",
      roleTitle: null,
      bio: null,
      avatarUrl: null,
      portfolioImages: [],
      serviceIds: [],
    };
    onChange([...staff, next]);
  }

  function patchMember(id: string, patch: Partial<EditorStaff>) {
    onChange(staff.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function removeMember(id: string) {
    onChange(staff.filter((m) => m.id !== id));
  }

  return (
    <SectionShell
      step={5}
      title="Equipa"
      description="Quem aparece no grid de equipa do mobile."
    >
      <ul className="flex flex-col gap-3">
        {staff.map((member, index) => (
          <MemberCard
            key={member.id}
            member={member}
            index={index}
            readOnly={readOnly}
            onPatch={(patch) => patchMember(member.id, patch)}
            onRemove={() => removeMember(member.id)}
          />
        ))}
      </ul>

      <Button type="button" variant="outline" size="sm" onClick={addMember}>
        <Plus className="size-3.5" />
        Adicionar membro
      </Button>
    </SectionShell>
  );
}

function MemberCard({
  member,
  index,
  readOnly,
  onPatch,
  onRemove,
}: {
  member: EditorStaff;
  index: number;
  readOnly: boolean;
  onPatch: (patch: Partial<EditorStaff>) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAvatar(file: File) {
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Avatar grande demais. Máx 5 MB.");
      return;
    }
    setError(null);

    if (readOnly) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onPatch({ avatarUrl: reader.result });
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    try {
      setBusy(true);
      const url = await uploadMedia(file);
      onPatch({ avatarUrl: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
        <Button
          type="button"
          variant="destructive"
          size="icon-xs"
          aria-label="Remover membro"
          onClick={onRemove}
        >
          <Trash2 className="size-3" />
        </Button>
      </div>

      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted disabled:opacity-50"
          aria-label="Mudar avatar"
        >
          {member.avatarUrl ? (
            <Image
              src={member.avatarUrl}
              alt={member.fullName || "Avatar"}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="flex h-full items-center justify-center text-muted-foreground">
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImagePlus className="size-4" />
              )}
            </span>
          )}
          {busy && member.avatarUrl ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
              <Loader2 className="size-4 animate-spin" />
            </span>
          ) : null}
        </button>
        <input
          ref={fileRef}
          type="file"
          hidden
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleAvatar(file);
            e.target.value = "";
          }}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Field label="Nome">
            <Input
              value={member.fullName}
              onChange={(e) => onPatch({ fullName: e.target.value })}
              maxLength={40}
              placeholder="Ex: Guilherme Silva"
            />
          </Field>
          <Field label="Cargo (opcional)">
            <Input
              value={member.roleTitle ?? ""}
              onChange={(e) =>
                onPatch({
                  roleTitle: e.target.value.trim() ? e.target.value : null,
                })
              }
              maxLength={30}
              placeholder="Ex: Master Barber"
            />
          </Field>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </li>
  );
}
