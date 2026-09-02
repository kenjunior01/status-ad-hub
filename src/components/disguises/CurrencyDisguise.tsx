import { useState, useRef } from 'react'

const rates = { MZN: 1, USD: 0.0156, ZAR: 0.28, EUR: 0.0143 }

export function CurrencyDisguise({ onSOS }: { onSOS: () => void }) {
  const [amount, setAmount] = useState('')
  const [from, setFrom] = useState<keyof typeof rates>('MZN')
  const [to, setTo] = useState<keyof typeof rates>('USD')

  // SOS: type 999
  const inputRef = useRef<HTMLInputElement>(null)
  const handleChange = (v: string) => {
    const clean = v.replace(/[^0-9.]/g, '')
    setAmount(clean)
    if (clean === '999') { onSOS(); setAmount('') }
  }

  const result = amount ? (parseFloat(amount) / rates[from] * rates[to]).toFixed(2) : '0.00'
  const currencies: (keyof typeof rates)[] = ['MZN', 'USD', 'ZAR', 'EUR']
  const flags: Record<string, string> = { MZN: '🇲🇿', USD: '🇺🇸', ZAR: '🇿🇦', EUR: '🇪🇺' }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col">
      <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Conversor de Moeda</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">De</span>
              <div className="flex gap-1">{currencies.filter(c => c !== to).map(c => (
                <button key={c} onClick={() => setFrom(c)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${from === c ? 'bg-amber-400 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>{flags[c]} {c}</button>
              ))}</div>
            </div>
            <input ref={inputRef} value={amount} onChange={e => handleChange(e.target.value)} inputMode="decimal" placeholder="0.00"
              className="w-full text-3xl font-bold text-gray-900 dark:text-white bg-transparent focus:outline-none text-right" />
          </div>
          <div className="flex justify-center text-amber-400">⇅</div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">Para</span>
              <div className="flex gap-1">{currencies.filter(c => c !== from).map(c => (
                <button key={c} onClick={() => setTo(c)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${to === c ? 'bg-amber-400 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>{flags[c]} {c}</button>
              ))}</div>
            </div>
            <div className="text-3xl font-bold text-amber-400 text-right">{flags[to]} {result}</div>
            <div className="text-xs text-gray-400 text-right mt-1">1 {from} = {(rates[to] / rates[from]).toFixed(4)} {to}</div>
          </div>
        </div>
      </div>
    </div>
  )
}