#!/usr/bin/env bun
/**
 * `bb`（菩提比丘英譯）的來源整理：`off/*.bb.off` → `out/bb-src/*.off`。
 *
 *   bun run src/bb-src.ts
 *
 * 為什麼要這一層（2026-11-03）：
 *   1. `off/` 是 2023 年從 epub 產生的（`tidy.js`／`gen.js`），格式與 sz 其他譯本不完全相容：
 *      - `^i[…]` 是 cleanhtml.js 造的行內斜體標記，adb 沒有斜體，轉檔器會當成未知標籤；
 *        這裡把標記與夾文括號拿掉，只留文字（不丟字）。
 *      - 塊標題（`^ck#d1(…)`）裡面夾著 `^h`／`^z1`／`^z2` 甚至 `^n`／`^f`
 *        （例 `^ck#m1(^h[Mūlapariyāya Sutta]^z1[The Root of All Things])`）；
 *        塊名取 `^z1`（沒有才取 `^h`、再沒有才取字面文字），其餘搬到塊後面
 *        （`^h` → `<小節>`），`^n`／`^f` 也搬回正文。
 *        這樣 `<塊>` 的名字才是純文字，目錄與 `n=` 才不會出現標籤。
 *   2. 來源的 HTML／epub 殘留：
 *      - `&lt; 11 &gt;`（1998 年版 PTS 頁碼）清掉；`^missing` → `^miss`（→ `<缺/>`）；
 *      - 塊標題被硬換行切開的（sn5 三處）接回一行；
 *      - 註號緊接標點（`^f151...`）補空白，免得 id 變成 `151..`；
 *      - 註文的裸 `&` 轉成 `&amp;`（XML）；
 *      - 不斷行空白（U+00A0）換成普通空白；行尾的孤立 `^` 拿掉。
 *
 * 不改段號、不改段序：段對齊的是 `cs`（緬甸傳統 msdiv 段號），
 * 那是 2023 年 `gen.js` 用 `../sc/template/*.off`（由 bilara-data 的 `msdiv` 產生）套上去的。
 * 這裡只做「讓它符合 sz 格式」的最小整理，不動 body 的文字順序；
 * 少數「譯本自己併段」的地方用 `ERRATA` 補段號（見下）。
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './profiles';

const SRC = join(ROOT, 'off');
const OUT = join(ROOT, 'out', 'bb-src');
/** `dn2-1000.bb.off`（舊實驗）與 `*.ori.off`（gen 的備份）不是來源 */
const SKIP = /(\.ori\.|-1000\.)/;

/**
 * 手工勘誤（逐條、可回溯；只加段號，不改文字）。
 *
 * `dn1` 的 epub 把 Walshe 的兩段併成一段：`^n144` 那一段同時包含 msdiv 144 與 145
 * （"When, monks, a monk understands as they really are the arising and passing away
 * of the six bases of contact…" ＝ cs 的 `<段 n="145"/>`），所以 `^n145` 整個消失。
 * 在那一句前面補回段號，段數就與 `cs` 相同（559）。
 * 之後若發現別的「併段」，也加在這裡，不要改 `off/` 原件。
 */
const ERRATA: { book: string; from: string; to: string; why: string }[] = [
  {
    book: 'dn1',
    from: '\n‘When, monks, a monk understands as they really are the arising and passing away of the six bases of contact',
    to: '\n^n145 ‘When, monks, a monk understands as they really are the arising and passing away of the six bases of contact',
    why: 'msdiv 145 被併進 144 的段落（Walshe 合段）',
  },
];

interface Stat {
  book: string;
  italics: number;
  chunks: number;
  moved: number;
  nbsp: number;
  stray: number;
  merged: number;
  pages: number;
  missing: number;
  errata: number;
  noteGap: number;
  amp: number;
}

const ws = (s: string): string => s.replace(/[\s\u00a0]+/g, ' ').trim();

/** `^i[…]`：夾文是 delimiters 不是內容，拿掉標記與括號，文字留下。 */
function stripItalics(text: string, st: Stat): string {
  // 同一個檔裡有跨行的斜體夾文（dn2 一條、dn1 兩條），所以用 dotall 整份處理；
  // 夾文裡面不會再有 `[`／`]`，所以用「到最近的 ]」是安全的。
  return text.replace(/\^i\[([^[\]]*)\]/gs, (_m, inner: string) => {
    st.italics++;
    return inner;
  });
}

