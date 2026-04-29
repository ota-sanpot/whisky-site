import Link from 'next/link'
import { Whisky } from '@/lib/types'
import FlavorTag from './FlavorTag'

type Props = { whisky: Whisky; compact?: boolean }

export default function WhiskyCard({ whisky, compact = false }: Props) {
  return (
    <Link
      href={`/whisky/${whisky.id}`}
      className="block border rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-white"
    >
      <div className="p-4">
        <h3 className="font-semibold text-gray-800">{whisky.name}</h3>
        <p className="text-sm text-gray-500 mb-2">
          {whisky.distillery} · {whisky.origin}
        </p>
        {!compact && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{whisky.description}</p>
        )}
        <div className="flex flex-wrap gap-1">
          {whisky.flavorTags
            .slice(0, compact ? 3 : whisky.flavorTags.length)
            .map(tag => <FlavorTag key={tag} tag={tag} />)}
        </div>
      </div>
    </Link>
  )
}
