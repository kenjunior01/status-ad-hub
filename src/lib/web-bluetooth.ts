// ============================================
// StatusAds Connect — Web Bluetooth API Types
// ============================================
// Web Bluetooth is only available in Chromium browsers
// (Chrome, Edge, Opera) on HTTPS or localhost.
// It is NOT available on iOS Safari or Firefox.

/** Raw Bluetooth device from navigator.bluetooth.requestDevice() */
export interface WebBluetoothDevice {
  id: string           // opaque identifier, changes per session
  name: string | null
  gatt: BluetoothRemoteGATTServer
}

/** GATT server connected to a BLE device */
export interface BluetoothRemoteGATTServer {
  connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>
  getPrimaryServices(service?: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService[]>
}

/** A GATT service on a BLE device */
export interface BluetoothRemoteGATTService {
  uuid: string
  isPrimary: boolean
  getCharacteristic(char: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>
  getCharacteristics(char?: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic[]>
}

/** A GATT characteristic for reading/writing data */
export interface BluetoothRemoteGATTCharacteristic {
  uuid: string
  service: BluetoothRemoteGATTService
  value: DataView | null
  properties: {
    read: boolean
    write: boolean
    writeWithoutResponse: boolean
    notify: boolean
    indicate: boolean
    broadcast: boolean
    authenticatedSignedWrites: boolean
  }
  readValue(): Promise<DataView>
  writeValue(value: BufferSource): Promise<void>
  writeValueWithoutResponse(value: BufferSource): Promise<void>
  startNotifications(): Promise<void>
  stopNotifications(): Promise<void>
  addEventListener(type: 'characteristicvaluechanged', listener: (ev: Event) => void): void
  removeEventListener(type: 'characteristicvaluechanged', listener: (ev: Event) => void): void
}

export type BluetoothServiceUUID = string | number
export type BluetoothCharacteristicUUID = string | number

/** Discovered BLE device info (before pairing) */
export interface DiscoveredBLEDevice {
  id: string           // browser-assigned session ID
  name: string | null
  rssi: number | null   // signal strength (approximate, from ad data)
  deviceClass: string   // 'phone' | 'airpods' | 'smartwatch' | 'other'
  services: string[]   // advertised GATT service UUIDs
}

/** Active BLE connection state */
export interface BLEConnectionState {
  deviceId: string
  deviceName: string
  connected: boolean
  rssi: number | null
  batteryLevel: number | null
  lastSeen: string
}

/** Standard BLE service UUIDs we scan for */
export const BLE_SERVICES = {
  BATTERY: 0x180f,
  GENERIC_ACCESS: 0x1800,
  DEVICE_INFO: 0x180a,
  IMMEDIATE_ALERT: 0x1802,
  LINK_LOSS: 0x1803,
  TX_POWER: 0x1804,
  // Apple-specific services (for AirPods detection)
  APPLE_NOTIFICATION: '7905f431-b5ce-4e99-a40f-4b1e122d00d0',
  // Generic proximity / tracker services
  // Tile: 0xfeaa, Apple Find My: 0x12345678-1234-1234-1234-1234567890ab
} as const

/** All service UUIDs to accept during scanning */
export const SCAN_SERVICES: BluetoothServiceUUID[] = [
  BLE_SERVICES.BATTERY,
  BLE_SERVICES.GENERIC_ACCESS,
  BLE_SERVICES.DEVICE_INFO,
  BLE_SERVICES.IMMEDIATE_ALERT,
  BLE_SERVICES.LINK_LOSS,
  BLE_SERVICES.APPLE_NOTIFICATION,
  // Accept all devices — some devices don't advertise standard services
  // The Web Bluetooth API requires at least one service filter,
  // so we use a broad set. For truly open scanning, a native app is needed.
]

/**
 * Marcas compatíveis — informativo para a UI.
 * A app funciona com QUALQUER dispositivo BLE; dispositivos BELLVION
 * dão acesso ao plano com desconto e a funcionalidades exclusivas.
 */
export const COMPATIBLE_DEVICES = [
  { brand: 'BELLVION', examples: 'Glasses, Watch, Buds, Tracker', official: true },
  { brand: 'Apple', examples: 'AirPods, Apple Watch', official: false },
  { brand: 'Samsung', examples: 'Galaxy Watch, Galaxy Buds, SmartTag', official: false },
  { brand: 'Xiaomi', examples: 'Mi Band, Redmi Buds', official: false },
  { brand: 'Huawei', examples: 'Watch GT, FreeBuds', official: false },
  { brand: 'Genéricos', examples: 'iTag, Tile, botões SOS BLE', official: false },
] as const

/**
 * Classify a BLE device based on advertised services and name.
 * This is a heuristic — BLE doesn't reliably report device class.
 * UNIVERSAL: aceita qualquer dispositivo BLE — Mi Band, Galaxy Watch,
 * AirPods, iTag, Tile, botões de pânico genéricos, etc.
 */
export type BLEDeviceClass =
  | 'bellvion' | 'airpods' | 'smartwatch' | 'smart_glasses'
  | 'tracker' | 'panic_button' | 'phone' | 'other'

export function classifyDevice(
  name: string | null,
  _services: string[]
): BLEDeviceClass {
  if (!name) return 'other'
  const n = name.toLowerCase()
  // BELLVION primeiro — dispositivos da marca têm tratamento especial
  if (isBellvionName(name)) return 'bellvion'
  // Botões de pânico / SOS dedicados
  if (/panic|sos[ _-]?(button|botao)|botao[ _-]?sos|emergency[ _-]?button|guard[ _-]?button/.test(n)) return 'panic_button'
  // Rastreadores / keyfinders
  if (/itag|tile|smarttag|airtag|key ?finder|tracker|rastreador|chipolo|nut ?mini|ping |pet ?track/.test(n)) return 'tracker'
  if (/airpod|airpods|earbuds|buds|headphone|fones|ouvido/.test(n)) return 'airpods'
  if (/watch|relogio|galaxy watch|apple watch|huawei|band|mi band|fitbit|garmin|amazfit/.test(n)) return 'smartwatch'
  if (/iphone|android|phone|telemovel|samsung|huawei|pixel|xiaomi|oneplus|oppo/.test(n)) return 'phone'
  if (/glass|oculos|sg-?\d+|sg\d+|smart glass|eyewear|spectacle|brillen|lunettes/.test(n)) return 'smart_glasses'
  return 'other'
}

/** Marca detectada pelo nome — usada para badges e tratamento especial */
export type BLEBrand = 'bellvion' | 'apple' | 'samsung' | 'xiaomi' | 'huawei' | 'garmin' | 'google' | 'generic'

export function deviceBrand(name: string | null): BLEBrand {
  if (!name) return 'generic'
  const n = name.toLowerCase()
  if (isBellvionName(name)) return 'bellvion'
  if (/airpod|apple|iphone|beats/.test(n)) return 'apple'
  if (/samsung|galaxy/.test(n)) return 'samsung'
  if (/xiaomi|redmi|mi band|poco/.test(n)) return 'xiaomi'
  if (/huawei|honor/.test(n)) return 'huawei'
  if (/garmin|vivo ?fit|forerunner/.test(n)) return 'garmin'
  if (/pixel|nest/.test(n)) return 'google'
  return 'generic'
}

/** Dispositivos BELLVION (da marca do utilizador) — nome começa/contém o padrão da marca */
export function isBellvionName(name: string | null): boolean {
  if (!name) return false
  const n = name.toLowerCase()
  return /bellvion|bell[ _-]?view|bvl[ _-]?\w{2,}|^bv[-_ ]/.test(n)
}

/** Check if Web Bluetooth API is available in this browser */
export function isBluetoothAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator
}

/** Extend Navigator to include bluetooth property */
declare global {
  interface Navigator {
    bluetooth: {
      getAvailability(): Promise<boolean>
      requestDevice(options: {
        filters?: Array<{ services: BluetoothServiceUUID[]; name?: string; namePrefix?: string }>
        optionalServices?: BluetoothServiceUUID[]
        acceptAllDevices?: boolean
      }): Promise<WebBluetoothDevice>
      addEventListener(event: 'availabilitychanged', listener: (ev: Event & { value: boolean }) => void): void
      removeEventListener(event: 'availabilitychanged', listener: (ev: Event & { value: boolean }) => void): void
    }
  }
}