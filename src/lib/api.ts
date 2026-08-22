import { supabase } from '@/lib/supabase'
import type {
  Device, EmergencyContact, LocationEvent, UserProfile,
  CreateDeviceInput, UpdateDeviceInput,
  CreateContactInput, UpdateContactInput,
  UpdateProfileInput,
  DashboardStats, LocationPoint, HistoryPeriod,
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
    safe_zones: 2, // default, will come from profile later
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
    // Extract lat/lng from PostGIS Point (returned as {coordinates: [lng, lat]})
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
  return {
    alertId: data,
    contactsNotified: [],
  }
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