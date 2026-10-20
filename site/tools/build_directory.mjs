// 全国の稼働中の蒸溜所（基本情報だけの掲載分）を data.js に流し込む道具。
// 元データ: tools/directory/jwic_raw.json（JWIC の蒸留所データを取り込んだもの）と tools/directory/extra.json（詳細ページが無い分）
// 何度実行しても同じ結果になる（basic: true の蒸溜所は毎回作り直す）。
// 使い方: node site/tools/build_directory.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dataPath = join(here, '..', 'data.js');
const JWIC_LIST = 'https://jwic.jp/distillery/';
const CHECKED = '2026-10-19';

// JWIC の識別子 → このサイトの既存 id（詳しく載せている22か所）
const EXISTING = {
  fuji_gotemba: 'fuji-gotemba',
  mars_komagatake: 'mars-komagatake',
  mars_tsunuki: 'mars-tsunuki',
  gaiaflow_sizuoka: 'shizuoka',
  masahiro_shuzo: 'masahiro',
};

// JWIC の掲載名から社名の前置きを外す（名前の表記ゆれをそろえる）
const RENAME = {
  'サントリー山崎蒸溜所': '山崎蒸溜所',
  'サントリー白州蒸溜所': '白州蒸溜所',
  'サントリー知多蒸溜所': '知多蒸溜所',
  '北海道 余市蒸溜所': '余市蒸溜所',
  '仙台 宮城峡蒸溜所': '宮城峡蒸溜所',
  'ガイアフロー静岡蒸溜所': '静岡蒸溜所',
};

const PREFS = ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'];
const PRODUCTS = ['ウイスキー', 'ジン', 'ラム', 'ブランデー', 'その他スピリッツ'];

// 住所 → 都道府県と市町村（「郡」は町村まで含める、政令市は区を外す）
export function splitAddress(addr) {
  const a = addr.replace(/栃⽊県/, '栃木県').trim();
  let pref = PREFS.find((p) => a.startsWith(p)) || null;
  let rest = pref ? a.slice(pref.length) : a;
  if (!pref && a.startsWith('新潟市')) pref = '新潟県';
  const m = rest.match(/^(.+?郡.+?[町村])/) || rest.match(/^(.+?市)/) || rest.match(/^(.+?[町村])/);
  let city = m ? m[1] : null;
  // 「廿日市市」「四日市市」のように市名に「市」を含む場合
  if (city && rest.startsWith(city + '市')) city += '市';
  return { pref, city, address: pref && !a.startsWith(pref) ? pref + a : a };
}

// 蒸溜開始年の表記を短くそろえる
function startedOf(v) {
  if (!v) return null;
  return v.replace(/（ウイスキー製造免許取得年:(\d+)年）/, '（ウイスキー製造免許は$1年）').replace(/／/g, '、');
}

const jwic = JSON.parse(readFileSync(join(here, 'directory', 'jwic_raw.json'), 'utf8'));
const extra = JSON.parse(readFileSync(join(here, 'directory', 'extra.json'), 'utf8'));

const src = readFileSync(dataPath, 'utf8');
const data = JSON.parse(src.match(/^window\.WDATA = ([\s\S]*);\s*$/)[1]);
const detailed = data.distilleries.filter((d) => !d.basic);
const byId = new Map(detailed.map((d) => [d.id, d]));

const basics = [];
for (const r of jwic) {
  const id = EXISTING[r.slug] || r.slug.replace(/_/g, '-');
  const { pref, city, address } = splitAddress(r['所在地']);
  const started = startedOf(r['ウイスキー蒸留開始年']);
  const products = (r['製品'] || []).filter((p) => PRODUCTS.includes(p));
  const name = RENAME[r.name] || r.name;
  const src = { title: `JWIC（ウイスキー文化研究所）蒸留所データ「${r.name}」（${r.updated}更新）`, url: `https://jwic.jp/distillery/${r.slug}/`, used: '所在地・運営会社・ウイスキー蒸留開始年・つくっているお酒' };
  const cur = byId.get(id);
  if (cur) {
    // 詳しく載せている蒸溜所には、一覧表・地図用に市町村と蒸溜開始年だけを足す
    cur.city = city;
    cur.started = started;
    cur.sources = cur.sources.filter((s) => !s.url.startsWith('https://jwic.jp/distillery/' + r.slug));
    cur.sources.push({ ...src, used: '市町村・ウイスキー蒸留開始年（一覧表・地図で使用）' });
    continue;
  }
  basics.push({ id, name, maker: r['所有者（オーナー企業）'], pref, city, address, started, products, basic: true, sources: [src] });
}

for (const e of extra.items) {
  const listSrc = { title: 'JWIC（ウイスキー文化研究所）蒸留所データ 一覧', url: JWIC_LIST, used: '稼働中の蒸溜所としての掲載、都道府県、運営会社' };
  basics.push({ id: e.id, name: e.name, maker: e.maker, pref: e.pref, city: e.city || null, address: e.address || null, started: e.started || null, products: [], basic: true, sparse: true, sources: [listSrc, ...e.sources] });
}
for (const [id, o] of Object.entries(extra.overrides)) {
  const d = byId.get(id);
  if (d) d.city = o.city;
}

// ウイスキーの製造を確かめられず外した蒸溜所（tools/directory/excluded.json）
const excluded = JSON.parse(readFileSync(join(here, 'directory', 'excluded.json'), 'utf8'));
for (let i = basics.length - 1; i >= 0; i--) if (excluded[basics[i].id]) basics.splice(i, 1);

// 公式サイト（実際に開いて確かめたものだけ。tools/directory/official_urls.json）
const official = JSON.parse(readFileSync(join(here, 'directory', 'official_urls.json'), 'utf8'));
for (const b of basics) {
  const o = official[b.id];
  if (!o) continue;
  b.url = o.url;
  b.urlKind = o.kind;
  if (!b.sources.some((s) => s.url === o.url)) {
    const who = o.kind === 'distillery' ? b.name : b.maker.replace(/（.*?）/g, '');
    b.sources.push({ title: `${who} 公式サイト`, url: o.url, used: o.kind === 'distillery' ? '公式サイトへのリンク' : '公式サイトへのリンク（運営会社のサイト）' });
  }
}

// 重複チェック
const ids = new Set(detailed.map((d) => d.id));
for (const b of basics) {
  if (ids.has(b.id)) throw new Error(`id の重複: ${b.id}`);
  if (!b.pref) throw new Error(`県が取れない: ${b.id}`);
  ids.add(b.id);
}

// 値の無い項目は持たせない
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && !v.length)));
data.distilleries = [...detailed, ...basics.map(clean)];
data.directoryCheckedAt = CHECKED;
writeFileSync(dataPath, 'window.WDATA = ' + JSON.stringify(data, null, 2) + ';\n');
console.log(`詳しく載せている ${detailed.length} か所 + 基本情報 ${basics.length} か所 = ${data.distilleries.length} か所`);
