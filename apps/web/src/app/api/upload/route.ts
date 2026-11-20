import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { createId } from "@paralleldrive/cuid2";
import { getActiveHouseholdId } from "@/lib/household";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
];

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/csv": "csv",
};

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const householdId = await getActiveHouseholdId();
    if (!householdId) {
      return NextResponse.json({ error: "Hogar no válido o no seleccionado" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    // Check file type against allowed list
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo no debe exceder 5MB" }, { status: 400 });
    }

    // Read bytes for magic byte verification and safe storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verify magic bytes for common formats to prevent disguised uploads
    if (file.type === "image/jpeg" && (buffer[0] !== 0xff || buffer[1] !== 0xd8)) {
      return NextResponse.json({ error: "Contenido de archivo JPEG inválido" }, { status: 400 });
    }
    if (file.type === "image/png" && (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47)) {
      return NextResponse.json({ error: "Contenido de archivo PNG inválido" }, { status: 400 });
    }
    if (file.type === "application/pdf" && buffer.toString("ascii", 0, 4) !== "%PDF") {
      return NextResponse.json({ error: "Contenido de archivo PDF inválido" }, { status: 400 });
    }

    // Map extension strictly from verified mime type (prevent extension spoofing)
    const extension = EXTENSION_MAP[file.type] || "bin";
    const safeFilename = `${createId()}.${extension}`;
    const storagePath = `receipts/${householdId}/${safeFilename}`;

    // Attempt Vercel Blob upload if configured, or fallback to Base64 in development
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(storagePath, file, {
        access: "public",
      });
      return NextResponse.json({ url: blob.url });
    } else {
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;
      return NextResponse.json({ url: dataUrl });
    }
  } catch (error) {
    console.error("[POST /api/upload]", error);
    return NextResponse.json({ error: "Error al subir archivo" }, { status: 500 });
  }
}