/** 讀 `^ck#id(…)` 的夾文：`(` 起算、`[`…`]` 內的 `)` 不算。 */
function readInner(line: string, open: number): { inner: string; end: number } | null {
  let depth = 0;
  let inBracket = false;
  for (let i = open; i < line.length; i++) {
    const c = line[i];
    if (c === '[') inBracket = true;
    else if (c === ']') inBracket = false;
    else if (!inBracket && c === '(') depth++;
    else if (!inBracket && c === ')') {
      depth--;
      if (depth === 0) return { inner: line.slice(open + 1, i), end: i + 1 };
    }
  }
  return null;
}

const TAG = /\^([a-z]+)([^\s[\]()]*)(?:\[([^\]]*)\])?/g;

/**
 * 塊標題正規化：`^ck#d1(^z1[書名] ^h[副題])` → `^ck#d1(書名)^h[副題]`。
 * 夾文裡的 `^n`／`^f` 搬到塊後面（`^n553-586` 這種 errata 注入的段號才不會被吃進塊名）。
 */
function fixChunkTitle(line: string, st: Stat): string {
  let out = '';
  let i = 0;
  for (;;) {
    const at = line.indexOf('^ck#', i);
    if (at < 0) return out + line.slice(i);
    const open = line.indexOf('(', at);
    if (open < 0) return out + line.slice(i);
    const got = readInner(line, open);
    if (!got) return out + line.slice(i);

    const { inner, end } = got;
    const parts: { kind: string; id: string; text: string }[] = [];
    let last = 0;
    for (const m of inner.matchAll(TAG)) {
      const lit = inner.slice(last, m.index).trim();
      if (lit) parts.push({ kind: 'text', id: '', text: lit });
      parts.push({ kind: m[1], id: m[2] ?? '', text: m[3] ?? '' });
      last = (m.index ?? 0) + m[0].length;
    }
    const tail = inner.slice(last).trim();
    if (tail) parts.push({ kind: 'text', id: '', text: tail });

    const titles = parts.filter((p) => p.kind === 'z' && p.id === '1' && p.text.trim());
    const heads = parts.filter((p) => p.kind === 'h' && p.text.trim());
    const literals = parts.filter((p) => p.kind === 'text');
    const marks = parts.filter((p) => p.kind === 'n' || p.kind === 'f');
    const extras = parts.filter(
      (p) => (p.kind === 'z' && p.id !== '1' && p.text.trim()) || p.kind === 'h',
    );

    let name = '';
    let usedHead = false;
    if (titles.length) {
      name = ws(titles[0].text);
      usedHead = false;
    } else if (heads.length) {
      name = ws(heads[0].text);
      usedHead = true;
    } else if (literals.length) {
      name = ws(literals[0].text);
    }
    const extraHeads = extras
      .filter((p) => !(usedHead && p.kind === 'h' && p === heads[0]))
      .map((p) => `^h[${ws(p.text)}]`)
      .join('');
    const literalTail =
      literals.length && name !== ws(literals[0].text)
        ? literals.map((p) => ws(p.text)).join(' ')
        : '';
    const literalHead = literalTail ? `^h[${literalTail}]` : '';
    const markOut = marks.map((p) => `^${p.kind}${p.id}`).join('');

    const chunk = `^ck#${line.slice(at + 4, open).trim()}(${name})`;
    const rebuilt = chunk + literalHead + extraHeads + markOut;
    if (rebuilt !== line.slice(at, end)) st.chunks++;
    if (markOut) st.moved++;
    out += line.slice(i, at) + rebuilt;
    i = end;
  }
}

