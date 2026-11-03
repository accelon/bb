#!/usr/bin/env bun
/**
 * 段對齊驗收：`data/bb/*.xml` 的 `<段 n>` 是否與 `cs`（緬甸傳統段號）相同。
 *
 *   bun run src/align-check.ts
 *
 * 為什麼以 `cs` 為準：`bb`（菩提比丘／沃爾什英譯）的 epub 用的是 **PTS 段號**；
 * 2023 年的 `gen.js` 已經用 `D:\2023\sc\template\*.off` 把它套成 **msdiv** 段號
 * （msdiv 來自 bilara-data 的 `reference/pli/ms/**`，就是緬甸第六次結集的段號），
 * 所以 `bb` 的 `<段 n>` 應該和 `cs` 逐段相同（含 `120-139` 這種範圍段）。
 * 這個腳本只驗號碼與段數，**不驗段內文字**（句對齊是下一步）。
 *
 * 另外列三種「先記下來、之後要修」的數字：
 *   - 空段：這一段沒有任何正文（譯本省略、或 epub 轉檔時掉了）→ `out/bb-empty.tsv`
 *   - 孤註：正文有 `<註 n>` 但 `-fn.xml` 沒有對應的 `<釋 n>`
 *   - 裸字元：去掉標籤後的正文還有 `&`／`<`／`>`（XML 不合法）
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './profiles';

const BB = join(ROOT, 'data', 'bb');
const CS = 'D:/2026/sz/data/cs';
const OUT = join(ROOT, 'out', 'bb-align-report.txt');
const EMPTY = join(ROOT, 'out', 'bb-empty.tsv');

const nums = (xml: string, re: RegExp): string[] => [...xml.matchAll(re)].map((m) => m[1]);
const stripTags = (s: string): string => s.replace(/<[^>]*>/g, '');

/** 段號 → 所在的塊 id（`塊.段` 是跨庫定位，塊不能錯） */
function paraChunk(xml: string): Map<string, string> {
  const out = new Map<string, string>();
  let ck = '';
  for (const m of xml.matchAll(/<塊 id="([^"]+)"|<段 n="([^"]+)"/g)) {
    if (m[1]) ck = m[1];
    else if (m[2] && ck) out.set(m[2], ck);
  }
  return out;
}

interface Row {
  book: string;
  bbParas: number;
  csParas: number;
  missing: string[];
  extra: string[];
  empty: { n: string; len: number }[];
  ckDiff: string[];
  notes: number;
  noteTexts: number;
  orphanNotes: string[];
  badChars: number;
}

const lines: string[] = [];
const rows: Row[] = [];
const emptyRows: string[] = ['書\t段\t字母數'];
const books = readdirSync(BB)
  .filter((f) => f.endsWith('.xml') && f !== '00.xml' && !f.endsWith('-fn.xml') && f !== 'snp-c.xml')
  .map((f) => f.replace(/\.xml$/, ''))
  .sort();

for (const book of books) {
  const xml = readFileSync(join(BB, `${book}.xml`), 'utf8');
  const fnPath = join(BB, `${book}-fn.xml`);
  const fn = existsSync(fnPath) ? readFileSync(fnPath, 'utf8') : '';
  const bbN = nums(xml, /<段 n="([^"]+)"/g);
  const csPath = join(CS, `${book}.xml`);
  const csN = existsSync(csPath) ? nums(readFileSync(csPath, 'utf8'), /<段 n="([^"]+)"/g) : [];
  const set = new Set(bbN);
  const csSet = new Set(csN);
  const missing = csN.filter((n) => !set.has(n));
  const extra = bbN.filter((n) => !csSet.has(n));

  const bbCk = paraChunk(xml);
  const csCk = csPath && existsSync(csPath) ? paraChunk(readFileSync(csPath, 'utf8')) : new Map<string, string>();
  const ckDiff = bbN.filter((n) => bbCk.has(n) && csCk.has(n) && bbCk.get(n) !== csCk.get(n));

  // 空段：段落裡除了標籤以外沒有字母
  const empty: { n: string; len: number }[] = [];
  for (const p of xml.split(/(?=<段 n=")/)) {
    if (!p.startsWith('<段 n=')) continue;
    const n = /^<段 n="([^"]+)"/.exec(p)?.[1] ?? '?';
    const body = stripTags(p);
    const len = (body.match(/[A-Za-z]/g) ?? []).length;
    if (len < 3) empty.push({ n, len });
  }
  for (const e of empty) emptyRows.push(`${book}\t${e.n}\t${e.len}`);
  rows.push({
    book,
    bbParas: bbN.length,
    csParas: csN.length,
    missing,
    extra,
    empty,
    ckDiff,
    notes: nums(xml, /<註 n="([^"]+)"/g).length,
    noteTexts: new Set(nums(fn, /<釋 n="([^"]+)"[^>]*>/g)).size,
    orphanNotes: [
      ...new Set(
        nums(xml, /<註 n="([^"]+)"/g).filter(
          (n) => !new Set(nums(fn, /<釋 n="([^"]+)"[^>]*>/g)).has(n),
        ),
      ),
    ],
    badChars: (stripTags(xml).match(/[&<>]/g) ?? []).length,
  });
}

