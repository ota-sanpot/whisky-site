import type { Whisky, FlavorTag } from './types'

type ServingTip = { method: string; description: string }

const SERVING_PRIORITIES: Record<string, ServingTip[]> = {
  high_abv: [
    { method: 'トワイスアップ', description: '常温の水を同量加えることで香りが開き、高アルコールでも飲みやすくなります。' },
    { method: 'ストレート', description: '少量を口に含み、ゆっくり味わってください。' },
  ],
  smoky_peaty: [
    { method: 'ストレート', description: 'スモーキーな個性を最大限に楽しむならまずはストレートで。' },
    { method: 'トワイスアップ', description: '水を加えると煙の奥に隠れた甘みやフルーティさが現れます。' },
  ],
  sweet_fruity: [
    { method: 'ハイボール', description: '炭酸水で割ることで甘みとフルーティさが引き立ちます。食事にも合わせやすい。' },
    { method: 'ロック', description: '冷やすことで甘みが際立ち、より飲みやすくなります。' },
  ],
  bourbon: [
    { method: 'ロック', description: '大きな氷で冷やすとバニラとキャラメルの甘さが引き立ちます。' },
    { method: 'ハイボール', description: 'バーボンのコクが炭酸でさっぱりとし、食事にも合う一杯に。' },
  ],
  light: [
    { method: 'ハイボール', description: '軽快な飲み口がさらに爽やかに。食中酒として最適です。' },
    { method: '水割り', description: '穏やかな風味をゆったり楽しむのに向いています。' },
  ],
}

export function getServingTips(whisky: Whisky): ServingTip[] {
  if (whisky.alcoholContent >= 50) return SERVING_PRIORITIES.high_abv
  if (whisky.flavorTags.includes('スモーキー') || whisky.flavorTags.includes('ピーティ')) {
    return SERVING_PRIORITIES.smoky_peaty
  }
  if (whisky.category === 'バーボン') return SERVING_PRIORITIES.bourbon
  if (whisky.flavorTags.includes('甘口') || whisky.flavorTags.includes('フルーティ')) {
    return SERVING_PRIORITIES.sweet_fruity
  }
  return SERVING_PRIORITIES.light
}

type PairingItem = { food: string; reason: string }

const FLAVOR_PAIRINGS: Record<FlavorTag, PairingItem[]> = {
  '甘口':     [
    { food: 'ビターチョコレート', reason: 'ウイスキーの甘みとチョコの苦みが引き立て合います。' },
    { food: 'ドライフルーツ', reason: 'シェリー樽由来の甘みと同調し、まろやかさが増します。' },
  ],
  'スモーキー': [
    { food: 'スモークチーズ', reason: 'スモーク同士が共鳴し、一体感のある組み合わせに。' },
    { food: '燻製サーモン', reason: 'ヨード香と魚介のうまみが絶妙に合います。' },
  ],
  'フルーティ': [
    { food: 'フルーツタルト', reason: 'フレッシュな果実感が同調し、お互いを引き立てます。' },
    { food: '軽めのチーズ（ブリーなど）', reason: 'クリーミーさがフルーティさを包みます。' },
  ],
  'ピーティ': [
    { food: '生牡蠣', reason: '海の塩気とアイラのヨード香が見事に共鳴します。' },
    { food: 'スモークビーフ', reason: 'ピートの煙感と肉の旨みが一体化します。' },
  ],
  'スパイシー': [
    { food: '肉料理（ステーキ・BBQ）', reason: 'スパイシーな余韻が肉の旨みを引き立てます。' },
    { food: 'スパイシーカレー', reason: 'スパイスが共鳴し、互いを高め合います。' },
  ],
  'フローラル': [
    { food: '和菓子（羊羹・最中）', reason: '花の香りとやさしい甘みが調和する日本的な組み合わせ。' },
    { food: '白身魚の塩焼き', reason: '繊細な風味同士がぶつからず上品に合います。' },
  ],
  'ナッティ': [
    { food: 'アーモンドチョコレート', reason: 'ナッツの香ばしさが共鳴し、まろやかさが増します。' },
    { food: 'チーズ盛り合わせ', reason: 'セミハードチーズの塩気とナッティさが好相性。' },
  ],
  'ウッディ': [
    { food: 'ダークチョコレート', reason: '樽の渋みとチョコのビターさが溶け合います。' },
    { food: '熟成チーズ（チェダーなど）', reason: '熟成感同士が響き合い、複雑さが増します。' },
  ],
}

export function getFoodPairings(whisky: Whisky): PairingItem[] {
  const seen = new Set<string>()
  const result: PairingItem[] = []
  for (const tag of whisky.flavorTags) {
    for (const item of FLAVOR_PAIRINGS[tag] ?? []) {
      if (!seen.has(item.food)) {
        seen.add(item.food)
        result.push(item)
      }
      if (result.length >= 4) return result
    }
  }
  return result
}

export function getRelatedWhiskies(whisky: Whisky, all: Whisky[]): Whisky[] {
  return all
    .filter(w => w.id !== whisky.id)
    .map(w => {
      const sharedFlavors = w.flavorTags.filter(t => whisky.flavorTags.includes(t)).length
      const sameOrigin = w.origin === whisky.origin ? 2 : 0
      return { whisky: w, score: sharedFlavors + sameOrigin }
    })
    .filter(({ score }) => score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ whisky: w }) => w)
}

export function getFlavorScores(whisky: Whisky): Record<FlavorTag, number> {
  const ALL_TAGS: FlavorTag[] = ['甘口', 'スモーキー', 'フルーティ', 'ピーティ', 'スパイシー', 'フローラル', 'ナッティ', 'ウッディ']
  return Object.fromEntries(
    ALL_TAGS.map(tag => [tag, whisky.flavorTags.includes(tag) ? 1 : 0])
  ) as Record<FlavorTag, number>
}
