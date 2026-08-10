<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="minimizedCount > 0"
        class="fixed bottom-4 right-4 flex flex-col items-end gap-2"
        :style="{ zIndex: props.zIndex }"
      >
        <!-- 展開的縮小視窗列表 -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 translate-y-2 scale-95"
          enter-to-class="opacity-100 translate-y-0 scale-100"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 translate-y-0 scale-100"
          leave-to-class="opacity-0 translate-y-2 scale-95"
        >
          <div
            v-show="isExpanded"
            class="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto overflow-x-hidden scrollbar-thin pr-1"
          >
            <TransitionGroup
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="opacity-0 translate-x-4"
              enter-to-class="opacity-100 translate-x-0"
              leave-active-class="transition-all duration-150 ease-in absolute"
              leave-from-class="opacity-100 translate-x-0"
              leave-to-class="opacity-0 translate-x-4"
              move-class="transition-all duration-200"
            >
              <div
                v-for="modal in minimizedList"
                :key="modal.id"
                class="group flex items-center bg-white/95 backdrop-blur-sm rounded-lg shadow-md border border-gray-200/80
                       overflow-hidden hover:shadow-lg hover:border-gray-300
                       transition-all duration-200 cursor-pointer
                       min-w-[220px] max-w-[300px]"
                @click="handleRestore(modal.id)"
              >
                <!-- 色彩指示條 -->
                <div
                  class="w-1.5 self-stretch bg-gradient-to-b shrink-0"
                  :class="modal.headerBgColor"
                ></div>

                <!-- 標題 -->
                <div class="flex-1 px-3 py-2.5 truncate text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                  {{ modal.title }}
                </div>

                <!-- 操作按鈕 -->
                <div class="flex items-center gap-0.5 pr-2 shrink-0">
                  <button
                    @click.stop="handleRestore(modal.id)"
                    class="w-6 h-6 flex items-center justify-center rounded-md
                           hover:bg-blue-50 transition-colors text-gray-400 hover:text-blue-500"
                    title="還原視窗"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <rect x="4" y="4" width="16" height="16" rx="2"/>
                    </svg>
                  </button>
                  <button
                    @click.stop="handleClose(modal.id)"
                    class="w-6 h-6 flex items-center justify-center rounded-md
                           hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500"
                    title="關閉視窗"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/>
                    </svg>
                  </button>
                </div>
              </div>
            </TransitionGroup>
          </div>
        </Transition>

        <!-- 口袋按鈕 -->
        <button
          @click="isExpanded = !isExpanded"
          class="group flex items-center gap-2 px-3.5 py-2 bg-white/95 backdrop-blur-sm
                 rounded-full shadow-lg border border-gray-200/80
                 hover:shadow-xl hover:border-gray-300 active:scale-95
                 transition-all duration-200"
        >
          <svg
            class="w-4 h-4 text-gray-500 group-hover:text-blue-500 transition-colors"
            fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          <span class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5
                       text-xs font-semibold text-white bg-blue-500 rounded-full
                       group-hover:bg-blue-600 transition-colors">
            {{ minimizedCount }}
          </span>
          <svg
            class="w-3 h-3 text-gray-400 transition-transform duration-200"
            :class="isExpanded ? 'rotate-180' : ''"
            fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/>
          </svg>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useModalManager } from '@/composables/useModalManager'

/**
 * ChptModalDock（CHPT 主題） - 視窗口袋列
 *
 * 整合原 ModalDock：顯示被最小化的 window 模式視窗。
 * 設計模式：
 * - 完整 Props 型別定義（interface + withDefaults）
 * - 一致性寫法（interface + withDefaults）
 */

interface ChptModalDockProps {
  /** z-index 層級 */
  zIndex?: number
}

const props = withDefaults(defineProps<ChptModalDockProps>(), {
  zIndex: 9999,
})

const { minimizedList, minimizedCount, restoreModal, closeModal } = useModalManager()

const isExpanded = ref(true)

function handleRestore(id: string): void {
  restoreModal(id)
}

function handleClose(id: string): void {
  closeModal(id)
}
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
