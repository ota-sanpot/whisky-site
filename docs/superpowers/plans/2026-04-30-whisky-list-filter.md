# 銘柄一覧 検索・フィルター実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 銘柄一覧ページ冒頭にキーワード検索とアコーディオン型4軸フィルター（産地・種別・価格帯・フレーバー）を追加し、ナビの「銘柄を探す」を「銘柄一覧」に変更する。

**Architecture:** `WhiskyListClient`（Client Component）内に全156銘柄のデータが渡されており、`useState` で検索クエリと4つのフィルター選択値を管理してクライアントサイドで絞り込む。静的エクスポート（`output: 'export'`）制約のため、サーバー側の処理は不要。

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Jest + @testing-library/react

---

## ファイルマップ

| ファイル | 種別 | 役割 |
|----------|------|------|
| `src/components/Nav.tsx` | 既存変更 | 「銘柄を探す」→「銘柄一覧」文言変更 |
| `src/components/WhiskyListClient.tsx` | 既存変更 | 検索ボックス＋アコーディオンフィルターUI＋絞り込みロジックを追加 |
| `__tests__/components/WhiskyListClient.test.tsx` | 新規作成 | WhiskyListClient のユニットテスト |

---

## Task 1: Nav テキスト変更

**Files:**
- Modify: `src/components/Nav.tsx:11`

- [ ] **Step 1: Nav.tsx を変更する**

`/Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site/src/components/Nav.tsx` の11行目を変更する。

**変更前:**
```tsx
          <Link href="/whisky" className="whitespace-nowrap hover:text-amber-700 transition-colors">銘柄を探す</Link>
```

**変更後:**
```tsx
          <Link href="/whisky" className="whitespace-nowrap hover:text-amber-700 transition-colors">銘柄一覧</Link>
```

- [ ] **Step 2: 全テストを実行してエラーがないことを確認する**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
npx jest --no-coverage
```

期待: 全テスト PASS

- [ ] **Step 3: コミットする**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
git add src/components/Nav.tsx
git commit -m "fix: rename nav item from 銘柄を探す to 銘柄一覧"
```

---

## Task 2: WhiskyListClient テストを書く（Red）

**Files:**
- Create: `__tests__/components/WhiskyListClient.test.tsx`

- [ ] **Step 1: テストファイルを作成する**

