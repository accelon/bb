#!/usr/bin/env bun
/**
 * `snp`（菩提比丘《Suttanipāta》英譯，含註釋）→ Accelon XML。
 *
 *   bun run src/snp2accelon.ts            # 全部
 *   bun run src/snp2accelon.ts --report   # 只印統計，不寫檔
 *
 * 來源是 `epub/snp/`（`snp.epub.zip` 解開；pdftohtml 產生的 HTML，一行一個 `<p>`，
 * 行內沒有段落資訊，所以散文只能按行重組）。產出：
 *
 *   data/bb/snp.xml      譯文（PTS 偈 1–1149），段號用 `cs`（CST／緬甸）
 *   data/bb/snp-fn.xml   譯文的註（1–223）
 *   data/bb/snp-c.xml    註釋書（Paramatthajotikā II 英譯，按偈解釋；段號＝PTS 偈號）
 *   data/bb/snp-c-fn.xml 註釋書的註
 *   out/snp-report.txt   逐經對齊方式與數字
 *
 * **段對齊**：`cs` 一頌通常兩段（四句）或三段（六句）。PTS 與 CST 的分偈不完全相同
 * （例 Hemavata：PTS 28 偈、CST 30 偈），所以：
 *   - 偈數與 `cs` 的偈組數相同 → 一對一（大多數）；
 *   - 不同 → 按比例分配（段號序列仍與 `cs` 完全相同，段界是近似）。
 * 偈內的英文按行切成該組的段數（四句偈＝2 段、六句偈＝3 段）。
 *
 * 註（footnotes）：譯文的 `[n]` 是「Notes to the Suttanipāta」的編號（1–223），
 * 轉成 `<註 n="n"/>`；註文在 `snp-fn.xml`。註釋書的行內註號是直接黏在字尾的數字
 * （`world.247`），無法可靠切出，留在正文（原文數字不動）。
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './profiles';

const EPUB = join(ROOT, 'epub', 'snp');
const CS = 'D:/2026/sz/data/cs/snp.xml';
const OUT = join(ROOT, 'out');
const DATA = join(ROOT, 'data', 'bb');

// ---------------------------------------------------------------- HTML → 行

const decode = (s: string): string =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

function readLines(): string[] {
  const out: string[] = [];
  for (const f of readdirSync(EPUB)
    .filter((x) => /^index_split_\d+\.html$/.test(x))
    .sort()) {
    const html = readFileSync(join(EPUB, f), 'utf8');
    for (const m of html.matchAll(/<(?:p|h[1-4])[^>]*>([\s\S]*?)<\/(?:p|h[1-4])>/g)) {
      const text = decode(m[1].replace(/<[^>]+>/g, ''))
        .replace(/[\s\u00a0]+/g, ' ')
        .trim();
      if (text) out.push(text);
    }
  }
  return out;
}

// ---------------------------------------------------------------- 規則

const RUNHEAD =
  /^(?:\d+ )?The Suttanipāta$|^\d+ The Suttanipāta$|^A Guide to the Suttas(?: \d+)?$|^Elucidator of the/;
const CHAPTER_RUN = /^(?:[IVX]+ .+?) \d+$/;
const CHAPTER =
  /^(?:[IVX]+ The Chapter on .+|II The Minor Chapter|III The Great Chapter|IV The Chapter of Octads)$/;
const VAGGA_PALI = /^[A-Za-zāīūṃṅñṭḍṇḷ]+vagga$/;
const VERSE_START = /^(?:\[[^\]]{0,60}\]\s*)?(?:\[\d+\]\s*)?\d+[A-Z]?\./;
const VERSE_END = /\((\d+)\)(?:\s*\[\d+\])?\s*$/;
const HEADING_START = /^\d+ [A-Z(“"]/;

const isJunk = (l: string): boolean =>
  !l ||
  /^\d+$/.test(l) ||
  RUNHEAD.test(l) ||
  /^(?:[IVX]+ .+?) \d+$/.test(l) ||
  /^Homage to the Blessed One,$|^the Worthy One,$|^the Perfectly Enlightened One$/.test(l);

const plain = (s: string): string => s.replace(/<[^>]*>/g, '');

/** 經名整理：`5 Māgha (Māgha Sutta)` → `5. Māgha (Māgha Sutta)` */
const fmtName = (s: string): string =>
  s.replace(/^(\d+) /, '$1. ').replace(/\s+/g, ' ').trim();

