import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[StatusAI] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const body = await req.json();
    const action = body.action || body.type;
    const params = body;
    logStep("Action requested", { action, userId: user.id });

    let result;

    switch (action) {
      case "validate-proof":
        result = await validateProof(LOVABLE_API_KEY, supabaseClient, params);
        break;
      case "predict-roi":
        result = await predictROI(LOVABLE_API_KEY, supabaseClient, params);
        break;
      case "matchmaking":
        result = await matchmaking(LOVABLE_API_KEY, supabaseClient, params);
        break;
      case "mascot-chat":
        result = await mascotChat(LOVABLE_API_KEY, params);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    const status = errorMessage.includes("Rate limit") ? 429 : 
                   errorMessage.includes("Payment required") ? 402 : 500;

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});

// ─── 1. VALIDATE PROOF (OCR/Vision) ─────────────────────────────────────
async function validateProof(apiKey: string, supabase: any, params: any) {
  const { proof_id, image_url } = params;
  if (!proof_id || !image_url) throw new Error("Missing proof_id or image_url");

  logStep("Validating proof", { proof_id });

  const response = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Você é o StatusAI, um sistema de verificação automática de provas de publicação em WhatsApp Status.

Analise a imagem do print de WhatsApp Status e extraia as seguintes informações:
1. **view_count**: Número de visualizações visível na imagem (número inteiro)
2. **is_valid_status**: Se a imagem parece ser um print legítimo de WhatsApp Status (true/false)
3. **ad_integrity**: Se o conteúdo do anúncio parece íntegro e não foi adulterado (score 0-100)
4. **posting_time**: Horário aproximado da postagem se visível (string ou null)
5. **confidence**: Nível de confiança da análise (0-100)
6. **issues**: Lista de problemas encontrados (array de strings, vazio se nenhum)
7. **summary**: Resumo breve da análise em português

Responda APENAS com JSON válido, sem markdown.`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analise este print de WhatsApp Status e extraia as informações de verificação:" },
            { type: "image_url", image_url: { url: image_url } }
          ]
        }
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limit exceeded");
    if (response.status === 402) throw new Error("Payment required");
    const text = await response.text();
    throw new Error(`AI gateway error: ${text}`);
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content || "";
  
  let analysis;
  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    analysis = JSON.parse(cleaned);
  } catch {
    analysis = {
      view_count: null,
      is_valid_status: false,
      ad_integrity: 0,
      confidence: 0,
      issues: ["Não foi possível analisar a imagem"],
      summary: "Análise inconclusiva. Verifique manualmente."
    };
  }

  // Update the proof record with AI analysis
  const updateData: any = {
    engagement_data: {
      ai_analysis: analysis,
      analyzed_at: new Date().toISOString(),
    },
  };

  // Auto-set view count if detected with high confidence
  if (analysis.view_count && analysis.confidence >= 70) {
    updateData.view_count = analysis.view_count;
  }

  // Auto-approve if high confidence and valid
  if (analysis.is_valid_status && analysis.ad_integrity >= 80 && analysis.confidence >= 85) {
    updateData.status = "approved";
    updateData.reviewer_notes = `[StatusAI] Aprovado automaticamente. Confiança: ${analysis.confidence}%. Visualizações: ${analysis.view_count || 'N/D'}`;
    updateData.reviewed_at = new Date().toISOString();
  }

  await supabase
    .from("campaign_proofs")
    .update(updateData)
    .eq("id", proof_id);

  logStep("Proof validated", { proof_id, confidence: analysis.confidence });

  return { success: true, analysis };
}

// ─── 2. PREDICT ROI ─────────────────────────────────────────────────────
async function predictROI(apiKey: string, supabase: any, params: any) {
  const { creator_id, campaign_budget } = params;
  if (!creator_id) throw new Error("Missing creator_id");

  logStep("Predicting ROI", { creator_id, campaign_budget });

  // Fetch creator profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", creator_id)
    .single();

  if (!profile) throw new Error("Creator profile not found");

  // Fetch creator's campaign history
  const { data: pastCampaigns } = await supabase
    .from("campaigns")
    .select("*")
    .eq("creator_id", creator_id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(10);

  // Fetch proof data for actual view counts
  const campaignIds = (pastCampaigns || []).map((c: any) => c.id);
  let proofsData: any[] = [];
  if (campaignIds.length > 0) {
    const { data: proofs } = await supabase
      .from("campaign_proofs")
      .select("*")
      .in("campaign_id", campaignIds)
      .eq("status", "approved");
    proofsData = proofs || [];
  }

  const prompt = `Você é o StatusAI, um motor de previsão de ROI para campanhas de publicidade em WhatsApp Status.

Dados do Criador:
- Nome: ${profile.display_name || 'N/D'}
- Nicho: ${profile.niche || 'N/D'}
- Seguidores: ${profile.follower_count || 0}
- Taxa de Engajamento: ${profile.engagement_rate || 0}%
- CPV Rate: R$ ${profile.cpv_rate || 0}
- Avaliação: ${profile.rating || 0}/5
- Campanhas completas: ${(pastCampaigns || []).length}
- Badge: ${profile.badge_level || 'bronze'}

Histórico de Campanhas (últimas ${(pastCampaigns || []).length}):
${(pastCampaigns || []).map((c: any) => {
  const proofs = proofsData.filter((p: any) => p.campaign_id === c.id);
  const avgViews = proofs.length > 0 
    ? proofs.reduce((sum: number, p: any) => sum + (p.view_count || 0), 0) / proofs.length 
    : 0;
  return `- ${c.title}: R$ ${c.price}, Views: ${avgViews}, CPV: R$ ${c.cpv_rate || 0}`;
}).join('\n')}

Orçamento da campanha proposta: R$ ${campaign_budget || 'não definido'}

Com base nesses dados, forneça uma previsão de ROI com:
1. **estimated_views**: Visualizações estimadas (número inteiro)
2. **estimated_reach**: Alcance estimado (número inteiro)
3. **estimated_cpv**: Custo por visualização estimado (número decimal em R$)
4. **roi_score**: Score de ROI de 0 a 100
5. **conversion_probability**: Probabilidade de conversão em % (0-100)
6. **recommended_budget**: Orçamento recomendado em R$
7. **strengths**: Pontos fortes do criador (array de strings)
8. **risks**: Riscos identificados (array de strings)
9. **recommendation**: Recomendação geral ("highly_recommended", "recommended", "neutral", "not_recommended")
10. **summary**: Resumo da análise em português (2-3 frases)

Responda APENAS com JSON válido, sem markdown.`;

  const response = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "Você é um analista de marketing especializado em publicidade em WhatsApp Status. Responda apenas com JSON válido." },
        { role: "user", content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limit exceeded");
    if (response.status === 402) throw new Error("Payment required");
    const text = await response.text();
    throw new Error(`AI gateway error: ${text}`);
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content || "";

  let prediction;
  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    prediction = JSON.parse(cleaned);
  } catch {
    // Fallback calculation
    const followers = profile.follower_count || 0;
    const engagement = profile.engagement_rate || 0;
    const estimatedViews = Math.round(followers * (engagement / 100));
    prediction = {
      estimated_views: estimatedViews,
      estimated_reach: Math.round(estimatedViews * 1.3),
      estimated_cpv: profile.cpv_rate || 0.05,
      roi_score: 50,
      conversion_probability: 5,
      recommended_budget: Math.round(estimatedViews * (profile.cpv_rate || 0.05)),
      strengths: ["Dados insuficientes para análise completa"],
      risks: ["Histórico limitado"],
      recommendation: "neutral",
      summary: "Análise baseada em dados limitados. Recomenda-se uma campanha teste para calibrar métricas."
    };
  }

  logStep("ROI predicted", { creator_id, roi_score: prediction.roi_score });

  return { success: true, prediction, creator: {
    display_name: profile.display_name,
    niche: profile.niche,
    follower_count: profile.follower_count,
    engagement_rate: profile.engagement_rate,
    cpv_rate: profile.cpv_rate,
    rating: profile.rating,
    badge_level: profile.badge_level,
  }};
}

// ─── 3. MATCHMAKING ─────────────────────────────────────────────────────
async function matchmaking(apiKey: string, supabase: any, params: any) {
  const { niche, budget, target_views, campaign_description } = params;
  
  logStep("Matchmaking", { niche, budget, target_views });

  // Fetch all available creators
  const { data: creators } = await supabase
    .from("profiles")
    .select("*")
    .not("display_name", "is", null)
    .gt("follower_count", 0)
    .order("rating", { ascending: false })
    .limit(50);

  if (!creators || creators.length === 0) {
    return { success: true, matches: [], summary: "Nenhum criador disponível no momento." };
  }

  // Fetch campaign history for each creator
  const creatorIds = creators.map((c: any) => c.user_id);
  const { data: allCampaigns } = await supabase
    .from("campaigns")
    .select("creator_id, status, actual_views, price, cpv_rate")
    .in("creator_id", creatorIds)
    .eq("status", "completed");

  const creatorSummaries = creators.map((c: any) => {
    const campaigns = (allCampaigns || []).filter((camp: any) => camp.creator_id === c.user_id);
    const avgViews = campaigns.length > 0
      ? campaigns.reduce((sum: number, camp: any) => sum + (camp.actual_views || 0), 0) / campaigns.length
      : 0;
    return {
      id: c.user_id,
      name: c.display_name,
      niche: c.niche,
      followers: c.follower_count,
      engagement: c.engagement_rate,
      cpv: c.cpv_rate,
      rating: c.rating,
      badge: c.badge_level,
      completed_campaigns: campaigns.length,
      avg_views: avgViews,
      verified: c.is_verified,
    };
  });

  const prompt = `Você é o StatusAI Matchmaker, um algoritmo inteligente de correspondência entre marcas e criadores de conteúdo para WhatsApp Status.

Requisitos da Campanha:
- Nicho desejado: ${niche || 'Qualquer'}
- Orçamento: R$ ${budget || 'flexível'}
- Meta de visualizações: ${target_views || 'não definido'}
- Descrição: ${campaign_description || 'Não informada'}

Criadores Disponíveis:
${creatorSummaries.map((c, i) => `${i + 1}. ${c.name} | Nicho: ${c.niche || 'N/D'} | ${c.followers} seguidores | Eng: ${c.engagement}% | CPV: R$ ${c.cpv} | Rating: ${c.rating} | Badge: ${c.badge} | Campanhas: ${c.completed_campaigns} | Média views: ${c.avg_views} | Verificado: ${c.verified}`).join('\n')}

Analise a afinidade de cada criador com a campanha e retorne um ranking dos TOP 5 melhores matches com:
1. **matches**: Array de objetos com:
   - creator_id: ID do criador
   - creator_name: Nome do criador
   - match_score: Score de compatibilidade (0-100)
   - estimated_views: Visualizações estimadas
   - estimated_cost: Custo estimado em R$
   - reasons: Motivos da recomendação (array de strings)
   - audience_affinity: Score de afinidade de audiência (0-100)
2. **summary**: Resumo geral das recomendações em português (2-3 frases)
3. **best_strategy**: Estratégia recomendada (1-2 frases)

Priorize afinidade de audiência sobre métricas brutas. Um criador de nicho alinhado com 5K seguidores engajados vale mais que um generalista com 50K.

Responda APENAS com JSON válido, sem markdown.`;

  const response = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "Você é um especialista em marketing de influência para WhatsApp Status. Responda apenas com JSON válido." },
        { role: "user", content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limit exceeded");
    if (response.status === 402) throw new Error("Payment required");
    const text = await response.text();
    throw new Error(`AI gateway error: ${text}`);
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content || "";

  let matchResult;
  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    matchResult = JSON.parse(cleaned);
  } catch {
    // Fallback: simple scoring
    const sorted = creatorSummaries
      .map(c => ({
        creator_id: c.id,
        creator_name: c.name,
        match_score: Math.min(100, (c.rating || 0) * 15 + (c.engagement || 0) * 2 + (c.completed_campaigns * 5)),
        estimated_views: c.avg_views || c.followers * (c.engagement / 100),
        estimated_cost: (c.avg_views || c.followers * (c.engagement / 100)) * (c.cpv || 0.05),
        reasons: [`Rating ${c.rating}`, `${c.followers} seguidores`],
        audience_affinity: niche && c.niche === niche ? 90 : 50,
      }))
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 5);

    matchResult = {
      matches: sorted,
      summary: "Ranking baseado em métricas disponíveis. Para melhor precisão, mais dados de campanhas são necessários.",
      best_strategy: "Comece com uma campanha teste com o criador melhor ranqueado.",
    };
  }

  logStep("Matchmaking complete", { matches: matchResult.matches?.length || 0 });

  return { success: true, ...matchResult };
}

async function mascotChat(apiKey: string, params: any) {
  const { message, language, conversationHistory } = params;
  logStep("Mascot chat", { language, messageLength: message?.length });

  const langMap: Record<string, string> = {
    'pt-BR': 'português',
    'en-US': 'English',
    'es-ES': 'español',
    'fr-FR': 'français',
  };
  const lang = langMap[language] || 'português';

  const messages = [
    {
      role: "system",
      content: `You are StatusBot, the friendly AI mascot of StatusAds Connect — a WhatsApp Status advertising marketplace. You help users understand the platform, give tips about monetization, pricing, campaigns, payments, and more. Be concise, friendly, and use emojis. Always respond in ${lang}. Keep answers under 150 words.`
    },
    ...(conversationHistory || []),
    { role: "user", content: message }
  ];

  const response = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logStep("AI API error", { status: response.status, error: errorText });
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || "Desculpe, não entendi. Pode reformular?";

  return { success: true, response: reply };
}
