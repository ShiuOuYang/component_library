import { describe, expect, it } from 'vitest'
import {
  declaresCoordinateFormat,
  extractMovePaths,
  parseGerber,
} from '@/components/library/viewer/gerber/parseGerber'
import type {
  DrawCommand,
  FlashCommand,
  MoveCommand,
  RegionCommand,
} from '@/components/library/viewer/gerber/gerber.types'

/** 組出一份最小可用的 Gerber 檔 */
function gerber(...body: string[]): string {
  return ['%FSLAX36Y36*%', '%MOMM*%', ...body, 'M02*'].join('\n')
}

const flashes = (cmds: ReturnType<typeof parseGerber>['commands']) =>
  cmds.filter((c): c is FlashCommand => c.type === 'flash')
const draws = (cmds: ReturnType<typeof parseGerber>['commands']) =>
  cmds.filter((c): c is DrawCommand => c.type === 'draw')
const moves = (cmds: ReturnType<typeof parseGerber>['commands']) =>
  cmds.filter((c): c is MoveCommand => c.type === 'move')
const regions = (cmds: ReturnType<typeof parseGerber>['commands']) =>
  cmds.filter((c): c is RegionCommand => c.type === 'region')

describe('parseGerber', () => {
  describe('格式與單位', () => {
        it('依 %FSLAX..Y..% 的小數位數還原座標', () => {
      // X36 → 6 位小數，1500000 / 1e6 = 1.5
      const { formatX, formatY, commands } = parseGerber(
        gerber('%ADD10C,0.5*%', 'D10*', 'X1500000Y2500000D03*')
      )
      expect(formatX).toEqual({ int: 3, dec: 6 })
      expect(formatY).toEqual({ int: 3, dec: 6 })
      expect(flashes(commands)[0]).toMatchObject({ x: 1.5, y: 2.5 })
    })

    it('不同軸可以有不同小數位數', () => {
      const { commands } = parseGerber(
        ['%FSLAX34Y36*%', '%MOMM*%', '%ADD10C,0.5*%', 'D10*', 'X10000Y1000000D03*', 'M02*'].join('\n')
      )
      // X 4 位小數 → 1.0；Y 6 位小數 → 1.0
      expect(flashes(commands)[0]).toMatchObject({ x: 1, y: 1 })
    })

    it('沒有格式規格時用預設值 3.5', () => {
      const { formatX } = parseGerber('%MOMM*%\nM02*')
      expect(formatX).toEqual({ int: 3, dec: 5 })
    })

    it('讀得出公厘與英寸', () => {
      expect(parseGerber(gerber()).units).toBe('mm')
      expect(parseGerber(['%FSLAX36Y36*%', '%MOIN*%', 'M02*'].join('\n')).units).toBe('in')
    })

    it('CRLF 換行也能解析', () => {
      const { commands } = parseGerber(
        '%FSLAX36Y36*%\r\n%MOMM*%\r\n%ADD10C,0.5*%\r\nD10*\r\nX1000000Y1000000D03*\r\nM02*'
      )
      expect(flashes(commands)).toHaveLength(1)
    })
  })

  describe('Aperture 定義', () => {
    it('解析圓形、矩形與多參數 aperture', () => {
      const { apertures } = parseGerber(
        gerber('%ADD10C,0.5*%', '%ADD11R,1.0X2.0*%', '%ADD12P,1.5X6X45*%')
      )
      expect(apertures['10']).toEqual({ shape: 'C', params: [0.5] })
      expect(apertures['11']).toEqual({ shape: 'R', params: [1, 2] })
      expect(apertures['12']).toEqual({ shape: 'P', params: [1.5, 6, 45] })
    })

    it('形狀代碼一律轉大寫，沒有逗號也吃得下', () => {
      const { apertures } = parseGerber(gerber('%ADD10c,0.5*%', '%ADD11MyMacro*%'))
      expect(apertures['10'].shape).toBe('C')
      expect(apertures['11']).toEqual({ shape: 'MYMACRO', params: [0] })
    })
  })

  describe('Aperture 選取', () => {
    it('D10 以上是選取 aperture，會記在後續指令上', () => {
      const { commands } = parseGerber(
        gerber('%ADD10C,0.5*%', '%ADD11C,1.0*%', 'D10*', 'X0Y0D03*', 'D11*', 'X1000000Y0D03*')
      )
      expect(flashes(commands).map((c) => c.aperture)).toEqual(['10', '11'])
    })

    it('D01/D02/D03 不會被誤認成 aperture 選取', () => {
      const { commands } = parseGerber(gerber('%ADD10C,0.5*%', 'D10*', 'D03*'))
      // 沒有座標的 D03* 不是有效指令，但 aperture 也不該被改掉
      expect(commands.filter((c) => c.type === 'flash').every((c) => c.aperture === '10')).toBe(true)
    })

    it('支援 G54 前綴的舊式選取寫法', () => {
      const { commands } = parseGerber(gerber('%ADD10C,0.5*%', 'G54D10*', 'X0Y0D03*'))
      expect(flashes(commands)[0].aperture).toBe('10')
    })
  })

  describe('模態座標', () => {
    it('D01 的起點是「畫之前」的位置', () => {
      const { commands } = parseGerber(
        gerber('%ADD10C,0.1*%', 'D10*', 'X1000000Y1000000D02*', 'X3000000Y4000000D01*')
      )
      const draw = draws(commands)[0]
      expect(draw).toMatchObject({ fromX: 1, fromY: 1, x: 3, y: 4 })
    })

    it('沒寫的軸沿用上一個值', () => {
      const { commands } = parseGerber(
        gerber('%ADD10C,0.1*%', 'D10*', 'X1000000Y2000000D02*', 'X5000000D01*')
      )
      // 只給 X，Y 沿用 2
      expect(draws(commands)[0]).toMatchObject({ fromX: 1, fromY: 2, x: 5, y: 2 })
    })

    it('沒有 D 碼的純座標行只更新位置，不產生指令', () => {
      const { commands } = parseGerber(
        gerber('%ADD10C,0.1*%', 'D10*', 'X1000000Y1000000*', 'X3000000Y3000000D01*')
      )
      expect(commands).toHaveLength(1)
      expect(draws(commands)[0]).toMatchObject({ fromX: 1, fromY: 1, x: 3, y: 3 })
    })

    it('負座標解析正確', () => {
      const { commands } = parseGerber(gerber('%ADD10C,0.1*%', 'D10*', 'X-2000000Y-3000000D03*'))
      expect(flashes(commands)[0]).toMatchObject({ x: -2, y: -3 })
    })
  })

  describe('指令類型', () => {
    it('D02 記錄成 move，帶起點與終點', () => {
      const { commands } = parseGerber(
        gerber('%ADD10C,0.1*%', 'D10*', 'X1000000Y1000000D01*', 'X4000000Y4000000D02*')
      )
      expect(moves(commands)[0]).toMatchObject({ fromX: 1, fromY: 1, x: 4, y: 4 })
    })

    it('D03 記錄成 flash', () => {
      const { commands } = parseGerber(gerber('%ADD10C,0.5*%', 'D10*', 'X2000000Y2000000D03*'))
      expect(flashes(commands)).toHaveLength(1)
    })

    it('I / J 偏移量會帶進 draw 指令（弧用）', () => {
      const { commands } = parseGerber(
        gerber('%ADD10C,0.1*%', 'D10*', 'G03*', 'X1000000Y0I500000J0D01*')
      )
      const draw = draws(commands)[0]
      expect(draw.i).toBe(0.5)
      expect(draw.j).toBe(0)
      expect(draw.interpolation).toBe('ccw')
    })

    it('插值模式在 G01 / G02 / G03 之間切換', () => {
      const { commands } = parseGerber(
        gerber(
          '%ADD10C,0.1*%',
          'D10*',
          'G01*',
          'X1000000Y0D01*',
          'G02*',
          'X2000000Y0D01*',
          'G01*',
          'X3000000Y0D01*'
        )
      )
      expect(draws(commands).map((d) => d.interpolation)).toEqual(['linear', 'cw', 'linear'])
    })
  })

  describe('極性', () => {
    it('%LPC*% 之後的指令是 clear，%LPD*% 再切回 dark', () => {
      const { commands } = parseGerber(
        gerber(
          '%ADD10C,0.5*%',
          'D10*',
          'X0Y0D03*',
          '%LPC*%',
          'X1000000Y0D03*',
          '%LPD*%',
          'X2000000Y0D03*'
        )
      )
      expect(flashes(commands).map((c) => c.polarity)).toEqual(['dark', 'clear', 'dark'])
    })
  })

  describe('G36 / G37 填充區域', () => {
    it('把區域內的座標收成一個 region 指令', () => {
      const { commands } = parseGerber(
        gerber(
          'G36*',
          'X0Y0D02*',
          'X2000000Y0D01*',
          'X2000000Y2000000D01*',
          'X0Y2000000D01*',
          'G37*'
        )
      )
      const region = regions(commands)
      expect(region).toHaveLength(1)
      expect(region[0].points).toHaveLength(4)
      expect(region[0].points[0]).toEqual({ x: 0, y: 0, move: true })
      expect(region[0].points[1]).toEqual({ x: 2, y: 0, move: false })
    })

    it('區域模式下不產生 draw / move 指令', () => {
      const { commands } = parseGerber(
        gerber('G36*', 'X0Y0D02*', 'X1000000Y0D01*', 'X1000000Y1000000D01*', 'G37*')
      )
      expect(draws(commands)).toHaveLength(0)
      expect(moves(commands)).toHaveLength(0)
    })

    it('多個 D02 代表複合輪廓（例如字母 O 的內洞）', () => {
      const { commands } = parseGerber(
        gerber(
          'G36*',
          'X0Y0D02*',
          'X4000000Y0D01*',
          'X4000000Y4000000D01*',
          'X1000000Y1000000D02*',
          'X3000000Y1000000D01*',
          'X3000000Y3000000D01*',
          'G37*'
        )
      )
      const points = regions(commands)[0].points
      // 兩個子輪廓起點
      expect(points.filter((p) => p.move)).toHaveLength(2)
    })

    it('少於三個點的區域會被丟掉（畫不出面）', () => {
      const { commands } = parseGerber(gerber('G36*', 'X0Y0D02*', 'X1000000Y0D01*', 'G37*'))
      expect(regions(commands)).toHaveLength(0)
    })

    it('區域沿用 G36 當下的極性', () => {
      const { commands } = parseGerber(
        gerber(
          '%LPC*%',
          'G36*',
          'X0Y0D02*',
          'X1000000Y0D01*',
          'X1000000Y1000000D01*',
          'G37*'
        )
      )
      expect(regions(commands)[0].polarity).toBe('clear')
    })
  })

  describe('防禦', () => {
    it('空字串不拋錯', () => {
      const result = parseGerber('')
      expect(result.commands).toEqual([])
      expect(result.apertures).toEqual({})
    })

    it('無法辨識的行會被忽略', () => {
      const { commands } = parseGerber(
        gerber('G04 這是註解*', 'ZZZ 亂碼', '%ADD10C,0.5*%', 'D10*', 'X0Y0D03*')
      )
      expect(flashes(commands)).toHaveLength(1)
    })
  })
})

