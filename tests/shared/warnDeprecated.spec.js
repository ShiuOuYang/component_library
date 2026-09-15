import { describe, expect, it, vi } from 'vitest'

describe('warnDeprecated', () => {
  it('印出過時名稱與建議替代', async () => {
    vi.resetModules()
    const { warnDeprecated } = await import('@/components/library/shared/warnDeprecated')
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    warnDeprecated('OldThing', 'NewThing')

    expect(spy).toHaveBeenCalledTimes(1)
    const message = spy.mock.calls[0][0]
    expect(message).toContain('OldThing')
    expect(message).toContain('NewThing')
  })

  it('同一個名稱只警告一次（避免每次 mount 都洗版）', async () => {
    vi.resetModules()
    const { warnDeprecated } = await import('@/components/library/shared/warnDeprecated')
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    warnDeprecated('Repeated', 'Replacement')
    warnDeprecated('Repeated', 'Replacement')
    warnDeprecated('Repeated', 'Replacement')

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('不同名稱各自警告', async () => {
    vi.resetModules()
    const { warnDeprecated } = await import('@/components/library/shared/warnDeprecated')
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    warnDeprecated('A', 'A2')
    warnDeprecated('B', 'B2')

    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('note 會一併輸出', async () => {
    vi.resetModules()
    const { warnDeprecated } = await import('@/components/library/shared/warnDeprecated')
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    warnDeprecated('WithNote', 'Better', 'oldProp → newProp')
    expect(spy.mock.calls[0][0]).toContain('oldProp → newProp')
  })
})
