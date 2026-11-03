# bb — 菩提比丘英譯（Bhikkhu Bodhi, English）

這個 repo 是 <https://github.com/accelon/bb>：巴利三藏的英譯（長部為 Maurice Walshe，
其餘為 Bhikkhu Bodhi），以及把它轉成 Accelon 文字層的腳本。

> **2026-11-03｜現況**：`data/bb/` 已依 `D:\2026\sz` 的其他譯本格式轉好。
> 四部（DN／MN／SN／AN）**段對齊完成**（22 冊、6,554 段，段號與 `cs` 逐段相同）；
> **Snp 第一版**（2,715 段，段號相同、段界近似）＋譯註與**註釋書**（958 段、1,923 條註）。
> **句對齊還沒做**。

## 1. 來源

| 目錄 | 內容 | 版控 |
|---|---|---|
| `epub/` | 原始 epub（`readingfaithfully.org` 下載，改副檔名 `.zip` 解開）：`dn/`、`mn/`、`sn/`、`an/`、`snp/` | ✗（`.gitignore`；remote 沒有） |
| `json/` | 2023 年 `tidy.js` 從 epub 抽出的 SC 格式 json（一個 segment 一個 key） | ✗ |
| `off/` | 2023 年 `gen.js` 產生的 `.off`（`*.bb.off` ＋ `*.notes.tsv`）；四部的轉檔來源 | 部分（remote 只有 4 冊） |
| `pdf/` | 對照用的 PDF，**沒有搬過來**（112 MB；需要時在 `D:\2023\bb\pdf`） | ✗ |

- 2026-11-03：`epub/`、`json/`、`off/` 從 `D:\2023\bb` 搬入（remote 不含這些）。
- `off/` 的段號已經是 **msdiv（緬甸第六次結集）**，不是 PTS；來源與證據見
  [`docs/alignment.md`](docs/alignment.md)。
- `epub/snp.epub.zip`（Bodhi《Suttanipāta》含註釋書）是 pdftohtml 的 epub，另走
  `src/snp2accelon.ts`；做法與限制見 [`docs/snp.md`](docs/snp.md)。

## 2. 目錄

| 路徑 | 說明 |
|---|---|
| `src/` | 轉檔與驗收腳本（從零重跑） |
| `data/bb/` | **轉好的文字**：`00.xml`、`<書>.xml`、`<書>-fn.xml`（註文），一行一個 adb 行；`snp.xml`／`snp-fn.xml`／`snp-c.xml`／`snp-c-fn.xml` 由 snp 腳本產生；可重建，不進版控 |
| `out/` | 中間產物與報告：`bb-src/`、`bb-src-report.txt`、`bb-report.txt`、`bb-align-report.txt`、`bb-empty.tsv`、`snp-report.txt`；不進版控 |
| `docs/` | 段號對齊與 snp 的說明 |

## 3. 轉換（從零重跑）

```powershell
cd D:\2026\bb
bun run src/bb-src.ts                # off/ → out/bb-src/（整理：斜體、塊標題、殘留 HTML 頁碼）
bun run src/off2accelon.ts           # out/bb-src/ → data/bb/
bun run src/off2accelon.ts --check   # 驗收：沒掉字、段序列、殘留 ^／行長
bun run src/snp2accelon.ts           # epub/snp → snp*.xml（段號用 cs）
bun run src/align-check.ts           # 段對齊驗收：與 D:\2026\sz\data\cs 逐段比對
```

- 轉換器本體在母工作區 `D:\2026\adb-converter\ts\tools\off2accelon.ts`；
  規則見母區 `docs/adb/off-to-accelon.md`。這裡只放來源清單（`src/profiles.ts`）與流程。