if (import.meta.main) {
  const files = readdirSync(SRC)
    .filter((f) => f.endsWith('.bb.off') && !SKIP.test(f))
    .sort();
  if (!files.length) {
    console.error(`找不到 ${SRC}/*.bb.off`);
    process.exit(2);
  }
  mkdirSync(OUT, { recursive: true });
  const stats: Stat[] = [];
  const report: string[] = [];
  for (const f of files) {
    const book = f.replace(/\.bb\.off$/, '');
    const st: Stat = { book, italics: 0, chunks: 0, moved: 0, nbsp: 0, stray: 0, merged: 0, pages: 0, missing: 0, errata: 0, noteGap: 0, amp: 0 };
    let t = readFileSync(join(SRC, f), 'utf8').replace(/\r\n?/g, '\n');
    st.nbsp = (t.match(/\u00a0/g) ?? []).length;
    t = t.replace(/\u00a0/g, ' ');
    t = stripItalics(t, st);
    // 來源殘留的 HTML 實體頁碼（cleanhtml.js 的 replaceSN 想清掉、但 regex 寫壞了）：
    // `&lt; 11 &gt;`、`&lt;22–23&gt;` 是 1998 年版 PTS 頁碼，不是正文。清掉也順便把裸 `&` 清掉。
    t = t.replace(/&lt;\s*\d+(?:[–-]\d+)?\s*&gt;/g, () => {
      st.pages++;
      return '';
    });
    // dn3 的 `^missing`（epub 轉檔時標「這裡的原文缺失」）→ 共用的 `^miss`（→ `<缺/>`）
    t = t.replace(/\^missing\b/g, () => {
      st.missing++;
      return '^miss';
    });
    // 註號後面緊接標點（`^f151...`、`^f243- so it is`）：轉檔器會把 `.`／`-` 讀進 id，
    // 變成 `<註 n="151.."/>` 對不到 `<釋 n="151">`。補一個空白把 id 與標點分開。
    t = t.replace(/\^f(\d+)(?=[^\d\s])/g, (_m, n: string) => {
      st.noteGap++;
      return `^f${n} `;
    });
    // 塊標題被硬換行切開（sn5 的 `^cksn#s48i(^n553-586\n )`）：接回一行，
    // 夾文裡的段號搬到塊後面；行數不變（原來的第二行變成空行）。
    t = t.replace(
      /\^(ck|cksn|ckan)#([^\s(]+)\(([^)\n]*)\n[ \t]*\)/g,
      (_m, kind: string, id: string, inner: string) => {
        st.merged++;
        return `^${kind}#${id}()${inner.trim()}\n`;
      },
    );
    // 手工勘誤（見檔頭的 ERRATA）：只加段號、不改文字
    for (const e of ERRATA.filter((x) => x.book === book)) {
      const at = t.indexOf(e.from);
      if (at < 0) {
        console.warn(`勘誤沒套上（找不到字串）：${book} — ${e.why}`);
        continue;
      }
      t = t.replace(e.from, e.to);
      st.errata++;
    }
    const lines = t.split('\n').map((line) => {
      let l = fixChunkTitle(line, st);
      // 行尾孤立的 ^（來源的續行記號）：轉檔器只會發警告，這裡先清掉
      if (/\^$/.test(l.replace(/[ \t]+$/, ''))) {
        st.stray++;
        l = l.replace(/\^[ \t]*$/, '');
      }
      return l.replace(/[ \t]+$/, '');
    });
    writeFileSync(join(OUT, `${book}.off`), lines.join('\n'), 'utf8');
    // 註文裡有裸 `&`（"Watts & Co."、"Ee1 & 2"）：adb 是 XML，`&` 要轉義，否則整檔不合法。
    const tsv = readFileSync(join(SRC, `${book}.notes.tsv`), 'utf8').replace(
      /&(?!(?:amp|lt|gt|quot|apos);)/g,
      () => {
        st.amp++;
        return '&amp;';
      },
    );
    writeFileSync(join(OUT, `${book}.notes.tsv`), tsv, 'utf8');
    stats.push(st);
    const line =
      `${book.padEnd(5)} 斜體 ${String(st.italics).padStart(4)}  塊名 ${String(st.chunks).padStart(3)}` +
      `  搬出段/註 ${String(st.moved).padStart(2)}  接行 ${st.merged}  nbsp ${String(st.nbsp).padStart(4)}` +
      `  註號補空白 ${st.noteGap}  註文& ${st.amp}  孤立^ ${st.stray}  勘誤 ${st.errata}`;
    console.log(line);
    report.push(line);
  }
  const sum = stats.reduce(
    (a, s) => ({ italics: a.italics + s.italics, chunks: a.chunks + s.chunks, moved: a.moved + s.moved }),
    { italics: 0, chunks: 0, moved: 0 },
  );
  const total =
    `bb-src：${files.length} 冊；斜體 ${sum.italics}、塊名改寫 ${sum.chunks}、搬出段/註 ${sum.moved}`;
  console.log(total);
  report.push(total);
  writeFileSync(join(ROOT, 'out', 'bb-src-report.txt'), report.join('\n') + '\n', 'utf8');
}