```typescript
// __tests__/components/WhiskyListClient.test.tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Suspense } from 'react'
import WhiskyListClient from '@/components/WhiskyListClient'
import type { Whisky } from '@/lib/types'

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

const mockWhiskies: Whisky[] = [
  {
    id: 'yamazaki-12',
    name: '山崎 12年',
    distillery: 'サントリー山崎蒸留所',
    origin: '日本',
    category: 'シングルモルト',
    priceRange: '¥10,000以上',
    alcoholContent: 43,
    flavorTags: ['甘口', 'フルーティ'],
    recommendedFor: '初心者向け',
    description: '滑らかな甘さ',
    imageUrl: '',
  },
  {
    id: 'lagavulin-16',
    name: 'ラガヴーリン 16年',
    distillery: 'ラガヴーリン蒸留所',
    origin: 'スコットランド',
    category: 'シングルモルト',
    priceRange: '¥10,000以上',
    alcoholContent: 43,
    flavorTags: ['スモーキー', 'ピーティ'],
    recommendedFor: '上級者向け',
    description: '力強いピート香',
    imageUrl: '',
  },
  {
    id: 'wild-turkey',
    name: 'ワイルドターキー',
    distillery: 'ワイルドターキー蒸留所',
    origin: 'アメリカ',
    category: 'バーボン',
    priceRange: '¥3,000〜¥10,000',
    alcoholContent: 50,
    flavorTags: ['スパイシー', '甘口'],
    recommendedFor: '中級者向け',
    description: 'スパイシーなバーボン',
    imageUrl: '',
  },
]

const renderWithSuspense = (ui: React.ReactElement) =>
  render(<Suspense fallback={null}>{ui}</Suspense>)

describe('WhiskyListClient', () => {
  it('初期状態で全銘柄を表示する', () => {
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    expect(screen.getByText('山崎 12年')).toBeInTheDocument()
    expect(screen.getByText('ラガヴーリン 16年')).toBeInTheDocument()
    expect(screen.getByText('ワイルドターキー')).toBeInTheDocument()
  })

  it('キーワード検索で銘柄名を部分一致で絞り込む', async () => {
    const user = userEvent.setup()
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    await user.type(screen.getByRole('searchbox'), '山崎')
    expect(screen.getByText('山崎 12年')).toBeInTheDocument()
    expect(screen.queryByText('ラガヴーリン 16年')).not.toBeInTheDocument()
  })

  it('キーワード検索で蒸留所名を部分一致で絞り込む', async () => {
    const user = userEvent.setup()
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    await user.type(screen.getByRole('searchbox'), 'ラガヴーリン蒸留所')
    expect(screen.getByText('ラガヴーリン 16年')).toBeInTheDocument()
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
  })

  it('産地フィルターで絞り込む', async () => {
    const user = userEvent.setup()
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    await user.click(screen.getByText('産地'))
    await user.click(screen.getByRole('button', { name: 'アメリカ' }))
    expect(screen.getByText('ワイルドターキー')).toBeInTheDocument()
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
  })

  it('種別フィルターで絞り込む', async () => {
    const user = userEvent.setup()
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    await user.click(screen.getByText('種別'))
    await user.click(screen.getByRole('button', { name: 'バーボン' }))
    expect(screen.getByText('ワイルドターキー')).toBeInTheDocument()
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
  })

  it('価格帯フィルターで絞り込む', async () => {
    const user = userEvent.setup()
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    await user.click(screen.getByText('価格帯'))
    await user.click(screen.getByRole('button', { name: '¥3,000〜¥10,000' }))
    expect(screen.getByText('ワイルドターキー')).toBeInTheDocument()
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
  })

  it('フレーバーフィルターで絞り込む', async () => {
    const user = userEvent.setup()
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    await user.click(screen.getByText('フレーバー'))
    await user.click(screen.getByRole('button', { name: 'スモーキー' }))
    expect(screen.getByText('ラガヴーリン 16年')).toBeInTheDocument()
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
  })

  it('複数軸のフィルターをANDで結合する', async () => {
    const user = userEvent.setup()
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    await user.click(screen.getByText('産地'))
    await user.click(screen.getByRole('button', { name: 'アメリカ' }))
    await user.click(screen.getByText('種別'))
    await user.click(screen.getByRole('button', { name: 'シングルモルト' }))
    expect(screen.queryByText('ワイルドターキー')).not.toBeInTheDocument()
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
  })

  it('選択済みのフィルターを再クリックで解除する', async () => {
    const user = userEvent.setup()
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    await user.click(screen.getByText('産地'))
    await user.click(screen.getByRole('button', { name: 'アメリカ' }))
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'アメリカ' }))
    expect(screen.getByText('山崎 12年')).toBeInTheDocument()
  })

  it('すべてクリアボタンでフィルターを全解除する', async () => {
    const user = userEvent.setup()
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    await user.click(screen.getByText('産地'))
    await user.click(screen.getByRole('button', { name: 'アメリカ' }))
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /すべてクリア/ }))
    expect(screen.getByText('山崎 12年')).toBeInTheDocument()
    expect(screen.getByText('ラガヴーリン 16年')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: テストを実行して FAIL を確認する**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
npx jest __tests__/components/WhiskyListClient.test.tsx --no-coverage
```

期待: テストが失敗する（WhiskyListClient にフィルターUIが存在しないため）

- [ ] **Step 3: コミットする**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
git add __tests__/components/WhiskyListClient.test.tsx
git commit -m "test: add WhiskyListClient filter tests (Red)"
```

---

## Task 3: WhiskyListClient にフィルターUIを実装する（Green）

**Files:**
- Modify: `src/components/WhiskyListClient.tsx`

- [ ] **Step 1: WhiskyListClient.tsx を完全に書き換える**

`/Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site/src/components/WhiskyListClient.tsx` を以下の内容に書き換える:

```typescript
'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import WhiskyCard from '@/components/WhiskyCard'
import type { Whisky } from '@/lib/types'

