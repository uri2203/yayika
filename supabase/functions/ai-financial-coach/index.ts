// ============================================================
// Yayika — AI Financial Coach Edge Function
// Analyzes spending patterns and gives personalized advice
// Deploy: supabase functions deploy ai-financial-coach (JWT verification required)
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// A real user session is required. The public anon key is a valid JWT but it
// is not a login, so reject it explicitly before trusting anything in the body.
async function requireUser(req: Request): Promise<{ id: string } | null> {
  const header = req.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4) payload += "=";
    const claims = JSON.parse(atob(payload));
    if (!claims.sub || claims.role === "anon") return null;
  } catch {
    return null;
  }
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return null;
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user?.id ? { id: user.id } : null;
  } catch {
    return null;
  }
}

async function enforceAiRateLimit(req: Request, action: string): Promise<Response | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    if (!supabaseUrl) return null;
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "anon";
    const rl = await fetch(`${supabaseUrl}/functions/v1/rate-limit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "record", action, identifier: ip, type: "ai" }),
    });
    if (rl.status === 429) {
      const j = await rl.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: "Rate limit exceeded", retryAfterMs: (j as any).retryAfterMs ?? 60000 }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return null;
  } catch {
    return null; // fail open: el rate limiter nunca bloquea por su propio error
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await requireUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const limited = await enforceAiRateLimit(req, "ai-financial-coach");
    if (limited) return limited;
    const groqKey = Deno.env.get("GROQ_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const apiKey = groqKey || openaiKey;

    const { cycle_phase, transactions, monthly_summary, lang } = await req.json();
    const user_id = user.id;
    // Normalize locale variants (e.g. pt-BR -> pt) for consistent language lookups.
    const requestedLang = (lang || "es").split("-")[0].toLowerCase();

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
1. Res SIEMPRE en ${langNames[requestedLang] || "español"}
2. Sé práctica, cálida y directa
3. Máximo 4-5 oraciones
4. Incluye 1-2 acciones concretas
5. Conecta finanzas con la fase del ciclo cuando sea relevante
6. Usa emojis con moderación
7. Analiza patrones de gasto reales
8. IMPORTANTE: Escribe TODA la respuesta únicamente en ${langNames[requestedLang] || "español"}. Aunque estas reglas estén en español, tu salida debe ser 100% ${langNames[requestedLang] || "español"}; no mezcles español, inglés ni otros idiomas.`;

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
        const model = isGroq ? "qwen/qwen3.8-27b" : "gpt-4o-mini";

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
      advice = getFallbackAdvice(cycle_phase, monthly_summary, requestedLang);
    }

    return new Response(JSON.stringify({ advice, lang: requestedLang }), {
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
    },
    pt: {
      menstrual: `💰 **Dica financeira da fase Menstrual:**\n\nSeu corpo está em modo de descanso. É um bom momento para revisar o orçamento sem pressa. Evite compras por impulso — sua sensibilidade está aumentada.\n\n✅ **Ações:**\n1. Revise seus gastos da semana sem se julgar\n2. Planeje o orçamento da próxima semana`,
      follicular: `💰 **Dica financeira da fase Folicular:**\n\nSua energia financeira está subindo. É um bom momento para planejar metas de economia e buscar formas de aumentar sua renda.\n\n✅ **Ações:**\n1. Defina 1 meta concreta de economia para este mês\n2. Pesquise uma oportunidade de renda extra`,
      ovulatory: `💰 **Dica financeira da fase Ovulatoria:**\n\nSua confiança está no auge. Ideal para negociar preços, pedir aumento ou fechar negócios.\n\n✅ **Ações:**\n1. Negocie algo nesta semana (preço, contrato, aumento)\n2. Tome aquela decisão financeira importante que você vem adiando`,
      luteal: `💰 **Dica financeira da fase Lútea:**\n\nSeu cérebro analítico está no melhor momento. Perfeito para organizar contas, revisar assinaturas e fechar o mês.\n\n✅ **Ações:**\n1. Revise e cancele assinaturas que você não usa\n2. Organize seus gastos por categoria`
    },
    fr: {
      menstrual: `💰 **Conseil financier de la phase Menstruelle :**\n\nVotre corps est en mode repos. C'est le bon moment pour revoir votre budget sans vous presser. Évitez les achats impulsifs — votre sensibilité est accrue.\n\n✅ **Actions :**\n1. Revue vos dépenses de la semaine sans vous juger\n2. Planifiez le budget de la semaine prochaine`,
      follicular: `💰 **Conseil financier de la phase Folliculaire :**\n\nVotre énergie financière monte. C'est le bon moment pour planifier des objectifs d'épargne et trouver des moyens d'augmenter vos revenus.\n\n✅ **Actions :**\n1. Définissez 1 objectif d'épargne concret pour ce mois\n2. Renseignez-vous sur une opportunité de revenu complémentaire`,
      ovulatory: `💰 **Conseil financier de la phase Ovulatoire :**\n\nVotre confiance est à son comble. Idéal pour négocier les prix, demander une augmentation ou conclure des accords financiers.\n\n✅ **Actions :**\n1. Négociez quelque chose cette semaine (prix, contrat, augmentation)\n2. Prenez cette décision financière importante que vous reportez`,
      luteal: `💰 **Conseil financier de la phase Lutéale :**\n\nVotre cerveau analytique est au meilleur de sa forme. Parfait pour mettre vos comptes en ordre, revoir vos abonnements et clôturer le mois.\n\n✅ **Actions :**\n1. Vérifiez et résiliez les abonnements inutilisés\n2. Classez vos dépenses par catégorie`
    },
    de: {
      menstrual: `💰 **Finanztipp in der Menstruationsphase:**\n\nDein Körper ist im Ruhemodus. Es ist ein guter Zeitpunkt, dein Budget in Ruhe zu prüfen. Vermeide Impulkäufe — deine Sensibilität ist erhöht.\n\n✅ **Maßnahmen:**\n1. Prüfe diese Woche deine Ausgaben, ohne dich zu verurteilen\n2. Plane das Budget für die nächste Woche`,
      follicular: `💰 **Finanztipp in der Follikelphase:**\n\nDeine finanzielle Energie steigt. Es ist ein guter Zeitpunkt, Sparziele zu planen und Wege zu finden, dein Einkommen zu steigern.\n\n✅ **Maßnahmen:**\n1. Setze dir 1 konkretes Sparziel für diesen Monat\n2. Informiere dich über eine Möglichkeit für Zusatzeinkommen`,
      ovulatory: `💰 **Finanztipp in der Ovulationsphase:**\n\nDein Selbstvertrauen ist auf dem Höhepunkt. Ideal, um Preise zu verhandeln, eine Gehaltserhöhung zu bitten oder Finanzgeschäfte abzuschließen.\n\n✅ **Maßnahmen:**\n1. Verhandle diese Woche etwas (Preis, Vertrag, Gehalt)\n2. Triff die wichtige Finanzentscheidung, die du schon lange aufschiebst`,
      luteal: `💰 **Finanztipp in der Lutealphase:**\n\nDein analytisches Gehirn ist in Topform. Perfekt, um Konten zu ordnen, Abonnements zu prüfen und den Monat abzuschließen.\n\n✅ **Maßnahmen:**\n1. Prüfe und kündige ungenutzte Abonnements\n2. Ordne deine Ausgaben nach Kategorien`
    }
  };

  let advice = (phaseAdvice[lang] || phaseAdvice["es"])[phase || "follicular"];

  // Add balance-specific insight
  if (balance < 0) {
    const balanceTip: Record<string, string> = {
      es: `\n\n⚠️ **Atención:** Tu balance es negativo este mes ($${balance.toFixed(2)}). Revisa dónde puedes reducir gastos esta semana.`,
      en: `\n\n⚠️ **Attention:** Your balance is negative this month ($${balance.toFixed(2)}). Review where you can cut expenses this week.`,
      pt: `\n\n⚠️ **Atenção:** Seu saldo está negativo neste mês ($${balance.toFixed(2)}). Veja onde você pode reduzir gastos nesta semana.`,
      fr: `\n\n⚠️ **Attention :** Votre solde est négatif ce mois-ci ($${balance.toFixed(2)}). Voyez où réduire vos dépenses cette semaine.`,
      de: `\n\n⚠️ **Achtung:** Dein Saldo ist diesen Monat negativ ($${balance.toFixed(2)}). Prüfe, wo du diese Woche Ausgaben senken kannst.`
    };
    advice += balanceTip[lang] || balanceTip["es"];
  } else if (balance > 500) {
    const savingsTip: Record<string, string> = {
      es: `\n\n🎉 **¡Excelente!** Tienes $${balance.toFixed(2)} de balance positivo. Considera mover una parte a tu meta de ahorro.`,
      en: `\n\n🎉 **Excellent!** You have $${balance.toFixed(2)} positive balance. Consider moving some to your savings goal.`,
      pt: `\n\n🎉 **Excelente!** Você tem $${balance.toFixed(2)} de saldo positivo. Considere transferir parte para sua meta de economia.`,
      fr: `\n\n🎉 **Excellent !** Vous avez un solde positif de $${balance.toFixed(2)}. Envisagez d'en placer une partie dans votre épargne.`,
      de: `\n\n🎉 **Ausgezeichnet!** Du hast einen positiven Saldo von $${balance.toFixed(2)}. Überlege, einen Teil auf dein Sparziel zu übertragen.`
    };
    advice += savingsTip[lang] || savingsTip["es"];
  }

  // Add top category insight
  if (topCat && topCat.percentage > 30) {
    const catTip: Record<string, string> = {
      es: `\n\n📊 **Patrón detectado:** Tu mayor gasto es en ${topCat.name} (${topCat.percentage}%). ¿Puedes reducirlo un 10% esta semana?`,
      en: `\n\n📊 **Pattern detected:** Your biggest expense is ${topCat.name} (${topCat.percentage}%). Can you reduce it by 10% this week?`,
      pt: `\n\n📊 **Padrão detectado:** Seu maior gasto é com ${topCat.name} (${topCat.percentage}%). Você pode reduzi-lo em 10% nesta semana?`,
      fr: `\n\n📊 **Tendance détectée :** Votre plus grosse dépense concerne ${topCat.name} (${topCat.percentage}%). Pourriez-vous la réduire de 10 % cette semaine ?`,
      de: `\n\n📊 **Muster erkannt:** Deine größte Ausgabe betrifft ${topCat.name} (${topCat.percentage}%). Kannst du sie diese Woche um 10 % senken?`
    };
    advice += catTip[lang] || catTip["es"];
  }

  return advice;
}
