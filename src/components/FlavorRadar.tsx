import type { FlavorTag } from '@/lib/types'

const ALL_TAGS: FlavorTag[] = ['甘口', 'フルーティ', 'フローラル', 'ナッティ', 'ウッディ', 'スパイシー', 'ピーティ', 'スモーキー']
const CENTER = 110
const MAX_R = 72
const LABEL_R = 90
const N = ALL_TAGS.length

function toXY(i: number, r: number) {
  const angle = (i / N) * 2 * Math.PI - Math.PI / 2
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) }
}

type Props = { scores: Record<FlavorTag, number> }

export default function FlavorRadar({ scores }: Props) {
  const gridLevels = [0.33, 0.66, 1]

  const filledPoints = ALL_TAGS.map((tag, i) => toXY(i, scores[tag] * MAX_R))
  const filled = filledPoints.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-xs mx-auto" aria-label="フレーバーチャート">
      {/* グリッド */}
      {gridLevels.map(level => {
        const pts = ALL_TAGS.map((_, i) => toXY(i, level * MAX_R))
        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ') + ' Z'
        return <path key={level} d={d} fill="none" stroke="#d6d3d1" strokeWidth="1" />
      })}

      {/* 軸線 */}
      {ALL_TAGS.map((_, i) => {
        const outer = toXY(i, MAX_R)
        return <line key={i} x1={CENTER} y1={CENTER} x2={outer.x} y2={outer.y} stroke="#e7e5e4" strokeWidth="1" />
      })}

      {/* フレーバー塗り */}
      <polygon points={filled} fill="rgba(245,158,11,0.25)" stroke="rgb(245,158,11)" strokeWidth="1.5" />

      {/* ラベル */}
      {ALL_TAGS.map((tag, i) => {
        const p = toXY(i, LABEL_R)
        return (
          <text
            key={tag}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fill={scores[tag] > 0 ? '#92400e' : '#a8a29e'}
            fontWeight={scores[tag] > 0 ? '600' : '400'}
          >
            {tag}
          </text>
        )
      })}
    </svg>
  )
}
