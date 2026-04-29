import { render, screen } from '@testing-library/react'
import WhiskyCard from '@/components/WhiskyCard'
import { Whisky } from '@/lib/types'

const mockWhisky: Whisky = {
  id: 'test-id',
  name: '山崎12年',
  distillery: 'サントリー山崎蒸留所',
  origin: '日本',
  category: 'シングルモルト',
  priceRange: '¥10,000以上',
  alcoholContent: 43,
  flavorTags: ['甘口', 'フルーティ'],
  recommendedFor: '初心者向け',
  description: 'なめらかな甘さとフルーティな香り',
  imageUrl: '',
}

describe('WhiskyCard', () => {
  it('銘柄名を表示する', () => {
    render(<WhiskyCard whisky={mockWhisky} />)
    expect(screen.getByText('山崎12年')).toBeInTheDocument()
  })

  it('蒸留所名と産地を表示する', () => {
    render(<WhiskyCard whisky={mockWhisky} />)
    expect(screen.getByText(/サントリー山崎蒸留所/)).toBeInTheDocument()
    expect(screen.getByText(/日本/)).toBeInTheDocument()
  })

  it('詳細ページへのリンクを持つ', () => {
    render(<WhiskyCard whisky={mockWhisky} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/whisky/test-id')
  })

  it('compact=false のとき説明文を表示する', () => {
    render(<WhiskyCard whisky={mockWhisky} compact={false} />)
    expect(screen.getByText('なめらかな甘さとフルーティな香り')).toBeInTheDocument()
  })

  it('compact=true のとき説明文を表示しない', () => {
    render(<WhiskyCard whisky={mockWhisky} compact={true} />)
    expect(screen.queryByText('なめらかな甘さとフルーティな香り')).not.toBeInTheDocument()
  })
})
