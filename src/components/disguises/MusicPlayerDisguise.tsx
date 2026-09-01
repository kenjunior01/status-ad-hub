import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipForward, SkipBack, Heart, Repeat, Shuffle, Volume2 } from 'lucide-react'

const fakeTracks = [
  { title: 'Nwahuluhlu', artist: 'MozambicanHits', duration: '3:42' },
  { title: 'Mozambique Siyo', artist: 'Maputo Vibes', duration: '4:15' },
  { title: 'Type de Vida', artist: 'DJKuka', duration: '3:28' },
  { title: 'Xingondoco', artist: 'Lizha James', duration: '4:01' },
  { title: 'Maganha', artist: 'Azagaia', duration: '3:55' },
]

export function MusicPlayerDisguise({ onSOS }: { onSOS: () => void }) {
  const [currentTrack, setCurrentTrack] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(35)
  const skipRef = useRef({ count: 0, last: 0 })

  useEffect(() => {
    if (!isPlaying) return
    const t = setInterval(() => setProgress(p => p >= 100 ? 0 : p + 0.3), 100)
    return () => clearInterval(t)
  }, [isPlaying])

  const handleSkip = () => {
    const now = Date.now()
    if (now - skipRef.current.last < 1500) {
      skipRef.current.count++
      if (skipRef.current.count >= 5) { skipRef.current.count = 0; onSOS(); return }
    } else { skipRef.current.count = 1 }
    skipRef.current.last = now
    setCurrentTrack(t => (t + 1) % fakeTracks.length)
    setProgress(0)
  }

  const track = fakeTracks[currentTrack]
  const colors = ['from-purple-500 to-pink-500', 'from-blue-500 to-cyan-500', 'from-green-500 to-teal-500', 'from-amber-500 to-orange-500', 'from-red-500 to-rose-500']

  return (
    <div className={`min-h-screen bg-gradient-to-b ${colors[currentTrack]} flex flex-col`}>
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-48 h-48 rounded-2xl bg-black/20 backdrop-blur-sm border border-white/10 flex items-center justify-center mb-8 shadow-2xl">
          <div className="text-6xl">🎵</div>
        </div>
        <h2 className="text-white text-xl font-bold text-center">{track.title}</h2>
        <p className="text-white/60 text-sm mt-1">{track.artist}</p>
        <div className="w-full max-w-xs mt-6">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white/80 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-white/40 text-[10px] mt-1">
            <span>{Math.floor(progress * 0.037 * 60 / 100)}:{String(Math.floor((progress * 0.037) % 1 * 100)).padStart(2, '0')}</span>
            <span>{track.duration}</span>
          </div>
        </div>
      </div>
      <div className="p-8 flex flex-col items-center gap-6">
        <div className="flex items-center gap-8">
          <Shuffle className="w-5 h-5 text-white/40" />
          <SkipBack className="w-6 h-6 text-white" />
          <button onClick={() => setIsPlaying(!isPlaying)} className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-0.5" />}
          </button>
          <button onClick={handleSkip}><SkipForward className="w-6 h-6 text-white" /></button>
          <Repeat className="w-5 h-5 text-white/40" />
        </div>
        <div className="flex items-center gap-3 w-full max-w-xs">
          <Volume2 className="w-4 h-4 text-white/40" />
          <div className="flex-1 h-1 bg-white/20 rounded-full"><div className="h-full w-2/3 bg-white/40 rounded-full" /></div>
        </div>
      </div>
    </div>
  )
}