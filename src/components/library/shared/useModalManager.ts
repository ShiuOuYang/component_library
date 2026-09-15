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

// z-index 自動管理 - 點擊的視窗自動提升到最上層
const BASE_Z_INDEX = 100
let _topZIndex = BASE_Z_INDEX
const zIndexMap = reactive(new Map<string, number>())

let _idCounter = 0

/** 產生唯一 Modal ID */
export function generateModalId(): string {
  return `modal-${++_idCounter}`
}

export function useModalManager() {
  const minimizedList = computed(() => Array.from(minimizedModals.values()))
  const minimizedCount = computed(() => minimizedModals.size)

  /** 取得指定 Modal 的 z-index（響應式） */
  function getZIndex(id: string): number {
    return zIndexMap.get(id) ?? BASE_Z_INDEX
  }

  /** 將指定 Modal 提升到最上層 */
  function bringToFront(id: string): void {
    const current = zIndexMap.get(id)
    // 已經是最上層則跳過
    if (current === _topZIndex) return
    _topZIndex++
    zIndexMap.set(id, _topZIndex)
  }

  /** 註冊 Modal 的 z-index（首次打開時呼叫） */
  function registerZIndex(id: string): void {
    if (!zIndexMap.has(id)) {
      _topZIndex++
      zIndexMap.set(id, _topZIndex)
    }
  }

  /** 移除 Modal 的 z-index 記錄 */
  function unregisterZIndex(id: string): void {
    zIndexMap.delete(id)
  }

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
    // z-index 管理
    getZIndex,
    bringToFront,
    registerZIndex,
    unregisterZIndex,
  }
}
