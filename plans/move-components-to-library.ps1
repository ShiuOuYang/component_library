# =====================================================================
# 組件庫 Phase 2 — 把 src/components/common 元件分群搬到 src/components/library
#
# 執行方式（在專案根目錄 e:\code\component-library 的 VSCode 終端）：
#   powershell -ExecutionPolicy Bypass -File plans\move-components-to-library.ps1
#   （請用 -File 執行；不要用互動式貼上，會讓 $PSScriptRoot 為空而失敗）
#
# 注意：搬移後「請先不要跑 npm run dev」，等 import 重寫（alias）完成後再驗證。
# 本腳本不會動到 src/components/common/index.js（之後由重構改成 facade）。
# =====================================================================
$ErrorActionPreference = 'Stop'

# $PSScriptRoot 在用 -File 執行時 = 腳本所在資料夾；互動式貼上時為空 → 退回目前目錄
if ($PSScriptRoot) { $root = Split-Path -Parent $PSScriptRoot }
else               { $root = (Get-Location).Path }
$src    = Join-Path $root 'src'
$common = Join-Path $src 'components\common'
$lib    = Join-Path $src 'components\library'

if (-not (Test-Path $common)) { throw "找不到來源資料夾：$common （請在專案根目錄執行）" }
if (-not (Test-Path (Join-Path $common 'index.js'))) { throw "common/index.js 不存在，確認執行目錄正確" }

Write-Host "來源：$common"
Write-Host "目標：$lib"

# --- 建立目標資料夾 ---
foreach ($d in @('ui', 'charts', 'viewer', 'excel', 'shared', 'shared\types')) {
  New-Item -ItemType Directory -Force -Path (Join-Path $lib $d) | Out-Null
}

# --- 1) ui：所有 Chpt*.vue，扣除 Excel 三檔 ---
$excelChpt = @('ChptExcelEditor.vue', 'ChptExcelExporter.vue', 'ChptExcelUploader.vue')
Get-ChildItem -Path $common -Filter 'Chpt*.vue' |
  Where-Object { $_.Name -notin $excelChpt } |
  ForEach-Object { Move-Item -Path $_.FullName -Destination (Join-Path $lib 'ui') -Force }

# --- 2) ui：實作型 legacy UI 與 UI alias stub ---
$uiLegacy = @(
  'CommonTooltip.vue', 'PaginationControls.vue', 'Pagination.vue',
  'CodeBlock.vue', 'DraggableModal.vue', 'SimpleDarkModeToggle.vue',
  'FilterBar.vue', 'FilterDropdown.vue', 'FilterSelect.vue', 'TagFilterDropdown.vue',
  'CommonTable.vue', 'ModalDock.vue', 'PageSwitcher.vue',
  'TabNavigation.vue', 'HeaderLogoutButton.vue'
)
foreach ($f in $uiLegacy) { Move-Item -Path (Join-Path $common $f) -Destination (Join-Path $lib 'ui') -Force }

# --- 3) excel：ChptExcel* + Excel* alias ---
$excel = $excelChpt + @('ExcelEditor.vue', 'ExcelExporter.vue', 'ExcelUploader.vue')
foreach ($f in $excel) { Move-Item -Path (Join-Path $common $f) -Destination (Join-Path $lib 'excel') -Force }

# --- 4) charts ---
$charts = @(
  'DualAxisComboChart.vue', 'EnterpriseHeatmap.vue', 'EnterprisePareto.vue',
  'ParetoChart.vue', 'FacetedChart.vue', 'GridFacetChart.vue',
  'GridFacetChart.example.vue'
)
foreach ($f in $charts) { Move-Item -Path (Join-Path $common $f) -Destination (Join-Path $lib 'charts') -Force }

# --- 5) viewer ---
$viewer = @('GerberViewer.vue', 'PcbLayout.vue')
foreach ($f in $viewer) { Move-Item -Path (Join-Path $common $f) -Destination (Join-Path $lib 'viewer') -Force }

# --- 6) shared ---
Move-Item -Path (Join-Path $common 'useToast.ts')        -Destination (Join-Path $lib 'shared')       -Force
Move-Item -Path (Join-Path $common 'types\ui.types.ts')  -Destination (Join-Path $lib 'shared\types') -Force

# --- 移除已空的 types 資料夾（保留 index.js 與其餘）---
$emptyTypes = Join-Path $common 'types'
if ((Test-Path $emptyTypes) -and -not (Get-ChildItem -Path $emptyTypes -Force | Select-Object -First 1)) {
  Remove-Item -Path $emptyTypes -Force
}

Write-Host ''
Write-Host '搬移完成。請先不要執行 npm run dev，等組件庫 import 重寫完成後再驗證。'
Write-Host ''
Write-Host 'src/components/common 剩餘：'
Get-ChildItem -Path $common -Force | Select-Object -ExpandProperty Name
Write-Host ''
Write-Host 'src/components/library 內容：'
Get-ChildItem -Path $lib -Recurse | ForEach-Object { $_.FullName.Replace($root, '') }
