/**
 * ai-copilot.ts — AEGIS · COPILOTO DE SEGURANÇA IA (v3.19.0).
 *
 * Camada partilhada Web + APK que dá "voz de analista" aos dados já
 * recolhidos pela app (radar Wi-Fi, radar BLE, locais conhecidos,
 * diário de eventos, score de segurança).
 *
 * DUAS FONTES DE INTELIGÊNCIA, SEM FURO DE SERVIÇO:
 *
 *  1. IA NA NUVEM (edge function `ai-analyst`) — LLM compatível OpenAI
 *     (OpenAI, z.ai/GLM, DeepSeek, Groq, OpenRouter…). Activa-se com o
 *     secret AI_API_KEY no Supabase. Dá respostas conversacionais ricas.
 *
 *  2. ANALISTA LOCAL (este ficheiro) — motor de regras expert que lê o
 *     snapshot real do ambiente e produz briefings e conselhos em PT.
 *     Funciona SEMPRE, offline, sem chave, sem enviar dados para fora
 *     do dispositivo. É o fallback automático quando a nuvem não está
 *     configurada/indisponível.
 *
 * PRIVACIDADE: o contexto enviado à nuvem é ANONIMIZADO aqui — MACs
 * truncados a 8 chars, sem coordenadas GPS exactas, sem contactos.
 */

import { supabase } from '@/integrations/supabase/client'
import type { NetThreat } from '@/lib/net-radar'
import type { TrackerAlert } from '@/lib/radar-registry'
import type { AmbientVerdict, ChannelCongestion, PlaceFingerprint } from '@/lib/net-intel'
import type { SecurityEvent } from '@/lib/security-events'

// ── Tipos ─────────────────────────────────────────────────────────────────

export type CopilotSource = 'cloud' | 'local'

export interface CopilotMsg {
  id: string
  role: 'user' | 'ai'
  text: string
  ts: number
  source: CopilotSource
}

/** Snapshot do ambiente — montado pelos componentes a partir dos hooks. */
export interface CopilotSnapshot {
  securityScore: number
  /** redes visíveis no último scan */
  networksLive: number
  registryWifi: number
  threats: NetThreat[]
  riskNet: number
  registryBle: number
  devicesBle: number
  trackers: TrackerAlert[]
  watching: boolean
  cycles: number
  riskWatch: number
  placeAnomaly: boolean
  congestion: ChannelCongestion | null
  verdict: AmbientVerdict
  places: PlaceFingerprint[]
  events: SecurityEvent[]
  contactsCount: number
  checkinActive: boolean
}

// ── Contexto anonimizado para a IA na nuvem ───────────────────────────────

const shortMac = (mac?: string | null) => (mac ? mac.slice(0, 8) : '—')

export function buildCopilotContext(s: CopilotSnapshot): string {
  const lines: string[] = []
  const hh = (t: number) => new Date(t).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })

  lines.push(`SCORE DE SEGURANÇA: ${s.securityScore}/100`)
  lines.push(`VEREDICTO: ${s.verdict.label} (nível ${s.verdict.level})`)
  if (s.verdict.reasons.length) lines.push(`RAZÕES: ${s.verdict.reasons.join('; ')}`)
  lines.push(`SENTINELA: ${s.watching ? `activa (${s.cycles} ciclos, risco ${s.riskWatch}/100)` : 'desligada'}`)
  lines.push(`WI-FI: ${s.networksLive} redes visíveis agora, ${s.registryWifi} no registo, risco ${s.riskNet}/100`)
  if (s.congestion) {
    lines.push(`ESPECTRO: ocupação ${s.congestion.congestionPct}%${s.congestion.best2g != null ? `, melhor canal 2.4GHz: ${s.congestion.best2g}` : ''}`)
  }
  if (s.threats.length) {
    lines.push('AMEAÇAS DE REDE:')
    s.threats.slice(0, 6).forEach((t) => lines.push(`  - [${t.severity}] ${t.title} — ${t.detail}`))
  } else lines.push('AMEAÇAS DE REDE: nenhuma activa')
  lines.push(`BLE: ${s.devicesBle} dispositivos à vista, ${s.registryBle} no registo`)
  if (s.trackers.length) {
    lines.push('RASTREADORES SUSPEITOS:')
    s.trackers.slice(0, 5).forEach((t) =>
      lines.push(`  - [${t.kind === 'known-tracker' ? 'RASTREADOR CONHECIDO' : 'PERSEGUIÇÃO'}] ${t.name || shortMac(t.mac)} · ${t.reason} · ${t.minutesTracked}min acompanhado`))
  } else lines.push('RASTREADORES: nenhum detectado')
  lines.push(`LOCAIS: ${s.places.length} conhecidos${s.placeAnomaly ? ' · DESLOCAMENTO ABRUPTO para local novo!' : ''}`)
  if (s.places.length) {
    const p = s.places[0]
    lines.push(`  local mais frequente: ${p.seenCount}x (${p.sampleSsids.slice(0, 3).join(', ') || 'sem SSIDs'})`)
  }
  if (s.events.length) {
    lines.push('ÚLTIMOS EVENTOS:')
    s.events.slice(0, 8).forEach((e) => lines.push(`  - ${hh(e.ts)} [${e.kind}/${e.severity}] ${e.title}`))
  }
  lines.push(`PRONTIDÃO: contactos emergência ${s.contactsCount}, check-in ${s.checkinActive ? 'activo' : 'inactivo'}`)
  return lines.join('\n').slice(0, 6000)
}

