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
 * Classify a BLE device based on advertised services and name.
 * This is a heuristic — BLE doesn't reliably report device class.
 */
export function classifyDevice(
  name: string | null,
  _services: string[]
): 'phone' | 'airpods' | 'smartwatch' | 'smart_glasses' | 'other' {
  if (!name) return 'other'
  const n = name.toLowerCase()
  if (/airpod|airpods|earbuds|buds|headphone|fones|ouvido/.test(n)) return 'airpods'
  if (/watch|relogio|galaxy watch|apple watch|huawei|band|mi band|fitbit|garmin/.test(n)) return 'smartwatch'
  if (/iphone|android|phone|telemovel|samsung|huawei|pixel|xiaomi|oneplus|oppo/.test(n)) return 'phone'
  if (/glass|oculos|sg-?\d+|sg\d+|smart glass|eyewear|spectacle|brillen|lunettes/.test(n)) return 'smart_glasses'
  return 'other'
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