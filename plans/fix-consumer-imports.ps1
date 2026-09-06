# =====================================================================
# Component Library Phase 2 - repoint consumer direct-path imports
#   from components/common/<File>  ->  components/library/<group>/<File>
#
# Run (repo root e:\code\component-library):
#   powershell -ExecutionPolicy Bypass -File plans\fix-consumer-imports.ps1
#
# Only lines that are real import/export statements referencing
#   components/common/<File>.vue|ts  are rewritten.
# Barrel imports ('@/components/common' with no filename) are NOT touched
#   (kept working by the common/index.js facade).
# Scans: src\views and src\components\docs (excluding library).
# =====================================================================
$ErrorActionPreference = 'Stop'

if ($PSScriptRoot) { $root = Split-Path -Parent $PSScriptRoot }
else               { $root = (Get-Location).Path }

# ---- filename -> group map ----
$map = @{}

$uiNames = @(
  'ChptAlert.vue','ChptAvatar.vue','ChptBadge.vue','ChptBreadcrumb.vue','ChptButton.vue',
  'ChptCard.vue','ChptCheckbox.vue','ChptCodeBlock.vue','ChptCollapse.vue','ChptDarkModeToggle.vue',
  'ChptDatePicker.vue','ChptDivider.vue','ChptDrawer.vue','ChptEmpty.vue','ChptFilter.vue',
  'ChptFilterBar.vue','ChptFixedTable.vue','ChptHeaderLogoutButton.vue','ChptIcon.vue','ChptInput.vue',
  'ChptModal.vue','ChptModalDock.vue','ChptPageSwitcher.vue','ChptPagination.vue','ChptPopconfirm.vue',
  'ChptProgress.vue','ChptRadio.vue','ChptSelect.vue','ChptSkeleton.vue','ChptSpinner.vue',
  'ChptSteps.vue','ChptSwitch.vue','ChptTable.vue','ChptTabNavigation.vue','ChptTabs.vue',
  'ChptTag.vue','ChptTextarea.vue','ChptToast.vue','ChptTooltip.vue',
  'CodeBlock.vue','CommonTable.vue','CommonTooltip.vue','DraggableModal.vue','FilterBar.vue',
  'FilterDropdown.vue','FilterSelect.vue','HeaderLogoutButton.vue','ModalDock.vue','PageSwitcher.vue',
  'Pagination.vue','PaginationControls.vue','SimpleDarkModeToggle.vue','TabNavigation.vue',
  'TagFilterDropdown.vue'
)
foreach ($n in $uiNames) { $map[$n] = 'ui' }

$excelNames = @('ChptExcelEditor.vue','ChptExcelExporter.vue','ChptExcelUploader.vue',
  'ExcelEditor.vue','ExcelExporter.vue','ExcelUploader.vue')
foreach ($n in $excelNames) { $map[$n] = 'excel' }

$chartsNames = @('DualAxisComboChart.vue','EnterpriseHeatmap.vue','EnterprisePareto.vue',
  'ParetoChart.vue','FacetedChart.vue','GridFacetChart.vue','GridFacetChart.example.vue')
foreach ($n in $chartsNames) { $map[$n] = 'charts' }

$viewerNames = @('GerberViewer.vue','PcbLayout.vue')
foreach ($n in $viewerNames) { $map[$n] = 'viewer' }

$map['useToast.ts'] = 'shared'
$map['useToast']    = 'shared'

# ---- scan roots ----
$roots = @(
  (Join-Path $root 'src\views'),
  (Join-Path $root 'src\components\docs')
)
$files = Get-ChildItem -Path $roots -Recurse -File -Include '*.vue','*.ts','*.js' |
  Where-Object { $_.FullName -notmatch '\\components\\library\\' }

$changed = @()
foreach ($file in $files) {
  $lines = Get-Content -Path $file.FullName
  $out = New-Object 'System.Collections.Generic.List[string]'
  $dirty = $false
  foreach ($line in $lines) {
    $new = $line
    if ($line -match 'from\s+[''"]' -and $line -match 'components/common/([A-Za-z0-9._-]+\.(vue|ts))') {
      $name = $Matches[1]
      if ($map.ContainsKey($name)) {
        $new = $line.Replace("components/common/$name", "components/library/$($map[$name])/$name")
        if ($new -ne $line) { $dirty = $true }
      }
    }
    $out.Add($new) | Out-Null
  }
  if ($dirty) {
    Set-Content -Path $file.FullName -Value $out -Encoding UTF8
    $changed += $file.FullName.Replace($root, '')
  }
}

Write-Host ''
Write-Host ("Updated {0} consumer file(s):" -f $changed.Count)
foreach ($c in $changed) { Write-Host ("  " + $c) }
Write-Host ''
Write-Host 'Done. Please report the output list.'
