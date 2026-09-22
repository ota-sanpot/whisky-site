// テスト共通部品（ファイルの読込・データ抽出・jsdomでの起動）
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM, VirtualConsole, ResourceLoader } from 'jsdom';

const here = dirname(fileURLToPath(import.meta.url));

// テストで使う疑似オリジン（公開URLと同じ形）。history.replaceState は file: 文書だと
// jsdom の実装上つねに拒否される（同一パスでも SecurityError）ため、実際の公開先と同じ
// https オリジンを使う。ただし実際の通信は一切発生させず、下の LocalFilesOnly がこの
// オリジン宛のリクエストをディスク上の同名ファイルへ差し替える
const SITE_ORIGIN = 'https://ota-sanpot.github.io/whisky-site/';

// テストではサイト自身のファイル（styles.css・data.js・app.js等）だけをディスクから読み、
// それ以外（Googleフォント等の外部）へは一切リクエストしない。DNS不通やCI側の一時的な
// 詰まりが無関係な理由でテストを落とすのを防ぐため
class LocalFilesOnly extends ResourceLoader {
  fetch(url, options) {
    if (url.startsWith(SITE_ORIGIN)) {
      const rel = url.slice(SITE_ORIGIN.length).split(/[?#]/)[0];
      return super.fetch(pathToFileURL(join(SITE_DIR, rel)).href, options);
    }
    return null;
  }
}
export const SITE_DIR = join(here, '..');
export const HTML_PATH = join(SITE_DIR, 'index.html');

const read = (name) => readFileSync(join(SITE_DIR, name), 'utf8');
export const html = () => read('index.html');
export const css = () => read('styles.css');
export const appJs = () => read('app.js');
export const dataJs = () => read('data.js');

// 文言の検査用に、公開するソースをひとまとめにする
export const allSource = () => [html(), css(), dataJs(), appJs()].join('\n');

// data.js から window.WDATA の中身を取り出す
export function readData() {
  const m = dataJs().match(/^window\.WDATA = ([\s\S]*);\s*$/);
  if (!m) throw new Error('window.WDATA が見つからない');
  return JSON.parse(m[1]);
}

// jsdom で開く。外部ファイル（styles.css・data.js・app.js）を実際に読み込ませ、
// jsdom 未実装の機能（scrollTo 等）の警告は無視して、それ以外のエラーを集める
export async function load(hash = '') {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => {
    if (!/Not implemented/.test(e.message)) errors.push(e.message);
  });
  virtualConsole.on('error', (...args) => errors.push(args.join(' ')));
  const dom = new JSDOM(html(), {
    url: `${SITE_ORIGIN}index.html${hash}`,
    runScripts: 'dangerously',
    resources: new LocalFilesOnly(),
    pretendToBeVisual: true,
    virtualConsole,
  });
  if (dom.window.document.readyState !== 'complete') {
    await new Promise((resolve) => dom.window.addEventListener('load', resolve));
  }
  return { dom, window: dom.window, document: dom.window.document, errors };
}

// ハッシュを変えて、その場で描画し直す
export function go(env, hash) {
  env.window.location.hash = hash;
  env.window.__app.render();
}
