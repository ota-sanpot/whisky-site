import Link from 'next/link'

export default function Nav() {
  return (
    <nav className="border-b border-stone-200 bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-serif text-lg font-semibold text-amber-800 tracking-wide">
          Whisky Guide
        </Link>
        <div className="flex gap-6 text-sm text-gray-600">
          <Link href="/whisky" className="hover:text-amber-700 transition-colors">銘柄を探す</Link>
          <Link href="/finder" className="hover:text-amber-700 transition-colors">好みを見つける</Link>
          <Link href="/articles" className="hover:text-amber-700 transition-colors">読みもの</Link>
        </div>
      </div>
    </nav>
  )
}
