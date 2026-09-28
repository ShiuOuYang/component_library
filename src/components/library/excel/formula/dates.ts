/**
 * 日期與時間（Excel 1900 日期系統）
 *
 * Excel 裡日期就是數字：1900-01-01 是 1，每過一天加 1，時間是小數部分（12:00 = 0.5）。
 * 所以 =B1-A1 就是相差天數、=A1+7 就是一週後，TEXT / 儲存格格式只決定「怎麼顯示」。
 *
 * ⚠️ Excel 為了相容 Lotus 1-2-3，把 1900 年當成閏年：序號 60 是不存在的 1900-02-29。
 *    1900-03-01 之後的序號因此都比「真實天數」多 1。這裡照 Excel 算，
 *    與 .xlsx 檔案、Excel 本身算出來的數字一致（例如 2026-09-28 = 46293）。
 */

const MS_PER_DAY = 86_400_000
/** 序號 0 對應的基準日（1899-12-30，已吸收 1900 閏年 bug；只適用序號 >= 61） */
const EPOCH = Date.UTC(1899, 11, 30)

/** 序號上限：9999-12-31 */
export const MAX_SERIAL = 2958465

/** 年月日 → 序號。月、日可以超出範圍（DATE(2026,13,1) = 2027-01-01、DATE(2026,3,0) = 2026-02-28） */
export function dateToSerial(year: number, month: number, day: number): number | null {
  // Excel：0~1899 的年份會加上 1900（DATE(26,1,1) = 1926-01-01）
  let y = Math.trunc(year)
  if (y >= 0 && y < 1900) y += 1900
  if (y < 0 || y > 9999) return null
  const ms = Date.UTC(y, 0, 1) + 0 // 先定在年初，再用 setUTCMonth / Date 處理溢位
  const d = new Date(ms)
  d.setUTCMonth(Math.trunc(month) - 1)
  d.setUTCDate(Math.trunc(day))
  let serial = Math.round((d.getTime() - EPOCH) / MS_PER_DAY)
  // 1900-03-01 之前的真實日期，Excel 序號少 1（因為沒有經過那天不存在的 2/29）
  if (serial < 61) serial -= 1
  if (serial < 0 || serial > MAX_SERIAL) return null
  return serial
}

export interface DateParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  /** 0 = 星期日 */
  weekday: number
}

/** 序號 → 年月日時分秒 */
export function serialToParts(serial: number): DateParts {
  const whole = Math.floor(serial)
  // 時間四捨五入到秒，避免 0.999999 顯示成 23:59:59 的下一天前一刻
  let seconds = Math.round((serial - whole) * 86400)
  let dayOffset = 0
  if (seconds >= 86400) {
    seconds -= 86400
    dayOffset = 1
  }
  const n = whole + dayOffset
  const time = {
    hour: Math.floor(seconds / 3600),
    minute: Math.floor((seconds % 3600) / 60),
    second: seconds % 60,
  }
  if (n === 60) return { year: 1900, month: 2, day: 29, weekday: 3, ...time } // Lotus 相容的假日期
  if (n === 0) return { year: 1900, month: 1, day: 0, weekday: 6, ...time } // Excel 把 0 顯示成 1900-01-00
  const ms = EPOCH + (n < 60 ? n + 1 : n) * MS_PER_DAY
  const d = new Date(ms)
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    weekday: d.getUTCDay(),
    ...time,
  }
}

/** 時分秒 → 一天中的比例 */
export function timeToFraction(hour: number, minute: number, second: number): number {
  const total = Math.trunc(hour) * 3600 + Math.trunc(minute) * 60 + Math.trunc(second)
  return (((total % 86400) + 86400) % 86400) / 86400
}

/** 當地時間的「現在」序號 */
export function nowSerial(now: Date = new Date()): number {
  const day = dateToSerial(now.getFullYear(), now.getMonth() + 1, now.getDate())!
  return day + timeToFraction(now.getHours(), now.getMinutes(), now.getSeconds())
}

/** 當地時間的「今天」序號 */
export function todaySerial(now: Date = new Date()): number {
  return Math.floor(nowSerial(now))
}

