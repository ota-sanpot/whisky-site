# 一部一致検索バー実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** トップページのヒーローセクションに、銘柄名・蒸留所名・産地を対象とした一部一致検索バーを追加し、入力しながらリアルタイムでドロップダウン候補を表示する。

**Architecture:** `page.tsx`（Server Component）が `getWhiskies()` で取得した全データを `SearchBar`（Client Component）に props 渡しする。フィルタリングはクライアント側の `includes()` で完結し、API ルート追加は不要。ドロップダウン項目クリックで `/whisky/[id]` へ遷移する。

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Jest + @testing-library/react

---

## ファイルマップ

| ファイル | 種別 | 役割 |
|----------|------|------|
| `src/components/SearchBar.tsx` | 新規作成 | 検索バー UI + フィルタリングロジック（Client Component） |
| `__tests__/components/SearchBar.test.tsx` | 新規作成 | SearchBar のユニットテスト |
| `src/app/page.tsx` | 既存変更 | `<SearchBar whiskies={whiskies} />` をヒーロー内に挿入 |

---

## Task 1: SearchBar コンポーネントのテストを書く（Red）

**Files:**
- Create: `__tests__/components/SearchBar.test.tsx`

- [ ] **Step 1: テストファイルを作成する**

```typescript
// __tests__/components/SearchBar.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchBar from '@/components/SearchBar'
import { Whisky } from '@/lib/types'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
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
    id: 'nikka-yoichi',
    name: '余市',
    distillery: 'ニッカウヰスキー余市蒸溜所',
    origin: '日本',
    category: 'シングルモルト',
    priceRange: '¥3,000〜¥10,000',
    alcoholContent: 45,
    flavorTags: ['スモーキー', 'フルーティ'],
    recommendedFor: '中級者向け',
    description: '石炭直火蒸溜',
    imageUrl: '',
  },
]

describe('SearchBar', () => {
  it('初期状態ではドロップダウンが表示されない', () => {
    render(<SearchBar whiskies={mockWhiskies} />)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('1文字以上入力するとドロップダウンが表示される', async () => {
    const user = userEvent.setup()
    render(<SearchBar whiskies={mockWhiskies} />)
    await user.type(screen.getByRole('searchbox'), '山')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('銘柄名（name）で部分一致検索できる', async () => {
    const user = userEvent.setup()
    render(<SearchBar whiskies={mockWhiskies} />)
    await user.type(screen.getByRole('searchbox'), '山崎')
    expect(screen.getByText('山崎 12年')).toBeInTheDocument()
    expect(screen.queryByText('ラガヴーリン 16年')).not.toBeInTheDocument()
  })

  it('蒸留所名（distillery）で部分一致検索できる', async () => {
    const user = userEvent.setup()
    render(<SearchBar whiskies={mockWhiskies} />)
    await user.type(screen.getByRole('searchbox'), 'ニッカ')
    expect(screen.getByText('余市')).toBeInTheDocument()
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
  })

  it('産地（origin）で部分一致検索できる', async () => {
    const user = userEvent.setup()
    render(<SearchBar whiskies={mockWhiskies} />)
    await user.type(screen.getByRole('searchbox'), 'スコットランド')
    expect(screen.getByText('ラガヴーリン 16年')).toBeInTheDocument()
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
  })

  it('ヒット件数が5件を超えても最大5件のみ表示される', async () => {
    const manyWhiskies: Whisky[] = Array.from({ length: 8 }, (_, i) => ({
      id: `whisky-${i}`,
      name: `日本ウイスキー ${i}`,
      distillery: `蒸留所 ${i}`,
      origin: '日本' as const,
      category: 'シングルモルト' as const,
      priceRange: '¥3,000〜¥10,000' as const,
      alcoholContent: 40,
      flavorTags: [],
      recommendedFor: '初心者向け' as const,
      description: '',
      imageUrl: '',
    }))
    const user = userEvent.setup()
    render(<SearchBar whiskies={manyWhiskies} />)
    await user.type(screen.getByRole('searchbox'), '日本')
    const items = screen.getAllByRole('button')
    expect(items.length).toBe(5)
  })

  it('マッチしない場合「見つかりません」と表示される', async () => {
    const user = userEvent.setup()
    render(<SearchBar whiskies={mockWhiskies} />)
    await user.type(screen.getByRole('searchbox'), 'zzz存在しない')
    expect(screen.getByText('見つかりません')).toBeInTheDocument()
  })

  it('ESCキーでドロップダウンが閉じる', async () => {
    const user = userEvent.setup()
    render(<SearchBar whiskies={mockWhiskies} />)
    await user.type(screen.getByRole('searchbox'), '山崎')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: テストを実行して FAIL を確認する**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
npx jest __tests__/components/SearchBar.test.tsx --no-coverage
```