/** `[12]` → `<註 n="12"/>`（位置保留） */
/** `[12]` → `<pb n="12"/>`（這本書的 `[n]` 是 1998 年版的**頁**號，不是註號） */
const inlinePages = (s: string): string => s.replace(/\s*\[(\d+)\]\s*/g, '<pb n="$1"/>');

/** 黏在字尾的數字（`shed,68`、`world.247`）是註號：64–250 之間才算，換成 `<註>`。 */
const inlineNotes = (s: string): string =>
  s.replace(/([A-Za-zāīūṃṅñṭḍṇḷĀĪŪ,;:.’”)])(\d{2,4})(?=\s|$)/g, (m, pre: string, num: string) => {
    const n = Number(num);
    return n >= 64 && n <= 250 ? `${pre}<註 n="${n}"/>` : m;
  });

// ---------------------------------------------------------------- cs 結構

interface CsSeg {
  n: string;
  verse: boolean;
  /** 這一節以「॥」結尾＝一頌的最後半頌 */
  end: boolean;
}
interface CsSutta {
  name: string;
  ck: string;
  segs: CsSeg[];
}

function readCs(): { suttas: CsSutta[]; chunkName: Map<string, string> } {
  const xml = readFileSync(CS, 'utf8');
  const chunkName = new Map<string, string>();
  for (const m of xml.matchAll(/<塊 id="([^"]+)"[^>]*>\(([^)]*)\)/g)) chunkName.set(m[1], m[2]);
  const out: CsSutta[] = [];
  let ck = '';
  let cur: CsSutta | null = null;
  for (const m of xml.matchAll(/<塊 id="([^"]+)"|<小節>\(([^)]*)\)|<段 n="([^"]+)"\/>([^\n]*)/g)) {
    if (m[1]) {
      ck = m[1];
      continue;
    }
    if (m[2]) {
      cur = { name: m[2], ck, segs: [] };
      out.push(cur);
      continue;
    }
    if (m[3] && cur) {
      const raw = m[4] ?? '';
      cur.segs.push({ n: m[3], verse: raw.includes('偈'), end: plain(raw).includes('॥') });
    }
  }
  return { suttas: out, chunkName };
}

// ---------------------------------------------------------------- 解析譯文

interface Verse {
  k: number;
  lines: string[];
}
interface BbSutta {
  name: string;
  verses: Verse[];
  prose: string[];
  /** 標題前的註號（如 `[190] Introductory Verses`） */
  headNotes: number[];
}

/** 去掉偈首的 PTS 偈號與偈尾的 (k)；頁／註標籤保留。 */
function cleanVerse(lines: string[]): string[] {
  const out = lines.map((l) => inlineNotes(inlinePages(l)));
  const m = /^((?:\s*(?:<pb n="\d+"\/>|<註 n="\d+"\/>))*)\s*(?:<pb n="\d+"\/>\s*)?\d+[A-Z]?\.\s*/.exec(out[0]);
  if (m) out[0] = m[1] + out[0].slice(m[0].length);
  const last = out.length - 1;
  // 偈尾的 (k)；後面可能還跟著頁／註標籤，要保留標籤、只去掉 (k)
  out[last] = out[last].replace(/\(\d+\)(?=\s*(?:<pb n="\d+"\/>|<註 n="\d+"\/>)*\s*$)/, '');
  return out.map((l) => l.trim()).filter(Boolean);
}

