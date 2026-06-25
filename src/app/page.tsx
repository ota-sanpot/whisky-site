import Link from 'next/link'
import { getWhiskies } from '@/lib/notion'
import WhiskyCard from '@/components/WhiskyCard'
import FlavorTag from '@/components/FlavorTag'
import SearchBar from '@/components/SearchBar'
import type { FlavorTag as FlavorTagType, Origin } from '@/lib/types'

export const revalidate = false

const ORIGINS: { key: Origin; emoji: string; description: string }[] = [
  { key: '日本',        emoji: '🇯🇵', description: 'ミズナラ樽と職人技が生む繊細な甘みと香り。世界が認めたジャパニーズクオリティ。' },
  { key: 'スコットランド', emoji: '🏴',  description: 'ウイスキーの故郷。地域ごとに異なるスモーク・フルーツ・ピートの個性を楽しむ。' },
  { key: 'アメリカ',    emoji: '🇺🇸', description: '新樽熟成のバーボンが生む力強いバニラとキャラメルの甘さ。テネシーウイスキーも人気。' },
  { key: 'アイルランド', emoji: '🇮🇪', description: '3回蒸溜ならではの滑らかで軽快な飲み口。世界で最も飲みやすいウイスキーとも。' },
  { key: 'その他',      emoji: '🌏', description: '台湾・インド・カナダなど、世界中で新興産地が台頭。個性豊かな一本が揃う。' },
]

const FLAVOR_TAGS: FlavorTagType[] = [
  '甘口', 'スモーキー', 'フルーティ', 'ピーティ', 'スパイシー', 'フローラル', 'ナッティ', 'ウッディ',
]

const HISTORY = [
  {
    year: '1405年',
    title: 'ウイスキーの誕生',
    text: 'アイルランドの文献に「生命の水（ウシュクベーハ）」の記録が残る。修道院で薬用に造られた蒸溜酒がウイスキーの起源とされる。',
  },
  {
    year: '1823年',
    title: 'スコッチが世界へ',
    text: '英国で酒税法が改正され、密造から合法蒸溜へ転換。スコットランド全土に蒸留所が設立され、ブレンデッドスコッチが世界市場を席巻する。',
  },
  {
    year: '1870年代',
    title: 'バーボンの黄金期',
    text: '南北戦争後のアメリカでバーボン産業が急成長。チャーコールバレルによる熟成技術が確立し、ケンタッキー州が世界有数の蒸留産地となる。',
  },
  {
    year: '1920年',
    title: 'ジャパニーズウイスキーの夜明け',
    text: '竹鶴政孝がスコットランドへ単身渡航し、本場の製造技術を習得。帰国後に日本のウイスキー造りの礎を築く。',
  },
  {
    year: '1929年',
    title: '山崎蒸留所の誕生',
    text: 'サントリー（当時・寿屋）が山崎に日本初の本格ウイスキー蒸留所を設立。日本独自のウイスキー文化がここから始まる。',
  },
  {
    year: '2000年代〜',
    title: '世界が認めたジャパニーズウイスキー',
    text: '山崎・余市などが国際コンペで次々と最高賞を受賞。「ジャパニーズウイスキー」は世界中の愛好家から注目される一大カテゴリへと成長した。',
  },
]

const BASICS = [
  {
    icon: '🌾',
    title: '原料',
    text: '大麦・ライ麦・トウモロコシなど穀物が主原料。何を使うかが風味のベースを決める。スコッチは主に大麦、バーボンはトウモロコシ51%以上を使用。',
  },
  {
    icon: '🏭',
    title: '蒸溜',
    text: '発酵させたもろみを蒸溜器で加熱・冷却してアルコールを凝縮する。ポットスチル（単式）は重厚な個性を、パテントスチル（連続式）は軽快な仕上がりを生む。',
  },
  {
    icon: '🪵',
    title: '熟成',
    text: '木樽（主にオーク樽）で数年〜数十年熟成する。この工程でアルコールが柔らかくなり、樽由来の色・香り・風味が加わる。熟成期間と樽の種類が味の大部分を決める。',
  },
  {
    icon: '💧',
    title: '水',
    text: 'ウイスキーの成分の約60〜70%は水。仕込み水と加水調整に使われる水質が、各蒸留所の個性に大きく影響する。山崎の離宮水、余市の清冽な北海道の水など。',
  },
]

