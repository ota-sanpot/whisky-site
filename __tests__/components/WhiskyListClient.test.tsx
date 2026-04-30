import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Suspense } from 'react'
import WhiskyListClient from '@/components/WhiskyListClient'
import type { Whisky } from '@/lib/types'
import * as Navigation from 'next/navigation'

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))

const mockWhiskies: Whisky[] = [
  {
    id: 'yamazaki-12',
    name: '山崎 12年',
    distillery: 'サントリー山崎蒸留所',
    origin: '日本',
    category: 'シングルモルト',
    priceRange: '¥10,000以上',
    alcoholContent: 43,
    flavorTags: ['甘口', 'フルーティ'],
    recommendedFor: '初心者向け',
    description: '滑らかな甘さ',
    imageUrl: '',
  },
  {
    id: 'lagavulin-16',
    name: 'ラガヴーリン 16年',
    distillery: 'ラガヴーリン蒸留所',
    origin: 'スコットランド',
    category: 'シングルモルト',
    priceRange: '¥10,000以上',
    alcoholContent: 43,
    flavorTags: ['スモーキー', 'ピーティ'],
    recommendedFor: '上級者向け',
    description: '力強いピート香',
    imageUrl: '',
  },
  {
    id: 'wild-turkey',
    name: 'ワイルドターキー',
    distillery: 'ワイルドターキー蒸留所',
    origin: 'アメリカ',
    category: 'バーボン',
    priceRange: '¥3,000〜¥10,000',
    alcoholContent: 50,
    flavorTags: ['スパイシー', '甘口'],
    recommendedFor: '中級者向け',
    description: 'スパイシーなバーボン',
    imageUrl: '',
  },
]

const renderWithSuspense = (ui: React.ReactElement) =>
  render(<Suspense fallback={null}>{ui}</Suspense>)

describe('WhiskyListClient', () => {
  it('初期状態で全銘柄を表示する', () => {
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    expect(screen.getByText('山崎 12年')).toBeInTheDocument()
    expect(screen.getByText('ラガヴーリン 16年')).toBeInTheDocument()
    expect(screen.getByText('ワイルドターキー')).toBeInTheDocument()
  })

  it('キーワード検索で銘柄名を部分一致で絞り込む', async () => {
    const user = userEvent.setup()
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    await user.type(screen.getByRole('searchbox'), '山崎')
    expect(screen.getByText('山崎 12年')).toBeInTheDocument()
    expect(screen.queryByText('ラガヴーリン 16年')).not.toBeInTheDocument()
  })

  it('キーワード検索で蒸留所名を部分一致で絞り込む', async () => {
    const user = userEvent.setup()
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    await user.type(screen.getByRole('searchbox'), 'ラガヴーリン蒸留所')
    expect(screen.getByText('ラガヴーリン 16年')).toBeInTheDocument()
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
  })

  it('産地フィルターで絞り込む', async () => {
    const user = userEvent.setup()
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    await user.click(screen.getByText('産地'))
    await user.click(screen.getByRole('button', { name: 'アメリカ' }))
    expect(screen.getByText('ワイルドターキー')).toBeInTheDocument()
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
  })

  it('種別フィルターで絞り込む', async () => {
    const user = userEvent.setup()
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    await user.click(screen.getByText('種別'))
    await user.click(screen.getByRole('button', { name: 'バーボン' }))
    expect(screen.getByText('ワイルドターキー')).toBeInTheDocument()
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
  })

  it('価格帯フィルターで絞り込む', async () => {
    const user = userEvent.setup()
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    await user.click(screen.getByText('価格帯'))
    await user.click(screen.getByRole('button', { name: '¥3,000〜¥10,000' }))
    expect(screen.getByText('ワイルドターキー')).toBeInTheDocument()
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
  })

  it('フレーバーフィルターで絞り込む', async () => {
    const user = userEvent.setup()
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    await user.click(screen.getByText('フレーバー'))
    await user.click(screen.getByRole('button', { name: 'スモーキー' }))
    expect(screen.getByText('ラガヴーリン 16年')).toBeInTheDocument()
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
  })

  it('複数軸のフィルターをANDで結合する', async () => {
    const user = userEvent.setup()
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    await user.click(screen.getByText('産地'))
    await user.click(screen.getByRole('button', { name: 'アメリカ' }))
    await user.click(screen.getByText('種別'))
    await user.click(screen.getByRole('button', { name: 'シングルモルト' }))
    expect(screen.queryByText('ワイルドターキー')).not.toBeInTheDocument()
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
  })

  it('選択済みのフィルターを再クリックで解除する', async () => {
    const user = userEvent.setup()
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    await user.click(screen.getByText('産地'))
    await user.click(screen.getByRole('button', { name: 'アメリカ' }))
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'アメリカ' }))
    expect(screen.getByText('山崎 12年')).toBeInTheDocument()
  })

  it('すべてクリアボタンでフィルターを全解除する', async () => {
    const user = userEvent.setup()
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    await user.click(screen.getByText('産地'))
    await user.click(screen.getByRole('button', { name: 'アメリカ' }))
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /すべてクリア/ }))
    expect(screen.getByText('山崎 12年')).toBeInTheDocument()
    expect(screen.getByText('ラガヴーリン 16年')).toBeInTheDocument()
  })

  it('URLパラメータ flavor で初期フレーバーを設定する', async () => {
    jest.spyOn(Navigation, 'useSearchParams').mockReturnValueOnce(
      new URLSearchParams('flavor=スモーキー') as unknown as ReturnType<typeof Navigation.useSearchParams>
    )
    renderWithSuspense(<WhiskyListClient whiskies={mockWhiskies} />)
    expect(screen.getByText('ラガヴーリン 16年')).toBeInTheDocument()
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
  })
})
