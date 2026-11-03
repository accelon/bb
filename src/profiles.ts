/**
 * 本工作區（`bb`＝菩提比丘英譯）的來源與輸出設定。
 *
 * 轉檔器本體在母工作區 `D:\2026\adb-converter\ts\tools\off2accelon.ts`；
 * 這裡只放資料，流程在 `src/off2accelon.ts`。
 *
 * 來源分兩層：
 *   `off/`（2023 年由 epub 產生，**唯讀**）→ `out/bb-src/`（`src/bb-src.ts` 整理）
 *   → `data/bb/`（Accelon XML，一行一個 adb 行）。
 */
import { join } from 'node:path';
import type { ConvertOptions } from '../../adb-converter/ts/tools/off2accelon';

export const ROOT = join(import.meta.dir, '..');

export interface Profile extends ConvertOptions {
  /** 報告檔名（放 out/） */
  report: string;
  /** 打包後的 adb 名稱（預設同 key） */
  adb?: string;
}

/**
 * 平行文本群：這一庫與 `cs`（VRI／CST4，緬甸傳統段號）共用 `段` 編號。
 * 之後打包時寫進 `00.xml` 的 `<集 p="cs">`，閱讀器才會把同群的庫列進「對讀」。
 */
export const PARALLEL_GROUP = 'cs';

export const PROFILES: Record<string, Profile> = {
  bb: {
    srcDir: join(ROOT, 'out', 'bb-src'),
    outDir: join(ROOT, 'data', 'bb'),
    glob: '*.off',
    strip: '.off',
    // 註文在 `<書>.notes.tsv`（第一行 `^:` 宣告，之後 `編號<TAB>注文`）
    notesTsv: '.notes.tsv',
    dbname: 'bb',
    dbcname: '菩提比丘英譯',
    enname: 'English Translation (Bhikkhu Bodhi)',
    report: 'bb-report.txt',
  },
};
