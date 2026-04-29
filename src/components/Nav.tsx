import Link from 'next/link'

export default function Nav() {
  return (
    <nav className="border-b border-stone-200 bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-serif text-base sm:text-lg font-semibold text-amber-800 tracking-wide shrink-0">
          Whisky Guide
        </Link>
        <div className="flex gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600">
          <Link href="/whisky" className="whitespace-nowrap hover:text-amber-700 transition-colors">銘柄を探す</Link>
          <Link href="/finder" className="whitespace-nowrap hover:text-amber-700 transition-colors">好みを見つける</Link>
          <Link href="/articles" className="whitespace-nowrap hover:text-amber-700 transition-colors">読みもの</Link>
        </div>
      </div>
    </nav>
  )
}
