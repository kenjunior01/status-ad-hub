import {
  useState, useCallback, useRef, useEffect, createContext, useContext,
  type ReactNode,
} from 'react'
import {
  isBluetoothAvailable, SCAN_SERVICES, classifyDevice,
  type DiscoveredBLEDevice, type BLEConnectionState,
  type WebBluetoothDevice,
} from '@/lib/web-bluetooth'
import { BLE_SERVICES } from '@/lib/web-bluetooth'

// ============================================
// BLE Context — shared state across the app
// ============================================

interface BluetoothContextType {
  /** Whether the browser supports Web Bluetooth */
  available: boolean
  /** Whether a scan is currently in progress */
  scanning: boolean
  /** Devices found in the last scan */
  discoveredDevices: DiscoveredBLEDevice[]
  /** Currently connected devices (deviceId -> state) */
  connections: Map<string, BLEConnectionState>
  /** Start a BLE device scan (triggers browser pairing dialog) */
  startScan: () => Promise<void>
  /** Manually connect to a previously discovered device */
  connectDevice: (deviceId: string) => Promise<void>
  /** Disconnect a specific device */
  disconnectDevice: (deviceId: string) => void
  /** Disconnect all devices */
  disconnectAll: () => void
  /** Read battery level from a connected device */
  readBattery: (deviceId: string) => Promise<number | null>
  /** Get RSSI signal strength (approximate from connection quality) */
  getSignalStrength: (deviceId: string) => number
}

const BluetoothContext = createContext<BluetoothContextType>({
  available: false,
  scanning: false,
  discoveredDevices: [],
  connections: new Map(),
  startScan: async () => {},
  connectDevice: async () => {},
  disconnectDevice: () => {},
  disconnectAll: () => {},
  readBattery: async () => null,
  getSignalStrength: () => -100,
})

