# 段號對齊：PTS → msdiv（緬甸傳統）

> 2026-11-03。回答一個問題：`bb`（Walshe／Bodhi 英譯）原本用 **PTS 段號**，
> 本庫要跟 `cs` 一樣用 **緬甸第六次結集（CST／VRI）段號**，這件事是怎麼做的、怎麼驗的。

## 1. 兩套段號

| | PTS | 緬甸（msdiv／CST） |
|---|---|---|
| 誰在用 | Walshe《長部》、Bhikkhu Bodhi《中部／相應部／增支部》的紙本 | `cs`（VRI／CST4）、`cs-mm`、`xsq`、`yh`、`ccc`… 與本庫 `bb` |
| 例（長部一） | DN 1 §1.1 起，`1.1`、`1.2`… `3.74` | `1`、`2`、`3`…（範圍段 `102-109`、`553-586`） |
| 段界 | 依 PTS 排版 | 依第六次結集誦本 |

`cs` 的 `<段 n>` 就是 msdiv：`dn1` 的 `<段 n="1"/>` 是 `evaṃ me sutaṃ…`，
`<段 n="2"/>` 是 `atha kho bhagavā ambalaṭṭhikāyaṃ…`，與 `bilara-data` 的
`reference/pli/ms/**` 裡 `msdiv1`、`msdiv2` 的位置相同。

## 2. 對照表的出處

SuttaCentral 的 bilara-data 在 `reference/pli/ms/<pitaka>/<book>/<sutta>_reference.json`
為每一個 segment 列出各版本的頁／段：

```json
"dn1:1.1.1": "bj7.2, cck9.1, …, msdiv1, pts-cs1.1, pts-vp-pli1.1, …, vri1.1",
"dn1:1.2.1": "…, msdiv2, pts-cs1.2, …, vri1.2",
"mn1:3.1":  "ms9M_3, msdiv2, nya3, sya12.2, vri12.2"
```

- `msdivN` ＝ 緬甸第六次結集段號（＝`cs` 的 `段`）
- `pts-cs`／`pts-vp-pli` ＝ PTS 的章節／卷頁（英國傳統）
- `vri` ＝ VRI 版頁．行

本機的這一份在：
`D:\2026\sc\scdata\ref\sc_bilara_data\reference\pli\ms\sutta\…`
（`D:\2023\milinda\bilara-data` 是空目錄；`D:\2023\sc` 是 2023 年的 sc 工作區。）

## 3. 2023 年的管線已經做過轉換

`off/*.bb.off` 的 `^n` **不是** PTS 段號，而是 msdiv。流程是：

1. `tidy.js`：把 epub 的每個 **PTS 段落**（`1.1`、`1.2`…）按 SC 對應 segment 的行數切開，
   寫成 `json/<書>.json`（key ＝ `dn1:1.1.1` 這種 SC segment id）。
2. `../sc/template.js`：讀 bilara-data 的 `reference`，把同一 `msdiv` 的 segment 歸成一組，
   在每組前面放 `^n<msdiv>`，產生 `D:\2023\sc\template\<書>.off`
   （例：`^n1 <mn1:1.1>…<mn1:2.4>`／`^n2 <mn1:3.1>…`）。
3. `gen.js`：`fillTemplate(template, json)` 把英譯填進 segment，`^n` 原樣留下 →
   `off/<書>.bb.off`。

所以 off 的段號已經是緬甸版；`docs/alignment.md` 這一份記錄的是「怎麼確認它真的對」，
以及哪些地方還是 PTS 的痕跡。

旁證：`D:\2023\xsq\off` 的蕭式球譯本同時帶 `^m`（PTS 段號）與 `^n`（緬甸段號），
`^m1 ^n1`、`^m2 ^n2`… 一一對應；`bb` 的 off 只剩 `^n`，是因為 template 只保留了 msdiv。

## 4. 驗證（2026-11-03）

`bun run src/align-check.ts` 把 `data/bb` 與 `D:\2026\sz\data\cs` 逐段比對：

| 項目 | 結果 |
|---|---|
| 段號序列 | **22/22 冊相同**（含範圍段，例 `an1` 的 `102-109`） |
| 段數 | 兩邊都是 **6,554**（`data/bb` 22 冊） |
| 段所屬的塊 | **0 段不同塊**（`塊.段` 可直接跨庫對照） |
| 正文掉字（`--check`） | 0 |
| 段序列（`--check`） | 0 不符 |

## 5. 還是 PTS 的地方（下一步）

1. **段內位置**：一個 msdiv 段落的英譯是由「PTS 段落」的文字按行數分配而來；
   PTS 段界與 msdiv 段界不一致時，段內文字可能多一些或少一些，
   但**不會跨到別段**（`^n` 由 template 決定）。
2. **併段**：譯本自己把兩段併成一段時，off 會少一個 `^n`。
   已修：`dn1` 的 msdiv 145（Walshe 併進 144）→ `src/bb-src.ts` 的 `ERRATA`。
   其他書若發現，照同樣方式加。
3. **PTS 段號沒留下**：若要在 adb 裡保留 PTS 引用，可從 `json/` 的 key
   （`dn1:1.1.1` 的 `1.1`）回推，寫成 `<m n="1.1"/>`。尚未做。
4. **句對齊**：段內句子順序未對齊（下一步）。

## 6. 重跑

```powershell
cd D:\2026\bb
bun run src/bb-src.ts
bun run src/off2accelon.ts
bun run src/align-check.ts      # 段號 22/22？
```

`src/align-check.ts` 需要 `D:\2026\sz\data\cs`（巴利底本，緬甸段號）。
