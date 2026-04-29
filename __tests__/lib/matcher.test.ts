import { scoreWhisky, getTopMatches } from '@/lib/matcher'
import { Whisky, FinderAnswers } from '@/lib/types'

const makeWhisky = (overrides: Partial<Whisky> = {}): Whisky => ({
  id: '1',
  name: 'テスト銘柄',
  distillery: 'テスト蒸留所',
  origin: '日本',
  category: 'シングルモルト',
  priceRange: '¥3,000〜¥10,000',
  alcoholContent: 43,
  flavorTags: [],
  recommendedFor: '初心者向け',
  description: '',
  imageUrl: '',
  ...overrides,
})

const baseAnswers: FinderAnswers = {
  origin: 'こだわらない',
  drinkingStyle: 'ストレート',
  scene: '自宅でゆっくり',
  selectedFlavors: [],
}

describe('scoreWhisky', () => {
  it('産地が一致するとき3点を返す（フレーバーなし）', () => {
    const whisky = makeWhisky({ origin: '日本', flavorTags: [] })
    const answers: FinderAnswers = { ...baseAnswers, origin: '日本' }
    expect(scoreWhisky(whisky, answers)).toBe(3)
  })

  it('こだわらないのとき産地ボーナスを加算しない', () => {
    const whisky = makeWhisky({ origin: '日本', flavorTags: [] })
    const answers: FinderAnswers = { ...baseAnswers, origin: 'こだわらない', drinkingStyle: 'ストレート' }
    expect(scoreWhisky(whisky, answers)).toBe(0)
  })

  it('産地が不一致のとき産地ボーナスを加算しない', () => {
    const whisky = makeWhisky({ origin: '日本', flavorTags: [] })
    const answers: FinderAnswers = { ...baseAnswers, origin: 'スコットランド' }
    expect(scoreWhisky(whisky, answers)).toBe(0)
  })

  it('選択フレーバーが一致するとき1タグにつき2点を加算する', () => {
    const whisky = makeWhisky({ origin: 'スコットランド', flavorTags: ['甘口', 'フルーティ'] })
    const answers: FinderAnswers = { ...baseAnswers, origin: 'こだわらない', selectedFlavors: ['甘口', 'フルーティ'] }
    expect(scoreWhisky(whisky, answers)).toBe(4)
  })

  it('ハイボール選択時にフルーティなウイスキーへボーナス1点を加算する', () => {
    const whisky = makeWhisky({ flavorTags: ['フルーティ'] })
    const withHighball: FinderAnswers = { ...baseAnswers, drinkingStyle: 'ハイボール', selectedFlavors: [] }
    const withStraight: FinderAnswers = { ...baseAnswers, drinkingStyle: 'ストレート', selectedFlavors: [] }
    expect(scoreWhisky(whisky, withHighball)).toBeGreaterThan(scoreWhisky(whisky, withStraight))
  })

  it('産地・フレーバー・飲み方ボーナスを合算する', () => {
    const whisky = makeWhisky({ origin: '日本', flavorTags: ['甘口', 'フルーティ'] })
    const answers: FinderAnswers = {
      origin: '日本',
      drinkingStyle: 'ハイボール',
      scene: '自宅でゆっくり',
      selectedFlavors: ['甘口'],
    }
    // 産地: +3, 甘口(選択): +2, フルーティ(ハイボールボーナス): +1, 甘口(ハイボールボーナス): +1
    expect(scoreWhisky(whisky, answers)).toBe(7)
  })
})

describe('getTopMatches', () => {
  it('スコア上位3件を降順で返す', () => {
    const whiskies = [
      makeWhisky({ id: '1', flavorTags: [] }),
      makeWhisky({ id: '2', origin: '日本', flavorTags: ['甘口', 'フルーティ'] }),
      makeWhisky({ id: '3', flavorTags: ['甘口'] }),
      makeWhisky({ id: '4', flavorTags: ['フルーティ', 'スモーキー'] }),
    ]
    const answers: FinderAnswers = {
      origin: '日本',
      drinkingStyle: 'ハイボール',
      scene: '自宅でゆっくり',
      selectedFlavors: ['甘口', 'フルーティ'],
    }
    const result = getTopMatches(whiskies, answers)
    expect(result).toHaveLength(3)
    expect(result[0].id).toBe('2')
  })

  it('銘柄数が3未満のとき全件返す', () => {
    const whiskies = [makeWhisky({ id: '1' }), makeWhisky({ id: '2' })]
    const result = getTopMatches(whiskies, baseAnswers)
    expect(result).toHaveLength(2)
  })

  it('元の配列を変更しない', () => {
    const whiskies = [makeWhisky({ id: '1' }), makeWhisky({ id: '2' }), makeWhisky({ id: '3' })]
    const original = [...whiskies]
    getTopMatches(whiskies, baseAnswers)
    expect(whiskies).toEqual(original)
  })
})
