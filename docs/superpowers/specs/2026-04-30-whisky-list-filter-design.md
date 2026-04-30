# 銘柄一覧ページ 検索・フィルター機能 設計ドキュメント

**作成日:** 2026-04-30
**対象:** OtaSanpot/whisky-site（WhiskyGuide Japan）

---

## 概要

銘柄一覧ページ（`/whisky`）の冒頭に、キーワード検索ボックスとアコーディオン形式の絞り込みフィルターを追加する。合わせてナビゲーションの「銘柄を探す」を「銘柄一覧」に変更する。

---

## 要件

| 項目 | 内容 |
|------|------|
| Nav テキスト変更 | 「銘柄を探す」→「銘柄一覧」 |
| 検索ボックス | 銘柄名・蒸留所名・産地への部分一致（includes、大文字小文字無視） |
| フィルター軸 | 産地・種別・価格帯・フレーバーの4軸 |
| フィルター選択方式 | 各軸1つまでの単一選択 |
| フィルターUI | アコーディオン折りたたみ型（スマホ最適化） |
| フィルター結合 | 全軸をAND条件で絞り込む |
| 絞り込み結果件数 | ヘッダー部に「N 銘柄ヒット」として表示 |
| URLパラメータ連携 | `?flavor=XXX` を初期選択フレーバーとして読み込む（既存機能を継承） |
| 処理場所 | 全てクライアントサイド（output: 'export' 制約） |

---

## フィルター選択肢

| 軸 | 選択肢 |
|------|------|
| 産地 | 日本・スコットランド・アメリカ・アイルランド・その他 |
| 種別 | シングルモルト・ブレンデッド・バーボン・その他 |
| 価格帯 | ¥3,000未満・¥3,000〜¥10,000・¥10,000以上 |
| フレーバー | 甘口・スモーキー・フルーティ・ピーティ・スパイシー・フローラル・ナッティ・ウッディ |

---

## アーキテクチャ

```
src/app/whisky/page.tsx（Server Component）
  └─ getWhiskies() → Whisky[]
       └─ <Suspense>
              └─ <WhiskyListClient whiskies={whiskies} />（Client Component）
                     ├─ useSearchParams() → 初期 flavor
                     ├─ useState: query, selectedOrigin, selectedCategory,
                     │            selectedPrice, selectedFlavor, openSection
                     └─ フィルタリング → WhiskyCard のグリッド表示
```

---

## コンポーネント設計

### `src/components/Nav.tsx`（既存変更）

`銘柄を探す` → `銘柄一覧` に文言変更（1行のみ）。

### `src/components/WhiskyListClient.tsx`（既存変更）

**状態管理:**

```typescript
const [query, setQuery] = useState('')
const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null)
const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
const [selectedPrice, setSelectedPrice] = useState<string | null>(null)
const [selectedFlavor, setSelectedFlavor] = useState<string | null>(
  searchParams.get('flavor')  // URLパラメータで初期化
)
const [openSection, setOpenSection] = useState<string | null>(null)
```

**フィルタリングロジック:**

```typescript
const lowerQuery = query.toLowerCase()
const filtered = whiskies.filter(w => {
  if (query && !([w.name, w.distillery, w.origin].some(f => f.toLowerCase().includes(lowerQuery)))) return false
  if (selectedOrigin && w.origin !== selectedOrigin) return false
  if (selectedCategory && w.category !== selectedCategory) return false
  if (selectedPrice && w.priceRange !== selectedPrice) return false
  if (selectedFlavor && !(w.flavorTags as string[]).includes(selectedFlavor)) return false
  return true
})
```

**アコーディオン動作:**

- `openSection` に現在開いているセクション名を保持
- 同じセクションを再タップ → `null`（閉じる）
- 別セクションをタップ → そのセクション名（他は閉じる）
- 選択済みの値をタップ → 選択解除（`null` に戻す）
- 選択中の値はアコーディオンヘッダーに `産地 › 日本` 形式で表示

**UI 構成（`WhiskyListClient` の return）:**

```
<div>
  ├─ ページヘッダー（「銘柄一覧」＋アクティブフィルターバッジ）
  ├─ 件数表示（「N 銘柄ヒット」）
  ├─ 検索ボックス（<input type="search">）
  ├─ アコーディオンフィルター
  │   ├─ 産地セクション
  │   ├─ 種別セクション
  │   ├─ 価格帯セクション
  │   └─ フレーバーセクション
  ├─ すべてクリアボタン（いずれかフィルター選択時のみ表示）
  └─ WhiskyCard グリッド
```

---

## スタイリング方針

既存の Tailwind CSS スタイルに合わせる。

- アコーディオンヘッダー: `bg-stone-50 border border-stone-200`
- 選択済みピル: `bg-amber-500 text-white`
- 未選択ピル: `border border-stone-200 text-gray-700 hover:border-amber-300`
- 検索ボックス: 既存 SearchBar と同一スタイル（`border-amber-400`）

---

## 影響範囲

| ファイル | 変更種別 |
|----------|---------|
| `src/components/Nav.tsx` | 文言変更のみ |
| `src/components/WhiskyListClient.tsx` | 検索・フィルターUI を追加 |

`src/app/whisky/page.tsx` への変更なし。既存の SearchBar（トップページ）への影響なし。

---

## 非対応事項（スコープ外）

- フィルター条件のURLパラメータ化（ブックマーク共有）
- 複数選択（各軸は単一選択のみ）
- ソート機能（価格順・名前順など）
