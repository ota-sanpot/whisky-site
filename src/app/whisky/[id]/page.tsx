import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getWhiskies, getWhiskyById } from '@/lib/notion'
import FlavorTag from '@/components/FlavorTag'
import FlavorRadar from '@/components/FlavorRadar'
import WhiskyCard from '@/components/WhiskyCard'
import { getServingTips, getFoodPairings, getRelatedWhiskies, getFlavorScores } from '@/lib/whiskyUtils'

export const revalidate = false

export async function generateStaticParams() {
  const whiskies = await getWhiskies()
  return whiskies.map(w => ({ id: w.id }))
}

type Props = { params: { id: string } }

export default async function WhiskyDetailPage({ params }: Props) {
  const { id } = params
  const [whisky, allWhiskies] = await Promise.all([getWhiskyById(id), getWhiskies()])
  if (!whisky) notFound()

  const servingTips = getServingTips(whisky)
  const foodPairings = getFoodPairings(whisky)
  const related = getRelatedWhiskies(whisky, allWhiskies)
  const flavorScores = getFlavorScores(whisky)

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/whisky" className="text-sm text-amber-600 hover:underline mb-6 inline-block">
        ← 銘柄一覧に戻る
      </Link>

      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mb-2">
          <span>{whisky.origin}</span>
          <span>·</span>
          <span>{whisky.category}</span>
          <span>·</span>
          <span>{whisky.recommendedFor}</span>
        </div>
        <h1 className="text-3xl font-semibold mb-1">{whisky.name}</h1>
        <p className="text-gray-500 text-sm mb-4">{whisky.distillery}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {whisky.flavorTags.map(tag => <FlavorTag key={tag} tag={tag} />)}
        </div>
        {whisky.description && (
          <p className="text-gray-700 leading-relaxed">{whisky.description}</p>
        )}
      </div>

      {/* スペック */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        <div className="bg-white rounded-xl p-4 border border-stone-200 text-center">
          <p className="text-xs text-gray-400 mb-1">アルコール度数</p>
          <p className="font-semibold text-lg">{whisky.alcoholContent}%</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-stone-200 text-center">
          <p className="text-xs text-gray-400 mb-1">価格帯</p>
          <p className="font-semibold text-sm leading-tight">{whisky.priceRange}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-stone-200 text-center">
          <p className="text-xs text-gray-400 mb-1">おすすめ</p>
          <p className="font-semibold text-sm leading-tight">{whisky.recommendedFor}</p>
        </div>
      </div>

      {/* フレーバーチャート */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">フレーバーチャート</h2>
        <div className="bg-white border border-stone-200 rounded-xl p-6">
          <FlavorRadar scores={flavorScores} />
        </div>
      </section>

      {/* おすすめの飲み方 */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">おすすめの飲み方</h2>
        <div className="space-y-3">
          {servingTips.map((tip, i) => (
            <div key={i} className="flex gap-4 bg-white border border-stone-200 rounded-xl p-4">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </div>
              <div>
                <p className="font-medium text-sm mb-0.5">{tip.method}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{tip.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* フードペアリング */}
      {foodPairings.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">フードペアリング</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {foodPairings.map((item, i) => (
              <div key={i} className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="font-medium text-sm mb-1">🍽 {item.food}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{item.reason}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 関連銘柄 */}
      {related.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">似たフレーバーの銘柄</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map(w => (
              <WhiskyCard key={w.id} whisky={w} compact />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <p className="text-sm text-gray-600 mb-4">好みに合った銘柄をもっと探してみませんか？</p>
        <Link
          href="/finder"
          className="inline-block bg-amber-500 text-white px-8 py-3 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
        >
          好みアプリで探す →
        </Link>
      </div>
    </div>
  )
}