function parseTranslation(trans: string[]): BbSutta[] {
  // 1) 切成「一偈一塊」（到下一個 (k) 結尾）
  const chunks: { lines: string[]; k: number }[] = [];
  let buf: string[] = [];
  for (const l of trans) {
    if (CHAPTER.test(l) || VAGGA_PALI.test(l)) continue;
    buf.push(l);
    const m = VERSE_END.exec(l);
    if (m) {
      chunks.push({ lines: buf, k: Number(m[1]) });
      buf = [];
    }
  }
  if (buf.length) chunks.push({ lines: buf, k: 0 });

  // 2) 以 k===1 分經。經標題不一定在塊首（上一經的尾巴散文可能先出現），
  //    所以在偈首之前的行裡找第一個標題。
  const HEAD = new RegExp(
    '^(?:\\[\\d+\\]\\s*)*(?:\\d+ (?:\\p{Lu}|[“(])|\\([^)]*Sutta\\)|Introductory Verses\\d*$|Epilogue\\d*$|Conclusion\\d*$)',
    'u',
  );
  const suttas: BbSutta[] = [];
  let cur: BbSutta | null = null;
  for (const c of chunks) {
    const lines = [...c.lines];
    let vs = lines.findIndex((l) => VERSE_START.test(l));
    if (vs < 0) vs = lines.length;
    if (c.k === 1 || !cur) {
      // 找標題（可能在塊首的前幾行；前面的是上一經的尾散文）
      let hi = -1;
      for (let i = 0; i < vs; i++) {
        if (HEAD.test(lines[i]) && !VERSE_START.test(lines[i]) && lines[i].length < 90) {
          hi = i;
          break;
        }
      }
      let name = '';
      const headNotes: number[] = [];
      if (hi >= 0) {
        let raw = lines[hi];
        // 標題前可能有註號：`[190] Introductory Verses223`
        raw = raw.replace(/^(?:\s*\[(\d+)\])+/, (m0) => {
          for (const x of m0.matchAll(/\[(\d+)\]/g)) headNotes.push(Number(x[1]));
          return '';
        });
        lines[hi] = raw.trim();
        if (!lines[hi]) {
          lines.splice(hi, 1);
          hi = -1;
        }
      }
      if (hi >= 0) {
        name = lines[hi];
        let remove = 1;
        if (
          !/Sutta\)\s*\d*$/.test(name) &&
          /^\([^)]*Sutta\)\s*\d*$/.test(lines[hi + 1] ?? '')
        ) {
          name += ' ' + lines[hi + 1];
          remove = 2;
        }
        name = name.replace(/\d+$/, '').trim();
        const before = lines.slice(0, hi);
        if (before.length && cur) cur.prose.push(inlineNotes(inlinePages(before.join(' '))));
        lines.splice(0, hi + remove);
        vs = lines.findIndex((l) => VERSE_START.test(l));
        if (vs < 0) vs = lines.length;
      }
      cur = { name: name || `sutta-${suttas.length + 1}`, verses: [], prose: [], headNotes };
      suttas.push(cur);
    }
    const prose = lines.slice(0, vs).map((l) => l.trim()).filter(Boolean);
    if (prose.length) cur.prose.push(inlineNotes(inlinePages(prose.join(' '))));
    if (vs < lines.length) cur.verses.push({ k: c.k, lines: cleanVerse(lines.slice(vs)) });
  }
  return suttas;
}

// ---------------------------------------------------------------- 切段

/** 多行 → k 塊（行界、長度平均）。 */
function splitLines(lines: string[], k: number): string[] {
  if (k <= 0) return [];
  if (lines.length <= k) return lines;
  const total = lines.reduce((a, l) => a + l.length, 0);
  const out: string[] = [];
  let from = 0;
  let acc = 0;
  for (let i = 0; i < k - 1; i++) {
    const target = (total * (i + 1)) / k;
    let best = from + 1;
    let bestDiff = Infinity;
    let a = acc;
    for (let j = from; j < lines.length - (k - 1 - i); j++) {
      a += lines[j].length;
      const d = Math.abs(a - target);
      if (d < bestDiff) {
        bestDiff = d;
        best = j + 1;
      }
    }
    out.push(lines.slice(from, best).join(' ').trim());
    for (let j = from; j < best; j++) acc += lines[j].length;
    from = best;
  }
  out.push(lines.slice(from).join(' ').trim());
  return out;
}

