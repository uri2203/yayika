// ============================================================
// Yayika — AI Chat Edge Function
// Supports: Groq (free), OpenAI, or any OpenAI-compatible API
// Deploy: supabase functions deploy ai-chat --no-verify-jwt
// Env vars needed: GROQ_API_KEY or OPENAI_API_KEY
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: "No LLM API key configured. Set GROQ_API_KEY or OPENAI_API_KEY in Supabase Edge Function secrets.",
        hint: "Run: supabase secrets set GROQ_API_KEY=gsk_your_key_here"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, lang } = await req.json();

    // Use Groq if key available, else OpenAI
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
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`${isGroq ? 'Groq' : 'OpenAI'} error:`, err);
      return new Response(JSON.stringify({ error: "LLM request failed", details: err }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
