import { NextResponse } from "next/server";
import { getCustomersSnapshot } from "@/lib/business";

export async function GET() {
  try {
    const snapshot = await getCustomersSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("GET customers error:", error);
    return NextResponse.json({ error: "Erro ao carregar clientes." }, { status: 500 });
  }
}
