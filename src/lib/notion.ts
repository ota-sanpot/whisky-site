import { Whisky } from './types'
import whiskiesJson from '../../data/whiskies.json'

const whiskies = whiskiesJson as Whisky[]

export async function getWhiskies(): Promise<Whisky[]> {
  return whiskies
}

export async function getWhiskyById(id: string): Promise<Whisky | null> {
  return whiskies.find(w => w.id === id) ?? null
}
