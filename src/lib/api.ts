import { supabase } from '@/lib/supabase'
import type {
  Device, EmergencyContact, LocationEvent, UserProfile,
  CreateDeviceInput, UpdateDeviceInput,
  CreateContactInput, UpdateContactInput,
  UpdateProfileInput,
  DashboardStats, LocationPoint, HistoryPeriod,
  EmergencyAlert, EmergencyHistoryItem,
  CheckIn, CheckInConfig,
  SmartGlassesConfig, TapPattern, AudioEvidence, GlassesTapEvent,
} from '@/lib/types'
import { getPeriodDateRange } from '@/lib/types'

// ============================================
// PROFILE API
// ============================================

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) throw error
  return data as UserProfile
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(input)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data as UserProfile
}

// ============================================
// DEVICES API
// ============================================

export async function getDevices(userId: string): Promise<Device[]> {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as Device[]
}

export async function createDevice(userId: string, input: CreateDeviceInput): Promise<Device> {
  const { data, error } = await supabase
    .from('devices')
    .insert({ ...input, user_id: userId, status: 'offline' })
    .select()
    .single()
  if (error) throw error
  return data as Device
}

export async function updateDevice(deviceId: string, input: UpdateDeviceInput): Promise<Device> {
  const { data, error } = await supabase
    .from('devices')
    .update(input)
    .eq('id', deviceId)
    .select()
    .single()
  if (error) throw error
  return data as Device
}

export async function deleteDevice(deviceId: string): Promise<void> {
  const { error } = await supabase
    .from('devices')
    .delete()
    .eq('id', deviceId)
  if (error) throw error
}

// ============================================
// EMERGENCY CONTACTS API
// ============================================

export async function getContacts(userId: string): Promise<EmergencyContact[]> {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('*')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as EmergencyContact[]
}

