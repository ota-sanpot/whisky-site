// 味わい5段階・余韻・シーン・掲載日を規則から算出する道具。
// ここで作る値はすべて「サイト独自の目安」で、事実ではない。
// 使い方: node site/tools/enrich_profile.mjs   （site/data.js を書き換える）

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const clamp = (n) => Math.min(5, Math.max(1, Math.round(n)));

// specs から値を取り出す
export function specValue(w, key) {
  const hit = (w.specs || []).find((s) => s.k === key);
  return hit ? hit.v : null;
}

// 度数の数値（'43%' → 43。記載がなければ null）
export function abvOf(w) {
  const v = specValue(w, 'アルコール度数');
  const m = v && String(v).match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? Number(m[1]) : null;
}

// 年数表記の数値（'12年' → 12。'なし' や記載なしは null）
export function ageOf(w) {
  const v = specValue(w, '熟成年数の表記');
  const m = v && String(v).match(/(\d+)\s*年/);
  return m ? Number(m[1]) : null;
}

// 判定に使う文章（味の一言・公式の説明・樽の説明）
export function textOf(w) {
  return [w.taste?.line || '', ...(w.official || []).map((o) => o.v), w.casks || ''].join(' ');
}

// 味わい5段階
export function profileOf(w) {
  const t = textOf(w);
  const abv = abvOf(w);

  const smokiness = clamp(3 + w.taste.x * 2);
  const richness = clamp(3 + w.taste.y * 2);

  let fruit = 3 - w.taste.x * 1.5;
  if (/フルーティ|果実|りんご|洋梨|バナナ|柑橘|プラム|ベリー|桃|メロン/.test(t)) fruit += 1;
  const fruitiness = clamp(fruit);

  let sweet = 3;
  const hasSweet = /甘/.test(t);
  if (hasSweet) sweet += 1;
  if (/蜂蜜|はちみつ|バニラ|キャラメル|黒糖|チョコ/.test(t)) sweet += 1;
  if (!hasSweet && /ドライ|キレ|すっきり/.test(t)) sweet -= 1;
  const sweetness = clamp(sweet);

  let drink = 3;
  if (abv !== null && abv < 45) drink += 1;
  if (/軽やか|やわらか|なめらか|すっきり|飲みやすい/.test(t)) drink += 1;
  if (smokiness >= 4) drink -= 1;
  if (abv !== null && abv >= 50) drink -= 1;
  const drinkability = clamp(drink);

  return { sweetness, fruitiness, smokiness, richness, drinkability };
}

// 余韻の長さ
export function finishOf(w, profile) {
  const v = (w.official || []).find((o) => o.k === '余韻');
  if (v) {
    if (/長/.test(v.v)) return '長い';
    if (/短/.test(v.v)) return '短め';
    return '中くらい';
  }
  if (profile.richness >= 4) return '長い';
  if (profile.richness <= 2) return '短め';
  return '中くらい';
}

// シーンのタグ
const BIG_MAKERS = ['サントリー', 'ニッカウヰスキー', 'キリン'];

export function scenesOf(w, profile) {
  const out = [];
  const age = ageOf(w);
  const isMalt = /シングルモルト|ピュアモルト|ブレンデッドモルト/.test(w.type);
  const isBlendOrGrain = /ブレンデッド|グレーン/.test(w.type);

  if (profile.drinkability >= 4 && profile.smokiness <= 3 && !w.limited) out.push('初めての1本');
  if (!w.limited && isBlendOrGrain && profile.drinkability >= 3) out.push('普段飲み');
  if (age !== null || (BIG_MAKERS.includes(w.maker) && /シングルモルト/.test(w.type))) out.push('プレゼント');
  if ((age !== null && age >= 12) || w.limited) out.push('特別な日');
  if (w.serve.highball === 3 || w.serve.mizuwari === 3) out.push('食事と一緒に');
  if (isMalt && !w.limited) out.push('バーで飲みたい');
  // どれにも当てはまらない銘柄（度数が高く、飲み慣れた人向け）は「バーで飲みたい」に入れる
  if (!out.length) out.push('バーで飲みたい');
  return out;
}

// 掲載日（最初の見本3本が2026-09-18、そのあとに足した銘柄は足した日）
const FIRST_THREE = ['hibiki-jh', 'yoichi', 'ao'];
export function addedAtOf(w, today) {
  if (w.addedAt) return w.addedAt; // すでに載っている銘柄の掲載日は動かさない
  if (FIRST_THREE.includes(w.id)) return '2026-09-18';
  return today;
}

// データ全体に項目を足す（元のデータは変えない）
// 掲載日はこの土地の日付で入れる（UTCにすると日本時間の朝までは前日になってしまう）
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function enrich(data, today = localToday()) {
  const whiskies = data.whiskies.map((w) => {
    const profile = profileOf(w);
    return { ...w, profile, finish: finishOf(w, profile), scenes: scenesOf(w, profile), addedAt: addedAtOf(w, today) };
  });
  return { ...data, whiskies };
}

// 直接実行されたときだけ site/data.js を書き換える
if (process.argv[1] && process.argv[1].endsWith('enrich_profile.mjs')) {
  const p = join(dirname(dirname(fileURLToPath(import.meta.url))), 'data.js');
  const src = readFileSync(p, 'utf8');
  const json = src.match(/^window\.WDATA = ([\s\S]*);\s*$/)[1];
  const out = enrich(JSON.parse(json));
  writeFileSync(p, 'window.WDATA = ' + JSON.stringify(out, null, 2) + ';\n');
  console.log(`${out.whiskies.length}銘柄に profile / finish / scenes / addedAt を書き込みました`);
}
