/**
 * Supabase Edge Function: ai-analyst
 *
 * COPILOTO DE SEGURANÇA IA (v3.19.0) — análise inteligente do ambiente
 * da app via LLM compatível com a API OpenAI (funciona com OpenAI,
 * z.ai/GLM, Groq, OpenRouter, DeepSeek, Ollama local, etc.).
 *
 * O cliente envia uma pergunta + contexto de segurança (redes Wi-Fi
 * capturadas, dispositivos BLE, locais conhecidos, eventos do diário,
 * score) e recebe uma análise curta, prática e em português.
 *
 * PRIVACIDADE POR DESIGN:
 *  - Autenticação JWT obrigatória (nunca anónima).
 *  - Rate limit por utilizador (20 análises/hora).
 *  - O contexto é truncado/anonimizado no CLIENTE (src/lib/ai-copilot.ts)
 *    — SSID/BSSID/MAC completos nunca chegam aqui intactos.
 *  - Nada é persistido nesta função (sem DB, sem logs de conteúdo).
 *  - Se nenhuma chave IA estiver configurada devolve 503 + configured:false
 *    e o cliente usa o ANALISTA LOCAL offline (motor de regras expert).
 *
 * Environment secrets (Supabase Dashboard > Edge Functions > Secrets):
 *   AI_API_KEY    — chave do fornecedor (obrigatória para IA na nuvem)
 *   AI_BASE_URL   — base compatível OpenAI (default: https://api.openai.com/v1)
 *                   ex. z.ai: https://api.z.ai/api/paas/v4
 *                   ex. DeepSeek: https://api.deepseek.com/v1
 *   AI_MODEL      — modelo (default: gpt-4o-mini; z.ai: glm-4.6;
 *                   DeepSeek: deepseek-chat; Groq: llama-3.3-70b-versatile)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  corsHeaders, handlePreflight, json, authenticateUser, rateLimit,
} from '../_shared/security.ts'

const MAX_QUESTION = 800
const MAX_CONTEXT = 6000 // caracteres de contexto (client já trunca)
const TIMEOUT_MS = 25_000

/** System prompt do copiloto — papel, tom e limites. */
function systemPrompt(lang = 'pt'): string {
  if (lang === 'en') {
    return [
      'You are AEGIS, the AI security copilot of the StatusAds Connect personal safety app.',
      'You analyse Wi-Fi networks, Bluetooth devices, known places and security events collected on-device by the user.',
      'Rules: be concise (max 140 words), practical, calm; prioritise personal safety advice;',
      'use short paragraphs or up to 4 bullets; never invent data that is not in the context;',
      'if context is empty, give general advice and ask to run a scan.',
      'Never encourage illegal scanning or surveillance of third parties. This app protects the USER only.',
    ].join(' ')
  }
  return [
    'És o AEGIS, o copiloto de segurança por IA da app StatusAds Connect (segurança pessoal anti-rapto).',
    'Analisas redes Wi-Fi, dispositivos Bluetooth, locais conhecidos e eventos de segurança recolhidos no telemóvel do utilizador.',
    'Regras: responde EM PORTUGUÊS DE PORTUGAL, conciso (máx. 140 palavras), prático e calmo;',
    'prioriza sempre a segurança pessoal; usa parágrafos curtos ou até 4 bullets;',
    'não inventes dados que não estejam no contexto; se o contexto estiver vazio, dá conselhos gerais e sugere executar um scan.',
    'Nunca incentives vigilância ilegal de terceiros — esta app protege apenas o UTILIZADOR.',
  ].join(' ')
}

serve(async (req: Request) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight
  const cors = corsHeaders(req)

  if (req.method !== 'POST') return json({ error: 'Method not allowed', reply: null }, 405, cors)

  try {
    // ── Configuração do fornecedor IA ──
    const apiKey = Deno.env.get('AI_API_KEY')
    const baseUrl = (Deno.env.get('AI_BASE_URL') ?? 'https://api.openai.com/v1').replace(/\/+$/, '')
    const model = Deno.env.get('AI_MODEL') ?? 'gpt-4o-mini'
    const configured = !!apiKey

    // ── Autenticação (JWT obrigatório) ──
    const callerId = await authenticateUser(req)
    if (!callerId) return json({ error: 'Não autenticado', reply: null, configured }, 401, cors)

    // dryRun → só informa se a IA está configurada
    const body = await req.json().catch(() => ({} as any))
    if (body?.dryRun === true) {
      return json({ dryRun: true, configured, model }, 200, cors)
    }

    if (!configured) {
      return json({ error: 'IA na nuvem não configurada (AI_API_KEY). A app usa o analista local.', reply: null, configured: false }, 503, cors)
    }

    // ── Rate limit: 20 análises/hora/utilizador ──
    const rl = rateLimit(`ai:${callerId}`, 20, 60 * 60 * 1000)
    if (!rl.ok) {
      return json({ error: `Limite atingido. Tente dentro de ${rl.retryAfter}s`, reply: null, configured }, 429, cors)
    }

    // ── Validação de input ──
    const question = String(body?.question ?? '').slice(0, MAX_QUESTION).trim()
    const context = String(body?.context ?? '').slice(0, MAX_CONTEXT)
    const lang = body?.lang === 'en' ? 'en' : 'pt'
    const history: Array<{ role: string; content: string }> = Array.isArray(body?.history)
      ? body.history
        .filter((m: any) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
        .slice(-4) // últimas 4 mensagens para contexto conversacional
        .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 1200) }))
      : []

    if (!question) return json({ error: 'Pergunta vazia', reply: null, configured }, 400, cors)

    const userContent = context
      ? `CONTEXTO DE SEGURANÇA (dados do dispositivo do utilizador):\n${context}\n\nPERGUNTA: ${question}`
      : `PERGUNTA: ${question}`

    // ── Chamada ao LLM (compatível OpenAI) com timeout ──
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    let upstream: Response
    try {
      upstream = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt(lang) },
            ...history,
            { role: 'user', content: userContent },
          ],
          max_tokens: 400,
          temperature: 0.4,
        }),
      })
    } finally {
      clearTimeout(timer)
    }

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '')
      console.error(`[AI] upstream ${upstream.status}:`, errText.slice(0, 300))
      return json({ error: `Fornecedor IA indisponível (${upstream.status})`, reply: null, configured: true }, 502, cors)
    }

    const data = await upstream.json().catch(() => null)
    const reply: string | null = data?.choices?.[0]?.message?.content ?? null

    if (!reply || !reply.trim()) {
      return json({ error: 'Resposta vazia da IA', reply: null, configured: true }, 502, cors)
    }

    console.log(`[AI] reply OK (${reply.length} chars) caller=${callerId.slice(0, 8)} model=${model}`)
    return json({ reply: reply.trim(), model, configured: true }, 200, cors)
  } catch (err) {
    const aborted = err?.name === 'AbortError'
    console.error('[AI] error:', aborted ? 'timeout' : err)
    return json({ error: aborted ? 'A IA demorou demasiado — tente novamente' : 'Erro interno', reply: null }, 500, cors)
  }
})
