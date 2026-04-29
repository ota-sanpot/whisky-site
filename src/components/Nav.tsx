import Link from 'next/link'
import Image from 'next/image'

export default function Nav() {
  return (
    <nav className="border-b border-stone-200 bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Whisky Guide"
            width={40}
            height={40}
            className="h-8 w-8 object-contain"
            priority
          />
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
