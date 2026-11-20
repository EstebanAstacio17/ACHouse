/**
 * Servicio de Integración con Google Gemini API (Google AI Studio)
 * Plan 100% Gratuito (1,500 solicitudes/día gratis)
 */

interface GeminiContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
    code?: number;
  };
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = "gemini-2.0-flash"; // Modelo ultra rápido y gratuito
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Realiza un análisis financiero inteligente a partir de métricas consolidadas.
 */
export async function generateFinancialAdvice(metrics: {
  monthlyIncome: number;
  monthlyExpenses: number;
  netCashFlow: number;
  savingsRate: number;
  totalDebt: number;
  currency: string;
}) {
  if (!GEMINI_API_KEY) {
    return {
      available: false,
      message: "GEMINI_API_KEY no configurada. Obtén tu llave gratis en https://aistudio.google.com/",
    };
  }

  const prompt = `Eres un asesor financiero familiar y empresarial de élite. Analiza brevemente las siguientes métricas en un tono profesional, claro y motivador en español dominicano/latinoamericano:
- Ingresos del mes: ${metrics.currency} ${metrics.monthlyIncome.toFixed(2)}
- Gastos del mes: ${metrics.currency} ${metrics.monthlyExpenses.toFixed(2)}
- Flujo neto: ${metrics.currency} ${metrics.netCashFlow.toFixed(2)}
- Tasa de ahorro: ${metrics.savingsRate.toFixed(1)}%
- Deuda total pendiente: ${metrics.currency} ${metrics.totalDebt.toFixed(2)}

Proporciona 3 recomendaciones concretas en formato JSON con la siguiente estructura:
{
  "healthScore": 85,
  "status": "Saludable" | "Atención" | "Crítico",
  "summary": "Resumen ejecutivo en 2 líneas.",
  "recommendations": ["Consejo 1", "Consejo 2", "Consejo 3"]
}`;

  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
    }

    const data: GeminiContentResponse = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    return {
      available: true,
      analysis: JSON.parse(rawText),
    };
  } catch (err: any) {
    console.error("[Gemini AI Error]", err?.message);
    return {
      available: false,
      error: err?.message,
    };
  }
}

/**
 * Escanea un recibo o factura a partir de una imagen en base64 para auto-completar transacciones.
 */
export async function parseReceiptWithGemini(base64Data: string, mimeType: string = "image/jpeg") {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY no configurada en las variables de entorno");
  }

  const cleanBase64 = base64Data.includes("base64,") ? base64Data.split("base64,")[1] : base64Data;

  const prompt = `Analiza este comprobante de pago o factura y extrae la información en formato JSON estricto:
{
  "merchant": "Nombre del comercio o empresa",
  "amount": 1250.00,
  "currency": "DOP" | "USD",
  "date": "YYYY-MM-DD",
  "category": "Alimentación" | "Servicios" | "Transporte" | "Materiales" | "Salud" | "Otros",
  "description": "Breve resumen de lo adquirido"
}`;

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: cleanBase64 } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
  }

  const data: GeminiContentResponse = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  return JSON.parse(rawText);
}
