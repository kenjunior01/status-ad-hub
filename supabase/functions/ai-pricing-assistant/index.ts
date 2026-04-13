import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { creatorData, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt: string;
    let userPrompt: string;

    if (action === "suggest_price") {
      systemPrompt = `You are a pricing expert for a WhatsApp Status advertising marketplace called StatusAds.
You help creators set competitive prices based on their metrics.
Always respond in Portuguese (the user's language).
Be concise, specific, and data-driven. Format prices in MZN (Metical) and BRL (Real).

CRITICAL: Always compare StatusAds pricing with Meta Ads and Google Ads to show the value advantage:
- Meta Ads (Facebook/Instagram): CPM médio $5-15 USD (320-960 MZN), CTR médio 0.9%
- Google Ads: CPC médio $1-5 USD (64-320 MZN), CPM médio $3-10 USD
- StatusAds: CPV muito mais baixo, audiência orgânica e de confiança, sem custos de gestão de anúncios

Show how advertisers SAVE money by using StatusAds vs Meta/Google Ads.
Base formula: (followers × engagement_rate / 100) / 1000 = base CPV, then multiply by views.
Minimum price per post should be 300 MZN / R$15. Premium niches get 1.5x multiplier.`;

      userPrompt = `Analyze this creator's data and suggest an optimal price per post:
- Display Name: ${creatorData.displayName || 'Unknown'}
- Followers: ${creatorData.followers || 0}
- Engagement Rate: ${creatorData.engagementRate || 0}%
- Niche: ${creatorData.niche || 'General'}
- Country: ${creatorData.country || 'Unknown'}
- WhatsApp Views Range: ${creatorData.viewsMin || 0} - ${creatorData.viewsMax || 0}
- Current Price: ${creatorData.currentPrice ? creatorData.currentPrice + ' MZN' : 'Not set'}
- Total Campaigns Completed: ${creatorData.totalCampaigns || 0}
- Rating: ${creatorData.rating || 0}/5

Provide: 
1) Recommended price range in MZN and BRL
2) Comparação directa: quanto custaria o mesmo alcance no Meta Ads e Google Ads (mostrando que StatusAds é mais barato)
3) Brief justification
4) Tips to increase value`;
    } else if (action === "find_creator") {
      systemPrompt = `You are a campaign advisor for StatusAds, a WhatsApp Status advertising marketplace.
You help advertisers find the best creators for their campaigns based on budget and goals.
Always respond in Portuguese. Be concise and actionable.

CRITICAL: Always compare StatusAds costs vs Meta Ads and Google Ads:
- Meta Ads: CPM $5-15, requer gestão profissional ($500+/mês), alta competição
- Google Ads: CPC $1-5, requer expertise em keywords, Quality Score complexo
- StatusAds: sem custos de gestão, audiência orgânica confiável, resultados directos via WhatsApp

Show the total cost savings when using StatusAds over traditional platforms.
Format all prices in MZN (Metical Moçambicano) and BRL (Real Brasileiro).`;

      userPrompt = `An advertiser wants advice on finding creators:
- Budget: ${creatorData.budget || 0} MZN
- Target Niche: ${creatorData.targetNiche || 'Any'}
- Target Country: ${creatorData.targetCountry || 'Any'}
- Campaign Goal: ${creatorData.campaignGoal || 'Brand awareness'}
- Expected Views: ${creatorData.expectedViews || 'Not specified'}

Available creators summary: ${creatorData.creatorsCount || 0} creators on platform.
Average price range: ${creatorData.avgPriceMin || 300} - ${creatorData.avgPriceMax || 5000} MZN

Provide:
1) Recommended creator profile type
2) Budget allocation tips with comparison table: StatusAds vs Meta Ads vs Google Ads
3) Expected ROI estimate showing how much they save vs traditional ads
4) Why StatusAds is the smarter investment`;
    } else {
      throw new Error("Invalid action. Use 'suggest_price' or 'find_creator'.");
    }

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
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("AI pricing error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
