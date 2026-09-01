import { useState, useRef } from 'react'
import { Sun } from 'lucide-react'

export function FlashlightDisguise({ onSOS }: { onSOS: () => void }) {
  const [brightness, setBrightness] = useState(100)
  const tapRef = useRef({ count: 0, last: 0 })

  const handleIconTap = () => {
    const now = Date.now()
    if (now - tapRef.current.last < 1000) {
      tapRef.current.count++
      if (tapRef.current.count >= 3) { tapRef.current.count = 0; onSOS() }
    } else { tapRef.current.count = 1 }
    tapRef.current.last = now
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black" style={{ backgroundColor: `rgba(255,255,255,${brightness / 100})` }}>
      <button onClick={handleIconTap} className="mb-12">
        <Sun className={`w-16 h-16 ${brightness > 50 ? 'text-amber-500' : 'text-gray-400'}`} />
      </button>
      <div className="w-64 flex flex-col items-center gap-3">
        <input type="range" min={5} max={100} value={brightness} onChange={e => setBrightness(Number(e.target.value))}
          className="w-full accent-amber-500" />
        <span className="text-sm font-mono text-gray-600">{brightness}%</span>
      </div>
    </div>
  )
}