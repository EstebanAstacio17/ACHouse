import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo no debe exceder 5MB" }, { status: 400 });
    }

    // Attempt Vercel Blob upload if BLOB_READ_WRITE_TOKEN is configured, or generate mock data URI for development
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`receipts/${Date.now()}-${file.name}`, file, {
        access: "public",
      });
      return NextResponse.json({ url: blob.url });
    } else {
      // In local dev without Blob token, encode file as Base64 data url
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;
      return NextResponse.json({ url: dataUrl });
    }
  } catch (error) {
    console.error("[POST /api/upload]", error);
    return NextResponse.json({ error: "Error al subir archivo" }, { status: 500 });
  }
}
