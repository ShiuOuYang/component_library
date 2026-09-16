import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import FilterBar from '@/components/library/ui/FilterBar.vue'
import ChptFilterBar from '@/components/library/ui/ChptFilterBar.vue'
import CodeBlock from '@/components/library/ui/CodeBlock.vue'
import ChptCodeBlock from '@/components/library/ui/ChptCodeBlock.vue'
import FilterSelect from '@/components/library/ui/FilterSelect.vue'
import FilterDropdown from '@/components/library/ui/FilterDropdown.vue'
import TagFilterDropdown from '@/components/library/ui/TagFilterDropdown.vue'
import ChptFilter from '@/components/library/ui/ChptFilter.vue'
import Pagination from '@/components/library/ui/Pagination.vue'
import PaginationControls from '@/components/library/ui/PaginationControls.vue'
import ChptPagination from '@/components/library/ui/ChptPagination.vue'
import CommonTable from '@/components/library/ui/CommonTable.vue'
import ChptTable from '@/components/library/ui/ChptTable.vue'
import CommonTooltip from '@/components/library/ui/CommonTooltip.vue'
import ChptDataTooltip from '@/components/library/ui/ChptDataTooltip.vue'
import ExcelEditor from '@/components/library/excel/ExcelEditor.vue'
import ChptExcelEditor from '@/components/library/excel/ChptExcelEditor.vue'
import ExcelExporter from '@/components/library/excel/ExcelExporter.vue'
import ChptExcelExporter from '@/components/library/excel/ChptExcelExporter.vue'
import ExcelUploader from '@/components/library/excel/ExcelUploader.vue'
import ChptExcelUploader from '@/components/library/excel/ChptExcelUploader.vue'

/**
 * legacy 相容層全部是薄包裝，只轉發 props / emits / slots。
 * 這裡驗證「真的有轉發到 canonical」以及「props 對應正確」——
 * 收斂前它們是各自維護的第二份實作，改一邊不會影響另一邊。
 */

describe('legacy 包裝：確實渲染出 canonical 元件', () => {
  it('FilterBar → ChptFilterBar', () => {
    const wrapper = mount(FilterBar, {
      props: { filters: [], modelValue: {} },
    })
    expect(wrapper.findComponent(ChptFilterBar).exists()).toBe(true)
  })

  it('CodeBlock → ChptCodeBlock', () => {
    const wrapper = mount(CodeBlock, { props: { code: 'const a = 1' } })
    expect(wrapper.findComponent(ChptCodeBlock).exists()).toBe(true)
  })

  it('FilterSelect → ChptFilter type="select"', () => {
    const wrapper = mount(FilterSelect, { props: { options: [] } })
    const inner = wrapper.findComponent(ChptFilter)
    expect(inner.exists()).toBe(true)
    expect(inner.props('type')).toBe('select')
  })

  it('FilterDropdown → ChptFilter type="dropdown"', () => {
    const wrapper = mount(FilterDropdown, { props: { options: [] } })
    expect(wrapper.findComponent(ChptFilter).props('type')).toBe('dropdown')
  })

  it('TagFilterDropdown → ChptFilter type="tag"', () => {
    const wrapper = mount(TagFilterDropdown, { props: { options: [] } })
    expect(wrapper.findComponent(ChptFilter).props('type')).toBe('tag')
  })

  it('Pagination → ChptPagination variant="full"', () => {
    const wrapper = mount(Pagination, { props: { totalItems: 100 } })
    expect(wrapper.findComponent(ChptPagination).props('variant')).toBe('full')
  })

  it('PaginationControls → ChptPagination variant="compact"', () => {
    const wrapper = mount(PaginationControls, { props: { total: 100 } })
    expect(wrapper.findComponent(ChptPagination).props('variant')).toBe('compact')
  })

  it('CommonTable 是 ChptTable 的別名（同一個元件）', () => {
    expect(CommonTable).toBe(ChptTable)
  })

  /**
   * excel/ 的三個 legacy 檔是純別名（export default Canonical），
   * 不是包裝 —— 因此驗證的是「同一個元件物件」，不是「渲染出 canonical」。
   */
  it('ExcelEditor / ExcelExporter / ExcelUploader 都是 canonical 的別名', () => {
    expect(ExcelEditor).toBe(ChptExcelEditor)
    expect(ExcelExporter).toBe(ChptExcelExporter)
    expect(ExcelUploader).toBe(ChptExcelUploader)
  })

  it('CommonTooltip 是 ChptDataTooltip 的別名（同一個元件）', () => {
    expect(CommonTooltip).toBe(ChptDataTooltip)
  })
})

