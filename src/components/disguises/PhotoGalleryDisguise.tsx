import { useState, useRef } from 'react'
import { Heart, Share2, Download, Grid3X3, X } from 'lucide-react'

const fakePhotos = [
  { id: 1, color: 'from-amber-400 to-orange-500', likes: 42, label: 'Por do sol' },
  { id: 2, color: 'from-blue-400 to-cyan-500', likes: 87, label: 'Praia' },
  { id: 3, color: 'from-green-400 to-emerald-500', likes: 23, label: 'Jardim' },
  { id: 4, color: 'from-purple-400 to-pink-500', likes: 156, label: 'Festa' },
  { id: 5, color: 'from-red-400 to-rose-500', likes: 31, label: 'Comida' },
  { id: 6, color: 'from-sky-400 to-blue-500', likes: 64, label: 'Ceu' },
  { id: 7, color: 'from-teal-400 to-cyan-500', likes: 98, label: 'Piscina' },
  { id: 8, color: 'from-yellow-400 to-amber-500', likes: 45, label: 'Cafe' },
  { id: 9, color: 'from-indigo-400 to-violet-500', likes: 112, label: 'Noite' },
]

export function PhotoGalleryDisguise({ onSOS }: { onSOS: () => void }) {
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null)
  const [liked, setLiked] = useState<Set<number>>(new Set([2, 4]))
  const tabRef = useRef({ count: 0, last: 0 })

  const handleDoubleTap = () => {
    const now = Date.now()
    if (now - tabRef.current.last < 500) {
      tabRef.current.count++
      if (tabRef.current.count >= 4) { tabRef.current.count = 0; onSOS(); return }
    } else { tabRef.current.count = 1 }
    tabRef.current.last = now
  }

  const toggleLike = (id: number) => {
    setLiked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  if (selectedPhoto !== null) {
    const photo = fakePhotos[selectedPhoto]
    return (
      <div className="bg-black min-h-screen flex flex-col" onClick={handleDoubleTap}>
        <div className="flex items-center justify-between p-4">
          <button onClick={(e) => { e.stopPropagation(); setSelectedPhoto(null) }} className="text-white/60"><X className="w-5 h-5" /></button>
          <div className="flex items-center gap-4">
            <button onClick={(e) => { e.stopPropagation(); toggleLike(photo.id) }} className="text-white/60">
              <Heart className={liked.has(photo.id) ? 'w-5 h-5 text-red-500 fill-red-500' : 'w-5 h-5'} />
            </button>
            <Share2 className="w-5 h-5 text-white/60" />
            <Download className="w-5 h-5 text-white/60" />
          </div>
        </div>
        <div className={`flex-1 bg-gradient-to-br ${photo.color} m-4 rounded-2xl flex items-center justify-center`}>
          <span className="text-white/20 text-6xl">📷</span>
        </div>
        <div className="p-4 text-center">
          <p className="text-white font-medium">{photo.label}</p>
          <p className="text-white/40 text-xs mt-1">{photo.likes + (liked.has(photo.id) ? 1 : 0)} curtidas</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900 dark:text-white">Galeria</h1>
        <Grid3X3 className="w-5 h-5 text-gray-400" />
      </div>
      {/* Grid */}
      <div className="grid grid-cols-3 gap-0.5 p-0.5" onClick={handleDoubleTap}>
        {fakePhotos.map((photo, i) => (
          <button key={photo.id} onClick={(e) => { e.stopPropagation(); setSelectedPhoto(i) }}
            className={`aspect-square bg-gradient-to-br ${photo.color} relative overflow-hidden`}>
            {liked.has(photo.id) && (
              <Heart className="absolute bottom-1 right-1 w-3 h-3 text-white fill-white drop-shadow" />
            )}
          </button>
        ))}
      </div>
      {/* Bottom tab bar */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around py-2">
        {['Fotos', 'Albuns', 'Favoritos'].map(tab => (
          <div key={tab} className="text-center">
            <div className={`text-[10px] ${tab === 'Fotos' ? 'text-blue-500 font-medium' : 'text-gray-400'}`}>{tab}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
