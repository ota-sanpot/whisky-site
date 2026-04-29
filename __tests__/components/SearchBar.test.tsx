// __tests__/components/SearchBar.test.tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchBar from '@/components/SearchBar'
import { Whisky } from '@/lib/types'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
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
    id: 'nikka-yoichi',
    name: '余市',
    distillery: 'ニッカウヰスキー余市蒸溜所',
    origin: '日本',
    category: 'シングルモルト',
    priceRange: '¥3,000〜¥10,000',
    alcoholContent: 45,
    flavorTags: ['スモーキー', 'フルーティ'],
    recommendedFor: '中級者向け',
    description: '石炭直火蒸溜',
    imageUrl: '',
  },
]

describe('SearchBar', () => {
  it('初期状態ではドロップダウンが表示されない', () => {
    render(<SearchBar whiskies={mockWhiskies} />)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('1文字以上入力するとドロップダウンが表示される', async () => {
    const user = userEvent.setup()
    render(<SearchBar whiskies={mockWhiskies} />)
    await user.type(screen.getByRole('combobox'), '山')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('銘柄名（name）で部分一致検索できる', async () => {
    const user = userEvent.setup()
    render(<SearchBar whiskies={mockWhiskies} />)
    await user.type(screen.getByRole('combobox'), '山崎')
    expect(screen.getByText('山崎 12年')).toBeInTheDocument()
    expect(screen.queryByText('ラガヴーリン 16年')).not.toBeInTheDocument()
  })

  it('蒸留所名（distillery）で部分一致検索できる', async () => {
    const user = userEvent.setup()
    render(<SearchBar whiskies={mockWhiskies} />)
    await user.type(screen.getByRole('combobox'), 'ニッカ')
    expect(screen.getByText('余市')).toBeInTheDocument()
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
  })

  it('産地（origin）で部分一致検索できる', async () => {
    const user = userEvent.setup()
    render(<SearchBar whiskies={mockWhiskies} />)
    await user.type(screen.getByRole('combobox'), 'スコットランド')
    expect(screen.getByText('ラガヴーリン 16年')).toBeInTheDocument()
    expect(screen.queryByText('山崎 12年')).not.toBeInTheDocument()
  })

  it('ヒット件数が5件を超えても最大5件のみ表示される', async () => {
    const manyWhiskies: Whisky[] = Array.from({ length: 8 }, (_, i) => ({
      id: `whisky-${i}`,
      name: `日本ウイスキー ${i}`,
      distillery: `蒸留所 ${i}`,
      origin: '日本' as const,
      category: 'シングルモルト' as const,
      priceRange: '¥3,000〜¥10,000' as const,
      alcoholContent: 40,
      flavorTags: [],
      recommendedFor: '初心者向け' as const,
      description: '',
      imageUrl: '',
    }))
    const user = userEvent.setup()
    render(<SearchBar whiskies={manyWhiskies} />)
    await user.type(screen.getByRole('combobox'), '日本')
    const listbox = screen.getByRole('listbox')
    const items = within(listbox).getAllByRole('button')
    expect(items.length).toBe(5)
  })

  it('マッチしない場合「見つかりません」と表示される', async () => {
    const user = userEvent.setup()
    render(<SearchBar whiskies={mockWhiskies} />)
    await user.type(screen.getByRole('combobox'), 'zzz存在しない')
    expect(screen.getByText('見つかりません')).toBeInTheDocument()
  })

  it('ESCキーでドロップダウンが閉じる', async () => {
    const user = userEvent.setup()
    render(<SearchBar whiskies={mockWhiskies} />)
    await user.type(screen.getByRole('combobox'), '山崎')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('')
  })
})
