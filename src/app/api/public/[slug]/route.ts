import { NextResponse } from "next/server";
import { getPublicBusinessPayload } from "@/lib/business";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(_req: Request, { params }: RouteProps) {
  const { slug } = await params;
  const business = await getPublicBusinessPayload(slug);

  if (!business) {
    return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });
  }

  return NextResponse.json(business);
}
