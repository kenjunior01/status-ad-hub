// ============================================
// StatusAds Connect — Domain Types
// ============================================

export type DeviceType = 'phone' | 'airpods' | 'smartwatch' | 'smart_glasses' | 'bellvion' | 'tracker' | 'panic_button' | 'other'
export type DeviceStatus = 'online' | 'connected' | 'offline' | 'low_battery'
export type EventType = 'location' | 'alert' | 'shield' | 'bluetooth' | 'emergency' | 'geofence' | 'checkin' | 'glasses_sos' | 'audio_evidence' | 'glasses_removal' | 'voice_sos' | 'panic_mode' | 'threat_detected' | 'dead_mans_switch' | 'community_alert' | 'photo_evidence' | 'safe_route'
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
  group: string
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
  status?: DeviceStatus
}

export interface CreateContactInput {
  name: string
  relation: ContactRelation
  group?: string
  phone: string
  email?: string
  is_primary?: boolean
}

export interface UpdateContactInput {
  name?: string
  relation?: ContactRelation
  group?: string
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
  active_emergencies: number
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

// ---- EMERGENCY TYPES ----

export interface EmergencyAlert {
  id: string
  status: 'active' | 'resolved' | 'false_alarm'
  latitude: number
  longitude: number
  contacts_notified: string[]
  share_token: string | null
  created_at: string
  resolved_at: string | null
  resolve_reason: string | null
}

export interface EmergencyHistoryItem extends EmergencyAlert {}

// ---- CHECK-IN TYPES ----

export interface CheckIn {
  id: string
  user_id: string
  status: 'checked_in' | 'missed' | 'expired'
  latitude: number | null
  longitude: number | null
  message: string | null
  checked_at: string | null
  scheduled_at: string
  expires_at: string
  created_at: string
}

export interface CheckInConfig {
  id: string
  user_id: string
  interval_minutes: number
  is_active: boolean
  start_time: string | null  // HH:mm format, e.g. "08:00"
  end_time: string | null    // HH:mm format, e.g. "22:00"
  message_template: string | null
  created_at: string
  updated_at: string
}

// ---- SMART GLASSES TYPES ----

export interface SmartGlassesConfig {
  id: string
  user_id: string
  device_id: string | null
  /** Tap pattern: 'double' | 'triple' | 'long_press' */
  sos_tap_pattern: 'double' | 'triple' | 'long_press'
  /** Enable covert SOS via glasses tap */
  sos_enabled: boolean
  /** Auto-record audio when SOS triggers */
  auto_record_audio: boolean
  /** Max recording duration in seconds */
  max_record_duration: number
  /** Alert on glasses removal (BLE disconnect) */
  removal_alert_enabled: boolean
  /** Grace period for removal (seconds) — distinguishes intentional removal */
  removal_grace_seconds: number
  /** Send audio evidence to contacts after recording */
  share_audio_evidence: boolean
  /** HID key code to listen for (0 = auto-detect) */
  hid_key_code: number
  /** Stealth mode — no visual feedback on SOS trigger */
  stealth_mode: boolean
  created_at: string
  updated_at: string
}

export type TapPattern = 'double' | 'triple' | 'long_press'

export interface GlassesTapEvent {
  id: string
  device_id: string
  pattern: TapPattern
  action_triggered: 'sos' | 'checkin' | 'none'
 timestamp: string
}

export interface AudioEvidence {
  id: string
  user_id: string
  emergency_alert_id: string | null
  device_id: string | null
  /** Storage URL (Supabase Storage or base64 for local) */
  audio_url: string | null
  /** Local base64 data for offline recording */
  audio_data_b64: string | null
  duration_seconds: number
  file_size_bytes: number
  mime_type: string
  created_at: string
}

// ============================================
// VOICE SOS TYPES
// ============================================

export interface VoiceSOSConfig {
  id: string
  user_id: string
  enabled: boolean
  /** Wake phrases in Portuguese */
  wake_phrases: string[]
  /** Language for speech recognition (default 'pt-BR') */
  language: string
  /** Require confirmation phrase after wake */
  require_confirmation: boolean
  /** Confirmation phrase */
  confirmation_phrase: string
  /** Cooldown between triggers (seconds) */
  cooldown_seconds: number
  /** Auto-listen continuously when enabled */
  continuous_mode: boolean
  created_at: string
  updated_at: string
}

export interface VoiceSOSActivation {
  id: string
  user_id: string
  phrase_detected: string
  confidence: number
  latitude: number | null
  longitude: number | null
  triggered_emergency: boolean
  created_at: string
}

// ============================================
// PANIC MODE TYPES
// ============================================

export interface PanicModeState {
  isActive: boolean
  activatedAt: string | null
  /** Photo evidence captured during panic */
  photosCaptured: string[]  // base64 data URLs
  /** Audio recording active */
  isRecording: boolean
  /** Recording duration in seconds */
  recordingDuration: number
  /** Emergency alert ID if triggered */
  emergencyAlertId: string | null
  /** Screen locked (fake UI shown) */
  isScreenLocked: boolean
}

// ============================================
// DISCREET MODE TYPES
// ============================================

export type DiscreetModeType = 'calculator' | 'weather' | 'notes' | 'clock' | 'contacts' | 'settings_app' | 'music_player' | 'currency' | 'flashlight' | 'sms_chat' | 'photo_gallery'

export interface DiscreetModeConfig {
  id: string
  user_id: string
  enabled: boolean
  /** Which fake app to show */
  disguise_type: DiscreetModeType
  /** PIN to deactivate discreet mode (4-6 digits) */
  deactivation_pin: string
  /** Duress PIN — if entered, triggers SILENT emergency instead of opening real app */
  duress_pin: string
  /** Shake to activate (device motion) */
  shake_to_activate: boolean
  /** Triple-tap status bar to activate */
  triple_tap_activate: boolean
  /** Volume button combo to trigger SOS (up-up-down-down) */
  volume_sos_enabled: boolean
  /** Anti-forced-entry: wrong PIN 3x triggers silent SOS */
  anti_forced_entry: boolean
  /** Max wrong PIN attempts before auto-SOS (default 3) */
  max_wrong_attempts: number
  /** Wrong attempt counter (runtime, not persisted) */
  wrong_attempt_count?: number
  /** SOS still works in discreet mode */
  sos_enabled_in_disguise: boolean
  /** Custom app name for disguise (overrides default) */
  custom_app_name: string | null
  /** Custom accent color for disguise */
  custom_color: string | null
  /** Show subtle status indicators in disguise */
  show_stealth_indicators: boolean
  created_at: string
  updated_at: string
}

// ============================================
// TRIP TRACKING TYPES
// ============================================

export interface TripTracking {
  id: string
  user_id: string
  /** Display name for this trip */
  trip_name: string
  /** Destination description */
  destination: string
  destination_lat: number | null
  destination_lng: number | null
  /** Trusted contact IDs who can monitor */
  shared_with: string[]
  share_tokens: string[]
  status: 'planned' | 'active' | 'completed' | 'cancelled'
  /** ETA in minutes */
  eta_minutes: number | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface TripLocationPing {
  id: string
  trip_tracking_id: string
  latitude: number
  longitude: number
  speed: number | null
  battery: number | null
  created_at: string
}

// ============================================
// NIGHT SAFETY MODE TYPES
// ============================================

export interface NightSafetyConfig {
  id: string
  user_id: string
  enabled: boolean
  /** Auto-activate night mode at this hour (HH:mm) */
  activate_at: string | null  // e.g. "20:00"
  /** Deactivate at this hour */
  deactivate_at: string | null  // e.g. "06:00"
  /** Automatically start voice SOS listening at night */
  auto_voice_sos: boolean
  /** Increase GPS tracking frequency at night */
  high_frequency_gps: boolean
  /** Auto-enable threat detection at night */
  auto_threat_detection: boolean
  /** Reduce screen brightness to avoid attention */
  dim_screen: boolean
  /** Vibrate-only alerts (no sound) */
  silent_alerts: boolean
  /** Auto-enable Dead Man's Switch at night */
  auto_dead_mans_switch: boolean
  /** Auto-enable discreet mode at night */
  auto_discreet_mode: boolean
  created_at: string
  updated_at: string
}

// ============================================
// SAFE WORD SMS TYPES
// ============================================

export interface SafeWordConfig {
  id: string
  user_id: string
  enabled: boolean
  /** The secret word that triggers emergency via SMS */
  safe_word: string
  /** Trusted phone numbers that can trigger via safe word */
  trusted_senders: string[]
  /** Require exact match (false = contains) */
  exact_match: boolean
  /** Case insensitive */
  case_insensitive: boolean
  /** Auto-reply with location (without revealing it's an SOS) */
  auto_reply_with_location: boolean
  /** Auto-reply message template */
  auto_reply_message: string | null
  created_at: string
  updated_at: string
}

// ============================================
// THREAT DETECTION TYPES
// ============================================

export interface ThreatReading {
  timestamp: number
  accelerometer: { x: number; y: number; z: number }
  gyroscope: { x: number; y: number; z: number } | null
  speed: number | null  // m/s from GPS
  heading: number | null
  rssi: number | null  // BLE signal strength
}

export interface ThreatAssessment {
  level: 'safe' | 'elevated' | 'high' | 'critical'
  score: number  // 0-100
  factors: string[]
  timestamp: number
  recommendation: string
}

export interface ThreatEvent {
  id: string
  user_id: string
  level: ThreatAssessment['level']
  score: number
  factors: string[]
  latitude: number | null
  longitude: number | null
  auto_triggered_emergency: boolean
  emergency_alert_id: string | null
  created_at: string
}

// ============================================
// DEAD MAN'S SWITCH TYPES
// ============================================

export interface DeadMansSwitchConfig {
  id: string
  user_id: string
  enabled: boolean
  /** Max time without response before escalation (minutes) */
  timeout_minutes: number
  /** Escalation levels: warn -> alert contacts -> full emergency */
  auto_escalate: boolean
  /** Number of warning attempts before full emergency */
  warning_attempts: number
  /** Warning interval in minutes */
  warning_interval_minutes: number
  /** Custom message for warnings */
  warning_message: string | null
  /** Only active during certain hours */
  active_start_time: string | null  // HH:mm
  active_end_time: string | null    // HH:mm
  created_at: string
  updated_at: string
}

export interface DeadMansSwitchEvent {
  id: string
  user_id: string
  type: 'warning_sent' | 'warning_acknowledged' | 'escalated' | 'reset'
  attempt_number: number
  response_time_seconds: number | null
  emergency_alert_id: string | null
  created_at: string
}

// ============================================
// COMMUNITY SAFETY RADAR TYPES
// ============================================

export interface CommunityAlert {
  id: string
  user_id: string
  /** Anonymized — never shows real user */
  anonymous_id: string
  type: 'danger_zone' | 'suspicious_activity' | 'verified_incident' | 'safe_route_tip'
  latitude: number
  longitude: number
  radius_meters: number
  title: string
  description: string
  /** True = verified by admin or multiple reports */
  is_verified: boolean
  /** Report count — higher = more credible */
  report_count: number
  /** Auto-expire hours */
  expires_at: string
  created_at: string
}

// ============================================
// SAFE ROUTE TYPES
// ============================================

export interface SafeRouteConfig {
  id: string
  user_id: string
  /** Home / safe destination */
  safe_latitude: number | null
  safe_longitude: number | null
  /** Avoid radius around known danger zones (meters) */
  danger_zone_avoidance_radius: number
  /** Prefer well-lit routes */
  prefer_lit_routes: boolean
  /** Prefer routes with more foot traffic */
  prefer_busy_routes: boolean
  created_at: string
  updated_at: string
}

// ============================================
// INCIDENT TIMELINE TYPES
// ============================================

export interface IncidentTimeline {
  emergency_alert_id: string
  events: TimelineEvent[]
  reconstruction: {
    totalDuration: number
    maxDistanceFromStart: number
    avgSpeed: number
    eventsByType: Record<string, number>
  }
}

export interface TimelineEvent {
  timestamp: string
  type: string
  title: string
  description: string
  latitude: number | null
  longitude: number | null
  metadata: Record<string, unknown>
}

// ============================================
// MULTI-FACTOR VERIFICATION TYPES
// ============================================

export interface SafetyVerification {
  id: string
  user_id: string
  checkin_id: string | null
  method: 'pin' | 'biometric' | 'voice' | 'location_match'
  verified: boolean
  verification_data: Record<string, unknown> | null
  created_at: string
}

// ============================================
// WEARABLE HUB TYPES
// ============================================

export interface WearableDevice {
  id: string
  user_id: string
  device_id: string  // FK to devices table
  type: 'smart_glasses' | 'smartwatch' | 'fitness_band' | 'earbuds'
  capabilities: WearableCapability[]
  /** Connection priority for monitoring */
  monitoring_priority: number  // 1 = highest
  /** Custom settings per wearable */
  settings: Record<string, unknown>
  is_active: boolean
  last_connected: string | null
  battery_level: number
  firmware_version: string | null
  created_at: string
  updated_at: string
}

export type WearableCapability =
  | 'tap_sos'
  | 'heart_rate'
  | 'spo2'
  | 'fall_detection'
  | 'gps_tracking'
  | 'audio_recording'
  | 'vibration_alert'
  | 'display_notification'
  | 'removal_alert'
  | 'nfc_payment'
  | 'body_temperature'

// ============================================
// DISGUISE PREVIEW METADATA
// ============================================

export interface DisguisePreview {
  type: DiscreetModeType
  name: string
  description: string
  icon: string  // emoji
  color: string  // tailwind color
  sosTrigger: string  // how to trigger SOS within this disguise
  features: string[]
}

/** All available disguises with metadata */
export const ALL_DISGUISES: DisguisePreview[] = [
  {
    type: 'calculator',
    name: 'Calculadora',
    description: 'Calculadora funcional com historial. SOS: digitar 911 ou 112.',
    icon: '🔢',
    color: 'gray',
    sosTrigger: 'Digitar 911 ou 112',
    features: ['Totalmente funcional', 'Historial de cálculos', 'SOS numérico'],
  },
  {
    type: 'weather',
    name: 'Meteorologia',
    description: 'Previsão do tempo com dados simulados. SOS: 5 toques na temperatura.',
    icon: '🌤️',
    color: 'blue',
    sosTrigger: '5 toques rápidos na temperatura',
    features: ['Previsão 5 dias', 'Dados locais', 'SOS por toque'],
  },
  {
    type: 'notes',
    name: 'Notas',
    description: 'Bloco de notas simples. SOS: 5 toques rápidos no texto.',
    icon: '📝',
    color: 'yellow',
    sosTrigger: '5 toques rápidos no texto',
    features: ['Editor de texto', 'Lista de compras pré-definida', 'SOS por toque'],
  },
  {
    type: 'clock',
    name: 'Relógio',
    description: 'Relógio digital limpo. SOS: 5 toques no ecrã.',
    icon: '⏰',
    color: 'neutral',
    sosTrigger: '5 toques no ecrã',
    features: ['Segundos animados', 'Data completa', 'SOS por toque'],
  },
  {
    type: 'contacts',
    name: 'Contactos',
    description: 'Lista de contactos fictícios. SOS: tocar no topo 5x.',
    icon: '👥',
    color: 'green',
    sosTrigger: '5 toques rápidos no título',
    features: ['Lista de contactos fake', 'Pesquisa funcional', 'SOS por toque'],
  },
  {
    type: 'settings_app',
    name: 'Configurações',
    description: 'Ecrã de configurações genérico. SOS: Wi-Fi item 3x.',
    icon: '⚙️',
    color: 'slate',
    sosTrigger: 'Tocar Wi-Fi 3 vezes seguidas',
    features: ['Ícones de configuração', 'Toggles funcionais', 'SOS oculto'],
  },
  {
    type: 'music_player',
    name: 'Player de Música',
    description: 'Player de música com capa. SOS: pular faixa 5x.',
    icon: '🎵',
    color: 'purple',
    sosTrigger: 'Botão pular 5 vezes seguidas',
    features: ['Barra de progresso animada', 'Lista de faixas', 'SOS por botão'],
  },
  {
    type: 'currency',
    name: 'Conversor de Moeda',
    description: 'Conversor MZN/USD/ZAR. SOS: digitar 999.',
    icon: '💱',
    color: 'emerald',
    sosTrigger: 'Digitar 999 no campo de valor',
    features: ['Conversão funcional', '3 moedas', 'SOS numérico'],
  },
  {
    type: 'flashlight',
    name: 'Lanterna',
    description: 'Ecrã branco com regulagem. SOS: 3 toques no ícone.',
    icon: '🔦',
    color: 'amber',
    sosTrigger: '3 toques rápidos no ícone',
    features: ['Brilho ajustável', 'Ecrã branco', 'SOS por toque'],
  },
  {
    type: 'sms_chat',
    name: 'Mensagens',
    description: 'Conversa SMS fictícia. SOS: digitar HELP.',
    icon: '💬',
    color: 'teal',
    sosTrigger: 'Digitar HELP no campo de texto',
    features: ['Conversa simulada', 'Campo de texto funcional', 'SOS por texto'],
  },
  {
    type: 'photo_gallery',
    name: 'Galeria de Fotos',
    description: 'Galeria com grelha de fotos e visualização. SOS: 4 toques duplos rápidos.',
    icon: '📷',
    color: 'sky',
    sosTrigger: '4 toques duplos rápidos',
    features: ['Grelha 3x3 com gradientes', 'Visualização em ecrã cheio', 'Curtidas funcionais', 'SOS por toque duplo'],
  },
]
