/**
 * net-shared — Utilitários partilhados entre o Radar de Redes (web) e o
 * TacticalNetRadar (APK). Pensa-te como o "core" neutro dos dois designs.
 */

import { bleScanNow, type BleRadarDevice } from '@/lib/ble-radar'
import { isBleRadarAvailable } from '@/lib/ble-radar'

export type BleQuickDevice = BleRadarDevice

export { securityLevel, wifiDistanceLabel, wifiRssiBars, wifiRssiToMeters } from '@/lib/net-radar'
export { securityLabel } from '@/lib/net-radar'
export { isWifiRadarAvailable } from '@/lib/net-radar'

/** true quando o radar BLE nativo está disponível. */
export function isBleAvailable(): boolean {
  return isBleRadarAvailable()
}

/**
 * Scan BLE rápido e seguro (devolve [] em vez de lançar). Usado pelo
 * card "Testemunhas Bluetooth" do Radar de Redes — na web devolve []
 * (a UI explica a limitação).
 */
export async function bleScanNowSafe(durationMs = 4000): Promise<BleQuickDevice[]> {
  try {
    return await bleScanNow(durationMs)
  } catch {
    return []
  }
}
