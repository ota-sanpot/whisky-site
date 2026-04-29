# 一部一致検索機能 設計ドキュメント

**作成日:** 2026-04-30  
**対象:** OtaSanpot/whisky-site（WhiskyGuide Japan）

---

## 概要

トップページのヒーローセクションに、銘柄名・蒸留所名・産地を対象とした一部一致検索バーを追加する。入力しながらリアルタイムでドロップダウン候補を表示し、クリックで銘柄詳細ページへ遷移する。

---

## 要件

| 項目 | 内容 |
|------|------|
| 配置 | トップページ ヒーローセクション内（説明文の下・CTAボタンの上） |
| 入力形式 | テキストボックス（プレースホルダー: 「銘柄名・蒸留所・産地で検索…」） |
| 検索対象フィールド | `name`（銘柄名）、`distillery`（蒸留所名）、`origin`（産地） |
| マッチング方式 | 部分一致（`includes()`）、大文字小文字無視 |
| 結果表示 | ドロップダウン形式（最大5件） |
| 表示タイミング | 1文字以上入力した時点で表示 |
| ヒット0件 | 「見つかりません」メッセージを表示 |
| クリック動作 | `/whisky/[id]` へ遷移 |
| ドロップダウンを閉じる | ESCキー / 外側クリック |

---

## アーキテクチャ

### データフロー

```
src/app/page.tsx（Server Component）
  └─ getWhiskies() → Whisky[]
       └─ <SearchBar whiskies={whiskies} />（Client Component）
              └─ query state 変更 → フィルタリング → ドロップダウン描画
                     └─ 銘柄クリック → router.push('/whisky/[id]')
```

### なぜクライアント側フィルタリングか

- ウイスキーデータは数十件規模のため、全件クライアントに渡しても十分高速
- API ルート不要でシンプルな実装になる
- `page.tsx` は引き続き Server Component のまま維持できる

---

## コンポーネント設計

### `src/components/SearchBar.tsx`（新規）

```typescript
'use client'

type Props = {
  whiskies: Whisky[]
}
```

**状態管理:**
- `query: string` — 入力テキスト
- `isOpen: boolean` — ドロップダウン表示フラグ

**フィルタリングロジック:**

```typescript
const filtered = whiskies.filter(w =>
  [w.name, w.distillery, w.origin].some(field =>
    field.toLowerCase().includes(query.toLowerCase())
  )
).slice(0, 5)
```

**UI 要素:**
- `<input>` — 検索テキストボックス
- ドロップダウン `<ul>` — 各銘柄を `<li>` で表示（銘柄名 + 蒸留所名・産地）
- 0件時: 「見つかりません」テキスト

**イベント処理:**
- `onChange` → `query` 更新、`isOpen: true`
- `onKeyDown(Escape)` → `isOpen: false`、`query` クリア
- `useEffect` + `document.addEventListener('mousedown')` → 外側クリックで閉じる
- ドロップダウン項目クリック → `router.push('/whisky/[id]')`

### `src/app/page.tsx`（既存・変更）

ヒーローセクション内の説明文 `<p>` とCTAボタン `<div>` の間に `<SearchBar whiskies={whiskies} />` を挿入する。

---

## スタイリング

既存の Tailwind CSS スタイルに合わせる。

- 入力ボックス: `border-amber-400 focus:ring-amber-400 rounded-lg`
- ドロップダウン: `bg-white border border-stone-200 rounded-xl shadow-lg`
- ホバー行: `hover:bg-amber-50`
- 産地・蒸留所テキスト: `text-xs text-gray-400`

---

## 影響範囲

| ファイル | 変更種別 |
|----------|----------|
| `src/components/SearchBar.tsx` | 新規作成 |
| `src/app/page.tsx` | `<SearchBar>` を挿入 |

既存の `/whisky` 一覧ページ、`/finder`、各銘柄詳細ページへの影響なし。

---

## 非対応事項（スコープ外）

- フレーバータグ・価格帯・熟成年数での絞り込み（既存の Finder App が担当）
- 検索結果のハイライト表示
- キーボードナビゲーション（↑↓キーで候補選択）
- 銘柄一覧ページへの検索機能追加
