<script lang="ts">
/**
 * ExcelEditor —— ChptExcelEditor 的相容別名（@deprecated）
 *
 * 請改用 <ChptExcelEditor />。此檔僅為過渡期不破壞既有呼叫端而保留。
 *
 * ⚠️ 不可寫成 `export { default } from './ChptExcelEditor.vue'`：
 *    SFC 本身隱含一個 default export，兩者會撞成 TS2528。
 */
import ChptExcelEditor from './ChptExcelEditor.vue'

export default ChptExcelEditor
</script>