describe('declaresCoordinateFormat', () => {
  // 這是能不能交給 tracespace 的判斷依據：plotter 會在多次 plot 之間殘留
  // 狀態，而污染範圍剛好止於「檔案自己有沒有宣告格式」
  it('有 %FS 參數塊就算自帶格式', () => {
    expect(declaresCoordinateFormat('%FSLAX36Y36*%\nM02*')).toBe(true)
    expect(declaresCoordinateFormat('%FSLAX34Y34*%')).toBe(true)
  })

  it('沒有 %FS 就不算', () => {
    expect(declaresCoordinateFormat('D10*\nX1000Y1000D03*')).toBe(false)
    expect(declaresCoordinateFormat('%MOMM*%\n%ADD10C,0.5*%')).toBe(false)
    expect(declaresCoordinateFormat('')).toBe(false)
  })
})

describe('extractMovePaths', () => {
  it('只留下 D02 移動軌跡', () => {
    const text = gerber(
      '%ADD10C,0.1*%',
      'D10*',
      'X1000000Y1000000D02*',
      'X3000000Y3000000D01*',
      'X5000000Y5000000D02*',
      'X6000000Y6000000D03*'
    )
    const moves = extractMovePaths(text)
    expect(moves).toHaveLength(2)
    expect(moves.every((m) => m.type === 'move')).toBe(true)
    expect(moves[0]).toMatchObject({ fromX: 0, fromY: 0, x: 1, y: 1 })
    expect(moves[1]).toMatchObject({ fromX: 3, fromY: 3, x: 5, y: 5 })
  })

  it('沒有 D02 時回傳空陣列', () => {
    expect(extractMovePaths(gerber('%ADD10C,0.5*%', 'D10*', 'X0Y0D03*'))).toEqual([])
  })
})
