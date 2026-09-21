// テスト共通部品（ファイルの読込・データ抽出・jsdomでの起動）
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const here = dirname(fileURLToPath(import.meta.url));
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
    url: pathToFileURL(HTML_PATH).href + hash,
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
  });
  // jsdom には file: URL の history.pushState/replaceState が同一パスでも
  // SecurityError になる既知バグがある（パス配列を参照比較しているため）。
  // app.js 側は変えず、テスト環境側だけで location.hash の直接代入に読み替えて吸収する。
  const { history } = dom.window;
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method].bind(history);
    history[method] = (data, unused, url) => {
      try {
        original(data, unused, url);
      } catch (e) {
        if (e.name !== 'SecurityError') throw e;
        dom.window.location.hash = new dom.window.URL(url, dom.window.location.href).hash;
      }
    };
  }
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