/** 偈的文字按「行數」平均切成 k 段（一頌兩行＝一段；行數不足才退回按字數）。 */
function splitByLines(lines: string[], k: number): string[] {
  if (k <= 0) return [];
  if (k === 1) return [lines.join(' ').trim()];
  const n = lines.length;
  if (n < k) return splitLines(lines, k);
  const out: string[] = [];
  let from = 0;
  for (let i = 0; i < k; i++) {
    const size = Math.round((n * (i + 1)) / k) - Math.round((n * i) / k);
    out.push(lines.slice(from, from + size).join(' ').trim());
    from += size;
  }
  return out;
}

/** 散文 → k 塊（按句切，盡量平均）。 */
function splitText(text: string, k: number): string[] {
  if (k <= 0) return [];
  if (k === 1) return [text];
  const parts = text.split(/(?<=[.!?”’])\s+(?=[“A-Z(\[])/);
  if (parts.length >= k) {
    const out: string[] = [];
    for (let i = 0; i < k; i++) {
      const a = Math.round((i * parts.length) / k);
      const b = Math.round(((i + 1) * parts.length) / k);
      out.push(parts.slice(a, b).join(' ').trim());
    }
    return out.filter(Boolean);
  }
  return splitLines([text], k);
}

// ---------------------------------------------------------------- 註文

/** adb 是 XML：註文裡的 `&`／`<`／`>` 要轉義。 */
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '＜').replace(/>/g, '＞');

/** 讀「Notes to …」各組（書末註）。回傳 組名 → 編號 → 注文。 */
function readNotes(lines: string[]): Map<string, Map<number, string>> {
  const heads = [
    'Notes to the Introduction and Guide',
    'Notes to the Suttanipāta',
    'Notes to the Suttanipāta Commentary',
    'Pāli-English Glossary',
  ];
  const at = heads.map((h) => lines.findIndex((l) => l === h));
  const out = new Map<string, Map<number, string>>();
  for (let g = 0; g < heads.length - 1; g++) {
    if (at[g] < 0 || at[g + 1] < 0) continue;
    const notes = new Map<number, string>();
    let cur = -1;
    let expect = 0;
    for (const l of lines.slice(at[g] + 1, at[g + 1])) {
      if (!l || /^\d+$/.test(l) || RUNHEAD.test(l) || /^(?:[IVX]+ .+?) \d+$/.test(l)) continue;
      const m = /^(\d+)\.\s+(.*)$/.exec(l);
      if (m) {
        const n = Number(m[1]);
        // 只收「接得上」的註號：正文裡的「146. …」這種引用不要當成註
        if (expect && (n < expect - 5 || n > expect + 40)) {
          if (cur >= 0) notes.set(cur, (notes.get(cur) ?? '') + ' ' + l);
          continue;
        }
        cur = n;
        expect = n + 1;
        notes.set(cur, m[2]);
      } else if (cur >= 0) {
        notes.set(cur, (notes.get(cur) ?? '') + ' ' + l);
      }
    }
    out.set(heads[g], notes);
  }
  return out;
}

// ---------------------------------------------------------------- 註釋書

interface ComSeg {
  n: string;
  text: string[];
}
interface ComSutta {
  name: string;
  segs: ComSeg[];
}
interface ComChunk {
  id: string;
  name: string;
  suttas: ComSutta[];
}

/**
 * 註釋書：一章一個 `<塊>`、一經一個 `<小節>`、一段一個 `<段 n="偈號">`。
 * 段落以 `N. `（有句點）開頭；經標題是 `N 名稱`（沒有句點）。
 */
function parseCommentary(lines: string[]): ComChunk[] {
  const start = lines.findIndex(
    (l, i) => l === 'The Commentary to the Suttanipāta' && lines[i + 1] === 'Homage to the Blessed One,',
  );
  const end = lines.findIndex((l, i) => i > start && l === 'Appendix 1');
  const body = lines.slice(start + 5, end).filter((l) => !isJunk(l));
  const chunks: ComChunk[] = [];
  let ck: ComChunk | null = null;
  let sutta: ComSutta | null = null;
  let seg: ComSeg | null = null;
  const flushSeg = () => {
    if (seg && sutta && seg.text.length) sutta.segs.push(seg);
    seg = null;
  };
  const ensure = () => {
    if (!ck) {
      ck = { id: 'snp-c-0', name: 'The Purpose of This Work', suttas: [] };
      chunks.push(ck);
    }
    if (!sutta) {
      sutta = { name: 'The Purpose of This Work', segs: [] };
      ck.suttas.push(sutta);
    }
  };
  for (let i = 0; i < body.length; i++) {
    const l = body[i];
    const chap = /^(?:[IVX]+ The Chapter on .+|II The Minor Chapter|III The Great Chapter|IV The Chapter of Octads)$/.exec(l);
    if (chap) {
      flushSeg();
      ck = { id: `snp-c-${chunks.length}`, name: l, suttas: [] };
      chunks.push(ck);
      sutta = null;
      if (/^\(\s*[A-Za-zāīūṃṅñṭḍṇḷ]+vagga\s*\)$/.test(body[i + 1] ?? '')) i++;
      continue;
    }
    const suttaHead = /^(\d+) (?:(\p{Lu}.*))$/u.exec(l);
    if (suttaHead && !/^\d+\./.test(l) && l.length < 90 && /^\(\s*[^)]*Sutta\s*\)$/.test(body[i + 1] ?? '')) {
      flushSeg();
      ensure();
      sutta = { name: `${suttaHead[1]}. ${suttaHead[2]}`, segs: [] };
      ck!.suttas.push(sutta);
      i++;
      continue;
    }
    const para = /^(\d+)\.\s+(.*)$/.exec(l);
    if (para) {
      flushSeg();
      ensure();
      seg = { n: para[1], text: [para[2]] };
      continue;
    }
    if (seg) {
      seg.text.push(l);
    } else {
      ensure();
      // 沒有段號的開頭文字（標題、題辭）先掛在 n=0
      if (!sutta!.segs.length || sutta!.segs[sutta!.segs.length - 1].n !== '0') {
        sutta!.segs.push({ n: '0', text: [] });
      }
      sutta!.segs[sutta!.segs.length - 1].text.push(l);
    }
  }
  flushSeg();
  return chunks;
}

