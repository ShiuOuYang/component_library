import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import ChptCommentThread from '@/components/library/ui/ChptCommentThread.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import type { CommentItem } from '@/components/library/shared/commentThread'

const NOW = new Date(2026, 10, 25, 12, 0).getTime()
const MIN = 60_000
const ME = { id: 'u01', name: '王小明' }
const CHEN = { id: 'u02', name: '陳怡君' }
const LIN = { id: 'u03', name: '林志豪', avatar: 'data:image/png;base64,AA' }
const triggers = [{ char: '@', options: [{ id: 'u02', label: '陳怡君' }, { id: 'u03', label: '林志豪' }] }]
const seed = (): CommentItem[] => [
  {
    id: 'c1',
    author: CHEN,
    body: '爐溫偏高 @[林志豪](u03) 請確認',
    createdAt: NOW - 180 * MIN,
    attachments: [{ name: 'curve.png', size: 2048, url: 'https://example.com/curve.png' }, { name: 'note.txt' }],
    replies: [
      { id: 'r1', author: LIN, body: '已處理', createdAt: NOW - 95 * MIN },
      { id: 'r2', author: ME, body: '要隔離嗎？', createdAt: NOW - 40 * MIN, editedAt: NOW - 38 * MIN },
    ],
  },
  { id: 'c2', author: CHEN, body: '已放行', createdAt: NOW - 26 * 60 * MIN, resolved: true, resolvedBy: CHEN, replies: [] },
  { id: 'c3', author: ME, body: '交接', createdAt: NOW - 2 * MIN },
]

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.useRealTimers()
})
function mountIt(props: Record<string, unknown> = {}, wrap?: (n: ReturnType<typeof h>) => ReturnType<typeof h>) {
  const items = ref<CommentItem[]>((props.modelValue as CommentItem[]) ?? seed())
  const emitted: Record<string, unknown[]> = {}
  const rec = (n: string) => (v: unknown) => (emitted[n] ??= []).push(v)
  let n = 0
  const node = () =>
    h(ChptCommentThread, {
      currentUser: ME,
      triggers,
      now: NOW,
      idFactory: () => `new${++n}`,
      ...props,
      modelValue: items.value,
      'onUpdate:modelValue': (v: CommentItem[]) => (rec('items')(v), (items.value = v)),
      onCreate: rec('create'),
      onEdit: rec('edit'),
      onRemove: rec('remove'),
      onResolve: rec('resolve'),
    })
  const w = mount({ render: () => (wrap ? wrap(node()) : node()) }, { attachTo: document.body })
  mounted.push(w)
  const item = (id: string) => w.find(`[data-comment="${id}"]`)
  const btnIn = (el: ReturnType<typeof item>, label: string) => el.findAll('button').find((b) => b.text() === label)
  const type = async (ta: ReturnType<typeof item>, text: string) => {
    const el = ta.element as HTMLTextAreaElement
    el.value = text
    el.setSelectionRange(text.length, text.length)
    await ta.trigger('input')
  }
  return { w, items, emitted, item, btnIn, type }
}

