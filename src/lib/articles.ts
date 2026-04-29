import { Article } from './types'
import articlesJson from '../../data/articles.json'

const articles = articlesJson as Article[]

export async function getArticles(): Promise<Article[]> {
  return articles
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  return articles.find(a => a.slug === slug) ?? null
}
