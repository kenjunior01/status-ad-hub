// ============================================================
// useMedicalProfile — Ficha médica de emergência do usuário.
// Guarda em profiles (blood_type, allergies, medications,
// medical_notes). Se as colunas ainda não existirem (migration
// 010 por correr), faz fallback transparente para localStorage
// — a app funciona sem qualquer configuração.
// ============================================================
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export interface MedicalProfile {
  blood_type: string | null
  allergies: string | null
  medications: string | null
  medical_notes: string | null
}

export const EMPTY_MEDICAL: MedicalProfile = {
  blood_type: null,
  allergies: null,
  medications: null,
  medical_notes: null,
}

const LS_KEY = 'statusads-medical-profile'

function lsRead(): MedicalProfile {
  try {
    return { ...EMPTY_MEDICAL, ...JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') }
  } catch {
    return { ...EMPTY_MEDICAL }
  }
}
function lsWrite(p: MedicalProfile) {
  localStorage.setItem(LS_KEY, JSON.stringify(p))
}

export function isMedicalEmpty(p: MedicalProfile | null | undefined): boolean {
  if (!p) return true
  return !p.blood_type && !p.allergies && !p.medications && !p.medical_notes
}

export function useMedicalProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<MedicalProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [usingLocal, setUsingLocal] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) {
        // utilizador não autenticado — só local
        if (!cancelled) { setProfile(lsRead()); setUsingLocal(true); setLoading(false) }
        return
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('blood_type, allergies, medications, medical_notes')
          .eq('user_id', user.id)
          .single()
        if (cancelled) return
        const code = (error as any)?.code ?? ''
        const msg = (error as any)?.message ?? ''
        if (error && (code === 'PGRST204' || code === '42703' || /column|schema cache/i.test(msg))) {
          // colunas ainda não migradas → local
          setUsingLocal(true)
          setProfile(lsRead())
        } else if (error) {
          setUsingLocal(true)
          setProfile(lsRead())
        } else {
          const remote = data as MedicalProfile
          const local = lsRead()
          // funde: campo remoto vazio mas local preenchido → usa local (migration atrasada)
          setProfile({
            blood_type: remote.blood_type ?? local.blood_type,
            allergies: remote.allergies ?? local.allergies,
            medications: remote.medications ?? local.medications,
            medical_notes: remote.medical_notes ?? local.medical_notes,
          })
          setUsingLocal(false)
        }
      } catch {
        if (!cancelled) { setUsingLocal(true); setProfile(lsRead()) }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  const save = useCallback(async (input: MedicalProfile) => {
    setSaving(true)
    try {
      // persiste sempre localmente (backup offline + fallback)
      lsWrite(input)
      setProfile(input)
      if (!user) return { ok: true, remote: false }
      const { error } = await supabase
        .from('profiles')
        .update({
          blood_type: input.blood_type || null,
          allergies: input.allergies || null,
          medications: input.medications || null,
          medical_notes: input.medical_notes || null,
        })
        .eq('user_id', user.id)
      if (error) {
        const code = (error as any)?.code ?? ''
        const msg = (error as any)?.message ?? ''
        const columnMissing = code === 'PGRST204' || code === '42703' || /column|schema cache/i.test(msg)
        if (!columnMissing) {
          // erro real — mantém local, mas informa
          return { ok: true, remote: false, warning: error.message }
        }
        return { ok: true, remote: false }
      }
      setUsingLocal(false)
      return { ok: true, remote: true }
    } finally {
      setSaving(false)
    }
  }, [user])

  return { profile, loading, saving, usingLocal, save, isLocal: usingLocal }
}
