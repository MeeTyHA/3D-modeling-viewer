import { NextResponse } from "next/server";
import { readQuoteConfig, writeQuoteConfig } from "@/lib/cms/store";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const data = await readQuoteConfig();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "No se pudo cargar la configuración" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const data = await request.json();
    await writeQuoteConfig(data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
