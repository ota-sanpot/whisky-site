import { Whisky, FinderAnswers, FlavorTag } from './types'

// 飲み方ごとにボーナスが付くフレーバータグのマッピング
const DRINKING_STYLE_FLAVORS: Record<FinderAnswers['drinkingStyle'], FlavorTag[]> = {
  'ストレート': ['スモーキー', 'ウッディ', 'スパイシー'],
  'ロック':     ['スパイシー', 'ウッディ'],
  '水割り':     ['フローラル', '甘口', 'フルーティ'],
  'ハイボール': ['フルーティ', '甘口'],
  'カクテル':   ['甘口', 'フルーティ'],
}

/**
 * ウイスキーと回答の相性スコアを計算する
 * - 産地一致: +3
 * - 選択フレーバー一致: タグ1つにつき +2
 * - 飲み方ボーナスフレーバー一致: タグ1つにつき +1
 */
export function scoreWhisky(whisky: Whisky, answers: FinderAnswers): number {
  let score = 0

  // 産地ボーナス
  if (answers.origin !== 'こだわらない' && whisky.origin === answers.origin) {
    score += 3
  }

  // 選択フレーバーボーナス
  for (const flavor of answers.selectedFlavors) {
    if (whisky.flavorTags.includes(flavor)) score += 2
  }

  // 飲み方ボーナス
  for (const flavor of DRINKING_STYLE_FLAVORS[answers.drinkingStyle]) {
    if (whisky.flavorTags.includes(flavor)) score += 1
  }

  return score
}

/**
 * スコア上位のウイスキーを返す（元の配列は変更しない）
 */
export function getTopMatches(whiskies: Whisky[], answers: FinderAnswers, count = 3): Whisky[] {
  return [...whiskies]
    .map(w => ({ whisky: w, score: scoreWhisky(w, answers) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ whisky }) => whisky)
}
