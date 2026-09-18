// モックのテスト共通部品（HTMLの読込・データ抽出・jsdomでの起動）
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const here = dirname(fileURLToPath(import.meta.url));
export const HTML_PATH = join(here, '..', 'index.html');

export const html = () => readFileSync(HTML_PATH, 'utf8');

// 埋め込みデータ（id="wdata"）を取り出す
export function readData() {
  const m = html().match(/<script type="application\/json" id="wdata">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('wdata が見つからない');
  return JSON.parse(m[1]);
}

// モックを jsdom で開く。jsdom 未実装の機能（scrollTo 等）の警告は無視し、それ以外のエラーを集める
export function load(hash = '') {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => {
    if (!/Not implemented/.test(e.message)) errors.push(e.message);
  });
  virtualConsole.on('error', (...args) => errors.push(args.join(' ')));
  const dom = new JSDOM(html(), {
    url: `http://localhost/mock/index.html${hash}`,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
  });
  return { dom, window: dom.window, document: dom.window.document, errors };
}

// ハッシュを変えて、その場で描画し直す
export function go(env, hash) {
  env.window.location.hash = hash;
  env.window.__mock.render();
}
