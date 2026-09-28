import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChptAnchor from '@/components/library/ui/ChptAnchor.vue'
import ChptBackTop from '@/components/library/ui/ChptBackTop.vue'

/**
 * jsdom 沒有排版：用一個假的捲動容器，讓各區塊的 getBoundingClientRect 跟著 scrollTop 算
 */
function setupScroller(sectionTops: Record<string, number>) {
  const container = document.createElement('div')
  container.id = 'scroller'
  container.style.overflowY = 'auto'
  Object.defineProperty(container, 'clientHeight', { value: 500, configurable: true })
  Object.defineProperty(container, 'scrollHeight', { value: 3000, configurable: true })
  container.getBoundingClientRect = () => ({ top: 100, left: 0, right: 800, bottom: 600, width: 800, height: 500, x: 0, y: 100, toJSON() {} }) as DOMRect
  let scrollTop = 0
  Object.defineProperty(container, 'scrollTop', {
    get: () => scrollTop,
    set: (v: number) => {
      scrollTop = v
    },
    configurable: true,
  })
  container.scrollTo = ((opts: ScrollToOptions) => {
    scrollTop = opts.top ?? 0
    container.dispatchEvent(new Event('scroll'))
  }) as typeof container.scrollTo
  for (const [id, top] of Object.entries(sectionTops)) {
    const el = document.createElement('section')
    el.id = id
    el.innerHTML = `<h2>${id}</h2>`
    el.getBoundingClientRect = () => ({ top: 100 + top - scrollTop, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} }) as DOMRect
    container.appendChild(el)
  }
  document.body.appendChild(container)
  const scroll = async (to: number) => {
    scrollTop = to
    container.dispatchEvent(new Event('scroll'))
    await new Promise((r) => requestAnimationFrame(() => r(null)))
    await nextTick()
  }
  return { container, scroll }
}

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
  vi.useRealTimers()
})

const items = [
  { href: '#intro', title: '簡介' },
  { href: '#usage', title: '用法', children: [{ href: '#props', title: 'Props' }] },
  { href: '#faq', title: '常見問題' },
]

describe('ChptAnchor', () => {
  it('<nav aria-label>；巢狀項目縮排', async () => {
    setupScroller({ intro: 0, usage: 600, props: 900, faq: 1500 })
    const w = mount(ChptAnchor, { props: { items }, attachTo: document.body })
    wrapper = w
    expect(w.attributes('aria-label')).toBe('本頁內容')
    const links = w.findAll('a')
    expect(links.map((a) => a.text())).toEqual(['簡介', '用法', 'Props', '常見問題'])
    expect(links[2].attributes('style')).toContain('padding-left: 24px')
  })

  it('自動偵測捲動容器；捲動時標示目前區塊（aria-current=location）', async () => {
    const { scroll } = setupScroller({ intro: 0, usage: 600, props: 900, faq: 1500 })
    const w = mount(ChptAnchor, { props: { items }, attachTo: document.body })
    wrapper = w
    await nextTick()
    await nextTick()
    expect(w.find('a[aria-current="location"]').text()).toBe('簡介')
    await scroll(950)
    expect(w.find('a[aria-current="location"]').text()).toBe('Props')
    expect(w.emitted('change')?.at(-1)).toEqual(['#props'])
  })

  it('捲到底時標示最後一個區塊', async () => {
    const { scroll } = setupScroller({ intro: 0, usage: 600, props: 900, faq: 2900 })
    const w = mount(ChptAnchor, { props: { items }, attachTo: document.body })
    wrapper = w
    await nextTick()
    await scroll(2500) // 2500 + 500 = scrollHeight
    expect(w.find('a[aria-current="location"]').text()).toBe('常見問題')
  })

  it('點連結：捲到區塊（扣掉 offset）、更新 hash、焦點移到區塊', async () => {
    const { container } = setupScroller({ intro: 0, usage: 600, props: 900, faq: 1500 })
    const w = mount(ChptAnchor, { props: { items, offset: 40 }, attachTo: document.body })
    wrapper = w
    await nextTick()
    const spy = vi.spyOn(history, 'replaceState')
    await w.findAll('a')[3].trigger('click')
    expect(container.scrollTop).toBe(1460)
    expect(spy.mock.calls.at(-1)?.[2]).toBe('#faq')
    expect(document.activeElement?.id).toBe('faq')
    expect(document.getElementById('faq')!.getAttribute('tabindex')).toBe('-1')
    expect(w.find('a[aria-current="location"]').text()).toBe('常見問題')
    spy.mockRestore()
  })

  it('Ctrl 點擊照瀏覽器預設（開新分頁）', async () => {
    setupScroller({ intro: 0, usage: 600, props: 900, faq: 1500 })
    const w = mount(ChptAnchor, { props: { items }, attachTo: document.body })
    wrapper = w
    const event = new MouseEvent('click', { ctrlKey: true, bubbles: true, cancelable: true })
    w.findAll('a')[1].element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})

describe('ChptBackTop', () => {
  it('捲超過 visibilityHeight 才出現；點了回頂端並把焦點移到標題', async () => {
    const { container, scroll } = setupScroller({ intro: 0 })
    const w = mount(ChptBackTop, { props: { target: '#scroller', visibilityHeight: 300 }, attachTo: container })
    wrapper = w
    await nextTick()
    await nextTick()
    expect(document.querySelector('button[aria-label="回到頂端"]')).toBeNull()
    await scroll(400)
    const button = document.querySelector<HTMLButtonElement>('button[aria-label="回到頂端"]')!
    expect(button).toBeTruthy()
    button.click()
    expect(container.scrollTop).toBe(0)
    expect(document.activeElement?.tagName).toBe('H2')
    expect(w.emitted('click')).toHaveLength(1)
  })

  it('外部 class 落在按鈕上；位置可調', async () => {
    const { scroll } = setupScroller({ intro: 0 })
    const w = mount(ChptBackTop, { props: { target: '#scroller', right: 40, bottom: 60 }, attrs: { class: 'custom' }, attachTo: document.body })
    wrapper = w
    await nextTick()
    await scroll(1000)
    const button = document.querySelector<HTMLButtonElement>('button[aria-label="回到頂端"]')!
    expect(button.classList.contains('custom')).toBe(true)
    expect(button.style.right).toBe('40px')
    expect(button.style.bottom).toBe('60px')
  })
})
