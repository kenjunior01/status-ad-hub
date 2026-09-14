/**
 * useBleRadar — estado reactivo do Radar Bluetooth (v3.17.0).
 *
 * Encapsula scan pontual + rastro automático com actualização ao vivo
 * (eventos nativos bleDevice/trailPoint). Não é context provider: cada
 * página que precisar chama o hook (o plugin nativo é partilhado).
 *
 * NOVO (v3.17.0): cada scan alimenta o REGISTO persistente de dispositivos
 * (radar-registry.ts) e o motor de detecção de RASTREADORES/PERSEGUIDORES
 * funciona nas duas versões (web + APK).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  bleScanNow, bleStartTrail, bleStopTrail, bleGetTrail, bleClearTrail,
  bleHasPermissions, bleRequestPermissions, onBleDevice,
  isBleRadarAvailable, manufacturerName,
  type BleRadarDevice, type BleTrailPoint,
} from '@/lib/ble-radar'
import {
  bleGetRegistry, bleClearRegistry, bleRecordMany, detectTrackers,
  type BleRegistryEntry, type TrackerAlert,
} from '@/lib/radar-registry'
import { geoGetCurrent } from '@/lib/native'
import { logSecurityEvent } from '@/lib/security-events'

export interface BleRadarState {
  /** plugin nativo disponível (só APK Android) */
  available: boolean
  permissions: { granted: boolean; btEnabled: boolean } | null
  /** scan pontual em curso */
  scanning: boolean
  /** dispositivos da última varredura (ordenados por sinal) */
  devices: BleRadarDevice[]
  /** registo persistente de todos os dispositivos já vistos (v3.17.0) */
  registry: BleRegistryEntry[]
  /** alertas de rastreador/perseguidor (v3.17.0) */
  trackers: TrackerAlert[]
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
  const [registry, setRegistry] = useState<BleRegistryEntry[]>([])
  const [trackers, setTrackers] = useState<TrackerAlert[]>([])
  const [trailRunning, setTrailRunning] = useState(false)
  const [trail, setTrail] = useState<BleTrailPoint[]>([])
  const [trailIntervalSec, setTrailIntervalSec] = useState(60)
  const [lastError, setLastError] = useState<string | null>(null)

  const devicesRef = useRef<Map<string, BleRadarDevice>>(new Map())
  const liveUnsubRef = useRef<(() => void) | null>(null)

  /** recarrega registo + alertas de rastreador */
  const refreshRegistry = useCallback(() => {
    const reg = bleGetRegistry()
    setRegistry(reg)
    setTrackers(detectTrackers(reg))
  }, [])

  /** refresca permissões + estado do rastro (ao montar e após acções) */
  const refresh = useCallback(async () => {
    refreshRegistry()
    if (!available) return
    setPermissions(await bleHasPermissions())
    const { points, running, intervalSec } = await bleGetTrail()
    setTrail(points)
    setTrailRunning(running)
    if (intervalSec) setTrailIntervalSec(intervalSec)
  }, [available, refreshRegistry])

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
      // v3.17.0 — registo persistente + alertas de rastreador + diário
      if (res.length > 0) {
        const pos = await geoGetCurrent(8_000).catch(() => null)
        bleRecordMany(res, pos ? { lat: pos.latitude, lng: pos.longitude } : undefined)
        refreshRegistry()
        const fresh = detectTrackers(bleGetRegistry())
        for (const a of fresh) {
          logSecurityEvent(
            'tracker',
            a.severity === 'high' ? 'high' : 'medium',
            a.kind === 'known-tracker'
              ? `Rastreador detectado: ${a.name || a.mac}`
              : `Possível perseguidor: ${a.name || a.mac}`,
            a.reason,
            { mac: a.mac, kind: a.kind },
          )
        }
      }
    } catch (err) {
      setLastError(err instanceof Error ? err.message : 'Falha no scan')
    } finally {
      liveUnsubRef.current?.()
      liveUnsubRef.current = null
      setScanning(false)
    }
  }, [available, scanning, refreshRegistry])

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

  const clearRegistry = useCallback(() => {
    bleClearRegistry()
    refreshRegistry()
  }, [refreshRegistry])

  const requestPerms = useCallback(async () => {
    const ok = await bleRequestPermissions()
    await refresh()
    return ok
  }, [refresh])

  return {
    ...{ available, permissions, scanning, devices, registry, trackers, trailRunning, trail, trailIntervalSec, lastError },
    scan, startTrail, stopTrail, clearTrail, clearRegistry, requestPerms, refresh, refreshRegistry,
  }
}

/** Ordena por sinal (mais fortes primeiro) e enriquece com nome de fabricante. */
function sortDevices(devs: BleRadarDevice[]): BleRadarDevice[] {
  return devs
    .map((d) => ({ ...d, mf: d.mf || manufacturerName(d.m) }))
    .sort((a, b) => (b.r ?? -127) - (a.r ?? -127))
}
