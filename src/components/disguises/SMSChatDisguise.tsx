import { useState, useRef, useEffect } from 'react'

const fakeMessages = [
  { from: 'Maria', text: 'Ola! Ja chegaste?', time: '14:32', me: false },
  { from: 'Eu', text: 'Sim, a caminhar agora', time: '14:35', me: true },
  { from: 'Maria', text: 'Beleza, toma cuidado!', time: '14:35', me: false },
  { from: 'Eu', text: 'Obrigado, ja te aviso', time: '14:36', me: true },
]

export function SMSChatDisguise({ onSOS }: { onSOS: () => void }) {
  const [text, setText] = useState('')
  const [messages, setMessages] = useState(fakeMessages)

  const handleSend = () => {
    if (!text.trim()) return
    const msg = text.trim().toUpperCase()
    if (msg === 'HELP' || msg === 'SOS' || msg === 'SOCORRO') {
      setText('')
      onSOS()
      return
    }
    setMessages(prev => [...prev, { from: 'Eu', text: text.trim(), time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), me: true }])
    setText('')
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen flex flex-col">
      <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-sm font-semibold text-gray-900 dark:text-white">Maria</h1>
        <p className="text-[10px] text-amber-400">Online</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.me ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${m.me
              ? 'bg-amber-400 text-white rounded-br-sm'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm border border-gray-200 dark:border-gray-700'
            }`}>
              <p>{m.text}</p>
              <p className={`text-[9px] mt-1 ${m.me ? 'text-amber-100' : 'text-gray-400'}`}>{m.time}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Mensagem..." className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-900 dark:text-white focus:outline-none" />
          <button onClick={handleSend} className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center">
            <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}