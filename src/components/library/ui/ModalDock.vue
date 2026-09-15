<script lang="ts">
/**
 * ModalDock —— ChptModalDock 的相容別名（@deprecated）
 *
 * 請改用 <ChptModalDock />。此檔僅為過渡期不破壞既有呼叫端而保留。
 *
 * ⚠️ 不可寫成 `export { default } from './ChptModalDock.vue'`：
 *    SFC 本身隱含一個 default export，兩者會撞成 TS2528。
 */
import ChptModalDock from './ChptModalDock.vue'

export default ChptModalDock
</script>