describe('ChptCommentThread', () => {
  it('留言、回覆、提及、附件、相對時間、已編輯、你、已解決收起、可用的動作', () => {
    const { w, item, btnIn } = mountIt()
    expect(w.find('h3').text()).toBe('5 則留言')
    expect(item('c1').find('[data-body]').text()).toBe('爐溫偏高 @林志豪 請確認')
    expect(item('c1').find('[data-mention="u03"]').attributes('style')).toContain('accent-subtle')
    expect(item('c1').text()).toContain('3 小時前')
    expect(item('c1').find('time').attributes('title')).toBe('2026-11-25 09:00')
    expect(item('c1').findAll('a')).toHaveLength(1)
    expect(item('c1').find('a').attributes('href')).toBe('https://example.com/curve.png')
    expect(item('c1').text()).toContain('2.0 KB')
    expect(item('r2').text()).toContain('（你）')
    expect(item('r2').text()).toContain('（已編輯）')
    expect(item('r1').find('img').exists()).toBe(true)
    expect(item('c3').text()).toContain('2 分鐘前')
    // 已解決：收起
    expect(item('c2').text()).toContain('陳怡君 的留言已由 陳怡君 標記為已解決（1 則）')
    expect(item('c2').find('[data-body]').exists()).toBe(false)
    // 動作：別人的留言只能回覆與解決；自己的可以編輯刪除
    expect(btnIn(item('c1').find('div'), '回覆')).toBeDefined()
    expect(item('c1').find('.px-3.py-2').findAll('button').map((b) => b.text())).toEqual(['回覆', '標記為已解決'])
    expect(item('r2').findAll('button').map((b) => b.text())).toEqual(['編輯', '刪除'])
    expect(item('r1').findAll('button')).toHaveLength(0)
    expect(w.find('[data-composer]').exists()).toBe(true)
  })

  it('送出新留言（Ctrl+Enter 或按鈕）、空的不能送、事件附提及', async () => {
    const { w, items, emitted, type } = mountIt()
    const ta = w.find('[data-composer] textarea')
    const send = w.find('[data-composer]').findAll('button').at(-1)!
    expect(send.attributes('disabled')).toBeDefined()
    await type(ta, '   ')
    expect(send.attributes('disabled')).toBeDefined()
    await type(ta, '請 @陳')
    await ta.trigger('keydown', { key: 'Enter' })
    await nextTick()
    await type(ta, `${(ta.element as HTMLTextAreaElement).value}看一下`)
    await send.trigger('click')
    expect(items.value.at(-1)).toMatchObject({ id: 'new1', author: ME, body: '請 @[陳怡君](u02) 看一下', replies: [] })
    expect((emitted.create[0] as { parentId: unknown; mentions: { id: string }[] }).mentions.map((m) => m.id)).toEqual(['u02'])
    expect((emitted.create[0] as { parentId: unknown }).parentId).toBeNull()
    expect(w.find('.comment-thread > [aria-live="polite"]').text()).toBe('已送出留言')
    await type(ta, '第二則')
    await ta.trigger('keydown', { key: 'Enter', ctrlKey: true })
    expect(items.value.at(-1)!.body).toBe('第二則')
  })

  it('回覆：打開回覆框、取消、送出', async () => {
    const { item, btnIn, items, emitted, type, w } = mountIt()
    await btnIn(item('c1').find('.px-3.py-2'), '回覆')!.trigger('click')
    await nextTick()
    expect(w.find('[data-reply-box]').exists()).toBe(true)
    expect(document.activeElement).toBe(w.find('[data-reply-box] textarea').element)
    await btnIn(w.find('[data-reply-box]'), '取消')!.trigger('click')
    expect(w.find('[data-reply-box]').exists()).toBe(false)
    await btnIn(item('c1').find('.px-3.py-2'), '回覆')!.trigger('click')
    const ta = w.find('[data-reply-box] textarea')
    await type(ta, '已隔離')
    await btnIn(w.find('[data-reply-box]'), '回覆')!.trigger('click')
    const c1 = items.value.find((c) => c.id === 'c1')!
    expect(c1.replies!.at(-1)).toMatchObject({ id: 'new1', body: '已隔離' })
    expect(c1.replies!.at(-1)!.replies).toBeUndefined()
    expect((emitted.create[0] as { parentId: string }).parentId).toBe('c1')
    expect(w.find('[data-reply-box]').exists()).toBe(false)
    // Ctrl + Enter 也能送；空的不送
    await btnIn(item('c1').find('.px-3.py-2'), '回覆')!.trigger('click')
    await w.find('[data-reply-box] textarea').trigger('keydown', { key: 'Enter', ctrlKey: true })
    expect(emitted.create).toHaveLength(1)
    await type(w.find('[data-reply-box] textarea'), '好')
    await w.find('[data-reply-box] textarea').trigger('keydown', { key: 'Enter', ctrlKey: true })
    expect(emitted.create).toHaveLength(2)
  })

  it('編輯：儲存（附新加的提及）、沒改不送、取消', async () => {
    const { item, btnIn, items, emitted, type } = mountIt()
    await btnIn(item('c3'), '編輯')!.trigger('click')
    const box = () => item('c3').find('[data-edit-box]')
    expect((box().find('textarea').element as HTMLTextAreaElement).value).toBe('交接')
    await btnIn(box(), '儲存')!.trigger('click') // 沒改
    expect(emitted.edit).toBeUndefined()
    await btnIn(item('c3'), '編輯')!.trigger('click')
    await type(box().find('textarea'), '交接 @林')
    await box().find('textarea').trigger('keydown', { key: 'Enter' })
    await nextTick()
    await btnIn(box(), '儲存')!.trigger('click')
    const c3 = items.value.find((c) => c.id === 'c3')!
    expect(c3.body).toBe('交接 @[林志豪](u03)') // 儲存時去掉頭尾空白
    expect(c3.editedAt).toBeTypeOf('number')
    expect((emitted.edit[0] as { addedMentions: { id: string }[] }).addedMentions.map((m) => m.id)).toEqual(['u03'])
    await btnIn(item('c3'), '編輯')!.trigger('click')
    await type(box().find('textarea'), '')
    expect(btnIn(box(), '儲存')!.attributes('disabled')).toBeDefined()
    await box().find('textarea').trigger('keydown', { key: 'Enter', ctrlKey: true })
    await btnIn(box(), '取消')!.trigger('click')
    expect(box().exists()).toBe(false)
  })

  it('刪除：兩步確認、取消；有回覆的留下佔位', async () => {
    const { item, btnIn, items, emitted, w } = mountIt({ moderator: true })
    await btnIn(item('c3'), '刪除')!.trigger('click')
    expect(item('c3').find('[role="alert"]').text()).toContain('確定刪除這則留言？')
    await btnIn(item('c3').find('[role="alert"]'), '取消')!.trigger('click')
    expect(item('c3').find('[role="alert"]').exists()).toBe(false)
    await btnIn(item('c3'), '刪除')!.trigger('click')
    await btnIn(item('c3').find('[role="alert"]'), '刪除')!.trigger('click')
    expect(items.value.map((c) => c.id)).toEqual(['c1', 'c2'])
    expect(emitted.remove).toEqual([{ comment: expect.objectContaining({ id: 'c3' }), parentId: null }])
    // 管理者刪別人的、有回覆的
    await btnIn(item('c1').find('.px-3.py-2'), '刪除')!.trigger('click')
    expect(item('c1').find('[role="alert"]').text()).toContain('回覆會保留')
    await btnIn(item('c1').find('[role="alert"]'), '刪除')!.trigger('click')
    expect(item('c1').find('[data-deleted]').text()).toContain('此留言已刪除')
    expect(item('c1').findAll('[data-comment]')).toHaveLength(2)
    expect(w.find('h3').text()).toBe('3 則留言')
    // 回覆的刪除帶 parentId
    await btnIn(item('r2'), '刪除')!.trigger('click')
    await btnIn(item('r2').find('[role="alert"]'), '刪除')!.trigger('click')
    expect((emitted.remove.at(-1) as { parentId: string }).parentId).toBe('c1')
  })

  it('標記已解決 / 展開 / 收起 / 重新開啟、未解決篩選', async () => {
    const { item, btnIn, items, emitted, w } = mountIt()
    await btnIn(item('c3'), '標記為已解決')!.trigger('click')
    expect(items.value.find((c) => c.id === 'c3')).toMatchObject({ resolved: true, resolvedBy: ME })
    expect(emitted.resolve).toEqual([{ comment: expect.objectContaining({ id: 'c3' }), resolved: true }])
    expect(item('c3').text()).toContain('已解決')
    await btnIn(item('c3'), '展開')!.trigger('click')
    expect(item('c3').find('[data-body]').text()).toBe('交接')
    expect(item('c3').text()).toContain('已由 王小明 標記為已解決')
    expect(btnIn(item('c3'), '回覆')).toBeUndefined()
    await btnIn(item('c3'), '收起')!.trigger('click')
    await btnIn(item('c3'), '展開')!.trigger('click')
    await btnIn(item('c3'), '重新開啟')!.trigger('click')
    expect(items.value.find((c) => c.id === 'c3')!.resolved).toBe(false)
    expect(item('c3').find('[data-body]').exists()).toBe(true)
    // 篩選
    const filterBtn = (label: string) => w.find('[role="group"]').findAll('button').find((b) => b.text().startsWith(label))!
    expect(filterBtn('未解決').text()).toBe('未解決（2）')
    await filterBtn('未解決').trigger('click')
    expect(w.findAll('ol > li[data-comment="c2"]')).toHaveLength(0)
    await filterBtn('全部').trigger('click')
    expect(item('c2').exists()).toBe(true)
  })

  it('唯讀、沒登入、排序、空的、時間每分鐘更新、方法', async () => {
    const ro = mountIt({ readonly: true })
    expect(ro.w.find('[data-composer]').exists()).toBe(false)
    expect(ro.item('c1').findAll('button')).toHaveLength(0)
    const guest = mountIt({ currentUser: null })
    expect(guest.w.find('[data-composer]').exists()).toBe(false)
    const newest = mountIt({ order: 'newest' })
    expect(newest.w.findAll('ol > li[data-comment]').map((li) => li.attributes('data-comment'))[0]).toBe('c3')
    const empty = mountIt({ modelValue: [], emptyText: '空', title: '討論' })
    expect(empty.w.text()).toContain('空')
    expect(empty.w.find('h3').text()).toBe('討論')
    expect(empty.w.find('[role="group"]').exists()).toBe(false)
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const live = mountIt({ now: null })
    expect(live.item('c3').text()).toContain('2 分鐘前')
    vi.setSystemTime(NOW + 60 * MIN)
    vi.advanceTimersByTime(60_000)
    await nextTick()
    expect(live.item('c3').text()).toContain('1 小時前')
    expect(live.item('c2').text()).toContain('已解決')
    vi.useRealTimers()
    const old = mountIt({ modelValue: [{ id: 'o', author: CHEN, body: '舊的', createdAt: NOW - 30 * 86_400_000 }, { id: 'p', author: CHEN, body: '昨天', createdAt: NOW - 30 * 60 * MIN }] })
    expect(old.item('o').text()).toContain('2026-10-26')
    expect(old.item('p').text()).toContain('1 天前')
    const vm = live.w.findComponent(ChptCommentThread).vm as unknown as { count: number; reply: (id: string) => void }
    expect(vm.count).toBe(5)
    vm.reply('c3')
    await nextTick()
    expect(live.w.find('[data-reply-box]').exists()).toBe(true)
    vm.reply('nope')
  })

  it('英文語系', () => {
    const en = mountIt({ modelValue: [{ id: 'x', author: CHEN, body: 'hi', createdAt: NOW - 30_000 }] }, (n) => h(ChptConfigProvider, { locale: enUS }, () => n))
    expect(en.w.find('h3').text()).toBe('1 comment')
    expect(en.item('x').text()).toContain('just now')
    expect(en.item('x').find('article').attributes('aria-label')).toBe('陳怡君, just now')
  })
})
