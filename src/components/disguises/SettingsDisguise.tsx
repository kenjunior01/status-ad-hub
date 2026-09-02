import { useState, useRef } from 'react'
import { Wifi, Bluetooth, Battery, Bell, Moon, Lock, Info, ChevronRight } from 'lucide-react'

const settingsItems = [
  { icon: Wifi, label: 'Wi-Fi', value: 'Casa_5G', color: 'text-blue-500' },
  { icon: Bluetooth, label: 'Bluetooth', value: 'Activo', color: 'text-blue-400' },
  { icon: Battery, label: 'Bateria', value: '67%', color: 'text-amber-400' },
  { icon: Bell, label: 'Notificações', value: 'Activadas', color: 'text-red-500' },
  { icon: Moon, label: 'Não Perturbar', value: 'Desactivado', color: 'text-purple-500' },
  { icon: Lock, label: 'Segurança', value: 'PIN', color: 'text-amber-500' },
  { icon: Info, label: 'Acerca', value: 'v1.0.0', color: 'text-gray-500' },
]

export function SettingsDisguise({ onSOS }: { onSOS: () => void }) {
  const [wifiTaps, setWifiTaps] = useState(0)
  const wifiTimerRef = useRef(0)

  const handleWifiTap = () => {
    const now = Date.now()
    if (now - wifiTimerRef.current < 1000) {
      const next = wifiTaps + 1
      setWifiTaps(next)
      if (next >= 3) { setWifiTaps(0); onSOS() }
    } else {
      setWifiTaps(1)
    }
    wifiTimerRef.current = now
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Configurações</h1>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {settingsItems.map((item, i) => (
          <div key={item.label} className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-700">
            <item.icon className={`w-5 h-5 ${item.color}`} />
            <span className="flex-1 text-sm text-gray-900 dark:text-white">{item.label}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{item.value}</span>
            {i === 0 ? (
              <button onClick={handleWifiTap} className="ml-1 p-1"><ChevronRight className="w-4 h-4 text-gray-400" /></button>
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}