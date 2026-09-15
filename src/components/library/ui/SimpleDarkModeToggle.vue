<template>
  <ChptDarkModeToggle
    variant="simple"
    :initial-dark-mode="props.initialDarkMode"
    :show-controls="props.showControls"
    @update:dark-mode="emit('update:darkMode', $event)"
    @toggle="emit('toggle', $event)"
  />
</template>

<script setup>
import ChptDarkModeToggle from './ChptDarkModeToggle.vue'
import { warnDeprecated } from '@/components/library/shared/warnDeprecated'

/**
 * SimpleDarkModeToggle（@deprecated）—— 請改用 <ChptDarkModeToggle variant="simple" />
 *
 * 狀態早已統一由 useDarkMode() 管理，此檔改為薄包裝。
 * syncBodyByDefault 已無作用（主題一律同步到 <html> 與 <body>），保留只為不破壞呼叫端。
 */
const props = defineProps({
  initialDarkMode: { type: Boolean, default: false },
  showControls: { type: Boolean, default: false },
  /** @deprecated 已無作用 */
  syncBodyByDefault: { type: Boolean, default: true },
})

const emit = defineEmits(['update:darkMode', 'toggle'])

warnDeprecated('SimpleDarkModeToggle', 'ChptDarkModeToggle（variant="simple"）')
</script>
