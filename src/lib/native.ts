/**
 * native.ts — Ponte Capacitor (app nativa) com fallback web total
 *
 * Em modo PWA (browser) todas as funções degradam graciosamente para as
 * APIs web — o comportamento existente NÃO muda. Em modo nativo (APK
 * Capacitor) usa os plugins oficiais para GPS mais fiável, vibração
 * háptica, status bar dourada e splash controlado.
 *
 * Usado por: useGeolocation (GPS), DashboardLayout (SOS + status bar),
 * App (arranque), EvidenceVault/audio (partilha nativa).
 */

import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Share } from '@capacitor/share'

/** Posição unificada (igual em web e nativo) */
export interface UnifiedPosition {
  latitude: number
  longitude: number
  accuracy: number
  altitude: number | null
  heading: number | null
  speed: number | null
  timestamp: number
}

/** TRUE quando a app corre dentro da APK nativa Capacitor */
export function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

/** Plataforma: 'android' | 'ios' | 'web' */
export function platform(): string {
  return Capacitor.getPlatform()
}

let chromeInitialised = false

/**
 * Aplica o "chrome" nativo dourado UMA vez no arranque:
 * status bar escura com fundo #0C0B08 e splash screen com fade-out.
 * Em web é no-op.
 */
export async function initNativeChrome(): Promise<void> {
  if (!isNative() || chromeInitialised) return
  chromeInitialised = true
  try {
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#0C0B08' })
  } catch {
    // StatusBar pode não existir em alguns contextos — não crítico
  }
  try {
    await SplashScreen.hide({ fadeOutDuration: 350 })
  } catch {
    // splash já fechou
  }
}

/**
 * GPS one-shot: usa o plugin nativo @capacitor/geolocation na APK
 * (permissões Android reais, GPS/GLONASS) e navigator.geolocation no browser.
 * Resolve null em caso de falha (o chamador decide o fallback).
 */
export async function geoGetCurrent(timeoutMs = 12_000): Promise<UnifiedPosition | null> {
  if (isNative()) {
    try {
      const perm = await Geolocation.checkPermissions()
      if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
        const req = await Geolocation.requestPermissions()
        if (req.location !== 'granted' && req.coarseLocation !== 'granted') return null
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 5_000,
      })
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude ?? null,
        heading: pos.coords.heading ?? null,
        speed: pos.coords.speed ?? null,
        timestamp: pos.timestamp,
      }
    } catch {
      return null
    }
  }

  // Web — navigator.geolocation
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 5_000 }
    )
  })
}

/**
 * Vibração háptica nativa (na web usa navigator.vibrate como fallback).
 * kind: 'light' | 'medium' | 'heavy' | 'sos'
 */
export async function haptic(kind: 'light' | 'medium' | 'heavy' | 'sos' = 'medium'): Promise<void> {
  if (isNative()) {
    try {
      const style =
        kind === 'heavy' ? ImpactStyle.Heavy : kind === 'light' ? ImpactStyle.Light : ImpactStyle.Medium
      if (kind === 'sos') {
        // Padrão SOS: 3 impactos fortes espaçados
        await Haptics.impact({ style: ImpactStyle.Heavy })
        await new Promise((r) => setTimeout(r, 180))
        await Haptics.impact({ style: ImpactStyle.Heavy })
        await new Promise((r) => setTimeout(r, 180))
        await Haptics.impact({ style: ImpactStyle.Heavy })
      } else {
        await Haptics.impact({ style })
      }
      return
    } catch {
      // cai para vibrate abaixo
    }
  }
  try {
    const patterns: Record<string, number | number[]> = {
      light: 30,
      medium: 80,
      heavy: 200,
      sos: [120, 80, 120, 80, 120],
    }
    navigator.vibrate?.(patterns[kind])
  } catch {
    // sem vibração disponível
  }
}

/**
 * Partilha nativa (ficha de partilha do Android/iOS). Na web devolve false
 * para o chamador usar o fallback actual (wa.me / clipboard).
 */
export async function nativeShare(title: string, text: string, url?: string): Promise<boolean> {
  if (!isNative()) return false
  try {
    const can = await Share.canShare()
    if (!can.value) return false
    await Share.share({ title, text, url, dialogTitle: 'Partilhar via' })
    return true
  } catch {
    return false
  }
}
