import { useState, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface SessionInfo {
  id: string
  device: string
  browser: string
  os: string
  lastActivity: string
  isCurrent: boolean
  ip?: string
}

function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  let device = 'Desconhecido'
  let browser = 'Desconhecido'
  let os = 'Desconhecido'

  if (/iPhone/i.test(ua)) device = 'iPhone'
  else if (/iPad/i.test(ua)) device = 'iPad'
  else if (/Android/i.test(ua)) device = 'Android'
  else if (/Macintosh/i.test(ua)) device = 'Desktop'
  else if (/Windows/i.test(ua)) device = 'Windows PC'
  else if (/Linux/i.test(ua)) device = 'Linux'

  if (/Chrome/i.test(ua) && !/Edge|OPR/i.test(ua)) browser = 'Chrome'
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari'
  else if (/Firefox/i.test(ua)) browser = 'Firefox'
  else if (/Edge/i.test(ua)) browser = 'Edge'
  else if (/OPR/i.test(ua)) browser = 'Opera'

  if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Mac OS/i.test(ua)) os = 'macOS'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS'
  else if (/Linux/i.test(ua)) os = 'Linux'

  return { device, browser, os }
}

export function useSessions() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', user?.id],
    queryFn: async () => {
      if (!user) return []
      const ua = navigator.userAgent
      const { device, browser, os } = parseUserAgent(ua)
      const { data: sessionData } = await supabase.auth.getSession()
      const currentSessionId = sessionData.session?.access_token?.slice(-12) || 'current'

      // Get session activity from profiles (stored in metadata)
      const { data: profile } = await supabase
        .from('profiles')
        .select('metadata')
        .eq('user_id', user.id)
        .single()

      const storedSessions = ((profile as any)?.metadata as any)?.sessions || []

      // Build current session info
      const currentSession: SessionInfo = {
        id: currentSessionId,
        device,
        browser,
        os,
        lastActivity: new Date().toISOString(),
        isCurrent: true,
      }

      // Merge stored sessions (from other devices)
      const allSessions = [currentSession, ...storedSessions
        .filter((s: any) => s.id !== currentSessionId)
        .map((s: any) => ({ ...s, isCurrent: false }))
      ]

      return allSessions.slice(0, 10) // Max 10 sessions
    },
    enabled: !!user,
    staleTime: 60_000,
  })

  // Update session activity (heartbeat)
  const heartbeat = useCallback(async () => {
    if (!user) return
    const ua = navigator.userAgent
    const { device, browser, os } = parseUserAgent(ua)
    const { data: sessionData } = await supabase.auth.getSession()
    const sessionId = sessionData.session?.access_token?.slice(-12) || 'unknown'

    const { data: profile } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('user_id', user.id)
      .single()

    const metadata = ((profile as any)?.metadata as any) || {}
    const sessions = (metadata.sessions || []) as any[]

    // Update or add current session
    const idx = sessions.findIndex((s: any) => s.id === sessionId)
    const sessionInfo = { id: sessionId, device, browser, os, lastActivity: new Date().toISOString() }

    if (idx >= 0) {
      sessions[idx] = sessionInfo
    } else {
      sessions.unshift(sessionInfo)
    }

    // Remove sessions older than 7 days
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const activeSessions = sessions.filter((s: any) => new Date(s.lastActivity).getTime() > weekAgo)

    await supabase
      .from('profiles')
      .update({ metadata: { ...metadata, sessions: activeSessions.slice(0, 10) } })
      .eq('user_id', user.id)
  }, [user])

  // Run heartbeat on mount and every 5 minutes
  useEffect(() => {
    heartbeat()
    const interval = setInterval(heartbeat, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [heartbeat])

  // Revoke other sessions
  const revokeOtherSessions = useCallback(async () => {
    if (!user) return
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('metadata')
        .eq('user_id', user.id)
        .single()

      const metadata = ((profile as any)?.metadata as any) || {}
      const ua = navigator.userAgent
      const { device, browser, os } = parseUserAgent(ua)
      const { data: sessionData } = await supabase.auth.getSession()
      const sessionId = sessionData.session?.access_token?.slice(-12) || 'current'

      // Keep only current session
      const currentSession = { id: sessionId, device, browser, os, lastActivity: new Date().toISOString() }

      await supabase
        .from('profiles')
        .update({ metadata: { ...metadata, sessions: [currentSession] } })
        .eq('user_id', user.id)

      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Outras sessoes terminadas')
    } catch {
      toast.error('Erro ao terminar sessoes')
    }
  }, [user, queryClient])

  return { sessions, isLoading, revokeOtherSessions }
}
