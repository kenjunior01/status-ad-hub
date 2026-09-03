/**
 * CamuflagemPWA — Guia de ajuda: como funciona a camuflagem na versão PWA.
 * Página informativa (sem lógica de negócio).
 */

import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  EyeOff, Smartphone, Fingerprint, Volume2, ShieldAlert, WifiOff,
  Download, KeyRound, AlertTriangle, CheckCircle2, ArrowRight,
} from 'lucide-react'

const STEPS = [
  {
    icon: Download,
    title: '1. Instalar como PWA',
    body: 'No telemóvel, abra a app no navegador e escolha “Adicionar ao ecrã principal”. Passa a abrir em ecrã inteiro, com ícone próprio e sem barra do navegador — indistinguível de uma app normal.',
  },
  {
    icon: EyeOff,
    title: '2. Escolher o disfarce',
    body: 'Em Camuflagem escolhe um dos disfarces (calculadora, meteorologia, notas, relógio, contactos, definições, música, câmbios, lanterna, SMS, galeria). Cada disfarce é uma app completa e funcional.',
  },
  {
    icon: Smartphone,
    title: '3. Activar',
    body: 'Ao activar, o disfarce ocupa todo o ecrã por cima da app. Quem pegar no telemóvel vê apenas a app falsa — nada de segurança fica visível.',
  },
  {
    icon: ShieldAlert,
    title: '4. SOS discreto',
    body: 'Dentro do disfarce há gestos secretos que disparam o SOS real: escrever 911 ou 112 na calculadora, ou 5 toques rápidos no elemento principal (temperatura, texto, relógio).',
  },
  {
    icon: KeyRound,
    title: '5. Sair da camuflagem',
    body: 'Long-press de 2 segundos no canto superior esquerdo abre a entrada de PIN. Só com o PIN correcto volta à app real. Com um PIN de coação (duress PIN) entra num painel falso.',
  },
]

const BEHAVIOUR = [
  { icon: WifiOff, title: 'Funciona offline', body: 'Como PWA, o disfarce e o botão de SOS continuam a abrir sem internet. Os alertas ficam em fila e são enviados assim que houver rede.' },
  { icon: Fingerprint, title: 'Sistema activo em background', body: 'Com o disfarce ligado, a detecção de queda, o check-in e o rastreamento continuam a correr — desde que a PWA esteja aberta em primeiro plano.' },
  { icon: Volume2, title: 'Volume SOS', body: 'A sequência de botões de volume pode disparar o SOS sem tocar no ecrã, útil quando o disfarce está a ser mostrado a outra pessoa.' },
]

const LIMITS = [
  'Numa PWA o ícone e o nome no ecrã principal são os da app — para um disfarce total do ícone é preciso a versão nativa (APK).',
  'Se o telemóvel fechar a PWA por falta de memória, os gestos de SOS só voltam a funcionar quando a app for reaberta.',
  'No iOS, a instalação é feita a partir do Safari (Partilhar → Adicionar ao Ecrã Principal); outros navegadores não instalam PWAs.',
  'A camuflagem esconde o ecrã, não o histórico do navegador — use sempre a versão instalada, não um separador normal.',
]

export default function CamuflagemPWA() {
  return (
    <div className="min-h-screen space-y-6 pb-10">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <EyeOff className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Camuflagem na versão PWA</h1>
          <p className="text-white/40 text-sm mt-0.5">Como funciona, passo a passo, quando a app está instalada no telemóvel</p>
        </div>
      </motion.div>

      {/* Passos */}
      <div className="space-y-3">
        {STEPS.map((s, i) => (
          <motion.section
            key={s.title}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
            className="flex gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
          >
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 h-fit shrink-0">
              <s.icon className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{s.title}</h2>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">{s.body}</p>
            </div>
          </motion.section>
        ))}
      </div>

      {/* Comportamento */}
      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
      >
        <h2 className="text-sm font-semibold text-white mb-3">O que continua a funcionar</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {BEHAVIOUR.map(b => (
            <div key={b.title} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
              <b.icon className="w-4 h-4 text-emerald-400 mb-2" />
              <div className="text-xs font-semibold text-white">{b.title}</div>
              <p className="text-[11px] text-white/45 mt-1 leading-relaxed">{b.body}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Limitações */}
      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-amber-200">Limites da PWA</h2>
        </div>
        <ul className="space-y-2">
          {LIMITS.map(l => (
            <li key={l} className="flex gap-2 text-[11px] text-amber-100/60 leading-relaxed">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400/70 shrink-0 mt-0.5" />
              <span>{l}</span>
            </li>
          ))}
        </ul>
      </motion.section>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Link to="/dashboard/camuflar" className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-purple-500 px-5 py-3 text-sm font-bold text-white">
          Escolher camuflagem <ArrowRight className="w-4 h-4" />
        </Link>
        <Link to="/dashboard/discreto" className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white/70">
          Configurar PIN e modo discreto
        </Link>
      </motion.div>
    </div>
  )
}
