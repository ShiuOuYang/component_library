<template>
  <nav
    ref="root"
    :aria-label="props.ariaLabel"
    class="chpt-menu bg-surface-primary"
    :class="
      horizontal
        ? 'h-12 border-b border-stroke-light'
        : [
            'flex flex-col transition-[width] duration-200',
            // 收合時子選單往右浮出，不能被自己的 overflow 裁掉
            props.collapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden',
            props.width ? '' : props.collapsed ? 'w-16' : 'w-60',
          ]
    "
    :style="!horizontal && props.width && !props.collapsed ? { width: props.width } : undefined"
    @focusout="onFocusOut"
  >
    <ul class="flex" :class="horizontal ? 'h-full flex-row items-stretch gap-1 px-2' : 'flex-col gap-0.5 py-2'">
      <ChptMenuNode v-for="item in props.items" :key="item.key" :item="item" :level="0" :parent-key="null" />
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { computed, provide, ref, useId, useTemplateRef, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import ChptMenuNode from './ChptMenuNode.vue'
import { MENU_KEY, type MenuItem, type MenuKey } from './chptMenuContext'
import { useOptionalRouter } from '@/components/library/shared/useOptionalRouter'

/**
 * ChptMenu（CHPT 主題） - 導覽選單
 *
 * 側欄（vertical，可收合成只剩圖示）或頂部列（horizontal）的網站導覽。
 * 一組「動作」請用 ChptDropdown；頁內分頁請用 ChptTabs。
 *
 * 無障礙：照 WAI-ARIA 的 disclosure navigation，**不是** role="menu"。
 *   role="menu" 是給應用程式選單（像桌面軟體的「檔案 ▸」）用的，會讓螢幕閱讀器進入
 *   另一套操作模式、而且 Tab 只能停一次；網站導覽用一般的清單 + 連結才是對的：
 *   - <nav aria-label> 包住整個選單；作用中的頁面帶 aria-current="page"
 *   - 有子選單的項目是 <button aria-expanded aria-controls>，Enter / Space 展開
 *   - 有網址的項目是真正的 <a href>：可以中鍵開新分頁、複製連結
 *   - 浮出子選單（水平 / 收合模式）：Escape 關閉並把焦點還給按鈕；焦點離開或點外面也會關
 *   - 收合模式的文字仍保留給螢幕閱讀器（sr-only），滑鼠停留時以 title 顯示
 *
 * 作用中的項目：有 v-model 時用它；沒有時依目前路由自動比對 item.to（取最長的前綴）。
 */

export type { MenuItem } from './chptMenuContext'

interface ChptMenuProps {
  items: MenuItem[]
  /** v-model：作用中的項目 key（不綁時依路由自動判斷） */
  modelValue?: MenuKey | null
  /** v-model:openKeys：內嵌模式展開中的子選單 */
  openKeys?: MenuKey[]
  mode?: 'vertical' | 'horizontal'
  /** 側欄收合成只剩圖示（vertical 才有效） */
  collapsed?: boolean
  /** 同一層只允許展開一個子選單 */
  accordion?: boolean
  /** 內嵌模式每一層的縮排（px） */
  indent?: number
  /** 側欄寬度（CSS 值，預設 15rem；收合時固定 4rem） */
  width?: string
  /** 導覽區的名稱（同一頁有多個 <nav> 時要能區分） */
  ariaLabel?: string
}

const props = withDefaults(defineProps<ChptMenuProps>(), {
  modelValue: undefined,
  openKeys: undefined,
  mode: 'vertical',
  collapsed: false,
  accordion: false,
  indent: 16,
  width: '',
  ariaLabel: '主選單',
})

const emit = defineEmits<{
  (e: 'update:modelValue', key: MenuKey): void
  (e: 'update:openKeys', keys: MenuKey[]): void
  (e: 'select', item: MenuItem): void
}>()

const { router, currentPath } = useOptionalRouter()
const uid = useId()
const root = useTemplateRef<HTMLElement>('root')

const horizontal = computed(() => props.mode === 'horizontal')
const collapsed = computed(() => !horizontal.value && props.collapsed)
const popup = computed(() => horizontal.value || collapsed.value)

// ---- 結構索引 ----

/** 每個項目的父項目（group 是透明的：group 底下的項目，父項目是 group 的父項目） */
const parentOf = computed(() => {
  const map = new Map<MenuKey, MenuKey | null>()
  const walk = (list: MenuItem[], parent: MenuKey | null) => {
    for (const item of list) {
      if (item.type === 'group') {
        walk(item.children ?? [], parent)
        continue
      }
      map.set(item.key, parent)
      if (item.children?.length) walk(item.children, item.key)
    }
  }
  walk(props.items, null)
  return map
})

const leaves = computed(() => {
  const out: MenuItem[] = []
  const walk = (list: MenuItem[]) => {
    for (const item of list) {
      if (item.children?.length) walk(item.children)
      else if (item.type !== 'divider' && item.type !== 'group') out.push(item)
    }
  }
  walk(props.items)
  return out
})

function ancestorsOf(key: MenuKey | null): MenuKey[] {
  const out: MenuKey[] = []
  let cur = key === null ? null : parentOf.value.get(key) ?? null
  while (cur !== null && cur !== undefined) {
    out.unshift(cur)
    cur = parentOf.value.get(cur) ?? null
  }
  return out
}

// ---- 作用中項目 ----

/** 依路由比對：完全相同，或是 to 的子路徑（/orders/123 屬於 /orders），取最長的 */
const routeKey = computed<MenuKey | null>(() => {
  const path = currentPath.value
  if (!path) return null
  let best: MenuItem | null = null
  for (const item of leaves.value) {
    if (!item.to) continue
    const to = item.to.replace(/\/$/, '') || '/'
    const hit = path === to || (to !== '/' && path.startsWith(`${to}/`))
    if (hit && (!best || to.length > (best.to as string).length)) best = item
  }
  return best?.key ?? null
})

const activeKey = computed<MenuKey | null>(() => (props.modelValue !== undefined ? props.modelValue : routeKey.value))
const activePath = computed(() => new Set(ancestorsOf(activeKey.value)))

// ---- 展開狀態 ----

const innerOpen = ref<MenuKey[]>([])
const openKeys = computed(() => props.openKeys ?? innerOpen.value)
/** 浮出模式：目前開著的子選單鏈（一次只開一條） */
const popupPath = ref<MenuKey[]>([])

function setOpenKeys(keys: MenuKey[]): void {
  innerOpen.value = keys
  emit('update:openKeys', keys)
}

// 內嵌模式：作用中的項目在收起來的子選單裡時，自動展開它的祖先
watch(
  [activeKey, popup],
  () => {
    if (popup.value) return
    const missing = ancestorsOf(activeKey.value).filter((k) => !openKeys.value.includes(k))
    if (missing.length) setOpenKeys([...openKeys.value, ...missing])
  },
  { immediate: true }
)

// 切換模式（收合 / 展開側欄）時關掉浮出的子選單
watch(popup, () => (popupPath.value = []))

function isOpen(key: MenuKey): boolean {
  return popup.value ? popupPath.value.includes(key) : openKeys.value.includes(key)
}

function toggle(item: MenuItem, level: number, parentKey: MenuKey | null): void {
  if (item.disabled) return
  if (popup.value) {
    const path = popupPath.value.slice(0, level)
    popupPath.value = popupPath.value[level] === item.key ? path : [...path, item.key]
    return
  }
  if (openKeys.value.includes(item.key)) {
    // 收起時連同它底下展開的子選單一起收
    setOpenKeys(openKeys.value.filter((k) => k !== item.key && !ancestorsOf(k).includes(item.key)))
    return
  }
  const kept = props.accordion ? openKeys.value.filter((k) => parentOf.value.get(k) !== parentKey) : openKeys.value
  setOpenKeys([...kept, item.key])
}

function close(key: MenuKey): void {
  if (popup.value) {
    const at = popupPath.value.indexOf(key)
    if (at !== -1) popupPath.value = popupPath.value.slice(0, at)
  } else {
    setOpenKeys(openKeys.value.filter((k) => k !== key))
  }
}

function hrefOf(item: MenuItem): string | undefined {
  if (item.href) return item.href
  if (!item.to) return undefined
  return router ? router.resolve(item.to).href : item.to
}

function select(item: MenuItem, event: MouseEvent): void {
  if (item.disabled) return
  // 有 router 且是站內路徑：交給 router（按住 Ctrl / ⌘ / 中鍵開新分頁時照瀏覽器預設）
  const newTab = event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1
  if (item.to && router && !item.href && !newTab && item.target !== '_blank') {
    event.preventDefault()
    router.push(item.to)
  }
  popupPath.value = []
  emit('update:modelValue', item.key)
  emit('select', item)
}

function onFocusOut(event: FocusEvent): void {
  if (!popup.value || !popupPath.value.length) return
  const next = event.relatedTarget as Node | null
  if (next && !root.value?.contains(next)) popupPath.value = []
}

onClickOutside(root, () => {
  if (popupPath.value.length) popupPath.value = []
})

provide(MENU_KEY, {
  activeKey,
  activePath,
  popup,
  mode: computed(() => props.mode),
  collapsed,
  indent: computed(() => props.indent),
  isOpen,
  toggle,
  close,
  select,
  hrefOf,
  idOf: (key) => `${uid}-${String(key).replace(/[^\w-]/g, '_')}`,
})

defineExpose({
  /** 展開某個子選單（內嵌模式） */
  open: (key: MenuKey) => {
    if (!popup.value && !openKeys.value.includes(key)) setOpenKeys([...openKeys.value, ...ancestorsOf(key), key].filter((k, i, a) => a.indexOf(k) === i))
  },
  close,
  closeAll: () => {
    popupPath.value = []
    if (!popup.value) setOpenKeys([])
  },
})
</script>
