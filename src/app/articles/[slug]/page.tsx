import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getArticles, getArticleBySlug } from '@/lib/articles'

export const revalidate = false

export async function generateStaticParams() {
  const articles = await getArticles()
  return articles.map(a => ({ slug: a.slug }))
}

type Props = { params: { slug: string } }

export default async function ArticleDetailPage({ params }: Props) {
  const article = await getArticleBySlug(params.slug)
  if (!article) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/articles" className="text-sm text-amber-600 hover:underline mb-6 inline-block">
        ← 読みものに戻る
      </Link>

      <div className="mb-8">
        <div className="text-5xl mb-4">{article.coverEmoji}</div>
        <p className="text-xs text-amber-600 font-medium tracking-widest uppercase mb-2">{article.category}</p>
        <h1 className="text-2xl font-semibold leading-snug mb-3">{article.title}</h1>
        <p className="text-gray-500 text-sm leading-relaxed">{article.summary}</p>
        <div className="flex flex-wrap gap-1 mt-3">
          {article.tags.map(tag => (
            <span key={tag} className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <hr className="border-stone-200 mb-8" />

      <div className="space-y-10">
        {article.sections.map((section, i) => (
          <section key={i}>
            <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-amber-100">{section.heading}</h2>
            <div className="space-y-4">
              {section.paragraphs.map((p, j) => (
                <p key={j} className="text-gray-700 leading-relaxed text-sm">{p}</p>
              ))}
            </div>
            {section.embedHtml && (
              <div className="mt-6 flex justify-center" dangerouslySetInnerHTML={{ __html: section.embedHtml }} />
            )}
          </section>
        ))}
      </div>

      <hr className="border-stone-200 mt-12 mb-8" />

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/whisky"
          className="flex-1 text-center border border-amber-400 text-amber-600 px-6 py-3 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors"
        >
          銘柄一覧を見る →
        </Link>
        <Link
          href="/finder"
          className="flex-1 text-center bg-amber-500 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
        >
          好みアプリで探す →
        </Link>
      </div>
    </div>
  )
}
