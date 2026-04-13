import { reactive, computed } from 'vue'

export interface MinimizedModalInfo {
  id: string
  title: string
  headerBgColor: string
  restore: () => void
  close: () => void
}

// 全域狀態 - 所有組件實例共用
const minimizedModals = reactive(new Map<string, MinimizedModalInfo>())

let _idCounter = 0

/** 產生唯一 Modal ID */
export function generateModalId(): string {
  return `modal-${++_idCounter}`
}

export function useModalManager() {
  const minimizedList = computed(() => Array.from(minimizedModals.values()))
  const minimizedCount = computed(() => minimizedModals.size)

  function registerMinimized(info: MinimizedModalInfo): void {
    minimizedModals.set(info.id, info)
  }

  function unregisterMinimized(id: string): void {
    minimizedModals.delete(id)
  }

  function restoreModal(id: string): void {
    const modal = minimizedModals.get(id)
    if (modal) {
      modal.restore()
    }
  }

  function closeModal(id: string): void {
    const modal = minimizedModals.get(id)
    if (modal) {
      modal.close()
    }
  }

  function restoreAll(): void {
    for (const modal of minimizedModals.values()) {
      modal.restore()
    }
  }

  function closeAll(): void {
    // 收集所有 modal 後再操作，避免迭代中修改 Map
    const modals = Array.from(minimizedModals.values())
    for (const modal of modals) {
      modal.close()
    }
  }

  return {
    minimizedList,
    minimizedCount,
    registerMinimized,
    unregisterMinimized,
    restoreModal,
    closeModal,
    restoreAll,
    closeAll,
  }
}
