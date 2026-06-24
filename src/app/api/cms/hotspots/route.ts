import { NextResponse } from "next/server";
import { readHotspots, writeHotspots } from "@/lib/cms/store";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("vehicleId");
    if (!vehicleId) {
      return NextResponse.json({ error: "vehicleId requerido" }, { status: 400 });
    }
    const data = await readHotspots(vehicleId);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar los hotspots" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("vehicleId");
    if (!vehicleId) {
      return NextResponse.json({ error: "vehicleId requerido" }, { status: 400 });
    }
    const data = await request.json();
    await writeHotspots(vehicleId, data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error al guardar hotspots" }, { status: 500 });
  }
}
