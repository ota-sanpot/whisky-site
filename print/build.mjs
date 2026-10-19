// 蒸溜所一覧を、印刷・画像用の HTML に書き出す。
// 作るもの: out/list.html（地方別の一覧表・A4縦） / out/map.html（日本地図・A3横） / out/cards.html（1蒸溜所1枚・1080×1350）
// 画像と PDF への変換は render.sh が行う。
// 使い方: node print/build.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'site', 'data.js'), 'utf8');
const DATA = JSON.parse(src.match(/^window\.WDATA = ([\s\S]*);\s*$/)[1]);
const GEO = JSON.parse(readFileSync(join(here, 'geo.json'), 'utf8'));
const LAND = JSON.parse(readFileSync(join(here, 'japan_simplified.json'), 'utf8'));
const OUT = join(here, 'out');
mkdirSync(OUT, { recursive: true });

const REGIONS = [
  { key: 'hokkaido', label: '北海道', prefs: ['北海道'] },
  { key: 'tohoku', label: '東北', prefs: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'] },
  { key: 'kanto', label: '関東', prefs: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'] },
  { key: 'koshinetsu', label: '甲信越', prefs: ['新潟県', '山梨県', '長野県'] },
  { key: 'tokai', label: '東海', prefs: ['岐阜県', '静岡県', '愛知県', '三重県'] },
  { key: 'hokuriku', label: '北陸', prefs: ['富山県', '石川県', '福井県'] },
  { key: 'kinki', label: '近畿', prefs: ['滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'] },
  { key: 'chugoku', label: '中国', prefs: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'] },
  { key: 'shikoku', label: '四国', prefs: ['徳島県', '香川県', '愛媛県', '高知県'] },
  { key: 'kyushu', label: '九州・沖縄', prefs: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'] },
];
const PREF_ORDER = REGIONS.flatMap((r) => r.prefs);
const regionOf = (pref) => REGIONS.find((r) => r.prefs.includes(pref));
const STAPLES = ['hibiki-jh', 'yamazaki', 'hakushu', 'chita', 'yoichi', 'miyagikyo', 'fuji-single-blended', 'kakubin'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CHECKED = DATA.directoryCheckedAt; // 2026-10-19
const CHECKED_JA = CHECKED.replace(/^(\d+)-0?(\d+)-0?(\d+)$/, '$1年$2月$3日');

// 代表銘柄（サイトと同じ考え方：その蒸溜所だけで造る銘柄を優先、その中では定番を先に）
function flagship(d) {
  if (d.basic) return null;
  const uses = DATA.whiskies.filter((w) => w.components.some((c) => c.distillery === d.id));
  const own = uses.filter((w) => w.components.every((c) => c.distillery === d.id));
  const pick = (list) => list.find((w) => STAPLES.includes(w.id)) || list[0] || null;
  return pick(own) || pick(uses.filter((w) => w.maker === d.maker)) || pick(uses);
}

// 並び順：地方 → 県（北から） → 県の中は北から。通し番号を振る
const list = DATA.distilleries
  .map((d) => ({ ...d, geo: GEO[d.id] }))
  .sort((a, b) => PREF_ORDER.indexOf(a.pref) - PREF_ORDER.indexOf(b.pref) || b.geo.lat - a.geo.lat);
list.forEach((d, i) => { d.no = i + 1; d.region = regionOf(d.pref); d.flag = flagship(d); });
const groups = REGIONS.map((r) => ({ ...r, items: list.filter((d) => d.region.key === r.key) })).filter((g) => g.items.length);
const place = (d) => d.pref + (d.city || '');
const shortName = (s) => s.replace(/（.*?）/g, '');

const FONT = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet">';
const COLORS = `--bg:#15100c;--bg-2:#1b1510;--surface:#221a14;--line:#3a2d22;--line-2:#4d3c2d;--text:#f1e8da;--text-2:#c4b39c;--text-3:#9a8974;--amber:#dc9d42;--amber-2:#f2bd66;`;
const FOOT_SRC = `出典：JWIC（ウイスキー文化研究所）蒸留所データ、各社の公表・報道（${CHECKED_JA}確認）／地図：地球地図日本（国土地理院）を加工`;

// ===== 地図の投影（経度は緯度36度の縮みで補正する正距円筒） =====
function projector(box, w, h) {
  const k = Math.cos((36 * Math.PI) / 180);
  const sx = w / ((box.lng1 - box.lng0) * k);
  const sy = h / (box.lat1 - box.lat0);
  const s = Math.min(sx, sy);
  const ox = (w - (box.lng1 - box.lng0) * k * s) / 2;
  const oy = (h - (box.lat1 - box.lat0) * s) / 2;
  return ([lng, lat]) => [ox + (lng - box.lng0) * k * s, oy + (box.lat1 - lat) * s];
}
function landPath(proj, box) {
  const parts = [];
  for (const p of LAND) for (const ring of p.rings) {
    if (!ring.some(([x, y]) => x >= box.lng0 - 1 && x <= box.lng1 + 1 && y >= box.lat0 - 1 && y <= box.lat1 + 1)) continue;
    parts.push('M' + ring.map((c) => proj(c).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z');
  }
  return parts.join('');
}
const MAIN = { lng0: 128.4, lng1: 146.0, lat0: 30.6, lat1: 45.7 };
const OKI = { lng0: 126.6, lng1: 128.4, lat0: 25.9, lat1: 27.0 };
const isOkinawa = (d) => d.pref === '沖縄県';

// ===== 1. 地方別の一覧表（A4縦） =====
function buildList() {
  const counts = groups.map((g) => `<li><span>${esc(g.label)}</span><b>${g.items.length}</b></li>`).join('');
  const sections = groups.map((g) => `
<section class="region">
  <h2>${esc(g.label)}<span>${g.items.length}か所</span></h2>
  <table>
    <colgroup><col class="c-no"><col class="c-name"><col class="c-place"><col class="c-maker"><col class="c-year"><col class="c-flag"></colgroup>
    <thead><tr><th>No.</th><th>蒸溜所</th><th>所在地</th><th>運営</th><th>ウイスキー蒸溜開始</th><th>代表銘柄</th></tr></thead>
    <tbody>${g.items.map((d) => `<tr${d.basic ? '' : ' class="featured"'}>
      <td class="no">${d.no}</td>
      <td class="name">${d.basic ? '' : '<span class="star" aria-label="ガイドで銘柄を掲載">★</span>'}${esc(d.name)}</td>
      <td>${esc(d.pref)}<br><small>${esc(d.city || '市町村は未確認')}</small></td>
      <td>${esc(shortName(d.maker))}</td>
      <td>${esc(d.started || '―')}</td>
      <td>${d.flag ? esc(d.flag.name) : '―'}</td>
    </tr>`).join('')}</tbody>
  </table>
</section>`).join('');

  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>日本のウイスキー蒸溜所 一覧</title>${FONT}
<style>
@page{size:A4 portrait;margin:14mm 12mm 16mm}
:root{--ink:#21170f;--ink-2:#5b4a3a;--ink-3:#8a7763;--line:#e2d6c5;--amber:#b8741c;--amber-bg:#fbf3e6}
*{box-sizing:border-box}
body{margin:0;font-family:'Noto Sans JP',sans-serif;color:var(--ink);font-size:9pt;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.cover{display:flex;align-items:flex-end;justify-content:space-between;gap:12mm;padding:0 0 6mm;border-bottom:2px solid var(--ink);margin-bottom:6mm}
.eyebrow{margin:0 0 2mm;font-size:8pt;letter-spacing:.3em;color:var(--amber);font-weight:700}
h1{margin:0;font-size:22pt;line-height:1.25;font-weight:900;letter-spacing:.02em}
.lead{margin:2mm 0 0;font-size:9.5pt;color:var(--ink-2)}
.counts{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,auto);gap:1.5mm 4mm;font-size:8pt;color:var(--ink-2)}
.counts li{display:flex;gap:1.5mm;align-items:baseline;white-space:nowrap}
.counts b{font-size:11pt;color:var(--ink)}
.total{font-size:30pt;font-weight:900;line-height:1;color:var(--amber);text-align:right;white-space:nowrap}
.total small{display:block;font-size:8pt;color:var(--ink-3);font-weight:500;margin-top:1mm}
.legend{margin:0 0 5mm;font-size:8pt;color:var(--ink-2)}
.legend .star{color:var(--amber)}
.region{break-inside:auto;margin-bottom:5mm}
h2{display:flex;align-items:baseline;gap:3mm;margin:0 0 2mm;font-size:13pt;font-weight:900;break-after:avoid}
h2 span{font-size:8.5pt;font-weight:500;color:var(--ink-3)}
table{width:100%;border-collapse:collapse;table-layout:fixed}
thead{display:table-header-group}
th{font-size:7.5pt;font-weight:700;color:var(--ink-3);text-align:left;padding:1.5mm 2mm;border-bottom:1px solid var(--ink-2);white-space:nowrap}
td{padding:1.6mm 2mm;border-bottom:1px solid var(--line);vertical-align:top;word-break:auto-phrase}
tr{break-inside:avoid}
tr.featured td{background:var(--amber-bg)}
td.no{color:var(--ink-3);font-variant-numeric:tabular-nums}
td.name{font-weight:700}
td small{color:var(--ink-3);font-size:7.5pt}
.star{color:var(--amber);margin-right:1mm}
.c-no{width:9mm}.c-name{width:42mm}.c-place{width:32mm}.c-maker{width:36mm}.c-year{width:26mm}
.notes{margin-top:6mm;padding-top:3mm;border-top:1px solid var(--line);font-size:7.5pt;color:var(--ink-2)}
.notes p{margin:0 0 1.2mm}
</style></head><body>
<header class="cover">
  <div>
    <p class="eyebrow">JAPANESE WHISKY GUIDE</p>
    <h1>日本のウイスキー蒸溜所 一覧</h1>
    <p class="lead">いま稼働している全国の蒸溜所を、地方ごとに北から並べました（${CHECKED_JA}時点）。</p>
  </div>
  <div><p class="total">${list.length}<small>か所</small></p></div>
</header>
<ul class="counts" style="margin-bottom:5mm">${counts}</ul>
<p class="legend"><span class="star">★</span>と色付きの行は、Japanese Whisky Guide で銘柄まで載せている蒸溜所です。代表銘柄は編集部が選んだもので、そのほかの蒸溜所は「―」にしています。</p>
${sections}
<div class="notes">
  <p>掲載の範囲：ウイスキー文化研究所の情報サイト「JWIC」の蒸留所データで、都道府県の見出しの下に載っている蒸溜所（準備中・詳細不明は除く）に、京都みやこ蒸溜所を加えたものです。</p>
  <p>所在地・運営・ウイスキー蒸溜開始年は JWIC の各蒸溜所ページによります。JWIC に詳しいページが無い蒸溜所は、各社の公表・報道・自治体の資料で確認できたものだけを書き、分からない項目は空けています。「再開」は一度止めたウイスキーづくりを再び始めた年です。</p>
  <p>${esc(FOOT_SRC)}。くわしくは https://ota-sanpot.github.io/whisky-site/#/distilleries</p>
</div>
</body></html>`;
}

// ===== 2. 日本地図（A3横・2480×1754 を2倍で書き出す） =====
// 番号ラベルの置き場所を、点と既に置いたラベルに重ならない位置から選ぶ
function placeLabels(points, r, fs) {
  const boxes = points.map((p) => ({ x0: p.x - r, y0: p.y - r, x1: p.x + r, y1: p.y + r }));
  const hit = (b) => boxes.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
  const dirs = [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]];
  for (const p of points) {
    const tw = String(p.no).length * fs * 0.6 + 2;
    const th = fs;
    let done = null;
    for (let ring = 1; ring <= 6 && !done; ring++) {
      for (const [dx, dy] of dirs) {
        const cx = p.x + dx * (r + 2 + (ring - 1) * fs * 0.8 + (dx ? tw / 2 : 0));
        const cy = p.y + dy * (r + 2 + (ring - 1) * fs * 0.8 + (dy ? th / 2 : 0));
        const b = { x0: cx - tw / 2, y0: cy - th / 2, x1: cx + tw / 2, y1: cy + th / 2 };
        if (!hit(b)) { done = { cx, cy, b, ring }; break; }
      }
    }
    if (!done) done = { cx: p.x + r + tw / 2 + 2, cy: p.y, b: null, ring: 1 };
    if (done.b) boxes.push(done.b);
    p.label = done;
  }
}

function mapSvg(box, w, h, items, opts) {
  const proj = projector(box, w, h);
  const pts = items.map((d) => { const [x, y] = proj([d.geo.lng, d.geo.lat]); return { ...d, x, y }; });
  placeLabels(pts, opts.r, opts.fs);
  const dots = pts.map((p) => {
    const cls = p.geo.level === 'pref' ? 'dot dot--approx' : p.basic ? 'dot' : 'dot dot--featured';
    const lead = p.label.ring > 1 ? `<line class="leader" x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${p.label.cx.toFixed(1)}" y2="${p.label.cy.toFixed(1)}"/>` : '';
    return `${lead}<circle class="${cls}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${opts.r}"/><text class="num" x="${p.label.cx.toFixed(1)}" y="${p.label.cy.toFixed(1)}">${p.no}</text>`;
  });
  // 線を先、点、番号の順に重ねる
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="--fs:${opts.fs}px"><path class="land" d="${landPath(proj, box)}"/>${dots.filter((s) => s.startsWith('<line')).map((s) => s.match(/^<line[^>]*\/>/)[0]).join('')}${dots.map((s) => s.replace(/^<line[^>]*\/>/, '')).join('')}</svg>`;
}

function buildMap() {
  const main = mapSvg(MAIN, 1300, 1500, list.filter((d) => !isOkinawa(d)), { r: 6, fs: 15 });
  const oki = mapSvg(OKI, 330, 220, list.filter(isOkinawa), { r: 6, fs: 15 });
  const legend = groups.map((g) => `<section class="lg"><h3>${esc(g.label)}<span>${g.items.length}</span></h3><ol>${g.items.map((d) => `<li class="${d.basic ? '' : 'featured'}"><b>${d.no}</b><span class="lg-name">${esc(d.name)}</span><span class="lg-place">${esc((d.city || d.pref).replace(/^.+郡/, ''))}</span></li>`).join('')}</ol></section>`).join('');
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>日本のウイスキー蒸溜所マップ</title>${FONT}
<style>
@page{size:420mm 297mm;margin:0}
:root{${COLORS}}
*{box-sizing:border-box}
html,body{margin:0;width:2480px;height:1754px;overflow:hidden}
body{background:radial-gradient(1200px 900px at 30% 40%,#24190f 0%,var(--bg) 70%);color:var(--text);font-family:'Noto Sans JP',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;zoom:1}
.page{position:relative;width:2480px;height:1754px;padding:70px 80px 60px}
.head{position:absolute;left:80px;top:64px;z-index:2}
.eyebrow{margin:0 0 10px;font-size:18px;letter-spacing:.34em;color:var(--amber-2);font-weight:700}
h1{margin:0;font-size:64px;line-height:1.15;font-weight:900;letter-spacing:.02em}
.sub{margin:14px 0 0;font-size:22px;color:var(--text-2)}
.total{margin:26px 0 0;font-size:120px;line-height:1;font-weight:900;color:var(--amber-2)}
.total small{font-size:30px;font-weight:700;margin-left:8px;color:var(--text)}
.keys{margin:24px 0 0;padding:0;list-style:none;font-size:18px;color:var(--text-2);display:grid;gap:8px}
.keys li{display:flex;align-items:center;gap:10px}
.keys i{display:inline-block;width:14px;height:14px;border-radius:50%}
.k1{background:var(--amber-2)}.k2{background:var(--text)}.k3{border:2px dashed var(--text-2)}
.map{position:absolute;left:40px;top:150px}
.land{fill:#2c2219;stroke:#5a4634;stroke-width:1;stroke-linejoin:round}
.dot{fill:var(--text);stroke:var(--bg);stroke-width:1.5}
.dot--featured{fill:var(--amber-2)}
.dot--approx{fill:none;stroke:var(--text-2);stroke-width:2;stroke-dasharray:3 3}
.leader{stroke:var(--text-3);stroke-width:1}
.num{font-size:var(--fs);font-weight:700;fill:var(--text);text-anchor:middle;dominant-baseline:central;paint-order:stroke;stroke:var(--bg);stroke-width:4px;stroke-linejoin:round}
.oki{position:absolute;left:950px;top:1390px;border:1px solid var(--line-2);border-radius:14px;background:rgba(21,16,12,.6)}
.oki p{position:absolute;left:14px;top:8px;margin:0;font-size:15px;color:var(--text-3)}
.legend{position:absolute;left:1350px;top:70px;width:1070px;height:1600px;column-count:4;column-gap:28px;column-fill:auto}
.lg{break-inside:avoid-column;margin:0 0 14px}
.lg h3{display:flex;align-items:baseline;gap:8px;margin:0 0 4px;padding-bottom:4px;border-bottom:1px solid var(--line-2);font-size:20px;font-weight:900;color:var(--amber-2)}
.lg h3 span{font-size:14px;color:var(--text-3);font-weight:500}
.lg ol{margin:0;padding:0;list-style:none}
.lg li{display:grid;grid-template-columns:30px 1fr;column-gap:4px;font-size:14.5px;line-height:1.35;padding:2.5px 0}
.lg li b{color:var(--text-3);font-weight:700;font-variant-numeric:tabular-nums;text-align:right;padding-right:4px}
.lg li.featured .lg-name{color:var(--amber-2)}
.lg-name{font-weight:700}
.lg-place{grid-column:2;font-size:12px;color:var(--text-3)}
.foot{position:absolute;left:80px;bottom:40px;font-size:15px;color:var(--text-3)}
@media print{html,body{width:1588px;height:1123px}.page{zoom:.64}}
</style></head><body><div class="page">
<div class="head">
  <p class="eyebrow">JAPANESE WHISKY GUIDE</p>
  <h1>日本のウイスキー<br>蒸溜所マップ</h1>
  <p class="sub">いま稼働している全国の蒸溜所（${CHECKED_JA}時点）</p>
  <p class="total">${list.length}<small>か所</small></p>
  <ul class="keys"><li><i class="k1"></i>ガイドで銘柄まで紹介している蒸溜所</li><li><i class="k2"></i>そのほかの蒸溜所</li><li><i class="k3"></i>市町村が未確認（県の中のおおよその位置）</li></ul>
</div>
<div class="map">${main}</div>
<div class="oki"><p>沖縄</p>${oki}</div>
<div class="legend">${legend}</div>
<p class="foot">${esc(FOOT_SRC)}</p>
</div></body></html>`;
}

// ===== 3. 1蒸溜所1枚のカード（1080×1350） =====
function miniMap(d) {
  const box = isOkinawa(d) ? { lng0: 126.4, lng1: 129.2, lat0: 25.7, lat1: 27.3 } : MAIN;
  const w = 300, h = 320;
  const proj = projector(box, w, h);
  const [x, y] = proj([d.geo.lng, d.geo.lat]);
  const approx = d.geo.level === 'pref';
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><path class="land" d="${landPath(proj, box)}"/>${approx ? `<circle class="pin-approx" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="16"/>` : `<circle class="pin-glow" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="18"/><circle class="pin" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8"/>`}</svg>`;
}

// 蒸溜所名：日本語の名前は単語の途中で折り返さないよう、1行に収まる大きさにする（空白があればそこで改行）
function nameHtml(name) {
  if (/[A-Za-z]{4,}/.test(name) && !/[\u3040-\u9fff]/.test(name)) {
    return `<h1 class="c-name" style="font-size:${name.length > 20 ? 64 : 76}px">${esc(name)}</h1>`;
  }
  const parts = name.split(/\s+/);
  const longest = Math.max(...parts.map((p) => [...p].reduce((n, c) => n + (/[ -~]/.test(c) ? 0.6 : 1), 0)));
  const fs = Math.max(40, Math.min(80, Math.floor(580 / longest)));
  return `<h1 class="c-name" style="font-size:${fs}px;white-space:nowrap">${parts.map(esc).join('<br>')}</h1>`;
}

function card(d) {
  const facts = [
    ['所在地', place(d) || d.pref],
    ['運営', shortName(d.maker)],
    ['ウイスキー蒸溜開始', d.started],
    ['つくっているお酒', (d.products || []).join('・')],
    ['代表銘柄', d.flag?.name],
  ].filter(([, v]) => v);
  const feats = (d.features || []).slice(0, 3);
  const lead = d.lead && d.lead.length <= 90 ? d.lead : null;
  return `<article class="card" id="c-${esc(d.id)}">
  <header class="c-top"><span class="c-region">${esc(d.region.label)}</span><span class="c-no">No.${d.no} / ${list.length}</span></header>
  <div class="c-body">
  <div class="c-main">
    <div class="c-text">
      <p class="c-pref">${esc(d.pref)}</p>
      ${nameHtml(d.name)}
      ${d.nameEn ? `<p class="c-en">${esc(d.nameEn)}</p>` : ''}
    </div>
    <div class="c-map">${miniMap(d)}</div>
  </div>
  ${lead ? `<p class="c-lead">${esc(lead)}</p>` : ''}
  <dl class="c-facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  ${feats.length ? `<dl class="c-feats">${feats.map((f) => `<div><dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd></div>`).join('')}</dl>` : ''}
  ${d.sparse ? '<p class="c-caution">公表されている情報が少ない蒸溜所です。分からない項目は載せていません。</p>' : ''}
  </div>
  <footer class="c-foot"><span class="c-brand">Japanese Whisky Guide</span><span class="c-src">出典：${d.basic ? 'JWIC（ウイスキー文化研究所）ほか' : '各社の公式サイト、JWIC'}／${esc(CHECKED_JA)}確認</span></footer>
</article>`;
}

function buildCards() {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>蒸溜所カード</title>${FONT}
<style>
:root{${COLORS}}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg)}
body{font-family:'Noto Sans JP',sans-serif;color:var(--text)}
.card{display:none;position:relative;width:1080px;height:1350px;padding:72px 80px 64px;flex-direction:column;background:radial-gradient(900px 700px at 80% 10%,#2a1d12 0%,var(--bg) 65%);overflow:hidden}
.card.on{display:flex}
.c-top{display:flex;justify-content:space-between;align-items:center;font-size:24px;letter-spacing:.12em;color:var(--text-3)}
.c-region{color:var(--bg);background:var(--amber-2);font-weight:900;padding:8px 22px;border-radius:999px;letter-spacing:.08em}
.c-main{display:flex;align-items:center;gap:24px}
.c-text{flex:1;min-width:0}
.c-pref{margin:0 0 6px;font-size:30px;color:var(--amber-2);font-weight:700;letter-spacing:.06em}
.c-name{margin:0;font-size:80px;line-height:1.15;font-weight:900;letter-spacing:.01em;word-break:auto-phrase}
.c-name--long{font-size:62px}
.c-en{margin:14px 0 0;font-size:24px;color:var(--text-3);letter-spacing:.04em}
.c-map{flex:none}
.land{fill:#4a3828;stroke:#7a6148;stroke-width:.8}
.c-body{margin:auto 0;padding:20px 0}
.pin{fill:var(--amber-2);stroke:var(--bg);stroke-width:2}
.pin-glow{fill:rgba(242,189,102,.25)}
.pin-approx{fill:rgba(242,189,102,.12);stroke:var(--amber-2);stroke-width:2;stroke-dasharray:5 4}
.c-lead{margin:34px 0 0;font-size:27px;line-height:1.7;color:var(--text-2);word-break:auto-phrase}
.c-facts{margin:36px 0 0;padding:0;border-top:1px solid var(--line-2)}
.c-facts div{display:grid;grid-template-columns:270px 1fr;gap:16px;padding:20px 0;border-bottom:1px solid var(--line)}
.c-facts dt{font-size:24px;color:var(--text-3)}
.c-facts dd{margin:0;font-size:29px;font-weight:700;line-height:1.45;word-break:auto-phrase}
.c-feats{margin:28px 0 0;display:grid;gap:14px}
.c-feats div{display:grid;grid-template-columns:90px 1fr;gap:14px;align-items:baseline}
.c-feats dt{font-size:22px;font-weight:900;color:var(--amber-2)}
.c-feats dd{margin:0;font-size:23px;line-height:1.6;color:var(--text-2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.c-caution{margin:30px 0 0;padding:16px 20px;border-left:4px solid var(--text-3);background:rgba(255,255,255,.03);font-size:22px;line-height:1.6;color:var(--text-2)}
.c-foot{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;padding-top:24px}
.c-brand{font-size:26px;font-weight:900;color:var(--amber-2);letter-spacing:.04em;white-space:nowrap}
.c-src{font-size:16px;white-space:nowrap;color:var(--text-3);text-align:right}
</style></head><body>
${list.map(card).join('\n')}
<script>
  // ?id=xxx の1枚だけを見せる（指定が無ければ1枚目）
  const id = new URLSearchParams(location.search).get('id');
  const el = (id && document.getElementById('c-' + id)) || document.querySelector('.card');
  el.classList.add('on');
</script>
</body></html>`;
}

writeFileSync(join(OUT, 'list.html'), buildList());
writeFileSync(join(OUT, 'map.html'), buildMap());
writeFileSync(join(OUT, 'cards.html'), buildCards());
writeFileSync(join(OUT, 'ids.txt'), list.map((d) => `${String(d.no).padStart(3, '0')} ${d.id}`).join('\n') + '\n');
console.log(`一覧 ${list.length}か所 / 地方 ${groups.length} → print/out/ に書き出し`);
