<template>
  <div class="dark-mode-toggle-container">
    <!-- 控制選項 -->
    <div class="controls" v-if="showControls">
      <label for="sync-body">Sync &lt;body&gt;</label>
      <input id="sync-body" type="checkbox" v-model="syncWithBody" />
    </div>
    
    <!-- 切換按鈕 -->
    <button 
      class="toggle" 
      :aria-pressed="isDarkMode.toString()" 
      title="Toggle Dark Mode"
      @click="handleToggle"
    >
      <span class="toggle__content">
        <!-- 背景雲朵 SVG -->
        <svg aria-hidden="true" class="toggle__backdrop" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 290 228">
          <g class="clouds">
            <path fill="#D9D9D9" d="M335 147.5c0 27.89-22.61 50.5-50.5 50.5a50.78 50.78 0 0 1-9.29-.853c-2.478 12.606-10.595 23.188-21.615 29.011C245.699 243.749 228.03 256 207.5 256a50.433 50.433 0 0 1-16.034-2.599A41.811 41.811 0 0 1 166 262a41.798 41.798 0 0 1-22.893-6.782A42.21 42.21 0 0 1 135 256a41.82 41.82 0 0 1-19.115-4.592A41.84 41.84 0 0 1 88 262c-1.827 0-3.626-.117-5.391-.343C74.911 270.448 63.604 276 51 276c-23.196 0-42-18.804-42-42s18.804-42 42-42c1.827 0 3.626.117 5.391.343C64.089 183.552 75.396 178 88 178a41.819 41.819 0 0 1 19.115 4.592C114.532 176.002 124.298 172 135 172a41.798 41.798 0 0 1 22.893 6.782 42.066 42.066 0 0 1 7.239-.773C174.137 164.159 189.749 155 207.5 155c.601 0 1.199.01 1.794.031A41.813 41.813 0 0 1 234 147h.002c.269-27.66 22.774-50 50.498-50 27.89 0 50.5 22.61 50.5 50.5Z" />
          </g>
        </svg>
        
        <!-- 小熊飛行員 -->
        <span aria-hidden="true" class="pilot__container">
          <span class="pilot-bear">
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" viewBox="0 0 1448 938">
              <mask id="bear-mask" fill="#fff">
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
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

// Props
const props = defineProps({
  // 初始深色模式狀態
  initialDarkMode: {
    type: Boolean,
    default: false
  },
  // 是否顯示控制選項
  showControls: {
    type: Boolean,
    default: false
  },
  // 是否同步到 body 元素
  syncBodyByDefault: {
    type: Boolean,
    default: true
  }
})

// Emits
const emit = defineEmits(['update:darkMode', 'toggle'])

// 響應式狀態
const isDarkMode = ref(props.initialDarkMode)
const syncWithBody = ref(props.syncBodyByDefault)

// 計算屬性
const darkModeClass = computed(() => isDarkMode.value ? 'dark-mode' : 'light-mode')

// 切換處理函數
const handleToggle = () => {
  isDarkMode.value = !isDarkMode.value
  
  // 同步到 body 元素
  if (syncWithBody.value) {
    document.body.setAttribute('data-dark-mode', isDarkMode.value.toString())
    
    // 也可以添加 class 方式
    if (isDarkMode.value) {
      document.body.classList.add('dark-mode')
      document.body.classList.remove('light-mode')
    } else {
      document.body.classList.add('light-mode')
      document.body.classList.remove('dark-mode')
    }
  }
  
  // 發出事件
  emit('update:darkMode', isDarkMode.value)
  emit('toggle', isDarkMode.value)
  
  console.log('🌙 Dark Mode Toggled:', isDarkMode.value)
}

// 監聽外部變化
watch(() => props.initialDarkMode, (newValue) => {
  isDarkMode.value = newValue
})

// 組件聯載時設置初始狀態
onMounted(() => {
  if (syncWithBody.value) {
    document.body.setAttribute('data-dark-mode', isDarkMode.value.toString())
    document.body.classList.add(darkModeClass.value)
  }
})

// 暴露方法
defineExpose({
  toggle: handleToggle,
  isDarkMode: computed(() => isDarkMode.value)
})
</script>

<style scoped>
/* CSS 變數定義 */
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
}

/* 容器樣式 */
.dark-mode-toggle-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  z-index: 10;
}

/* 控制面板樣式 */
.controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color);
}

.controls label {
  cursor: pointer;
}

.controls input {
  cursor: pointer;
}

/* 切換按鈕基礎樣式 */
.toggle {
  border: 2px solid rgba(0,0,0,0.1);
  background: linear-gradient(135deg, var(--bg), hsl(219, 30%, 95%));
  padding: 0;
  cursor: pointer;
  width: var(--width);
  aspect-ratio: var(--ar);
  position: relative;
  border-radius: calc(var(--width) / 10);
  overflow: hidden;
  transition: all var(--speed) var(--easing);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.toggle:focus-visible {
  outline: 2px solid #4f46e5;
  outline-offset: 2px;
}

/* 切換內容 */
.toggle__content {
  display: block;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

/* 背景 SVG */
.toggle__backdrop {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  transition: all var(--speed) var(--easing);
}

/* 雲朵動畫 */
.clouds {
  transition: all var(--speed) var(--easing);
  transform-origin: center;
}

.toggle[aria-pressed="true"] .clouds {
  transform: translateX(-100%) scale(0.8);
  opacity: 0.3;
}

/* 飛行員容器 */
.pilot__container {
  position: absolute;
  top: 50%;
  left: 15%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  z-index: 2;
  transition: all var(--speed) var(--easing);
}

.toggle[aria-pressed="true"] .pilot__container {
  left: 65%;
  transform: translateY(-50%) translateX(-50%);
}

/* 飛行員小熊 */
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

/* 深色模式時的動畫 */
.toggle[aria-pressed="true"] .pilot-bear svg {
  transform: rotate(15deg) scale(1.1);
}

/* 按鈕背景色變化 */
.toggle[aria-pressed="true"] {
  background: linear-gradient(135deg, hsl(219, 30%, 20%), hsl(219, 30%, 10%));
  border-color: rgba(255,255,255,0.2);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .dark-mode-toggle-container {
    --width: clamp(100px, 25vw, 150px);
  }
  
  .pilot__container {
    width: 30px;
    height: 30px;
  }
}

/* 動畫增強 */
.toggle:hover .pilot__container {
  animation: bounce 0.6s ease-in-out;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(-50%);
  }
  50% {
    transform: translateY(-60%);
  }
}

/* 深色模式變數覆蓋 */
.toggle[aria-pressed="true"] {
  --bg: hsl(219, 30%, 15%);
  --color: hsl(219 30% 80%);
}
</style>