export async function createContact(userId: string, input: CreateContactInput): Promise<EmergencyContact> {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .insert({ ...input, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data as EmergencyContact
}

export async function updateContact(contactId: string, input: UpdateContactInput): Promise<EmergencyContact> {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .update(input)
    .eq('id', contactId)
    .select()
    .single()
  if (error) throw error
  return data as EmergencyContact
}

export async function toggleContactAlert(contactId: string, enabled: boolean): Promise<EmergencyContact> {
  return updateContact(contactId, { alert_enabled: enabled })
}

export async function deleteContact(contactId: string): Promise<void> {
  const { error } = await supabase
    .from('emergency_contacts')
    .delete()
    .eq('id', contactId)
  if (error) throw error
}

// ============================================
// LOCATION EVENTS API
// ============================================

export async function getEvents(
  userId: string,
  period: HistoryPeriod = 'hoje'
): Promise<LocationEvent[]> {
  const { start, end } = getPeriodDateRange(period)
  const { data, error } = await supabase
    .from('location_events')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as LocationEvent[]
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const { data, error } = await supabase
    .rpc('get_dashboard_stats', { p_user_id: userId })
  if (error) throw error
  const row = data?.[0]
  return {
    total_devices: row?.total_devices ?? 0,
    online_devices: row?.online_devices ?? 0,
    low_battery_devices: row?.low_battery_devices ?? 0,
    alerts_today: row?.alerts_today ?? 0,
    locations_today: row?.locations_today ?? 0,
    safe_zones: 2,
    active_emergencies: row?.active_emergencies ?? 0,
  }
}

export async function getDeviceLocations(userId: string): Promise<LocationPoint[]> {
  const { data, error } = await supabase
    .from('devices')
    .select('id, name, color, last_location')
    .eq('user_id', userId)
    .not('last_location', 'is', null)
  if (error) throw error
  return (data || []).map((d: any) => {
    const coords = d.last_location?.coordinates || [0, 0]
    return {
      lat: coords[1],
      lng: coords[0],
      device_id: d.id,
      device_name: d.name,
      color: d.color,
      timestamp: new Date().toISOString(),
    }
  })
}

export async function logEvent(
  userId: string,
  type: LocationEvent['type'],
  description: string,
  deviceId?: string,
  latitude?: number,
  longitude?: number
): Promise<LocationEvent> {
  const { data, error } = await supabase
    .from('location_events')
    .insert({
      user_id: userId,
      device_id: deviceId || null,
      type,
      description,
      latitude: latitude || null,
      longitude: longitude || null,
    })
    .select()
    .single()
  if (error) throw error
  return data as LocationEvent
}

// ============================================
// EMERGENCY API
// ============================================

export async function triggerEmergency(
  userId: string,
  latitude: number,
  longitude: number
): Promise<{ alertId: string; contactsNotified: string[] }> {
  const { data, error } = await supabase
    .rpc('trigger_emergency', {
      p_user_id: userId,
      p_latitude: latitude,
      p_longitude: longitude,
    })
  if (error) throw error
  const row = data?.[0]
  return {
    alertId: row?.alert_id,
    contactsNotified: row?.notified_phones || [],
  }
}

/** Get the currently active emergency for a user (if any) */
export async function getActiveEmergency(userId: string): Promise<EmergencyAlert | null> {
  const { data, error } = await supabase
    .rpc('get_active_emergency', { p_user_id: userId })
  if (error) throw error
  if (!data || data.length === 0) return null
  const row = data[0]
  return {
    id: row.id,
    status: row.status,
    latitude: row.latitude,
    longitude: row.longitude,
    contacts_notified: row.contacts_notified || [],
    share_token: row.share_token,
    created_at: row.created_at,
    resolved_at: null,
    resolve_reason: null,
  }
}

/** Resolve an active emergency */
export async function resolveEmergency(
  alertId: string,
  reason?: string
): Promise<void> {
  const { error } = await supabase
    .rpc('resolve_emergency', { p_alert_id: alertId, p_reason: reason || null })
  if (error) throw error
}

/** Mark an emergency as false alarm */
export async function markFalseAlarm(alertId: string): Promise<void> {
  const { error } = await supabase
    .rpc('mark_false_alarm', { p_alert_id: alertId })
  if (error) throw error
}

/** Get emergency history for a user */
export async function getEmergencyHistory(userId: string, limit = 20): Promise<EmergencyHistoryItem[]> {
  const { data, error } = await supabase
    .rpc('get_emergency_history', { p_user_id: userId, p_limit: limit })
  if (error) throw error
  return (data || []).map((row: any) => ({
    id: row.id,
    status: row.status,
    latitude: row.latitude,
    longitude: row.longitude,
    contacts_notified: row.contacts_notified || [],
    created_at: row.created_at,
    resolved_at: row.resolved_at,
    resolve_reason: row.resolve_reason,
    share_token: row.share_token,
  }))
}

/** Generate a shareable tracking URL for an emergency */
export function getEmergencyShareUrl(shareToken: string): string {
  return `${window.location.origin}/track/${shareToken}`
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

export function subscribeToDeviceChanges(
  userId: string,
  callback: (payload: { eventType: string; new: Device }) => void
) {
  return supabase
    .channel('devices-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'devices', filter: `user_id=eq.${userId}` },
      (payload: any) => callback({ eventType: payload.eventType, new: payload.new as Device })
    )
    .subscribe()
}

export function subscribeToAlerts(
  userId: string,
  callback: (payload: { eventType: string; new: any }) => void
) {
  return supabase
    .channel('alerts-realtime')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'emergency_alerts', filter: `user_id=eq.${userId}` },
      (payload: any) => callback({ eventType: payload.eventType, new: payload.new })
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'emergency_alerts', filter: `user_id=eq.${userId}` },
      (payload: any) => callback({ eventType: payload.eventType, new: payload.new })
    )
    .subscribe()
}

export function subscribeToEvents(
  userId: string,
  callback: (payload: { eventType: string; new: LocationEvent }) => void
) {
  return supabase
    .channel('events-realtime')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'location_events', filter: `user_id=eq.${userId}` },
      (payload: any) => callback({ eventType: payload.eventType, new: payload.new as LocationEvent })
    )
    .subscribe()
}

// ============================================
// CHECK-IN API
// ============================================

