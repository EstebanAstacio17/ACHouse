import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { generateFinancialAdvice } from "@/lib/ai/gemini";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const {
      monthlyIncome = 0,
      monthlyExpenses = 0,
      netCashFlow = 0,
      savingsRate = 0,
      totalDebt = 0,
      currency = "DOP",
    } = body;

    const advice = await generateFinancialAdvice({
      monthlyIncome: Number(monthlyIncome),
      monthlyExpenses: Number(monthlyExpenses),
      netCashFlow: Number(netCashFlow),
      savingsRate: Number(savingsRate),
      totalDebt: Number(totalDebt),
      currency: String(currency),
    });

    return NextResponse.json({ success: true, data: advice });
  } catch (error: any) {
    console.error("[AI_ADVICE_ERROR]", error);
    return NextResponse.json(
      { error: "Error al generar recomendaciones con Google AI", details: error.message },
      { status: 500 }
    );
  }
}