// 楽天アフィリエイト（ウイスキーみくじ酒くじ）。初心者おすすめ銘柄の下にしれっと掲載
const RAKUTEN_KUJI_HTML = `<table border="0" cellpadding="0" cellspacing="0"><tr><td><div style="border:1px solid #95a5a6;border-radius:.75rem;background-color:#FFFFFF;width:504px;margin:0px;padding:5px;text-align:center;overflow:hidden;"><table><tr><td style="width:240px"><a href="https://hb.afl.rakuten.co.jp/ichiba/553a9bfe.b3b4c9dc.553a9c06.76a1aeed/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fdogenka-miyazaki%2Fsakekuzii%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIyNDB4MjQwIiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D" target="_blank" rel="nofollow sponsored noopener" style="word-wrap:break-word;"><img src="https://hbb.afl.rakuten.co.jp/hgb/553a9bfe.b3b4c9dc.553a9c06.76a1aeed/?me_id=1405737&item_id=10000297&pc=https%3A%2F%2Fthumbnail.image.rakuten.co.jp%2F%400_mall%2Fdogenka-miyazaki%2Fcabinet%2Fimgrc0086291420.jpg%3F_ex%3D240x240&s=240x240&t=picttext" border="0" style="margin:2px" alt="[商品価格に関しましては、リンクが作成された時点と現時点で情報が変更されている場合がございます。]" title="[商品価格に関しましては、リンクが作成された時点と現時点で情報が変更されている場合がございます。]"></a></td><td style="vertical-align:top;width:248px;display: block;"><p style="font-size:12px;line-height:1.4em;text-align:left;margin:0px;padding:2px 6px;word-wrap:break-word"><a href="https://hb.afl.rakuten.co.jp/ichiba/553a9bfe.b3b4c9dc.553a9c06.76a1aeed/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fdogenka-miyazaki%2Fsakekuzii%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIyNDB4MjQwIiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D" target="_blank" rel="nofollow sponsored noopener" style="word-wrap:break-word;">＼6/25販売開始／【第139弾】【ウイスキーみくじ 466口限定】山崎18年 山崎12年 響ジャパニーズハーモニー イチローズ 知多 など 福袋 酒くじ おみくじ ウイスキー くじ 最新</a><br><span >価格：3,980円～（税込、送料別)</span> <span style="color:#BBB">(2026/6/25時点)</span></p><div style="margin:10px;"><a href="https://hb.afl.rakuten.co.jp/ichiba/553a9bfe.b3b4c9dc.553a9c06.76a1aeed/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fdogenka-miyazaki%2Fsakekuzii%2F&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIyNDB4MjQwIiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ%3D%3D" target="_blank" rel="nofollow sponsored noopener" style="word-wrap:break-word;"><img src="https://static.affiliate.rakuten.co.jp/makelink/rl.svg" style="float:left;max-height:27px;width:auto;margin-top:0" ></a><a href="https://hb.afl.rakuten.co.jp/ichiba/553a9bfe.b3b4c9dc.553a9c06.76a1aeed/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fdogenka-miyazaki%2Fsakekuzii%2F%3Fscid%3Daf_pc_bbtn&link_type=picttext&ut=eyJwYWdlIjoiaXRlbSIsInR5cGUiOiJwaWN0dGV4dCIsInNpemUiOiIyNDB4MjQwIiwibmFtIjoxLCJuYW1wIjoicmlnaHQiLCJjb20iOjEsImNvbXAiOiJkb3duIiwicHJpY2UiOjEsImJvciI6MSwiY29sIjoxLCJiYnRuIjoxLCJwcm9kIjowLCJhbXAiOmZhbHNlfQ==" target="_blank" rel="nofollow sponsored noopener" style="word-wrap:break-word;"><div style="float:right;width:41%;height:27px;background-color:#bf0000;color:#fff!important;font-size:12px;font-weight:500;line-height:27px;margin-left:1px;padding: 0 12px;border-radius:16px;cursor:pointer;text-align:center;"> 楽天で購入 </div></a></div></td></tr></table></div><br><p style="color:#000000;font-size:12px;line-height:1.4em;margin:5px;word-wrap:break-word"></p></td></tr></table>`

