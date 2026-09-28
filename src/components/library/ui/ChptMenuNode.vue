<template>
  <li v-if="props.item.type === 'divider'" role="separator" class="mx-3 my-1 h-px bg-stroke-light"></li>

  <!-- 分組：標題 + 子項目（同一層，不縮排）；收合時標題改成一條分隔線 -->
  <li v-else-if="props.item.type === 'group'" class="flex flex-col">
    <div
      v-if="!hideLabel"
      :id="groupId"
      class="truncate px-3 pb-1 pt-3 text-xs font-medium text-content-tertiary"
      :class="props.level === 0 ? '' : 'px-3'"
    >{{ props.item.label }}</div>
    <div v-else class="mx-3 my-1 h-px bg-stroke-light" aria-hidden="true"></div>
    <ul class="flex flex-col gap-0.5" :aria-labelledby="hideLabel ? undefined : groupId" :aria-label="hideLabel ? props.item.label : undefined">
      <ChptMenuNode
        v-for="child in props.item.children ?? []"
        :key="child.key"
        :item="child"
        :level="props.level"
        :parent-key="props.parentKey"
      />
    </ul>
  </li>

  <li v-else class="relative" :class="topHorizontal ? 'flex' : inPanel ? 'px-1' : 'px-2'" @keydown.esc="onEscape">
    <!-- 有子選單：揭露按鈕（disclosure） -->
    <button
      v-if="hasChildren"
      ref="button"
      type="button"
      :disabled="props.item.disabled"
      :aria-expanded="open"
      :aria-controls="subId"
      :title="hideLabel ? props.item.label : undefined"
      :class="[rowClass, branchActive ? activeTextClass : '']"
      :style="rowStyle"
      @click="ctx.toggle(props.item, props.level, props.parentKey)"
    >
      <ChptIcon v-if="props.item.icon" :size="20" color="current" class="shrink-0">{{ props.item.icon }}</ChptIcon>
      <span :class="hideLabel ? 'sr-only' : 'min-w-0 flex-1 truncate text-left'">{{ props.item.label }}</span>
      <ChptIcon
        v-if="!hideLabel"
        :size="18"
        color="current"
        class="shrink-0 opacity-70 transition-transform"
        :class="chevronClass"
      >{{ chevronIcon }}</ChptIcon>
    </button>

    <!-- 葉節點：有網址用 <a>（可在新分頁開、可複製連結），否則是按鈕 -->
    <a
      v-else-if="href && !props.item.disabled"
      :href="href"
      :target="props.item.target"
      :rel="props.item.target === '_blank' ? 'noopener noreferrer' : undefined"
      :aria-current="active ? 'page' : undefined"
      :title="hideLabel ? props.item.label : undefined"
      :class="[rowClass, active ? activeRowClass : '']"
      :style="rowStyle"
      @click="ctx.select(props.item, $event)"
    >
      <ChptIcon v-if="props.item.icon" :size="20" color="current" class="shrink-0">{{ props.item.icon }}</ChptIcon>
      <span :class="hideLabel ? 'sr-only' : 'min-w-0 flex-1 truncate'">{{ props.item.label }}</span>
      <span v-if="props.item.badge !== undefined && !hideLabel" :class="badgeClass">{{ props.item.badge }}</span>
    </a>
    <button
      v-else
      type="button"
      :disabled="props.item.disabled"
      :aria-current="active ? 'page' : undefined"
      :title="hideLabel ? props.item.label : undefined"
      :class="[rowClass, active ? activeRowClass : '']"
      :style="rowStyle"
      @click="ctx.select(props.item, $event)"
    >
      <ChptIcon v-if="props.item.icon" :size="20" color="current" class="shrink-0">{{ props.item.icon }}</ChptIcon>
      <span :class="hideLabel ? 'sr-only' : 'min-w-0 flex-1 truncate text-left'">{{ props.item.label }}</span>
      <span v-if="props.item.badge !== undefined && !hideLabel" :class="badgeClass">{{ props.item.badge }}</span>
    </button>

    <!-- 子選單 -->
    <template v-if="hasChildren">
      <ul
        v-if="ctx.popup.value"
        v-show="open"
        :id="subId"
        class="absolute z-dropdown flex min-w-[12rem] flex-col gap-0.5 rounded-lg border border-stroke-light bg-surface-primary py-1 shadow-lg"
        :class="popupPlacement"
      >
        <ChptMenuNode
          v-for="child in props.item.children"
          :key="child.key"
          :item="child"
          :level="props.level + 1"
          :parent-key="props.item.key"
        />
      </ul>
      <ul v-else v-show="open" :id="subId" class="flex flex-col gap-0.5 pt-0.5">
        <ChptMenuNode
          v-for="child in props.item.children"
          :key="child.key"
          :item="child"
          :level="props.level + 1"
          :parent-key="props.item.key"
        />
      </ul>
    </template>
  </li>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, useTemplateRef } from 'vue'
