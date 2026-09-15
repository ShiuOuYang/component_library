<script lang="ts">
/**
 * CommonTooltip —— ChptDataTooltip 的相容別名（@deprecated）
 *
 * 請改用 <ChptDataTooltip />。本元件並非 ChptTooltip 的舊版，
 * 兩者用途不同（見 ChptDataTooltip 檔頭的對照表）。
 *
 * ⚠️ 不可寫成 `export { default } from './ChptDataTooltip.vue'`：
 *    SFC 本身隱含一個 default export，兩者會撞成 TS2528。
 */
import ChptDataTooltip from './ChptDataTooltip.vue'

export default ChptDataTooltip
</script>
