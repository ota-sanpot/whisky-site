import { getWhiskies } from '@/lib/notion'
import WhiskyCard from '@/components/WhiskyCard'

export const revalidate = false

export default async function WhiskyListPage() {
  const whiskies = await getWhiskies()

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">銘柄一覧</h1>
      <p className="text-gray-500 mb-6">
        {whiskies.length} 銘柄掲載中
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {whiskies.map(whisky => (
          <WhiskyCard key={whisky.id} whisky={whisky} />
        ))}
      </div>
    </div>
  )
}