// ── IA na nuvem (edge function ai-analyst) ────────────────────────────────

export interface AskResult {
  text: string
  source: CopilotSource
  /** true quando a nuvem falhou e caiu para o motor local */
  fallback?: boolean
}

export async function askCopilot(
  question: string,
  snapshot: CopilotSnapshot,
  history: CopilotMsg[] = [],
): Promise<AskResult> {
  const context = buildCopilotContext(snapshot)
  const trimmedHistory = history
    .filter((m) => m.text.length < 1500)
    .slice(-4)
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))

  try {
    const { data, error } = await supabase.functions.invoke('ai-analyst', {
      body: { question, context, history: trimmedHistory, lang: 'pt' },
    })
    if (error || !data?.reply) throw new Error(error?.message || 'sem resposta')
    return { text: String(data.reply), source: 'cloud' }
  } catch {
    // nuvem indisponível / não configurada → analista local
    return { text: localExpertAnswer(question, snapshot), source: 'local', fallback: true }
  }
}

/** Verifica se a IA na nuvem está configurada (sem gastar quota). */
export async function copilotCloudConfigured(): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-analyst', { body: { dryRun: true } })
    return !error && data?.configured === true
  } catch {
    return false
  }
}

// ══════════════════════════════════════════════════════════════════════════
// ANALISTA LOCAL — motor de regras expert (offline, sempre disponível)
// ══════════════════════════════════════════════════════════════════════════

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const has = (q: string, ...words: string[]) => words.some((w) => q.includes(w))

/** Resumo de uma linha do ambiente — usado em várias respostas. */
function envLine(s: CopilotSnapshot): string {
  const partes: string[] = []
  partes.push(`${s.networksLive} rede(s) Wi-Fi à vista`)
  partes.push(`${s.devicesBle} dispositivo(s) BLE`)
  if (s.trackers.length) partes.push(`${s.trackers.length} rastreador(es) suspeito(s)`)
  if (s.threats.length) partes.push(`${s.threats.length} ameaça(s) de rede`)
  if (s.placeAnomaly) partes.push('deslocamento abrupto para local novo')
  return partes.join(' · ')
}

/** Recomendações de prontidão concretas (gaps reais do utilizador). */
export function readinessAdvice(s: CopilotSnapshot): string[] {
  const tips: string[] = []
  if (s.contactsCount === 0) tips.push('Adicione contactos de emergência — sem eles o SOS não chega a ninguém.')
  if (!s.checkinActive) tips.push('Active o check-in periódico: se falhar, os contactos são avisados sozinhos.')
  if (!s.watching) tips.push('Arme a sentinela de vigilância contínua — escaneia Wi-Fi e BLE a cada 45s.')
  if (s.registryWifi === 0 && s.registryBle === 0) tips.push('Faça um scan no Radar Wi-Fi e no Radar Bluetooth para criar o histórico do ambiente.')
  if (s.threats.some((t) => t.severity !== 'low')) tips.push('Evite ligar-se às redes assinaladas como ameaça; use dados móveis se necessário.')
  if (s.trackers.length) tips.push('Rastreador próximo detectado: afaste-se do local, tire a bateria/desligue o dispositivo estranho e considere SOS.')
  return tips.slice(0, 4)
}

/**
 * Motor de regras: interpreta a pergunta e responde com base nos dados
 * REAIS do snapshot. Escrito em PT-PT, tom calmo de analista.
 */
