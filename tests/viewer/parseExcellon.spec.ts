import { describe, expect, it } from 'vitest'
import { isExcellon, parseExcellon } from '@/components/library/viewer/gerber/parseExcellon'
import type {
  DrillCommand,
  SlotCommand,
} from '@/components/library/viewer/gerber/gerber.types'

function excellon(...body: string[]): string {
  return ['M48', 'METRIC', ...body, 'M30'].join('\n')
}

const drills = (cmds: ReturnType<typeof parseExcellon>['commands']) =>
  cmds.filter((c): c is DrillCommand => c.type === 'drill')
const slots = (cmds: ReturnType<typeof parseExcellon>['commands']) =>
  cmds.filter((c): c is SlotCommand => c.type === 'slot')

describe('isExcellon', () => {
  it('看得出 M48 標頭', () => {
    expect(isExcellon('M48\nMETRIC\nM30')).toBe(true)
  })

  it('沒有 M48 但有鑽頭定義也算', () => {
    expect(isExcellon('T01C0.300\nX10Y10\nM30')).toBe(true)
  })

  it('Gerber 檔不會被誤判', () => {
    expect(isExcellon('%FSLAX36Y36*%\n%MOMM*%\n%ADD10C,0.5*%\nM02*')).toBe(false)
  })

  it('空字串不算', () => {
    expect(isExcellon('')).toBe(false)
  })
})

describe('parseExcellon', () => {
  describe('標頭', () => {
    it('解析鑽頭定義', () => {
      const { tools } = parseExcellon(excellon('T01C0.30500', 'T02C1.0', '%'))
      expect(tools['01']).toEqual({ diameter: 0.305 })
      expect(tools['02']).toEqual({ diameter: 1 })
    })

    it('METRIC / INCH 都讀得出來', () => {
      expect(parseExcellon(excellon('%')).units).toBe('mm')
      expect(parseExcellon(['M48', 'INCH', '%', 'M30'].join('\n')).units).toBe('in')
    })

    it('fileType 固定為 excellon，供上層分流', () => {
      expect(parseExcellon(excellon('%')).fileType).toBe('excellon')
    })

    it('標頭內的座標行不會被當成鑽孔', () => {
      // % 之前都算標頭
      const { commands } = parseExcellon(['M48', 'METRIC', 'X10Y10', '%', 'M30'].join('\n'))
      expect(commands).toHaveLength(0)
    })
  })

  describe('鑽孔', () => {
    it('解析鑽孔座標並記下當前鑽頭', () => {
      const { commands } = parseExcellon(
        excellon('T01C0.3', '%', 'T01', 'X10.5Y20.25', 'X30.0Y40.0')
      )
      expect(drills(commands)).toHaveLength(2)
      expect(drills(commands)[0]).toEqual({ type: 'drill', x: 10.5, y: 20.25, tool: '01' })
    })

    it('換鑽頭後的孔記到新鑽頭上', () => {
      const { commands } = parseExcellon(
        excellon('T01C0.3', 'T02C0.8', '%', 'T01', 'X1Y1', 'T02', 'X2Y2')
      )
      expect(drills(commands).map((d) => d.tool)).toEqual(['01', '02'])
    })

    it('負座標解析正確', () => {
      const { commands } = parseExcellon(excellon('T01C0.3', '%', 'T01', 'X-5.5Y-6.25'))
      expect(drills(commands)[0]).toMatchObject({ x: -5.5, y: -6.25 })
    })

    it('沒選鑽頭就鑽孔時 tool 為 null（上層會用預設孔徑）', () => {
      const { commands } = parseExcellon(excellon('%', 'X1Y1'))
      expect(drills(commands)[0].tool).toBeNull()
    })
  })

  describe('槽孔 (G85)', () => {
    it('解析成起終點座標', () => {
      const { commands } = parseExcellon(
        excellon('T01C0.5', '%', 'T01', 'X10.0Y10.0G85X20.0Y10.0')
      )
      expect(slots(commands)).toHaveLength(1)
      expect(slots(commands)[0]).toEqual({
        type: 'slot',
        x1: 10,
        y1: 10,
        x2: 20,
        y2: 10,
        tool: '01',
      })
    })

    it('槽孔不會同時被記成鑽孔', () => {
      const { commands } = parseExcellon(excellon('T01C0.5', '%', 'T01', 'X1Y1G85X2Y1'))
      expect(drills(commands)).toHaveLength(0)
      expect(slots(commands)).toHaveLength(1)
    })
  })

  describe('防禦', () => {
    it('M30 之後的內容全部忽略', () => {
      const { commands } = parseExcellon(
        ['M48', 'METRIC', 'T01C0.3', '%', 'T01', 'X1Y1', 'M30', 'X99Y99'].join('\n')
      )
      expect(commands).toHaveLength(1)
    })

    it('M02 也視為結束', () => {
      const { commands } = parseExcellon(
        ['M48', 'METRIC', 'T01C0.3', '%', 'T01', 'X1Y1', 'M02', 'X99Y99'].join('\n')
      )
      expect(commands).toHaveLength(1)
    })

    it('註解與 G 模式指令會被跳過', () => {
      const { commands } = parseExcellon(
        excellon('T01C0.3', '%', '; 這是註解', 'G90', 'G05', 'T01', 'X1Y1')
      )
      expect(commands).toHaveLength(1)
    })

    it('空字串不拋錯', () => {
      const result = parseExcellon('')
      expect(result.commands).toEqual([])
      expect(result.tools).toEqual({})
    })
  })
})
