<template>
  <div class="flex flex-col items-center gap-2" :class="{ 'relative z-10': variant === 'fancy' }">
    <!-- 控制選項 -->
    <div v-if="showControls" class="controls mb-2">
      <label class="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
        <input
          type="checkbox"
          :checked="mode === 'system'"
          class="cursor-pointer"
          @change="handleFollowSystem(($event.target as HTMLInputElement).checked)"
        />
        {{ followSystemLabel }}
      </label>
    </div>

    <!-- Fancy 模式：華麗 SVG 動畫切換 -->
    <template v-if="variant === 'fancy'">
      <button
        class="fancy-toggle dark-mode-toggle-container"
        type="button"
        :aria-pressed="isDarkMode"
        :aria-label="toggleLabel"
        :title="toggleLabel"
        @click="handleToggle"
      >
        <span class="toggle__content">
          <svg aria-hidden="true" class="toggle__backdrop" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 290 228">
            <g class="clouds">
              <path fill="#D9D9D9" d="M335 147.5c0 27.89-22.61 50.5-50.5 50.5a50.78 50.78 0 0 1-9.29-.853c-2.478 12.606-10.595 23.188-21.615 29.011C245.699 243.749 228.03 256 207.5 256a50.433 50.433 0 0 1-16.034-2.599A41.811 41.811 0 0 1 166 262a41.798 41.798 0 0 1-22.893-6.782A42.21 42.21 0 0 1 135 256a41.82 41.82 0 0 1-19.115-4.592A41.84 41.84 0 0 1 88 262c-1.827 0-3.626-.117-5.391-.343C74.911 270.448 63.604 276 51 276c-23.196 0-42-18.804-42-42s18.804-42 42-42c1.827 0 3.626.117 5.391.343C64.089 183.552 75.396 178 88 178a41.819 41.819 0 0 1 19.115 4.592C114.532 176.002 124.298 172 135 172a41.798 41.798 0 0 1 22.893 6.782 42.066 42.066 0 0 1 7.239-.773C174.137 164.159 189.749 155 207.5 155c.601 0 1.199.01 1.794.031A41.813 41.813 0 0 1 234 147h.002c.269-27.66 22.774-50 50.498-50 27.89 0 50.5 22.61 50.5 50.5Z" />
            </g>
          </svg>
          <span aria-hidden="true" class="pilot__container">
            <span class="pilot-bear">
              <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" viewBox="0 0 1448 938">
                <mask id="chpt-bear-mask" fill="#fff">
                  <path fill-rule="evenodd" d="M869.02 210.61c16.067-3.967 27.98-18.476 27.98-35.768C897 154.495 880.505 138 860.158 138c-14.337 0-26.761 8.19-32.85 20.146C815.313 151.674 801.586 148 787 148h-20c-14.52 0-28.19 3.641-40.146 10.059C720.749 146.15 708.351 138 694.048 138c-20.347 0-36.842 16.495-36.842 36.842 0 17.222 11.818 31.685 27.787 35.72A85.104 85.104 0 0 0 682 233v225c0 12.15 9.85 22 22 22h44c12.15 0 22-9.85 22-22v-28.69a41.072 41.072 0 0 0 14 .174V458c0 12.15 9.85 22 22 22h44c12.15 0 22-9.85 22-22v-74.797a28.992 28.992 0 0 0 6.946-5.137l44.548-44.548c11.325-11.325 11.325-29.687 0-41.012s-29.687-11.325-41.012 0L872 302.988V233a85.094 85.094 0 0 0-2.98-22.39Z" clip-rule="evenodd"/>
                </mask>
                <path fill="#AF7128" fill-rule="evenodd" d="M869.02 210.61c16.067-3.967 27.98-18.476 27.98-35.768C897 154.495 880.505 138 860.158 138c-14.337 0-26.761 8.19-32.85 20.146C815.313 151.674 801.586 148 787 148h-20c-14.52 0-28.19 3.641-40.146 10.059C720.749 146.15 708.351 138 694.048 138c-20.347 0-36.842 16.495-36.842 36.842 0 17.222 11.818 31.685 27.787 35.72A85.104 85.104 0 0 0 682 233v225c0 12.15 9.85 22 22 22h44c12.15 0 22-9.85 22-22v-28.69a41.072 41.072 0 0 0 14 .174V458c0 12.15 9.85 22 22 22h44c12.15 0 22-9.85 22-22v-74.797a28.992 28.992 0 0 0 6.946-5.137l44.548-44.548c11.325-11.325 11.325-29.687 0-41.012s-29.687-11.325-41.012 0L872 302.988V233a85.094 85.094 0 0 0-2.98-22.39Z" clip-rule="evenodd"/>
                <path fill="#FF1E1E" d="M821.678 205.665h-88.371v13.25h88.371z"/>
                <path fill="#000" fill-rule="evenodd" d="M709.7 164.481c-17.939 14.394-28.018 37.148-28.018 57.504h61.648c.087-13.669 11.194-24.723 24.883-24.723h18.56c13.689 0 24.796 11.054 24.883 24.723H873c0-20.356-10.078-43.11-28.018-57.504C827.043 150.086 802.711 142 777.341 142c-25.37 0-49.701 8.086-67.641 22.481Z" clip-rule="evenodd"/>
                <circle cx="8.079" cy="8.079" r="8.079" fill="#000" transform="matrix(-1 0 0 1 730.414 240)"/>
                <circle cx="8.079" cy="8.079" r="8.079" fill="#000" transform="matrix(-1 0 0 1 839 240)"/>
                <path fill="#000" d="M755.835 262.683c0 8.21 9.868 17.451 20.845 17.451 10.977 0 20.845-9.241 20.845-17.451s-9.868-12.281-20.845-12.281c-10.977 0-20.845 4.071-20.845 12.281Z"/>
                <path stroke="#000" stroke-linecap="round" stroke-width="6" d="M738 464v12m-24-12v12m127-12v12m-24-12v12"/>
                <path fill="#707070" stroke="#000" stroke-width="6" d="M687 370v16h183v-16zm0-54v16h183v-16z"/>
              </svg>
            </span>
          </span>
        </span>
      </button>
    </template>

    <!-- Simple 模式：簡單亮/暗按鈕 -->
    <button
      v-else
      type="button"
      :aria-pressed="isDarkMode"
      :aria-label="toggleLabel"
      @click="handleToggle"
      :class="[
        'px-4 py-2 rounded-lg border transition-all duration-300 font-medium min-w-[100px] cursor-pointer',
        isDarkMode ? 'bg-neutral-700 border-neutral-600 text-neutral-50' : 'bg-neutral-100 border-neutral-300 text-neutral-700'
      ]"
    >
      {{ isDarkMode ? '🌙 Dark' : '☀️ Light' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useDarkMode, type ChptThemeMode } from '@/components/library/shared/useDarkMode'

/**
 * ChptDarkModeToggle（CHPT 主題） - 深色模式切換元件
 *
 * 整合原 DarkModeToggle 與 SimpleDarkModeToggle，以 variant 切換外觀：
 * - variant="fancy"：華麗 SVG 動畫切換（小熊飛行員）
 * - variant="simple"：簡單亮/暗按鈕
 *
 * 狀態一律委派給 useDarkMode()（module-scoped 全域單例），因此：
 * - 頁面上放幾顆切換鈕都會同步
 * - 切換會真正掛上 <html class="dark">，Tailwind 的 dark: 與 token 變數才會生效
 * - 使用者選擇會存進 localStorage，重新整理後保留
 */

type ChptDarkModeVariant = 'fancy' | 'simple'

interface ChptDarkModeProps {
  /** 外觀模式 */
  variant?: ChptDarkModeVariant
  /** 初始深色模式狀態；僅在使用者尚未做過選擇（仍為 system）時套用 */
  initialDarkMode?: boolean
  /** 是否顯示「跟隨系統」控制選項 */
  showControls?: boolean
  /**
   * @deprecated 已無作用。主題現在一律同步到 <html> 與 <body>，
   * 由 useDarkMode() 統一處理，保留此 prop 只為不破壞既有呼叫端。
   */
  syncBodyByDefault?: boolean
  /** 受控模式：由外部指定深色與否（v-model:darkMode） */
  darkMode?: boolean
}

const props = withDefaults(defineProps<ChptDarkModeProps>(), {
  variant: 'fancy',
  initialDarkMode: false,
  showControls: false,
  syncBodyByDefault: true,
  darkMode: undefined,
})

const emit = defineEmits<{
  (e: 'update:darkMode', value: boolean): void
  (e: 'toggle', value: boolean): void
}>()

const { isDark, mode, setMode, toggle } = useDarkMode()

/** 對外維持原本的 isDarkMode 名稱 */
const isDarkMode = computed(() => isDark.value)

const toggleLabel = computed(() => (isDark.value ? '切換為淺色模式' : '切換為深色模式'))
const followSystemLabel = '跟隨系統'

/** 受控模式：外部傳入 darkMode 時以它為準 */
watch(
  () => props.darkMode,
  (value) => {
    if (value !== undefined && value !== isDark.value) setMode(value ? 'dark' : 'light')
  },
  { immediate: true }
)

/** 非受控時，initialDarkMode 只在使用者還沒做過選擇（仍為 system）時生效 */
onMounted(() => {
  if (props.darkMode === undefined && props.initialDarkMode && mode.value === 'system') {
    setMode('dark')
  }
})

function handleToggle(): void {
  toggle()
  emit('update:darkMode', isDark.value)
  emit('toggle', isDark.value)
}

function handleFollowSystem(followSystem: boolean): void {
  const next: ChptThemeMode = followSystem ? 'system' : isDark.value ? 'dark' : 'light'
  setMode(next)
  emit('update:darkMode', isDark.value)
}

defineExpose({
  toggle: handleToggle,
  isDarkMode,
})
</script>

<style scoped>
.dark-mode-toggle-container {
  --slide-ease: cubic-bezier(.4,-0.3,.6,1.3);
  --easing: var(--slide-ease);
  --speed: 0.5s;
  --width: clamp(120px, 30vmin, 200px);
  --ar: 8 / 3;
  --ray: hsl(0 0% 100% / 0.5);
  --sun: hsl(47, 91%, 58%);
  --moon: hsl(212, 13%, 82%);
  --crater: hsl(221, 16%, 68%);
  --bg: hsl(219, 30%, 88%);
  --bear-speed: 10s;
  --color: hsl(219 30% 20%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  z-index: 10;
  border: 2px solid rgba(0,0,0,0.1);
  background: linear-gradient(135deg, var(--bg), hsl(219, 30%, 95%));
  padding: 0;
  cursor: pointer;
  width: var(--width);
  aspect-ratio: var(--ar);
  border-radius: calc(var(--width) / 10);
  overflow: hidden;
  transition: all var(--speed) var(--easing);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.dark-mode-toggle-container:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.dark-mode-toggle-container .toggle__content {
  display: block;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.dark-mode-toggle-container .toggle__backdrop {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  transition: all var(--speed) var(--easing);
}

.dark-mode-toggle-container .clouds {
  transition: all var(--speed) var(--easing);
  transform-origin: center;
}

.dark-mode-toggle-container[aria-pressed="true"] .clouds {
  transform: translateX(-100%) scale(0.8);
  opacity: 0.3;
}

.dark-mode-toggle-container .pilot__container {
  position: absolute;
  top: 50%;
  left: 15%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  z-index: 2;
  transition: all var(--speed) var(--easing);
}

.dark-mode-toggle-container[aria-pressed="true"] .pilot__container {
  left: 65%;
  transform: translateY(-50%) translateX(-50%);
}

.pilot-bear {
  display: block;
  width: 100%;
  height: 100%;
  position: relative;
}

.pilot-bear svg {
  width: 100%;
  height: 100%;
  transition: all var(--speed) var(--easing);
}

.dark-mode-toggle-container[aria-pressed="true"] .pilot-bear svg {
  transform: rotate(15deg) scale(1.1);
}

.dark-mode-toggle-container[aria-pressed="true"] {
  background: linear-gradient(135deg, hsl(219, 30%, 20%), hsl(219, 30%, 10%));
  border-color: rgba(255,255,255,0.2);
  --bg: hsl(219, 30%, 15%);
  --color: hsl(219 30% 80%);
}

@media (max-width: 768px) {
  .dark-mode-toggle-container {
    --width: clamp(100px, 25vw, 150px);
  }
  .pilot__container {
    width: 30px;
    height: 30px;
  }
}

.dark-mode-toggle-container:hover .pilot__container {
  animation: chpt-bounce 0.6s ease-in-out;
}

@keyframes chpt-bounce {
  0%, 100% {
    transform: translateY(-50%);
  }
  50% {
    transform: translateY(-60%);
  }
}
</style>