export function localExpertAnswer(question: string, s: CopilotSnapshot): string {
  const q = norm(question)
  const hh = (t: number) => new Date(t).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })

  // ── Briefing / estado geral ──
  if (has(q, 'briefing', 'resumo', 'estado', 'status', 'situa', 'como estou', 'relatorio', 'relatório')) {
    return localBriefingText(s)
  }

  // ── Rastreadores / BLE ──
  if (has(q, 'rastread', 'tracker', 'airtag', 'ble', 'bluetooth', 'persegu', 'seguido', 'seguida')) {
    if (!s.trackers.length) {
      return [
        `Nenhum rastreador detectado. O radar BLE já registou ${s.registryBle} dispositivo(s) e neste momento vê ${s.devicesBle} à vista.`,
        'A deteção compara dispositivos que se repetem em locais/tempos diferentes — é assim que apanha perseguidores. Mantenha a sentinela armada para vigilância contínua.',
      ].join(' ')
    }
    const t = s.trackers[0]
    return [
      `⚠ ${s.trackers.length} dispositivo(s) suspeito(s): ${t.name || shortMac(t.mac)} — ${t.reason}.`,
      `Acompanha-o há ~${t.minutesTracked} minuto(s), visto ${t.seen}x.`,
      t.kind === 'known-tracker'
        ? 'Isto é um rastreador comercial conhecido (tipo AirTag/Tile). Não é coincidência habitual.'
        : 'O padrão de repetição indica possível perseguição.',
      'O que fazer agora: 1) afaste-se do local actual; 2) procure objectos estranhos (mala, autocolantes, compartimentos do carro); 3) se o sinal se mantiver, dispare o SOS — o relatório leva o registo BLE anexado.',
    ].join(' ')
  }

  // ── Wi-Fi / redes ──
  if (has(q, 'wifi', 'wi-fi', 'rede', 'redes', 'honeypot', 'evil', 'roteador', 'router', 'canal', 'espectro')) {
    const bits: string[] = []
    bits.push(`Neste momento vejo ${s.networksLive} rede(s) (${s.registryWifi} no histórico), risco de rede ${s.riskNet}/100.`)
    if (s.threats.length) {
      bits.push(`Ameaças activas: ${s.threats.slice(0, 3).map((t) => t.title).join('; ')}.`)
      bits.push('Regra de ouro: redes abertas e nomes "grátis" são iscas — nunca introduza senhas ou PINs nelas; prefira dados móveis.')
    } else {
      bits.push('Nenhuma ameaça activa — não há redes abertas com nomes isca nem padrões de imitação.')
    }
    if (s.congestion && s.congestion.best2g != null) {
      bits.push(`Espectro a ${s.congestion.congestionPct}% de ocupação; se for configurar o seu router, o canal 2.4GHz menos congestionado é o ${s.congestion.best2g}.`)
    }
    return bits.join(' ')
  }

  // ── Local / deslocamento / rapto ──
  if (has(q, 'local', 'lugar', 'onde estou', 'deslocamento', 'rapto', 'sequestr', 'impressao', 'impressão')) {
    if (s.placeAnomaly) {
      return [
        '🚨 Chegou há pouco tempo a um local que NUNCA viu, com deslocamento rápido. Isto é o padrão clássico de coação/rapto.',
        'Se está bem e é apenas uma viagem normal, abra a app no local de destino (a impressão digital Wi-Fi fica registada e o alerta cessa).',
        'Se NÃO reconhece o percurso: tente acionar o SOS discreto — o relatório sai com a etiqueta "LOCAL NOVO" anexa.',
      ].join(' ')
    }
    return [
      `${s.places.length} local(is) registado(s) pela impressão digital das redes Wi-Fi. O mais frequente foi visto ${s.places[0]?.seenCount ?? 0}x.`,
      'A app reconhece os seus lugares habituais sem GPS — pelo padrão de routers à sua volta. Local novo + deslocamento abrupto = alerta automático de rapto.',
    ].join(' ')
  }

  // ── SOS / emergência ──
  if (has(q, 'sos', 'emergenc', 'ajuda agora', 'socorro', 'ataque')) {
    return [
      'O SOS dispara com 1 toque (ou tomada de queda/PIN duress) e faz: GPS de alta precisão + SMS para os contactos + registo de evidências + relatório de entrega com reenvio automático.',
      s.contactsCount === 0
        ? '⚠ MAS não tem contactos de emergência — adicione já pelo menos 1 para o SOS chegar a alguém.'
        : `Está coberto por ${s.contactsCount} contacto(s).`,
      s.verdict.level !== 'calm' ? `O ambiente está ${s.verdict.label.toLowerCase()} — confie na intuição: se algo parece errado, dispare.` : 'Ambiente calmo — nenhum disparo é necessário agora.',
    ].join(' ')
  }

  // ── Conselhos / melhorar protecção ──
  if (has(q, 'conselho', 'dica', 'melhorar', 'proteger', 'protecção', 'protecao', 'recomend', 'seguro', 'fazer')) {
    const advice = readinessAdvice(s)
    if (!advice.length) {
      return 'Está bem protegido: contactos, check-in e sentinela em ordem e nenhum sinal de alerta. Mantenha a app aberta em situações de risco e o modo discreto se precisar de camuflagem.'
    }
    return `Para subir o seu nível de protecção:\n${advice.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
  }

  // ── Score ──
  if (has(q, 'score', 'pontua', 'nivel de segurança', 'nivel de seguranca')) {
    const faixa = s.securityScore >= 75 ? 'BEM PROTEGIDO' : s.securityScore >= 50 ? 'ATENÇÃO' : 'VULNERÁVEL'
    return [
      `Score ${s.securityScore}/100 — ${faixa}.`,
      s.securityScore >= 75
        ? 'A combinação de prontidão pessoal e ambiente calmo está excelente. Continue com a sentinela armada.'
        : `Os maiores pesos no desconto: ${[s.riskNet > 30 ? 'risco do ambiente Wi-Fi' : null, s.trackers.length ? 'rastreadores BLE' : null, s.contactsCount === 0 ? 'sem contactos de emergência' : null, !s.checkinActive ? 'check-in inactivo' : null, !s.watching ? 'sentinela desligada' : null, s.placeAnomaly ? 'deslocamento abrupto' : null].filter(Boolean).join(', ') || 'pontos de prontidão'}.`,
      'Pergunte "como melhorar" para o plano de acção.',
    ].join(' ')
  }

  // ── Eventos / diário ──
  if (has(q, 'evento', 'diario', 'diário', 'historico', 'histórico', 'log')) {
    if (!s.events.length) return 'O diário está vazio. Cada scan da sentinela, ameaça, rastreador ou SOS fica registado aqui — arme a sentinela para começar.'
    return [
      `${s.events.length} evento(s) recentes:`,
      ...s.events.slice(0, 5).map((e) => `· ${hh(e.ts)} — ${e.title}`),
    ].join('\n')
  }

  // ── Fallback: resposta geral informada ──
  return [
    `Ambiente agora: ${envLine(s)}. Veredicto: ${s.verdict.label}.`,
    s.verdict.reasons.length ? `Motivos: ${s.verdict.reasons[0]}.` : '',
    'Posso detalhar: rastreadores BLE, redes Wi-Fi suspeitas, locais conhecidos, score, SOS ou o que melhorar — é só perguntar.',
  ].filter(Boolean).join(' ')
}

/** Briefing textual (usado pelo chat e pelo card do Dashboard). */
export function localBriefingText(s: CopilotSnapshot): string {
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 19 ? 'Boa tarde' : 'Boa noite'
  const parts: string[] = []
  parts.push(`${saudacao}. Veredicto do ambiente: ${s.verdict.label}.`)
  parts.push(`Neste momento: ${envLine(s)}. Score ${s.securityScore}/100.`)
  if (s.verdict.reasons.length) parts.push(`Atenção: ${s.verdict.reasons[0]}.`)
  const advice = readinessAdvice(s)
  if (advice.length) parts.push(`Prioridade: ${advice[0]}`)
  return parts.join(' ')
}

// ── Briefing estruturado (card do Dashboard) ──────────────────────────────

export interface DailyBriefing {
  headline: string
  level: 'calm' | 'elevated' | 'critical'
  insights: string[]
  actions: string[]
}

export function dailyBriefing(s: CopilotSnapshot): DailyBriefing {
  const insights: string[] = []
  const actions: string[] = readinessAdvice(s)

  if (s.verdict.level === 'calm') insights.push('Nenhum sinal de perigo correlacionado (rede + BLE + local).')
  else insights.push(...s.verdict.reasons.slice(0, 2))

  if (s.networksLive > 0 && s.registryWifi === 0) insights.push(`${s.networksLive} redes à vista ainda sem histórico — faça scan para mapear o ambiente.`)
  if (s.watching) insights.push(`Sentinela activa · ${s.cycles} ciclos · risco ${s.riskWatch}/100.`)
  else insights.push('Sentinela desligada — sem vigilância contínua.')

  if (!actions.length) actions.push('Tudo em ordem — mantenha a app ativa nas deslocações.')

  return {
    headline: s.verdict.label,
    level: s.verdict.level,
    insights: insights.slice(0, 3),
    actions: actions.slice(0, 3),
  }
}

/** ID curto para mensagens do chat. */
export const copilotMsgId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

// re-export utilitário para os componentes
export const macShort = shortMac
