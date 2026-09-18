/**
 * useRadioPosition — hook do Motor de Posição por Rádio (v3.32.0).
 *
 * Singleton (useSyncExternalStore sobre src/lib/radio-position.ts) —
 * a sentinela (useRadarWatch) alimenta o motor a cada ciclo; este hook
 * só expõe o estado e acções manuais (actualizar agora, repor).
 */

import { useCallback, useSyncExternalStore } from 'react'
import {
  subscribeRadioPosition, getRadioPositionState, resetRadioPosition,
  updateRadioPosition, setRttSupported, applyRttDistances,
  type RadioPositionState,
} from '@/lib/radio-position'
import { getWifiRadarPlugin, isWifiRadarAvailable, wifiScanNow } from '@/lib/net-radar'
import { geoGetCurrent } from '@/lib/native'

/** Ciclo manual: scan Wi-Fi + GPS → motor (usa o resultado na hora). */
async function manualCycle(): Promise<void> {
  let nets: Awaited<ReturnType<typeof wifiScanNow>> = []
  if (isWifiRadarAvailable()) {
    try { nets = await wifiScanNow() } catch { /* segue com GPS só */ }
  }
  let obs = nets.map((n) => ({ id: n.bssid, rssi: n.rssi, kind: 'wifi' as const, band: n.band }))
  if (obs.length > 0) {
    const rtt = await getWifiRadarPlugin()?.wifiRttRange().catch(() => null)
    if (rtt) {
      setRttSupported(!!rtt.supported)
      if (rtt.supported && rtt.ranged?.length > 0) obs = applyRttDistances(obs, rtt.ranged)
    }
  }
  const pos = await geoGetCurrent(10_000).catch(() => null)
  updateRadioPosition(obs, [], pos ? { lat: pos.latitude, lng: pos.longitude, acc: pos.accuracy } : null)
}

export function useRadioPosition() {
  const state: RadioPositionState = useSyncExternalStore(
    subscribeRadioPosition,
    () => getRadioPositionState(),
    () => getRadioPositionState(),
  )

  const refresh = useCallback(() => { void manualCycle() }, [])
  const reset = useCallback(() => { resetRadioPosition() }, [])

  return { ...state, refresh, reset }
}