export async function getCheckInConfig(userId: string): Promise<CheckInConfig | null> {
  const { data, error } = await supabase
    .from('checkin_configs')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
  return data as CheckInConfig | null
}

export async function saveCheckInConfig(userId: string, input: {
  interval_minutes: number
  is_active: boolean
  start_time: string | null
  end_time: string | null
  message_template: string | null
}): Promise<CheckInConfig> {
  const { data, error } = await supabase
    .from('checkin_configs')
    .upsert({ user_id: userId, ...input }, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw error
  return data as CheckInConfig
}

export async function getCheckIns(userId: string, limit = 50): Promise<CheckIn[]> {
  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as CheckIn[]
}

export async function createCheckIn(userId: string, latitude: number | null, longitude: number | null, message?: string): Promise<CheckIn> {
  const { data, error } = await supabase
    .from('checkins')
    .insert({
      user_id: userId,
      status: 'checked_in',
      latitude,
      longitude,
      message: message || null,
      checked_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw error
  return data as CheckIn
}

export async function getPendingCheckIn(userId: string): Promise<CheckIn | null> {
  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'missed')
    .is('checked_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as CheckIn | null
}

export function subscribeToCheckIns(
  userId: string,
  callback: (payload: { eventType: string; new: any }) => void
) {
  return supabase
    .channel('checkins-realtime')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'checkins', filter: `user_id=eq.${userId}` },
      (payload: any) => callback({ eventType: payload.eventType, new: payload.new })
    )
    .subscribe()
}

// ============================================
// SMART GLASSES API
// ============================================

/** Busca configuração dos óculos inteligentes do usuário */
export async function getSmartGlassesConfig(userId: string): Promise<SmartGlassesConfig | null> {
  const { data, error } = await supabase
    .from('smart_glasses_configs')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw error // PGRST116 = sem registros
  return data as SmartGlassesConfig | null
}

/** Salva (cria ou atualiza) configuração dos óculos inteligentes */
export async function saveSmartGlassesConfig(userId: string, input: Partial<SmartGlassesConfig>): Promise<SmartGlassesConfig> {
  const { data: existing } = await supabase
    .from('smart_glasses_configs')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('smart_glasses_configs')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return data as SmartGlassesConfig
  } else {
    const { data, error } = await supabase
      .from('smart_glasses_configs')
      .insert({ user_id: userId, ...input })
      .select()
      .single()
    if (error) throw error
    return data as SmartGlassesConfig
  }
}

/** Salva evidência de áudio gravada durante emergência */
export async function saveAudioEvidence(
  userId: string,
  input: {
    emergency_alert_id?: string
    device_id?: string
    audio_url?: string
    audio_data_b64?: string
    duration_seconds: number
    file_size_bytes: number
    mime_type: string
  }
): Promise<AudioEvidence> {
  const { data, error } = await supabase
    .from('audio_evidence')
    .insert({ user_id: userId, ...input })
    .select()
    .single()
  if (error) throw error
  return data as AudioEvidence
}

/** Busca evidências de áudio do usuário */
export async function getAudioEvidence(userId: string, limit = 20): Promise<AudioEvidence[]> {
  const { data, error } = await supabase
    .from('audio_evidence')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as AudioEvidence[]
}

/** Busca histórico de toques nos óculos */
export async function getGlassesTapHistory(userId: string, deviceId: string, limit = 50): Promise<GlassesTapEvent[]> {
  const { data, error } = await supabase
    .from('glasses_tap_events')
    .select('*')
    .eq('user_id', userId)
    .eq('device_id', deviceId)
    .order('timestamp', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as GlassesTapEvent[]
}

/** Registra evento de toque nos óculos (para auditoria) */
export async function logGlassesTapEvent(
  userId: string,
  deviceId: string,
  pattern: TapPattern,
  actionTriggered: 'sos' | 'checkin' | 'none'
): Promise<void> {
  await supabase.from('glasses_tap_events').insert({
    user_id: userId,
    device_id: deviceId,
    pattern,
    action_triggered: actionTriggered,
    timestamp: new Date().toISOString(),
  })
}