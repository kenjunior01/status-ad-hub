import { useState, useRef } from 'react'
import { Search, Phone, MessageSquare } from 'lucide-react'

const fakeContacts = [
  { name: 'Ana Silva', phone: '+258 84 123 4567', initials: 'AS', color: '#3B82F6' },
  { name: 'Carlos Machava', phone: '+258 85 234 5678', initials: 'CM', color: '#10B981' },
  { name: 'Domingos Tembe', phone: '+258 86 345 6789', initials: 'DT', color: '#F59E0B' },
  { name: 'Elena Nhaca', phone: '+258 84 456 7890', initials: 'EN', color: '#EC4899' },
  { name: 'Fernando Cossa', phone: '+258 85 567 8901', initials: 'FC', color: '#8B5CF6' },
  { name: 'Graça Mondlane', phone: '+258 86 678 9012', initials: 'GM', color: '#06B6D4' },
  { name: 'Helder Sitoe', phone: '+258 84 789 0123', initials: 'HS', color: '#EF4444' },
  { name: 'Inês Chissano', phone: '+258 85 890 1234', initials: 'IC', color: '#F97316' },
]

export function ContactsDisguise({ onSOS }: { onSOS: () => void }) {
  const [search, setSearch] = useState('')
  const tapRef = useRef({ count: 0, last: 0 })

  const handleTitleTap = () => {
    const now = Date.now()
    if (now - tapRef.current.last < 800) {
      tapRef.current.count++
      if (tapRef.current.count >= 5) { tapRef.current.count = 0; onSOS() }
    } else { tapRef.current.count = 1 }
    tapRef.current.last = now
  }

  const filtered = fakeContacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  )

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0">
        <h1 onClick={handleTitleTap} className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Contactos</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar"
            className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none" />
        </div>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {filtered.map(c => (
          <div key={c.name} className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: c.color }}>{c.initials}</div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{c.phone}</div>
            </div>
            <div className="flex gap-2">
              <button className="p-2 rounded-full bg-green-100 dark:bg-green-900/30"><Phone className="w-3.5 h-3.5 text-green-600" /></button>
              <button className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30"><MessageSquare className="w-3.5 h-3.5 text-blue-600" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}