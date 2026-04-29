'use client'

import { useState } from 'react'
import { Whisky, FinderAnswers, FlavorTag, Origin } from '@/lib/types'
import { getTopMatches } from '@/lib/matcher'
import WhiskyCard from './WhiskyCard'

type Step = 'origin' | 'drinkingStyle' | 'scene' | 'flavors' | 'result'

const STEPS: Step[] = ['origin', 'drinkingStyle', 'scene', 'flavors', 'result']
const QUESTION_STEPS = STEPS.filter(s => s !== 'result')

const ORIGINS: Array<Origin | 'こだわらない'> = [
  '日本', 'スコットランド', 'アメリカ', 'アイルランド', 'こだわらない',
]
const DRINKING_STYLES: FinderAnswers['drinkingStyle'][] = [
  'ストレート', 'ロック', '水割り', 'ハイボール', 'カクテル',
]
const SCENES: FinderAnswers['scene'][] = [
  '自宅でゆっくり', '特別な日に', '贈り物に', '食事と一緒に',
]
const FLAVOR_TAGS: FlavorTag[] = [
  '甘口', 'スモーキー', 'フルーティ', 'ピーティ', 'スパイシー', 'フローラル', 'ナッティ', 'ウッディ',
]

type Props = { whiskies: Whisky[] }

export default function FinderApp({ whiskies }: Props) {
  const [step, setStep] = useState<Step>('origin')
  const [answers, setAnswers] = useState<Partial<FinderAnswers>>({})
  const [selectedFlavors, setSelectedFlavors] = useState<FlavorTag[]>([])

  const stepIndex = STEPS.indexOf(step)
  const questionIndex = QUESTION_STEPS.indexOf(step as (typeof QUESTION_STEPS)[number])

  const goNext = () => setStep(STEPS[stepIndex + 1])
  const goBack = () => setStep(STEPS[stepIndex - 1])

  const toggleFlavor = (flavor: FlavorTag) =>
    setSelectedFlavors(prev =>
      prev.includes(flavor) ? prev.filter(f => f !== flavor) : [...prev, flavor]
    )

  const finalAnswers: FinderAnswers | null =
    answers.origin && answers.drinkingStyle && answers.scene
      ? { origin: answers.origin, drinkingStyle: answers.drinkingStyle, scene: answers.scene, selectedFlavors }
      : null

  const results = finalAnswers ? getTopMatches(whiskies, finalAnswers) : []

  const reset = () => { setStep('origin'); setAnswers({}); setSelectedFlavors([]) }

  return (
    <div className="max-w-lg mx-auto">
      {step !== 'result' && (
        <div className="mb-8">
          <div className="flex gap-1.5 mb-2">
            {QUESTION_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < questionIndex ? 'bg-amber-500' : i === questionIndex ? 'bg-amber-300' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400">{questionIndex + 1} / {QUESTION_STEPS.length}</p>
        </div>
      )}

      {step === 'origin' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">気になる産地はありますか？</h2>
          <div className="flex flex-col gap-2">
            {ORIGINS.map(origin => (
              <button
                key={origin}
                onClick={() => { setAnswers(a => ({ ...a, origin })); goNext() }}
                className="border rounded-lg px-4 py-3 text-left hover:border-amber-400 hover:bg-amber-50 transition-colors"
              >
                {origin}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'drinkingStyle' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">どんな飲み方が好きですか？</h2>
          <div className="flex flex-col gap-2">
            {DRINKING_STYLES.map(style => (
              <button
                key={style}
                onClick={() => { setAnswers(a => ({ ...a, drinkingStyle: style })); goNext() }}
                className="border rounded-lg px-4 py-3 text-left hover:border-amber-400 hover:bg-amber-50 transition-colors"
              >
                {style}
              </button>
            ))}
          </div>
          <button onClick={goBack} className="mt-4 text-sm text-gray-400 hover:text-gray-600">← 前へ</button>
        </div>
      )}

      {step === 'scene' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">どんな場面で楽しみたいですか？</h2>
          <div className="flex flex-col gap-2">
            {SCENES.map(scene => (
              <button
                key={scene}
                onClick={() => { setAnswers(a => ({ ...a, scene })); goNext() }}
                className="border rounded-lg px-4 py-3 text-left hover:border-amber-400 hover:bg-amber-50 transition-colors"
              >
                {scene}
              </button>
            ))}
          </div>
          <button onClick={goBack} className="mt-4 text-sm text-gray-400 hover:text-gray-600">← 前へ</button>
        </div>
      )}

      {step === 'flavors' && (
        <div>
          <h2 className="text-xl font-semibold mb-2">気になるフレーバーを選んでください</h2>
          <p className="text-sm text-gray-500 mb-4">複数選択できます。選ばなくても進めます。</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {FLAVOR_TAGS.map(flavor => (
              <button
                key={flavor}
                onClick={() => toggleFlavor(flavor)}
                className={`px-4 py-2 rounded-full border transition-colors ${
                  selectedFlavors.includes(flavor)
                    ? 'border-amber-500 bg-amber-50 text-amber-700 font-medium'
                    : 'border-gray-300 hover:border-amber-300'
                }`}
              >
                {flavor}
              </button>
            ))}
          </div>
          <button
            onClick={goNext}
            className="w-full bg-amber-500 text-white rounded-lg py-3 font-medium hover:bg-amber-600 transition-colors"
          >
            おすすめを見る →
          </button>
          <button onClick={goBack} className="mt-3 block mx-auto text-sm text-gray-400 hover:text-gray-600">← 前へ</button>
        </div>
      )}

      {step === 'result' && (
        <div>
          <h2 className="text-xl font-semibold mb-6">あなたにおすすめの3本</h2>
          {results.length === 0 ? (
            <p className="text-gray-500">条件に合う銘柄が見つかりませんでした。</p>
          ) : (
            <div className="flex flex-col gap-4">
              {results.map(whisky => (
                <WhiskyCard key={whisky.id} whisky={whisky} />
              ))}
            </div>
          )}
          <button
            onClick={reset}
            className="mt-6 block mx-auto text-sm text-gray-400 hover:text-gray-600"
          >
            もう一度試す
          </button>
        </div>
      )}
    </div>
  )
}
