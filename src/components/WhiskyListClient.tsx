'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import WhiskyCard from '@/components/WhiskyCard'
import type { Whisky, FlavorTag } from '@/lib/types'

type Props = {
  whiskies: Whisky[]
}

const ORIGINS = ['日本', 'スコットランド', 'アメリカ', 'アイルランド', 'その他'] as const
const CATEGORIES = ['シングルモルト', 'ブレンデッド', 'バーボン', 'その他'] as const
const PRICES = ['¥3,000未満', '¥3,000〜¥10,000', '¥10,000以上'] as const
const FLAVORS = ['甘口', 'スモーキー', 'フルーティ', 'ピーティ', 'スパイシー', 'フローラル', 'ナッティ', 'ウッディ'] as const

type Section = '産地' | '種別' | '価格帯' | 'フレーバー'

type AccordionSectionProps = {
  label: string
  section: Section
  selectedLabel: string | null
  openSection: Section | null
  onToggle: (s: Section) => void
  children: React.ReactNode
}

function AccordionSection({ label, section, selectedLabel, openSection, onToggle, children }: AccordionSectionProps) {
  const isOpen = openSection === section
  return (
    <div className="border-b border-stone-200 last:border-0">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => onToggle(section)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-stone-50 transition-colors"
      >
        <span>
          {label}
          {selectedLabel && (
            <span className="ml-2 text-amber-600 font-normal">› {selectedLabel}</span>
          )}
        </span>
        <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {children}
        </div>
      )}
    </div>
  )
}

export default function WhiskyListClient({ whiskies }: Props) {
  const searchParams = useSearchParams()

  const [query, setQuery] = useState('')
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null)
  const [selectedFlavor, setSelectedFlavor] = useState<string | null>(
    searchParams.get('flavor')
  )
  const [openSection, setOpenSection] = useState<Section | null>(null)

  const lowerQuery = query.toLowerCase()
  const filtered = whiskies.filter(w => {
    if (query && !([w.name, w.distillery, w.origin].some(f => f.toLowerCase().includes(lowerQuery)))) return false
    if (selectedOrigin && w.origin !== selectedOrigin) return false
    if (selectedCategory && w.category !== selectedCategory) return false
    if (selectedPrice && w.priceRange !== selectedPrice) return false
    if (selectedFlavor && !w.flavorTags.includes(selectedFlavor as FlavorTag)) return false
    return true
  })

  const hasFilter = !!(query || selectedOrigin || selectedCategory || selectedPrice || selectedFlavor)

  const clearAll = () => {
    setQuery('')
    setSelectedOrigin(null)
    setSelectedCategory(null)
    setSelectedPrice(null)
    setSelectedFlavor(null)
    setOpenSection(null)
  }

  const toggleSection = (section: Section) =>
    setOpenSection(prev => (prev === section ? null : section))

  const toggle = <T extends string>(
    current: T | null,
    value: T,
    setter: (v: T | null) => void
  ) => setter(current === value ? null : value)

  const pillClass = (selected: boolean) =>
    selected
      ? 'bg-amber-500 text-white border border-amber-500 rounded-full px-3 py-1 text-xs font-medium'
      : 'border border-stone-200 text-gray-700 rounded-full px-3 py-1 text-xs hover:border-amber-300 transition-colors'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold">銘柄一覧</h1>
      </div>
      <p className="text-gray-500 mb-6">
        {filtered.length} 銘柄{hasFilter ? 'ヒット' : '掲載中'}
      </p>

      {/* 検索ボックス */}
      <input
        type="search"
        role="searchbox"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="銘柄名・蒸留所・産地で検索…"
        className="w-full border border-amber-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 mb-3"
      />

      {/* アコーディオンフィルター */}
      <div className="border border-stone-200 rounded-xl overflow-hidden mb-4">
        <AccordionSection label="産地" section="産地" selectedLabel={selectedOrigin} openSection={openSection} onToggle={toggleSection}>
          {ORIGINS.map(o => (
            <button
              key={o}
              type="button"
              className={pillClass(selectedOrigin === o)}
              onClick={() => toggle(selectedOrigin, o, setSelectedOrigin)}
            >
              {o}
            </button>
          ))}
        </AccordionSection>

        <AccordionSection label="種別" section="種別" selectedLabel={selectedCategory} openSection={openSection} onToggle={toggleSection}>
          {CATEGORIES.map(c => (
            <button
              key={c}
              type="button"
              className={pillClass(selectedCategory === c)}
              onClick={() => toggle(selectedCategory, c, setSelectedCategory)}
            >
              {c}
            </button>
          ))}
        </AccordionSection>

        <AccordionSection label="価格帯" section="価格帯" selectedLabel={selectedPrice} openSection={openSection} onToggle={toggleSection}>
          {PRICES.map(p => (
            <button
              key={p}
              type="button"
              className={pillClass(selectedPrice === p)}
              onClick={() => toggle(selectedPrice, p, setSelectedPrice)}
            >
              {p}
            </button>
          ))}
        </AccordionSection>

        <AccordionSection label="フレーバー" section="フレーバー" selectedLabel={selectedFlavor} openSection={openSection} onToggle={toggleSection}>
          {FLAVORS.map(f => (
            <button
              key={f}
              type="button"
              className={pillClass(selectedFlavor === f)}
              onClick={() => toggle(selectedFlavor, f, setSelectedFlavor)}
            >
              {f}
            </button>
          ))}
        </AccordionSection>
      </div>

      {/* すべてクリアボタン */}
      {hasFilter && (
        <div className="mb-6">
          <button
            type="button"
            onClick={clearAll}
            className="text-sm text-gray-400 hover:text-amber-600 transition-colors"
          >
            すべてクリア ×
          </button>
        </div>
      )}

      {/* 銘柄グリッド */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(whisky => (
          <WhiskyCard key={whisky.id} whisky={whisky} />
        ))}
      </div>
    </div>
  )
}
