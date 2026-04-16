import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentBusiness } from "@/lib/business-modules/core";

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const business = await getCurrentBusiness();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Ficheiro em falta." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "Ficheiro vazio." }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Ficheiro excede 10MB." }, { status: 413 });
    }

    if (!ACCEPTED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Formato não suportado. Usa JPG, PNG, WEBP ou AVIF." },
        { status: 415 },
      );
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const safeExtension = /^[a-z0-9]{2,5}$/.test(extension) ? extension : "jpg";
    const pathname = `business/${business.id}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("POST upload error:", error);
    return NextResponse.json({ error: "Erro ao carregar ficheiro." }, { status: 500 });
  }
}
