import { NextResponse } from "next/server";
import { readProducts, writeProducts } from "@/lib/cms/store";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const data = await readProducts();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar los productos" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const data = await request.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
    }
    await writeProducts(data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('error =>', error);
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error al guardar productos" }, { status: 500 });
  }
}
