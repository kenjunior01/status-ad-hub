/**
 * audio-utils — Sintetização de áudio via WebAudio API.
 *
 * 100% local e offline: nenhum ficheiro de áudio é descarregado,
 * nenhuma API externa é chamada. Todos os sons são gerados por
 * OscillatorNodes (tons DTMF clássicos de ringtone internacional).
 */

let ctx: AudioContext | null = null

/** Obtém (ou cria) o AudioContext partilhado. */
function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** Desbloqueia o áudio após um gesto do utilizador (iOS exige isto). */
export function unlockAudio(): void {
  const c = getCtx()
  if (!c) return
  try {
    const buf = c.createBuffer(1, 1, 22050)
    const src = c.createBufferSource()
    src.buffer = buf
    src.connect(c.destination)
    src.start(0)
  } catch {
    /* noop */
  }
}

/** Toca um beep curto (sirene de aviso / countdown de queda). */
export function playBeep(frequency = 880, durationMs = 180, volume = 0.35): void {
  const c = getCtx()
  if (!c) return
  try {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0, c.currentTime)
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + 0.02)
    gain.gain.setValueAtTime(volume, c.currentTime + durationMs / 1000 - 0.04)
    gain.gain.linearRampToValueAtTime(0.0001, c.currentTime + durationMs / 1000)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start()
    osc.stop(c.currentTime + durationMs / 1000 + 0.02)
  } catch {
    /* noop */
  }
}

export interface RingtoneHandle {
  stop: () => void
}

/**
 * Ringtone de chamada sintetizado — par clássico 440 Hz + 480 Hz
 * (padrão de toque internacional) com cadência 2s ON / 4s OFF.
 * Loop contínuo até .stop().
 */
export function startRingtone(volume = 0.5): RingtoneHandle {
  const c = getCtx()
  let stopped = false
  const timers: number[] = []

  const ringOnce = () => {
    if (stopped || !c) return
    const master = c.createGain()
    master.gain.value = volume
    master.connect(c.destination)

    const freqs = [440, 480]
    const oscs = freqs.map((f) => {
      const o = c.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      const g = c.createGain()
      g.gain.setValueAtTime(0, c.currentTime)
      g.gain.linearRampToValueAtTime(0.5, c.currentTime + 0.08)
      g.gain.setValueAtTime(0.5, c.currentTime + 1.9)
      g.gain.linearRampToValueAtTime(0.0001, c.currentTime + 2.0)
      o.connect(g)
      g.connect(master)
      o.start()
      o.stop(c.currentTime + 2.05)
      return o
    })
    // limpar nós deste ciclo
    timers.push(window.setTimeout(() => {
      try { master.disconnect() } catch { /* noop */ }
      void oscs
    }, 2100))
  }

  const loop = () => {
    if (stopped) return
    ringOnce()
    timers.push(window.setTimeout(loop, 6000)) // 2s tom + 4s silêncio
  }
  loop()

  return {
    stop: () => {
      stopped = true
      timers.forEach((t) => window.clearTimeout(t))
    },
  }
}

/** Padrão de vibração de chamada recebida (se suportado). */
export function vibrateCall(): void {
  try {
    navigator.vibrate?.([500, 300, 500, 300, 800])
  } catch {
    /* noop */
  }
}

/** Vibração de alarme de queda (SOS). */
export function vibrateSos(): void {
  try {
    navigator.vibrate?.([120, 80, 120, 80, 120, 200, 120, 80, 120])
  } catch {
    /* noop */
  }
}
