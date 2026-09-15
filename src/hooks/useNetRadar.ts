/**
 * useNetRadar — estado reactivo do Radar Wi-Fi/Redes (v3.16.0).
 *
 * Encapsula scan pontual + registo de redes + rastro automático + análise
 * de segurança, com actualização ao vivo (eventos nativos wifiNetwork/
 * netTrailPoint). Cada página que precisar chama o hook (o plugin nativo
 * é partilhado).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  wifiScanNow, wifiGetNetworks, wifiGetRegistry, wifiClearRegistry, wifiRecordMany,
  netStartTrail, netStopTrail, netGetTrail, netClearTrail,
  onWifiNetwork, onNetTrailPoint, isWifiRadarAvailable,
  wifiHasPermissions, wifiRequestPermissions, readNetEnvironment,
  analyzeNetworkThreats, environmentRiskScore,
  type WifiRadarNetwork, type WifiRegistryEntry, type NetTrailPoint,
  type NetThreat, type NetEnvironmentInfo,
} from '@/lib/net-radar'
import { geoGetCurrent } from '@/lib/native'
import { logThreatsToSecurityLog, logSecurityEvent } from '@/lib/security-events'
import { recordRssiSamples, placeCheckIn, assessPlaceAnomaly } from '@/lib/net-intel'

export interface UseNetRadarState {
  /** plugin nativo disponível (só APK Android) */
  available: boolean
  permissions: { granted: boolean; wifiEnabled: boolean; locationOn: boolean } | null
  /** scan pontual em curso */
  scanning: boolean
  /** redes da última varredura (ordenadas por sinal) */
  networks: WifiRadarNetwork[]
  /** registo de todas as redes já vistas */
  registry: WifiRegistryEntry[]
  /** ameaças detectadas no último scan */
  threats: NetThreat[]
  /** índice de risco do ambiente 0-100 */
  riskScore: number
  /** info do ambiente (ligação actual, operadora, torres) */
  environment: NetEnvironmentInfo | null
  /** rastro automático activo */
  trailRunning: boolean
  /** pontos do rastro (mais antigos primeiro) */
  trail: NetTrailPoint[]
  /** intervalo do rastro em segundos */
  trailIntervalSec: number
  lastError: string | null
}