- `src/bb-src.ts` 只做「讓 2023 年的 off 符合 sz 格式」的最小整理，**不動段號、不動段序**：
  - `^i[…]`（cleanhtml.js 造的行內斜體）→ 去掉標記與夾文括號，文字留下（adb 沒有斜體）；
  - `^ck#d1(^z1[書名] ^h[副題])` → 塊名取 `^z1`，副題搬到塊後（`^h` → `<小節>`）；
    夾在塊名裡的 `^n`／`^f` 搬回正文；
  - `&lt; 11 &gt;`（1998 年版 PTS 頁碼）清掉；`^missing` → `^miss`（→ `<缺/>`）；
  - `^f151...` 這種「註號緊接標點」補一個空白，免得 id 變成 `151..`（92 處）；
  - 註文的裸 `&` → `&amp;`（41 處，否則 `<釋>` 不是合法 XML）；
  - 手工勘誤（`ERRATA`）：`dn1` 的 msdiv 145 被 Walshe 併進 144，補回 `^n145`。

整理數字：斜體 1,022、塊名改寫 186、註號補空白 92、註文 `&` 41、接行 3、勘誤 1
（逐冊見 `out/bb-src-report.txt`）。

## 4. 段號：`cs`（緬甸傳統 msdiv），不是 PTS

`bb` 的原書（Walshe／Bodhi）用 **PTS 段號**；本庫的 `<段 n>` 用 **`cs` 的段號**
（CST／VRI，緬甸第六次結集＝`msdiv`）。

這件事 2023 年的 `gen.js` 已經做過：它把 `../sc/template/<book>.off`（由
`template.js` 從 bilara-data `reference/pli/ms/**` 的 **`msdiv`** 產生）套到英譯上，
所以 `off/*.bb.off` 的 `^n` 本來就是 msdiv。2026-11-03 逐段驗過：

- `out/bb-align-report.txt`：**22/22 冊段號與 `cs` 完全相同**（含 `an1` 的 `102-109` 這種範圍段），
  合計 **6,554 段**（＝`cs` 同一批書的段數）。
- 每一段所屬的 `塊` 也與 `cs` 相同（0 段不同塊），所以 `塊.段`（例 `d1.7`）跨庫可直接對照。

PTS 段號沒有留在 adb 裡（下一步可從 `json/` 的 key 反推，寫成 `<m n="…">`）。

**Snp** 的段號也是 `cs`（2,715 段），但 PTS 與 CST 的分偈不同（例 Hemavata PTS 28 偈、
CST 30 偈），所以 13 經是**按行數比例**分段，段界近似；`snp-c.xml`（註釋書）沒有 `cs` 對照，
段號是註釋書自己的偈號。細節見 [`docs/snp.md`](docs/snp.md)。

## 5. 已知問題（先記下來，下一步再修）

| 問題 | 數字 | 去哪裡看 |
|---|---|---|
| 空段（譯本省略；`<段>` 有、段內沒字） | 376 段＋Snp 13 段 | `out/bb-empty.tsv`、報告「空段」 |
| 孤註（有 `<註>` 沒有 `<釋>`） | 四部 9 個（Snp 0） | 報告「孤註」 |
| 長行切開（>4,096 字） | 7 冊各多 1 行 | `out/bb-report.txt` |
| 斜體資訊 | 四部全部去掉（adb 沒有斜體標籤） | `src/bb-src.ts` |
| Snp 段界 | 13 經按行數比例（偈數不同） | `out/snp-report.txt` |
| Snp 註釋書段落 | 只認 `N. ` 開頭，未編號的接在前段 | `docs/snp.md` §5 |
| 句對齊（段內句序） | 未做 | 下一步 |
| `<m>`（PTS 段號） | 未輸出 | 下一步 |

## 6. 授權

- 轉檔腳本沿用原 repo 的 CC0。
- 英譯文字（Walshe／Bodhi）版權屬譯者與出版社；公開散布前請先確認授權。

## 7. 舊管線（2023，保留參考）

```text
node tidy [bookid]     # epub/*.html → json/（按 PTS 段落的行數切）
node gen [bookid]      # json/ + ../sc/template → off/（套上 msdiv 段號）
```

`tidy.js`／`gen.js`／`cleanhtml.js`／`tosc.js`／`errata.js`／`bb-folder.js` 都還留著；
它們依賴 `ptk` 與 `../sc`（`D:\2023\sc`），現在不跑。要重新從 epub 產生 off 時再處理。



