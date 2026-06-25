export type FlavorTag =
  | '甘口'
  | 'スモーキー'
  | 'フルーティ'
  | 'ピーティ'
  | 'スパイシー'
  | 'フローラル'
  | 'ナッティ'
  | 'ウッディ'

export type Origin = '日本' | 'スコットランド' | 'アメリカ' | 'アイルランド' | 'その他'
export type Category = 'シングルモルト' | 'ブレンデッド' | 'バーボン' | 'その他'
export type PriceRange = '¥3,000未満' | '¥3,000〜¥10,000' | '¥10,000以上'
export type RecommendedFor = '初心者向け' | '中級者向け' | '上級者向け'

export type Whisky = {
  id: string
  name: string
  distillery: string
  origin: Origin
  category: Category
  priceRange: PriceRange
  alcoholContent: number
  flavorTags: FlavorTag[]
  recommendedFor: RecommendedFor
  description: string
  imageUrl: string
}

export type ArticleSection = {
  heading: string
  paragraphs: string[]
  embedHtml?: string
}

export type Article = {
  slug: string
  title: string
  summary: string
  publishedAt: string
  category: string
  tags: string[]
  coverEmoji: string
  sections: ArticleSection[]
}

export type FinderAnswers = {
  origin: Origin | 'こだわらない'
  drinkingStyle: 'ストレート' | 'ロック' | '水割り' | 'ハイボール' | 'カクテル'
  scene: '自宅でゆっくり' | '特別な日に' | '贈り物に' | '食事と一緒に'
  selectedFlavors: FlavorTag[]
}
