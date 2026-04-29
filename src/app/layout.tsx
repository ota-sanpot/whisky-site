import type { Metadata } from 'next'
import { Noto_Serif_JP } from 'next/font/google'
import Nav from '@/components/Nav'
import './globals.css'

const notoSerif = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Whisky Guide | あなたの一本を見つける',
  description: 'ウイスキー銘柄の紹介と好みに合った銘柄を見つけるアプリ',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${notoSerif.className} bg-stone-50 text-gray-800`}>
        <Nav />
        <main className="max-w-5xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
