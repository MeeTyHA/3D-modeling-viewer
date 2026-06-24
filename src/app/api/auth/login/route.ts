import { NextResponse } from "next/server";
import { createSession, validateCredentials } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = (await request.json()) as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      return NextResponse.json({ error: "Credenciales requeridas" }, { status: 400 });
    }

    if (!validateCredentials(username, password)) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }

    await createSession(username);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al iniciar sesión" }, { status: 500 });
  }
}
