#!/usr/bin/env node
/**
 * Legacy 相容層厚度檢查
 *
 * legacy 元件全部已收斂為「只轉發 props / emits / slots」的薄包裝。
 * 這支腳本確保它們不會又長回成第二份實作 —— 那正是收斂前的狀況：
 * FilterBar / CommonTooltip / DraggableModal 等各自維護一份邏輯，
 * 修 bug 要記得修兩邊，而且 legacy 版還寫死色碼不走設計令牌。
 *
 * 判準：
 *   1. 行數不得超過 MAX_LINES
 *   2. 必須 import 至少一個 canonical（Chpt*）元件
 */
import { readFile } from 'node:fs/promises'

const MAX_LINES = 180

/** legacy 檔名 → 預期轉發到的 canonical 元件 */
const LEGACY = {
  'CodeBlock.vue': 'ChptCodeBlock',
  'CommonTable.vue': 'ChptTable',
  'CommonTooltip.vue': 'ChptDataTooltip',
  'DraggableModal.vue': 'ChptModal',
  'FilterBar.vue': 'ChptFilterBar',
  'FilterDropdown.vue': 'ChptFilter',
  'FilterSelect.vue': 'ChptFilter',
  'HeaderLogoutButton.vue': 'ChptHeaderLogoutButton',
  'ModalDock.vue': 'ChptModalDock',
  'PageSwitcher.vue': 'ChptPageSwitcher',
  'Pagination.vue': 'ChptPagination',
  'PaginationControls.vue': 'ChptPagination',
  'SimpleDarkModeToggle.vue': 'ChptDarkModeToggle',
  'TabNavigation.vue': 'ChptTabNavigation',
  'TagFilterDropdown.vue': 'ChptFilter',
}

const UI_DIR = 'src/components/library/ui'
const problems = []

for (const [file, canonical] of Object.entries(LEGACY)) {
  const path = `${UI_DIR}/${file}`
  let source
  try {
    source = await readFile(path, 'utf8')
  } catch {
    problems.push(`${path}：檔案不存在。若已移除，請一併從本腳本的 LEGACY 清單刪除。`)
    continue
  }

  const lines = source.split('\n').length
  if (lines > MAX_LINES) {
    problems.push(
      `${path}：${lines} 行，超過薄包裝上限 ${MAX_LINES} 行。` +
        `\n    相容層只應轉發 props / emits / slots 給 ${canonical}，不要在這裡放實作。`
    )
  }

  if (!source.includes(`from './${canonical}.vue'`)) {
    problems.push(
      `${path}：沒有 import ${canonical}。` +
        `\n    legacy 元件必須轉發到 canonical，不得自行實作一份。`
    )
  }
}

if (problems.length > 0) {
  console.error('Legacy 相容層檢查失敗：\n')
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}

console.log(`Legacy 相容層檢查通過：${Object.keys(LEGACY).length} 個相容元件皆為薄包裝。`)
