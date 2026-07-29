// ============================================================
// Yayika — AI Financial Coach Edge Function
// Analyzes spending patterns and gives personalized advice
// Deploy: supabase functions deploy ai-financial-coach --no-verify-jwt
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const groqKey = Deno.env.get("GROQ_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const apiKey = groqKey || openaiKey;

    const { user_id, cycle_phase, transactions, monthly_summary, lang } = await req.json();

    let advice = "";

    if (apiKey) {
      // Use LLM for personalized advice
      try {
        const langNames: Record<string, string> = {
          es: "español", en: "English", pt: "português", fr: "français", de: "Deutsch"
        };

        const transactionSummary = transactions?.slice(0, 20).map((t: any) =>
          `${t.type === 'expense' ? 'Gasto' : 'Ingreso'}: $${t.amount} - ${t.category || 'sin categoría'} (${t.date})`
        ).join("\n") || "Sin transacciones recientes";

        const systemPrompt = `Eres Laura, la asesora financiera de Yayika. Ayudas a mujeres a mejorar su relación con el dinero usando psicología financiera femenina y la conexión con el ciclo menstrual.

REGLAS:
1. Res SIEMPRE en ${langNames[lang] || "español"}
2. Sé práctica, cálida y directa
3. Máximo 4-5 oraciones
4. Incluye 1-2 acciones concretas
5. Conecta finanzas con la fase del ciclo cuando sea relevante
6. Usa emojis con moderación
7. Analiza patrones de gasto reales`;

        const userMessage = `Analiza mis finanzas y dame consejo personalizado.

Fase del ciclo: ${cycle_phase || "desconocida"}

Resumen mensual:
- Ingresos: $${monthly_summary?.totalIncome || 0}
- Gastos: $${monthly_summary?.totalExpenses || 0}
- Balance: $${(monthly_summary?.totalIncome || 0) - (monthly_summary?.totalExpenses || 0)}

Transacciones recientes:
${transactionSummary}

Top categorías de gasto: ${monthly_summary?.topCategories?.map((c: any) => `${c.name} ($${c.total}, ${c.percentage}%)`).join(", ") || "Sin datos"}

Dame 1 consejo principal y 2 acciones concretas para esta semana.`;

        const isGroq = !!groqKey;
        const baseUrl = isGroq ? "https://api.groq.com/openai" : "https://api.openai.com";
        const model = isGroq ? "llama-3.3-70b-versatile" : "gpt-4o-mini";

        const response = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage }
            ],
            max_tokens: 300,
            temperature: 0.8,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          advice = data.choices?.[0]?.message?.content || "";
        }
      } catch (e) {
        console.warn("LLM error:", e);
      }
    }

    // Fallback: rule-based advice
    if (!advice) {
      advice = getFallbackAdvice(cycle_phase, monthly_summary, lang || "es");
    }

    return new Response(JSON.stringify({ advice, lang: lang || "es" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Financial Coach error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================
// FALLBACK ADVICE
// ============================================================

function getFallbackAdvice(phase: string | null, summary: any, lang: string): string {
  const balance = (summary?.totalIncome || 0) - (summary?.totalExpenses || 0);
  const topCat = summary?.topCategories?.[0];
  
  const phaseAdvice: Record<string, Record<string, string>> = {
    es: {
      menstrual: `💰 **Consejo financiero de fase Menstrual:**\n\nTu cuerpo está en modo descanso. Es buen momento para revisar tu presupuesto sin prisas. Evita compras impulsivas — tu sensibilidad está aumentada.\n\n✅ **Acciones:**\n1. Revisa tus gastos de la semana sin juzgarte\n2. Planifica el presupuesto de la próxima semana`,
      follicular: `💰 **Consejo financiero de fase Folicular:**\n\nTu energía financiera está subiendo. Es buen momento para planificar metas de ahorro y buscar formas de incrementar tus ingresos.\n\n✅ **Acciones:**\n1. Define 1 meta de ahorro concreta para este mes\n2. Investiga una oportunidad de ingreso extra`,
      ovulatory: `💰 **Consejo financiero de fase Ovulatoria:**\n\nTu confianza está al máximo. Es ideal para negociar precios, pedir aumentos o cerrar tratos financieros.\n\n✅ **Acciones:**\n1. Negocia algo esta semana (precio, contrato, aumento)\n2. Toma una decisión financiera importante que has pospuesto`,
      luteal: `💰 **Consejo financiero de fase Lútea:**\n\nTu cerebro analítico está en su mejor momento. Perfecto para organizar cuentas, revisar suscripciones y cerrar el mes.\n\n✅ **Acciones:**\n1. Revisa y cancela suscripciones que no uses\n2. Organiza tus gastos por categoría`
    },
    en: {
      menstrual: `💰 **Menstrual Phase Financial Tip:**\n\nYour body is in rest mode. Good time to review your budget without rush. Avoid impulse buys — your sensitivity is heightened.\n\n✅ **Actions:**\n1. Review this week's spending without judgment\n2. Plan next week's budget`,
      follicular: `💰 **Follicular Phase Financial Tip:**\n\nYour financial energy is rising. Good time to plan savings goals and find ways to increase income.\n\n✅ **Actions:**\n1. Set 1 concrete savings goal for this month\n2. Research an extra income opportunity`,
      ovulatory: `💰 **Ovulatory Phase Financial Tip:**\n\nYour confidence is at its peak. Ideal for negotiating prices, asking for raises, or closing financial deals.\n\n✅ **Actions:**\n1. Negotiate something this week\n2. Make that financial decision you've been postponing`,
      luteal: `💰 **Luteal Phase Financial Tip:**\n\nYour analytical brain is at its best. Perfect for organizing accounts, reviewing subscriptions, and wrapping up the month.\n\n✅ **Actions:**\n1. Review and cancel unused subscriptions\n2. Organize expenses by category`
    }
  };

  let advice = (phaseAdvice[lang] || phaseAdvice["es"])[phase || "follicular"];

  // Add balance-specific insight
  if (balance < 0) {
    const balanceTip: Record<string, string> = {
      es: `\n\n⚠️ **Atención:** Tu balance es negativo este mes ($${balance.toFixed(2)}). Revisa dónde puedes reducir gastos esta semana.`,
      en: `\n\n⚠️ **Attention:** Your balance is negative this month ($${balance.toFixed(2)}). Review where you can cut expenses this week.`
    };
    advice += balanceTip[lang] || balanceTip["es"];
  } else if (balance > 500) {
    const savingsTip: Record<string, string> = {
      es: `\n\n🎉 **¡Excelente!** Tienes $${balance.toFixed(2)} de balance positivo. Considera mover una parte a tu meta de ahorro.`,
      en: `\n\n🎉 **Excellent!** You have $${balance.toFixed(2)} positive balance. Consider moving some to your savings goal.`
    };
    advice += savingsTip[lang] || savingsTip["es"];
  }

  // Add top category insight
  if (topCat && topCat.percentage > 30) {
    const catTip: Record<string, string> = {
      es: `\n\n📊 **Patrón detectado:** Tu mayor gasto es en ${topCat.name} (${topCat.percentage}%). ¿Puedes reducirlo un 10% esta semana?`,
      en: `\n\n📊 **Pattern detected:** Your biggest expense is ${topCat.name} (${topCat.percentage}%). Can you reduce it by 10% this week?`
    };
    advice += catTip[lang] || catTip["es"];
  }

  return advice;
}