const DATE_TEXT = /^\s*(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?\s*$/
const TIME_TEXT = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/

/**
 * 日期 / 時間文字 → 序號（DATEVALUE 與運算中的自動轉型）。
 * 支援 2026-09-28、2026/9/28、2026.9.28，可接時間（2026-09-28 08:30），以及單純時間 08:30。
 * 月日不合法（2026-02-30）回傳 null —— 與 Excel 相同，那是 #VALUE!，不會滾到 3 月。
 */
export function parseDateText(text: string): number | null {
  const m = text.match(DATE_TEXT)
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
    if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null
    const serial = dateToSerial(y, mo, d)
    if (serial === null) return null
    if (m[4] === undefined) return serial
    const h = Number(m[4])
    const mi = Number(m[5])
    const s = Number(m[6] ?? 0)
    if (h > 23 || mi > 59 || s > 59) return null
    return serial + timeToFraction(h, mi, s)
  }
  const t = text.match(TIME_TEXT)
  if (t) {
    const h = Number(t[1])
    const mi = Number(t[2])
    const s = Number(t[3] ?? 0)
    if (h > 23 || mi > 59 || s > 59) return null
    return timeToFraction(h, mi, s)
  }
  return null
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

export function daysInMonth(y: number, m: number): number {
  return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]
}

/** 加減月份，日期超過該月天數時貼齊月底（EDATE(2026-01-31, 1) = 2026-02-28） */
export function addMonths(serial: number, months: number): number | null {
  const p = serialToParts(serial)
  const total = p.year * 12 + (p.month - 1) + Math.trunc(months)
  const y = Math.floor(total / 12)
  const m = (total % 12) + 1
  return dateToSerial(y, m, Math.min(p.day, daysInMonth(y, m)))
}

/** 月底（EOMONTH） */
export function endOfMonth(serial: number, months: number): number | null {
  const p = serialToParts(serial)
  const total = p.year * 12 + (p.month - 1) + Math.trunc(months)
  const y = Math.floor(total / 12)
  const m = (total % 12) + 1
  return dateToSerial(y, m, daysInMonth(y, m))
}

// ---------------------------------------------------------------------------
// 日期格式
// ---------------------------------------------------------------------------

/** 格式字串裡有日期 / 時間代碼（y、d、h、s，或 m 搭配前面幾種） */
export function isDateFormat(fmt: string): boolean {
  const bare = fmt.replace(/"[^"]*"|\\./g, '')
  return /[yYdDhHsS]/.test(bare) || /^[mM]+$/.test(bare.trim())
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0')

/**
 * 依格式代碼顯示日期序號：yyyy / yy、m / mm（月）、d / dd、h / hh、m / mm（分：前面是 h 或後面是 s 時）、s / ss、
 * 以及引號包起來的字面文字（"年"）。與 Excel 一樣，m 是月還是分由前後文決定。
 */
export function formatSerial(serial: number, fmt: string): string {
  const p = serialToParts(serial)
  const tokens: { t: string; lit?: boolean }[] = []
  for (let i = 0; i < fmt.length; ) {
    const ch = fmt[i]
    if (ch === '"') {
      const end = fmt.indexOf('"', i + 1)
      const lit = end === -1 ? fmt.slice(i + 1) : fmt.slice(i + 1, end)
      tokens.push({ t: lit, lit: true })
      i = end === -1 ? fmt.length : end + 1
      continue
    }
    if (ch === '\\' && i + 1 < fmt.length) {
      tokens.push({ t: fmt[i + 1], lit: true })
      i += 2
      continue
    }
    const lower = ch.toLowerCase()
    if ('ymdhs'.includes(lower)) {
      let j = i
      while (j < fmt.length && fmt[j].toLowerCase() === lower) j++
      tokens.push({ t: fmt.slice(i, j).toLowerCase() })
      i = j
      continue
    }
    tokens.push({ t: ch, lit: true })
    i++
  }

  const code = (k: number) => (tokens[k] && !tokens[k].lit ? tokens[k].t[0] : null)
  /** 找前 / 後一個代碼（跳過分隔符號） */
  const neighbour = (k: number, step: 1 | -1) => {
    for (let j = k + step; j >= 0 && j < tokens.length; j += step) {
      const c = code(j)
      if (c) return c
    }
    return null
  }

  return tokens
    .map((tok, k) => {
      if (tok.lit) return tok.t
      const len = tok.t.length
      switch (tok.t[0]) {
        case 'y':
          return len <= 2 ? pad(p.year % 100) : String(p.year)
        case 'd':
          return len >= 2 ? pad(p.day) : String(p.day)
        case 'h':
          return len >= 2 ? pad(p.hour) : String(p.hour)
        case 's':
          return len >= 2 ? pad(p.second) : String(p.second)
        case 'm': {
          const isMinute = neighbour(k, -1) === 'h' || neighbour(k, 1) === 's'
          const v = isMinute ? p.minute : p.month
          return len >= 2 ? pad(v) : String(v)
        }
        default:
          return tok.t
      }
    })
    .join('')
}