期待される出力: `Cannot find module '@/components/SearchBar'` などの FAIL

---

## Task 2: SearchBar コンポーネントを実装する（Green）

**Files:**
- Create: `src/components/SearchBar.tsx`

- [ ] **Step 1: SearchBar コンポーネントを作成する**

```typescript
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
```

- [ ] **Step 2: テストを実行して PASS を確認する**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
npx jest __tests__/components/SearchBar.test.tsx --no-coverage
```

期待される出力: `Tests: 7 passed, 7 total`

- [ ] **Step 3: コミットする**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
git add src/components/SearchBar.tsx __tests__/components/SearchBar.test.tsx
git commit -m "feat: add SearchBar component with partial match search"
```

---

## Task 3: トップページに SearchBar を組み込む

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: page.tsx に SearchBar を追加する**

`src/app/page.tsx` の以下の箇所を変更する。

**変更前（ファイル先頭の import 部分）:**
```typescript
import Link from 'next/link'
import { getWhiskies } from '@/lib/notion'
import WhiskyCard from '@/components/WhiskyCard'
import FlavorTag from '@/components/FlavorTag'
import type { FlavorTag as FlavorTagType, Origin } from '@/lib/types'
```

**変更後:**
```typescript
import Link from 'next/link'
import { getWhiskies } from '@/lib/notion'
import WhiskyCard from '@/components/WhiskyCard'
import FlavorTag from '@/components/FlavorTag'
import SearchBar from '@/components/SearchBar'
import type { FlavorTag as FlavorTagType, Origin } from '@/lib/types'
```

- [ ] **Step 2: ヒーローセクションに SearchBar を挿入する**

`src/app/page.tsx` のヒーローセクション内、`<p className="text-gray-500 mb-8 ...">` の直後（`<div className="flex flex-wrap gap-3 ...">` の前）に `<SearchBar>` を挿入する。

**変更前:**
```tsx
        <p className="text-gray-500 mb-8 max-w-lg mx-auto leading-relaxed">
          初心者から愛好家まで。{whiskies.length}銘柄の中から、好みに合ったウイスキーをご紹介します。
        </p>
        <div className="flex flex-wrap gap-3 justify-center mb-12">
```

**変更後:**
```tsx
        <p className="text-gray-500 mb-6 max-w-lg mx-auto leading-relaxed">
          初心者から愛好家まで。{whiskies.length}銘柄の中から、好みに合ったウイスキーをご紹介します。
        </p>
        <SearchBar whiskies={whiskies} />
        <div className="flex flex-wrap gap-3 justify-center mb-12">
```

- [ ] **Step 3: 型エラーがないことを確認する**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
npx tsc --noEmit
```

期待される出力: エラーなし（出力なし）

- [ ] **Step 4: 全テストを実行して既存テストが壊れていないことを確認する**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
npx jest --no-coverage
```

期待される出力: 全テスト PASS

- [ ] **Step 5: コミットする**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
git add src/app/page.tsx
git commit -m "feat: integrate SearchBar into hero section on top page"
```

---

## Task 4: ブラウザで動作確認する

**Files:** なし（確認のみ）

- [ ] **Step 1: 開発サーバーを起動する**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
npm run dev
```

`http://localhost:3000` が起動することを確認する。

- [ ] **Step 2: 以下のシナリオを手動確認する**

| シナリオ | 操作 | 期待結果 |
|----------|------|----------|
| 初期表示 | ページを開く | 検索ボックスがヒーロー内に表示される |
| 銘柄名検索 | 「山崎」と入力 | 山崎系銘柄がドロップダウンに表示される |
| 蒸留所検索 | 「サントリー」と入力 | サントリー系銘柄が表示される |
| 産地検索 | 「スコット」と入力 | スコットランド産銘柄が表示される |
| 0件 | 「zzz」と入力 | 「見つかりません」が表示される |
| クリック遷移 | 結果をクリック | `/whisky/[id]` へ遷移する |
| ESCで閉じる | 入力中に ESC | ドロップダウンが閉じ入力もクリアされる |
| 外側クリック | 入力後に外側クリック | ドロップダウンが閉じる |
| スマホ幅 | 画面幅 375px で操作 | 検索ボックスが横幅に収まる |
