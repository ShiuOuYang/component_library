/**
 * Gerber RS-274X 解析器
 *
 * 只做「文字 → 指令陣列」，不碰 DOM，因此可以單獨測試。
 * 這是 tracespace 解析失敗時的回退路徑，也是 Gerber 檔實際渲染的來源之一。
 */
import type {
  Aperture,
  CoordinateFormat,
  GerberCommand,
  GerberInterpolation,
  GerberPolarity,
  GerberUnits,
  MoveCommand,
  ParsedGerber,
  RegionPoint,
} from './gerber.types'

/**
 * 檔案有沒有宣告自己的座標格式（%FS… 參數塊）。
 *
 * 這是能不能交給 tracespace 的判斷依據。@tracespace/plotter 5.0.0-alpha.0
 * 的 plot() 會在多次呼叫之間殘留狀態（apertures、座標格式等），所以同一
 * 個 session 內連續畫多個圖層時，後面的圖層可能吃到前面的設定。
 *
 * 實測的污染範圍剛好止於「檔案自己有沒有宣告格式」：有宣告 %FS 的檔案，
 * 冷啟動與接在別的檔案後面畫，結果完全相同；沒宣告的檔案才會被污染，
 * 而那種檔案本來也不是合法的 Gerber（tracespace 也算不出尺寸）。
 * 因此只有自帶格式的檔案才走 tracespace，其餘交給手動解析器。
 */
export function declaresCoordinateFormat(text: string): boolean {
  return /%FS[^%]*\*%/.test(text)
}

/** 依格式規格把整數字串還原成實際座標值 */
function parseCoord(raw: string, format: CoordinateFormat): number {
  return parseInt(raw, 10) / Math.pow(10, format.dec)
}

/** 解析 %ADDnn<shape>,<params>*% 的 aperture 定義 */
function parseApertures(fullText: string): Record<string, Aperture> {
  const apertures: Record<string, Aperture> = {}
  // 形狀代碼容許大小寫，參數前的逗號可有可無
  const apRegex = /%ADD(\d+)([A-Za-z]+),?([^*]*)\*%/g
  let match: RegExpExecArray | null
  while ((match = apRegex.exec(fullText)) !== null) {
    const id = match[1]
    const shape = match[2].toUpperCase()
    const raw = match[3] ? match[3].trim() : ''
    const params = raw ? raw.split('X').map(Number) : [0]
    apertures[id] = { shape, params }
  }
  return apertures
}

/**
 * 解析 Gerber 檔內容。
 *
 * 座標是模態的：沒寫的軸沿用上一個值，因此解析時必須逐行維護當前位置。
 * D01 需要「畫之前」的位置當起點，所以每次更新座標前先留一份 prevX/prevY。
 */
