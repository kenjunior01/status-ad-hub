// ============================================
// StatusAds Connect — Domain Types
// ============================================

export type DeviceType = 'phone' | 'airpods' | 'smartwatch' | 'other'
export type DeviceStatus = 'online' | 'connected' | 'offline' | 'low_battery'
export type EventType = 'location' | 'alert' | 'shield' | 'bluetooth' | 'emergency' | 'geofence'
export type ContactRelation = 'parente' | 'conjuge' | 'amigo' | 'colega' | 'outro'

// ---- DATABASE ROW TYPES ----

export interface Device {
  id: string
  user_id: string
  name: string
  type: DeviceType
  mac_address: string
  color: string
  status: DeviceStatus
  battery: number
  last_seen: string
  is_monitored: boolean
  created_at: string
  updated_at: string
}

export interface EmergencyContact {
  id: string
  user_id: string
  name: string
  relation: ContactRelation
  phone: string
  email: string
  is_primary: boolean
  alert_enabled: boolean
  created_at: string
  updated_at: string
}

export interface LocationEvent {
  id: string
  user_id: string
  device_id: string | null
  type: EventType
  description: string
  latitude: number | null
  longitude: number | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  full_name: string
  phone: string
  avatar_url: string | null
  safe_mode_enabled: boolean
  emergency_zone_lat: number | null
  emergency_zone_lng: number | null
  emergency_zone_radius: number
  auto_activate_emergency: boolean
  plan: 'free' | 'familia' | 'premium'
  created_at: string
  updated_at: string
}

// ---- API INPUT/OUTPUT TYPES ----

export interface CreateDeviceInput {
  name: string
  type: DeviceType
  mac_address: string
  color?: string
}

export interface UpdateDeviceInput {
  name?: string
  color?: string
  is_monitored?: boolean
}

export interface CreateContactInput {
  name: string
  relation: ContactRelation
  phone: string
  email?: string
  is_primary?: boolean
}

export interface UpdateContactInput {
  name?: string
  relation?: ContactRelation
  phone?: string
  email?: string
  is_primary?: boolean
  alert_enabled?: boolean
}

export interface UpdateProfileInput {
  full_name?: string
  phone?: string
  avatar_url?: string
  safe_mode_enabled?: boolean
  emergency_zone_lat?: number | null
  emergency_zone_lng?: number | null
  emergency_zone_radius?: number
  auto_activate_emergency?: boolean
}

// ---- DERIVED / VIEW TYPES ----

export interface DeviceWithStatus extends Device {
  status_label: string
  status_class: string
  battery_color: string
  device_icon: string
}

export interface DashboardStats {
  total_devices: number
  online_devices: number
  low_battery_devices: number
  alerts_today: number
  locations_today: number
  safe_zones: number
}

export interface LocationPoint {
  lat: number
  lng: number
  device_id?: string
  device_name?: string
  color?: string
  timestamp: string
}

export interface HourlyLocationData {
  hora: string
  localizacoes: number
}

// ---- HISTORY FILTER ----

export type HistoryPeriod = 'hoje' | '7dias' | '30dias' | 'tudo'

export function getPeriodDateRange(period: HistoryPeriod): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()
  switch (period) {
    case 'hoje':
      start.setHours(0, 0, 0, 0)
      break
    case '7dias':
      start.setDate(start.getDate() - 7)
      break
    case '30dias':
      start.setDate(start.getDate() - 30)
      break
    case 'tudo':
      start.setFullYear(2000, 0, 1)
      break
  }
  return { start, end }
}
