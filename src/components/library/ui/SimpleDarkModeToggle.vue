<template>
  <ChptDarkModeToggle
    variant="simple"
    :initial-dark-mode="props.initialDarkMode"
    :show-controls="props.showControls"
    @update:dark-mode="emit('update:darkMode', $event)"
    @toggle="emit('toggle', $event)"
  />
</template>

<script setup lang="ts">
import ChptDarkModeToggle from './ChptDarkModeToggle.vue'
import { warnDeprecated } from '@/components/library/shared/warnDeprecated'

/**
 * SimpleDarkModeToggle（@deprecated）—— 請改用 <ChptDarkModeToggle variant="simple" />
 *
 * 狀態早已統一由 useDarkMode() 管理，此檔改為薄包裝。
 */
interface SimpleDarkModeToggleProps {
  initialDarkMode?: boolean
  showControls?: boolean
  /**
   * @deprecated 已無作用。
   * 主題一律同步到 <html> 與 <body>，保留這個 prop 只為不破壞既有呼叫端。
   */
  syncBodyByDefault?: boolean
}

const props = withDefaults(defineProps<SimpleDarkModeToggleProps>(), {
  initialDarkMode: false,
  showControls: false,
  syncBodyByDefault: true,
})

const emit = defineEmits<{
  'update:darkMode': [isDark: boolean]
  toggle: [isDark: boolean]
}>()

warnDeprecated('SimpleDarkModeToggle', 'ChptDarkModeToggle（variant="simple"）')
</script>