export function useNetRadar() {
  const [available] = useState(isWifiRadarAvailable())
  const [permissions, setPermissions] = useState<UseNetRadarState['permissions']>(null)
  const [scanning, setScanning] = useState(false)
  const [networks, setNetworks] = useState<WifiRadarNetwork[]>([])
  const [registry, setRegistry] = useState<WifiRegistryEntry[]>([])
  const [threats, setThreats] = useState<NetThreat[]>([])
  const [riskScore, setRiskScore] = useState(0)
  const [environment, setEnvironment] = useState<NetEnvironmentInfo | null>(null)
  const [trailRunning, setTrailRunning] = useState(false)
  const [trail, setTrail] = useState<NetTrailPoint[]>([])
  const [trailIntervalSec, setTrailIntervalSec] = useState(60)
  const [lastError, setLastError] = useState<string | null>(null)

  const netsRef = useRef<Map<string, WifiRadarNetwork>>(new Map())
  const liveUnsubRef = useRef<(() => void) | null>(null)

  /** refresca permissões + registo + estado do rastro */
  const refresh = useCallback(async () => {
    const [perms, reg, trailState, env] = await Promise.all([
      wifiHasPermissions(),
      wifiGetRegistry(),
      netGetTrail(),
      readNetEnvironment().catch(() => null),
    ])
    setPermissions(perms)
    setRegistry(reg)
    setTrail(trailState.points)
    setTrailRunning(trailState.running)
    if (trailState.intervalSec) setTrailIntervalSec(trailState.intervalSec)
    setEnvironment(env)
    // se a cache recente do sistema já tem redes, mostra-as (sem scan)
    if (netsRef.current.size === 0) {
      const cached = await wifiGetNetworks()
      if (cached.length > 0) {
        netsRef.current = new Map(cached.map((n) => [n.bssid, n]))
        setNetworks(sortNets(cached))
        setThreats(analyzeNetworkThreats(cached, reg))
        setRiskScore(environmentRiskScore(analyzeNetworkThreats(cached, reg), cached))
      }
    }
  }, [])

  useEffect(() => {
    refresh().catch(() => {})
    return () => {
      liveUnsubRef.current?.()
      liveUnsubRef.current = null
    }
  }, [refresh])

  /** radar pontual: captura o ambiente e analisa ameaças */
  const scan = useCallback(async () => {
    if (scanning) return
    if (available) {
      const perms = await wifiHasPermissions()
      setPermissions(perms)
      if (!perms.granted) {
        setLastError('Permissões em falta — peda-as primeiro')
        return
      }
      if (!perms.wifiEnabled) {
        setLastError('Wi-Fi desligado — ligue-o para escanear')
        return
      }
    }
    setLastError(null)
    setScanning(true)
    netsRef.current.clear()
    setNetworks([])

    // resultados ao vivo durante a janela (só nativo)
    liveUnsubRef.current?.()
    liveUnsubRef.current = onWifiNetwork((net) => {
      netsRef.current.set(net.bssid, net)
      const list = Array.from(netsRef.current.values())
      setNetworks(sortNets(list))
      setThreats(analyzeNetworkThreats(list, registry))
      setRiskScore(environmentRiskScore(analyzeNetworkThreats(list, registry), list))
    })

    try {
      const nets = available ? await wifiScanNow() : []
      if (nets.length > 0) netsRef.current = new Map(nets.map((n) => [n.bssid, n]))
      const list = Array.from(netsRef.current.values())
      const reg = await wifiGetRegistry()
      setRegistry(reg)
      setNetworks(sortNets(list))
      const threats = analyzeNetworkThreats(list, reg)
      setThreats(threats)
      setRiskScore(environmentRiskScore(threats, list))
      // v3.17.0 — auto-registo das redes capturadas (web) + diário de
      // segurança + posição GPS aproximada anexada ao registo
      if (list.length > 0) {
        const pos = await geoGetCurrent(8_000).catch(() => null)
        await wifiRecordMany(list, pos ? { lat: pos.latitude, lng: pos.longitude } : undefined)
        const reg2 = await wifiGetRegistry()
        setRegistry(reg2)
        logThreatsToSecurityLog(threats)
        // v3.18.0 — inteligência: histórico de sinal + check-in de local
        recordRssiSamples(list)
        const place = placeCheckIn(list, pos ? { lat: pos.latitude, lng: pos.longitude } : null)
        const anomaly = assessPlaceAnomaly(place)
        if (anomaly.anomaly) {
          logSecurityEvent('threat', 'high', anomaly.title, anomaly.detail, { hash: place.current?.hash }, 60 * 60_000)
        }
      }
    } catch (err) {
      setLastError(err instanceof Error ? err.message : 'Falha no scan Wi-Fi')
    } finally {
      liveUnsubRef.current?.()
      liveUnsubRef.current = null
      setScanning(false)
    }
  }, [available, scanning, registry])

  const startTrail = useCallback(async (intervalSec?: number) => {
    setLastError(null)
    const ok = await netStartTrail(intervalSec ?? trailIntervalSec)
    if (!ok) {
      setLastError('Não foi possível iniciar o rastro (permissões?)')
      return false
    }
    if (intervalSec) setTrailIntervalSec(intervalSec)
    setTrailRunning(true)
    return true
  }, [trailIntervalSec])

  const stopTrail = useCallback(async () => {
    await netStopTrail()
    setTrailRunning(false)
  }, [])

  const clearTrail = useCallback(async () => {
    await netClearTrail()
    setTrail([])
  }, [])

  const clearRegistry = useCallback(async () => {
    await wifiClearRegistry()
    setRegistry([])
  }, [])

  const requestPerms = useCallback(async () => {
    const ok = await wifiRequestPermissions()
    await refresh()
    return ok
  }, [refresh])

  return {
    available, permissions, scanning, networks, registry, threats, riskScore,
    environment, trailRunning, trail, trailIntervalSec, lastError,
    scan, startTrail, stopTrail, clearTrail, clearRegistry, requestPerms, refresh,
  }
}

/** Ordena por sinal (mais fortes primeiro). */
function sortNets(nets: WifiRadarNetwork[]): WifiRadarNetwork[] {
  return [...nets].sort((a, b) => (b.rssi ?? -127) - (a.rssi ?? -127))
}