export default async function TopPage() {
  const whiskies = await getWhiskies()

  const originCounts = Object.fromEntries(
    ORIGINS.map(o => [o.key, whiskies.filter(w => w.origin === o.key).length])
  )

  const featured = ORIGINS
    .map(o => whiskies.find(w => w.origin === o.key && w.recommendedFor === '初心者向け'))
    .filter((w): w is NonNullable<typeof w> => w != null)
    .slice(0, 6)

  return (
    <div className="space-y-24">

      {/* ヒーロー */}
      <section className="text-center pt-10 pb-6">
        <p className="text-amber-600 text-xs font-medium tracking-widest uppercase mb-4">Whisky Guide Japan</p>
        <h1 className="text-4xl sm:text-5xl font-semibold mb-5 leading-tight">
          あなたの一本を、<br />見つけよう。
        </h1>
        <p className="text-gray-500 mb-6 max-w-lg mx-auto leading-relaxed">
          初心者から愛好家まで。{whiskies.length}銘柄の中から、好みに合ったウイスキーをご紹介します。
        </p>
        <SearchBar whiskies={whiskies} />
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          <Link
            href="/finder"
            className="inline-block bg-amber-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-amber-600 transition-colors"
          >
            好みアプリで探す →
          </Link>
          <Link
            href="/whisky"
            className="inline-block border border-amber-400 text-amber-600 px-8 py-3 rounded-lg font-medium hover:bg-amber-50 transition-colors"
          >
            銘柄一覧を見る
          </Link>
        </div>

        {/* 産地別カウント */}
        <div className="flex justify-center flex-wrap gap-6">
          {ORIGINS.map(o => (
            <div key={o.key} className="text-center">
              <p className="text-2xl font-semibold text-amber-600">{originCounts[o.key]}</p>
              <p className="text-xs text-gray-400 mt-0.5">{o.key}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ウイスキーとは */}
      <section>
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-1">ウイスキーとは</h2>
          <p className="text-gray-400 text-sm">― そもそも、ウイスキーってなに？</p>
        </div>
        <p className="text-gray-700 leading-relaxed mb-8 max-w-2xl">
          ウイスキーは大麦・ライ麦・トウモロコシなどの穀物を原料に、
          <strong>発酵・蒸溜・熟成</strong>の工程を経て造られる蒸溜酒です。
          木樽（オーク樽）での熟成によってアルコールが柔らかくなり、
          琥珀色と複雑な香味が生まれます。
          産地・原料・製法・熟成年数の違いが、銘柄ごとのまったく異なる個性を生み出します。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BASICS.map(item => (
            <div key={item.title} className="bg-stone-100 rounded-xl p-5">
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 産地から探す */}
      <section>
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-1">産地から探す</h2>
          <p className="text-gray-400 text-sm">― 産地ごとに異なる個性を楽しむ</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ORIGINS.map(o => (
            <Link
              key={o.key}
              href="/whisky"
              className="block bg-white border border-stone-200 rounded-xl p-5 hover:border-amber-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{o.emoji}</span>
                <div>
                  <p className="font-semibold group-hover:text-amber-600 transition-colors">{o.key}</p>
                  <p className="text-xs text-amber-500">{originCounts[o.key]}銘柄</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{o.description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 space-y-6">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-3">Reference Chart</p>
            <div className="overflow-x-auto rounded-xl border border-stone-200 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/world-whisky-guide.png`}
                alt="世界のウイスキー完全ガイド 産地別・種別一覧表"
                className="min-w-[640px] w-full h-auto"
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-3">Japanese Whisky Map</p>
            <div className="overflow-x-auto rounded-xl border border-stone-200 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/japanese-whisky-map.png`}
                alt="ジャパニーズウイスキー特徴マップ 香り×濃さで銘柄を比較"
                className="min-w-[640px] w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ウイスキーの歴史 */}
      <section>
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-1">ウイスキーの歴史</h2>
          <p className="text-gray-400 text-sm">― 600年の時をかけて、世界へ広まった「生命の水」</p>
        </div>
        <div className="relative">
          <div className="absolute left-[7.5rem] top-2 bottom-2 w-px bg-amber-200 hidden sm:block" />
          <div className="space-y-10">
            {HISTORY.map((item, i) => (
              <div key={i} className="sm:flex gap-0 items-start">
                <div className="relative sm:w-36 flex-shrink-0 mb-1 sm:mb-0 sm:pr-6 sm:text-right">
                  <p className="text-amber-600 font-semibold text-sm">{item.year}</p>
                  <div className="absolute right-0 top-1 translate-x-1/2 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-100 hidden sm:block" />
                </div>
                <div className="sm:pl-8">
                  <p className="font-semibold mb-1">{item.title}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* フレーバーから探す */}
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-1">フレーバーから探す</h2>
          <p className="text-gray-400 text-sm">― 気になる風味のタイプから銘柄を選ぶ</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {FLAVOR_TAGS.map(tag => (
            <Link key={tag} href={`/whisky?flavor=${encodeURIComponent(tag)}`} className="hover:opacity-70 transition-opacity">
              <FlavorTag tag={tag} />
            </Link>
          ))}
        </div>

        <div className="mt-8">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-3">Flavor Map</p>
          <div className="overflow-x-auto rounded-xl border border-stone-200 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/world-whisky-map.png`}
              alt="世界のウイスキー一覧マップ 香り×濃さの比較図"
              className="min-w-[640px] w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* 初心者おすすめ銘柄 */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold mb-1">初心者におすすめの銘柄</h2>
            <p className="text-gray-400 text-sm">― 産地ごとに飲みやすい一本をピックアップ</p>
          </div>
          <Link href="/whisky" className="text-sm text-amber-600 hover:underline whitespace-nowrap">
            すべて見る →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featured.map(whisky => (
            <WhiskyCard key={whisky.id} whisky={whisky} compact />
          ))}
        </div>
        <div className="mt-8 flex justify-center" dangerouslySetInnerHTML={{ __html: RAKUTEN_KUJI_HTML }} />
      </section>

      {/* 好みアプリCTA */}
      <section className="bg-amber-50 border border-amber-200 rounded-2xl p-10 text-center">
        <p className="text-amber-500 text-xs font-medium tracking-widest uppercase mb-3">Whisky Finder</p>
        <h2 className="text-2xl font-semibold mb-3">好みのウイスキーを見つけよう</h2>
        <p className="text-gray-600 mb-7 max-w-md mx-auto text-sm leading-relaxed">
          産地・飲み方・シーン・フレーバーの4つの質問に答えるだけで、
          あなたにぴったりの銘柄を3本ご提案します。
        </p>
        <Link
          href="/finder"
          className="inline-block bg-amber-500 text-white px-10 py-3 rounded-lg font-medium hover:bg-amber-600 transition-colors"
        >
          はじめる →
        </Link>
      </section>

    </div>
  )
}
