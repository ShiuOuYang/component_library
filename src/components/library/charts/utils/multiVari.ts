/**
 * 多變異圖（MultiVariChart）的分組與變異拆解
 *
 * 因子由外到內（最多 3 層），例如 ['日期', '機台', '模穴']：
 * - 最外層（有 3 層時）→ 左右並排的區塊
 * - 中間層 → 區塊內的 x 位置
 * - 最內層 → 同一個位置裡錯開的點（各自的平均），連成一條線看「位置內」的差異
 * 平方和依巢狀拆解：SS 總 = Σ 各層「組平均 − 上一層平均」的平方和 + 組內（重複量測）。
 */

export interface MVCell {
  key: string
  /** 由外到內的水準 */
  path: string[]
  values: number[]
  n: number
  mean: number
  min: number
  max: number
}

export interface MVPosition {
  panel: string | null
  level: string
  cell: MVCell
  /** 最內層各水準（依水準順序；沒有資料的水準不會出現） */
  inner: MVCell[]
}

export interface MVPanel {
  level: string | null
  cell: MVCell
  positions: MVPosition[]
}

export interface MVSource {
  /** 因子名稱，或 'within'（同一格內的重複量測） */
  source: string
  ss: number
  /** 占總平方和的百分比 */
  pct: number
}

export interface MultiVariData {
  factors: string[]
  panels: MVPanel[]
  /** 最內層的所有水準（L ≥ 2 時） */
  innerLevels: string[]
  all: MVCell
  sources: MVSource[]
  /** 平方和最大的來源 */
  dominant: string | null
}

export interface MultiVariOptions {
  value: string
  /** 因子欄位，由外到內，1～3 個 */
  factors: string[]
  /** 水準排序：出現順序或自然排序（1、2、10） */
  levelOrder?: 'appearance' | 'natural'
}

const toNum = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}
const label = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v))
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

function makeCell(key: string, path: string[], values: number[]): MVCell {
  let min = Infinity
  let max = -Infinity
  let sum = 0
  for (const v of values) {
    sum += v
    if (v < min) min = v
    if (v > max) max = v
  }
  return { key, path, values, n: values.length, mean: values.length ? sum / values.length : NaN, min, max }
}

export function buildMultiVari(rows: readonly Record<string, unknown>[], o: MultiVariOptions): MultiVariData {
  const factors = o.factors.slice(0, 3)
  const L = factors.length
  const recs: { path: string[]; v: number }[] = []
  for (const r of rows) {
    const v = toNum(r?.[o.value])
    if (v === null) continue
    recs.push({ path: factors.map((f) => label(r[f])), v })
  }
  // 各層水準
  const levels = factors.map((_, k) => {
    const seen: string[] = []
    const set = new Set<string>()
    for (const r of recs) {
      if (!set.has(r.path[k])) {
        set.add(r.path[k])
        seen.push(r.path[k])
      }
    }
    return o.levelOrder === 'natural' ? seen.sort(collator.compare) : seen
  })
  const rank = levels.map((ls) => new Map(ls.map((l, i) => [l, i])))
  const cmpPath = (a: string[], b: string[]) => {
    for (let k = 0; k < a.length; k++) {
      const d = rank[k].get(a[k])! - rank[k].get(b[k])!
      if (d) return d
    }
    return 0
  }
  // 每一層的分組
  const groupsAt = (depth: number) => {
    const m = new Map<string, { path: string[]; values: number[] }>()
    for (const r of recs) {
      const path = r.path.slice(0, depth)
      const key = path.join('\u0000')
      const g = m.get(key)
      if (g) g.values.push(r.v)
      else m.set(key, { path, values: [r.v] })
    }
    return [...m.entries()].map(([key, g]) => makeCell(key, g.path, g.values)).sort((a, b) => cmpPath(a.path, b.path))
  }
  const byDepth = Array.from({ length: L + 1 }, (_, d) => groupsAt(d))
  const all = byDepth[0][0] ?? makeCell('', [], [])

  // 版面：L = 3 時第一個因子是區塊；位置因子是倒數第二個（L = 1 時就是唯一的因子）
  const panelDepth = L === 3 ? 1 : 0
  const posDepth = L === 1 ? 1 : L - 1
  const panels: MVPanel[] = (panelDepth ? byDepth[1] : [all]).map((pc) => {
    const prefix = pc.path
    const positions = byDepth[posDepth]
      .filter((c) => prefix.every((p, k) => c.path[k] === p))
      .map((c) => ({
        panel: panelDepth ? prefix[0] : null,
        level: c.path[posDepth - 1],
        cell: c,
        inner: L >= 2 ? byDepth[L].filter((x) => c.path.every((p, k) => x.path[k] === p)) : [],
      }))
    return { level: panelDepth ? prefix[0] : null, cell: pc, positions }
  })

  // 巢狀平方和
  const parentMean = (depth: number, path: string[]) => (depth === 0 ? all.mean : byDepth[depth].find((c) => c.path.every((p, k) => p === path[k]))!.mean)
  const sources: MVSource[] = factors.map((f, k) => ({
    source: f,
    ss: byDepth[k + 1].reduce((s, c) => s + c.n * (c.mean - parentMean(k, c.path.slice(0, k))) ** 2, 0),
    pct: 0,
  }))
  const leafMean = new Map(byDepth[L].map((c) => [c.key, c.mean]))
  sources.push({ source: 'within', ss: recs.reduce((s, r) => s + (r.v - leafMean.get(r.path.join('\u0000'))!) ** 2, 0), pct: 0 })
  const total = sources.reduce((s, x) => s + x.ss, 0)
  for (const s of sources) s.pct = total > 0 ? (s.ss / total) * 100 : 0
  const dominant = total > 0 ? sources.reduce((a, b) => (b.ss > a.ss ? b : a)).source : null

  return { factors, panels, innerLevels: L >= 2 ? levels[L - 1] : [], all, sources, dominant }
}

/** 位置的扁平清單（鍵盤與資料表順序） */
export function multiVariPositions(data: MultiVariData): MVPosition[] {
  return data.panels.flatMap((p) => p.positions)
}