export function parseGerber(text: string): ParsedGerber {
  const lines = text.split(/[\r\n]+/)
  const commands: GerberCommand[] = []

  let currentAperture: string | null = null
  let x = 0
  let y = 0 // 當前繪圖位置（模態座標）
  let formatX: CoordinateFormat = { int: 3, dec: 5 }
  let formatY: CoordinateFormat = { int: 3, dec: 5 }
  let units: GerberUnits = 'mm'
  let polarity: GerberPolarity = 'dark'
  let interpolation: GerberInterpolation = 'linear'
  let regionMode = false
  let regionPoints: RegionPoint[] = []
  let regionPolarity: GerberPolarity = 'dark'

  const fullText = text.replace(/[\r\n]+/g, '\n')

  // 解析格式規格
  const fmtMatch = fullText.match(/%FSLAX(\d)(\d)Y(\d)(\d)\*%/)
  if (fmtMatch) {
    formatX = { int: parseInt(fmtMatch[1], 10), dec: parseInt(fmtMatch[2], 10) }
    formatY = { int: parseInt(fmtMatch[3], 10), dec: parseInt(fmtMatch[4], 10) }
  }

  // 單位
  if (fullText.includes('%MOMM*%')) units = 'mm'
  else if (fullText.includes('%MOIN*%')) units = 'in'

  const apertures = parseApertures(fullText)

  // 逐行解析指令
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed === '*') continue

    // 處理 % 開頭的參數塊（極性等）
    if (trimmed.startsWith('%')) {
      if (trimmed.includes('LPD')) polarity = 'dark'
      else if (trimmed.includes('LPC')) polarity = 'clear'
      continue
    }

    // G36 開始區域
    if (/G36\*?$/.test(trimmed)) {
      regionMode = true
      regionPoints = []
      regionPolarity = polarity
      continue
    }
    // G37 結束區域
    if (/G37\*?$/.test(trimmed)) {
      if (regionPoints.length >= 3) {
        commands.push({ type: 'region', points: [...regionPoints], polarity: regionPolarity })
      }
      regionMode = false
      regionPoints = []
      continue
    }

    // 插值模式
    if (/G0?1[^0-9]/.test(trimmed)) interpolation = 'linear'
    if (/G0?2[^0-9]/.test(trimmed)) interpolation = 'cw'
    if (/G0?3[^0-9]/.test(trimmed)) interpolation = 'ccw'

    // 選取 Aperture（Dxx*，xx >= 10；10 以下是 D01/D02/D03 動作碼）
    const selMatch = trimmed.match(/^(?:G54)?D(\d+)\*$/)
    if (selMatch) {
      const code = parseInt(selMatch[1], 10)
      if (code >= 10) {
        currentAperture = selMatch[1]
        continue
      }
    }

    // 座標 + D 碼指令（D01/D02/D03）
    const coordMatch = trimmed.match(
      /^(?:G\d+)?(X([+-]?\d+))?(Y([+-]?\d+))?(I([+-]?\d+))?(J([+-]?\d+))?D0?([123])\*$/
    )
    if (coordMatch) {
      // 記錄繪圖前的當前位置（D01 的 fromX/fromY 使用）
      const prevX = x
      const prevY = y

      if (coordMatch[2] != null) x = parseCoord(coordMatch[2], formatX)
      if (coordMatch[4] != null) y = parseCoord(coordMatch[4], formatY)
      const i = coordMatch[6] != null ? parseCoord(coordMatch[6], formatX) : 0
      const j = coordMatch[8] != null ? parseCoord(coordMatch[8], formatY) : 0
      const dCode = parseInt(coordMatch[9], 10)

      if (regionMode) {
        // 區域模式：記錄點，並標記 D02（新子輪廓起點）vs D01（畫線）
        regionPoints.push({ x, y, move: dCode === 2 })
      } else if (dCode === 1) {
        // D01: 畫線 — 從 prevX/prevY 至 x/y
        commands.push({
          type: 'draw',
          fromX: prevX,
          fromY: prevY,
          x,
          y,
          i,
          j,
          aperture: currentAperture,
          interpolation,
          polarity,
        })
      } else if (dCode === 2) {
        // D02: 移動（提筆） — 記錄起點與終點，供路徑分析
        commands.push({ type: 'move', fromX: prevX, fromY: prevY, x, y, polarity })
      } else if (dCode === 3) {
        // D03: 閃爍（蓋印 Aperture）
        commands.push({ type: 'flash', x, y, aperture: currentAperture, polarity })
      }
      continue
    }

    // 無 D 碼的純座標行（只更新模態位置）
    const noDCode = trimmed.match(/^(?:G\d+)?(X([+-]?\d+))?(Y([+-]?\d+))?\*$/)
    if (noDCode) {
      if (noDCode[2] != null) x = parseCoord(noDCode[2], formatX)
      if (noDCode[4] != null) y = parseCoord(noDCode[4], formatY)
    }
  }

  return { apertures, commands, units, formatX, formatY }
}

/**
 * 只取出 D02 移動軌跡。
 *
 * tracespace 的 ImageTree 不保留提筆移動（那不是要畫出來的圖形），但檢視器
 * 的「D02 軌跡」功能需要它。因此走 tracespace 渲染的圖層若要顯示軌跡，
 * 就額外用手動解析器掃一次原始檔，只留下 move 指令。
 */
export function extractMovePaths(text: string): MoveCommand[] {
  return parseGerber(text).commands.filter((c): c is MoveCommand => c.type === 'move')
}