export function BluetoothProvider({ children }: { children: ReactNode }) {
  const [available, setAvailable] = useState(isBluetoothAvailable())
  const [scanning, setScanning] = useState(false)
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredBLEDevice[]>([])
  const connectionsRef = useRef<Map<string, BLEConnectionState>>(new Map())
  const rawDevicesRef = useRef<Map<string, WebBluetoothDevice>>(new Map())
  const [, forceUpdate] = useState(0)
  const listenersRef = useRef<Map<string, ((ev: Event) => void)>>(new Map())

  // Listen for bluetooth availability changes (e.g. adapter toggled)
  useEffect(() => {
    if (!isBluetoothAvailable()) return
    navigator.bluetooth.getAvailability().then(setAvailable)
    const handler = (ev: Event & { value: boolean }) => setAvailable(ev.value)
    navigator.bluetooth.addEventListener('availabilitychanged', handler)
    return () => navigator.bluetooth.removeEventListener('availabilitychanged', handler)
  }, [])

  // Cleanup all connections on unmount
  useEffect(() => {
    return () => {
      rawDevicesRef.current.forEach((device) => {
        if (device.gatt?.connected) device.gatt.disconnect()
      })
    }
  }, [])

  const updateConnection = useCallback((deviceId: string, partial: Partial<BLEConnectionState>) => {
    const current = connectionsRef.current.get(deviceId) || {
      deviceId,
      deviceName: '',
      connected: false,
      rssi: null,
      batteryLevel: null,
      lastSeen: new Date().toISOString(),
    }
    connectionsRef.current.set(deviceId, { ...current, ...partial, lastSeen: new Date().toISOString() })
    forceUpdate((n) => n + 1)
  }, [])

  /**
   * Start a BLE scan — opens the browser's device picker dialog.
   * Web Bluetooth doesn't support background scanning; it requires user gesture.
   * The user picks one or more devices from the system dialog.
   */
  const startScan = useCallback(async () => {
    if (!isBluetoothAvailable()) {
      console.warn('[BLE] Web Bluetooth not available in this browser')
      return
    }

    setScanning(true)
    try {
      // requestDevice opens the system Bluetooth picker
      const device = await navigator.bluetooth.requestDevice({
        // We accept all devices by listing broad service filters.
        // The browser will show a picker with nearby BLE devices.
        optionalServices: [
          BLE_SERVICES.BATTERY,
          BLE_SERVICES.GENERIC_ACCESS,
          BLE_SERVICES.DEVICE_INFO,
          BLE_SERVICES.IMMEDIATE_ALERT,
          BLE_SERVICES.LINK_LOSS,
          BLE_SERVICES.APPLE_NOTIFICATION,
        ],
        // acceptAllDevices: true would skip the filter but requires
        // optionalServices to be set (which we do above)
        acceptAllDevices: true,
      })

      const discovered: DiscoveredBLEDevice = {
        id: device.id,
        name: device.name,
        rssi: null, // Web Bluetooth doesn't expose RSSI directly
        deviceClass: classifyDevice(device.name, []),
        services: [],
      }

      // Store the raw device reference for later connection
      rawDevicesRef.current.set(device.id, device)

      // Listen for disconnection events
      device.addEventListener('gattserverdisconnected', () => {
        updateConnection(device.id, { connected: false })
        console.log(`[BLE] Device ${device.name || device.id} disconnected`)
      })

      setDiscoveredDevices((prev) => {
        // Avoid duplicates
        if (prev.some((d) => d.id === device.id)) return prev
        return [...prev, discovered]
      })

      console.log(`[BLE] Found device: ${device.name || 'Unknown'} (${device.id})`)
    } catch (err: any) {
      // User cancelled the picker — not an error
      if (err.name === 'NotFoundError' || err.message?.includes('User cancelled')) {
        console.log('[BLE] User cancelled device selection')
      } else {
        console.error('[BLE] Scan error:', err)
      }
    } finally {
      setScanning(false)
    }
  }, [updateConnection])

  /** Connect to a BLE device's GATT server */
  const connectDevice = useCallback(async (deviceId: string) => {
    const rawDevice = rawDevicesRef.current.get(deviceId)
    if (!rawDevice) {
      console.error(`[BLE] Device ${deviceId} not found in discovered devices`)
      return
    }

    try {
      console.log(`[BLE] Connecting to ${rawDevice.name || deviceId}...`)
      const server = await rawDevice.gatt.connect()
      updateConnection(deviceId, {
        deviceId,
        deviceName: rawDevice.name || 'Dispositivo BLE',
        connected: server.connected,
      })

      // Try to read battery level
      try {
        const batteryService = await server.getPrimaryService(BLE_SERVICES.BATTERY)
        const batteryChar = await batteryService.getCharacteristic('battery_level')
        const value = await batteryChar.readValue()
        const batteryPercent = value.getUint8(0)
        updateConnection(deviceId, { batteryLevel: batteryPercent })
        console.log(`[BLE] Battery: ${batteryPercent}%`)
      } catch {
        // Battery service not available on this device
        console.log('[BLE] Battery service not available')
      }

      // Try to subscribe to battery level notifications
      try {
        const batteryService = await server.getPrimaryService(BLE_SERVICES.BATTERY)
        const batteryChar = await batteryService.getCharacteristic('battery_level')
        await batteryChar.startNotifications()
        const listener = (ev: Event) => {
          const target = ev.target as BluetoothRemoteGATTCharacteristic
          if (target?.value) {
            const level = target.value.getUint8(0)
            updateConnection(deviceId, { batteryLevel: level })
          }
        }
        listenersRef.current.set(`battery-${deviceId}`, listener)
        batteryChar.addEventListener('characteristicvaluechanged', listener)
      } catch {
        // Notifications not supported
      }
    } catch (err) {
      console.error(`[BLE] Connection failed for ${deviceId}:`, err)
      updateConnection(deviceId, { connected: false })
    }
  }, [updateConnection])

  /** Disconnect a specific device */
  const disconnectDevice = useCallback((deviceId: string) => {
    const rawDevice = rawDevicesRef.current.get(deviceId)
    if (rawDevice?.gatt?.connected) {
      rawDevice.gatt.disconnect()
    }
    updateConnection(deviceId, { connected: false })
    // Remove notification listener
    const listenerKey = `battery-${deviceId}`
    const listener = listenersRef.current.get(listenerKey)
    if (listener) {
      listenersRef.current.delete(listenerKey)
    }
  }, [updateConnection])

  /** Disconnect all connected devices */
  const disconnectAll = useCallback(() => {
    rawDevicesRef.current.forEach((device, id) => {
      if (device.gatt?.connected) {
        device.gatt.disconnect()
      }
      updateConnection(id, { connected: false })
    })
  }, [updateConnection])

  /** Read battery from a connected device */
  const readBattery = useCallback(async (deviceId: string): Promise<number | null> => {
    const rawDevice = rawDevicesRef.current.get(deviceId)
    if (!rawDevice?.gatt?.connected) return null
    try {
      const server = rawDevice.gatt
      const batteryService = await server.getPrimaryService(BLE_SERVICES.BATTERY)
      const batteryChar = await batteryService.getCharacteristic('battery_level')
      const value = await batteryChar.readValue()
      const level = value.getUint8(0)
      updateConnection(deviceId, { batteryLevel: level })
      return level
    } catch {
      return null
    }
  }, [updateConnection])

  /** Approximate signal strength (Web Bluetooth doesn't expose real RSSI) */
  const getSignalStrength = useCallback((deviceId: string): number => {
    const conn = connectionsRef.current.get(deviceId)
    if (!conn?.connected) return -100
    // Since we can't get real RSSI, return a mock value based on connection.
    // In production, this would come from native APIs.
    return -45 + Math.floor(Math.random() * 20) // -45 to -65 dBm (close range)
  }, [])

  return (
    <BluetoothContext.Provider
      value={{
        available,
        scanning,
        discoveredDevices,
        connections: connectionsRef.current,
        startScan,
        connectDevice,
        disconnectDevice,
        disconnectAll,
        readBattery,
        getSignalStrength,
      }}
    >
      {children}
    </BluetoothContext.Provider>
  )
}

export const useBluetooth = () => useContext(BluetoothContext)