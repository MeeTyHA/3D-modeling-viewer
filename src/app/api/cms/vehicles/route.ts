import { NextResponse } from "next/server";
import { readVehicles, writeVehicles } from "@/lib/cms/store";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const data = await readVehicles();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar las unidades" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const data = await request.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
    }
    await writeVehicles(data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error al guardar unidades" }, { status: 500 });
  }
}
