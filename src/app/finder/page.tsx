import { getWhiskies } from '@/lib/notion'
import FinderApp from '@/components/FinderApp'

export const revalidate = false

export default async function FinderPage() {
  const whiskies = await getWhiskies()

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">好みのウイスキーを見つける</h1>
      <p className="text-gray-500 mb-8">
        いくつかの質問に答えると、あなたにぴったりの銘柄をご提案します。
      </p>
      <FinderApp whiskies={whiskies} />
    </div>
  )
}
