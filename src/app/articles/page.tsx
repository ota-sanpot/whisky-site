import Link from 'next/link'
import { getArticles } from '@/lib/articles'

export const revalidate = false

export default async function ArticlesPage() {
  const articles = await getArticles()

  const categories = Array.from(new Set(articles.map(a => a.category)))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1">読みもの</h1>
        <p className="text-gray-400 text-sm">― ウイスキーをもっと楽しむための特集記事</p>
      </div>

      {categories.map(category => (
        <section key={category} className="mb-10">
          <h2 className="text-sm font-medium text-amber-600 uppercase tracking-widest mb-4 border-b border-amber-100 pb-2">
            {category}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {articles
              .filter(a => a.category === category)
              .map(article => (
                <Link
                  key={article.slug}
                  href={`/articles/${article.slug}`}
                  className="flex gap-4 bg-white border border-stone-200 rounded-xl p-5 hover:border-amber-300 hover:shadow-sm transition-all group"
                >
                  <div className="text-4xl flex-shrink-0">{article.coverEmoji}</div>
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug mb-1 group-hover:text-amber-700 transition-colors line-clamp-2">
                      {article.title}
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{article.summary}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {article.tags.map(tag => (
                        <span key={tag} className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}
