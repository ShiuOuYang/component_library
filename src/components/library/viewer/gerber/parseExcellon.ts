/**
 * Excellon 鑽孔檔解析器
 *
 * 支援 METRIC / INCH、顯式小數點座標與 G85 槽孔。
 * 與 parseGerber 一樣是純函式，不碰 DOM。
 */
import type {
  DrillTool,
  ExcellonCommand,
  GerberUnits,
  ParsedExcellon,
} from './gerber.types'

/**
 * 是否為 Excellon 鑽孔檔。
 *
 * M48 是標頭起始；有些工具不寫 M48，但一定有 Tnn C<直徑> 的鑽頭定義。
 */
export function isExcellon(text: string): boolean {
  return /^M48\b/m.test(text) || /^T\d+C[\d.]+/m.test(text)
}

export function parseExcellon(text: string): ParsedExcellon {
  const lines = text.split(/[\r\n]+/)
  const tools: Record<string, DrillTool> = {}
  const commands: ExcellonCommand[] = []
  let currentTool: string | null = null
  let units: GerberUnits = 'mm'
  let inHeader = true

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith(';')) continue

    if (trimmed === 'M48') {
      inHeader = true
      continue
    }
    if (trimmed === '%') {
      inHeader = false
      continue
    }
    if (trimmed === 'M30' || trimmed === 'M02') break

    // 單位
    if (/^METRIC/i.test(trimmed)) {
      units = 'mm'
      continue
    }
    if (/^INCH/i.test(trimmed)) {
      units = 'in'
      continue
    }

    // 工具定義: T01C0.30500
    const toolDefMatch = trimmed.match(/^T(\d+)C([\d.]+)/)
    if (toolDefMatch) {
      tools[toolDefMatch[1]] = { diameter: parseFloat(toolDefMatch[2]) }
      continue
    }

    if (inHeader) continue

    // G05/G90 等模式指令：忽略
    if (/^G\d+$/.test(trimmed)) continue

    // 工具選取: T01
    const toolSelMatch = trimmed.match(/^T(\d+)$/)
    if (toolSelMatch) {
      currentTool = toolSelMatch[1]
      continue
    }

    // 槽孔 G85: X...Y...G85X...Y...
    const slotMatch = trimmed.match(
      /^X([+-]?[\d.]+)Y([+-]?[\d.]+)G85X([+-]?[\d.]+)Y([+-]?[\d.]+)/
    )
    if (slotMatch) {
      commands.push({
        type: 'slot',
        x1: parseFloat(slotMatch[1]),
        y1: parseFloat(slotMatch[2]),
        x2: parseFloat(slotMatch[3]),
        y2: parseFloat(slotMatch[4]),
        tool: currentTool,
      })
      continue
    }

    // 鑽孔點: X...Y...
    const drillMatch = trimmed.match(/^X([+-]?[\d.]+)Y([+-]?[\d.]+)/)
    if (drillMatch) {
      commands.push({
        type: 'drill',
        x: parseFloat(drillMatch[1]),
        y: parseFloat(drillMatch[2]),
        tool: currentTool,
      })
    }
  }

  return { tools, commands, units, fileType: 'excellon' }
}
