import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, reactive, ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ChptRichTextEditor from '@/components/library/ui/ChptRichTextEditor.vue'
import ChptForm from '@/components/library/ui/ChptForm.vue'
import ChptFormItem from '@/components/library/ui/ChptFormItem.vue'
import ChptConfigProvider from '@/components/library/ui/ChptConfigProvider.vue'
import { enUS } from '@/components/library/shared/locale'
import { isSafeUrl } from '@/components/library/shared/safeUrl'
import type { Editor } from '@tiptap/vue-3'

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
})

async function mountEditor(props: Record<string, unknown> = {}, initial = '<p>Hello</p>') {
  const model = ref(initial)
  wrapper = mount(
    { render: () => h(ChptRichTextEditor, { modelValue: model.value, 'onUpdate:modelValue': (v: string) => (model.value = v), ...props }) },
    { attachTo: document.body }
  )
  await flushPromises()
  await nextTick()
  const comp = wrapper.findComponent(ChptRichTextEditor)
  const editor = () => (comp.vm as unknown as { editor: Editor }).editor
  return { w: wrapper, model, comp, editor }
}

const prose = () => document.querySelector<HTMLElement>('.ProseMirror')!
const tool = (w: VueWrapper, name: string) => w.find(`[data-tool="${name}"]`)

describe('isSafeUrl', () => {
  it('只接受 http、https、mailto 與站內路徑', () => {
    for (const ok of ['https://a.com', 'HTTP://a.com', 'mailto:x@y.z', '/wo/123', '#sec', '?q=1', 'docs/page']) expect(isSafeUrl(ok)).toBe(true)
    for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,x', 'vbscript:x', '//evil.com', '', '   ']) expect(isSafeUrl(bad)).toBe(false)
  })
})

