/**
 * useBleRadar — estado reactivo do Radar Bluetooth (v3.15.0).
 *
 * Encapsula scan pontual + rastro automático com actualização ao vivo
 * (eventos nativos bleDevice/trailPoint). Não é context provider: cada
 * página que precisar chama o hook (o plugin nativo é partilhado).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  bleScanNow, bleStartTrail, bleStopTrail, bleGetTrail, bleClearTrail,
  bleHasPermissions, bleRequestPermissions, onBleDevice,
  isBleRadarAvailable, manufacturerName,
  type BleRadarDevice, type BleTrailPoint,
} from '@/lib/ble-radar'

export interface BleRadarState {
  /** plugin nativo disponível (só APK Android) */
  available: boolean
  permissions: { granted: boolean; btEnabled: boolean } | null
  /** scan pontual em curso */
  scanning: boolean
  /** dispositivos da última varredura (ordenados por sinal) */
  devices: BleRadarDevice[]
  /** rastro automático activo */
  trailRunning: boolean
  /** pontos do rastro (mais antigos primeiro) */
  trail: BleTrailPoint[]
  /** intervalo do rastro em segundos */
  trailIntervalSec: number
  lastError: string | null
}

export function useBleRadar() {
  const [available] = useState(isBleRadarAvailable())
  const [permissions, setPermissions] = useState<BleRadarState['permissions']>(null)
  const [scanning, setScanning] = useState(false)
  const [devices, setDevices] = useState<BleRadarDevice[]>([])
  const [trailRunning, setTrailRunning] = useState(false)
  const [trail, setTrail] = useState<BleTrailPoint[]>([])
  const [trailIntervalSec, setTrailIntervalSec] = useState(60)
  const [lastError, setLastError] = useState<string | null>(null)

  const devicesRef = useRef<Map<string, BleRadarDevice>>(new Map())
  const liveUnsubRef = useRef<(() => void) | null>(null)

  /** refresca permissões + estado do rastro (ao montar e após acções) */
  const refresh = useCallback(async () => {
    if (!available) return
    setPermissions(await bleHasPermissions())
    const { points, running, intervalSec } = await bleGetTrail()
    setTrail(points)
    setTrailRunning(running)
    if (intervalSec) setTrailIntervalSec(intervalSec)
  }, [available])

  useEffect(() => {
    refresh().catch(() => {})
    return () => {
      liveUnsubRef.current?.()
      liveUnsubRef.current = null
    }
  }, [refresh])

  /** radar pontual: 4s a capturar, resultado ao vivo + lista final */
  const scan = useCallback(async (durationMs = 4000) => {
    if (!available || scanning) return
    setLastError(null)
    setScanning(true)
    devicesRef.current.clear()
    setDevices([])

    // resultados ao vivo durante a janela
    liveUnsubRef.current?.()
    liveUnsubRef.current = onBleDevice((dev) => {
      devicesRef.current.set(dev.mac, dev)
      setDevices(sortDevices(Array.from(devicesRef.current.values())))
    })

    try {
      const res = await bleScanNow(durationMs)
      setDevices(sortDevices(res))
    } catch (err) {
      setLastError(err instanceof Error ? err.message : 'Falha no scan')
    } finally {
      liveUnsubRef.current?.()
      liveUnsubRef.current = null
      setScanning(false)
    }
  }, [available, scanning])

  const startTrail = useCallback(async (intervalSec?: number) => {
    setLastError(null)
    const ok = await bleStartTrail(intervalSec ?? trailIntervalSec)
    if (!ok) {
      setLastError('Não foi possível iniciar o rastro (permissões?)')
      return false
    }
    if (intervalSec) setTrailIntervalSec(intervalSec)
    setTrailRunning(true)
    return true
  }, [trailIntervalSec])

  const stopTrail = useCallback(async () => {
    await bleStopTrail()
    setTrailRunning(false)
  }, [])

  const clearTrail = useCallback(async () => {
    await bleClearTrail()
    setTrail([])
  }, [])

  const requestPerms = useCallback(async () => {
    const ok = await bleRequestPermissions()
    await refresh()
    return ok
  }, [refresh])

  return {
    ...{ available, permissions, scanning, devices, trailRunning, trail, trailIntervalSec, lastError },
    scan, startTrail, stopTrail, clearTrail, requestPerms, refresh,
  }
}

/** Ordena por sinal (mais fortes primeiro) e enriquece com nome de fabricante. */
function sortDevices(devs: BleRadarDevice[]): BleRadarDevice[] {
  return devs
    .map((d) => ({ ...d, mf: d.mf || manufacturerName(d.m) }))
    .sort((a, b) => (b.r ?? -127) - (a.r ?? -127))
}
