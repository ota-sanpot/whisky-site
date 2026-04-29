// src/components/SearchBar.tsx
'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Whisky } from '@/lib/types'

type Props = {
  whiskies: Whisky[]
}

export default function SearchBar({ whiskies }: Props) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const filtered = query.length > 0
    ? whiskies.filter(w =>
        [w.name, w.distillery, w.origin].some(field =>
          field.toLowerCase().includes(query.toLowerCase())
        )
      ).slice(0, 5)
    : []

  const showDropdown = query.length > 0 && isOpen

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setQuery('')
    }
  }

  const handleSelect = (whisky: Whisky) => {
    setIsOpen(false)
    setQuery('')
    router.push(`/whisky/${whisky.id}`)
  }

  const handleBlur = (e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative max-w-md mx-auto mb-8" onBlur={handleBlur}>
      <div className="flex gap-2">
        <input
          type="search"
          role="searchbox"
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder="銘柄名・蒸留所・産地で検索…"
          className="flex-1 border border-amber-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={showDropdown}
        />
      </div>

      {showDropdown && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-50 overflow-hidden"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-400">見つかりません</li>
          ) : (
            filtered.map(whisky => (
              <li key={whisky.id}>
                <button
                  type="button"
                  onMouseDown={() => handleSelect(whisky)}
                  className="w-full text-left px-4 py-3 hover:bg-amber-50 transition-colors border-b border-stone-100 last:border-0"
                >
                  <p className="text-sm font-medium text-gray-800">{whisky.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{whisky.distillery} · {whisky.origin}</p>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
