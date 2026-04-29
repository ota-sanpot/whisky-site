import { FlavorTag as FlavorTagType } from '@/lib/types'

const FLAVOR_EMOJI: Record<FlavorTagType, string> = {
  '甘口':     '🍯',
  'スモーキー': '🔥',
  'フルーティ': '🍑',
  'ピーティ':  '🌿',
  'スパイシー': '🌶',
  'フローラル': '🌸',
  'ナッティ':  '🌰',
  'ウッディ':  '🪵',
}

type Props = { tag: FlavorTagType }

export default function FlavorTag({ tag }: Props) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full border border-amber-200">
      {FLAVOR_EMOJI[tag]} {tag}
    </span>
  )
}
