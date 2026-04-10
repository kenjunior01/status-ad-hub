import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a niche classification AI for StatusAds, a WhatsApp Status advertising marketplace.
Based on the user's personal information (age, gender, habits, interests, country), you must:
1. Select exactly 3 advertising niches that best match this person's audience profile
2. Suggest a fair price per post in USD based on their WhatsApp views range and market

Available niches (pick exactly 3):
- Tecnologia, Moda, Beleza, Saúde, Fitness, Gastronomia, Viagens, Educação, Finanças, Negócios, Marketing, Entretenimento, Música, Jogos, Esportes, Automotivo, Imobiliário, Pets, Arte, Lifestyle

The user may have already chosen 1 niche. If so, keep it and pick 2 more complementary ones.

IMPORTANT: Respond ONLY with valid JSON, no markdown, no explanation.`;

    const userPrompt = `Analyze this creator profile and select niches + price:
- Country: ${userData.country || 'Unknown'}
- Age Range: ${userData.ageRange || 'Unknown'}
- Gender: ${userData.gender || 'Unknown'}
- Habits/Interests: ${userData.habits || 'Not specified'}
- User-selected niche: ${userData.selectedNiche || 'None'}
- WhatsApp Views Range: ${userData.viewsMin || 0} - ${userData.viewsMax || 0}
- Follower Count: ${userData.followers || 0}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "assign_niches_and_price",
            description: "Assign 3 niches and a suggested price to the creator",
            parameters: {
              type: "object",
              properties: {
                niches: {
                  type: "array",
                  items: { type: "string" },
                  description: "Exactly 3 niches from the available list"
                },
                suggested_price_usd: {
                  type: "number",
                  description: "Suggested price per post in USD, minimum 5"
                },
                reasoning: {
                  type: "string",
                  description: "Brief explanation of why these niches were selected (1-2 sentences)"
                }
              },
              required: ["niches", "suggested_price_usd", "reasoning"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "assign_niches_and_price" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI niche selector error:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Unknown error",
      // Fallback
      niches: ["Lifestyle", "Entretenimento", "Marketing"],
      suggested_price_usd: 10,
      reasoning: "Default assignment due to AI error"
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
