/**
 * native-auth.ts — LOGIN GOOGLE/OAUTH NATIVO NA APK (v3.35.0).
 *
 * Na WEB o fluxo OAuth continua igual (redirect do browser para /dashboard).
 * Na APK (Capacitor) o redirect do browser morria fora da app — aqui o
 * fluxo passa a ser:
 *
 *   1. signInWithOAuth(skipBrowserRedirect) → URL de autorização (PKCE)
 *   2. abrimos esse URL no browser do sistema (@capacitor/browser)
 *   3. o Supabase devolve o utilizador por DEEP LINK para a app:
 *        com.statusads.connect://login-callback?code=…
 *      (o scheme já existe no AndroidManifest — partilhado com o SOS)
 *   4. appUrlOpen → exchangeCodeForSession(code) → MESMA CONTA da web
 *
 * A sessão fica no localStorage da WebView — os mesmos dados, contactos,
 * eventos e radars da versão web, porque é a MESMA conta no MESMO Supabase.
 *
 * ── CONFIGURAÇÃO (uma vez, pelo administrador) ──────────────────────
 *  · Google Cloud Console → credencial OAuth tipo "Aplicação Web"
 *    (redirect autorizado: https://<projecto>.supabase.co/auth/v1/callback)
 *  · Supabase → Authentication → Providers → Google: colar Client ID/Secret
 *  · Supabase → Authentication → URL Configuration → Redirect URLs:
 *    adicionar  com.statusads.connect://login-callback
 *  · APK: npm run cap:sync (inclui o plugin @capacitor/browser no nativo)
 */

import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

/** scheme do deep link (igual a custom_url_scheme no strings.xml) */
export const AUTH_SCHEME = 'com.statusads.connect'
/** redirect de volta para a APK no fluxo OAuth */
export const AUTH_REDIRECT = 'com.statusads.connect://login-callback'

export type OAuthProvider = 'google' | 'apple'

/** estamos dentro da app nativa (APK/iOS)? */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

let authListener: { remove: () => Promise<void> } | null = null
let authBrowserOpen = false

/**
 * Regista o deep link de login (idempotente — chamar uma vez no arranque,
 * junto ao resumeWatchIfEnabled). Vários listeners de appUrlOpen podem
 * coexistir: o GuardianWatcher trata com.statusads.connect://sos e este
 * trata …://login-callback.
 */
export function initAuthDeepLinks(): void {
  if (authListener) return
  CapApp.addListener('appUrlOpen', (data) => {
    const url = data?.url || ''
    if (!url.startsWith(`${AUTH_SCHEME}://login-callback`)) return
    if (authBrowserOpen) {
      authBrowserOpen = false
      Browser.close().catch(() => { /* segue */ })
    }
    consumeAuthRedirect(url)
  })
    .then((h) => { authListener = h })
    .catch(() => { /* web — sem listener nativo */ })
  // app aberta a FRIO pelo redirect (browser → app morta → app abre já com o code)
  CapApp.getLaunchUrl()
    .then((info) => {
      const url = info?.url || ''
      if (url.startsWith(`${AUTH_SCHEME}://login-callback`)) consumeAuthRedirect(url)
    })
    .catch(() => { /* segue */ })
}

/** Consome o URL de retorno: PKCE (code) ou implícito (fragment tokens). */
async function consumeAuthRedirect(url: string): Promise<void> {
  try {
    const u = new URL(url)
    const errDesc = u.searchParams.get('error_description') || u.searchParams.get('error')
      || new URLSearchParams(u.hash.replace(/^#/, '')).get('error_description')
    if (errDesc) {
      toast.error('Login não concluído', { description: errDesc })
      return
    }
    const code = u.searchParams.get('code')
    const hash = new URLSearchParams(u.hash.replace(/^#/, ''))
    const at = hash.get('access_token')
    const rt = hash.get('refresh_token')

    if (code) {
      // fluxo PKCE (padrão supabase-js v2): o verifier ficou no storage
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) throw error
    } else if (at && rt) {
      // fluxo implícito (fallback): tokens vêm no fragmento
      const { error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt })
      if (error) throw error
    } else {
      return // URL sem nada utilizável (ex.: cancelamento sem error param)
    }

    const { data: { user } } = await supabase.auth.getUser()
    toast.success('Sessão iniciada!', {
      description: user?.email
        ? `${user.email} — a mesma conta da versão web, com os mesmos dados.`
        : 'A mesma conta da versão web, com os mesmos dados.',
      duration: 5000,
    })
    if (!/\/dashboard/.test(window.location.pathname)) {
      // v3.40.0 — na APK a sessão abre o Console Guardião (app-first)
      window.location.assign(isNativeApp() ? '/dashboard/inicio' : '/dashboard')
    }
  } catch (e) {
    toast.error('Não foi possível terminar o login', {
      description: e instanceof Error ? e.message : 'Verifique a configuração do provider no Supabase.',
      duration: 7000,
    })
  }
}

/**
 * Login social adaptativo: na WEB usa o redirect clássico; na APK abre o
 * browser do sistema e volta por deep link. Devolve um erro amigável
 * quando o provider ainda não está configurado no Supabase.
 */
export async function signInWithOAuthAdaptive(
  provider: OAuthProvider,
): Promise<{ ok: boolean; message?: string }> {
  const label = provider === 'google' ? 'Google' : 'Apple'
  try {
    if (!isNativeApp()) {
      // WEB — igual ao comportamento anterior
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin + '/dashboard' },
      })
      if (error) return { ok: false, message: oauthErrorHint(error.message, label) }
      return { ok: true } // o Supabase redireciona para /dashboard
    }

    // APK — PKCE + browser do sistema + deep link de volta
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { skipBrowserRedirect: true, redirectTo: AUTH_REDIRECT },
    })
    if (error) return { ok: false, message: oauthErrorHint(error.message, label) }
    if (!data?.url) {
      return { ok: false, message: 'O Supabase não devolveu o URL de autenticação — active o provider no painel.' }
    }
    authBrowserOpen = true
    await Browser.open({ url: data.url })
    return { ok: true } // a conclusão chega por appUrlOpen → consumeAuthRedirect
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error
        ? oauthErrorHint(e.message, label)
        : `Login com ${label} indisponível — verifique a ligação.`,
    }
  }
}

function oauthErrorHint(raw: string, label: string): string {
  const m = (raw || '').toLowerCase()
  if (m.includes('provider') || m.includes('not enabled') || m.includes('unsupported')) {
    return `O administrador precisa activar ${label} no Supabase (Authentication → Providers).`
  }
  if (m.includes('redirect')) {
    return `Adicione ${AUTH_REDIRECT} às Redirect URLs do Supabase (Authentication → URL Configuration).`
  }
  return raw || `Login com ${label} indisponível.`
}

/** Provider real da conta actual ('google' | 'apple' | 'email' …). */
export async function getAccountInfo(): Promise<{ email: string; provider: string } | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const meta = (user.app_metadata || {}) as { provider?: string; providers?: string[] }
  const provider = meta.provider || meta.providers?.[0] || 'email'
  return { email: user.email || user.id, provider }
}