// ---------------------------------------------------------------- 主程式

if (import.meta.main) {
  const lines = readLines();
  const startAt = lines.findIndex(
    (l, i) => l === 'Homage to the Blessed One,' && lines[i + 1] === 'the Worthy One,',
  );
  const endAt = lines.findIndex((l) => l === 'The Suttanipāta is completed.');
  const trans = lines.slice(startAt, endAt).filter((l) => !isJunk(l));
  const { suttas: cs, chunkName } = readCs();
  const bb = parseTranslation(trans);
  const report: string[] = [];
  console.log(`HTML ${lines.length}；譯文 ${trans.length}；bb ${bb.length} 經；cs ${cs.length} 經`);
  report.push(`bb 經 ${bb.length}、cs 經 ${cs.length}`);
  report.push(
    `bb 偈 ${bb.reduce((a, s) => a + s.verses.length, 0)}；cs 段 ${cs.reduce((a, s) => a + s.segs.length, 0)}`,
  );

  // 最後幾經合併（bb 的 Epilogue 對到 cs 72+73）
  const targets: { suttas: CsSutta[]; merged: boolean }[] = cs.map((s) => ({ suttas: [s], merged: false }));
  if (cs.length > bb.length) {
    const at = bb.length - 1;
    const extra = cs.length - bb.length;
    targets.splice(at, extra + 1, { suttas: cs.slice(at, at + extra + 1), merged: true });
  }

  const xmlLines: string[] = ['<書 id="snp" t="塊.">(Suttanipāta)</書>'];
  let ckNow = '';
  let emitted = 0;
  let proportional = 0;

  for (let i = 0; i < bb.length; i++) {
    const s = bb[i];
    const t = targets[i];
    const segs = t.suttas.flatMap((x) => x.segs);
    const firstCk = t.suttas[0].ck;
    if (firstCk !== ckNow) {
      ckNow = firstCk;
      xmlLines.push(`<塊 id="${firstCk}">(${chunkName.get(firstCk) ?? firstCk})</塊>`);
    }
    xmlLines.push(`<小節>${fmtName(s.name)}</小節>`);

    const verseIdx = segs.map((x, j) => (x.verse ? j : -1)).filter((j) => j >= 0);
    const groups: number[][] = [];
    let g: number[] = [];
    for (const j of verseIdx) {
      g.push(j);
      if (segs[j].end) {
        groups.push(g);
        g = [];
      }
    }
    if (g.length) groups.push(g);
    const proseIdx = segs.map((x, j) => (x.verse ? -1 : j)).filter((j) => j >= 0);

    const V = s.verses.length;
    const G = groups.length;
    const segText = new Map<number, string>();
    let drift = 0;
    if (V === G) {
      // 偈數相同：一對一（PTS 與 CST 分偈一致）
      for (let v = 0; v < V; v++) {
        const targetSegs = groups[v];
        const parts = splitByLines(s.verses[v].lines, targetSegs.length);
        targetSegs.forEach((j, x) => segText.set(j, parts[x] ?? ''));
      }
    } else {
      // 偈數不同：按「行數／2」的比例對到 cs 的偈組（一行≈一句，一頌兩行≈一段）；
      // 這樣長偈會拿到較多段，比平均分配貼近原書。
      proportional++;
      const w = s.verses.map((v) => Math.max(0.5, v.lines.length / 2));
      const totalW = w.reduce((a, b) => a + b, 0);
      const b: number[] = [0];
      let acc = 0;
      for (const x of w) {
        acc += (x * G) / totalW;
        b.push(acc);
      }
      const pools: { lines: string[]; gs: number[] }[] = [];
      let a = 0;
      for (let v = 0; v < V; v++) {
        let z = v === V - 1 ? G : Math.max(a + 1, Math.round(b[v + 1]));
        z = Math.min(z, G);
        if (a >= G) {
          // 段用完了：這一偈併到最後一組
          pools[pools.length - 1].lines.push(...s.verses[v].lines);
          drift = Math.max(drift, Math.abs(b[v + 1] - G));
          continue;
        }
        drift = Math.max(drift, Math.abs(b[v + 1] - z));
        pools.push({ lines: [...s.verses[v].lines], gs: Array.from({ length: z - a }, (_, x) => a + x) });
        a = z;
      }
      let fit = 0;
      for (const p of pools) {
        const targetSegs = p.gs.flatMap((gi) => groups[gi]);
        if (Math.abs(p.lines.length / 2 - targetSegs.length) <= 0.5) fit++;
        const parts = splitByLines(p.lines, targetSegs.length);
        targetSegs.forEach((j, x) => segText.set(j, parts[x] ?? ''));
      }
      report.push(
        `  ${s.name}：bb 偈 ${V}、cs 偈組 ${G} → 按行數比例（最大偏差 ${drift.toFixed(1)} 段；` +
          `行數／2 與段數吻合 ${fit}/${pools.length} 偈）`,
      );
    }
    // 散文：整經的散文（照出現順序）按段數切
    if (s.prose.length && proseIdx.length) {
      const text = s.prose.join(' ');
      const parts = splitText(text, proseIdx.length);
      proseIdx.forEach((j, x) => segText.set(j, parts[x] ?? ''));
    }

    // 標題前的註號放到這一經的第一段
    if (s.headNotes.length && segs.length) {
      const first = 0;
      const prefix = s.headNotes.map((n) => `<註 n="${n}"/>`).join('');
      segText.set(first, prefix + (segText.get(first) ?? ''));
    }

    const nextSuttaFirst = t.suttas.length > 1 ? t.suttas[1].segs[0]?.n : undefined;
    for (let j = 0; j < segs.length; j++) {
      if (nextSuttaFirst && segs[j].n === nextSuttaFirst) {
        xmlLines.push(`<小節>${fmtName(t.suttas[1].name)}</小節>`);
      }
      xmlLines.push(`<段 n="${segs[j].n}"/> ${(segText.get(j) ?? '').replace(/\s+/g, ' ').trim()}`.trimEnd());
      emitted++;
    }
  }

  const joined = xmlLines.join('\n');
  const pbCount = (joined.match(/<pb n=/g) ?? []).length;
  const noteCount = (joined.match(/<註 n=/g) ?? []).length;
  report.unshift(`段 ${emitted}；按比例分配的經 ${proportional}；頁 ${pbCount}；註號 ${noteCount}`);
  console.log(report.slice(0, 10).join('\n'));
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'snp-report.txt'), report.join('\n') + '\n', 'utf8');
  if (!process.argv.includes('--report')) {
    mkdirSync(DATA, { recursive: true });
    writeFileSync(join(DATA, 'snp.xml'), joined + '\n', 'utf8');
    // 註文：譯文組（64–246）＋譯文引用到的其他組註號（例 epilogue 的 250）
    const groups = readNotes(lines);
    const fnMap = new Map<number, string>(groups.get('Notes to the Suttanipāta') ?? []);
    const usedRefs = new Set(
      [...joined.matchAll(/<註 n="(\d+)"\/>/g)].map((m) => Number(m[1])),
    );
    for (const n of usedRefs) {
      if (fnMap.has(n)) continue;
      for (const [, g] of groups) if (g.has(n)) fnMap.set(n, g.get(n)!);
    }
    const fn: string[] = [];
    for (const [n, text] of [...fnMap].sort((a, b) => a[0] - b[0])) {
      fn.push(`<釋 n="${n}">${esc(text.replace(/\s+/g, ' ').trim())}</釋>`);
    }
    writeFileSync(join(DATA, 'snp-fn.xml'), fn.join('\n') + '\n', 'utf8');

    // 註釋書（另一本檔）
    const com = parseCommentary(lines);
    const cLines: string[] = ['<書 id="snp-c" t="塊.">(Suttanipāta 註釋書（Paramatthajotikā II）)</書>'];
    let cSegs = 0;
    for (const c of com) {
      cLines.push(`<塊 id="${c.id}">(${c.name})</塊>`);
      for (const s of c.suttas) {
        if (s.name) cLines.push(`<小節>${fmtName(s.name)}</小節>`);
        for (const g of s.segs) {
          const text = esc(g.text.join(' ').replace(/\s+/g, ' ').trim());
          cLines.push(`<段 n="${g.n}"/> ${text}`.trimEnd());
          cSegs++;
        }
      }
    }
    writeFileSync(join(DATA, 'snp-c.xml'), cLines.join('\n') + '\n', 'utf8');

    // 註釋書的註（247 以後）
    const cfn: string[] = [];
    for (const [n, text] of [
      ...(groups.get('Notes to the Suttanipāta Commentary') ?? new Map<number, string>()),
    ].sort((a, b) => a[0] - b[0])) {
      cfn.push(`<釋 n="${n}">${esc(text.replace(/\s+/g, ' ').trim())}</釋>`);
    }
    writeFileSync(join(DATA, 'snp-c-fn.xml'), cfn.join('\n') + '\n', 'utf8');
    console.log(
      `寫出 ${xmlLines.length} 行 → data/bb/snp.xml；註 ${fn.length} 條 → snp-fn.xml；` +
        `註釋 ${cSegs} 段、註 ${cfn.length} 條 → snp-c.xml／snp-c-fn.xml`,
    );
  }
}





