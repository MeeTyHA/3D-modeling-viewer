import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { requireAdmin } from "@/lib/auth";

const UPLOAD_DIRS = {
  image: path.join(process.cwd(), "public", "assets", "images", "products"),
  pdf: path.join(process.cwd(), "public", "assets", "pdf"),
  video: path.join(process.cwd(), "public", "assets", "videos"),
} as const;

const PUBLIC_PREFIX = {
  image: "/assets/images/products",
  pdf: "/assets/pdf",
  video: "/assets/videos",
} as const;

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._\-\s]/g, "_").replace(/\s+/g, " ").trim();
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const formData = await request.formData();
    const file = formData.get("file");
    const type = formData.get("type");

    if (!(file instanceof File) || (type !== "image" && type !== "pdf" && type !== "video")) {
      return NextResponse.json({ error: "Archivo o tipo inválido" }, { status: 400 });
    }

    const allowedImage = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    const allowedPdf = ["application/pdf"];
    const allowedVideo = ["video/mp4", "video/webm", "video/quicktime"];

    if (type === "image" && !allowedImage.includes(file.type)) {
      return NextResponse.json({ error: "Formato de imagen no permitido" }, { status: 400 });
    }

    if (type === "pdf" && !allowedPdf.includes(file.type)) {
      return NextResponse.json({ error: "Solo se permiten archivos PDF" }, { status: 400 });
    }

    if (type === "video" && !allowedVideo.includes(file.type)) {
      return NextResponse.json({ error: "Solo se permiten archivos de video MP4, WebM o MOV" }, { status: 400 });
    }

    const dir = UPLOAD_DIRS[type];
    await fs.mkdir(dir, { recursive: true });

    const filename = sanitizeFilename(file.name);
    const filePath = path.join(dir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      path: `${PUBLIC_PREFIX[type]}/${filename}`,
      filename,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error al subir el archivo" }, { status: 500 });
  }
}
