import { Suspense } from 'react'
import { getWhiskies } from '@/lib/notion'
import WhiskyListClient from '@/components/WhiskyListClient'

export const revalidate = false

export default async function WhiskyListPage() {
  const whiskies = await getWhiskies()

  return (
    <Suspense fallback={<p className="text-gray-400">読み込み中…</p>}>
      <WhiskyListClient whiskies={whiskies} />
    </Suspense>
  )
}
