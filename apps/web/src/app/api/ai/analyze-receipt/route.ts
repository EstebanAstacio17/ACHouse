import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { parseReceiptWithGemini } from "@/lib/ai/gemini";

export const maxDuration = 30; // 30s timeout para análisis de IA

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    let base64Image = "";
    let mimeType = "image/jpeg";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No se proporcionó ningún archivo de imagen" }, { status: 400 });
      }
      mimeType = file.type || "image/jpeg";
      const buffer = Buffer.from(await file.arrayBuffer());
      base64Image = buffer.toString("base64");
    } else {
      const body = await req.json();
      base64Image = body.base64Image || "";
      mimeType = body.mimeType || "image/jpeg";
    }

    if (!base64Image) {
      return NextResponse.json({ error: "Imagen no proporcionada" }, { status: 400 });
    }

    // Limpiar prefijo data:image/... si existe
    if (base64Image.includes(",")) {
      const parts = base64Image.split(",");
      base64Image = parts[1];
    }

    const result = await parseReceiptWithGemini(base64Image, mimeType);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[AI_RECEIPT_ERROR]", error);
    return NextResponse.json(
      { error: "Error al procesar el comprobante con Google AI", details: error.message },
      { status: 500 }
    );
  }
}
