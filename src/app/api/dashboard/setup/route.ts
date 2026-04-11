import { NextResponse } from "next/server";
import { getManagementSnapshot } from "@/lib/business";

export async function GET() {
  try {
    const snapshot = await getManagementSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("GET setup error:", error);
    return NextResponse.json({ error: "Erro ao carregar o dashboard." }, { status: 500 });
  }
}