lines.push(`# bb ↔ cs 段對齊報告（${new Date().toISOString()}）`);
lines.push('# 段號：bb 應與 cs（緬甸傳統 msdiv）逐段相同；「註」是文內註號，「釋」是註文條數');
lines.push('');
lines.push('書     bb段  cs段  缺段   多段  空段   註   釋  孤註  裸字元  塊異');
let ok = 0;
for (const r of rows) {
  const same = !r.missing.length && !r.extra.length && r.bbParas === r.csParas;
  if (same) ok++;
  lines.push(
    `${r.book.padEnd(5)} ${String(r.bbParas).padStart(5)} ${String(r.csParas).padStart(5)}` +
      `  ${String(r.missing.length).padStart(3)}  ${String(r.extra.length).padStart(4)}` +
      `  ${String(r.empty.length).padStart(4)} ${String(r.notes).padStart(4)} ${String(r.noteTexts).padStart(4)}` +
      `  ${String(r.orphanNotes.length).padStart(4)}  ${String(r.badChars).padStart(4)}` +
      `  ${String(r.ckDiff.length).padStart(3)}` +
      (same ? '' : '  ←'),
  );
}
const bad = rows.filter((r) => r.missing.length || r.extra.length || r.bbParas !== r.csParas);
lines.push('');
if (bad.length) {
  lines.push(`## 段號不符（${bad.length} 本）`);
  for (const r of bad) {
    lines.push(`- ${r.book}：缺 ${r.missing.join(',') || '—'}；多 ${r.extra.join(',') || '—'}`);
  }
} else {
  lines.push('## 段號：全部相符');
}
const empties = rows.filter((r) => r.empty.length);
if (empties.length) {
  lines.push('', '## 空段（段內沒有正文；譯本省略或 epub 轉檔時掉了，清單在 out/bb-empty.tsv）');
  for (const r of empties) lines.push(`- ${r.book}：${r.empty.length} 段（n=${r.empty.slice(0, 8).map((e) => e.n).join(',')}${r.empty.length > 8 ? '…' : ''}）`);
}
const orphans = rows.filter((r) => r.orphanNotes.length);
if (orphans.length) {
  lines.push('', '## 孤註（有 `<註>` 沒有 `<釋>`）');
  for (const r of orphans) lines.push(`- ${r.book}：n=${r.orphanNotes.join(',')}`);
}
const badChars = rows.filter((r) => r.badChars);
if (badChars.length) {
  lines.push('', '## 裸字元（XML 不合法）');
  for (const r of badChars) lines.push(`- ${r.book}：${r.badChars} 處`);
}
const ckDiffs = rows.filter((r) => r.ckDiff.length);
if (ckDiffs.length) {
  lines.push('', '## 塊不符（同一段在 bb 與 cs 屬於不同的塊，`塊.段` 會跳錯）');
  for (const r of ckDiffs) lines.push(`- ${r.book}：段 ${r.ckDiff.slice(0, 10).join(',')}${r.ckDiff.length > 10 ? '…' : ''}`);
}

writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');
writeFileSync(EMPTY, emptyRows.join('\n') + '\n', 'utf8');
console.log(lines.join('\n'));
console.log(`\n報告：${OUT}\n空段清單：${EMPTY}`);
console.log(`段號相符 ${ok}/${rows.length} 本`);
if (bad.length || badChars.length) process.exit(1);

