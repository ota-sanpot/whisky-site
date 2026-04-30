import { getWhiskies } from '@/lib/notion'
import WhiskyCard from '@/components/WhiskyCard'
import Link from 'next/link'

export const revalidate = false

type Props = {
  searchParams: { flavor?: string }
}

export default async function WhiskyListPage({ searchParams }: Props) {
  const whiskies = await getWhiskies()

  const flavor = searchParams.flavor
  const filtered = flavor
    ? whiskies.filter(w => (w.flavorTags as string[]).includes(flavor))
    : whiskies

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-semibold">銘柄一覧</h1>
        {flavor && (
          <span className="text-sm bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
            {flavor}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 mb-6">
        <p className="text-gray-500">
          {filtered.length} 銘柄{flavor ? 'ヒット' : '掲載中'}
        </p>
        {flavor && (
          <Link href="/whisky" className="text-xs text-gray-400 hover:text-amber-600 transition-colors">
            フィルターを解除 ×
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(whisky => (
          <WhiskyCard key={whisky.id} whisky={whisky} />
        ))}
      </div>
    </div>
  )
}