describe('ChptRichTextEditor', () => {
  it('顯示初始內容；編輯區是 textbox；工具列 role=toolbar 指向編輯區', async () => {
    const { w } = await mountEditor()
    expect(prose().innerHTML).toContain('Hello')
    expect(prose().getAttribute('role')).toBe('textbox')
    expect(prose().getAttribute('aria-multiline')).toBe('true')
    const toolbar = w.find('[role="toolbar"]')
    expect(toolbar.attributes('aria-controls')).toBe(prose().id)
    expect(tool(w, 'bold').attributes('aria-label')).toBe('粗體')
    expect(tool(w, 'heading2').text()).toBe('H2')
  })

  it('工具列套用格式並送出 HTML；按鈕以 aria-pressed 表示目前格式', async () => {
    const { w, model, editor } = await mountEditor()
    editor().commands.selectAll()
    await tool(w, 'bold').trigger('click')
    await nextTick()
    expect(model.value).toBe('<p><strong>Hello</strong></p>')
    expect(tool(w, 'bold').attributes('aria-pressed')).toBe('true')
    await tool(w, 'heading2').trigger('click')
    expect(model.value).toContain('<h2>')
    await tool(w, 'bulletList').trigger('click')
    expect(model.value).toContain('<ul>')
    editor().commands.selectAll()
    await tool(w, 'clear').trigger('click')
    expect(model.value).toMatch(/^<p>Hello<\/p>/)
    expect(model.value).not.toMatch(/<ul>|<h2>|<strong>/)
    await tool(w, 'undo').trigger('click')
    expect(model.value).toContain('<ul>')
  })

  it('其他格式按鈕', async () => {
    const { w, model, editor } = await mountEditor()
    for (const name of ['italic', 'underline', 'strike']) {
      editor().commands.selectAll()
      await tool(w, name).trigger('click')
    }
    expect(model.value).toMatch(/<em>|<u>|<s>/)
    for (const name of ['heading3', 'orderedList', 'blockquote', 'codeBlock']) {
      editor().commands.selectAll()
      await tool(w, name).trigger('click')
    }
    expect(model.value).toContain('<pre>')
    await tool(w, 'redo').trigger('click')
  })

  it('清空時送出空字串（必填判斷得出來）；外部改 v-model 時同步', async () => {
    const { model, editor } = await mountEditor()
    editor().commands.clearContent(true)
    await nextTick()
    expect(model.value).toBe('')
    model.value = '<p>重設後的內容</p>'
    await nextTick()
    expect(prose().textContent).toBe('重設後的內容')
  })

  it('連結：輸入網址套用；不安全的網址顯示錯誤；已是連結時按鈕變成移除連結', async () => {
    const { w, model, editor } = await mountEditor()
    editor().commands.selectAll()
    await tool(w, 'link').trigger('click')
    await nextTick()
    const input = w.find('input[type="url"]')
    expect(document.activeElement).toBe(input.element)
    await input.setValue('javascript:alert(1)')
    await w.find('form').trigger('submit')
    expect(w.find('[role="alert"]').text()).toContain('只接受')
    expect(model.value).not.toContain('href')
    await input.setValue('https://mes.example.com/wo/1')
    await w.find('form').trigger('submit')
    expect(model.value).toContain('href="https://mes.example.com/wo/1"')
    expect(w.find('form').exists()).toBe(false)
    editor().commands.selectAll()
    await nextTick()
    expect(tool(w, 'link').attributes('aria-label')).toBe('移除連結')
    await tool(w, 'link').trigger('click')
    expect(model.value).not.toContain('href')
  })

  it('連結：沒選取文字時把網址插入成連結文字；空白網址移除連結；Escape / 取消關閉', async () => {
    const { w, model, editor } = await mountEditor({}, '<p>Hi</p>')
    editor().commands.setTextSelection(3)
    await tool(w, 'link').trigger('click')
    await w.find('input[type="url"]').setValue('/wo/9')
    await w.find('form').trigger('submit')
    expect(model.value).toContain('<a')
    expect(model.value).toContain('/wo/9</a>')
    await tool(w, 'link').trigger('click') // 游標在連結裡 → 移除
    await nextTick()
    editor().commands.selectAll()
    await tool(w, 'link').trigger('click')
    await w.find('input[type="url"]').setValue('  ')
    await w.find('form').trigger('submit')
    expect(w.find('form').exists()).toBe(false)
    await tool(w, 'link').trigger('click')
    await w.find('input[type="url"]').trigger('keydown', { key: 'Escape' })
    expect(w.find('form').exists()).toBe(false)
  })

  it('工具列方向鍵移動焦點（roving tabindex）', async () => {
    const { w } = await mountEditor({ toolbar: ['bold', 'italic', '|', 'undo'] })
    expect(tool(w, 'bold').attributes('tabindex')).toBe('0')
    expect(tool(w, 'italic').attributes('tabindex')).toBe('-1')
    expect(w.findAll('[role="toolbar"] > span[aria-hidden]')).toHaveLength(1)
    const tb = w.find('[role="toolbar"]')
    await tb.trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(document.activeElement).toBe(tool(w, 'italic').element)
    await tb.trigger('keydown', { key: 'End' })
    await nextTick()
    expect(document.activeElement).toBe(tool(w, 'undo').element)
    await tb.trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(document.activeElement).toBe(tool(w, 'bold').element)
    await tb.trigger('keydown', { key: 'ArrowLeft' })
    await tb.trigger('keydown', { key: 'Home' })
    await tb.trigger('keydown', { key: 'a' })
    await nextTick()
    expect(document.activeElement).toBe(tool(w, 'bold').element)
  })

  it('maxLength：顯示字數、超過時標示（不截斷）；readonly 沒有工具列、不能編輯', async () => {
    const { w, editor } = await mountEditor({ maxLength: 3 })
    expect(w.text()).toContain('5 / 3 字')
    expect(w.text()).toContain('超過 3 字')
    expect(prose().getAttribute('aria-invalid')).toBe('true')
    expect(prose().getAttribute('aria-describedby')).toContain('-count')
    expect(editor().getText()).toBe('Hello')
    wrapper!.unmount()
    const r = await mountEditor({ readonly: true })
    expect(r.w.find('[role="toolbar"]').exists()).toBe(false)
    expect(r.editor().isEditable).toBe(false)
    expect(prose().getAttribute('aria-readonly')).toBe('true')
  })

  it('disabled 切換；errorText；ariaLabel；expose', async () => {
    const { w, editor, comp } = await mountEditor({ disabled: true, errorText: '請填寫', ariaLabel: '異常描述' })
    expect(editor().isEditable).toBe(false)
    expect(tool(w, 'bold').attributes('disabled')).toBeDefined()
    expect(w.find('[role="alert"]').text()).toBe('請填寫')
    expect(prose().getAttribute('aria-label')).toBe('異常描述')
    expect(prose().getAttribute('aria-invalid')).toBe('true')
    await w.setProps({})
    const vm = comp.vm as unknown as { getText: () => string; focus: () => void }
    expect(vm.getText()).toBe('Hello')
    vm.focus()
  })

  it('放在 ChptFormItem 裡：標籤、必填、驗證錯誤接到編輯區', async () => {
    const model = reactive({ desc: '' })
    const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
    wrapper = mount(
      {
        render: () =>
          h(ChptForm, { ref: formRef, model, rules: { desc: { required: true } } }, () =>
            h(ChptFormItem, { prop: 'desc', label: '異常描述' }, () =>
              h(ChptRichTextEditor, { modelValue: model.desc, 'onUpdate:modelValue': (v: string) => (model.desc = v) })
            )
          ),
      },
      { attachTo: document.body }
    )
    await flushPromises()
    const label = document.querySelector('.chpt-form-item label, .chpt-form-item span[id]')!
    expect(prose().getAttribute('aria-labelledby')).toBe(label.id)
    expect(prose().getAttribute('aria-required')).toBe('true')
    const r = await formRef.value!.validate()
    await flushPromises()
    expect(r.valid).toBe(false)
    expect(prose().getAttribute('aria-invalid')).toBe('true')
  })

  it('語系：enUS', async () => {
    wrapper = mount({ render: () => h(ChptConfigProvider, { locale: enUS }, () => h(ChptRichTextEditor, { modelValue: '', showCount: true })) }, { attachTo: document.body })
    await flushPromises()
    expect(wrapper.find('[data-tool="bold"]').attributes('aria-label')).toBe('Bold')
    expect(wrapper.text()).toContain('0 characters')
  })
})