type Props = {
  whiskies: Whisky[]
}

const ORIGINS = ['日本', 'スコットランド', 'アメリカ', 'アイルランド', 'その他'] as const
const CATEGORIES = ['シングルモルト', 'ブレンデッド', 'バーボン', 'その他'] as const
const PRICES = ['¥3,000未満', '¥3,000〜¥10,000', '¥10,000以上'] as const
const FLAVORS = ['甘口', 'スモーキー', 'フルーティ', 'ピーティ', 'スパイシー', 'フローラル', 'ナッティ', 'ウッディ'] as const

type Section = '産地' | '種別' | '価格帯' | 'フレーバー'

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
    if (selectedFlavor && !(w.flavorTags as string[]).includes(selectedFlavor)) return false
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

  const AccordionSection = ({
    label,
    section,
    children,
    selectedLabel,
  }: {
    label: string
    section: Section
    children: React.ReactNode
    selectedLabel: string | null
  }) => {
    const isOpen = openSection === section
    return (
      <div className="border-b border-stone-200 last:border-0">
        <button
          type="button"
          onClick={() => toggleSection(section)}
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
        <AccordionSection label="産地" section="産地" selectedLabel={selectedOrigin}>
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

        <AccordionSection label="種別" section="種別" selectedLabel={selectedCategory}>
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

        <AccordionSection label="価格帯" section="価格帯" selectedLabel={selectedPrice}>
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

        <AccordionSection label="フレーバー" section="フレーバー" selectedLabel={selectedFlavor}>
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
```

- [ ] **Step 2: テストを実行して PASS を確認する**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
npx jest __tests__/components/WhiskyListClient.test.tsx --no-coverage
```

期待: `Tests: 9 passed, 9 total`

- [ ] **Step 3: 全テストを実行して既存テストが壊れていないことを確認する**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
npx jest --no-coverage
```

期待: 全テスト PASS

- [ ] **Step 4: 型エラーがないことを確認する**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
npx tsc --noEmit
```

期待: エラーなし

- [ ] **Step 5: 本番ビルドが通ることを確認する**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
npm run build 2>&1 | grep -E "(error|Error|✓|Export)" | head -10
```

期待: `✓ Generating static pages` が表示され、エラーなし

- [ ] **Step 6: コミットする**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
git add src/components/WhiskyListClient.tsx
git commit -m "feat: add keyword search and accordion filter to whisky list page"
```

---

## Task 4: ブラウザで動作確認する

**Files:** なし（確認のみ）

- [ ] **Step 1: 開発サーバーを起動する**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
npm run dev
```

`http://localhost:3000/whisky` を開く。

- [ ] **Step 2: 以下のシナリオを手動確認する**

| シナリオ | 操作 | 期待結果 |
|----------|------|----------|
| Navテキスト | ヘッダーを確認 | 「銘柄一覧」と表示される |
| 初期表示 | `/whisky` を開く | 検索ボックスとアコーディオンが表示される |
| キーワード検索 | 「山崎」と入力 | 山崎系銘柄のみ表示される |
| 産地フィルター | 「産地」をタップ → 「日本」を選択 | 日本産銘柄のみ表示、ヘッダーに「産地 › 日本」表示 |
| アコーディオン排他 | 「種別」をタップ | 産地が閉じて種別が開く |
| 選択解除 | 選択中の「日本」を再タップ | フィルター解除される |
| AND結合 | 産地「日本」＋種別「ブレンデッド」を選択 | 両条件を満たす銘柄のみ |
| すべてクリア | 「すべてクリア ×」をタップ | 全フィルター解除、全銘柄表示 |
| URLパラメータ | `/whisky?flavor=甘口` を開く | 甘口フィルターが初期選択済み |
| スマホ幅 | 375px 幅で操作 | タップしやすく表示が崩れない |