describe('legacy 包裝：props 對應', () => {
  it('TagFilterDropdown 的 isUnselectAll → show-clear-all', () => {
    const shown = mount(TagFilterDropdown, {
      props: { options: [], isUnselectAll: true },
    })
    expect(shown.findComponent(ChptFilter).props('showClearAll')).toBe(true)

    const hidden = mount(TagFilterDropdown, { props: { options: [] } })
    // legacy 預設不顯示清空鈕，包裝要保留這個行為
    expect(hidden.findComponent(ChptFilter).props('showClearAll')).toBe(false)
  })

  it('PaginationControls 的 pageSize → items-per-page、total → total-items', () => {
    const wrapper = mount(PaginationControls, {
      props: { currentPage: 3, pageSize: 25, total: 500 },
    })
    const inner = wrapper.findComponent(ChptPagination)

    expect(inner.props('currentPage')).toBe(3)
    expect(inner.props('itemsPerPage')).toBe(25)
    expect(inner.props('totalItems')).toBe(500)
  })

  it('CodeBlock 的 tip 相關 props 完整轉發', () => {
    const wrapper = mount(CodeBlock, {
      props: {
        code: 'x',
        language: 'ts',
        tip: '注意',
        tipType: 'warning',
        tipTitle: '警告',
        trimIndent: false,
      },
    })
    const inner = wrapper.findComponent(ChptCodeBlock)

    expect(inner.props('language')).toBe('ts')
    expect(inner.props('tip')).toBe('注意')
    expect(inner.props('tipType')).toBe('warning')
    expect(inner.props('tipTitle')).toBe('警告')
    expect(inner.props('trimIndent')).toBe(false)
  })
})

describe('legacy 包裝：事件對應', () => {
  it('PaginationControls 把 update:current-page 轉回 pageChange', async () => {
    const wrapper = mount(PaginationControls, {
      props: { currentPage: 1, pageSize: 10, total: 100 },
    })

    wrapper.findComponent(ChptPagination).vm.$emit('update:currentPage', 4)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('pageChange')?.[0]).toEqual([4])
  })

  it('PaginationControls 把 update:items-per-page 轉回 pageSizeChange', async () => {
    const wrapper = mount(PaginationControls, {
      props: { currentPage: 1, pageSize: 10, total: 100 },
    })

    wrapper.findComponent(ChptPagination).vm.$emit('update:itemsPerPage', 50)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('pageSizeChange')?.[0]).toEqual([50])
  })

  it('FilterBar 轉發 update:modelValue', async () => {
    const wrapper = mount(FilterBar, { props: { filters: [], modelValue: {} } })

    wrapper.findComponent(ChptFilterBar).vm.$emit('update:modelValue', { a: '1' })
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([{ a: '1' }])
  })

  it('Pagination 轉發三個事件', async () => {
    const wrapper = mount(Pagination, { props: { totalItems: 100 } })
    const inner = wrapper.findComponent(ChptPagination)

    inner.vm.$emit('update:currentPage', 3)
    inner.vm.$emit('update:itemsPerPage', 50)
    inner.vm.$emit('change', 3)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:currentPage')?.[0]).toEqual([3])
    expect(wrapper.emitted('update:itemsPerPage')?.[0]).toEqual([50])
    expect(wrapper.emitted('change')?.[0]).toEqual([3])
  })

  /**
   * ChptFilter 的 modelValue 型別涵蓋三種模式（select 為純量、
   * dropdown / tag 為陣列），legacy 介面則是各自固定一種。
   * 薄包裝在轉發時會把值收窄回 legacy 的形狀。
   */
  it('FilterSelect 只轉出單一值', async () => {
    const wrapper = mount(FilterSelect, { props: { options: ['a', 'b'] } })
    const inner = wrapper.findComponent(ChptFilter)

    inner.vm.$emit('update:modelValue', 'a')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['a'])

    // 萬一收到陣列（理論上不會），取第一個而不是把陣列丟給呼叫端
    inner.vm.$emit('update:modelValue', ['b'])
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual(['b'])
  })

  it('FilterDropdown 與 TagFilterDropdown 只轉出陣列', async () => {
    for (const Legacy of [FilterDropdown, TagFilterDropdown]) {
      const wrapper = mount(Legacy, { props: { options: ['a', 'b'] } })
      const inner = wrapper.findComponent(ChptFilter)

      inner.vm.$emit('update:modelValue', ['a', 'b'])
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['a', 'b']])

      // 萬一收到純量（理論上不會），包成陣列而不是破壞呼叫端的型別假設
      inner.vm.$emit('update:modelValue', 'a')
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([['a']])
    }
  })
})

describe('legacy 包裝：會發出 deprecation 警告', () => {
  it('使用 legacy 元件時在 console 留下提示', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.resetModules()

    // 重新載入才會重置「已警告過」的集合
    const Fresh = (await import('@/components/library/ui/FilterBar.vue')).default
    mount(Fresh, { props: { filters: [], modelValue: {} } })

    expect(spy.mock.calls.some((c) => String(c[0]).includes('FilterBar'))).toBe(true)
  })
})
