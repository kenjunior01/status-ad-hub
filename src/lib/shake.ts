/**
 * shake.ts — Detector de agitação forte (gatilho de pânico do Guardião).
 *
 * Padrão: 3 picos de aceleração (>26 m/s², sem gravidade) dentro de 2.5s.
 *  · Vibração de chapa/mota: picos 2–8 m/s² contínuos → NÃO dispara
 *  · Queda do telemóvel: 1 pico único → NÃO dispara
 *  · Agarrar/briga/agitar de propósito: padrão de rajadas → dispara
 * Após disparo: cooldown de 2 minutos (evita re-trigger em loop).
 */

const SPIKE_THRESHOLD = 26 // m/s²
const SPIKE_WINDOW = 2_500 // ms
const REQUIRED_SPIKES = 3
const COOLDOWN_MS = 120_000

export function startShakeListener(onTrigger: () => void): () => void {
  let spikes: number[] = []
  let cooldownUntil = 0

  const handler = (e: DeviceMotionEvent) => {
    const a = e.acceleration
    if (!a || (a.x == null && a.y == null && a.z == null)) return
    const mag = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2)
    const now = performance.now()
    if (now < cooldownUntil) return

    if (mag > SPIKE_THRESHOLD) {
      spikes = spikes.filter((t) => now - t < SPIKE_WINDOW)
      spikes.push(now)
      if (spikes.length >= REQUIRED_SPIKES) {
        spikes = []
        cooldownUntil = now + COOLDOWN_MS
        onTrigger()
      }
    }
  }

  window.addEventListener('devicemotion', handler, { passive: true })
  return () => window.removeEventListener('devicemotion', handler)
}

/** iOS 13+ exige permissão explícita; Android é no-op. */
export async function requestMotionPermission(): Promise<boolean> {
  try {
    const DME = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }
    if (typeof DME.requestPermission === 'function') {
      const res = await DME.requestPermission()
      return res === 'granted'
    }
    return true
  } catch {
    return false
  }
}