import ChptIcon from './ChptIcon.vue'
import { MENU_KEY, type MenuContext, type MenuItem, type MenuKey } from './chptMenuContext'

/**
 * ChptMenuNode — ChptMenu 的內部元件（一個選單項目，遞迴畫出子選單）。不對外匯出。
 */

defineOptions({ name: 'ChptMenuNode' })

const props = defineProps<{
  item: MenuItem
  level: number
  parentKey: MenuKey | null
}>()

const ctx = inject(MENU_KEY) as MenuContext
const button = useTemplateRef<HTMLButtonElement>('button')

const hasChildren = computed(() => !!props.item.children?.length)
const open = computed(() => hasChildren.value && ctx.isOpen(props.item.key))
const active = computed(() => ctx.activeKey.value === props.item.key)
const branchActive = computed(() => ctx.activePath.value.has(props.item.key))
const href = computed(() => ctx.hrefOf(props.item))
const subId = computed(() => `${ctx.idOf(props.item.key)}-sub`)
const groupId = computed(() => `${ctx.idOf(props.item.key)}-group`)

const horizontal = computed(() => ctx.mode.value === 'horizontal')
const topHorizontal = computed(() => horizontal.value && props.level === 0)
/** 收合模式的頂層只剩圖示（文字留給螢幕閱讀器） */
const hideLabel = computed(() => ctx.collapsed.value && props.level === 0)
/** 在浮出面板裡的項目（水平模式第二層起、收合模式第二層起） */
const inPanel = computed(() => ctx.popup.value && props.level > 0)

const rowClass = computed(() => {
  const base =
    'flex items-center gap-2.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus disabled:cursor-not-allowed disabled:text-content-disabled'
  if (topHorizontal.value) {
    return `${base} h-full border-b-2 border-transparent px-3 text-content-secondary hover:text-content-primary disabled:hover:text-content-disabled`
  }
  // w-full：<button> 即使 display: flex 也會縮成內容寬，作用中的底色只蓋住文字、收合時圖示也不置中
  //（<a> 是區塊寬），兩種元素要一致就得明確撐滿；左右留白放在外層 <li>
  if (inPanel.value) {
    return `${base} w-full h-control-sm rounded-md px-3 text-content-primary hover:bg-surface-tertiary disabled:hover:bg-transparent`
  }
  return `${base} w-full h-control-md rounded-md text-content-secondary hover:bg-surface-tertiary hover:text-content-primary disabled:hover:bg-transparent ${
    hideLabel.value ? 'justify-center' : ''
  }`
})

/** 內嵌模式依層級縮排；收合 / 面板 / 水平頂層用固定內距 */
const rowStyle = computed(() => {
  if (topHorizontal.value || inPanel.value || hideLabel.value) return undefined
  return { paddingLeft: `${12 + props.level * ctx.indent.value}px`, paddingRight: '12px' }
})

const activeRowClass = computed(() =>
  topHorizontal.value
    ? '!border-accent font-medium !text-accent'
    : 'bg-accent-subtle font-medium !text-accent-on-subtle hover:!bg-accent-subtle'
)
/** 作用中項目的祖先：文字變色（子選單收起來時仍看得出「目前在這一支底下」） */
const activeTextClass = computed(() => (topHorizontal.value ? '!border-accent !text-accent' : '!text-accent'))

const badgeClass =
  'ml-auto inline-flex min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-danger-solid px-1.5 text-xs font-medium leading-5 text-white'

const chevronIcon = computed(() => (ctx.popup.value && !topHorizontal.value ? 'chevron_right' : 'expand_more'))
const chevronClass = computed(() => (!ctx.popup.value || topHorizontal.value) && open.value ? 'rotate-180' : '')

/** 浮出面板的位置：水平模式的頂層往下開；其餘往右開 */
const popupPlacement = computed(() => (topHorizontal.value ? 'left-0 top-full mt-1' : 'left-full top-0 ml-1'))

/** Escape：關掉「最內層」開著的浮出子選單，焦點回到它的按鈕 */
async function onEscape(event: KeyboardEvent): Promise<void> {
  if (!ctx.popup.value || !open.value) return
  event.stopPropagation()
  ctx.close(props.item.key)
  await nextTick()
  button.value?.focus()
}
</script>
